# HMK Keeper’s Ledger v94.087 — Pohyb a zkrácení historie družiny

Výchozí verze: v94.086. Původní kompletní ZIP v94.077 a následné patche.

- První tažení ikonky zahájí rozpracovaný pohyb; každé další tažení koncového bodu v tomto režimu přidá právě jeden nový bod. Předchozí body se nemění. Přetažení staršího bodu nadále upraví jeho souřadnice; explicitní editace tužkou umožní opravit existující koncový bod bez přidávání bodu. Kliknutí do mapy v režimu prodlužování zůstává zachováno.
- Křížek odstraní vybraný bod i všechny následující body a úseky, a to jak u uloženého bodu, tak při rozpracované editaci. Ikonka se synchronně přemístí na konec zkrácené trasy. Křížek u prvního bodu ponechá tento výchozí bod a odstraní všechny ostatní. Po zkrácení lze ihned pokračovat tažením družiny.
- Esc nadále ukládá historii a pozici společným zápisem. Zpět/Znovu obnovuje celou změnu. Formát dat, synchronizace a ostatní moduly beze změny.
- app.js, index.html a atlas-viewer.js: pouze verze/cache-busting.

## Ověření
Chromium s produkčními CSS, izolované skutečné moduly Atlasu a paměťový adaptér: I4–L7 a K5. Tři tažení ikonky bez Esc, kontrola všech předchozích bodů, zkrácení prostředním křížkem v editaci i mimo ni, okamžitá shoda vykreslených souřadnic ikonky a koncového bodu při pointerdown, další tažení po zkrácení, undo/redo, poznámka, přesun staršího bodu a explicitní editace konce tužkou, posouvání mapy, Esc, odmítnutí zápisu a opakování, ochrana výchozího bodu. Regrese: měření a kreslení nad mlhou, navigace na družinu, obousměrné zakrytí, průsvitnost a starší data. Bez zachycených JS výjimek. Kontrola syntaxe dotčených JS souborů. Vzdálený GitHub Cloud, kompletní start z GitHub Pages a PDF.js neověřovány.

Instalace: rozbalit do kořene v94.086, přepsat soubory, publikovat a obnovit Ctrl+F5.
