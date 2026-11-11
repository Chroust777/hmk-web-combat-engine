# HMK Web Combat Engine – audit a opravy v93.842

**Datum:** 11. listopadu 2026  
**Skutečný základ:** `HMK_v93.841_FULL.zip` (ověřená integrita a kompletní kořen `hmk-web-combat-engine-main/`).  
**Pravidlová autorita:** HMK v1.2; zachován projektový `docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md`.  
**Zaměření:** Equipment Hazard, sledování stopy mylně blokující další běžný Pochod, filtrování katalogu 16 druhů ve Stáji, odstranění duplicitních nákupů v pravém panelu.

## 1. Reprodukce a oprava Equipment Hazard

Předchozí verze 93.841 obsahovala potvrzovací tlačítko, ale rozsah jeho kontrolovaných polí zahrnoval také skryté komponenty z jiných hazardů. Potvrzení se tím mohlo jevit jako neplatné i bez změny Equipment rozhodnutí. Zvlášť kritická byla **reprodukovaná blokace při návratu ze skutečného Hideworking Skill Testu F**: při inicializaci formuláře se potvrzovací stav sestavil před určením aktivního druhu Hazardu; navazující tlačítko k dokončení pak zůstávalo skryté.

Nově se pro čistý **Equipment Hazard** potvrzují pouze relevantní volby (disposition, postižený předmět, opravářská dovednost, pracovník, skutečný stupeň a potvrzený důkaz). Skrytá pole Direction/Complication jej nemohou zneplatnit. Stav potvrzení vzniká až po určení aktivního Hazardu. **Pouhá změna `<select>`, klikání checkboxu, Enter ani změna textu nepředstavuje potvrzení.** Knihovní/inventární doklad a čas vznikají až v odpovídajícím určeném potvrzovacím kroku. Návrat z opravářského Skill Testu bere jen dokončený potvrzený doklad.

## 2. Druhý běžný Pochod po zvířatech a falešný Tracking lock

Ve `episodeIdentityMismatch` se porovnávala také skrytá pole Tracking, i když uzamčeným druhem epizody byl obyčejný Pochod bez Tracking. Takové hodnoty se mohou obnovit z jiného starého formuláře a nesmějí běžný Orienteering blokovat obecnou hláškou o stopách. Pro **uzamčený běžný Pochod s `trackingUse=none`** se nepoužívané Tracking parametry při porovnání normalizují. Výjimka je úzce omezená: při skutečném Stalking, specializovaném Tracking, změně průvodce/účastníků nebo konkrétního výběru zvířat trvá zámek v plném rozsahu.

Zároveň `episodeCarrySettingsFromLast` nepřenáší staré Tracking volby do nového běžného cestovního intervalu. Chybová hláška nyní vyjmenovává skutečně změněné chráněné údaje místo chybného jednotného textu o sledované stopě.

**Chromium regresní případ:** z UI skutečně pořízen Blesk (vůl) a Vítr (jezdecký kůň). První Pochod 60 minut s vybranými zvířaty, skutečný Survival Test a další povinná d10; druhý samostatný Pochod 60 minut **pěšky**, s novým potvrzeným Survival Testem. Obě dokončení skutečně prošla tlačítky do kalendáře, čas skončil na minutě **600**, vznikly **2** časové epizody, **0** Tracking Skill Tests a nedošlo k převzetí starého Survival dokladu. Manipulace nevyužitou skrytou hodnotou Tracking se nepromítla do nové povinnosti; manipulace skutečnými zvířaty po zámku byla zamítnuta.

**Omezení:** nemáme přesnou kopii lokálního úložiště konkrétní uživatelské kampaně. Test reprodukuje sestavu a kroky s kontrolovanou testovací kampaní; netvrdí ověření každé existující staré uložené kampaně.

## 3. Stáj, 16 druhů a pořízení

Při otevření katalogu je výchozí stav **všech 16 druhů**. Nový filtr nabízí pouze konkrétní skutečně vlastněná a aktivní zvířata daného vlastníka. Změna `select` ani stisk Enter nefiltrují, a už vůbec neukládají peníze, vybavení či čas; **teprve tlačítko „Potvrdit filtr“** mění místní zobrazení. Přepnutí na „Všech 16 druhů“ obnoví plný přehled.

V detailu na pravé straně již nejsou redundantní formuláře **„Pořídit / vybavit zvíře“** ani **„Pořídit vozidlo“**. Katalog vlevo používá existující knihovní mechanismus nákupu a přijetí zdarma. Zachováno: převod již vlastněného kusu z inventáře na zvíře, fyzické přepravy, ruční **„Položka nákladu“**, naložení a vyložení, vozový náklad, ENC a přepočet hmotnosti. Sloní ×5 výstroj z původního speciálního způsobu pořízení nebyla odstraněna: má vlastní výslovně potvrzovaný formulář v levém katalogu a samostatně zachovává 5× hmotnost a cenu podle HMK str. 122. Nejde o automatické zprovoznění sloní platformy 200 lb / 480d.

## 4. Skutečně provedené ověřování

| Test | Výsledek | Důkaz |
|---|---|---|
| Chromium Equipment → nechat poškozený předmět; opakované změny nabídky + Enter bez potvrzení | **PASS** | `tools/browser_93840_hazard_e2e.py ignore` |
| Chromium Equipment → Hideworking F, návrat z testu, dokončení epizody | **PASS** | `tools/browser_93840_hazard_e2e.py F` |
| Chromium Equipment → Hideworking S a CS | **PASS** | `tools/browser_93840_hazard_e2e.py S` a `CS` |
| Chromium první Pochod se zvířaty, druhý pěšky a nový Orienteering | **PASS** | `tools/browser_93842_two_travels_probe.py`, `tools/evidence_93842/TWO_TRAVEL_ANIMALS_TO_FOOT.json` |
| Blokace změny skutečných účastníků zvířecího plánu po hodu | **PASS** | stejný dvouintervalový test |
| Chromium Stáj: all 16, skutečně vlastněná 2 zvířata, Enter bez potvrzení, 17 kontrol | **PASS** | `tools/browser_93842_stable_filter.py`, `tools/evidence_93842/BROWSER_STABLE_FILTER.json` |
| Chromium Stáj: speciální sloní výstroj ×5, jeden doklad, cena zdarma | **PASS** | `tools/browser_93842_elephant_special.py`, `tools/evidence_93842/ELEPHANT_SPECIAL_TRANSFER.json` |
| Chromium: dřívější katalog, nákup a fyzický inventář | **PASS – 38 kontrol** | `tools/browser_93840_stable_catalog.py` |
| Nový zdrojový kontrolní kontrakt | **PASS – 28 kontrol** | `tools/test_93842_interaction_contract.cjs` |
| Foraging, samostatný Foraging CF, Tracking reuse, kompletní Foraging matice | **PASS – 70, 48, 15, 1539** | uvedené `tools/test_9383*.cjs` |
| Cestovní výpočetní matice | **PASS – 7869** | `tools/test_93785_travel_matrix.mjs` |
| Klikací Equipment: opuštění předmětu v této verzi | **NEOVĚŘENO** | samostatný test v dávce nedokončen; neoznačen PASS |
| Kompletní Equipment Repair CF → všechny navazující zranění a opravy | **NEOVĚŘENO** | mimo ověřený průchod |
| Skutečný reload lokální HTTP adresy/GitHub Pages | **BLOCKED** | prostředí nepovoluje HTTP v Chromiu; ověřeny produkční JS v izolované stránce |
| Uživatelská osobní uložená kampaň | **NEOVĚŘENO** | její data nebyla v tomto auditu k dispozici |
| Foraging CF a Tracking CF → Bearing → další Pochod, dříve nedokončené větve | **OTEVŘENO** | nebyly považovány za dokončené |

## 5. Kontrola vydání

- Zpracováno **výhradně** z `HMK_v93.841_FULL.zip` bez přebírání jiných verzí.
- Aktualizované `app.js`, `index.html`, `styles.css`, sestavené `hmk-app.bundle.js`, nové testovací skripty a důkazy. Původní projektový standard zůstává součástí `docs/`.
- `node --check`, `node tools/build_bundle.cjs` a uvedené testy prošly.
- FULL + PATCH zkontrolovány po jednotlivých relativních cestách a SHA-256 souborech; podrobný manifest a strojový protokol vedle archivů.
