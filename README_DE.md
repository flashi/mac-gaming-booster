# 🚀 Mac Gaming Booster (Apple Silicon Optimiert)

**Version:** 2.3.0 (Smart Adaptive Core / Platin-Release)  
**Entwickler:** Mario (flashi)  
**Plattform:** macOS (Architektur: arm64 / Apple Silicon M-Chips)  
**Unterstützte Systeme:** macOS 15 (Sequoia) & macOS 16 (Tahoe) Verifiziert  
**Umgebung:** Electron Framework / Native Menüleisten-Anwendung (Eigenständiges App-Bundle)  

---

## 🛑 WICHTIG: REALISTISCHE ERWARTUNGEN (⚠️ KEINE WUNDER-FPS!)

Bitte vor der Nutzung sorgfältig lesen: Diese App ist **KEIN** Overclocking-Tool und kann nicht magisch neue GPU-Kerne auf deinem Mac Studio herbeizaubern.

Wenn deine Grafikkarte (GPU) bei maximalen Einstellungen komplett ausgelastet ist und das Spiel von Natur aus nur 50 FPS schafft, wird dir diese App **NICHT** plötzlich 100 FPS liefern. Die maximale Grafikleistung hängt allein von deiner Hardware ab.

### 💡 Was macht die App wirklich?
Die App optimiert die Zuweisung der CPU-Kerne, das System-Threading und das Apple Silicon Unified Memory Caching in Echtzeit:

- **Eliminiert Mikroruckler (Lag Spikes):** Sie verschiebt relevante Spielprozesse auf die absolute Sweet-Spot-Priorität (`Nice -5`). Dies gewährt deinem Spiel maximale CPU-Zyklen, während das macOS-Fenstermanagement perfekt flüssig bleibt.
- **Exklusive Kerne & Sortierung der Haupt-Engine:** Wenn anspruchsvolle Next-Gen-Spiele (wie S.T.A.L.K.E.R. 2 oder Cyberpunk 2077) starten, erkennt die App intelligent parallele Unterprozesse. Sie priorisiert die schwere Haupt-3D-Engine (`*Shipping.exe`) zuerst, während unbedeutende Launcher sicher auf einen lautlosen Fallback-Boost (`Nice -1`) zurückgestuft werden.
- **Hintergrund-Schutzschild:** Aktive Browser-Tabs oder System-Cloud-Prozesse werden beiseite geschoben, um zu verhindern, dass sie den strikten Takt des Spiels unterbrechen.
- **Automatisierte RAM-Bereinigung:** In der Millisekunde, in der ein Spiel geschlossen wird, triggert die App eine lautlose, native Speicherleerung (`sudo purge`). Sie löscht sofort Gigabytes an veralteten Grafik-Caches und gibt bis zu 87 % des systemweiten Speichers augenblicklich wieder frei.

**Das Ergebnis:** Die Frame-Zeiten (Frametimes) sinken und stabilisieren sich perfekt. Selbst bei exakt gleicher angezeigter FPS-Zahl fühlt sich das Spiel viel flüssiger und weicher an und reagiert deutlich schneller auf deine Controller- oder Mauseingaben.

---

## 🛠️ Features (v2.3.0)

- **Smarter Prozess-Scan:** Ersetzt schwere Datei-Überprüfungen durch eine blitzschnelle `ps -Ax` Engine. Erkennt Spiele in Millisekunden – lange bevor der Spielbildschirm überhaupt schwarz wird.
- **🛡️ 007 Shader Guard (Adaptiver Speicher-Wachhund):** Komplett neu entwickelt, um massive Speicherlecks während der DirectX 12 Shader-Vorkompilierung (z. B. in *007 First Light*) abzufangen. Anstatt die Größe einzelner Prozesse nur zu schätzen, überwacht er über native macOS `vm_stat` Hooks aktiv den gesamten verfügbaren Arbeitsspeicher deines Systems.
- **🍏 Nativer Apple Silicon 16 KB Seiten-Support:** Speziell kalibriert für M-Chips (M1/M2/M3/M4). Ältere Tools berechnen Werte basierend auf Intels 4.096-Byte-Layout, was die Metriken auf Apple Silicon verfälscht. v2.3.0 verarbeitet nativ die moderne **16.384-Byte (16 KB)** Hardware-Seitengröße und bezieht `Pages speculative` für eine ultrapräzise Speicheranalyse direkt in die Formel ein.
- **🧹 "No Sudo" Live-Evakuierung im Spiel:** Sobald der verfügbare RAM unter **1.500 MB** sinkt, triggert der Booster sofort eine automatische Cache-Evakuierung (`syslog -c aslmanager -d`) kombiniert mit einer künstlichen Micro-Speicherdruck-Simulation. Dies zwingt macOS dazu, inaktive System-Caches und veraltete Grafikpuffer sofort im User-Space freizugeben – **ohne jegliche Frame-Drops oder Mikroruckler** während des aktiven Spielens.
- **⏱️ Smarter 30-Sekunden Cooldown-Schutz:** Entwickelt für extreme Belastungssituationen (z. B. Spiele auf *Ultra* Details mit aktivem *Qualitäts-Upscaling*). Sobald eine massive Speicherbereinigung durchgeführt wurde, sperrt ein strikter 30-Sekunden-Timer (`PURGE_COOLDOWN`) die Routine. Dies verhindert endlose Hintergrundschleifen, schützt deine SSD vor übermäßigem Log-Stress und spart maximale CPU-Zyklen für deine Frames.
- **💥 Notfall-Abschaltung des Metal-Compilers:** Wenn der verfügbare Speicher aufgrund unaufhörlicher Shader-Kompilierung kritisch niedrig bleibt, beendet der Booster den überlasteten `MTLCompilerService` händisch (`killall -9`). macOS startet in Millisekunden automatisch eine saubere Compiler-Instanz im Hintergrund neu. Dies verhindert schwere System-Einfrierungen und Kernel Panics, während die Shader im Hintergrund fehlerfrei weitergeneriert werden.
- **Asynchrone Anti-Prompt-Schleife:** Speziell für CrossOver/Wine entwickelt. Wenn ein Spiel 3 Hintergrundprozesse in derselben Millisekunde startet, blockiert die App doppelte Passwort-Abfragen. Sie erlaubt exakt eine Passworteingabe, während der Rest lautlos im Hintergrund verarbeitet wird.
- **Dynamische lokale Blacklist:** Generiert eine externe `blacklist.txt` in deinem Benutzerverzeichnis. Füge beliebige Hintergrundprozesse (wie `steamclean` oder `wineloader`) in Echtzeit hinzu, ohne jemals den App-Code neu kompilieren zu müssen.
- **Live-Status in der Menüleiste:** Kein lästiges Überwachen von schweren Log-Tabellen mehr! Der Header der Menüleiste aktualisiert seinen Text in Echtzeit und zeigt: `🎮 Status: Keine Spiele aktiv`, `🟢 MAX-Boost: [Spiel-Prozess]` oder `🟡 MID-Boost: [Cooldown/Fallback]`.
- **Hardware Cooldown-Sperre:** Wenn du eine Berechtigungsabfrage absichtlich abbrichst, wird eine strikte 1-minütige Systemsperre aktiviert. Die App fällt in einen lautlosen MID-Modus (`Nice -1`) zurück und garantiert absolut werbefreies Arbeiten ohne Prompt-Spam.
- **0 % Idle-Last & Dock-Ausblendung:** Vollständig aus dem unteren Dock ausgeblendet. Nutzt ein offizielles, farbadaptives und hochauflösendes Google Noto Raketen-Emoji als Icon.
- **Panik-Notausschalter:** Das Drücken von `Option + Command + K` bricht sofort alle Intervalle ab, löscht die System-Hooks und beendet die Booster-Anwendung augenblicklich und sicher.

---

## 🚀 Kompilierung & Ausführung

Die Anwendung ist vollständig nativ und erfordert keine manuelle Ausführung von Root-Befehlen im Terminal mehr. Sie läuft sicher als eigenständiges `.app` Bundle und ruft isolierte, privilegierte Updates über `sudo-prompt` nur dann auf, wenn ein tatsächlicher Spiele-Prozess entdeckt wird.

### App kompilieren:
1. Lösche alte Caches und baue das native arm64 App-Bundle über das Terminal:
   ```bash
   rm -rf dist && npm run package-mac
   ```
2. Öffne das Verzeichnis `dist/mac-arm64/` und ziehe die App in deinen systemweiten Programme-Ordner.

---

## 🕹️ Steuerung innerhalb des Tray-Menüs

- **Live-Status-Zeile:** Zeigt die aktuelle Engine-Aktivität und das Echtzeit-Ausführungslevel (MAX/MID/Keine) direkt auf der obersten Ebene an.
- **🚀 Enable FPS Boost:** Schalte die Engine sofort ein oder aus. Das Deaktivieren setzt alle aktiven Spielstrukturen in Echtzeit sicher auf die Standardpriorität 0 zurück.
- **🛡️ Enable 007 Shader Guard (Anti-Panic):** Schaltet den adaptiven, systemweiten Arbeitsspeicher-Wächter um. Synchronisiert sich sofort live während des laufenden Gameplays. Es wird empfohlen, dies vor dem Start von *007 First Light* zu aktivieren.
- **📝 Enable Logging:** Schaltet das Schreiben von Diagnose-Tabellen in die Datei `gaming_boost.log` ein oder aus. Kann komplett deaktiviert bleiben, da das Tray-Menü Live-Daten liefert.
- **⚙️ Start at Login (Autostart):** Registriert die App sicher im nativen macOS Login-Subsystem für einen automatisierten, lautlosen Start beim Hochfahren.
- **📝 Edit Blacklist (Ignore File):** Öffnet die Live-Datei `blacklist.txt` im Standard-Texteditor. Speichere Änderungen ab, um unerwünschte Prozesse direkt im laufenden Betrieb zu ignorieren.

---

## 📜 Lizenz

Dieses Projekt ist Open-Source und unter der [MIT-Lizenz](LICENSE) verfügbar.
