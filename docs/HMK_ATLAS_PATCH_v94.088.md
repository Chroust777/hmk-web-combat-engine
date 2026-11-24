# HMK Keeper’s Ledger v94.088 — Smazání textu bodu historie družiny

Výchozí verze v94.087 (původní ZIP v94.077 a navazující patche).

- Kompaktní tlačítko „Smazat text“ vedle označení bodu v pravém panelu historie. Maže výhradně poznámku a zavře její textové pole. Prázdná položka okamžitě zmizí; bod, ID, souřadnice, datum, spojnice, ostatní poznámky a značka družiny zůstávají zachovány.
- Mimo editaci se smazání uloží přímo stávajícím bezpečným zápisem kartografie; odmítnutý zápis obnoví původní poznámku. V rozpracované editaci se změna uloží spolu s ostatními změnami pomocí Esc. Zpět/Znovu funguje v obou režimech. Prázdné otevřené pole lze také zavřít tlačítkem.
- Poznámku lze znovu přidat přes bod na mapě. Ovládání trasy, pravidla a cloudová synchronizace beze změny. app.js, index.html a atlas-viewer.js pouze verze/cache-busting.

## Ověření
Chromium, skutečné zdrojové moduly Atlasu a produkční CSS, izolovaný paměťový adaptér. I4–L7 i K5: smazání uložené a rozpracované poznámky, okamžité zmizení položky, koncová poznámka i tooltip ikonky, Zpět/Znovu, odmítnutý zápis a opakování, Esc, zavření prázdného pole a opětovné vytvoření poznámky. Kontrola nezměněných souřadnic všech bodů a značky družiny. Regresní testy v94.087: pohyb družiny, zkrácení historie, editace, pan, navigace, obousměrná mlha, průsvitnost, klasické měření a kreslení nad mlhou. Bez zachycených JS výjimek. Kontrola syntaxe dotčených JS souborů. Vzdálený GitHub Cloud, úplný start z GitHub Pages a PDF.js nebyly testovány.

Instalace: rozbalit do kořene v94.087, nahradit soubory, publikovat, Ctrl+F5.
