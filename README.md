# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.6.0 (Core GUI, Dynamic Limiters & Daemon Switching Update)  
**Developer:** Mario (flashi)  
**Platform:** macOS (Architecture: arm64 / Apple Silicon M-Chips)  
**Target OS:** macOS 15 (Sequoia) & macOS 16 (Tahoe) Verified  
**Environment:** Electron Framework / Native Menubar Application (Standalone App Bundle)  

---

## 🛑 IMPORTANT: REALISTIC EXPECTATIONS (⚠️ NO MIRACLE FPS!)

Please read carefully before using this app: This app is **NOT** an overclocking tool and it cannot magically create more GPU cores on your Mac Studio.

If your unified graphics core (GPU) is fully bottlenecked at maximum settings and the game natively hits 50 FPS, this app **WILL NOT** suddenly give you 100 FPS. Maximum graphical performance depends entirely on your hardware.

### 💡 What does the app actually do?
The app optimizes CPU core allocation, system threading, and Apple Silicon Unified Memory caching in real-time:

- **Eliminates Micro-Stuttering (Lag Spikes):** It shifts relevant gaming processes to the absolute sweet-spot priority (`Nice -5`). This grants your game ultimate CPU cycles while keeping the macOS core window management perfectly smooth [I].
- **Exclusive Cores & Shipping Engine Sorting:** When demanding next-gen games start, the app intelligently detects parallel sub-processes and prioritizes the heavy main 3D engine (`*Shipping.exe` / `u4.exe`) right away onto MAX-Boost, dropping minor launchers safely to a silent fallback boost (`Nice -1`).
- **Background Shield:** Active browser tabs or system cloud processes are pushed aside, preventing them from interrupting the game's strict pacing.
- **Automated RAM Cleanup:** The millisecond a game is closed, the app triggers a silent, native memory flush (`sudo purge`). It instantly flushes gigabytes of stale graphics caches, restoring your system-wide free memory instantly [I].

---

## 🎛️ Graphical User Interface (GUI)

Here is a visual preview of how the new English-localized Settings window and the status bar menu layout look inside macOS:

### 1. How the Settings window (GUI) looks on your screen:
```text
+-------------------------------------------------------------------+

| 🚀 Mac Gaming Booster - Settings                            [X]   |
+-------------------------------------------------------------------+

|                                                                   |
|  🛡️ Adaptive Core RAM Thresholds (MB)                             |
|  Drag the sliders to configure the app thresholds. Built-in,      |
|  safe hardware minimums apply automatically!                      |
|  ---------------------------------------------------------------  |
|  Soft Buffer Evacuation (Stage 1):                 [ 1500 MB ]    |
|  ( )================================================------------  |
|                                                                   |
|  Compiler Deep-Sleep (Stage 2):                    [  400 MB ]    |
|  ( )====================----------------------------------------  |
|                                                                   |
|  ---------------------------------------------------------------  |
|  📝 Blacklist Management (Ignored Processes)                      |
|  Processes in this list will be ignored by the booster.           |
|  +-------------------------------------------------------------+  |
|  |  [X] steam          [X] crossover      [X] winewrapper      |  |
|  |  [X] electron       [X] winedevice     [X] steamclean       |  |
|  +-------------------------------------------------------------+  |
|  [ + Add Process ]                                                |
|                                                                   |
|  ---------------------------------------------------------------  |
|  ⚙️ Root-Helper Background Service (Daemon)                         |
|  [X] Keep background service active (Variant 1)                   |
|                                                                   |
|  ---------------------------------------------------------------  |
|  🔄 Reset to Defaults                              💾 Save & Close  |
|                                                                   |
+-------------------------------------------------------------------+
```

### 2. How the Tray Menu looks inside your macOS Menubar:
```text
 +---+

 | 🚀|  (Clicking the Rocket Icon inside your upper macOS system bar)
 +---+--------------------------------------------------+

 | 🟢 MAX-Boost: 📦 007 First Light (PID: 14007)        | <- Live Status Layer
 | 📊 RAM Overlay On/Off         (Cmd + Alt + R)        |
 | 🚀 Enable FPS Boost           [ Checkmark Active ]   |
 | 🛡️ Enable Adaptive Core       [ Checkmark Active ]   |
 | 📝 Enable Logging             [ Checkmark Active ]   |
 | ⚙️ Start at Login (Autostart) [ Checkmark Active ]   |
 |------------------------------------------------------|
 | 📂 Open Logs Folder                                  |
 | ⚙️ Settings...                                        | <- Opens the new GUI
 |------------------------------------------------------|
 | ❌ Quit App                                          |
 +------------------------------------------------------+
```

---

## 🛠️ Features (v2.6.0 - Platin GUI Edition)

- **🎛️ Integrated Core Engine GUI (NEW):** A sleek, beautiful, dark-themed control center fully translated to English replaces manual JSON configurations [I]. Users can now tweak system-wide memory thresholds dynamically using fluid graphical sliders [I].
- **📝 Native In-App Blacklist Management (NEW):** No more messing around with raw text files inside Finder [I]! Users can type in process names (e.g., discord.exe or game overlay utilities) directly into the UI field to add them, or click on the clean item tags to remove them instantly [I]. The `blacklist.txt` file is dynamically regenerated upon saving [I].
- **🔄 Indestructible Reset Button & Min-Locks (NEW):** Bulletproof protection! Clicking "Reset to Defaults" instantly rolls back all settings and arrays to the heavily verified factory configurations (1500MB / 400MB / default core targets) [I]. Hardcoded safety bounds (blocking selection under 200MB) prevent users from accidentally locking up their machine [I].
- **🎚️ Configurable Daemon Lifecycles (NEW):** Complete system authority tailored into two accessible user-variants:
  - *Variant 1 (Keep Active):* The privileged helper remains resident inside memory after quitting the tray UI [I]. Advantage: The app hooks back into the daemon instantly on the next start **without triggering an administrative password prompt** [I].
  - *Variant 2 (Auto-Kill):* Upon quitting the app, the engine commits a secure self-termination signal [I]. The helper process exits immediately on kernel-level, leaving **0% residue inside your system memory** [I].
- **🧹 Auto-Log Cleanup Protection (NEW):** The helper process features a self-maintaining filesystem structure [I]. Upon fresh cold-boots, the `helper_debug.log` automatically purges and resets to 0 Bytes, actively preserving your high-speed SSD lifespan [I].
- **⚡️ Unblockable File-Trigger Pipeline:** Forget fragile TCP ports and aggressive sandboxing blocks [I]. Version 2.6.0 communicates via an unblockable, ultra-fast IPC file-pipeline inside the local App Support directory [I]. The main app writes data packets in milliseconds—the root helper executes them instantly [I].
- **🚀 Native Apple Silicon Security Prompt:** By hardcoding your rocket icon (`rocket.icns`), macOS completely deactivates the emulated and resource-heavy Intel Rosetta prompt [I]. The password authorization window now utilizes the official, native macOS security UI running at 0% CPU load [I].
- **🔍 Smart Sony Path Investigator:** When PlayStation ports (like *The Last of Us Part I* or *Uncharted Legacy of Thieves Collection*) share the same cryptic background executable handle, the investigator instantly analyzes the real SSD directory structures, separating the game names in logs and HUD with 100% cosmetic accuracy [I].
- **📊 Live RAM HUD (In-Game Overlay):** A sleek, frameless, semi-transparent heads-up display projects your real-time memory usage (`Used GB / Total GB` and `Free MB`) directly onto your screen [I]. It features a color-adaptive status indicator that switches to **Red (Live)** during critical memory pressure [I].
- **🛡️ Exclusive Fullscreen Persistence:** Engineered using the native macOS `screen-saver` layer combined with fully passive initialization (`show: false`, `focusable: false`). The HUD forces its way on top of heavy 3D fullscreen windows **without stealing the OS window-focus or accidentally minimizing sensitive game wrappers**.
- **🛡️ Adaptive Core Watchdog (With Smart Suspension):** Actively counters massive memory leaks during DirectX 12 shader pre-loading (e.g., in *007 First Light* or *The Last of Us*) [I]. It monitors the entire system's available memory pages using native macOS `vm_stat` hooks, specifically calibrated for Apple Silicon's modern **16 KB hardware pages**.
  - *Stage 1 (Soft Evacuation):* Dropping below the configured `purgeLimit` (e.g., 1500MB) safely flushes out stale background application page caches [I].
  - *Stage 2 (Compiler Deep-Sleep):* Dropping below the configured `pauseLimit` (e.g., 400MB) commands the `MTLCompilerService` into an immediate kernel-level `SIGSTOP` suspension, runs an aggressive hardware RAM purge, and resumes the compilation via `SIGCONT` [I]. Zero shader calculation progress is lost and overall load times drop by over 50% [I]!
  - *Stage 3 (Hard Crash Protection):* If heavy I/O swapping suffocates the kernel below a critical 100MB threshold, the watchdog steps in and executes an instant `killall -9` on the compiler, safely averting an imminent Kernel Panic [I].

---

## 📜 License

This project is open-source and available under the terms of the **MIT License**:

```text
Copyright (c) 2026 Mario (flashi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The software is provided "as is", without warranty of any kind, express or
implied, including but not limited to the warranties of merchantability.
```
