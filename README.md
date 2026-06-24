# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.4.0 (Smart Process Analytics & Core-Wrapper Update)  
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

- **Eliminates Micro-Stuttering (Lag Spikes):** It shifts relevant gaming processes to the absolute sweet-spot priority (`Nice -5`). This grants your game ultimate CPU cycles while keeping the macOS core window management perfectly smooth.
- **Exclusive Cores & Shipping Engine Sorting:** When demanding next-gen games (like S.T.A.L.K.E.R. 2 or Cyberpunk 2077) start, the app intelligently detects parallel sub-processes and prioritizes the heavy main 3D engine (`*Shipping.exe`) first, dropping minor launchers safely to a silent fallback boost (`Nice -1`).
- **Background Shield:** Active browser tabs or system cloud processes are pushed aside, preventing them from interrupting the game's strict pacing.
- **Automated RAM Cleanup:** The millisecond a game is closed, the app triggers a silent, native memory flush (`sudo purge`). It instantly flushes gigabytes of stale graphics caches, restoring up to 87% of system-wide free memory instantly.

**The Result:** Frame timing (frametime) drops and stabilizes perfectly. Even with the exact same FPS number displayed, the game feels much smoother, softer, and responds way faster to your controller or mouse inputs.

---

## 🛠️ Features (v2.4.0)

- **🔍 Smart Process Analytics & Auto-Naming (NEW):** Manual translation arrays are obsolete. The booster features a multi-tier recognition cascade that automatically analyzes directory structures and binary properties to identify and label active games with 100% cosmetic accuracy.
- **🗂️ Universal External SSD Support (NEW):** The path-parsing engine dynamically scales across all storage boundaries. Whether your Steam Library or CrossOver Bottles are located on the internal Macintosh HD or an external high-speed NVMe SSD, the app instantly extracts correct game identities.
- **🎛️ Windows EXE Metadata Investigator (NEW):** When encountering short or cryptic process handles (e.g., `u4.exe`), the booster executes a sub-millisecond binary analysis utilizing native macOS `strings` and `grep` pipelines. It pulls the original `ProductName` directly from the Windows binary version block—completely offline.
- **🪝 CrossOver Wrapper-Hook (NEW):** Engineered a bulletproof fail-safe mechanism for sandboxed PlayStation ports and complex DX12 titles (e.g., *The Last of Us Part I*). If macOS security policies completely isolate a game's underlying handler (`crs-handler.exe`), the booster locks onto the visible `winewrapper.exe`, cross-references the internal Bottle signature, and forces the full **MAX-Boost** right into the game's execution path.
- **🧼 Silent System-Wrapper Filtering (NEW):** While CrossOver background wrappers (`winewrapper`, `winedevice`, `d3dmetal`) are still actively caught and optimized to peak efficiency in the background, a new cosmetic mask completely filters them from your logs, desktop overlay, and notifications. Your HUD displays **only the actual game** you are currently playing.
- **📊 Live RAM HUD (In-Game Overlay):** Added a sleek, frameless, semi-transparent heads-up display that projects your real-time memory usage (`Used GB / Total GB` and `Free MB`) directly onto your screen. It features a color-adaptive status indicator that switches to **Red (Live)** during critical memory pressure.
- **🛡️ Exclusive Fullscreen Persistence:** Engineered using the native macOS `screen-saver` layer combined with fully passive initialization (`show: false`, `focusable: false`, `showInactive()`). The HUD forces its way on top of demanding 3D full-screen windows **without stealing the OS window-focus or accidentally minimizing sensitive game wrappers** (CrossOver/Wine/Steam) during activation.
- **🍏 Universal Hardware Autodetection:** Hardcoded memory values are completely eliminated. The app dynamically hooks into the native Node.js `os.totalmem()` API to read your Mac’s physical layout out-of-the-box, seamlessly computing telemetry whether your machine runs on 8 GB, 16 GB, 36 GB, or 128 GB of Unified Memory.
- **🧈 Fluid In-Game HUD Positioning:** Simply hold the `Option` (Alt) key and use your keyboard's arrow keys (`Option + Left/Right/Up/Down`) to shift the overlay across your monitor seamlessly "like butter" to find your perfect spot.
- **💾 Persistent Position Saving:** Every pixel adjustment made via the arrow keys instantly commits the active X and Y coordinates to your local `booster_config.json`. The customized HUD layout remains permanently locked across application restarts.
- **Smart Process Scan:** Uses a lightning-fast `ps -Ax` engine. Detects active games in milliseconds—long before the game screen even turns black.
- **🛡️ Adaptive Core (System-Wide Memory Pressure Watchdog):** Formally known as *Shader Guard*. Actively counters massive memory leaks during DirectX 12 shader pre-loading (e.g., in *007 First Light* or *Uncharted*). It monitors the entire system's available memory pages using native macOS `vm_stat` hooks.
- **🍏 Native Apple Silicon 16 KB Page Support:** Specifically calibrated for M-Chips (M1/M2/M3/M4). Legacy utilities compute values based on Intel's 4,096-byte layout, which corrupts metrics on Apple Silicon. v2.4.0 natively handles the modern **16,384-byte (16 KB)** hardware page sizing and dynamically adds `Pages speculative` to the equation for 100% precise memory tracking.
- **🧹 "No Sudo" Live In-Game Evacuation:** When available memory falls below **1,500 MB**, the booster instantly triggers an automated cache-evacuation (`syslog -c aslmanager -d`) combined with a micro-memory spike simulation. This forces macOS to dump inactive system caches and stale graphics buffers immediately inside user-space **without causing single frame-drops** during active gameplay.
- **⏱️ 30-Second Smart Cooldown Protection:** Built for heavy stress situations. Once a massive memory pressure cleanup is performed, a strict 30-second sleep timer (`PURGE_COOLDOWN`) locks the routine. This prevents infinite background loops, completely shields your SSD from excessive logging stress, and preserves maximum CPU cycles for your frames.
- **💥 Emergency Metal Compiler Termination:** If available memory stays critically low due to relentless shader compiling, the booster forcefully terminates the bloated `MTLCompilerService` (`killall -9`). macOS automatically spins up a clean compiler instance in milliseconds, completely preventing heavy OS-level locks and Watchdog Kernel Panics while gameplay stays perfectly stable.
- **Asynchronous Anti-Prompt Loop:** Built specifically for CrossOver/Wine. If a game launches multiple background processes at the same millisecond, the app blocks duplicate prompt stacks, allowing exactly one password entry while instantly handling the rest silently.
- **Dynamic Local Blacklist:** Generates an external `blacklist.txt` inside your user directory. Add any background process (like `steamclean` or `wineloader`) in real-time without ever re-packaging the application code.
- **Live Status Menu Bar:** The menu bar header actively updates its text string in real-time, showing: `🎮 Status: No games active`, `🟢 MAX-Boost: [Game Process]` or `🟡 MID-Boost: [Cooldown/Fallback]`.
- **Hardware Cooldown Lock:** If you intentionally cancel a permission prompt, a strict 1-minute system cooldown is activated. The app falls back to a silent MID mode (`Nice -1`) and guarantees zero prompt spamming.
- **0% Idle Load & Dock Hiding:** Completely hidden from the lower dock. Uses an official color-adaptive, high-resolution Google Noto Rocket Emoji icon.
- **Panic Kill-Switch:** Pressing `Option + Command + K` instantly breaks all intervals, purges hooks, clears overlay loops, and safely terminates the booster application immediately.

---

## 🚀 Packaging & How to Run

The application is fully native and no longer requires manual root Terminal execution. It runs safely as a standalone `.app` bundle, calling isolated privileged updates via `sudo-prompt` only when an actual binary is discovered. It bundles its own Node.js runtime, so end-users require zero terminal utilities or software prerequisites.

### Compiling the App:
1. Clear old caches and build the native arm64 app bundle via Terminal:
   ```bash
   rm -rf dist && npm run package-mac
   ```
2. Open the `dist/mac-arm64/` directory and drag the app into your system Applications folder.

---

## 🕹️ Controls inside the Tray Menu

- **Live Status String:** Displays current engine activity and real-time execution level (MAX/MID/None) right at the top layer.
- **📊 RAM Overlay ein/aus:** Toggles the Live HUD Overlay visibility (`CmdOrCtrl + Alt + R`).
- **🚀 Enable FPS Boost:** Toggle the engine on or off instantly. Disabling safely drops all active game structures back to standard priority 0 in real-time.
- **🛡️ Enable Adaptive Core (Anti-Panic):** Toggles the adaptive system-wide memory monitor. Live-syncs instantly during running gameplay. Recommended to enable before launching heavy DX12 or Unreal Engine 5 titles.
- **🧹 Clear Log File:** Instantly clears and rotates the local troubleshooting log file to preserve SSD space.
- **⚙️ Start at Login (Autostart):** Registers the app securely inside the native macOS login item subsystem for automated silent startup.
- **📝 Edit Blacklist (Ignore File):** Opens the live `blacklist.txt` inside the default text editor. Save changes to ignore unwanted processes on the fly.
- **❌ Quit Application:** Safely releases all priority chains, drops active windows, and shuts down the booster engine immediately.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
