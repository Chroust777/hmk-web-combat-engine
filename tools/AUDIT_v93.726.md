# HMK Web Combat Engine – audit v93.726

**Výchozí verze:** v93.725 (skutečná sestavená výchozí kopie ověřena proti produkčnímu PATCHi).  
**Rozsah této opravy:** jen uživatelské rozhraní a zápis zdravotního pokračování Cold/Heat Exposure a zahájení skutečného Cold Water Shock.  
**Pravidlový základ:** HârnMaster: Roleplaying in the World of Kèthîra v1.2, str. 185 (Exposure, Cold Shock, Warming a Compress), ve vazbě na Weather Hazard str. 149.

## Zjištěné problémy v93.725

1. Každá aktivní Cold/Heat Exposure ukazovala pokračovací formulář s ručním zadáním `elapsedMinutes`, i před splatností. GM nevěděl, kdy smí házet.
2. Checkboxy `removedFromHazard` a `coolWater` byly volně rozložené v každém pokračovacím formuláři a mohl je uživatel nesprávně změnit při opakovaném hodu.
3. Volný Cold Shock formulář se mohl odvozovat z obecného Endurance/Survival dokladu bez bezpečné evidence skutečného ponoření.
4. Nejasné vysvětlivky a rozložené formulářové prvky.

## Produkční změny v93.726

- **Exposure Advance/Healing:** read-only přehled pravidlového postupu, *fyzického* času od začátku, příštího termínu a intervalu. **Před splatností žádné editovatelné pole d100 ani potvrzovací tlačítko.** Ve splatné minutě pouze nový d100 a tlačítko; odeslání si minuty, režim, stav Warming/Compress a případné vodní chlazení znovu ověřuje z autoritativního Kalendáře a zdravotního stavu. Fyzický čas se neodvozuje od virtuálně přeskočeného intervalu po kritickém výsledku.
- **Zahájení Warming/Compress:** samostatné rozhodnutí GM, že postava skutečně opustila nebezpečné prostředí. Checkbox pro tuto skutečnost je **zde nutný**, ale nezobrazuje se znovu u každého hodu. Pro Heat lze jednou doložit Compress s chladnou vodou (Healing po 5 minutách místo 15); Cold Warming po 120 minutách. Kliknutí pouze založí skutečný začátek a další termín, neposune samo čas.
- **Cold Shock:** při cestovním ponoření používá konkrétní potvrzený water-condition a původní ID; jeho teplota se znovu nevybírá. Pro mimo-cestovní nehodu musí GM výslovně vybrat „Studená voda · skutečné ponoření“, teprve pak se zpřístupní jednorázový formulář se třemi skutečnými d6 a jedním Endurance d100. Samotný výběr nic nezapíše; potvrzení vytvoří unikátní zdravotní zdroj a doklad v minutě Kalendáře. **Není to obecná akce pro pobyt v chladném počasí ani periodické ošetření.**
- **Pomoc:** české kontextové vysvětlivky pro Warming/Compress, podmínku ukončení expozice, chlazení vodou, rozdíl Advance/Healing, fyzický čas, splatnost a d100. **UI:** sjednocené mřížky a responsivní formuláře, čitelně oddělené volby, bez ručního pole minut.

## Ověření

- `node --check app.js` a `node tools/build_bundle.cjs`: **PASS**, 423 modulů v bundlu.
- `test_exposure_course_93726.cjs`: **22 PASS** – Cold HR4 interval 240 minut, Warming 120 minut, Heat Compress 15/5 minut, záznam skutečného počátku, chybné časování, duplicitní zahájení, neměnnost vstupního stavu, nezávislé souběžné expozice.
- `test_exposure_ui_93726.py` (Chromium, injektované produkční moduly v kontrolované stránce): **19 PASS** – v čase 08:00 není povolen d100 před termínem 12:00; v čase 12:00 je nabídnut pouze nový d100, bez ručních minut/checkboxů; potvrzený průchod vytvořil zdravotní událost a deníkový doklad; GM-initiated real immersion vytvořil jedinečný Cold Shock; bez runtime error.
- Šest starších sad nad *oběma* skutečnými verzemi v93.725 i v93.726: **1 009 PASS / 1 009 PASS**, stejné výsledky. Dále `test_93725.cjs` **77/77 PASS**, `test_combat_write_boundary_93722.cjs` **127/127 PASS**, původní Weather Hazard `test_trekking_weather_complete_510.cjs` **79 PASS**, `test_weather_area_93723.cjs` **10 PASS**.
- Staré `test_93724_version_updated.cjs` a `test_global_shock_93722_rescoped.cjs` nešlo spustit z poskytnutého samostatného testovacího archivu, neboť očekávají relativní strukturu repozitáře; **stejná infrastrukturní chyba v obou verzích**. Starší `test_trekking_party_weather_509.cjs` selhává nad oběma verzemi již na dříve zastaralém testovacím předpokladu. Nezapočítáno jako PASS ani jako nová regrese.

## Omezení a nenahrané testy

- Prohlížečový test používá skutečné produkční handlery/executory, ale vložené do izolované simulované kampaně; **neprokazuje skutečné HTTP doručování na GitHub Pages, vyplněný čtrnáctikrokový profil ani cloud sync/recovery**.
- **Zatím nebylo provedeno** úplné E2E všech souběhů Coma/Extended Shock, dalších činností Trekking ani celého Combatu; tyto části proto zůstávají mimo prohlášení o dokončení.
- Při neúplné časové kotvě se další d100 z bezpečnostních důvodů nevymýšlí. Tato verze neruší základní pravidlové ověřování a nezaručuje vyřešení všech starších datových problémů při obnově chybného save.

## Obsah produkčního rozdílového PATCH

Jen čtyři změněné produkční soubory proti v93.725, všechny v původní kořenové cestě:

- `app.js`
- `hmk-app.bundle.js`
- `index.html`
- `book-templates.css`

Testy ani audit nejsou součástí produkčního PATCH. Stav kampaně a soukromé cloud repo nejsou součástí aktualizace.
