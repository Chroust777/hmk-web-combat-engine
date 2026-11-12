# HMK Web Combat Engine v93.845 — GM řídí následné opravy Equipment Hazard

**Původ:** ověřený FULL v93.844, integrita ZIP CRC PASS. Datum: 12. 11. 2026. Autorita: HârnMaster v1.2, str. 148. Projektové rozhodnutí GM má přednost při plánování času, protože hra používá libovolné minutové intervaly.

## Příčina a oprava

v93.844 nově vynucovala **240 minut oprav** (F/CF), rozdělených do nezávislých činností, automaticky blokovala další Pochod a zabraňovala ručnímu dokončení opravy. Uživatel to výslovně neschválil a požaduje, aby **termín a skutečný čas opravy určoval GM**, nikoliv aplikace. Také automatický 240minutový Slow Mode pro S se nemá stát plánovacím omezením.

Nyní se při skutečném Equipment Hazard zachová Survival CF, původní hazard d10, vybraný fyzický předmět (neměnné ID), jeho vlastník, skutečný Skill Test opraváře, SL a deníkový doklad. **F a ponechání bez opravy** označí předmět jako **rozbitý, nepoužitelný**, u skutečně WQ-nesoucích položek se nastaví WQ 0, původní WQ se uloží do metadat. **CF** označí předmět jako **neopravitelný**, dokud ho GM nevyřadí. Předmět se sám neztratí ani nevznikne jiný. **CS/S** byly podle HMK úspěšné opravy; předmět je po vyhodnocení skutečného hodu použitelný. Případný čas a další Slow Mode vysvětlí výsledkový doklad, **aplikace sama neoprávněně neslibuje ani nevynucuje nový interval**.

V Inventáři lze ručně, explicitním potvrzením GM označit opravitelný rozbitý kus za použitelný a zadat skutečnou WQ. Bez toho se nesmí obléknout ani vybavit; WQ rozbitého kusu zůstává 0. CF označené jako neopravitelné nelze přes běžný příkaz změnit na použitelné; GM je může vyřadit.

Odstraněn byl panel **Povinná oprava po Equipment F/CF**, skrytý čítač zdrojového opravářského úseku, generování nových časových dokladů, blokace v Pochodu a povinná kontrola budoucího času. Nové hazardy mají marker `equipmentGMPolicy=gm-controlled-v93.845`; historické výsledky v93.844 zůstávají nezměněné. Historické již vykonané minutové doklady se nadále revalidují podle původních údajů, ale nevytvářejí nové časové povinnosti a neblokují cestování.

## Důležitá hranice HMK vs implementační rozhodnutí

**HMK str. 148** popisuje: CS bez zdržení, S jeden Slow Mode na následné cestování, F opraveno během původního následujícího časového období a CF neúspěšné opravy s odložením neopravitelného předmětu. **Volba naší aplikace:** tyto časy a následnou dobu určují GM; nejsou automatickým omezením uživatelem libovolně dlouhých minutových intervalů. Není to doslovný pravidlový přepočet. F se až do ručního dokončení GM zobrazuje jako rozbitý a nepoužitelný, takže se nezamění za automaticky opravený.

## Testy – skutečně provedené

| Kontrola | Stav | Důkaz |
| --- | --- | --- |
| Klikací Chromium: Survival CF → Equipment → Textilecraft F → potvrzení epizody → další Pochod lze normálně otevřít | PASS | `tools/evidence_93845/BROWSER_EQUIPMENT_F.json` |
| Stejný průchod CF + následný Pochod | PASS | `BROWSER_EQUIPMENT_CF.json` |
| Samostatné skutečné klikací průchody CS a S | PASS | `BROWSER_EQUIPMENT_CS.json`, `BROWSER_EQUIPMENT_S.json` |
| Ponechat rozbitý předmět / odložit předmět | PASS | `BROWSER_EQUIPMENT_ignore.json`, `BROWSER_EQUIPMENT_abandon.json` |
| Nový čistý test WQ=0 jen u WQ položek, původní WQ, poškozený status, GM explicitně potvrzuje opravu, ireparabilita CF, čitelnost historických dokladů a ochrana proti změně staré opravy | PASS – 38 | `tools/test_93845_gm_equipment.mjs` |
| Skill classification podle materiálu / důkazy | PASS – 58 | `tools/test_93843_equipment_skill.mjs` |
| Pravidlová matice cestování | PASS – 7 869 | `tools/test_93785_travel_matrix.mjs` |
| Starý test v93.844, který očekává povinnou 240minutovou blokaci | SKIP – nahrazen schválenou politikou v93.845 | `tools/test_93844_equipment_time.mjs` je archiv původní politiky, nikoli aktuální regress |
| Skutečný reload zveřejněného GitHub Pages a uživatelova historická lokální kampaň | NEOVĚŘENO | Nemáme přístup k jeho aktuálním lokálním datům. |

Chromium bylo spuštěné lokálně na sestaveném produkčním JavaScriptu s testovacími kampaněmi a simulovanou perzistencí, nikoliv na uživatelově GitHub Pages.

## Změny a bezpečnost

- Změněny: `app.js`, `src/integration/hmk-time-episodes.js`, `src/integration/hmk-inventory-edit.js`, `src/integration/hmk-equipment-serviceability.js`, `src/integration/hmk-equipment-time-work-93844.js`, `styles.css`, `index.html`, `hmk-app.bundle.js`, trvalý standard.
- Nový: `src/integration/hmk-equipment-gm-93845.js`, produkční build skript, čistý jednotkový test, klikací reprodukční skript, důkazy.
- Žádné starší data, časové účtenky, zdravotní stav, ceny či inventární identity se zpětně nepřepisují.
- Další otevřené větve mimo rozsah: Accident/Complication, Tracking CF → Bearing, starší zdravotní test počasí.

**Závěr:** automatický 240minutový čas a blokace Equipment byly odstraněny. Audit plného GitHub Pages reloadu zůstává NEOVĚŘENO.
