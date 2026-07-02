# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.8.0 (Platin GUI Edition) | **Plattform:** macOS (arm64) | **Ziel-Betriebssystem:** macOS 15+  
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

## 📢 COMMUNITY & FEEDBACK (WIR BRAUCHEN DEINE BENCHMARKS!)

Wir wollen Mac-Gaming so flüssig wie möglich machen! Bitte teile deine praktischen Erfahrungen, Performance-Änderungen und Hardware-Spezifikationen direkt auf unserem Board:

👉 **[Hier geht es zur offiziellen Feedback- & Benchmark-Diskussion!](https://github.com/flashi/mac-gaming-booster/discussions/2)**

*Hinweis:* Du kannst deine Benchmark-Protokolle, FPS-Verbesserungen oder Feature-Vorschläge super gerne auf **Deutsch** oder **Englisch** einreichen! 💬

---

## ⚙️ Features (v2.8.0)

- **Standalone-Architektur:** Kein externes Node.js erforderlich.
- **Native Failsafe-Engine:** `sudo-prompt` wurde für eine sichere Rechteerhöhung durch `osascript` ersetzt.
- **Aggressiver Kernel-Boost:** `renice -5` für verifizierte Hauptspiele, `-1` für emulationsrelevante Wine-Hintergrundprozesse.
- **Single-Auth-Sicherheit:** Nur eine Passworteingabe pro Kaltstart des Macs erforderlich.
- **Aktualisierte Spielerkennung:** Präzises Parsing für AAA-Titel (Stalker 2, Cyberpunk 2077, Helldivers 2, TLOU, etc.).
- **Verfeinerte Daemon-Steuerung:** Optionen für Hintergrund-Persistenz oder Auto-Kill.
- **Live-RAM-HUD:** Nicht-fokussierbares Overlay mit aktuellen Speicherstatistiken.
- **Adaptiver Watchdog:** Verhindert Speicherlecks durch Steuerung von `MTLCompilerService` und `purge`.
- **Integrierter Plattform-Scanner:** Eigenständiges Test-Skript `check_games.js` zur Tiefensuche von Spielinstallationen auf internen/externen Festplatten (`/Volumes`) mitsamt automatischem EXE-Mapping.

---

## ⚠️ ⚡️ NEU: REVOLUTIONÄRES LIVE-SWITCHING (KEIN NEUSTART MEHR!)

* **Echtzeit-Synchronisation:** Du musst die App nach einer Einstellungsänderung **nicht mehr neu starten!** 
* **Fliegender Wechsel:** Wenn du den FPS-Boost in der GUI deaktivierst, merkt die Hintergrund-Engine das binnen 2 Sekunden vollautomatisch, löscht das Schleifen-Gedächtnis im RAM und zwingt das laufende Spiel im Kernel fliegend zurück auf den Standardwert (`Nice 0`).
* **Spam-Schutz-Garantie:** Dank intelligenter Suffix-Sperren (`_reset`) wird das Signal im Deaktivierungsmodus exakt ein einziges Mal an den Kernel gefeuert. Dein Logbuch und deine SSD bleiben absolut frei von Datenmüll!

---

## 🔄 Letzte Änderungen & Optimierungen (v2.8.0)

Im Zuge der Weiterentwicklung zur **Platin GUI Edition (v2.8.0)** wurden kritische Kernkomponenten der Engine stabilisiert, absolut neustartsicher gemacht und tiefgehend optimiert:

### 1. 100% Leerzeichensichere Pfad-Extraktion
* **Problem gelöst:** Bisher schnitt `.split(' ')` Pfade bei Leerzeichen ab, was bei Spielen in Ordnern wie `Cyberpunk 2077` zu Erkennungsfehlern führte.
* **Optimierung:** Die Engine nutzt nun `path.basename` direkt auf dem vollen POSIX-Pfad. CrossOver-Hintergrunddienste werden durch die korrekte `lowerPath`-Deklaration bei Regex-Tiefenprüfungen fehlerfrei verarbeitet und stürzen nicht ab.

### 2. Clean-RAM Speicherfilterung (`games_exe_mapping.txt`)
* Ein neuer `.filter(line => line.length > 0)`-Schutz sortiert leere Zeilen oder fehlerhafte Zeilenumbrüche in deiner Mapping-Datei im Arbeitsspeicher aus, noch *bevor* die ressourcenintensive Verarbeitung startet. Das verhindert Abstürze und RAM-Überlastungen im Kaltstart.

### 3. Integrierter Crash-Radar für Settings
* Die stummen Catch-Blöcke bei `loadSettings()` und `saveSettings()` wurden geschlossen. Schreib- oder Leseblockaden durch macOS-Rechteeinschränkungen (z.B. `permission denied`) werden nun mitsamt originaler Systemmeldung sofort lesbar ins Logbuch diktiert.

---

## 📜 Lizenz

MIT-Lizenz. Siehe LICENSE-Datei für Details.
