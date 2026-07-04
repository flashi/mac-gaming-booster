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

            // =================================================================
            // 🛑 DEAKTIVIERTER ALTER CODE (UNSAUBERE ARBEITSSPEICHER-LAST!)
            // =================================================================
            // WARUM DEAKTIVIERT: Läuft ohne Vorfilterung blind durch jede Zeile. 
            // Leere Zeilen oder Zeilen mit reinen Leerzeichen (Whitespaces) wurden
            // unbemerkt in die Schleife geschoben und verbrauchten unnötig Rechenzeit
            // im RAM, obwohl sie keinen verwertbaren Inhalt hatten.
            // 
            // content.split('\n').forEach(line => {
            //     const parts = line.trim().split('=>');
            //     if (parts.length === 2) {
            //         const gameName = parts[0].trim();
            //         const processRaw = parts[1].trim().toLowerCase();

            // =================================================================
            // ⚡️ NEUER SCHUTZ-FILTER (v2.8.0-ALPHA CLEAN-RAM CODE)
            // =================================================================
            // WIE ES FUNKTIONIERT: .map(line => line.trim()) bereinigt Whitespaces.
            // .filter(line => line.length > 0) wirft alle leeren Zeilen rigoros aus 
            // dem Speicher, BEVOR das ressourcenintensive .forEach() anspringt.
            // Das sorgt für einen absolut datenmüllfreien Kaltstart im Unified Memory!
            content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .forEach(line => {
                    const parts = line.split('=>');
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

let initialLoad = true; // Globaler Marker über loadSettings() platzieren

function loadSettings() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            
            if (config.isBoostActive !== undefined) isBoostActive = config.isBoostActive;
            if (config.isLoggingActive !== undefined) isLoggingActive = config.isLoggingActive;
            if (config.isHelperDebugActive !== undefined) isHelperDebugActive = config.isHelperDebugActive;
            if (config.isAutostartActive !== undefined) isAutostartActive = config.isAutostartActive;
            if (config.isShaderGuardActive !== undefined) isShaderGuardActive = config.isShaderGuardActive;
            if (config.overlayX !== undefined) overlayX = config.overlayX;
            if (config.overlayY !== undefined) overlayY = config.overlayY;
            
            // Loggt NUR beim echten Kaltstart, verhindert Spam in der Live-Schleife
            if (initialLoad) {
                writeToRotatedLog(`💾 Einstellungen geladen. Boost-Status beim Start: [${isBoostActive}]`);
                initialLoad = false;
            }
        }
    } catch (e) {
        writeToRotatedLog("❌ Fehler beim Laden der booster_config.json: " + e.message);
    }
}

function saveSettings() {
    try {
        const config = { isBoostActive, isLoggingActive, isHelperDebugActive, isAutostartActive, isShaderGuardActive, overlayX, overlayY };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        // =================================================================
        // 🛑 DEAKTIVIERTER ALTER CODE (LAUTLOSER CATCH-BLOCK)
        // =================================================================
        // WARUM DEAKTIVIERT: Wenn macOS das Schreiben blockierte (z.B. durch 
        // plötzlichen Entzug der Schreibrechte oder weil die Festplatte voll war),
        // hat dieser leere Block den Fehler verschluckt. Die GUI tat so, als wäre
        // alles gespeichert, aber auf der Platte kam nie etwas an.
        // 
        // } catch (e) {}

        // =================================================================
        // ⚡️ NEUER SCHREIB-MONITOR (v2.8.0-ALPHA LOGGING EFFECT)
        // =================================================================
        // WIE ES FUNKTIONIERT: Schreibt den blockierten Schreibbefehl mitsamt der
        // originalen macOS-Fehlermeldung direkt in dein rotierendes Logbuch!
        writeToRotatedLog("❌ Fehler beim Speichern der booster_config.json: " + e.message);
    }
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

    // =================================================================
    // ⚡️ MODERNE OVERLAY-GRÖSSE (v2.8.0-Alpha Premium HUD)
    // =================================================================
    // Die Höhe wird von 75 auf 145 erhöht, um Platz für die Kernel- & Spiele-Statistiken zu machen.
    overlayWindow = new BrowserWindow({
        width: 240,
        height: 160, 
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

    // =================================================================
    // 🛑 DEAKTIVIERTER ALTER INTERFACE-TEXT (NUR REINER RAM-VERBRAUCH)
    // =================================================================
    /*
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
    */

    // =================================================================
    // ⚡️ NEUES NATIVES HOCHLEISTUNGS-LAYOUT (v2.8.0 Platin HUD)
    // =================================================================
    const htmlContent = `
        <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:white; background:rgba(15,15,15,0.82); margin:0; padding:10px; border-radius:8px; font-size:11px; border:1px solid rgba(255,255,255,0.12); overflow:hidden; user-select:none; backdrop-filter:blur(8px);">
            <div style="font-weight:bold; font-size:12px; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.15); color:#00ffcc; display:flex; justify-content:space-between; letter-spacing:0.5px;">
                <span>🚀 GAME BOOSTER HUD</span>
                <span id="ram-status" style="color:#00ff00;">● Live</span>
            </div>
            
            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888aa;">💾 Memory:</span>
                <span id="hud-ram-used" style="font-weight:500;">-- GB / -- GB</span>
            </div>

            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888aa;">🧹 Free Cache:</span>
                <span id="hud-ram-free" style="font-weight:bold; color:#00ffaa;">-- MB</span>
            </div>
            
            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888aa;">🎮 Game:</span>
                <span id="hud-game-name" style="font-weight:bold; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#ffffff;">None</span>
            </div>

            <div style="margin-bottom:5px; display:flex; justify-content:space-between;">
                <span style="color:#888aa;">🆔 Process:</span>
                <span id="hud-game-pid" style="color:#ffffff;">-</span>
            </div>

            <div style="display:flex; justify-content:space-between; margin-top:5px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08);">
                <span style="color:#888aa;">🛡️ Kernel:</span>
                <span id="hud-kernel-status" style="font-weight:bold; font-size:10px; letter-spacing:0.3px; color:#aaaaaa;">⚪️ STANDBY</span>
            </div>
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

            // Live-Zustandsvariablen für die Auslesung im Speicher berechnen
            let activeGameName = "None";
            let activePID = "-";
            let kernelStatus = "⚪️ STANDBY";
            let statusColor = "#aaaaaa";

            // Schleifen-Gedächtnis prüfen, um fliegende Prozessänderungen abzufangen
            for (let key of optimizedPIDs) {
                if (key.includes('_max_')) {
                    // Sichert deinen neuen Prozess-Namen-Wächter ab! (Format: "PID_max_Name")
                    const parts = key.split('_');
                    activePID = parts[0];
                    kernelStatus = "⚡️ MAX-BOOST (-5)";
                    statusColor = "#00ff00"; // Grün bei Boost
                    
                    // Extrahiert den sauberen Namen, den wir im Tray gefixt haben
                    activeGameName = currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').trim();
                    break;
                } else if (key.endsWith('_max')) {
                    // Fallback für reine PID-Keys
                    activePID = key.replace('_max', '');
                    kernelStatus = "⚡️ MAX-BOOST (-5)";
                    statusColor = "#00ff00";
                    activeGameName = currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').trim();
                    break;
                } else if (key.endsWith('_mid')) {
                    activePID = key.replace('_mid', '');
                    kernelStatus = "⚡️ MID-BOOST (-1)";
                    statusColor = "#ffcc00"; // Gelb bei Wrappern
                    activeGameName = currentStatusText.replace('🟡 MID-Boost: 📦 ', '').replace('🎮 ', '').trim();
                    break;
                }
            }

            // JavaScript-Injektion feuert die berechneten Live-Zustände direkt ins DOM des Overlays
            overlayWindow.webContents.executeJavaScript(`
                if (document.getElementById('hud-ram-used')) {
                    document.getElementById('hud-ram-used').innerHTML = '${usedGB} GB / ${total} GB';
                    document.getElementById('hud-ram-free').innerHTML = '${freeMB} MB';
                    document.getElementById('hud-game-name').innerHTML = '${activeGameName}';
                    document.getElementById('hud-game-pid').innerHTML = '${activePID !== '-' ? 'PID ' + activePID : '-'}';
                    document.getElementById('hud-kernel-status').innerHTML = '${kernelStatus}';
                    document.getElementById('hud-kernel-status').style.color = '${statusColor}';
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
    if (!fullPath) return appName || "Unknown Game";

    // 🔥 DER UNIX-CONVERTER: Macht aus jedem \ ein /, damit /common/ intern gefunden wird!
    const normalizedPath = fullPath.replace(/\\/g, '/');
    let baseName = appName ? appName.replace(/\.exe/i, '').trim().toLowerCase() : "";
    
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

// Wir merken uns den letzten Zustand im RAM, um Änderungen sofort zu erkennen
let lastKnownBoostState = null; 

function checkAndBoostGames() {
    // ⚡️ LIVE-SETTINGS-RELOAD
    loadSettings();
    
    // 🧠 DYNAMISCHER LIVE-RESET SCHALTER (v2.8.0-Alpha Flight-Control)
    // Wenn die Schleife merkt, dass der Haken in der GUI live umgelegt wurde,
    // löschen wir sofort alle alten RAM-Zustands-Marker, damit die Engine
    // im selben Moment die Richtung im Kernel wechseln darf!
    if (lastKnownBoostState !== null && lastKnownBoostState !== isBoostActive) {
        writeToRotatedLog(`🔄 Live-Umschaltung erkannt! FPS-Boost steht jetzt auf: [${isBoostActive}]`);
        optimizedPIDs.clear(); // Löscht das alte Schleifen-Gedächtnis fliegend im RAM
    }
    lastKnownBoostState = isBoostActive; // Aktualisiert den Kontroll-Zustand

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

    // Ab hier läuft dein ganz normaler ps-Befehl weiter...


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
            
            // 🔥 WICHTIGER FIX: lowerPath für die Pfad- & Sony-Filter zwingend deklarieren!
            const lowerPath = normalizedPath.toLowerCase();

            // =================================================================
            // 🛑 DEAKTIVIERTER ALTER CODE (VERURSACHTE FEHLER BEI LEERZEICHEN!)
            // =================================================================
            // WARUM GEKIPPT: .split(' ')[0] schnitt Pfade bei Leerzeichen ab ("Cyberpunk 2077").
            // let extractedExe = path.basename(normalizedPath.split(' ')[0]);

            // =================================================================
            // ⚡️ NEUER OPTIMIERTER CODE (100% LEERZEICHENSICHER FÜR v2.8.0)
            // =================================================================
            // WIE ES FUNKTIONIERT: Nutzung des vollen Pfades und path.basename.
            let extractedExe = path.basename(normalizedPath);
            
            // Bereinigung für Prozessname
            const lowName = extractedExe.toLowerCase();
            const cleanName = lowName.replace(/[()]/g, '');

            // -----------------------------------------------------------------
            // 🔄 DYNAMISCHER MEHRWEG-ABGLEICH (Mit ultimativem Interne-SSD-Fix)
            // -----------------------------------------------------------------
            let displayGameName = "";
            let isMatchedGame = false;

            // ⚡️ STEAM-INTERN-FIX: Erkennt alle Spiele auf der internen SSD fehlerfrei
            if (lowerPath.includes('steamapps')) {
                // Wandelt alle Windows-Backslashes (\) im RAM in Unix-Slashes (/) um
                const standardPath = normalizedPath.replace(/\\/g, '/');
                const detectedName = getCleanGameName(standardPath, extractedExe);
                
                if (detectedName) {
                    // Wir reinigen den extrahierten Ordnernamen von allen Leer- und Sonderzeichen
                    const cleanDetected = detectedName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

                    // CHECK 1: Ordnername gegen den Klarnamen (Schlüssel) in deiner Textdatei
                    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                        if (processKey) {
                            const cleanKey = processKey.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                            
                            // Wenn der gereinigte Ordnername zum Klarnamen passt: MATCH!
                            if (cleanKey.includes(cleanDetected) || cleanDetected.includes(cleanKey)) {
                                displayGameName = `🎮 ${processKey}`;
                                isMatchedGame = true;
                                break;
                            }
                        }
                    }
                }
                
                // 🛡️ THE BULLETPROOF RETTUNGSANKER FOR INTERNAL SSD:
                // Wenn der Ordner-Abgleich oben fehlschlägt, prüfen wir die nackte .exe (cleanName)
                // direkt gegen die Werte (Values) deiner games_exe_mapping.txt!
                if (!isMatchedGame) {
                    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                        if (gameTitle) {
                            // Splittet Mehrfach-Exen wie u4.exe||tll-l.exe sauber auf
                            const exes = gameTitle.toLowerCase().split('||').map(e => e.trim());
                            
                            // Wenn deine echte Spiel-EXE (z.B. Cyberpunk2077 oder u4.exe) im Wert steht: VOLLTREFFER!
                            if (exes.includes(cleanName) || exes.some(e => e.includes(cleanName) || cleanName.includes(e))) {
                                displayGameName = `🎮 ${processKey}`;
                                isMatchedGame = true;
                                break;
                            }
                        }
                    }
                }
            }
//

            // =================================================================
            // ⚡️ NEUER OPTIMIERTER WEG A (Schreibweisensicher & Dynamisch v2.8.0)
            // =================================================================
            if (!isMatchedGame) {
                // Erst-Check: Wir suchen schreibweisenunabhängig in den Mapping-Schlüsseln
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    if (processKey && processKey !== 'unknown_executable.exe') {
                        const cleanKey = processKey.toLowerCase().trim();
                        
                        // Wenn der Prozessname exakt dem Key entspricht (z.B. "trackmania.exe" === "trackmania.exe")
                        // ODER wenn ein Teil-Match vorliegt (z.B. für native Mac-Ports wie "mafia3_exe")
                        if (cleanName === cleanKey || (cleanName.includes(cleanKey) && cleanKey.length > 2)) {
                            displayGameName = `🎮 ${gameTitle}`; // Holt den sauberen Klarnamen aus der Textdatei!
                            isMatchedGame = true;
                            break;
                        }
                    }
                }
            }

            // =================================================================
            // ⚡️ WEG B: TIEFEN-PFAD-PRÜFUNG (Schreibweisensicher optimiert)
            // =================================================================
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

            // FALLBACK-SCHUTZ: Bereinigt unschöne .exe-Endungen am Ende des Namens, falls noch welche kleben
            if (isMatchedGame && displayGameName.toLowerCase().endsWith('.exe')) {
                displayGameName = displayGameName.replace(/\.exe$/i, '').trim();
            }
            
//

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


            // Sicherheits-Stopp: Wenn kein Treffer im Mapping -> Überspringen
            if (!isMatchedGame) return;

            // Blacklist-Abgleich
            const isBlacklisted = userBlacklist.some(ignoredName => cleanName === ignoredName);
            if (isBlacklisted) return;

            // Die PID wird registriert
            currentPIDs.add(pid);

            // Verhindert Signal-Spam: Wenn die PID bereits im Boost-Speicher ist, überspringen
            if (optimizedPIDs.has(pid)) return;
            optimizedPIDs.add(pid);
            
            writeToRotatedLog(`🎯 Game detected: 📦 ${displayGameName} (PID: ${pid})`);
            manageRamGuardState(true);


            // -----------------------------------------------------------------
            // ⚡️ ADAPTIVE TRIGGER-ENGINE (Live-Zustandssteuerung v2.8.0-Alpha)
            // -----------------------------------------------------------------
            if (isBoostActive) {
                // Sichert den RAM-Guard Start beim ersten Erfassen des Spiels
                if (!optimizedPIDs.has(pid)) {
                    writeToRotatedLog(`🎯 Game detected: 📦 ${displayGameName} (PID: ${pid})`);
                    manageRamGuardState(true);
                }
                
                // =================================================================
                // ⚡️ ADAPTIVE TRIGGER-ENGINE (Trackmania/Ubisoft-Erweiterung v2.8.0)
                // =================================================================
                // WIE ES FUNKTIONIERT: Ein crs-handler oder der Ubisoft-Connect-Installer 
                // für Trackmania sind KEINE unbedeutenden Wrapper, sondern die echten Spiele-Engines!
                const isUbisoftTrackmania = lowName.includes('ubisoftconnectinstaller');
                
                const isWrapper = (lowName.includes('winewrapper') || lowName.includes('winedevice') || lowName.includes('wineboot')) 
                                  && !lowerPath.includes('crs-handler') 
                                  && !isUbisoftTrackmania;

                if (!isWrapper) {
                    // =================================================================
                    // 🛑 DEAKTIVIERTER ALTER CODE (PRALLTE AN RECYCELTEN PIDs AB)
                    // =================================================================
                    // WARUM GEKIPPT: Prüfte nur die PID ('pid + _max'). Native Mac-Spiele wie 
                    // Mafia III nutzen dieselbe PID erst für den Launcher (AppBundleExe) und 
                    // tauschen sie Ingame fliegend gegen die echte Engine (Mafia3_Exe). 
                    // Das alte Gedächtnis dachte, der Prozess sei schon geboostet, und ignorierte das Spiel.
                    //
                    // if (!optimizedPIDs.has(pid + '_max')) {
                    //     optimizedPIDs.delete(pid + '_reset'); 
                    //     optimizedPIDs.delete(pid + '_mid');
                    //     optimizedPIDs.add(pid + '_max');
                    //     optimizedPIDs.add(pid);
                    //     sendToRootHelper(pid, -5);
                    //     writeToRotatedLog(`⚡️ Trigger-Engine: MAX-Boost für...`);
                    // }

                    // =================================================================
                    // ⚡️ NEUER PROZESS-NAMEN-WÄCHTER (v2.8.0-Alpha Flight-Control)
                    // =================================================================
                    // WIE ES FUNKTIONIERT: Wir binden den Dateinamen in den RAM-Schlüssel ein.
                    // Ändert sich der Name hinter der PID, fliegt die alte Sperre raus und
                    // die eigentliche Spiele-Engine wird im Kernel sofort auf -5 nachgeboostet!
                    const nameSpecificKey = `${pid}_max_${cleanName}`;

                    if (!optimizedPIDs.has(nameSpecificKey)) {
                        // Säubere alte Launcher-Reste dieser PID fliegend aus dem Arbeitsspeicher
                        for (let key of optimizedPIDs) {
                            if (key.startsWith(`${pid}_max_`)) {
                                optimizedPIDs.delete(key);
                            }
                        }
                        
                        optimizedPIDs.delete(pid + '_reset'); 
                        optimizedPIDs.delete(pid + '_mid');
                        
                        optimizedPIDs.add(nameSpecificKey);
                        optimizedPIDs.add(pid); // Für die Aufräum-Schleife kompatibel halten

                        sendToRootHelper(pid, -5);
                        writeToRotatedLog(`⚡️ Trigger-Engine: MAX-Boost für ${displayGameName} (${cleanName} / PID: ${pid}) geschrieben.`);
                        sendNotification(`Performance boost (MAX) activated for "${displayGameName}"!`);
                    }
                    currentStatusText = `🟢 MAX-Boost: 📦 ${displayGameName}`;
                    updateMenu();
                } else {
                    // Wrapper-Zweig
                    if (!optimizedPIDs.has(pid + '_mid')) {
                        optimizedPIDs.delete(pid + '_reset');
                        optimizedPIDs.delete(pid + '_max');
                        optimizedPIDs.add(pid + '_mid');
                        optimizedPIDs.add(pid);

                        sendToRootHelper(pid, -1);
                        writeToRotatedLog(`⚡️ Trigger-Engine: Parallel-Prozess ${displayGameName} (PID: ${pid}) auf MID gesetzt.`);
                    }
                    currentStatusText = `🟡 MID-Boost: 📦 ${displayGameName}`;
                    updateMenu();
                }
            } else {
                // =================================================================
                // ⚡️ LIVE-RESET IM LAUFENDEN BETRIEB (100% fliegend & ohne Neustart)
                // =================================================================
                
                // FALL 1: Der Haken wurde gerade live im Spiel ENTFERNT (Von AN auf AUS)
                if (optimizedPIDs.has(pid + '_max') || optimizedPIDs.has(pid + '_mid')) {
                    // Lösche die aktiven Boost-Zustände sofort aus dem RAM
                    optimizedPIDs.delete(pid + '_max');
                    optimizedPIDs.delete(pid + '_mid');
                    
                    // Zwinge den Kernel-Wert des laufenden Spiels live auf 0 zurück
                    sendToRootHelper(pid, 0);
                    writeToRotatedLog(`⌛️ Trigger-Engine: Live-Prioritätswechsel! ${displayGameName} (PID: ${pid}) auf Standard (0) zurückgesetzt.`);
                    
                    // Setze den Reset-Marker, damit dieser Befehl ab jetzt blockiert wird (Spam-Schutz)
                    optimizedPIDs.add(pid + '_reset');
                }
                
                // FALL 2: KALTSTART oder Absicherung des Reset-Zustands
                // Wenn weder ein aktiver Boost noch ein Reset-Marker da ist, initialisieren wir den Standby
                if (!optimizedPIDs.has(pid + '_reset') && !optimizedPIDs.has(pid + '_max') && !optimizedPIDs.has(pid + '_mid')) {
                    optimizedPIDs.add(pid + '_reset');
                    optimizedPIDs.add(pid); // Hält die nackte PID für die Aufräumschleife im RAM
                    
                    sendToRootHelper(pid, 0);
                    writeToRotatedLog(`⌛️ Trigger-Engine: App mit deaktiviertem Boost gestartet. ${displayGameName} (PID: ${pid}) auf Standard (0) gesetzt.`);
                }

                currentStatusText = `⚪️ Standby: 📦 ${displayGameName} (Kein Boost)`;
                updateMenu();
            }

        });


        // =================================================================
        // 🧹 ABSOLUT STABILE AUFRÄUM-LOGIK (Filtert alle Suffixe & Spam-Marker)
        // =================================================================
        for (let stateKey of optimizedPIDs) {
            // Holt die reine PID aus den Zustandsschlüsseln (z.B. "25114_reset" -> "25114")
            const purePID = stateKey.split('_')[0];
            
            if (!currentPIDs.has(purePID)) {
                optimizedPIDs.delete(stateKey);
                
                // Wir loggen das Beenden des Spiels nur einmalig für die nackte Haupt-PID
                if (stateKey === purePID) {
                    writeToRotatedLog(`⏳ Game with PID ${purePID} terminated. Evacuated from memory.`);
                    exec('sudo purge', () => {
                        writeToRotatedLog("🧹 RAM Purge: Inactive disk cache successfully cleared.");
                    });
                }

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
        <div class="subtitle">Core Engine Settings & Management (v2.8.0 Platin)</div>
        
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
                    <div class="option-desc">Dynamically renices game process priorities via root helper in real-time. (⚡️ Changes take effect instantly!)</div>
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
        <button class="btn-add" id="btnScanGames" onclick="performManualGameScan()" style="width: 100%; padding: 8px 0; font-size: 13px;">🔍 Scan for installed games</button>

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
        { label: 'Version: 2.8.0 (Platin GUI Edition)', enabled: false },
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
