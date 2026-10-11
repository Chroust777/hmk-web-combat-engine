# HMK Keeper’s Ledger — v93.140 (G03)

Webová aplikace HMK Combat Engine pro HârnMaster: Roleplaying in the World of Kèthîra.

## Spuštění

Aplikace je tvořena statickým HTML, CSS a JavaScript ES moduly. Pro provoz na GitHub Pages není potřeba npm, Node.js ani build.

- `index.html` — vstup aplikace
- `app.js` — hlavní modul a integrace rozhraní
- `styles.css` — styl aplikace
- `src/` — produkční pravidlové, integrační, doménové a stavové moduly
- `.nojekyll` — kompatibilita GitHub Pages
- `.gitignore` — pomocná pravidla pro Git

V **Settings → Pages** zvolte `Deploy from a branch`, větev `main`, složku `/(root)` (případně používejte vlastní funkční způsob nasazení). K otevření použijte URL GitHub Pages; přímé spuštění HTML ze souboru nemusí umožnit ES modulové importy.

## Aktuální stav

- **v93.140** — dokončená cílená regrese G03 (historie přerušení koncentrace)
- **G04** — kombinovaná integrace/regrese dosud neuzavřena
- Vzhled aplikace nezměněn oproti produkčnímu v93.140
- Důležitá bojová rozhodnutí a hody zadává GM, aplikace je negeneruje automaticky
- Toto je *čistá běhová distribuce*. Nezahrnuje archivní testy `test/`, `tests/`, staré pravidlové dokumenty `docs/` ani text knihy `hmk.txt`.

## Data a aktualizace

Pracovní data aplikace se uchovávají v úložišti prohlížeče. Před zásadními změnami nasazení proveďte dostupný export/zálohu v aplikaci. Aktualizace souborů v repozitáři sama o sobě není exportem uživatelských dat.

## Regrese

Testy používané při vývoji G01–G03 byly prováděny odděleně od této produkční distribuce. Tento ZIP **neobsahuje běžitelnou npm regresní sadu** a netvrdí, že všechny možné kombinace HMK prošly end-to-end. V G04 se připraví nová trvalá sada pro aktuální zdrojový kód.
