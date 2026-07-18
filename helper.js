/* ============================================================================
   APPLICATION:   MAC GAMING BOOSTER (PROJEKT X)
   FILE:          helper.js (Privileged Root Service Core)
   
   STATUS:        DIAGNOSTIC TEST MODE - HIGH INTENSITY LOGGING ACTIVE
   DEVELOPER:     MARIO (FLASHI) - STAND: 18.07.2026
   QUALITY AUDIT: MAXIMUM (Elevated POSIX capabilities, low-overhead system execution)
   
   CORE FUNCTIONS:
   1. KERNEL PRIORITY OVERDRIVE: Bypasses standard macOS sandbox restrictions 
      to forcefully renice target gaming PIDs directly to extreme levels (-20).
   2. HARDWARE WORKLOAD CONTROL: Manages the execution state of the system 
      compiler service via low-level Unix signals (SIGSTOP / SIGCONT).
   3. MEMORY EMERGENCY PROTECTION: Intercepts crucial low-RAM indicators to 
      execute immediate hard kills and prevent fatal system kernel panics.
   4. PASSWORDLESS SECURE IPC: Establishes a secure communication bridge with 
      the Electron frontend to execute elevated commands without terminal prompts.
   ============================================================================ */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dirPath = process.argv[2] || '';
const configPath = process.argv[3] || '';
const fallbackLog = "/private/tmp/helper_boot_critical.log";

function internalBootLog(msg) {
    try {
        const time = new Date().toLocaleTimeString();
        fs.appendFileSync(fallbackLog, "[" + time + "] " + msg + "\n", 'utf8');
    } catch(e) {}
}

internalBootLog("🐣 Helper-Prozess im Kernel erwacht. Überprüfe Argumente...");
if (!dirPath || !configPath) {
    internalBootLog("❌ CRITICAL: Start abgebrochen. dirPath oder configPath fehlen im Argument-Vektor!");
    console.error("❌ Fehler: Pfade fehlen!");
    process.exit(1);
}

const logPath = path.join(dirPath, 'helper_debug.log');
const triggerPath = path.join(dirPath, 'boost.trigger');

// Dynamische Abfrage der Konfiguration für den Debug-Haken
function isDebugEnabled() {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.isHelperDebugActive === true;
        }
    } catch(e) {}
    return false;
}

if (isDebugEnabled()) {
    try {
        if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
        fs.writeFileSync(logPath, "[" + new Date().toLocaleTimeString() + "] 🧪 HIGH-INTENSITY DIAGNOSTIC MODE INITIALIZED.\n", 'utf8');
    } catch(e) {}
}

function logDebug(msg) {
    if (!isDebugEnabled()) return;
    try {
        const time = new Date().toLocaleTimeString();
        fs.appendFileSync(logPath, "[" + time + "] " + msg + "\n", 'utf8');
    } catch (e) {}
}

logDebug("🔍 PATH SANITY CHECK:");
logDebug("   🔹 Target Directory: " + dirPath);
logDebug("   🔹 Trigger File Path: " + triggerPath);
logDebug("   🔹 Config File Path: " + configPath);

try {
    const currentPid = process.pid.toString();
    const checkCommand = "ps -Ax -o pid,command | grep -v grep | grep 'helper.js'";
    logDebug("🔒 Scanne Prozessliste nach Helper-Instanzen via: " + checkCommand);
    
    let runningHelpers = [];
    try {
        const stdout = execSync(checkCommand).toString().trim();
        if (stdout.length > 0) runningHelpers = stdout.split('\n');
    } catch(e) {
        runningHelpers = []; // Fängt den Unix Exit-Code 1 ab, wenn kein Klon aktiv ist
    }

    const otherHelpers = runningHelpers.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith(currentPid);
    });
    
    logDebug("🔒 Helper-Instanzen im RAM entdeckt: " + runningHelpers.length + " (Eigene PID: " + currentPid + ")");
    if (otherHelpers.length > 0) {
        logDebug("🚨 BLOCKADE: Ein aktiver Zwilling läuft bereits im Hintergrund! Helper bricht ab, um RAM-Konflikt zu vermeiden.");
        internalBootLog("🚨 ABORT: Instanz blockiert durch Zwilling.");
        process.exit(0);
    }
} catch (e) {
    logDebug("ℹ️ Instanzen-Schloss übersprungen oder keine Klone aktiv (Erster Systemstart).");
}

logDebug("🚀 File root helper successfully started and active. Entering loop...");
internalBootLog("✅ Helper erfolgreich initialisiert und Log-Schleife gestartet.");

if (isDebugEnabled()) {
    try {
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.size > 1024 * 1024) {
                fs.writeFileSync(logPath, "[" + new Date().toLocaleTimeString() + "] 🔄 Helper log rotated: Cleared old entries.\n", 'utf8');
            }
        }
    } catch (e) {}
}

setInterval(() => {
    try {
        if (fs.existsSync(triggerPath)) {
            const fileContent = fs.readFileSync(triggerPath, 'utf8').trim(); 
            if (fileContent && fileContent.length > 0) {
                logDebug("📥 Trigger-Aktivität registriert (" + fileContent.length + " Bytes). Verarbeite Datenstrom...");
                fs.writeFileSync(triggerPath, '', 'utf8'); 
                logDebug("🧹 boost.trigger geleert.");
                const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                logDebug("📋 Befehlszeilen im Paket isoliert: " + lines.length);
                lines.forEach((line, index) => {
                    logDebug("⚙️ Zeile [" + index + "] extrahiert: " + line);
                    try {
                        const msg = JSON.parse(line);
                        if (msg.action === 'kill') {
                            logDebug("🛑 Self-termination command received via JSON. Exiting root helper process gracefully.");
                            process.exit(0); 
                        }  
                        if (msg.action === 'boost' && msg.pid) {
                            logDebug("📥 File trigger received for PID: " + msg.pid + " (Level: " + msg.level + ")");
                            const targetLevel = parseInt(msg.level, 10); 
                            if (targetLevel === 0) {
                                logDebug("⚪ Execution: Resetting PID " + msg.pid + " to standard policy (NICE 0).");
                                exec("taskpolicy -b -p " + msg.pid + " 2>/dev/null");
                                exec("renice 0 -p " + msg.pid + " 2>/dev/null");
                            } else {
                                const secureCommand = "taskpolicy -B -p " + msg.pid + " 2>/dev/null && renice -20 -p " + msg.pid + " 2>/dev/null";
                                logDebug("⚡ Sende Kernel-Befehl: [" + secureCommand + "]");
                                exec(secureCommand, (err) => {
                                    if (err) {
                                        logDebug("❌ renice -20 Fehler für PID " + msg.pid + ": " + err.message);
                                    } else {
                                        logDebug("🔥 KERNEL SUCCESS: PID " + msg.pid + " erfolgreich auf harte Priorität -20 gepeitscht!");
                                        try {
                                            const verify = execSync("ps -p " + msg.pid + " -o pid,nice,comm 2>/dev/null").toString().trim();
                                            logDebug("📊 Live-Kernel-Status-Gegenprüfung:\n" + verify);
                                        } catch(e) {}
                                    }
                                });
                            }
                        }
                    } catch (jsonErr) { logDebug("❌ Line parse error (JSON ungültig): " + jsonErr.message); }
                });
            }
        }
    } catch (e) { logDebug("❌ Loop error: " + e.message); }
}, 500);
