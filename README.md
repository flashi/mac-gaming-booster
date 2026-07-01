# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.7.1 (Platinum GUI Edition) | **Platform:** macOS (arm64) | **Target OS:** macOS 15+  
**Environment:** Electron Framework / Native Menu Bar Application  

---

## 🛑 IMPORTANT: REALISTIC EXPECTATIONS (⚠️ NO MIRACLE FPS!)

This app is **NOT** an overclocking tool. It optimizes system resources for gaming but cannot bypass physical hardware limits.

### 💡 What does the app actually do?
Optimizes CPU, thread priority, and RAM on Apple Silicon:
- **Zero-Dependency:** Runs fully standalone via the internal Electron binary.
- **Micro-Stutter Reduction:** Assigns high priority (`Nice -5`) to game processes.
- **Intelligent Engine Prioritization:** Focuses on primary game binaries while keeping launchers constrained in the background.
- **Automatic RAM Cleanup:** Triggers a native `sudo purge` command upon exiting a game to free up cached memory.

---

## ⚙️ Features (v2.7.1)

- **Standalone Architecture:** No external Node.js installation required.
- **Native Failsafe Engine:** Replaced legacy `sudo-prompt` with secure privilege elevation handled via `osascript`.
- **Aggressive Kernel Boost:** `renice -5` for verified primary game executables, `-1` for emulation-relevant Wine background processes.
- **Single-Auth Security:** Requires password entry only once per cold boot of the Mac.
- **Updated Game Detection:** Precise parsing for AAA titles (Helldivers 2, TLOU, etc.).
- **Refined Daemon Controls:** Native options for background persistence or auto-kill behaviors.
- **Live RAM HUD:** A click-through, non-focusable overlay displaying real-time memory statistics.
- **Adaptive Watchdog:** Prevents heavy memory leaks by active management of `MTLCompilerService` and `purge`.
- **Integrated Platform Scanner:** Independent test utility `check_games2.js` for deep-scanning game installations across internal and external storage drives (`/Volumes`) alongside automatic EXE mapping.

---

## 🔄 Recent Changes & Optimizations (v2.7.1)

During the development toward the **Platinum GUI Edition (v2.7.1)**, critical core components of the engine were stabilized, made completely reboot-safe, and deeply integrated into the GUI:

### 1. Reboot-Safe Trigger Architecture (`main.js` & `helper.js`)
* **Problem Solved:** Previously, the privileged root helper completely deleted the `boost.trigger` file via `fs.unlinkSync()` after reading it. This caused file permission conflicts after a macOS reboot, preventing the main user-space app from creating new triggers (causing games to remain stuck at standard priority `Mid / 0`).
* **Optimization:** The deletion command was removed. The root helper now flushes the file contents atomically using `fs.writeFileSync(triggerPath, '', 'utf8')`. The physical file remains intact with correct write permissions. The engine detects games within 2 seconds after a system reboot and forces them back into Kernel Boost mode (`Max / -5`).

### 2. Path Structure Correction for `sendToRootHelper`
* The communication channel function linking to the background root service has been fully re-mapped to the new clean directory layout.
* Signals are now accurately written inside the centralized `~/Library/Application Support/fps-boost/config/boost.trigger` path.
* All PIDs and booster level values are strictly validated as integers (`parseInt`) before transmission to prevent any POSIX shell syntax anomalies.

### 3. GUI Integration & Dynamic Mapping Engine (`games_exe_mapping.txt`)
* **New in Settings:** The read interface for the external `games_list.txt` has been successfully implemented directly into the configuration window (Settings GUI).
* **100% Dynamic Detection:** The deep two-way title translation and filter heuristics for complex processes (such as PlayStation's `crs-handler.exe` used in *The Last of Us* or multi-executables like `u4.exe||tll-l.exe` for *Uncharted*) have been fully completed. The application now runs entirely without hardcoded game titles inside the source code, reading all runtime process associations dynamically from `games_exe_mapping.txt`.

---

## 📜 License

MIT License. See LICENSE file for details.
