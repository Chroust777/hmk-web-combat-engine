# HMK Web Combat Engine v93.843 – interaktivní audit Equipment Hazard

**Výchozí archiv:** `HMK_v93.842_FULL.zip` (ověřená ZIP integrita).  
**Pravidlová autorita:** *HârnMaster Roleplaying in the World of Kèthîra*, HMK v1.2, zejména tištěná str. 148, související odborné dovednosti a jejich katalog.  
**Datum:** 12. 11. 2026.  
**Rozsah změny:** pouze Equipment Hazard, jeho průchod ke Skill Tests, zobrazení inventáře party a příslušný vzhled. Ostatní rozhraní a uložené kampaně jsou zachovány.

## 1. Reprodukovaný problém

Původní formulář dovoloval zvolit libovolnou opravářskou dovednost (např. Metalcraft pro Cloth Tunic), obsahoval ruční nabídku výsledku S/F/CS/CF a neurčitý seznam dokladů, v němž se mohl objevit nevhodný Survival test. Při opravě bylo obtížné poznat, komu poškozená věc patří a kdo ji smí opravit. Byl tak v rozporu s pravidlem skutečných Skill Tests a s požadavkem na intuitivní krokové ovládání.

## 2. Pravidlový základ

HMK 1.2 str. 148: **Equipment Hazard 1–3** následuje po CF Survival během Orienteering, dopadá na výbavu družiny; příklady uvádějí řemen/postroj/měch (Hideworking), podkovu (Metalcraft), lano (Textilecraft), kolo/nápravu (Woodworking). Jeden člen družiny se může pokusit o opravu. Výsledek **CS** = oprava bez zdržení, **S** = Slow Mode v následujícím cestovním intervalu, **F** = oprava spotřebuje celý následující interval, **CF** = neopravitelný předmět a ztracený následující interval. Název „interval“ označuje **minutovou epizodu aplikace**; pevná historická délka není aplikací vnucována.

Pro jiné předměty, které pravidla ve výčtu příkladů neuvádějí, se nyní přednostně použije **doložená katalogová craftSkill** (H/M/T/W); nemá-li ji položka, může být opravářská dovednost odvozena z **doloženého materiálu**. Toto zobecnění je označeno jako **implementační rozhodnutí**, ne jako doslovná tabulka HMK 148. Pokud materiál nebo dovednost doložena není, aplikace nedovolí hádat náhodný Skill Test. Zbraně a štíty zůstávají pro tuto automatiku vyřazené (samostatné možnosti oprav/WQ).

## 3. Oprava rozhraní

1. **Koho se nehoda týká?** Zobrazí skutečného průvodce, který provedl Survival CF, a všechny účastníky současného intervalu. Poškozená věc se může vybrat z **inventáře každého člena skupiny**; položky jsou v seznamu seskupeny podle vlastníka. Nejde automaticky o předmět samotného průvodce.
2. **Vyberte předmět a postup.** Přehledný výběr skutečné věci, jejího vlastníka a možnosti opravit / ponechat poškozené / odložit. Pouhá změna výběru, Enter či fokus nic neukládají ani nevyhodnocují.
3. **Opravář a skutečný hod.** Dovednost je **read-only odvozená** z předmětu (Cloth Tunic → Textilecraft). Uživatel vybere opraváře z aktuální skupiny. Až výslovné **Potvrdit postup** aktivuje tlačítko **Otevřít [dovednost] Skill Test**. Výsledek S/F/CS/CF je odvozen ze skutečně dokončeného, uloženého a pro tuto epizodu propojeného testu správné postavy/dovednosti. Starý test ani nevhodná položka Survival se nepřijmou.

Zobrazují se také pravidlové důsledky úrovně úspěchu a výslovné upozornění, je-li následný časový úkon stále nutné řešit. Po konečném potvrzení vzniká jediný záznam události, včetně ID poškozené věci, skutečného opraváře a odkazu na konkrétní Skill Test.

## 4. Důkazy a výsledky

| Scénář | Stav | Důkaz |
| --- | --- | --- |
| Chromium: Survival CF → Equipment 2 → Cloth Tunic → Textilecraft jiné postavy → F → finální potvrzení | **PASS** | `tools/browser_93843_equipment_e2e.py F`, `tools/evidence_93843/BROWSER_EQUIPMENT_F.json` |
| Stejný scénář s výsledkem S | **PASS** | `tools/browser_93843_equipment_e2e.py S` |
| Stejný scénář s výsledkem CS | **PASS** | `tools/browser_93843_equipment_e2e.py CS` |
| Stejný scénář s výsledkem CF a stavem irreparable | **PASS** | `tools/browser_93843_equipment_e2e.py CF` |
| Odložit věc (bez opravářského testu) | **PASS** | `tools/browser_93843_equipment_e2e.py abandon` |
| Ponechat poškozenou věc (bez testu) | **PASS** | `tools/browser_93843_equipment_e2e.py ignore` |
| Změna `select`, vícekrát Enter, stav po kliknutí a před koncem intervalové epizody | **PASS** | stejný Chromium test, pořídil screenshot `EQUIPMENT_CLOTH_BEFORE_CONFIRM.png` |
| Zdrojová matice opravářských dovedností / materiálů | **PASS – 58 kontrol** | `tools/test_93843_equipment_skill.mjs` |
| Pravidlová matice cestování, počasí, orientace, setkání a expozice | **PASS – 7 869 kontrol** | `tools/test_93785_travel_matrix.mjs` |
| Skutečný restart přes GitHub Pages HTTP a konkrétní uživatelský localStorage | **NEOVĚŘENO / BLOCKED** | běh v izolovaném Chromiu, ne na uživatelově webu |
| Kompletní automatické účetnictví práce/zdržení pro F a CF v **následujícím** cestovním intervalu | **NEUZAVŘENO** | starší implementace dosud neúčtuje toto časové pokračování; nyní na něj UI upozorňuje |
| Kontrola všech kombinací inventární výstroje a zdravotních následků, ostatní hazardy v reálném Chromiu | **NEOVĚŘENO** | neprohlašovat za PASS |

Snímky: `tools/evidence_93843/EQUIPMENT_CLOTH_BEFORE_CONFIRM.png`, `tools/evidence_93843/EQUIPMENT_CLOTH_AFTER_SKILL.png`. Vždy se používá produkčně sestavený `hmk-app.bundle.js` v izolované stránce; neprobíhají interní simulace místo deklarovaných klikacích průchodů.

## 5. Důležité otevřené návaznosti

**F**: zdravotní/inventární stav po výsledku F zůstává označený jako poškozený, dokud se samostatně nepotvrdí dokončení opravy. Aplikace **zatím sama nenaplánuje a neodpracuje** celý následující interval. **CF**: předmět se označí jako neopravitelný; povinný ztracený následující interval zatím není automaticky uzavřen. Obě návaznosti musí být doprogramovány a klikacím testem uzavřeny, než bude možné prohlásit Equipment Hazard v celém rozsahu za PASS. Ostatní otevřené větve (Tracking CF → Bearing, samostatný Foraging CF, zdravotní výpočty počasí) zůstaly nedotčené.

**Závěr:** nový krokový formulář, odvození dovednosti a skutečné Skill Tests jsou dokončené a ověřené na uvedených scénářích; kompletní pravidlovou větev Equipment včetně budoucích minutových povinností je nutné dále dopracovat.
