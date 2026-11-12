# HMK Web Combat Engine – E2E a pravidlový audit v93.852

**Datum:** 12. 11. 2026  
**Výchozí FULL:** v93.851  
**Nové vydání:** v93.852  
**Autorita:** HârnMaster: Roleplaying in the World of Kèthîra v1.2  
**Metodika:** skutečné klikání v izolovaném Chromiu, kontrola potvrzení a navigace, následný trvalý zápis a kontrolní re-open; oddělené deterministické testy výpočtu. Původní aplikace, grafika a uložené kampaně nebyly mazány.  

## Tři reprodukované chyby a opravy

1. **Samostatný Foraging +2 SV – blokace finálního zápisu.** Výsledný Orienteering včetně situačního bonusu má jiný počet Trek Modes než neupravený Survival Skill Test. Validátor v `src/integration/hmk-time-episodes.js` je dříve chybně porovnával. Nyní ověřuje upravený počet módů z kontextově doloženého výsledku, přičemž původní SV i úprava zůstávají samostatně kontrolované. Po opravě prošel scénář s pěti skutečnými Foraging d10, zápisem zásob a opětovným načtením. **PASS**.
2. **Tracking – mizící název stopy při psaní.** Pomocná interní značka `trackingConfirmed` se chybně porovnávala s formulářem, kde žádné takové pole není, a vyvolávala falešné zamčení identity. Opraveno v `app.js`. Povinné prázdné pole se označí červeně, lze je doplnit a nezmizí. Celý Tracking CF → další povinný Bearing → Pochod potvrzen; epizody uloženy, 480 → 540 min. **PASS**.
3. **Stalking → Tracking – nedosažitelný Skill Test.** Po přidělení Stalking hvězdy tlačítko „Otevřít Tracking Skill Test“ stále očekávalo odstraněné jiné potvrzovací tlačítko. Stejné existující tlačítko nyní po ověření skutečného stopaře a názvu stopy explicitně potvrdí identitu a otevře příslušný test. Pouhé napsání či změna seznamu nic nepotvrdí. Celý klikací sled s Tracking CF dokončen, zapsáno 480 → 510 min. **PASS**.

## Dokončené cílené E2E testy

| Oblast | Ověřený průchod | Stav |
|---|---|---|
| Jedna postava | Survival CF → Accident → potvrzení zdravotních závazků/odloženého GM rozhodnutí → uložení 480→510 | PASS |
| Jedna postava | Direction Hazard → Misdirection → výslovné rozhodnutí o Awareness → dokončení 480→510 | PASS |
| Terén | Dunes Slow a Desert Flats → dokončené epizody 480→510 | PASS |
| Jízda na koni | Skutečné zvíře a výstroj, Riding Drover, Survival, dvě skupiny, jediný posun 480→525 | PASS |
| Kára | Skutečné tažné zvíře, postroj a kára; Animalcraft Drover, dvě skupiny, jediný posun 480→525 | PASS |
| Vůz | Dva pořízení koně a odpovídající postroje; Animalcraft Drover, dvě skupiny, jediný posun 480→525 | PASS |
| Samostatný Foraging | Survival s +2 SV, 5 doložených d10, inventární účet zásob, uložení a nový load | PASS |
| Tracking CF → Bearing | Název stopy, CF, jedna povinnost, další Pochod spotřebuje Bearing, dvě epizody 480→540 | PASS |
| Stalking + Tracking | Přidělení Stalking hvězdy, nový Tracking Skill Test, CF, END, jediný zápis 480→510 | PASS |
| Equipment Hazard | Opravářský test F, S, CS, CF; vhodné inventární stavy, bez automatických 240 min opravy | PASS |
| Complication | CF → navazující postup Skill/GM F a CF, vyžádané minuty a rozhodnutí, uložení | PASS |
| Dvě cestovní skupiny | Vzájemně nezávislé hody a jeden autoritativní posun kalendáře | PASS |
| Double Time | Samostatné END d10 s výslovným vložením, jediný posun kalendáře | PASS |
| Ovládání | Povinná červeně označená stopa, zachování textu, potvrzovací tlačítko a deaktivované nepovolené hody | PASS v uvedených scénářích |

## Samostatné deterministické regrese

| Test | Výsledek |
|---|---:|
| Kompletní tabulka krajiny/dopravy/Bearing | 290 / 290 PASS |
| Cílené modifikátory cestování v93.851 | 32 / 32 PASS |
| Matice cestování, srážek, orientace a dalších situací | 7 921 PASS |
| Kontroly přípustnosti a stavu cestování | 3 235 PASS |

## Otevřené nebo necertifikované oblasti

- **Přeprava nepohyblivého pacienta – NEOVĚŘENO pro finální dokončení.** Sestavení soupravy, postrojů a nákladu kolem 270 lb bylo klikacím testem ověřeno; historický scénář však neodpovídá novému postupu a celá větev až k finálnímu uložení nebyla uzavřena. Nesprávně by bylo označit ji PASS.
- **Úplná kombinatorika všech CF řetězců a zranění – NEOVĚŘENO.** Výše uvedené varianty jsou skutečně ověřené, ale neprokazují absolutní bezchybnost všech možných kombinací.
- **GitHub Pages a soukromá uložená kampaň – NEOVĚŘENO.** Testováno v izolovaném Chromiu, nikoli na uživatelově nasazení.

## Princip zachování stávajícího enginu

Zdrojové změny jsou omezené na `app.js` a `src/integration/hmk-time-episodes.js`, plus deklaraci verze a cache-busting v `index.html` a souhlasný produkční `hmk-app.bundle.js`. CSS, grafika, všechna pravidlová data, ostatní moduly a staré důkazy zůstávají zachovány. Nové skripty a důkazy jsou ve `tools/` a `tools/evidence_93852/`. Auditní standard obsahuje zpřesněné pravidlo pro odstraněné tlačítko identifikace stopy.

## Kontrola vydání

Výsledný FULL a PATCH se vydávají společně s `HMK_SHA256_MANIFEST.txt` a nezávislou zprávou `HMK_v93.852_PATCH_VERIFICATION.json`. Shoda výchozího FULL + PATCH s novým FULL je kontrolována po jednotlivých souborech metodou SHA-256; žádný původní soubor se neodstraňuje.
