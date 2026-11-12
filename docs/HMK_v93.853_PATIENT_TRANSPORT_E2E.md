# HMK Web Combat Engine – v93.853: přeprava nepohyblivých pacientů

**Datum auditu:** 12. 11. 2026  
**Výchozí kontrolovaný FULL:** `HMK_v93.852_FULL.zip`  
**Nové vydání:** v93.853  
**Pravidlová autorita:** HârnMaster v1.2, zejména tištěné strany 122 a 145–146  
**Metodika:** klikání v izolovaném Chromiu přes aktuální cestovní UI, skutečné formuláře Skill Tests, potvrzení po jednotlivých krocích, kontrola interní trvalé kampaně po finálním kliknutí. Deterministické testovací postavy a ručně zadané hody nejsou skutečnými výsledky uživatelovy hry.

## 1. Otevřená větev z v93.852 a její uzavření

Dříve byl ověřen výběr vozidla, postroje a výpočet hmotnosti, ale nikoli dokončení přepravy nepohyblivého pacienta. Tento audit poprvé dokončil konkrétní cestovní epizodu s nepohyblivým pacientem v káře **přes skutečný Skill Workbench, všechny vyžádané hody, tlačítka „Vložit číslo“, přípravu skupin a jediné finální potvrzení společného okna**.

### Úspěšné Chromium E2E scénáře

| Scénář | Potvrzený sled | Výsledek |
|---|---|---|
| **1. Vůl + kára, pacient v UNC, jiná skupina pěšky** | Chybějící transport označen červeně; skutečný vůl, postroj, kára, náklad 270/2 500 lb; Animalcraft a Survival; Progress d10; END jen u chodícího průvodce; 2 doklady, jedno finální potvrzení, 480→525 | **PASS** |
| **2. Pacient na koni, průvodce jde pěšky** | Skutečný palfrey, uzda, deka a sedlo; Riding + Survival; zatížení koně 120 lb pacient + 14 lb výstroj = **134 lb**; END jen průvodce; 2 skupiny, 480→525 | **PASS** |
| **3. Pacient a průvodce na jednom koni** | Riding + Survival; hmotnost koně 120 lb pacient + 150 lb průvodce + 14 lb výstroj = **284 lb**, ENC 30; 2 skupiny, 480→525 | **PASS** |
| **4. Dva pacienti UNC v jednom čtyřkolovém voze** | Dva koně se stejným druhem postroje, vůz; pacienti 120+170 lb, průvodce 150 lb, **440/6 400 lb**; Animalcraft + Survival, END jen průvodce; 1 doklad, 480→525 | **PASS** |
| **5. Pacient UNC a druhý pacient s Fatigue 40 ve voze** | Totéž vozidlo a náklad; druhý pacient je nepohyblivý kvůli únavě, nikoli Shock; nový Progress počítá zvýšené Slow, žádný END přepravovaných; 480→525 | **PASS** |
| **6. Dva pacienti na jednom koni – negativní test** | Viz reprodukovaná chyba a oprava níže | **PASS po opravě** |

Ve výše uvedených pozitivních průchodech byly vyvolány pouze skutečně potřebné Skill Tests, potvrzené výsledky se připojily ke správné epizodě a společný kalendář byl posunut jednou. Zdravotní stav testovacího pacienta UNC zůstal v dokladu i trvalém stavu zachován. Navigace k chybějící přepravě byla přístupná a její kontejner byl označen jako povinný.

**Povaha fixture:** UNC a Fatigue 40 jsou předchozí testovací zdravotní podmínky. Tento E2E audit nepředstírá, že vznikly v těchto scénářích skutečným Combat Injury/Shock postupem. Vlastnictví zvířat a výstroje se potvrzovalo kliknutím v testovací Stáji (volby GM zdarma), nikoli domyšleným vlastníkem v jádře enginu.

## 2. Nalezená chyba – Riding nabídnut před kontrolou nemožné přepravy

**REPRODUKCE v93.852 – FAIL:** skupina zahrnuje dvě nepohyblivé osoby (B a C); oba jsou označeni jako pacienti, pro přepravu je zvolen pouze jeden konkrétní kůň s předepsanou výstrojí. Tlačítko **„Naložit pacienty“** správně varovalo, že na daném koni nelze přepravovat dva pacienty. Avšak po **„Vyhodnotit epizodu“** checklist místo chyby dopravního plánu nabídnul **Riding Skill Test**. Uživatel tak mohl zbytečně vyhodnotit doklad, než jej finální kontrola zablokovala.

**OPRAVA v93.853:** `episodeSetupIssue()` v `app.js` před prvním Skill Testem porovná počet skutečně nepohyblivých účastníků s dopravou `mount`. Jsou-li pacienti dva a více, nabídne konkrétní chybu a přesun na **„Způsob dopravy“**, s doporučením káry či vozu. Žádná zdravotní pravidla ani pravidlový výsledek se tím nepřepisují. Autoritativní kontrola `securedMountedPassenger93816()` v `src/integration/hmk-transport-passengers-93816.js` zůstala beze změny.

**REGRESE – PASS:** při opakovaném skutečném kliknutí vznikne stav „Nedokončené nastavení“, funguje **„Přejít na chybějící údaj“**, input `conveyance` získá fokus a červené označení `hc-episode-needs-input`. Riding tlačítko se zatím nenabízí, nevznikne žádný nový Skill Test a čas zůstane 480. Po změně dopravního plánu existují samostatné pozitivní průchody pro jednoho pacienta na koni i dva pacienty ve voze.

## 3. Další samostatné regresní kontroly

| Test | Výsledek | Typ |
|---|---|---|
| `tools/audit_terrain_93851.mjs` | Celá tabulková matice, bez neshody | **PASS, deterministický** |
| `tools/regress_93851_travel_rules.mjs` | 32/32 kontrol | **PASS, deterministický** |
| `tools/test_93755_staggered_patient_calendar.cjs` | 17/17, dvě rozdílné splatnosti Healing; zakázaný přesun přes termín | **PASS, deterministický** |
| `tools/test_93794_single_patient_compound.mjs` | 13/13, více zdravotních závazků na jedné postavě | **PASS, deterministický** |
| JavaScript syntax + porovnání překladu `app.js` do bundle | Bez rozdílu | **PASS** |

Tyto deterministické kontroly **nejsou** dodatečně označovány za interaktivní proklikávání.

## 4. Kontrola UI, persistence a omezení

- **PASS:** všechny pozitivní scénáře skutečně dokončily cílovou epizodu a zápis společného kalendáře. Po výslovném „Potvrdit všechny činnosti“ zmizela rozpracovaná fronta, vznikl jeden doklad časového okna. Po obnovení testovacího stavu z `storageBaseline` zůstal čas 525 a epizody přítomny.
- **PASS:** nepohyblivý pacient není považován za chodícího při END; jeho transportovaná hmotnost se přičítá pouze jednou. Vůz i kára používají skutečná Stájová ID.
- **PASS:** červené označení nedoložené přepravy a nové červené označení nepřípustného typu dopravy, dostupné navigační tlačítko, žádná chyba `pageerror` v dokončených scénářích.
- **BLOCKED:** skutečný `HTTP` load/reload stejné stránky v prostředí auditu vrací `net::ERR_BLOCKED_BY_ADMINISTRATOR` pro localhost. Izolované obnovení ze storage prostřednictvím testovacího helperu nelze vydávat za plnohodnotný HTTP reload.
- **NEOVĚŘENO:** načtení skutečných uživatelských uložených dat na GitHub Pages; pacient vytvořený kompletní Combat procedurou, skutečná synchronizace cloudu; proklikání zdravotní splatnosti přes celý přepravní interval a všech možných kombinací Injury/Coma/Poison.

## 5. Rozsah změn

**Změněno pouze:** `app.js`, `hmk-app.bundle.js`, `index.html` a vygenerovaný SHA-256 manifest. **Nové:** auditní zpráva, šest reprodukčních E2E skriptů, sestavovací skript a dokumentované testovací screenshoty/JSON/logy v `tools/evidence_93853/`. Původní CSS, všechny grafické soubory, zdrojové pravidlové moduly v `src/` a existující uživatelská datová schémata jsou beze změny.

## 6. Vydání

FULL a rozdílový PATCH vycházejí ze skutečného FULL v93.852. Je požadována shoda po jednotlivých SHA-256 souborech mezi (v93.852 FULL + PATCH) a v93.853 FULL. Kontrola a soupis změn jsou v samostatném JSON `HMK_v93.853_PATCH_VERIFICATION.json`.
