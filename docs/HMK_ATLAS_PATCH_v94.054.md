# HMK Atlas – PATCH v94.054 – vektorové PDF K5

**Výchozí verze:** v94.053 (nebo v94.052 + následně v94.053).

## Co je změněno

- Detail sektoru **K5** používá přímo původní `K5.pdf` – soubor `assets/atlas/k5-detail-map.pdf` je bitově totožná kopie uživatelského originálu, žádná rekomprese ani převod na pixely.
- Zobrazuje se **pouze mapové pole** z původní stránky PDF (vektorový výřez v zobrazovači, nikoliv obrazově zmenšená kopie); levá legenda je nadále samostatná `assets/atlas/k5-detail-legend.webp` na pergamenu.
- U K5 se načítá PDF.js (4.10.38) **až po kliknutí na sektor**; program vykresluje pouze viditelnou oblast mapy do plátna s rozlišením podle přiblížení, s krátkou prodlevou při intenzivním zoomování. Nevytváří síť obrazových dlaždic ani nekopíruje plochu celé mapy do obrovského canvasu.
- Funguje dosavadní zoom kolečkem myši, +/−, Celá mapa, tah levým tlačítkem a Zpět na hlavní mapu. Hlavní mapa I4–L7 zůstává WebP v nezměněné kvalitě.
- K5 měřítko je kalibrováno z přímo změřené originální úsečky 0–5 lig (cca 20 km); grafická délka a nabízená číselná délka měřítka se mění s přiblížením. Měření trasy klikáním není v této verzi přidáno.
- Atlas se nepropojuje s cestováním, herním stavem, kalendářem ani jinými panely.

## Externí závislost (jen při otevření K5)

PDF.js v4.10.38 se načítá z CDNJS přes HTTPS:

- `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs`
- `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`

Stránka tedy při prvním otevření K5 musí mít přístup k tomuto CDN. Zobrazení mapy K5 je při blokované službě nefunkční, ale hlavní Atlas a ostatní moduly zůstávají nedotčené.

## Instalace

Rozbalit ZIP do kořene repozitáře a nahradit `app.js`, `index.html`, `atlas.css` a `src/ui/atlas-viewer.js`. Přidat `assets/atlas/k5-detail-map.pdf`. Zachovat `assets/atlas/k5-detail-legend.webp`, `assets/atlas/harn-I4-L7.webp` a `assets/atlas/harn-map-key.webp` z předchozích patchů. Znovu načíst stránku přes Ctrl+F5.

## Co lze po úspěšném nasazení odstranit

1. **`assets/atlas/k5-detail-map.webp`** – stará rastrová K5 z v94.053; nové JS již soubor nevyžaduje.
2. **`assets/atlas/Harn_Atlas_I4-L7.pdf`** – starý přehledový PDF z v94.050, pokud byl dříve nahrán na web; přehled stále používá `harn-I4-L7.webp`.
3. **`K5.pdf` v kořeni repozitáře** – pokud byl omylem nahrán; nově je odkazováno pouze na `assets/atlas/k5-detail-map.pdf`.

**Nesmazat:** `assets/atlas/k5-detail-legend.webp`, `assets/atlas/harn-I4-L7.webp`, `assets/atlas/harn-map-key.webp` ani nový `assets/atlas/k5-detail-map.pdf`. Doporučujeme ponechat původní osobní kopie PDF mimo webový repozitář.

## Autorskoprávní / soukromí

Originální soubor K5.pdf je licencovaný materiál a obsahuje zákaznické licenční údaje. Vložením souboru do veřejného repozitáře GitHub Pages se PDF stane veřejně dostupné ke stažení. Před nahráním zvažte oprávnění k publikování a ochranu osobních údajů.

## Kontrola

- Statická syntaxe JavaScriptu a importy: OK.
- Kontrola zdrojového PDF: 1 strana, plně vektorová mapa s 2 926 kreslenými objekty, 14 fonty a bez vloženého rastrového obrazového podkladu.
- Ověření DOM interakce v izolovaném prohlížeči pomocí simulace API PDF.js: K5 z hlavní mapy, plátno, zoom, pan, měřítko, návrat. Nejde o ověření skutečné knihovny z CDN ani o plný regresní test aplikace. Přístup k CDN nebyl v testovacím prostředí k dispozici.
