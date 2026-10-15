# HMK Keeper’s Ledger v93.265

## v93.265 – Knihovna: nákup / bezplatné převzetí; Character Sheet: kompaktní Skills

- Každý katalogový předmět a všech 12 tištěných kompletů nabízí **Koupit** za doloženou cenu nebo **Vzít zdarma**. Nákup je blokován, pokud cena nebo hotovost není ověřená, či pokud postava nemá dostatek mincí. Předměty se ukládají výhradně jako `carried`, tedy do inventáře, nikoli do ruky či nasazené zbroje.
- Ceny katalogu `pricePerDozenPence` znamenají nákup **12 kusů** za uvedenou cenu; bezplatné převzetí dává jeden kus. Cena tištěného kompletu se odečte jednou za celý komplet a do inventáře se uloží ověřené jednotlivé součásti.
- Hotovost začíná na `hmk.coinsPence` (Wealth × 10 d). Skutečné nákupy se zapisují do `hmk.cashLedger`, aktuální zůstatek se odvozuje jako počáteční mince minus výdaje. Počáteční Wealth, limit výbavy a historické hody se nákupy nemění. Transakce se ukládá společně s inventářem a kontroluje se její návaznost. Postavy bez doložených mincí smějí věci převzít zdarma, nikoli kupovat.
- Stávající systém ENC dál čte všechny `carried` kusy včetně množství a přepočte jejich hmotnost. Pokud hmotnost chybí, nedoplňuje odhad.
- Character Sheet nově standardně ukazuje v seznamu Skills pouze `Skill`, `Atributy (Skill Base)` a `ML`. Původní podrobné DP, SB, SM a Boost zůstávají v rozbalitelném `Edit` a jejich pravidlové výpočty se nemění. Vlastní přidělování DP nadále probíhá prostřednictvím Character Creation / Edit.

**Hranice:** Nákup není simulací trhu, smlouváním ani plně měnovým systémem s drobnými nominály. Položky bez jednoznačné celočíselné ceny v denárech nelze za peníze bezpečně pořídit, bezplatné převzetí zůstává dostupné. Přidání a nákup jsou mimo běžící Initiative. Živé GitHub Pages a všechny možné bojové kombinace nejsou součástí testů.


Knihovna má samostatné záložky a stránkované řádky. Přidání do inventáře používá nezávislé kopie původních katalogových položek, neprovádí nákup a nemanipuluje s bojovým stavem. Tištěné komplety se převádějí pouze na ověřené jednotlivé součásti jako nesené; automaticky se neoblékají.

# HMK Keeper’s Ledger v93.263 — Samostatné Skill Tests a automatický stav (HMK v1.2, pp. 60–62)

- **Pět samostatných záložek** mimo Character Sheet: Success Test, Opposed Success Test, Success Value, Secondary Mastery d10, Assistance. Charakterový list obsahuje jen odkaz do této sekce. Český stavový přehled zobrazuje ML, stavové vlivy a výsledný EML, obě strany Opposed jsou posuzovány zvlášť.
- **Bez GM přepínačů zranění, Shock, Bulk, Fatigue nebo ENC na stránce Skill Tests.** Vše se čte ze skutečného profilu, bojového stavu, vybavení, zbroje a držení zbraně a znovu ověří před hodem. Sejmutí helmy a přesuny inventáře mění výpočet při dalším otevření / aktualizaci panelu. Známý Shock STN mění výslednou úroveň úspěchu; INC/UNC/KIA blokuje samostatný test.
- **Nikdy neodhaduje chybějící důkazy.** Nevalidní vrstvení zbroje, historická zranění mimo Combat State, neznámá používaná ruka u poraněné končetiny, neověřený věk Minor Injury a mounted stav bez potvrzeného bojového kontextu vedou k srozumitelnému odmítnutí hodu. Stav se opravuje v autoritativním Character Sheet / Combat, nikoli ručním přepsáním hodnoty testu.
- Success Value užívá primární ML Index a konečný Success Level; jsou zobrazeny SV hvězdy a případné Victory Stars. Opposed zobrazuje oba výsledky a hvězdy; při dvou neúspěších není vítěz. **Secondary d10** je jen úspěch/neúspěch proti indexu, nikoli druhý d100 (a podle pravidel nemá SV hvězdy). Assistance zůstává samostatným pravidlovým výpočtem, nikoli automaticky domýšlenou účastí pomocníků.
- Standardní Skill Test není duplicitní bojový útok. Skutečné CF0/CF5 a fyzické Fumble/Stumble provádí jediný původní Combat systém. Výsledky Skill Testů jsou chráněné důkazy v původním deníku, žádné druhé úložiště ani externí API.
- Změněny jen `app.js`, `index.html`, `README.md`, `skill-workbench.css`, `src/integration/hmk-skill-workbench-ui.js`, `src/integration/hmk-skill-trauma.js`; přidán `src/integration/hmk-skill-auto-context.js`. Combat, Magic, G04, katalogy a originální `styles.css` zůstaly byte-for-byte beze změny.

---

# HMK Keeper’s Ledger v93.261 — Long-term temporal audit and safeguards

## v93.262 — Unified Campaign Calendar (HMK v1.2, pp. 178–182)

- New **Kalendář** section records one GM-confirmed campaign clock (day number + HH:MM) inside the existing `hmk-keepers-ledger-v1` localStorage backup. No guessed Kèthîran month names, real-world timezone, or conversion from combat rounds.
- Original Combat and Healing rules engines remain authoritative for all dice, wounds and status transitions. New confirmed injuries, Coma, Extended Shock and fresh Blood Loss begin at the current GM-confirmed minute **in the same durable save** as their Combat state. Legacy conditions require separately attested onset; unknown onset is never treated as zero.
- Due-list covers 4h Extended Shock, d10-day Coma, 5-day Injury Healing, daily Infection and Grim Wound, and 10-day Blood Loss Regeneration. Infection suspends the patient's Injury Healing schedule. A recurrent episode receives a new onset while prior provenance stays immutable.
- Clock advancement cannot move past an unresolved documented deadline, nor proceed while active bleeding, unresolved Shock Follow-up, or a necessary onset remains unverified. GM explicitly confirms a positive time jump and reason. No clock advance triggers dice or silently advances combat Initiative.
- Existing treatment forms automatically display days elapsed from a verified injury onset and reject discordant data. A completed treatment event stores a matching calendar resolution linked to its existing Combat event ID; journal and character status remain under the original authoritative engine.
- Older localStorage JSON remains valid without `campaignClock`. Export/import through the existing backup flow includes the new optional field. If you have historical injuries, start the calendar and attest each real onset before advancing time.
- Current day labels **Den N · HH:MM** are deliberately neutral relative-time markers, *not* a full Kèthîran civil calendar; an optional named epoch is for campaign notes only.
- No changes to original Combat/Magic/G04, healing tables, equipment catalogues or main CSS; only one new calendar module plus `app.js`, `index.html` and this README.


The infection healing resume bug for multiple wounds and Coma fatal state cleanup have been corrected. Other wound elapsed days are expressly GM-confirmed, never inferred from another injury timeline. See Czech audit and test ZIP.

# HMK Keeper’s Ledger v93.260 — Combat outcome matrix / evidence milestone

The combat engine of v93.259 remains untouched. The 52-entry CF/F/S/CS × defence domain matrix and browser scenarios document its behaviour. This is a **test-and-certification release**, not a claim that every trauma permutation has been played through.

The following time-dependent audit and corrections are delivered separately in v93.261.

# v93.259 — Vazba konkrétní bojové akce na její Mishaps

Charakter Sheet nyní připraví konkrétní Melee/Missile/Press/Trip/Grab akci výhradně pro původní Combat průvodce. Rozlišení Block/Dodge/Counterstrike/Ignore, fyzické hody, Injury a Mishaps zůstávají ve stávajícím enginu. Před potvrzením se kontroluje vazba na aktéra, cíl, kolo, časovou osu a původní podpis stavu. Po akci se kontroluje úplnost všech požadovaných Mishaps a do bojového důkazu se přidá jejich strukturovaný uzávěr. Samostatný Skill Workbench nepovolí druhý „bojový d100“.

# v93.258 — Mandatory Combat Consequence Handoff

Nad původním Combat enginem je přidaná kontrola první splatné události, jejích
zdrojových ID, kola, časové osy a fáze tahu. Na Character Sheet se pro právě
oprávněného účastníka zobrazí **tentýž původní formulář Guided Mandatory**,
který používá Combat. Po jeho potvrzení se skutečná změna provede pouze
existujícím `commitGuidedMandatory` a uloží jako jedna atomická Combat událost
s původní evidencí fyzických hodů a deníkovým důkazem.

Před prvním hodem se odmítají staré formuláře, nesprávný aktér a nesplatný
následek. Automatický Injury Mishap nepotřebuje fiktivní hod; Blood Loss,
Morale a Shock Recovery vyžadují původní fyzické kostky. Pokračování časové
osy nikdy neodvozuje chybějící herní čas. Neznámé jiné povinné typy se
předávají původní Combat proceduře a nelze je přeskočit.

**Rozsah:** propojení existujících povinných bojových následků, nikoli obecný
samostatný mechanismus pro libovolný CF v Skill Workbench. Nejsou zavedeny
nové databáze Combat, nové hody za hráče, nebo změny Combat/Magic/G04 pravidel.

# v93.258 — Automatic Consequence Resolution (bez paralelního Combat engine)

Viz samostatný český audit dodávaný s vydáním. Vynucené CF při nepoužitelné zóně,
rozlišení obecného CF od Combat Fumble/Stumble, read-only navázání na původní
Combat pending události a neměnné důkazy Skill Testů. Skutečné bojové následky
(odhození zbraně, prone, šok, další zranění) se mění výhradně původním
Combat průvodcem, protože bez potvrzené konkrétní akce nemají univerzální
automatickou hodnotu. Žádné externí AI ani změna úložiště.

# v93.256 — Skill Workbench / Shock, Injury, Bulk, PER

Rule-backed, read-only assessment of Shock action availability, injury impairment/SL, armour Bulk and helmet Perception with explicit GM evidentiary controls. HMK v1.2 printed pp.112,117–118,169–170. Combat/Magic/G04/original styles unchanged. No unverified zeros.

# v93.255 — Skill Workbench / stav postavy

Read-only propojení aktuálního Skill testu s potvrzeným Combat Fatigue a validovaným ENC z inventáře. Chybějící data jsou explicitní GM volba, nikoliv automatická nula. Originální Combat, Magic, G04, katalogy a styles.css beze změny.

# v93.254 — Integration / release regression

Identical feature set to 93.253 with end-to-end regression and version consistency checks. Character Creation, Combat, Magic, G04 and original styles.css are unchanged from v93.250. This release does not claim to have tested every possible combination.

# v93.253 — interactive Skill Workbench

Adds four accessible panels for Success/SV, Opposed, Secondary d10 and Assistance; rolls are recorded in the EXISTING journal with typed skillTestProof and software/manual provenance. Dedicated new skill-workbench.css only; original styles.css, Combat, Magic and G04 are unchanged.

# v93.252 — HMK Skill System (pure rules module)

Adds Success Test, Success Value, Victory Stars, Opposed, Secondary Modifier / Roll and Assistance as a read-only wrapper over src/rules/tests.js. The UI arrives in v93.253.

# v93.251 — Character Sheet read-side audit

Source v93.250. Adds non-mutating sheet audit, protects creation-owned occupation in legacy editor and presents the authoritative occupation. Existing Combat/Magic/G04/CSS untouched.

# HMK Keeper’s Ledger v93.250 — targeted creation repair (HMK v1.2)

**Source:** v93.249 production ZIP. This release extends the existing offline 14-step wizard and validates through its normal CAS rules. No external AI, OpenAI API, or paid service.

- Explicitly selected occupation: a rule-verified plan determines permitted Folk, birthplace (HMK p.24), parent class and mandatory specializations **before** generation. Unsupported Folk–occupation combinations produce an explicit error; the generator never silently substitutes a different occupation.
- The plan reuses the original 343 occupational skill/wealth profiles. Its region/occupation witness data is NOT a second skill or equipment catalogue; contexts are revalidated by the existing engine.
- Class and talent candidate trials are genuine software rolls. Discarded candidate trials are kept separate from the final character's recorded dice; selecting an occupation changes the conditional distribution and is not the same as demographic random generation. The truly random button preserves its previous behavior.
- Corrects Tribal/Áltôr secondary dice fields, Chieftain family validation flags, Hârn Orbáal community disambiguation and exact occupation preference over any prefixed variants (Man-at-arms vs Man-at-arms (Archer)). All 14 creation steps, Wealth, inventory and Character Sheet remain governed by the existing rules.
- Known scope: a full-generation test for each profile covers ONE witness scenario per occupation, **not every theoretical combination of Folk, region, parents, age, skills and all dice outcomes**. Browser tests use isolated in-memory storage, not live GitHub Pages.

---

# HMK Keeper’s Ledger v93.248 – Knight Bachelor a přesnější offline čeština

**Základ:** výhradně produkční ZIP v93.247; **pravidlová autorita:** HârnMaster: Roleplaying in the World of Kèthîra (HMK v1.2), tištěné strany 27, 32, 35, 41, 43 a 51. Nepoužito HârnMaster Third Edition. Pro GitHub Pages stačí soubory z ZIP; **žádná externí AI, API klíč, placený server ani internetové volání pro interpretaci textu nejsou potřeba**.

- **Knight Bachelor:** nyní přímo existuje v jediném `OCCUPATIONS` katalogu s přesně 10 profesními Skills (HMK str.43); Occupation Wealth d8 a zdrojová strana 43. Nezvyšuje automaticky společenskou třídu ani nemaže pravidlová omezení. Pro dítě rodiče Knight Bachelor zůstávají samostatné specifické *Family Skills*, jen hvězdičkou označené přídavky, bez zdvojených profesních DP.
- **Offline čeština v5:** přibližně čtyři desítky nových přesných pravidel významových vazeb plus 13 nových parafrází rysů; lepší rozpoznání minulých povolání, přání, budoucích a údajně zastávaných profesí, předstírání, rodinných profesí a zobrazených osob. Vzájemně protikladné rysy jsou označené jako nejisté, nikoli svévolně odstraněné.
- **Bez výmyslů:** popis může předávat preference do 14krokového enginu, nikdy nesmí bez hodu nastavovat STR/END/Wealth, měnit dostupnost Knight Bachelor nebo předstírat vyšší postavení. Podrobné výsledky skutečných testů obsahuje samostatný český audit a regresní archiv.
- `index.html` mění pouze verzi JavaScript asset URL pro obejití cache při nasazení; žádné pravidlové moduly Combat, Magic, G04 ani `styles.css` nebyly upraveny.

---

# HMK Keeper’s Ledger v93.247 – rozšířený offline slovník

Oproti v93.246 byl rozšířen čistě lokální český slovník popisů povolání,
dovedností, Folk a povahových rysů. Parser nevydává ani jeden nový hod nebo
novou číselnou vlastnost; všechny výsledné volby musí projít pravidly HMK v1.2.
Žádné AI, žádný API klíč, žádný nový server.

# HMK Keeper’s Ledger v93.247 — čistě lokální rozbor charakteru (bez AI)

**Autoritativní základ:** přesně produkční ZIP v93.245, pravidla *HârnMaster: Roleplaying in the World of Kèthîra* v1.2. **Bez OpenAI, API klíče, Node serveru a externích placených služeb.** Funguje i na statickém hostingu typu GitHub Pages.

## Generátor podle českého popisu

V registru zvolte **Generovat podle rysů / Folk / povolání**. Vyplňte volný popis česky, případně checkboxy a explicitní Folk/povolání. Pod textem se živě zobrazí odhad archetypu, kandidáti povolání, Skills, Folk, věku, popisné rysy, dohledatelné spouštěcí výrazy, zápory a možné rozpory. **Není potřeba volit režim AI** — ten a jeho server byly kompletně odstraněny.

Lokální analyzátor v3: rozšířené slovníky profesí, české tvary výrazů, sousloví, řádkování vět, zápory, kontext rodiny („otec byl kovář“), minulých povolání („býval žoldnéř“) a pouhých přání („chtěl by být šaman“), časté protiklady a rozumné omezení opakovaných indicií. Výklad se předává existujícímu 14krokovému enginu jako **preference**, nikoli jako druhý systém tvorby. Generovaná postava uchovává auditní doklady, proč byla preference navržena. Neexistující ani nedostupné povolání se nesmí podstrčit.

**Limit:** deterministický parser není jazykový model. Neporozumí spolehlivě všem významům, ironii, metaforám, komplikované souvěté negaci ani neznámé odborné terminologii. Když výklad nesedí, přesnější je explicitní výběr povolání/Folk a checkboxů. Kontrolní náhled upozorňuje na nejednoznačnost. Tělesné rysy nejsou záminka přepsat hody STR/DEX atd.; Wealth vychází z originálních pravidel.

## Nasazení na GitHub Pages

1. Nahrajte **obsah tohoto ZIP** do stejné větve/složky, odkud je publikována původní aplikace.
2. Otevřete adresu aplikace, případně obnovte stránku vymazáním cache (např. Ctrl+F5).
3. V registru zvolte generátor podle rysů a napište větu. Při psaní se zobrazí lokální náhled bez internetu. Stiskem Generovat spustíte původní 14krokový engine.
4. **Pro jistotu nejdřív exportujte zálohu postav.** Uložené postavy sídlí v prohlížeči a nezávisí na zdrojové větvi GitHub.

## Testování v93.247

Z čerstvého rozbalení produkčního ZIP: 24/24 původních regresních skupin; 18/18 starších sémantických skupin; 40/40 nových offline kontrol; 14krokový doménový průchod; dva izolované Chromium testy registru/náhledu; tři kompletní klikací automatické tvorby Random/Hunter/Scribe v Chromium s **testovacím simulovaným localStorage**. Počet 342 definovaných profesí není počet 342 dokončených E2E průchodů. Reálná produkční persistence na GitHub Pages se zde netestovala.

**Rozsah změn:** pouze `app.js`, `index.html`, `src/integration/hmk-generator-traits.js`, `README.md`; odstraněny `hmk-ai-server.mjs` a `src/integration/hmk-ai-intent.js`. Ostatní zdroje včetně Combat, Magic, G04, CSS, katalogu předmětů a persistence zůstaly beze změn.

---

# HMK Keeper’s Ledger – v93.242 (ověřená dílčí etapa, NE plná E2E certifikace)

**Původ:** výhradně archiv v93.241 dodaný uživatelem a originální HMK v1.2. Produkční JS značku opravenou z 93.240 na 93.242 najdete v `app.js`; HTML/asset query také uvádí 93.242. Všechny ostatní původní integrační moduly Combat, Magic, G04 a původní CSS zůstávají beze změn.

**Automatická tvorba:** v běžném náhodném režimu zaznamenává Human/Ænarin věk jako d100 podle p.21, lidský region jako d1000 podle Appendix I p.415 a jeho podrobný Realm jako oddělený d100. Parent Class nyní používá a ukládá d100 ze společenské tabulky; Parent Occupation v dostupných d100 UI používá a ukládá tištěný d100 spolu s případným d20/d6 podtypem. Background zaznamenává d100 včetně doplňkové City-State desítkové kostky. Na všech krocích zůstává použit původní `applyCreationPatch` a běžná pravidlová validace. Zadání konkrétního povolání už nesmí být potichu nahrazeno jiným.

**Generator UI:** seznam preferovaných povolání se odvozuje přímo z 342 stávajících profesních profilů, nikoli samostatné tabulky. Rysy nově obsahují skupiny Vzhled, Schopnosti a vlohy a Životní styl. Slovní vstup je pouze lokální interpretace klíčových slov, nikoli skutečná AI.

**Inventář:** stávající oprava Edit a přemísťování rukou z v93.241 ponechána. Nová bezpečná akce „Předat“ přesune jediný existující inventární záznam mezi dvěma postavami v původním CAS úložišti; zůstávají ID, WQ, katalogový odkaz a stav, mění se pouze vlastník, slot na `carried` a odstraní se stará vrstva nošené zbroje. Předání mimo pravidlovou Combat akci je během Initiative zakázáno. Dokončené automaticky vytvořené postavy se již neukazují mezi rozpracovanými.

**Wealth podle tištěné str.51:** zůstává `Wealth×100d` jako limit *počátečních* předmětů a nezávisle `Wealth×10d` mincí. Pořízením výbavy pod prvním limitem se mince nesnižují; zbytek nevyužitého limitu nelze vyměnit za peníze. Katalog, peněženka a inventář nebyly duplikovány. Extra nákup převyšující limit za hotovost a následné běžné nakupování není touto dílčí etapou dokončeno.

**Omezení vydání:** nebyl proveden plný 14krokový E2E v reálném hostovaném prohlížeči – administrátorské omezení v prostředí blokuje i localhost/file URL. V izolovaných Node testech proběhlo 20 testovacích skupin včetně mnoha tisíc tabulkových kombinací a testů inventáře. Nejde o certifikaci všech 342 profesních variant ani o doložení spolehlivého úspěchu 12-pokusového generátoru pro libovolnou kombinaci Folk a profese. U neuskutečnitelného profilu může generátor po pokusech oznámit neúspěch. Kontrola chování při skutečném klikání, uložení v reálně hostované produkci, bohatších Starting Kits a některých Mysteries zůstává otevřená. Podrobný protokol a samostatné regresní testy jsou předány mimo produkční ZIP.

---

# HMK Keeper’s Ledger – v93.241 (generátor: Folk, rysy, výbava a hotovost)

**Základ:** v93.240 (odvozená z v93.239). Nově je v registru konfigurovatelný generátor Folk / preferovaného povolání / 7 skupin charakterových rysů / volného textového popisu. Text je interpretován pouze lokálními klíčovými slovy, nejde o připojené AI. Výběry mohou ovlivnit preference povolání a Optional Skills, **nikoli výsledky povinných kostek**. Čistě náhodný režim navíc provádí Folk d100 podle HMK str.20 (Human 90 %, Kúzhai 5 %, Ænarin 1 %, Sinái 3 %, Sidhé 1 %). Folk Malákta a Nâdi lze zvolit cíleně; netvrdíme, že patří do univerzální náhodné tabulky. Rodičovský d100 a regionální pravděpodobnostní matice nejsou pro všechny varianty automaticky certifikovány.

**Wealth p.51:** počáteční inventář používá předměty katalogu do limitu Wealth × 100d. Hotovost Wealth × 10d se **nespotřebovává** při výběru z tohoto limitu. Po vytvoření se v panelu *Vybavení postavy* zobrazuje hotovost a zvlášť náklady / nevyčerpaná část limitu vybavení. Nevyčerpaný limit nelze směnit za mince. Wallet panel je projekcí autoritativního `hmk.coinsPence`, nikoli druhým účetnictvím; pozdější nákupy za mince nejsou součástí této funkce.

**Inventář:** zachována oprava přemístění předmětu mezi rukama i editace deníku z v93.240; zachovány původní bezpečnostní validace.

**Omezení:** E2E běží v Chromium se simulovaným localStorage (bez hostovaného originu). Při nemožné kombinaci Folk / povolání musí rozhodnout pravidlový engine a přiznat neúspěch, nesmí vygenerovat pravidlově nemožný profil. Charakterové tělesné vlastnosti jsou čistě popisné a nejsou přepsány do fyzických atributů.

---

# HMK Keeper’s Ledger – v93.239 (automatická tvorba a Covenant)

**Nové:** V registru je jedním kliknutím dostupný automatický náhodný generátor a generátor podle sedmi povahových zaměření. Nevyžadují hody ani potvrzení hráče: procházejí původní čtrnáctikrokový pravidlový engine, používají softwarovou náhodu a uchovávají historii hodů jako generovanou, nikoli fyzickou. Po dokončení se otevře Character Sheet a tvorba má stav `auto-generated` bez následného potvrzení GM. Edit zůstává dostupný.

**Covenant, HMK p.343:** Pravidla Émhlè neuvádějí samostatné rodičovské povolání Priest. V kroku Occupation je zobrazena kněžská dráha Covenant; Character Sheet odvozuje titul Laity (ML1–29), Fighting Order (ML30–59) nebo Clergy/Priest (ML60+) z konkrétní dovednosti Ritual odpovídající víry. Nevymýšlejí se žádné Occupational DP.

**Rozsah automatizace v tomto vydání:** Doložené bezpečné generované cesty začínají Folk Human; náhodné běhy používají region Hârn s ověřeným d100 výsledkem 50; Covenant používá region Emélrenè s doloženým výsledkem 95. Všechna pozdější rozhodnutí a softwarové hody proběhnou bez zásahu uživatele. Toto vydání zatím **nepředstavuje náhodné pokrytí všech ras, regionů, místních tradic a procentních distribucí tištěných rodičovských d100**; takové výsledky nejsou vydávány za otestované. Volby podle zaměření upřednostňují skutečně povolená povolání, Skills a odpovídající Sunsign Traits, bez přepisování skutečných kostkových pravděpodobností. Mezi interními pokusy se mohou odmítnout neúplné cesty; neúspěšný profil je odstraněn z jediné autoritativní databáze.

**Omezení testování:** E2E probíhá v Chromium nad simulovaným localStorage. Není to certifikace hostovaného serveru; zdrojově nedoložené kmenové možnosti se nadále nesmějí generovat domněnkou.

---

## v93.238 – Šest kompletních klikacích E2E archetypů / opravy závislostí (HMK v1.2)

**Základ:** produkční v93.237. Testováno šest *skutečných* 14krokových klikacích průchodů v headless Chromium (izolovaná aplikace se simulovaným localStorage); šlechtic Gentry Pilot, Slave Craft, rodič Gentry Arcanist-Alchemist s fyzickým d100+d20, Shèk-Pvâr Fývria s fyzickým d100+d6, Shaman z Covenant a feudal Priest Peóni. U všech následoval Character Sheet a nový start aplikace nad zachovanou serializací; dva průchody také Edit.

Opraveny **tři konkrétní chyby**:
1. `app.js` při potvrzení kroku 7 přehlížel `familyRitualChoice` v seznamu odesílaných položek, přestože uživatel správně volil náboženství v nabídce. Rodičovský Shaman tak nikdy neprošel validačním ověřením.
2. `occupationWealthDie` nerozpoznával nespecializovaný rodičovský `Shèk-Pvâr` ani výsledek rodičovského d100 `Shèk-Pvâr (Fývria)`; HMK tištěná str.44 stanoví oběma d4.
3. Doplněny explicitní rodičovské `Shaman` Wealth d2 a obecné `Slave` Wealth d0 podle tištěné str.44. Tyto názvy pocházejí ze skutečných rodičovských tabulek, nejsou novými profesemi.

Historie fyzických hodů a jediný autoritativní profil zůstávají zachované. Nejsou změněny Combat, Magic, G04, Inventory ani CSS. Závěrečné klikací testy používají reálný DOM Chromium; uložiště je izolovaně simulované, nikoli skutečně hostované `localStorage`. Dokončení procesu končí právem ve stavu `review-required` (GM review), nikoli předstíraným definitivním schválením.

Generátor **není** v této verzi součástí produktu; této etapě předchází jeho samostatný vývoj, jak požadoval uživatel.

---

## v93.237 – Audit Edit / důsledná invalidace závislostí 14 kroků

- Změna zdrojových Skill DP v kroku 3/5/6/7/8/11/12 nesmí ponechat staré Mysteries, Doctrine, Spirit Powers, počáteční elixíry a ARP. Při invalidaci Skill stadia se deaktivují i navázané hotové Mysteries; historické fyzické hody zůstávají append-only.
- Změna data narození zneplatní také vypsané Sunsign Traits, nikoliv pouze Trait roll vstupy; data nezávislá na znamení se zachovávají.
- Změna Folk zneplatní staré Region/Society/Parent Class/Parent Occupation/Background/Occupation volby a nekompatibilní odvozené údaje; nezávislé narozeniny a jejich Sunsign se zachovávají.
- Změna regionu nebo společenské třídy čistí také staré podtypy rodiče (Martial, Family Scripts) a jejich autoritativní profily.
- Zneplatněná či změněná Aura již nesmí ponechat zastaralé Fate ML; přímý atributový přepočet a historie hodů jsou zachovány.
- Cílené reprodukční testy běží na původním archivu (očekávaná selhání), poté nad opravenou verzí spolu s dosavadními regresními testy.
- Omezení: skutečný UI test 14krokového Edit a obnovení po restartu v běžném prohlížeči zůstává pro bod 6; nelze jej nahradit pouhou syntaktickou kontrolou.

## v93.236 – Doslovné kontextové nápovědy, profesní varianty a bod 4

- **Všech 14 kroků:** každý skutečně zobrazený pojmenovaný vstup má tlačítko `?` se zdrojovým anglickým výňatkem z uživatelem dodaného HMK v1.2, správnou tištěnou stranou, českým vysvětlením a aktuální volbou. Používá se kontext **aktuálního formuláře**, nejen starých potvrzených dat.
- **Přesný rozsah citací:** 113 přímo mapovaných typů polí a 14 podpůrných citací kroků; u všech 342 profesních variant se zobrazuje doslovný popis **tištěné základní profese** (78 popisů v původním katalogu), konkrétní volba a profesní DP jsou samostatné. Není-li vlastní tištěná věta pro specializaci, obecný text nesmí být vydáván za její specifickou definici.
- **Rozdělovací řádky:** nápovědu nyní mají i jednotlivé nabídky vícenásobných Language/Script DP, které dříve neměly své `name` atributy.
- **Cavalry/Throwing:** při výběru nezapsané rodičovské specializace se živě ukáže skutečný výsledný profil (např. Throwing 5 DP), žádný automatický hod.
- **Bod 4:** nová cílená regrese kontroluje 22 různých rodičovských jmen vyžadujících skutečnou variantu/podhod; nadále se nesmí doplnit umělý profil před rozhodnutím. Všechny dosavadní regresní testy z v93.235 zachovány.
- **Bez zásahů:** žádné změny Combat, Magic, G04, inventory, CSS ani pravidlových výpočtů; jedna nová read-only mapa textů z uživatelova PDF.
- **Omezení:** citace vysvětlují všechna aktuálně vykreslená pole; pokud HMK uvádí pouze obecné pravidlo pro celé stadium, bude tak také označeno. Nejde o přepis celé knihy ani o nezávislé přeložení pravidel. Prohlížečový E2E test restartu/localStorage a úplná certifikace Edit jsou nadále vyhrazeny krokům 5–6.

## v93.235 – Oprava definitivního smazání rozpracované postavy

Opraven bezpečnostní kontrolní bod Shade: odstranění postavy bez potvrzené nevratné proměny již není chybně odmítáno jako `invalid-shade-transition`. Postava se skutečně potvrzeným Shade nadále nesmí být tímto způsobem vymazána; rozhraní na to výslovně upozorní **před** zápisem. Při odstranění se ze stejného ověřeného databázového zápisu odstraní také inventář a osobní deník dané postavy. Po úspěchu se vyčistí nepřetrvávající session ukazatele na smazanou postavu, ne její historické údaje jiné postavy. Při odmítnutí zápisu se obnoví vybraná postava a otevřená obrazovka.

Zachována single-record CAS persistence, historické záznamy ostatních postav a ochrany Combat/Magic. Viz samostatný regresní ZIP a český protokol.

## v93.234 – Obnova rozpracované tvorby a kontextové úvody 14 kroků

Rozpracované postavy jsou uvedeny v registru i navigaci s přímým tlačítkem pro obnovení. Tvorba je stále uložena v původní databázi charakterů. Každý krok má kontextový úvod podle skutečných předchozích voleb.

## v93.233 – Bod 4: matice kompatibilních povolání a kontextové pravidlové nápovědy

Výchozí verze **v93.232**. Provedeny dva oddělené kombinatorické průchody příděly dovedností: projekce 16 416 syntetických profilů (rodina × povolání × mateřský jazyk × Background) a zvláštní průchod pravidlově přípustnými kombinacemi Society / Parent Class / Parent Occupation / PC Occupation. Tyto kontroly nejsou kompletní fyzicky vyházené 14krokové postavy. Neuvedené profese a nutné rodičovské podtypy zůstávají transparentně označené.

Přepsána obsluha pravidlových nápověd `?`: dialog nyní teprve při kliknutí vyhodnotí skutečnou aktuální možnost v poli, poslední volbu v rámci otevřeného formuláře, dřívější Folk / Region / Society / Parent Occupation a právě aktivní Skill stage. Odděluje české vysvětlení, doložený **doslovný anglický výňatek HMK v1.2 s číslem tištěné stránky** a hodnoty současného profilu (například přesné Occupational/Family DP a omezení). Zároveň výslovně přizná pole bez ověřeného doslovného originálu. Žádné nové kostky ani autoritativní ukládání; nápověda je pouze read-only. Díky zachování původních datových atributů nejsou rozbity regresní testy staršího dialogu.

Nedotčeny Combat, Magic, G04, inventory, styles.css. Plný prohlížečový E2E a kompletní doslovný přepis všech lokálních výjimek zůstává otevřený, stejně jako bod 5 (Edit) a bod 6 (závěrečná certifikace).

## v93.232 – Bod 4: kombinované Language/Script/Ritual a Sunsign/Veteran DP

Autorita: HârnMaster v1.2, tištěné strany 47–49. Výchozí produkce **v93.231**. Opraveno rozpoznání již rozvinutých konkrétních dovedností v Optional, Veteran a Sunsign: profesní `Script` a `2nd/3rd Script` se převádí na reálné `Script (název)` před uplatněním limitu 1/2 DP; stejně tak rodný `Ritual (náboženství)`. **Language** podle výslovné výjimky str.48 nemá limit počtu DP ze stejného stádia; pět DP do jednoho jazyka je povoleno i v jednom Veteran kole, při zachování pětibodového rozpočtu kola. Sunsign nyní nabízí konkrétní Language/Script/Ritual místo generických názvů a všechny konkretizované Skills čerpají jediný skupinový rozpočet Sunsign.

Nová funkce `priorSkillDevelopment()` vyhodnocuje předchozí DP pouze z již existujícího autoritativního výpočtu Character Sheet; nezavádí další stav ani nové náhodné hody. Regresní a reprodukční testy jsou v externím testovacím ZIP, včetně 342×3 projekcí profesních profilů. Plná prohlížečová E2E a celkové uzavření bodu 4 ještě nejsou certifikovány. Combat, Magic, G04, inventory a CSS beze změn.

---

## v93.231 – Family / Background / Occupation special grants; Character Creation follow-up

HMK v1.2 pp.343–344: Émhlè Family Ritual SM2 correctly attributed to the exceptional Family grant; Ritual permitted among Background Skills for tribal Émhlè; †/‡ Covenant follower skills automatically reach the specified SM1/SM2 **after Occupational Skills**, using one calculated Skill ledger (not an additive bonus when already at or above the floor). See external Czech audit and regression tests.

# v93.230 – Uzavření doložených mezer chantries, Covenant a šamanského průvodce (HMK v1.2)

Výchozí archiv: v93.229 (všech 197 původních souborů zachováno). Žádný jiný ediční systém než originální HârnMaster v1.2 nebyl použit.

- HMK p.197: přepsáno všech 109 pojmenovaných položek tabulky **Major Lýthian Chantries**: 72 konvokačních Shèk-Pvâr chantries (šest konvokací) a 37 Arcane Lore chapters. Průvodce nabízí 72 konvokačních chantries podle konvokace, říše a jména a **automaticky** doplní konvokaci a kvalitu; engine odmítá jejich podvržení nebo nesoulad. Arcane Lore kapituly nejsou falešně prezentované jako konvokační chantries. Nevyjmenované menší/proxy chantry lze doložit zvlášť; výsledek je označen `chantryReviewNeeded`, nikoli ověřený automatismus.
- HMK pp.343–344: implementováno všech **10 Cult of the Covenant religions** s přesnou orthodoxní Morality, společnými a specifickými Doctrine Subjects a statusy odvozenými přímo z autoritativního Ritual ML (Laity 1–29, Fighting Order 30–59, Clergy 60+). Přepočty Morality, Circle, Piety a Blessing Bonus jsou součástí stejného důkazu v profilu postavy.
- HMK p.302: Shaman začíná se stavem **Popular** u průvodce Ancestor Spirit. Jde o jiný vztah než rodinný Estrangement z kroku 9. Na p.301 uvedené tradiční preference nejsou zaměňovány za absolutní zákaz jiných Powers; případné nedoložené odchylky podléhají explicitní kontrole.
- Návazné chyby: opraveno porovnání Covenant statusu při `assertCreationInvariants()` a ošetřeno chybějící Spirit ML ve formuláři nedokončeného Shamana. Replays/napojení na Character Sheet a historické důkazy zůstávají zachované.
- Celkem 12 440 automatizovaných kontrol, z toho 509 nových; 21 nově **rekonstruovaných** případů Parent Arcanist zahrnuto v historické sadě. Testy na výsledném zabaleném ZIP jsou samostatně doloženy.

**Omezení:** Tato verze nevyplňuje nepojmenované menší chantries, kmenové výjimky, které kniha vyjadřuje jen jako možnost, ani nevymýšlí Doctrine tabulky pro další místní kulty. Původní 21 historických Parent Arcanist případů nebylo součástí podkladů. Prohlížečový E2E přes localhost je v prostředí blokován administrátorem; klikací restart/localStorage certifikace ještě chybí. Viz samostatný auditní protokol.

---

# v93.229 – Bod 3: Shèk-Pvâr, Alchemy, Shamanism, Religion (HMK v1.2)

- **Výchozí produkční soubor:** v93.228. Pravidlový zdroj: uživatelem dodaný *HârnMaster Roleplaying in the World of Kèthîra* v1.2, **nikoli Third Edition**.
- **Shèk-Pvâr, str.54,197,199,200,205,211,249:** katalog 204 kouzel, automatické tři Neutral spells od ML40, assisted/unassisted výzkum a jeho ML prahy, affinity, řádně vypočtené dílčí i celkové ARP, cenový zdroj podle konvokace domovské chantry, dvojitá research cena Survey/Gate/Vortex, 1–5 chantry stars, výběr ranku ze čtyř možností, jméno domovské chantry a popis attuned elemental object, artefakty minor a major s podmínkou Vessel a dvěma známými enchantments pro major. Výhoda Natural Attunement vychází jen ze skutečně získaného Arcane Talent, ne ze zaškrtávacího políčka.
- **Alchemy str.269,271–274:** přesně 35 dovolených názvů, při ML≥60 floor(Alchemy Index/2) elixírů, jejich AS od Index dolů po jednom; volby na jediný autoritativní Character Sheet.
- **Shamanism str.53,300–306:** výběr ze šesti tištěných vzorových tradic plus Other, šest kmenových totemů Kath. Popisné výrazy jako „mostly“ se nepřekládají na falešná závazná omezení. Náklady a skutečné Spirit Powers zůstávají ověřovány původním enginem.
- **Religion str.39,55,315,323–341:** deset podrobně doložených západovenárijských náboženství, intervaly Morality, automatická Orthodoxy penalizace, Follower/Circle/Ceremony, Blessing Bonus, Piety, výběr správného počtu odlišných Doctrine Subjects ze správných obřadních úrovní. Zabráněno ručnímu zadávání nezávislého Ritual ML; status se předává z reálné dovednosti.
- **Edit:** odvozené proof i sheet projections se zneplatňují při změně základních předpokladů. Historie voleb je append-only. Některé staré výstupy vyžadují nové ověření v kroku 14 po otevření Edit.
- **Omezení:** názvy a hvězdná kvalita konkrétní menší či nezapsané chantry, politicky schvalovaná Guild Rank a volba vlastního elementálního předmětu jsou vědomé hráčské volby vycházející z HMK, nikoli domyšlené automatické závěry. Některé kmenové zvyky a nezápadní lokální kultovní katalogy nemají v tomto zdroji pevně určené úplné volby. Herne účinky Spirit Powers, artefaktů a elixírů za běhu hry nejsou předmětem tvorby postavy. Celý Character Creation ještě čeká na end-to-end prohlížečový test a bod 4.
- **Chráněné části:** Combat, Magic, G04, inventory, styles.css beze změn.

---

# v93.228 – Bod 3 / Mysteries, Psyche, Divine Grace a počáteční Spirit Powers

- **Výchozí produkční verze:** v93.227. **Jediný pravidlový zdroj:** HMK v1.2, tištěné strany 40, 53–56, 300, 302–306, 310–311. Nejde o pravidla Third Edition.
- **Divine Grace (p.40,53):** nová PC musí doložit fyzický d20 1–20, včetně výsledku 0 Marked. Marked (15–16) nebo Grace (17–20) vyžadují jeden ze 12 Divine Aspects z tištěné tabulky p.310. Bez těchto výsledků aspekt nelze přidělit. Doložená volba a hod se ukládají do jediné existující append-only audit history.
- **Psyche (p.40):** povinné fyzické d20 podle Folk a Age, intenzity dle součtu výsledků, konkrétní volba z 10 vlastností nebo skutečné d10. Human/Nâdi podle věku 1/2/3, Kúzhai/Malákta 1, Sinái 4. Příručka výslovně neudává počet hodů pro Ænarin/Sidhé; tyto případy jsou v průvodci označené k přezkoumání, nikoliv vymyšlené.
- **Fate (p.53):** pět Fate Points a Aura-odvozené Fate ML mají pouze PC; NPC je nezískávají.
- **Ritual a Pvârism:** počáteční ML vychází jen ze skutečné dovednosti Character Sheet, není možné je obejít ručním číslem. Závislé Religious Status a Arcane Research se zneplatní při změně Skills/Attributes.
- **Shaman (p.53,300,302–306):** výběr počátečních Ancestor, Totem a Energy Spirit Powers do vypočteného Spirit Index; anima I–III, jeden současný totem, talisman +1 anima, Energy bez talismanu; úplné dostupné nabídky jsou přímo v průvodci. Edit zneplatní uložené Powers bez mazání historického výběru.
- **Přiznané hranice:** pouze 12 *vzorových* totemů, konkrétní kmenové tradice a instrumenty bez katalogu se nevymýšlejí; účinky Spirit Powers za hry a dostupnost průvodců podle kmenů neautomatizovány. Kompletní Shèk-Pvâr příprava/artefakty, počáteční Alchemy elixíry, Doctrine/Morality/Orthodoxy, další kampaní určené výjimky a skutečné browser E2E/localStorage zůstávají otevřené. **Bod 3 jako celek dosud není certifikován.**
- **Regrese:** 478 nových cílených kontrol a všechny předchozí regresní testy (včetně 21 *rekonstruovaných* Parent Arcanist). Podrobnosti a záznamy opětovného běhu z nezávisle rozbaleného finálního ZIP viz oddělený testovací archiv.
- **Neměněno:** Combat, Magic, G04, inventory, styles.css a starší produkční oblasti. Jeden autoritativní profil, žádné interní generování náhodných hodů.

# v93.227 – Bod 3 / první verifikovaná etapa automatizace rozhodnutí

- Výchozí verze v93.226, autoritativní pravidla HMK v1.2 s.40 a 45–49.
- Doložené Occupation Skills nejsou přepínatelné do volného GM režimu. Příděly se vždy převezmou ze správné tištěné profesní tabulky.
- Je povinný konkrétní Script, Language, Ritual a vícečetný Scripts/Language DP pool podle tištěného povolání. Hráč vybírá z katalogu, engine kontroluje a zachovává příděl.
- Odstraněny volby vypnout předepsané Native, Folk, Background a Veteran Skills. O Arcane Talent rozhodují skutečné fyzické hody, ne přepnutí GM review.
- Jazykové a písmové vícenásobné DP se nyní dají rozdělit nabídkami po jednom DP včetně City Background a volitelného GM Bonus. Stávající uložené rozdělení se zpětně načte do nabídek.
- **Bod 3 není jako celek uzavřen**: čeká pravidlový audit Mysteries, Psyche, zbylých campaign rozhodnutí a plný browser E2E.

## v93.226 — Uzavření doložených regionálních a kulturních pravidel (etapa 2)

- **Výchozí produkční ZIP v93.225. Pravidla HMK v1.2, tištěné strany 20–21, 38, 47–48, 314–315, 343, 419 a 423.** Bez přepisu ostatních modulů.
- **Karéjia, s.419:** právě tři *různé* povolené rodné Ritualy azérského panteonu, každý po 1 DP. Průvodce zobrazuje tři rozbalovací nabídky, kontroluje úplnost a duplicity, uložené projekce přidělují tři konkrétní dovednosti. Volbu nelze nahradit vypnutím Native Skills. Region Edit odstraňuje staré volby i navazující důkazy.
- **Náboženství Venârivè, s.314–315, 343:** výčet doložených hlavních panteonů a výslovně zmíněných menšinových azérských kultů, aliasy smíšených panteonů, Kuélrhyn bez vymyšleného Ziém. U místních kultů bez jmenného výčtu nepřidáváme hypotetická božstva.
- **Elder Folk, s.20–21, 38, 423:** Malákta a Nâdi lze skutečně zvolit jako Folk (nevkládají se do lidského náhodného d100). Nově uplatněny fyzické i mentální modifikátory, odlišné modifikátory pro Eyesight/Hearing/Smell, věkové podmínky, rodičovské d100 profese společnosti Malák/Mizúni a povinný Wilderness Background bez fiktivního hodu. Rozsah pravidlově doložených Occupational/Family Skills zůstává omezen katalogem; zvláštní profesní/campaign rozhodnutí nebudou domýšlena.
- **Zachováno:** jediný autoritativní profil, append-only fyzické hody; Combat, Magic, G04, inventory a CSS beze změny. Nové cílené testy kontrolují 2162 případů, vedle starých regresních sad včetně 21 *rekonstruovaných* Parent Arcanist. Úplné výsledky jsou v samostatném testovacím archivu.
- **Hranice ověření:** nepopsané místní kulty, campaign souhlas se vzácným Mature Malákta a úplný vizuální E2E/localStorage restart nejsou automaticky certifikovány; browser je v testovacím prostředí blokován. Dále následuje etapa 3 (odstranění obecných GM rozhodnutí s doloženou nabídkou).

## v93.225 — Regionální a kulturní audit (etapa 2; ověřené regiony, otevřené pantheony)

- **Zdroj:** HMK v1.2, Appendix I str.415–423 a Appendix II str.424–425; výchozí produkční archiv v93.224. Všech 22 běžných regionálních d100 tabulek a čtyři samostatné Elder Folk tabulky jsou zapojené do stejného existujícího kroku Region (není zaveden druhý profil ani druhé úložiště).
- **Elder Folk, s.423:** Ælrhin/Sinái a Kúzhai, ale i Malákta (Malákrhyn fort) a Nâdi (Mizúna site), mají vlastní fyzický d100 (včetně jednostavové 01–00 tabulky), příslušnou Society, přesný přímo doložený Pantheon `(Siém)` / `(Seréniel)` nebo bez panteonu, Native Language a Regionální jazyky. Pro Malák/Mizúni jsou zpřístupněny také přímo vytištěné Class d100/d20 tabulky. Regiony Elder Folk nepatří do populace lidského d1000 a nelze je vybrat pro nesprávný Folk.
- **Regionální dialekty / Appendix II:** původní jazyková označení, varianty a dialekty zůstávají nepozměněny v regionální důkazní stopě. Odvozená Skill projekce však pro stejný jazyk používá jeden kanonický název: Nâsik Azéri, Áltic, Tuvâran, Quârphic, Shôrka, Thónian, Tríerzi atd. Opravena cizojazyčná příbuznost a podmíněný příděl +4 Language Zâkimladal u Nâsik Azéri s 5 Native DP (s.416). Staré záznamy dialektových DP se v projekci slučují, zdrojové DP a auditEvents zůstávají beze změny.
- **Katalog jazyků:** doložená regionální jména Nâblúgi, Tonátri, Malánuk a Mizúni. Nevyvozujeme neotištěné jazykové příbuzenství Malánuk a Mizúni; neudělujeme domnělý Foreign Language boost.
- **Reprodukce:** 13 konkrétních závad na nedotčené v93.224, odstraněny v této verzi. Nové testy pokrývají všechny jednotlivé výsledky regionálních d100, Elder Folk Social Class, celý soubor 511 jazykových položek, validace forem voleb, znovunačtení historických DP, a další. Úplné počty, logy a integrita viz samostatný testovací ZIP.
- **Přiznaná mez:** Karéjia s.419 požaduje 1 DP ve třech *různých* rodných náboženstvích. Z dodaného PDF se neodvozuje kompletní nabídka bohů všech azérských pantheonů, proto tato specifická větev Native Ritual zatím není automatizována a není prohlašována za ověřenou. U některých dalších pantheonů rovněž chybí doložený úplný výčet náboženství. Profesní větve Malákta/Nâdi po regionálním a Class kroku potřebují zvláštní následný audit (s.423). Úplný browser E2E/localStorage test nebyl proveden.
- **Nedotčeno:** Combat, Magic, G04, inventory, `styles.css`, jediný autoritativní profil a append-only historie fyzických hodů. Žádné generované náhodné hody a žádné smyšlené GM varianty.

## v93.224 — Dokončení pravidlových Family Skills pro Noble / Serf / Slave (etapa 1)

- **Výchozí verze v93.223; zdroj pravidel výhradně HMK v1.2, tištěné strany 27–32, 42–44, 47 a 51.** Audit a změny jsou omezené na oblast tvorby postavy. Čistě řídicí verze `app.js`/`index.html` je aktualizována na v93.224.
- **Slave:** pět přesných typů Craft, Domestic, Farming, Fishing, Herding. U každého je povinná VOLBA dvou různých Physical Skills z devíti vyjmenovaných dovedností, každá +2 Occupational DP; dohromady 5×36=180 povolených konfigurací. Typové profesní DP jsou přepsány z tištěné s.44, rodinná alokace má limit 5 DP a maximálně ⌊Occupational DP/2⌋. Výsledky Slave mají Wealth d0, fyzické d20 pro typ zůstává tam, kde jej přikazuje Parent tabulka (např. Feudal/Imperial/Tributary); Imperial Slave Gladiator má oddělený podtyp a svůj vytištěný profil.
- **Serf/Feudal Unfree:** d1 Farmer (Thrall), Farmer DP, Servant a Tenant Officer (Beadle/Herder/Reeve/Woodward) podle fyzického d20. Opraveny rodinné profily těchto aliasů; d3 pro Tenant Officer a nulová Slave Wealth kostka.
- **Noble, p.43:** všichni šlechtici mají šest společných Family Skills (Melee, Dancing, Riding, Heraldry, Intrigue, Script), každý nejvýše 1 DP. U Gentry se k nim přidává **jen první** Skill jejího konkrétního profesního profilu s limitem poloviny (např. Pilot -> Piloting 2 Family DP). U Courtier, Knight Bachelor, Manor Lord a Tenant-in-chief se přidávají výhradně dovednosti označené * v tištěné šlechtické tabulce; pro Patrician/Clanhead zůstávají společné možnosti bez nevymyšlených hvězdiček. Vlastní Occupational DP dítěte se tímto nemění.
- **Parent Arcanist:** d20 a šest konvokací/10 dvojic Fývria zůstávají; Gentry parent používá šlechtická Family omezení p.43, zatímco běžný parent přebírá běžné Occupational DP; 21 nově rekonstruovaných testů prošlo, historický archiv z v93.219 k dispozici není.
- **Další nové vazby:** Parent Bureaucrat včetně Scripts/Languages s jedním sdíleným Family DP limitem napříč konkrétními jazyky/písmy, `Artist`, `Servant`, `Priest (Siém)` a přesná nabídka Hunter/Trapper. Ověřené profily nejde obejít vypnutím pravidlové Family kontroly.
- **Regrese na nově rozbaleném vydaném ZIP:** viz samostatný testovací ZIP a `HMK_Keeper_Ledger_v93_224_AUDIT_CZ.md` s výstupy. **Nevydáváme regionální pravidla a úplný browser E2E za uzavřené** — patří do dalších plánovaných etap.
- **Nedotčeno:** Combat, Magic, G04, inventory, styles.css, single-source character profile, append-only physical dice proof and history.

## v93.223 — Opakovaný zdrojový audit HMK v1.2 (Noble/Unfree, Family Skills, Wealth, Edit)

- **Výchozí archiv:** beze změn rozbalený v93.222; všechny zásahy proběhly v izolované kopii.
- **Reprodukované a opravené vady:** (1) Estrangement Edit ponechával staré Wealth/Standing, (2) Age Group Edit rovněž, (3) Noble Background d100 měnil titul bez zneplatnění Wealth a dokladu, (4) Gentry profesím chybělo přiřazení ke skutečným Occupational DP, (5) Gentry: Priest neměl příslušný Family Ritual profil, (6) Feudal Tenant Officer ignoroval povinný d20 podtyp, (7) PC Wealth Advantage se dala vypnout.
- **Tenant Officer podle p.27 a p.44:** fyzický d20 → Beadle [1–4], Herder [5–7], Reeve [8–15], Woodward [16–20]; každý má Farmer základ + přesně dané odborné bonusy, d3 Wealth. Doplněna nabídka profesí a pravidlová nápověda.
- **Family Skills:** 10 doložených Gentry profesních aliasů používá stejný tištěný katalog DP, Gentry Priest vybírá doloženou víru, bez vymyšleného Courtier profilu. Family rozpočty zůstávají 5 DP a na dovednost nejvýše ⌊profesní DP/2⌋.
- **Wealth/Standing:** v PC je povinná výhoda +1 kostka v každé nenulové skupině a vyškrtnutí jejího minima; doložené kostky nelze obejít ručním GM součtem. U Priest je nutné nejprve doložit Ritual ML. d0 nepřidává žádný hod. Edit zneplatňuje starý Wealth, Standing, coins, possessions, důkazy a dříve zadané kostky.
- **Testy:** 3 828 pravidlových/HTML kontrol + 21 samostatně rekonstruovaných Parent Arcanist případů. Původní historická sada 21 případů z v93.219 není součástí dostupných archivů; není možné prohlásit ji za totožnou. Reprodukce všech 7 vad na nedotčené v93.222 je součástí samostatného testovacího ZIP.
- **Neměněno:** Combat, Magic, G04, inventory a styles.css; žádná automatická náhoda, žádné druhé úložiště.
- **Omezení:** úplný vizuální Chromium/localStorage end-to-end test nebyl proveden (testovací prostředí blokuje lokální URL); nepřepsané nebo nejednoznačné regionální/Family profily nadále vyžadují explicitní review a nejsou předstírány jako automaticky ověřené.

## v93.222 — Volby z nabídky namísto volného rozhodování GM

- U doložených voleb Parent Man-at-arms, Weaponcrafter, profesních podtypů, regionálních jazyků a dialektů UI výslovně instruuje hráče vybrat z nabídky.
- Výběry nadále validuje existující engine; žádná neověřená pravidlová automatizace ani hod kostkou nebyly přidány.
- Neznámé regiony a nepřepsaná pravidla zůstávají označena GM review, nikoli smyšlenou automatickou volbou.
- Stále otevřeno: end-to-end Noble/Serf/Slave, všechna Family Skills, Wealth, Edit invalidace a 21 původních Parent Arcanist testů (nedodány).

## v93.221 — Upřesnění Parent Man-at-arms volby v UI

- Oddělené vysvětlení GM volby pro Archer a Cavalry; povolené hodnoty, DP, bohatství a další výpočty beze změny.
- Audit pravidel: HMK v1.2, tištěná s. 43.
- Samostatný regresní balíček obsahuje nově vytvořené testy; historická sada 21 Parent Arcanist testů nebyla v dodaném ZIP přítomna.

## v93.220 — Man-at-arms (Cavalry, Missile)

HMK p.43: GM určuje, kterou konkrétní projektilovou Combat Skill (Archery/Slings/Throwing, p.46) znamená tištěný grant Missile 3. Jde o deklarovanou GM interpretaci širokého termínu Missile, nikoliv nový hod či samostatný Skill. Throwing 2 v základním řádku se s případnými Missile Throwing 3 sčítá. Stejné vymezení pro Family DP, edit, Wealth d4 a nabídky v UI.

## v93.214 — jeden autoritativní editor Skills / Attributes

Pro postavy s HMK Character Creation se historický ruční Skills registr zobrazuje bez editačních tlačítek. Staré manuální záznamy se neztrácí a případné kolize jsou označeny k GM review. Ruční HMK Attributes editor se pro takové postavy deaktivuje; Edit průvodce a Perception switch zůstávají plně funkční. Pro starší postavy bez Creation zůstávají původní ruční formuláře i události dostupné. Přepnutí do Combat režimu vnímání není ještě automatizováno.

## v93.214 — Perception (HMK p.57) a tabulka Skills
Volitelný režim EYE/HRG/SML vyžaduje fyzické hody GM a lze jej přepnout v existující postavě bez přepisu historie. Charakter Sheet seskupuje všechny vypočtené Skills do sedmi skupin a odděluje osm DP stadií.

## v93.212 — Veteran DP / dvě samostatná pětibodová kola (HMK v1.2, pp.40,47,49)

Viz český regresní protokol. Stejný profil Character Creation/Sheet; žádný RNG; původní Combat, Magic a G04 beze změny. Chromium/localStorage E2E odloženo na závěrečnou akceptaci.

## v93.208 — Chandler, Lìa-Kaváir, Thespian; Gladiator/Servant d0 (HMK v1.2 pp.42–44,47,51)

- Chandler: exact One Craft 2 from printed Craft skills (p.46), explicit choice; no imaginary occupational die.
- Lìa-Kaváir: exactly one Acrobatics 2 OR second Guile 2; Thespian: two different skills in ordered 4/3 distribution.
- Parent Occupation uses the SAME derived specialized profiles via the `familyVariantChoice` GM choice; Family DP restricted to half each printed grant.
- Gladiator d4/d0 and Servant, Domestic d2/d0 use the social class; d0 requires no physical throw, preserves the Wealth Advantage rule for only actual dice.
- Combat, Magic, G04 and CSS remain byte-identical to v93.206. Browser Chromium/localStorage restart E2E remains deferred to final acceptance.

## v93.206 — Fixed martial subtypes and cartography (HMK v1.2 pp.42–44)

- Verified occupations: Cartographer/Artist; Man-at-arms (Archer) and the printed culture-conditioned Slings/Hideworking replacement; the Melee branch of Man-at-arms (Cavalry); Yeoman (Archer/Foot/Horse). All allocations use the sole authoritative Occupation DP table and actual printed Wealth dice.
- Parent Archer can select Archery or Slings consciously with a documented cultural GM decision. Parent Cavalry permits automated Family Skills only for the fully resolved Melee branch. No invented subclass dice or generic Missile skill.
- All new entries carry explicit printed page provenance, unchanged physical-roll history, and typed Family/Occupation proofs. Cartographer/Artist supports two distinct Script specialties in Occupation and Family Skills.
- Deliberately not claimed: Cavalry Missile needs a concrete missile discipline; culturally eligible Slings groups are not specified by this table; Chandler One Craft, Gladiator d0, Chieftain subsistence and conditional/arcane professions require separate verified steps. Browser Chromium/localStorage restart acceptance remains deferred.

## v93.206 — City Background Languages; distinct 2nd/3rd Script; verified occupations

- City Background p.46/48: one paid Background Language DP projects into three concrete language DP; original five Background DP accounting remains exact.
- Printed 2nd Script and 3rd Script: separate non-divisible source grants, different chosen writing systems, validated through Edit and stored profiles.
- Newly completed Lexigrapher, Scholar, Scribe, Pilot and Legionnaire; pre-existing Charcoaler and Potter independently retested against pp.42–44.
- No generated dice, no new storage authority. Pending other occupations, BG Elder Folk exceptions, browser E2E and restart localStorage tests.

## v93.204 — Languages DP split with strict printed single-Script semantics (HMK v1.2 pp.47–48)

- One Occupational Languages grant may be explicitly divided across distinct named languages (e.g. `Járin=2; Shôrka=1`), with an exactly conserved printed budget. Each language has its own Skill Base/SM/ML and optional native/regional first-DP bonuses.
- The singular `Script` occupational entry can be assigned to exactly **one** writing system. Multiple Script instances can still be developed separately with Optional and later stage DP; the pure projection also supports future printed plural `Scripts` budgets without inventing such a profession today.
- Existing one-language selections and older unspecialised characters remain readable. An invalid split or forged stored variant fails closed; changing Occupation/Edit deactivates prior projection while preserving physical GM roll history.
- The new split is a derived display of the existing single Occupation DP grant, not a second tracked set of DP. No new dice. Chrome and restart-localStorage acceptance is deferred.

## v93.203 — Language / Script / Ritual instances + verified professions (HMK v1.2)

- **Concrete named Skills:** Language (name), Script (name), Ritual (deity) use the existing character creation DP allocations and Character Sheet calculation; no separate mutable counters or virtual dice. Choices constrained to verified Appendix II and pantheon entries (HMK pp.47–48, 321, 343, 424–425).
- Native Language DP from Folk, parent social class/occupation; native Ritual by permitted pantheon and Folk; the Zâkimladal +4 DP exception requires five native Nâsik Azéri DP (Appendix I p.416). Opt-in for existing characters to preserve historic saved profiles.
- First foreign-language DP bonus according to family, region and Kántâl (pp.48,425). Character Sheet visibly distinguishes actual DP from the no-DP SM bonus.
- Nine printed occupation names + a Harper naming alias (Astrologer, Harper/Skald, Harper, Herald, Innkeeper, Litigant, Mercantyler, Runemaster, Seaman, Swordmaster). Also correct pre-existing Alchemist Native Language DP text (p.42).
- Auto Occupational DP can be directed to a specific Script or Language using the existing transactional edit flow. Earlier non-specialised saved allocations remain readable but require GM review to claim precise written-language instances.
- Still pending: distribution of plural Scripts or Languages DP across multiple instances, full remaining pantheons and nontrivial occupational prerequisites, all remaining occupations, and native Chromium/localStorage restart acceptance.

## v93.203 — Labourer / Weaponcrafter subtypes (HMK v1.2 pp.42,44,47)

This release adds **five distinct verified occupational DP templates**, each linked to the
existing single authoritative character profile and the existing Character Sheet skill
calculation. These are Labourer, Farm / Semi-skilled / Unskilled (d2 each), and
Weaponcrafter, Armourer / Bowyer (d6 each). There is **no random dice generation**.

A physical Parent Occupation d100 still resolves to generic `Weaponcrafter` per the
printed Parent Occupation tables. The GM subsequently selects `Armourer` or `Bowyer`
(there is no invented sub-die). This choice controls Family Skills, whose individual
DP must not exceed floor(occupational DP/2). The PC's own Occupation selection exposes
only the two accurate specialized alternatives. All dependent DP and Wealth results
are invalidated on a changed earlier choice; previous physical rolls are retained.

The five new templates are sourced directly from the printed tables, while Language,
Script, Ritual specialization and certain other professions remain GM review.
Native Chromium and full localStorage restart acceptance testing remain deferred.
No Combat/Magic/G04/CSS changes. Run regressions via the separate tests archive.


## v93.201 — Occupational Skill Development: 15 verified fixed-DP occupations (HMK v1.2, pp.42 & 44)

Courtesan, Hideworker, Huscarl, Jester, Prostitute, Ratter, Salter, Shipwright, Teamster, Tentmaker, Thatcher, Toymaker, Trapper, Woodcrafter, Woodcutter. Uses existing one-profile DP/Wealth mutation and Sheet calculation. Generic Script specialization remains explicitly unfinished.

## v93.200 — Occupational Skills: Mason, Ostler, Perfumer, Man-at-arms (Sapper) (HMK v1.2, p.43)

- Čtyři přesné profesní balíčky v původním společném katalogu OCCUPATIONS; příslušné Wealth kostky: d6, d3, d3, d3. Automatické Occupation DP, Family Skills (max. floor(½ profesního DP), celkem 5), Character Sheet výpočty a fyzické Wealth hody běží přes stávající jedinou transakci a profil postavy.
- Doložená stránka 43 je uložená do důkazu a ověřená invariantem. Filtrovaná nabídka respektuje Parent Class, Society i konkrétní vojenskou specializaci. Edit zneplatňuje závislé příděly a Wealth bez odstranění historie fyzických hodů.
- Žádná změna Combat/Magic/G04/CSS ani nový RNG. Specializované Script/Language/Ritual jsou stále nedokončené a zde se nepředstírá jejich plná implementace. Nativní Chromium a restartový localStorage zůstávají na závěrečnou akceptaci.

## v93.199 — Occupational Skills: Locksmith, Longshoreman, Metalsmith, Miner (HMK v1.2, p.43)

- Přidány čtyři dosud neimplementované, jednoznačné profesní balíčky včetně tištěných kostek Wealth: Locksmith d3, Longshoreman d2, Metalsmith d4, Miner d4. Přesné DP jsou v původním společném `OCCUPATIONS` katalogu, s `sourcePage:43`; bez nové databáze, náhodného losování či nové cesty zápisu.
- Krok 11, filtrované profese, automatická Occupation DP, Family Skills podle poloviny DP (max. 5 DP), Character Sheet SB/SM/ML/Mastery Boost a Wealth používají existující validaci. Edit měnící profesi zneplatňuje její navazující příděly; historie fyzických hodů se nemění.
- Tato etapa nepřevádí profesní větve s volbou dovedností, individuálními jazyky, vyššími písmy, náboženstvím nebo magickými specializacemi. Nativní Chromium a restartování localStorage zůstávají dle dohody na závěrečnou akceptaci. Žádná úprava Combat, Magic, G04 ani CSS.

## v93.198 — Occupation Skill Development, four further professions (HMK v1.2 p.42, pp.45–49, p.51)

- Doplněny celé, podmínkami nerozvětvené profesní Skill balíčky: Farmer, Gaoler, Embalmer a Jeweller. Každý Skill používá stávající kanonický katalog p.46, sdílený výpočet SB/SM/ML/Mastery Boost a jedno autoritativní uložiště postavy.
- Farmer: profesní Skills jsou totožné pro svobodné i nevolnické farmáře. Značení Wealth `d2 · d1` na p.42 se podle postavení rodiny vyhodnocuje jako d2 pro svobodného farmáře, d1 pro nevolníka; druhá varianta není druhá dodatečná kostka. GM zadává pouze fyzické hody, aplikace jejich rozsahy a počty ověřuje.
- Family Skills: jejich volby i limit ½ odpovídají konkrétním profesním Skills p.47. Stávající Character Sheet nadále ukazuje rozpad každého výpočtu.
- Edit: změna Parent Social Class, Parent Occupation nebo vlastní Occupation zneplatní stará aktivní čísla a formulářové Wealth hody, nikoli append-only historické události. Nezavádí se druhý zapisovač ani datastore.
- Tato malá etapa nepřepisuje složitější profesní varianty (jazyky, písma, slave, chieftain, specializace) ani jinou část 14krokového systému. Combat, Magic/G04, CSS beze změny. Chromium a restartové testy localStorage zůstávají odložené dle dohody.

## v93.197 — Occupation Skill Development: 4 complete professions (HMK v1.2 p.42; Skills pp.45–49)

- Přesné, bezpodmínečné Occupational DP a wealth dice pro **Animal Trainer (d3), Beggar (d1), Clothier (d3), Glassworker (d3)** přepsány z p.42. Každý Skill je kanonicky identifikován podle p.46; všechny DP čte stávající Character Sheet a jednotný profil.
- Volba nově přepsaného povolání v kroku 11 nastavuje přesný režim `occupationAuto=yes` a nabízí živý náhled celého balíčku; výslovně změněná volba režimu u stejného povolání se nepřepisuje. Nepřepsané profese jsou nadále GM review a z nich se nic neodhaduje.
- Family Skills na p.47 respektují hranici poloviny profesních DP zaokrouhlenou dolů; Edit povolání zneplatňuje navazující Occupational, Optional, Veteran a Wealth záznamy, nikoliv append-only historii fyzických hodů.
- Dílčí větev: **pouze 4 profese p.42**. Specializace Native Language, Scripts, Ritual, Chieftain a ostatní nevypočtené povolání zůstávají na další etapy; kompletní 14 kroků není dokončeno. Styling / CSS, Combat, Magic G04 nezměněny. Native Chromium ani restart localStorage nebyly prováděny.

## v93.196 — Tribal / Tribal-Settled + Subsistence (HMK v1.2 p.29,33 & Appendix I)

- Doložená obživa propojena s Parent Occupation pro 28 konkrétních regionálních řádků (Ketârh & Béshakan, Northern Anzelôria, Quârphor, Reksýna, Thónia a další výslovně pojmenované skupiny).
- Reksýni a Mengólan jako Tribal-Settled (p.29); jiné kmeny bez uvedeného Settled statusu zůstávají Tribal. Z regionů bez doložitelného mapování Thonian dialect/tribe se obživa nehádá.
- Omezené GM nabídky / bezpečná validace, Parent Social Class, Parent Occupation, Background, navazující Skills a Edit používají jeden profil a jeden původní CAS zápis.
- Starší regionální důkazy v93.195 jsou rozpoznány bez zásahu do databáze; Edit krok 5 je povinný před dalšími změnami, s invalidací závislých údajů a zachováním auditní historie.
- Regresní balík v93.196: všechny převzaté sady + 639 cílených kontrol. Combat, Magic, G04 a CSS beze změny. Browser/Chromium a restart localStorage dle dohody odloženy.

## v93.195 — Hârn Region (HMK v1.2, Appendix I p.418)

- 10 main region rows, 18 tribal groups with their separate physical d100, native language/dialect.
- Contextual GM selection for Elder Realms (Járin under Kuzhai/Sinai), and for Orbáal when Realm is directly chosen.
- Two tribal subgroup choices use printed subsistence rules p.29; no invented dice.
- One profile, append-only physical roll record, safe Edit/invalidation; no changes to Combat or Magic.

## v93.193 — Hèpekéria Region (HMK v1.2 Appendix I, str.418)

23 tabulkových intervalů d100, dvě společenské výjimky řešené vědomou volbou GM (bez automatických hodů), Numec dialektové komunity, Nâsik Azéri Kolvisar/Dalazeri a kmenový subsistence Herding podle str.29. Původní CAS profil, Edit a append-only historie zachovány. Ostatní pravidlové moduly a CSS nedotčeny.

## v93.192 — Ázeryàn Region (HMK v1.2 Appendix I, p.416)

Malá etapa: přesná regionální tabulka Ázeryànu, fyzické d100 + povinné d10 jen u výsledků 98, 99 a 00, kontextová volba dialektů Nâsik Azéri, propojení na původní sdílený profil, Edit a historie hodů. Speciální pravidlo Zâkimladal 4 DP je evidováno jako neaplikované, protože specializované Language DP dosud nejsou kompletní. Combat, Magic, G04, CSS bez úprav. Nativní Chromium/restart localStorage nadále odložen.

## v93.191 — Tríerzòn Region (HMK v1.2 Appendix I, p.422)

Malá etapa: Tríerzòn 44 běžných intervalů d100 a výjimečný d100=00 + fyzický d10, Society, Pantheon, Native/Regional Languages a vícenásobné dialekty (vědomé omezené GM volby; žádný automatický hod). Jeden sdílený profil a historie fyzických hodů zůstaly zachovány. Moduly Combat, Magic, G04 a CSS beze změn. Viz regresní protokol a testovací archiv. Nativní Chromium a restart localStorage odloženy na závěrečnou akceptaci.

## v93.190 — Palíthanè Region (HMK v1.2 Appendix I, p.420)

Další malá etapa navazuje na v93.189. Převedeno 16 řádků hlavního d100 (9 odlišných Realm), společenská zřízení, panteony, mateřské i regionální jazyky. Přímá vědomá volba opakovaného Realm nabízí jen dvě konkrétní jazykové varianty. Dialekty Triérzi s pevným výsledkem se určují automaticky, variabilní dialekty pouze volitelným **fyzickým d100**, pokud je GM potřebuje (p.420, „roll d100 if needed“); bez něj zůstává dialekt neurčený. Žádné RNG ani nová databáze. Návraty/Edit zneplatňují staré aktivní podhody, nezměnitelná historie fyzických hodů zůstává. Combat, Magic, G04 a CSS nebyly měněny.

## v93.189 — Huriséa Region (HMK v1.2 Appendix I p.419)

Převedeno všech dvanáct řádků regionální d100. Všech jedenáct velkých knížectví a skupina drobných knížectví, společnost Tributary, místní panteony a regionální jazyky. Pět knížectví má dvě alternativy mateřského jazyka: podle poznámek na str.419 jde o jazyk vládnoucího rodu proti převládající Huriséan, nikoliv o fyzický náhodný d2. GM vybere jednu z přesně dvou povolených možností. Změny přes Edit zneplatňují starou aktivní volbu a zachovávají fyzické hody v historii. Žádné změny Combat, Magic, G04, CSS.

## v93.188 — Ivínia Region, HMK v1.2 Appendix I p.419 (malá etapa)

Doplněna celá hlavní Ivínia tabulka, včetně povinného FYZICKÉHO dodatečného d10 pro hlavní d100=80 nebo 97. Nikde se nehází automaticky.
Výběr Realm GM bez d100 zůstává možný dle p.24; Society, Pantheon a jazyky vyplní tabulka. Návrat/Edit zneplatní starý podhod, aniž odstraní audit.

Kompletní dokumentace předchozích verzí a historické moduly zůstávají uvnitř archivu.

## v93.187 — Appendix I / Dalkésh (small scope)

- Complete Dalkésh Region d100 table (17 realm entries); authoritative HMK v1.2 Appendix I, printed p.417.
- Four dual-native-language provinces use an additional **physical GM d2**. The unselected native language becomes a regional language. This die is audited and survives Edit history, while previous inactive rolls remain in history.
- Native Dalkesh characters' personal Occupation is constrained to their Parent Occupation by caste (printed p.417); GM adoption/marriage exceptions are not yet offered by the app.
- Other Appendix I gaps, including Ivinia's required nested d10 at 80/97, intentionally remain in GM-review rather than receiving invented outcomes.

# v93.186 — Context-aware Character Creation choices (ALPHA)

**Úzce vymezená etapa navazující na v93.185.** Jde o filtrování navazujících nabídek, nikoli o nový přepis pravidlových tabulek. Všechny hody provádí fyzicky GM; aplikace pouze deterministicky vyhodnocuje a současnou datovou cestou ukládá jejich výsledky.

- **Birthplace (HMK s. 24; Appendix I):** u všech 14 intervalově přepsaných regionů se Realm vybírá pouze z odpovídající regionální tabulky; Society se omezuje podle konkrétního Realm. Při změně regionu se starý lokální regionální hod a zvolený Realm ve formuláři zruší. Nevylosovaná oblast zůstává v přiznaném režimu GM review.
- **Age (s. 21):** Kúzhai pouze Mature, Sinái/Sidhé pouze Young, Human/Ænarin všechny tři věkové skupiny.
- **Parent Social Class (s. 26–32):** nabízí jen třídy platné pro Society a volbu d20/d100. Při změně typu kostky starý hod ve formuláři zanikne.
- **Parent Occupation (s. 27–32):** menu omezeno na správnou společnost a rodičovskou třídu, pro Tribal Free i subsistenci. Podhody zůstávají fyzické a výsledný text doplní resolver. Při změně subsistence se původní rozpracovaný hod ve formuláři smaže.
- **Occupation (s. 35, 41):** menu obsahuje doložené profese ve společnosti a sociálních třídách nejvýše na úrovni rodičů. Nepřepsaná povolání nelze vydávat za ověřená. Kampaňové výjimky GM zatím nepodporuje samostatný workflow.
- **Skills (s. 45–49):** dostupné Skills se omezují podle Folk, Family, Background, Occupation, předchozích DP a Sunsign; Optional/Veteran nezobrazují neotevřenou Esoterica. Po vyčerpání rozpočtu lze upravit jen již alokované Skills. Nespecifikované Arcane Talent Skills ani nedoložené balíčky nejsou odhadovány.
- **Background (s. 33):** další nabídka podle Society, urban chance a Folk, včetně Tribal Wilderness, Kúzhai City a Sinái/Sidhé bez City. Fyzický d100 při uložení zůstává autoritativní.
- **Edit / persistence:** změna staršího postavení nebo regionu zneplatní již neplatné Occupation i odvozené Skill příděly. Historie fyzických hodů zůstává append-only; ostatní změny jdou stejnou atomickou cestou `mutate()`/CAS.

**Regrese:** 6 145/6 145 stávajících testů v93.185 + 2 695/2 695 nových cílených kontrol filtru. Nativní Chromium ani restart localStorage nebyly prováděny (odloženy do závěrečné akceptace); kompletní historické Combat/G04 archivy nejsou v balíku dostupné. `styles.css`, Combat a Magic moduly zůstaly beze změny. Pravidlové mezery uvedené pro v93.185 přetrvávají.

---

# v93.185 — Character Creation: Class, Parent Occupation, Appendix I, Background (ALPHA)

**Tato verze je stále ALPHA / GM review required, nikoli úplná implementace všech 14 kroků.**
Jde o skutečně upravený úplný produkční webový balík navazující na v93.184. GM fyzicky hází všemi kostkami; pravidlová tabulka zadaný fyzický výsledek jen vyhodnotí. Všechny existující profily zůstávají v jediném společném úložišti Character/Combat/Magic a jediném atomickém zapisovači. Žádná bojová ani magická větev G04 a žádné CSS nebyly změněny.

**V této verzi:**
- **Parent Social Class:** d100/d20 pro všech deset typů společnosti včetně Feudal, Imperial, City-State, Tribal, Tribal-Settled, Tributary, Viking, Chélemby, Kúzhan a Sináin; Feudal/Imperial se řídí Feudal třídami. HMK s. 26–32 a Appendix I.
- **Parent Occupation:** úplné hlavní intervaly u skupin Tribal, Tribal-Settled, Tributary/Viking/Chélemby, Kúzhan a Sináin doplněny k Feudal/Imperial; vybrané zvláštní fyzické podhody Arcanist d20, Shèk-Pvâr Convocation d6, Slave d20 a návazný šlechtický titul. Subsistenční Tribal Free používá předchozí autoritativní resolver. HMK s. 27–32, 195.
- **Birthplace:** nyní je intervalově přepsáno 14 z 22 regionů a 138 Realm řádků. Nové jsou Áltôr, Býria, Chogôro & Mafán, Hácherdad, Hârbáal, Ketârh & Béshakan, Northern Anzelôria, Quârphor, Ûmélria. Ostatních pět regionů zůstává z v93.184. Bez hodu d100 lze přímo zvolit pouze skutečný Realm již přepsaného regionu. Některé regionální jazykové, kmenové a d10 podtabulky ještě vyžadují GM kontrolu.
- **Skills:** opraven `ReferenceError: skillName is not defined` při validaci Background DP; ověřen a doplněn venkovský pool dle HMK s. 46 (Fletching a Metalcraft), Sináin/Sidhé včetně Pvârism a automatické Viking background special. Převod dalších profesních balíčků, native/foreign languages, ritual/script specializací a některých DP větví zůstává otevřený.
- **Standing:** pro vybrané specifické šlechtické tituly se rozpozná Wealth die (d6 až d30), pro Parent Priest d6; Sinái a Sidhé dědí pravidla věku pro wealth a arcane research. HMK s. 51–55.
- **Regrese:** nezávislá reprodukce 5 chyb přímo v nedotčené v93.184; nově 6 145/6 145 cílených Node kontrol včetně celých intervalů tabulek, nezměněných základních Combat testů, kroků 5–8, návratů, Edit, append-only historie a CAS atomic-write odmítnutí. Původní starší testovací archivy nejsou obsaženy v přiloženém ZIP, proto jejich historické počty nelze považovat za nyní spuštěnou regresi. Nativní Chromium a restart localStorage jsou výslovně odloženy.

**Protokol a samostatné testy:** viz doprovodné soubory `HMK_v93_185_regresni_protokol_cs.md` a `HMK_Keeper_Ledger_v93_185_VYVOJOVE_REGRESNI_TESTY.zip`. Neodhadujte nepřepsaná pravidla; v těchto větvích zůstává potřeba GM ověření.

---

# v93.184 — Character Creation: Parent Occupation, City-State a Appendix I (ALPHA)

**Přírůstek ověřený proti HMK v1.2:** kompletní hlavní d100 Parent Occupation tabulky Feudal (p.27) a Imperial (p.28), City-State podle Imperial occupation (p.28), doplňující fyzické Slave d20, Feudal/Imperial Noble podle parity původního Class hodu, titul Manor Lord / Tenant-in-chief / Patrician Major z pozdějšího Background hodu. Doložená Urban chance se automaticky přenáší z rodičovského povolání do kroku Background; u City-State GM fyzicky zadává i druhou desítkovou d10 a používá nižší desítky.

**Appendix I:** kompletní regionální podtabulky Reksýna (5), Shôrkýnè (25), Thónia (10), p.421, doplňují Emélrenè (9) a Karéjia (14): celkem 5 ze 22 geografických regionů a 63 Realm řádků. Zbytek regionů není simulován.

**Oprava:** Undefined `name` ve schvalování Background Skills DP (reprodukováno na původní v93.183). **Edit:** při změně Class, Parent Occupation nebo Birthplace se aktivní závislé hody zneplatní, ale append-only audit zachová událost `roll-deactivated`. Nezávislá kontrola uložené postavy ověřuje důkazy proti fyzickým hodům. Combat/CSS zůstávají beze změny; veškeré uložení stávající cestou.

**Stále ALPHA, GM review required:** zbývajících 17 regionálních Realm tabulek, další společnosti/Parent Occupation (Tribal-Settled, Tributary, Kúzhan, Sináin atd.), kompletní profese a Mysteries, dokončení všech speciality Skills a Character Sheet grafika. Všechny fyzické hody provádí GM. Chromium po dokončení Character Sheet podle dohody.

---

# v93.183 — fyzický hod automaticky určuje volbu + Karéjia (ALPHA, HMK v1.2)

- **Oprava průvodce:** platný fyzický hod automaticky vyplní textovou položku (Folk d100, Age d100, Sunsign Trait d6 včetně cusp, Region d1000, ověřený Realm d100, Parent Social Class d20/d100, Tribal Free Parent Occupation d100, Background d100). Již není nutné stejnou volbu potvrzovat druhým kliknutím.
- **Bez generování kostek:** GM zadává skutečné fyzické hody; živý náhled jen aplikuje doslovné tištěné tabulky. Při nedokončených tabulkách zůstává kontrola GM. Žádný automatický generátor hodů.
- **Dvouúrovňová validace:** formulář zobrazuje výsledek okamžitě, ale při ukládání se znovu nezávisle vypočítá. Podvržené a pozměněné volby se odmítají.
- **Edit a audit:** starší fyzické hody jsou append-only, při vědomé změně na ruční volbu se jen označí jako neaktivní. Změna data zneplatní staré Sunsign Trait hody i jejich výběry.
- **Rozšíření Appendix I:** celá regionální tabulka **Karéjia (14 Military Provinces, str. 419)** nyní přibyla k dosavadní Emélrenè (9 Realm). Převádí Region, Realm, Society, Pantheon i Native/Regional Languages.
- **Regrese:** 628 historických Combat, 163 starších Character Creation, 103 testů nové auto-volby a 35 testů Karéjia = 929/929.
- **Stále neúplné:** další regionální tabulky, zbytek Occupations a Skills/Mysteries zůstávají GM review. Nativní Chromium a úplný restart localStorage jsou odloženy podle dohody; CSS beze změny.

---

# v93.182 — Character Creation: původ, Skill DP a Standing/Mysteries (ALPHA, HMK v1.2)

**Stav:** funkční průběžné rozšíření v93.181, stále `GM review required`; nepovažovat všechny tabulky HMK za automatizované. Všechna fyzická d6/d10/d20/d100/d1000 zadává GM, aplikace nehází. Zachován jediný HMK profil a původní atomický zapisovač; CSS je beze změny.

## Nově pravidlově převedené části

- **Birthplace (str.24, Appendix I str.415):** kompletní seznam 22 regionů s fyzickým d1000 a zdrojovým záznamem. Všech 9 Realm a související Society, Pantheon, Native / Regional Languages jsou strukturovány a automaticky vyhodnoceny pouze pro Emélrenè. Ostatní realm tabulky a Elder Folk regiony potřebují ještě přepis a GM kontrolu.
- **Society/Parent Social Class (str.26–32):** všech šest základních společenských d100/d20 tabulek Feudal, Imperial, City-State, Tribal, Tribal-Settled a Tributary. Hybrid Feudal/Imperial používá Feudal class tabulku, speciální pravidlo pro Noble Occupation zatím čeká na resolver.
- **Parent Occupation:** všechny čtyři Tribal Free subsistenční tabulky (p.29) s fyzickým d100 a automatickou Urban chance. Další kombinace Class/Occupation zůstávají GM-verified. 
- **Skills:** katalog 13 výslovně ověřených Occupational DP sad (str.42–44); volitelný automatický příděl, přesný 5 DP Family budget s limitem poloviny Parent Occupation, omezené Background Skill výběry podle p.46 včetně dalšího Wilderness/City, Elder Folk a Viking seznamu, přesná 2d10 Kúzhai a 4d10 Sinái Folk Skills (str.45). Native Language, Ritual, jazykové specializace, Talents a ostatní profese stále vyžadují další resolver.
- **Standing/Wealth (str.51–52):** oba oddělené fyzické dice pools a jejich počty podle Estrangement/Age/Folk, PC Advantage (extra kostka + drop lowest v každém poolu), Wealth, Lifestyle, startovní mince a budget possessions, persistentní provenience všech kostek. U nepřepsaných profesí musí GM určit velikost kostek podle tištěné tabulky.
- **The Mysteries (str.40,53–55):** základ Fate jako dosud, nově Divine Grace fyzické d20, Blessed Circle/Bonus/Piety podle doloženého Ritual ML a Morality penalty, počáteční ARP podle Age/Folk × Pvârism ML a seznam výchozích Neutral kouzel od Pvârism ML40. Specializace Divine Doctrine, Shèk-Pvâr jednotlivých Convocation, spell research, Artefacts, astrální Spirit/Divine a další povinné kroky jsou stále mimo automatický rozsah.
- Character Sheet navíc zobrazuje zdrojový detail regionálních, Folk, Wealth a Mysteries výpočtů, odděleně od již existující tabulky každé Skill s SB/SM/DP/Boost/ML.

**Kompatibilita:** starší postavy bez Creation a ručně potvrzené GM údaje se nezměnily; nová přísná kontrola platí pro zvolený automatický režim a fyzické důkazy. Při aktivní Initiative zůstává Character Creation/Edit zakázáno. Přímé manipulace s důkazy a přepsané DP odmítá stávající validátor.

**Regrese:** 628 historických bojových + 95 dosavadních Character Creation + 68 nových cílených = 791 Node kontrol (viz samostatný balík testů a protokol). Nativní Chromium se podle dohody ověří až při finální akceptaci Character Sheetu. G04 nadále otevřená.

---

# v93.181 — Character Creation + Character Sheet (ALPHA, HMK v1.2)

**Upozornění:** první funkční, ale neúplný 14krokový průvodce. Stav po posledním kroku je vždy `GM review required`; **nejde o dokončenou věrnou implementaci všech tabulek HMK**. Dosavadní G04 Spellfire v93.180 zůstává ve stejném rozsahu.

**Spuštění:** publikujte obsah tohoto ZIPu jako statický web (GitHub Pages nebo lokální HTTP server); otevřete aplikaci, v sekci Postavy klikněte na „+ Vytvořit postavu krok za krokem“, zadejte jméno. Průvodce zobrazí vždy jen jeden krok HMK. V deníku postavy najdete **Character Creation / Edit**, zatímco výpočtový Character Sheet ukazuje Skill Base, SM, DP podle osmi etap, Boosty a ML. Všechny herní hody provádí fyzicky GM. Doklady jsou uloženy s postavou. V průběhu aktivní Initiative nelze provádět základní editaci Creation.

**Pravidlově pokryté:** 14 kroků v předepsaném pořadí, volba Folk/Age (včetně pravidlových volitelných d100), d12+d30 pro Sunsign a cusp, dvou Traits na cusp, Feudal Parent Class d100/d20, Background d100 při známé Urban chance, Estrangement d100, 12 atributů se správným počtem fyzických d6 a Folk/Age úpravami, Voice (VOI) d6 pro Singing, Skill Base, SM, DP a Mastery Boost, Shock/Dodge, základ Fate.

**Stále GM kontrola a práce do dalších verzí:** kompletní Region/Realm a Society nabídky, Class/Occupation tabulky všech kultur, Parent Occupation d100 a Urban chance, Folk/Family/Occupation/Aurální DP a všechny Occupational Skills, specializace Language/Script/Ritual/Talent, přesné subintervaly Veteran, sociální/finanční kostky a The Mysteries včetně všech větví, NPC/extra Elder Folk, vzhled druhé stránky zranění. Nepodporovaná automatika není deklarována jako hotová. Zbývající Pèleáhn kouzla G04 jsou odložena podle dohody.

**Regresní balík:** `HMK_CHARACTER_CREATION_v93_181_VYVOJOVE_A_REGRESNI_TESTY.zip`. Návod a český protokol jsou v samostatném ZIPu testů. Nativní Chromium a perzistence přes restart procházejí až finální akceptací po Character Sheet, jak bylo domluveno.

---

# HMK Keeper’s Ledger — v93.179 (G04: nezávislé souběžné zdroje Raw Pèleáhn; G04 stále otevřená)

## v93.179 — 12. října 2026

- **HMK v1.2, str. 203–204:** přidán trvalý registr `sequence.pelahnBursts`, který zachovává všechny zdroje Total Release se samostatným středem, časem vzniku, Complexity Level, vypršením a doklady fyzických hodů. Stávající `sequence.pelahnBurst` zůstává kompatibilním ukazatelem na nejnovější zdroj a staré dokumenty s jediným zdrojem lze načíst bez migrace.
- Každý účastník dostává bonus jen podle **své aktuální polohy** a **jednoznačného živého zdroje**; fyzický END d100 je povinný a spolu s akcí se zapisuje jediným kontrolovaným checkpointem. Starší zdroj nelze přepsat, odstranit, měnit jeho pozici ani zpětně upravovat jeho důkazy nebo již zaplacený END.
- Dva zdroje se skutečně mohou vyskytnout současně (Doom Flame VI / Pyre III), aniž by jeden přepsal druhý. Zachováno také ověřené Spirit CF → Shade a jeho nezávislé Raw Principle.
- **NEUZAVŘENO:** pokud jeden účastník stojí ve dvou poloměrech zároveň, systém fail-closed odmítá druhou akci i přechod na další IR. HMK str. 204 výslovně neurčuje skládání souběžných bonusů a případných END testů. Takové rozhodnutí ani automatické opakování akcí nebylo vymyšleno.
- Regrese: 561 předchozích kontrol (dvě historická očekávání byla transparentně aktualizována pro novou podporovanou funkci) + 47 nových kontrol, celkem 608. Fyzické hody zadává GM; CSS a grafika jsou beze změny. Nativní Chromium se podle dohody testuje až při finální kontrole Character Sheet a aplikace.

---

# HMK Keeper’s Ledger — v93.177 (G04: Fear / Aberrance a perzistentní Initiative; G04 stále otevřena)

## v93.177 — 12. října 2026

- Doložený fyzický Fear Will d100 proti Will × 5 − Aberrance × 5 podle **HMK v1.2, str. 187**; CF0/CF5/F/S/CS a přesné PSY, včetně S: poloviny ABE zaokrouhlené dolů.
- Persistentní zdroj, pozice a vlastní autoritativní událost; navazující výběr a projev Psyche Traitu a Psyche Stress Recovery používají již existující moduly.
- Omezení akcí a obran při Catatonic/Terrified/Afraid, fyzický Will po odloženém konci příslušného tahu a pravidlové časované zotavení výslovně potvrzené GM.
- Bonusové Hyper Burst Melee/Missile/Incant jsou při aktivním Fear zablokovány; neověřený ústup v bonusovém Move zůstává fail-closed. Povinný Hyper Burst END test lze provést.
- Nové přechody vyžadují úplnou fyzickou evidenci a používají **původní společné atomické ukládání**. Nepodporované kombinované přechody jsou nadále explicitně blokovány.
- Nativní Chromium bylo po dohodě odloženo k finálnímu ověření celé aplikace včetně Character Sheet. Neprohlašovat G04 za uzavřenou.

# HMK Keeper’s Ledger — v93.176 (G04: Morale → Psyche Stress integration; G04 stále otevřena)

## v93.176 — 12. října 2026

- **HMK v1.2, tištěné str. 162 a 188–189:** nová integrace PSY1 (Morale CF5) a PSY2 (Morale CF0) z ověřené Injury Morale, Special Morale a Group Cohesion do EXISTUJÍCÍ volby Psyche Traitu, ~10min nástupu, Weakness, d6-denního plánování a fyzického Will Recovery.
- Zápis ověřuje fyzický Initiative d100, aktuální Initiative ML, Fatigue, zdrojovou ABE a původní Morale událost. Není dovoleno přepsat nedokončenou volbu, nahradit fyzický hod, znovu použít stejné ID ani ztratit druhý povinný zdroj. Při konfliktu se commit odmítne.
- Hlavní UI, bonusové Melee a Mounted Ride-by využívají stejné `hmk-morale-psyche-bridge.js` a dosavadní `persistVerifiedCombatSnapshot()`; přímé volání zapisovače bez požadovaného následku vrátí `unresolved-morale-psyche`. Nevznikl paralelní zapisovač. Zároveň je Morale aftermath během aktivní Initiative veden řízenou transakcí a výběr Traitu lze vyřídit mezi následnými povinnými Morale hody bez zahájení nové bojové akce.
- **Prokázaná reprodukce na v93.175:** fyzický Morale d100 65 proti Initiative 50 = CF5, Routed a PSY1, ale seznam čekajících Psyche Trait voleb obsahoval 0 položek. Nová verze přidává tuto povinnost společně s původním bojovým stavem.
- Regrese: 451 starších + 30 nových cílených testů, celkem 481. Aplikace žádné kostky nehází. Vzhled a `styles.css` zůstaly nedotčeny.
- **Neuzavřeno:** samotné Fear/Aberrance persistentní reakce, samostatný Fear state a jeho časované Will testy, historická traumata ze starých snapshotů bez příčinných zdrojů, souběžné nezpracované PSY zdroje jedné postavy (konzervativně blokovány), Spirit CF → Shade, více současných Raw Principle, ostatní Spellfire resolvery a konečné prohlížečové ověření s nativním úložištěm (odloženo podle dohody na Character Sheet).

---

## v93.175 — 12. října 2026

- **HMK v1.2 str. 188:** nový autoritativní průchod pro skutečný spouštěč projeveného Psyche **Impulse/Disorder**. Při pokusu o potlačení se používá fyzický GM Will d100 proti WIL×5 minus evidovaná Fatigue (jen při explicitně ověřené absenci dalších modifikátorů). Impulse vyžaduje S, Disorder CS; dobrovolný projev žádný hod nepotřebuje.
- **Will CF:** povinný samostatný fyzický d6 určí **d6×10 minut po skončení příčinného spouštěče**; u ostatních neúspěšných potlačení zůstává asi 10 minut. Žádný čas se automaticky neposouvá. Samostatný GM-potvrzený úkon ukončí projev až po uplynutí této doby.
- Projev a ukončení mají jediný full-document CAS zápis se zdrojovým důkazem, eventem a žurnálem; fyzické kostky aplikace nehází. Opravená ochrana nyní brání dřívějšímu Psyche Recovery nebo sloučení nového stresu, pokud by tím zmizel neuzavřený projev.
- UI obsahuje jeden volitelný rozbalovací oddíl v existujícím Combat panelu; **CSS, grafika a rozvržení stávajících prvků zůstávají beze změny**. V93.174 příslušný formulář a zapisovací průchod neexistovaly a volání formuláře skončilo bez zápisu.
- **Regrese:** 413/413 předchozích dostupných kontrol + 38/38 nových scénářů, celkem 451/451. Nativní Chromium zůstává odloženo na finální akceptaci s Character Sheet podle dohody.
- **G04 stále otevřena:** kompletní Shade po Spirit CF, přesné souběžné Raw Principle, všechna další konkrétní kouzla Pèleáhn, zdrojově jednotné PSY po Fear/Aberrance/Morale, celkové kombinatorické pokrytí. Testy popsané výše se vztahují pouze na podporovanou větev Spellfire/Aural a její Psyche následky.

## v93.174 — 12. října 2026

- Autoritativní `hmk-spell-psyche-recovery.js` pro již doložený, manifestovaný Spellfire/Aural Psyche Stress (HMK v1.2 str. 188–189). Oddělený fyzický GM d6 a pozdější fyzický Will d100 po uplynutí GM potvrzeného herního intervalu; interval ani hod se nikdy negenerují automaticky.
- CF: neurčitý trait se stává permanentním, další CF zvyšují intenzitu permanentního traitu na Impulse/Disorder. F: žádná redukce. S/CS: −1/−2 PSY a −5 Weakness za skutečně odstraněnou úroveň, bez postihu Fatigue na Will test. Permanentní trait přetrvá při PSY0; neurčitý se stane neaktivním.
- Následující d6 po neúspěšném či částečném Will zotavení musí GM fyzicky hodit a samostatně potvrdit. Dny se evidují explicitně, dvojí potvrzení nebo změněný důkaz se odmítá. Bez vyřešených doprovodných Psyche povinností, během Initiative či aktivního Incant není přípustný zápis.
- Opravená integrace archivovaných traitů: po zotavení na PSY0 musí být možné zpracovat nový stres, u zůstávajícího permanentního traitu správně zvýšit intenzitu a nezdvojovat jej. Následná volba/nástup používá jen aktuální aktivní záznam.
- Všechny změny probíhají jediným `persistVerifiedCombatSnapshot()` se shodou původního snapshotu a read-back kontrolou. Zachovány CSS, grafika a rozvržení. Nové regresní testy vycházejí z reálných fyzických vstupů GM a prověřují i přímé volání modulů.
- **G04 stále otevřena:** Spirit CF → Shade, současné Raw Principle zdroje, další nepodporovaná kouzla a nepokryté kombinované bojové větve. Nativní Chromium zůstává dle dohody odloženo na závěrečnou kontrolu celé aplikace včetně Character Sheet.

---

# HMK Keeper’s Ledger — v93.173 (G04: Aural Shock Recovery / Psyche manifestation; G04 stále otevřena)

## v93.173 — 12. října 2026

- Nový `hmk-spell-aural-recovery.js`: HMK v1.2 str. 190, jednou za GM potvrzený herní den fyzický Will d100; CF znamená nové PSY1 s nevyřešenou volbou traitu, S/CS odstraňují 1/2 Aural úrovně a po 5 Weakness za úroveň. Není automatický hod ani automatický posun herního kalendáře. Vyžaduje existující doložené spell-origin Aural Shock a neaktivní Initiative.
- Nový `hmk-spell-psyche-manifestation.js`: samostatné výslovné GM potvrzení přibližně deseti uplynulých herních minut, změna již zvoleného traitu z `manifestationPending` do `manifested` a +5 Weakness za stále platnou PSY úroveň. Pozdější PSY Recovery zůstává nevyřešena.
- Opravena reprodukovaná chyba v93.172: nová PSY z dříve již projeveného stejného traitu zvyšovala intenzitu i PSY, ale nepřidala odpovídající Weakness. Po opravě PSY1+PSY2 zvyšuje příslušnou Weakness z 5 na 15 (bez vlivu na jiné zdroje Weakness). Neprojevený trait se nadále nepovažuje předčasně za manifestovaný.
- Všechny trvalé změny používají existující `persistVerifiedCombatSnapshot()`, jeho CAS baseline a read-back. Všechny kostky GM zadává fyzicky, UI/CSS/rozvržení zachováno. Nativní Chromium zůstává podle dohody odloženo na finální Character Sheet přezkum.
- **G04 NENÍ uzavřena**: Spirit CF / Shade, více aktivních Raw Principle, samotná d6-denní Psyche Recovery, obecné resolvery ostatních kouzel, nativní Chromium a úplné kombinatorické pokrytí zůstávají otevřené. Aktuální validovaná regrese je popsána ve vývojovém ZIPu.

# HMK Keeper’s Ledger — v93.172 (G04: spell Psyche Trait choice + expired-source correction)

## v93.172 — 12. října 2026

- Autoritativní Doom Flame Total Release nyní respektuje již vypršelý Hyper Burst; stále aktivní souběh zůstává blokován.
- Povinná volba Psyche Trait po podporovaných Spell Misfire / Total Release má samostatný důkazně navázaný GM krok v G04 UI a jediný plnodokumentový CAS zápis.
- Volba traitu **neznamená** jeho pozdější projev ani zotavení: 10min nástup, Weakness a d6-denní Psychic Recovery zůstávají jako explicitně nesplněné povinnosti.
- G04 není uzavřena: další Pèleáhn a jiné konvokace, Spirit CF Shade, souběh zdrojů a dlouhodobá trauma recovery dosud nemají plné resolvery; nativní Chromium je dle dohody odloženo.
- Žádný automatický hod; CSS, grafika a rozvržení beze změny.

## v93.171 — 12. října 2026

- Podle výhradně HMK v1.2, str. 203–204, nový fyzický průchod Pyre III Misfire 100 → Spirit d100 → 2/4/6 d6; následky a přetrvávající stav se atomicky ukládají přes původní `persistVerifiedCombatSnapshot()`.
- Sdílené vyhodnocení přeživšího Pèleáhn Total Release pro Doom Flame VI a Pyre III v čistém, nezapisujícím modulu `hmk-pelahn-total-release-core.js`.
- Délka Hyper Burst se odvozuje od Complexity Level kouzla (Doom Flame VI 6 kol, Pyre III 3 kola); radius zůstává 15 ft. Dosavadní šestikolové záznamy jsou kompatibilní.
- Dokud působí starý Hyper Burst, nový Total Release se nesmí potvrdit: vícezdrojové souběhy zatím chybí. Spirit CF/transformace na Shade také zůstává výslovně blokována.
- Opraveno přímé zahájení Pyre i Doom Flame Spellfire při následně vzniklém Shock INC/STN/UNC/KIA, Morale catatonic/routed/withdrawing či povinném Pass.
- Všech 280 dostupných Node testů (256 historických + 24 nových) prochází proti finálnímu produkčnímu stromu. Nejde o úplnou regresi všech pravidlových kombinací a všech kouzel.
- Nativní Chromium je podle dohody odložen na finální kontrolu po Character Sheet.
- Vzhled, `styles.css`, grafika a rozvržení aplikace zůstávají beze změn.

**Stav G04: NEUZAVŘENA.** Vedle ověřených Doom Flame a omezené Pyre zbývá plný resolver ostatních kouzel, souběžných Pèleáhn zdrojů, Spirit CF → Shade a dlouhodobých Psyche/Aural Shock následků. Nepodporované větve jsou odmítány; nelze je vydávat za hotovou mechaniku.

---

# HMK Keeper’s Ledger — v93.170 (G04 – společný Spell Misfire; G04 stále otevřená)

## v93.170 – rozšíření Pyre III Misfire 31–99 (12. 10. 2026)
- Společný čistý modul tabulky Spell Misfire pro Doom Flame VI a Pyre III (HMK v1.2 str.203); žádný automatický hod.
- Pyre nově řeší Distortion / Confusion / Principle Leak s Psyche Stress, Aural Shock, Weakness a případnou Crucial ztrátou znalosti v jediné existující transakci.
- Total Release 100 a všechny další nepodporované efekty zůstávají fail-closed; G04 není dokončená.
- Spravované Chromium s URLBlocklist=["*"] nadále blokuje test nativního localStorage.

# HMK Keeper’s Ledger — v93.169 (G04 – Pyre III Spellfire; G04 stále dílčí)

## v93.169 – Druhý Pyre Incant: omezený autoritativní průchod (12. 10. 2026)
Nový `src/integration/hmk-guided-pyre.js` napojuje známý Pyre III (HMK v1.2, str. 229) po jednokolové koncentraci na skutečný fyzický Casting d100; při CF na samostatný fyzický Misfire d100. Pouze jediný doložený odložený neživý izolovaný dřevěný předmět do SI liber, bez kontaktu s jinou bytostí a bez dalších modifikátorů. S/CS odstraní předmět v jediném atomickém checkpointu se spell fatigue, stavem Initiative a důkazem; F/CF předmět nemění. Implementovány jsou pouze form failures 01–30, vyšší Misfire zůstávají zablokované. Nemění se CSS ani autoritativní zapisovací cesta. G04 není uzavřena; registr kouzel je nadále záměrně omezen na Doom Flame a Pyre. Nativní Chromium restart v tomto běhovém prostředí blokuje spravovaná politika URLBlocklist `*`; skutečný PASS nelze doložit.

## v93.168 – G04 Incant integrity (12. 10. 2026)
Po dokončení Pèleáhn Hyper Burst Incant spellstart nesmí starší formulář ani přímé ukončení Initiative IR přeskočit autoritativní Spellfire: validuje se fyzický d100 spolu s odpovídající událostí v persistentním bojovém stavu. Nový obecný *dispatcher* pro druhou Incant připustí pouze naučené kouzlo, které má ve vnitřním ověřeném registru nejen tištěný Casting Time, ale i funkční kompletní spellfire resolver. V této distribuci je bezpečně registrován jen Doom Flame; **více než 200 ostatních kouzel z HMK není dokončeno a G04 nelze uzavřít**. Historická regrese 200/200, nové testy 11/11; nativní restart localStorage je v tomto prostředí zablokován enterprise URLBlocklist ["*"]. Vzhled/CSS beze změny.

Webová aplikace HMK Combat Engine pro HârnMaster: Roleplaying in the World of Kèthîra.

## Spuštění

Aplikace je tvořena statickým HTML, CSS a JavaScript ES moduly. Pro provoz na GitHub Pages není potřeba npm, Node.js ani build.

- `index.html` — vstup aplikace
- `app.js` — hlavní modul a integrace rozhraní
- `styles.css` — styl aplikace
- `src/` — produkční pravidlové, integrační, doménové a stavové moduly
- `.nojekyll` — kompatibilita GitHub Pages
- `.gitignore` — pomocná pravidla pro Git

V **Settings → Pages** zvolte `Deploy from a branch`, větev `main`, složku `/(root)` (případně používejte vlastní funkční způsob nasazení). K otevření použijte URL GitHub Pages; přímé spuštění HTML ze souboru nemusí umožnit ES modulové importy.

## Aktuální stav

- **v93.167 – G04 Hyper Burst (bez předstírání finálního uzavření):** v již existující druhé řízené Missile Attack lze nově použít vybavené vrhací zbraně s doloženým modelem z původní tabulky HMK str. 110 (Shôrkána, Javelin, Spear, Tabûri), s fyzickými hody GM, Injury, případnou Injury Morale, END a uvolněním zbraně z ruky ve **stejném** atomickém checkpointu. Rozšířené předem potvrzené modifikátory pro přímý Missile/Thrown zahrnují Still/Moving target, Windforce/Crosswind a pohyb střelce; všechny výpočty nadále provádí sdílená Missile Sequence. Opravena dříve nefunkční kuše: GM musí výslovně zvolit Archery ML nebo Archery SB × 3 (druhá možnost potřebuje atributy PER/DEX). Nových 42 cílených testů (26 Thrown + 16 Crossbow/Sling) a sedm předchozích sad (158 testů) prošlo. Chromium click-through a načtení stavu na nové stránce proběhly **pouze se simulovaným úložištěm**, nikoliv nativním localStorage; browser navigace na file://, localhost i testovací HTTPS vrací ERR_BLOCKED_BY_ADMINISTRATOR. **Obecný Incant všech kouzel, Volley, Missile Mishap/CF, Nearby/Deviation, Charging Throw a nativní restart localStorage nejsou uzavřeny**, proto G04 nelze označit za plně dokončenou. Zachovány CSS a jediný dokumentový CAS writer.
- **v93.166 – G04 Hyper Burst (cíleně ověřené rozšíření):** druhý ověřený Missile útok z nabitého luku, kuše nebo praku přes `createLiveGuidedMissile` a existující Injury Sequence, fyzické hody GM a spotřeba Load výhradně v jednom checkpointu s Injury, Morale a END. Neověřený Volley/nearby/mishap/zasažený jiný cíl zůstává zablokován. Druhá akce Incant podporuje pouze ověřený spellstart známého Doom Flame s dvoukolovou koncentrací ve společném plánovači a fyzickým END; skutečný spellfire pokračuje později původním průvodcem. Žádná obecná implementace všech Incant kouzel není tvrzena. Historické dostupné cílené testy a nové testy jsou mimo produkční ZIP. Chromium klikací scénáře proběhly pouze se směrovaným zdrojem a náhradou úložiště; nativní localStorage/restart na reálném originu v tomto prostředí zůstává neověřen. Celá G04 stále není uzavřena.

- **v93.165 – G04 Mounted Stumble F/CF (cíleně otestováno, G04 zůstává otevřená):** F/CF zatáčejícího Double Move spojuje *existující* `applyConfirmedHit` Injury Sequence koně i jezdce v jediném `persistVerifiedCombatSnapshot` zápisu dokumentu. Všechny kostky zadává GM (d10 Impact/ZN/LD, Shock, Jumping/Acrobatics, Compound, okamžité Mishap/Morale i případná opakování Falling CF). Ověřují se živé profily, přirozená AV koně, skutečná AV jezdce, starší poranění a EML, povrch/výška/skutečné místo pádu, následky zranění a speciální léčba koňských nohou. Bez všech povinných údajů nevznikne zápis. Stará svázaná akce ukládá obě nové polohy, dva bojové stavy, Initiative a důkazy atomicky. Jeden fyzický Stumble nelze použít pro více zatáček, neověřené koňské brnění je odmítnuto. Zbývají otevřené jiné větve G04 (Hyper Burst Missile/Incant) a nezávislé úplné prohlížečové E2E; **nejde o uzavření celé G04**.

- **v93.140** — dokončená cílená regrese G03 (historie přerušení koncentrace)
- **v93.141** — G04: oprava přerušení vícekolové koncentrace po Morale (aktuální i historický stav), ověřená oddělenými regresními testy.
- **v93.142** — G04 fáze 2: oprava pravidlového potvrzení Pass při Routed / Withdrawing; výslovné potvrzení nemožnosti pohybu od GM a trvalý důkaz v Initiative, včetně odložené reakce. Rozšířeny oddělené testy o 126 kol / 378 tahů se skutečně vyhodnoceným Melee, Injury a Blood Loss a restart mezi fyzickými hody (simulace úložiště).
- **v93.144** — G04 fáze 4 (G04-004): oprava Routed/Withdrawing prostorového Move podle HMK str. 162. Povinný útěk Routed vyžaduje full Move, Withdrawing alespoň half Move; GM výslovně potvrzuje faktický ústup. Závěrečný scheduler přepočítává trasu, Engagement Zone i aktuální mapu a odmítá samotnou kategorii Move nebo podvrženou projekci bez mapy. Spatial a Initiative zápisy mají společné ID události; bez generování kostek, CSS beze změny. End-to-end nativní localStorage restart a kompletní G04 zůstávají otevřené.
- **v93.143** — G04 fáze 3 (G04-003): Routed při skutečně nemožném útěku a ohrožení zapisuje kapitulaci, odděleně od Morale State; následná akce je pravidlově uzamčena až do explicitního doložení GM o skončení kapitulace. Zápis respektuje přítomnost povinného Mishap/Confused Pass, nevymýšlí automatické hody ani údaje o ohrožení. Doložené ukládání probíhá spolu s tahovou událostí v jediné transakci. Nativní `localStorage` v Chromiu při restartu prohlížeče stále nebyl ověřen.
- **v93.145** — G04 fáze 5: vazba fyzického prostorového Move na finální záznam po odloženém end-turn Reaction; Readied trigger a dosud neprovedený Readied Attack/Move/Grope kontrolují aktuální Shock/Morale/Mishap. Vývojové testy mimo produkční ZIP. CSS nezměněno.
- **v93.146** — G04 fáze 6: obranný Counterstrike Trip/Press/Grab je deklarován před fyzickými hody a počítá se správnému aktérovi; opakovaný Grab Hold zachovává doložené −2/−3 postihy a u starších neúplných záznamů vyžaduje potvrzení skutečné ruky GM; Stumble po Press a Free Press umožňuje Acrobatics; opraveno ověření obsazeného pole při obranném přesunu. Rozšířené testy jsou mimo produkční ZIP, CSS beze změny. Kompletní systémové uzavření G04 dosud není doloženo.
- **v93.149** — G04 fáze 9: blokace samostatných nedoložených zápisů Weapon Damage, Area a Mounted bez fyzických a prostorových dokladů. Ověřené řízené větve Melee Weapon Damage a Mounted Control zůstávají dostupné; Area a Rider Impact zůstávají do doplnění úplného ověřeného průvodce nedostupné přes staré formuláře. CSS beze změny.
- **G04** — závěrečná kombinovaná integrace/regrese DOSUD NEUZAVŘENA; kompletní protokol a zbývající testy jsou dodány odděleně mimo produkční ZIP.
- Vzhled aplikace nezměněn oproti produkčnímu v93.140
- Důležitá bojová rozhodnutí a hody zadává GM, aplikace je negeneruje automaticky
- Toto je *čistá běhová distribuce*. Nezahrnuje archivní testy `test/`, `tests/`, staré pravidlové dokumenty `docs/` ani text knihy `hmk.txt`.

## Data a aktualizace

Pracovní data aplikace se uchovávají v úložišti prohlížeče. Před zásadními změnami nasazení proveďte dostupný export/zálohu v aplikaci. Aktualizace souborů v repozitáři sama o sobě není exportem uživatelských dat.

## Regrese

Testy používané při vývoji G01–G03 byly prováděny odděleně od této produkční distribuce. Tento ZIP **neobsahuje běžitelnou npm regresní sadu** a netvrdí, že všechny možné kombinace HMK prošly end-to-end. V G04 se připraví nová trvalá sada pro aktuální zdrojový kód.


- **v93.147** — G04 fáze 7: uzavřeny nedoložené formuláře Melee-vítězství a ručního Hold retestu. Původní ovládací bloky zůstaly na místě, ale neověřené potvrzení je zakázáno jak přes tlačítko, tak přes přímé odeslání. Řízený Attack/Grab/Trip/Press a automatický Hold čtou aktuální pravidlové podklady a výslovné fyzické hody GM. Alternativní speciální zápisy se vzájemně neprovádějí během jiného rozpracovaného průvodce. CSS beze změny; G04 není úplně uzavřena.

- **v93.148** — G04 fáze 8 (G04-015): při obranném Counterstrike Grab Hold se nově získané držení nesmí uplatnit zpětně jako povinný Pass již probíhajícího tahu původního útočníka. Stav Grab Hold na začátku tahu je uchován a povinný Pass platí při následujícím tahu cíle. Průchody Counterstrike Grab, Press a Trip jsou nově ověřeny přes skutečné formuláře v Chromiu včetně fyzických d100/d6/d4, Mishap, Shock, prostorového přesunu, chybného cílového pole, atomického zápisu a simulovaného restartu. Nejde o test nativního localStorage po restartu prohlížeče. CSS beze změny, G04 neuzavřena.


- **v93.150 – G04 fáze 10 (dílčí):** Nový čtecí modul `hmk-verified-area-protection.js` vypočítává Area AV pouze z auditované aktuálně nasazené zbroje (HMK str. 133); u originálních kompletů používá tištěnou Area AV a u nesestavových článků jednotlivé lokace, nikoli neověřenou ruční hodnotu. Dvě přesně doložená názvová synonyma p.113–116 vůči p.118 byla sjednocena v `live-combat-armour.js` bez změn zbrojových hodnot. `hmk-verified-mounted-route.js` provádí *čtecí* audit skutečného Control eventu, prostorového pohybu mounta, podmínek rychlosti, zatáčení 45° a předběžného Rider Impact; bonus se vědomě **NEZAPISUJE**, dokud nebude hotová společná atomická akce jezdce a koně ve stejném Initiative Rank. **Area origin/kompletní vícecílový impact a Mounted shared-IR commit nejsou dokončené.** Toto vydání nezpřístupňuje dříve blokované nebezpečné formuláře, neprovádí hody kostkami a nemění CSS. G04 se neuzavírá.

- **v93.151 – G04 fáze 11 (dílčí, G04 není uzavřena):** `hmk-verified-mounted-route.js` odmítá pohyb koně, pokud jezdec prokazatelně nesdílel jeho výchozí a koncovou polohu (G04-023). Poloviční lichý Rider Impact se podle HMK str. 7 a 172 běžně zaokrouhluje (např. 5 / 2 → 3; G04-024). Nový `hmk-area-cohort-preview.js` sestavuje **výhradně nezapisující** náhled Area pro všechny explicitně uvedené cíle, kontroluje duplicity, kompletní fyzické hody, aktuální ochranu a Fatigue při Shock EML, změny stavů a zbroje; nedoloženou Evade odmítá (G04-025). Není připojen nový Area zdroj útoku ani jeho geometrie, nevzniká finální atomický zápis. Mounted nadále nemá společný IR/atomický pohyb jezdce a koně a předběžný Rider Impact se nezapisuje. Nativní restart v Chromiu blokuje platforma (ERR_BLOCKED_BY_ADMINISTRATOR). Staré zakázané formuláře zůstávají blokované. CSS beze změny, bez automatických hodů. **G04 a etapa G NEJSOU dokončeny.**


- **v93.152 – G04 fáze 12 (dílčí):** nové `src/integration/hmk-area-atomic-cohort.js` a `hmk-mounted-shared-turn.js` obsahují ochranu úplné transakce. Area dokáže pro **již existující a ověřený** Area-source event přepočítat všechny cíle, odmítnout neúplné fyzické hody, zachovat dosud nesplatné Injury Morale až po Shock Recovery a odmítnout Morale již splatné; pak připravit jediný CAS zápis celého dokumentu. V aktuálním `app.js` ale **neexistuje pravidlově ověřený producent zdroje Area ani jeho úplné GUI**. Pozitivní testy používají syntetický zdroj a neslouží jako doklad hratelného Area útoku. Mounted umožňuje po doloženém Control ve stejném IR atomicky přesunout **oba účastníky**, projít dvěma skutečnými tahy a zapsat je jediným snapshotem. **Ride-by Attack a udělení Rider Impact zůstávají vypnuté**, protože pro ně neexistuje jeden konečný řízený bojový průchod. Opraven nulový Effective Impact Area (bez zranění a bez Shock d100). Nikdy se negenerují hody, neověřené staré formuláře zůstávají blokované, `styles.css` beze změny. Prohlížeč odmítá testovací URL příkazem `ERR_BLOCKED_BY_ADMINISTRATOR`, proto přetrvává blokace nativního restartu. **G04 a etapa G NEJSOU uzavřeny.**


## v93.153 – G04 fáze 13 (dílčí, G04 zatím NENÍ uzavřena)

Přibyla dvojice **opravdu zapisovatelných, ale záměrně úzce omezených** řízených akcí v hlavním Combat panelu:

* **Area – Doom Flame (HMK str. 200–202, 227):** Z aktuálního známého kouzla Primary Pèleáhn s dokončeným dvoukolovým spellstart, nulovým doloženým ENC a bez relevantních ran se fyzickým Casting d100 a d4 vytváří jediný pravidlový zdroj Fire Area. Geometrie vybere všechny účastníky automaticky, cíle vyhodnotí skutečnou Area AV, fyzické Shock/Compound hody a případné odložené Morale. Všechna zranění, casting fatigue, zdrojový protokol, stav Initiative a deník se ukládají **jediným compare-and-swap**. Všichni zasažení musejí prokazatelně nezvolit proactive Evade; toto omezení je explicitně potvrzeno pro každý cíl. Neúspěch Casting Roll (včetně Misfire), volba proactive Evade, různé modifikátory sesílání, neznámá nebo zraněná postava či neověřené překážky **nejsou podporovány a nezapisují se**; nelze je nahrazovat odhadem.

* **Mounted – společný IR → Move + Ride-by Melee (HMK str.172):** Vyžaduje skutečný úspěšný Control jako volnou akci, aktivní společný IR pro jezdce i zvíře, kompletně potvrzenou mapu, ověřený profil zvířete, pohyb a jeho skutečně dosažitelný cíl. Navazuje na existující průvodce Melee, volby obrany a fyzické d100, lokace, Impact a Shock. Splatná Injury Morale je samostatně zadána fyzickým d100 před konečným zápisem. Rider Impact se připočte do skutečného Impact a současně se ukládá do trvalého stavu jezdce s pravidlovou platností do konce následujícího kola. Tah jezdce i zvířete, poloha, rána, Fatigue/Morale a důkaz jsou jednou transakcí. Pokud vznikne dosud nepodporovaná kombinace volného Press, Mishap, Counterstrike, Weapon Damage nebo dalšího obranného pravidla, engine přechod **odmítne**, nikoli přeskočí.

* **Regrese:** 23/23 předchozích Node sad, nový Area a Mounted pozitivní i adversariální test; skutečné Chromium průchody pro obě akce, restart pracovního průvodce Area mezi hodem d100 a d4 a odmítnutý zápis při simulované chybě úložiště. Starší Chromium Counterstrike Grab/Press/Trip a ochrana specializovaných zápisů znovu prošly. Všechny nové hody zadává GM; žádné hodové RNG.

* Nativní skutečný restart `localStorage` na dostupném webovém originu zůstává neověřený kvůli administrátorské blokaci prohlížeče; browser testy používají syntetické úložiště. Není dokončena plná škála Area zdrojů, Evade a Spell Misfire ani Mounted dalších reakcí, Free Press a útoků zvířete. **G04 a etapa G nejsou uzavřeny.** CSS i grafické rozvržení zůstávají beze změny.


## v93.154 – G04 fáze 14 (dílčí; G04 není uzavřena)

- **Doom Flame Casting F (HMK str. 202):** dokončený neúspěšný nekritický fyzický d100 nepůsobí Area zásah, nevyžaduje Impact d4 ani cílové Shock hody, ale CL VI přidá 15 Casting Fatigue. Výsledek a opuštění právě probíhajícího tahu se ukládají jediným ověřeným snapshotem; Critical Failure stále vyžaduje úplný Spell Misfire a není náhradně potvrditelný jako F.
- **Mounted shared Move bez útoku (HMK str. 172):** v hlavním Combat panelu je nyní dostupná nezávislá řízená volba pro jezdce a mounta, kteří již mají doložený Mounted Control na stejném IR. Trasa, autoritativní mapa, oba skutečné tahy a obě koncové pozice se ověřují a ukládají společně. **Tato dílčí varianta nevytváří útok a nepřiděluje Rider Impact. Přímý pohyb 50+ ft, který podle str.172 bonus vytváří i pro následující kolo, formulář výslovně odmítá, dokud nebude bonus bezpečně propojen s pozdější akcí.** Původní Ride-by průvodce je zachován.
- Nový průřezový test: **jeden 61kolový boj šesti účastníků** s dvoukolovou koncentrací, Doom Flame se dvěma zasaženými cíli, Mounted Control, Ride-by Melee a Injury Morale v témže střetnutí. Toto není úplná regrese všech možných akcí; řada kol slouží k ověření zachování Initiative.
- Prohlížečový test se skutečným originem pro nativní localStorage a restart Chromia stále nelze provést: Chrome vrací `ERR_BLOCKED_BY_ADMINISTRATOR` pro `file://`, `http://localhost`, `http://127.0.0.1` a HTTPS. Synthetic Storage test **není** náhradou nativní perzistence.
- Zbývají Area proactive Evade, Spell Misfire, další Area zdroje a Mounted Overrun/Stumble, nové obranné reakce zvířete a složité simultánní následky. Žádný automatický hod kostkami; `styles.css` beze změny. **G04 a etapa G se neuzavírají.**


## v93.155 – G04 fáze 15 (dílčí; G04 NENÍ uzavřena)

- **Mounted Move bez útoku 50+ ft:** skutečně doložená přímá trasa jezdce a mounta nyní uděluje Rider Impact v témže atomickém zápisu obou pozic (50+ ft: poloviční bonus, 100+ ft: plný). Bonus je uložen do stavu jezdce a trvá i následující kolo. Dřívější blokace pohybu 50+ ft byla odstraněna. Kratší Ride-by v následujícím kole ověřeně převezme dosud aktivní bonus, místo aby jej ztratil; znovu neprodlužuje datum jeho vypršení.
- **Doom Flame Spell Misfire CF:** po Casting CF si průvodce nyní vyžádá samostatný skutečný d100 Misfire. HMK str. 203: výsledky 01–15/16–25/26–30 zpracovávají Minor/Serious/Grievous Form Failure s úplnou Fatigue pro Complexity VI ve výši 50/60/70. Při Crucial Misfire (hod končí 5 nebo 0) se zneplatní znalost Doom Flame, dokud nebude znovu prokázán Spell Research; aplikace tento výzkum nedopočítává. Zapisuje se jednoznačná událost a veškeré následky v **jednom** checkpointu. Misfire 31+ zůstávají zablokované do implementace Psyche/Aural Shock/Raw Principle, nejde o dokončenou celou tabulku.
- **Testy:** 30/30 Node sad; nové celoklikací Chromium testy pro CF/Misfire a Mounted Move; opakované předchozí Area, Ride-by, Counterstrike a special-form scénáře, syntetické úložiště. Nativní Chromium restart s `localStorage` **neověřen** (`ERR_BLOCKED_BY_ADMINISTRATOR` i se skutečným HTTP serverem). Dlouhý 61kolový Area/Mounted souboj a 126kolový boj z předchozích etap proběhly **odděleně**; jeden univerzální dlouhý celoklikací souboj všech pravidlových větví stále chybí.
- Není podporována veškerá Area Evade, další Area zdroje, Misfire nad 30, Mounted Overrun/Stumble/Double Move a další přerušení a protiútoky. Neověřené kombinace zůstávají zablokované. Bez automatických hodů, CSS a rozvržení beze změny. **G04 není uzavřena.**



## v93.161 – G04 fáze 18 (dílčí, G04 NENÍ uzavřena)

- Nová skutečně zapisovatelná **Mounted Overrun společná Move** pro přísně omezený případ bez Trample: ověřený a GM potvrzený profil `hmk.verifiedZoneNumbers` zvířete a každého stojícího protivníka, součet všech protivníků křížících danou trasu striktně menší než ZN zvířete (HMK p.353), přesně doložený průchod a jediný atomický commit jezdce i koně.
- Projekce nově může ignorovat pouze výslovně ověřené nepřátelské EZ; průjezd kolem jakéhokoliv jiného hrozícího protivníka zůstává omezující. Změněné ZN, prone protivník, chybějící charakter, falešný původ a neúplné profily jsou odmítnuty. V jednom průchodu nezpracovává Trample, Mounted Double/Charge Overrun ani doprovodný útok.
- Nový regresní test původně blokovaného 20 ZN koně proti stojícímu protivníkovi 10 ZN v reálném formuláři Chromia, negativa, simulovaný storage error a jediný commit. Starší scénáře zůstaly aktivní.
- **G04 stále otevřena:** neúspěšný Mounted Stumble F/CF s mount/rider Injury Sequence, Overrun s Trample a dalšími variantami, Total Release 100 včetně Spirit Test/Raw Principle, proaktivní Evade aplikovaná na následujícím IR a univerzální celoklikací souboj všech mechanik. Native browser-origin localStorage neověřen.

## v93.157 – G04 fáze 17 (dílčí, G04 NENÍ uzavřena)
- Dohledané HMK str. 203: Doom Flame Casting CF Spell Misfire 31–60 (Psyche Stress 1/2, Aura warpage, pending choice) a 61–99 (Aural Shock 1/3/5, +5 Weakness na úroveň); výsledky 100 Total Release zůstávají bezpečně zablokované, vyžadují Spirit a Raw Principle. Crucial Misfire odstraní znalost Doom Flame do výzkumu. Aural Shock blokuje další nepodložené sesílání.
- Area Dodge u cíle se skutečně **již uloženou** Evade z tohoto či předcházejícího kola, fyzický Dodge d100, kompletní ověřená prostorová trasa a spotřebovaný tah, status Prone; uživatelský vstup bez důkazu je odmítnut. Nová proactive Evade přímo během kouzla zatím nepodporována.
- Společný Mounted Double Move se zatáčkou podporuje **úspěšný** fyzický Stumble AGL d100 (včetně END d10), ochrany stage/replay a atomický přesun jezdce a koně. Neúspěšný Stumble musí vyvolat p354 následky, které ještě nemají kompletní write path.
- Přidán read-only Overrun ZN eligibility gate podle HMK p353: přísný součet ZN současných protivníků; neuděluje oprávnění k přesunu ani Trample.
- Node i Chromium regresní testy a 61kolový integrací Area/Mounted ve vývojovém balíku. Plný univerzální celoklikací souboj všech mechanik a nativní restart úložiště zůstávají neověřeny. Vzhled a CSS beze změny.

## v93.156 – G04 fáze 16 (dílčí; G04 NENÍ uzavřena)

- **Mounted shared Double Move – pouze přímá trasa** (HMK str. 160, 172): přechod z poslední doložené rychlosti `full` na `double` vyžaduje skutečný GM END SR d10, uložený END a doloženou Personal Fatigue zvířete (`verifiedMountedPersonalFatigue`). Úspěšný SR sníží vzniklou únavu o 5; neúspěšný ji ponechá plnou. Pohyb jezdce, mounta, únavu, oba tahy a důkazy zapisuje jedna transakce. Rychlost nadále nesmí měnit více než jeden stupeň. Trasa se zatáčkou nebo nedokončeným pohybem vyžaduje Stumble/Overrun, který tato varianta **bezpečně odmítá**. Nejedná se o hotový obecný Mounted Overrun ani o pohyb zvířete s neověřenou Personal Fatigue.
- **G04-031 – převzetí rychlosti po Ride-by:** společný Mounted Move nyní určuje poslední skutečnou rychlost koně nejen po `mounted-shared-move`, ale i po `mounted-ride-by`, a to z trvalé `spatialEvents` události. Chybějící doklad jízdy nebo nesoulad deklarace se zamítá.
- **Regrese:** 30 předchozích Node sad; nová Mounted Double Move sada s úspěšným i neúspěšným END SR, selháním úložiště, duplicitou, záměnou fyzického hodu a chybějícím dokladem Ride-by. Chromium DOM průchod pro Double Move, existující Mounted Move a Doom Flame CF/Misfire. Dřívější 61kolový a 126kolový souboj existují **odděleně**: nikoli jako jeden univerzální celoklikací boj všech větví.
- **Nativní restart Chromia:** znovu zkoušený persistentní profil na skutečném lokálním HTTP originu; prohlížeč v tomto prostředí navigaci odmítl `ERR_BLOCKED_BY_ADMINISTRATOR`. Test tedy **NEPROŠEL / NEBYL PROVEDEN** a vyžaduje spuštění na neblokovaném originu.
- **Zbývá:** Spell Misfire 31–100 včetně Psyche/Aural Shock/Total Release, proactive Area Evade, další Fire/Frost zdroje, Mounted Stumble/Overrun, Double Move se zatáčkou a následky pádu, obrany mounta, následná kontrola efektivního Move po kumulované únavě a jeden univerzální skutečný end-to-end souboj. CSS a grafika bitově beze změny, žádné generované hody. **G04 zůstává otevřená.**


### G04 fáze 19: rozpracovaný Total Release (bez zápisu)
Rozšířen průvodce Doom Flame Misfire 100 o fyzický Spirit d100 a podle výsledku 6d6/4d6/2d6 ztráty Spirit ML. Páleáhn Hyper Burst / Shade a jejich povinné následky zůstávají fail-closed; nelze je trvale uložit ani prohlásit za dokončený Total Release.

Proaktivní Doom Flame Evade je nyní v hlavním Combat panelu zapisovatelná **pro jeden doložený cíl**: okamžitá skutečná trasa z ověřené mapy, přepočet zasažených cílů, jeden společný Area commit a povinné spotřebování příštího IR v Initiative. Reakce mimo oblast nevyžaduje Shock d100. Uvnitř oblasti se musí prokázat Dodge a všechny následky; zatím nevyřešená Injury Morale zablokuje společný commit. Více současných proaktivních Evade a útoky bez zasaženého cíle nejsou touto verzí podporovány.

**Dosud neimplementováno:** úplný Mounted Stumble F/CF se zraněním koně a pádem jezdce; šestikolový Total Release / Pèleáhn Hyper Burst a transformace Shade. Tyto varianty se NESMÍ zapisovat jako dokončené, proto zůstávají zablokované. Nativní Chrome localStorage restart nad webovým originem zůstává kvůli administrátorské blokaci neověřený. G04 není uzavřena.


### v93.161 — G04 phase 20: forensic roll-evidence prerequisites (NOT completed G04)

- Added `hmk-pelahn-hyperburst-proof.js`: validates explicit six-round/actor coverage, actual extra-action ordering and post-second-action END d100. The output is **evidence-only**, never a scheduler or commit authorization.
- Added `hmk-mounted-stumble-physical-proof.js`: validates separate mounted Stumble F/CF, mount d10+0b (+5 CF), random zone/location dice, rider fall d10−2b (+5 at Full/Double), actual Falling Routine Jumping/Acrobatics d100 and CF repeat flag. Exact wound, AV, Shock and fall consequences remain required.
- No changes to CSS or the supported Combat wizard. **Total Release 100 and failed Mounted Stumble are STILL NOT persistable**, pending complete Initiative/trauma integration. G04 remains open.


## G04 phase 21 (93.161)
- The Initiative scheduler now blocks advancing to a subsequent turn or round when a persisted Pèleáhn Hyper Burst source has an unresolved, in-radius bonus action and compulsory END d100. The gate uses immutable source/turn/resolution evidence.
- This is a verified partial integration, NOT support for all second-action types and NOT the complete Mounted Stumble F/CF injury commit. Both remain blocked until full guided consequence handling is implemented.
- All dice are entered by the GM. No CSS changed.


## v93.164 — G04 fáze navázání (dílčí; G04 NENÍ uzavřena)

- **Pèleáhn Hyper Burst, skutečná druhá Melee Attack:** po dokončeném běžném IR a před povinným END d100 funguje nová samostatná řízená Melee Attack pro přesně doložené sousední cíle (do 5 ft), s vybavením a ML obou postav z aktuálního dokumentu. Volba obrany, manuální GM hody a případná Injury Sequence přicházejí z již existujících autoritativních modulů. Nová vrstva nedělá nové algoritmy hodů. Útok, jeho ověřené zranění, případná bezprostřední Injury Morale, END a Initiative se zapisují **jediným full-document CAS**, aniž vznikne další běžný tah. Neúplné nebo pozměněné důkazy, pokus o replay, souběžný zápis, selhání trvalého úložiště, Mishap/Counterstrike/Weapon Damage bez podporovaného follow-up se odmítají. Plný Missile/Incant ani zbývající druhé akce **dosud nejsou připojeny**.
- **Náhled Mounted Stumble:** náhodný Aim ZN1; explicitní **Falling Routine d10 ZD + d10 LD** ze str. 67 namísto chybně převzatých d6/d8 ZD z útočných zbraní koně na str. 355; oddělené strany končetin a společná pravidla Compound Injury; protože zde není společná live Injury Sequence obou účastníků, náhled dál záměrně **neopravňuje k zápisu**. Opravena původní chyba HMK str.67: při neúspěchu náhodného pádu `Acrobatics F` je Impact modifier **0**, nikoli −2.
- **UI ochrany:** rozpracovaný Melee průchod se obnoví ze `sessionStorage`, ale při každém konečném zápisu se důkaz nezávisle znovu sestaví z živého dokumentu. UI kontroluje Injury Morale PŘED fyzickým END d100 (včetně odmítnutí předčasného END), obnovu z rozpracovaného průvodce a zobrazení chyb. Opraveno pro Melee/Mounted bez zásahu při úspěšné obraně Block: absence nového state objektu neznamená absenci původního platného stavu. Pro Hyper Burst Pass přestaly být HTML povinné irelevantní hodnoty mapy; Move je nadále vyžaduje přes přísnou produkční validaci.
- **Regrese této verze:** 21/21 *pravidlově opravených* původních cílených testů (staré tři předpoklady o ZD byly chybnou interpretací p.355), 10/10 Mounted animal preview, 34/34 Melee adversariálních / headless UI scénářů a 12/12 Falling Routine pravidlových případů. Původní v93.163 měla na první nové sadě Mounted preview 3/9 a na Falling Routine 11/12; samotná stará testovací očekávání d6/d8 však byla chybná, proto je před regresním závěrem bylo nutné zrevidovat. Všechny testy byly izolované Node scénáře s předem zadanými fyzickými hodnotami kostek. **Nejde o úplné historické testování ani o nativní klikací Chromium.** Prohlížeč na místním originu vrací `ERR_BLOCKED_BY_ADMINISTRATOR`, nativní restart skutečného `localStorage` a celoklikací G04 nelze ověřit.
- **Neuzavřené:** Mounted Stumble F/CF → obě plné Injury Sequence, skutečné AV a Healing Rate v jedné transakci, všechny Falling Routine a případné opakování; Hyper Burst Missile/Incant, speciální Melee/Move přerušení a celá historická regresní sada. Schválně nejsou vydávány za dokončené; CSS a grafika beze změn.

## v93.163 — G04 cílená pravidlová oprava (dílčí, G04 zůstává otevřené)

- **Total Release Spirit F/S/CS, HMK v1.2 str. 190 a 203:** do stávajícího jednoho transakčního zápisu byly doplněny povinné Aural Shock 6/4/2, Weakness Fatigue +30/+20/+10 a odpovídající doklady. Zachována existující ztráta Spirit ML, Psyche Stress 3 a šestikolový zdroj Hyper Burstu. Spirit CF / Shade zůstává bezpečně blokován.
- **Mounted Stumble physical proof, str. 355:** samostatný nezapisující důkaz nyní přijímá skutečnou velikost Zone Die d6 (Donkey/Pony) nebo d8 (ostatní uvedení koně), nikoli omylem d10/d20. Autoritativní propojení na dvě Injury Sequence a jejich jediný společný commit zatím NEEXISTUJE.
- **Regrese:** 21 cílených nezávislých Node testů prošlo na opravené verzi; stejná sada na původní v93.162 vykázala 8 neúspěchů. Historické vývojové testy nejsou v produkčním archivu a nelze je proto vydávat za znovu spuštěné. Chromium se spustilo, ale navigace na místní HTTP origin byla zablokována administrátorem (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- **NEUZAVŘENO:** druhý Attack a Incant během Hyper Burstu, plný Mounted Stumble F/CF s oběma účastníky a všemi následky; celoklikací a nativní localStorage restart není ověřen. Žádné generované kostky, CSS a grafika nezměněny.

## v93.162 — G04 fáze 22 (dílčí, G04 stále otevřená)

- Šestikolový Total Release / Pèleáhn Hyper Burst lze po doložených fyzických Spirit hodech atomicky založit v Initiative (bez nepodporované proměny na Shade).
- Po skutečně dokončeném běžném tahu lze vyřešit bonusový Pass, fyzický END d100 a Weariness. Druhou povolenou akcí je také skutečný half/full Move s doloženou mapou, ověřeným Effective Move, Engagement Zones a jedním CAS commitem. Při Fatigue >= Move se žádná druhá akce nesmí vytvořit, povinný END však zůstává.
- Nové zdrojově ověřené čtení tabulky zvířecích lokací B/C podle HMK str.355 používá přesný ZD koně (d6/d8), jeho přirozenou Blunt AV, šok lokace a kontroluje Compound či leg HR postih. Tento náhled NENÍ zápisovou autoritou.
- **NEUZAVŘENO:** Bonusové Attack/Incant, Mounted Stumble F/CF autoritativní Injury Sequence a jediný společný commit zranění obou účastníků. Tyto cesty zůstávají z bezpečnostních důvodů blokované; kontrola lokace sama neopravňuje k zápisu.
- Žádné automaticky generované kostky. CSS bitově beze změny.

### G04 v93.178 — Spirit CF / Shade (HMK v1.2, pp.203–204, 396)

Doom Flame VI a omezený Pyre III nově umějí atomicky zapsat Total Release 100
s fyzickým Spirit CF: původní tělo je v pravidlovém smyslu zničeno
(Pèleáhn: obláček kouře), fyzický Combat State přejde na KIA, duše je
evidována jako Shade ve Spirit World a Raw Pèleáhn Hyper Burst zůstává
působit na ostatní oprávněné postavy po CL kol. Shade nemá fyzickou
bonusovou akci ani fyzický END test. Psyche Stress +3 a následná volba
Traitu zůstávají uložené jako povinnost. GM musí vyřešit dispozici
předmětů a případné budoucí astrální akce zvlášť; ty zde nejsou povoleny.

Implementace používá dosavadní ověřený jediný CAS zápis. Není
podporován souběh více aktivních zdrojů Raw Principle ani ostatní
Pèleáhn spellfire resolvery. Nativní Chromium/localStorage restart je
odložen na finální kontrolu s Character Sheet. **G04 zůstává otevřená.**

## v93.208 — Chieftain + Hunter/Forester; audit Skills / DP

- HMK v1.2 p.42: Chieftain acquires the complete Farmer/Fisher/Herder/Hunter
  DP list corresponding to the *already established* tribal subsistence
  (Farming/Fishing/Herding/Foraging), plus Law 3 / Command 2 / Intrigue 1.
  Chieftain occupational choices are restricted to that one variant; no die
  or GM-free replacement occupation is invented.
- Forester is Hunter's exact DP list plus Law 2 / Melee 1. The parent
  `Gentry: Forester` inherits the same Family Skills; parent Gentry wealth
  continues to use printed d6, whereas PC Forester inherits Hunter d2.
- Veteran stage display: Mature ordinary human = 5 DP (previously displayed
  as 10 even though engine enforced 5); Young 0, Old/Elder 10 unchanged.
- All physical rolls remain GM-originated; skill instance proofs, Edit
  invalidation and existing Combat/Magic/G04/CSS remain otherwise unchanged.
- Full current Skill/DP inventory and its remaining gaps are in the separate
  `HMK_v93_208_regresni_protokol_a_inventar_skills_dp_cs.md` document.


## v93.212 GM Bonus Languages (HMK p.48)
Samostatné GM rozhodnutí o volitelných jazykových DP (Young 2, Mature 3, Old/Kúzhai/Sinái 4), rozdělené mezi konkrétní Language Skills. Není deváté oficiální stadium a neobsahuje žádné fyzické hody. Pro Sidhé tabulka p.48 výslovný příděl neuvádí: vyžaduje GM review. Audit append-only a read-only validace při načtení.

## v93.212 Shèk-Pvâr Occupational DP (HMK p.44)
Six primary convocations; Fývria has ten unordered pairs of two distinct Skills (2 DP each); all fixed bases and convocation grants in one canonical OCCUPATIONS register. Parent Guilded Shèk-Pvâr requires the already-implemented physical d6 convocation, then Fývria's bounded GM choice (no new die). See separate regression protocol for remaining Priest/Shaman/Invoker blockers and unverified wealth exceptions.

## v93.212 — religion & arcane occupational branches (HMK pp.40,42–44,47,51,55)
Priest: West Venarian religions (13 variants) and clergy Circle-dependent Wealth die; Shèk-Pvâr: six convocations / ten unique Fývria pair choices; Shaman: Spirit or an actually possessed Talent (20 branches); Invoker: two distinct physically obtained Talents before occupation, plus four tribal subsistence variants. Physical d20/d100 prerequisites can now be recorded at Step 11, credited at the official Stage 2/8. Local untranscribed pantheons and parent Invoker's special 4×d20 rule remain explicit GM review. See v93.212 Czech acceptance report.


### v93.215 – pravidlová kontextová nápověda
Ve všech 14 krocích je u editovatelných polí kontextové tlačítko ? otevírající malý dialog s pravidlovým účinkem, fyzickým hodem a stranou původního HMK v1.2. Texty jsou stručná česká vysvětlení, nikoli plošně dokončený doslovný přepis. Neověřené výjimky jsou explicitně GM review. Dialog neprovádí žádný zápis.


### v93.216 – podmíněné Family Priest DP
Parent Priest: volba náboženského suboccupation je u ověřených pantheonů omezena na dostupná náboženství. Ve Family Skills se generický Ritual nyní eviduje jako konkrétní Ritual příslušné víry; limit ½ Occupational DP i pětibodový rozpočet platí beze změny. Současně jsou blokovány podvržené jiné Ritual. Nepřepsané pantheony a Parent Invoker (4 fyzické d20, nejvyšší) zůstávají GM review. Neprovádí se žádný skrytý hod.

### v93.217 — Parent Invoker × four physical Talent d20 (HMK p.42)

Verified special printed **Family “Skill”**: offspring of an Invoker roll four actual Talent Possession d20 and use the highest, rather than treating this as four automatically granted Talents. The highest is evaluated through the existing p.40 physical d100 Talent table, in the same **Arcane Talent Skills stage** and DP ledger. Step 11 prerequisite entry and Step 12 Skill entry accept the four physical d20; normal parents still require exactly one physical d20. Invalid dice, missing or excessive d100, edited highest-roll proof and stale family proof are rejected atomically. Edit across Invoker/non-Invoker invalidates the active Talent proof while retaining append-only history; UI help and source calculation remain single authority. No RNG or extra DP stage. Future character quick-generator requires explicit **test/simulated dice** classification and must never represent generated dice as GM physical dice.


## v93.218 — Parent Shaman + inventory slot edit
Verified p.44 Shaman family named Ritual, Spirit or physically possessed Talent, and owner-bound atomic inventory edit preserving the opened character sheet. No new virtual GM dice.


### v93.219 — Parent Arcanist Family Skills
Fyvria: výběr dvou doložených dovedností, ostatní konvokace z fyzického d6; mapování rodičovského Arcanista z fyzického d20 na původní profesní balíčky bez druhých DP.

## v93.240 — oprava formulářů inventáře a orientační počáteční výbava generátoru

- **Opraven přesun předmětu mezi `off_hand` a `main_hand`.** Ve v93.239 mělo skryté pole `name="id"` stejný název jako DOM vlastnost formuláře `form.id`. Při odeslání se tedy místo řetězce ID formuláře vracel element, submit handler nepoznal formulář a prohlížeč provedl standardní GET navigaci. Pole je nyní `inventoryId`; kontrola používá `getAttribute('id')`. Oprava je ověřena skutečným klikáním v izolovaném Chromium (včetně obsazené ruky).
- **Analogická oprava editace deníkového záznamu** (`journalId`), která měla stejnou kolizi.
- **Automatické počáteční vybavení:** generátor při úspěšném dokončení vybere skutečné katalogové oblečení a základní zásoby, u bojových povolání též cenově dostupnou zbraň a lehkou zbroj. Předměty se zapisují do **existujícího inventáře téhož charakteru** a mají odkazy na pevné tištěné definice. Pořizovací rozpočet je maximálně `Wealth × 100d` dle tištěné strany 51 HMK v1.2; původní Wealth, coins a historie hodů se nemění. Výběr konkrétní kombinace není pravidly přikázaný a jde o konzervativní **orientační balíček**, který hráč může upravit. Pro Wealth 0 nevzniká vymyšlené bezplatné inventární vybavení.
- **Referenční katalog:** dostupné cenově doložené položky Expedition Equipment (s. 120) a Craft Items (s. 121) byly doplněny jako neměnné referenční definice do společné knihovny, bez změny existujících uložených snapshotů.
- **Stav univerzálního generátoru:** v93.240 stále používá omezené Folk/regionální cesty a sedm předchozích profilových zaměření. Detailní checkboxy fyzických a povahových rysů, volný text/AI i pravděpodobnostní pokrytí všech tabulek zatím **nejsou implementovány**. Nepovažovat za dokončený univerzální generátor HMK.
- **Regrese:** 16/16 prohlížečových generování se simulovaným `localStorage`, samostatná browser regrese přesunu předmětů a editace deníku, 442 kontrol plánovače výbavy a zděděná sada 317 024 kontrol. Skutečný hosting s reálným `localStorage` zůstává k ověření po nasazení.


## v93.244 — ovládání rozpracované tvorby z karty konkrétní postavy

- V registru postav je tlačítko **Pokračovat v tvorbě** součástí akcí každé **rozpracované** postavy; má její vlastní `data-resume-creation` ID.
- Po dokončení průvodce se na kartě mění na **GM kontrola tvorby**; u `complete` a `auto-generated` se zobrazuje **Upravit tvorbu**. Postavám bez vytvořeného `hmk.creation` se neslibuje neexistující možnost pokračování.
- Odstraněn duplicitní společný panel rozpracovaných postav i nepřesný rychlý odkaz z levé navigace. Nové UI nepřevádí stav mezi postavami a nemění uložená data.
- Zachovány původní handler `resumeCreation` s kontrolou aktivní Initiative, Character Sheet/Edit, všechna tlačítka Záloha/Kopírovat/Archivovat a pravidlový engine.
- Ověření: renderovací a modulové testy, izolované klikání přes Chromium s `page.set_content`; **nejde o úplné nasazené E2E ani ověření skutečného místního úložiště**.

## v93.244 — regrese Character Creation a lokální rozbor volného popisu

- Základ výhradně produkční archiv v93.243. Pravidlové tabulky a algoritmus validace 14 kroků nejsou nahrazeny.
- Rozšířený offline český lexikální analyzátor chápe lokální zápory, konkrétní profese, doporučené dovednosti, Folk, věk a nabídky Sunsign Traits. Identifikuje také všech 122 checkboxových rysů v jejich narativní podobě. Jde o **heuristiku, nikoli jazykový model ani záruku přesného porozumění všem volným větám**.
- Interpretace používá pouze povolené přímé volby (např. Folk, Age, Sunsign Trait, Morality) a preference v legálních Occupational/Skill možnostech; nikdy nemění zákonné d100/d20/d6, Attribute Score, sociální status ani Wealth, aby násilně vyhověly popisu.
- Nový průběžný náhled vysvětluje interpretovaný profil, profesi, navrhované dovednosti, Folk, věk, aspirace atributů a míru jistoty. Výklad s citovanými výrazy se ukládá k vygenerované postavě; neuskutečnitelné preference jsou uvedeny v poznámce.
- Kompletní doménová regrese 14 kroků je přiložena samostatně (jeden celý základní lidský archetyp s obnovou z JSON na definovaných kontrolních bodech). Dřívější sada společenských tříd, Parent Arcanist a inventáře zůstává zachována.
- Klikací browser-fragment test byl proveden nad skutečným produkčním generátorovým dialogem, parserem a náhledem. Plná navigace na localhost/file je blokována administrátorem prohlížeče, a proto nejde o plnohodnotné produkční E2E.
- K dokonalému porozumění neomezeným přirozeným větám by byl nutný jazykový model integrovaný s přísně validovaným převodem jeho strukturovaných výstupů do stávajícího HMK enginu. Žádná taková externí AI zde není aktivní.
