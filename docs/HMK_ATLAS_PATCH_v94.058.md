# HMK Keeper’s Ledger — Atlas PATCH v94.058

Výchozí verze: **v94.057**. Patch mění pouze vzhled a chování modulu Atlas a označení verze. Je kumulativní pro změny této verze Atlasu, neobsahuje však mapové assety: ty je potřeba zachovat z v94.051–v94.054.

## Co se mění

1. Z pravého panelu zmizelo tlačítko **Odstranit body**.
2. **Ukončit měření** vypne režim měření a smaže všechny měřicí body, spojnice i výsledky právě naměřené trasy. **Nové měření** také smaže starou trasu, ale nechává aktivní režim měření.
3. Při přechodu mezi přehledovou mapou a K5 se vypne měření a vyčistí měřicí trasy obou map.
4. Pravý panel má novou sekci **Vlastní značky**. Tlačítkem „Přidat značku“ se aktivuje umístění kliknutím do mapy. Poté uživatel zadá název, typ a nepovinný popisek.
5. Značky zůstávají připnuté na souřadnici originální mapy při zoomu a posouvání. Po najetí myší / zaměření klávesnicí zobrazují vlastní textový popisek.
6. Seznam značek vpravo ukazuje značky **aktuální mapy**. Kliknutí na název vycentruje a zvýrazní bod na mapě. Tlačítka **Upravit** a **Zrušit** umožní změnu popisku/typu nebo smazání značky (po potvrzení).
7. Značky se ukládají do samostatného klíče `localStorage` (`hmk-atlas-markers-v1`) **v daném prohlížeči a zařízení**. Není to cloudová synchronizace ani zápis do kampaně, cestování nebo jiných herních dat. Vymazáním dat webu se smažou i tyto značky. Pokud prohlížeč ukládání blokuje, práce se značkami probíhá jen do obnovení stránky a Atlas tuto skutečnost oznámí.

## Instalace

Obsah ZIPu zkopírujte do kořene repozitáře `hmk-web-combat-engine` a přepište soubory stejného jména:

- `index.html`
- `app.js`
- `atlas.css`
- `src/ui/atlas-viewer.js`
- `docs/HMK_ATLAS_PATCH_v94.058.md`

**Nemažte** `assets/atlas/harn-I4-L7.webp`, `harn-map-key.webp`, `k5-detail-map.pdf` ani `k5-detail-legend.webp`. Patch neobsahuje žádné změny mapových podkladů.

Po publikaci GitHub Pages doporučujeme **Ctrl+F5** kvůli prohlížečové cache.

## Kontrola

- Kontrola syntaxe `app.js` a `src/ui/atlas-viewer.js`: PASS.
- Izolovaný browser průchod se skutečnými globálními styly: PASS pro vytvoření, zvýraznění, hover popisek, editaci, odstranění a ukládání značek, oddělení K5 a hlavní mapy, zoom a ukončení měření s vymazáním trasy.
- PDF.js samotné vykreslování nebylo v tomto lokálním browser průchodu ověřováno; tato část se neměnila.
- Úplné regresní testy celého HMK Keeper’s Ledger nebyly spuštěny.
