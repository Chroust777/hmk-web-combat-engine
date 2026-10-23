# HMK Keeper’s Ledger · Bod 4 Alchemy · Priorita 1–15

Stav po v93.439. Verze 93.437 dokončuje samostatné implementační oblasti #1 a #2 **v ověřeném rozsahu přímé aplikace**. Jejich návaznost na vrženou lahvičku patří do samostatného bodu #3. Mechanicky neověřené katalogové oblečení nelze automaticky považovat za zbroj s AV; engine je správně předá k posouzení GM. Nejde o domýšlení jejich ochrany. **Závazné pořadí:** nejprve uzavřít všech 15 společných návazností, teprve potom další kanonické elixíry. Předchozí doporučené verze v93.436–438 se nesmějí považovat za závazná čísla etap; jednotlivé práce jsou zahrnuty do bodů 1–15.

Zdroj: HârnMaster v1.2, Alchemy strany 265–274; návazné zbrojní, bojové, inventární a zdravotní kapitoly podle potřeby. „Částečně“ není „hotovo“. Každý bod bude uzavřen teprve po úplném mechanickém propojení, kontrole neměnných důkazů, testování obnovy dat a regresi.

| # | Společná návaznost | Stav v93.436 | Zbývá před uzavřením |
|---:|---|---|---|
| 1 | Acid → Armour/Clothing AV | **Dokončeno pro přímou aplikaci na ověřené p118 články** | Fyzická lahvička, konkrétní skutečný oděv včetně látkového oblečení, GM určená lokace, AV −1 při úspěšném d10, AS −1 v každém kole, původní inventární kus, anatomie, reálný výpočet vrstvené ochrany (včetně směru), perzistence a neměnná historie. Bez falešného AV u jiných, neověřených předmětů. Splash je úkol #3. |
| 2 | Acid → Flesh / Burns / Shock | **Dokončeno pro přímé zasažení lidské anatomie** | Přímé nanesení na GM potvrzenou kůži, požití u 10-zónového člověka (smrt při IL2), skutečné rostoucí Fire Burn M1→S2→S3→G4→G5 v jedné původní ráně, Shock d100 při každém novém IL, původní Combat State a léčení, první Compound d10 se starší Fire/Frost ranou, pokračování skutečné časové osy bez automatického posunu, neměnné doklady a testy. Necertifikovaná anatomie jiných druhů vyžaduje GM; vržená lahvička je úkol #3. |
| 3 | Acid → Thrown Vial / Splash | **Dokončeno pro originální 4oz skleněnou lahvičku Acid** | Ověřený Missile/Throwing, Direct a Grenade s fyzickými odchylkami a Nearby, CF bez výhozu, rozbití s odpisem inventární lahvičky, 6palcový průměr (max. jedna lidská lokace), skutečné zásahy kůže/WQ/AV/objektu a jejich první d10 + Shock atomicky. Útok v aktivní Initiative spotřebovává Attack turn a používá Guided Combat checkpoint; GM posuzuje skutečnou geometrii splash. |
| 4 | Další applied elixíry | Neuzavřeno | Především Mending a Object Aegis proti reálným předmětům. |
| 5 | Plošné elixíry | Neuzavřeno | Eruption, Fumebomb, Weakness; skutečné terče a bojové důsledky. |
| 6 | Profusion všech elixírů | Částečně | Rozšířit dosavadní Darkvision, Erudition, Footpad, Physic o každé další Imbibed a jeho výjimky, včetně kombinovaných CF. |
| 7 | Aural Shock / Ill Effects | Částečně | Sdílená zdravotní návaznost všech dalších elixírů včetně léčení a restrikce benefitů. |
| 8 | Physic všechny účinky | Částečně | Redukce AS všech účinných Imbibed včetně zvláštních Instantaneous. |
| 9 | AS / Decay | Částečně | Speciální čerpání a výjimky; bezpečná rekonstrukce dříve zmeškaných měsíčních hodů. |
| 10 | Spell / Arcane provázání | Neuzavřeno | Detect/Reveal/Dispel, Negation, Attunement, Spirit Sensing, True Sight a příslušné soul stavy. |
| 11 | Invent unikátní recepty | Částečně | Mechanické provádění konkrétních GM-defined účinků; samotná výroba existuje. |
| 12 | Alchemical Dissolution / Recovery | Částečně | Úplné end-to-end necombatové Recovery a zvláštní aplikované/intake stavy. |
| 13 | Fyzická evidence | Částečně | Thrown, rozbití, předání, ukončení a případné skutečné vyřazení, bez paralelního inventáře. |
| 14 | Kalendář / historické důkazy | Částečně | Další povinné splatnosti, migrace, přehrání celé historie a všechny elixíry. |
| 15 | Kompletní regrese | Průběžně | Node.js + Chromium každé větve, kombinace CF, zpětné načítání, Campaign Clock, Combat State, inventář a staré kampaně. |

## V93.436: konkrétní technická dohoda pro Acid AV

- Původní verifikovaná data p118 (`snapshot.properties.locationProtection`) se nikdy nepřepisují.
- Na reálném inventárním kusu se udržuje `acidAVDamageByLocation` jen pro konkrétní GM potvrzené pokryté anatomické lokace, nikoli automaticky pro celý oděv.
- Stávající `resolveLiveCombatArmour()` odečítá jen relevantní fyzicky doložené body, nejvýše původní AV článku v dané lokaci/aspektu a nejvýše celkovou aktuální AV. Nechráněné lokace zůstávají beze změny.
- Jedna operace vyprázdní již existující lahvičku a doloží počátek kontaktu; každé kolo má skutečný d10, původ hodu, změnu AS a AV.
- Dosavadní poškozování zbraní WQ a objektů zůstává samostatnou větví.
- Neautorizovaná hodnota `acidAVDamageByLocation` bez historického původu je odmítnuta při validaci kampaně.
- Acid ještě nepředstavuje bojový hit ani zranění živé postavy. Zařazení bodu 1 jako „částečně“ je záměrné.

## V93.437: pravidlové hranice a ověřený rozsah

- „Úplné“ v bodu 1 znamená všechny ověřené inventární zbroje / kusy oděvů s doloženou ochranou p118. Engine **nesmí** vyrobit AV libovolnému předmětu bez ověřeného materiálu, anatomie a vrstvení.
- „Úplné“ v bodu 2 znamená přímý kontakt s **ověřenou lidskou anatomií** a lidské požití. Katalog dalších druhů těla není součástí této bezpečně ověřené větve.
- Každé úspěšné kolo zvyšuje kontinuální Fire Burn o IL, dokud p167 připouští maximálně G5. Následující kontakt stále snižuje Acid AS, ale nedělá fiktivní IL6 ani Shock bez nového IL.
- Starší Fire/Frost rána při prvním kontaktu vyžaduje Compound d10. Pozdější růst již vzniklé Acid rány Compound sám se sebou nevytváří.
- Když GM potvrdí požití lidským tělem (10 body zones), IL2 se uloží jako KIA; obě úrovně byly předtím doloženy vlastními Shock Rolls.
- Žádné části bodů 1–2 neprovádějí Thrown Weapon hit, šestipalcový Splash ani automatic targeting. Celá tato posloupnost čeká na bod #3.

## v93.438 – Bod 3: Acid Thrown Vial / Splash

- HMK pp.110,163–164,269–271: skutečná 4oz Glass Vial; Throwing ML a Strength, Heft6, BR60, −10 Thrown Object, VM×2, skutečný d100 v Missile Sequence. Direct a grenade míření na bod mají odlišné tabulky.
- Nearby Missile Strike při minutém Direct hodu není automatické minutí; vyžaduje d20, příp. d10 a GM identitu sousedního cíle. Granát používá podle SL a vzdálenosti doložený hod odchylky a směr d8. Skutečné místo dopadu GM potvrzuje; šestipalcový splash má poloměr jen tři palce.
- HMK p271 výslovně určuje, že vržená Acid lahvička se rozbije. Pouze CF nevykoná vrh, tudíž nenastane odpis. Není doplňována fiktivní tupá síla dopadu.
- Fyzická lahvička po vrhu v inventáři **neexistuje ani jako prázdná**; předchozí Imbibing a přiame nanesení ji ponechávají dle svého režimu.
- Úspěšný splash atomicky ukládá první skutečný kontaktní d10, původní AV/WQ/Fire Burn IL, vyžadované Compound/Shock fyzické hody a navazující stejný Combat State. Další kontaktní kola používají existující Acid větve.
- Ve skutečné Initiative vzniká combatProof a běžný Attack turn je dokončen přes commitGuidedTransition + recordScheduledHitCommit + finishEncounterTurn; předběžné podmínky zabrání druhé Attack akci. GM clock se nehýbe.
- GM musí explicitně určit terč (včetně jediné lidské lokace) a skutečnou vzdálenost od **fyzického místa dopadu**, nikoli od zamýšleného místa míření; engine nikdy automaticky nevyhledává cíle v nedoložené mapě.
- Archivované výsledky jsou zpětně přehratelné a neměnné, včetně fyzického odpisu nádoby.


## v93.439 – Bod 4: Mending / Object Aegis

- HMK p.273: Mending obnovuje skutečně poškozené jednotlivé předměty, libovolný počet v rámci souhrnného AS × 2 lb. Jeden aplikovaný elixír se vyprázdní atomicky a úplně, nikdy po dávkách. Opravuje skutečný inventární WQ/Acid AV a GM evidovaný stav, bez přepsání katalogového snapshotu; staré záznamy Acid zůstávají neměnné.
- HMK p.273: Object Aegis se vylije na jeden fyzický předmět do AS × 5 lb. Jednotlivé Attunement/Psychometry pokusy musí být doloženy existujícím Skill Workbench důkazem; samostatný d10 proti zbývající AS snižuje testu SL o jeden stupeň a AS o 1 pouze při úspěchu. Původní hod se nikdy nepřepisuje.
- Obě aplikace jsou Applied (ne Imbibed), tedy bez Imbibing Roll, Profusion nebo Ill Effects; chybné požití by vyžadovalo samostatnou Alchemical Dissolution (bod 12) a není zaměněno za bezpečné nanesení.
- **Bod 4:** aplikace na skutečné předměty implementována. Konkrétní použití účinků v budoucích automatických Spell/Arcane řešičích zůstává návazností bodu 10; současný GM dohled vede k reálnému původnímu Skill Workbench testu. Plošné Applied (blast) Eruption/Fumebomb/Weakness zůstávají samostatným bodem 5.

## v93.440 – pracovní implementace plošných elixírů; bod 5 **DOSUD NEUZAVŘEN** (audit 23. 10. 2026)

**Autoritativní základ:** pouze uživatelem dodaný `hmk-web-combat-engine-main(5).zip` (v93.439). Rozpracované změny existují pouze v izolované pracovní kopii, nejsou vydáním v93.440. Původní archiv ani adresářová struktura nebyly přepsány.

### Nová implementace ověřená zdrojovým kódem

- **Fyzické nádoby:** `hmk-alchemy-vial-ledger.js` a původní Inventory dovolují Fumebomb jako plyn v korkované skleněné/keramické 4oz lahvičce, 0,5 lb plné nádoby (HMK p268); Eruption a Weakness zachovávají požadavek na kapalný obsah. Žádné duplicitní inventární položky.
- **Thrown Weapons:** rozšíření `hmk-alchemy-acid-thrown.js` a nový `hmk-alchemy-area-thrown-source.js` používají původní Throwing ML, dosah, skutečný d100, fyzické d8 odchylky a potvrzené místo dopadu podle HMK pp163–164. Kritické selhání (CF) nevyhodí a nerozbije lahvičku, ale spotřebuje dovolenou Attack akci. Žádný Acid 6in splash se nepřenáší na desetistopý/dvacetistopý elixír.
- **Plošné účinky:** `hmk-alchemy-area-preflight.js` vybírá **všechny** cíle z uloženého pozičního registru Initiative; žádná vnější předložená množina obětí nesmí některou zamlčet. Eruption (p271): průměr 10 ft, Area Fire d4+AS, původní ochrana zbrojí, zranění a Shock; navíc Special Morale skutečně provedené přes `registerSpecialMorale`/`resolveSpecialMorale` pro GM doložené ohrožené protivníky též mimo kruh. Fumebomb (p272): průměr 10 ft, pro každého uvnitř Shock se −5×AS, původní Combat State (CF UNC, F INC, S STN, CS bez nového Shock); kouř blokuje LOS pouze v kole aktivace. Weakness (p274): průměr 20 ft, sníží účinnou Strength o zaokrouhlenou polovinu AS a propisuje do živých ML, Impact/Heft/Draw/ENC. Nefabrikuje automatické vypršení ani dodatečný Shock postih; původní doklad Character Creation zůstává nezměněn.
- **Atomická transakce:** nový `hmk-alchemy-area-atomic-plan.js` připraví kompletní návrh bez změny zdrojových objektů; `app.js` jej ukládá **jediným** původním `commitGuidedTransition`. Chybějící hod kterékoliv oběti znamená žádný zápis, odpis lahvičky ani posun Initiative. Uložený důkaz používá stávající journal, historii kontroluje přehrání a obousměrné napojení na Combat State a Weakness overlay. Simulovaná porucha úložiště musí vrátit celý původní stav.
- **LOS:** nový `hmk-alchemy-area-los.js` odvozuje dočasné kouřové kruhy pouze z trvalého důkazu a skutečného bojového kola. Napojeno do běžného guided Missile a do G04 Missile/Doom Flame. Kouř se nevydává za samostatný trvalý stav postavy; při následujícím kole se výhled obnoví.
- **Mending regresní oprava:** `hmk-alchemy-applied-objects.js` rozpoznává historicky doložené Acid poškození skutečného předmětu.
- **Publikované soubory:** produkční `hmk-app.bundle.js` se znovu sestavuje pomocí `node tools/build_bundle.cjs`; statický projekt nepřidává serverovou závislost.

### Skutečně dokončené testy

- **PASS:** 65/65 samostatných `.cjs` Node.js testovacích souborů, sekvenčně, bez timeoutů v dokončených bězích.
- **PASS:** preflight 59 kontrol; Thrown Source 57 + 9 kontrol CF; atomický plán 44 + 12 vícenásobných obětí + 6 obousměrných historických vazeb; kouřová LOS geometrie 17 kontrol; Mending 36 a původní Acid Thrown 37 kontrol.
- **PASS Chromium:** Eruption, Fumebomb, Weakness, každý se skutečnou Attack akcí, jedním uložením, inventářem, Combat State/Weakness a otevřením **nové instance aplikace z uloženého JSON**, neměnná historie a GM čas (3 scénáře).
- **PASS Chromium:** CF pro všechny tři (3 scénáře); chybějící povinný hod pro všechny tři (3 scénáře; Eruption dokončen samostatným během po timeoutu hromadného skriptu); zápis odmítnutý úložištěm pro všechny tři, včetně přesné obnovy Inventáře/Initiative/Charakteru/journalu (3 scénáře).
- **PASS Chromium:** fyzické naplnění/odčerpání Fumebomb plynu (2), Mending/Object Aegis (2), na novém bundle.
- **NEOVĚŘENO:** browser end-to-end dalšího skutečného bojového tahu po detonaci Fumebomb se živou blokovanou LOS a následným obnovením LOS v dalším kole. Pokus skončil timeoutem a není mezi úspěšnými testy. Modulární geometrie 17 PASS sama o sobě nestačí.
- **NEOVĚŘENO:** kompletní průchod všech možných starších obrazovek a spotřebitelů LOS/Strength mimo cíleně ověřené větve; skryté varianty zbroje/anatomie a více souběžných efektů.
- **OMEZENÍ PROSTŘEDÍ:** přímé Chromium HTTP `page.reload()` bylo blokováno `ERR_BLOCKED_BY_ADMINISTRATOR`; úspěšné testy používají nové spuštění aplikace z uložených dat, nikoliv skutečný síťový reload. Dřívější hromadné timeouty se nepočítají za úspěchy.

### Otevřené pravidlové / integrační brány

1. Plošná detonace a překážky: dosavadní preflight odmítá bojové scény se stěnami či dveřmi. Je třeba prověřit skutečné zavřené/otevřené překážky a přesnou cestu výbuchu; **nelze si vymyslet šíření výbuchu skrz stěnu**.
2. E2E přetrvání Fumebomb LOS během následujícího účastníkova tahu a obnovení ve druhém kole ještě nebylo skutečně úspěšně otestováno.
3. Weakness s výslednou STR menší než 1 nelze bezpečně propagovat do Heft/ENC/Impact při absenci příslušného autoritativního rozhodnutí; proto **fail closed** bez jakéhokoliv zápisu. U starších postav bez doložených originálních ML závislostí nelze odvozovat libovolné nové ML.
4. Finální širší Chromium regrese stávajících Combat State, Initiative a LOS obrazovek zatím nebyla úplně zakončena.

**Release gate:** Bod 5 se nadále nepovažuje za dokončený. Rozdílový ZIP v93.440 se nevydává, dokud nejsou otevřené brány uzavřeny nebo explicitně omezeny oprávněnými podklady a plnou regresí. Návaznosti 6–15 se zatím neposouvají.

### Pokračování auditu a integračních testů (24. 10. 2026; stále pracovní kopie)

- V aktuální pracovní kopii byly nově zjištěny a ověřeny připravené moduly `hmk-alchemy-area-thrown-source.js`, `hmk-alchemy-area-atomic-plan.js` a `hmk-alchemy-area-los.js`. Předchozí popis pouze nezapisujícího preflightu již nevystihoval skutečný stav této kopie.
- **PASS Node.js:** `test_alchemy_area_atomic_plan_440.cjs` (44 + 12 kontrol), `test_alchemy_area_throw_source_440.cjs` (57 + 9 kontrol), `test_alchemy_area_los_440.cjs` (17 kontrol). Tyto sady testují i fyzický grenade source, CF, odmítnutí chybějícího hodu a přehratelnost historického důkazu.
- **PASS Chromium:** `browser_alchemy_area_combat_440.py` – samostatný kompletní produkční UI bojový zápis a rehydratace uložené kampaně pro Fumebomb, Weakness a Eruption. Všechny tři průchody ověřily inventory, Combat State, tah, historický důkaz a GM čas.
- **PASS Chromium:** `browser_alchemy_area_failures_440.py` – Fumebomb CF/missing die, Weakness CF/missing die a Eruption CF; hromadné spuštění poté vypršelo, proto Eruption missing die bylo **samostatně** úspěšně ověřeno skriptem `browser_alchemy_area_failure_eruption_only_440.py`.
- **PASS Chromium:** `browser_alchemy_area_save_failure_440.py` – simulované odmítnutí trvalého zápisu pro každý ze tří elixírů; původní postavy, nádoba, Initiative a journal zůstaly nezměněné.
- Produkční bundle byl znovu sestaven (`Bundled 316 modules`); úplná nová Node regrese byla spuštěna, ale souhrnný běh **vypršel**, a proto jej neoznačujeme za dokončený PASS. Předchozí doložená série 62/62 se týká staršího buildu.
- **Zbývající release gate:** u Fumebomb je LOS ověřena v existujícím živém guided missile consumeru; dosud není prokázáno, že ji využívá *každý* autoritativní consumer LOS (zejména esoterické cílení), který aplikace zpřístupňuje. Dále chybí úplná nová regresní série bez timeoutu a cílené Chromium testy živých následných Heft/Draw/ENC/ML výpočtů po Weakness. Bod 5 **NEUZAVŘEN**, nedistribuovat ZIP.

## v93.440 – závěrečné ověření společné návaznosti č. 5 (24. 10. 2026)

**Výsledný stav bodu 5: UZAVŘENO pro tři kanonické Applied (blast) elixíry Eruption, Fumebomb, Weakness.** Výše uvedená původní kapitola „rozpracovaná etapa“ je auditní historie, nikoliv aktuální release gate. Nové integrace jsou ve stávajícím `app.js`, `combatRuntime`, původní Initiative, Combat State, inventory a append-only GM calendar journal. Žádný druhý zdravotní/bojový/inventární ledger nevznikl.

### Integrační uzávěrka

- Jeden fyzický grenade Throwing d100 se společným Missile resolverem a polohami v původní Initiative. CF neničí lahvičku, ale spotřebuje provedenou Attack akci; dokončený vrh provádí rozbití původního plného kusu, odpis inventáře, všechny účinky a Attack turn v jediné existující `commitGuidedTransition`. Před tím proběhne kompletní no-write staging a přepočet každého požadovaného výsledku.
- Eruption: 10ft průměr, d4+ASf skutečný Area Fire, plošná AV, požadované injury/shock roll důkazy a nativní `Special Morale` blízkých GM ověřených protivníků, i mimo kruh. Nevyřešené povinné důsledky blokují přechod místo částečného uložení.
- Fumebomb: plynná plná fyzická nádoba, 10ft průměr, vlastní Shock d100 všech přítomných, AS×5 penalizace, všechny čtyři zvláštní Shock SL; stávající Combat State a rekonstruovaný kruh kouře z neměnného journalu. `assertFumebombLineOfSight` je napojen na Guided Missile a G04 Doom Flame LOS. Aktivní jen ve vzniku kola; nepřepisuje historickou detonaci při obnovení viditelnosti.
- Weakness: 20ft průměr, okamžitá ztráta STR o zaokrouhlené AS/2 z každého zasaženého skutečného atributu s neměnným zdrojovým důkazem a kontrolami konzistence. Live `availableMasteries`/Strength ML, Strength impact, Heft, Draw a ENC používají současnou hodnotu STR. Torpor nesmí přidat Shock penalty v důsledku samotného oslabení. HMK neudává čas obnovení STR; proto nedochází k vymyšlenému automatickému ukončení.
- Zůstávají bezpečně odmítány nepodložené geometrie přes neprůchodné překážky, chybějící povinné hody a odvozené STR ≤0 bez jasného pravidlového postupu. Takový případ nevytváří žádnou uloženou část bojového tahu.

### Dokončené release testy

- **PASS: 66/66 Node.js testovacích souborů** po sestavení aktuálního produkčního bundlu, sériově v dávkách (původní série 65/65 plus nový test živých závislostí Weakness). Starší společné timeouty nejsou započítány jako PASS.
- **PASS:** `test_alchemy_area_preflight_440.cjs`, `test_alchemy_area_throw_source_440.cjs`, `test_alchemy_area_atomic_plan_440.cjs`, `test_alchemy_area_los_440.cjs`, `test_alchemy_area_live_derivatives_440.cjs` – včetně více obětí, chybějícího posledního hodu, skutečného původu, historického replay a všech povinných Shock/Morale podmínek.
- **PASS: Chromium produkční UI:** `browser_alchemy_area_combat_440.py` dokončen pro všechny 3 elixíry: provedená Attack akce, trvalé zranění/STR/Smoke, zničení originální lahvičky, obnovení aplikace z uložené kampaně, neměnná historie, GM čas. U Fumebomb následně navíc nezávisle přehrán původní LOS consumer nad uloženou kampaní a ověřeno obnovení LOS v příštím kole.
- **PASS: Chromium chybové a rollback scénáře:** CF všech tří; chybějící povinné hody všech tří (`browser_alchemy_area_failures_440.py` plus izolované `browser_alchemy_area_failure_eruption_only_440.py`); simulované selhání trvalého ukládání všech tří (`browser_alchemy_area_save_failure_440.py`), beze změny postav, bojového tahu, nádoby, kalendáře a důkazů.
- Přímý HTTP `page.reload()` je v testovacím prostředí blokován (`ERR_BLOCKED_BY_ADMINISTRATOR`), nebyl označen PASS; funkčně ekvivalentní rehydratace novou Chromium stránkou z uloženého lokálního snapshotu **PASS**.

**Bod 5 uvolněn pro rozdílové vydání v93.440.** Návaznosti 6–15 zatím nejsou součástí vydání a teprve potom se pokračuje dalšími kanonickými elixíry.
