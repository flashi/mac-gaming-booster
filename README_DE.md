# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.7.0 | **Plattform:** macOS (arm64) | **Ziel-System:** macOS 15+  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Diese App ist **KEIN** Overclocking-Tool. Sie optimiert die Systemressourcen für Spiele, kann aber Hardware-Limits nicht aufheben.

### 💡 Was macht die App wirklich?
Optimiert CPU, Thread-Priorität und RAM auf Apple Silicon:
- **Zero-Dependency:** Läuft komplett eigenständig über die interne Electron-Binary.
- **Mikroruckler-Reduzierung:** Setzt Spielprozesse auf höchste Priorität (`Nice -5`).
- **Smarte Engine-Priorisierung:** Fokussiert sich auf Hauptspiel-Binaries, während Launcher im Hintergrund gedrosselt werden.
- **Auto-RAM-Bereinigung:** Stößt beim Beenden `sudo purge` an, um blockierten Speicher freizugeben.

---

## 🛠️ Features (v2.7.0)

- **Standalone-Architektur:** Kein externes Node.js für Endnutzer erforderlich.
- **Native Failsafe Engine:** `sudo-prompt` komplett durch `osascript` für sichere Rechteerhöhung ersetzt.
- **Aggressiver Kernel-Boost:** `renice -5` für Spiele, `-1` für Hilfsdienste.
- **Einmalige Authentifizierung:** Nur eine Passwortabfrage pro Mac-Kaltstart nötig.
- **Aktualisierte Spielerkennung:** Präzise Analyse für AAA-Titel (Helldivers 2, TLOU etc.).
- **Verfeinerte Daemon-Steuerung:** Optionen für Hintergrund-Persistenz oder automatischen Prozess-Kill.
- **Live RAM HUD:** Rahmenloses, passives In-Game-Overlay mit Speicherstatistiken.
- **Adaptiver Watchdog:** Verhindert Systemabstürze durch intelligentes Management des `MTLCompilerService` und RAM-Purges.

---

## 📜 Lizenz

MIT-Lizenz. Vollständiger Text befindet sich in der LICENSE-Datei.
