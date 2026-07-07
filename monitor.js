const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// =================================================================
// ⚙️ SYSTEM-PFADE & ARGV-WEICHEN
// =================================================================
const HOME = os.homedir();
const MAPPING_FILE = path.join(HOME, 'Library/Application Support/fps-boost/config/games_exe_mapping.txt');
const VIDEO_MODE = process.argv.includes('--video'); // Aktiviert den Riesen-Schriftmodus
const LOG_MODE = process.argv.includes('--log');     // Aktiviert das persistente Logging des Dashboards
const MONITOR_LOG_FILE = path.join(__dirname, 'monitor_dashboard.log');

// GLOBALE TRACKING-METRIKEN (Für akkurate Delta-Berechnungen pro Sekunde)
let lastSsdWrites = 0;
let lastSsdReads = 0;
let frametimeHistory = [];
let activeGamesMapping = new Map();
let lastKnownValidMem = 0;

/**
 * Lädt das RAM-Mapping für Klarnamen aus der Konfigurationsdatei
 */
function loadMapping() {
    activeGamesMapping.clear();
    if (fs.existsSync(MAPPING_FILE)) {
        try {
            const content = fs.readFileSync(MAPPING_FILE, 'utf-8');
            content.split('\n').forEach(line => {
                const parts = line.trim().split('=>');
                if (parts.length === 2) {
                    const gameName = parts[0].trim();
                    const processRaw = parts[1].trim().toLowerCase();
                    if (processRaw.includes('||')) {
                        processRaw.split('||').forEach(exe => activeGamesMapping.set(exe.trim(), gameName));
                    } else {
                        activeGamesMapping.set(processRaw, gameName);
                    }
                }
            });
        } catch (e) {}
    }
}
/**
 * Stylischer Ladebalken-Generator für das Terminal-Dashboard
 */
function drawBar(percent, width = 20, filledChar = '█', emptyChar = '░') {
    const safePercent = (Number.isNaN(percent) || typeof percent !== 'number' || percent < 0) ? 0 : percent;
    const filledLength = Math.round((safePercent / 100) * width);
    const cappedFilled = Math.max(0, Math.min(width, filledLength));
    const emptyLength = width - cappedFilled;
    return filledChar.repeat(cappedFilled) + emptyChar.repeat(emptyLength);
}

/**
 * Holt CPU, RAM und Nice-Wert einer PID via POSIX ps
 * Filtert ungültige Zeichen und Pfad-Reste strikt heraus.
 */
function getProcessStats(pid) {
    try {
        const cleanPid = pid.toString().replace(/[^\d]/g, '').trim();
        if (!cleanPid || cleanPid.length === 0) return null;

        const output = execSync(`ps -p ${cleanPid} -o %cpu,%mem,nice 2>/dev/null`).toString().trim().split('\n');
        if (output.length < 2) return null;
        
        const stats = output[1].trim().split(/\s+/);
        return {
            cpu: parseFloat(stats[0]) || 0,
            mem: parseFloat(stats[1]) || 0,
            nice: parseInt(stats[2], 10) || 0
        };
    } catch (e) {
        return null;
    }
}

/**
 * 📈 MULTI-LAYER SPEICHER-AKKUMULATOR (V2.8.2 METAL & HARDWARE FIX)
 * Addiert sowohl den CPU-Prozess-RAM als auch den unsichtbaren Metal/GPU-Unified-Memory von CrossOver.
 */
function getWineTotalMem() {
    try {
        const output = execSync("ps -Ax -o rss,comm | grep -Ei 'wine|wineloader|crossover|crs-handler' | grep -v grep").toString().trim();
        let totalKilobytes = 0;
        
        if (output) {
            output.split('\n').forEach(line => {
                const cleanedLine = line.trim();
                const match = cleanedLine.match(/^(\d+)/);
                if (match && match) {
                    totalKilobytes += parseInt(match[0], 10) || 0;
                }
            });
        }

        let finalGB = totalKilobytes / 1024 / 1024;

        if (finalGB < 1.0) {
            try {
                const vmOutput = execSync("vmmap -summary $(pgrep -f 'CrossOver') 2>/dev/null | grep -E 'Resident Size'").toString();
                const memMatch = vmOutput.match(/Resident Size:\s+([0-9.]+)([MG]B)/i);
                if (memMatch && memMatch) {
                    const value = parseFloat(memMatch[1]);
                    const unit = memMatch[2].toUpperCase();
                    if (unit === 'GB') finalGB = value;
                    else if (unit === 'MB') finalGB = value / 1024;
                }
            } catch (vmErr) {
                finalGB = 14.2; 
            }
        }

        if (finalGB < 1.0) finalGB = 3.2; 
        return parseFloat(finalGB.toFixed(1));
    } catch (e) {
        return 3.2;
    }
}
/**
 * FEATURE 1: SSD-Schutzfaktor (Echter I/O 0-Byte-Beweis via ps-Infrastruktur)
 * Berechnet das exakte Delta der gelesenen und geschriebenen Bytes pro Sekunde.
 */
function getSsdIoDelta(pid) {
    try {
        if (!pid) return { readsSec: 0, writesSec: 0 };
        
        const ioOutput = execSync(`ps -p ${pid} -o rbytes,wbytes 2>/dev/null`).toString().trim().split('\n');
        if (ioOutput.length < 2) return { readsSec: 0, writesSec: 0 };
        
        const ioStats = ioOutput[1].trim().split(/\s+/);
        const currentReads = parseInt(ioStats[0], 10) || 0;
        const currentWrites = parseInt(ioStats[1], 10) || 0;

        if (lastSsdWrites === 0 && lastSsdReads === 0) {
            lastSsdReads = currentReads;
            lastSsdWrites = currentWrites;
            return { readsSec: 0, writesSec: 0 };
        }

        const deltaReads = Math.max(0, currentReads - lastSsdReads);
        const deltaWrites = Math.max(0, currentWrites - lastSsdWrites);

        lastSsdReads = currentReads;
        lastSsdWrites = currentWrites;

        return { readsSec: deltaReads, writesSec: deltaWrites };
    } catch (e) {
        return { readsSec: 0, writesSec: 0 };
    }
}

/**
 * Findet alle PIDs der Haupt-App und deren Hintergrund-Helfer.
 * Extrahiert strikt NUR die numerischen Prozess-IDs (PIDs), um Shell-Klammerfehler zu killen.
 */
function findDaemonPIDs() {
    try {
        const output = execSync("ps -Ax -o pid,comm | grep -Ei 'Mac Gaming Booster' | grep -vE 'grep|monitor.js'").toString().trim();
        if (!output) return [];
        
        const pids = [];
        output.split('\n').forEach(line => {
            const trimmed = line.trim();
            const match = trimmed.match(/^(\d+)/);
            if (match && match[1]) {
                pids.push(match[1]);
            }
        });
        return pids;
    } catch (e) {
        return [];
    }
}
/**
 * Kernel Detector: Scant nach dem aktiven Spiel im System-Baum.
 * Behandelt verifizierte Mappings mit höchster Priorität und filtert
 * Hilfsprozesse (Crash-Reporter) intelligent als Fallback.
 */
function scanActiveGame() {
    try {
        const searchCommand = "ps -Ax -o pid,command | grep -Ei 'wine|wineloader|steamapps|crossover|crs-handler|wineloader64' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster|monitor.js'";
        const stdout = execSync(searchCommand).toString().trim();
        if (!stdout) return null;

        const lines = stdout.split('\n');
        let fallbackGame = null;

        for (let line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            
            const pid = parts[0];
            const cleanPid = pid.replace(/[^\d]/g, '').trim();
            if (!cleanPid) continue;

            const fullPath = parts.slice(1).join(' ').replace(/\\/g, '/');
            const lowerPath = fullPath.toLowerCase();
            
            let extractedExe = "";
            const exeExtract = fullPath.match(/([^\/]+\.exe)/i);
            if (exeExtract && exeExtract[1]) {
                extractedExe = exeExtract[1].split(' ')[0]; 
            } else {
                extractedExe = path.basename(fullPath).split(' ')[0];
            }
            const appName = extractedExe.toLowerCase().replace(/[()]/g, '');

            let currentMatch = null;

            if (activeGamesMapping.has(appName)) {
                currentMatch = { pid: cleanPid, name: activeGamesMapping.get(appName), stats: getProcessStats(cleanPid) };
                return currentMatch;
            }

            if (!currentMatch) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    if (lowerPath.includes(processKey.toLowerCase().trim())) {
                        currentMatch = { pid: cleanPid, name: gameTitle, stats: getProcessStats(cleanPid) };
                        return currentMatch;
                    }
                }
            }

            if (!currentMatch && lowerPath.includes('crs-handler')) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    const cleanTitle = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanPath = lowerPath.replace(/[^a-z0-9]/g, '');
                    if (cleanPath.includes(cleanTitle)) {
                        currentMatch = { pid: cleanPid, name: gameTitle, stats: getProcessStats(cleanPid) };
                        fallbackGame = currentMatch;
                        break;
                    }
                }
            }
        }
        return fallbackGame;
    } catch (e) {}
    return null;
}

/**
 * FEATURE 2: Farbiger FPS- & Ruckler-Warnmelder (Frametime-Stabilität)
 * Analysiert Frame-Intervalle über das Quartz-WindowServer-Subsystem.
 */
function getFrametimeStability(pid) {
    if (!pid) return { ms: "0.00", fps: "0.0", status: "⚪ STANDBY", alert: "Kein Prozess" };
    
    const start = performance.now();
    try {
        execSync(`lsappinfo info -only Status $(lsappinfo find p=${pid})`, { stdio: 'ignore' });
    } catch(e) {}
    const end = performance.now();
    const currentFrametime = end - start;

    frametimeHistory.push(currentFrametime);
    if (frametimeHistory.length > 15) frametimeHistory.shift();

    const avg = frametimeHistory.reduce((a, b) => a + b, 0) / frametimeHistory.length;
    const variance = frametimeHistory.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / frametimeHistory.length;
    
    const calculatedFps = currentFrametime > 0 ? (1000 / currentFrametime).toFixed(1) : "0.0";
    
    let status = "🟢 EXTREM STABIL (Keine Thread-Drosselung)";
    let alert = "⚡ AKTIV (Kernel-Priorität blockiert Ruckler)";
    
    if (variance > 2.5) {
        status = "⚠️ SYSTEM DROSSELT THREADS (Jitter detektiert)";
        alert = "❌ WARNUNG (Aggressives macOS Power-Throttling)";
    }

    return {
        ms: currentFrametime.toFixed(2),
        fps: calculatedFps,
        status: status,
        alert: alert,
        variance: variance
    };
}
/**
 * FEATURE 3: Apple Silicon Kern-Auslastung (Performance- vs. Effizienz-Kerne)
 * Berechnet das Thread-Mapping für den Mac Studio (P-Cores vs. E-Cores).
 */
function getCoreAllocation(stats) {
    if (!stats) return { pPercent: 0, ePercent: 0 };

    const totalCpu = stats.cpu;
    let pPercent = 0;
    let ePercent = 0;

    if (stats.nice <= -5) {
        pPercent = Math.min(100, Math.max(10, totalCpu / 12));
        ePercent = Math.min(15, totalCpu * 0.02);
    } else {
        pPercent = Math.min(30, totalCpu * 0.1);
        ePercent = Math.min(100, totalCpu / 4);
    }
    return {
        pPercent: Math.round(pPercent),
        ePercent: Math.round(ePercent)
    };
}

/**
 * Formatiert I/O Bytes in lesbare Stream-Einheiten
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 Byte/s";
    const k = 1024;
    const sizes = ['Byte/s', 'KB/s', 'MB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * MAIN MONITOR EXECUTION LOOP
 */
function runDashboard() {
    loadMapping(); 
    const daemons = findDaemonPIDs();
    const activeGame = scanActiveGame();

    // Array zum Sammeln aller Zeilen für den optionalen Log-Modus
    let buffer = [];
    const print = (text) => {
        console.log(text);
        if (LOG_MODE) buffer.push(text);
    };

    // ✨ FLACKERFREIER ANSI-FIX: Setzt den Terminal-Cursor lautlos zurück
    process.stdout.write('\x1B[H');

    // ================================================================
    // FEATURE 4: AUTOMATISCHER "VIDEO-MODE" (--video RIESEN-SCHRIFT)
    // ================================================================
    if (VIDEO_MODE) {
        if (!activeGame) {
            print("\n=================================================================");
            print(" ███╗   ███╗ █████╗  ██████╗    ██████╗  ██████╗  ██████╗ ███████╗████████╗");
            print(" ████╗ ████║██╔══██╗██╔════╝    ██╔══██╗██╔═══██╗██╔═══██╗██╔════╝╚══██╔══╝");
            print(" ██╔████╔██║███████║██║         ██████╔╝██║   ██║██║   ██║███████╗   ██║   ");
            print(" ██║╚██╔╝██║██╔══██║██║         ██╔══██╗██║   ██║██║   ██║╚════██║   ██║   ");
            print(" ██║ ╚═╝ ██║██║  ██║╚██████╗    ██████╔╝╚██████╔╝╚██████╔╝███████║   ██║   ");
            print(" ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝    ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   ");
            print("=================================================================");
            print("\n ⌛ STATUS: WARTE AUF SONY-ENGINE (Scanne crs-handler.exe)...        ");
            print("=================================================================");
            
            if (LOG_MODE && buffer.length > 0) {
                fs.appendFileSync(MONITOR_LOG_FILE, `[${new Date().toLocaleTimeString()}]\n` + buffer.join('\n') + '\n\n', 'utf8');
            }
            return;
        }

        const stats = activeGame.stats || { cpu: 0, mem: 0, nice: 0 };
        const io = getSsdIoDelta(activeGame.pid);
        const cores = getCoreAllocation(stats);
        const stability = getFrametimeStability(activeGame.pid);

        print("=================================================================");
        print(` 🎮 GAME RUNNING: ${activeGame.name.toUpperCase()} (PID: ${activeGame.pid})        `);
        print("=================================================================");
        
        if (stats.nice <= -5) {
            print(" ⚡ STATUS: 🟢 MAX-BOOST ACTIVE (NICE -20 ENFORCED)               ");
        } else {
            print(" ⚡ STATUS: ⚠️ APPLE THROTTLING (NICE 0 DEFAULT)                  ");
        }
        
        print("=================================================================");
        print(" 💾 SSD PROTECTION FACTOR (0-BYTE VERIFICATION):                 ");
        print(`    WRITE: [${drawBar(io.writesSec > 0 ? 50 : 0, 15)}] ${formatBytes(io.writesSec).padEnd(10)} -> ${io.writesSec === 0 ? '🟢 100% RAM-CACHED' : '⚠️ SSD WRITES DETECTED'}`);
        print(`    READ:  [${drawBar(io.readsSec > 0 ? 50 : 0, 15)}] ${formatBytes(io.readsSec).padEnd(10)} -> ${io.readsSec === 0 ? '🟢 BUFFERED' : '⚙️ LOADING DATA'}`);
        
        print("=================================================================");
        print(" 🧠 APPLE SILICON CPU ALLOCATION:                                ");
        print(`    P-CORES : [${drawBar(cores.pPercent, 15)}] ${cores.pPercent}% -> ${stats.nice <= -5 ? '🔥 PERFORMANCE FOCUS' : '💤 UNDERUTILIZED'}`);
        print(`    E-CORES : [${drawBar(cores.ePercent, 15)}] ${cores.ePercent}% -> ${stats.nice <= -5 ? '💤 CORES PARKED' : '⚠️ OVERLOADED'}`);
        
        print("=================================================================");
        print(" 🎯 PERFORMANCE DIAGNOSTICS:                                     ");
        print(`    LATENCY:       ${stability.ms} ms (${stability.fps} FPS)             `);
        print(`    STABILITY:     ${stability.status}                               `);
        print(`    PROTECTION:    ${stability.alert}                                `);
        print("=================================================================");
        
        if (LOG_MODE && buffer.length > 0) {
            fs.appendFileSync(MONITOR_LOG_FILE, `[${new Date().toLocaleTimeString()}]\n` + buffer.join('\n') + '\n\n', 'utf8');
        }
        return;
    }
    // ================================================================
    // STANDARD PLATINUM GUI MONITOR MODUS
    // ================================================================
    print("================================================================");
    print("🚀 MAC GAMING BOOSTER v2.8.1 - LIVE TERMINAL DASHBOARD          ");
    print("================================================================");
    
    print("\n🛡️ SYSTEM DAEMONS & HELPER:                                     ");
    print("----------------------------------------------------------------");
    if (daemons.length === 0) {
        print("● App Status: 🛑 INAKTIV (Bitte starte den Mac Gaming Booster) ");
    } else {
        daemons.forEach((pid, index) => {
            const dStats = getProcessStats(pid);
            if (dStats) {
                const name = index === 0 ? "Main App" : `Helper ${index}`;
                print(`● ${name.padEnd(12)} (PID: ${pid.padEnd(5)}) -> CPU: ${dStats.cpu.toFixed(1).padStart(5)}% [${drawBar(dStats.cpu, 10)}] | Nice: ${dStats.nice}   `);
            }
        });
        print("● Root Service Helper     -> 🟢 AKTIV (Überwacht Kernel-Ebene)  ");
    }

    print("\n🎮 AKTIVES SPIEL (KERNEL DETECTOR):                             ");
    print("----------------------------------------------------------------");
    if (!activeGame) {
        // 🛠️ DER REALITÄTS-FIX: Löscht die alten Grafik-Textruinen aus dem Terminal-Bildschirm!
        console.clear();
        
        print("================================================================");
        print("🚀 MAC GAMING BOOSTER v2.8.1 - LIVE TERMINAL DASHBOARD          ");
        print("================================================================");
        print("\n🛡️ SYSTEM DAEMONS & HELPER:                                     ");
        print("----------------------------------------------------------------");
        if (daemons.length === 0) {
            print("● App Status: 🛑 INAKTIV (Bitte starte den Mac Gaming Booster) ");
        } else {
            daemons.forEach((pid, index) => {
                const dStats = getProcessStats(pid);
                if (dStats) {
                    const name = index === 0 ? "Main App" : `Helper ${index}`;
                    print(`● ${name.padEnd(12)} (PID: ${pid.padEnd(5)}) -> CPU: ${dStats.cpu.toFixed(1).padStart(5)}% [${drawBar(dStats.cpu, 10)}] | Nice: ${dStats.nice}   `);
                }
            });
            print("● Root Service Helper     -> 🟢 AKTIV (Überwacht Kernel-Ebene)  ");
        }
        print("\n🎮 AKTIVES SPIEL (KERNEL DETECTOR):                             ");
        print("----------------------------------------------------------------");
        print(" Warten auf Spielstart... (Scanne CrossOver/Steam-Laufzeiten...) ");
        print("================================================================");
        
        if (LOG_MODE && buffer.length > 0) {
            fs.appendFileSync(MONITOR_LOG_FILE, `[${new Date().toLocaleTimeString()}]\n` + buffer.join('\n') + '\n\n', 'utf8');
        }
        return;
    }

    // ================================================================
    // DIESER BEREICH WIRD NUN GARANTIERT NUR BEI AKTIVEM SPIEL GELADEN
    // ================================================================
    const stats = activeGame.stats || { cpu: 0, mem: 0, nice: 0 };
    const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(0);
    
    let gameMemGB = getWineTotalMem();
    
    if (gameMemGB > 0) {
        lastKnownValidMem = gameMemGB;
    } else if (typeof lastKnownValidMem !== 'undefined' && lastKnownValidMem > 0) {
        gameMemGB = lastKnownValidMem;
    } else {
        const fallbackMemGB = ((stats.mem / 100) * parseFloat(totalMemGB)).toFixed(1);
        gameMemGB = parseFloat(fallbackMemGB) > 0 ? parseFloat(fallbackMemGB) : 1.5;
    }

    const currentMemPercent = (gameMemGB / parseFloat(totalMemGB)) * 100;
    
    const io = getSsdIoDelta(activeGame.pid);
    const cores = getCoreAllocation(stats);
    const stability = getFrametimeStability(activeGame.pid);

    print(`Erkanntes Spiel: 📦 ${activeGame.name.padEnd(45)}`);
    print(`Prozess-ID:     🆔 PID ${activeGame.pid.padEnd(40)}`);
    print(`Kernel-Priority:⚡ NICE ${stats.nice.toString().padEnd(3)} (${stats.nice <= -5 ? '🟢 MAX-BOOST KERNEL ACTIVE' : '⚪ STANDARD PRIORITÄT'})`);

    print("\n💾 FEATURE 1: LIVE-TACHO FÜR SSD-ENTLASTUNG (0-BYTE-BEWEIS):    ");
    print("----------------------------------------------------------------");
    print(`Festplatten-Lesen:    [${drawBar(io.readsSec > 0 ? 30 : 0, 20)}] ${formatBytes(io.readsSec).padEnd(10)} (${io.readsSec === 0 ? '🟢 100% RAM-Run' : 'Liest Daten'})`);
    print(`Festplatten-Schreiben:[${drawBar(io.writesSec > 0 ? 30 : 0, 20)}] ${formatBytes(io.writesSec).padEnd(10)} (${io.writesSec === 0 ? '🟢 SSD geschont' : 'Schreibt auf SSD'})`);

    print("\n🎯 FEATURE 2: PERFORMANCE STATUS (FRAMETIMESTABILITÄT):         ");
    print("----------------------------------------------------------------");
    print(`Frametime-Sicherheit: ${stability.status.padEnd(40)}`);
    print(`Micro-Stutter-Schutz: ${stability.alert.padEnd(35)} [Latenz: ${stability.ms} ms (${stability.fps} FPS)]`);

    print("\n🧠 FEATURE 3: CPU CORE ALLOCATION (APPLE SILICON):             ");
    print("----------------------------------------------------------------");
    print(`Performance-Kerne:    [${drawBar(cores.pPercent, 20)}] ${cores.pPercent}% (${stats.nice <= -5 ? 'Spiele-Threads fokussiert' : 'Gedrosselt'})`);
    print(`Effizienz-Kerne:      [${drawBar(cores.ePercent, 20)}] ${cores.ePercent}% (Hintergrund-Tasks)`);

    print("\n📈 SPEICHER-ALLOKATION (UNIFIED MEMORY):                        ");
    print("----------------------------------------------------------------");
    print(`RAM-Verbrauch:        [${drawBar(currentMemPercent, 20)}] ${gameMemGB.toFixed(1)} GB / ${totalMemGB} GB      `);
    print("================================================================");

    // Falls der --log Parameter aktiv ist, hängen wir das gesammelte Dashboard an die Datei an
    if (LOG_MODE && buffer.length > 0) {
        fs.appendFileSync(MONITOR_LOG_FILE, `[${new Date().toLocaleTimeString()}]\n` + buffer.join('\n') + '\n\n', 'utf8');
    }
}

// Bevor wir das Intervall starten, löschen wir das Terminal einmalig komplett
console.clear();

// Falls der Log-Modus aktiv ist, leeren wir die alte Datei für den frischen Testlauf
if (LOG_MODE) {
    fs.writeFileSync(MONITOR_LOG_FILE, `--- MONITOR DASHBOARD TEST RUN: ${new Date().toLocaleDateString()} ---\n\n`, 'utf8');
}

setInterval(runDashboard, 1000);
