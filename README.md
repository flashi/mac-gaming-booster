# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.8.1 (Platinum GUI Edition) | **Platform:** macOS (arm64) | **Target OS:** macOS 15+  
**Environment:** Electron Framework / Native Menu Bar Application  

---

## 🛑 IMPORTANT: REALISTIC EXPECTATIONS (⚠️ NO MIRACLE FPS!) / WICHTIG: REALISTISCHE ERWARTUNGEN

### 🇬🇧 English
This app is **NOT** an overclocking tool. It optimizes system resources for gaming but cannot bypass physical hardware limits. It modifies software execution order at the kernel scheduler layer. Your hardware remains completely within factory-defined thermal and electric safe bounds (**0% Silicon Degradation**).

### 🇩🇪 Deutsch
Diese App ist **KEIN** Übertaktungswerkzeug. Sie optimiert Systemressourcen fürs Gaming, kann aber physikalische Hardwaregrenzen nicht aushebeln. Sie verändert lediglich die CPU-Thread-Reihenfolge auf Kernel-Ebene. Deine Hardware bleibt zu 100 % innerhalb der werkseitigen thermischen und elektrischen Sicherheitsgrenzen (**0 % Silizium-Verschleiß**).

---

## 📢 COMMUNITY & FEEDBACK (WE NEED YOUR BENCHMARKS!)

We want to make Mac gaming as smooth as possible! Please share your real-world experience, performance changes, and hardware specs directly on our dashboard:

👉 **[Join the Official Feedback & Benchmark Discussion here!](https://github.com)**

*Note:* You are welcome to submit your benchmark logs, frame-rate improvements, or feature suggestions in either **English** or **German**! 💬

---

## 📖 ENGLISH VERSION

### 🛠️ Core Features Explained: What the App Does

#### Real-Time Kernel Renicing & Core Allocation (`nice -20`)
When a game launcher initializes an executable, the macOS Darwin kernel assigns it a standard background priority ring. This application intercepts the process ID (PID) at the moment of creation, applies a combined kernel switch (`taskpolicy -B`) to force execution threads onto Apple Silicon Performance Cores (P-Cores), and pushes its scheduling priority to **`nice -20`** (maximum UNIX execution priority). This guarantees significantly smoother frame pacing, eliminates micro-stutters, and maximizes FPS under CPU-bound scenarios.

#### Adaptive Watchdog & RAM Guard (Anti-Panic Protection)
Games compiling shaders rapidly (especially during initial loads under Wine/CrossOver) force the native Apple shader compiler (`MTLCompilerService`) to bloat the Unified Memory. If the RAM drops below a critical threshold, macOS can experience a catastrophic kernel panic (hard system freeze). The booster features an aggressive, 2-stage defensive line:
* **Stage 1 (Soft Evacuation):** Automatically flushes inactive system caches and disk allocations to maintain memory thresholds.
* **Stage 2 (Deep Sleep & Emergency Protection):** If free memory falls below 100MB, it temporarily forces the `MTLCompilerService` into a deep freeze or executes a clean hard termination. This purges dead shader data, reclaims gigabytes of Unified Memory instantly, and lets the system recover safely without freezing your Mac.

#### Dynamic Executable Status Radar
An integrated visual status monitor inside the sandboxed settings window:
* **🟢 Platin-Green (`🔒 READY` / `🔄 CHANGE`):** Healthy games (and native arm64 macOS apps like *Cyberpunk 2077*, *Mafia III*, or *Tomb Raider*) are instantly verified and armed in the kernel.
* **🔴 Crimson-Red (`⚠️ ACTION REQUIRED` / `📂 ASSIGN EXE`):** Flags complex launcher paths or unlinked binaries. Features a native 1-click macOS Finder attachment to bind paths with zero manual text editing.

---

### 📝 Detailed Changelog: What's New in v2.8.1

* **🔥 100% Zero-Hardcode Architecture:** Completely scrubbed all hardcoded game titles and static directory strings from the codebase. The engine now utilizes an autonomous multi-level directory scanner.
* **💎 Intelligent Multi-EXE Matching:** Solved the limitation of selecting single binaries for game bundles. Selecting an executable inside a multi-title folder (like *Uncharted*) triggers an automatic directory-wide verification that chains all game EXEs (`||`) into a combined real-time RAM monitor task.
* **🛡️ Parameter-Monster Filter (V3.0):** Fixed a critical issue where launchers attached extensive argument strings to active processes, bloating logs and breaking PID mapping. The engine now dynamically strips away argument strings right after the `.exe` extension.
* **🎛️ External UI Sandboxing (`settings.html`):** Fully migrated the heavy HTML/CSS frontend blocks out of the `main.js` and into an isolated `settings.html` file. This completely eliminates editor syntax highlighting bugs and copy-paste klammer/backslash crash vulnerabilities.
* **⚡ Revolutionary Live-Switching:** Toggling the FPS-Boost checkbox in the settings GUI updates active kernel priorities in real-time within 2 seconds—completely eliminating the need for an application restart while preventing log-spam overhead via custom state suffixes (`_reset`).
* **📊 Flicker-Free Terminal Dashboard (`monitor.js`):** Fully optimized the terminal dashboard utilizing the clean UNIX reset command (`\x1Bc`). Text is gathered silently inside a memory buffer and printed in a single millisecond, eliminating line duplicates and text ruins for clean video captures.
* **💾 Zero SSD-Wear RAM Sync:** The main app measures latency metrics and syncs them to the dashboard via a volatile RAM cache path (`/tmp/fps_boost_live.json`), protecting the internal Apple SSD from repetitive write fatigue while maintaining identical precision.

---

### 🎮 Verified & Tested Game Portfolio

The following titles have been actively benchmarked and successfully verified on Apple Silicon hardware using this framework:

| Game Title | Engine Type | Executable Mapping | Kernel Status |
| :--- | :--- | :--- | :--- |
| **007 First Light** | Wine / CrossOver | `007FirstLight.exe` | 🟢 Verified `-20` |
| **Cronos: The New Dawn - Demo** | Wine / CrossOver | `Cronos.exe` | 🟢 Verified `-20` |
| **Cyberpunk 2077** | Native macOS | `Cyberpunk2077` | 🟢 Verified `-20` |
| **Diablo IV** | Wine / CrossOver | `Diablo IV.exe` | 🟢 Verified `-20` |
| **Grand Theft Auto V Legacy** | Wine / CrossOver | `PlayGTAV.exe` | 🟢 Verified `-20` |
| **HELLDIVERS™ 2** | Wine / CrossOver | `helldivers2.exe` | 🟢 Verified `-20` |
| **Mafia III: Definitive Edition** | Native macOS | `Mafia3` | 🟢 Verified `-20` |
| **METAL GEAR SOLID Δ: SNAKE EATER** | Wine / CrossOver | `MGSDelta.exe` | 🟢 Verified `-20` |
| **Metro Exodus** | Wine / CrossOver | `MetroExodus` | 🟢 Verified `-20` |
| **Path of Exile** | Wine / CrossOver | `PathOfExileClient` | 🟢 Verified `-20` |
| **Road to Vostok** | Wine / CrossOver | `RTV.exe` | 🟢 Verified `-20` |
| **S.T.A.L.K.E.R. 2: Heart of Chornobyl** | Wine / CrossOver | `Stalker2.exe` | 🟢 Verified `-20` |
| **Star Wars Outlaws** | Wine / CrossOver | `Outlaws.exe` | 🟢 Verified `-20` |
| **The Last of Us™ Part I** | Wine / CrossOver | `tlou-i.exe` | 🟢 Verified `-20` |
| **Tomb Raider** | Native macOS | `Tomb Raider` | 🟢 Verified `-20` |
| **Trackmania** | Wine / CrossOver | `Trackmania.exe` | 🟢 Verified `-20` |
| **UNCHARTED™: Legacy of Thieves** | Wine / CrossOver | `tll-l.exe\|\|tll.exe\|\|u4-l.exe\|\|u4.exe` | 🟢 Verified `-20` |

---

### 📖 Quick Start Guide

1. **Launch the Application:** The daemon initializes silently and spawns a clean, error-secure dictionary template (`{}`) inside `Application Support/fps-boost/config/scanner_overrides.json`.
2. **Scan for Installation Folders:** Open the Settings UI panel and scroll down to the **Executable Status Radar**. Click **`[ 🔍 Scan for installed games ]`**. The background routine parses game manifests across your internal main drive and external SSD storage volumes (`/Volumes`).
3. **Resolve Crimson-Red Cards:** If a game card illuminates in red, click **`[ 📂 ASSIGN EXE ]`**. The app utilizes native macOS protocols to trigger an opened Finder window locked directly inside that specific game folder. Double-click the primary `.exe` file. The backend automatically scans the folder, packages multi-binaries if found, saves to configuration, and flips the card to green.
4. **Kernel Verification:** Launch your game, open the native macOS Terminal, and execute: `ps -fl -p <YOUR_GAME_PID>`. Seeing **`-20`** inside the **`NI`** column paired with the **`S<s`** status flag verifies successful high-priority hardware orchestration!

***

## 📖 DEUTSCHE VERSION

---

### 🛠️ Kernfunktionen erklärt: Was die App macht

#### Echtzeit-Kernel-Renicing & Core-Allokation (`nice -20`)
Wenn ein Spiele-Launcher eine Executable initialisiert, weist ihr der macOS-Darwin-Kernel standardmäßig eine normale Hintergrundpriorität zu. Diese Anwendung fängt die Prozess-ID (PID) im Moment der Erstellung ab, wendet einen kombinierten Kernel-Switch (`taskpolicy -B`) an, um die Threads auf die Performance-Kerne (P-Cores) von Apple Silicon zu zwingen, und pusht die Scheduling-Priorität auf **`nice -20`** (die maximal mögliche UNIX-Thread-Priorität). Dies zwingt die CPU-Kerne, das Spiel vor allen anderen Hintergrundprozessen zu bedienen, was ein flüssigeres Frame-Pacing garantiert, Mikroruckler eliminiert und die FPS maximiert.

#### Adaptiver Watchdog & RAM-Guard (Anti-Panic-Schutz)
Spiele, die Shader rasant kompilieren (besonders beim ersten Laden unter Wine/CrossOver), zwingen den nativen Apple-Shader-Compiler (`MTLCompilerService`), den Unified Memory extrem aufzublähen. Wenn der freie RAM unter einen kritischen Schwellenwert fällt, kann macOS eine katastrophale Kernel Panic (vollständiger System-Freeze) erleiden. Der Booster verfügt über eine aggressive, 2-stufige Verteidigungslinie:
* **Stufe 1 (Sanfte Evakuierung):** Leert automatisch inaktive System-Caches und Datenträger-Zuordnungen, um die Speicherschwellenwerte zu halten.
* **Stufe 2 (Tiefschlaf & Notfall-Schutz):** Fällt der freie Speicher unter 100 MB, versetzt die App den `MTLCompilerService` vorübergehend in einen Tiefschlaf oder beendet ihn im kritischen Moment hart. Dies löscht tote Shader-Daten, gibt sofort Gigabytes an Unified Memory frei und lässt das System sicher weiterarbeiten, ohne dass dein Mac einfriert.

#### Dynamisches Executable Status Radar
Ein integrated visueller Statusmonitor innerhalb des ausgelagerten Einstellungsfensters:
* **🟢 Platin-Grün (`🔒 READY` / `🔄 CHANGE`):** Gesunde Spiele (und native arm64 macOS Apps wie *Cyberpunk 2077*, *Mafia III* oder *Tomb Raider*) sind verifiziert und im Kernel scharfgeschaltet.
* **🔴 Crimson-Rot (`⚠️ ACTION REQUIRED` / `📂 ASSIGN EXE`):** Markiert komplexe Launcher-Pfade oder unvollständige Verknüpfungen. Bietet eine native 1-Klick-Anbindung über den macOS Finder, um Pfade ohne manuelle Textarbeit zu binden.

---

### 📝 Detailliertes Änderungsprotokoll: Was ist neu in v2.8.1

* **🔥 100 % Hardcode-freie Architektur:** Alle hardcodierten Spieltitel und statischen Ordnerpfade wurden komplett aus dem Code entfernt. Die Engine nutzt nun einen autonomen mehrstufigen Dateiscanner.
* **💎 Intelligentes Multi-EXE-Matching:** Die Einschränkung, nur einzelne Binärdateien für Spielepakete auswählen zu können, wurde gelöst. Das Auswählen einer Executable in einem Multi-Titel-Verzeichnis (wie *Uncharted*) triggert eine automatische, ordnerweite Überprüfung, die alle Spiele-EXEs (`||`) in einer kombinierten Echtzeit-Überwachung zusammenfasst.
* **🛡️ Parameter-Monster-Filter (V3.0):** Ein kritisches Problem wurde behoben, bei dem Launcher lange Parameter-Strings an aktive Prozesse anhängten, was Logs überflutete und das PID-Mapping zerstörte. Die Engine schneidet Argumente nun dynamisch direkt nach der Endung `.exe` ab.
* **🎛️ Externe UI-Auslagerung (`settings.html`):** Die schweren HTML/CSS-Frontend-Blöcke wurden vollständig aus der `main.js` in eine isolierte `settings.html`-Datei migriert. Dies eliminiert Syntax-Highlighting-Fehler im Editor und Absturzrisiken durch fehlerhafte Klammern/Backslashes beim Kopieren.
* **⚡ Revolutionäres Live-Switching:** Das Umschalten der FPS-Boost-Checkbox in der GUI aktualisiert die aktiven Kernel-Prioritäten in Echtzeit innerhalb von 2 Sekunden – ein Anwendungsneustart ist nicht mehr erforderlich. Eigene Status-Suffixe (`_reset`) verhindern dabei SSD-belastenden Log-Spam.
* **📊 Flackerfreies Terminal-Dashboard (`monitor.js`):** Das Dashboard nutzt nun den sauberen UNIX-Reset-Befehl (`\x1Bc`). Der Text wird unsichtbar im Speicher gesammelt und in einer einzigen Millisekunde am Stück gedruckt, was Zeilen-Doppelungen und Textruinen für perfekte Videoaufnahmen eliminiert.
* **💾 SSD-schonender RAM-Sync:** Die Haupt-App misst Latenzwerte und synchronisiert sie über einen flüchtigen Cache-Pfad im Arbeitsspeicher (`/tmp/fps_boost_live.json`) mit dem Dashboard. Dies schützt die interne SSD vor repetitiver Schreibabnutzung bei identischer Präzision.

---

### 🎮 Verifiziertes & getestetes Spiele-Portfolio

Die folgenden Titel wurden auf Apple Silicon Hardware (inklusive M4 Max) aktiv benchmarked und erfolgreich verifiziert:

| Spieltitel | Engine-Typ | Executable-Mapping | Kernel-Status |
| :--- | :--- | :--- | :--- |
| **007 First Light** | Wine / CrossOver | `007FirstLight.exe` | 🟢 Verifiziert `-20` |
| **Cronos: The New Dawn - Demo** | Wine / CrossOver | `Cronos.exe` | 🟢 Verifiziert `-20` |
| **Cyberpunk 2077** | Natives macOS | `Cyberpunk2077` | 🟢 Verifiziert `-20` |
| **Diablo IV** | Wine / CrossOver | `Diablo IV.exe` | 🟢 Verifiziert `-20` |
| **Grand Theft Auto V Legacy** | Wine / CrossOver | `PlayGTAV.exe` | 🟢 Verifiziert `-20` |
| **HELLDIVERS™ 2** | Wine / CrossOver | `helldivers2.exe` | 🟢 Verifiziert `-20` |
| **Mafia III: Definitive Edition** | Natives macOS | `Mafia3` | 🟢 Verifiziert `-20` |
| **METAL GEAR SOLID Δ: SNAKE EATER** | Wine / CrossOver | `MGSDelta.exe` | 🟢 Verifiziert `-20` |
| **Metro Exodus** | Wine / CrossOver | `MetroExodus` | 🟢 Verifiziert `-20` |
| **Path of Exile** | Wine / CrossOver | `PathOfExileClient` | 🟢 Verifiziert `-20` |
| **Road to Vostok** | Wine / CrossOver | `RTV.exe` | 🟢 Verifiziert `-20` |
| **S.T.A.L.K.E.R. 2: Heart of Chornobyl** | Wine / CrossOver | `Stalker2.exe` | 🟢 Verifiziert `-20` |
| **Star Wars Outlaws** | Wine / CrossOver | `Outlaws.exe` | 🟢 Verifiziert `-20` |
| **The Last of Us™ Part I** | Wine / CrossOver | `tlou-i.exe` | 🟢 Verifiziert `-20` |
| **Tomb Raider** | Natives macOS | `Tomb Raider` | 🟢 Verifiziert `-20` |
| **Trackmania** | Wine / CrossOver | `Trackmania.exe` | 🟢 Verifiziert `-20` |
| **UNCHARTED™: Legacy of Thieves** | Wine / CrossOver | `tll-l.exe\|\|tll.exe\|\|u4-l.exe\|\|u4.exe` | 🟢 Verifiziert `-20` |

---

### 📖 Kurzanleitung für den Einstieg

1. **Anwendung starten:** Der Daemon initialisiert sich im Hintergrund und erstellt eine saubere, fehlersichere Wörterbuch-Vorlage (`{}`) unter `Application Support/fps-boost/config/scanner_overrides.json`.
2. **Nach Spieleordnern scannen:** Öffne das Einstellungsfenster und scrolle nach unten zum **Executable Status Radar**. Klicke auf **`[ 🔍 Scan for installed games ]`**. Die Hintergrundaufgabe liest deine aktiven Spiele-Manifeste auf deiner internen Hauptplatte und externen SSDs (`/Volumes`) ein.
3. **Komplexe Fälle lösen:** Wenn eine Karte rot leuchtet, klicke auf **`[ 📂 ASSIGN EXE ]`**. Die App öffnet ein macOS Finder-Fenster punktgenau in diesem Spieleordner. Doppelklicke auf die primäre `.exe`-Datei des Spiels. Das Backend scannt den Ordner autonom, strukturiert bei Bedarf Multi-Binaries, speichert die Konfiguration ab und schaltet die Karte auf grün.
4. **Kernel-Überprüfung:** Starte dein Spiel, öffne das macOS-Terminal und führe folgenden Befehl aus: `ps -fl -p <DEINE_SPIELE_PID>`. Ein Wert von **`-20`** in der Spalte **`NI`** zusammen mit dem Prozessstatus-Flag **`S<s`** beweist die erfolgreiche High-Priority-Hardware-Zuweisung!

---

## 📜 License

MIT License. See LICENSE file for details.
