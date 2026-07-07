# 🚀 Mac Gaming Booster (v2.8.1)

> [!CAUTION]
> ### 🛑 IMPORTANT: REALISTIC EXPECTATIONS (NO FPS MIRACLES!)
> This app is **NOT** an overclocking utility. It optimizes system resource scheduling and evacuates dead memory caches, but it cannot bypass physical hardware limits. It ensures 100% of your Mac's power goes directly into your game for the smoothest frame pacing possible!

## 🌟 What's New in v2.8.1

### ⚙️ HUD Optimization: Booster Engine
The real-time monitoring HUD now features the **Booster Engine** status indicator. It measures the precise processing speed and communication latency between the booster layer and the macOS Kernel. 
* **Dynamic Benchmarking:** Status ranges smoothly between `⚡️ OPTIMAL`, `⚡️ GOOD`, and `⏳ HEAVY LOAD` based on live millisecond calculations.

### 🛡️ Adaptive Shader Guard (Anti-Panic Protection)
During heavy shader compilation (e.g., in AAA titles like *007: First Light*), the native macOS `MTLCompilerService` tends to leak memory severely, threatening a total system freeze (Kernel Panic). The **Adaptive Shader Guard** dynamically saves the system:
* **Deep Sleep:** If memory gets tight, it temporarily freezes the compiler, evacuates inactive RAM caches, and wakes it back up.
* **Emergency Hard Kill:** If free RAM drops below 100MB, it forcefully terminates the compiler before a crash occurs, forcing macOS to restart the service cleanly with fresh memory.
* **💥 THE BENCHMARK:** Unoptimized, shader compilation crawls and throttles heavily, taking up to **20 minutes**. With the Booster active, the process is safely locked into high-performance cores, finishing in a lightning-fast **1:50 minutes**—a massive **10x speed-up**!

---

## 🛠️ Fixed & Resolved Issues (v2.8.1 Fixes)

### 🔄 1. macOS Autostart Integration (Login Items)
* **Fixed:** The application failed to launch at system login in newer production builds.
* **Solution:** Re-integrated Electron's native `app.setLoginItemSettings`. Added the mandatory `path: app.getPath('exe')` argument to ensure modern macOS versions (Ventura, Sonoma, Sequoia) accept the entry from packaged `.app` bundles. Removed the deprecated `openAsHidden` flag.
* **Self-Healing Pathing:** If you move the application inside the Finder, the Autostart entry will temporarily break. However, launching the app manually **just once** at its new location triggers a self-healing protocol that automatically rewrites the correct path into the macOS Login Items database.

### 🧹 2. Persistent Root Helper Resource Cleanup (Variant 2)
* **Fixed:** When the app was closed or quit via `Cmd + Q`, the privileged root helper (`helper.js`) remained active in the background, consuming resources due to strict macOS permissions blocking raw `pkill` execution.
* **Solution:** Switched the exit hook from `will-quit` to `before-quit` to intercept the macOS termination sequence early. Implemented a forced file system flush using `fs.fsyncSync()` to guarantee that the `boost.trigger` file (`{"action":"kill"}`) is written to the SSD before macOS terminates the main process.

### 📂 3. Path Alignment & Event Loop Bug
* **Fixed:** The main app and the root helper were looking into mismatched directories for the control trigger, causing shutdown signals to fail. Also, active intervals were keeping Electron's environment open during exit.
* **Solution:** Unified all communication paths to look strictly into the `/config/boost.trigger` subfolder. Cleared a hidden bug where the active `vm_stat` memory polling interval was locking Electron's event loop, by cleanly registering its ID and executing `clearInterval()` during the exit routine.

### 🎯 4. HUD Window Position Persistence
* **Fixed:** Moving the HUD live saved the new coordinates to the JSON configuration, but restarting the app reset the HUD back to its default screen coordinates.
* **Solution:** Upgraded the `BrowserWindow` generation inside `toggleRamOverlay()`. Replaced the hardcoded screen dimensions with dynamic loaders pointing directly to your loaded `overlayX` and `overlayY` variables.

### 🛡️ 5. Log Overload Protection
* **Fixed:** Running the booster for weeks without a system reboot caused the logging system to grow endlessly via sequential file streams.
* **Solution:** Implemented an automated **1MB safety cap** (Log Rotation) for both the main application and the root helper logs to prevent infinite file size growth during weeks of uptime.

### ⚡️ 6. Kernel Priority & Scheduling Upgrade (MAX-Boost)
* **Fixed:** The previous version only applied a moderate priority increase (`renice -5`), which allowed macOS to still throttle the game process during heavy loads.
* **Solution:** Upgraded the Root Helper backend engine to execute maximum UNIX priority scheduling. The app now successfully fires the ultimate optimization chain: `taskpolicy -B -p [PID] && renice -20 -p [PID]`. This forces the macOS Kernel to fully lock the game into high-performance cores with zero background interference.


## 📜 License

MIT License. See LICENSE file for details.