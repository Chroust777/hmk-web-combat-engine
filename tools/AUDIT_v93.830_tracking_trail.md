# HMK Keeper’s Ledger v93.830 – oprava Identifikace stopy

**Výchozí verze:** FULL v93.829  
**Nová verze:** v93.830  
**Rozsah:** Kalendář → Cestování / Hledání stop → 4 · Dovednosti vybrané činnosti → Identifikace stopy

## Nalezená příčina

`app.js` v93.829 v `episodeIdentityMismatch()` při prvním `input` události přidělil `trackingTrail` do neměnné `episodeEvaluatedIdentity`. Následující `updateEpisodePreview()` zavolalo `episodeLockIdentityControls()` a zakázalo pole ihned po prvním písmenu. Proto nešlo dopsat název stopy a průvodce se přesunul k dalšímu testu předčasně.

## Provedená oprava

1. Nový ovládací prvek **„Potvrdit identifikaci stopy → další test“** (data-episode-confirm-trail) vedle textového pole.
2. Po dobu psaní je text pouze pracovní návrh. Ani `input`, ani `change` nepřiřadí první znak do neměnné identity epizody.
3. Kliknutí na potvrzení ověří neprázdný název, uloží celý text, teprve pak uzamkne `episodeEvaluatedIdentity.trackingTrail` a přepočte seznam povinných kroků.
4. Když je následujícím krokem skutečný Tracking Skill Test, otevře se bez dalšího mezikroku. Pokud je splatná jiná povinnost, systém ji nepřeskočí.
5. Před potvrzením nelze otevřít požadovaný Tracking Test přes obejití seznamu úkolů. Po navázání testu nelze identifikaci měnit, aby se nedal přeřadit původní doklad na jinou stopu.
6. Při předchozím vyhodnocení nevyplněného názvu zůstává input přístupný do explicitního potvrzení; název vyplněný už před vyhodnocením lze potvrdit stejným tlačítkem.
7. Beze změn zůstala pravidlová logika Tracking, d100/SV, Spoor, kalendář i uložená historická data.

## Ověření v Chromiu

- **PASS** – postupné psaní dlouhého českého názvu včetně diakritiky („Stopy zraněného šedého vlka ve sněhu“) znak po znaku bez deaktivace pole, při rozpracované epizodě.
- **PASS** – kontrola, že přímé otevření Tracking testu **před** potvrzením názvu je blokováno se srozumitelnou instrukcí.
- **PASS** – potvrzovací tlačítko uložilo kompletní název a otevřelo správný Tracking Skill Test pro průvodce `a`.
- **PASS** – do nového Tracking testu byl ve skutečném formuláři zadán `d100 = 31`; po návratu byl doklad správně navázán na cestování, název zůstal vyplněný a uzamčený.
- **PASS** – stejné kroky při identifikaci vyplněné již **před** vyhodnocením činnosti.
- **PASS** – nebyla zaznamenána JS chyba prohlížeče.

## Regresní testy

| Test | Výsledek |
| --- | --- |
| `tools/browser_93830_tracking_trail_confirm.py` | PASS |
| `tools/browser_93830_tracking_before_evaluation.py` | PASS |
| `tools/browser_93807_activity_matrix.py tracking 0` | PASS – skutečně uložená 40min činnost |
| `tools/browser_93818_tracking_optin.py` | PASS – kontrolovaný starší scénář Pochodu |
| `tools/test_tracking_provisions.cjs` | PASS |
| `tools/test_93734_episode_allocation.cjs` | PASS |
| `tools/test_93767_shared_travel_window.cjs` | PASS |
| `tools/test_93806_travel_groups.cjs` | PASS |
| `tools/test_93829_weather_no_double_confirmation.cjs` | PASS |
| `tools/test_tracking_awareness_537.cjs` | FAIL, **stejný ve v93.829** (historické očekávání 6 vs aktuální výsledek 5 u SV 10) |

Původní selhání `test_tracking_awareness_537.cjs` nebylo touto změnou způsobeno; nesmí být vykazováno jako PASS.

## Omezení

Nejde o kompletní přetestování všech tlačítek aplikace ani všech výsledků Tracking podle HMK. Prohlížečové testy použily izolované lokální pracovní údaje bez živého GitHub Pages / cloud synchronizace. Změna je cílená na konkrétní problém s textovým inputem, potvrzením a pokračováním k testu.

## Upravené / přidané soubory

- `app.js` – odstranění předčasného uzamčení, explicitní potvrzení, navazující krok.
- `index.html` – verze a cache busting v93.830.
- `hmk-app.bundle.js` – shodné sestavení odpovídající zdrojovému `app.js`.
- `tools/browser_93830_tracking_trail_confirm.py` – regresní browser test po vyhodnocení.
- `tools/browser_93830_tracking_before_evaluation.py` – regresní browser test před vyhodnocením.
- `tools/AUDIT_v93.830_tracking_trail.md` – kopie tohoto protokolu.

Původní v93.829 zůstává nezměněna. Žádné starší soubory se nemažou a žádná pravidlová nebo zdravotní data se nemigrují.
