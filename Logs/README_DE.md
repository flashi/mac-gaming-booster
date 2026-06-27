# Mac Gaming Booster (v2.6.0 Platin)

Ein leichtgewichtiges, natives Hintergrund-Utility für Apple Silicon Macs, das aggressive Speicherlecks (Memory Leaks), Shader-Kompilierungs-Ruckler und Systemabstürze bei anspruchsvollen Windows-Spielen unter CrossOver/GPTK bekämpft.

---

## 🔬 Testsystem & Hardware-Profil

Alle Stabilitäts-Benchmarks und Stresstests werden auf einem High-End-Produktionssystem durchgeführt, um die Performance unter realistischen Dauerspiel-Bedingungen zu bewerten.

* **Hardware:** Mac Studio (Apple Silicon M4 Max)
* **Arbeitsspeicher:** 36 GB Unified Memory (Gemeinsamer Speicher)
* **Software-Umgebung:** macOS 15+ / CrossOver 26.2.0+ (DirectX 12 Translation Layer)
* **Test-Konfiguration:** Native **1440p (WQHD)**, **Maximale/Ultra Grafikeinstellungen**, **KEINE KI-Unterstützung** (FSR / DLSS / XeSS deaktiviert).
* **Ziel-Dauer:** Mindestens 2 Stunden kontinuierliches Gameplay pro Spieletitel.

---

## 📊 Echte Log-Analysen & Harte Fakten

Die originalen Log-Dateien sind im Ordner `/Logs` dieses Repositories hinterlegt. Nachfolgend findest du die ungeschönte technische Analyse, wie die Anwendung das Systemverhalten unter extremer Gaming-Last verändert.

### 1. Uncharted: Legacy of Thieves Collection
* **Das Problem (Ohne App):** Dieser Titel leidet unter einem aggressiven VRAM/RAM-Speicherleck während der DirectX-12-zu-Metal-Übersetzung. Das native Spielen in 1440p auf Ultra-Details ohne FSR erschöpft den 36-GB-Speicher innerhalb von 45–60 Minuten komplett. Dies zwingt macOS zu massiven Auslagerungen auf die SSD (Swap), was zu schweren Frame-Einbrüchen (Micro-Stuttering) und Abstürzen führt.
* **Testdauer mit dem Booster:** 2 Stunden, 39 Minuten, 1 Sekunde.
* **Beobachtetes Verhalten & Logs:**
  * Der **Adaptive Core Watchdog** fing mehrere kritische Momente ab, in denen der freie RAM in die absolute **Gefahrenzone von 200 MB - 500 MB** absackte (z. B. Log-Zeitstempel `10:50:51 PM: Memory Critical - 229 MB free`).
  * Das Utility löste sofort eine Notfall-Evakuierung inaktiver System-Caches aus und versetzte den `MTLCompilerService` für exakt **2 Sekunden** in den Tiefschlaf, um den Speicherdruck sofort zu mindern.
  * **Das Ergebnis:** Das System geriet zu keinem Zeitpunkt in eine unkontrollierte SSD-Auslagerungsschleife. Die SSD-Swap-Auslastung blieb bei absolut unkritischen **1,48 GB** stehen. Trotz der brachialen nativen Last lief das Spiel über die gesamten 2,5 Stunden flüssig durch – ohne einen einzigen Absturz oder Grafikfehler.

### 2. 007 First Light (IO Interactive)
* **Das Problem (Ohne App):** Ein brandneuer, extrem hardwarehungriger AAA-Titel aus dem Jahr 2026. Aufgrund von Übersetzungsschwierigkeiten bei den immensen DX12-Shader-Mengen während des Spielstarts kam es bisher zu massiven System-Staus, die eine brutale **Wartezeit von 20 Minuten** beim Starten erzwingen. Ohne aktives Speichermanagement füllten sich RAM und SSD-Swap im Verlauf, was zu eingefrorenen Bildschirmen, Grafikfehlern (Artefakten) und verheerenden **Kernel Panics** (System-Abstürzen) führte.
* **Testdauer mit dem Booster:** 2 Stunden, 47 Minuten, 58 Sekunden.
* **Beobachtetes Verhalten & Logs:**
  * **Verkürzung der Shader-Ladezeit:** Die initiale Kompilierungsphase beim Spielstart wurde erfolgreich von **20 Minuten auf gerade einmal 2–3 Minuten** komprimiert (eine Beschleunigung von rund 85 %), da angesammelter Übersetzungsmüll kontinuierlich gelöscht wurde.
  * Während des aktiven Gameplays hielt die Anwendung konstant ein stabiles Sicherheitspolster von **ca. 5 GB freiem physischem RAM** aufrecht und hielt das System damit sicher fern von der Kernel-Panic-Schwelle von macOS.
  * **Ehrliche Performance-Notiz:** Das Spielen in nativer 1440p-Auflösung auf maximalen Grafikdetails ohne KI-Upscaling fordert der GPU die absolute Rohleistung ab. In extrem actionreichen Szenen sanken die Framerates unter die 30-FPS-Marke. Dank des Boosters traten jedoch **absolut keine Grafikfehler** auf und das System blieb bis zur allerletzten Sekunde (`11:51:54 PM`) zu 100 % stabil, ohne einzufrieren.

---

## 🛡️ Kern-Mechanismus & Architektur

Die Anwendung arbeitet als schlanker Wächter-Prozess im Benutzer-Kontext und kommuniziert über Datei-Trigger (`boost.trigger`) mit einem privilegierten Root-Helper.

* **Stufe 1: Soft Buffer Evacuation (Einstellbar: 1000MB - 3000MB)**
  Überwacht den Speicherdruck. Fällt der freie RAM unter den Schwellenwert, wird eine unauffällige Speicherbereinigung getriggert, bevor macOS Daten auf die SSD auslagern muss.
* **Stufe 2: Compiler Deep-Sleep (Einstellbar: 200MB - 800MB)**
  Die Notbremse. Wenn der Speicher bei extremem Asset-Streaming auf ein kritisches Niveau absinkt, stoppt die App temporär den `MTLCompilerService`. Dies verhindert einen harten System-Freeze oder eine hardware-schützende Kernel Panic.
* **Sandbox-Brecher Architektur:**
  Verfügt über einen **Platin-Abbrech-Schutz** direkt am ersten Code-Eintrittspunkt. Fehlt Node.js auf dem Mac, bricht die App sofort ab und verhindert die Entstehung von doppelten Geisterprozessen.

---

## ⚙️ Voraussetzungen & Installation

### Für normale Spieler (Fertige App)
Die Anwendung ist komplett portabel. Aufgrund der macOS-Sicherheitsarchitektur ist jedoch eine lokale Node.js-Installation zwingend erforderlich, damit der Root-Helper arbeiten kann.

1. **Node.js installieren** (Falls noch nicht vorhanden):
   * Öffne das Terminal und tippe ein: `brew install node`
   * *Oder:* Lade den offiziellen Installer direkt von [nodejs.org](https://nodejs.org) herunter.
2. **App herunterladen:** Lade dir die neueste Version über den "Releases"-Tab auf GitHub herunter.
3. **Starten:** Starte die App und bestätige einmalig das native macOS-Passwortfenster.

### Für Entwickler (Quellcode)
```bash
git clone https://github.com
cd mac-gaming-booster
npm install
npm start
```

---

## ⚠️ Wichtiger System-Sicherheitshinweis
Damit das Zusammenspiel aus deinem Mac, CrossOver und diesem Booster absolut stabil bleibt: **Halte auf der internen macOS-SSD deines Macs immer mindestens 20 bis 30 GB Speicherplatz frei.** Dies stellt sicher, dass das Betriebssystem bei unerwarteten Lastspitzen immer sein natives, lebenswichtiges Notfall-Atemvolumen behält.
