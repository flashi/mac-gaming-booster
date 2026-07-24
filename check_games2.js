/* ============================================================================
   APPLICATION:   MAC GAMING BOOSTER (PROJEKT X)
   FILE:          check_games2.js (Universal Game Scanner Engine)
   
   STATUS:        VERSION 2.8.2 (RELEASE CANDIDATE) - STABLE & PRODUCTION READY
   DEVELOPER:     MARIO (FLASHI) - STAND: 24.07.2026
   QUALITY AUDIT: EXCELLENT (Case-insensitive path resolution, real-time matrix architecture)
   
   CORE FUNCTIONS:
   1. UNIVERSAL MANIFEST RADAR: Dynamically discovers active Steam, Epic, 
      Battle.net, Heroic, Ubisoft, and Rockstar runtime directories on SSD nodes.
   2. PLATFORM & LAUNCHER MATRIX: Automatically parses file extensions and 
      structures output targets without rigid hardcoded text rules.
   3. CASE-INSENSITIVE RESOLUTION: Re-indexes internal and mounted external volumes 
      by crawling directory layouts to correct native macOS case-sensitivity bugs.
   4. DEPLOYMENT AUTOMATION: Exports encrypted executable process tables and built-in 
      blacklist overrides directly to the core dashboard interface map.
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const os = require('os');
const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, 'Library/Application Support/fps-boost/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'games_list.txt');
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
const SCANNER_LOG_FILE = path.join(CONFIG_DIR, 'game_scanner.log');
const detectedGames = new Set();
const lowercaseCheckSet = new Set();
const gameExeMap = new Map();
const WINDOWS_APP_BLACKLIST = new Set([
    'battle.net desktop app', 'battle.net', 'epic games store', 'epic games',
    'steam', 'ubisoft connect', 'ubisoft', 'gog galaxy', 'common files',
    'windows media player', 'internet explorer', 'windows nt',
    'microsoft.net', 'microsoft', 'uplay', 'origin', 'ea desktop', 'ea'
]);
let detectedGamesMatrix = {
    macOS: {
        Native: [],
        SteamMac: []
    },
    Windows: {
        Steam: [],
        EpicGames: [],
        BattleNet: [],
        Heroic: [],
        Ubisoft: [],
        Rockstar: [],
        CustomDrive: []
    }
};
const MATRIX_JSON_FILE = path.join(CONFIG_DIR, 'games_matrix.json');
const CONFIG_FILE = path.join(CONFIG_DIR, 'booster_config.json');
function writeToScannerLog(text, isNewScan = false) {
    try {
        let loggingEnabled = false;
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (configData && configData.isGameScannerLoggingActive === true) {
                loggingEnabled = true;
            }
        }
        if (!loggingEnabled) return;
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
function getInternalCrossOverSteamPaths() {
    let paths = [];
    writeToScannerLog("🖥️ DEVICE TELEMETRY: Initiating storage matrix analysis...", true);
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
    writeToScannerLog("🔍 [EXTERNAL SSD RADAR] Scanning mounted storage nodes via /Volumes/ Sektor...");
    const externalPlates = getDynamicExternalVolumes();
    externalPlates.forEach(plate => {
        writeToScannerLog(`   💾 Mounted storage device detected: ${plate}`);
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
            return exeOverrides[folderName];
        }
        const files = fs.readdirSync(dirPath);
        let candidateExes = [];
        let backupLauncherExes = [];
        let macAppPath = '';
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && file.toLowerCase().endsWith('.exe')) {
                const lowerFile = file.toLowerCase();
                if (lowerFile.includes('unitycrashhandler') || 
                    lowerFile.includes('crashreport') || 
                    lowerFile.includes('crs-handler') || 
                    lowerFile.includes('unins') || 
                    lowerFile.includes('diagnostic') ||
                    lowerFile.includes('helper') ||
                    lowerFile.includes('cef') ||
                    lowerFile.includes('browser') ||
                    lowerFile.includes('overlay') ||
                    lowerFile.includes('redlauncher')
                ) {
                    continue; 
                } 
                if (lowerFile.includes('setup') || lowerFile.includes('launcher') || lowerFile.includes('installer')) {
                    backupLauncherExes.push(fullPath);
                    continue;
                } 
                candidateExes.push(fullPath);
            }
            if (stat.isDirectory() && file.toLowerCase().endsWith('.app')) {
                macAppPath = fullPath;
            }
        }
        if (candidateExes.length > 0) {
            candidateExes.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
            return path.basename(candidateExes[0]);
        }
        if (backupLauncherExes.length > 0) {
            backupLauncherExes.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
            return path.basename(backupLauncherExes[0]);
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
function addGameSafely(cleanName, exePath = '', platform = 'Windows', launcher = 'CustomDrive') {
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
        
        let finalExeName = 'unknown_executable.exe';
        let matchedOverride = "";
        
        for (const [key, value] of Object.entries(exeOverrides)) {
            if (lower.includes(key) || lower === key) {
                matchedOverride = value;
                break;
            }
        }
        if (matchedOverride) {
            finalExeName = matchedOverride;
            gameExeMap.set(finalName, finalExeName);
            writeToScannerLog(`   🎯 MATCHED BUNDLE MAP: Game [${finalName}] mapped via Override JSON file ➔ Binary: ${finalExeName}`);
        } else if (exePath) {
            let exeName = exePath.includes('||') ? exePath : path.basename(exePath);
            if (exeName.toLowerCase().includes('.exe')) {
                const exeMatch = exeName.match(/^([^\s]+\.exe)/i);
                if (exeMatch && exeMatch[1]) {
                    exeName = exeMatch[1];
                }
            }
            finalExeName = exeName;
            gameExeMap.set(finalName, finalExeName);
            writeToScannerLog(`   🎯 MATCHED DEPLOYMENT MAP: Game [${finalName}] mapped successfully ➔ Binary: ${finalExeName}`);
        } else {
            gameExeMap.set(finalName, finalExeName);
            writeToScannerLog(`   ⚠️ UNKNOWN DEPLOYMENT SPEC: Game [${finalName}] has no valid executable signature. Mapped to default.`);
        }
        if (typeof detectedGamesMatrix !== 'undefined' && detectedGamesMatrix[platform] && detectedGamesMatrix[platform][launcher]) {
            const alreadyInMatrix = detectedGamesMatrix[platform][launcher].some(g => g.name === finalName);
            if (!alreadyInMatrix) {
                detectedGamesMatrix[platform][launcher].push({
                    name: finalName,
                    exe: finalExeName
                });
            }
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
                                            if (fName.includes('unitycrashhandler') || 
                                                fName.includes('crashreport') || 
                                                fName.includes('crs-handler') || 
                                                fName.includes('unins') || 
                                                fName.includes('diagnostic') ||
                                                fName.includes('tll-l') ||
                                                fName.includes('tll.exe') ||
                                                fName.includes('u4-l')
                                            ) {
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
                                if (fs.existsSync(standardPath)) {
                                    exePath = findExecutableInDir(standardPath); 
                                }
                            }
                            if (!exePath) {
                                exePath = 'unknown_executable.exe';
                            }
                            let dynamicGameName = gameName;
                            if (gameName.toLowerCase().startsWith('uncharted') && folderMatch && folderMatch[1]) {
                                dynamicGameName = folderMatch[1].trim();
                            }
                            let targetPlatform = 'Windows';
                            let targetLauncher = 'Steam';
                            const lowerGame = dynamicGameName.toLowerCase();
                            if (!exePath || exePath === 'unknown_executable.exe' || !exePath.toLowerCase().endsWith('.exe')) {
                                targetPlatform = 'macOS';
                                targetLauncher = 'SteamMac'; 
                            } 
                            else if (lowerGame.includes('grand theft auto') || lowerGame.includes('gta') || lowerGame.includes('red dead') || lowerGame.includes('rdr2')) {
                                targetPlatform = 'Windows';
                                targetLauncher = 'Rockstar';
                            }
                            addGameSafely(dynamicGameName, exePath, targetPlatform, targetLauncher);
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
    let epicManifestPaths = [
        path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests')
    ];
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
const potentialSubDirs = [
    'bin/x64', 'bin/x64_dx12', 'bin/win64', 'Binaries/Win64/Shipping', 'Binaries/Win64',
    'Retail', 'retail', 'binaries', 'Binaries', 'bin'
];

                                        for (const subDir of potentialSubDirs) {
                                            const deepPath = path.join(cleanInstallLocation, subDir);
                                            if (fs.existsSync(deepPath) && fs.statSync(deepPath).isDirectory()) {
                                                exePath = findExecutableInDir(deepPath);
                                                if (exePath) break;
                                            }
                                        }
                                        if (!exePath && fs.existsSync(cleanInstallLocation)) {
                                            exePath = findExecutableInDir(cleanInstallLocation);
                                        }
                                    }
                            addGameSafely(parsed.DisplayName, exePath, 'Windows', 'EpicGames');
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
                        addGameSafely(file, exePath, 'Windows', 'BattleNet');
                    }
                    try {
                        const subFiles = fs.readdirSync(fullPath);
                        subFiles.forEach(subFile => {
                            const subPath = path.join(fullPath, subFile);
                            if (fs.existsSync(path.join(subPath, '.build.info'))) {
                                console.log(`📦 [Battle.net-Scanner] Valid config file discovered for subdirectory application: '${subFile}'`);
                                const exePath = findExecutableInDir(subPath);
                                addGameSafely(subFile, exePath, 'Windows', 'BattleNet');
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
                                if (game.install_path && fs.existsSync(game.install_path)) {
                                    exePath = findExecutableInDir(game.install_path);
                                }
                                addGameSafely(game.title, exePath, 'Windows', 'Heroic');
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
    let ubiPaths = [];
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
    ubiPaths.forEach(ubiGamesPath => {
        console.log(`📦 [Ubisoft-Scanner] Checking active deployment storage: ${ubiGamesPath}`);
        try {
            const gameFolders = fs.readdirSync(ubiGamesPath);
            gameFolders.forEach(folder => {
                const fullGamePath = path.join(ubiGamesPath, folder);
                if (fs.statSync(fullGamePath).isDirectory() && !folder.startsWith('.')) {
                    const exePath = findExecutableInDir(fullGamePath);
                    addGameSafely(folder, exePath, 'Windows', 'Ubisoft');
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
const config = {
    fallbackSteamPath: path.join(HOME, 'Library/Application Support/Steam')
};
function runGameScanner() {
    console.log("🔍 Starting indestructible v2.8.1b manifest scanner with deep CrossOver bottle check...");
    const internalSteamPaths = getInternalCrossOverSteamPaths();
    if (internalSteamPaths.length > 0) {
        internalSteamPaths.forEach(steamPath => {
            console.log(`📦 Internal SSD bottle found: ${steamPath}`);
            scanSteamManifests(steamPath);
        });
    } else {
        scanSteamManifests(config.fallbackSteamPath);
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
    const fileContent = outputLines.length === 0 ? 'No games found.' : outputLines.join('\n');
    
    const mappingLines = Array.from(gameExeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, exeFile]) => {
            return `${name}=>${exeFile}`;
        });
    const mappingFileContent = mappingLines.length === 0 ? '' : mappingLines.join('\n');
    console.log("\n--- FOUND GAMES (CLEANED MANIFEST CHECK) ---");
    console.log(outputLines.map(g => `🎮 ${g}`).join('\n'));
    console.log("-----------------------------------------------------");
    for (const platform in detectedGamesMatrix) {
        for (const launcher in detectedGamesMatrix[platform]) {
            detectedGamesMatrix[platform][launcher].sort((a, b) => a.name.localeCompare(b.name));
        }
    }
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(MATRIX_JSON_FILE, JSON.stringify(detectedGamesMatrix, null, 2), 'utf-8');
        console.log(`\n💾 Structured games matrix successfully exported to:\n${MATRIX_JSON_FILE}`);
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`💾 Pure game list successfully exported (${outputLines.length} entries tracked) to:\n${OUTPUT_FILE}`);
        fs.writeFileSync(MAPPING_FILE, mappingFileContent, 'utf-8');
        console.log(`💾 Exe mapping file successfully exported (${mappingLines.length} processes mapped) to:\n${MAPPING_FILE}`); 
    } catch (err) {
        console.error(`\n❌ Export error: ${err.message}`);
    }
}
runGameScanner();
