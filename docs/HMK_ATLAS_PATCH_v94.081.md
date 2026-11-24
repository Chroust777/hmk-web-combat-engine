# HMK Keeper’s Ledger v94.081 – Jednoduchá editace historie pohybu družiny

Výchozí stav: autoritativní kompletní ZIP v94.077 s navazujícím vydaným patchem v94.080 (jeho pět zdrojových souborů obsahuje i změny v94.078 a v94.079). Tento patch je přírůstkový vůči v94.080.

- Odstraněna samostatná tlačítka pro editaci, pokračování, mazání, uložení, zrušení a lokální Undo/Redo. V sekci historie je jen seznam bodů s poznámkami a stručná nápověda. Společná kartografická tlačítka Zpět/Znovu nadále fungují pro rozpracované i uložené změny.
- Tužkou po výběru bodu se otevře editace všech bodů; každý bod má vlastní křížek, dokud zbývají alespoň dva body. Křížek odstraní konkrétní bod, sousedé se spojí. Poslední bod vždy nese pozici družiny; po jeho odstranění se ikonka ihned přemístí na nový konec. Nejméně jeden bod musí zůstat.
- Přetažení již existujícího bodu v editaci jej přemístí, včetně posledního. Přetažení ikonky mimo editaci přidá nový bod; při takto zahájené editaci nebo otevření editace tužkou na koncovém bodu lze přidávat další body kliknutím do mapy. Tažení za volnou plochu posouvá mapu.
- Escape ukládá změny jedním společným zápisem značek a kartografie; při neúspěchu zůstane rozpracovaná historie a další Escape umožní opakovat uložení. Přepnutí mapy či jiného nástroje v Atlasu také nejprve zkusí uložit rozpracovanou historii. Při neúspěchu přepnutí nepokračuje.
- Poznámky k bodům se ukládají do již existujícího pole note (max. 500 znaků), bez změny schématu JSON. Po kliknutí na uložený bod se zobrazí v bublině; poznámka posledního bodu se zobrazí i v bublině ikonky družiny. Text je vykreslen jako text, nikoli HTML.
- Aktualizováno číslo verze a cache-busting odkazů. Pravidlové moduly, synchronizační mechanismus a mapa/PDF podklady nejsou měněny.

## Ověření
- Node: syntaktická kontrola app.js, atlas-viewer.js, atlas-cartography.js – PASS.
- Chromium, skutečné moduly Atlasu (zdrojové JS vložené do izolované stránky, izolovaný paměťový adaptér, bez vzdálených mapových podkladů): I4–L7 i K5 – PASS: otevření editace, poznámky, tažení bodů, smazání prostředního a posledního bodu, vazba ikonky na konec, pan bez zápisu, odmítnutí zápisu a opakování, Escape, uložená bublina bodu i ikonky, přidání bodu přetažením ikonky a kliknutím, přesun konce, Undo/Redo před a po uložení; původní poznámka zůstává. Regrese: heslo mlhy, průsvitnost a reset přes Escape. Bez JavaScriptových výjimek v testovaných průchodech.
- Lokální HTTP navigaci Chromium zablokovalo ERR_BLOCKED_BY_ADMINISTRATOR; ověření proběhlo přes izolovanou stránku, nikoli kompletní aplikaci na GitHub Pages. Živý GitHub Cloud ani PDF.js nebyly ověřeny. Žádné produkční nasazení.
