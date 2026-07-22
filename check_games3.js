const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, 'Library/Application Support/fps-boost/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'games_list.txt');
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
const SCANNER_LOG_FILE = path.join(CONFIG_DIR, 'game_scanner.log'); // 🟢 Added: Separate English Scanner Log!

const detectedGames = new Set();
const lowercaseCheckSet = new Set();
const gameExeMap = new Map();

const WINDOWS_APP_BLACKLIST = new Set([
    'battle.net desktop app', 'battle.net', 'epic games store', 'epic games',
    'steam', 'ubisoft connect', 'ubisoft', 'gog galaxy', 'common files',
    'windows media player', 'internet explorer', 'windows nt',
    'microsoft.net', 'microsoft', 'uplay', 'origin', 'ea desktop', 'ea'
]);

// 🟢 Added: Pure English Logger exclusively for the Universal Game Scanner Array
function writeToScannerLog(text, isNewScan = false) {
    try {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${text}\n`;
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        if (isNewScan) {
            fs.writeFileSync(SCANNER_LOG_FILE, `[${timestamp}] 🚀 === MAC GAMING BOOSTER - UNIVERSAL GAME SCANNER INITIALIZED ===\n`, 'utf8');
        }
        fs.appendFileSync(SCANNER_LOG_FILE, logLine, 'utf8');
    } catch (e) {}
}
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

// 👑 PLATIN-FIX: Returns all verified Steam paths dynamically from both Internal SSD and External SSD arrays!
function getInternalCrossOverSteamPaths() {
    let paths = [];
    writeToScannerLog("🖥️ DEVICE TELEMETRY: Initiating storage matrix analysis...", true);

    // 1. Internal Storage Check
    const internalBottlesDir = path.join(HOME, 'Library/Application Support/CrossOver/Bottles');
    writeToScannerLog(`📁 [INTERNAL SSD] target directory: ${internalBottlesDir}`);
    
    if (fs.existsSync(internalBottlesDir)) {
        try {
            const bottles = fs.readdirSync(internalBottlesDir);
            bottles.forEach(bottle => {
                const steamAppsPath = path.join(internalBottlesDir, bottle, 'drive_c/Program Files (x86)/Steam/steamapps');
                if (fs.existsSync(steamAppsPath)) {
                    writeToScannerLog(`   ➔ 🟢 FOUND INTERNAL BOTTLE: [${bottle}] -> Steam path verified.`);
                    paths.push(steamAppsPath);
                }
            });
        } catch (e) {}
    } else {
        writeToScannerLog("   ℹ️ Internal CrossOver bottle directory not detected.");
    }

    // 2. External Drive Radar Array (The Christophe Fix!)
    writeToScannerLog("🔍 [EXTERNAL SSD RADAR] Scanning mounted storage nodes via /Volumes/ Sektor...");
    const externalPlates = getDynamicExternalVolumes();

    externalPlates.forEach(plate => {
        writeToScannerLog(`   💾 Mounted storage device detected: ${plate}`);
        
        // Dynamically verifies common structural setups on external volumes
        const potentialExternalDirs = [
            path.join(plate, 'CrossOver/Bottles'),
            path.join(plate, 'CrossOver-Bottles'),
            path.join(plate, 'Bottles')
        ];

        potentialExternalDirs.forEach(extBottlesDir => {
            if (fs.existsSync(extBottlesDir)) {
                writeToScannerLog(`   📂 External CrossOver environment verified: ${extBottlesDir}`);
                try {
                    const extBottles = fs.readdirSync(extBottlesDir);
                    extBottles.forEach(extBottle => {
                        const extSteamPath = path.join(extBottlesDir, extBottle, 'drive_c/Program Files (x86)/Steam/steamapps');
                        if (fs.existsSync(extSteamPath)) {
                            writeToScannerLog(`   ➔ 🟢 FOUND EXTERNAL BOTTLE: [${extBottle}] on drive [${path.basename(plate)}] -> Steam path verified.`);
                            paths.push(extSteamPath);
                        }
                    });
                } catch (e) {}
            }
        });
    });

    writeToScannerLog(`🏁 === VECTOR COMPLETED: ${paths.length} Active Steam environments locked and loaded ===`);
    return paths;
}
function findExecutableInDir(dirPath, depth = 0) {
    if (depth > 8 || !fs.existsSync(dirPath)) return '';
    try {
        const folderName = path.basename(dirPath).toLowerCase();
        if (typeof exeOverrides !== 'undefined' && exeOverrides[folderName]) {
            if (dirPath.toLowerCase().includes('trackmania') || dirPath.toLowerCase().includes('uncharted')) {
                console.log(`🎯 JSON-Override angewendet für Ordner [${folderName}] -> Erzwinge: ${exeOverrides[folderName]}`);
            }
            return exeOverrides[folderName];
        }
        const files = fs.readdirSync(dirPath);
        let candidateExes = [];
        let backupLauncherExes = [];
        let macAppPath = '';
        if (dirPath.toLowerCase().includes('trackmania')) {
            console.log(`\n📂 [Trackmania-Radar] Scanne Ebene ${depth}: ${dirPath}`);
        }
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && file.toLowerCase().endsWith('.exe')) {
                const lowerFile = file.toLowerCase();
                if (dirPath.toLowerCase().includes('trackmania')) {
                    console.log(`  📄 Gefundene Datei: ${file} (Größe: ${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
                }
                if (lowerFile.includes('unitycrashhandler') || lowerFile.includes('crashreport') || lowerFile.includes('crs-handler') || lowerFile.includes('unins') || lowerFile.includes('diagnostic')) {
                    if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: System/Crash-Tool)`);
                    continue; 
                }
                if (lowerFile.includes('setup') || lowerFile.includes('launcher') || lowerFile.includes('installer')) {
                    if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ⚠️ In Backup verschoben: ${file} (Grund: Launcher/Setup/Installer-Muster)`);
                    backupLauncherExes.push(fullPath);
                    continue;
                } 
                if (dirPath.toLowerCase().includes('trackmania')) {
                    console.log(`    🟢 Akzeptiert als Kandidat: ${file}`);
                }
                candidateExes.push(fullPath);
            }
            if (stat.isDirectory() && file.toLowerCase().endsWith('.app')) {
                macAppPath = fullPath;
            }
        }
        if (candidateExes.length > 0) {
            candidateExes.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
            if (dirPath.toLowerCase().includes('trackmania')) {
                console.log(`  🏆 Gewinner-EXE für dieser Ordner: ${path.basename(candidateExes[0])}`);
            }
            return candidateExes[0]; 
        }
        if (backupLauncherExes.length > 0) {
            backupLauncherExes.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
            if (dirPath.toLowerCase().includes('trackmania')) {
                console.log(`  🏆 Backup-Gewinner für dieser Ordner: ${path.basename(backupLauncherExes[0])}`);
            }
            return backupLauncherExes[0];
        } 
        if (macAppPath) {
            return path.basename(macAppPath, '.app');
        }
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

const OVERRIDES_FILE = path.join(CONFIG_DIR, 'scanner_overrides.json');
let exeOverrides = {};
if (!fs.existsSync(OVERRIDES_FILE)) {
    try {
        const APP_TEMPLATE_FILE = path.join(__dirname, 'scanner_overrides.json');
        if (fs.existsSync(APP_TEMPLATE_FILE)) {
            fs.copyFileSync(APP_TEMPLATE_FILE, OVERRIDES_FILE);
            console.log("✨ scanner_overrides.json erfolgreich aus dem App-Bundle kopiert!");
        } else {
            fs.writeFileSync(OVERRIDES_FILE, JSON.stringify({}, null, 2), 'utf8');
        }
    } catch (e) {}
}
try {
    if (fs.existsSync(OVERRIDES_FILE)) {
        exeOverrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
    }
} catch (e) {
    exeOverrides = {};
}
function addGameSafely(cleanName, exePath = '') {
    if (!cleanName || cleanName.length < 3) return;
    let finalName = cleanName.replace(/["']/g, '').trim();
    const lower = finalName.toLowerCase();
    if (typeof userBlacklist !== 'undefined' && userBlacklist.length > 0) {
        const checkExeName = exePath ? path.basename(exePath).toLowerCase().trim() : '';
        const isBlacklisted = userBlacklist.some(ghost => {
            const cleanGhost = ghost.trim().toLowerCase();
            return lower === cleanGhost || 
                   lower.includes(cleanGhost) || 
                   (checkExeName && (cleanGhost === checkExeName || checkExeName.includes(cleanGhost)));
        });
        if (isBlacklisted) {
            console.log(`🛑 [Blacklist-Shield] Dropped entry: '${finalName}' (${checkExeName || 'No EXE'}) matches a forbidden background process.`);
            writeToScannerLog(`🛑 [Shield] Dropped entry: '${finalName}' (${checkExeName || 'No EXE'}) matches user custom blacklist.`);
            return;
        }
    }
    if (WINDOWS_APP_BLACKLIST.has(lower)) {
        console.log(`⚙️ [Filter] Skipping launcher runtime environment: '${finalName}'`);
        return;
    }
    if (lower.startsWith('chrome_') || lower.includes('steamworks') || lower.includes('steam linux') || /^[0-9.\s\-]+$/.test(finalName)) return;
    if (lower.includes('bonus content') || lower.includes('soundtrack') || lower.includes('artbook') || lower.includes('sdk')) return;
    
    if (!lowercaseCheckSet.has(lower)) {
        lowercaseCheckSet.add(lower);
        detectedGames.add(`🎮 ${finalName}`);
        let matchedOverride = "";
        for (const [key, value] of Object.entries(exeOverrides)) {
            if (lower.includes(key) || lower === key) {
                matchedOverride = value;
                break;
            }
        }
        if (matchedOverride) {
            gameExeMap.set(finalName, matchedOverride);
            writeToScannerLog(`   🎯 MATCHED BUNDLE MAP: Game [${finalName}] mapped via Override JSON file ➔ Binary: ${matchedOverride}`);
        } else if (exePath) {
            let exeName = exePath.includes('||') ? exePath : path.basename(exePath);
            if (exeName.toLowerCase().includes('.exe')) {
                const exeMatch = exeName.match(/^([^\s]+\.exe)/i);
                if (exeMatch && exeMatch[1]) {
                    exeName = exeMatch[1];
                }
            }
            gameExeMap.set(finalName, exeName);
            writeToScannerLog(`   🎯 MATCHED DEPLOYMENT MAP: Game [${finalName}] mapped successfully ➔ Binary: ${exeName}`);
        } else {
            gameExeMap.set(finalName, 'unknown_executable.exe');
            writeToScannerLog(`   ⚠️ UNKNOWN DEPLOYMENT SPEC: Game [${finalName}] has no valid executable signature. Mapped to default.`);
        }
    }
}

function scanSteamManifests(searchDir, currentDepth = 0) {
    if (currentDepth > 5) return;
    try {
        if (!fs.existsSync(searchDir)) return;
        const { execSync } = require('child_process');
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
                            console.log(`📦 [Steam-Scanner] Parsing manifest for game: '${gameName}'`);
                            let exePath = '';
                            if (folderMatch && folderMatch[1]) {
                                const folderName = folderMatch[1].trim();
                                const commonDir = path.join(searchDir, 'common');
                                const standardPath = path.join(commonDir, folderName);
                                try {
                                    const findCmd = `find "${commonDir}" -type f -iname "*.exe" 2>/dev/null`;
                                    const allExes = execSync(findCmd).toString().trim().split('\n');
                                    let bestCandidate = "";
                                    let maxBytes = 0;
                                    allExes.forEach(rawPath => {
                                        const cleanPath = rawPath.trim();
                                        if (!cleanPath) return;
                                        if (cleanPath.toLowerCase().includes(folderName.toLowerCase())) {
                                            const fName = path.basename(cleanPath).toLowerCase();
                                            if (fName.includes('unitycrashhandler') || fName.includes('crashreport') || fName.includes('crs-handler') || fName.includes('unins') || fName.includes('diagnostic')) {
                                                return;
                                            }
                                            if (fName.includes('launcher') || fName.includes('setup') || fName.includes('installer') || fName.includes('language') || fName.includes('select') || fName.includes('config')) {
                                                if (!bestCandidate) bestCandidate = cleanPath; 
                                                return;
                                            }
                                            try {
                                                const currentBytes = fs.statSync(cleanPath).size;
                                                if (currentBytes > maxBytes) {
                                                    maxBytes = currentBytes;
                                                    bestCandidate = cleanPath;
                                                }
                                            } catch (e) {
                                                if (!bestCandidate) bestCandidate = cleanPath;
                                            }
                                        }
                                    });
                                    if (bestCandidate) {
                                        exePath = path.basename(bestCandidate);
                                        console.log(`🎯 [System-Find-Radar] Korrekte Haupt-EXE über Kernel-Suche zugewiesen: ${exePath}`);
                                    }
                                } catch (err) {
                                    exePath = '';
                                }
                                if (!exePath) {
                                    if (fs.existsSync(standardPath)) {
                                        exePath = findExecutableInDir(standardPath);
                                    }
                                }
                            }
                            if (!exePath || exePath === 'unknown_executable.exe') {
                                exePath = 'GTA5.exe';
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
                if (!['library', 'system', 'volumes'].includes(lowerFolder)) {
                    scanSteamManifests(fullPath, currentDepth + 1);
                }
            }
        }
    } catch (e) {}
}
function scanEpicGamesManifests() {
    writeToScannerLog("📦 [Epic-Scanner] Initializing layout check across storage nodes...");
    
    // 👑 DYNAMISCHER EPIC-ARRAY-SCAN: Sammelt interne und externe Epic-Manifest-Pfade vollautomatisch!
    let epicManifestPaths = [
        path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests')
    ];
    
    // 1. Interner Flaschen-Check
    const crossoverBottlesDir = path.join(HOME, 'Library/Application Support/CrossOver/Bottles');
    if (fs.existsSync(crossoverBottlesDir)) {
        try {
            const bottles = fs.readdirSync(crossoverBottlesDir);
            bottles.forEach(bottle => {
                const bottleEpicPath = path.join(crossoverBottlesDir, bottle, 'drive_c/ProgramData/Epic/EpicGamesLauncher/Data/Manifests');
                if (fs.existsSync(bottleEpicPath)) {
                    epicManifestPaths.push(bottleEpicPath);
                }
            });
        } catch (e) {}
    }

    // 2. 🚀 Externer SSD-Radar für Epic Games (Der Christophe-Zusatzschutz!)
    getDynamicExternalVolumes().forEach(plate => {
        const potentialExternalEpicDirs = [
            path.join(plate, 'CrossOver/Bottles'),
            path.join(plate, 'CrossOver-Bottles'),
            path.join(plate, 'Bottles')
        ];
        potentialExternalEpicDirs.forEach(extBottlesDir => {
            if (fs.existsSync(extBottlesDir)) {
                try {
                    const extBottles = fs.readdirSync(extBottlesDir);
                    extBottles.forEach(extBottle => {
                        const extEpicPath = path.join(extBottlesDir, extBottle, 'drive_c/ProgramData/Epic/EpicGamesLauncher/Data/Manifests');
                        if (fs.existsSync(extEpicPath)) {
                            writeToScannerLog(`   ➔ 🟢 FOUND EXTERNAL EPIC ENGINE: Bottle [${extBottle}] on drive [${path.basename(plate)}] -> Syncing manifests.`);
                            epicManifestPaths.push(extEpicPath);
                        }
                    });
                } catch (e) {}
            }
        });
    });

    // Verarbeitet alle Manifest-Dateien (.item) aus allen gefundenen Pfaden
    epicManifestPaths.forEach(epicManifestDir => {
        if (fs.existsSync(epicManifestDir)) {
            console.log(`📦 [Epic-Scanner] Scanning directory: ${epicManifestDir}`);
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
                                        let cleanInstallLocation = parsed.InstallLocation.replace(/\\/g, '/');
                                        if (/^[a-zA-Z]:\/[vV]olumes\//.test(cleanInstallLocation)) {
                                            cleanInstallLocation = cleanInstallLocation.substring(2); 
                                        } 
                                        else if (cleanInstallLocation.startsWith('C:/') || cleanInstallLocation.startsWith('c:/')) {
                                            const bottleRoot = epicManifestDir.split('/drive_c/')[0];
                                            cleanInstallLocation = path.join(bottleRoot, 'drive_c', cleanInstallLocation.substring(3));
                                        }
                                        const potentialSubDirs = ['Retail', 'retail', 'binaries', 'Binaries', 'Binaries/Win64', 'bin'];
                                        for (const subDir of potentialSubDirs) {
                                            const deepPath = path.join(cleanInstallLocation, subDir);
                                            if (fs.existsSync(deepPath) && fs.statSync(deepPath).isDirectory()) {
                                                cleanInstallLocation = deepPath; 
                                                break;
                                            }
                                        } 
                                        exePath = findExecutableInDir(cleanInstallLocation);
                                    }
                                    addGameSafely(parsed.DisplayName, exePath);
                                }
                            }
                        } catch (e) {}
                    }
                });
            } catch (err) {}
        }
    });
}


function scanBattleNetManifests() {
    console.log("📦 [Battle.net-Scanner] Initializing tracking across active directories...");
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
                        console.log(`📦 [Battle.net-Scanner] Valid config file discovered for application root: '${file}'`);
                        const exePath = findExecutableInDir(fullPath);
                        addGameSafely(file, exePath);
                    }
                    try {
                        const subFiles = fs.readdirSync(fullPath);
                        subFiles.forEach(subFile => {
                            const subPath = path.join(fullPath, subFile);
                            if (fs.existsSync(path.join(subPath, '.build.info'))) {
                                console.log(`📦 [Battle.net-Scanner] Valid config file discovered for subdirectory application: '${subFile}'`);
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
function scanHeroicManifests() {
    writeToScannerLog("📦 [Heroic-Scanner] Querying engine deployments from local runtime cache...");
    const heroicCacheDir = path.join(HOME, 'Library/Application Support/heroic/store_cache');
    if (fs.existsSync(heroicCacheDir)) {
        console.log(`📦 [Heroic-Scanner] Synchronizing setup data from cache: ${heroicCacheDir}`);
        try {
            const files = fs.readdirSync(heroicCacheDir);
            files.forEach(file => {
                if (file.toLowerCase().endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(heroicCacheDir, file), 'utf8');
                        const parsed = JSON.parse(content);
                        const checkAndAddHeroicGame = (game) => {
                            if (game && game.title && game.is_installed) {
                                console.log(`📦 [Heroic-Scanner] Verified active deployment for app: '${game.title}'`);
                                let exePath = '';
                                
                                // 👑 FIX: Übergebe den Pfad zur externen SSD an den intelligenten Tiefen-Sucher!
                                if (game.install_path && fs.existsSync(game.install_path)) {
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

function scanUbisoftGames() {
    writeToScannerLog("📦 [Ubisoft-Scanner] Checking configuration matrices within active environments...");
    
    // 👑 DYNAMISCHER UBISOFT-ARRAY-SCAN: Sammelt interne und externe Ubisoft-Pfade vollautomatisch!
    let ubiPaths = [];
    
    // 1. Interner Check
    const internalBottlesDir = path.join(HOME, 'Library/Application Support/CrossOver/Bottles');
    if (fs.existsSync(internalBottlesDir)) {
        try {
            const bottles = fs.readdirSync(internalBottlesDir);
            bottles.forEach(bottle => {
                const ubiGamesPath = path.join(internalBottlesDir, bottle, 'drive_c/Program Files (x86)/Ubisoft/Ubisoft Game Launcher/games');
                if (fs.existsSync(ubiGamesPath)) {
                    ubiPaths.push(ubiGamesPath);
                }
            });
        } catch (e) {}
    }

    // 2. 🚀 Externer SSD-Radar für Ubisoft (Der ultimative Fix!)
    getDynamicExternalVolumes().forEach(plate => {
        const potentialExternalUbiDirs = [
            path.join(plate, 'CrossOver/Bottles'),
            path.join(plate, 'CrossOver-Bottles'),
            path.join(plate, 'Bottles')
        ];
        potentialExternalUbiDirs.forEach(extBottlesDir => {
            if (fs.existsSync(extBottlesDir)) {
                try {
                    const extBottles = fs.readdirSync(extBottlesDir);
                    extBottles.forEach(extBottle => {
                        const extUbiPath = path.join(extBottlesDir, extBottle, 'drive_c/Program Files (x86)/Ubisoft/Ubisoft Game Launcher/games');
                        if (fs.existsSync(extUbiPath)) {
                            writeToScannerLog(`   ➔ 🟢 FOUND EXTERNAL UBISOFT STORAGE: Bottle [${extBottle}] on drive [${path.basename(plate)}] -> Syncing directories.`);
                            ubiPaths.push(extUbiPath);
                        }
                    });
                } catch (e) {}
            }
        });
    });

    // Verarbeitet alle gefundenen Pfade (Intern + Extern) mit deiner originalen Such-Logik
    ubiPaths.forEach(ubiGamesPath => {
        console.log(`📦 [Ubisoft-Scanner] Checking active deployment storage: ${ubiGamesPath}`);
        try {
            const gameFolders = fs.readdirSync(ubiGamesPath);
            gameFolders.forEach(folder => {
                const fullGamePath = path.join(ubiGamesPath, folder);
                if (fs.statSync(fullGamePath).isDirectory() && !folder.startsWith('.')) {
                    const exePath = findExecutableInDir(fullGamePath);
                    addGameSafely(folder, exePath);
                }
            });
        } catch (e) {}
    });
}

function scanExternalCustomGames() {
    const externalPlates = getDynamicExternalVolumes();
    externalPlates.forEach(plate => {
        console.log(`📦 [Custom-Drive-Scanner] Checking runtime directories on storage node: ${plate}`);
        const validGameRoots = [
            path.join(plate, 'Games'),
            path.join(plate, 'Spiele'),
            path.join(plate, 'SteamLibrary')
        ];
        validGameRoots.forEach(searchPath => {
            if (fs.existsSync(searchPath)) {
                try {
                    const items = fs.readdirSync(searchPath);
                    items.forEach(item => {
                        const fullItemPath = path.join(searchPath, item);
                        if (fs.existsSync(fullItemPath) && fs.statSync(fullItemPath).isDirectory() && !item.startsWith('.')) {
                            const lowerItem = item.toLowerCase();
                            if (lowerItem === 'steamapps') return;
                            const exePath = findExecutableInDir(fullItemPath);
                            if (exePath) {
                                addGameSafely(item, exePath);
                            }
                        }
                    });
                } catch (e) {}
            }
        });
    });
}
function runGameScanner() {
    console.log("🔍 Starting indestructible v2.8.1b manifest scanner with deep CrossOver bottle check...");
    const internalSteamPaths = getInternalCrossOverSteamPaths();
    if (internalSteamPaths.length > 0) {
        internalSteamPaths.forEach(steamPath => {
            console.log(`📦 Active storage bottle path locked: ${steamPath}`);
            scanSteamManifests(steamPath);
        });
    } else {
        scanSteamManifests(path.join(HOME, 'Library/Application Support/Steam'));
    }
    getDynamicExternalVolumes().forEach(plate => scanSteamManifests(plate));
    scanEpicGamesManifests();
    scanBattleNetManifests();
    scanHeroicManifests();
    scanUbisoftGames();
    scanExternalCustomGames();
    const outputLines = Array.from(detectedGames)
        .map(g => g.replace('🎮 ', '').trim())
        .sort();
    let fileContent = outputLines.length === 0 ? 'No games found.' : outputLines.join('\n');
    const mappingLines = Array.from(gameExeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, exeFile]) => {
            let finalExe = exeFile;
            if (name.toLowerCase().includes('uncharted')) {
                finalExe = 'u4.exe';
            }
            return `${name}=>${finalExe}`;
        });
    let mappingFileContent = mappingLines.length === 0 ? '' : mappingLines.join('\n');
    console.log("\n--- FOUND GAMES (CLEANED MANIFEST CHECK) ---");
    console.log(outputLines.map(g => `🎮 ${g}`).join('\n'));
    console.log("-----------------------------------------------------");
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`\n💾 Pure game list successfully exported (${outputLines.length} entries tracked) to:\n${OUTPUT_FILE}`);
        fs.writeFileSync(MAPPING_FILE, mappingFileContent, 'utf-8');
        console.log(`\n💾 Exe mapping file successfully exported (${mappingLines.length} processes mapped) to:\n${MAPPING_FILE}`);
        
        // 🟢 Confirms successful execution context inside the separate English Scanner Log!
        writeToScannerLog(`🏁 === RECON VECTOR COMPLETED SUCCESSFULLY: ${outputLines.length} entries synchronized into global configuration maps ===`);
    } catch (err) {
        console.error(`\n❌ Export error: ${err.message}`);
        writeToScannerLog(`❌ [CRITICAL CORRUPTION] Failed to build deployment maps: ${err.message}`);
    }
}
runGameScanner();
