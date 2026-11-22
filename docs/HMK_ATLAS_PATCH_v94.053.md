# HMK Atlas v94.053 — detailní mapa sektoru K5

**Výchozí verze:** v94.052 s mapou I4–L7 a legendou z v94.051.

## Změny

- Původní mapa 16 sektorů I4–L7 zůstává beze změn a stále je viditelná.
- Sektor K5 je odkaz na detailní mapu K5. Otevírá se uvnitř téhož samostatného modulu Atlas.
- Detail K5 má jednu souvislou, bezeztrátovou WebP mapu přímo z dodaného K5.pdf (4172 × 4031 px, 400 DPI), bez dlaždic.
- Původní legenda detailu K5 je umístěna samostatně vlevo, bez bílého podkladu (prolínání přes pergamen), včetně původní stupnice 0–5 hârnických lig.
- Tlačítko **← Zpět na hlavní mapu** vrací původní přehled se zachovaným zvětšením a polohou.
- Obě mapy mají nezávislý zoom kolečkem, posun tažením levým tlačítkem, klávesovou navigaci, ovládání + / − a Celá mapa.
- Dalších 15 sektorů je připravených, ale bez neexistujících detailních odkazů.
- Oprava vzhledu ovládacích tlačítek pouze v Atlasu, aby je globální styl nezabarvil modře.
- Atlas se nepropojuje s postavami, bojem, cestováním, projekty, časem, cloudem nebo jinými herními daty.

## Nové obrazové soubory

- `assets/atlas/k5-detail-map.webp` — detailní kresba K5, 400 DPI.
- `assets/atlas/k5-detail-legend.webp` — originální vysvětlivky a měřítko, 300 DPI.

**K5.pdf není nutné nahrávat do repozitáře**; ponechte si ho jako původní zdroj na počítači.

## Instalace

ZIP obsahuje jen změněné a nové soubory. Rozbalit do kořene repozitáře a nahradit existující `app.js`, `index.html`, `atlas.css`, `src/ui/atlas-viewer.js`; nahrát nové soubory v `assets/atlas/`. Ponechat původní `harn-I4-L7.webp` a `harn-map-key.webp` beze změn. Po nasazení vynutit obnovení prohlížeče Ctrl+F5.

## Statická a vizuální kontrola

- JS syntax OK.
- Prohlížečová kontrola s produkčními CSS: 16 transparentních sektorů, K5 se otevírá myší i klávesnicí, detailní soubor načten v rozlišení 4172 × 4031, legenda 814 × 2981, přiblížení, drag a návrat na přehled fungují.
- Testovaný izolovaný modul Atlas s originální sadou produkčních CSS; **kompletní aplikace nebyla znovu regresně otestována**.
