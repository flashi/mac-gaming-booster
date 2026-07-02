# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.8.0 (Platinum GUI Edition) | **Platform:** macOS (arm64) | **Target OS:** macOS 15+  
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

## 📢 COMMUNITY & FEEDBACK (WE NEED YOUR BENCHMARKS!)

We want to make Mac gaming as smooth as possible! Please share your real-world experience, performance changes, and hardware specs directly on our dashboard:

👉 **[Join the Official Feedback & Benchmark Discussion here!](https://github.com/flashi/mac-gaming-booster/discussions/2)**

*Note:* You are welcome to submit your benchmark logs, frame-rate improvements, or feature suggestions in either **English** or **German**! 💬

---

## ⚙️ Features (v2.8.0)

- **Standalone Architecture:** No external Node.js installation required.
- **Native Failsafe Engine:** Replaced legacy `sudo-prompt` with secure privilege elevation handled via `osascript`.
- **Aggressive Kernel Boost:** `renice -5` for verified primary game executables, `-1` for emulation-relevant Wine background processes.
- **Single-Auth Security:** Requires password entry only once per cold boot of the Mac.
- **Updated Game Detection:** Precise parsing for AAA titles (Stalker 2, Cyberpunk 2077, Helldivers 2, TLOU, etc.).
- **Refined Daemon Controls:** Native options for background persistence or auto-kill behaviors.
- **Live RAM HUD:** A click-through, non-focusable overlay displaying real-time memory statistics.
- **Adaptive Watchdog:** Prevents heavy memory leaks by active management of `MTLCompilerService` and `purge`.
- **Integrated Platform Scanner:** Independent test utility `check_games.js` for deep-scanning game installations across internal and external storage drives (`/Volumes`) alongside automatic EXE mapping.

---

## ⚠️ ⚡️ NEW: REVOLUTIONARY LIVE-SWITCHING (NO RESTART REQUIRED!)

* **Real-Time Synchronization:** Toggling the FPS-Boost checkbox in the settings GUI updates active kernel priorities ('Nice -5' to 'Nice 0') in real-time within 2 seconds—**completely eliminating the need for an application restart!**
* **Anti-Log-Spam Suffixes:** Equipped with custom state suffixes (`_reset`), the reset signal fires exactly once. Your log file and SSD remain completely clean and free from repetitive I/O overhead.

---

## 🔄 Recent Changes & Optimizations (v2.8.0)

During the development toward the **Platinum GUI Edition (v2.8.0)**, critical core components of the engine were stabilized, made completely reboot-safe, and highly optimized:

### 1. 100% Space-Safe Path Extraction
* **Problem Solved:** Previously, `.split(' ')` fractured directory structures containing spaces, leading to identification anomalies for games inside folders like `Cyberpunk 2077`.
* **Optimization:** The engine now applies `path.basename` straight to the untouched POSIX path string, and explicitly evaluates `lowerPath` variables across deep regex passes to guarantee seamless translation.

### 2. Clean-RAM Pre-Filtering (`games_exe_mapping.txt`)
* Integrated an atomic `.filter(line => line.length > 0)` safety guard that purges empty rows and faulty carriage returns from memory *before* execution loops commence, shielding the Unified Memory from processing data clutter.

### 3. Native Catch-Block Diagnostic Integration
* Sealed all silent catches across `loadSettings()` and `saveSettings()`. Hard drive permission blockages or corrupted configuration files are now immediately written into the log, including the native macOS system notification (`permission denied`).

---

## 📜 License

MIT License. See LICENSE file for details.
