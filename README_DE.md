# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.7.1 (Platin GUI Edition) | **Platform:** macOS (arm64) | **Target OS:** macOS 15+  
**Environment:** Electron Framework / Native Menubar Application  

---

## 🛑 IMPORTANT: REALISTIC EXPECTATIONS (⚠️ NO MIRACLE FPS!)

This app is **NOT** an overclocking tool. It optimizes system resources for gaming, but cannot bypass hardware limits.

### 💡 What does the app actually do?
Optimizes CPU, thread priority, and RAM on Apple Silicon:
- **Zero-Dependency:** Runs standalone via internal Electron binary.
- **Micro-Stutter Reduction:** Sets game processes to high priority (`Nice -5`).
- **Smart Engine Prioritization:** Focuses on main game binaries while backgrounding launchers.
- **Auto RAM Cleanup:** Triggers `sudo purge` on exit for freed memory.

---

## 🛠️ Features (v2.7.1)

- **Standalone Architecture:** No external Node.js required.
- **Native Failsafe Engine:** Replaced `sudo-prompt` with `osascript` for secure elevation.
- **Aggressive Kernel-Boost:** `renice -5` for games, `-1` for services.
- **Single-Auth Security:** One password prompt per cold-boot.
- **Updated Game Detection:** Precise parsing for AAA titles (Helldivers 2, TLOU, etc.).
- **Refined Daemon Control:** Options for background persistence or auto-kill.
- **Live RAM HUD:** Non-focusable overlay with memory stats.
- **Adaptive Watchdog:** Prevents memory leaks by managing `MTLCompilerService` and `purge`.
- **Integrated Platform Scanner:** Independent `check_games.js` test script for deep-scanning game installations across internal/external drives (`/Volumes`).

---

## 🔄 Recent Changes & Optimizations (v2.7.1)

During the development of the **Platin GUI Edition (v2.7.1)**, critical core engine components were stabilized, made completely persistent across reboots, and deeply integrated into the GUI:

### 1. Reboot-Safe Trigger Architecture (`main.js` & `helper.js`)
* **Bug Fix:** Previously, the privileged root helper completely deleted the `boost.trigger` file via `fs.unlinkSync()` after reading it. This caused permission conflicts after a macOS reboot, preventing the main user-space app from writing new trigger signals (games remained stuck at standard priority `Mid / 0`).
* **Optimization:** The deletion command was removed. The root helper now atomically clears the file using `fs.writeFileSync(triggerPath, '', 'utf8')` after processing. The file remains physically intact with its original write permissions. The engine detects games within 2 seconds after a system reboot and automatically forces them back into kernel boost mode (`Max / -5`).

### 2. Path Structure Correction for `sendToRootHelper`
* The function communicating with the background service has been fully adapted to the new, clean folder structure.
* Signals are now stored precisely in the central directory `~/Library/Application Support/fps-boost/config/boost.trigger`.
* All PIDs and performance levels are strictly validated as integers (`parseInt`) before transmission to prevent syntax errors within the POSIX shell.

### 3. GUI Integration for Custom Game List (`games_list.txt`)
* **New in Settings:** The parsing interface for the external `games_list.txt` file was successfully migrated and integrated directly into the Settings GUI window.
* **Note:** The deep two-way name resolution and filter heuristics for complex process names within the engine (`checkAndBoostGames`) have been partially reverted for now and will be finalized in an upcoming revision. Management is already handled centrally via the user interface.

---

## 📜 License

MIT License. See LICENSE file for details.
