#!/bin/bash
echo "================================================="
echo "   🚀 Starte automatischen Release-Prozess v2.3.1 "
echo "================================================="

# 1. GitHub Link sichern
git remote set-url origin https://github.com/flashi/mac-gaming-booster.git

# 2. Prüfen ob .gitignore existiert, sonst sauber erstellen
if [ ! -f .gitignore ]; then
    echo "📄 Erstelle fehlende .gitignore..."
    echo "node_modules/" >> .gitignore
    echo "dist/" >> .gitignore
    echo "*.zip" >> .gitignore
    echo ".DS_Store" >> .gitignore
    echo "   -> .gitignore erfolgreich angelegt!"
fi

# 3. Reinen Quellcode zu GitHub hochladen
echo "📤 Übertrage reinen Code zu GitHub..."
git add .
git commit -m "Patch v2.3.1: Full English localization and renamed shader guard to Adaptive Core"
git push origin main

echo "================================================="
echo " 🎉 FERTIG! Version 2.3.1-Code ist live.         "
echo "================================================="
