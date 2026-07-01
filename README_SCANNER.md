# 🎮 Mac Gaming Platform Scanner (`check_games.js`)

**Version:** 2.7.1 (Manifest Edition with EXE Mapping) | **Platform:** macOS (Apple Silicon & Intel) | **Target:** Terminal / Standalone Script  

---

## 💡 Features
- **Zero-Path Clean Output:** Completely hides raw installation paths and platform tags, exporting titles directly as clean lists formatted exclusively with a `🎮 Game Name` prefix.
- **Native Launcher Manifest Parsing:** Replaced slow folder deep-scans with blazing-fast, accurate metadata parsing directly from official launcher backends:
  - **Steam:** Reads `.acf` appmanifest files across local libraries and all connected external drives (now leverages `installdir` for absolute path accuracy).
  - **Epic Games Store:** Parses official `.item` installation manifests.
  - **Battle.net:** Detects active Blizzard titles via structural `.build.info` files.
  - **Heroic Games Launcher:** Automatically extracts verified installations from Heroic's JSON store cache.
- **Intelligent Process & EXE Mapping:** Automatically inspects the installation directory of each discovered game to locate the primary executable file (Windows `.exe` or native Unix/Mac binary).
- **Multi-Exe & Special Character Support:** Bundles compilations with multiple executables into a single entry (such as *Uncharted* mapped to `u4.exe||tll-l.exe`) and remains completely robust against string encoding anomalies (like the `™` character in *The Last of Us*).
- **Dynamic Volume Detection:** Automatically discovers all active external storage devices mounted under `/Volumes`, removing the need to hardcode paths.
- **Smart System Filtering & Blacklist:** Leverages a built-in architectural blacklist to suppress naked storefronts, framework utilities, bonus soundtracks, artbooks, and development SDKs.
- **Automatic GUI Sync:** Atomically exports the deduplicated, sorted list straight into your application configuration folder, generating two essential files for immediate consumption by the main booster engine:
  - `games_list.txt` (Clean title list for GUI rendering)
  - `games_exe_mapping.txt` (Process-to-name mapping key-pairs for the core kernel booster)

---

## 🚀 How to Run

1. Open your macOS Terminal.
2. Navigate to your project folder:
   ```bash
   cd ~/Path/to/your/mac-gaming-booster
   ```
3. Run the scanner using Node.js:
   ```bash
   node check_games.js
   ```

   ```
