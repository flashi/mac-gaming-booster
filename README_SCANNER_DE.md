# 🎮 Mac Gaming Platform Scanner (`check_games.js`)

**Version:** 2.7.1 (Manifest Edition mit EXE-Mapping) | **Plattform:** macOS (Apple Silicon & Intel) | **Ziel:** Terminal / Standalone Skript  

---

## 💡 Features
- **Saubere Ausgabe ohne Pfade:** Versteckt rohe Installationspfade und Plattform-Tags komplett. Exportiert Spieletitel direkt als saubere Liste, die ausschließlich mit einem `🎮 Spielname` Präfix formatiert ist.
- **Natives Launcher-Manifest-Parsing:** Ersetzt langsame Ordner-Tiefenscans durch blitzschnelles, präzises Parsen von Metadaten direkt aus den offiziellen Launcher-Backends:
  - **Steam:** Liest `.acf` Appmanifest-Dateien aus lokalen Bibliotheken und allen angeschlossenen externen Festplatten (nutzt jetzt `installdir` für fehlerfreie Pfad-Auflösung).
  - **Epic Games Store:** Parst offizielle `.item` Installations-Manifeste.
  - **Battle.net:** Erkennt aktive Blizzard-Titel über wissenschaftliche `.build.info` Dateien.
  - **Heroic Games Launcher:** Extrahiert verifizierte Installationen automatisch aus dem JSON-Store-Cache von Heroic.
- **Intelligente Prozess- & EXE-Zuordnung:** Sucht bei jedem gefundenen Spiel automatisch im Installationsverzeichnis nach der passenden ausführbaren Datei (Windows `.exe` oder native Unix/Mac-Binärdatei).
- **Multi-Exe- & Sonderzeichen-Support:** Erkennt Sammlungen mit mehreren ausführbaren Dateien (wie *Uncharted* via `u4.exe||tll-l.exe`) und ist komplett fehlertolerant gegen Codierungsfehler oder Sonderzeichen im Pfad (wie `™` bei *The Last of Us*).
- **Dynamische Laufwerkserkennung:** Erkennt automatisch alle aktiven, unter `/Volumes` gemounteten externen Speichergeräte, wodurch das manuelle Festlegen von Pfaden entfällt.
- **Smartes System-Filtering & Blacklist:** Nutzt eine integrierte Blacklist, um reine Storefronts, Framework-Utilities, Bonus-Soundtracks, Artbooks und Entwicklungs-SDKs zu unterdrücken.
- **Automatischer GUI-Sync:** Exportiert die bereinigte, sortierte Liste atomar direkt in deinen Anwendungs-Konfigurationsordner. Es werden zeitgleich zwei Dateien für die Haupt-App erzeugt:
  - `games_list.txt` (Reine Namensliste für die GUI-Anzeige)
  - `games_exe_mapping.txt` (Prozess-Zuordnung für die Kernel-Boost-Schleife)

---

## 🚀 Ausführung

1. Öffne dein macOS Terminal.
2. Navigiere in deinen Projektordner:
   ```bash
   cd ~/Pfad/zu/deinem/mac-gaming-booster
   ```
3. Starte den Scanner mit Node.js:
   ```bash
   node check_games.js
   ```
