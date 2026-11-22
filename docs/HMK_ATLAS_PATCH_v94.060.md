# HMK Atlas PATCH v94.060 — menší značky, náhled před uložením, pozice družiny

**Základ:** v94.059. Jde o navazující patch: dříve nahrané mapy, PDF a vysvětlivky zůstávají zachovány.

## Úpravy

1. Při vložení běžné značky se ihned po výběru místa zobrazí **dočasná ikonka přímo na mapě**, i když je formulář typu/názvu/popisku stále otevřený. Změna typu ve formuláři ihned změní symbol na mapě. Ikonka se do lokálního úložiště zapíše až po kliknutí na „Uložit značku“. Zrušení rozpracované značky ji zase odstraní.
2. **Pozice družiny** je pouze symbol bez názvu a popisku. Rychlé tlačítko „Pozice družiny“ umožní kliknutím do mapy ikonku rovnou umístit bez formuláře. Další použití tohoto tlačítka přesune již existující pozici družiny na nové místo (na každé mapě samostatně). Pokud se typ „Pozice družiny“ zvolí ve formuláři běžné značky, pole názvu a popisku se skryjí a nejsou povinná. Přítomnost značky lze nadále spravovat v pravém seznamu jako „Pozice družiny“. Kliknutí na ikonku zobrazí pouze výběrové zvýraznění, nikoliv textovou bublinu.
3. **Velikost ikon se počítá z absolutního zoomu mapy**, nikoli z poměru k výchozímu zobrazení „Celá mapa“. Při 29 % se zobrazuje přibližně 8px symbol a při 175 % přibližně 18px symbol. Neviditelná klikací oblast zůstává dostatečná pro ovládání myší. Bod značky zůstává navázaný na mapové souřadnice.
4. Zachované zůstávají přetahování značek, ukládání do localStorage, měření tras, K5 v PDF, hlavní mapa I4–L7 i nezávislost Atlasu na ostatních herních modulech.

## Instalace

Rozbalit ZIP do kořene repozitáře a přepsat soubory `index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js`. Žádné soubory v `assets/atlas`, žádná PDF a žádné uložené herní záznamy se nemažou. Po publikování GitHub Pages obnovit stránku pomocí Ctrl+F5.

## Ověření

JavaScript syntax: `node --check app.js`, syntaktická kontrola ES modulu `src/ui/atlas-viewer.js`. Chromium/Playwright izolovaný prohlížečový test se skutečnými aplikačními CSS: viditelná dočasná značka, okamžitá aktualizace typu, zrušení bez uložení, shoda polohy rozpracované a uložené značky, správná velikost značek při zoomu, ruční přesun s uložením souřadnic, kliknutí/uzavření popisku, pozice družiny bez formuláře i textových dat, změna její pozice, zachování vícebodového měření a nezávislost K5 od přehledové mapy. Skutečné vykreslení vektorového PDF.js z CDN nebylo předmětem tohoto testu; jeho vykreslovací kód se nezměnil.
