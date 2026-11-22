# HMK Keeper’s Ledger – Atlas v94.051 (I4–L7)

Plná aktualizace modulu Atlas proti základní verzi v94.049 (22. 11. 2026).
Nahrazuje předchozí patch v94.050. Není potřeba instalovat oba patche.

Instalace: vložte celý obsah ZIPu do kořenové složky GitHub repozitáře,
se zachováním podsložek `assets/atlas`, `src/ui` a `docs`.
Při dotazu nahraďte `app.js` a `index.html`. Po publikaci GitHub Pages obnovte Ctrl+F5.

Atlas:
- Nové tlačítko Atlas v hlavním menu, samostatně bez propojení s ostatními moduly.
- Samostatný pergamen bez grafické středové vazby knihy.
- Mapa I4–L7 je viditelná PŘÍMO v Atlasu uvnitř 4×4 sektorů.
- Nikde není tlačítko ani odkaz `Otevřít původní PDF`.
- Podklad je jeden bezeztrátový WebP 2449×2363 px odvozený z PDF při 300 DPI,
  nikoli mnoho mapových dlaždic; uživateli se zobrazuje rovnou na mapě.
- Osy sektorů: I, J, K, L zleva doprava; 4, 5, 6, 7 shora dolů.
- Každý sektor má vlastní ID a připravené `detailUrl: null` pro budoucí
  samostatné detailní mapy. Do té doby kliknutí označí sektor bez navigace.
- Kolečko myši a tlačítka +/- pro zoom, držení levého tlačítka pro posouvání,
  tlačítko Celá mapa, klávesové šipky, přibližné grafické měřítko.
- Levá legenda je ze zdrojové mapy; bez bílé plochy, na pergamenu.
- Základní orientační měřítko původní mapy: 1 hex = 5 hârnických lig ≈ 20 km.

Původní PDF zůstává mimo webový patch jako nedotčený zdrojový originál;
není nutné ho nahrávat na web, aby Atlas fungoval.

Žádné změny pravidlové logiky soubojů, cestování, léčby, projektů nebo
herních dat. Nový Atlas nečte ani nemění data kampaně.
