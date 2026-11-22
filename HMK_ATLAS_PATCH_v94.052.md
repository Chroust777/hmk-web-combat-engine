# HMK Atlas hotfix v94.052 — viditelná mapa pod sektory

**Výchozí verze:** v94.051, nainstalovaný Atlas I4–L7.

## Oprava

Původní `book-templates.css` používá pravidlo `main.content:not(.content-sheet) button` s `background: ... !important`. Atlas vykresluje nad mapou 16 plnoplošných tlačítek (`.atlas-sector`) pro budoucí detailní odkazy. Globální pravidlo jim vynutilo neprůhledné modré pozadí a zakrylo mapový obrázek. Samotný mapový WebP se načítal.

Nové Atlas-only pravidlo přepisuje pouze vzhled těchto 16 tlačítek na průhledné pozadí s jemnou sektorovou mřížkou. Při najetí a při výběru je zobrazena jen transparentní zvýrazňovací vrstva. Žádné globální CSS ani herní logika se nemění.

## Obsažené soubory

- `atlas.css` – jediná funkční změna (Atlas-only průhledné sektory)
- `index.html` – aktualizace verze a cache-busting parametrů CSS/JS
- `app.js` – jen změna zobrazeného čísla verze na 94.052

**Nejsou obsaženy žádné obrázky.** Stávající `assets/atlas/harn-I4-L7.webp` a `assets/atlas/harn-map-key.webp` z v94.051 zůstávají na místě. Ani PDF není potřeba.

## Nasazení

Nahraďte tyto tři soubory v kořeni repozitáře. Po publikaci GitHub Pages proveďte Ctrl+F5 (nové query parametry by měly vynutit čerstvé načtení i bez toho). Sektory se zatím pouze označí a neotevírají neexistující detailní mapy.

## Kontrola

Původní problém byl reprodukován ve skutečné sadě produkčních CSS: modrá výplň `linear-gradient(rgb(48,76,103),rgb(24,46,72))`. Po opravě vypočtený styl sektoru je `background: transparent; background-image: none`. Ověřeny načtení mapy 2449×2363, legenda, 16 sektorů, ovládací tlačítko zoom, kolečko, posun myší, klávesový výběr a kliknutí.
