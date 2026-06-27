# Mac Gaming Booster (v2.6.0 Platin)

A lightweight, native background utility designed for Apple Silicon Macs to combat aggressive memory leaks, shader compilation stutters, and system crashes during high-end Windows gaming via CrossOver/GPTK.

---

## 🔬 Test System & Hardware Profile

All stability benchmarks and stress tests are performed on a high-end production machine to evaluate performance under realistic extended gaming sessions.

* **Hardware:** Mac Studio (Apple Silicon M4 Max)
* **Memory:** 36 GB Unified Memory
* **Software Environment:** macOS 15+ / CrossOver 26.2.0+ (DirectX 12 Translation Layer)
* **Testing Configuration:** Native **1440p (WQHD)**, **Maximized/Ultra Graphic Settings**, **NO AI Upscaling** (FSR / DLSS / XeSS disabled).
* **Target Duration:** Minimum 2 Hours continuous gameplay per title.

---

## 📊 Real-World Log Analysis & Hard Facts

The actual log files are stored in the `/Logs` directory of this repository. Below is the unembellished technical analysis of how the application alters system behavior under extreme gaming stress.

### 1. Uncharted: Legacy of Thieves Collection
* **The Problem (Without App):** This title suffers from an aggressive VRAM/RAM memory leak during DX12-to-Metal translation. Running natively at 1440p on Ultra settings without FSR quickly exhausts the 36GB Unified Memory within 45–60 minutes, forcing macOS into massive SSD Swap operations, leading to severe frame drops (micro-stuttering) and potential crashes.
* **Test Duration with Booster:** 2 Hours, 39 Minutes, 1 Second.
* **Observed Behavior & Logs:**
  * The **Adaptive Core Watchdog** successfully caught multiple critical drops where available system RAM plunged into the **200MB - 500MB danger zone** (e.g., Log timestamp `10:50:51 PM: Memory Critical - 229 MB free`).
  * The utility instantly executed an emergency eviction of inactive system caches and temporarily forced the `MTLCompilerService` into deep sleep for exactly **2 seconds** to relieve immediate memory pressure.
  * **The Result:** The system never entered a critical swapping spiral. SSD Swap utilization remained static at an uncritical **1.48 GB**. Despite the brutal native workload, the game stayed perfectly smooth over the entire 2.5-hour duration without a single crash or graphical artifact.

### 2. 007 First Light (IO Interactive)
* **The Problem (Without App):** A brand-new, ultra-heavy 2026 AAA title. Due to translation bottlenecks, compiling the immense volume of DX12 shaders during initialization usually gridlocks the machine, forcing a painful **20-minute wait time** at startup. Extended play without memory management completely fills both RAM and SSD Swap, historically resulting in frozen screens, graphical artifacts, and catastrophic **Kernel Panics**.
* **Test Duration with Booster:** 2 Hours, 47 Minutes, 58 Seconds.
* **Observed Behavior & Logs:**
  * **Shader Load-Time Reduction:** The initial shader compilation phase was successfully compressed from **20 minutes down to 2–3 minutes** (an approximate 85% speed increase) by continuously flushing accumulated translation garbage.
  * Throughout active gameplay, the application dynamically maintained a stable safety cushion of **approximately 5 GB of free physical RAM**, safely keeping the system clear of the macOS kernel-panic threshold.
  * **Honest Performance Note:** Running at native 1440p on Maximum graphics without any AI-upscaling helper maxes out the GPU raw power. In heavy battle scenes with lots of action, frame rates dropped below 30 FPS. However, thanks to the booster, **zero graphical artifacts occurred**, and the system remained 100% stable without a single hitch or freeze right up to the last second (`11:51:54 PM`).

---

## 🛡️ Core Mechanics & Architecture

The application functions as a strict non-sudo supervisor that communicates with a privileged root-helper via file-triggers (`boost.trigger`).

* **Stage 1: Soft Buffer Evacuation (Configurable: 1000MB - 3000MB)**
  Monitors system-wide memory pressure. When available memory falls below the threshold, it triggers a non-disruptive, native memory purge to clear dead caches before macOS is forced to swap to disk.
* **Stage 2: Compiler Deep-Sleep (Configurable: 200MB - 800MB)**
  An emergency breaker. If memory drops to unsafe levels during heavy asset streaming or shader loading, the app temporarily halts the `MTLCompilerService` to prevent a hard system freeze or a hardware-protective Kernel Panic.
* **Sandbox Breaker Architecture:**
  Features a **Platin Dependency Check** at the absolute code entry point, ensuring the app terminates instantly if no Node.js runtime is found, entirely preventing ghost background processes.

---

## ⚙️ Prerequisites & Installation

### For Regular Users (Pre-compiled App)
The application is entirely portable and does not require terminal manipulation. However, due to macOS security architectures, a local Node.js installation is mandatory for the root helper to communicate with the system kernel.

1. **Install Node.js** (If not already present):
   * Open Terminal and type: `brew install node`
   * *Or:* Download the official package installer from [nodejs.org](https://nodejs.org).
2. **Download the App:** Grab the latest release from the GitHub Releases tab.
3. **Launch:** Run the application. Authorize the native macOS administrator prompt once to grant `renice` privileges to the kernel manager.

### For Developers (Source Code)
```bash
git clone https://github.com
cd mac-gaming-booster
npm install
npm start
```

---

## ⚠️ Important System Safety Note
To ensure the combination of your Mac, CrossOver, and this booster remains completely stable: **Always maintain at least 20 to 30 GB of free space on your internal macOS SSD.** This ensures that even during unexpected memory spikes, the operating system retains its native emergency breathing room.
