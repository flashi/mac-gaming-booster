const fs = require('fs');
const path = require('path');
const os = require('os');

// Konstanten und Pfade gemäss Konfiguration v2.7.1
const HOME = os.homedir();

// v2.7.1 Pfadstruktur für den sauberen TXT-Export
const CONFIG_DIR = path.join(HOME, 'Library/Application Support/fps-boost/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'games_list.txt');

const detectedGames = new Set();
const lowercaseCheckSet = new Set();

// Minimierte technische Blacklist für nackte Launcher und Frameworks
const WINDOWS_APP_BLACKLIST = new Set([
    'battle.net desktop app', 'battle.net', 'epic games store', 'epic games',
    'steam', 'ubisoft connect', 'ubisoft', 'gog galaxy', 'common files',
    'windows media player', 'rockstar games', 'internet explorer', 'windows nt',
    'microsoft.net', 'microsoft', 'uplay', 'origin', 'ea desktop', 'ea'
]);

/**
 * Dynamische Erkennung aller gemounteten Volumes auf dem Mac
 */
function getDynamicExternalVolumes() {
    const volumesRoot = '/Volumes';
    let detectedVolumes = [];
    if (fs.existsSync(volumesRoot)) {
        try {
            const files = fs.readdirSync(volumesRoot);
            files.forEach(file => {
                const fullPath = path.join(volumesRoot, file);
                if (!file.startsWith('.') && !file.toLowerCase().includes('com.apple')) {
                    try {
                        if (fs.statSync(fullPath).isDirectory()) {
                            detectedVolumes.push(fullPath);
                        }
                    } catch (e) {}
                }
            });
        } catch (err) {}
    }
    return detectedVolumes;
}

/**
 * Validiert und fügt gefundene Spiele duplikatfrei der Liste hinzu (Ohne [Windows] Tag!)
 */
function addGameSafely(cleanName) {
    if (!cleanName || cleanName.length < 3) return;
    
    let finalName = cleanName.replace(/["']/g, '').trim();
    const lower = finalName.toLowerCase();
    
    if (WINDOWS_APP_BLACKLIST.has(lower)) return;
    if (lower.startsWith('chrome_') || lower.includes('steamworks') || lower.includes('steam linux') || /^[0-9.\s\-]+$/.test(finalName)) return;
    if (lower.includes('bonus content') || lower.includes('soundtrack') || lower.includes('artbook') || lower.includes('sdk')) return;

    if (!lowercaseCheckSet.has(lower)) {
        lowercaseCheckSet.add(lower);
        // Rein als "🎮 Spielname" formatiert, Pfade und Tags sind komplett ausgeblendet
        detectedGames.add(`🎮 ${finalName}`);
    }
}

/**
 * 1. NATIVER LAUNCHER-SCAN: STEAM (.acf)
 */
function scanSteamManifests(searchDir, currentDepth = 0) {
    if (currentDepth > 5) return;
    try {
        if (!fs.existsSync(searchDir)) return;
        const files = fs.readdirSync(searchDir);

        if (searchDir.toLowerCase().endsWith('steamapps')) {
            files.forEach(file => {
                if (file.toLowerCase().startsWith('appmanifest_') && file.toLowerCase().endsWith('.acf')) {
                    try {
                        const content = fs.readFileSync(path.join(searchDir, file), 'utf8');
                        const match = content.match(/"name"\s+"([^"]+)"/i);
                        if (match && match[1]) {
                            addGameSafely(match[1]);
                        }
                    } catch (e) {}
                }
            });
            return;
        }

        for (const file of files) {
            if (file.startsWith('.')) continue;
            const fullPath = path.join(searchDir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const lowerFolder = file.toLowerCase();
                if (!['library', 'documents', 'downloads', 'desktop', '.trash'].includes(lowerFolder)) {
                    scanSteamManifests(fullPath, currentDepth + 1);
                }
            }
        }
    } catch (e) {}
}

/**
 * 2. NATIVER LAUNCHER-SCAN: EPIC GAMES (.item)
 */
function scanEpicGamesManifests() {
    const epicManifestDir = path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests');
    if (fs.existsSync(epicManifestDir)) {
        try {
            const files = fs.readdirSync(epicManifestDir);
            files.forEach(file => {
                if (file.toLowerCase().endsWith('.item')) {
                    try {
                        const content = fs.readFileSync(path.join(epicManifestDir, file), 'utf8');
                        const parsed = JSON.parse(content);
                        if (parsed && parsed.DisplayName && parsed.AppName) {
                            if (!parsed.AppName.toLowerCase().includes('unrealengine')) {
                                addGameSafely(parsed.DisplayName);
                            }
                        }
                    } catch (e) {}
                }
            });
        } catch (err) {}
    }
}
/**
 * 3. NATIVER LAUNCHER-SCAN: BATTLE.NET (.build.info)
 * Durchsucht alle Laufwerke nach installierten Blizzard-Spielen.
 */
function scanBattleNetManifests() {
    const volumes = [path.join(HOME, 'Applications'), ...getDynamicExternalVolumes()];
    for (const baseDir of volumes) {
        try {
            if (!fs.existsSync(baseDir)) continue;
            const rootFiles = fs.readdirSync(baseDir);
            for (const file of rootFiles) {
                const fullPath = path.join(baseDir, file);
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    const lowerFolder = file.toLowerCase();
                    if (lowerFolder.startsWith('.') || ['library', 'system', 'volumes'].includes(lowerFolder)) continue;

                    const bnetBuildInfo = path.join(fullPath, '.build.info');
                    if (fs.existsSync(bnetBuildInfo)) {
                        addGameSafely(file);
                    }

                    try {
                        const subFiles = fs.readdirSync(fullPath);
                        subFiles.forEach(subFile => {
                            const subPath = path.join(fullPath, subFile);
                            if (fs.existsSync(path.join(subPath, '.build.info'))) {
                                addGameSafely(subFile);
                            }
                        });
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }
}

/**
 * 4. NATIVER LAUNCHER-SCAN: HEROIC GAMES LAUNCHER (JSON Store Cache)
 * Liest den Mac-seitigen Cache von Heroic aus.
 */
function scanHeroicManifests() {
    const heroicCacheDir = path.join(HOME, 'Library/Application Support/heroic/store_cache');
    if (fs.existsSync(heroicCacheDir)) {
        try {
            const files = fs.readdirSync(heroicCacheDir);
            files.forEach(file => {
                if (file.toLowerCase().endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(heroicCacheDir, file), 'utf8');
                        const parsed = JSON.parse(content);
                        if (parsed && Array.isArray(parsed)) {
                            parsed.forEach(game => {
                                if (game && game.title && game.is_installed) {
                                    addGameSafely(game.title);
                                }
                            });
                        } else if (parsed && parsed.title && parsed.is_installed) {
                            addGameSafely(parsed.title);
                        }
                    } catch (e) {}
                }
            });
        } catch (err) {}
    }
}

/**
 * Hauptfunktion zur Ausführung des bereinigten Manifest-Scans
 */
function runGameScanner() {
    console.log("🔍 Starte bereinigten, plattformfreien v2.7.1 Manifest-Scanner...");

    // 1. Steam (Lokal + Dynamische Volumes)
    scanSteamManifests(path.join(HOME, 'Library/Application Support/Steam'));
    getDynamicExternalVolumes().forEach(plate => scanSteamManifests(plate));

    // 2. Epic Games Store
    scanEpicGamesManifests();

    // 3. Battle.net
    scanBattleNetManifests();

    // 4. Heroic Games Launcher
    scanHeroicManifests();

    // Ergebnisse verarbeiten und sortieren
    const outputLines = Array.from(detectedGames).sort();
    let fileContent = outputLines.length === 0 ? 'Keine Spiele gefunden.' : outputLines.join('\n');

    console.log("\n--- GEFUNDENE SPIELE (BEREINIGTER MANIFEST-CHECK) ---");
    console.log(fileContent);
    console.log("-----------------------------------------------------");

    // TXT-Export in die v2.7.1 Ordnerstruktur
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`\n💾 Reine Spieleliste erfolgreich exportiert unter:\n${OUTPUT_FILE}`);
    } catch (err) {
        console.error(`\n❌ Export-Fehler: ${err.message}`);
    }
}

// Skript ausführen
runGameScanner();
