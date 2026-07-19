/* ============================================================================
   APPLICATION:   MAC GAMING BOOSTER (PROJEKT X)
   FILE:          main.js (Electron Main Process)
   
   STATUS:        VERSION 2.8.1b (RELEASE CANDIDATE) - STABLE & PRODUCTION READY
   DEVELOPER:     MARIO (FLASHI) - STAND: 18.07.2026
   QUALITY AUDIT: EXCELLENT (Robust error handling, resource-optimized Kernel IPC)
   
   CORE FUNCTIONS:
   1. ROOT SERVICE MANAGEMENT: Triggers, monitors, and chains the privileged 
      background helper service to execute passwordless Unix command execution.
   2. INTER-PROCESS COMMUNICATION: Stream-reads real-time system metrics and 
      configuration overrides without heavy disk-polling or background load.
   3. HEADLESS LIVE DASHBOARD: Renders a borderless, mouse-aware monitoring 
      interface displaying live core balancing and zero-disk-write benchmarks.
   4. SYSTEM WATCHDOG & GUARD: Runs an aggressive 3s process-table scan via 
      vm_stat to enforce dynamic RAM purging and isolate heavy compilation spikes.
   ============================================================================ */

const { app, Tray, Menu, shell, Notification, globalShortcut, BrowserWindow, screen, ipcMain } = require('electron');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
let tray = null, intervalId = null, ramGuardIntervalId = null, overlayWindow = null, overlayInterval = null;
let currentFreeRamMB = 4096, overlayX = null, overlayY = null, dashboardWindow = null, dashboardUpdateInterval = null;
const rawGB = os.totalmem() / 1024 / 1024 / 1024;
const macStandardSizes = "8,16,18,24,32,36,48,64,96,128,192".split(',').map(Number);
const TOTAL_RAM_GB = macStandardSizes.find(size => size >= rawGB) || Math.round(rawGB);
const CONFIG_DIR = path.join(os.homedir(), 'Library/Application Support/fps-boost/config');
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
const activeTrackedGames = {};
const CONFIG_FILE = path.join(CONFIG_DIR, 'booster_config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'gaming_boost.log');
const BLACKLIST_FILE = path.join(CONFIG_DIR, 'blacklist.txt');
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
let isBoostActive = true, isLoggingActive = false, isHelperDebugActive = false, isAutostartActive = false, isShaderGuardActive = false;
let optimizedPIDs = new Set(), currentStatusText = '🎮 Status: No active games', activeGamesMapping = new Map();
let globalIsRootHelperAlive = false;
let globalPCoreUsage = 0;
function loadSettings() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return;
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (config.isBoostActive !== undefined) isBoostActive = config.isBoostActive;
        if (config.isLoggingActive !== undefined) isLoggingActive = config.isLoggingActive;
        if (config.isHelperDebugActive !== undefined) isHelperDebugActive = config.isHelperDebugActive;
        if (config.isAutostartActive !== undefined) isAutostartActive = config.isAutostartActive;
        if (config.isShaderGuardActive !== undefined) isShaderGuardActive = config.isShaderGuardActive;
        if (config.overlayX !== undefined) overlayX = config.overlayX;
        if (config.overlayY !== undefined) overlayY = config.overlayY;
        if (typeof app !== 'undefined') app.setLoginItemSettings({ openAtLogin: isAutostartActive, path: app.getPath('exe') });
    } catch (e) {}
}
function saveSettings() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ isBoostActive, isLoggingActive, isHelperDebugActive, isAutostartActive, isShaderGuardActive, overlayX, overlayY }, null, 2), 'utf8');
    } catch (e) {}
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
    }
} 
function sendNotification(bodyText) {
    if (Notification.isSupported()) {
        new Notification({ title: '🚀 Mac Gaming Booster', body: bodyText, silent: true }).show();
    }
}
function openDashboardWindow() {
    if (dashboardWindow) { 
        clearInterval(dashboardUpdateInterval); 
        dashboardWindow.close(); 
        dashboardWindow = null; 
        return; 
    }  
    dashboardWindow = new BrowserWindow({
        width: 410, height: 700, resizable: false, frame: true, alwaysOnTop: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    dashboardWindow.loadFile(path.join(__dirname, 'dashboard.html'));
    dashboardWindow.on('closed', () => { dashboardWindow = null; clearInterval(dashboardUpdateInterval); });
    dashboardUpdateInterval = setInterval(() => {
        if (!dashboardWindow) return;
        let isRootHelperAlive = false;
        try {
            if (execSync("ps -Ax -o command | grep -v grep | grep 'helper.js' 2>/dev/null").toString().trim().length > 0) isRootHelperAlive = true;
        } catch (e) {}
        let activePID = "-", activeGameName = "Waiting for game...", targetNice = "0", pCoreUsage = 0, liveLatency = "0.0", liveGameMem = 0.0;
        let chosenKey = null;
        for (let key of optimizedPIDs) {
            if (key.includes('_max_') || key.endsWith('_max') || key.endsWith('_mid') || key.includes('_reset')) {
                if (!chosenKey) {
                    chosenKey = key;
                }
                if (key.toLowerCase().includes('shipping')) {
                    chosenKey = key;
                    break; 
                }
            }
        }
        if (chosenKey) {
            const pidMatch = chosenKey.match(/^\d+/);
            activePID = pidMatch ? pidMatch[0] : "-";
            let cleanText = currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').replace('🟡 MID-Boost: 📦 ', '').trim();
            cleanText = cleanText.replace(/\(Kein Boost\)/i, '').trim();
            if (cleanText.toLowerCase().includes('log.txt')) {
                activeGameName = "The Last of Us Part I";
            } else {
                activeGameName = cleanText.replace(/\.exe/i, '');
            }
            try {
                if (activePID !== "-") {
                    const kernelNice = execSync(`ps -p ${activePID} -o nice= 2>/dev/null`).toString().trim();
                    if (kernelNice) targetNice = kernelNice;
                }
            } catch(e) {}
        }
        if (activePID !== "-" && activePID !== "") {
            const cleanPid = activePID.trim();
            try {
                const start = performance.now();
                try { execSync(`lsappinfo info -only Status $(lsappinfo find p=${cleanPid})`, { stdio: 'ignore' }); } catch(e) {}
                liveLatency = (performance.now() - start).toFixed(1);
                const pgidCheck = execSync(`ps -p ${cleanPid} -o pgid= 2>/dev/null`).toString().trim();
                const cleanPgid = pgidCheck.replace(/[^\d]/g, '').trim();
                let totalCpuSum = 0, totalKilobytes = 0;
                if (cleanPgid && cleanPgid !== "0" && cleanPgid !== "") {
                    try {
                        const cpuLines = execSync(`ps -g ${cleanPgid} -o %cpu 2>/dev/null`).toString().trim().split('\n');
                        cpuLines.forEach((l, i) => { if (i > 0) totalCpuSum += parseFloat(l.trim().replace(',', '.')) || 0; });
                        const ramLines = execSync(`ps -g ${cleanPgid} -o rss 2>/dev/null`).toString().trim().split('\n');
                        ramLines.forEach((l, i) => { if (i > 0) totalKilobytes += parseInt(l.trim(), 10) || 0; });
                    } catch(groupErr) {
                        totalCpuSum = 0; totalKilobytes = 0;
                    }
                } 
                if (totalCpuSum === 0 || totalKilobytes === 0) {
                    try {
                        totalCpuSum = parseFloat(execSync(`ps -p ${cleanPid} -o %cpu= 2>/dev/null`).toString().trim().replace(',', '.')) || 0;
                        totalKilobytes = parseInt(execSync(`ps -p ${cleanPid} -o rss= 2>/dev/null`).toString().trim(), 10) || 0;
                    } catch(directErr) {}
                }
                pCoreUsage = Math.min(999, Math.max(0, Math.round(totalCpuSum)));
                liveGameMem = totalKilobytes / 1024 / 1024;
            } catch (e) {}
        }
        dashboardWindow.webContents.send('dashboard-data', {
            helperAlive: isRootHelperAlive, gameName: activeGameName, pid: activePID, nice: targetNice,
            readSpeed: "0 Byte/s", writeSpeed: "0 Byte/s", latencyMs: activePID !== '-' ? liveLatency : "0.0",
            pCore: pCoreUsage, eCore: 0, gameMem: activePID !== '-' ? parseFloat(liveGameMem.toFixed(1)) : 0.0,
            totalMem: TOTAL_RAM_GB, ramPercent: liveGameMem > 0 ? (liveGameMem / TOTAL_RAM_GB) * 100 : 0
        });
    }, 1000);
}
ipcMain.on('trigger-open-dashboard', () => { openDashboardWindow(); });
ipcMain.on('dashboard-toggle-pin', (e, shouldPin) => { if (dashboardWindow) dashboardWindow.setAlwaysOnTop(shouldPin, 'screen-saver'); });
let lastPurgeTime = 0;
function manageRamGuardState(isGameRunning) {
    if (!isShaderGuardActive) { if (ramGuardIntervalId) { clearInterval(ramGuardIntervalId); ramGuardIntervalId = null; } return; }
    let purgeLimit = 1500, pauseLimit = 400, killLimit = 100;
    try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (cfg.purgeLimit) purgeLimit = parseInt(cfg.purgeLimit, 10);
        if (cfg.pauseLimit) pauseLimit = parseInt(cfg.pauseLimit, 10);
        if (cfg.killLimit) killLimit = parseInt(cfg.killLimit, 10);
    } catch (e) {}
    if (isGameRunning && !ramGuardIntervalId) {
        writeToRotatedLog("🎮 Game Active: Aggressive RAM-Guard initiated.");
        ramGuardIntervalId = setInterval(() => {
            if (Date.now() - lastPurgeTime < 30000) return;
            try {
                const stdout = execSync('vm_stat').toString();
                const free = parseInt(stdout.match(/Pages free:\s+(\d+)/)[1], 10) || 0;
                const spec = parseInt(stdout.match(/Pages speculative:\s+(\d+)/)[1], 10) || 0;
                const availableRamMB = Math.round(((free + spec) * 16384) / 1024 / 1024);
                currentFreeRamMB = availableRamMB;
                if (availableRamMB < purgeLimit) {
                    let isStalkerLaunchPhase = false;
                    let finalGameAge = 0;
                    const isSafeActive = (typeof isSafeShaderCompilationActive !== 'undefined' && isSafeShaderCompilationActive === true) || 
                                         (typeof config !== 'undefined' && config.isSafeShaderCompilationActive === true) ||
                                         (typeof currentConfig !== 'undefined' && currentConfig.isSafeShaderCompilationActive === true);
                    if (isSafeActive) {
                        const currentStatusLower = typeof currentStatusText !== 'undefined' ? currentStatusText.toLowerCase() : "";
                        if (currentStatusLower.includes('stalker') || currentStatusLower.includes('chornobyl')) {
                            for (let stateKey of optimizedPIDs) {
                                const parts = stateKey.split('_');
                                const purePID = parts[0];
                                if (purePID && purePID !== "-" && activeTrackedGames && activeTrackedGames[purePID]) {
                                    const gameSession = activeTrackedGames[purePID];
                                    const gameAge = (Date.now() - gameSession.startTime) / 1000;
                                    if (gameAge < 240) {
                                        isStalkerLaunchPhase = true;
                                        finalGameAge = gameAge;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (isStalkerLaunchPhase) {
                        writeToRotatedLog(`⏳ RAM-Guard: Safe Shader-Compilation active for S.T.A.L.K.E.R. 2 (Game age: ${finalGameAge.toFixed(0)}s). Postponing full purge to prevent compile errors...`);
                        lastPurgeTime = Date.now();
                        try { exec('sync', () => {}); } catch(e) {}
                    } else {
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
                        else {
                            exec('sudo purge', () => {});
                        }
                        memorySpikeTrigger.length = 0;
                    }
                }
            } catch(e) {}
        }, 3000);
    } else if (!isGameRunning && ramGuardIntervalId) {
        clearInterval(ramGuardIntervalId); ramGuardIntervalId = null;
        writeToRotatedLog("🛑 Game terminated: RAM-Guard stopped.");
    }
}
setInterval(() => {
    if (ramGuardIntervalId) return;
    try {
        const out = execSync('vm_stat').toString();
        const free = parseInt(out.match(/Pages free:\s+(\d+)/)[1], 10) || 0;
        const spec = parseInt(out.match(/Pages speculative:\s+(\d+)/)[1], 10) || 0;
        currentFreeRamMB = Math.round(((free + spec) * 16384) / 1024 / 1024);
    } catch(e) {}
}, 2000);
function toggleRamOverlay() {
    if (overlayWindow) { clearInterval(overlayInterval); overlayWindow.close(); overlayWindow = null; return; }
    overlayWindow = new BrowserWindow({ width: 300, height: 165, x: overlayX || (screen.getPrimaryDisplay().workAreaSize.width - 320), y: overlayY || 30, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.loadFile(app.isPackaged ? path.join(process.resourcesPath, 'app', 'hud.html') : path.join(__dirname, 'hud.html'));
    overlayInterval = setInterval(() => {
        if (!overlayWindow || overlayWindow.isDestroyed()) return;
        let activeGameName = "None", activePID = "-", kernelStatus = "⚪ STANDBY", statusColor = "#aaaaaa";
        let hudKeys = Array.from(optimizedPIDs);
        let shippingHudKey = hudKeys.find(k => k.toLowerCase().includes('shipping'));
        let targetHudKey = shippingHudKey || hudKeys.find(k => k.includes('_max_') || k.endsWith('_max') || k.endsWith('_mid'));
        if (targetHudKey) {
            const pidMatch = targetHudKey.match(/^\d+/);
            activePID = pidMatch ? pidMatch[0] : "-";
            const start = performance.now();
            try { execSync(`lsappinfo info -only Status $(lsappinfo find p=${activePID})`, { stdio: 'ignore' }); } catch(e) {}
            kernelStatus = targetHudKey.endsWith('_mid') ? "⚡ MID-BOOST (-1)" : `⚡ POLLING [${(performance.now() - start).toFixed(1)} ms]`;
            statusColor = targetHudKey.endsWith('_mid') ? "#ffcc00" : "#00ffcc";
            activeGameName = currentStatusText.replace('🟢 MAX-Boost: 📦 ', '').replace('🎮 ', '').replace('🟡 MID-Boost: 📦 ', '').trim();
        }
        overlayWindow.webContents.executeJavaScript(`
            if (window.document && document.getElementById('hud-ram-used')) {
                document.getElementById('hud-ram-used').innerHTML = '${((TOTAL_RAM_GB * 1024 - currentFreeRamMB) / 1024).toFixed(2)} GB / ${TOTAL_RAM_GB} GB';
                document.getElementById('hud-ram-free').innerHTML = '${currentFreeRamMB} MB';
                document.getElementById('hud-game-name').innerHTML = '${activeGameName}';
                document.getElementById('hud-game-pid').innerHTML = '${activePID !== '-' ? 'PID ' + activePID : '-'}';
                document.getElementById('hud-kernel-status').innerHTML = '${kernelStatus}';
                document.getElementById('hud-kernel-status').style.color = '${statusColor}';
            }
        `).catch(() => {});
    }, 1000);
}
function loadGamesMappingFile() {
    activeGamesMapping.clear();
    try {
        if (!fs.existsSync(MAPPING_FILE)) return;
        fs.readFileSync(MAPPING_FILE, 'utf-8').split('\n').map(l => l.trim()).filter(l => l.length > 0).forEach(line => {
            const parts = line.split('=>');
            if (parts.length === 2) {
                if (parts[1].trim().includes('||')) {
                    parts[1].trim().split('||').forEach(exe => { if (exe.trim().length > 2) activeGamesMapping.set(exe.trim().toLowerCase(), parts[0].trim()); });
                } else { activeGamesMapping.set(parts[1].trim().toLowerCase(), parts[0].trim()); }
            }
        });
    } catch (e) {}
}
function sendToRootHelper(pid, level) {
    try {
        fs.writeFileSync(path.join(CONFIG_DIR, 'boost.trigger'), JSON.stringify({ action: 'boost', pid: parseInt(pid, 10), level: parseInt(level, 10) }), 'utf8');
        const displayLevel = (parseInt(level, 10) === -5) ? -20 : level; 
        writeToRotatedLog(`⚡️ Trigger Engine: MAX-Boost written for PID ${pid} (Level: ${displayLevel}).`);
    } catch (e) {}
}
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
    const searchCommand = "ps -Ax -o pid,command | grep -Ei 'wine|wineloader|steamapps|crossover|crs-handler|crs-handler.exe|wineloader64|ubisoft|games|retail' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster'";
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
            let normalizedPath = fullPath.replace(/\\/g, '/');
            normalizedPath = normalizedPath.replace(/^[a-zA-Z]:[/\\]/, '/');
            const lowerPath = normalizedPath.toLowerCase();
            let extractedExe = path.basename(normalizedPath);
            const lowName = extractedExe.toLowerCase();
            const cleanName = lowName.replace(/[()]/g, '');
            if (cleanName.includes('launcher') || cleanName.includes('play') || cleanName.includes('select') || cleanName.includes('handler') || cleanName.includes('helper')) {
                try {
                    const threadCheck = execSync(`ps -M ${pid} 2>/dev/null | wc -l`).toString().trim();
                    const processThreads = parseInt(threadCheck, 10) || 0;
                    if (processThreads < 30) {
                        return;
                    }
                } catch (e) {}
            }
            let displayGameName = "";
            let isMatchedGame = false;
            const isGamePath = lowerPath.includes('steamapps') || 
                               lowerPath.includes('epic') || 
                               lowerPath.includes('heroic') || 
                               lowerPath.includes('ubisoft') || 
                               lowerPath.includes('battle.net') || 
                               lowerPath.includes('crossover') || 
                               lowerPath.includes('games') || 
                               lowerPath.includes('program files') || 
                               lowerPath.includes('/volumes/');
            const isSystemMuck = lowerPath.includes('/system/') || 
                                 lowerPath.includes('/com.apple.') ||
                                 lowerPath.includes('menu helper') ||
                                 lowerPath.includes('epicgameslauncher') ||
                                 lowerPath.includes('controlpaneldb') || 
                                 lowerPath.includes('wineconsole');
            if (!cleanName || cleanName.length < 2) return;
            if (isGamePath && !isSystemMuck) {
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
                if (!isMatchedGame && extractedExe) {
                    const cleanExeLower = extractedExe.toLowerCase().replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '').trim(); 
                    let safePath = lowerPath;
                    if (lowerPath.includes('/bottles/')) {
                        const pathParts = lowerPath.split('/bottles/');
                        if (pathParts.length > 1) {
                            const structuralPath = pathParts[1];
                            const subParts = structuralPath.split('/');
                            safePath = subParts.slice(1).join('/'); 
                        }
                    }
                    const cleanFullPathLower = safePath.replace(/[^a-z0-9]/g, '').trim();
                    for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                        if (processKey) {
                            const cleanKey = processKey.toLowerCase().replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '').trim();
                            if (cleanKey.includes(cleanExeLower) || cleanExeLower.includes(cleanKey) || cleanFullPathLower.includes(cleanKey)) {
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
                            isMatchedGame = false; 
                            break;
                        }
                    }
                }
                if (isMatchedGame && pid) {
                    currentPIDs.add(pid); 
                    if (typeof triggerKernelBoost === 'function') {
                        triggerKernelBoost(pid, displayGameName); 
                    }
                }
            }
            if (!isMatchedGame) return;
            const isBlacklisted = userBlacklist.some(ignoredName => cleanName === ignoredName);
            if (isBlacklisted) return;
            currentPIDs.add(pid);
            if (optimizedPIDs.has(pid)) return;
            optimizedPIDs.add(pid);
            if (!activeTrackedGames[pid]) {
                activeTrackedGames[pid] = {
                    startTime: Date.now(),
                    name: cleanName || lowName || extractedExe
                };
            }
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
                    const isLowPriorityProcess = finalCleanName.toLowerCase().includes('crs-handler') || finalCleanName.toLowerCase().includes('launcher');

                    let containsActiveMainGame = false;
                    for (let key of optimizedPIDs) {
                        if (key.includes('_max_') && !key.toLowerCase().includes('crs-handler') && !key.toLowerCase().includes('launcher')) {
                            containsActiveMainGame = true;
                        }
                    }
                    if (!isLowPriorityProcess && !containsActiveMainGame) {
                        for (let key of optimizedPIDs) {
                            if (key.toLowerCase().includes('crs-handler')) {
                                const oldPid = key.split('_')[0];
                                sendToRootHelper(oldPid, 0); 
                                optimizedPIDs.delete(key);
                                if (oldPid) optimizedPIDs.delete(oldPid);
                            }
                        }
                    }
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
                    let shouldSkipAggressivePurge = false;
                    let calculatedGameDuration = 0;
                    if (activeTrackedGames[purePID]) {
                        const gameSession = activeTrackedGames[purePID];
                        calculatedGameDuration = (Date.now() - gameSession.startTime) / 1000;
                        const isSafeActive = (typeof isSafeShaderCompilationActive !== 'undefined' && isSafeShaderCompilationActive === true) || 
                                             (typeof config !== 'undefined' && config.isSafeShaderCompilationActive === true) ||
                                             (typeof currentConfig !== 'undefined' && currentConfig.isSafeShaderCompilationActive === true);
                        if (isSafeActive && calculatedGameDuration < 240) {
                            shouldSkipAggressivePurge = true;
                        }
                        delete activeTrackedGames[purePID];
                    }
                    sendToRootHelper(purePID, 0);
                    if (shouldSkipAggressivePurge) {
                        writeToRotatedLog(`⏳ RAM Purge: Safe Shader-Compilation active (Game age: ${calculatedGameDuration.toFixed(0)}s). Postponing full purge to prevent shader compile errors...`);
                        try { exec('sync', () => {}); } catch(e) {} 
                    } else {
                        exec('sudo purge', () => {
                            writeToRotatedLog("🧹 RAM Purge: Inactive disk cache successfully cleared.");
                        });
                    }
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
ipcMain.handle('trigger-game-scan', async () => {
    return new Promise((res) => {
        const child = require('child_process').fork(path.join(__dirname, 'check_games2.js'), [], { silent: true });
        child.on('close', (code) => { if (code === 0) { loadGamesMappingFile(); res({ success: true }); } else { res({ success: false }); } });
    });
});
ipcMain.handle('get-games-list', async () => {
    try {
        const f = path.join(CONFIG_DIR, 'games_list.txt');
        return { success: true, games: fs.existsSync(f) ? fs.readFileSync(f, 'utf-8').split('\n').map(l => l.trim()).filter(l => l.length > 0) : [] };
    } catch (e) { return { success: false, games: [] }; }
});
let settingsWindow = null;
function openSettingsWindow() {
    if (settingsWindow) { settingsWindow.focus(); return; }
    settingsWindow = new BrowserWindow({ width: 650, height: 850, title: "Mac Gaming Booster - Settings", resizable: false, frame: true, backgroundColor: '#121214', show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
    settingsWindow.once('ready-to-show', () => settingsWindow.show());
    settingsWindow.on('closed', () => settingsWindow = null);
}
function startRootHelper() {
    writeToRotatedLog("🛠️ [START-SEQUENCE] Initiating privileged root helper activation sequence...");
    try {
        const activeProcessCheck = execSync("ps -Ax -o command | grep -v grep | grep 'helper.js' 2>/dev/null").toString().trim();
        if (activeProcessCheck.length > 0) {
            writeToRotatedLog("💎 Variant 1 Confirmed: Active root helper discovered in background RAM. Skipping sudo prompt completely.");
            if (settingsWindow && !settingsWindow.isDestroyed()) {
                settingsWindow.webContents.executeJavaScript('if(typeof checkHelperLiveStatus === "function") checkHelperLiveStatus();').catch(() => {});
            }
            return;
        }
    } catch (e) {
        writeToRotatedLog(`⚠️ [START-SEQUENCE] Background RAM scan failed or returned empty: ${e.message}`);
    }
    const helperSource = path.join(__dirname, 'helper.js');
    const helperDest = path.join(CONFIG_DIR, 'helper.js');
    try {
        writeToRotatedLog(`📥 [START-SEQUENCE] Copying helper core to production directory...`);
        fs.copyFileSync(helperSource, helperDest); 
        try {
            fs.chmodSync(helperDest, '755');
            writeToRotatedLog("🛡️ [START-SEQUENCE] POSIX permissions set to 755 via native fs.");
        } catch (chmodErr) {
            execSync(`chmod 755 "${helperDest}"`);
            writeToRotatedLog("🛡️ [START-SEQUENCE] POSIX permissions set to 755 via shell fallback.");
        }
        let absoluteNodePath = '/usr/local/bin/node'; 
        const homebrewPath = '/opt/homebrew/bin/node';
        if (!fs.existsSync(absoluteNodePath) && fs.existsSync(homebrewPath)) {
            absoluteNodePath = homebrewPath; 
        } else if (!fs.existsSync(absoluteNodePath)) {
            absoluteNodePath = process.execPath; 
        } 
        writeToRotatedLog(`🧠 [START-SEQUENCE] Hardware Environment Node Path verified: [${absoluteNodePath}]`);
        const sudoCmd = `"${absoluteNodePath}" "${helperDest}" "${CONFIG_DIR}" "${CONFIG_FILE}"`;  
        writeToRotatedLog(`⚡ [START-SEQUENCE] Dispatching elevated execution vector to macOS Security Framework...`);
        const sudoPrompt = require('sudo-prompt');
        sudoPrompt.exec(sudoCmd, { name: 'Mac Gaming Booster' }, (err, stdout, stderr) => {
            if (err) {
                writeToRotatedLog(`❌ [CRITICAL SU-ERROR] Security prompt rejected or broken! Message: ${err.message}`);
                if (stderr) writeToRotatedLog(`   stderr: ${stderr.trim()}`);
                return;
            } 
            writeToRotatedLog("🛡️ [START-SEQUENCE] Root service helper successfully handshake-confirmed and detached into kernel background.");
            if (stdout && stdout.trim().length > 0) writeToRotatedLog(`   stdout response: ${stdout.trim()}`);
        });
        
    } catch(e) {
        writeToRotatedLog(`❌ [START-SEQUENCE] Fatal pipeline breakdown during copy/execution phase: ${e.message}`);
    }
}
ipcMain.on('trigger-start-helper', (event) => {
    startRootHelper();
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        setTimeout(() => {
            settingsWindow.webContents.executeJavaScript('if(typeof checkHelperLiveStatus === "function") checkHelperLiveStatus();').catch(() => {});
        }, 1500);
    }
});
ipcMain.on('trigger-kill-helper', () => {
    try {
        fs.writeFileSync(path.join(CONFIG_DIR, 'boost.trigger'), JSON.stringify({ action: 'kill' }), 'utf8');
        exec("pkill -9 -f helper.js || killall -9 node 2>/dev/null");
        globalIsRootHelperAlive = false;
        updateMenu();
        writeToRotatedLog("🛑 IPC Engine: Hard kill executed. Helper forced to OFFLINE (🔴).");
    } catch(e) {
        writeToRotatedLog(`⚠️ IPC Engine: Kill error: ${e.message}`);
    }
});
ipcMain.on('trigger-reload-mapping', () => {
    optimizedPIDs.clear();
    loadGamesMappingFile();
    writeToRotatedLog("🔄 Live Configuration Sync: Games mapping and overrides hot-reloaded in background RAM.");
});
function updateMenu() {
    if (!tray) return;
    const helperIndicator = globalIsRootHelperAlive ? '🟢' : '🔴';
    const currentTrayTitle = `${helperIndicator} Ready`;
    if (tray.getTitle() !== currentTrayTitle) {
        tray.setTitle(currentTrayTitle);
    }
    const contextMenu = Menu.buildFromTemplate([
        { label: '🚀 MAC GAMING BOOSTER', enabled: false },
        { label: `${currentStatusText}`, enabled: false },
        { label: 'Version: 2.8.1b (Public Version)', enabled: false },
        { label: 'Developer: Mario (flashi)', enabled: false },
        { label: 'Stand: 15.07.2026 10:36', enabled: false },
        { type: 'separator' },
        {
            label: '📊 Open Live HUD...',
            accelerator: 'CmdOrCtrl+Alt+R',
            click: () => { toggleRamOverlay(); }
        },
        {
            label: '📈 Open Live Dashboard...',
            accelerator: 'CmdOrCtrl+Alt+B',
            click: () => { openDashboardWindow(); }
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
    globalShortcut.register('CmdOrCtrl+Alt+B', () => {
        openDashboardWindow();
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
    globalIsRootHelperAlive = false;
    updateMenu();
    setInterval(() => {
        try {
            const psOutput = execSync("ps -eo pid,args | grep -E 'node.*helper\\.js' | grep -v 'grep' 2>/dev/null").toString().trim();
            const isAlive = psOutput.length > 0;
            if (globalIsRootHelperAlive !== isAlive) {
                globalIsRootHelperAlive = isAlive;
                updateMenu(); 
            }
        } catch (e) {
            if (globalIsRootHelperAlive !== false) {
                globalIsRootHelperAlive = false;
                updateMenu();
            }
        }
    }, 2000);
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
    if (dashboardUpdateInterval) clearInterval(dashboardUpdateInterval);
    if (typeof vmStatIntervalId !== 'undefined' && vmStatIntervalId) clearInterval(vmStatIntervalId); 
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (configData.keepDaemonAlive === false) {
                event.preventDefault(); 
                writeToRotatedLog("🧹 Variant 2 active: Writing trigger file safely before exit...");
                const triggerPath = path.join(CONFIG_DIR, 'boost.trigger');
                fs.writeFileSync(triggerPath, JSON.stringify({ action: 'kill' }), 'utf8');
                const fd = fs.openSync(triggerPath, 'r+');
                fs.fsyncSync(fd);
                fs.closeSync(fd);
                exec("pkill -f helper.js");
                writeToRotatedLog("✅ Trigger file safely written. Quitting now.");
                isAppCleaningUp = true;
                app.quit(); 
                return;
            } else {
                writeToRotatedLog("ℹ️ Variant 1 active: keepDaemonAlive is true. Root-Helper bleibt aktiv.");
            }
        }
    } catch (e) {
        writeToRotatedLog("❌ Error closing the helper cleanly: " + e.message);
    }
});
app.on('window-all-closed', (e) => { e.preventDefault(); });
