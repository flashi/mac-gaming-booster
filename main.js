const { app, Tray, Menu, shell, Notification, globalShortcut, BrowserWindow, screen, ipcMain } = require('electron');
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
const CONFIG_DIR = path.join(USER_DATA_PATH, 'config');
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
const CONFIG_FILE = path.join(CONFIG_DIR, 'booster_config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'gaming_boost.log');
const BLACKLIST_FILE = path.join(CONFIG_DIR, 'blacklist.txt');
let isBoostActive = true;
let isLoggingActive = false;
let isHelperDebugActive = false;
let isAutostartActive = false;
let isShaderGuardActive = false;
let optimizedPIDs = new Set();
let currentStatusText = '🎮 Status: No active games';
let lastPromptTime = 0; 
const PROMPT_COOLDOWN = 1 * 60 * 1000;
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
let activeGamesMapping = new Map();
const OVERRIDES_FILE = path.join(CONFIG_DIR, 'scanner_overrides.json');
if (!fs.existsSync(OVERRIDES_FILE)) {
    try {
        fs.writeFileSync(OVERRIDES_FILE, JSON.stringify({}, null, 2), 'utf8');
        console.log("✨ Neue scanner_overrides.json wurde erfolgreich im Config-Ordner generiert!");
    } catch (e) {
        console.error("Fehler beim Erstellen der scanner_overrides.json:", e.message);
    }
}
function loadGamesMappingFile() {
    const MAPPING_FILE = path.join(os.homedir(), 'Library/Application Support/fps-boost/config/games_exe_mapping.txt');
    activeGamesMapping.clear();
    try {
        if (fs.existsSync(MAPPING_FILE)) {
            const content = fs.readFileSync(MAPPING_FILE, 'utf-8');
            content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .forEach(line => {
                    const parts = line.split('=>');
                    if (parts.length === 2) {
                        const gameName = parts[0].trim();
                        const processRaw = parts[1].trim().toLowerCase();
                        if (processRaw && processRaw !== 'unknown_executable.exe') {
                            if (processRaw.includes('||')) {
                                const multipleExes = processRaw.split('||');
                                multipleExes.forEach(exe => {
                                    const cleanExe = exe.trim();
                                    if (cleanExe.length > 2) {
                                        activeGamesMapping.set(cleanExe, gameName);
                                    }
                                });
                            } else {
                                activeGamesMapping.set(processRaw, gameName);
                            }
                        }
                    }
                });
            writeToRotatedLog(`🔄 Dynamic Mapping Engine: ${activeGamesMapping.size} game processes successfully loaded.`);
        } else {
            writeToRotatedLog("⚠️ Notice: games_exe_mapping.txt does not exist. Please run a scan.");
        }
    } catch (e) {
        writeToRotatedLog("❌ Error loading games_exe_mapping.txt: " + e.message);
    }
}
function sendToRootHelper(pid, level) {
    try {
        const triggerPath = path.join(os.homedir(), 'Library/Application Support/fps-boost/config/boost.trigger');
        const payload = JSON.stringify({ 
            action: 'boost', 
            pid: parseInt(pid, 10), 
            level: parseInt(level, 10) 
        });
        fs.writeFileSync(triggerPath, payload, 'utf8');
        const displayLevel = (parseInt(level, 10) <= -5) ? -20 : level;   
        writeToRotatedLog(`⚡️ Trigger Engine: MAX-Boost written for PID ${pid} (Level: ${displayLevel}).`);
    } catch (e) {
        writeToRotatedLog("❌ Error writing file trigger: " + e.message);
    }
}
let isHelperStarting = false;
if (false) {
    function startRootHelper() {
        if (isHelperStarting) return;
    const userAppSupportPath = CONFIG_DIR;
    const helperExternalPath = path.join(app.getPath('userData'), 'helper.js');
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
            const safeConfigPath = JSON.stringify(CONFIG_FILE);
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
                   `do shell script "\\"${absoluteNodePath}\\" \\"${helperExternalPath}\\" > /dev/null 2>&1 &" with administrator privileges with prompt "Mac Gaming Booster requires admin privileges for kernel process optimization:" given icon iconFile`;
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
}
function startRootHelper() {
    if (isHelperStarting) return;
    const userAppSupportPath = CONFIG_DIR;
    const helperExternalPath = path.join(app.getPath('userData'), 'helper.js');
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
        const safeConfigPath = JSON.stringify(CONFIG_FILE);
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
try {
    if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        if (stats.size > 1024 * 1024) { // 1 MB
            fs.writeFileSync(logPath, "[" + new Date().toLocaleTimeString() + "] 🔄 Helper log rotated: Cleared old entries.\\n", 'utf8');
        }
    }
} catch (e) {}
logDebug("🚀 File root helper successfully started and active.");
setInterval(() => {
    try {
        if (fs.existsSync(triggerPath)) {
            const content = fs.readFileSync(triggerPath, 'utf8').trim(); 
            if (content && content.length > 0) {
                fs.writeFileSync(triggerPath, '', 'utf8'); 
                const msg = JSON.parse(content);
                if (msg.action === 'kill') {
                    logDebug("🛑 Self-termination command received. Exiting root helper process gracefully.");
                    process.exit(0); 
                }  
                if (msg.action === 'boost' && msg.pid) {
                    logDebug("📥 File trigger received for PID: " + msg.pid);
                    let secureCommand = "";
                    if (parseInt(msg.level, 10) === 0) {
                        // Reset: Wir prüfen erst mit kill -0, ob der Prozess noch existiert. 
                        // Falls er schon geschlossen ist, geben wir lautlos Entwarnung (echo), statt abzustürzen.
                        secureCommand = "kill -0 " + msg.pid + " 2>/dev/null && taskpolicy -b -p " + msg.pid + " && renice 0 -p " + msg.pid + " || echo 'Process_already_gone'";
                    } else if (parseInt(msg.level, 10) === -1) {
                        // Mid-Stufe: Behält die alte moderate Wrapper-Priorität bei (-1)
                        secureCommand = "renice " + msg.level + " " + msg.pid;
                    } else {
                        // Max-Stufe: Holt das Spiel von den E-Kernen auf die P-Kerne (-B) und zwingt die CPU auf das harte -20 Limit!
                        secureCommand = "taskpolicy -B -p " + msg.pid + " && renice -20 -p " + msg.pid;
                    }
                    exec(secureCommand, (err, stdout, stderr) => {
                        if (err) {
                            if (parseInt(msg.level, 10) === 0 && (stderr.includes("No such process") || err.message.includes("No such process"))) {
                                logDebug("ℹ️ Process was already closed by user. No reset required.");
                            } else {
                                logDebug("❌ Kernel error: " + (stderr || err.message)); 
                            }
                        }
                        else { logDebug("✅ Kernel success! Befehl [" + secureCommand + "] erfolgreich abgesetzt."); }
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
               `do shell script "\\"${absoluteNodePath}\\" \\"${helperExternalPath}\\" > /dev/null 2>&1 &" with administrator privileges with prompt "Mac Gaming Booster requires admin privileges for kernel process optimization:" given icon iconFile`;
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
let initialLoad = true;
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
            if (typeof app !== 'undefined') {
                app.setLoginItemSettings({
                    openAtLogin: isAutostartActive,
                    openAsHidden: false,
                    path: app.getPath('exe')
                });
            }
            if (initialLoad) {
                writeToRotatedLog(`💾 Settings loaded. Boost status at startup: [${isBoostActive}]`);
                initialLoad = false;
            }
        }
    } catch (e) {
        writeToRotatedLog("❌ Error loading booster_config.json: " + e.message);
    }
}
function saveSettings() {
    try {
        const config = { isBoostActive, isLoggingActive, isHelperDebugActive, isAutostartActive, isShaderGuardActive, overlayX, overlayY };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        writeToRotatedLog("❌ Error saving booster_config.json: " + e.message);
    }
}
function writeToRotatedLog(newText) {
    if (!isLoggingActive) return;
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${newText}\n`;
    try {
        if (fs.existsSync(LOG_FILE)) {
            const stats = fs.statSync(LOG_FILE);
            const fileSizeInMB = stats.size / (1024 * 1024);
            if (fileSizeInMB > 1) {
                fs.writeFileSync(LOG_FILE, `[${timestamp}] 🔄 Log rotated: Cleared old entries due to 1MB size limit.\n`, 'utf8');
            }
        }
        fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    } catch (e) {
        console.error("Failed to write to log:", e.message);
    }
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
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    overlayWindow = new BrowserWindow({
        width: 300,
        height: 165,
        x: (typeof overlayX !== 'undefined' && overlayX !== undefined) ? overlayX : (width - 270),
        y: (typeof overlayY !== 'undefined' && overlayY !== undefined) ? overlayY : 40,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    const htmlContent = `
        <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:white; background:rgba(15,15,15,0.82); margin:0; padding:10px; border-radius:8px; font-size:11px; border:1px solid rgba(255,255,255,0.12); overflow:hidden; user-select:none; backdrop-filter:blur(8px);">
            <div style="font-weight:bold; font-size:12px; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.15); color:#00ffcc; display:flex; justify-content:space-between; letter-spacing:0.5px;">
                <span>🚀 GAME BOOSTER HUD</span>
                <span id="ram-status" style="color:#00ff00;">● Live</span>
            </div>
            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888;">💾 Memory:</span>
                <span id="hud-ram-used" style="font-weight:500;">-- GB / -- GB</span>
            </div>
            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888;">🧹 Free Cache:</span>
                <span id="hud-ram-free" style="font-weight:bold; color:#00ffaa;">-- MB</span>
            </div>
            <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                <span style="color:#888;">🎮 Game:</span>
                <span id="hud-game-name" style="font-weight:bold; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#ffffff;">None</span>
            </div>
            <div style="margin-bottom:5px; display:flex; justify-content:space-between;">
                <span style="color:#888;">🆔 Process:</span>
                <span id="hud-game-pid" style="color:#ffffff;">-</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:5px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08);">
                <span style="color:#888;">⚙️ Booster Engine:</span>
                <span id="hud-kernel-status" style="font-weight:bold; font-size:10px; letter-spacing:0.3px; color:#aaaaaa;">⚪️ READY</span>
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
            let activeGameName = "None";
            let activePID = "-";
            let kernelStatus = "⚪️ STANDBY";
            let statusColor = "#aaaaaa";
            for (let key of optimizedPIDs) {
                if (key.includes('_max_') || key.endsWith('_max')) {
                    if (key.includes('_max_')) {
                        const parts = key.split('_');
                        activePID = parts[0];
                    } else {
                        activePID = key.replace('_max', '');
                    }
                    const start = performance.now();
                    try {
                        require('child_process').execSync(`lsappinfo info -only Status $(lsappinfo find p=${activePID})`, { stdio: 'ignore' });
                    } catch (e) {}
                    const end = performance.now();
                    const latencyMs = (end - start).toFixed(1);
                    const latency = parseFloat(latencyMs);
                    try {
                        const tmpPath = require('path').join('/tmp', 'fps_boost_live.json');
                        require('fs').writeFileSync(tmpPath, JSON.stringify({
                            latencyMs: latencyMs,
                            fpsLive: (1000 / (end - start)).toFixed(1),
                            gameName: currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').trim(),
                            pid: activePID
                        }), 'utf8');
                    } catch (e) {}
                    if (latency < 15) {
                        kernelStatus = `⚡️ OPTIMAL [${latencyMs} ms]`;
                        statusColor = "#00ffcc";
                    } else if (latency >= 15 && latency < 35) {
                        kernelStatus = `⚡️ GOOD [${latencyMs} ms]`;
                        statusColor = "#00ff00";
                    } else {
                        kernelStatus = `⏳ HEAVY LOAD [${latencyMs} ms]`;
                        statusColor = "#ffcc00";
                    }
                    activeGameName = currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').trim();
                    break;
                } else if (key.endsWith('_mid')) {
                    activePID = key.replace('_mid', '');
                    kernelStatus = "⚡️ MID-BOOST (-1)";
                    statusColor = "#ffcc00";
                    activeGameName = currentStatusText.replace('🟡 MID-Boost: 📦 ', '').replace('🎮 ', '').trim();
                    try {
                        const tmpPath = require('path').join('/tmp', 'fps_boost_live.json');
                        require('fs').writeFileSync(tmpPath, JSON.stringify({
                            latencyMs: "0.0",
                            fpsLive: "0.0",
                            gameName: activeGameName,
                            pid: activePID
                        }), 'utf8');
                    } catch (e) {}
                    break;
                } else {
                    activePID = key.includes('_') ? key.split('_')[0] : key;
                    const start = performance.now();
                    try {
                        require('child_process').execSync(`lsappinfo info -only Status $(lsappinfo find p=${activePID})`, { stdio: 'ignore' });
                    } catch (e) {}
                    const end = performance.now();
                    const latencyMs = (end - start).toFixed(1);
                    const latency = parseFloat(latencyMs);
                    activeGameName = currentStatusText
                        .replace('🟢 MAX-Boost: 📦 ', '')
                        .replace('🟡 MID-Boost: 📦 ', '')
                        .replace('🔴 Boost Off: 📦 ', '')
                        .replace('🎮 ', '')
                        .trim();
                    try {
                        const tmpPath = require('path').join('/tmp', 'fps_boost_live.json');
                        require('fs').writeFileSync(tmpPath, JSON.stringify({
                            latencyMs: latencyMs,
                            fpsLive: (1000 / (end - start)).toFixed(1),
                            gameName: activeGameName,
                            pid: activePID
                        }), 'utf8');
                    } catch (e) {}
                    if (latency < 15) {
                        kernelStatus = `⚡️ OPTIMAL [${latencyMs} ms]`;
                        statusColor = "#00ffcc";
                    } else if (latency >= 15 && latency < 35) {
                        kernelStatus = `⚡️ GOOD [${latencyMs} ms]`;
                        statusColor = "#00ff00";
                    } else {
                        kernelStatus = `⏳ HEAVY LOAD [${latencyMs} ms]`;
                        statusColor = "#ffcc00";
                    }
                    break;
                }
            }
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
    } catch (e) {}
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
let vmStatIntervalId = null;
vmStatIntervalId = setInterval(() => {
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
let lastKnownBoostState = null; 
function checkAndBoostGames() {
    loadSettings();
    if (lastKnownBoostState !== null && lastKnownBoostState !== isBoostActive) {
        writeToRotatedLog(`🔄 Live-Umschaltung erkannt! FPS-Boost steht jetzt auf: [${isBoostActive}]`);
        optimizedPIDs.clear();
    }
    lastKnownBoostState = isBoostActive;
    if (!activeGamesMapping || activeGamesMapping.size === 0) {
        return;
    }
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
            let extractedExe = path.basename(normalizedPath);
            const lowName = extractedExe.toLowerCase();
            const cleanName = lowName.replace(/[()]/g, '');
            let displayGameName = "";
            let isMatchedGame = false;
            if (lowerPath.includes('steamapps')) {
                const standardPath = normalizedPath.replace(/\\/g, '/');
                const detectedName = getCleanGameName(standardPath, extractedExe);
if (detectedName) {
    const cleanDetected = detectedName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
        if (processKey) {
            const cleanKey = processKey.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            if (cleanKey.includes(cleanDetected) || cleanDetected.includes(cleanKey)) {
                displayGameName = `🎮 ${gameTitle}`;
                isMatchedGame = true;
                break;
            }
        }
    }
}
if (!isMatchedGame) {
    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
        if (gameTitle) {
            const exes = gameTitle.toLowerCase().split('||').map(e => e.trim());
            if (exes.includes(cleanName) || exes.some(e => e.includes(cleanName) || cleanName.includes(e))) {
                displayGameName = `🎮 ${gameTitle}`;
                isMatchedGame = true;
                break;
            }
        }
    }
}
if (!isMatchedGame) {
    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
        if (processKey && processKey !== 'unknown_executable.exe') {
            const cleanKey = processKey.toLowerCase().trim();
            if (cleanName === cleanKey || (cleanName.includes(cleanKey) && cleanKey.length > 2)) {
                displayGameName = `🎮 ${gameTitle}`;
                isMatchedGame = true;
                break;
            }
        }
    }
}
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
if (isMatchedGame && displayGameName.toLowerCase().endsWith('.exe')) {
    displayGameName = displayGameName.replace(/\.exe$/i, '').trim();
}
if (!isMatchedGame && lowerPath.includes('crs-handler')) {
    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
        const cleanTitleMatch = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanPathMatch = lowerPath.replace(/[^a-z0-9]/g, '');
        if (cleanPathMatch.includes(cleanTitleMatch)) {
            displayGameName = `🎮 ${gameTitle}`;
            isMatchedGame = true;
            break;
        }
    }
}
}
            if (!isMatchedGame) return;
            const isBlacklisted = userBlacklist.some(ignoredName => cleanName === ignoredName);
            if (isBlacklisted) return;
            currentPIDs.add(pid);
            if (optimizedPIDs.has(pid)) return;
            optimizedPIDs.add(pid);
            writeToRotatedLog(`🎯 Game detected: 📦 ${displayGameName} (PID: ${pid})`);
            manageRamGuardState(true);
            if (isBoostActive) {
                if (!optimizedPIDs.has(pid)) {
                    writeToRotatedLog(`🎯 Game detected: 📦 ${displayGameName} (PID: ${pid})`);
                    manageRamGuardState(true);
                }
                const isUbisoftTrackmania = lowName.includes('ubisoftconnectinstaller'); 
                const isWrapper = (lowName.includes('winewrapper') || lowName.includes('winedevice') || lowName.includes('wineboot')) 
                                  && !lowerPath.includes('crs-handler') 
                                  && !isUbisoftTrackmania;
if (!isWrapper) {
    let finalCleanName = cleanName;
    if (finalCleanName.toLowerCase().includes('.exe')) {
        const exeMatch = finalCleanName.match(/^([^\s]+\.exe)/i);
        if (exeMatch && exeMatch[1]) {
            finalCleanName = exeMatch[1];
        }
    }
    const nameSpecificKey = `${pid}_max_${finalCleanName}`;
    if (!optimizedPIDs.has(nameSpecificKey)) {
        for (let key of optimizedPIDs) {
            if (key.startsWith(`${pid}_max_`)) {
                optimizedPIDs.delete(key);
            }
        }
        optimizedPIDs.delete(pid + '_reset'); 
        optimizedPIDs.delete(pid + '_mid');
        optimizedPIDs.add(nameSpecificKey);
        optimizedPIDs.add(pid);
        sendToRootHelper(pid, -5);
        writeToRotatedLog(`⚡️ Trigger-Engine: MAX-Boost für ${displayGameName} (${finalCleanName} / PID: ${pid}) geschrieben.`);
        sendNotification(`Performance boost (MAX) activated for "${displayGameName}"!`);
    }
    currentStatusText = `🟢 MAX-Boost: 📦 ${displayGameName}`;
    updateMenu();
}
 else {
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
                if (optimizedPIDs.has(pid + '_max') || optimizedPIDs.has(pid + '_mid')) {
                    optimizedPIDs.delete(pid + '_max');
                    optimizedPIDs.delete(pid + '_mid');
                    sendToRootHelper(pid, 0);
                    writeToRotatedLog(`⌛️ Trigger-Engine: Live-Prioritätswechsel! ${displayGameName} (PID: ${pid}) auf Standard (0) zurückgesetzt.`);
                    optimizedPIDs.add(pid + '_reset');
                }
                if (!optimizedPIDs.has(pid + '_reset') && !optimizedPIDs.has(pid + '_max') && !optimizedPIDs.has(pid + '_mid')) {
                    optimizedPIDs.add(pid + '_reset');
                    optimizedPIDs.add(pid);
                    sendToRootHelper(pid, 0);
                    writeToRotatedLog(`⌛️ Trigger-Engine: App mit deaktiviertem Boost gestartet. ${displayGameName} (PID: ${pid}) auf Standard (0) gesetzt.`);
                }
                currentStatusText = `${displayGameName} (Kein Boost)`;
                updateMenu();
            }
        });
        for (let stateKey of optimizedPIDs) {
            const purePID = stateKey.split('_')[0];
            if (!currentPIDs.has(purePID)) {
                optimizedPIDs.delete(stateKey);
                if (stateKey === purePID) {
                    writeToRotatedLog(`⏳ Game with PID ${purePID} terminated. Evacuated from memory.`);
                    sendToRootHelper(purePID, 0);
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
ipcMain.on('trigger-start-helper', () => {
    startRootHelper();
});
ipcMain.on('trigger-start-helper', () => {
    startRootHelper();
});
ipcMain.handle('trigger-game-scan', async () => {
    return new Promise((resolve) => {
        const scannerPath = path.join(__dirname, 'check_games2.js');
        if (!fs.existsSync(scannerPath)) {
            resolve({ success: false, error: 'Script check_games2.js is missing from the directory.' });
            return;
        }
        const { fork } = require('child_process');
        const child = fork(scannerPath, [], { silent: true });
        child.on('close', (code) => {
            if (code === 0) {
                loadGamesMappingFile();
                resolve({ success: true });
            } else {
                resolve({ success: false, error: 'Scanner script reported an error.' });
            }
        });
        child.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
    });
});
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
        height: 850,
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
    settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
    settingsWindow.once('ready-to-show', () => { settingsWindow.show(); });
    settingsWindow.on('closed', () => { settingsWindow = null; });
}
function updateMenu() {
    const contextMenu = Menu.buildFromTemplate([
        { label: '🚀 MAC GAMING BOOSTER', enabled: false },
        { label: `${currentStatusText}`, enabled: false },
        { label: 'Version: 2.8.1 (Platin GUI Edition)', enabled: false },
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
    loadSettings();
    if (isLoggingActive) {
        fs.writeFileSync(LOG_FILE, '', 'utf8');
        writeToRotatedLog("🚀 App initiated - Persistent logging ACTIVE.");
    }
    const CONFIG_DIR = path.join(os.homedir(), 'Library/Application Support/fps-boost/config');
    const LIST_FILE = path.join(CONFIG_DIR, 'games_list.txt');
    const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
    const filesExist = fs.existsSync(LIST_FILE) && fs.existsSync(MAPPING_FILE);
    if (!filesExist) {
        writeToRotatedLog("ℹ️ Initial startup: Files are missing. Starting automatic background game scan...");
        const scannerPath = path.join(__dirname, 'check_games2.js');
        if (fs.existsSync(scannerPath)) {
            const { fork } = require('child_process');
            const child = fork(scannerPath, [], { silent: true });
            child.on('close', (code) => {
                if (code === 0) {
                    writeToRotatedLog("✅ Background scan finished successfully. Loading mapping...");
                    loadGamesMappingFile();
                } else {
                    writeToRotatedLog("❌ Background scan reported an error creating the files.");
                }
            });
        } else {
            writeToRotatedLog("❌ Error during app startup: check_games2.js was not found in the directory.");
        }
    } else {
        writeToRotatedLog("💾 Game lists already exist. Skipping scan and loading data directly...");
        loadGamesMappingFile();
    }
    startRootHelper();
    if (app.dock) app.dock.hide(); 
    const isPackaged = app.isPackaged;
    const trayIconPath = isPackaged 
        ? path.join(process.resourcesPath, 'rocket.png') 
        : path.join(__dirname, 'rocket.png');
    if (!tray) {
        tray = new Tray(trayIconPath);
        tray.setToolTip('Mac Gaming Booster');
    }
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
    updateMenu();
    intervalId = setInterval(checkAndBoostGames, 4000);
    writeToRotatedLog("⚙️ All startup systems successfully chained and active.");
});
if (typeof ipcMain !== 'undefined') {
    ipcMain.handle('open-exe-picker', async (event, targetGameName) => {
        const { dialog } = require('electron');
        const os = require('os');
        let defaultStartPath = path.join(os.homedir(), 'Library/Application Support/CrossOver/Bottles');
        const CONFIG_DIR = path.join(os.homedir(), 'Library/Application Support/fps-boost/config');
        const OVERRIDES_FILE = path.join(CONFIG_DIR, 'scanner_overrides.json');
        const result = await dialog.showOpenDialog({
            title: `🎮 Wähle die Haupt-EXE für: ${targetGameName}`,
            defaultPath: defaultStartPath, 
            properties: ['openFile'],
            filters: [
                { name: 'Windows Executables', extensions: ['exe'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false };
        }
        const fullPath = result.filePaths[0];
        const exeName = path.basename(fullPath); 
        const folderPath = path.dirname(fullPath);
        const folderName = path.basename(folderPath); 
        let detectedExes = [];
        try {
            const files = fs.readdirSync(folderPath);
            files.forEach(file => {
                const lowerFile = file.toLowerCase();
                if (lowerFile.endsWith('.exe') && 
                    !lowerFile.includes('crash') && 
                    !lowerFile.includes('unity') && 
                    !lowerFile.includes('install') &&
                    !lowerFile.includes('setup')) {
                    detectedExes.push(file.trim());
                }
            });
        } catch (e) {
            console.error("Fehler beim Scannen des Ordner-Inhalts:", e);
        }
        let finalExeValue = detectedExes.length > 1 ? detectedExes.join('||') : exeName;
        let overrides = {};
        if (fs.existsSync(OVERRIDES_FILE)) {
            try { overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8')); } catch (e) {}
        }
        const cleanKey = targetGameName.toLowerCase().replace(/🎮/g, '').trim();
        overrides[cleanKey] = finalExeValue;
        overrides[folderName.toLowerCase().trim()] = finalExeValue;
        try {
            fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf8');
            if (typeof runGameScanner === 'function') {
                runGameScanner();
            }
            return { success: true, exeName: finalExeValue };
        } catch (e) {
            console.error("Fehler beim Schreiben der JSON-Datei:", e);
            return { success: false };
        }
    });
}
let isAppCleaningUp = false;
app.on('before-quit', (event) => {
    if (isAppCleaningUp) return;
    globalShortcut.unregisterAll();
    if (intervalId) clearInterval(intervalId);
    if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
    if (overlayInterval) clearInterval(overlayInterval);
    if (typeof vmStatIntervalId !== 'undefined' && vmStatIntervalId) {
        clearInterval(vmStatIntervalId);
    }
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));   
            if (configData.keepDaemonAlive === false) {
                event.preventDefault(); 
                console.log("\n==================================================");
                console.log("🧹 [TERMINAL] Variant 2 active: Writing trigger...");
                console.log("==================================================");
                writeToRotatedLog("🧹 Variant 2 active: Writing trigger file safely before exit...");
                const os = require('os');
                const triggerPath = path.join(os.homedir(), 'Library/Application Support/fps-boost/config/boost.trigger');
                fs.writeFileSync(triggerPath, JSON.stringify({ action: 'kill' }), 'utf8');
                const fd = fs.openSync(triggerPath, 'r+');
                fs.fsyncSync(fd);
                fs.closeSync(fd);
                console.log("✅ [TERMINAL] Trigger file written into /config/! Quitting app now.\n");
                writeToRotatedLog("✅ Trigger file safely written. Quitting now.");
                isAppCleaningUp = true;
                app.quit(); 
                return;
            } else {
                console.log("\nℹ️ [TERMINAL] Variant 1 active: Helper stays alive.\n");
                writeToRotatedLog("ℹ️ Variant 1 active: keepDaemonAlive is true. Root-Helper bleibt aktiv.");
            }
        }
    } catch (e) {
        console.error("❌ [TERMINAL] Error:", e.message);
        writeToRotatedLog("❌ Error closing the helper cleanly: " + e.message);
    }
});
app.on('window-all-closed', (e) => { e.preventDefault(); });
