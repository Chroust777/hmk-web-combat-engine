# HMK Keeper’s Ledger v94.080 – Posouvání mapy při editaci historie družiny

Výchozí stav: kompletní ZIP v94.077 + vydané patche v94.078 a v94.079 (v tomto pořadí). Patch je přírůstkový vůči v94.079.

- Tažení levým tlačítkem za volnou plochu v režimu historie družiny nyní používá existující posun mapy. Tažení za bod nebo ikonku zachovává původní editaci bodu.
- V režimu Pokračovat v pohybu krátké kliknutí do mapy stále přidává bod; tažení za volnou mapu nepřidává bod. V režimu Upravit body krátké kliknutí mimo body nic nemění.
- Posun mapy neprovádí zápis kampaně, nemění rozpracovanou historii, výběr ani zásobníky Zpět/Znovu. Přesun je omezen původními hranicemi kamery.
- Doplněna nápověda a kurzor při tažení. Aktualizována verze a cache-busting odkazů.

## Ověření

- Node syntax check: app.js, atlas-viewer.js, atlas-cartography.js – PASS.
- Chromium: obě mapy I4–L7 a K5, odstranění prostředního bodu, posun v obou osách a zpět, kontrola souřadnic bodů, ikonky, výběru, rozpracované historie a nulových zápisů; Undo/Redo; pokračování pohybu bez přidání bodu tažením; kliknutí přidá bod; přetažení vrcholu a uložení – PASS.
- Regrese v94.079: undo/redo, cancel, ukládání, odmítnutý zápis, zkrácení historie, přesuny, odstranění družiny, klasická trasa – PASS.
- Regrese v94.078: heslo, Enter, průsvitnost, štětec, zoom, zavření, Escape a remount na obou mapách – PASS.
- Testy provedeny se skutečnými moduly Atlasu v Chromiu s izolovaným paměťovým adaptérem. Skutečný vzdálený GitHub Cloud, kompletní start z GitHub Pages ani PDF.js nebyly ověřeny.

Žádný zásah do pravidlových modulů nebo formátu dat. Žádné produkční nasazení.
