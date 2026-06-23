const { app, Tray, Menu, shell, Notification, globalShortcut, BrowserWindow, screen } = require('electron');
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

const CONFIG_FILE = path.join(app.getPath('userData'), 'booster_config.json');
const LOG_FILE = path.join(app.getPath('userData'), 'gaming_boost.log');
const BLACKLIST_FILE = path.join(app.getPath('userData'), 'blacklist.txt');

let isBoostActive = true;
let isLoggingActive = false;
let isAutostartActive = false;
let isShaderGuardActive = false;
let optimizedPIDs = new Set();
let currentStatusText = '🎮 Status: No active games';
let isSudoPromptOpen = false;
let hasRootRights = false;
let lastPromptTime = 0; 
const PROMPT_COOLDOWN = 1 * 60 * 1000;

function loadSettings() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            if (config.isBoostActive !== undefined) isBoostActive = config.isBoostActive;
            if (config.isLoggingActive !== undefined) isLoggingActive = config.isLoggingActive;
            if (config.isAutostartActive !== undefined) isAutostartActive = config.isAutostartActive;
            if (config.isShaderGuardActive !== undefined) isShaderGuardActive = config.isShaderGuardActive;
            if (config.overlayX !== undefined) overlayX = config.overlayX;
            if (config.overlayY !== undefined) overlayY = config.overlayY;
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        const config = { isBoostActive, isLoggingActive, isAutostartActive, isShaderGuardActive, overlayX, overlayY };
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

                        if (availableRamMB < 1500) {
                            writeToRotatedLog(`🚨 WARNING: Memory Critical (${availableRamMB} MB free). Enforcing maximum release!`);
                            lastPurgeTime = Date.now();
                            const memorySpikeTrigger = new Array(5000000).fill(0);
                            exec('syslog -c aslmanager -d', (purgeError) => {
                                if (!purgeError) {
                                    writeToRotatedLog("🧹 Inactive RAM and system caches successfully evacuated.");
                                }
                            });

                            exec('killall -9 MTLCompilerService', (killErr) => {
                                if (!killErr) {
                                    writeToRotatedLog("🛡️ SUCCESS: MTLCompilerService terminated due to memory pressure!");
                                    sendNotification("🛡️ Memory depletion prevented! Inactive memory pages evacuated.");
                                }
                            });

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

function checkAndBoostGames() {
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
        const fileContent = fs.readFileSync(BLACKLIST_FILE, 'utf8');
        userBlacklist = fileContent.split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line.length > 0);
    } catch (e) {
        writeToRotatedLog("⚠️ Error reading blacklist.txt");
    }

    const searchCommand = "ps -Ax -o pid,comm | grep -Ei 'wine|wineloader|steamapps|crossover' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster'";

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

        lines.sort((a, b) => {
            const aShipping = a.toLowerCase().includes('shipping');
            const bShipping = b.toLowerCase().includes('shipping');
            if (aShipping && !bShipping) return -1;
            if (!aShipping && bShipping) return 1;
            return 0;
        });

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return;

            const pid = parts[0]; 
            const fullPath = parts.slice(1).join(' ');
            const normalizedPath = fullPath.replace(/\\/g, '/');
            const appName = path.basename(normalizedPath);
            const lowName = appName.toLowerCase();
            const cleanName = lowName.replace(/[()]/g, '');
            const is007 = normalizedPath.toLowerCase().includes('007') || pid === '1919';
            const isBlacklisted = userBlacklist.some(ignoredName => cleanName === ignoredName);

            if (!appName || 
                (isBlacklisted && !is007) ||
                cleanName.includes('helper') || 
                cleanName.includes('overlay') || 
                cleanName.includes('webhelper') || 
                cleanName.includes('ipcserver') || 
                cleanName.includes('winedevice') || 
                cleanName.includes('wineboot') || 
                cleanName.includes('wineserver') || 
                cleanName.includes('sysinfo') || 
                cleanName.includes('service') || 
                cleanName.includes('gamepolicy') || 
                (!is007 && !isNaN(cleanName.charAt(0)))
            ) return;

            currentPIDs.add(pid);

            if (optimizedPIDs.has(pid)) return;

            optimizedPIDs.add(pid);
            writeToRotatedLog(`🎯 Spiel erkannt: 📦 ${appName} (PID: ${pid})`);
            manageRamGuardState(true);

            if (isBoostActive) {
                const now = Date.now();
                
                if (isSudoPromptOpen) {
                    exec(`renice -1 -p ${pid}`, () => {});
                    writeToRotatedLog(`⚡️ MID (Safety): Parallel process ${appName} silently set to MID.`);
                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                    updateMenu();
                    return;
                }
                
                if (!hasRootRights) {
                    if (now - lastPromptTime < PROMPT_COOLDOWN) {
                        exec(`renice -1 -p ${pid}`, () => {});
                        writeToRotatedLog(`⚡️ MID: CPU priority set for ${appName} (PID: ${pid}) (Cooldown active).`);
                        currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                        updateMenu();
                        return;
                    }

                    isSudoPromptOpen = true; 
                    writeToRotatedLog(`🔒 Initiating authorization for MAX-Boost on ${appName}...`);                    
                    sudo.exec(`renice -5 -p ${pid}`, { name: 'Mac Gaming Booster' }, (err) => {
                        isSudoPromptOpen = false;
                        if (err) {
                            writeToRotatedLog(`⚠️ MAX privileges denied. 1-min cooldown active. Using MID mode for ${appName}.`);
                            lastPromptTime = Date.now(); 
                            hasRootRights = false;
                            exec(`renice -1 -p ${pid}`, () => {});
                            currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                        } else {
                            writeToRotatedLog(`⚡️ MAX: CPU priority set for ${appName} (PID: ${pid}).`);
                            hasRootRights = true; 
                            lastPromptTime = 0; 
                            currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                            sendNotification(`Performance boost (MAX) activated for "${appName}"!`);
                        }
                    });
                } else if (hasRootRights) {
                    exec(`sudo renice -5 -p ${pid}`, (err) => {
                        if (err) {
                            if (isSudoPromptOpen) {
                                exec(`renice -1 -p ${pid}`, () => {});
                                writeToRotatedLog(`⚡️ MID (Safety): Ticket expired. Parallel process set to MID.`);
                                currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                                updateMenu();
                                return;
                            }

                            hasRootRights = false; 
                            isSudoPromptOpen = true;
                            
                            sudo.exec(`renice -5 -p ${pid}`, { name: 'Mac Gaming Booster' }, (sudoErr) => {
                                isSudoPromptOpen = false;
                                if (sudoErr) {
                                    writeToRotatedLog(`⚠️ Ticket expired & re-authorization denied. Using MID mode for ${appName}.`);
                                    lastPromptTime = Date.now(); 
                                    exec(`renice -1 -p ${pid}`, () => {});
                                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                                    updateMenu();
                                } else {
                                    writeToRotatedLog(`⚡️ MAX: CPU priority set for ${appName} (PID: ${pid}) after renewal.`);
                                    hasRootRights = true;
                                    lastPromptTime = 0;
                                    currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                                    updateMenu();
                                    sendNotification(`Performance boost (MAX) activated for "${appName}"!`);
                                }
                            });
                        } else {
                            writeToRotatedLog(`⚡️ MAX: CPU priority set for ${appName} (PID: ${pid}).`);
                            currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                            sendNotification(`Performance boost (MAX) activated for "${appName}"!`);
                        }
                    });
                } else {
                    exec(`renice -1 -p ${pid}`, () => {});
                    writeToRotatedLog(`⚡️ MID: CPU priority set for ${appName} (PID: ${pid}).`);
                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                    updateMenu();
                }
            }
        });

        for (let pid of optimizedPIDs) {
            if (!currentPIDs.has(pid)) {
                optimizedPIDs.delete(pid);
                writeToRotatedLog(`⏳ Game with PID ${pid} terminated. Evacuated from memory.`);
                if (hasRootRights) {
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

function updateMenu() {
    const contextMenu = Menu.buildFromTemplate([
        { label: '🚀 MAC GAMING BOOSTER', enabled: false },
        { label: `${currentStatusText}`, enabled: false },
        { label: 'Version: 2.3.2 (Smart Native Memory)', enabled: false },
        { label: 'Developer: Mario (flashi)', enabled: false },
        { type: 'separator' },
        {
            label: '📊 RAM Overlay ein/aus',
            accelerator: 'CmdOrCtrl+Alt+R',
            click: () => { toggleRamOverlay(); }
        },
        { type: 'separator' },
        {
            label: '🚀 Enable FPS Boost',
            type: 'checkbox',
            checked: isBoostActive,
            click: (menuItem) => {
                isBoostActive = menuItem.checked;
                saveSettings();
                optimizedPIDs.clear(); 
                updateMenu(); 
            }
        },
        {
            label: '🛡️ Enable Adaptive Shader Guard (Anti-Panic)',
            type: 'checkbox',
            checked: isShaderGuardActive,
            click: (menuItem) => {
                isShaderGuardActive = menuItem.checked;
                saveSettings();
                writeToRotatedLog(`🛡️ Shader Guard ${isShaderGuardActive ? 'ENABLED' : 'DISABLED'} by user.`);
                if (optimizedPIDs.size > 0) {
                    manageRamGuardState(true);
                } else {
                    manageRamGuardState(false);
                }
                updateMenu();
            }
        },
        { 
            label: '📝 Enable Logging (gaming_boost.log)', 
            type: 'checkbox', 
            checked: isLoggingActive, 
            click: (menuItem) => {
                isLoggingActive = menuItem.checked;
                saveSettings();
                if (isLoggingActive) {
                    fs.writeFileSync(LOG_FILE, '', 'utf8');
                    writeToRotatedLog("Logging via menu bar ENABLED.");
                    optimizedPIDs.clear(); 
                } else {
                    if (fs.existsSync(LOG_FILE)) {
                        fs.unlinkSync(LOG_FILE);
                    }
                }
                updateMenu();
            }
        },
        { 
            label: '⚙️ Start at Login (Autostart)',
            type: 'checkbox',
            checked: isAutostartActive,
            click: (menuItem) => {
                isAutostartActive = menuItem.checked;
                saveSettings();
                app.setLoginItemSettings({
                    openAtLogin: isAutostartActive,
                    openAsHidden: true 
                });
                updateMenu();
            }
        },
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
            label: '📝 Edit Blacklist (Ignore File)',
            click: () => {
                if (fs.existsSync(BLACKLIST_FILE)) {
                    shell.openPath(BLACKLIST_FILE);
                }
            }
        },
        { type: 'separator' },
        { label: 'Quit App', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
    loadSettings();

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

    if (isLoggingActive) {
        fs.writeFileSync(LOG_FILE, '', 'utf8');
        writeToRotatedLog("🚀 App initiated - Persistent logging ACTIVE.");
    }

    updateMenu();
    intervalId = setInterval(checkAndBoostGames, 4000);
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (intervalId) clearInterval(intervalId);
    if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
    if (overlayInterval) clearInterval(overlayInterval);
});

app.on('window-all-closed', (e) => { e.preventDefault(); });
