# HMK Atlas PATCH v94.059 – značky, přetažení, pozice družiny

**Základ:** v94.058 (patch je přírůstkový; předchozí podklady Atlasu ponechte).

## Změny
- Vizuální velikost vlastních značek reaguje na zoom hlavní mapy i K5. Souřadnice značek zůstávají v původních souřadnicích jednotlivých map.
- Nová značka není po uložení automaticky zvýrazněná a její popisek se automaticky neotvírá. Samotné najetí myší popisek neotevře.
- Popisek a zvýraznění se zapínají kliknutím na značku nebo na její název v seznamu. Druhé kliknutí na vybranou značku, kliknutí mimo ni nebo Esc zobrazení zavírá.
- Stisknutí a podržení levého tlačítka na značce a následné přetažení okamžitě mění její polohu. Po uvolnění se nové mapové souřadnice uloží do stávajícího localStorage klíče `hmk-atlas-markers-v1`, bez potvrzovacího dialogu.
- Nový typ **Pozice družiny** je první v seznamu typů. Nad tlačítkem „Přidat značku“ je i rychlé tlačítko **Pozice družiny**, které zapne umístění značky tohoto typu.
- Ve formuláři značky se nejdříve vybírá **Typ značky**, potom se zadává **Název značky**.

## Instalace
Rozbalte ZIP do kořene existujícího repozitáře (zachovat strukturu cest). Přepište `index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js`. Žádné PDF, mapové obrázky ani dřívější značky nemažte. Po aktualizaci na GitHub Pages proveďte Ctrl+F5.

## Soubory v patchi
`index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js`, `docs/HMK_ATLAS_PATCH_v94.059.md`.

## Rozsah
Žádné změny pravidlového jádra, kalendáře, cestování ani zdravotních mechanismů. Značky zůstávají lokální a oddělené pro I4–L7 a K5. Toto není změna jejich synchronizace mezi zařízeními.

## Ověření
JS syntax `node --check` u `app.js` a `atlas-viewer.js`. Izolovaný Chromium/Playwright průchod s reálným CSS: party shortcut, pořadí formuláře, nové značky bez zvýraznění, klikací tooltip místo hover, zoomované značky, okamžité přetažení se zápisem nových souřadnic, zavření kliknutím mimo, výběr v seznamu, editace, přechod mezi mapami a samostatný průchod detailu K5. Samotné vykreslování PDF.js v tomto testu nebylo ověřeno; jeho kód se neměnil.
