# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.7.1 (Platin GUI Edition) | **Plattform:** macOS (arm64) | **Ziel-Betriebssystem:** macOS 15+  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Diese App ist **KEIN** Overclocking-Tool. Sie optimiert die Systemressourcen für Spiele, kann aber Hardwaregrenzen nicht überspringen.

### 💡 Was macht die App eigentlich?
Optimiert CPU, Thread-Priorität und RAM auf Apple Silicon:
- **Zero-Dependency:** Läuft eigenständig über die interne Electron-Binary.
- **Mikro-Ruckler-Reduzierung:** Setzt Spielprozesse auf hohe Priorität (`Nice -5`).
- **Intelligente Engine-Priorisierung:** Fokussiert sich auf die Haupt-Binaries des Spiels, während Launcher im Hintergrund gehalten werden.
- **Automatischer RAM-Cleanup:** Löst beim Beenden `sudo purge` für freigegebenen Speicher aus.

---

## ⚙️ Features (v2.7.1)

- **Standalone-Architektur:** Kein externes Node.js erforderlich.
- **Native Failsafe-Engine:** `sudo-prompt` wurde für eine sichere Rechteerhöhung durch `osascript` ersetzt.
- **Aggressiver Kernel-Boost:** `renice -5` für verifizierte Hauptspiele, `-1` für emulationsrelevante Wine-Hintergrundprozesse.
- **Single-Auth-Sicherheit:** Nur eine Passworteingabe pro Kaltstart des Macs erforderlich.
- **Aktualisierte Spielerkennung:** Präzises Parsing für AAA-Titel (Helldivers 2, TLOU, etc.).
- **Verfeinerte Daemon-Steuerung:** Optionen für Hintergrund-Persistenz oder Auto-Kill.
- **Live-RAM-HUD:** Nicht-fokussierbares Overlay mit aktuellen Speicherstatistiken.
- **Adaptiver Watchdog:** Verhindert Speicherlecks durch Steuerung von `MTLCompilerService` und `purge`.
- **Integrierter Plattform-Scanner:** Eigenständiges Test-Skript `check_games2.js` zur Tiefensuche von Spielinstallationen auf internen/externen Festplatten (`/Volumes`) mitsamt automatischem EXE-Mapping.

---

## 🔄 Letzte Änderungen & Optimierungen (v2.7.1)

Im Zuge der Weiterentwicklung zur **Platin GUI Edition (v2.7.1)** wurden kritische Kernkomponenten der Engine stabilisiert, absolut neustartsicher gemacht und tiefer in die GUI integriert:

### 1. Neustartsichere Trigger-Architektur (`main.js` & `helper.js`)
* **Problem gelöst:** Bisher hat der privilegierte Root-Helper die Datei `boost.trigger` nach dem Auslesen via `fs.unlinkSync()` komplett gelöscht. Dies führte nach einem macOS-Neustart zu Berechtigungskonflikten, wodurch die im User-Space laufende Haupt-App keine neuen Triggersignale mehr absetzen konnte (Spiele verblieben dauerhaft auf Standard-Priorität `Mid / 0`).
* **Optimierung:** Der Löschbefehl wurde entfernt. Der Root-Helper leert die Datei nach der Verarbeitung nun atomar mittels `fs.writeFileSync(triggerPath, '', 'utf8')`. Die Datei bleibt physisch mit den korrekten Schreibrechten bestehen. Die Engine fängt Spiele nach einem System-Reboot innerhalb von 2 Sekunden ab und zwingt sie vollautomatisch zurück in den Kernel-Boost-Modus (`Max / -5`).

### 2. Korrektur der Pfad-Struktur für `sendToRootHelper`
* Die Funktion zur Kommunikation mit dem Hintergrund-Dienst wurde vollständig an die neue, saubere Ordnerstruktur angepasst. 
* Signale werden nun exakt im zentralen Verzeichnis `~/Library/Application Support/fps-boost/config/boost.trigger` hinterlegt.
* Alle PIDs und Leistungswerte werden vor der Übergabe strikt als Ganzzahlen (`parseInt`) validiert, um Syntaxfehler innerhalb der POSIX-Shell zu verhindern.

### 3. GUI-Anbindung & Dynamische Mapping-Engine (`games_exe_mapping.txt`)
* **Neu in den Settings:** Die Einlese-Schnittstelle für die externe `games_list.txt` wurde erfolgreich direkt in das Einstellungsfenster (Settings-GUI) ausgelagert und integriert.
* **100% Dynamische Erkennung:** Die tiefe Zwei-Wege-Namensübersetzung und Filter-Heuristik für komplexe Prozesstitel (wie Sonys `crs-handler.exe` bei *The Last of Us* oder Multi-Exes wie `u4.exe||tll-l.exe` bei *Uncharted*) wurde vollständig finalisiert. Die App arbeitet nun komplett ohne hardcodierte Spieletitel im Quellcode und liest alle Prozess-Zuweisungen dynamisch aus der `games_exe_mapping.txt`.

---

## 📜 Lizenz

MIT-Lizenz. Siehe LICENSE-Datei für Details.
