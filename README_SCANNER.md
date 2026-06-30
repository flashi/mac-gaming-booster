# 🎮 Mac Gaming Platform Scanner (`check_games.js`)

**Version:** 2.7.1 (Manifest Edition) | **Platform:** macOS (Apple Silicon & Intel) | **Target:** Terminal / Standalone Script  

---

## 💡 Features
- **Zero-Path Clean Output:** Completely hides raw installation paths and platform tags, exporting titles directly as clean lists formatted exclusively with a `🎮 Game Name` prefix.
- **Native Launcher Manifest Parsing:** Replaced slow folder deep-scans with blazing-fast, accurate metadata parsing directly from official launcher backends:
  - **Steam:** Reads `.acf` appmanifest files across local libraries and all connected external drives.
  - **Epic Games Store:** Parses official `.item` installation manifests.
  - **Battle.net:** Detects active Blizzard titles via structural `.build.info` files.
  - **Heroic Games Launcher:** Automatically extracts verified installations from Heroic's JSON store cache.
- **Dynamic Volume Detection:** Automatically discovers all active external storage devices mounted under `/Volumes`, removing the need to hardcode paths.
- **Smart System Filtering & Blacklist:** Leverages a built-in architectural blacklist to suppress naked storefronts, framework utilities, bonus soundtracks, artbooks, and development SDKs.
- **Automatic GUI Sync:** Atomically exports the deduplicated, sorted list straight into your application configuration folder (`~/Library/Application Support/fps-boost/config/games_list.txt`) for immediate consumption by the main booster engine.

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
