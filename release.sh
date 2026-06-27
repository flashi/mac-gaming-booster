#!/bin/bash
echo "================================================="
echo "   🚀 Starte automatischen Release-Prozess v2.6.0 "
echo "================================================="

# 1. GitHub Link sichern (Hier steht deine öffentliche Adresse!)
git remote set-url origin "https://github.com/flashi/mac-gaming-booster.git"

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
# Patch v2.3.2: Alle Neuerungen inklusive des Tomb-Raider-Fokus-Fixes im Commit festgehalten
git commit -m "Release v2.6.0: Integration of Core Settings GUI, Dynamic RAM Sliders, Live Blacklist Management, and Configurable Daemon Lifecycles"
git push origin main

echo "================================================="
echo " 🎉 FERTIG! Version 2.6.0-Code ist live.         "
echo "================================================="

