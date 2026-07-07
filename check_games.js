const fs = require('fs');
const path = require('path');
const os = require('os');
const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, 'Library/Application Support/fps-boost/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'games_list.txt');
const MAPPING_FILE = path.join(CONFIG_DIR, 'games_exe_mapping.txt');
const detectedGames = new Set();
const lowercaseCheckSet = new Set();
const gameExeMap = new Map();
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
function getInternalCrossOverSteamPaths() {
    const crossoverBottlesDir = path.join(HOME, 'Library/Application Support/CrossOver/Bottles');
    let paths = [];
    
    if (fs.existsSync(crossoverBottlesDir)) {
        try {
            const bottles = fs.readdirSync(crossoverBottlesDir);
            bottles.forEach(bottle => {
                const steamAppsPath = path.join(crossoverBottlesDir, bottle, 'drive_c/Program Files (x86)/Steam/steamapps');
                if (fs.existsSync(steamAppsPath)) {
                    paths.push(steamAppsPath);
                }
            });
        } catch (e) {}
    }
    return paths;
}
function findExecutableInDir(dirPath, depth = 0) {
    if (depth > 8 || !fs.existsSync(dirPath)) return '';
    try {
        const files = fs.readdirSync(dirPath);
        let candidateExes = [];
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
                const isTrackmania = lowerFile.includes('ubisoftconnectinstaller');
                if (!isTrackmania) {
                    if (lowerFile.includes('unitycrashhandler')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: UnityCrashHandler)`); continue; }
                    if (lowerFile.includes('crashreport')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: CrashReport)`); continue; }
                    if (lowerFile.includes('crs-handler')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: crs-handler)`); continue; }
                    if (lowerFile.includes('unins')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: Deinstallations-Datei)`); continue; }
                    if (lowerFile.includes('setup')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: Setup-Muster)`); continue; }
                    if (lowerFile.includes('launcher')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: Launcher-Muster)`); continue; }
                    if (lowerFile.includes('diagnostic')) { if (dirPath.toLowerCase().includes('trackmania')) console.log(`    ❌ Verworfen: ${file} (Grund: Diagnose-Tool)`); continue; }
                }
                if (isTrackmania || (
                    !lowerFile.includes('unitycrashhandler') && 
                    !lowerFile.includes('crashreport') && 
                    !lowerFile.includes('crs-handler') && 
                    !lowerFile.includes('unins') && 
                    !lowerFile.includes('setup') &&
                    !lowerFile.includes('launcher') && 
                    !lowerFile.includes('diagnostic')
                )) {
                    if (dirPath.toLowerCase().includes('trackmania')) {
                        console.log(`    🟢 Akzeptiert als Kandidat: ${file}`);
                    }
                    candidateExes.push(fullPath);
                }
            }
            if (stat.isDirectory() && file.toLowerCase().endsWith('.app')) {
                macAppPath = fullPath;
            }
        }
        const lowerCandidates = candidateExes.map(p => path.basename(p).toLowerCase());
        if (lowerCandidates.includes('u4.exe') && lowerCandidates.includes('tll-l.exe')) {
            return "u4.exe||tll-l.exe"; 
        }
        if (candidateExes.length > 0) {
            candidateExes.sort((a, b) => {
                const nameA = path.basename(a).toLowerCase();
                const nameB = path.basename(b).toLowerCase();
                const isInstallerA = nameA.includes('installer') || nameA.includes('setup');
                const isInstallerB = nameB.includes('installer') || nameB.includes('setup');
                if (isInstallerA && !isInstallerB) return 1;
                if (!isInstallerA && isInstallerB) return -1;
                return fs.statSync(b).size - fs.statSync(a).size;
            });
            if (dirPath.toLowerCase().includes('trackmania')) {
                console.log(`  🏆 Gewinner-EXE für diesen Ordner: ${path.basename(candidateExes[0])}`);
            }
            return candidateExes[0]; 
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
        if (lower.includes('road to vostok') || lower === 'vostok') {
            gameExeMap.set(finalName, 'RTV.exe');
        } else if (exePath) {
            const exeName = exePath.includes('||') ? exePath : path.basename(exePath);
            gameExeMap.set(finalName, exeName);
        } else {
            if (lower.includes('grand theft auto') || lower.includes('gta')) {
                gameExeMap.set(finalName, 'PlayGTAV.exe');
            } else {
                gameExeMap.set(finalName, 'unknown_executable.exe');
            }
        }
    }
}
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
                                if (fs.existsSync(standardPath)) {
                                    exePath = findExecutableInDir(standardPath);
                                } 
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
                                    game.install_path;
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
function runGameScanner() {
    console.log("🔍 Starting indestructible v2.8.0 manifest scanner with deep CrossOver bottle check...");
    const internalSteamPaths = getInternalCrossOverSteamPaths();
    if (internalSteamPaths.length > 0) {
        internalSteamPaths.forEach(steamPath => {
            console.log(`📦 Internal SSD bottle found: ${steamPath}`);
            scanSteamManifests(steamPath);
        });
    } else {
        scanSteamManifests(path.join(HOME, 'Library/Application Support/Steam'));
    }
    getDynamicExternalVolumes().forEach(plate => scanSteamManifests(plate));
    scanEpicGamesManifests();
    scanBattleNetManifests();
    scanHeroicManifests();
    const outputLines = Array.from(detectedGames)
        .map(g => g.replace('🎮 ', '').trim())
        .sort();
    let fileContent = outputLines.length === 0 ? 'No games found.' : outputLines.join('\n');
    const mappingLines = Array.from(gameExeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, exeFile]) => `${name}=>${exeFile}`);
    let mappingFileContent = mappingLines.length === 0 ? '' : mappingLines.join('\n');
    console.log("\n--- FOUND GAMES (CLEANED MANIFEST CHECK) ---");
    console.log(outputLines.map(g => `🎮 ${g}`).join('\n'));
    console.log("-----------------------------------------------------");
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`\n💾 Pure game list successfully exported to:\n${OUTPUT_FILE}`);
        fs.writeFileSync(MAPPING_FILE, mappingFileContent, 'utf-8');
        console.log(`\n💾 Exe mapping file successfully exported to:\n${MAPPING_FILE}`);
    } catch (err) {
        console.error(`\n❌ Export error: ${err.message}`);
    }
}
runGameScanner();
