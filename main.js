const { app, Tray, Menu, shell, Notification, globalShortcut, BrowserWindow, screen, ipcMain } = require('electron'); // <-- ipcMain HINZUFÜGEN

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const sudo = require('sudo-prompt');
const os = require('os');
let tray = null;
let intervalId = null;
let ramGuardIntervalId = null;
let overlayWindow = null;
let overlayInterval = null;
let currentFreeRamMB = 4096;
let overlayX = null;
let overlayY = null;
const rawBytes = os.totalmem();
const rawGB = rawBytes / 1024 / 1024 / 1024;
const macStandardSizes = [8, 16, 18, 24, 32, 36, 48, 64, 96, 128, 192, 256];
const TOTAL_RAM_GB = macStandardSizes.find(size => size >= rawGB) || Math.round(rawGB);
const USER_DATA_PATH = app.getPath('userData');
const CONFIG_DIR = path.join(USER_DATA_PATH, 'config'); // Neuer, sauberer Unterordner

// Erstellt den config-Ordner sofort beim App-Start, falls er fehlt
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Deine Dateien ziehen jetzt dauerhaft in den Unterordner um:
const CONFIG_FILE = path.join(CONFIG_DIR, 'booster_config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'gaming_boost.log');
const BLACKLIST_FILE = path.join(CONFIG_DIR, 'blacklist.txt');

let isBoostActive = true;
let isLoggingActive = false;
let isHelperDebugActive = false; // <-- DIESE ZEILE HINZUFÜGEN
let isAutostartActive = false;
let isShaderGuardActive = false;
let optimizedPIDs = new Set();
let currentStatusText = '🎮 Status: No active games';
let lastPromptTime = 0; 
const PROMPT_COOLDOWN = 1 * 60 * 1000;

// Pfad zur Mapping-Datei und die dynamische Laufzeit-Map
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
let activeGamesMapping = new Map();

/**
 * Lädt die games_exe_mapping.txt dynamisch in den Arbeitsspeicher.
 * Verknüpft die Prozessnamen (.exe oder Mac-Binary) mit dem echten Namen.
 */
function loadGamesMappingFile() {
    const MAPPING_FILE = path.join(os.homedir(), 'Library/Application Support/fps-boost/config/games_exe_mapping.txt');
    activeGamesMapping.clear();
    
    try {
        if (fs.existsSync(MAPPING_FILE)) {
            const content = fs.readFileSync(MAPPING_FILE, 'utf-8');
            content.split('\n').forEach(line => {
                const parts = line.trim().split('=>');
                if (parts.length === 2) {
                    const gameName = parts[0].trim();
                    const processRaw = parts[1].trim().toLowerCase();
                    
                    if (processRaw && processRaw !== 'unknown_executable.exe') {
                        // FIX: Wenn mehrere Exes mit || getrennt sind, mappen wir jede einzeln!
                        if (processRaw.includes('||')) {
                            const multipleExes = processRaw.split('||');
                            multipleExes.forEach(exe => {
                                const cleanExe = exe.trim();
                                if (cleanExe.length > 2) {
                                    activeGamesMapping.set(cleanExe, gameName);
                                }
                            });
                        } else {
                            // Standardfall für einzelne Exes/Binaries
                            activeGamesMapping.set(processRaw, gameName);
                        }
                    }
                }
            });
            writeToRotatedLog(`🔄 Dynamische Mapping-Engine: ${activeGamesMapping.size} Spiele-Prozesse erfolgreich geladen.`);
        } else {
            writeToRotatedLog("⚠️ Hinweis: games_exe_mapping.txt existiert nicht. Bitte Scan ausführen.");
        }
    } catch (e) {
        writeToRotatedLog("❌ Fehler beim Laden der games_exe_mapping.txt: " + e.message);
    }
}

function sendToRootHelper(pid, level) {
    try {
        // Richtet den Pfad exakt auf den neuen, sauberen fps-boost Config-Ordner aus
        const triggerPath = path.join(os.homedir(), 'Library/Application Support/fps-boost/config/boost.trigger');
        
        const payload = JSON.stringify({ 
            action: 'boost', 
            pid: parseInt(pid, 10), 
            level: parseInt(level, 10) 
        });
        
        fs.writeFileSync(triggerPath, payload, 'utf8');
        
        // Nutzt deine bestehende Log-Funktion
        writeToRotatedLog(`⚡️ Trigger-Engine: MAX-Boost für PID ${pid} (Level: ${level}) geschrieben.`);
    } catch (e) {
        writeToRotatedLog("❌ Error writing file trigger: " + e.message);
    }
}


let isHelperStarting = false;

function startRootHelper() {
    if (isHelperStarting) return;

// ALT:
// const userAppSupportPath = app.getPath('userData');
// const helperExternalPath = path.join(userAppSupportPath, 'helper.js');

// NEU (Ersetzen mit diesem Block):
const userAppSupportPath = CONFIG_DIR; // Nutzt jetzt den sauberen config-Unterordner
const helperExternalPath = path.join(app.getPath('userData'), 'helper.js'); // helper.js bleibt im Hauptordner, damit der Pfad für osascript unverändert bleibt

    const isPackaged = app.isPackaged;
    const iconPath = isPackaged 
        ? path.join(process.resourcesPath, 'rocket.icns')
        : path.join(__dirname, 'rocket.icns');
    isHelperStarting = true;
    exec('ps -Ax -o pid,command | grep -v grep | grep "helper.js"', (psErr, psStdout) => {
        if (psStdout && psStdout.trim().length > 0) {
            isHelperStarting = false;
            return;
        }

        writeToRotatedLog("🔒 Preparing root helper service...");

        if (!fs.existsSync(userAppSupportPath)) {
            fs.mkdirSync(userAppSupportPath, { recursive: true });
        }

        const safeDirPath = JSON.stringify(userAppSupportPath);
        const safeConfigPath = JSON.stringify(CONFIG_FILE); // <-- Neu: Pfad zur Config übergeben

        const embeddedHelperCode = `
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dirPath = ${safeDirPath};
const configPath = ${safeConfigPath};
const logPath = path.join(dirPath, 'helper_debug.log');
const triggerPath = path.join(dirPath, 'boost.trigger');

function isDebugEnabled() {
    try {
        if (fs.existsSync(configPath)) {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return cfg.isHelperDebugActive === true;
        }
    } catch(e) {}
    return false;
}

try {
    if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
    if (isDebugEnabled()) {
        fs.writeFileSync(logPath, "[" + new Date().toLocaleTimeString() + "] 🚀 File root helper freshly initialized.\\n", 'utf8');
    }
} catch(e) {}

function logDebug(msg) {
    if (!isDebugEnabled()) return;
    try {
        const time = new Date().toLocaleTimeString();
        fs.appendFileSync(logPath, "[" + time + "] " + msg + "\\n", 'utf8');
    } catch (e) {}
}

logDebug("🚀 File root helper successfully started and active.");

setInterval(() => {
    try {
        if (fs.existsSync(triggerPath)) {
            const content = fs.readFileSync(triggerPath, 'utf8').trim();
            
            if (content && content.length > 0) {
                // WICHTIG: Leeren statt Löschen (fs.unlinkSync entfernen!)
                fs.writeFileSync(triggerPath, '', 'utf8'); 
                
                const msg = JSON.parse(content);

                if (msg.action === 'kill') {
                    logDebug("🛑 Self-termination command received. Exiting root helper process gracefully.");
                    process.exit(0); 
                }
                
                if (msg.action === 'boost' && msg.pid) {
                    logDebug("📥 File trigger received for PID: " + msg.pid);
                    exec("renice " + msg.level + " " + msg.pid, (err, stdout, stderr) => {
                        if (err) { logDebug("❌ Kernel error: " + (stderr || err.message)); }
                        else { logDebug("✅ Kernel success! PID " + msg.pid + " steht auf " + msg.level); }
                    });
                }
            }
        }
    } catch (e) { logDebug("❌ Loop error: " + e.message); }
}, 500);

        `.trim();

        try {
            fs.writeFileSync(helperExternalPath, embeddedHelperCode, 'utf8');
            writeToRotatedLog("✅ helper.js successfully unpacked into the App Support folder.");
        } catch (fileErr) {
            writeToRotatedLog("❌ Write error at helper.js: " + fileErr.message);
            isHelperStarting = false; 
            return;
        }

        let absoluteNodePath = '/usr/local/bin/node'; 
        const homebrewPath = '/opt/homebrew/bin/node'; 
        
        if (!fs.existsSync(absoluteNodePath) && fs.existsSync(homebrewPath)) {
            absoluteNodePath = homebrewPath; 
        } else if (!fs.existsSync(absoluteNodePath)) {
            absoluteNodePath = process.execPath;
            writeToRotatedLog("⚠️ No global Node found. Using internal Electron binary.");
        }
        
        writeToRotatedLog(`🔍 Node path securely determined: ${absoluteNodePath}`);

        let appleScript = `do shell script "\\"${absoluteNodePath}\\" \\"${helperExternalPath}\\" > /dev/null 2>&1 &" with administrator privileges`;
        
        if (fs.existsSync(iconPath)) {
            appleScript = `tell application "Finder" to set iconFile to (POSIX file "${iconPath}") as alias\\n` +
                           `do shell script "\\"${absoluteNodePath}\\" \\"${helperExternalPath}\\" > /dev/null 2>&1 &" with administrator privileges with prompt "Mac Gaming Booster benötigt Admin-Rechte für die Kernel-Prozess-Optimierung:" given icon iconFile`;
        }

        const osascriptCommand = `osascript -e ${JSON.stringify(appleScript)}`;

        exec(osascriptCommand, { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } }, (err) => {
            setTimeout(() => {
                isHelperStarting = false;
            }, 5000);

            if (err) {
                writeToRotatedLog("❌ [Osascript] Root helper could not be started: " + err.message);
            } else {
                writeToRotatedLog("🚀 [Osascript] Root helper successfully active in background.");
            }
        });
    });
}

function loadSettings() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            if (config.isBoostActive !== undefined) isBoostActive = config.isBoostActive;
            if (config.isLoggingActive !== undefined) isLoggingActive = config.isLoggingActive;
            if (config.isHelperDebugActive !== undefined) isHelperDebugActive = config.isHelperDebugActive; // <-- HINZUFÜGEN
            if (config.isAutostartActive !== undefined) isAutostartActive = config.isAutostartActive;
            if (config.isShaderGuardActive !== undefined) isShaderGuardActive = config.isShaderGuardActive;
            if (config.overlayX !== undefined) overlayX = config.overlayX;
            if (config.overlayY !== undefined) overlayY = config.overlayY;
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        const config = { isBoostActive, isLoggingActive, isHelperDebugActive, isAutostartActive, isShaderGuardActive, overlayX, overlayY }; // <-- isHelperDebugActive HINZUFÜGEN
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {}
}

function writeToRotatedLog(newText) {
    if (!isLoggingActive) return;
    const timestamp = new Date().toLocaleTimeString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${newText}\n`, 'utf8');
}

function sendNotification(bodyText) {
    if (Notification.isSupported()) {
        new Notification({
            title: '🚀 Mac Gaming Booster',
            body: bodyText,
            silent: true
        }).show();
    }
}

function toggleRamOverlay() {
    if (overlayWindow) {
        clearInterval(overlayInterval);
        overlayWindow.close();
        overlayWindow = null;
        return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    const xPos = (overlayX !== null) ? overlayX : (width - 260);
    const yPos = (overlayY !== null) ? overlayY : 40;

    overlayWindow = new BrowserWindow({
        width: 240,
        height: 75,
        x: xPos,
        y: yPos,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        show: false,             
        focusable: false,        
        setVisibleOnAllWorkspaces: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    const htmlContent = `
        <body style="font-family:-apple-system,sans-serif; color:white; background:rgba(20,20,20,0.85); margin:0; padding:10px; border-radius:8px; font-size:12px; border: 1px solid rgba(255,255,255,0.1); overflow:hidden; user-select:none;">
            <div style="font-weight:bold; margin-bottom:4px; display:flex; justify-content:space-between;">
                <span>RAM Live-Monitor</span>
                <span id="ram-status" style="color:#00ff00;">● Live</span>
            </div>
            <div id="ram-used">Used: -- GB / -- GB</div>
            <div id="ram-free" style="font-weight:bold; color:#00ffaa; margin-top:2px;">Free: -- MB</div>
        </body>
    `;

    overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    overlayWindow.once('ready-to-show', () => {
        if (overlayWindow) {
            overlayWindow.showInactive(); 
        }
    });

    overlayInterval = setInterval(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            const total = TOTAL_RAM_GB; 
            const freeMB = currentFreeRamMB;
            const usedGB = ((total * 1024 - freeMB) / 1024).toFixed(2);

            overlayWindow.webContents.executeJavaScript(`
                if (document.getElementById('ram-used')) {
                    document.getElementById('ram-used').innerHTML = 'Used: ${usedGB} GB / ${total} GB';
                    document.getElementById('ram-free').innerHTML = 'Free: ${freeMB} MB';
                    document.getElementById('ram-status').style.color = ${freeMB} < 1500 ? '#ff3333' : '#00ff00';
                }
            `).catch(err => console.error("Overlay JS-Inject Fehler:", err));
        }
    }, 1000);
}

let lastPurgeTime = 0; 
const PURGE_COOLDOWN = 30 * 1000;

function manageRamGuardState(isGameRunning) {
    if (!isShaderGuardActive) {
        if (ramGuardIntervalId) {
            clearInterval(ramGuardIntervalId);
            ramGuardIntervalId = null;
        }
        return;
    }

    let purgeLimit = 1500;
    let pauseLimit = 400;
    let killLimit = 100;

    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (configData.purgeLimit) purgeLimit = parseInt(configData.purgeLimit, 10);
            if (configData.pauseLimit) {
                pauseLimit = parseInt(configData.pauseLimit, 10);
                killLimit = Math.max(50, pauseLimit - 300); 
            }
        }
    } catch (e) { /* Schutz vor Lese-Fehlern */ }

    if (isGameRunning) {
        if (!ramGuardIntervalId) {
            writeToRotatedLog("🎮 Game Active: Aggressive RAM-Guard (No Sudo) initiated.");
            ramGuardIntervalId = setInterval(() => {
                const now = Date.now();
                if (now - lastPurgeTime < PURGE_COOLDOWN) return;

                exec('vm_stat', (error, stdout) => {
                    if (error || !stdout) return;

                    const freePagesMatch = stdout.match(/Pages free:\s+(\d+)/);
                    const specPagesMatch = stdout.match(/Pages speculative:\s+(\d+)/);
                    
                    if (freePagesMatch) {
                        const freePages = parseInt(freePagesMatch[1], 10);
                        const specPages = specPagesMatch ? parseInt(specPagesMatch[1], 10) : 0;
                        const availableRamMB = Math.round(((freePages + specPages) * 16384) / 1024 / 1024);
                        currentFreeRamMB = availableRamMB;

                        if (availableRamMB < purgeLimit) {
                            writeToRotatedLog(`🚨 WARNING: Memory Critical (${availableRamMB} MB free). Enforcing maximum release!`);
                            lastPurgeTime = Date.now();
                            const memorySpikeTrigger = new Array(5000000).fill(0);
                            
                            exec('syslog -c aslmanager -d', (purgeError) => {
                                if (!purgeError) {
                                    writeToRotatedLog("🧹 Inactive RAM and system caches successfully evacuated.");
                                }
                            });

                            if (availableRamMB < killLimit) {
                                writeToRotatedLog(`🚨 EMERGENCY SYSTEM OVERLOAD (Under ${killLimit}MB RAM)! Executing brutal hard kill to prevent Kernel Panic...`);
                                exec('killall -9 MTLCompilerService', (killErr) => {
                                    if (!killErr) {
                                        writeToRotatedLog("🛡️ EMERGENCY CRASH PROTECTION: MTLCompilerService forcefully terminated!");
                                        sendNotification("🛡️ Kernel Panic prevented! Heavy compiler process terminated immediately.");
                                    }
                                });
                            }

                            else if (availableRamMB < pauseLimit) {
                                writeToRotatedLog("🚨 Critical memory shortage! Temporarily putting MTLCompilerService into deep sleep for relief...");
                                
                                exec('killall -STOP MTLCompilerService', () => {
                                    writeToRotatedLog("🧹 Performing aggressive RAM evacuation...");
                                    exec('sudo purge', () => {
                                        setTimeout(() => {
                                            exec('killall -CONT MTLCompilerService', () => {
                                                writeToRotatedLog("🛡️ SUCCESS: MTLCompilerService successfully relieved and awakened!");
                                                sendNotification("🛡️ Memory depletion prevented! Compiler paused, evacuated and resumed successfully.");
                                            });
                                        }, 2000);
                                    });
                                });
                            }

                            setTimeout(() => {
                                memorySpikeTrigger.length = 0;
                            }, 100);
                        }
                    }
                });
            }, 3000);
        }
    } else {
        if (ramGuardIntervalId) {
            clearInterval(ramGuardIntervalId);
            ramGuardIntervalId = null;
            writeToRotatedLog("🛑 Game terminated: RAM-Guard stopped.");
        }
    }
}

setInterval(() => {
    if (!ramGuardIntervalId) {
        exec('vm_stat', (error, stdout) => {
            if (error || !stdout) return;
            const freePagesMatch = stdout.match(/Pages free:\s+(\d+)/);
            const specPagesMatch = stdout.match(/Pages speculative:\s+(\d+)/);
            if (freePagesMatch) {
                const freePages = parseInt(freePagesMatch[1], 10);
                const specPages = specPagesMatch ? parseInt(specPagesMatch[1], 10) : 0;
                currentFreeRamMB = Math.round(((freePages + specPages) * 16384) / 1024 / 1024);
            }
        });
    }
}, 2000);

function getCleanGameName(fullPath, appName) {
    const normalizedPath = fullPath.replace(/\\/g, '/');
    let baseName = appName.replace(/\.exe/i, '').trim().toLowerCase();
    
    if (normalizedPath.toLowerCase().includes('steamapps')) {
        try {
            const commonIndex = normalizedPath.toLowerCase().indexOf('/common/');
            if (commonIndex !== -1) {
                const afterCommon = normalizedPath.substring(commonIndex + 8);
                const folderName = afterCommon.split('/');
                if (folderName && folderName[0]) {
                    return folderName[0].replace(/_/g, ' ').replace(/\.exe/i, '').trim();
                }
            }
        } catch (e) {}
    }

    if (normalizedPath.toLowerCase().includes('/bottles/')) {
        try {
            const parts = normalizedPath.split('/');
            const bottlesIndex = parts.findIndex(p => p.toLowerCase() === 'bottles');
            if (bottlesIndex !== -1 && parts.length > bottlesIndex + 1) {
                return parts[bottlesIndex + 1].replace(/_/g, ' ').trim();
            }
        } catch (e) {}
    }

    if (normalizedPath.toLowerCase().includes('.app/')) {
        try {
            const appIndex = normalizedPath.toLowerCase().indexOf('.app/');
            const appBasePath = normalizedPath.substring(0, appIndex + 5);
            const plistPath = path.join(appBasePath, 'Contents', 'Info.plist');
            
            if (fs.existsSync(plistPath)) {
                const plistContent = fs.readFileSync(plistPath, 'utf8');
                const match = plistContent.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/) 
                           || plistContent.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
        } catch (e) {}
    }

    if (baseName.length <= 12 && fs.existsSync(normalizedPath)) {
        try {
            const cmd = `strings "${normalizedPath}" | grep -A 1 -i "ProductName" | head -n 2`;
            const output = execSync(cmd, { encoding: 'utf8', timeout: 400 });
            
            if (output) {
                const cleanMetadataName = output.replace(/ProductName/i, '')
                                                .replace(/[^a-zA-Z0-9\s.:'\-]/g, '')
                                                .trim();
                
                if (cleanMetadataName.length > 2 && !cleanMetadataName.toLowerCase().includes('stringfile')) {
                    return cleanMetadataName;
                }
            }
        } catch (e) {}
    }

    let cleanName = appName.replace(/\.exe/i, '')
                           .replace(/[_\-]/g, ' ')
                           .replace(/shipping/i, '')
                           .trim();
                           
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

function checkAndBoostGames() {
    // 1. SICHERHEITS-BREMSE: Wenn das Mapping noch nicht geladen ist, brich sofort ab!
    if (!activeGamesMapping || activeGamesMapping.size === 0) {
        return;
    }

    // 2. Blacklist initialisieren, falls sie fehlt
    if (!fs.existsSync(BLACKLIST_FILE)) {
        const defaultBlacklist = [
            'steam', 'steam.exe', 'steamservice.exe', 'steamwebhelper.exe',
            'crossover', 'electron', 'epicgameslauncher', 'winewrapper.exe',
            'wineloader', 'wineloader64', 'svchost.exe', 'explorer.exe',
            'rpcss.exe', 'plugplay.exe', 'services.exe', 'steamclean',
            'wine', 'conhost.exe', 'cxcplinfo.exe', 'steamerrorreporter64.exe',
            'gldriverquery.exe', 'vulkandriverquery64.exe', 'gldriverquery64.exe',
            'mscorsvw.exe', 'cxmanip.exe'
        ].join('\n');
        fs.writeFileSync(BLACKLIST_FILE, defaultBlacklist, 'utf8');
    }

    // 3. Blacklist einlesen
    let userBlacklist = [];
    try {
        if (fs.existsSync(BLACKLIST_FILE)) {
            const fileContent = fs.readFileSync(BLACKLIST_FILE, 'utf8');
            userBlacklist = fileContent.split('\n')
                .map(line => line.trim().toLowerCase())
                .filter(line => line.length > 0);
        }
    } catch (e) {
        writeToRotatedLog("⚠️ Error reading blacklist.txt");
    }

    // 4. ULTIMATIVER PROZESS-SCAN (Scant den vollen Startbefehl)
    const searchCommand = "ps -Ax -o pid,command | grep -Ei 'wine|wineloader|steamapps|crossover|crs-handler|crs-handler.exe|wineloader64' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster'";

    exec(searchCommand, (error, stdout) => {
        if (error || !stdout.trim()) {
            if (optimizedPIDs.size > 0) {
                writeToRotatedLog("⏳ No active games found. Waiting...");
                optimizedPIDs.clear();
                manageRamGuardState(false);
                currentStatusText = '🎮 Status: No active games';
                updateMenu();
            }
            return;
        }

        const lines = stdout.trim().split('\n');
        const currentPIDs = new Set();

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return;
            
            const pid = parts[0]; 
            const fullPath = parts.slice(1).join(' ');
            const normalizedPath = fullPath.replace(/\\/g, '/');
            const lowerPath = normalizedPath.toLowerCase();

            // Extrahiert den reinen Dateinamen am Ende des Pfads
            let extractedExe = path.basename(normalizedPath.split(' ')[0]);
            const exeExtract = normalizedPath.match(/([^\/]+\.exe)/i);
            if (exeExtract && exeExtract[1]) {
                extractedExe = exeExtract[1].split(' ')[0];
            }
            
            const lowName = extractedExe.toLowerCase();
            const cleanName = lowName.replace(/[()]/g, '');

            // -----------------------------------------------------------------
            // 🔄 DYNAMISCHER MEHRWEG-ABGLEICH GEGEN DAS MAPPING
            // -----------------------------------------------------------------
            let displayGameName = "";
            let isMatchedGame = false;

            // Weg A: Direkt-Prüfung über den reinen Prozessnamen
            if (activeGamesMapping.has(cleanName)) {
                const mappedName = activeGamesMapping.get(cleanName);
                if (mappedName && mappedName !== 'unknown_executable.exe') {
                    displayGameName = `🎮 ${mappedName}`;
                    isMatchedGame = true;
                }
            }

            // Weg B: Tiefen-Pfad-Prüfung über den Key aus der Mapping-Datei
            if (!isMatchedGame) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    if (processKey && processKey !== 'unknown_executable.exe') {
                        const cleanKey = processKey.toLowerCase().trim();
                        if (lowerPath.includes(cleanKey)) {
                            displayGameName = `🎮 ${gameTitle}`;
                            isMatchedGame = true;
                            break;
                        }
                    }
                }
            }

            // Weg C: SONY SPECIAL FIX (Die ultimative Rettung für The Last of Us via crs-handler)
            // Wenn das Spiel als crs-handler maskiert ist, suchen wir direkt nach dem Klarnamen im Argument!
            if (!isMatchedGame && lowerPath.includes('crs-handler')) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    // Bereinigt den Spieletitel von Symbolen wie ™ für einen sicheren Treffer
                    const cleanTitleMatch = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanPathMatch = lowerPath.replace(/[^a-z0-9]/g, '');
                    
                    if (cleanPathMatch.includes(cleanTitleMatch)) {
                        displayGameName = `🎮 ${gameTitle}`;
                        isMatchedGame = true;
                        break;
                    }
                }
            }

            // Sicherheits-Stopp: Wenn es absolut kein Treffer aus dem Mapping ist -> Überspringen
            if (!isMatchedGame) return;

            // Blacklist-Abgleich
            const isBlacklisted = userBlacklist.some(ignoredName => cleanName === ignoredName);
            if (isBlacklisted) return;

            currentPIDs.add(pid);

            if (optimizedPIDs.has(pid)) return;
            optimizedPIDs.add(pid);
            
            writeToRotatedLog(`🎯 Game detected: 📦 ${displayGameName} (PID: ${pid})`);
            manageRamGuardState(true);

            if (isBoostActive) {
                // Ein crs-handler, der ein verifiziertes Spiel enthält, ist KEIN unbedeutender Wrapper!
                const isWrapper = (lowName.includes('winewrapper') || lowName.includes('winedevice') || lowName.includes('wineboot')) && !lowerPath.includes('crs-handler');

                if (!isWrapper) {
                    sendToRootHelper(pid, -5);
                    writeToRotatedLog(`⚡️ Trigger-Engine: MAX-Boost für ${displayGameName} (PID: ${pid}) geschrieben.`);
                    currentStatusText = `🟢 MAX-Boost: 📦 ${displayGameName}`;
                    updateMenu();
                    sendNotification(`Performance boost (MAX) activated for "${displayGameName}"!`);
                } else {
                    sendToRootHelper(pid, -1);
                    writeToRotatedLog(`⚡️ Trigger-Engine: Parallel-Prozess ${displayGameName} (PID: ${pid}) auf MID gesetzt.`);
                    currentStatusText = `🟡 MID-Boost: 📦 ${displayGameName}`;
                    updateMenu();
                }
            }
        });

        // Aufräum-Logik für beendete Spiele
        for (let pid of optimizedPIDs) {
            if (!currentPIDs.has(pid)) {
                optimizedPIDs.delete(pid);
                writeToRotatedLog(`⏳ Game with PID ${pid} terminated. Evacuated from memory.`);
                exec('sudo purge', () => {
                    writeToRotatedLog("🧹 RAM Purge: Inactive disk cache successfully cleared.");
                });

                if (optimizedPIDs.size === 0) {
                    manageRamGuardState(false);
                    currentStatusText = '🎮 Status: No active games';
                    updateMenu();
                }
            }
        }
    });
}

// Höre auf das Start-Signal aus dem Einstellungsfenster
ipcMain.on('trigger-start-helper', () => {
    startRootHelper();
});

// Höre auf das Start-Signal aus dem Einstellungsfenster
ipcMain.on('trigger-start-helper', () => {
    startRootHelper();
});

// =================================================================
// SYSTEM ENGINE: MANUAL GAME SCANNER IPC CHANNELS (v2.7.1)
// =================================================================

// Handler 1: Führt das Testskript asynchron aus und lädt das Mapping neu
ipcMain.handle('trigger-game-scan', async () => {
    return new Promise((resolve) => {
        // FIX: Auch hier auf check_games.js geändert
        const scannerPath = path.join(__dirname, 'check_games.js');
        if (!fs.existsSync(scannerPath)) {
            resolve({ success: false, error: 'Skript check_games.js fehlt im Verzeichnis.' });
            return;
        }
        
        const { fork } = require('child_process');
        const child = fork(scannerPath, [], { silent: true });
        
        child.on('close', (code) => {
            if (code === 0) {
                loadGamesMappingFile(); // Lädt das Mapping nach dem erfolgreichen Scan neu
                resolve({ success: true });
            } else {
                resolve({ success: false, error: 'Scanner-Skript meldete einen Fehler.' });
            }
        });
        
        child.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
    });
});

// Handler 2: Liest die games_list.txt ein und übergibt sie der GUI
ipcMain.handle('get-games-list', async () => {
    try {
        const gamesFile = path.join(CONFIG_DIR, 'games_list.txt');
        if (fs.existsSync(gamesFile)) {
            const content = fs.readFileSync(gamesFile, 'utf-8');
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            return { success: true, games: lines };
        }
        return { success: true, games: [] };
    } catch (e) {
        return { success: false, games: [] };
    }
});

let settingsWindow = null;

function openSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 650,
        height: 800,
        title: "Mac Gaming Booster - Settings",
        resizable: false,
        fullscreenable: false,
        minimizable: false,
        frame: true,
        backgroundColor: '#121214',
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #121214; color: #E1E1E6; padding: 25px; user-select: none; }
            h2 { color: #04D361; font-weight: 600; margin-top: 0; margin-bottom: 5px; }
            .subtitle { font-size: 12px; color: #8F8F9D; margin-bottom: 20px; }
            .section { background: #202024; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #323238; }
            label { font-weight: bold; display: block; margin-bottom: 10px; font-size: 14px; color: #04D361; }
            .desc { font-size: 11px; color: #8F8F9D; margin-bottom: 12px; }
            .slider-container { margin-bottom: 15px; }
            .slider-label { font-size: 13px; font-weight: 500; }
            input[type=range] { width: 100%; accent-color: #04D361; margin-top: 5px; cursor: pointer; }
            .val { float: right; color: #04D361; font-weight: bold; font-family: monospace; }
            
            .option-container { display: flex; align-items: flex-start; cursor: pointer; }
            .option-container input { margin-top: 3px; margin-right: 10px; accent-color: #04D361; cursor: pointer; }
            .option-text { font-size: 13px; font-weight: 500; }
            .option-desc { font-size: 11px; color: #8F8F9D; margin-top: 2px; }

            .blacklist-box { border: 1px solid #323238; background: #121214; border-radius: 6px; height: 110px; overflow-y: auto; padding: 8px; margin-bottom: 10px; }
            .blacklist-item { display: inline-flex; align-items: center; background: #29292E; border: 1px solid #41414A; color: #E1E1E6; border-radius: 4px; padding: 3px 8px; margin: 3px; font-size: 12px; font-family: monospace; }
            .blacklist-remove { color: #FF5555; margin-left: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
            .blacklist-remove:hover { color: #FFAA99; }
            .blacklist-input-row { display: flex; gap: 8px; }
            .blacklist-input { flex-grow: 1; background: #121214; border: 1px solid #323238; border-radius: 4px; padding: 6px 10px; color: #E1E1E6; font-family: monospace; font-size: 12px; }
            .blacklist-input:focus { border-color: #04D361; outline: none; }
            .btn-add { background: #323238; color: #04D361; border: 1px solid #04D361; padding: 5px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; }
            .btn-add:hover { background: #04D361; color: #000; }

            .footer-buttons { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
            .btn-save { background: #04D361; color: #000; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: background 0.2s; }
            .btn-save:hover { background: #06B352; }
            .btn-reset { background: transparent; color: #8F8F9D; border: 1px solid #323238; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
            .btn-reset:hover { color: #FF5555; border-color: #FF5555; background: rgba(255, 85, 85, 0.1); }
        </style>
    </head>
    <body>
        <h2>🚀 Mac Gaming Booster</h2>
        <div class="subtitle">Core Engine Settings & Management (v2.7.1 Platin)</div>
        
        <!-- SECTION 1: RAM LIMITS -->
        <div class="section">
            <label>🛡️ Adaptive Core RAM Thresholds (MB)</label>
            <div class="desc">Drag the sliders to dynamically calibrate your memory guard thresholds.</div>
            <div class="slider-container">
                <span class="slider-label">Soft Buffer Evacuation (Stage 1):</span>
                <span class="val" id="lvl1Val">1500 MB</span>
                <input type="range" id="lvl1" min="1000" max="3000" step="50" oninput="updateLabel('lvl1Val', this.value)">
            </div>
            <div class="slider-container" style="margin-bottom: 0;">
                <span class="slider-label">Compiler Deep-Sleep (Stage 2):</span>
                <span class="val" id="lvl2Val">400 MB</span>
                <input type="range" id="lvl2" min="200" max="800" step="50" oninput="updateLabel('lvl2Val', this.value)">
            </div>
        </div>
        
        <!-- SECTION 0: ENGINE CONTROL -->
        <div class="section">
            <label>⚙️ Core Engine Settings</label>
            <div class="desc">Configure the main behaviors and guards of the optimization engine.</div>
            
            <label class="option-container" style="margin-bottom: 12px;">
                <input type="checkbox" id="fpsBoost">
                <div>
                    <div class="option-text">🚀 Enable FPS Boost</div>
                    <div class="option-desc">Dynamically renices game process priorities via root helper.</div>
                </div>
            </label>

            <label class="option-container" style="margin-bottom: 12px;">
                <input type="checkbox" id="shaderGuard">
                <div>
                    <div class="option-text">🛡️ Enable Adaptive Shader Guard (Anti-Panic)</div>
                    <div class="option-desc">Protects system from kernel panics by managing compiler workloads.</div>
                </div>
            </label>

            <label class="option-container" style="margin-bottom: 12px;">
                <input type="checkbox" id="engineLogging">
                <div>
                    <div class="option-text">📝 Enable Logging (gaming_boost.log)</div>
                    <div class="option-desc">Keeps a persistent transaction log of all optimizations.</div>
                </div>
            </label>

            <label class="option-container">
                <input type="checkbox" id="loginAutostart">
                <div>
                    <div class="option-text">⚙️ Start at Login (Autostart)</div>
                    <div class="option-desc">Launches the booster automatically when you start your Mac.</div>
                </div>
            </label>
        </div>

        <!-- SECTION 2: BLACKLIST -->
        <div class="section">
            <label>📝 Blacklist Management (Ignored Processes)</label>
            <div class="desc">Processes in this list will be ignored by the booster (e.g., Steam, overlay tools).</div>
            <div class="blacklist-box" id="blacklistContainer"></div>
            <div class="blacklist-input-row">
                <input type="text" id="blInput" class="blacklist-input" placeholder="e.g., discord.exe or overlay" onkeydown="if(event.key === 'Enter') addProcess()">
                <button class="btn-add" onclick="addProcess()">＋ Add Process</button>
            </div>
        </div>
        
<!-- SECTION 4: DETECTED GAMES SYSTEM -->
<div class="section">
    <label>🎮 Synchronized Games Registry</label>
    <div class="desc">Vollautomatisch über die Manifeste der aktiven Launcher eingelesen.</div>
    <div class="blacklist-box" id="gamesContainer" style="height: 140px; padding: 10px;"></div>
    <div class="blacklist-input-row" style="justify-content: flex-end;">
        <button class="btn-add" id="btnScanGames" onclick="performManualGameScan()" style="width: 100%; padding: 8px 0; font-size: 13px;">🔍 Nach installierten Spielen scannen</button>
    </div>
</div>


        <!-- SECTION 3: DAEMON -->
        <div class="section">
            <label>⚙️ Root-Helper Background Service (Daemon)</label>
            <label class="option-container" style="margin-bottom: 12px;">
                <input type="checkbox" id="keepAlive">
                <div>
                    <div class="option-text">Keep background service active (Variant 1)</div>
                    <div class="option-desc">The helper continues running silently for instant re-launch without password prompt.</div>
                </div>
            </label>
            <!-- Neue Option für helper_debug.log -->
            <label class="option-container">
                <input type="checkbox" id="helperDebug">
                <div>
                    <div class="option-text">Enable Helper Debug Logging (helper_debug.log)</div>
                    <div class="option-desc">Enables deeper engine logs directly from the privileged background kernel task.</div>
                </div>
            </label>
            <!-- Live-Status und dynamischer Start/Stopp-Button -->
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1e; border-radius: 6px; border: 1px solid #29292e; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 12px; color: #8F8F9D;">Service Status:</span>
                    <span id="helperStatusText" style="font-size: 12px; font-weight: bold; margin-left: 5px;">Checking...</span>
                </div>
                <button id="btnToggleHelper" style="background: transparent; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s;" onclick="toggleHelperService()">Service steuern</button>
            </div>
        </div>
        <div class="footer-buttons">
            <button class="btn-reset" onclick="resetToDefaults()">🔄 Reset to Defaults</button>
            <button class="btn-save" onclick="saveSettings()">💾 Save & Close</button>
        </div>
        <script>
            const fs = require('fs');
            const path = require('path');
            
            // Zeigt nun direkt auf den neuen, sauberen Unterordner:
            const userAppSupport = path.join(process.env.HOME, 'Library/Application Support/fps-boost');
            const dirPath = path.join(userAppSupport, 'config'); 
            const configPath = path.join(dirPath, 'booster_config.json');
            const blacklistPath = path.join(dirPath, 'blacklist.txt');
            
            let currentConfig = { purgeLimit: 1500, pauseLimit: 400, keepDaemonAlive: true };
            let blacklistArray = [];

            let isHelperCurrentlyOnline = false;

            // Aktualisierte Live-Prüfung: Schaltet das Design des Buttons dynamisch um
            function checkHelperLiveStatus() {
                const { exec } = require('child_process');
                exec('ps -Ax | grep "helper.js" | grep -v grep', (err, stdout) => {
                    const statusText = document.getElementById('helperStatusText');
                    const toggleBtn = document.getElementById('btnToggleHelper');
                    
                    if (!statusText || !toggleBtn) return;
                    
                    if (stdout && stdout.trim().length > 0) {
                        isHelperCurrentlyOnline = true;
                        statusText.innerText = "● ONLINE";
                        statusText.style.color = "#04D361";
                        
                        // Roter Stop-Button
                        toggleBtn.innerText = "🛑 Stop Service";
                        toggleBtn.style.color = "#FF5555";
                        toggleBtn.style.borderColor = "#FF5555";
                    } else {
                        isHelperCurrentlyOnline = false;
                        statusText.innerText = "○ OFFLINE";
                        statusText.style.color = "#FF5555";
                        
                        // Grüner Start-Button
                        toggleBtn.innerText = "🚀 Start Service";
                        toggleBtn.style.color = "#04D361";
                        toggleBtn.style.borderColor = "#04D361";
                    }
                });
            }

            // Entscheidet je nach Status, ob gekillt oder gestartet werden soll
            function toggleHelperService() {
                const { ipcRenderer } = require('electron');
                const statusText = document.getElementById('helperStatusText');
                
                if (isHelperCurrentlyOnline) {
                    // 1. Sanfter Versuch über die Trigger-Datei
                    const trigger = path.join(dirPath, 'boost.trigger');
                    try {
                        fs.writeFileSync(trigger, JSON.stringify({ action: 'kill' }), 'utf8');
                    } catch(e) {}

                    // 2. Aggressiverer Versuch direkt über die Shell (Funktioniert bei helper.js oft ohne Sudo, da es dein Prozessraum ist)
                    const { exec } = require('child_process');
                    exec("pkill -f helper.js", (err) => {
                        // Kurze Verzögerung, um den Status live zu prüfen
                        setTimeout(checkHelperLiveStatus, 500);
                    });

                    statusText.innerText = "⏳ Stopping...";
                    statusText.style.color = "#8F8F9D";
                } else {
                    // Starten via IPC-Signal an die Haupt-App
                    ipcRenderer.send('trigger-start-helper');
                    statusText.innerText = "⏳ Starting...";
                    statusText.style.color = "#8F8F9D";
                }
            }
            
            function loadAllData() {
                try {
                    if (fs.existsSync(configPath)) {
                        currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    }
                    if (fs.existsSync(blacklistPath)) {
                        const content = fs.readFileSync(blacklistPath, 'utf8');
                        blacklistArray = content.split('\\n').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
                    }
                } catch(e) {}

                document.getElementById('lvl1').value = currentConfig.purgeLimit || 1500;
                document.getElementById('lvl1Val').innerText = (currentConfig.purgeLimit || 1500) + " MB";
                
                document.getElementById('lvl2').value = currentConfig.pauseLimit || 400;
                document.getElementById('lvl2Val').innerText = (currentConfig.pauseLimit || 400) + " MB";

                document.getElementById('keepAlive').checked = currentConfig.keepDaemonAlive !== false;
                
                // Werte für Engine-Checkboxen laden (Standardwerte falls nicht definiert)
                document.getElementById('fpsBoost').checked = currentConfig.isBoostActive !== false;
                document.getElementById('shaderGuard').checked = currentConfig.isShaderGuardActive === true;
                document.getElementById('engineLogging').checked = currentConfig.isLoggingActive === true;
                document.getElementById('loginAutostart').checked = currentConfig.isAutostartActive === true;
                document.getElementById('helperDebug').checked = currentConfig.isHelperDebugActive === true;

                renderBlacklist();

                // Sofortige Live-Prüfung beim Starten des Fensters ausführen
                checkHelperLiveStatus();
            }
            
// Lädt die exportierten Spiele beim Öffnen des Fensters ohne Scan direkt aus der TXT
async function loadSavedGamesList() {
    const { ipcRenderer } = require('electron');
    const container = document.getElementById('gamesContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#8F8F9D; font-size:12px; padding:10px; text-align:center;">Lade Spiele-Register...</div>';
    
    const result = await ipcRenderer.invoke('get-games-list');
    container.innerHTML = '';
    
    if (result.success && result.games && result.games.length > 0) {
        result.games.forEach(game => {
            const item = document.createElement('div');
            item.className = 'blacklist-item';
            item.style.borderColor = '#04D361'; // Grüne Spiele-Border
            item.innerText = game;
            container.appendChild(item);
        });
    } else {
        container.innerHTML = '<div style="color:#8F8F9D; font-size:12px; padding:10px; text-align:center;">Keine registrierten Spiele vorhanden. Bitte Scan starten.</div>';
    }
}

// Triggert den manuellen Scan über den Button im Einstellungsfenster
async function performManualGameScan() {
    const { ipcRenderer } = require('electron');
    const btn = document.getElementById('btnScanGames');
    const container = document.getElementById('gamesContainer');
    
    if (!btn || !container) return;
    
    btn.disabled = true;
    btn.innerText = "⏳ Suche Launcher-Einträge... (Bitte warten)";
    container.innerHTML = '<div style="color:#04D361; font-size:12px; padding:10px; text-align:center;">Festplatten und Launcher-Manifeste werden analysiert...</div>';
    
    const scanResult = await ipcRenderer.invoke('trigger-game-scan');
    
    btn.disabled = false;
    btn.innerText = "🔍 Nach installierten Spielen scannen";
    
    // Aktualisiert die Anzeige sofort nach Abschluss des Skripts
    loadSavedGamesList();
}

            function renderBlacklist() {
                const container = document.getElementById('blacklistContainer');
                container.innerHTML = '';
                
                if (blacklistArray.length === 0) {
                    container.innerHTML = '<div style="color:#8F8F9D; font-size:12px; padding:10px; text-align:center;">No processes blocked.</div>';
                    return;
                }

                blacklistArray.forEach((processName, index) => {
                    const item = document.createElement('div');
                    item.className = 'blacklist-item';
                    item.innerHTML = processName + '<span class="blacklist-remove" onclick="removeProcess(' + index + ')">×</span>';
                    container.appendChild(item);
                });
            }

            function addProcess() {
                const input = document.getElementById('blInput');
                const val = input.value.trim().toLowerCase();
                if (val && !blacklistArray.includes(val)) {
                    blacklistArray.push(val);
                    input.value = '';
                    renderBlacklist();
                }
            }

            function removeProcess(index) {
                blacklistArray.splice(index, 1);
                renderBlacklist();
            }

            function updateLabel(id, val) {
                document.getElementById(id).innerText = val + " MB";
            }

            function resetToDefaults() {
                document.getElementById('lvl1').value = 1500;
                document.getElementById('lvl1Val').innerText = "1500 MB";
                document.getElementById('lvl2').value = 400;
                document.getElementById('lvl2Val').innerText = "400 MB";
                document.getElementById('keepAlive').checked = true;
                
                // Standardwerte für Engine-Checkboxen setzen
                document.getElementById('fpsBoost').checked = true;
                document.getElementById('shaderGuard').checked = false;
                document.getElementById('engineLogging').checked = false;
                document.getElementById('loginAutostart').checked = false;
                document.getElementById('helperDebug').checked = false;
                
                blacklistArray = ['steam', 'steam.exe', 'steamservice.exe', 'steamwebhelper.exe', 'crossover', 'electron', 'epicgameslauncher', 'winewrapper.exe', 'wineloader', 'wineloader64'];
                renderBlacklist();
            }

            function saveSettings() {
                try {
                    currentConfig.purgeLimit = parseInt(document.getElementById('lvl1').value, 10);
                    currentConfig.pauseLimit = parseInt(document.getElementById('lvl2').value, 10);
                    currentConfig.keepDaemonAlive = document.getElementById('keepAlive').checked;
                    
                    // Werte aus den Checkboxen in die Konfiguration übernehmen
                    currentConfig.isBoostActive = document.getElementById('fpsBoost').checked;
                    currentConfig.isShaderGuardActive = document.getElementById('shaderGuard').checked;
                    currentConfig.isLoggingActive = document.getElementById('engineLogging').checked;
                    currentConfig.isAutostartActive = document.getElementById('loginAutostart').checked;
                    currentConfig.isHelperDebugActive = document.getElementById('helperDebug').checked;
                    
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4), 'utf8');
                    fs.writeFileSync(blacklistPath, blacklistArray.join('\\n'), 'utf8');
                    window.close();
                } catch(err) {
                    alert("Error saving configurations: " + err.message);
                }
            }

            // Live-Prüfungsintervall starten (alle 2 Sekunden)
            setInterval(checkHelperLiveStatus, 2000);

            loadAllData();
            loadSavedGamesList();
        </script>

    </body>
    </html>
    `;

    settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    settingsWindow.once('ready-to-show', () => { settingsWindow.show(); });
    settingsWindow.on('closed', () => { settingsWindow = null; });
}

function updateMenu() {
    const contextMenu = Menu.buildFromTemplate([
        { label: '🚀 MAC GAMING BOOSTER', enabled: false },
        { label: `${currentStatusText}`, enabled: false },
        { label: 'Version: 2.7.1 (Platin GUI Edition)', enabled: false },
        { label: 'Developer: Mario (flashi)', enabled: false },
        { type: 'separator' },
        {
            label: '📊 RAM Overlay On/Off',
            accelerator: 'CmdOrCtrl+Alt+R',
            click: () => { toggleRamOverlay(); }
        },
        { type: 'separator' },
        {
            label: '📂 Open Logs Folder',
            click: () => {
                const folderPath = path.dirname(LOG_FILE);
                if (fs.existsSync(folderPath)) {
                    shell.openPath(folderPath);
                }
            }
        },
        { 
            label: '⚙️ Settings...', 
            click: () => { openSettingsWindow(); } 
        },
        { type: 'separator' },
        { label: '❌ Quit App', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
    // 1. ZUERST EINSTELLUNGEN LADEN
    loadSettings();

    // LOGGING INITIALISIEREN
    if (isLoggingActive) {
        fs.writeFileSync(LOG_FILE, '', 'utf8');
        writeToRotatedLog("🚀 App initiated - Persistent logging ACTIVE.");
    }

    // 2. INTELLIGENTE WEICHE: Spielelisten laden oder initial erstellen
    const CONFIG_DIR = path.join(os.homedir(), 'Library/Application Support/fps-boost/config');
    const LIST_FILE = path.join(CONFIG_DIR, 'games_list.txt');
    const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
    
    const filesExist = fs.existsSync(LIST_FILE) && fs.existsSync(MAPPING_FILE);
    
    if (!filesExist) {
        writeToRotatedLog("ℹ️ Initialer Start: Dateien fehlen. Starte automatischen Hintergrund-Spiele-Scan...");
        const scannerPath = path.join(__dirname, 'check_games.js');
        
        if (fs.existsSync(scannerPath)) {
            const { fork } = require('child_process');
            const child = fork(scannerPath, [], { silent: true });
            child.on('close', (code) => {
                if (code === 0) {
                    writeToRotatedLog("✅ Hintergrund-Scan erfolgreich beendet. Lade Mapping...");
                    loadGamesMappingFile();
                } else {
                    writeToRotatedLog("❌ Hintergrund-Scan meldete einen Fehler beim Erstellen der Dateien.");
                }
            });
        } else {
            writeToRotatedLog("❌ Fehler beim App-Start: check_games.js wurde im Verzeichnis nicht gefunden.");
        }
    } else {
        // Dateien existieren bereits -> Direkt laden und CPU/Festplatte schonen!
        writeToRotatedLog("💾 Spielelisten bereits vorhanden. Überspringe Scan und lade Daten direkt...");
        loadGamesMappingFile();
    }

    // 3. ROOT-HELPER STARTEN & DOCK AUSBLENDEN
    startRootHelper();
    if (app.dock) app.dock.hide(); 

    // 4. TRAY / MENÜLEISTE INITIALISIEREN
    const isPackaged = app.isPackaged;
    const trayIconPath = isPackaged 
        ? path.join(process.resourcesPath, 'rocket.png') 
        : path.join(__dirname, 'rocket.png');

    if (!tray) {
        tray = new Tray(trayIconPath);
        tray.setToolTip('Mac Gaming Booster');
    }

    // 5. GLOBAL SHORTCUTS / HOTKEYS REGISTRIEREN
    globalShortcut.register('CommandOrControl+Alt+R', () => {
        toggleRamOverlay();
    });
    
    globalShortcut.register('Option+Left', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            const [x, y] = overlayWindow.getPosition();
            overlayWindow.setPosition(x - 20, y);
            overlayX = x - 20; overlayY = y;
            saveSettings();
        }
    });

    globalShortcut.register('Option+Right', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            const [x, y] = overlayWindow.getPosition();
            overlayWindow.setPosition(x + 20, y);
            overlayX = x + 20; overlayY = y;
            saveSettings();
        }
    });

    globalShortcut.register('Option+Up', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            const [x, y] = overlayWindow.getPosition();
            overlayWindow.setPosition(x, y - 20);
            overlayX = x; overlayY = y - 20;
            saveSettings();
        }
    });

    globalShortcut.register('Option+Down', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            const [x, y] = overlayWindow.getPosition();
            overlayWindow.setPosition(x, y + 20);
            overlayX = x; overlayY = y + 20;
            saveSettings();
        }
    });

    globalShortcut.register('Option+Command+K', () => {
        if (intervalId) clearInterval(intervalId);
        if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
        if (overlayInterval) clearInterval(overlayInterval);
        app.quit();
        process.exit(0); 
    });

    // 6. MENÜ AKTUALISIEREN & MONITORING-INTERVAL STARTEN
    updateMenu();
    intervalId = setInterval(checkAndBoostGames, 4000);

    writeToRotatedLog("⚙️ Alle Start-Systeme erfolgreich verkettet und aktiv.");
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (intervalId) clearInterval(intervalId);
    if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
    if (overlayInterval) clearInterval(overlayInterval);
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (configData.keepDaemonAlive === false) {
                writeToRotatedLog("🧹 Variante 2 aktiv: Sende Selbstzerstörungsbefehl an den Root-Helper...");
                
                const triggerPath = path.join(app.getPath('userData'), 'boost.trigger');
                fs.writeFileSync(triggerPath, JSON.stringify({ action: 'kill' }), 'utf8');
            }
        }
    } catch (e) {
        writeToRotatedLog("❌ Fehler beim sauberes Schließen des Helpers: " + e.message);
    }
});

app.on('window-all-closed', (e) => { e.preventDefault(); });
