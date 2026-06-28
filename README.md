# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.7.0 | **Platform:** macOS (arm64) | **Target:** macOS 15/16

---

## 🛑 IMPORTANT: REALISTIC EXPECTATIONS (⚠️ NO MIRACLE FPS!)

This is **NOT** an overclocking tool. It optimizes system resources for better stability, not raw GPU power.

### 💡 Core Functions
- **Zero-Dependency Engine:** Standalone App Bundle.
- **Micro-Stutter Reduction:** Prioritizes game processes (`Nice -5`).
- **Intelligent Core Allocation:** Throttles background tasks (`Nice -1`).
- **Background Shield:** Reduces interruptions.
- **Automated Memory Mgmt:** Native cache cleanup (`sudo purge`).

---

## 🎛️ Graphical User Interface (GUI)

Here is a visual preview of the English-localized Settings window and the status bar menu layout inside macOS:

### 1. Settings Window (GUI):
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

### 2. Tray Menu Layout:
```text
 +---+

 | 🚀|  (Click the Rocket Icon inside your upper macOS system bar)
 +---+--------------------------------------------------+

 | 🟢 MAX-Boost: 📦 Helldivers 2 (PID: 57029)            | <- Live Status Layer
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

## 🎛️ Graphical User Interface (GUI)

Here is a visual preview of the English-localized Settings window and the status bar menu layout inside macOS:

### 1. Settings Window (GUI):
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

### 2. Tray Menu Layout:
```text
 +---+

 | 🚀|  (Click the Rocket Icon inside your upper macOS system bar)
 +---+--------------------------------------------------+

 | 🟢 MAX-Boost: 📦 Helldivers 2 (PID: 57029)            | <- Live Status Layer
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

- **🎛️ Integrated Core Engine GUI:** Eine dunkle Benutzeroberfläche ersetzt manuelle JSON-Konfigurationen und ermöglicht die dynamische Anpassung von Speicher-Schwellenwerten.
- **📝 Native In-App Blacklist Management:** Prozesse können direkt in der UI zur Ignorier-Liste hinzugefügt oder entfernt werden.
- **🔄 Indestructible Reset Button & Min-Locks:** Setzt Schwellenwerte auf Standardwerte zurück (1500MB / 400MB) und verhindert Einstellungen unter 200MB, um Systemabstürze zu vermeiden.
- **🧹 Auto-Log Cleanup Protection:** Der Hilfsprozess leert `helper_debug.log` automatisch bei jedem Neustart, um die SSD-Lebensdauer zu schonen.
- **📊 Live RAM HUD (In-Game Overlay):** Eine semi-transparente Anzeige zeigt RAM-Nutzung (`Used GB / Total GB` und `Free MB`) sowie Statusmeldungen (Rot bei kritischem Zustand) an.
- **🛡️ Exclusive Fullscreen Persistence:** Ein Overlay, das sich über 3D-Vollbildanwendungen legt, ohne den Fokus zu stehlen oder das Spiel zu minimieren.
- **🛡️ Adaptive Core Watchdog (With Smart Suspension):** Dreistufiger Schutz gegen Speicherlecks (optimiert für 16 KB Hardware-Pages):
  - *Stage 1 (Soft Evacuation):* Leert Hintergrund-Caches bei Erreichen des `purgeLimit` (z.B. 1500MB).
  - *Stage 2 (Compiler Deep-Sleep):* Pausiert `MTLCompilerService` via `SIGSTOP` bei Erreichen des `pauseLimit` (z.B. 400MB), führt eine Speicherbereinigung durch und setzt den Prozess mit `SIGCONT` fort.
  - *Stage 3 (Hard Crash Protection):* Führt `killall -9` auf den Compiler aus, um Kernel Panics unter 100MB RAM-Verfügbarkeit zu verhindern.

---

## 📜 License

This project is open-source and available under the terms of the **MIT License**.

```text
Copyright (c) 2026 Mario (flashi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```
*(The full license text can be found in reference)*
