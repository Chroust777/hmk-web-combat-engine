# HMK Keeper’s Ledger v93.837 – jízdní zvířata, Stáj a globální počasí

Datum: 2026-11-11. Vstup: **ověřený FULL v93.836**, nikoli starší pracovní kopie. Výstup: v93.837. Autorita pravidel: HMK v1.2, především str. 122 (Conveyance), 144 (Weather) a 145 (Trekking). Předchozí otevřené větve Foraging CF a Tracking nejsou touto opravou prohlašovány za uzavřené.

## Reprodukce uživatelského problému

Na snímcích je zvíře Blesk označeno **Bovine (Oxen)**, s nasazenou výstrojí `Harness, ox` (7 lb) a `Bit & bridle` (1 lb). Je tedy evidováno jako **vůl**, nikoli kůň. HMK str. 122 odlišuje jezdeckou výstroj (bit & bridle, horse blanket, saddle) od tažného postroje. Aktuální režim jízdy aplikace podporuje koně/poníky a velbloudy. Když je vybrán pouze vůl, **nemá** být povolen zápis jízdy. Vůl může být použit na tah káry nebo vozu s odpovídajícím vybavením a pravidlovým vyhodnocením.

### Doložené chyby

1. **Předčasná validace všech zvířat:** `planTravelEquipment93812` vyhodnocoval každé zaškrtnuté zvíře v režimu mount jako potenciálního jezdce. Kombinace vůl + skutečný kůň dostávala `nevhodné jízdní zvíře`, přestože jezdec měl správného koně.
2. **Nesprávná automatická volba:** `episodeHealthyMountRide93823` při prázdném výběru `travelRideAnimalId` převzala první ID ze seznamu `stableAnimalIds`, bez kontroly plemene. Vůl se tak stal interním kandidátem na jízdu i při současně vybraném koni.
3. **Nejednoznačné rozhraní:** kontrola neukazovala srozumitelně, že Blesk je vůl / tažné zvíře, a nesprávné zvíře nebylo včas označeno. Pořizování jezdecké výstroje přitom nesmělo být spojeno s volně vybraným volem.
4. **Globální počasí, pole epizody:** ačkoli season/climate/denní d10 již měly deaktivaci, potvrzené latitudeBand, topography a název oblasti šly v dílčím formuláři nadále měnit. Navíc mohlo dojít k opětovnému použití starého lokálního reliéfu při výpočtu globálního denního počasí.

## Oprava – změněná zdrojová logika

`src/integration/hmk-travel-equipment-guide-93812.js`:
- `resolveTravelMount93837` pracuje se skutečnými ID jednotlivých zvířat, nikoli se jmény, a vrací **první vhodné** zvíře ze zvolených; explicitně určené ID se nikdy samovolně nenahradí jiným.
- Jízda vyžaduje vybraného vhodného koně či velblouda. Samotný vůl je odmítnut jako mount, ale při společném cestování s vhodným koněm nepůsobí jako blokující chyba.
- Povinná uzda, blanket a saddle jsou kontrolovány **jen na zvířeti skutečně použitém k jízdě**. Ostatní zvířata jsou zobrazena jako doprovod, ne jako další jezdecké povinnosti.

`app.js`:
- Výpočet reálné váhy a ENC používaného mountu používá stejný výběr `resolveTravelMount93837` jako kontrolní seznam. Neexistuje rozpor mezi náhledem a uložením.
- UI zobrazuje u každého druhu účel a explicitně označuje nejezdecká zvířata. Automatická volba jasně říká „první vhodný kůň / velbloud“, přičemž musí být zaškrtnutý v seznamu Stáje.
- Po výběru již potvrzeného globálního počasí se hodnoty oblasti, latitudeBand, topography, season, climate, alpine, aridDesert a denních d10 načtou ze skutečného potvrzeného zdroje a **zamknou v dílčí epizodě**. Uživatel stále může nastavit místní typ terénu/cesty, dopravu, přístřeší a další *nezávislé* parametry činnosti. Změna samotného globálního počasí patří do Kalendáře; během otevřeného časového plánu je zdroj počasí zamčen už plánem.
- Pokud GM potvrdil pozdější změnu počasí v témže dni, náhled d10 a klimatu bere aktuální `calendarTrekWeatherShift.weatherDay`, nikoli zastaralý původní recept.
- Převzatý reliéf se nepřepisuje starým neuloženým lokálním výběrem; skutečná alpská/pouštní cesta může přidat relevantní příznak. Pokud by alpský terén neodpovídal potvrzenému reliéfu, aplikace bezpečně požaduje nové horské počasí. To je **implementační rozhodnutí**, ne nová pravidlová věta HMK.
- Vstupy se deaktivují pouze při platném výběru globálního zdroje. Jde o synchronizaci dočasného formuláře, nikoli automatický herní zápis.

**Záměrně nezměněno:** databáze zvířat v historii, již vlastněné předměty, historické výsledky, minutový model, léčba, Foraging CF, Tracking, struktura inventáře a ostatní pravidla.

## Skutečný Chromium průchod

Skript `tools/browser_93837_mount_weather.py` spouští skutečný `hmk-app.bundle.js` a produkční CSS v izolovaném Chromium dokumentu; uživatelské kroky jsou skutečná kliknutí formuláře (syntetická je pouze výchozí testovací kampaň). **39 kontrol PASS**:

1. Založení společného 45minutového intervalu a otevření skutečného Pochodu.
2. Převzetí globálního denního počasí a kontrola uzamčení všech výše uvedených polí; ověření, že typ terénu a klimatický úkryt jsou stále nezávislé.
3. V Knihovně zvířat skutečně pořízen vůl Blesk, návrat a aktualizace Stáje. Po jeho zaškrtnutí se zobrazí zřetelná informace, že není jezdeckým zvířetem; předčasný zápis jízdy není dovolen.
4. Poté skutečně pořízen kůň Vítr (Palfrey, riding horse) stejné postavě, návrat a aktualizace Stáje. Vůl zůstane vybrán; po zaškrtnutí koně automatická volba vybere **koně**, ne vola.
5. Výstroj koně je skutečně pořízena přes viditelná tlačítka a potvrzovací dialogy. Vůl není nově posuzován jako jízda.
6. Rozhraním otevřeny a potvrzeny skutečné Skill Tests (Riding/Drover a Survival); jednotlivé požadované d10 zadány jen do skutečných vstupů. Před explicitním potvrzením času se Kalendář neposunul.
7. Explicitní finální potvrzení společného okna: **480 → 525 min**, jeden záznam cesty, uložená jízda (`animalId` = kůň), oba jedinečné `stableAnimalIds` přítomny; nevznikl JavaScriptový `pageerror`.

Důkazy v `tools/evidence_93837/`: `BROWSER_MOUNT_WEATHER.json`, `CONFIRMED_GLOBAL_WEATHER_LOCK.png`, `OX_ONLY_SHOWS_WARNING.png`, `OX_PLUS_HORSE_CHECKLIST.png`, `MIXED_OX_HORSE_AFTER_COMMIT.png`.

## Další testy a poctivá klasifikace

| Test | Stav |
|---|---|
| `tools/test_93837_mount_and_global_weather.cjs` | **PASS 20** (základní výběr, explicitní chyby a zdrojové kontrakty) |
| `tools/browser_93837_mount_weather.py` | **PASS 39** skutečných Chromium UI kontrol |
| `tools/browser_93823_healthy_mount.py` + `tools/browser_93823_healthy_stable.py` | **PASS** (zachovaný původní přímý průchod na koni a Stáj) |
| `tools/browser_93810_stable_refresh.py` | **PASS** (nákup, aktualizace a izolace paralelních skupin) |
| `tools/browser_93837_stationary_regression.py` | **PASS 38** (Foraging) |
| `tools/test_93835_stationary_foraging.cjs` | **PASS 70** |
| `tools/test_93836_stationary_cf.cjs` | **PASS 48** |
| `tools/test_93833_full_foraging_matrix_audit.cjs` | **PASS 1539** |
| `tools/test_93834_party_tracker_reuse.cjs` | **PASS 15** |
| `tools/test_93829_weather_no_double_confirmation.cjs` | **PASS** |
| `tools/test_93831_interaction_contract.cjs` + `tools/test_93832_shelter_tracking_contract.cjs` | **PASS 11 + 12** |
| `tools/browser_93826_weather_auto.py` | **FAIL, existující už v nezměněné v93.836:** test očekává 5 Weakness po dokončení, ale žádná se neprojeví. Stejné selhání zopakováno ve zdrojovém v93.836; není úspěšnou regresí v93.837. Samostatně nedořešeno. |
| Plný HTTP URL reload a skutečný uživatelův soukromý uložený deník | **NEOVĚŘENO** (Chrome test běží s odděleným testovacím úložištěm a bez uživatelských dat) |
| Foraging Complication/Accident/Equipment end-to-end, Tracking CF → Bearing | **DŘÍVE OTEVŘENÉ / NEOVĚŘENO** v tomto patchi |

Výstupní balík má nezměněné všechny původní nekonfliktní soubory. Kompletní FULL, PATCH z v93.836, SHA-256 manifest a kontrolní protokol rekonstrukce jsou součástí vydání.
