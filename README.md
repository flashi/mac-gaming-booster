# 🚀 Mac Gaming Booster v2.8.2 (Project X)
**Headless Core Balancer & Low-Level Process Priority Injector for macOS & CrossOver**

Developed by **Mario (flashi)**. Stand: 24.07.2026.

---

## 🇩🇪 DEUTSCH

### 📜 Was ist neu in v2.8.2 (Release Candidate)
*   **👑 Dynamische Launcher-Matrix (0% Hardcode):** Alle erkannten Spiele werden im Dashboard vollautomatisch nach Betriebssystem und Launcher sortiert (macOS Native, Steam Mac, CrossOver Steam, Epic Games, Heroic, Ubisoft, Rockstar, Battle.net). Leere Launcher-Kategorien werden automatisch ausgeblendet.
*   **🤠 Rockstar- & Battle.net-Radar:** Vollautomatische Tiefenerkennung für Blizzard- und Rockstar-Titel (z. B. *Diablo IV*, *GTA V*, *RDR2*) inklusive automatischer Einsortierung in die passenden Dashboard-Fächer.
*   **🍏 macOS vs. Windows Weiche:** Der Steam-Scanner erkennt native Mac-Spiele (ohne `.exe` wie *Tomb Raider* oder *Cyberpunk 2077*) vollautomatisch und trennt sie sauber von emulierten Windows-Flaschen.
*   **🔒 Automatisierte Ad-hoc Signierung:** Das Build-System fügt beim Kompilieren vollautomatisch eine lokale Signatur hinzu und entfernt Quarantäne-Flags, um macOS-Blockaden zu verhindern.
*   **🛡️ Case-Insensitive Pfad-Auflösung:** Behebt Fehler bei unvollständigen Epic-Manifesten oder abweichender Groß-/Kleinschreibung auf externen SSDs.

---

### ⚠️ WICHTIGER HINWEIS ZUR „MALWARE“-WARNUNG (FALSE POSITIVE)
**Der Code dieses Boosters ist zu 100 % sauber, quelloffen und frei von Schadsoftware!** 
Da das Tool mit Root-Rechten direkt in den Kernel eingreift, um Spiele-Prozessen die höchste CPU-Priorität (`Nice -20`) auf den Performance-Cores zuzuweisen, schlägt Apples integrierter Virenscanner (XProtect) falschen Alarm. Für Apple sieht ein Tool, das so tief die CPU steuert, aus wie ein Krypto-Miner. Da dies ein freies Community-Projekt ist und wir keine 99 $/Jahr an Apple für ein Zertifikat zahlen, stuft macOS die App automatisch als "Malware" ein.

**Die kinderleichte Lösung:** Baue dir die App einfach in 2 Minuten selbst (Anleitung unten)! Dadurch wird sie als lokale, absolut sichere Eigenkreation auf deinem Mac Studio zertifiziert und Apple bleibt komplett machtlos.

---

### 🛠️ Kinderleichte Bau-Anleitung (Dauer: 2 Minuten)
1. Lade das Repository als ZIP herunter und entpacke es.
2. Öffne das **Terminal** und springe in den Projektordner:
   ```bash
   cd "/Pfad/zu/deinem/entpackten/Ordner"
   ```
3. Installiere die Werkzeuge (nur beim ersten Mal nötig):
   ```bash
   npm install
   ```
4. Erstelle und signiere deine blockierungsfreie `.app`:
   ```bash
   npm run package-mac
   ```
   *Deine fertige App liegt danach im Ordner `dist/`. Einfach in deinen Programme-Ordner ziehen und per Doppelklick starten!*

---

### 💬 FORUM-SUPPORT & FEEDBACK-REGELN
**Wir brauchen deine Hilfe, um den Booster noch besser zu machen! Bitte teile deine Erfahrungen (Positiv & Negativ) im Forum:**
*   Welche Spiele laufen flüssiger? Wo merkst du den FPS-Schub?
*   Gibt es Probleme oder wird ein Spiel nicht erkannt?

**🚨 ABSOLUTE LOG-PFLICHT BEI PROBLEMEN:**
Ohne deine Logdateien können wir unmöglich wissen, was im Getriebe schiefgelaufen ist! Wenn ein Spiel nicht auftaucht oder Fehler entstehen, poste bitte **IMMER** deine Logs aus folgendem Verzeichnis im Forum:
`~/Library/Application Support/fps-boost/config/`
*(Besonders wichtig: `helper_debug.log` und `games_matrix.json`)*

---
---

## 🇺🇸 ENGLISH

### 📜 What's New in v2.8.2 (Release Candidate)
*   **👑 Dynamic Launcher Matrix (0% Hardcode):** All detected games are automatically sorted in the dashboard by OS and launcher (macOS Native, Steam Mac, CrossOver Steam, Epic Games, Heroic, Ubisoft, Rockstar, Battle.net). Empty categories are hidden automatically.
*   **🤠 Rockstar & Battle.net Radar:** Advanced auto-detection for Blizzard and Rockstar titles (e.g., *Diablo IV*, *GTA V*, *RDR2*) with automated sorting into dedicated dashboard categories.
*   **🍏 macOS vs. Windows Split:** The Steam scanner automatically identifies native Mac games (without an `.exe` extension, like *Tomb Raider* or *Cyberpunk 2077*) and isolates them from emulated Windows bottles.
*   **🔒 Automated Ad-hoc Codesigning:** The build system automatically applies a local signature and strips quarantine flags during compilation to bypass macOS security lockouts.
*   **🛡️ Case-Insensitive Path Resolution:** Fixes edge-case bugs triggered by incomplete Epic manifests or folder casing mismatches on mounted external SSD nodes.

---

### ⚠️ IMPORTANT NOTE REGARDING "MALWARE" WARNINGS (FALSE POSITIVE)
**The code of this booster is 100% clean, open-source, and free of any malicious software!**
Because this tool hooks directly into the kernel using root privileges to force game processes into the highest execution tier (`Nice -20`) on your Performance Cores, Apple's built-in scanner (XProtect) triggers a false positive. To macOS, low-level CPU priority manipulation looks like a crypto-miner. Since this is a free community project and we do not pay Apple \$99/year for a developer certificate, macOS automatically flags the compiled binary as "Malware".

**The simple solution:** Just build the app yourself in under 2 minutes (see instructions below)! This certifies the binary locally on your Mac Studio as a trusted self-made application, completely bypassing Apple's restrictions.

---

### 🛠️ Easy 2-Minute Build Instructions
1. Download this repository as a ZIP file and extract it.
2. Open your **Terminal** and navigate into the project directory:
   ```bash
   cd "/path/to/your/extracted/folder"
   ```
3. Install the dependencies (only required once):
   ```bash
   npm install
   ```
4. Build & automatically codesign your unrestricted `.app`:
   ```bash
   npm run package-mac
   ```
   *Your fresh application will be generated inside the `dist/` directory. Simply move it to your Applications folder and launch it!*

---

### 💬 FORUM SUPPORT & FEEDBACK RULES
**We need your gameplay reports to perfect the engine! Please share your feedback (Positive & Negative) in the community forum:**
*   Which titles show the biggest FPS boosts? Where does the core balancing feel smoothest?
*   Did you encounter any bugs or missing game titles?

**🚨 LOG FILES ARE MANDATORY FOR SUPPORT:**
Without your background log files, it is impossible for us to diagnose what went wrong under the hood! If you experience bugs or games are missing, you **MUST ALWAYS** attach your log stream files from this directory to your forum post:
`~/Library/Application Support/fps-boost/config/`
*(Crucial files: `helper_debug.log` and `games_matrix.json`)*
