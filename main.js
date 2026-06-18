const { app, Tray, Menu, shell, Notification, globalShortcut } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const sudo = require('sudo-prompt');

let tray = null;
let intervalId = null;
let ramGuardIntervalId = null;

const CONFIG_FILE = path.join(app.getPath('userData'), 'booster_config.json');
const LOG_FILE = path.join(app.getPath('userData'), 'gaming_boost.log');
const BLACKLIST_FILE = path.join(app.getPath('userData'), 'blacklist.txt');

let isBoostActive = true;
let isLoggingActive = false;
let isAutostartActive = false;
let isShaderGuardActive = false;
let optimizedPIDs = new Set();
let currentStatusText = '🎮 Status: Keine Spiele aktiv';
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
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        const config = { isBoostActive, isLoggingActive, isAutostartActive, isShaderGuardActive };
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
            writeToRotatedLog("🎮 Spiel aktiv: Aggressiver RAM-Guard (No Sudo) gestartet.");

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
                        if (availableRamMB < 1500) {
                            writeToRotatedLog(`🚨 WARNUNG: RAM kritisch (${availableRamMB} MB frei). Erzwinge maximale Freigabe!`);
                            lastPurgeTime = Date.now();
                            const memorySpikeTrigger = new Array(5000000).fill(0);
                            exec('syslog -c aslmanager -d', (purgeError) => {
                                if (!purgeError) {
                                    writeToRotatedLog("🧹 Inaktiver RAM und System-Caches erfolgreich evakuiert.");
                                }
                            });

                            exec('killall -9 MTLCompilerService', (killErr) => {
                                if (!killErr) {
                                    writeToRotatedLog(`🛡️ ERFOLG: MTLCompilerService wegen RAM-Knappheit gekillt!`);
                                    sendNotification(`🛡️ RAM-Knappheit verhindert! Inaktive Speicherseiten evakuiert.`);
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
            writeToRotatedLog("🛑 Spiel beendet: RAM-Guard gestoppt.");
        }
    }
}

function checkAndBoostGames() {
    // 📂 Standard-Blacklist erstellen, falls sie noch nicht existiert
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
        writeToRotatedLog("⚠️ Fehler beim Lesen der blacklist.txt");
    }

    const searchCommand = "ps -Ax -o pid,comm | grep -Ei 'wine|wineloader|steamapps|crossover' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster'";

    exec(searchCommand, (error, stdout) => {
        if (error || !stdout.trim()) {
            if (optimizedPIDs.size > 0) {
                writeToRotatedLog("⏳ Keine aktiven Spiele mehr gefunden. Warte...");
                optimizedPIDs.clear();
                manageRamGuardState(false);
                currentStatusText = '🎮 Status: Keine Spiele aktiv';
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
                    writeToRotatedLog(`⚡️ MID (Sicherheit): Parallel-Prozess ${appName} lautlos auf MID gesetzt.`);
                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                    updateMenu();
                    return;
                }
                
                if (!hasRootRights) {
                    if (now - lastPromptTime < PROMPT_COOLDOWN) {
                        exec(`renice -1 -p ${pid}`, () => {});
                        writeToRotatedLog(`⚡️ MID: CPU-Priorität für ${appName} (PID: ${pid}) gesetzt (Cooldown aktiv).`);
                        currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                        updateMenu();
                        return;
                    }

                    isSudoPromptOpen = true; 
                    writeToRotatedLog(`🔒 Starte Autorisierung für MAX-Boost auf ${appName}...`);
                    
                    sudo.exec(`renice -5 -p ${pid}`, { name: 'Mac Gaming Booster' }, (err) => {
                        isSudoPromptOpen = false;
                        if (err) {
                            writeToRotatedLog(`⚠️ MAX-Rechte abgelehnt. 1-Min-Sperre aktiv. Nutze MID-Modus für ${appName}.`);
                            lastPromptTime = Date.now(); 
                            hasRootRights = false;
                            exec(`renice -1 -p ${pid}`, () => {});
                            currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                        } else {
                            writeToRotatedLog(`⚡️ MAX: CPU-Priorität für ${appName} (PID: ${pid}) gesetzt.`);
                            hasRootRights = true; 
                            lastPromptTime = 0; 
                            currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                            
                            sendNotification(`Performance-Boost (MAX) für "${appName}" aktiviert!`);
                        }
                    });
                } else if (hasRootRights) {
                    exec(`sudo renice -5 -p ${pid}`, (err) => {
                        if (err) {
                            if (isSudoPromptOpen) {
                                exec(`renice -1 -p ${pid}`, () => {});
                                writeToRotatedLog(`⚡️ MID (Sicherheit): Ticket abgelaufen. Parallel-Prozess auf MID gesetzt.`);
                                currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                                updateMenu();
                                return;
                            }

                            hasRootRights = false; 
                            isSudoPromptOpen = true;
                            
                            sudo.exec(`renice -5 -p ${pid}`, { name: 'Mac Gaming Booster' }, (sudoErr) => {
                                isSudoPromptOpen = false;
                                if (sudoErr) {
                                    writeToRotatedLog(`⚠️ Ticket abgelaufen & Neuanforderung abgelehnt. Nutze MID-Modus für ${appName}.`);
                                    lastPromptTime = Date.now(); 
                                    exec(`renice -1 -p ${pid}`, () => {});
                                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                                    updateMenu();
                                } else {
                                    writeToRotatedLog(`⚡️ MAX: CPU-Priorität für ${appName} (PID: ${pid}) nach Erneuerung gesetzt.`);
                                    hasRootRights = true;
                                    lastPromptTime = 0;
                                    currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                                    updateMenu();
                                    
                                    sendNotification(`Performance-Boost (MAX) für "${appName}" aktiviert!`);
                                }
                            });
                        } else {
                            writeToRotatedLog(`⚡️ MAX: CPU-Priorität für ${appName} (PID: ${pid}) gesetzt.`);
                            currentStatusText = `🟢 MAX-Boost: 📦 ${appName} (PID: ${pid})`;
                            updateMenu();
                            
                            sendNotification(`Performance-Boost (MAX) für "${appName}" aktiviert!`);
                        }
                    });
                } else {
                    exec(`renice -1 -p ${pid}`, () => {});
                    writeToRotatedLog(`⚡️ MID: CPU-Priorität für ${appName} (PID: ${pid}) gesetzt.`);
                    currentStatusText = `🟡 MID-Boost: 📦 ${appName} (PID: ${pid})`;
                    updateMenu();
                }
            }
        });

        for (let pid of optimizedPIDs) {
            if (!currentPIDs.has(pid)) {
                optimizedPIDs.delete(pid);
                writeToRotatedLog(`⏳ Spiel mit PID ${pid} wurde beendet. Aus Speicher entfernt.`);

                if (hasRootRights) {
                    exec('sudo purge', () => {
                        writeToRotatedLog("🧹 RAM Purge: Inaktiver Festplatten-Cache erfolgreich bereinigt.");
                    });
                }

                if (optimizedPIDs.size === 0) {
                    manageRamGuardState(false);
                    currentStatusText = '🎮 Status: Keine Spiele aktiv';
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
        { label: 'Version: 2.3.0 (Smart Native Memory)', enabled: false },
        { label: 'Developer: Mario (flashi)', enabled: false },
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
            label: '🛡️ Enable 007 Shader Guard (Anti-Panic)',
            type: 'checkbox',
            checked: isShaderGuardActive,
            click: (menuItem) => {
                isShaderGuardActive = menuItem.checked;
                saveSettings();
                writeToRotatedLog(`🛡️ Shader Guard vom Benutzer ${isShaderGuardActive ? 'AKTIVIERT' : 'DEAKTIVIERT'}.`);

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

    globalShortcut.register('Option+Command+K', () => {
        if (intervalId) clearInterval(intervalId);
        if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
        app.quit();
        process.exit(0); 
    });

    if (isLoggingActive) {
        fs.writeFileSync(LOG_FILE, '', 'utf8');
        writeToRotatedLog("🚀 App gestartet - Persistent Logging AKTIV.");
    }

    updateMenu();
    intervalId = setInterval(checkAndBoostGames, 4000);
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (intervalId) clearInterval(intervalId);
    if (ramGuardIntervalId) clearInterval(ramGuardIntervalId);
});

app.on('window-all-closed', (e) => { e.preventDefault(); });
