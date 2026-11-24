# HMK Keeper’s Ledger v94.106

- GameMaster: nová jednotná hnědá #c6a16f pro psaní i všechny zobrazené GM zprávy. Staré barvy #e7cfa9 a #dbc08f jsou nadále validní; uložené zprávy se nemigrují.
- Atlas: transparentní vnější globální folio, jediný původní pergamenový rám Atlasu s odsazením 8 px (9 px s okrajem). Zachovány původní styly v94.103 včetně doplňků v94.078–94.096, které předchozí patch v94.105 neobsahoval.
- Verze: APP_VERSION, HTML title, boot text a cache-busting app.js, atlas.css, chat.css a chatové moduly aktualizovány.
- Chat CSS odpovídá v94.103; přiložen pro případ nasazení přes v94.104.

Testy: Chromium s izolovaným úložištěm a bundlovanými zdrojovými moduly, verze v menu i zápatí, všechny tři GM barvy v uložených zprávách, nový zápis, overview/K5, zoom/návrat, šířka 980 px, neměnnost herních dat. Automatický test denní kroniky PASS. Skutečný GitHub Cloud, GitHub Pages, načtení textur a obsah PDF.js neověřeny.
