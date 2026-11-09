# HMK Keeper’s Ledger v93.793 — cílené pokračování auditu Cestování

**Základ:** dodaný FULL ZIP v93.792. **Rozsah:** čtyři požadované oblasti (Shock/Compound, Cold Exposure, Injury Morale/Treatment, možné duplicity v deníku). Pravidla HMK v1.2, zejména Injury Sequence str. 167–170, Weather Injury Care str. 177–182 a Cold/Heat str. 185. **Combat a Mysteries nejsou předmětem tohoto auditu; jejich pravidlové moduly nebyly měněny.**

## 1. Podmíněné Shock d100 a Compound d10 — oprava + prohlížečový PASS

- **Potvrzená závada v93.792:** ve formulářích následků Survival Accident / Fishing CF a Falling Routine bylo možné vyplňovat Shock a Compound, přestože ještě nebyl doložen účinný Impact / kompatibilní předchozí rána. Pravidlová validace přicházela až při potvrzení.
- **Oprava:** formulář průběžně vyhodnocuje d10 Impact, ZD, LD, skutečnou ochranu aktuálně nasazené zbroje, anatomickou lokalitu a stranu, kompatibilní předchozí ránu. Shock d100 se zpřístupní, jen když efektivní Impact po AV > 0; Compound d10 pouze při přípustné starší ráně. Nepoužitelné hody jsou `disabled`, nepovinné a jejich zastaralé hodnoty se čistí. Změna typu hazardu opět obě pole zamkne.
- **Další potvrzená mezera:** generátor kostky se u původně zamčeného pole vůbec nevytvořil. Oprava zavádí výslovné `data-hmk-dice-when-enabled` jen pro podmíněné Shock/Compound v těchto necombatních formulářích a generátor odemyká zároveň s polem. Vygenerování čísla samo nic neukládá ani nepotvrzuje.
- **Chromium PASS** `python tools/browser_93793_physical_dice.py`: Accident při skutečné ráně (Shock ano, Compound ne), nová kompatibilní rána (oba ano), změna hazardu (oba ne, staré hody vymazány), Falling na měkký dopad (oba ne), tvrdý dopad (oba ano); interaktivní generátory a žádný předčasný zdravotní zápis.
- Výpočty na pozadí jsou nadále kontrolovány autoritativním pravidlovým procesorem.

## 2. Cold Exposure — oddělené lokace a generátory — prohlížečový PASS v ověřeném rozsahu

- **Chromium PASS** `python tools/browser_93793_skin_locations.py`: samostatné `ha:left` a `ha:right`; dvě lokace Frostbite bez rány nezpřístupní Shock ani Compound; Sunburn na levé ruce zpřístupní Shock jen zasažené lokace, pravá lokalita čeká na dokončení předchozího nutného hodu a při nezranění se u ní další hody nezpřístupní.
- Generátor d100/d10 je přítomen u podmíněných polí, generuje až po odemčení; při uzamčení nelze generovat a nevzniká předčasný zdravotní zápis.
- **OTEVŘENO:** extrémní Frostbite při výpočtu přes IL5 nelze pravidlově rozhodnout bez dalšího stanoviska GM; systém bezpečně odmítá vytvořit smyšlenou ránu, ale plně ověřený postup dokončení takového scénáře v UI zatím chybí. Nepovažovat tuto větev za uzavřenou.

## 3. Injury Morale a Treatment — prohlížečový PASS v testované cestě

- `python tools/browser_93793_treatment_regression.py` (syntetický pacient/poranění a skutečný ošetřující): doložený Accident, navazující Injury Morale, skutečný Treatment, včasné dokončení a Healing Roll. Neúplný Morale d100 skutečně navede fokus na chybné pole a odmítne potvrzení.
- Po zahájení časovaného zákroku se stejná rána nezobrazí k druhému souběžnému zahájení; dvě skutečné jednotky obvazů se odečtou **jednou** při zahájení. Kalendář se posune jen prostřednictvím potvrzeného časového intervalu; žádné automatické otevření Combat.
- **OMEZENÍ:** test je syntetický scénář, nikoliv proklikání všech možných pacientů, komplikací, léčebných metod a výjimek. Nelze z něj usuzovat na veškeré zdravotní formuláře.

## 4. Deník zranění — identita/duplicitní zrcadlo — prohlížečový PASS

- `python tools/browser_93793_journal_identity.py`: tři různé rány s unikátními identifikátory (dvě na stejné `ha`, jedna na `fo`) + jeden duplicitní záznam se stejným ID ve starší evidenci. UI zobrazilo **3 reálné rány**, nikoliv 4. Samostatné rány na stejné lokalitě se naopak nesmějí automaticky sloučit.
- **NOT TESTED:** konkrétní uložená kampaň ze snímku uživatele; bez originálních dat/ID nelze potvrdit ani vyvrátit duplicitu právě tam. Fotografie deníku nejsou strojově jednoznačný důkaz totožných identifikátorů.

## Cílené výpočetní regrese

- `node tools/test_93792_treatment_morale_guards.cjs` — PASS, 10 invariantů.
- `node tools/test_93775_skin_terminal.cjs` — PASS, 31 tvrzení.
- `node tools/test_93770_accident_global_cutoff.cjs` — PASS, 6 kontrol.
- `node tools/test_93752_accident_origin_calendar.mjs` — PASS, 51 kontrol.
- `node tools/test_93785_travel_matrix.mjs` — PASS, 7 869 kombinací.
- `node tools/test_falling_release_487.cjs` — **FAIL TEST SCRIPT**: zastaralé pevné očekávání verze, selhává již na `version constant`, nezačne pravidlové assertions. Není důkazem chyby produkce.

## Bezpečnost a vydání

Všechny opravy jsou v `app.js` a odvozeném `hmk-app.bundle.js`, pouze necombatní formuláře a jejich podmíněné dice UI. Žádné změny ve `src/rules/combat*`, v Mistériích ani v autoritativní cestovní/bojové mechanice. `index.html` pouze aktualizuje zobrazené číslo verze a cache parametry. Nové soubory v `tools/` jsou izolované regresní testy.

**Verdikt:** body 1–4 cíleně ověřeny, u bodů 1 a 2 opravena obsluha podmíněných hodů. **Cestování jako celek není definitivně uzavřené** (především extrémní Frostbite IL>5 a zbylé neprokliknuté kombinace). Odpočinek, Spánek ani Krátký klid samostatně neauditovány.
