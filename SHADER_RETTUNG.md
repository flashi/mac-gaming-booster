# 🚨 007 First Light – Shader-Rettungsplan (99% Freeze Fix)

Dieses Dokument beschreibt die offizielle Profilösung, falls das Spiel nach einem macOS-, CrossOver- oder Spiel-Update beim Shader-Laden bei 99 % unendlich lange einfriert.

---

### 💡 Warum passiert der Hänger?
Bei 99 % versucht der Apple-Grafik-Compiler, die Shader-Pakete final auf der SSD zu bündeln. Durch ein bekanntes Speicherleck (Memory Leak) im Apple-Systemdienst bläht sich der Prozess im RAM unkontrolliert auf (teilweise über 35 GB), verstopft das System und droht, den Mac in einen Absturz (Kernel Panic) zu reißen.

---

### 🛠️ Der 4-Schritte-Rettungsplan

Sobald der Ladebalken bei 99 % stehen bleibt und der 007-Sound im Hintergrund weiterläuft, wende sofort diese Schritte an:

#### 1. Aktivitätsanzeige öffnen
* Drücke `Command + Leertaste` auf deiner Mac-Tastatur, um die Spotlight-Suche zu öffnen.
* Tippe `Aktivitätsanzeige` ein und drücke `Enter`.

#### 2. Nach dem Compiler suchen
* Tippe oben rechts in das Suchfeld der Aktivitätsanzeige exakt dieses Wort ein:
  ```text
  MTLCompilerService
  ```

#### 3. Den 30GB+ Riesen abschießen
* Suche in der Liste nach dem Prozess `MTLCompilerService`, der den meisten Arbeitsspeicher blockiert (z. B. 35 GB oder 38 GB).
* Klicke diese Zeile an, sodass sie blau markiert ist.
* Klicke ganz oben links im Fenster auf das **„X“-Symbol** (Achteck mit einem X / Stoppschild).
* Wähle im Pop-up-Fenster unbedingt **„Sofort beenden“ (Force Quit)**.

#### 4. Zurück zum Spiel wechseln
* Schließe die Aktivitätsanzeige und klicke wieder in dein Spiel-Fenster.
* **Der Effekt:** Durch das Abschießen wird der Datenstau im RAM blitzartig gelöscht. macOS startet im selben Bruchteil einer Sekunde einen frischen, leeren Compiler im Hintergrund nach. CrossOver löst die Blockade auf, greift sich die fertigen Shader von der SSD und schaltet das Spiel in wenigen Sekunden direkt ins Hauptmenü frei!

---

### 🚨 Goldene Grafik-Regeln für 007 auf dem Mac Studio:
Um das Speicherleck von vornherein maximal zu verkleinern, lasse die Grafikeinstellungen im Hauptmenü immer so eingestellt:
1. ❌ **DLSS = IMMER AUS!** (Der Nvidia-Standard erzeugt das schwere Speicherleck auf Apple-Chips).
2. 🟢 **AMD FSR = AN (Modus: Qualität / Quality)**. (Läuft absolut stabil, schont den RAM und liefert maximale, flüssige FPS).
3. ❌ **Raytracing / Pfadtracing = IMMER AUS!** (CrossOver kann die Befehle aktuell nicht stabil übersetzen und flutet den Arbeitsspeicher).
