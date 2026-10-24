# HMK Keeper’s Ledger · Bod 4 Alchemy · Priorita 1–15

Stav po v93.447; opravena pravidlová matematika Neutral spell ML/SI a doplněn nezapisující Casting d100/Misfire resolver; původní audit bodů 1–8 a navazující spellcasting preflight. Verze 93.437 dokončuje samostatné implementační oblasti #1 a #2 **v ověřeném rozsahu přímé aplikace**. Jejich návaznost na vrženou lahvičku patří do samostatného bodu #3. Mechanicky neověřené katalogové oblečení nelze automaticky považovat za zbroj s AV; engine je správně předá k posouzení GM. Nejde o domýšlení jejich ochrany. **Závazné pořadí:** nejprve uzavřít všech 15 společných návazností, teprve potom další kanonické elixíry. Předchozí doporučené verze v93.436–438 se nesmějí považovat za závazná čísla etap; jednotlivé práce jsou zahrnuty do bodů 1–15.

Zdroj: HârnMaster v1.2, Alchemy strany 265–274; návazné zbrojní, bojové, inventární a zdravotní kapitoly podle potřeby. „Částečně“ není „hotovo“. Každý bod bude uzavřen teprve po úplném mechanickém propojení, kontrole neměnných důkazů, testování obnovy dat a regresi.

| # | Společná návaznost | Aktuální stav v93.447 | Implementovaný rozsah / neuzavřené závislosti |
|---:|---|---|---|
| 1 | Acid → Armour/Clothing AV | **Dokončeno pro přímou aplikaci na ověřené p118 články** | Fyzická lahvička, konkrétní skutečný oděv včetně látkového oblečení, GM určená lokace, AV −1 při úspěšném d10, AS −1 v každém kole, původní inventární kus, anatomie, reálný výpočet vrstvené ochrany (včetně směru), perzistence a neměnná historie. Bez falešného AV u jiných, neověřených předmětů. Splash je úkol #3. |
| 2 | Acid → Flesh / Burns / Shock | **Dokončeno pro přímé zasažení lidské anatomie** | Přímé nanesení na GM potvrzenou kůži, požití u 10-zónového člověka (smrt při IL2), skutečné rostoucí Fire Burn M1→S2→S3→G4→G5 v jedné původní ráně, Shock d100 při každém novém IL, původní Combat State a léčení, první Compound d10 se starší Fire/Frost ranou, pokračování skutečné časové osy bez automatického posunu, neměnné doklady a testy. Necertifikovaná anatomie jiných druhů vyžaduje GM; vržená lahvička je úkol #3. |
| 3 | Acid → Thrown Vial / Splash | **Dokončeno pro originální 4oz skleněnou lahvičku Acid** | Ověřený Missile/Throwing, Direct a Grenade s fyzickými odchylkami a Nearby, CF bez výhozu, rozbití s odpisem inventární lahvičky, 6palcový průměr (max. jedna lidská lokace), skutečné zásahy kůže/WQ/AV/objektu a jejich první d10 + Shock atomicky. Útok v aktivní Initiative spotřebovává Attack turn a používá Guided Combat checkpoint; GM posuzuje skutečnou geometrii splash. |
| 4 | Další applied elixíry | **Dokončeno v93.439 v rozsahu Mending/Object Aegis** | Skutečné inventární předměty, hmotnosti, Mending opravuje WQ/Acid AV, Aegis se váže na původní Skill Workbench důkazy. Obecná nová Spellcasting integrace je bod 10. |
| 5 | Plošné elixíry | **Dokončeno v93.440 ve vydaném bojovém rozsahu** | Eruption, Fumebomb a Weakness; vrh a rozbití nádoby, všechny doložené cíle, Shock/Morale, Combat State, Initiative, historie, LOS a živé STR. Nevytváří obecný spellcasting (bod 10). |
| 6 | Profusion všech elixírů | **Částečně – v93.441 ověřeno pro existující aktivní Imbibed** | Centrální katalog 35/35 a atomické CF kombinace existují. Zbývá 22 dosud nepodporovaných neexemptních Imbibed účinků a jejich doložené konce, než lze tvrdit univerzální provoz. |
| 7 | Aural Shock / Ill Effects | **Částečně – v93.442 kanonický katalog 35/35 a sjednocené důkazy pro 4 aktivní Imbibed** | Zbývají skutečné zdravotní a časové commity dosud nepodporovaných Imbibed elixírů; katalog sám neprovádí jejich účinky ani léčbu. |
| 8 | Physic všechny účinky | **Částečně – v93.443 bezpečné vyhodnocení všech doložených zdrojů; 4 aktivní druhy dokončeny** | Poison, Quiescence a ostatní dosud neimplementované Imbibed účinky vyžadují skutečné důkazy jejich začátku, trvání a konce; do té doby musí Physic před jakýmkoli zápisem odmítnout neúplný souběh. |
| 9 | AS / Decay | **Částečně – v93.444 konzervativní rekonstrukce zmeškaných hodů u nepoužitých uložených elixírů** | Zvláštní čerpání AS a rekonstrukce aktivních Temporary účinků s již závislými událostmi čekají na ověřené lifecycles. |
| 10 | Spell / Arcane provázání | **Částečně – v93.447 pravidlově správné Neutral ML/SI a nezapisující Casting d100/Fatigue/Misfire** | Ještě není obecný casting/invocation writer s doloženými Detect → Reveal → Dispel, Ward, LOS, Negation, Soulcloak/True Sight, Spirit Sensing ani atomický zápis ukončení účinků. |
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


## v93.441 – společná návaznost č. 6: Profusion (ověřený mezistav)

**Bod 6 zůstává ČÁSTEČNĚ.** Tato etapa nerozšiřuje katalog o nové použitelné kanonické elixíry a nevytváří žádný zdravotní, inventární ani kalendářní subsystém.

### Implementace / autoritativní pravidla HMK 1.2

- `hmk-alchemy-profusion.js`: explicitní katalogový profil všech **35** tištěných elixírů (Use, Duration, Profusion exemption) podle HMK **str. 269–274**; 6 Applied se nezapočítává, ani když volající omylem předá typ `Imbibed`. Z 29 Imbibed jsou **Quiescence, Physic a Poison výjimkami**, celkem 26 přispívajících typů. Instantaneous ostatních se započítává **jen za trvání skutečného účinku**, nikdy z pouhé přítomnosti staré lahvičky či historického záznamu. Nepotvrzené údaje o typu/délce nesmějí předstírat kanonický elixír.
- `hmk-alchemy-imbibing.js`: jeden `activeAlchemyProfusionCohort()` pro dosud funkční Darkvision, Erudition, Footpad a Egosight. Tento výčet se používá při všech pěti původních Imbibing operacích (včetně výjimečného Physic), ale pořadí původních doložených Ill Effects se **nemění** kvůli zpětnému historickému replay.
- Pokud dříve uložený Imbibed důkaz patří dosud nepodporovanému účinku a ten ještě mohl trvat, nový Imbibing se **odmítne před spotřebou nádoby a před zdravotním zápisem**. Nesmí nastat falešný počet aktivních elixírů (např. ignorovaný Healing, Dreamwalk, Airtap). Pro tyto účinky nelze svévolně předpokládat vypršení; chybí pro ně ještě kanonické zdrojové/ukončovací důkazy a vlastní Ill Effects.
- Imbibing d100 se nepřehazuje; v případě účinného CF u podporovaných zdrojů vznikají jednotlivé nezávislé doklady ve **stávajícím** Combat State, léčení a kalendářním journalu. Tabulka jednotek je stále HMK p.269: 0 aktivních 5/0; 1 aktivní 3/5/8/0; 2 aktivní 2/3/5/7/8/0; 3 aktivní 2/3/4/5/7/8/9/0; 4+ aktivní každé F → CF.

### Dokončené testy v této pracovní kopii

- **PASS** katalogová Node.js sada `test_alchemy_profusion_catalog_441.cjs`: 307 kontrol včetně všech 35 typů, výjimek, hranic 4+, oddělení kampaně/příjemce/času a odmítnutí neznámého otevřeného účinku. Reálně přidané chování oproti v93.440 se neomezuje jen na označení v UI.
- **PASS** kompletní sekvenční Node.js regrese po prvním sestavení nové verze: 67/67 testovacích souborů (včetně starších Profusion/Mixed kombinací). Po dodatečném zpřísnění katalogové validace byla finální úplná regrese **znovu dokončena ve čtyřech nezávislých dávkách: 67/67 PASS, 0 FAIL a 0 TIMEOUT**. Dřívější hromadný pokus vypršel a není započten jako úspěšný.
- **PASS Chromium** `browser_alchemy_profusion_424.py`: dvě fyzické Darkvision lahvičky a druhý CF včetně samostatného Darkvision Ill Effect.
- **PASS Chromium** `browser_alchemy_mixed_429.py`: Erudition→Darkvision; Darkvision→Erudition; Erudition→Physic, atomické zdravotní následky a inventář.
- **PASS Chromium** `browser_alchemy_profusion_reload_441.py`: nová instance aplikace z uložené kampaně, neměnný journal, 2 spotřebované původní lahvičky a stejná minuta GM.
- **PASS Chromium** `browser_alchemy_profusion_four_sources_441.py`: čtyři současně platné různé zdroje (Darkvision, Erudition, Footpad, Egosight), následný d100 81 proti ML60 → CF při 4 aktivních. Vznikají všechny čtyři původem odlišné Ill Effect doklady a Aural Shock +4/Weakness +20. Pokud chybí poslední HP d6, **nulová částečná změna**, včetně inventory, journalu, Initiative/GM času. Poté úspěšné uložení a rehydratace nové Chromium instance se stejnou historií.

### Neuzavřené závislosti a následující pořadí

1. **Bod 6 není plně uzavřen pro 22 dalších neexemptních kanonických Imbibed elixírů**, které zatím samostatně nelze skutečně použít. Jsou v autoritativním katalogu, ale bez prováděcího zdravotního/časového účinku se nesmí vytvářet jejich aktivní zdroj jen kvůli Profusion. Bude nutné sladit původně schválené pořadí 6–15 se zákazem předčasné implementace dalších elixírů: obecný profil lze připravit předem, reálné end-to-end případy až po každém nově integrovaném účinku.
2. Bod 7 (Aural Shock / Ill Effects) nadále vyžaduje obecné mapování všech kanonických Ill Effects na stávající Combat State / Healing, včetně benefit suspension. Pouhý katalog zatím tuto implementaci nenahrazuje.
3. Bod 8 (Physic), další trvání a Decay, esoterika, Invent, recovery, fyzická evidence, kalendář a závěrečná regrese zůstávají podle tabulky otevřené. Nic z toho se tímto vydáním automaticky neoznačuje hotovo.

**Etapa v93.441 je ověřitelný mezistav bodu 6, nikoliv prohlášení o dokončení 6–15.**

## v93.442 – společná návaznost č. 7: kanonické Ill Effects + webová verze

**Bod 7 zůstává ČÁSTEČNĚ.** Bod 6 nadále zůstává ČÁSTEČNĚ a následující 8–15 nejsou uzavřeny. Nejsou povoleny další Imbibed elixíry ani zavedeny nové zdravotní, inventární nebo kalendářní registry.

- **Autorita HMK 1.2:** pp.269–274 pro vyvolání a druh Ill Effects, p.270 pro base AS a pozastavení prospěchu při Aural Shock, p.190 pro 5 Weakness za každou úroveň a denní Will Recovery.
- **Nový `src/integration/hmk-alchemy-ill-effects.js`:** úplná explicitní tabulka Ill Effect profilů **35/35** včetně šesti Applied (bez Imbibing CF), Quiescence/Poison (bez Ill Effect), běžných/odložených Aural Shock, weariness/weakness fatigue, permanentněji léčených penalizací a psyche impulse. Pravidlový `planAlchemyIllEffect` je **čistý nezapisující plán**; sám neprovádí nové elixíry, nehází d6 a neuděluje automatické vyléčení. Dreamwalk Aural Shock 3 vzniká až **po Reembodiment**, ne při vypití.
- **Živá návaznost pro dosavadní čtyři podporované Imbibed:** `hmk-alchemy-imbibing.js` nyní odvozuje přesně stejnou původní podobu sekundárních CF důkazů Darkvision, Erudition, Footpad, Egosight z centrální klasifikace. Při aplikaci vlastních Aural Ill Effects je jejich počet úrovní ověřen proti téže pravidlové tabulce. Starší formát journalu, pořadí důkazů, struktura zranění, skutečné d100, fyzická lahvička a čas GM se nemění. Nepodporované účinky zůstávají odmítnuty **před atomickým zápisem**.
- **Aural Shock není duplicitní zdravotní entita:** nadále výhradně existující `arcane.auralShockLevels`, `combatState.fatigue.otherWeakness`, `hmk-spell-aural-recovery.js` a standardní blokování benefitů Darkvision, Erudition, Footpad, Egosight. Více zdrojů tvoří jeden součet a ubývá standardním GM denním Will testem; stará historická fakta zůstávají neměnná.
- **Verzování podle požadavku uživatele:** do **každého dalšího rozdílového ZIPu vždy `index.html`**, s novým číslem v titulku, boot textu, chybovém textu a všech cache-busting URL; současně `APP_VERSION` v `app.js`, aby **patička webu** ukazovala tutéž verzi. V93.442: všechny viditelné prvky a webové zdroje používají **93.442**; aplikace zůstává kompatibilní s GitHub Pages.

### V93.442: skutečné kontroly

- **PASS 69/69 Node.js testovacích souborů**: finální produkční sestavení znovu kompletně ověřeno v **šesti oddělených dávkách (12+12+12+12+12+9)**, bez chyby nebo timeoutu. Jeden předchozí hromadný běh vypršel a není započítán jako PASS. `test_alchemy_ill_effects_442.cjs`: **987 kontrol** kanonických profilů, zaokrouhlení, výjimek, defer, známých CF zdrojů a chybových vstupů. `test_alchemy_aural_multi_recovery_442.cjs`: **16 kontrol**, tři samostatné zdroje Aural Shock, snížení 3→1→0, Weakness 15→5→0, ochrana CAS a immutable zdrojové události.
- **PASS Chromium** `browser_alchemy_profusion_four_sources_441.py`: všechna čtyři podání a jejich následný CF, chybějící HP d6 bez dílčího zápisu, čtyři různé sekundární důkazy, 4 Aural/20 Weakness, inventář, čas a nová instance kampaně s neměnným journalem.
- **PASS Chromium** `browser_alchemy_release_version_442.py`: skutečný HTML obsah `index.html`, produkční bundle vložený do Chromium dokumentu, funkční webové UI, viditelná patička v93.442 a shodné asset URL. **Omezení:** přímá navigace Chromium na `file://`/místní HTTP je prostředím blokována (`ERR_BLOCKED_BY_ADMINISTRATOR`); nelze ji vykázat jako reálné síťové načtení GitHub Pages.

### Otevřené závislosti

Další Imbibed elixíry stále nemají své vlastní skutečné aplikační a zdravotní writery, povinné hody, trvání a konce. Připravená pravidlová klasifikace je podkladem pro implementaci až podle schváleného pořadí (včetně bodů 8–15). **Neznamená to uzavření bodu 7.**


## v93.443 – společná návaznost č. 8: Physic nezaměňovat za Profusion

**Stav: ČÁSTEČNĚ dokončeno.** Žádný nový kanonický elixír nebyl povolen k použití. Není vytvořen druhý inventář, zdravotní stav ani kalendář.

### Autoritativní mechanika a nalezená chyba

- HMK 1.2 **str. 270**: Physic redukuje AS všech elixírů právě ovlivňujících příjemce, i když mají *Instantaneous* účinek s přetrvávající magickou následností (výslovný příklad **Poison**). **Str. 273**: od každého takového účinku se odečte **výsledná AS Physic po Imbibing Rollu**, účinek zaniká při AS ≤ 0. Physic **neindukuje ani nezvyšuje Profusion**, CF účinné dávky však dává Aural Shock 1. Applied elixíry nemají po dokončení aplikace pokračující enchantment (p. 270).
- Chyba v93.442: `createAlchemyPhysicImbibing()` sestavoval cíle voláním `activeAlchemyProfusionCohort()`. Ten úmyslně ignoruje Poison a Quiescence kvůli **výjimce z Profusion**, kterou ale nelze převzít jako výjimku z Physic. Případný doložený přetrvávající Poison mohl být takto tiše přehlédnut.
- Oprava v `src/integration/hmk-alchemy-imbibing.js`: samostatný čistý `activeAlchemyPhysicTargets()` z původního journalu a čtyř skutečně podporovaných životních cyklů **Darkvision, Erudition, Footpad, Egosight**. Ověřuje i ostatní původní záznamy vypitých elixírů **včetně Poison a Quiescence**, bez ohledu na Profusion. Pokud chybí věrohodná rekonstrukce trvání a AS, **odmítne celé podání** před spotřebou lahvičky / změnou Combat State / Initiative / journalu. Nepřidává smyšlené důkazy ukončení Poison, Healing, Dreamwalk atd.
- Pro podporované cíle zůstává přesný původní atomický zápis: každý původní `finishId` dostane samostatný `sourceUseId, asBefore, asAfter`, reálně ověřený `alchemyElixirStrength()` je přepočítán z neměnného journalu; nula ukončí enchantment. CF nadále používá původní Combat State/Aural Shock i vlastní Ill Effects všech dříve účinných zdrojů.
- V kalendářním UI byl opraven chybný text uvádějící jen tři podporované cíle; doplněn Egosight a výslovná bezpečnostní podmínka u dosud nedoložených účinků.
- `index.html` je opět **povinně zahrnut** do rozdílového archivu; titulek, boot/error text a cache-busting URL používají **93.443** a `app.js` má `APP_VERSION='93.443'`. Produkční bundle byl sestaven příkazem `node tools/build_bundle.cjs`.

### Zbývající kroky před uzavřením bodu 8

Skutečné Life-Cycle a writer důkazy pro nyní neimplementované Imbibed (zejména **Poison** a **Quiescence**, dále Instantaneous Healing, Mindsalve, Dreamwalk, Sustenance, Wakefulness a další Temporary) musí být napojeny do **téže** projekce `activeAlchemyPhysicTargets()` až při jejich samostatné implementaci v navazujícím pořadí. Katalogová klasifikace není důkazem, že účinek ještě trvá nebo už skončil. Částečné, neměřitelné nebo implicitně ignorované odečítání AS se nepřipouští.

### v93.443 – provedené testy a jejich přesný rozsah

- **PASS – kompletní Node.js regrese 71/71 testovacích souborů**, po finálním produkčním sestavení, v šesti oddělených sériových dávkách 12+12+12+12+12+11, bez FAIL a TIMEOUT. Předešlé verze měly 69 souborů; přibyly dvě nové sady pro Physic.
- **PASS – `test_alchemy_physic_targets_443.cjs` (84 kontrol)**: rozlišení výjimek Profusion proti Physic, Poison, Quiescence a dalších doložených ale neimplementovaných účinků, cizí kampaň, jiný příjemce, budoucí čas, nulové AS, bezzápisové odmítnutí, nedotčený journal a inventář.
- **PASS – `test_alchemy_physic_four_active_443.cjs` (37 kontrol)**: skutečné originální fyzické lahvičky čtyř podporovaných různých účinků a Physic, všechny AS a `sourceUseId`, neměnný původní journal, následný replay, důkaz o vynechané části odmítnutý validátorem.
- **PASS – `browser_alchemy_physic_443.py` (4 případy)**: skutečné formuláře S/F/CS a CF; CF s povinným HP d6, původní inventář, Combat State/Aural Shock, znovunačtení kampaně do nové stránky.
- **PASS – `browser_alchemy_physic_four_active_443.py` (2 hlavní scénáře)**: čtyři současně aktivní Darkvision, Erudition, Footpad a Egosight; Physic CF způsobuje vlastní a 3 další Aural Shock + Darkvision Ill Effect; chybějící poslední d6 nechává všechny údaje beze změny; po dodání všech hodů se uloží přesně čtyři redukce AS, 5 spotřebovaných obsahu původních lahviček, 4 samostatné Ill Effects, a obnovená instance má stejnou historii i GM čas.
- **PASS – `browser_alchemy_release_version_443.py`**: skutečný obsah `index.html` a produkční bundle vložený do Chromium dokumentu, viditelná webová patička **v93.443**. **Není to síťový test GitHub Pages**; místní navigaci na `file://` / localhost runner omezuje.
- **PASS – existující Chromium regrese** `browser_alchemy_profusion_four_sources_441.py` a `browser_alchemy_mixed_429.py`: čtyři souběžné zdroje s CF, smíšené Erudition/Darkvision/Physic kombinace, atomické následky, historie, inventář a rehydratace.

**Výdej:** v93.443 je **kontrolní meziverze**, obsahuje jen rozdíly proti už vydané v93.442, nikoli celé základní dílo. Bod 8 není možné označit jako univerzálně dokončený, dokud neexistují mechanicky ověřené lifecycles dosud nepoužitelných kanonických elixírů. Společné návaznosti 9–15 nebyly touto etapou uzavřeny.

## v93.444 – návaznost #9: AS / Decay, bezpečné zmeškané termíny

**Stav bodu 9: ČÁSTEČNĚ.** Nejde o přidání dalších kanonických elixírů ani o jejich nové AS-spend writery.

### Pravidla a rozsah

- **HMK v1.2, str. 268:** počáteční uložená dávka d10 proti aktuální base AS každých **30 dní**; úspěch −1, neúspěch −2, minimum 0; při AS 0 enchantment zaniká. **Str. 270:** Imbibed Temporary pokračují s AS změněnou Imbibing Rollem; Imbibed Instantaneous po požití měsíční Decay nemají; Applied se rozkládají jen ve skladu a po použití končí. Zvláštní aktivace mohou navíc snižovat AS, ale to se nesmí automaticky připsat elixírům, jejichž vlastní efekty dosud nejsou implementovány.
- Původní `hmk-alchemy-decay.js` již měl přesné opakované d10, pořadí událostí, Physic a standardní blokaci překročení splatnosti GM hodin. **Chyba / mezera:** historická kampaň s již přeskočeným termínem byla zaseklá; formulář ji neuměl opravit, protože trval pouze na `clock.minute===dueMinute`.
- **Nová konzervativní rekonstrukce:** při pozdním termínu GM zadá skutečný d10 **nyní**, výslovně potvrdí retrospektivní adjudikaci a důkaz uloží s `dueMinute` (původní splatnost), `recordedMinute` (skutečný čas zápisu), `reconstructed:true` a `gmMissedConfirmed:true`. Původní záznamy **nejsou přepisovány ani zpětně datovány**. Jde o bezpečný postup opravy historické kampaně schválený GM, **nikoli o dodatečné pravidlo HMK na retroaktivní hody**. Jeden zmeškaný měsíc = jeden d10 a jedna atomická append událost; po AS 0 se další termíny nevytvářejí.
- **Fail closed:** zpětnou opravu lze provést pouze pro dosud neimbibovaný a neaplikovaný **uložený** elixír. Jakýkoli závislý pozdější alchymistický důkaz pro stejný `finishId` před opravou ji zablokuje, stejně jako chybějící GM potvrzení, špatný d10, cizí kampaň či neplatné pořadí. Starší pohled na minulý čas se nezmění; aktuální AS se přepočítává z neměnného journalu. Návrat nezapisuje nový inventář, zdravotní stav ani změnu času GM.
- **Kompatibilita:** existující řádné (včasné) `calendarAlchemyDecay` záznamy mají **identický starý tvar**. Validátor přehrává nový druh důkazu společně se starými a odmítá změnu `asAfter`, `dueMinute`, `recordedMinute`, odebrání či přesun. Historický kalendář výslovně ukazuje skutečný zápis a původní splatnost; webová verze `index.html` / `app.js` / produkční bundle je **v93.444**.

### Provedené testy

- **PASS 72/72 Node.js testovacích souborů** po finálním sestavení, šest sériových dávek po 12. Jeden původní dlouhý běh byl ukončen limitem po 24 PASS; tento neúplný běh není vykázán jako celá regrese. Původní test `test_alchemy_decay_417.cjs` zůstal zelený (57 kontrol).
- **PASS `test_alchemy_decay_recovery_444.cjs`: 58 kontrol** tří zmeškaných měsíců; AS 6→4→2→0; zákaz pozdní korekce použitého elixíru či později souvisejících důkazů; odmítnutí neplatných hodnot a neautorizovaných oprav; replay starých i nových důkazů, append-only, izolace kampaně, nulové přepsání minulosti.
- **PASS Chromium `browser_alchemy_decay_recovery_444.py`:** dva zmeškané termíny 6→4→2, povinné potvrzení GM, zachování původních souborů historie, žádný posun hodin či inventáře, nová instance z uložené kampaně; kontrola rehydratace (není to síťový HTTP reload GitHub Pages).
- **PASS Chromium `browser_alchemy_release_version_444.py`:** produkční `index.html`, sestavený bundle a viditelná patička v93.444 bez JS chyb; stejně jako v předchozích etapách místní HTTP/file navigaci blokuje testovací prostředí, proto se skutečný HTML obsah vkládá do stránky.

### Zbývá před úplným uzavřením bodu 9

- Pro **aktivní Temporary účinky** s přeskočenou splatností zatím neexistuje bezpečná univerzální rekonstrukce. Pokud mohly v mezidobí ovlivnit souboje, atributy, dovednosti, Shock či jiné situace, nelze nové AS přidělit bez samostatného vyhodnocení návazností na tyto již neměnné události. Takový případ se **odmítne**, neodhadne.
- Specifické čerpání AS při dalších kanonických efektech (např. Fate, Exsiccation, Ghostsight, Healing) lze napojovat až s jejich skutečně ověřenými účinky, fyzickými akcemi a důkazy, dle pořadí navazujících etap; tyto nyní implementovány nejsou. Pro dosud podporovaný Acid zůstává lokální kontaktní AS v původních atomických Acid aplikacích a kolech, nikoli v nové paralelní evidenci.
- Společné návaznosti #6–8 nadále označeny částečně; #10–15 čekají dle schváleného pořadí. v93.444 je **kontrolní rozdílová verze proti v93.443**, ne deklarace uzavření všech 15 návazností.


## v93.445 – návaznost #10: Arcane cíle, Detect / Reveal / Dispel / Negation (kontrolní etapa)

**Stav bodu 10: ČÁSTEČNĚ.** Tato verze **nepředstírá skutečné sesílání kouzel**. V dodaném projektu není obecný zapisovatelný casting / invocation postup; výčet známých Shèk-Pvâr kouzel při tvorbě postavy nepředstavuje provedený spell cast.

### Kanonické hranice (HMK v1.2)

- **Str. 270:** Temporary elixíry podléhají Detect / Reveal / Dispel a Negation jak uložené, tak aktivní. Instantaneous elixíry jsou pro tyto zásahy magickým cílem pouze **před požitím / aplikací**. Po provedení účinku jim nelze přiřadit fiktivní trvající kouzlo.
- **Str. 251:** Detect rozlišuje kategorii a umístění zdroje (neznamená automatické odhalení detailů). Reveal vyžaduje úspěšné předchozí Detect stejného zdroje (str. 254); Dispel vyžaduje **oba** úspěšné kroky a případný Ward musí být nejprve vyřešen. Dispel vůči elixíru má **EML postih −5 × jeho aktuální AS**. Detect CS umožňuje +20 bonus k pozdějšímu cílení stejného zdroje při Attune / Reveal / Dispel, ale tento bonus nelze přiznat bez konkrétního původního úspěchu.
- **Str. 209, 263, 274:** True Sight a Spirit Sensing jsou samostatné mechaniky; Soulcloak a Aural Shock mohou bránit poznání True Form. Negation má vlastní prostorové a koncentrací/časem podmíněné provedení. Žádné z toho nelze vyrobit ze samotného katalogového elixíru ani z jeho známé AS.

### Skutečná změna

- Nový **nezapisující** `src/integration/hmk-alchemy-arcane-targets.js` rekonstruuje z původního `calendarAlchemyFinish`, `calendarAlchemyVialBinding`, `calendarAlchemyVialEmpty`, Imbibing, Physic a Decay skutečnou fázi každé dávky. U uložené dávky navíc kontroluje existenci **téže** fyzické nádoby v původním Inventory. U již použité Temporary vyžaduje potvrzený aktivní původní Imbibing receipt a doložitelný lifecycle. Bez dalších účinků jsou podporovány čtyři dříve implementované životní cykly Darkvision, Erudition, Footpad, Egosight. U nedefinovaného druhu nebo splatného nezapsaného d10 nepředstírá známou AS a cílový stav odmítne.
- Stávající obrazovka **GM Calendar → Alchemy** má rozbalitelný přehled cílů Detekt/Reveal/Dispel/Negation. Ukazuje uložený / aktivní / skončený stav, fyzický či účinkový původ, aktuální AS a vypočtené Dispel EML. U chybějícího důkazu vypisuje upozornění, nevynechává chybný cíl mlčky. Žádná operace nečerpá AS, nepřepisuje journal, Inventory, soul/Combat State, Initiative ani čas kampaně.
- **Vydání:** aktualizován `index.html` (včetně title, loaderu a cache-bustingu), `app.js` `APP_VERSION=93.445` a znovu sestaven produkční `hmk-app.bundle.js` pro GitHub Pages.

### Provedené testy

- **PASS – 73/73** dostupných Node.js testovacích souborů v sériovém běhu; všechna dokončená spuštění mají návratový kód 0. Celkem 172 kontrol v nové `test_alchemy_arcane_targets_445.cjs`, která používá skutečné požití Darkvision a fyzickou dávku Physic z existujícího testovacího journalu. Ověřeno 35 kanonických profilů pro skladový stav, kampaň, fyzický původ, změna AS, used Instantaneous, konec enchantment, splatný Decay, fail-closed a bezzápisovost.
- **PASS Chromium** `browser_alchemy_release_version_445.py`: originální markup `index.html` a produkční bundle načteny v testovací stránce; viditelné **v93.445** v patičce, bez JS chyby. **Nejedná se o živý HTTP test GitHub Pages**.
- **PASS Chromium** `browser_alchemy_arcane_targets_445.py`: skutečný kalendářový panel rozpoznal aktivní Darkvision a uloženou fyzickou lahvičku Physic, ukázal pro oba aktuální AS6 a Dispel EML −30. Otevření/zavření detailů nic nezapsalo do LocalStorage. Browser navigace k místnímu souboru/localhost není v prostředí povolena; injektován je ale identický produkční bundle a lokálně uložená skutečná testovací kampaň.

### Zbývající závazná práce

Žádný replayovatelný spellcasting a jeho GM/Skill Workbench doklad není touto verzí **vymyšlen ani nahrazen**. Pro úplné uzavření #10 je nutná původní magie: zdrojové Detect, Reveal, Dispel, Ward, range/LOS, Selhání/CF/Misfire, únavy, přerušení, skutečné ukončení enchantmentu (při zachování stejné historické AS), stejně jako Negation, Attunement, Spirit Sensing, True Sight a ochrana Soulcloak. Do té doby jsou nové informace **jen read-only**; neexistuje nové tlačítko, které by bez důkazů mohlo odpálit magii či odstranit elixír.

**Instalace:** v93.445 je rozdílový checkpoint **proti projektu s aplikovanou v93.444**, nikoli kompletní distribuce ani prohlášení bodu #10 za uzavřený. Bod #11–15 zatím zůstává v plánu.


## v93.446 – pokračování #10 a nezávislý audit #1–8 (24. 10. 2026)

**Důležitý závěr:** #1–#8 nejsou všechny dokončené. Implementační oblasti **#1–#5 byly v tomto auditu znovu nalezeny ve zdrojovém kódu a prošly vybranými cílenými testy** ve výše uvedeném, výslovně omezeném rozsahu. **#6, #7 a #8 nadále zůstávají ČÁSTEČNĚ**, i přes úspěšné testy fungujících větví. Souhrnná tabulka nahoře nyní používá aktuální stav a opravuje zastaralá označení #4 a #5 z v93.436; historické kapitoly starších checkpointů níže jsou záměrně zachovány, nikoliv zpětně editovány.

### Evidence jednotlivých bodů 1–8

| Bod | Implementace v existujícím engine | Skutečně dokončený vybraný retest v93.446 | Auditní rozhodnutí |
|---:|---|---|---|
| 1 | `hmk-alchemy-acid-armour.js`, `live-combat-armour.js`, originální inventory/journal; GM potvrzuje necatalogové materiály | `test_alchemy_acid_armour_436.cjs` 42 PASS; `test_alchemy_acid_clothing_layers_437.cjs` 19 PASS | **Hotovo v ověřeném materiálovém a anatomickém rozsahu**, ne falešné AV pro neověřené oděvy |
| 2 | `hmk-alchemy-acid-flesh.js` → původní `persistent-combat-state.js`, zranění, Shock a historie | `test_alchemy_acid_flesh_437.cjs` úspěšný; včetně G5 limitu a Compound 54 PASS | **Hotovo pro doloženou lidskou anatomii**, nikoli automaticky pro všechny jiné Folk |
| 3 | `hmk-alchemy-acid-thrown.js`, původní Throwing, původní fyzická nádoba, Initiative | `test_alchemy_acid_thrown_438.cjs` 37 PASS | **Hotovo pro doložené originální Acid splash** |
| 4 | `hmk-alchemy-applied-objects.js`, Mending, Object Aegis, WQ/AV, Skill Workbench provenance | `test_alchemy_applied_objects_439.cjs` 36 PASS | **Hotovo pro Mending/Object Aegis v rozsahu v93.439**. Obecný casting patří #10 |
| 5 | `hmk-alchemy-area-atomic-plan.js`, `hmk-alchemy-area-los.js`, `hmk-alchemy-area-preflight.js`, `hmk-alchemy-area-thrown-source.js` | `test_alchemy_area_atomic_plan_440.cjs` PASS, `test_alchemy_area_los_440.cjs` 18 PASS, `test_alchemy_area_live_derivatives_440.cjs` 32 PASS | **Hotovo v bojovém rozsahu v93.440**. Souhrnný Chromium E2E všech tří elixírů je doložen ve v93.440; v93.446 nebyl celý opakován |
| 6 | `hmk-alchemy-profusion.js`, společný cohort v `hmk-alchemy-imbibing.js` | `test_alchemy_profusion_catalog_441.cjs` 307 PASS | **ČÁSTEČNĚ**: 22 dalších neexemptních Imbibed účinků nemá skutečný lifecycle; nelze prohlásit univerzální Profusion |
| 7 | `hmk-alchemy-ill-effects.js`, původní zdravotní stav / Aural Shock | `test_alchemy_ill_effects_442.cjs` 987 PASS | **ČÁSTEČNĚ**: katalog 35/35 není skutečný zdravotní writer pro všechny nepodporované elixíry |
| 8 | `hmk-alchemy-imbibing.js`, Physic per-source AS přes historické důkazy | `test_alchemy_physic_targets_443.cjs` 84 PASS; `test_alchemy_physic_four_active_443.cjs` 37 PASS | **ČÁSTEČNĚ**: nelze bezpečně provést na dosud neimplementovaném Poison/Quiescence či jiném efektu bez originálního lifecycle |

Testy neprokazují ničím neomezenou funkčnost mimo výslovně implementované situace. Místa, kde aplikace z bezpečnostních důvodů čeká na další kanonickou implementaci, nejsou chybějícími pravidly „automaticky dopočítána“.

### #10: Shèk-Pvâr caster readiness (bez spekulativního kouzlení)

- Nový `src/integration/hmk-alchemy-arcane-casting-readiness.js` spojuje **původní validovaný důkaz vybraných kouzel** z Character Creation s aktuálním `Pvârism` dostupným přes stávající `availableMasteries()` v Skill Workbench. Nevydává historickou počáteční ML za aktuální, nesouhlas originálního výběru se zdrojovou rekonstrukcí odmítá. Neutral nemá Sunsign modifier (HMK 198).
- Pro skutečný cíl z `hmk-alchemy-arcane-targets.js` rozlišuje Detect I, Reveal I, Dispel II: **SI × 5 ft**, **SI ft**, **SI × 5 ft v LOS**; požadované doby seslání **2 kola / 1 minuta / 1 minuta** (HMK 251,254). Dispel počítá **−5 × aktuální AS** pouze jako **známou složku**, *nikoli* finální EML bez penalizací hluku, zranění, fatigue, Focus aj.
- Kontrola výslovně identifikuje chybějící Ward adjudication, nezajištěné LOS, neexistující úspěšné Detect+Reveal stejného zdroje a obecný chybějící **Spellstart/Spellfire/Misfire/Fatigue writer** (HMK 200–203,251,254–255). `mayCommit` i `complete` jsou **vždy false** – žádné nové kouzlo, zranění, odstranění enchantmentu nebo magické trvání nelze z pouhého předvýpočtu uložit.
- Produkční **GM Calendar → Alchemy** nyní read-only vypisuje ověřené původní znalosti Shèk-Pvâr, současné Pvârism ML, SI a dosahy kouzel vedle existujících zdrojových dossierů. Není zde tlačítko „kouzlit bez důkazu“. Zachovány originální Inventory, Combat State, Initiative a append-only journal.
- `index.html` (title, loader + asset cache-busting), `app.js` (`APP_VERSION`) a `hmk-app.bundle.js` mají společné vydání **v93.446**.

### Provedené testy v93.446

- **PASS** `test_alchemy_arcane_cast_readiness_446.cjs` – **58 kontrol**, včetně výchozích známých Neutral kouzel, validace původu, SI/range, neúplných Detect/Reveal/Ward/LOS, odmítnutí změny historického důkazu a striktního `mayCommit=false` i při všech GM potvrzeních.
- **PASS** kompletní dostupná Node.js regrese **74/74 testovacích souborů**, šest uložených nezávislých skupin 12+12+12+12+12+14, 0 FAIL, 0 TIMEOUT. Jeden přerušený souhrnný pokus dokončil jen úvodních 24; ten **není** připočten jako úplná regrese.
- **PASS Chromium** `browser_alchemy_release_version_446.py` – skutečné HTML z `index.html`, produkční bundle, patička v93.446, žádné JavaScript chyby.
- **PASS Chromium** `browser_alchemy_arcane_targets_446.py` – reálný původní archiv kampaně se skladovou Physic, aktivním Darkvision a doloženou postavou Shèk-Pvâr (Pvârism 70/SI7); zobrazeny cíle, Dispel EML −30 a dosahy Detect 35 ft, Reveal 7 ft, Dispel 35 ft; bezzápisovost a zachování LocalStorage. **Nejde o nové seslání**.
- **PASS Chromium** `browser_alchemy_area_combat_446.py` – skutečný produkční UI Attack všech tří **Fumebomb, Weakness, Eruption**: fyzická spotřeba původní lahvičky, Combat State, dokončený tah, uložení a nová instance ze skutečného uloženého JSON, totožná historie a GM čas. Jde o verzi-test původního ověřeného E2E scénáře #5 upravený pouze pro skutečně zobrazovanou verzi v93.446. Původní skript v93.440 měl pevně zapsané očekávání starého čísla; jeho původní neúspěšný běh proto není selháním aktuální aplikace.
- **NEOVĚŘENO v93.446**: nová úplná Chromium E2E regrese **všech** ostatních větví #1–#4 a #6–#8, síťové načtení GitHub Pages, skutečný casting/replay Detect→Reveal→Dispel; tyto výsledky nesmějí být tvrzeny jako PASS.

**Závazné omezení:** bod #10 **ČÁSTEČNĚ, neuzavřen**. Pro provedení má nejprve vzniknout pravidlově úplná kanonická spellcasting větev (HMK str. 200–203) v původním Skill/Initiative/Combat State a následně atomické caster/ward/detect/reveal/dispel/negation důkazy. Bez tohoto kroku nelze předčasně odstranit elixír. #6–#8 zůstávají otevřené do reálné implementace dalších Imbibed lifecycle dle schváleného pořadí. v93.446 je **checkpoint DIFF proti v93.445**, nikoliv finální uzávěrka #10 ani #1–#15.


## v93.447 – návaznost #10: správná Neutral Spell ML / SI a fail-closed Casting Dice (24. 10. 2026)

**Bod #10 je NADÁLE ČÁSTEČNĚ HOTOVÝ.** Tato etapa záměrně nevytváří ani nepředstírá skutečný Spellstart/Spellfire writer. Žádná nová akce v Initiative, zranění, spotřeba kouzla, ztráta enchantmentu, posun času, záznam do Combat State ani journal se při předvýpočtu neuloží.

### Pravidla a skutečně nalezená chyba

- **HMK str. 198 a 200:** Neutral konvokace má Sunsign modifier **0**, ale Spell ML se počítá **Pvârism ML − 2×(CL+CD)**; pro Neutral je **CD=2**. SI je `floor(Spell ML/10)` **pro každé kouzlo**, nikoli `floor(Pvârism ML/10)`.
- **Chyba v93.446:** `hmk-alchemy-arcane-casting-readiness.js` a GM Calendar přebíraly přímo Neutral Convocation/Pvârism ML jako Spell ML. Kouzelník s Pvârism 70 byl chybně zobrazen se společným SI7 (Detect 35 ft / Reveal 7 ft / Dispel 35 ft). Správně: **Detect I ML64/SI6/30 ft, Reveal I ML64/SI6/6 ft, Dispel II ML62/SI6/30 ft v LOS**. Výpočet zachovává `−5×aktuální AS` Dispel **teprve po** správném Spell ML; u AS6 tedy jeho známá složka EML je **62−30=32**, *nikoliv celý Casting EML*.
- **HMK str. 202–203:** skutečný d100 se vyhodnocuje přes **původní** `src/rules/tests.js` (`successLevel`). Pro CL I/II je Casting Fatigue CS0, S5, F5, CF10; CF vyžaduje **další fyzický Misfire d100**. Opět používáme **původní** `hmk-spell-misfire-effects.js`, nepřidáváme druhou tabulku ani nový zdravotní stav. Form failure přičítá skutečnou další únavu; Psyche Stress, Aural Shock, Crucial Misfire a Total Release jsou explicitně označeny k dořešení ve stávajících zdravotních / magických writerech. Misfire 100 vyžaduje další Spirit a Raw Principle adjudikaci.
- `neutralSpellMastery()` vrací validované jednotlivé Spell ML/SI/range. `neutralSpellfireDice()` pouze klasifikuje **prokazatelně zadané** Casting d100, kompletní Casting EML a při CF Misfire d100. `diceComplete` se vztahuje **pouze k hodům**; `complete:false` a `mayCommit:false` zůstávají bez výjimky. Znalost, dosah ani samostatný hod nemohou nahradit Spellstart, koncentraci, casting options, LOS, Ward, oprávněný tah či atomický zápis. Preflight rovněž nově blokuje Aural Shock a doloženou ztrátu kouzla po Crucial Misfire.
- **Zobrazení v GM Calendar** aktualizováno na per-spell ML/SI a vzdálenost. Zůstává read-only. `index.html`, `app.js` a `hmk-app.bundle.js` nyní nesou viditelnou i cache-busting verzi **v93.447**. Žádný paralelní Inventory, Combat State ani Spellcasting ledger nevznikl.

### Ověřený rozsah testů

- **PASS kompletní dostupná Node.js regrese 75/75 `.cjs` souborů**, poslední produkční bundle, šest izolovaných dávek (12+12+12+12+12+15), 0 FAIL a 0 TIMEOUT. Vyhodnocení v pracovních JSON výsledcích `hmk_v93447_regression_*.json` (do vydaného rozdílového ZIPu se nedávají).
- **PASS `test_alchemy_arcane_cast_readiness_446.cjs`: 62 kontrol** aktualizovaných správných dosahů, ML, SI a známých podmínek; **PASS nový `test_alchemy_neutral_spellfire_447.cjs`: 154 kontrol** (tři Neutral kouzla, hraniční indexy, S/CS/F/CF, fatigue, fyzické CF/Misfire, Crucial, Warp, Shock, Total Release, chybné hodnoty, vždy nulová možnost zápisu).
- **PASS Chromium** `browser_alchemy_release_version_447.py`: originální `index.html`, aktualizovaný produkční bundle, viditelná patička v93.447, žádné page errors. **PASS Chromium** `browser_alchemy_arcane_targets_447.py`: živý archiv uloženého Physic a aktivního Darkvision, aktuální AS/Dispel penalty a skutečný kouzelník Pvârism 70 se správně zobrazeným Detect ML64/SI6/30 ft, Reveal ML64/SI6/6 ft, Dispel ML62/SI6/30 ft; otevření/zavření panelu nijak nezměnilo LocalStorage.
- **Omezení Chromium:** místní HTTP / `file://` navigace zůstává blokována testovacím runnerem; webové testy používají nezměněný obsah `index.html` a vložený produkční bundle, **nikoli skutečný síťový reload GitHub Pages**. Nové skutečné seslání Detect→Reveal→Dispel nebylo provedeno a není označeno PASS.

### Další blokující závislost

Implementovat a ověřit *původní* spellstart, trvání a neporušenou koncentraci, skutečný EML včetně všech použitých modifierů (fatigue, gesture, cant, injury, noise, grimoire, Focus aj.), sekvenční navázání Detect CS / Reveal / Ward / Dispel na **tentýž historický zdroj**, úplné Spell Misfire následky a jejich atomický commit do existujících Initiative, Combat State a historie. Teprve poté lze elixír skutečně dispelovat. Celý bod 10 a navazující 11–15 zůstávají otevřené; body 6–8 zůstávají dle výše uvedeného auditu částečné.
