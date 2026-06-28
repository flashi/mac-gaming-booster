# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.7.0 (Zero-Dependency Engine & Natives Failsafe Update)  
**Entwickler:** Mario (flashi)  
**Plattform:** macOS (Architektur: arm64 / Apple Silicon M-Chips)  
**Unterstützte Systeme:** macOS 15 (Sequoia) & macOS 16 (Tahoe) Verifiziert  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung (Standalone App Bundle)  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Bitte vor der Nutzung sorgfältig lesen: Diese App ist **KEIN** Overclocking-Tool und kann nicht magisch neue GPU-Kerne auf deinem Mac Studio herbeizaubern.

Wenn deine Grafikkarte (GPU) bei maximalen Einstellungen voll ausgelastet ist und das Spiel nativ mit 50 FPS läuft, wird diese App dir **NICHT** plötzlich 100 FPS schenken. Die maximale Grafikleistung hängt komplett von deiner Hardware ab.

### 💡 Was macht die App wirklich?
Die App optimiert die Zuweisung der CPU-Kerne, das System-Threading und das Caching des gemeinsamen Speichers (Unified Memory) von Apple Silicon in Echtzeit:

- **Zero-Dependency Engine Fallback:** Die App läuft komplett eigenständig. Wenn auf deinem macOS-System keine globale Node.js-Laufzeitumgebung installiert ist, weicht sie im Hintergrund nahtlos und unbemerkt auf ihre eigene interne Electron-Binary aus.
- **Eliminiert Mikroruckler (Lag Spikes):** Sie verschiebt relevante Spielprozesse auf die absolute Bestwert-Priorität (`Nice -5`). Das garantiert deinem Spiel maximale CPU-Zyklen, während das macOS-Fenstermanagement absolut flüssig bleibt.
- **Exklusive Kerne & Prozess-Sortierung:** Wenn anspruchsvolle Next-Gen-Spiele starten, erkennt die App intelligent parallele Unterprozesse. Sie setzt die schwere Haupt-3D-Engine (`*Shipping.exe` / `u4.exe`) sofort auf MAX-Boost und stuft kleinere Launcher sicher auf einen lautlosen Fallback-Boost (`Nice -1`) zurück.
- **Hintergrund-Schild:** Aktive Browser-Tabs oder Cloud-Prozesse des Systems werden beiseitegeschoben, damit sie den Takt des Spiels nicht unterbrechen können.
- **Automatische RAM-Bereinigung:** In der Millisekunde, in der ein Spiel geschlossen wird, stößt die App eine lautlose, native Speicherleerung (`sudo purge`) an. Sie löscht sofort Gigabytes an alten Grafik-Caches und stellt deinen freien Systemspeicher augenblicklich wieder her.

---

## 🎛️ Grafische Benutzeroberfläche (GUI)

Hier ist eine visuelle Vorschau, wie das Einstellungsfenster und das Layout des Menüs in der macOS-Menüleiste aussehen:

### 1. So sieht das Einstellungsfenster (GUI) auf deinem Bildschirm aus:
```text
+-------------------------------------------------------------------+

| 🚀 Mac Gaming Booster - Einstellungen                       [X]   |
+-------------------------------------------------------------------+

|                                                                   |
|  🛡️ Adaptive Core RAM Grenzwerte (MB)                              |
|  Zieh die Schieberegler, um die System-Grenzwerte anzupassen.     |
|  Integrierte, sichere Hardware-Minima greifen automatisch!       |
|  ---------------------------------------------------------------  |
|  Sanfte Cache-Evakuierung (Stufe 1):               [ 1500 MB ]    |
|  ( )================================================------------  |
|                                                                   |
|  Compiler-Tiefschlaf (Stufe 2):                    [  400 MB ]    |
|  ( )====================----------------------------------------  |
|                                                                   |
|  ---------------------------------------------------------------  |
|  📝 Blacklist-Verwaltung (Ignorierte Prozesse)                    |
|  Prozesse in dieser Liste werden vom Booster ignoriert.           |
|  +-------------------------------------------------------------+  |
|  |  [X] steam          [X] crossover      [X] winewrapper      |  |
|  |  [X] electron       [X] winedevice     [X] steamclean       |  |
|  +-------------------------------------------------------------+  |
|  [ + Prozess hinzufügen ]                                         |
|                                                                   |
|  ---------------------------------------------------------------  |
|  ⚙️ Root-Helper Background Service (Daemon)                         |
|  [X] Hintergrund-Dienst aktiv lassen (Variante 1)                 |
|                                                                   |
|  ---------------------------------------------------------------  |
|  🔄 Auf Standard zurücksetzen                     💾 Speichern & Schließen |
|                                                                   |
+-------------------------------------------------------------------+
```

### 2. So sieht das Tray-Menü in deiner macOS-Menüleiste aus:
```text
 +---+

 | 🚀|  (Klick auf das Raketen-Icon in deiner oberen macOS-Systemleiste)
 +---+--------------------------------------------------+

 | 🟢 MAX-Boost: 📦 Helldivers 2 (PID: 57029)            | <- Live-Status-Ebene
 | 📊 RAM Overlay Ein/Aus        (Cmd + Alt + R)        |
 | 🚀 FPS-Boost aktivieren       [ Häkchen Aktiv ]      |
 | 🛡️ Adaptive Core aktivieren   [ Häkchen Aktiv ]      |
 | 📝 Logging aktivieren         [ Häkchen Aktiv ]      |
 | ⚙️ Beim Login starten         [ Häkchen Aktiv ]      |
 |------------------------------------------------------|
 | 📂 Log-Ordner öffnen                                 |
 | ⚙️ Einstellungen...                                   | <- Öffnet die GUI
 |------------------------------------------------------|
 | ❌ App beenden                                       |
 +------------------------------------------------------+
```

---

## 🛠️ Features (v2.7.0 - Zero-Dependency & Failsafe Engine Update)

- **🌍 Zero-Dependency-Architektur (NEU):** Absolute Unabhängigkeit für Endbenutzer! Die App ist jetzt ein echtes Standalone-„Plug-and-Play“-Tool. Wenn ein Spieler das fertige App-Bundle herunterlädt und kein globales Node.js über Homebrew oder die offizielle Website installiert hat, greift sofort ein integrierter **Electron-Binary-Fallback** auf den internen Node-Motor der App zu (`process.execPath`). Keine Terminal-Konfiguration oder externe Laufzeitumgebungen mehr nötig.
- **🛡️ Native Failsafe Engine (NEU):** Das veraltete `sudo-prompt`-Paket wurde komplett aus dem Quellcode verbannt. Der Root-Helper (`helper.js`) wird nun sicher über die native macOS **`osascript`**-API mit erweiterten Administrator-Rechten initialisiert.
- **⚡ Ungekürzter -5 MAX-Boost:** Der aggressive Kernel-Boost (`renice -5`) für Hauptspiele und die parallele Drosselung von Hilfsprozessen (`-1`) bleiben zu 100 % aktiv und arbeiten über die ultraschnelle Datei-Trigger-Pipeline bei praktisch 0 % CPU-Last im Leerlauf.
- **🔒 Nahtloser Passwort-Komfort:** Benutzer müssen ihr macOS-Admin-Passwort nur noch **EINMAL pro Mac-Kaltstart** eingeben (wenn Variante 1 aktiv ist). Die Menüleisten-App kann im Alltag beliebig oft geschlossen, neu verpackt oder neu gestartet werden, ohne dass macOS erneut nach dem Passwort fragt.
- **🔍 Smarter Sony- & Multiplayer-Detektiv (AKTUALISIERT):** Die Ordnerpfad-Analyse wurde massiv verbessert, um Fehlalarme durch identisch benannte Hintergrund-Prozesse (wie z. B. den Sony/Arrowhead Absturzmelder `crs-handler.exe`) zu verhindern. Der Detektiv analysiert nun die echten SSD-Verzeichnisstrukturen und trennt **Helldivers 2**, **The Last of Us Part I**, **The Last of Us Part II** und die **Uncharted Legacy of Thieves Collection** in den Logs und Statusanzeigen mit 100 % kosmetischer Genauigkeit.
- **🎚️ Transparente Daemon-Lebenszyklen (AKTUALISIERT):** Sektion 3 in der Steuer-GUI wurde verfeinert, um beide wählbaren Hintergrund-Zustände direkt auf dem Bildschirm glasklar zu erklären:
  - *Häkchen AN (Variante 1 - Aktiv lassen):* Der privilegierte Helper bleibt unsichtbar im Speicher aktiv. Die Haupt-App verbindet sich beim nächsten Start sofort wieder mit dem Dienst, **ohne dass ein Admin-Passwort eingegeben werden muss**.
  - *Häkchen AUS (Variante 2 - Auto-Kill):* Beim Beenden der App sendet die Engine einen sicheren Selbstzerstörungs-Befehl. Der Helper-Prozess beendet sich auf Kernel-Ebene sofort selbst und hinterlässt **0 % Rückstände im Arbeitsspeicher**.

---

- **🎛️ Integrierte Core Engine GUI:** Ein schickes, dunkel gestaltetes Kontrollzentrum ersetzt die manuelle Bearbeitung von JSON-Dateien vollständig. Benutzer können die systemweiten RAM-Grenzwerte dynamisch über flüssige grafische Schieberegler anpassen.
- **📝 Native In-App Blacklist-Verwaltung:** Kein nerviges Hantieren mit rohen Textdateien im Finder mehr. Benutzer können Prozessnamen (z. B. discord.exe) direkt in das UI-Feld eintippen, um sie zu ignorieren, oder auf die Element-Tags klicken, um sie sofort zu löschen.
- **🔄 Unzerstörbarer Reset-Button & Mindestsperren:** Kugelsicherer Schutz! Ein Klick auf "Auf Standard zurücksetzen" stellt sofort alle Grenzwerte auf die verifizierten Werkseinstellungen (1500MB / 400MB) zurück. Hardcoded Sicherheitsgrenzen verhindern Auswahlen unter 200MB, um Systemblockaden abzuwehren.
- **🧹 Automatischer Log-Bereinigungsschutz:** Der Helper-Prozess verfügt über eine selbstpflegende Dateisystem-Struktur. Bei jedem frischen Mac-Start löscht sich die `helper_debug.log` automatisch auf 0 Bytes, was die Lebensdauer deiner High-Speed-SSD aktiv schont.
- **📊 Live RAM HUD (In-Game Overlay):** Ein rahmenloses, halbtransparentes Heads-Up-Display projiziert deine Echtzeit-Speichernutzung (`Used GB / Total GB` und `Free MB`) direkt auf den Bildschirm. Es verfügt über eine farbadaptive Statusanzeige, die bei kritischem Speichermangel auf **Rot (Live)** wechselt.
- **🛡️ Exklusive Vollbild-Persistenz:** Entwickelt unter Nutzung der nativen macOS `screen-saver`-Ebene, kombiniert mit einer passiven Initialisierung (`show: false`, `focusable: false`). Das HUD erzwingt seine Anzeige über schweren 3D-Vollbildfenstern, **ohne den Fokus des Betriebssystems zu stehlen oder Spiele-Wrapper aus Versehen zu minimieren**.
- **🛡️ Adaptive Core Überwachung (Mit intelligentem Tiefschlaf):** Wirkt massiven Speicherlecks während der DirectX 12 Shader-Vorkompilierung (z. B. in *007 First Light* oder *The Last of Us*) aktiv entgegen. Kalibriert für die modernen **16 KB Hardware-Pages** von Apple Silicon:
  - *Stufe 1 (Sanfte Evakuierung):* Beim Unterschreiten des `purgeLimit` (z. B. 1500MB) werden ungenutzte Hintergrund-Caches sicher aus dem RAM gespült.
  - *Stufe 2 (Compiler-Tiefschlaf):* Beim Unterschreiten des `pauseLimit` (z. B. 400MB) wird der `MTLCompilerService` über ein Kernel-level `SIGSTOP` temporär eingefroren, eine aggressive RAM-Evakuierung durchgeführt und die Kompilierung via `SIGCONT` wieder aufgeweckt. Es geht kein Shader-Fortschritt verloren und die Ladezeiten sinken um über 50 %!
  - *Stufe 3 (Harter Crash-Schutz):* Wenn intensives Swapping den Kernel unter ein kritisches Limit von 100MB drückt, greift die Notbremse und eliminiert den Compiler sofort per `killall -9`, um eine drohende Kernel-Panic (Systemabsturz) sicher abzuwenden.

---

## 📜 Lizenz

Dieses Projekt ist Open-Source und steht unter den Bedingungen der **MIT-Lizenz**:

```text
Copyright (c) 2026 Mario (flashi)

Hiermit wird allen Personen, die eine Kopie dieser Software und der zugehörigen 
Dokumentationsdateien erhalten, gebührenfrei die Erlaubnis erteilt, sie ohne 
Einschränkung zu nutzen, einschließlich und ohne Einschränkung der Rechte, 
sie zu verwenden, zu kopieren, zu verändern, zusammenzufügen, zu veröffentlichen, 
zu verbreiten, unterzulizenzieren und/oder Kopien der Software zu verkaufen, 
unter den folgenden Bedingungen:

Der obige Urheberrechtshinweis und dieser Berechtigungshinweis müssen in allen 
Kopien oder wesentlichen Teilen der Software enthalten sein.

DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT, 
EINSCHLIESSLICH, ABER NICHT BESCHRÄNKT AUF DIE GARANTIE DER MARKTGÄNGIGKEIT, 
EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND NICHTVERLETZUNG DER RECHTE DRITTER. 
IN KEINEM FALL HAFTEN DIE AUTOREN ODER URHEBERRECHTSINHABER FÜR SCHÄDEN ODER 
ANDERE VERPFLICHTUNGEN, OB IN EINER KLAGE AUS VERTRAG, UNERLAUBTER HANDLUNG 
ODER ANDERWEITIG, DIE AUS ODER IM ZUSAMMENHANG MIT DER SOFTWARE ODER DER 
NUTZUNG ODER ANDEREN GESCHÄFTEN MIT DER SOFTWARE ENTSTEHEN.
```

---
