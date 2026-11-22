# HMK Keeper’s Ledger – Atlas v94.050 (I4–L7)

Patch pro dodanou základní verzi v94.049 z 22. 11. 2026.

Instalace: obsah tohoto ZIPu vložte do KOŘENOVÉ složky GitHub repozitáře
hmk-web-combat-engine, při otázce nahraďte soubory app.js a index.html.
Zachovejte přesně cesty assets/atlas/, src/ui/, docs/ a atlas.css v kořeni.
Po publikování GitHub Pages načtěte web pomocí Ctrl+F5.

Změny:
- Nová položka Atlas v levém hlavním menu.
- Jedna samostatná pergamenová plocha bez středové vazby knihy.
- 16 sektorů I4, J4, K4, L4 … I7, J7, K7, L7, příslušné osy.
- Přibližování kolečkem, +/-; tažení levým tlačítkem; Celá mapa;
  klávesové šipky pro posun a +/– pro zoom.
- Původní legenda jako přesný symbolový výřez na pergamenovém podkladu.
- Přibližné měřítko z originálu: 1 hex (1 cm) = 5 hârnických lig ≈ 20 km.
- Jediný bezeztrátový WebP v nativních 300 DPI; žádné dlaždice, žádné CDN.
- Původní výřez PDF přiložen jako assets/atlas/Harn_Atlas_I4-L7.pdf.
- Všech 16 sektorů má připravené samostatné ID a pole detailUrl=null;
  kliknutí nyní pouze označí sektor, žádné neexistující odkazy.
- Atlas NEČTE ani NEMĚNÍ postavy, boj, cestování, kalendář či cloud.

Pozn.: pro interaktivní posouvání se v browseru zobrazuje jediný
bezeztrátový obrazový převod z PDF, nikoli vestavěný PDF plugin. PDF je
zachované pro přímé otevření. Zoom nad skutečný počet obrazových bodů
již nezíská další kreslicí detaily – původní podklad je JPEG 300 DPI.

Kontroly: syntaktická kontrola nového JS a app.js; izolované zobrazení
v Chromium a kontrola zoom, tažení, mřížky, výběru sektoru. Kompletní
navigaci velké aplikace v prohlížeči nebylo možné v izolovaném prostředí
ověřit kvůli zablokovanému přístupu k lokálním adresám.
