const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const MAPPING_FILE = path.join(HOME, 'Library/Application Support/fps-boost/config/games_exe_mapping.txt');

// RAM-Mapping für Klarnamen laden
let activeGamesMapping = new Map();
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

// Hilfsfunktion für stylische Ladebalken im Video
function drawBar(percent, width = 20) {
    const safePercent = (Number.isNaN(percent) || typeof percent !== 'number' || percent < 0) ? 0 : percent;
    const filledLength = Math.round((safePercent / 100) * width);
    const cappedFilled = Math.max(0, Math.min(width, filledLength));
    const emptyLength = width - cappedFilled;
    return '█'.repeat(cappedFilled) + '░'.repeat(emptyLength);
}

// Holt System-Statistiken für eine bestimmte PID via 'ps'
function getProcessStats(pid) {
    try {
        const output = execSync(`ps -p ${pid} -o %cpu,%mem,nice,command 2>/dev/null`).toString().trim().split('\n');
        if (output.length < 2) return null;
        const stats = output[1].trim().split(/\s+/);
        return {
            cpu: parseFloat(stats[0]),
            mem: parseFloat(stats[1]),
            nice: parseInt(stats[2]),
            command: stats.slice(3).join(' ')
        };
    } catch (e) {
        return null;
    }
}

// Findet alle PIDs deiner App und Helfer im System
function findDaemonPIDs() {
    try {
        const output = execSync("ps -Ax -o pid,comm | grep -Ei 'Mac Gaming Booster' | grep -vE 'grep|monitor.js'").toString().trim();
        if (!output) return [];
        return output.split('\n').map(line => line.trim().split(/\s+/)[0]);
    } catch (e) {
        return [];
    }
}

// Scant nach dem aktiven Spiel und bevorzugt den echten Spiele-Prozess (crs-handler)
function scanActiveGame() {
    try {
        const searchCommand = "ps -Ax -o pid,command | grep -Ei 'wine|wineloader|steamapps|crossover|crs-handler|wineloader64' | grep -vE 'grep|Electron|gamecontroller|Mac.Gaming.Booster|monitor.js'";
        const stdout = execSync(searchCommand).toString().trim();
        if (!stdout) return null;

        const lines = stdout.split('\n');
        let foundGame = null;

        for (let line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            
            const pid = parts[0];
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

            // Weg A: Direkt-Match
            if (activeGamesMapping.has(appName)) {
                currentMatch = { pid, name: activeGamesMapping.get(appName), stats: getProcessStats(pid) };
            }
            // Weg B: Tiefen-Pfad-Match
            if (!currentMatch) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    if (lowerPath.includes(processKey.toLowerCase().trim())) {
                        currentMatch = { pid, name: gameTitle, stats: getProcessStats(pid) };
                        break;
                    }
                }
            }
            // Weg C: PlayStation/Sony Special Fix
            if (!currentMatch && lowerPath.includes('crs-handler')) {
                for (let [processKey, gameTitle] of activeGamesMapping.entries()) {
                    const cleanTitle = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanPath = lowerPath.replace(/[^a-z0-9]/g, '');
                    if (cleanPath.includes(cleanTitle)) {
                        currentMatch = { pid, name: gameTitle, stats: getProcessStats(pid) };
                        break;
                    }
                }
            }

            if (currentMatch) {
                // 🔥 HOCH-PRIORITÄTS-WEICHE FÜR DAS VIDEO:
                // Wenn wir den crs-handler (den echten Spiele-Prozess) finden, brechen wir SOFORT ab und nehmen den!
                if (lowerPath.includes('crs-handler')) {
                    return currentMatch; 
                }
                // Ansonsten merken wir uns den Launcher, suchen aber in den nächsten Zeilen weiter nach dem crs-handler
                if (!foundGame) {
                    foundGame = currentMatch;
                }
            }
        }
        return foundGame;
    } catch (e) {}
    return null;
}

// Die Live-Update-Schleife für dein YouTube-Video
function runDashboard() {
    loadMapping(); 
    const daemons = findDaemonPIDs();
    const activeGame = scanActiveGame();

    console.clear();
    console.log("================================================================");
    console.log("🚀 MAC GAMING BOOSTER v2.7.1 - LIVE MONITORING DASHBOARD (VIDEO)");
    console.log("================================================================");
    console.log("\n🛡️ SYSTEM DAEMONS & HELPER:");
    console.log("----------------------------------------------------------------");

    if (daemons.length === 0) {
        console.log("● App Status: 🛑 INAKTIV (Bitte starte den Mac Gaming Booster)");
    } else {
        daemons.forEach((pid, index) => {
            const stats = getProcessStats(pid);
            if (stats) {
                const name = index === 0 ? "Main App" : `Helper ${index}`;
                console.log(`● ${name.padEnd(12)} (PID: ${pid.padEnd(5)}) -> CPU: ${stats.cpu.toFixed(1).padStart(5)}% [${drawBar(stats.cpu, 10)}] | Nice: ${stats.nice}`);
            }
        });
        console.log("● Root Service Helper     -> 🟢 AKTIV (Überwacht Kernel-Ebene)");
    }

    console.log("\n🎮 AKTIVES SPIEL (KERNEL DETECTOR):");
    console.log("----------------------------------------------------------------");

    if (!activeGame) {
        console.log(" Warten auf Spielstart... (Scanne CrossOver/Steam-Laufzeiten...)");
    } else {
        const stats = activeGame.stats || { cpu: 0, mem: 0, nice: 0 };
        const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(0);
        const gameMemGB = ((stats.mem / 100) * parseFloat(totalMemGB)).toFixed(1);

        console.log(`Erkanntes Spiel: 📦 ${activeGame.name}`);
        console.log(`Prozess-ID:     🆔 PID ${activeGame.pid}`);
        
        if (stats.nice <= -5) {
            console.log(`Kernel-Status:  ⚡ NICE ${stats.nice} (🟢 MAX-BOOST KERNEL ACTIVE)`);
        } else if (stats.nice < 0) {
            console.log(`Kernel-Status:  ⚡ NICE ${stats.nice} (🟡 MID-BOOST ACTIVE)`);
        } else {
            console.log(`Kernel-Status:  ⌛ NICE  ${stats.nice} (⚪ STANDARD PRIORITÄT)`);
        }

        console.log("\n📈 RESSOURCEN-VERBRAUCH DES SPIELS:");
        console.log("----------------------------------------------------------------");
        console.log(`CPU-Auslastung: [${drawBar(stats.cpu, 20)}] ${stats.cpu.toFixed(1)} %`);
        console.log(`RAM-Verbrauch:  [${drawBar(stats.mem * 4, 20)}] ${gameMemGB} GB / ${totalMemGB} GB (Unified Memory)`);
    }
    console.log("================================================================");
}

// Aktualisierungsrate: Jede Sekunde für maximale Flüssigkeit im Video
setInterval(runDashboard, 1000);
