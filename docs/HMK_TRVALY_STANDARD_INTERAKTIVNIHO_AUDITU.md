# HMK Web Combat Engine — TRVALÝ STANDARD INTERAKTIVNÍHO A PRAVIDLOVÉHO AUDITU

**Status:** závazný projektový postup pro další opravy, audit a vydání; první obnovené znění 11. 11. 2026.  
**Soubor:** `docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md`  
**Autorita pravidel:** **HârnMaster: Roleplaying in the World of Kèthîra (HMK), v1.2**.  
**Rozsah:** celý HMK Web Combat Engine / Keeper’s Ledger, včetně boje, Skills, cestování, inventáře, zásob, kalendáře, zdravotního stavu, zvířat a kroniky.

> **Původ tohoto znění:** Rekonstrukce z výslovného zadání vlastníka projektu z 11. 11. 2026, dalších doložených projektových rozhodnutí a souborů již obsažených v aplikaci (zejména `docs/PRAVIDLO_POTVRZOVANI_GM.md`, `docs/AUDIT_UI_KONTRAKT_v93.738.md`, `tools/AUDIT_v93.830_tracking_trail.md`). Chybějící původní soubor nebyl k dispozici pro přesné porovnání; níže uvedené znění není předstíráno jako doslovná kopie nedostupného originálu. Nové neodsouhlasené implementační návrhy nejsou závazným pravidlem HMK.

## A. Závaznost a zdroj pravdy

A01. Mechanická pravidla, tabulky, pořadí testů, kritické výsledky a následné povinnosti vycházejí pouze z HMK **v1.2**. Starší HârnMaster ani domněnky se za autoritu nevydávají.

A02. Každé tvrzení o pravidlu doložit konkrétní stránkou, pokud na něm závisí oprava. U tabulky zkontrolovat také originální obraz stránky, nejen extrahovaný text.

A03. **Rozlišovat:** (a) doslovné pravidlo HMK; (b) již schválené projektové/GM rozhodnutí; (c) návrh implementace; (d) neuzavřenou otázku. Nikdy nezaměňovat (c) za (a).

A04. Změnit pouze reprodukovanou a doloženou chybu. Není dovoleno odstraňovat již funkční části, přepsat grafiku nebo měnit datový model bez doložené potřeby a kompatibilní migrace.

A05. Začínat **nejnovějším skutečně otevřeným a prověřeným FULL ZIP**, nikoli odhadnutou verzí nebo dřívějším patchem. Ověřit manifest, zobrazenou verzi, zdroje, browser bundle, dokumentaci a poslední změny.

A06. Otevřenou větev dokončit a zregresovat před přechodem na další; výjimkou je doložený bezpečný BLOCKED s přesným důvodem. Pokračování musí uvést konkrétní další krok, nikoli nepodložené „hotovo“.

## B. Absolutní interakční kontrakt

B01. **Pouhé psaní textu, vložení znaku, smazání, přepis, blur/focus, Tab/Enter, změna čísla, zaškrtnutí, přepnutí radio, výběr v seznamu ani změna postavy nesmějí samy o sobě** potvrdit akci, uzamknout editovatelný návrh, přeskočit test, trvale zapsat výsledek nebo posunout čas.

B02. Každý procesní krok předává **určené explicitní potvrzovací tlačítko**. Před uložením údajů nebo přechodem k povinnému testu se musí rozlišit *pracovní hodnota* a *potvrzená skutečnost*.

B03. Každý skutečný Skill Test má vlastní dosažitelný vstup, vyhodnocení a návrat. Žádné automatické potvrzení po posledním znaku ani po přepnutí fokusu. Zakázaný hod nelze provést ani ručním vstupem, ani softwarovou kostkou, ani syntetickým submit.

B04. Textová pole testovat znak po znaku, včetně diakritiky, oprav, Backspace/Delete, mazání celého obsahu, opětovného otevření a změn fokusu. Rozpracovaný název stopy zůstává editovatelný do stisku **„Potvrdit identifikaci stopy → další test“**.

B05. Čísla testovat přes rozsah, prázdno, hranice, opakované přepsání, vedoucí nuly, nečíselné znaky a zadání výchozí hodnoty. Checkboxy a selecty opakovaně zapínat/vypínat/přepínat; kontrolovat i návrat původní hodnoty.

B06. Každé tlačítko, které se má používat, **skutečně kliknout**; ověřit odpovídající změnu i její absenci před potvrzením. Nestačí zkontrolovat existenci DOM prvku nebo zavolat přímo interní funkci.

B07. Nezobrazovat nerelevantní nebo předčasné povinnosti; chybějící vstup musí zůstat dostupný, srozumitelně pojmenovaný a prokliknutelný. Nepřipustit zmizelé potvrzení, nedosažitelné povinné pole ani permanentní deadlock.

B08. Neuzamykat rozpracované pole po prvním znaku nebo automatickém přepočtu. Jakmile skutečně potvrzený doklad vytváří nevratnou identitu, následné změny musí mít výslovnou a bezpečnou proceduru, nikoli tichou výměnu důkazu.

B09. Interaktivní test vždy kontroluje **čas, zásoby, deník, inventář a zdravotní data před každou explicitní hranicí potvrzení**; pouhé generování softwarového hodu není dokončení akce.

B10. Tlačítka navigace, návratu a otevření související sekce smějí být použita i při nedokončené cestovní transakci; **vyhodnocovací a potvrzovací tlačítka** musejí splnit příslušné podmínky. Navigace sama nesmí potvrdit dřívější krok.

B11. **Jeden krok – jedna postava – jedno potvrzení** tam, kde se eviduje jednotlivý hod nebo následek. Nepřidávat nadbytečné souhlasové checkboxy, pokud už existuje explicitní tlačítko vyhodnocení.

B12. Nevracet odstraněné ikony ⓘ, bílé informační okno nebo další nepotřebné checkboxy. Kontextové vysvětlení u pole nebo tooltip je vhodnější; Injury tooltip zůstává na najetí.

## C. Výslovně schválené výjimky

C01. Při vytvoření NPC se **automaticky přednastaví výchozí zajištěné prostředí**; nejde o zákaz ostatních explicitních potvrzení.

C02. Změny zajištěného prostředí se potvrzují **jediným společným určeným tlačítkem**.

C03. Po tomto výslovném potvrzení se příslušné zajištěné prostředí **automaticky propojí se zásobováním**. Nemá se vyžadovat duplicitní ruční potvrzení stejného faktu.

C04. **„Ano – neřešit nedostatek“** musí být dostupné i **nezávisle mimo zajištěné prostředí**; nesmí být vynucen jeho stav ani tiché propojení.

C05. Žádná další výjimka se nesmí domyslet z pohodlí ovládání: nová automatická akce potřebuje výslovný souhlas vlastníka projektu.

## D. Minutový čas, cestování a výživa

D01. Autoritativní časový model tvoří **libovolně dlouhé celé minutové intervaly**. Systém NESMÍ uživateli vnucovat pevné čtyřhodinové bloky ani pro ně používat označení „hlídka“. Tištěné HMK časové jednotky lze uvést **výlučně jako referenci pro proporční přepočet**, nikoli jako model UI.

D02. Pokud tištěné pravidlo nepopisuje libovolné minuty, musí být přepočet označen **„implementační rozhodnutí / GM adaptace“** a ověřen na hranicích, rozdělení a sloučení intervalů; neztrácet zlomkové zbytky.

D03. Epizoda je **transakce**: v jednom intervalu řešit závazky dané činnosti, dovedností, setkání, následků a hodin. Dokud nejsou dokončeny povinnosti, nedojde k autoritativnímu posunu herního času ani trvalému připsání zásob.

D04. Společné časové okno více skupin musí respektovat účastníky, sdílený čas a skutečnou minutu události. Zdravotní událost může okno zastavit; nepřepočítávat či nevymýšlet staré výsledky dalších skupin.

D05. **Foraging během Pochodu** a **samostatný Foraging bez přesunu** jsou rozdílné kontexty; pro druhý platí Survival/Orienteering **+2 SV** z HMK 145, vlastní získané Foraging Modes a vlastní skutečné d10 podle HMK 147.

D06. Při samostatném Foraging: žádný Progress/Bearing ani ušlá vzdálenost; první dva existující Advantage Modes patří Foraging, další lze podle HMK přidělovat Foraging/Stalking/Vigilance; nevyužít staré d10 nebo dříve získané hvězdy bez doloženého oprávnění.

D07. `none` a `0` jsou **odlišné výsledky**, zejména u potravy/vody; extrémy tabulek, byliny a jednotlivé d10 testovat v každém biotopu a období. Nárok na reálnou položku inventáře není automatický jen z evidenčních food-days.

D08. Survival **CF** při relevantním Orienteering vyvolává doložený **Survival Hazard** (HMK 145/148), včetně dalšího pravidlového větvení Equipment, Accident nebo Complication. Nepřeskakovat ani nenechat dvakrát vyhodnotit totožné CF.

D09. **Tracking CF → povinný Bearing** při příslušném pokračování; zkontrolovat identitu stopy, změnu průvodce a stopaře, časovou souslednost, přenos SV a jedinečnost dokladu. Nepřevzít staré d10/stars při neodpovídajícím kontextu.

D10. Automatické předvyplnění předchozího nastavení je **pouze návrh**. Není důkazem nového testu, automatickým potvrzením ani oprávněním převzít staré hody. Při změně členů, prostředí, podmínek, vedení a typu činnosti zkontrolovat platnost každého jednotlivého přenosu.

D11. Přechod počasí, soumraku, světla nebo jiné skutečné změny podmínek kontrolovat podle konkrétního testu; nevytvářet blokaci nesouvisejícího Pochodu kvůli situaci platné jen pro Tracking.

## E. Skill Tests, Combat, zdraví a navazující moduly

E01. Používat **existující autoritativní** Skill Tests, Combat, Character Sheet a Health & Exposure; nevytvářet duplicitní zdravotní kostky či nové paralelní injury formuláře uvnitř Kalendáře/Cestování.

E02. Zranění vzniká až po skutečných impact/location/AV/injury hodech a potvrzení v původním modulu. Samotný Survival Accident nesmí rovnou změnit Combat State nebo přidat fiktivní Shock.

E03. Každá jednotlivá rána má vlastní ID, lokalitu/stranu a historii; **více ran na stejné lokaci není duplicita**. Zrcadlové záznamy se stejnou identitou nejsou další rány.

E04. Shock, Coma, Treatment, Healing, Infection, Frostbite/Cold Exposure, Heat a Blood Loss musí sledovat skutečné splatnosti, čas, pacienty a následky. Před splatností nejsou přístupné ani ruční hody, ani softwarové kostky.

E05. Automatický zápis faktických návazností je povolen až po potvrzení původní akce a pravidlovém doložení; jinak jen pending, bez trvalého zdravotního efektu. Žádné zdravotní kontrolní d100 z Cestování namísto původního modulu.

E06. Prověřovat všechny návaznosti: **Skill Tests ↔ Cestování ↔ Kalendář ↔ Inventář ↔ Character Sheet ↔ Zdraví & Expozice ↔ Chronicle Spread ↔ zásoby ↔ deník**, včetně napojení na počasí, zvířata a vybavení.

E07. Za žádných okolností nedoplňovat **vymyšlené, náhradní nebo znovu použité** hody. U automatických kostek ukládat původ; u ručních vstupů skutečnou hodnotu, přidělení a čas dokladu.

## F. Závazná metodika skutečného testování

F01. Preferovat úplný **Chromium E2E průchod přes aktuálně sestavené produkční UI** a původní ovládací prvky, od startovní situace přes každý Skill Test až po skutečné potvrzení, reload a kontrolu změn.

F02. V každém procesu testovat pozitivní i negativní větev: prázdno, min/max, F/CF/S/CS, `none`/`0`, výměnu postavy, návrat z formuláře, chybějící doklad, pozměněný záznam, opakovaný submit.

F03. Testovat kliknutím skutečný přechod *tlačítko → další krok → potvrzení → uložený záznam*; interní JS unit test není důkazem dostupnosti tlačítka ani správného interaktivního průchodu.

F04. Měřit **před potvrzením / po potvrzení**: čas kampaně, všechny relevantní ledger stavy, konkrétní JSON/proof ID, počet deníkových událostí, položky inventáře, zdravotní stav a modifikace postavy.

F05. Reload znamená **skutečné obnovení aplikace** se stejným uloženým stavem v browseru, nikoli jen volání `render()` ani serializační roundtrip. Náhradní nové `page.set_content` se musí označit jako izolovaný cold-load test, ne jako plný reload URL.

F06. Pokud prostředí blokuje HTTP/file/data nebo veřejný GitHub Pages, důkaz izolovaného Chromium je užitečný, ale **neoznačuje se za plný produkční E2E**. Omezení popsat a zachovat status BLOCKED nebo NEOVĚŘENO podle skutečnosti.

F07. Testovací fixture a skripty mají být deterministické, zdokumentované a oddělené od skutečných uložených dat uživatele. Testem se nesmí měnit uživatelova živá kampaň.

F08. Po opravě: (1) reprodukce původní chyby; (2) důkaz že selhávala; (3) ověření nového chování v UI; (4) unit/replay/regresní matice; (5) kontrola persistence; (6) ZIP integrita a patch roundtrip.

F09. Každá kontrola dostává jeden z přesných statusů: **PASS** (skutečně proběhla a uspěla), **FAIL** (proběhla a nesplnila očekávání), **SKIP** (záměrně neprovedena, zdůvodněno), **BLOCKED** (blokuje konkrétní známý problém/prostředí), **NEOVĚŘENO** (neprovedena/neexistuje důkaz). Nepřevádět BLOCKED nebo NEOVĚŘENO na PASS.

F10. Evidovat počet skutečně prokliknutých tlačítek a konkrétní obrazovky; neoznačovat pomocné statické asserty jako UI testy, ani opakovaně spuštěný test za další nezávislé pokrytí.

F11. Chyby konzole, JS exceptions, chybějící pole, skryté aktivní tlačítko, neúmyslná změna focusu a `disabled`/`readOnly` patří do důkazů.

F12. Neměnit funkční větve jen proto, aby prošel zastaralý test. Historické FAIL analyzovat zvlášť a odlišit chybu aplikace od neplatného očekávání testovacího skriptu.

## G. Uložení, data, kompatibilita, GitHub

G01. Zachovat původní ID postav, předmětů, ran, dokladů, kampaní a epizod. Nezměnit již potvrzené historické záznamy bez přímé potřeby a migračního důkazu.

G02. Každé dokončení je atomické: žádné dvojité zásoby, duplicitní nová rána, dvojí odečtení materiálu ani druhé posunutí času. Opakované přehrání historických dokladů musí být idempotentní.

G03. Prověřovat JSON import/export, nativní persistence, oddělení postav a kampaní, lokální storage i cloud, ale živé GitHub API nelze vydávat za ověřené na základě simulace.

G04. Přístupové tokeny neukládat do repozitáře ani auditních důkazů. Lokálně šifrované zapamatování tokenu a ruční obnova/změna zůstávají zachovány; bezpečnost posuzovat odděleně.

G05. Pracovní ZIP není GitHub commit: uživatel nahrává rozbalený **obsah souborů při zachování přesných cest**, nikoliv samotný ZIP. Rozlišovat FULL (obnova/záloha) a PATCH (změněné/přidané/odstraněné soubory).

## H. Vydání a předávací protokol

H01. Každé nové vydání obsahuje **kompletní FULL ZIP**, **PATCH ZIP proti právě ověřené předchozí verzi**, auditní zprávu, testovací důkazy a reprodukční skripty.

H02. Zveřejnit SHA-256 pro nové soubory a **stromový test**: po aplikaci PATCH na předchozí FULL je výsledný strom bitově totožný s novým FULL (včetně stejné množiny souborů). Neignorovat smazané soubory.

H03. Ověřit ZIP CRC, bezpečné cesty, duplicity, konzistenci `index.html` / `app.js` / bundle, syntaxi a nezměněné části; aktualizovat cache-busting jen při skutečném vydání.

H04. Auditní zpráva musí uvádět výchozí verzi a zdroj, závady před/po, změněné soubory, pravidlové stránky, scénář, screenshoty, logy konzole, testovací výstupy, SHA-256, regresní výsledky a všechna zbývající rizika.

H05. **Úspěch má přísný rozsah**: „PASS samostatný Foraging ve scénáři X“ neznamená „kompletní HMK bez chyb“. Žádné tvrzení „100 %“, pokud kompletní pravidlové i browser E2E pokrytí není skutečně doložené.

H06. Dokument udržovat v každém následujícím FULL; změny jeho závazných pravidel provádět pouze po výslovném odsouhlasení vlastníkem projektu. Projektové výjimky zachovat i v regresních testech.

## I. Předávka otevřených větví k 11. 11. 2026

I01. Samostatný minutový Foraging: po v93.835 bylo otevřené Survival CF → Survival Hazard, dále všechny navazující Equipment / Accident / Complication, evidence převzetí potravin a vody do konkrétního inventáře a skutečný browser reload URL.

I02. Tracking: otevřený plný klikací scénář **Stalking → Tracking CF → povinný Bearing → další cestovní interval**, výměna průvodce a stopaře, zachování testů, dokazování nových hodů, předvyplnění cestovních voleb a persistence.

I03. Ostatní historické NEOVĚŘENO / FAIL z cílených auditů nejsou tímto dokumentem odškrtnuty. Při pokračování se přebírají jen výsledky s konkrétním reprodukovatelným důkazem.

---

**Zásada před každým novým vývojem:** (1) ověřit aktuální skutečný FULL; (2) identifikovat pravidlo z HMK v1.2; (3) reprodukovat problém přes UI; (4) minimálně opravit; (5) provést skutečné klikací testy i regresi; (6) vydat transparentní důkazy a FULL/PATCH nebo po nalezení dalšího BLOCKED přesně popsat nezbývající kroky. Tento postup nemá výjimku pro „drobné“ opravy.


## Závazná výjimka v93.845 · Equipment Hazard / opravy řídí GM

- Po Equipment Hazardu se zachová originální Survival CF, hod d10, totožnost poškozeného předmětu a skutečný opravářský Skill Test.
- Neúspěšně řešená (F) či ignorovaná výstroj zůstává **rozbitá/nepoužitelná** v původním inventáři (nikoliv automaticky odstraněná); má **WQ 0, pokud má definovanou WQ**. Výsledek CF se označí **neopravitelný**, bez automatického smazání. CS/S znamená opraveno dle skutečného hodu.
- **Žádná aplikací odvozená povinná 240minutová oprava, blokace Pochodu, termín oprav ani automatické čtyři 60minutové intervaly.** Je na GM, zda, kdy a kolik skutečného času později opravě věnuje; aplikace jeho rozhodnutí nepředjímá. Tištěná HMK 148 uvádí referenční časové následky, ty jsou informací GM, nikoliv pevnou aplikací vynucenou povinností.
- Oprava/změna na použitelný stav se děje **výslovným potvrzením GM v Inventáři**, při zachování ID, hodu, původní WQ a účetních dokladů. Nepoužitelný předmět se nesmí vybavit.
- Historická data v93.844, pokud již mají záznamy odpracovaných minut, se nesmějí potají měnit nebo přepočítávat; zpětně se žádné nové povinnosti negenerují.


## v93.846 · Survival Accident se zvířaty – povinná bezpečnost losování

- Nehoda může postihnout postavu **nebo skutečné zvíře** vybrané v původní cestovní skupině (HMK 148). Vůl, tažný kůň a jiná Stable zvířata nesmějí být potichu vypuštěna z množiny obětí, protože jim chybí zdravotní profil.
- Losování vyžaduje jedinečný seznam původních postav a skutečně zúčastněných zvířat s ověřeným aktivním zdravotním profilem stejného ID. Bez něj se nehází ani trvale nezapisuje Injury. Registrace nesmí automaticky vytvářet druhý nezávislý bojový stav nebo přepisovat historii.
- HMK bestiář 355 dokládá u skotu tělesnou tabulku C, AV b6 a Shock 51; u velblouda tabulku C, AV b5 a Shock 42. Tato data jsou odlišná od hodnot koní. U anatomie J (slon) a jiných neimplementovaných tabulek je výsledek **BLOCKED**, dokud není dostupná původní bezpečná procedura, nikoli vymyšlený koňský zásah.
- Počítač nesmí dosazovat fyzické d100/d6/ZD/LD/Shock, měnit potvrzenou kostku ani dokončovat Accident na jiném zvířeti, než které bylo v původním skutečně potvrzeném intervalu.
- Trvalá ochrana Evidence Scope: jiný průvodce, stopař, typ dopravy, nové zvíře ani jiná družina nesmějí nepřímo odmazat Tracking CF → povinný Bearing, přidat nové staré hvězdy nebo znovu použít neplatný d100.

## v93.849 · Uživatelsky schválená změna potvrzování v Cestování (12. 11. 2026)

- B04 se upřesňuje podle výslovného rozhodnutí vlastníka: během rozpracování lze **název stopy zapsat a opravit bez samostatného tlačítka „Potvrdit stopu“**. Zvolenou identitu stopy a oprávnění skutečného stopaře přijme až **„Vyhodnotit epizodu“**. Poté se samostatně provádí skutečný Tracking Skill Test. Editace názvu nebo Enter nesmí sama provést test, vytvořit čas či zápis.
- U Drover se odstraňuje neúčinné navigační tlačítko „Přejít na Skill“; příslušný Riding/Animalcraft se vyžádá v navazujícím explicitním pravidlovém úkolu.
- Každý uživatelem zadávaný / generovaný d4/d6/d10/d100 přímo v Cestování a v jeho navazujících hazards je **rozpracovaný** až do výslovného tlačítka **„Vložit číslo“**. Přepsání prvního znaku ani tlačítko generátoru nesmí posunout proceduru. Zápis počtu hodů (jedna hodnota nebo čárkami oddělené přesné množství) musí být viditelný a kontrolovaný; Double Time END odpovídá počtu započatých hodin skutečného pohybu.
- Rozbalovací nabídka **cíle rozdělení výhod** se po „Vyhodnotit epizodu“ zamkne. Volba **automatického / ručního rozdělení získaných ★** zůstává vědomým rozhodnutím GM; validaci řídí vždy až **situačně upravený Orienteering SV**, nikoli původní Survival SV. Překážka při překročení počtu ★ se musí dát zobrazit a opravit.
- Zobrazení „Veškeré aktuálně požadované výsledky jsou doloženy“ musí odpovídat dostupnému skutečnému potvrzení řádku/epizody. Všechny dosud neodsouhlasené rozepsané hody musí být označeny a nesmí se dostat do uložených dokladů.
- Nadále platí výjimka v93.845: Equipment Hazard nevytváří automatickou 240minutovou opravu, GM rozhoduje o čase.

## v93.850 · Výslovné přidělení ★ a předávání Direction Hazardu (12. 11. 2026)

- Po skutečně doloženém Survival/Orienteering výsledku, který dává kladný počet Advantage Modes, se nejprve vyžaduje **tlačítkem potvrzená volba** automatického či ručního rozdělení; samotný select, Enter ani vyplnění čísel není potvrzením. Ruční režim vyžaduje také výslovné potvrzení přiděleného rozpočtu a dovoluje opravu neplatného návrhu před tímto potvrzením.
- Přechod k následujícím hodům a finální dokončení řádku jsou blokovány, dokud není volba přidělení ★ skutečně potvrzena. Při obnově rozpracovaného dokladu se nepředpokládá skrytě potvrzený výběr.
- Skutečný d10 směru odchýlení má vlastní tlačítko „Vložit číslo“. Pokud ještě čeká obecná GM volba Hazardu, pravý panel **nesmí opakovat požadavek na již potvrzený hod**, ale výslovně nabídne „Potvrdit postup Direction Hazardu“; poté aktuální návaznost Awareness nebo vědomé pokračování mimo trasu.
- Závěr jediné skupiny a společného okna musí zůstat dosažitelný, pokud jsou opravdu vyřešeny všechny závazné úkoly; historie se nesmí doplňovat bez klikacího potvrzení GM.
