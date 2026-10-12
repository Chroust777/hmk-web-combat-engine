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
