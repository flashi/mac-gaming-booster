# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.7.0 | **Platform:** macOS (arm64) | **Target OS:** macOS 15+  
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

## 🛠️ Features (v2.7.0)

- **Standalone Architecture:** No external Node.js required.
- **Native Failsafe Engine:** Replaced `sudo-prompt` with `osascript` for secure elevation.
- **Aggressive Kernel-Boost:** `renice -5` for games, `-1` for services.
- **Single-Auth Security:** One password prompt per cold-boot.
- **Updated Game Detection:** Precise parsing for AAA titles (Helldivers 2, TLOU, etc.).
- **Refined Daemon Control:** Options for background persistence or auto-kill.
- **Live RAM HUD:** Non-focusable overlay with memory stats.
- **Adaptive Watchdog:** Prevents memory leaks by managing `MTLCompilerService` and `purge`.

---

## 📜 License

MIT License. See LICENSE file for details.
