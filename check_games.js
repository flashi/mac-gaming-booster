const fs = require('fs');
const path = require('path');
const os = require('os');

// Konstanten und Pfade gemäss Konfiguration v2.7.1
const HOME = os.homedir();

const CONFIG_DIR = path.join(HOME, 'Library/Application Support/fps-boost/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'games_list.txt');
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');

const detectedGames = new Set();
const lowercaseCheckSet = new Set();
const gameExeMap = new Map();

// FIX: 'rockstar games' wurde hier entfernt, damit die Verbindung klappt!
const WINDOWS_APP_BLACKLIST = new Set([
    'battle.net desktop app', 'battle.net', 'epic games store', 'epic games',
    'steam', 'ubisoft connect', 'ubisoft', 'gog galaxy', 'common files',
    'windows media player', 'internet explorer', 'windows nt',
    'microsoft.net', 'microsoft', 'uplay', 'origin', 'ea desktop', 'ea'
]);

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
 * Optimierter Finder: Unterstützt Multi-Exe-Spiele wie Uncharted (u4.exe und tll-l.exe)
 */
function findExecutableInDir(dirPath, depth = 0) {
    if (depth > 8 || !fs.existsSync(dirPath)) return '';
    try {
        const files = fs.readdirSync(dirPath);
        let candidateExes = [];
        let macAppPath = '';

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);

            // 1. WINDOWS-PFAD: Nach .exe suchen
            if (stat.isFile() && file.toLowerCase().endsWith('.exe')) {
                const lowerFile = file.toLowerCase();
                
                if (!lowerFile.includes('unitycrashhandler') && 
                    !lowerFile.includes('crashreport') && 
                    !lowerFile.includes('crs-handler') && 
                    !lowerFile.includes('unins') && 
                    !lowerFile.includes('setup') &&
                    !lowerFile.includes('launcher') && 
                    !lowerFile.includes('diagnostic')) {
                    
                    candidateExes.push(fullPath);
                }
            }

            // 2. MAC-PFAD
            if (stat.isDirectory() && file.toLowerCase().endsWith('.app')) {
                macAppPath = fullPath;
            }
        }

        // --- SONDERFALL MULTI-EXE (Uncharted 4 & Lost Legacy) ---
        // Wenn sowohl u4.exe als auch tll-l.exe im selben Ordner liegen, geben wir ein 
        // spezielles Trennzeichen zurück, damit addGameSafely beide eintragen kann!
        const lowerCandidates = candidateExes.map(p => path.basename(p).toLowerCase());
        if (lowerCandidates.includes('u4.exe') && lowerCandidates.includes('tll-l.exe')) {
            return "u4.exe||tll-l.exe"; 
        }

        // Standardfall: Wenn Exes da sind, sortiere nach Größe und nimm die größte
        if (candidateExes.length > 0) {
            candidateExes.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
            return candidateExes[0]; 
        }

        // Mac .app Handling
        if (macAppPath) {
            const plistPath = path.join(macAppPath, 'Contents', 'Info.plist');
            if (fs.existsSync(plistPath)) {
                try {
                    const plistContent = fs.readFileSync(plistPath, 'utf8');
                    const execMatch = plistContent.match(/<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/);
                    if (execMatch && execMatch[1]) {
                        const binaryName = execMatch[1].trim();
                        if (binaryName === 'AppBundleExe') {
                            return path.basename(macAppPath, '.app');
                        }
                        return binaryName;
                    }
                } catch (e) {}
            }
            return path.basename(macAppPath, '.app');
        }

        // Rekursiv tiefer gehen
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
                const subExe = findExecutableInDir(fullPath, depth + 1);
                if (subExe) return subExe;
            }
        }
    } catch (e) {}
    return '';
}

function addGameSafely(cleanName, exePath = '') {
    if (!cleanName || cleanName.length < 3) return;
    
    let finalName = cleanName.replace(/["']/g, '').trim();
    const lower = finalName.toLowerCase();
    
    if (WINDOWS_APP_BLACKLIST.has(lower)) return;
    if (lower.startsWith('chrome_') || lower.includes('steamworks') || lower.includes('steam linux') || /^[0-9.\s\-]+$/.test(finalName)) return;
    if (lower.includes('bonus content') || lower.includes('soundtrack') || lower.includes('artbook') || lower.includes('sdk')) return;

    if (!lowercaseCheckSet.has(lower)) {
        lowercaseCheckSet.add(lower);
        detectedGames.add(`🎮 ${finalName}`);
        
        if (exePath) {
            const exeName = path.basename(exePath);
            gameExeMap.set(finalName, exeName);
        } else {
            // FIX: Spezieller Fallback für GTA V, falls über Steam absolut keine Exe ermittelt werden konnte.
            // Da das Spiel zwingend den Rockstar Launcher oder PlayGTAV braucht, mappen wir es fest auf diese Prozesse.
            if (lower.includes('grand theft auto') || lower.includes('gta')) {
                gameExeMap.set(finalName, 'PlayGTAV.exe');
            } else {
                gameExeMap.set(finalName, 'unknown_executable.exe');
            }
        }
    }
}


/**
 * 2. NATIVER LAUNCHER-SCAN: STEAM (.acf)
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
                        const nameMatch = content.match(/"name"\s+"([^"]+)"/i);
                        const folderMatch = content.match(/"installdir"\s+"([^"]+)"/i);
                        
                        if (nameMatch && nameMatch[1]) {
                            const gameName = nameMatch[1].trim(); 
                            let exePath = '';
                            
                            if (folderMatch && folderMatch[1]) {
                                const folderName = folderMatch[1].trim();
                                const standardPath = path.join(searchDir, 'common', folderName); 
                                
                                // Erzwinge die Suche im echten "installdir" Ordner, egal was im Manifest steht
                                if (fs.existsSync(standardPath)) {
                                    exePath = findExecutableInDir(standardPath);
                                }
                                
                                // Sicherheitsnetz: Fuzzy-Search falls der Pfad oben nicht reagiert
                                if (!exePath) {
                                    const commonDir = path.join(searchDir, 'common');
                                    if (fs.existsSync(commonDir)) {
                                        const exactFolders = fs.readdirSync(commonDir);
                                        const cleanFolderName = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        
                                        for (const folder of exactFolders) {
                                            const cleanFolder = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            if (cleanFolderName.includes(cleanFolder) || cleanFolder.includes(cleanFolderName)) {
                                                const fuzzyPath = path.join(commonDir, folder);
                                                exePath = findExecutableInDir(fuzzyPath);
                                                if (exePath) break;
                                            }
                                        }
                                    }
                                }
                            }
                            addGameSafely(gameName, exePath);
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
 * 3. NATIVER LAUNCHER-SCAN: EPIC GAMES (.item)
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
                                let exePath = '';
                                if (parsed.InstallLocation) {
                                    exePath = findExecutableInDir(parsed.InstallLocation);
                                }
                                addGameSafely(parsed.DisplayName, exePath);
                            }
                        }
                    } catch (e) {}
                }
            });
        } catch (err) {}
    }
}



/**
 * 4. NATIVER LAUNCHER-SCAN: BATTLE.NET (.build.info)
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
                        const exePath = findExecutableInDir(fullPath);
                        addGameSafely(file, exePath);
                    }

                    try {
                        const subFiles = fs.readdirSync(fullPath);
                        subFiles.forEach(subFile => {
                            const subPath = path.join(fullPath, subFile);
                            if (fs.existsSync(path.join(subPath, '.build.info'))) {
                                const exePath = findExecutableInDir(subPath);
                                addGameSafely(subFile, exePath);
                            }
                        });
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }
}

/**
 * 5. NATIVER LAUNCHER-SCAN: HEROIC GAMES LAUNCHER (JSON Store Cache)
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
                        
                        const checkAndAddHeroicGame = (game) => {
                            if (game && game.title && game.is_installed) {
                                let exePath = '';
                                if (game.install_path) {
                                    exePath = findExecutableInDir(game.install_path);
                                }
                                addGameSafely(game.title, exePath);
                            }
                        };

                        if (parsed && Array.isArray(parsed)) {
                            parsed.forEach(checkAndAddHeroicGame);
                        } else if (parsed) {
                            checkAndAddHeroicGame(parsed);
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
    console.log("🔍 Starte bereinigten, plattformfreien v2.7.1 Manifest-Scanner mit EXE-Mapping...");

    // Launcher Scans starten
    scanSteamManifests(path.join(HOME, 'Library/Application Support/Steam'));
    getDynamicExternalVolumes().forEach(plate => scanSteamManifests(plate));
    scanEpicGamesManifests();
    scanBattleNetManifests();
    scanHeroicManifests();

    // Standard-Ausgabeliste sortieren
    const outputLines = Array.from(detectedGames).sort();
    let fileContent = outputLines.length === 0 ? 'Keine Spiele gefunden.' : outputLines.join('\n');

    // Mapping-Zeilen generieren (Alphabetisch sortiert nach Spielname)
    const mappingLines = Array.from(gameExeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, exePath]) => `${name}=>${exePath}`);
    let mappingFileContent = mappingLines.length === 0 ? '' : mappingLines.join('\n');

    console.log("\n--- GEFUNDENE SPIELE (BEREINIGTER MANIFEST-CHECK) ---");
    console.log(fileContent);
    console.log("-----------------------------------------------------");

    // Exportieren
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`\n💾 Reine Spieleliste erfolgreich exportiert unter:\n${OUTPUT_FILE}`);
        
        fs.writeFileSync(MAPPING_FILE, mappingFileContent, 'utf-8');
        console.log(`💾 Exe-Mapping-Datei erfolgreich exportiert unter:\n${MAPPING_FILE}`);
        
    } catch (err) {
        console.error(`\n❌ Export-Fehler: ${err.message}`);
    }
}

// Skript ausführen
runGameScanner();
