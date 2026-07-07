# 🚀 Mac Gaming Booster (v2.8.1)

> [!CAUTION]
> ### 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE FPS-WUNDER!)
> Diese App ist **KEIN** Overclocking-Tool. Sie optimiert die Systemressourcen für das Gaming, kann aber physische Hardwaregrenzen nicht überspringen. Sie sorgt dafür, dass 100 % der Leistung deines Macs direkt in dein Spiel fließen, um die stabilsten Frametimes zu erzielen!

## 🌟 Neuerungen in v2.8.1

### ⚙️ HUD-Optimierung: Booster Engine
Das Echtzeit-Überwachungs-HUD verfügt jetzt über die Statusanzeige **Booster Engine**. Sie misst die präzise Verarbeitungsgeschwindigkeit und Kommunikationslatenz zwischen der Booster-Ebene und dem macOS-Kernel.
* **Dynamisches Benchmarking:** Der Status wechselt je nach Millisekunden-Berechnung fließend zwischen `⚡️ OPTIMAL`, `⚡️ GOOD` und `⏳ HEAVY LOAD`.

### 🛡️ Adaptive Shader Guard (Anti-Panic Schutz)
Beim Laden schwerer Shader (z. B. in AAA-Titeln wie *007: First Light*) neigt der macOS-eigene `MTLCompilerService` zu extremen Speicherlecks, die den RAM auffressen und das System einfrieren lassen (Kernel Panic). Der **Adaptive Shader Guard** schützt das System in Echtzeit:
* **Deep Sleep Modus:** Wird der RAM knapp, schickt die App den Compiler kurz in den Tiefschlaf, evakuiert inaktive Caches und weckt ihn sicher wieder auf.
* **Notfall Hard-Kill:** Sinkt der freie RAM unter 100 MB, wird der Compiler radikal beendet, um eine Kernel Panic abzuwenden. macOS startet den Dienst sofort frisch und mit sauberem Speicher neu.
* **💥 DER ULTIMATIVE VERGLEICH:** Ohne den Booster lagert das System in den Swap aus und die Shader-Kompilierung dauert quälende **ca. 20 Minuten**. Mit aktivem Booster läuft der Prozess auf den Performance-Kernen und schließt in rekordverdächtigen **1:50 Minuten** ab – eine **10-fache Beschleunigung**!

---

## 🛠️ Behobene & Reparierte Fehler (v2.8.1 Fixes)

### 🔄 1. macOS Autostart-Integration (Anmeldeobjekte)
* **Behoben:** Die App startete nach dem Verpacken als finale Anwendung nicht mehr automatisch beim macOS-Systemstart.
* **Lösung:** Electrons native `app.setLoginItemSettings` repariert. Der zwingend erforderliche Parameter `path: app.getPath('exe')` wurde hinzugefügt, damit neuere macOS-Versionen (Ventura, Sonoma, Sequoia) den Autostart fertiger `.app`-Bundles nicht mehr blockieren.
* **Selbstheilender Pfad:** Wenn du die App im Finder verschiebst, bricht der Autostart vorübergehend ab. Sobald du die App am neuen Ort jedoch **ein einziges Mal manuell startest**, repariert sich der pfad in den macOS-Anwendungsobjekten vollautomatisch im Hintergrund.

### 🧹 2. Zuverlässiges Beenden des Root-Helpers (Variante 2)
* **Behoben:** Beim Schließen der App (z. B. via `Cmd + Q`) lief der mit Root-Rechten gestartete Hintergrunddienst (`helper.js`) unendlich weiter, da normale Benutzerrechte das Abschießen per `pkill` blockierten.
* **Lösung:** Wechsel vom unzuverlässigen `will-quit`-Event zum stabileren `before-quit`-Event. Durch den Einsatz von `fs.fsyncSync()` wird macOS nun gezwungen, die `boost.trigger`-Datei (`{"action":"kill"}`) physisch auf die SSD zu schreiben, bevor der Hauptprozess abgewürgt wird.

### 📂 3. Pfad-Harmonisierung & Event-Loop-Fix
* **Behoben:** Hauptprozess und Root-Helper suchten in unterschiedlichen Verzeichnissen nach der Trigger-Datei. Zudem blockierten aktive Zeitintervalle das saubere Herunterfahren.
* **Lösung:** Alle Kommunikationspfade einheitlich auf den Unterordner `/config/boost.trigger` synchronisiert. Zudem wurde ein Fehler behoben, bei dem das aktive `vm_stat`-RAM-Überwachungsintervall das Herunterfahren von Electron künstlich blockierte, indem es nun sauber per ID registriert und beim Beenden via `clearInterval()` gestoppt wird.

### 🎯 4. Speichern der HUD-Fensterposition
* **Behoben:** Das HUD verlor nach einem App-Neustart seine Position und sprang trotz korrekter Speicherung in der JSON-Datei immer zurück in die Ecke.
* **Lösung:** Die Erstellung des `BrowserWindow` in `toggleRamOverlay()` wurde dynamisiert. Die fest codierten Startwerte wurden durch deine aus der Konfiguration geladenen Variablen `overlayX` und `overlayY` ersetzt.

### 🛡️ 5. Log-Überlastungsschutz
* **Behoben:** Wenn die App über Wochen hinweg ohne Mac-Neustart lief, wuchsen die Log-Dateien durch das sekündliche Abfragen unaufhaltsam an.
* **Lösung:** Sowohl die Haupt-App als auch der Root-Helper besitzen nun eine automatiche **1-MB-Sicherheitsbremse** (Log-Rotation), die das unendliche Wachstum der Log-Dateien bei wochenlangem Dauerbetrieb verhindert.

### ⚡️ 6. Upgrade der Kernel-Priorität (MAX-Boost)
* **Behoben:** In der alten Version wurde nur eine moderate Prioritätserhöhung (`renice -5`) genutzt, wodurch macOS den Spielprozess bei extremen Lastspitzen trotzdem drosseln konnte.
* **Lösung:** Die Backend-Engine des Root-Helpers wurde auf das absolute UNIX-Maximum aufgerüstet. Die App setzt nun die ultimative Optimierungskette ab: `taskpolicy -B -p [PID] && renice -20 -p [PID]` [2:55:00 AM]. Dies zwingt macOS, das Spiel ohne jegliche Hintergrund-Interferenzen komplett auf den Performance-Kernen zu verriegeln.


## 📜 License

MIT License. See LICENSE file for details.