# 🎮 Mac Gaming Plattform Scanner (`check_games.js`)

**Version:** 2.7.1 (Manifest Edition) | **Plattform:** macOS (Apple Silicon & Intel) | **Ziel:** Terminal / Eigenständiges Skript  

---

## 💡 Features
- **Bereinigte plattformfreie Ausgabe:** Blendet rohe Pfadangaben und Plattform-Tags vollständig aus. Alle verifizierten Titel werden sauber und direkt im Format `🎮 Spielname` ausgegeben.
- **Nativer Launcher-Manifest-Scan:** Ersetzt langsame Ordner-Tiefensuchen durch extrem schnelles und präzises Auslesen der offiziellen Launcher-Datenbanken:
  - **Steam:** Analysiert `.acf`-Appmanifest-Dateien auf lokalen sowie allen angeschlossenen externen Laufwerken.
  - **Epic Games Store:** Parst die offiziellen `.item`-Installationsmanifeste.
  - **Battle.net:** Erkennt aktive Blizzard-Titel direkt über strukturelle `.build.info`-Dateien.
  - **Heroic Games Launcher:** Extrahiert installierte Epic- und GOG-Spiele vollautomatisch aus dem lokalen JSON-Store-Cache.
- **Dynamische Laufwerkserkennung:** Erkennt alle aktiv gemounteten externen Speichermedien unter `/Volumes` vollautomatisch, ohne dass Pfade fest im Code hinterlegt werden müssen.
- **Intelligente System-Filterung & Blacklist:** Nutzt eine minimierte technische Blacklist, um nackte Launcher-Anwendungen, System-Frameworks, Bonus-Soundtracks, Artbooks oder Entwickler-SDKs präzise auszusortieren.
- **Automatischer GUI-Export:** Schreibt die duplikatfreie, sortierte Spieleliste direkt in die v2.7.1 Ordnerstruktur (`~/Library/Application Support/fps-boost/config/games_list.txt`), wodurch die Settings-GUI der Haupt-App sofort live gefüttert wird.

---

## 🚀 Ausführung

1. Öffne das macOS Terminal.
2. Wechsle in deinen Projektordner:
   ```bash
   cd ~/Pfad/zu/deinem/mac-gaming-booster
   ```
3. Starte den Scanner über Node.js:
   ```bash
   node check_games.js
   ```
