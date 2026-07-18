# 🚀 Mac Gaming Booster (v2.8.1b)

A lightweight, native status-bar utility built for macOS Apple Silicon (M-Series) to unleash the full potential of your hardware when running games via CrossOver, Whisky, or Steam (Rosetta 2/Wine).

---

## 💎 Features & Kernfunktionen

### 🇩🇪 Deutsch
- **⚡ Prozess-Turbo:** Erkennt Windows-Spiele unter CrossOver/Whisky sowie native Mac-Titel automatisch und setzt sie im macOS-Kernel auf die höchste Priorität (**NICE -20**).
- **📊 Live-HUD & Dashboard:** Zeigt Telemetrie wie Spiel-PID, CPU-Auslastung, Latenz und Unified Memory direkt in der Menüleiste und als Overlay an.
- **📦 Autarkes System:** Nutzt die interne Node-Laufzeit von Electron. Nutzer benötigen keine externe Node.js-Installation auf dem Mac.

### 🇺🇸 English
- **⚡ Process-Turbo:** Automatically detects Windows games under CrossOver/Whisky and native Mac titles, forcing macOS thread scheduling to priority level (**NICE -20**).
- **📊 Live-HUD & Dashboard:** Mirrors live telemetry (PID, active Nice Level, memory metrics) straight to your menu bar and Live HUD overlay.
- **📦 Self-Contained System:** Leverages Electron's internal runtime. Users do not need a global Node.js installation on their Mac.

---

## 🎮 Im Labor verifiziert & Labor-Statusliste / Verified Game Status List

### 🍎 Native Mac Spiele / Native Mac Games
- 🟢 **Cyberpunk 2077 (Mac)** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Mafia III: Definitive Edition (Mac)** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Metro Exodus (Mac)** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Path of Exile (Mac)** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Tomb Raider (Native Mac)** ➔ 100% Detected (NICE -20 Direct Sandbox Boost)

### 🪟 Windows Emulation & Layer Spiele / Windows Layer Games (via CrossOver / Whisky / Steam)
- 🟢 **007 First Light** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Brawlhalla** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Cronos: The New Dawn (Demo)** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Grand Theft Auto V Legacy** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **HELLDIVERS™ 2** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **HITMAN 3** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **METAL GEAR SOLID Δ: SNAKE EATER** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **RabbidsCoding=** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **Road to Vostok** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **S.T.A.L.K.E.R. 2: Heart of Chornobyl** ➔ 100% Detected & Shader-Guard Stabilized
- 🟢 **Star Wars Outlaws** ➔ 100% Detected (NICE -20 Massive Engine Overdrive)
- 🟢 **Trackmania** ➔ 100% Detected (NICE -20 P-Core Overdrive)
- 🟢 **UNCHARTED™: Legacy of Thieves Collection** ➔ 100% Detected & Boosted to NICE -20 (Forced via manual mapping definition to u4.exe)
- ❌ **The Last of Us Part I** ➔ Deprecated (Under investigation for v2.8.2 / Hidden system path)
- ⚪ **Diablo IV** ➔ Pending (Emulation tier compatibility test required)

---

## 🛠️ Start & Gatekeeper Bypass (Terminal)

### 🇩🇪 Deutsch
Falls macOS das Programm als "beschädigt" blockiert, im **Terminal** folgenden Befehl ausführen, um die Datei freizuschalten und die App direkt zu starten:

```bash
chmod +x ./Start.command && ./Start.command
```

### 🇺🇸 English
If macOS blocks the application as "damaged" due to Gatekeeper restrictions, execute the following command in the **Terminal** to bypass it and launch the app:

```bash
chmod +x ./Start.command && ./Start.command
```

---

## ⚙️ Einstellungen & Overrides / Settings Specifications

### 📊 Adaptive Core RAM Thresholds (MB)
- **Soft Buffer Evacuation (Stage 1):** 
  - *DE:* Regler für den RAM-Guard. Fällt der freie Speicher unter dieses Limit, werden inaktive System-Caches evakuiert, um Auslagern (Swap) zu verhindern.
  - *EN:* Unified Memory thresholds manager. Triggers dynamic cache purges when free RAM drops below this line to prevent system swap usage.
- **Compiler Deep-Sleep (Stage 2):** 
  - *DE:* Sicherheits-Limit. Schickt schwere Hintergrund-Prozesse (wie den Metal-Compiler) kurzzeitig in den Tiefschlaf, um In-Game-Ruckler abzufangen.
  - *EN:* Safety limit. Temporarily forces heavy compilation worker threads into deep sleep to eliminate critical system stutters during execution phases.

### 🧠 Core Engine Settings
- **Enable FPS Boost:** 
  - *DE:* Aktiviert die dynamische Kernel-Priorisierung für erkannte Spiele in Echtzeit.
  - *EN:* Toggles active kernel-level priority overrides for discovered game instances in real-time.
- **Enable Adaptive Shader Guard (Anti-Panic):** 
  - *DE:* Schützt das System vor plötzlicher RAM-Zustellung. Der *Safe-Shader-Compilation Mode* verschiebt aggressive Speicherreinigungen während der ersten Minuten des Spielstarts (optimiert für *S.T.A.L.K.E.R. 2*), um Kompilierungsabstürze zu verhindern.
  - *EN:* Guards your architecture against sudden allocation spikes. The *Safe-Shader-Compilation Mode* postpones memory purges during initial game execution phases (optimized for *S.T.A.L.K.E.R. 2*) to avert critical engine crashes.
- **Enable Logging (gaming_boost.log):** 
  - *DE:* Protokolliert alle Kerntransaktionen kontinuierlich für Diagnosezwecke.
  - *EN:* Enables structured diagnostic telemetry capturing core engine behaviors within the local file environment.
- **Start at Login (Autostart):** 
  - *DE:* Registriert den Booster im macOS-System, um ihn bei jedem Systemstart im Hintergrund zu laden.
  - *EN:* Integrates tracking properties directly into the macOS system layer to load the launcher automatically at system startup.
- **Keep Daemon Alive:** 
  * *DE (Aktiv — Variante 1):* Hält den privilegierten Dienst im RAM aktiv, um Spiele auch nach dem Schließen des Dashboards im Hintergrund weiter zu erkennen.
  * *DE (Deaktiviert — Variante 2):* Bereinigt das RAM beim Beenden der App restlos und fährt alle Helper-Prozesse geordnet herunter.
  * *EN (Checked — Variant 1):* Retains the background controller loop in your memory configurations even when closing user windows to guarantee seamless tracking.
  * *EN (Unchecked — Variant 2):* Clears background tasks instantly upon closing the master utility context, enforcing a completely clear memory line.

---

## 📄 License & Credits
- **Author:** Mario (flashi)
- **License:** ISC License
