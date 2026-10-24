# HMK Keeper’s Ledger · Bod 4 Alchemy · Priorita 1–15

Průběžný tracker aktualizovaný do pracovní v93.455; opravena pravidlová matematika Neutral spell ML/SI a doplněn nezapisující Casting d100/Misfire resolver; původní audit bodů 1–8 a navazující spellcasting preflight. Verze 93.437 dokončuje samostatné implementační oblasti #1 a #2 **v ověřeném rozsahu přímé aplikace**. Jejich návaznost na vrženou lahvičku patří do samostatného bodu #3. Mechanicky neověřené katalogové oblečení nelze automaticky považovat za zbroj s AV; engine je správně předá k posouzení GM. Nejde o domýšlení jejich ochrany. **Závazné pořadí:** nejprve uzavřít všech 15 společných návazností, teprve potom další kanonické elixíry. Předchozí doporučené verze v93.436–438 se nesmějí považovat za závazná čísla etap; jednotlivé práce jsou zahrnuty do bodů 1–15.

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


## Pracovní v93.448 – #10 Native Neutral Spellstart / EML; **NENÍ VYDÁNÍ** (24. 10. 2026)

**Bod 10 nadále NEUZAVŘEN. Rozdílový ZIP se nesmí prezentovat jako dokončená etapa.** V této pracovní kopii byla doplněna první zapisovatelná část sesílání Neutral kouzel.

- `neutralCastingTimeRounds()` přebírá skutečné časy Detect 2 rounds, Reveal/Dispel 1 minute = 6 rounds (HMK 200–202, 251, 254). Quicken se bez zvláštního důkazu odmítá.
- `neutralOrdinaryCastingEML()` odvozuje běžný EML z přepočteného Spell ML, aktuální skutečné únavy v Combat State, ověřeného encumbrance a případného Dispel postihu za aktuální AS. Zranění, abnormality, jiné modifikátory, silent/still, hluk, spojené seslání, Focus a grimoire nejsou při chybějících podkladech automaticky domýšleny.
- `hmk-alchemy-neutral-spellstart.js` umí z originálního dossieru postavy, kampaně, lahvičky/účinku a živé Initiative připravit a atomicky zapsat **POUZE Spellstart** do původní koncentrace a společného historického journal. Replay zakazuje upravený vstup nebo podvržený plán; CAS odmítá souběžný i neověřený zápis. Žádný elixír ani AS není změněn, žádný úspěch Spellfire se nepředstírá.
- `test_alchemy_neutral_spellstart_448.cjs`: **30 dokončených kontrol PASS**, včetně neplatných iniciativ, chybějícího Ward dokladu, chybějící původní gesture ENC, selhání ukládání, duplicitních zápisů, nulových side-effects a jednoduchého live casting EML.
- Úplná **Node.js regrese 76/76 testovacích souborů PASS** v šesti dokončených dávkách 14+14+14+14+14+6 (včetně nové sady v její původní 23kontrolní podobě; po přidání sedmi dalších kontrol nová sada znovu samostatně 30 PASS).

### Dosud chybí k uzavření #10

1. Kompletní autoritativní Spellfire podle HMK (fyzické d100 a dle potřeby Misfire/Total Release/Abort, dodatečná únava, přerušení, správné modifikátory) přímo v původní Initiative; připojení Spellstartu do uživatelského rozhraní se nesmí zpřístupnit bez bezpečného dokončení.
2. Historicky neměnný úspěch Detect všech zdrojů v oblasti, Reveal pro stejný zdroj, platný Ward a jeho vlastní Dispel, následný Dispel elixíru s aktuální AS, plná historická rekonstrukce při reloadu.
3. Negation, Attunement, Spirit Sensing, True Sight/Soulcloak; jejich pravidlové původy a originální zdravotní/Spirit účinky.
4. Skutečná Chromium end-to-end cesta přes UI a rehydrataci uložené kampaně pro celou sekvenci. Samostatný Chromium smoke test připravené stránky v93.448 a sestaveného bundle **PASS** (bez JS chyb, viditelná patička; nikoliv HTTP ani skutečný Spellfire).

**Poznámka:** Nová implementace zatím nemá UI cestu; nedokončený spellstart není hotové seslání. Pro bod 10 tedy žádný dokončený v93.448 DIFF vydán nebyl.

## Pracovní v93.449 – bod #10: atomický Neutral Spellfire a historická integrita (24. 10. 2026; **NEVYDÁNO**)

**Bod #10 nadále NEUZAVŘEN.** Pracovní změny jsou založeny na nevydané v93.448; poslední distribuovaná verze je v93.447. `index.html`, `app.js` a produkční `hmk-app.bundle.js` mají pro případ budoucího vydání připravené v93.449, ale toto **není pokyn k distribuci ZIPu**.

### Skutečně implementováno

- `src/integration/hmk-alchemy-neutral-spellfire-commit.js`: atomické pokračování původního Spellstart a nezrušené koncentrace přes autentický `Initiative` checkpoint. Vyžaduje originálního kouzelníka, jeden relevantní Spellstart, přesné kolo a původní působící elixír, fyzický Casting d100, doložený spell ML / EML a správné GM podklady. Výsledek **F** zapisuje původní Casting Fatigue, spotřebuje vlastní IR, bez magického účinku. **CF s Misfire 01–99** zapisuje originální Windedness a podle tabulky Misfire Psyché Stress, Aural Shock, dodatečnou únavu a ztrátu kouzla po Crucial. **Misfire 100 / Total Release** zůstává blokován (vyžaduje Spirit a Raw Principle včetně Neutral Chaos Storm/Vortex), nepozorovaně se nesnižuje na CF.
- Skutečné **Detect S/CS → Reveal S/CS → Dispel S/CS** nad týmž originálním zdrojem má ověřené dokončené spellfire výsledky; Detect vyžaduje GM doložený úplný inventář všech magických zdrojů v dosahu, včetně nealchymistických. Detect CS poskytuje +20 původnímu kouzelníkovi na Reveal/Dispel pro stejný zdroj. Reveal uchovává původní důkazy Detect a aktuální AS, Dispel vyžaduje doklady obou předchozích úspěchů a aktuální AS, LOS a výslovné vyřešení Ward. Při S/CS Dispel se enchantment historicky mění na AS0, **nikoli fyzický předmět / lahvička**. Nikdo nepřetáčí GM čas ani nepřepisuje původní deník.
- `src/integration/hmk-alchemy-neutral-history.js` a `verified-combat-storage.js`: kontrola d100/SL, bonusu +20, původního Spellstart, Misfire únavy, pre-Dispel AS, neměnnosti historie. Dodatečná `validateNeutralAlchemyCombatLinks` vyžaduje pro aktuální bojovou časovou osu odpovídající původní **Combat State fatigue event a Initiative Spellstart/Spellfire log**. Vstupní validace záloh v `app.js` nově odmítá výměnu či odstranění těchto důkazů, aniž by se zapsalo cokoli.
- Spellfire nyní odmítá zjednodušené / neúplné `combatRuntime` bez `version:1`, účastníků, odpovídající `timelineId` a živého kontrolního času. Izolovaná Node fixture byla opravena tak, aby obsahovala skutečný tvar Initiative checkpointu.

### Testy této pracovní kopie (skutečně dokončené)

- **PASS 77/77 Node.js testovacích souborů**, tři dokončené nezávislé dávky 27+27+23, 0 FAIL a 0 TIMEOUT po finálním sestavení a opětovném ověření včetně UI a LOS.
- **PASS 122 cílených Node.js assertions** `tools/test_alchemy_neutral_spellfire_failed_449.cjs`: F, šest tříd Misfire 01–99, blokace Total Release 100, Detect CS s cizím zdrojem, šestikolový Reveal a Dispel, původní CAST únavy a CAS write, replay a ochrana před změnou AS/d100, odstraněním Combat a Initiative záznamu.
- **PASS Chromium** `tools/browser_alchemy_neutral_proofs_449.py`: dvě skutečná oddělená načtení kampaně z kompletního lokálně uloženého JSON, kalendářní přehled a nulová změna historie/GM času. Dále tři záporné scénáře při načtení: pozměněný Casting d100, odebraný Combat Fatigue event, odebraný Initiative Spellfire event; všechny zamítnuty v read-only stavu a původní localStorage bytes zůstaly beze změny. Jde o injection skutečného bundle do Chromium dokumentu, **nikoli o přímou HTTP navigaci GitHub Pages**.
- **PASS Chromium** `tools/browser_alchemy_release_version_449.py`: skutečné HTML + produkční bundle, patička v93.449, žádná JavaScriptová chyba.
- **PASS Chromium** `tools/browser_alchemy_neutral_ui_449.py`: reálné klikání ve webu (Neutral Spellstart, Initiative hold, Spellfire) Detect CS → Reveal S → Dispel S, +20, AS=0, inventář beze změny; odmítnutí chybějícího GM výčtu zdrojů a opětovné načtení záznamů v novém Chromium kontextu.
- **PASS** geometrická ochrana LOS Dispel před existujícím záznamem Fumebomb přes původní resolver `hmk-alchemy-area-los.js`. Požadované souřadnice a trvající kouř nejsou nahrazovány pouhým potvrzením GM.

### Stále blokující závislosti (nezaměňovat s dokončením #10)

1. **Odstraněno v pracovní v93.449:** skutečné tlačítko Neutral Spellstart a Spellfire je napojené do stávající záložky Combat. Ověřena plná interaktivní Chromium sekvence Detect CS → Reveal S → Dispel S přes 2+6+6 kol koncentrace, včetně zadání d100, bonusu +20, AS0, inventáře, historii, znovunačtení kampaně a selhání při neúplném census bez částečného zápisu. Nejde však o obecný neutral spellcasting pro všechny zvláštní casting varianty.
2. Ward má zatím jen explicitní GM absence confirmation, ne původní životní cyklus Ward, jeho zjištění a magické odstranění. Pravidla Detect/Reveal/Dispel v plném rozsahu nemohou být prohlášena za hotová bez Ward výjimek.
3. Total Release 100 musí podle HMK str. 203–204 v původních Arcane/Combat State řešit Spirit, Raw Principle a Neutral Chaos Storm / Vortex. Nevyvolávat bez kompletních zdrojů.
4. Negation, samostatná Attunement / Natural Attunement, Spirit Sensing, True Sight a Soulcloak stále nemají plné autoritativní spell/arcane provedení, oporu o doklady a rehydrataci.
5. Kompletní Spellcasting volby včetně všech modifikátorů (gesture, cant, noise, wound, Focus, grimoire, Quicken, atd.) nejsou podporovány; pouze důsledně ověřovaný běžný režim, ne univerzální sesílání. Změna kampaně / vypršený AS / nová překážka LOS vyžaduje novou adjudikaci.

**Závěr:** pracuje se pouze v izolované v93.449, **žádný rozdílový ZIP #10 se nyní nevydává**. Nesmí se slibovat dokončení bez všeho výše uvedeného.


## Pracovní v93.450 – bod #10: pravidlové výjimky Ward / Total Release / Neutral Chaos Storm (24. 10. 2026; **NEVYDÁNO**)

**#10 ZŮSTÁVÁ NEUZAVŘEN.** Nejde o novou fungující funkci sesílání ani o dokončené nakládání s Ward nebo Vortex. Poslední veřejně distribuovanou verzí zůstává v93.447; změny v93.448–v93.450 jsou založeny na nevydaných pracovních kopiích.

- Nový čistý modul `src/integration/hmk-neutral-arcane-exceptions.js` používá původní `src/rules/tests.js` pro skutečně zadaná d100. **Ward (HMK 255):** `Ward Level = half SI (CS +2)`, běžné zaokrouhlování HMK p.7, Dispel Wardu `−10 × WL`, Indefinite a přebití pouze vyšším WL, vyloučení Raw Principle z přímých zdrojů pro Ward. Chráněný zdroj není detekovatelný ani ovlivnitelný Reveal/Dispel před odstraněním Wardu; Ward samotný je Detectem nalezitelný. Zatím nelze ukládat Ward, protože chybí skutečný 10minutový Spellstart/Spellfire, dotyk a originální ward/detection journal writer.
- **Total Release 100 (HMK 203):** fyzický Spirit d100 proti **doloženému** EML včetně −5 za každý CL; výsledky CF = fatal Shade transformation, F = Aural Shock 6 + šest fyzických d6 ztráty Spirit ML, S = Shock 4 + čtyři d6, CS = Shock 2 + dvě d6. Vždy PSY 3 a Crucial Misfire se ztrátou kouzla. Nedoložené živé Spirit modifikátory nebo chybějící d6 se odmítají; nevznikne žádné vymyšlené ML či hod.
- **Neutral Chaos Storm / Vortex (HMK 204/255):** SI = původní spell CL (nikoli Pvârism SI), počáteční průměr 5 ft, roaming **radius** CL ×10 ft (příklad knihy CL IV = roaming diameter 80 ft), trvá CL kol. Výslovně chybí doložení celého výběru všech možných zdrojů, náhodného cíle, živé geometrie, Ward priority a všech navazujících hodů. Čistý resolver pro jeden prokázaný **Elixir/Ward** rozlišuje d100 S/CS (imunita 1 kolo; CS PSY +1) a F/CF (potlačení na fyzický d20 kol/hodin), **neodstraňuje trvale elixírovou AS**. Na neověřené ostatní kategorie nesahá.
- `hmk-alchemy-arcane-casting-readiness.js` nyní při skutečném Misfire d100=100 přikládá pravidlovou geometrii a explicitní seznam zbývajících důkazů. `diceComplete:false`, `mayCommit:false` a již existující odmítnutí atomického Spellfire Misfire 100 zůstávají. **Toto nejsou paralelní Combat State, Initiative ani magická historie.**
- `index.html`, `app.js`, `hmk-app.bundle.js` mají pouze pro pracovní sestavení připravené viditelné a cache-busting číslo **v93.450**. Nejde o distribuovaný ZIP.
- **NUTNÉ pro uzavření #10:** původní a úplný Ward writer přes 10 minut; navazující Dispel Wardu před jeho elixírem; kompletní Spirit+Shade a časově postupující Vortex/Raw Principle v Initiative/Combat State; skutečná Negation, Attunement, Spirit Sensing, True Sight/Soulcloak, casting volby a široká Chromium end-to-end regrese. Výše uvedené kalkulace samy #10 neuzavírají. 

### Skutečně dokončené kontroly pracovní v93.450

- **PASS 142 cílených Node.js kontrol** `tools/test_neutral_arcane_exceptions_450.cjs`, včetně nových propojení `neutralSpellfireDice` → `neutralChaosStormGeometry`, všech čtyř Spirit SL, d6 požadavků, Ward Level a Vortex F/CF d20. Všechny funkce mají `mayCommit:false`.
- **PASS kompletní dostupná Node.js regrese 78/78 testovacích `.cjs` souborů**, tři dokončené izolované dávky 26+26+26, 0 FAIL a 0 TIMEOUT, výsledky `/mnt/data/hmk_v93450_regression_*.json` (mimo distribuční projekt). Tato regrese ověřuje nezměněné fungující větve, **nikoli** dosud nedokončený autoritativní Ward a Total Release writer.
- **PASS Chromium `browser_alchemy_release_version_450.py`**: skutečný obsah `index.html` a produkčního bundle vložený do Chromium, viditelná patička v93.450 a žádná JS chyba. Nejde o HTTP navigaci na GitHub Pages.
- **PASS Chromium `browser_alchemy_neutral_ui_450.py`**: skutečné klikání Detect CS → Reveal S → Dispel S, 2+6+6 kol, ověřená AS0, lahvička zachována, rollback neúplných podkladů, další načtení uložené kampaně, nezměněný GM čas.
- **PASS Chromium `browser_alchemy_neutral_proofs_450.py`**: dvě oddělené rehydratace kampaně a tři záporné scénáře podvržených důkazů; původní uložená data zůstala beze změny.
- **NEPROVEDENO:** kompletní klikací E2E Ward, Total Release, Negation, Attunement, Spirit Sensing a True Sight, protože stále neexistuje nezbytný autoritativní mechanismus. Žádný ZIP v93.450 se nevydává, bod #10 je **NEUZAVŘEN**.

### Závěrečná oprava a regrese po zásahu do skutečné Detect cesty

- `hmk-alchemy-neutral-detection.js` nyní při `buildNeutralDetectCensus` odmítne GM deklarovaný Ward (označení `spell:'Ward'`, `wardLevel` či `protectsSourceId`) bez existujícího autentického Ward důkazu. Jinak by dosavadní všezahrnující Detect census falešně prozradil magický zdroj, který má HMK 251/255 chránit. Ochrana je **fail-closed**, nikoli dokončený Ward spellcasting; právo validně odhalit Ward samotný vyžaduje dokončení historického writeru.
- **PASS nových 145/145 cílených assertions** v `test_neutral_arcane_exceptions_450.cjs`, včetně tří nových zakázaných detekčních vstupů s deklarovaným Wardem.
- **PASS kompletní finální regrese 78/78 Node.js testovacích souborů**, 3 samostatné dokončené běhy po 26, výsledky `/mnt/data/hmk_v93450_regression_{0_26,26_52,52_78}.json`. První společný opakovaný pokus byl ukončen časovým limitem po úvodní dávce; nebyl započítán jako kompletní PASS.
- **PASS finální Chromium po poslední opravě Detect:** `browser_alchemy_release_version_450.py`, `browser_alchemy_neutral_proofs_450.py` (2 nezávislé rehydratace, 3 odmítnutí podvržené historie), `browser_alchemy_neutral_ui_450.py` (klikací 2+6+6kolový Detect CS → Reveal S → Dispel S, předchozí bonus, AS0, inventář, GM čas a ochrana chybějícího vstupu). Testy používají skutečné HTML a JS v dokumentu Chromium, nikoliv HTTP navigaci na GitHub Pages. **Ward/Total Release se v Chromiu nevykonávaly, protože writer dosud neexistuje.**


## Pracovní v93.451 – bod #10: autoritativní Ward pro dosud nechráněný elixír (24. 10. 2026; **NEVYDÁNO**)

**#10 ZŮSTÁVÁ NEUZAVŘENÝ.** Poslední uživatelsky distribuovaná aktualizace je v93.447. Pracovní verze v93.448–v93.451 musí být při případném vydání spojeny do skutečného DIFF oproti ní, nikoli pouze zabalena poslední pracovní složka.

- **HMK 200–203, 251, 255:** Přidáno doložené kouzlo `Neutral::Ward` (CL II, CD 2, běžný Spell ML, dotyk, 10 minut = **60 bojových kol**). V `hmk-alchemy-neutral-spellstart.js` již existující Initiative plánovač přijme jen ověřeně naučený Ward, GM potvrzený dotyk a dosah 0 ft. U již chráněného cíle novou operaci odmítne, dokud nebude doloženo odstranění nebo správné přebití.
- `hmk-alchemy-neutral-spellfire-commit.js` přes stejný původní CAS writer vyhodnotí skutečný d100 (F, CF 01–99, S, CS), běžné Casting Fatigue, původní Combat State a dokončenou koncentraci. Při S/CS připojí k originálnímu Spellfire proof `ward.level = round(SI/2) + (CS?2:0)` a jednoznačné `protectedSourceId`; žádná fyzická lahvička ani elixírová AS se nemění. Původní pravidlový modul profilu Ward nadále zůstává čistý/neukládající. Misfire 100 je zablokován.
- `hmk-neutral-ward-lifecycle.js` čte autentický originální historický Ward proof, nikoli paralelní seznam ochranných štítů. `hmk-alchemy-neutral-history.js` zpětně ověřuje skutečný dotyk, ML→SI→WL, vazbu na originální Spellstart, datum, casting d100, Fatigue, Initiative a neexistenci duplicitního Wardu. Obnovení/tampering původní historie je fail-closed.
- `hmk-alchemy-neutral-detection.js` do GM potvrzeného Detect census promítá pravdivý **Ward jako detekovatelný Active spell**; původní chráněný elixír z census záměrně vynechává. Přímý Detect/Reveal/Dispel původního chráněného elixíru je i přes falešně zaškrtnutou GM absenci Ward odmítnutý; historická validace chrání i jiné zdroje v Detect census.
- Existující Combat formular je rozšířen o Ward s checkboxem pro skutečný dotyk při Spellstart i Spellfire. Jiná kouzla dál vyžadují explicitní nepřítomnost Ward. `index.html`, `app.js` a produkční bundle uvádějí pracovní **v93.451**.

### Dokončené testy v93.451

- **PASS 29 cílených Node.js kontrol** `tools/test_alchemy_neutral_ward_451.cjs`: 60 kol, dotyk, Casting CS Ward Level 5, atomický journal/Combat/Initiative, chráněné zdroje, neprolomení Detect, neměnný inventář/GM čas, reload a odmítnutí podvržených dokladů a duplicity.
- **PASS celková Node.js regrese 79/79** testovacích souborů v oddělených dávkách; unikátní PASS jsou potvrzené uloženými výsledky `/mnt/data/hmk_v93451_regression_*.json` mimo projekt. Hromadná dávka 26–52 se přerušila časovým limitem po 5 testech; tyto testy byly poté samostatně zopakovány a dokončeny. Žádný nedokončený běh není počítán jako PASS.
- **PASS Chromium `browser_alchemy_neutral_ward_451.py`:** skutečné klikací Spellstart, 59 soustředěných HOLD tahů a následný 60. dokončený round + CS Spellfire, uložení WL5, rollback bez dotyku, historie a nový prohlížeč.
- **PASS Chromium** `browser_alchemy_release_version_451.py` (paticka v93.451), `browser_alchemy_neutral_proofs_451.py` (2 rehydratace a 3 odmítnutí historických manipulací), `browser_alchemy_neutral_ui_451.py` (původní 2+6+6kolový Detect→Reveal→Dispel, +20, AS 0, rollback). Nešlo o HTTP GitHub Pages test, ale o skutečný lokální HTML/bundle načtený do Chromium dokumentu.

### Nedořešené závislosti pro skutečné dokončení bodu #10

1. Autentický **Detect/Reveal/Dispel samotného Wardu**, Ward Level ×10 penalty, odstranění Wardu jako původního historického zdroje a **teprve potom** ochranného elixíru. Přepis/přebití nižšího Wardu vyšším WL, ochrana před přerušením Wardu při výměně nebo použití elixíru, široké nealchymistické Ward cíle. Současná v93.451 dovoluje bezpečně vytvořit pouze Ward na dosud nechráněný prokázaný alchymistický zdroj.
2. Atomický Misfire **100 / Total Release** s fyzickými Spirit/d6 a všemi cíli Vortexu, postupem kol, Raw Principle, případnou transformací, závislým zdravotním a historickým účinkem. Dosud jen nezapisující pravidlové preflighty.
3. **Negation, Attunement, Spirit Sensing a True Sight/Soulcloak** bez paralelní magie; navázat na skutečné původní doklady, nikoli jen na katalog. Dále zvláštní casting varianty a široký E2E test všech dokončených operací.

**Rozdílový ZIP se nevydává, dokud nejsou všechny výše uvedené závislosti bodu #10 skutečně dokončeny a otestovány.**


### Dodatková implementace ve stejné pracovní v93.451 – skutečné odstranění Wardu

- **Druhá ověřená cesta cílení `targetKind:'Ward'`**: originální aktivní Ward na jednom doloženém alchymistickém zdroji je sám magickým cílem. Původní Spellstart/Spellfire používají Wardův jednoznačný `wardProofId` místo ID chráněné magie a GM výslovně potvrzuje, že míří na Ward, nikoliv na elixír. Na původní elixír nadále nejde zaškrtnutím „Ward není přítomen“ cílit, když Ward aktivně chrání jeho AS.
- **Detect Wardu:** úplné GM potvrzení detekovaných zdrojů, Ward v kategorii Active spell, chráněný elixír **není** součástí odhalení. Originální Detect CS přiznává +20 jen na tentýž historický Ward. **Reveal Wardu:** originální Detect a přesné doložené WL. **Dispel Wardu:** původní Detect+Reveal stejného Wardu, LOS, `−10×WL` v živém Casting EML a skutečné nové kolo; úspěch historicky označí **pouze Ward** za odstraněný. `alchemyElixirStrength` nyní neinterpretuje Dispel Wardu jako Dispel elixíru, takže fyzická lahvička i její stávající AS zůstávají beze změny.
- `hmk-neutral-ward-lifecycle.js` umí rekonstruovat, kdy byl Ward vytvořen a kdy byl přes oprávněný `dispel.wardProofId` odstraněn. Historická validace `hmk-alchemy-neutral-history.js` ověřuje převod obou druhů cílů, fyzické d100, původní Detect CS, Revealed WL, Dispel WL, zdrojová ID, Fatigue a Initiative. Po skutečném Dispel Wardu lze elixír opět samostatně detekovat.
- Combat UI dovoluje GM vybrat **Elixir nebo Ward jako přímý cíl** a vynucuje správné vzájemně odlišné GM potvrzení. Pro `Ward` casting stále vyžaduje 60 kol dotyku, pro `Ward` target Detect/Reveal/Dispel požadované 2/6/6 kol. Přetrvávající Ward nelze obejít implicitním přepnutím cílů.

**Nové dokončené důkazy:**

- **PASS 38 cílených Node.js kontrol** `tools/test_alchemy_neutral_ward_dispel_451.cjs`: kompletní Detect CS → Reveal S → Dispel S proti reálnému Wardu WL5, skutečný Dispel EML 27 včetně bonusu Detect CS a WL postihu −50, úspěšné odstranění Wardu, nenulová originální AS6 a zachovaná lahvička, potvrzený běžný Detect stejného elixíru po odstranění Wardu, CAS, podvržená historie.
- **PASS Chromium** `tools/browser_alchemy_neutral_ward_dispel_451.py`: skutečné 2+6+6 kol klikáním na produkčním UI proti již vzniklému autentickému Wardu, stav Ward odstraněn / originální elixír zachován, inventář, GM čas a nezměněná historie po znovunačtení.
- **PASS po posledních změnách všech 80/80 Node.js testovacích souborů** ve finálně dokončených sériových dávkách (části hromadných pokusů skončily timeoutem a nebyly započítány; chybějící testy byly zopakovány); unikátní výsledky v `/mnt/data/hmk_v93451_regression_*.json` mimo projekt.
- **PASS Chromium** `tools/browser_alchemy_neutral_ward_451.py` (celých 60 klikacích kol, CS WL5, dotyk, rollback, reload), `browser_alchemy_neutral_ui_451.py` (původní Detect→Reveal→Dispel elixíru), `browser_alchemy_neutral_proofs_451.py` (dva reloady a tři záporné důkazy), `browser_alchemy_release_version_451.py` (produkční web v93.451). Síťový provoz přes skutečné GitHub Pages neověřován.

**Stále otevřeno:** správné přebití existujícího Wardu silnějším WL včetně důkazů; Ward pro nealchymistické magické zdroje; oddělené životní cykly po transformaci chráněné dávky; kompletní Total Release 100/Spirit/Chaos Storm/Vortex; skutečné Negation, Attunement, Spirit Sensing a True Sight/Soulcloak; zvláštní způsoby sesílání, náročnější modifikátory a kompletní E2E těchto zatím nepodporovaných větví. **Bod #10 nadále NEUZAVŘEN – žádný distribuční ZIP.**


## Mimořádný distribuční checkpoint v93.452 – bezpečné přebití Wardu (24. 10. 2026)

**Bod 10 stále NEUZAVŘEN.** Tuto verzi vydáváme pouze na výslovné přání uživatele jako mimořádný **CHECKPOINT**, nikoliv jako dokončení Spell/Arcane. Rozdílový ZIP se počítá vůči poslední **skutečně distribuované** v93.447, protože pracovní verze v93.448–v93.451 dosud nebyly předány. Včetně všech potřebných zdrojů, aplikace a testů.

- **HMK str. 255:** Ward na jednom prokázaném alchymistickém zdroji trvá neurčitě, dokud není dispellován nebo přebit Wardem s **vyšším WL**. Původní `neutralSpellMastery` a `neutralWardProfile` zůstávají autoritativními výpočty; běžný úspěch `S` má WL = zaokrouhlené SI/2, `CS` přidává 2.
- Nově lze přes původní **Combat → Neutral Spellstart** zahájit 60kolový Ward nad dříve chráněným elixírem, **pouze když je už předem prokázáno, že nové WL při běžném S bude vyšší než staré**. CS-only přebití, kdy by S bylo příliš slabé, zůstává explicitně blokované před spotřebou tahu. Předejde se tomu, že by se nedostatečně silný Ward rozběhl a nebylo jej možné dokončit žádným atomickým zápisem.
- GM potvrzuje živý dotyk i **přebití** při původním Spellstart a znovu při Spellfire. `combatProof` spellstartu obsahuje `priorWardProofId`, `priorWardLevel` a totožnost chráněného elixíru. Spellfire ověřuje, že ochrana během 60 kol nebyla změněna či odstraněna. Pokud byla, **odmítne zápis** a nemanipuluje s historií.
- Úspěšný Spellfire zapíše novou ochranu do **stejného původního journalu**, stejné Initiative a Combat State; `ward.supersedesWardProofId` odkazuje na starý neměnný důkaz. `activeAlchemyWard` vrací jen poslední platnou ochranu, a její následný Dispel nemůže obnovit starší přebitý Ward. Inventář, AS a GM čas se nemění. `validateNeutralAlchemyHistory` přehrává přebití podle skutečného ML→SI→WL, starého proof ID, originálního Spellstart a Casting d100. Žádný druhý inventář, Ward registry ani nový zdravotní systém nevznikl.
- **PASS cílený Node.js** `test_alchemy_neutral_ward_supersede_452.cjs`: 24 ověření včetně dvou různých kouzelníků, 60+60 skutečných kol, Ward WL3 → WL5, odmítnutí chybějícího GM potvrzení, CAS, reload, neměnný starší důkaz a tampering starého ID/WL/Spellstartu.
- **PASS kompletní Node.js regrese 81/81 souborů**, dokončena ve čtyřech samostatných dávkách: `/mnt/data/hmk_v93452_regression_{0_27,27_54,54_68,68_81}.json`. Souhrnná dávka 54–90 byla předtím přerušena časovým limitem, **nezapočítává se**; chybějící běhy byly samostatně dokončeny.
- **PASS Chromium** `browser_alchemy_neutral_ward_supersede_452.py`: skutečné klikání 60 kol, Ward WL3→WL5, rollback bez GM potvrzení při Spellstart i Spellfire, historické předchůdce, inventář, GM čas a nový prohlížeč s načtenými uloženými daty.
- **PASS další samostatné Chromium retesty**: produkční viditelná verze `browser_alchemy_release_version_452.py`; původní 2+6+6 Detect→Reveal→Dispel `browser_alchemy_neutral_ui_452.py`; šedesátikolový původní Ward `browser_alchemy_neutral_ward_452.py`; Detect→Reveal→Dispel Wardu `browser_alchemy_neutral_ward_dispel_452.py`; dvě obnovení a tři odmítnuté manipulace s historií `browser_alchemy_neutral_proofs_452.py`. Při společném spuštění dvou Chromium scénářů došlo k časovému limitu; každý byl následně úspěšně dokončen samostatně. Skutečný síťový reload na GitHub Pages se zde netestoval.
- `index.html`, `app.js` a znovu sestavený produkční `hmk-app.bundle.js` uvádějí **v93.452**; rozdílový archiv neobsahuje žádná odstranění.

**Nadále neuzavřené:** autoritativní **Misfire 100 / Total Release** se Spirit loss a kompletním životním cyklem Neutral Chaos Storm / Vortex (náhodný nový střed, úplný soupis zdrojů, každý d100 a případný d20 v každém kole, Ward před chráněným zdrojem, trvání a historické přehrání). Existující `neutralTotalReleaseSpirit` a `neutralChaosStormGeometry` zůstávají **nezapisující**; nedokončenou Vortex transakci nelze zaměnit za dokončený bojový tah. Dále Negation, Attunement, Spirit Sensing, True Sight / Soulcloak a rozsáhlejší magické zdroje a varianty casting. **Bod 10 neoznačovat za hotový.**

## Pracovní v93.453 – #10 Neutral Total Release / Vortex: úplné jednorázové vyhodnocení (24. 10. 2026)

**Bod #10 NADÁLE NEUZAVŘENÝ.** Výchozí stav je přesně distribuovaná v93.452.

- Nový čistý nezapisující `src/integration/hmk-neutral-vortex-round-preflight.js` implementuje pro **jedno** kolo Vortexu pravidla HMK str. 203–204 a 255: všech šest kategorií originální magické energie (Active spell, Active talent, Artefact enchantment včetně aktivních latentních, Elixir, Raw Principle, Rune object); zvláštní ML podle aktuálního CL/WL/Talent Indexu/AS/Runecraft SI; Ward jako samostatný Indefinite spell; všechny fyzické d100 a při F/CF povinné d20; potlačení na kola nebo hodiny, nikoliv ztrátu elixírové AS; při každém CS cílového testu Psyche Stress +1 kouzelníkovi; Ward se testuje před chráněným zdrojem.
- GM musí dodat **úplný seznam současně aktivních zdrojů a ověřené pozice**, původní Raw Principle CL, vybraný zdroj a doložení náhodného výběru, každé fyzické d100 a případné d20. Veškeré částečné výsledky jsou odmítnuty ještě v čistém výpočtu. Vortex se může znovu zaměřit při spellfire a na konci tahu kouzelníka, pokud jsou v povolené roaming oblasti zdroje. Pokud není žádný dosažitelný zdroj, zůstává původní střed a nic se nehází. Po alespoň jednom potlačení se poloměr zvýší o 5 ft, nejvýše na povolený roaming range.
- **DŮLEŽITÉ OMEZENÍ:** prozatím `mayCommit:false`. Nejde o nový autoritativní zdroj historie ani o zprovozněný Neutral Misfire 100! Doložení náhodného výběru je v preflightu pouze výslovně potvrzený GM vstup; **není** ještě navázáno na neměnné kostky historie. Stejně tak zatím není rekonstruováno vypršení potlačení z předchozích kol, změna geometrie v Initiative, Spellfire/Spirit tělesný dopad ani následný CAS do kampaně. Proto tento modul nesmí způsobit spotřebu tahu, Fatigue, úpravu Spirit ML, zdrojovou supresi ani trvalý zápis.
- **PASS** cílený `tools/test_neutral_vortex_round_453.cjs` – 62 ověření šesti zvláštních ML, Ward-first, všech zdrojů v poloměru, povinných hodů a absencí, PSY za CS, růstu poloměru, hranic Chaos Storm. Starý scalar preflight `hmk-neutral-arcane-exceptions.js` je zachován beze změny kvůli kompatibilitě.
- `index.html`, `app.js`, produkční bundle zobrazují **v93.453**; jde o přesný navazující checkpoint proti v93.452. **Bez dokončeného Total Release writeru neuvádět #10 jako dokončený.**

**Další nejbližší blokátor:** spojit úplný živý source census s původními Arcane/Alchemy/Initiative důkazy, vytvořit atomický Spellfire 100 → Spirit CF/F/S/CS a první Vortex tick a zapsat časovou kontinuitu Vortexu s vlastním CAS na každé další kolo. Následně skutečná Negation, Attunement, Spirit Sensing, True Sight/Soulcloak a jejich ochrany.


## Pracovní v93.454 – #10 replay návazných kol Neutral Vortex (24. 10. 2026)

**Bod #10 NADÁLE NEUZAVŘEN.** Výchozí stav: skutečně vydaná v93.453. Toto je navazující kontrolní etapa, nikoli prohlášení o dokončeném Total Release nebo magickém writeru.

- Nový **read-only** `src/integration/hmk-neutral-vortex-sequence.js` skládá na sebe jednotlivé úplné vyhodnocené ticky původního `hmk-neutral-vortex-round-preflight.js` (HMK str. 203–204 a 255). První tick se koná při spellfire a každý následující v konci kouzelníkova tahu; replay požaduje nepřerušené pořadí `roundOffset` a původní pevný spell CL. Není možné předložit třetí tick místo druhého ani předčasně rozšířit poloměr.
- Nový replay drží pro každý skutečně potlačený magický zdroj počátek a konec potlačení: při **F** d20 kol; při **CF** d20 hodin (jedna hodina = 360 bojových kol podle 6 kol/min). Na příštím ticku potlačený zdroj nevystupuje mezi živými cíli, po vypršení se vrací. Původní AS elixíru zůstává nedotčená.
- Přetrvávající Ward vylučuje své chráněné zdroje z vyhodnocení, dokud sám nepropadne F/CF. Při potlačení Wardu může v dalším ticku vstoupit do hry chráněný elixír; po obnovení ochrany je znovu zakryt. Zvláštní nejednoznačný stav aktivního Wardu nad již potlačeným zdrojem replay prozatím výslovně **odmítá**.
- Při **více zdrojích** je používán originálně zadaný GM random witness a reprodukovatelný kanonický seznam identit; výběr nesmí odporovat fyzickému výsledku. Při **právě jednom možném zdroji** není náhodný hod povinný – úprava i v původním jedno-kolovém preflightu, kompatibilita dřívějších vstupů zachována. Vlastní vstup `dN` a pořadí zdrojů je **technická konvence aplikace**, nikoli nově zavedené pravidlo HMK. Vzdálenosti a úplný source census zůstávají GM-confirmed a nejsou dosud odvozené z kompletní autoritativní magické historie.
- Po každém kroku se přepočítá živý radius a výsledky d100/d20, imunitní CS, psyches stress a seznam historicky potlačených zdrojů. Katalog původních zdrojů musí mít stejná ID, druh a živé parametry v každém kroku, žádný nový či chybějící magický zdroj nesmí být tiše dopočítán. To je bezpečné **omezení** současného replaye; historie vzniku nových kouzel či zániku artefaktů bude vyžadovat další vázané důkazy.
- Nový nezapisující `src/integration/hmk-neutral-vortex-census-audit.js` čte přímo starý `alchemyArcaneTargetRegister`, `activeAlchemyWard` a `Initiative.spatialUnits`. Na každém alchymistickém zdroji ověřuje originální zdrojové ID, aktuální AS, příjemce/vlastníka, fyzickou polohu a případný originální Ward Spellfire včetně jeho WL. Podvržený či chybějící elixír a Ward fail-closed; současně modul **nepovažuje nealchymistické zdroje za plně historicky doložené**. Bez původního registry všech šesti kategorií jsou všechny jeho návratové údaje nadále `mayCommit:false`.
- **PASS** nový Node `tools/test_neutral_vortex_census_audit_454.cjs` (22 kontrol): reálný inventární Physic a aktivní Darkvision z původní kampaně, původní `Ward` spellfire, tampering AS/WL/ID, nepůvodní poloha v Initiative, cizí magie jako explicitně neověřená.
- **PASS** nový cílený Node `tools/test_neutral_vortex_sequence_454.cjs`: testuje tři po sobě jdoucí ticky, Ward → elixír → obnovený Ward, F/CF trvání, d20 hodiny, absenci neautorizovaného random d1, chybějící ticky, změněné source AS a podvrženou náhodu. Starý `test_neutral_vortex_round_453.cjs` zůstává jako nezávislá regrese.
- **STÁLE ZAKÁZÁNO ZAPISOVAT**: replay má explicitní `mayCommit:false`. Bez atomického originálního Spellfire Misfire 100 / Spirit CF–CS a úplného, historicky navázaného source census, interakcí se všemi šesti kategoriemi a CAS záznamu do původní Initiative/Combat State/Journals není bezpečné uložit ani první Vortex tick. Žádný kód nezačíná vedlejší zdravotní, inventární ani magický registr.
- `index.html`, `app.js` a znovu sestavený produkční `hmk-app.bundle.js` obsahují **v93.454**.

**Nejbližší blokátor:** autoritativní identita a poloha všech šesti kategorií zdrojů v živém Encounter a ověřená časová kontinuita dříve zapsaného Spellfire 100. Až následně lze provést jeden atomický commit a bezpečně odvozovat navazující ticky.

**Finální ověření v93.454:** úplná dostupná Node.js regrese 84/84 testovacích souborů PASS v sériových dávkách; nové Vortex cílené 62 + 29 + 22 = 113 kontrol PASS; Chromium produkční index + bundle + viditelná v93.454 PASS; Chromium původní Detect CS → Reveal S → Dispel S skutečným klikáním a obnovením uložené kampaně PASS. Vortex E2E a Neutral Misfire 100 writer **NEBYLY** provedeny, protože ještě nejsou bezpečně dokončeny.


## Pracovní v93.455 – #10: rozdílné trvání potlačení Ward / elixír (24. 10. 2026)

**#10 NADÁLE NEUZAVŘEN; není zde atomický Total Release writer.** Výchozí stav je vydaná v93.454. Opraven čistě nezapisující případ, kdy Vortex na jednom ticku potlačí Ward na kratší dobu než jím chráněný elixír.

- `hmk-neutral-vortex-sequence.js` ponechává v úplném soupisu oba originální zdroje a z jejich skutečně dříve vyhodnocených d20 rozpozná, že Ward je již aktivní, zatímco původní elixír je stále dočasně potlačený. Dříve tuto legální časovou kombinaci odmítal; nyní Ward může být samostatným aktivním cílem Vortexu a stále potlačený elixír se znovu netestuje. Po obnovení elixíru Ward znovu chrání zdroj bez ztráty AS.
- `hmk-neutral-vortex-round-preflight.js` má explicitní read-only parametr `suppressedProtectedSourceIds`; vstup musí být disjunktní od všech aktivních zdrojů. Chronologický replay jej **vypočítává z předchozích výsledků** a předá až po kontrole původní identity Wardu, vazby na chráněný zdroj a totožné polohy. Nelze tak tiše vydávat již aktivní elixír za potlačený. Samostatný round resolver zůstává nezapisující a neprokazuje pravost libovolného GM seznamu.
- Nový `tools/test_neutral_vortex_split_suppression_455.cjs`: samostatné intervaly potlačení, opětovná aktivace Wardu, vypršení potlačení elixíru, původní AS, celá časová návaznost, odmítnutí chybějícího původu a neslučitelného soupisu. **20 cílených kontrol PASS**; původní jedno-kolová sada 62 a vícekolová 29 PASS.
- Beze změny: `mayCommit:false` u všech Vortex výsledků. Bez originálních dokladů šesti kategorií energie, přesunů, Spirit následků, CAS a historie **není dovoleno** zapsat Misfire 100 ani první tick.

### Audit uzavření bodů 1–9 ve v93.455

V ověřeném deklarovaném rozsahu zůstávají #1 (Acid zbroj/oděvy), #2 (Acid živý člověk), #3 (Acid vrh/splash), #4 (Mending/Object Aegis) a #5 (Eruption/Fumebomb/Weakness) **implementované**. Toto není deklarace univerzálního pokrytí všech druhů těl, zbrojí a magie. Body #6 (Profusion), #7 (Ill Effects/Aural Shock), #8 (Physic) a #9 (AS/Decay) jsou **částečné** z popsaných životních cyklů dalších kanonických elixírů. Bod #10 je částečný a má vlastní přesah do Initiative, Combat State, Spellfire, Ward a Arcane; celý projekt 1–15 není jen izolovaný alchymistický modul, nýbrž integrační práce na společných subsystémech.

### v93.455 – konečné provedené regresní testy

- **PASS 85/85 Node.js testovacích souborů**, pět samostatných dokončených dávek (17+17+17+17+17), bez FAIL a TIMEOUT. Výsledky: `/mnt/data/hmk_v93455_regression_{0_17,17_34,34_51,51_68,68_85}.json`.
- **PASS 20** nové kontroly rozdělené doby potlačení Ward/elixír, **PASS 29** původní replay kontroly a **PASS 62** jednorázové Vortex kontroly. Nejde o tři soubory navíc k regresi, jsou zahrnuty v jejích 85 souborech.
- **PASS Chromium** `tools/browser_alchemy_neutral_ui_455.py`: klikací Detect CS → Reveal S → Dispel S; 2+6+6 kol, obnovení z kampaně, neměnnost inventáře a GM času. **PASS Chromium** `tools/browser_alchemy_release_version_455.py`: skutečný obsah index a vložený produkční bundle, viditelná patička v93.455, bez JS errors. Protože lokální HTTP/file navigaci runner blokuje, nejde o síťový GitHub Pages test.
- Vydaný checkpoint v93.455 je **rozdílový vůči v93.454**; `index.html` je zahrnut a spolu s `app.js` a produkčním bundlem uvádí 93.455. Bod #10 trvá jako částečně dokončený, body #1–5 pouze ve svém původně vymezeném rozsahu; body #6–9 nadále částečné.


## Kontrolní checkpoint v93.456 – Vortex: fyzický dN až po ověření úplného soupisu (24. 10. 2026)

**Bod #10 stále ČÁSTEČNÝ, Total Release / Vortex zůstávají READ-ONLY.** Výchozí stav: uživatelem znovu nahraný kompletní archiv v93.455, v němž je potvrzená oprava kladných CL/TI/Runecraft SI v `hmk-neutral-vortex-round-preflight.js`. Nenahrazuje žádné nedostupné změny z původního pracovního checkpointu v93.460.

- `src/integration/hmk-neutral-vortex-sequence.js`: exportovaná funkce `neutralVortexSourceSelection()` nyní před sestavením fyzického náhodného výběru dN kontroluje všechna ID (včetně vzdálených zdrojů), doklad `verified===true`, konečné souřadnice, šest platných kategorií a jejich pravidlové parametry, `spellCL` a růst geometrie. Chybný zdroj již nelze tiše vynechat z výběrového poolu.
- `tools/test_neutral_vortex_selection_provenance_456.cjs`: 26 nových kontrol; mimo jiné chybné či chybějící souřadnice, nulová Runecraft SI a AS, duplicitní identita, neověřený vzdálený zdroj, nesprávná geometrie a počet stěn fyzické kostky; původní replay a historická vazba.
- Vydání používá stejné číslo v `index.html`, `app.js` a znovu sestaveném `hmk-app.bundle.js` (cache bust). Žádné další soubory projektu nejsou v rozdílovém ZIPu potřeba.
- **Není implementováno:** autentický šesticestný registr všech magických kategorií, fyzické změny a expirace v Initiative/Combat State, autoritativní atomický Misfire 100 → Spirit loss → Vortex writer, plná historická rehydratace a end-to-end klikací zkoušky takového writeru. U každého Vortex výsledku platí `mayCommit:false`.


## Kontrolní checkpoint v93.457 – #10: původní pozice při prvním Vortex ticku (24. 10. 2026)

**Bod #10 stále ČÁSTEČNÝ, bez Vortex writeru.** Ověřená kontrola původních elixírů/Wardů v `hmk-neutral-vortex-census-audit.js` se nově nesmí obejít odlišnými souřadnicemi téhož zdroje v prvním skutečně vyhodnocovaném ticku `replayNeutralVortexSequence`. Původní `sourceCensus` se porovná s živými pozicemi `Initiative.spatialUnits`; pro první tick je nyní nutná totožná souřadnice každého historicky doloženého elixíru a jeho originálního Wardu. Vzdálené a cizí magické zdroje zůstávají pouze GM potvrzené a jsou výslovně označeny jako nehistoricky ověřené.

Návrat každého ticku nyní explicitně rozlišuje `originalCampaignPositionProofSourceIds` a `gmOnlyPositionSourceIds`. Při dalších tickech se původní snapshot nesmí vydávat za ověření pohybu v budoucích kolech; vše se označí jako pouze GM potvrzené a `mayCommit:false`. Nevytváří se druhý magický registr a nedochází k zápisu do kampaně.

Pravidla: **HMK v1.2 str. 203–204, 255** pro Chaos Storm / Vortex; **str. 251, 254–255, 269–270** pro magické zdroje, Ward a elixíry; původní Initiative zejména **str. 160–163**. Stránkové odkazy se vztahují k tištěnému číslování PDF (souhlasí s indexem PDF). Označení provenience a fail-closed striktnost jsou bezpečnostní integrací aplikace, nikoli dodatečnými hârnickými pravidly.

Neuzavřené blokátory: autentické záznamy všech šesti kategorií magie, původní pohyby každého kola, Spell Misfire 100 / Spirit a Raw Principle, atomické potlačení s expirací a originální Initiative/Combat State/Journals, obecné arcane talent invocation a Negation/True Sight/Soulcloak/Spirit Sensing; následně historie, UI a regrese.

### v93.457 – navazující identita Raw Pèleáhn Total Release (HMK 203–204, 255)

Vedle původních alchymistických zdrojů a Wardů je v `auditNeutralVortexAlchemyCensus` nově ověřena **jedna existující původní nealchymistická kategorie**: aktivní Pèleáhn Hyper Burst z již uloženého `Initiative.pelahnBursts` (Raw Principle, ML 60 dle p.255). Ověření vyžaduje i původní `pelahn-total-release-source` log se skutečným d100 Misfire 100, související `total-release:` journal a jeden originální `hmk-spell-total-release` Combat State event s fyzickým Spirit hodem. Musí souhlasit stejné ID, časové okno, trvání a souřadnice; chybějící aktivní původní Raw nebo falešné znovuaktivování vypršelého Raw se odmítne. Výsledek `verifiedRawPelahn` je read-only a jeho původní pozice je ověřena také v prvním Vortex ticku. Jiné Raw Principle manifestace nejsou odvozovány z neúplných dat; zůstávají GM-only. Toto není nový Raw Principle writer ani uzavření celého bodu #10.

### v93.457 – ověřené testy a rozsah vydání

- **PASS 88/88** kompletních Node.js souborů `tools/test_*.cjs` po finálním sestavení (dvě paralelní omezené pracovní dávky, bez FAIL a TIMEOUT).
- **PASS 20** kontrol vazby prvního ticku na původní Initiative (skutečné alchymistické fixture včetně Ward); **PASS 29** kontrol původního Raw Pèleáhn / Total Release včetně syntetické konzistentní proof fixture a podvržených záznamů. Tyto testy jsou součástí 88 souborů, nikoli navíc. Tato Raw sada **není** end-to-end browserový test samotného Pèleáhn writeru.
- **PASS** produkční Chromium HTML/bundle v93.457 bez JS chyb a **PASS** klikací Detect CS → Reveal S → Dispel S s následným obnovením kampaně a zamítnutím neúplných vstupů.
- Původní již vyřešené větve alchymie i konzervativní `mayCommit:false` Vortex preflightu se nemění; bod #10 pokračuje dalšími blokátory.


## Kontrolní checkpoint v93.458 – #10: nepřerušená historie Raw Pèleáhn a původ Vortexu

**Stav #10: ČÁSTEČNÝ – toto není writer Vortexu ani deklarace dokončení magické integrace.**

- `src/integration/hmk-neutral-vortex-census-audit.js`: obousměrná vazba původního `Initiative.log` ↔ `pelahnBursts` ověřuje i záznamy, jejichž Raw Principle už podle originálního kola vypršel. Ztracený historický zdroj, duplikované nebo osiřelé Total Release události a přepsaná identita/čas/poloha se nepovažují za úplný soupis. Do aktuálního Vortex census stále vstupují pouze **právě aktivní** zdroje; nebyl vytvořen druhý registr magie. Zápisy starších kampaní z jiných Initiative timeline se nedokazují pouhým počtem globálních journal řádků.
- `src/integration/hmk-neutral-vortex-sequence.js`: volitelné, ale explicitní `originCasterId` nově ověřuje `origin` proti jediné živé pozici téhož účastníka v původní `Initiative.spatialUnits` a zároveň vyžaduje totožné `combatRuntime.timelineId`. Vracejí se původní údaje v `originalCasterOriginProof`; bez tohoto identifikátoru jde o GM-only souřadnice a null witness. **Nenahrazuje** důkaz Neutral Total Release, budoucích pohybů ani commit.
- `tools/test_neutral_vortex_reverse_raw_458.cjs`: 18 kontrol, včetně vypršení, historické ztráty, osiřelých/duplicitních logů a manipulace časem/polohou.
- `tools/test_neutral_vortex_origin_458.cjs`: 17 kontrol, včetně cizího aktéra, duplicitního svědka, jiné časové osy a změny x/y.
- Primární pravidla HMK v1.2: str. 200–204 (Incant, misfire, Spirit, Raw Principle), str. 251 a 254–255 (Neutral Detect/Reveal/Dispel/Ward/Vortex), str. 160–163 (Initiative); elixírové vstupy str. 265–274.
- Zůstává: autoritativní Neutral misfire 100/Spirit writer a atomické spuštění/potlačení Vortexu; úplné důkazy šesti kategorií, konkrétní činnosti invokovaných talentů/Negation, Soulcloak/True Sight/Spirit Sensing, následné pohyby, expirace a replay v živé kampani. `mayCommit:false` zůstává nezměněno.


## Kontrolní checkpoint v93.459 – #10: Vortex a soustředěné skrývání cílů (HMK str.255)

**Stav #10: ČÁSTEČNÝ. Vortex nemá zapisující writer, žádná fyzická magie se tím neaplikuje na kampaň.**

- `hmk-neutral-vortex-sequence.js`: volitelný `tick.shielding` dokládá, že sesilatel soustředěním ukryl konkrétní, jednoznačně identifikované aktivní zdroje před **náhodným výběrem nového středu** pro právě jeden Vortex tick. První tick vyžaduje `continue-after-spellfire`, každý další tick `one-round-action`, totožné `originCasterId` a explicitní GM potvrzení soustředění i vazby zdroje na sesilatele. Na pozdější tick se ochrana automaticky nepřenáší. Potlačený či neznámý zdroj nelze falešně označit za skrytý. Původní roster, timeline a první pozice sesilatele se dokazují přes původní Initiative, pokud je doložen `document`; samotné soustředění **zatím nemá autoritativní log v Initiative**, proto je doklad označen pouze `GM-attested-only` a **mayCommit:false**.
- `hmk-neutral-vortex-round-preflight.js` + `neutralVortexSourceSelection`: explicitní `hiddenSourceIds` se validují proti **celému** zdrojovému seznamu ještě před fyzickým dN. Skrytí dle textu „hide ... from being targeted“ str.255 v tomto omezeném vyhodnocení brání volbě nového **středu**; **není samo o sobě důkazem imunity** před plošným testem, když Vortex skončí na jiném středu. Provozní writer tuto interpretační hranici nesmí přebírat bez kompletní pravidlové a historické integrace.
- Samostatně opraveno: **Vortex bez vhodného nového středu se nepřemisťuje, ale v původním místě stále musí vyhodnotit všechny skutečně zasažené magické zdroje d100**. Dříve se nesprávně vyžadovalo `rolls.length===0`, což mohlo ignorovat zdroj v dosahu. Povinnost úplného soupisu / originálního d100 zůstala zachována.
- `hmk-neutral-arcane-exceptions.js`: pravidlový profil `casterMayShieldSources` je nyní `true` dle str.255; nejde o potvrzení implementace autoritativního action writeru.
- `tools/test_neutral_vortex_concentration_shield_459.cjs`: 50 nových kontrol pozitivních variant, obou způsobů soustředění, pravidlové 1-tick platnosti, fyzického dN, originálního seznamu, odmítnutí falešných ID a nedoloženého soustředění, rozlišení oblasti od nového středu, původní Initiative a nulového oprávnění k zápisu. Existující test neutral arcane exceptions aktualizován.
- **Nedokončeno:** skutečný Neutral Total Release/Spirit writer, zapisující Vortex a zdrojová historie všech šesti kategorií, autoritativní koncentrace/Move pro všechna kola, Negation/True Sight/Soulcloak/Spirit Sensing, rehydratace a klikací E2E kompletního bodu 10.


## Kontrolní checkpoint v93.460 – #10: původní Neutral Misfire 100 → Spirit → první tick (READ-ONLY)

**Stav bodu #10: NADÁLE NEDOKONČEN; neexistuje autoritativní Neutral Total Release ani Vortex CAS writer.** Nová verze je založena na v93.459 a nepředstírá obnovu nedostupné dřívější pracovní 93.460.

- `src/integration/hmk-neutral-total-release-chain.js`: nový úzce vymezený **nezapisující** `preflightNeutralTotalReleaseChain` provazuje skutečný Neutral **Detect** Spellstart, dokončení dvou kol koncentrace, originální Initiative + Combat State, aktuální cílový elixír (včetně neexistence Wardu), pravidlové Casting EML a skutečné Casting **CF**, fyzický Misfire **d100 = 100**, aktuální skutečný **Spirit ML**, pravidlový Spirit EML `ML − 5×CL + doložené ostatní modifikátory`, fyzický Spirit d100 a přesný počet Spirit-loss d6 pro CF/F/S/CS. Dále kontroluje **první** původní Vortex tick proti skutečnému Timeline ID a pozicím sesilatele a cílových elixírů. Při nesrovnalosti se nic nezapisuje. Výstup obsahuje `documentWitness`, všechny fyzické hody, Spirit následky a stále `mayCommit:false`.
- Nová kontrola nelze obejít podhodnocenou vzdáleností cíle vůči původní Initiative. Přítomné nepotvrzené ostatní druhy magie jsou výslovně ponechány jako `externalArcaneSourceIds`, nikoli prohlášeny za původně ověřené. Zatím **nejsou** řešeny ostatní kouzla Reveal/Dispel/Ward jako Total Release, jejich rozdílné modifikátory, budoucí pohyb v dalších tazích, persist skutečných ztrát Spirit ML/Shade/Psyche/Fatigue či efekty potlačení.
- `tools/test_neutral_total_release_chain_460.cjs`: **55 cílených kontrol PASS**, včetně autentického vícekulového Spellstart fixture se třemi bojovými účastníky, všech čtyř Spirit SL, duplicity, spoof cast roll/Misfire/Spirit dice, chybějící historie, změněné časové osy, podvržené pozice, chybějících dávek a neautentické rune. Nejde o E2E writer; E2E Total Release není označen jako splněný.
- **Úplná dostupná Node.js regrese: 92/92 testovacích souborů PASS**. Zdroje pravidel: HMK v1.2 tištěné str. 160–163, 200–204, 251 a 255; pro pozice/elixíry 268–270.

**Další blocker pro #10:** atomický autoritativní Neutral Total Release + důsledky Spirit/Psyche/Raw Principle v jednom existujícím `Initiative + Combat State + Journal` CAS checkpointu a první/future Vortex tick writer včetně šestikategoriového evidence a expirace potlačení. Dokud tyto operace bezpečně neexistují, nezapisovat částečný Total Release.


## Checkpoint v93.461 – omezený autoritativní Neutral Total Release / Vortex CL I (24. 10. 2026)

**Bod #10 je NADÁLE OTEVŘENÝ.** Nový `hmk-neutral-total-release-writer.js` umožňuje jediný původní atomický zápis Total Release kouzla Neutral Detect (CL I), pouze pokud Spirit CF nevytvořilo Shade a první – současně poslední – Vortex tick nevyvolal žádné trvající potlačení ani CS Psyche Stress. Veškeré aktivní magické zdroje musí mít původní identitu i pozici v existující Initiative/Alchemy/Ward/Raw Pèleáhn historii; GM navíc samostatně dosvědčuje, že neexistují jiné magické zdroje. Nejde o nezávislý důkaz neexistence dalších kategorií.

Zápis v jediném dokumentu zahrnuje původní Spellstart, fyzický Casting CF/Misfire 100, Spirit d100/d6, skutečnou Spirit ML loss, Aural Shock, Weakness, Windedness, Psyche Stress 3, Crucial ztrátu Neutral Detect a pending Trait, dokončení Initiative Incant, Vortex source census, selection dN, zdrojové d100 a samotné výsledky jednoho kola v původním Journal. Soubor `hmk-neutral-total-release-invariant.js` ověřuje propojení Journal/Initiative/Combat State, fyzické hody a zdrojový soupis při načtení i CAS, brání ztrátě/změně záznamů. Ovládání v UI přidáno jako zvláštní vysoce omezená volba Spellfire.

**Stále nepokryto:** Spirit CF/Shade pro Neutral; Vortex F/CF source suppression, obnovení v čase a všechny další tick-y pro CL vyšší než I; úplná nativní evidence ostatních magických kategorií bez GM atestace; kouzla Reveal/Dispel/Ward Total Release; soustředění a přesuny v dalších kolech; komplexní Negation, True Sight, Spirit Sensing, Soulcloak; úplná magická E2E regrese. Nesmí se tvrdit, že obecný Vortex či bod #10 je hotov.
