# HMK Atlas – patch v94.078: Průsvitnost mlhy pro GM

Základ: dodaný kompletní ZIP v94.077.

V sekci **Zakrytí mapy** je mezi poloměrem štětce a tlačítky Odhalovat / Vrátit mlhu nový posuvník **Průsvitnost mlhy (GM)** (0–100 %, výchozí 0 %). Hodnota se zobrazuje v procentech a změna je okamžitá. 0 % = neprůsvitná mlha, 100 % = zcela průsvitný náhled.

Průsvitnost je pouze lokální náhled odemčené sekce; neupravuje masku, tahy štětce, JSON kampaně, historii ani cloudové zápisy. Zavřením sekce, Esc, přepnutím mapy nebo opětovným vykreslením celé sekce se vrátí na 0 %. Štětce fungují i při průsvitném náhledu. Heslová brána a stávající datový formát zůstávají zachovány.

Testy: syntaxe tří JS souborů PASS; porovnání všech souborů s původním ZIPem PASS. Skutečný Chromium v izolovaném prohlížečovém testu zdrojových modulů Atlasu: obě mapy, rozsah posuvníku, neměnnost masky a počtu zápisů při pohybu posuvníku, skutečné tahy obou štětců, zoom, zavření, Esc a remount s uchovanými tahy PASS; heslo/Enter PASS s původní globální obsluhou kláves. Bez JS chyb. Prohlížečová navigace na lokální testovací server byla prostředím blokována; test byl proto proveden s vloženými zdrojovými moduly a izolovaným paměťovým adaptérem. Plný start aplikace přes HTTP, skutečný GitHub Cloud a vzdálené vykreslení PDF.js nebyly ověřeny.

Instalace: rozbalit ZIP do kořene stávajícího repozitáře, nahradit odpovídající soubory, publikovat obvyklým postupem a obnovit Ctrl+F5. Neobsahuje mapové podklady ani herní data.
