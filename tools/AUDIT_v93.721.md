# HMK Web Combat Engine — audit v93.721

**Výchozí stav:** úplný pracovní strom v93.720. **Cíl:** redukce zbytečných globálních blokací při současném Cold Water Shock/Frostbite a rozpracovaných Skill Tests. **Pravidla:** HârnMaster Kèthîra v1.2, zejména strany 169 a 185. **Rozsah:** pouze čtyři odlišné produkční soubory.

## Ověřená produkční změna

### Cold Water Shock

* Další fyzický Cold Water Shock se neodmítá automaticky kvůli již existujícímu nativnímu Shock Followup.
* Výsledek nového d100 a 3d6 se zapíše odděleně, s původem a ID; starý stav se nikdy nepřepíše bez pravidlového Carryover.
* HMK str. 169: opakovaný STN na STN přechází do INC; opakovaný INC na INC do UNC. Méně závažný příchozí stav nemění vyšší aktivní Shock ani jeho Course.
* Když nový závažnější stav nahradí původní *jediný nativní* Shock Reroll, záznam nového výsledku obsahuje celé `supersededFollowup` včetně zdroje, termínu a pravidlového odůvodnění. Nový Shock má správný vlastní termín.
* Aktivní Extended Shock a Coma **se nesmějí ztratit**; při jejich střetu s novým silnějším Cold Shockem je stále vyžadováno samostatné source-keyed zotavování, které zde není hotové. Tato varianta zůstává bezpečně odmítnutá a **nesmí být prohlášena za opravenou**.

### Frostbite/Sunburn

* Plošná blokace kvůli předchozímu Shocku je odstraněna.
* Nulová rána na plně kryté kůži se může dokončit při aktivním Shocku.
* Skutečná Frostbite rána se zpracuje standardním HMK `applyConfirmedHit`, včetně Shock Carryover, Compound a trvalého zdroje `travel-weather`; případné skutečné pravidlové závislosti původního executor zůstávají.

### Rozpracované Skill Tests

* Potvrzené hody rozpracované epizody se uchovávají jako oddělená lokální pracovní evidence `:travel-skill-work-v1`, nikdy se nepřimíchají do trvalé kampaně bez konečného potvrzení epizody.
* Nezávislá akce ve stejné minutě je spuštěna na posledním potvrzeném stavu, trvale zapsána přes původní CAS a potom je pracovní overlay znovu připojen nad novější kampaň. Duplicitní ID se ověří **před** potvrzeným zápisem.
* Při chybě ukládání pracovního hodu se vrátí i záznam, i stav aktivního checkpointu; nevyhlásí se falešný úspěch. Po potvrzeném nezávislém zápisu se naopak nesmí dělat nepravdivý rollback trvalého stavu, pokud selže pouze obnovení lokální sidecar kopie.
* Otevřené Skill Tests již nesmějí globálně vypínat tlačítka a ostatní Skill pracovní formuláře. Odstraněna též plošná blokace plánování/přerušení odpočinku během pracovní epizody. Skutečné termíny a nemožnost jedné postavy provádět neslučitelné aktivity současně zůstávají.
* Při reloadu se obnovuje lokální pracovní kopie; při nouzovém zrušení se zahodí jen pracovní hody, **nezávislý potvrzený výsledek zůstane uložený**.

## Testy

| Ověření | Skutečný výsledek |
|---|---|
| `test_cold_concurrency_93721.cjs` nad v93.721 | **94 PASS**: nový Shock, STN/INC Carryover, provenance původního Followup, krytá kůže a skutečné Frostbite rány |
| `test_weather_shock_93702.cjs` nad v93.721 | **37 PASS**: původní vygenerovaný Cold Shock, kalendář, Shock Recovery |
| `test_weather_rules_93702.cjs` nad v93.721 | **46 PASS**: starší Weather pravidla |
| `test_skill_stage_browser_93721.py` v Chromiu nad produkčním v93.721 bundlem | **PASS**: dva pracovní Skill journal hody; mezi nimi nezávislý trvalý zápis, odmítnutí duplicitního ID, reload, konečný commit a další reload. Test využívá reálné app `mutate`/`save` prostřednictvím testovacího helperu, **není** to kompletní ruční UI E2E všech formulářů. |
| 6 starších Node sad v93.720 vs v93.721 | **6/6 PASS na obou verzích**; celkem 1 009 jednotlivých asercí v těchto sadách; porovnání viz `regression_93721.md` |
| Starší úplný browser test Cold Shock | **NEOVĚŘENO**: skončil časovým limitem během vygenerování postavy; nesmí se počítat jako PASS ani jako regression FAIL |
| Skutečný vzdálený GitHub Cloud | **NEOVĚŘENO**: bez testovacího připojení k uživatelskému cloudu |

**Důležité:** původní `tools/hmk-web-combat-engine-main` symlink v pracovní kopii ukazoval na v93.718. Cílová verze byla opravena pro testování, a do produkčního PATCH se proto vůbec neposílá tento lokální testovací odkaz ani soubory `tools/`. Regrese s parametrem cílového stromu jsou spouštěny vždy proti skutečné verzi.

## Neuzavřené návaznosti

1. **Nový silnější Cold Shock během již probíhajícího Extended Shock / Coma.** Source-keyed paralelní Course a jeho UI/kalendářové důkazy ještě nejsou implementovány. Původní povinný Course se proto bezpečně neodstraní.
2. **Další zápisové mechanismy obcházející `mutate()`** mohou nad rozpracovanou epizodou stále narazit na ochranu proti zveřejnění pracovních dat. Nelze tvrdit, že všechny moduly aplikace již nemají blokace.
3. **Pracovní Skill sidecar je zatím místní, ne součástí cloudového snapshotu ani univerzální JSON zálohy.** Uložený potvrzený výsledek se do cloudu synchronizovat může; rozpracovaný pracovní hod se obnovuje ze stejného prohlížeče/úložiště. Smazání lokálních dat by pracovní doklad zničilo, proto jej nemažte.
4. **Uživatelské koncové formuláře** potřebují širší E2E včetně několika nezávislých postav, skutečných cloudových konfliktů a dalšího Pochodu.

Toto je tedy **ověřená meziverze**, nikoliv tvrzení, že veškeré Cestování a Combat už nikdy nemohou zablokovat nezávislé události. Opravy neobcházejí ani nesimulují žádné povinné hody HMK.
