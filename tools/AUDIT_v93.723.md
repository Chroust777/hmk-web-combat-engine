# HMK Web Combat Engine v93.723 — Audit Weather UI a zdravotního deníku

**Výchozí verze:** 93.722. **Cílová verze:** 93.723. **Rozsah:** čtyři požadované úpravy z obrázků 5–7. Nejde o certifikaci bezblokovací funkčnosti celého Combatu.

## Produkční změny

1. **Weather Area AV.** Cestování už nečte GM hodnotu AV z formuláře. `src/integration/hmk-weather-area-av.js` odvozuje hodnotu z jediného aktuálního inventáře postavy; pro 15 lokací vyhodnotí skutečně oblečené, ověřené předměty původním `resolveLiveCombatArmour` pro aspekt `f`, váží je podle HMK p. 133 a výsledek zaokrouhlí. Neověřenou zbroj neodhaduje. Viditelné pole je pouze pro čtení; při odeslání je výpočet opakován nezávisle na HTML hodnotě.
2. **Zbytečný Cold/Heat aftermath S/CS.** Potvrzený původní Endurance/Survival S/CS bez samostatného zdravotního následku (bez ponoření) vytvoří automatický append-only doklad s původní identitou expozice. Žádný nový hod, rána, změna Shocku ani druhá Fatigue. Provádí se při dokončení epizody; pro starší platné záznamy také při startu zapisovatelné kampaně nebo při nejbližším potvrzeném zápisu. F/CF a ponoření zůstávají původními skutečnými zdravotními větvemi.
3. **Aktuálně obsazení léčitelé.** Treatment a Frost Amputation uvádějí jméno léčitele, pacienta, místo rány a čas konce. Výběr lékaře vylučuje postavy s právě probíhajícím časovaným zákrokem. Původní atomické ověření překryvu zápisů zůstává, takže změna po otevření formuláře nemůže vytvořit duplicitní práci léčitele.
4. **Deník — srozumitelné rány.** Kódy `FA`, `NK`, `FT` aj. se zobrazí jako `face`, `neck`, `left foot` atd.; `M1`, `S3`, `G5` mají jednotnou kontextovou nápovědu (`data-hmk-help`) včetně významu severity a Injury Level. Interní identifikátory a zdravotní pravidla se nemění.

## Testy

- **Nový Node test** `test_weather_area_93723.cjs`: 10 asercí (součet váhových koeficientů; nezbrojená postava; skutečný p.118 předmět; nošený vs. nesený; bezpečné odmítnutí neověřené AV; kontrolovaný výpočet).
- **Nový Chromium test** `test_weather_ui_93723.py`: reálně vygenerovaná postava, renderované HTML názvů a tooltipů, Area AV přepočítaná oproti podvrženému poli 99, dva skutečně uvedení Physician kandidáti, jednoho v obsazeném intervalu filtr odstraní, zobrazený zákrok a deadline, čtyři původní S/CS weather aftercare doklady; idempotentní zápis, žádný dodatečný změněný health state ani formulář.
- **Vybrané původní regresní testy, nová verze:** `test_global_shock_93722.cjs` PASS 56, `test_combat_write_boundary_93722.cjs` PASS 127, `test_parallel_93722.cjs` PASS, `test_weather_rules_93702.cjs` PASS 46, `test_weather_shock_93702.cjs` PASS 37, `test_trekking_weather_complete_510.cjs` PASS 79, `test_alchemy_acid_armour_436.cjs` PASS 42.
- **3 starší sady mimo plnou regresní kontrolu:** `test_weather_rules_93701.cjs` odkazuje na neexistující `hmk-web-combat-engine-main/`; `test_trekking_party_weather_509.cjs` má historicky odlišné očekávání dokladu; `test_chronicle_history_543.cjs` používá zastaralý textový extraktor. Všechny tři selhávají stejně na výchozí v93.722. Neoznačujeme je za PASS.
- Build `node tools/build_bundle.cjs`: PASS; 422 modulů a kontrola shody v93.723 v `app.js` a `index.html`.

## Omezení

Prohlížečová kontrola automatického aftercare používá původní reducer a ověřené struktury dokladů v izolovaném fixtures, nikoli plnou skutečnou cloudovou kampaň. Neproběhl živý GitHub Cloud test ani závěrečná certifikace všech Combatu, jiných zdravotních kombinací či souběhů. Nové opravy zachovávají původní transakční bezpečnostní kontroly. Nasazení nejdříve na kopii kampaně a s JSON zálohou.

## Výstup

Produkční PATCH zahrnuje jen `app.js`, `index.html`, `hmk-app.bundle.js`, `src/integration/hmk-weather-area-av.js`. Testy/audit nejsou vloženy do produkčního PATCH.
