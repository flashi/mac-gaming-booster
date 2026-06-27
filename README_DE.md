# 🚀 Mac Gaming Booster (Apple Silicon Optimized)

**Version:** 2.6.0 (Core GUI, Dynamic Limiters & Daemon Switching Update)  
**Entwickler:** Mario (flashi)  
**Plattform:** macOS (Architektur: arm64 / Apple Silicon M-Chips)  
**Unterstützte OS-Versionen:** macOS 15 (Sequoia) & macOS 16 (Tahoe) verifiziert  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung (Standalone App Bundle)  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Bitte vor der Nutzung aufmerksam lesen: Diese Anwendung ist **KEIN** Overclocking-Tool und kann nicht zaubern. Sie kann keine zusätzlichen GPU-Kerne auf deinem Mac Studio erschaffen.

Wenn deine Grafikkarte (GPU) bei maximalen Details komplett ausgelastet ist und das Spiel nativ mit 50 FPS läuft, wird dir diese App **NICHT** plötzlich 100 FPS liefern. Die maximale Grafikleistung hängt immer zu 100 % von deiner Hardware ab.

### 💡 Was macht die App tatsächlich?
Die App optimiert die CPU-Kern-Zuweisung, das System-Threading und das Unified Memory Caching von Apple Silicon in Echtzeit:

- **Eliminiert Mikro-Ruckler (Lag Spikes):** Sie verschiebt relevante Spiele-Prozesse in Echtzeit auf die absolute Höchstpriorität (`Nice -5`). Das garantiert deinem Spiel maximale CPU-Zyklen, während die Fensterverwaltung von macOS perfekt flüssig bleibt.
- **Exclusive Cores & Shipping-Engine-Sortierung:** Wenn anspruchsvolle Next-Gen-Spiele starten, erkennt die App intelligente Parallel-Prozesse und priorisiert die schwere Haupt-3D-Engine (`*Shipping.exe` / `u4.exe`) sofort auf MAX-Boost, während unbedeutende Launcher sicher auf einen leisen Hintergrund-Boost (`Nice -1`) gebremst werden.
- **Hintergrund-Schutzschild:** Aktive Browser-Tabs oder Cloud-Prozesse im System werden im Zaum gehalten, damit sie das Frame-Timing des Spiels nicht unterbrechen.
- **Automatisierter RAM-Cleanup:** Sobald ein Spiel geschlossen wird, evakuiert die App im Bruchteil einer Sekunde tote Grafik- und System-Caches (`sudo purge`). Dadurch werden im Handumdrehen Gigabytes an blockiertem Speicher wieder freigegeben.

---

## 🎛️ Visuelle Benutzeroberfläche (GUI)

Hier ist die visuelle Vorschau, wie das neue englischsprachige Einstellungsfenster und die Integration in deine Menüleiste auf dem Mac aussehen:

### 1. Wie das Einstellungsfenster (GUI) auf deinem Bildschirm aussieht:
```text
+-------------------------------------------------------------------+

| 🚀 Mac Gaming Booster - Settings                            [X]   |
+-------------------------------------------------------------------+

|                                                                   |
|  🛡️ Adaptive Core RAM Thresholds (MB)                             |
|  Drag the sliders to configure the app thresholds. Built-in,      |
|  safe hardware minimums apply automatically!                      |
|  ---------------------------------------------------------------  |
|  Soft Buffer Evacuation (Stage 1):                 [ 1500 MB ]    |
|  ( )================================================------------  |
|                                                                   |
|  Compiler Deep-Sleep (Stage 2):                    [  400 MB ]    |
|  ( )====================----------------------------------------  |
|                                                                   |
|  ---------------------------------------------------------------  |
|  📝 Blacklist Management (Ignored Processes)                      |
|  Processes in this list will be ignored by the booster.           |
|  +-------------------------------------------------------------+  |
|  |  [X] steam          [X] crossover      [X] winewrapper      |  |
|  |  [X] electron       [X] winedevice     [X] steamclean       |  |
|  +-------------------------------------------------------------+  |
|  [ + Add Process ]                                                |
|                                                                   |
|  ---------------------------------------------------------------  |
|  ⚙️ Root-Helper Background Service (Daemon)                        |
|  [X] Keep background service active (Variant 1)                   |
|                                                                   |
|  ---------------------------------------------------------------  |
|  🔄 Reset to Defaults                              💾 Save & Close  |
|                                                                   |
+-------------------------------------------------------------------+
```

### 2. Wie das Tray-Menü in deiner macOS-Menüleiste aussieht:
```text
 +---+

 | 🚀|  (Klick auf das Raketen-Icon oben rechts in der Menüleiste)
 +---+--------------------------------------------------+

 | 🟢 MAX-Boost: 📦 007 First Light (PID: 14007)        | <- Live-Status
 | 📊 RAM Overlay On/Off         (Cmd + Alt + R)        |
 | 🚀 Enable FPS Boost           [ Häkchen gesetzt ]    |
 | 🛡️ Enable Adaptive Core       [ Häkchen gesetzt ]    |
 | 📝 Enable Logging             [ Häkchen gesetzt ]    |
 | ⚙️ Start at Login (Autostart) [ Häkchen gesetzt ]    |
 |------------------------------------------------------|
 | 📂 Open Logs Folder                                  |
 | ⚙️ Settings...                                        | <- Öffnet die englische GUI
 |------------------------------------------------------|
 | ❌ Quit App                                          |
 +------------------------------------------------------+
```

---

## 🛠️ Features (v2.6.0 - Platin GUI Edition)

- **🎛️ Integrierte Core-Engine GUI (NEU):** Ein wunderschönes, natives, dunkles Einstellungsfenster auf Englisch ersetzt das händische Editieren von JSON-Dateien. Nutzer können die RAM-Grenzwerte jetzt live über flüssige Schieberegler in Echtzeit anpassen.
- **📝 Integriertes Blacklist-Management (NEU):** Keine unschönen Textdateien mehr im Finder öffnen! Nutzer können ignorierte Prozesse (wie Steam oder Overlays) direkt im Einstellungsfenster per Mausklick über ein Textfeld hinzufügen und über schicke Tags löschen. Die `blacklist.txt` wird beim Speichern vollautomatisch im Hintergrund neu geschrieben.
- **🔄 Unzerstörbarer Reset-Button & Min-Schutz (NEU):** Absolute Idiotensicherheit! Über den Button „Reset to Defaults“ springen alle Regler und die Blacklist sofort zurück auf die goldrichtigen Standardwerte (1500MB / 400MB / Standard-Prozesse). Feste Hardware-Mindestgrenzen (Blockade unter 200MB) verhindern, dass Nutzer ihr System mutwillig einfrieren.
- **🎚️ Wählbare Daemon-Verhaltensweisen (NEU):** Volle Kontrolle über dein System anhand von zwei einstellbaren Varianten:
  - *Variante 1 (Hintergrunddienst aktiv lassen):* Der Helper bleibt nach dem Schließen der App im RAM. Vorteil: Beim nächsten Klick auf den Booster ist das Tool sofort einsatzbereit – **ohne neues Passwort-Fenster**.
  - *Variante 2 (Mitschließen):* Beim Beenden der App sendet die `main.js` einen Selbstzerstörungs-Trigger. Der Helper beendet sich sofort auf macOS-Ebene sauber selbst und hinterlässt **0 Reste im Arbeitsspeicher**.
- **🧹 Automatische Log-Müll-Reparatur (NEU):** Der Root-Helper besitzt nun einen automatischen Selbstreinigungs-Mechanismus. Bei jedem frischen Start wird die `helper_debug.log` komplett geleert und auf 0 Byte zurückgesetzt. Das schont deine SSD-Lebensdauer und verhindert das Zumüllen deines Macs über Wochen.
- **⚡️ Unblockierbare Datei-Trigger-Pipeline:** Verabschiede dich von fehleranfälligen TCP-Ports und macOS-Sandbox-Sperren. Die App kommuniziert über eine unblockierbare, ultraschnelle IPC-Datei-Pipeline im lokalen App-Support-Ordner. Die Haupt-App schreibt die Daten im Startmoment in Millisekunden – der Root-Helper führt sie sofort aus.
- **🚀 Nativer Apple Silicon Sicherheits-Prompt:** Durch die feste Integration deines Raketen-Icons (`rocket.icns`) schaltet macOS den emulierten und ressourcenfressenden Intel-Rosetta-Prompt komplett ab. Das Passwort-Fenster nutzt nun die offizielle, native macOS-Sicherheits-UI mit 0 % CPU-Last.
- **🔍 Intelligenter Sony-Pfad-Detektiv:** Wenn PlayStation-Ports (wie *The Last of Us Part I* oder *Uncharted Legacy of Thieves Collection*) dieselbe kryptische Hintergrund-EXE nutzen, analysiert der Detektiv blitzschnell die echte Ordnerstruktur deiner SSD und trennt die Spiele im Log und HUD kosmetisch zu 100 % fehlerfrei.
- **📊 Live RAM HUD (In-Game Overlay):** Ein rahmenloses, teiltransparentes Performance-Overlay projiziert deine Speicherdaten (`Used GB / Total GB` und `Free MB`) in Echtzeit direkt über dein Spiel. Bei kritischem Speichermangel schaltet die Anzeige automatisch auf **Warn-Rot**.
- **🛡️ Adaptive Core Watchdog (Mit immobilisierender Pause):** Kämpft unbarmherzig gegen extreme Speicherlecks während der DirectX 12 Shader-Kompilierung (z.B. bei *007 First Light* oder *The Last of Us*). Er überarbeitet das System im 30-Sekunden-Takt über native `vm_stat`-Kernel-Hooks (vollständig kalibriert auf die modernen **16 KB Hardware-Pages** von Apple Silicon M-Chips).
  - *Stufe 1 (Sanfte Evakuierung):* Unter dem eingestellten `purgeLimit` (z.B. 1500MB) werden die System-Caches lautlos im Hintergrund geleert.
  - *Stufe 2 (Compiler-Tiefschlaf):* Unter dem eingestellten `pauseLimit` (z.B. 400MB) friert die App den `MTLCompilerService` via Kernel-Signal `SIGSTOP` kontrolliert ein, evakuiert den RAM radikal und taut ihn via `SIGCONT` wieder auf. Shader-Fortschritte gehen nicht verloren und die Ladezeiten halbieren sich!
  - *Stufe 3 (Sicherheits-Notbremse):* Droht das System wegen eines massiven Swap-Staus komplett abzustürzen (Bereich unter 100MB RAM), zerschmettert die App den Compiler sofort hart mit `killall -9`, um eine Kernel Panic garantiert abzuwehren.

---

## 🚀 Kompilierung & Ausführung

## 📜 Lizenz

Dieses Projekt ist Open-Source und unter den Bedingungen der **MIT-Lizenz** lizenziert:

```text
Copyright (c) 2026 Mario (flashi)

Hiermit wird allen Personen, die eine Kopie dieser Software und der zugehörigen 
Dokumentationsdateien erhalten, kostenlos die Erlaubnis erteilt, die Software 
uneingeschränkt zu nutzen, inklusive dem Recht auf Nutzung, Vervielfältigung, 
Änderung, Zusammenführung, Veröffentlichung, Verbreitung, Unterlizenzierung 
und/oder Verkauf von Kopien der Software.

Die Software wird "wie besehen" bereitgestellt, ohne jegliche ausdrückliche 
oder stillschweigende Gewährleistung oder Garantie.
```
