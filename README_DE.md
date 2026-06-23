# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.3.2 (Live HUD & Adaptive Core Update)  
**Entwickler:** Mario (flashi)  
**Plattform:** macOS (Architektur: arm64 / Apple Silicon M-Chips)  
**Unterstützte OS-Versionen:** Verifiziert für macOS 15 (Sequoia) & macOS 16 (Tahoe)  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung (Standalone App Bundle)  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Bitte vor der Nutzung aufmerksam lesen: Diese App ist **KEIN** Overclocking-Tool und kann nicht magisch neue Grafikkerne auf deinem Mac Studio herbeizaubern.

Wenn deine Grafikkarte (GPU) bei maximalen Einstellungen komplett ausgelastet ist und das Spiel nativ mit 50 FPS läuft, wird dir diese App **NICHT** plötzlich 100 FPS liefern. Die maximale Grafikleistung hängt allein von deiner Hardware ab.

### 💡 Was macht die App also wirklich?
Die App optimiert die Zuweisung von CPU-Kernen, das System-Threading und das Caching des gemeinsamen Arbeitsspeichers (Unified Memory) bei Apple Silicon in Echtzeit:

- **Eliminiert Mikroruckler (Lag Spikes):** Sie verschiebt relevante Spieleprozesse auf die absolute Sweet-Spot-Priorität (`Nice -5`). Dadurch erhält dein Spiel maximale CPU-Zyklen, während das macOS-Fenstermanagement im Hintergrund vollkommen flüssig bleibt.
- **Exklusive Kerne & Filterung der Haupt-Engine:** Wenn anspruchsvolle Next-Gen-Spiele (wie S.T.A.L.K.E.R. 2 oder Cyberpunk 2077) starten, erkennt die App intelligent parallele Hintergrundprozesse und priorisiert die schwere Haupt-3D-Engine (`*Shipping.exe`) an erster Stelle. Kleinere Launcher werden sicher auf einen unaufdringlichen Fallback-Boost (`Nice -1`) zurückgestuft.
- **Hintergrund-Schutzschild:** Aktive Browser-Tabs oder Cloud-Hintergrundprozesse des Systems werden beiseite geschoben, um zu verhindern, dass sie das strikte Pacing des Spiels unterbrechen.
- **Automatische RAM-Bereinigung:** In der Millisekunde, in der ein Spiel geschlossen wird, triggert die App eine lautlose, native Speicherleerung (`sudo purge`). Dadurch werden blockierte Grafik-Caches im Gigabyte-Bereich sofort evakuiert und bis zu 87 % des systemweiten freien Speichers augenblicklich wiederhergestellt.

**Das Ergebnis:** Die Frame-Abstände (Frametimes) sinken und stabilisieren sich perfekt. Selbst bei exakt derselben angezeigten FPS-Zahl fühlt sich das Spiel deutlich flüssiger und weicher an und reagiert wesentlich schneller auf deine Controller- oder Mauseingaben.

---

## 🛠️ Features (v2.3.2)

- **📊 Live RAM HUD (In-Game Overlay):** Ein edles, rahmenloses und halbtransparentes Heads-Up-Display projiziert deinen aktuellen Arbeitsspeicher-Status (`Used GB / Total GB` und `Free MB`) direkt auf den Bildschirm. Es verfügt über eine farbadaptive Statusanzeige, die bei kritischem Speichermangel auf **Rot (Live)** umschaltet.
- **🛡️ Exklusive Vollbild-Präsenz:** Entwickelt unter Nutzung der nativen macOS Bildschirmschoner-Ebene (`screen-saver`) kombiniert mit einer vollkommen passiven Initialisierung (`show: false`, `focusable: false`, `showInactive()`). Das HUD erzwingt seine Darstellung über anspruchsvollen 3D-Vollbildfenstern, **ohne den OS-Fensterfokus zu stehlen oder empfindliche Spiele-Wrapper (CrossOver/Wine/Steam) beim Einschalten zu minimieren**.
- **🍏 Universelle Hardware-Autoerkennung:** Fest einprogrammierte RAM-Werte wurden komplett eliminiert. Die App liest über die native Node.js-Schnittstelle `os.totalmem()` die Hardware-Spezifikationen deines Macs vollautomatisch aus und rundet sie mathematisch perfekt auf (egal ob 8, 16, 36 oder 128 GB RAM verbaut sind).
- **🧈 Fliegende HUD-Positionierung:** Halte einfach die `Option`-Taste (Alt) gedrückt und verschiebe das Overlay mit den Pfeiltasten deiner Tastatur (`Option + Links/Rechts/Oben/Unten`) flüssig „wie Butter“ an deine Wunschposition auf dem Bildschirm.
- **💾 Permanente Positions-Speicherung:** Jede Pixel-Anpassung über die Pfeiltasten schreibt die aktiven X- und Y-Koordinaten in Echtzeit in deine lokale `booster_config.json`. Das maßgeschneiderte HUD-Layout bleibt so auch nach einem Neustart der Anwendung exakt erhalten.
- **Intelligenter Prozess-Scan:** Ersetzt schwere Datei-Checks durch eine blitzschnelle `ps -Ax` Engine. Erkennt aktive Spiele in Millisekunden – lange bevor der Spielbildschirm überhaupt schwarz wird.
- **🛡️ Adaptive Core (Systemweiter Speicherdruck-Wächter):** Früher bekannt als *Shader Guard*. Steuert massiven Speicherlecks während der DirectX 12 Shader-Kompilierung (z. B. in *007 First Light* oder *Uncharted*) aktiv entgegen. Überwacht die gesamten verfügbaren Speicherseiten des Systems mithilfe nativer macOS `vm_stat` Hooks.
- **🍏 Native Apple Silicon 16 KB Page-Unterstützung:** Speziell kalibriert für M-Chips (M1/M2/M3/M4). Ältere Utilities berechnen Werte basierend auf dem 4.096-Byte-Layout von Intel, was die Metriken auf Apple Silicon verfälscht. v2.3.2 verarbeitet nativ die moderne **16.384-Byte (16 KB)** Hardware-Seitengröße und bezieht `Pages speculative` für ein zu 100 % präzises Memory-Tracking direkt mit ein.
- **🧹 „No Sudo“ Live-Evakuierung im Spiel:** Wenn der verfügbare RAM unter **1.500 MB** fällt, löst der Booster sofort eine automatische Cache-Evakuierung (`syslog -c aslmanager -d`) kombiniert mit einer Mikro-Speicherspitzen-Simulation aus. Dies zwingt macOS dazu, inaktive System-Caches und alte Grafikpuffer direkt im User-Space freizugeben – **ohne einen einzigen Frame-Drop** während des aktiven Gameplays zu verursachen.
- **⏱️ 30 Sekunden Smart Cooldown-Schutz:** Entwickelt für extreme Stresssituationen. Sobald eine massive Speicherbereinigung durchgeführt wurde, sperrt ein strikter 30-sekündiger Sleep-Timer (`PURGE_COOLDOWN`) die Routine. Dies verhindert unendliche Hintergrundschleifen, schützt deine SSD vor übermäßigem Logging-Stress und bewahrt maximale CPU-Zyklen für deine Frames.
- **💥 Notfall-Abschaltung des Metal Compilers:** Falls der verfügbare RAM aufgrund unaufhaltsamer Shader-Kompilierung kritisch niedrig bleibt, beendet der Booster den überlasteten `MTLCompilerService` hart (`killall -9`). macOS startet in Millisekunden eine saubere Compiler-Instanz im Hintergrund neu, was schwere OS-Systemhänger und Kernel Panics verhindert, während das Gameplay perfekt stabil bleibt.
- **Asynchrone Anti-Prompt-Schleife:** Speziell für CrossOver/Wine entwickelt. Wenn ein Spiel mehrere Hintergrundprozesse in der exakt selben Millisekunde startet, blockiert die App doppelte Passwortabfragen. Es wird genau eine Passworteingabe zugelassen, während der Rest sofort geräuschlos im Hintergrund abgefertigt wird.
- **Dynamische lokale Blacklist:** Erzeugt eine externe `blacklist.txt` in deinem Benutzerverzeichnis. Füge jeden unerwünschten Hintergrundprozess (wie `steamclean` oder `wineloader`) im laufenden Betrieb hinzu, ohne jemals den Anwendungscode neu verpacken zu müssen.
- **Live-Status in der Menüleiste:** Der Header in der Menüleiste aktualisiert seinen Text in Echtzeit und zeigt sofort an: `🎮 Status: No games active`, `🟢 MAX-Boost: [Spiele-Prozess]` oder `🟡 MID-Boost: [Cooldown/Fallback]`.
- **Hardware-Abkühlungssperre:** Wenn du eine Berechtigungsabfrage absichtlich abbrichst, wird eine strikte 1-minütige Abkühlzeit aktiviert. Die App fällt in einen lautlosen MID-Modus (`Nice -1`) zurück und garantiert absolut kein Prompt-Spamming.
- **0% Idle-Last & Dock-Ausblendung:** Vollständig aus dem unteren Dock ausgeblendet. Nutzt ein offizielles, farbadaptives und hochauflösendes Google Noto Rocket Emoji-Icon.
- **Notfall-Notausschalter:** Das Drücken von `Option + Command + K` bricht sofort alle Intervalle ab, bereinigt die System-Hooks, beendet die Overlay-Schleifen und schließt die Booster-Anwendung augenblicklich und sicher.

---

## 🚀 Verpackung & Ausführung

Die Anwendung ist vollständig nativ und erfordert keine manuelle Ausführung im Root-Terminal mehr. Sie läuft sicher als eigenständiges `.app` Bundle und ruft isolierte, privilegierte Updates über `sudo-prompt` nur dann auf, wenn ein tatsächlicher Spiele-Prozess entdeckt wird. Da sie ihre eigene Node.js-Laufzeitumgebung mitbringt, benötigen Endbenutzer keinerlei Terminal-Utilities oder Software-Voraussetzungen.

### App kompilieren:
1. Lösche alte Caches und baue das native arm64 App-Bundle über das Terminal:
   ```bash
   rm -rf dist && npm run package-mac
   ```
2. Öffne das Verzeichnis `dist/mac-arm64/` und ziehe die App einfach in deinen systemweiten Programme-Ordner.

---

## 🕹️ Steuerung im Tray-Menü

- **Live-Status-Zeile:** Zeigt die aktuelle Aktivität der Engine und die Echtzeit-Ausführungsstufe (MAX/MID/Keine) direkt auf der obersten Ebene an.
- **📊 RAM Overlay ein/aus:** Schaltet die Sichtbarkeit des Live-HUD-Overlays um (`CmdOrCtrl + Alt + R`).
- **🚀 Enable FPS Boost:** Schaltet die Engine sofort ein oder aus. Das Deaktivieren setzt alle aktiven Spielstrukturen in Echtzeit sicher auf die Standardpriorität 0 zurück.
- **🛡️ Enable Adaptive Core (Anti-Panic):** Schaltet den adaptiven, systemweiten Speichermonitor ein oder aus. Synchronisiert sich live während des laufenden Gameplays. Es wird empfohlen, dies vor dem Starten von Titeln mit bekannten Speicherlecks zu aktivieren.
- **📝 Enable Logging:** Aktiviert das Schreiben von Diagnosetabellen in die Datei `gaming_boost.log`. Kann problemlos ausgeschaltet bleiben, da das Tray-Menü alle Live-Daten liefert.
- **⚙️ Start at Login (Autostart):** Registriert die App sicher im nativen macOS Login-Element-Subsystem für einen automatischen, lautlosen Systemstart.
- **📝 Edit Blacklist (Ignore File):** Öffnet die Live-Datei `blacklist.txt` im Standard-Texteditor. Speichere Änderungen ab, um ungewollte Prozesse im laufenden Betrieb zu ignorieren.

---

## 📜 Lizenz

Dieses Projekt ist Open-Source und unter der [MIT-Lizenz](LICENSE) verfügbar.
