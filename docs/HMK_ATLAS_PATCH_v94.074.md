# HMK Atlas PATCH v94.074 — Mlha pouze nad mapovým podkladem

Navazuje výhradně na **v94.073**. Změny jsou omezeny na Atlas.

- Fog of War zakrývá pouze obdélník mapového obrázku; hnědé pozadí prohlížeče, přídavné okraje a číselné i písmenné souřadnice zůstávají viditelné při všech hodnotách zoomu.
- Ořez platí i pro štětec „Odhalovat“ a „Vrátit mlhu“: kruh může zasáhnout přes hranu mapy, ale žádná část výsledné mlhy se nevykreslí mimo samotnou mapu.
- Ořez se znovu přepočítá při zoomu, posunu mapy a změně rozměrů okna. Pro K5 platí totéž, původní vektorový podklad se nemění.
- Stávající data mlhy a její cloudová synchronizace nejsou změněny; není potřeba migrace.

Instalace: překopírovat soubory `index.html`, `app.js`, `src/ui/atlas-viewer.js`, `src/ui/atlas-cartography.js` z patche do kořene webového projektu. Ponechat stávající `atlas.css`, mapové podklady i PDF. Obnovit web Ctrl+F5. Před testováním doporučujeme zálohu cloudového JSON.
