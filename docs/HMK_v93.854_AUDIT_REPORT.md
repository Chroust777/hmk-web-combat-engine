# HMK Web Combat Engine v93.854 — robustní audit přidělování ★

Datum: 2026-11-12. Pravidlová autorita: HMK v1.2, tištěné strany 145–148.
Výchozí archiv: `HMK_v93.853_FULL.zip`; testována produkční cesta `hmk-app.bundle.js` v izolovaném Chromiu.

## Rozsah a pravidlová kontrola

Zkoumal jsem původní Survival Skill Test (SV, úroveň S/F/CS/CF a původní hvězdy), situačně upravené Orienteering SV, přidělení 0–5 ★, automatické priority, ruční alokaci Bearing/Progress/Foraging/Stalking/Vigilance, nízká SV a Lax/Slow, vícečlennou skupinu, Foraging na místě (+2 SV, první dvě ★ přednostně Foraging), přetrvávající Tracking CF Bearing a Lost recovery Bearing, navazující Progress/Direction/END d10, tlačítka, zamykání, ukládání a opětovné načtení staršího cloudu.

## Potvrzené chyby v93.853 a jejich opravy

1. **Auto alokace pro více než 2 povinné Bearing**: `allocateTrekModes()` ve `src/integration/hmk-trekking-correction.js` vyžadoval `requiredBearing <= 2`. Zdroj potřeby ale může správně složit 2 z terénu + 1 Tracking CF + 1 zvláštní Lost recovery = až 4. V93.853 výpočet při hodnotách 3 a 4 skončil výjimkou `Neplatná potřeba Bearing z terénu.` Přitom ruční režim již 3–4 toleroval. Limit byl rozšířen jen na dosažitelných 0–4. Bez úpravy výpočtu skutečných hvězd, rychlostí nebo historie.
2. **Chybná navigace při přečerpání ručních ★**: tlačítko potvrzení vždy zaměřilo `mode_bearing`, i když neplatné bylo například `mode_progress`. Nyní se vybere konkrétní neplatné pole (anebo relevantní kladný režim při překročení celkového rozpočtu), aktivuje se stávající červené označení `hc-episode-needs-input` a přesune se na něj fokus. Nedochází k potvrzení neplatného návrhu.

## Nová testovací evidence

- `tools/regress_93854_stars.mjs` — **1 447/1 447 PASS**. Matice zahrnuje modifikátory původního Survival SV, převod na 0–5 ★, priority a Bearing 0–4, nízké SV a Lax/Slow, ruční režim, přetečení rozpočtu, Stalking/Vigilance maxima a povinné Foraging při stacionární činnosti. Jde o deterministické testovací vstupy; nikoliv vymyšlené uložené hody.
- `tools/browser_93854_tracking_three_bearing.py` — **PASS** v izolovaném Chromiu: skutečně potvrzený Tracking CF, právě jedna povinnost na další cestu, pochod v dunách se 2 terénními Bearing + 1 Tracking CF, Survival s upraveným SV 7 a 3 ★, automatická alokace všech tří na Bearing, následný END a dokončení a jediný posun kalendáře, spotřebování povinnosti. Jediný klik původního historického testu po editaci stopy vyžadoval kvůli nestabilnímu překreslení prohlížeče `force=True`; zbylé potvrzovací kroky byly běžné kliky. Nejde o HTTP test GitHub Pages.
- `tools/browser_93854_manual_invalid.py` — **PASS**: 2 ★, nesprávný návrh 3 ★, odmítnutí bez přijetí, červená barva a fokus na Progress, oprava na 2 ★, explicitní potvrzení, zamčení editace po navazujících kostkách, Direction Hazard, uložení a jeden posun času.
- `tools/browser_93854_foraging_e2e.py` — **PASS, 38 kontrol**: samostatný Foraging, +2 SV, 5 Foraging d10, zásoby, zápis a nový izolovaný běh ze stejného uloženého stavu.
- Dřívější skutečné Chromium scénáře v93.851 znovu spuštěné nad v93.854: **dvě skupiny PASS** (480→525, jeden posun), **Double Time PASS** (135 minut, 3 END d10, 480→615, jeden posun).
- Opravená historická cloudová kopie `hmk-ledger-cloud_OPRAVENO_v93.853.json` načtena z lokálního úložiště v izolovaném Chromiu s novým produkčním bundle: **PASS**, viditelný shell, žádná výjimka, žádná „read-only“ chyba. Cloudový soubor nebyl upravován a není součástí vydání.
- Syntaktická kontrola JS a opětovné sestavení 457 browser modulů: **PASS**.

## Omezení

Nebyly vyčerpány všechny kombinace nízkého SV, současných více Hazardů a Lost recovery v produkčním klikacím formuláři; pro 4 kombinované Bearing je prokázána výpočtová větev, nikoliv nový kompletní E2E průchod. Skutečné GitHub Pages a online reload uživatelovy kampaně nebyly provedeny. E2E regrese používaly izolované testovací kampaně a nepřepsaly cloud uživatele. Není tvrzena 100% certifikace všech stavů.

## Zachování

Provedené změny: `src/integration/hmk-trekking-correction.js`, `app.js` (chybové zvýraznění a číslo vydání), `index.html` (verze), `hmk-app.bundle.js` (sestavené odpovídající zdroje). CSS, obrázky, ostatní moduly, schema trvalých dat, backend GitHub Cloudu a skutečná kampaň jsou nedotčené. Vydání je doplněno reprodukčními skripty, screenshoty a testovacími JSON.

## Výsledek

**PASS pro uvedené testované větve**, **2 potvrzené chyby opraveny**. Ostatní nerealizované kombinace jsou **NEOVĚŘENO**, produkční GitHub reload **NEOVĚŘENO**.
