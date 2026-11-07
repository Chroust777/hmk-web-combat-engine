# HMK Keeper's Ledger v93.779 — kontrola Cestování (Trekking)

## Závazné rozhodnutí (8. listopadu 2026)

- Každá postava volí vlastní cestovní činnost a řeší vlastní Orienteering. Společný vůdce družiny se nevyžaduje. Jde o vědomě upravenou interpretaci HMK (kniha na s. 142 zavádí společného Guide; s. 147 povoluje také nezávislé Orienteering pro další Foraging Modes).
- Všechny současné činnosti leží ve **společném minutovém intervalu** (libovolná délka). Kalendář se posune **jednou**, až po výslovném GM potvrzení.
- Equipment Hazard (HMK s. 148): skutečný příslušný Skill Test se dokládá při řešení hazardu. Aplikace zachová původní důkaz, výsledek a stav předmětu; realizaci dalšího zdržení a fyzické dokončení opravy vede GM. Žádná další časovaná činnost „oprava po hazardu“.

## Oprava v93.779

V předchozí v93.778 se po výsledku F vytvářel v inventáři `hmkEquipmentRepair.totalMinutes=240` a `remainingMinutes=240`, včetně mrtvé formulářové logiky odpracovávání. To bylo nekonzistentní s dohodnutou rolí GM. V93.779:

1. Výsledek F nastavuje jen `status=damaged`, původní `itemId`, `sourceEpisodeId`, opraváře a `repairProofId`, bez časových polí. Poškozený předmět nelze použít.
2. CS/S předmět ponechává použitelný; S se promítá do Slow carry dle stávajícího systému. CF označuje předmět za neopravitelný a vyřazuje jej z použití; GM rozhoduje o konečném opuštění. Volby ignorovat a opustit fungují beze změn.
3. GM může u F v `Inventář > Upravit` ručně změnit stav na použitelný. Nevzniká další Skill Test ani další evidence minut.
4. Historické záznamy/journals se nemažou a starší stavové atributy se automaticky nepřepisují. Případné staré `remainingMinutes` slouží pouze k zachování evidence již uložené hry, nezakládají další interaktivní časový proces.
5. `index.html`, `app.js`, `hmk-app.bundle.js` jsou synchronizované na 93.779; upravena byla také integrace inventáře.

## Získané testové důkazy

- `node tools/test_93779_equipment_commit.cjs`: **PASS 41 assertions**, šest variant CS/S/F/CF/ignorovat/opustit, z reálné produkční commit větve, vazby Skill Testu, stabilita `itemId`, stav použitelnosti, bez falešných časů.
- `python tools/browser_93779_equipment_repair.py`: **PASS Chromium**; skutečný inventární formulář `Upravit`, potvrzení GM, reload a persistence, kalendář beze změny, bez duplicitního testu nebo zápisu.
- `node tools/test_93771_planner.cjs`: **PASS 16**, překryvy a minutový plán včetně půlnoci.
- `node tools/test_93772_rows.cjs`: **PASS 16**, sdílené řádky a délka intervalu.
- `node tools/test_93778_bandages.cjs`: **PASS 39**, léčba a původní GM opravitelnost.
- `node tools/test_93773_fixed.cjs`: **PASS 17**; `node tools/test_93769_serial_receipts.cjs`: **PASS 54**; `node tools/test_93767_shared_atomic.cjs`: **PASS 15**; `node tools/test_93770_accident_global_cutoff.cjs`: **PASS 6**; `node tools/test_trekking_weather_complete_510.cjs`: **PASS 79**.
- Chromium `browser_93777_stalking_immutable.py`: **PASS**, čtyři samostatné činnosti, mj. skutečné Foraging a Stalking/Vigilance režimy, jeden posun hodin o 30 min. Chromium `browser_93778_animal_treatment.py`: **PASS**, nehoda zvířete → léčba → pětidenní Healing. `browser_93778_bandage_treatment.py`: **PASS**, obvazy odečteny právě jednou. `browser_93774_weather_cold.py`, `_heat.py`: **PASS**, Weather Hazard a následná expozice bez předčasného zranění. `browser_93773_fixed.py`: **PASS**, dvě souběžné činnosti, jeden kalendář.
- Starý `browser_93772_travel_forage.py`: **STALE/NEPROŠEL** kvůli odstraněnému elementu `[data-shared-plan-minutes]`; očekává starý plánovací formulář. Test je nutné aktualizovat, nejde o důkaz funkční chyby Foraging.

## Stav rozsahu a doporučené další testy

**Základní Trekking workflow: funkčně pokrytý a potvrzený pro výše uvedené scénáře. Není ještě uzavřený jako úplná 1:1 certifikace HMK.** Vědomými odchylkami jsou individuální Orienteering, libovolný interval místo pevné čtyřhodinové hlídky a ruční GM realizace časových následků F/CF.

Priorita dalších ověření:
1. Plný skutečný prohlížečový průchod všech šesti Equipment Hazard variant **z formuláře Cestování**, s navazujícím intervalem, před/po commit a reload; rovněž S Slow přenos a případ opakované závady předmětu.
2. Direction Hazard: Lost Time, Misdirection a Lost; hraniční Bearing, více deficitů, návazný Awareness a dopad na pozdější interval.
3. Survival Hazard: Accident/Complication kombinace postav, zvířat, počasí, inventáře a zdravotních stavů; blokující a přerušené výsledky, návrat po načtení.
4. Stalking, Foraging a Encounter: další kombinace a vazby na navazující interval; znovu napsat zastaralý UI regresní test.
5. Finální souhrnný cross-module a persistentní regresní běh pro libovolně dlouhé intervaly včetně změn přes půlnoc. **Bez prohlášení 100% pokrytí před tímto krokem.**

## Příbuzné soubory

`app.js`, `hmk-app.bundle.js`, `index.html`, `src/integration/hmk-inventory-edit.js`, `tools/test_93779_equipment_commit.cjs`, `tools/browser_93779_equipment_repair.py`, `tools/build_93779_bundle.cjs`.
