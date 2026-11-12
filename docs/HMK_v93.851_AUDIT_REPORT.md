# HMK Web Combat Engine v93.851 – audit a opravy modifikátorů Cestování

**Datum:** 12. listopadu 2026  
**Výchozí verze:** kompletní `HMK_v93.850_FULL.zip`  
**Pravidlová autorita:** *HârnMaster Roleplaying in the World of Kèthîra*, HMK v1.2, zejména tiskové str. 141–150.  
**Charakter vydání:** pravidlová a navigační oprava stávající minutové aplikace; žádný reset dat, změna designu, nový výpočet hodů automaticky ani nová GM-povinná oprava vybavení.

## I. Přehled nálezů a úprav

| Auditní nález v93.850 | Oprava v93.851 | Stav |
|---|---|---|
| Nezpevněná cesta podmiňovala Bearing vytrvalým deštěm | `unpaved-road` vyžaduje vždy 0 Bearing jako tabulka HMK str. 146 | PASS |
| Pouštní skalnaté pláně mimo značenou cestu nebyly rozlišitelné | `desert-flats` pro rovinu, LPW dle *Flat Rural Track*, ale povinně 2 Bearing; klimatická poušť se nemění na „viditelnou cestu“ | PASS |
| Drover byl ztotožněn s průvodcem | Nová role `droverActorId` pro skutečného člena skupiny, samostatně napojený Skill Test | PASS |
| Drover mohl používat nesprávnou dovednost | Jízda = Riding; kára/vůz/pěší vedení zvířat = Animalcraft; smíšená kombinace vyžádá nižší z obou skutečných ML | PASS – jádro, běžné UI větve; smíšený vůz s jezdcem nebyl kompletně klikán |
| Pěší vedení stájového zvířete nemělo Drover doklad | Vyžaduje Animalcraft podle doloženého člena výpravy | PASS – Chromium |
| Vedená zvířata nezhoršovala Watchfulness při chůzi | Snížení o jeden stupeň a promítnutí do Surprise v `trekWatchfulness` a Encounter | PASS – deterministické |
| Možnost dunového Slow i mimo duny | `dunesSlow` je viditelný jen při pěším pochodu dunami, jinak zakázán i pravidlovým validátorem | PASS – Chromium |
| Chybný počet Progress d10 při dunovém Slow | `computedSlow` má skutečný Dunes Slow právě jednou, Progress se počítá až po jeho zahrnutí | PASS – jednotkové i Chromium |
| Závěrečná validace u dun dvojmo započítávala Slow | `equipmentBaseSlow` už Dunes Slow neobsahuje; záznam jej ukládá jednou a validátor jej přičte odděleně | PASS – Chromium, reálný zápis |
| Chyběla výjimečná GM výhoda za Move | Volitelný `gmExtraProgress` 0/1, výlučně před startem, nutný d10 podle skutečného přebytku Progress | PASS – Chromium |
| Popisek sněžení mohl vyvolat nezasloužený bonus | V UI výslovně „v noci po nepřetržitém sněžení“, potvrdí GM, nikdy se neodhaduje | PASS – zdrojový kontrakt |
| Nejednoznačnost biotopu/povrchu | Trasa, denní světlo, srážky, Alpy, pouštní klima a jednoduchý biotop se odvozují z doložených polí; nejednoznačné kategorie, historie sněžení a speciální Move zůstávají GM | PASS – statický audit |

**Zpětná kompatibilita:** nové minutové doklady nesou `trekTerrainPolicy93851:'hmk-v1.2-93851'`. Starší časové doklady jsou při validaci kontrolovány se starým pravidlem Bearing; historický přepis výsledků není povolen. Starší čtyřhodinové `calendarTrekProof` používají svou konzervativní větev `bearingRule:'legacy'`.

## II. Cílené testy a skutečné doklady

### Pravidlové testy

- `node tools/audit_terrain_93851.mjs` → **290/290 PASS** pro zveřejněnou matici 29 původních řádků (LPW, Bearing, dostupnost dopravy). Nové `desert-flats` se kontrolují zvlášť.
- `node tools/regress_93851_travel_rules.mjs` → **32/32 PASS**: Desert Flats 4 rychlosti a 2 počasí; Dunes Slow validita, počty Progress, GM Progress; Watchfulness a Surprise se zvířetem; Drover jako jiná osoba; nesprávná dovednost/actor a chybějící test jsou zamítnuty.
- `node tools/test_93746_travel_guard_matrix.cjs` → **3 235 PASS**.
- `node tools/test_93785_travel_matrix.mjs` → **7 921 PASS** (počasí, SV, pohyb, směr, encounter, expozice).
- Další regrese: Foraging **1 539**, stationary Foraging **70**, stationary CF **48**, Equipment skill **58**, GM Equipment **38**, Accident/Tracking/Complication **45**, anatomie zvířat **79** – **PASS** po zajištění výstupní složky u anatomie.
- `tools/test_93842_interaction_contract.cjs`: **SKIP** – historický kontrakt vyžaduje přesný řetězec verze 93.842 a tím nepatří do aktuální verze. Nejde o pravidlové selhání.

### Skutečné UI průchody izolovaným Chromiem (bez fiktivních výsledků v deníku)

| Reprodukční skript | Co provedl skutečnými kliknutími | Stav |
|---|---|---|
| `browser_93851_one_person.py desert` | Desert Flats, Survival Skill Test, potvrzené ★ a END, dokončený zápis, čas 480→510 | PASS |
| `browser_93851_one_person.py dunes` | Duny, volba Slow před vyhodnocením, Survival, END, potvrzení skupiny, čas 480→510 | PASS |
| `browser_93851_one_person.py gmprogress` | GM volný Progress, Survival, předepsané Progress/END d10, čas 480→510 | PASS |
| `browser_93851_one_person.py accident` | Survival CF, skutečný Survival Hazard, uložení Accident s budoucím zdravotním předáním, 480→510 | PASS |
| `browser_93851_one_person.py direction` | Direction Hazard, skutečný směr odchýlení d10, rozhodnutí o Awareness, 480→510 | PASS |
| `browser_93851_one_person.py tracking` | Nezpevněná i zpevněná cesta, nepřepisuje se, žádný předčasný zápis | PASS |
| `browser_93851_two_groups.py` | Dvě nezávislé skupiny, skutečné zvíře, nový Animalcraft Drover, Survival, uložení dvou epizod a jeden posun 480→525 | PASS |
| `browser_93851_drover_other_actor.py` | Průvodce A, Drover B; Animalcraft B a Survival A; důkazy správně uložené, 480→525 | PASS |
| `browser_93851_manual_modes.py` | Chybný rozpočet ★ zamítnut, oprava a potvrzení, dvě skupiny 480→525 | PASS |
| `browser_93851_double_time.py` | 135 min, Double Time, tři oddělené END d10, dvě skupiny, jeden posun 480→615 | PASS |

**Poznámka k reprodukci:** původní testy z v93.850 neznaly nově povinný Animalcraft pro pěší vedení zvířete. Kopie `browser_93851_*` doplňují skutečný (klikací) Skill Test a odpovídající testovací ML, nikoli vymyšlený historický doklad.

**Neověřeno:** skutečný HTTP reload GitHub Pages s uživatelskou kampaní; nekonečná kombinatorika všech malých/možných přiřazení zvířat; komplexní smíšená doprava se všemi různotypovými soupravami a výsledky F/CF/S/CS ve stejném end-to-end testu. Jednotkové výpočty nejsou zaměňovány za tyto UI průchody.

## III. Integrita změn a grafiky

- Opraveno pouze `app.js` + 4 cílené existující integrační moduly; `index.html` a `hmk-app.bundle.js` odpovídají v93.851. Všechny původní CSS, PNG, grafické soubory a ostatní pravidlové moduly zůstaly beze změny.
- Zdrojový JavaScript a 457 modulů bundle: syntaktická kontrola bez chyby, aktualizované moduly znovu kompilované.
- Žádná oprava mimo uvedené moduly ani zásah do původních uživatelských dat. Všechny nové volby pouze připravují návrh; zápis probíhá až potvrzením GM.
- Úplný SHA-256 manifest, FULL/PATCH a jejich souborová bitová shoda: výsledky v `HMK_v93.851_PATCH_VERIFICATION.json`.
- Nebyla přidána automatická 240minutová oprava Equipment Hazard. Čas případných oprav zůstává GM.

## IV. Další doporučená auditní větev

Případné další nároky z pravidel, které nebyly součástí vyjmenovaných A1–A10, je nutné porovnávat zvlášť, nikoli automaticky hlásit jako 100% pokryté. Doporučeno cílené plné Chromium ověření složitých smíšených souprav a dlouhodobého přenosu starších kampaní z GitHub Pages.
