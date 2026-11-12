# HMK Web Combat Engine — cílený regresní audit v93.850

**Datum:** 12. 11. 2026. **Výchozí ověřený FULL:** `HMK_v93.849_FULL.zip` (SHA-256 `bfc4b62be8c4e18c23665e10e17a38182ce7efc8d2c594ec6b388e7a387ce1bc`). **Nová verze:** v93.850. **Pravidlová autorita:** HMK v1.2, znění a postup již implementované v engine. **Práce:** uživatelem požadované opravy UI, žádný nový výklad pravidel, žádné vymyšlené výsledky, žádná automatická oprava předmětů.

## Reprodukované závady a změny

1. **Direction Hazard: potvrzený d10 ponechával starý úkol vpravo.** Reprodukce: jedna postava, smíšený les (nutný Bearing), skutečný Survival/Orienteering test, 2 ručně přidělené Progress místo Bearing, Direction Hazard `6` (Misdirection), d10 směru `7`. Po „Vložit číslo“ byl d10 přijat, ale `episodeFormSnapshot` správně nezpřístupnil hodnotu pro výpočet, protože `episodeHazardConfirmation93840` čekal ještě na explicitní „Potvrdit postup“. Pravý panel však opakoval požadavek na samotný d10. **Oprava:** nyní zobrazuje „✓ Směr odchýlení: d10 7 → Potvrdit postup Direction Hazardu“; toto tlačítko výslovně potvrdí existující GM hazard postup, teprve pak se nabídne Awareness / výslovné rozhodnutí pokračovat bez něj. Bez kliknutí nic neukládá a neobchází validační pravidlo. V pravém panelu je nyní dostupná také vědomá volba „Bez Awareness“.
2. **Jedna skupina: „vše doloženo“, ale potvrzovací tlačítko zůstalo neaktivní.** Sjednocena dostupnost tlačítka pro společný interval s aktuálním checklistem a existujícími branami pro hazard a neodsouhlasené kostky. Skutečně prokliknutý test `Survival CF → d10 5 (Accident) → END d10 10` dokončil jednu epizodu a společný kalendář **480 → 510 právě jednou**; zdravotní pokračování `pending-original-skill-combat` zůstává separátním následným postupem. Nejde o předstírané vyřešení úrazu.
3. **Povrch stop přepisován auto-odvozením ze silnice.** `trackingRoad` nyní na události `input` okamžitě označí úmyslný GM override, takže náhodný následný přepočet nemění explicitně vybranou „Nezpevněná cesta“ / „Zpevněná cesta“. Obě varianty byly v Chromiu vybrány a zůstaly po změně počtu sledovaných osob; bez uložení nebo posunu času.
4. **Nepřehledné vícečetné skupiny.** Hlavičky sekcí 2, 3, 4, 5 zobrazují aktuální jména členů *dané otevřené skupiny* v závorkách. Není do nich vnášena jiná skupina.
5. **Volné nebo nejasné zadání ★ mimo správnou fázi.** Při skutečně doloženém Orienteering SV s kladným počtem Advantage Modes se vyžádá výslovné tlačítko: automatické, nebo ruční. Ruční volba dále vyžaduje „Potvrdit ruční rozdělení ★“. Do výběru žádné psaní, Enter ani změna selectu neposouvají proceduru. Překročený počet ★ lze opravit; při chybě validačního náhledu se již zjištěný počet ★ zachová pro stejný Survival doklad a stejnou epizodu. Po navazujícím potvrzeném hodu nelze ruční Modes potichu změnit (předchozí hody se tak nepřepoužijí).
6. **Fokus po posledním hodu.** Po „Vložit číslo“, pokud jsou všechna pravidlová potvrzení hotova, může fokusem navázat tlačítko pro potvrzení řádku. Kontrola používá skutečný checklist v pravém panelu, ne nesprávně hledaného potomka uvnitř levého `<form>`.

## Klikací regrese — izolovaný Chromium + aktuální bundle v93.850

| Scénář | Výsledek | Doklad |
|---|---|---|
| Tracking: ruční Unpaved/Paved povrch stop, změna následného pole bez přepisu, žádný časový zápis | **PASS** | `tools/browser_93850_one_person.py tracking`, `tools/evidence_93850/browser_93850_one_person_tracking.log` |
| Jedna postava: Survival CF → Survival Hazard 5 / Accident → END → příprava, jeden finální commit 480→510 | **PASS** | `tools/browser_93850_one_person.py accident`, `...one_person_accident.log`, `ONE_PERSON_ACCIDENT.png` |
| Jedna postava: manuální Progress bez Bearing, d10 Direction Hazard 6, d10 směru 7, potvrzení hazardu, výslovné bez Awareness, misdirection přetrvává, jediný commit 480→510 | **PASS** | `tools/browser_93850_one_person.py direction`, `...one_person_direction.log`, `ONE_PERSON_DIRECTION.png` |
| Dvě skupiny: skutečně zakoupený a rezervovaný kůň, navázané Skill Testy, oba řádky potvrzené, jediné posunutí 480→525 | **PASS** | `tools/browser_93850_two_groups.py`, `...two_groups.log`, `TWO_GROUPS_COMPLETE.png` |
| Ruční ★: upravené Orienteering SV 6 → 2 ★; zadání 3 odmítnuto, oprava na 2, potvrzení a následné hody, jediné posunutí 480→525 | **PASS** | `tools/browser_93850_manual_modes.py`, `...manual_modes.log`, `MANUAL_TWO_GROUPS.png` |
| Double Time 135 min, skutečné 3 END d10 s pokynem pro čárkami oddělená čísla, oba řádky, jediné posunutí 480→615 | **PASS** | `tools/browser_93850_double_time.py`, `...double_time.log`, `DOUBLETIME_TWO_GROUPS.png` |

**Skutečné uživatelské přechody:** testy klikaly na formuláře a tlačítka Playwrightem (navigace, hod, návrat, finální potvrzení) a zkontrolovaly uložené doklady a čas. Testovací kampaně, postavy a konkrétní ruční hody slouží výhradně jako reprodukční vstupy do izolované kopie aplikace; nic se nepřenáší do skutečných dat uživatele. Každý úspěšný scénář kontroloval i absenci `pageerror` výjimek.

## Statické/pravidlové regrese

- **PASS 7 869** kontrol: `tools/test_93785_travel_matrix.mjs` (počasí, orientace, pohyb, směr, Encounter, expozice).
- **PASS 1 539**: `test_93833_full_foraging_matrix_audit.cjs`.
- **PASS 70**: `test_93835_stationary_foraging.cjs`.
- **PASS 48**: `test_93836_stationary_cf.cjs`.
- **PASS 58**: `test_93843_equipment_skill.mjs`.
- **PASS 38**: `test_93845_gm_equipment.mjs`.
- **PASS 45**: `test_93846_accident_tracking_complication.mjs`.
- **PASS 79**: `test_93847_anatomy_mount.mjs`; test nejprve nemohl zapsat svůj historický JSON do absentující složky `tools/evidence_93847`, po založení této dočasné složky prošel. Výchozí uživatelská data se nemění.

Celkem **9 746 kontrolních asercí** v osmi sadách. Není to počet UI průchodů, pravidlové pokrytí v procentech ani důkaz úplnosti všech HMK větví. Doloženo v `tools/evidence_93850/*.log`.

## Rozsah, zásady, otevřené oblasti

Změněny jen UI/formulář, verze HTML, styl pergamenu, browser bundle, upřesnění projektového auditního standardu a nové reprodukční/předávací soubory. **Žádné pravidlové moduly `src/` a žádné schéma trvalých dat se nemění**. Zachována výjimka: Equipment Hazard nikdy sám neplánuje povinnou opravu 240 minut. Nic se nepřesouvá do jiných intervalů bez explicitního GM potvrzení.

**NEOVĚŘENO:** veřejný GitHub Pages deployment, skutečný HTTP reload uživatelovy uložené kampaně, cloud sync a všechny kombinace nemocí, následků Accidents/Complications/Encounter. Chromium test používá `set_content` s aktuálním zdrojově odpovídajícím bundle, ne veřejný URL. Výsledek testů se nepřenáší na nepokryté větve.

**Integrita vydání:** FULL vzniká výhradně z ověřeného v93.849, PATCH obsahuje jen rozdíly. `tools/package_93850.py` zapisuje kořenový SHA-256 manifest a následně kontroluje CRC a SHA-256 **každého** souboru po rozbalení `v93.849 FULL + PATCH`; přesné výsledky jsou v `HMK_v93.850_PATCH_VERIFICATION.json`. Žádná položka předchozího FULL není smazána.
