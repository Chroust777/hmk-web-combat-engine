# HMK Keeper’s Ledger v93.735 — cílená oprava výživy, zajištěného prostředí a kalendáře

**Datum:** 5. 11. 2026  
**Vstup:** kompletní v93.734 z předchozí etapy (bez zásahu do Combat/Initiative, Foraging dokončení ani pravidel zvířat).  
**Pravidlový základ:** HârnMaster Kèthîra v1.2, str. 186 (Starvation a Thirst), str. 184–185 (Exposure Advance / Healing), str. 120–121 (základní nádoby a zásoby).

## Zjištěná příčina nesouladu termínů na fotografiích

- Již vzniklý **Starvation/Thirst** stav měl v kalendáři uveden původní vzdálenější termín **Advance d100** (u Starvation typicky za tři dny, u Thirst za jeden den po nástupu).
- Když se při dalším posunu GM skutečně uzavřel nový 24hodinový nutriční den s plnou dávkou, stávající zdravotní modul správně určil **dřívější Healing d100 na konci dne**. Tento nový termín mohl zablokovat posun, přestože předem zobrazený plán ukazoval až pozdější Advance. Fotografie bez databáze uložené kampaně neumožňují určit původ jednotlivých stavů na 100 %, ale tento reprodukovatelný scénář přesně vysvětluje uvedený typ nesouladu.
- v93.735 kalendář nyní **předběžně ukazuje nejbližší Healing termín**, pokud je budoucí plná dávka dostatečně doložena již zaznamenanou skutečnou konzumací nebo pokračujícím GM zajištěním. Uveden je i jeho předběžný charakter; změna GM zajištění před uzávěrkou může předpoklad změnit. Samotný hod se nevymýšlí. Při pohybu na přesný termín se teprve uzavře účet a zůstane povinný skutečný původní zdravotní průvodce.

## Produkční změny

### 1. Zajištěné prostředí ↔ Zásoby a výživa

- Zaškrtnutí „PC v zajištěném prostředí“ se bezprostředně projeví v kartě postavy i průvodci „Průběžné zásobování zajištěno GM“ jako **Ano** pro jídlo i vodu.
- Původní časově platné doklady `calendarPCShelteredStay` a `calendarNutritionProvisionSwitch` zůstávají samostatné; pro stejnou péči nevzniká dvojí doklad, spotřeba nebo inventární položka.
- Dokud je zajištěný pobyt aktivní, nelze přes druhé tlačítko ručně vynutit odporující „Ne“; GM ho nejprve vypne v přehledu času.
- Po vypnutí pobytu se obnoví nezávislá skutečná zásobovací volba GM. Žádná již započtená minuta se zpětně neodstraňuje.

### 2. Skutečná konzumace a časově správný účet

- Denní požadavky zůstávají podle HMK **potravní dávky a galony za 24 hodin**. Nenahrazují se neexistujícím pravidlem „první sousto každých 24 hodin resetuje hladovění“.
- Nově se do denního účtu započte i **manuálně potvrzené snědení fyzických dávek** (`calendarInventoryRationUse`) a **vypití z nádoby** (`calendarInventoryWaterUse`) bez `nutritionDayId`. Dřívější verze mimo jiné přihlížela jen k některým Foraging konzumacím a automatickým debitům. Po započtení již jeden a tentýž příděl není odečten automaticky podruhé.
- Výslovně se **nezapočítává krmení/napájení zvířete ve stáji** (`stableHub574.type='care'`) jako příjem potravy či vody jeho lidského vlastníka.
- V detailu „Historie poslední dávky a doklady“ se nově zobrazuje poslední skutečně doložený příjem pro jídlo a pro pití zvlášť. **Přesný čas osobní spotřeby** je odlišen od **času automatické denní účetní uzávěrky**; pouhé nalezení/koupení/nesení jídla či vody netvoří falešný okamžik konzumace.
- Převzatá voda bez spotřeby i nalezené jídlo bez spotřeby zůstávají zásobou, ne již snědenou nebo vypitou denní dávkou. Původní Foraging, přidělení, inventář, ENC a původní potvrzený čas se nemění.

### 3. Starvation / Thirst a lékařské termíny

- HMK str. 186: **nástup** po dni bez potřebné dávky (nebo po dvou dnech polovičních dávek), **Advance** po třech dnech u hladovění / po jednom dni u žízně; při opětovném plném přídělu je každý takový den zapotřebí **Healing Roll**, nikoliv automatické smazání již vzniklé nemoci.
- Předvídaný nový Healing termín se v kalendáři ukáže také v případě skutečně **snědeného/vypitého, doloženého Foraging nálezu**, nikoliv jen na základě jeho vlastnictví. Stejné pravidlo platí u doloženého zajištěného pobytu a průběžného GM zásobování.
- Chybové hlášení odlišuje **Healing d100** od **Advance d100**, aby GM nebyl mylně informován jen o obecné „Starvation d100“.
- Předpověď nejbližšího Healing **není** nový zdravotní model ani nový hod a zdravotní datum vzniká autoritativně v původním `hmk-malnutrition-medical.js`. Plné pokrytí daného dne může zrušit další **nedostatek**, ale nevyléčí starší aktivní Starvation/Thirst bez skutečného Healing d100.

## Testy

| Sada | Provedených kontrol | Stav |
|---|---:|---|
| `test_93735_supply_malnutrition.cjs` — aktuální nový cílený test (budoucí Healing, bezpečný pobyt, čas a spotřeba, majitel vs. zvíře) | 52 | PASS |
| `test_93734_episode_allocation.cjs` | 44 | PASS |
| `test_93734_stalking_vigilance.cjs` | 30 | PASS |
| `test_foraging_water_storage.cjs` | 45 | PASS |
| `test_93734_animal_health.cjs` | 70 | PASS |
| `test_93734_animal_completion.cjs` | 26 | PASS |
| `test_93734_animal_load_timeline.cjs` | 118 | PASS |
| `test_93734_animal_weather.cjs` | nejméně 93 | PASS |
| `test_93734_healing_remaining_544.cjs` | 68 | PASS |
| `test_93734_healing_surgical_audit_542.cjs` | 39 | PASS |
| `test_93734_multi_infection_healing_541.cjs` | 49 | PASS |
| `test_93734_animal_departure.cjs` | 15 | PASS |
| `test_93734_skill_chain_545.cjs` | 1905 | PASS |
| `test_93734_skill_animal_survival_539.cjs` | 55 | PASS |
| `test_nutrition_activity_392.cjs` | 50 | PASS |

**Celkem nejméně 2 659 potvrzených kontrol** v 15 spuštěných úspěšných sadách (další počty ve vedlejších kontrolách animal/weather neuvádím).

Statická syntaxe: `node --check` pro upravené JS moduly i `app.js`: PASS.

### Co zůstává otevřené a nebylo vydáváno za PASS

- Reálný browser E2E průchod přes UI nelze na tomto testovacím stroji potvrdit: lokální Chromium vrací `net::ERR_BLOCKED_BY_ADMINISTRATOR` také při otevření vlastního HTTP serveru na `127.0.0.1`.
- Dva historické testy `test_nutrition_rest_calendar_501.cjs` a `test_nutrition_rest_calendar_501_507.cjs` stále selhávají na očekávání `weariness:20→15` proti starému zdravotnímu modelu. **Stejné selhání bylo reprodukováno ve vstupní v93.734, tedy nebylo zavedeno tímto patchem**. Neoznačuji je za PASS ani nepřepisuji bez samostatného auditu odpočinku.
- U předpovědí Healing pro **pouze vlastněné** fyzické zásoby bez zapsané konzumace kalendář neslibuje konkrétní dřívější datum, dokud není uzavřen skutečný den. Předpokládat, že postava určitě sní všechno, by porušilo požadavek na auditní doklad, a navíc krmení zvířete by se mohlo chybně připsat člověku.
- Již historicky doložená onemocnění v uložených kampaních nejsou automatikou mazána. Pokud starý software vytvořil chybný zdravotní doklad, je nutná samostatná dohledatelná korekce s GM; současná oprava zabraňuje novému chybnému účtování. Pro čistou reprodukci začněte s novou **testovací** kampaní, nikoli přepisem ostré historie.

## Instalační soubory

Patch je určen jako překryv kořene GitHub repozitáře. Soubory:

- `app.js`
- `index.html`
- `src/integration/hmk-nutrition-days.js`
- `src/integration/hmk-calendar-automatic-followups.js`
- `src/integration/hmk-character-provisions-overview.js`
- `tools/test_93735_supply_malnutrition.cjs` (test)
- `docs/AUDIT_VYZIVA_KALENDAR_v93.735.md` (tento audit)

**Nenahrávejte ZIP jako jeden soubor na GitHub Pages.** Rozbalte a přepište příslušné soubory se zachováním adresářů. CSS, ostatní integrační moduly, obrázky ani databáze postav se tímto patchem nemění. `index.html` a `app.js` mají aktualizované verze/cache query na v93.735.
