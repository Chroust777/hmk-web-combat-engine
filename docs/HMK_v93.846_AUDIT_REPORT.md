# HMK Web Combat Engine v93.846 — Audit Accident / Complication / Tracking CF a tažných zvířat

**Pravidlová autorita:** nahrané `HârnMaster Roleplaying in the World of Kèthîra (HMK)`, metadata HMK v1.2. Výchozí technický stav: ověřený FULL ZIP v93.845. Toto je **dílčí auditní release**, nikoliv certifikace celé požadované větve.

## 1. Ověřené pravidlové podklady

- **Str. 147, Stalking/Tracking:** Tracking vyžaduje Stalking Mode (nebo odpovídající samostatnou činnost), Tracking CF ukládá družině jeden Bearing v dalším cestovním období. Nevzniká nový automatický hod ani převod cizího SV.
- **Str. 148, Survival Hazard:** CF Survival způsobuje povinný Survival Hazard d10 nezávisle na modifikovaném SV. d10 1–3 Equipment, 4–6 Accident, 7–10 Complication. Accident vybírá **náhodného člena družiny — člověka nebo zvíře**; jeho Agility při F/CF vede na d6 + 4b Impact do náhodné anatomické lokace, při Agility CF další +5.
- **Str. 149, Complication:** test může provést jeden člen družiny (příklad drover uklidňující pack mules) nebo všichni; dovednosti zahrnují Animalcraft, Agility, Climbing, Timbercraft, Swimming. CS/S/F/CF mají různá zdržení a CF vyžaduje změnu trasy. **Přepočty časových referencí na libovolné minuty jsou projektní implementační pravidlo, nikoliv doslovné pravidlo HMK.**
- **Str. 122:** kára s jedním volem 2 500 lb nebo cart horse 2 000 lb; vůz se dvěma voly 8 000 lb nebo dvěma cart horses 6 400 lb; pro osly a podobná zvířata toto není automatický doložený tah.
- **Str. 355:** Bovine (Oxen): body table C, AV pro blunt 6, Shock 51; Camel: body table C, AV pro blunt 5, Shock 42. Slon má odlišnou anatomickou tabulku J (str. 357) a nesmí být zpracován koňskou B/C rutinou.

## 2. Reprodukované chyby a opravy

### A01 · Neúplný a nebezpečný výběr oběti při Accident s tažnými zvířaty

Před v93.846 `hskSkillPhysicalImpactForm()` sestavoval seznam obětí z `data.characters` a nezahrnul zvířata ze Stáje, která sice byla ve skutečném Pochodu, ale neměla registrovaný `Animal` zdravotní profil. Náhodný výběr tak nebyl rovnoměrný pro celou skutečnou skupinu.

**Oprava:** nový čistě čtecí modul `src/integration/hmk-survival-accident-pool-93846.js` spojuje jedinečné IDs lidí a skutečných zvířat z původní epizody. Pokud jakékoliv zvíře chybí v aktivním ověřeném zdravotním registru, nebo má anatomii nepodporovanou současnou procedurou, **losování je zablokováno a vysvětlení explicitně uvedeno v UI**. Žádný d100, zranění ani časový zápis se nedosazuje. Po doplnění odpovídajícího profilu lze losovat ze všech skutečných členů; u podvržené cílové identity se submit zamítne. Identita původní družiny je prověřována z uloženého původu.

### A02 · Vůl / velbloud neuměli dokončit skutečný Accident Injury

Automat `hmk-mounted-live-animal-falling.js` znal B/C koně, osly a mezky, ale ne **bovine** ani **camel**, ačkoli potřebné hodnoty má HMK v bestiáři. Oprava doplňuje přesně tabulku C a přírodní AV/Shock podle str. 355. Jde o rozšíření výhradně na doložené druhy, ne o volnou aproximaci tabulky J slona. Zranění je nadále nutné potvrdit a uložit původní procedurou.

## 3. Skutečně provedené testy

| ID / typ | Výsledek | Důkaz / omezení |
|---|---|---|
| A01 · Chromium, klikání oběti | **PASS · 10** | `tools/evidence_93846/ACCIDENT_POOL_BROWSER.json`, dva snímky. Před registrací vola zakázán los i ruční výběr; po registraci viditelní oba lidé a vůl. Samotné přepnutí neuložilo čas ani zdravotní událost. |
| A02 + Tracking + Complication + tah · zdrojový test | **PASS · 45** | `node tools/test_93846_accident_tracking_complication.mjs`: včetně dvou volů a vozu 8 000 lb, dvou cart horses 6 400 lb, změny průvodce, přenosu Bearing, vyčerpání jen jednou, rozdělené družiny, Agility/Impact zvířat a všech čtyř úrovní Complication. |
| Původní minutová matice cestování | **PASS · 7 869** | `node tools/test_93785_travel_matrix.mjs` |
| Foraging včetně minutové matice | **PASS · 1 539** | `node tools/test_93833_full_foraging_matrix_audit.cjs` |
| Tracking / no double use / provisions | **PASS · 34** | `node tools/test_tracking_provisions.cjs` |
| Historická B/C Injury | **PASS · 306** | `node tools/test_93750_accident_anatomy_alertness.cjs` |
| Equipment – pravidlo GM bez časového bloku | **PASS · 38** | `node tools/test_93845_gm_equipment.mjs` |
| Chromium · dva po sobě jdoucí Pochody se zvířaty a poté pěšky | **PASS (stávající klikací regrese)** | `python tools/browser_93842_two_travels_probe.py` — oba 60minutové úseky a oba skutečné Survival doklady, bez fantomového Tracking. |
| Chromium · vůz se dvěma voly, postroji, pacientem a souběžnou pěší skupinou | **PASS (stávající klikací regrese)** | `python tools/browser_93818_ox_wagon_complete.py` — skutečně potvrzených 45 minut, 270 lb osobní hmotnosti, kapacita 8 000 lb, doklad Stáje. |
| Přesný klikací **Stalking → Tracking CF → Bearing → následující wagon/mount/foot** | **NEOVĚŘENO** | Jednotkové zdrojové důkazy nejsou náhradou celého nového klikacího průchodu. Starší automatický skript nemohl spustit dnešní potvrzovací UI. |
| Celý klikací **Complication F/CF → Animalcraft drover → zdržení / změna trasy → další Pochod** | **NEOVĚŘENO** | Výsledky tabulky jsou ověřené jako čisté funkce, kompletní formuláře a historické přehrání ještě ne. |
| Kompletní Accident vola s následným ukládáním všech Shock/Compound/zdravotních procedur | **NEOVĚŘENO** | Výpočet s fyzickými testovacími kostkami je PASS; 10 klikacích kontrol dokládá výběr oběti, ne celou Injury Sequence. |
| Slon (odlišná anatomie J) a jiné specializované druhy | **BLOCKED** | Současný zraněňovací modul nezná jejich původní anatomii; nezaměňovat za B/C. |
| Obnovení původní kampaně po skutečném HTTP reload na uživatelově GitHub Pages | **NEOVĚŘENO** | Není přístup k uživatelově lokální kampani ani k jeho aktuálně uloženým datům. |

**Metodická poznámka:** všechny numerické d100, d6, ZD a LD uváděné ve zdrojových testech jsou pevně stanovená **testovací data**, ne vymyšlené hody skutečné hráčské kampaně. Produkční aplikace je z těchto testů sama nezapisuje. Žádná neprovedená kombinace není vydávána za PASS.

## 4. Zbývající prioritní práce

1. Otevřít, kliknout a uložit kompletní **Stalking → Tracking CF → nový průvodce a stopař → povinný Bearing → další Pochod**, včetně změny dopravního režimu (pěšky / mount / vůz se dvěma voly). Kontrolovat rozdělení družiny a staré důkazy.
2. Projít přes všechny potvrzovací kroky **Complication** s Animalcraft vozky, skutečnými postroji a identitou tažných zvířat. Řešit správný poměr minut bez nezdůvodněné pevné blokace.
3. Úplný fyzický a zdravotní klikací průchod Accident: člověk, kůň, vůl, velbloud, S/CS/F/CF, Impact, AV, Shock, anatomie a Medical handoff; registrovat zvíře před losováním, nikoliv jej automaticky domyslet.
4. Specializovaná anatomická tabulka slona a dalších živočichů; musí vycházet z jejich originálních tabulek, ne ze vzorců C.

## 5. Vydání

- Zdroj v93.845 FULL je zachován jako základ. Změněny jsou výhradně `app.js`, `index.html`, `hmk-app.bundle.js`, modul B/C, trvalý standard a nově přidané moduly, testy a důkazy.
- Případný nový PATCH se sestavuje **pouze** binárním porovnáním s v93.845 FULL; žádné předchozí soubory se nesmějí odstraňovat.
- Počítačové tests/UI se nedotkly dat skutečné uživatelské kampaně.
