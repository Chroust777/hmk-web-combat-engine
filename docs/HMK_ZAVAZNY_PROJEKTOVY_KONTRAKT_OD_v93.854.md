# HMK Web Combat Engine — závazný projektový kontrakt (od v93.854)

**Datum:** 12. 11. 2026  
**Rozsah:** celý HMK Web Combat Engine / Keeper’s Ledger: Combat, Skills, Cestování, Kalendář, Zdraví, Inventář, Zvířata, Zásoby, Chronicle a cloud.  
**Status:** soupis výslovně potvrzených projektových omezení a priorit vlastníka. Není novou verzí pravidel HMK ani povolením automaticky měnit zdrojový kód.

## 1. Hierarchie autorit — povinné při každém auditu

1. **HârnMaster v1.2** je výchozí a jediná externí pravidlová autorita pro mechaniku a tabulky.
2. **Výslovně schválená projektová/GM odchylka má přednost** před doslovným HMK v1.2 právě ve svém vymezeném rozsahu. Při auditu podle PDF je zakázáno ji „opravit“ zpět na tiskovou podobu.
3. **Existující schválené a funkční chování** musí být zachováno, dokud není doložena opravdová chyba nebo nové výslovné rozhodnutí vlastníka.
4. Rozlišovat v auditu: **[PDF]** přímé pravidlo, **[VÝJIMKA]** schválená projektová odchylka, **[IMPLEMENTACE]** časový/technický převod, **[NÁVRH]** dosud neschváleno, **[NEOVĚŘENO]** neprokázáno.
5. V případě konfliktu starší poznámky s novějším výslovným pokynem vlastníka rozhoduje **novější výslovné rozhodnutí**. Bez opory v rozhodnutí nic nedomýšlet.

## 2. Potvrzené výjimky a systémové invarianty

- **[VÝJIMKA] Minutový model:** činnosti a cestovní epizody používají libovolně dlouhé celé **minutové** intervaly, nikoli povinné čtyřhodinové hlídky/bloky. Tištěné časové jednotky HMK slouží pro proporční přepočty; zachovat i zlomkové zbytky ve výpočtech.
- **[VÝJIMKA] Různě dlouhé souběžné činnosti/skupiny:** v jednom sdíleném časovém okně mohou mít skupiny a jednotlivci odlišné skutečné časy a události. **Kalendář je jediná autorita času**. Zachovat přesnou minutu události, nevytvářet duplicitní posuny, nerozdělovat nebo nevymýšlet nové dílčí hody.
- **[VÝJIMKA] Poškozený/rozbitý předmět:** nesmí se automaticky plánovat, odpočítávat ani prohlašovat za dokončenou pevná oprava **4 h / 240 min**. Předmět zůstává v doloženém stavu do **výslovného rozhodnutí GM, kdy a zda je opraven**. Starší výklady implikující automatickou čtyřhodinovou opravu jsou pro současný projekt **neplatné**.
- **[VÝJIMKA / KONTRAKT] GM je autoritou výslovných rozhodnutí:** žádné automatické potvrzení akce, následku, času, přidělení ★ ani opravy jen vyplněním/výběrem pole; každá relevantní změna vyžaduje určené potvrzovací tlačítko. Automatizovat lze bezpečně známá fakta, ne nedoložená GM rozhodnutí.
- **[KONTRAKT] Skutečné kostky a doklady:** bez fingovaných, doplňovaných či znovupoužitých hodů. Generování softwarové kostky samo o sobě nepotvrzuje test. Neoprávněné hodové prvky jsou deaktivované; datum/hod nesmí přeskočit povinný test.
- **[KONTRAKT] Autoritativní specializované moduly:** Cestování/Kalendář vytvářejí nabídky/odkazy na Skill Tests, Combat, Zdraví/Exposure; nevytvářejí duplicitní nezávislou logiku hodů nebo paralelní zdravotní formuláře. Treatment/Healing/Infection zůstávají ve svých modulech.
- **[KONTRAKT] Transakční uložení:** žádný čas, zásoby, inventář ani zdravotní změna natrvalo před dokončením potřebných potvrzení; více skupin uzavře společné okno přesně jednou. Zachovat jednotlivá ID postav, ran, epizod a dokladů, kalendář, historii, cloud a kompatibilitu starších kampaní.
- **[KONTRAKT] Fatigue:** pravidlový příděl je automatický; ruční `Edit` slouží jen k výjimečné opravě GM, nikoli jako standardní náhrada výpočtu.
- **[SCHVÁLENÁ UI VÝJIMKA] NPC:** při založení se přednastaví výchozí zajištěné prostředí. Změna se potvrdí jedním určeným společným tlačítkem; po potvrzení se propojí se zásobováním automaticky. Volba „Ano – neřešit nedostatek“ zůstává samostatně dostupná i mimo zajištěné prostředí.
- **[KONTRAKT] UI:** červeně označit skutečné chybějící/chybné pole a zajistit funkční navigaci k němu; žádné skryté povinnosti či nedosažitelná tlačítka. Změna textu, focus, Enter, přepínač nebo checkbox nikdy samy nepotvrdí dokončení. Nevracet odstraněné nadbytečné checkboxy/ⓘ a bílé tooltipy; chránit stávající pergamenovou grafiku.

## 3. Povinná metodika auditu — zejména pro Combat

1. Otevřít skutečný poslední **FULL** a stávající projektové standardy; **před auditem sestavit registr výjimek** z tohoto dokumentu a platných doložených rozhodnutí. Každou kontrolovanou větev označit PDF/výjimka/implementace.
2. Zmapovat **celou cestu dat a závislostí** (vstup → pravidlový výpočet → výhody/modifikátory → formulář a tlačítka → potvrzení → následné moduly → uložení → načtení → historický validátor). Neopravovat pouze lokální symptom.
3. Nezávisle porovnat s pravidly HMK v1.2, ale **nikdy nepřepsat schválenou odchylku**. U specifických tabulek ověřit originální stránku PDF, nejen extrahovaný text.
4. Kombinatoricky pokrýt dosažitelné varianty: F/CF/S/CS, 0–5 ★, kombinované modifikátory a povinné Bearing, více postav a skupin, zvířata, následky a řetězce, překryv časů, neplatné vstupy, změny formuláře a návraty mezi moduly. Pro Combat rozšířit pokrytí na všechny skutečné větve a řetězení s dopady do zdraví/inventáře.
5. Každou chybu nejdříve **reprodukovat na původním buildu**, teprve poté malá cílená oprava; přidat trvalý test této chyby.
6. Zkoušet **reálné Chromium E2E klikání** přes všechny vstupy, dostupnost/disabled tlačítek, červené pole, navigaci, kostky, důkazy, potvrzení, uložení, obnovení a pokračování. Strojové asserty nejsou browser testy; izolovaný cold-load není totéž jako skutečný reload URL.
7. Znovu spustit *všechny* relevantní dříve uzavřené regrese a ověřit integritu historických kampaní (v izolované kopii, nikoliv v živém cloudu). Výsledky uvádět přesně jako **PASS/FAIL/SKIP/BLOCKED/NEOVĚŘENO** bez tvrzení o 100% pokrytí bez důkazů.
8. **Release až po kontrole konfliktů PDF × výjimka × implementace**, při zachování grafiky, datových ID, inventáře, zdraví, cloudové kompatibility a jediného časového zápisu.

## 4. Balíčky a přenos mezi chaty

- **PATCH:** výhradně produkční změněné/přidané soubory, které má uživatel skutečně nahrát do veřejného GitHub repozitáře; zachovat přesné relativní cesty. **Nikdy do PATCH nedávat PNG, JPG, JPEG, WebP ani jiné obrázky, i kdyby se změnily;** nikdy testovací screenshoty, `.py` skripty, vývojové/testovací `.json`, logy, QA důkazy, interní testovací nástroje nebo auditní reporty. Potřebná změna produkčního obrázku se hlásí a předává zvlášť.
- **FULL:** čistá kompletní produkční aplikace, včetně obrázků skutečně potřebných ke spuštění; žádný QA balast. Bez nevyžádaného mazání údajně nepoužívaných souborů bez prokázání absence závislostí.
- **QA:** pokud je potřeba pro budoucí reprodukci, samostatný archiv testů a důkazů mimo PATCH i FULL; při novém chatu není zaručen přístup ke všem starým lokálním souborům.
- **Zpráva o auditu:** samostatně, s pravidlovou stránkou, seznamem změn, počty testů, otevřenými větvemi a případnými omezeními. Kontrolovat CRC/SHA-256 a bitově přesný produkční rozdíl mezi předchozím FULL + PATCH a novým FULL (jen u produkčních souborů, bez QA).
- **Soukromý GitHub Cloud:** nemaže se ani nepřepisuje kvůli regresi bez výslovné potřeby a souhlasu; uživatel nechce preventivní zásahy do synchronizace. Před aktualizací skutečné kampaně záloha cloudového JSON.

## 5. Zajištění úplnosti

Tento soupis obsahuje **doložené, explicitní projektové odchylky a jejich ochranné invarianty**, nikoli tvrzení, že jsou v něm bez výjimky popsána všechna historická rozhodnutí z každého starého chatu. Než začne plošný audit, doplnit další výslovně schválené odchylky nalezené v aktuálním kódu, stávajících projektových dokumentech a poslední předávce; nikdy automaticky neprohlásit nezdokumentovanou odchylku za chybu proti PDF.

**Návazné zdroje v současném FULL:** `docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md`, `docs/PRAVIDLO_POTVRZOVANI_GM.md` a auditní zprávy. V případě rozporu s jejich starším technickým pokynem k balení nebo automatickým opravám platí novější výslovná rozhodnutí vlastníka uvedená zde.

## 6. Schválená zásada pro jednoduché a navazující hody (17. 11. 2026, po v93.921)

**[NOVÉ VÝSLOVNÉ ROZHODNUTÍ VLASTNÍKA – ZÁVAZNÉ]** Formulář, který potřebuje jeden běžný hod nebo dva jednoduché nezávislé hody (například **Denní počasí kampaně: teplota d10 + srážky d10**), zachovává **původní viditelná a editovatelná pole**, u každého své **původní funkční tlačítko generátoru**, a **jediné závěrečné tlačítko k potvrzení**. Nepřidávat žádnou druhou mezizadávací buňku, samostatný červený panel „ČERVENÝ AKTIVNÍ KROK“, tlačítko „Vložit hodnotu“ ani deaktivaci původních generátorů. Obdobně u jednoduché GM změny počasí a jednotlivých jednoduchých zdravotních hodů. Generátor hodnotu vyplní, ale sám o sobě *neukládá* konečný výsledek.

**[KONTRAKT – SOFISTIKOVANÉ PROCEDURY]** Červený aktivní krok, samostatné potvrzení každé kostky a blokace dalších nepříslušných zadání jsou určeny pro **opravdu vícekrokové, řetězené nebo podmíněné** procedury (zejména cestovní hazardy, návazné Skill Tests, podmíněné zdravotní/alkymistické/Esoterica větve). Navádění musí probíhat **v kontextu původního relevantního formuláře**, pokud to jde; bez duplicitních generátorů a dalších zavádějících zadávacích oken. Rozhoduje skutečná nutnost pořadí a povinných důkazů, nikoli obecná přítomnost d10 nebo d100. Automatický „dekorátor“ nesmí potichu měnit původní jednoduché UI.

**[PODKLAD PRO KAŽDÝ DALŠÍ PATCH]** Před vydáním regresně ověřit jednoduché formuláře (teplota a srážky, GM změna počasí, jednotlivé zdravotní hody) **i** komplexní řízené postupy; oba druhy musejí zachovat původní generátory, řádné potvrzení, původ hodu, stav v deníku a jediný časový zápis. Při každém dalším patchi, kde se tento globální standard mění, zahrnout aktuální soubor `docs/HMK_ZAVAZNY_PROJEKTOVY_KONTRAKT_OD_v93.854.md` do předávaných souborů a uvést změnu v manifestu. Podle výslovného přání vlastníka bude tento právě aktualizovaný soubor přiložen i k následujícímu patchi.

## 7. Doložená časová návaznost chirurgického krvácení (v93.923, 17. 11. 2026)

**[ZÁVAZNÝ REGRESNÍ INVARIANT]** Pokud následkem potvrzeného Surgery nebo Grievous Extraction (F/CF) vznikne **nové** krvácení, počítá se první povinný pětiminutový interval **od doloženého konce zákroku**, nikoli od dřívějšího okamžiku původního úrazu. Identita a původ původní rány se zachovávají; pro nové krvácení musí existovat nezměněný Treatment doklad s potvrzeným `procedureTime.endMinute`. Chybějící důkaz nelze nahradit odhadem ani bojovým kolem. Nesmí vzniknout zpětně splatný Blood Loss dříve, než bylo krvácení vytvořeno.

**[ZÁVAZNÝ REGRESNÍ INVARIANT]** Omezování opakovaného **Treatment** na vyšší Physician Index se **nesmí přenášet do Blood Stoppage**. Staunch a Cauterisation mohou provést skutečně způsobilí léčitelé dle této procedury, včetně předchozího operatéra, pokud tomu nebrání jejich aktuální zdravotní stav a další skutečné povinnosti. Při výběru léčitele pro další samostatný Treatment omezení vyššího Indexu nadále platí.

**[OVĚŘIT V DALŠÍCH REGRESÍCH]** Celý řetězec SUR/EXT → nové krvácení → zahájení Blood Stoppage → přesně 5 minut kalendáře → skutečný Physician d100 → podmíněný Blood Loss d100 → případný Shock; žádné další samovolné posuny času. Zachovat globální pravidlo z části 6 o jednoduchých a složitých hodech a zákaz zásahů do Combatu bez výslovného pokynu.


## 8. Jednoduchý okamžitý Shock Reroll a podmíněná Coma (v93.924, 17. 11. 2026)

**[SCHVÁLENÁ UI ZÁSADA – konkrétní aplikace sekce 6]** Jediný d100 pro **STN/INC Shock Reroll po zastavení všech Bleederů** a jediný d100 **Extended Shock Course** musí zachovat původní viditelné pole, původní tlačítko generátoru a jediné závěrečné potvrzení. Obecný průvodce nesmí schovat vstup za červený meziformulář. Podmíněný **UNC + CF → skutečný Coma d10** a **Coma Course → nový d10 intervalu pouze při pokračujícím kómatu** zůstávají řízenými řetězci; veškeré potvrzení nesmí být přeskočitelné. Nepřidávat automatický čas, Combat události ani duplicitní hody.

**[REGRESNÍ INVARIANT]** Prokázaný řetězec Surgery F → nově vzniklý Bleeder → Staunch 5 minut → Physician S → Blood Loss F → INC → okamžitý Shock S → STN → Shock CS po potvrzené následující akci → NONE. Všechny zdravotní zápisy v jedné časové ose, opětovné načtení a nulový další minutový posun při obou Shock hodech.


## 9. Opakované krvácení a Direction Hazard – regresní invarianty (v93.925, 17. 11. 2026)

**[REGRESNÍ INVARIANT]** Každá nová epizoda Bleederu založená řádně potvrzeným Treatment dokladem s `bleedingAfterTreatment=true` vyžaduje *nový* první Blood Loss až pět minut po přesném `procedureTime.endMinute` tohoto zákroku; platí to i pro SUR **CS** s nízkým Physician Index, pokud originální pravidlový výsledek opravdu krvácení vytváří. Nikdy neobnovovat již uzavřený termín po předchozím Staunch. Doložit shodné ID rány, kampaň, původní čas konce léčby, skutečný Medical Receipt a výsledek krvácení. Chybějící/nepotvrzené doklady se nesmí nahrazovat odhadem a nesmí obejít autorizované kalendářové blokace ani dříve zahájený Staunch. Pravidlovou tabulku Surgery **neměnit**.

**[REGRESNÍ INVARIANT]** Při chybějícím Bearing se požadavek na Direction Hazard d10 vytváří dříve, než lze sestavit úplný cestovní výsledek. I při neúplném preview musí být u viditelné *původní* cestovní d10 dostupné tlačítko pro samostatné potvrzení přesného počtu povinných kostek, nikoliv disabled kvůli staré hodnotě `data-episode-expected-rolls=0`. Následně skutečné d10 1–4 vede k Lost Time, 5–9 k Misdirection s vlastním potvrzeným směrem/Awareness či pokračováním bez Awareness, 10 k Lost; potvrdit celý cestovní interval jen jednou a zachovat všechny doklady. Toto patří k sofistikovanému cestovnímu řetězci podle sekce 6, **nikoliv** k jednoduchému počasí.

**[SCOPE / NEOVĚŘENO]** Výsledky izolovaného Chromium browser testu jsou důkazy klikání v reálném UI založeném na aktuálních zdrojích, ne důkazy HTTP cold-reload z GitHub Pages. Evidence registrovaného nepohyblivého koně musí při další E2E obsahovat skutečné pořízení ve Stáji, identické autoritativní ID zdravotního profilu, reálný vozík/postroj, naložení v inventáři Stáje, přesun času, následné zdravotní události a opětovné načtení. Dokud není dokončen, neprohlašovat za uzavřený.

## 10. Trvalý standard oprav bez překryvných vrstev a duplicit (výslovně schváleno 18. 11. 2026)

**[NOVÉ VÝSLOVNÉ ROZHODNUTÍ VLASTNÍKA – ZÁVAZNÉ PRO CELÝ PROJEKT]** Tato sekce platí pro veškeré budoucí zásahy do **CSS, HTML, JavaScriptu, modulů, integrací a pravidlových průvodců** HMK Keeper’s Ledger. Doplňuje, nikoli ruší, sekce 1–9 a ostatní již schválené projektové výjimky. Účelem je odstranit opakování chyb způsobených překryvnými opravami při zachování stávajících funkčních postupů, dat kampaní a HMK v1.2.

**10.1 Jeden autoritativní mechanismus, nikoliv vrstvení náplastí.** Každý společný ovládací prvek, potvrzovací mechanismus, pravidlový stav nebo vizuální parametr má mít jasně určený **jediný autoritativní zdroj** (komponentu, funkci, modul nebo CSS deklaraci). Při zjištění chyby se **přednostně opraví její původní zdroj**. Je zakázáno bez doloženého důvodu přidávat další překrývající CSS pravidlo, dodatečný JavaScriptový posluchač/dekorátor nebo alternativní implementaci téže věci pouze proto, aby se zamaskoval symptom. Nový soubor/modul je přípustný, **jen když má jednoznačnou odpovědnost, je správně napojen, nahrazuje nebo skutečně sdílí dosavadní chování a nemá konfliktního souběžného správce**.

**10.2 Povinné zmapování závislostí PŘED úpravou.** U každé chyby zjistit a zdokumentovat: (a) odkud vzniká DOM/prvek, (b) které CSS selektory na něj skutečně působí, včetně pořadí načítání, specifity a `!important`, (c) které JS funkce, delegované event listenery a stavové validátory jej ovládají, (d) kdo rozhoduje o aktivním kroku, potvrzení, ukládání a navazujících voláních, (e) kde všude aplikace totéž řešení používá. Rozlišit **skutečnou příčinu** od **viditelného projevu**. Neopravovat jen jednu instanci sdílené chyby.

**10.3 Původní chybný kód odstranit nebo přímo nahradit.** Pokud byl původní blok, deklarace nebo modul věcně nahrazen, odstranit jeho nefunkční/duplicitní části, upravit volající a importy, zkontrolovat pořadí načtení a neponechávat skrytou druhou implementaci, která může být částečně aktivní. **Žádné neprověřené mazání:** odstranit lze jen část s prokázanou nepoužívaností a bez dopadu na jiné situace, historická data či kompatibilitu; jinak konflikt vyřešit vědomě v původní autoritativní implementaci a zdokumentovat, proč musí starší část zůstat. Nepřidávat nový stylesheet jen kvůli přebití starého.

**10.4 Bez CSS války a falešné globality.** Pro společné prvky používat centrální vizuální tokeny/komponenty a jasně vymezené stavy (`required`, `invalid`, `disabled`, `hidden`, `confirmed`). Nepřidávat řetězce protichůdných deklarací, stále silnější selektory nebo `!important` jako dlouhodobé řešení. Po zásahu ověřit **výsledný computed style** v reálném prohlížeči, nikoliv jen text CSS. Červený požadavek má označovat **konkrétní dosažitelný vstup nebo potvrzení**, nikoli obal překrývající generátor, checkbox nebo tlačítko. Skryté/uzavřené kroky nesmějí znovu oživovat jiná pravidla.

**10.5 Sjednocené hodové UI a postupné řetězení.** Kde pravidla vyžadují individuálně potvrzovaný hod, musí existovat **jeden sdílený a funkční vzor**: ruční pole → stávající generátor správné kostky → výslovné „Vložit hodnotu/číslo“ → samostatné vyhodnocení/potvrzení dle procedury. Generátor nikdy není potvrzením. Následující podmíněný krok se odemkne až po přijetí předchozího důkazu; dříve přijatý hod se sám znovu nenabízí. V Cestování se při aktivní povinnosti nabídne **pouze aktuálně relevantní dostupný vstup** a další možnosti zůstanou neaktivní/skryté, **pokud nejsou skutečně nezávislé a současně přípustné podle HMK**. Opravy mají platit **pro všechny uživatele společné komponenty**. Respektovat však výslovnou výjimku sekce 6: **jednoduché nezávislé hody** nemají získat zbytečné mezikroky.

**10.6 Potvrzování bez slepých uliček.** Zadání hodnoty, změna checkboxu nebo vygenerování čísla nesmějí samy posunout proceduru ani uložit závaznou skutečnost; rozhoduje existující určené potvrzovací tlačítko. U každého povinného kroku musí být viditelná a dosažitelná právě ta kontrola, kterou validační stav vyžaduje, včetně potvrzení **minuty skutečné události, změny trasy, navazujícího Skill Testu a návratu do nadřazené činnosti**. Aktivní `disabled`/`hidden` stav ověřovat i proti eventům a načtenému JSON, ne jen proti vzhledu. Žádná vrstva nesmí potlačit legitimní potvrzení ani neúmyslně umožnit předčasný zápis.

**10.7 Povinná regrese celého společného mechanismu.** Nejprve reprodukovat chybu na původní verzi, poté ověřit opravený scénář **skutečným klikáním** v lokálním Chromiu; projít **všechny identifikované formy použití sdíleného prvku**, stavy prázdný/neplatný/čekající/potvrzený, ruční zadání i generátor, desktop i úzký mobil (včetně 320–375 px), skrytá pole a obnovení z uloženého rozpracovaného JSONu. Dále kontrolovat návaznost, idempotenci, jediný časový zápis, původ a neměnnost skutečných hodů, navazující Health/Combat/Inventář/Skills. Bez prokázání všech variant je označit **NEOVĚŘENO**, nikoli „globálně opraveno“. Neúspěšné historické testy oddělit od nových regresí porovnáním s původním buildem.

**10.8 Povinný audit odstraněných a ponechaných vrstev.** Každý opravný PATCH musí ve **zvláštní auditní zprávě** uvést: (1) skutečnou příčinu chyby; (2) původní soubor/funkci/deklaraci; (3) co bylo **upraveno**, co **odstraněno**, co **nově přidáno** a proč; (4) zda zůstává starší kód a **proč je stále potřebný**; (5) seznam ověřených užití stejného mechanismu a výsledky PASS/FAIL/BLOCKED/NEOVĚŘENO. Je zakázáno tvrdit, že oprava byla „globální“, pokud byly otestovány jen vybrané případy.

**10.9 Způsob předávání a zachování dat.** Předat jen skutečně změněné produkční soubory se správnými relativními cestami; soubory určené k odstranění **explicitně vyjmenovat**, protože nahrání ZIPu na GitHub staré soubory samo nesmaže. Nové globální pravidlo nemá samo o sobě povolení měnit pravidlové výpočty, stávající funkční grafiku, schválené GM výjimky ani uložené kampaně. **Tento kontrakt je jedním autoritativním projektovým dokumentem**: neodvozovat pro tutéž zásadu druhý konkurenční dokument s odlišným zněním.

**10.10 Přednost a převzetí do dalších chatů.** Toto výslovné rozhodnutí z 18. 11. 2026 má pro metodiku budoucích oprav přednost před starším obecným doporučením „přidej CSS přepis“ či jinou technickou zkratkou. Nelze z něj však odvozovat změnu pravidel HMK v1.2 nebo předchozí výslovně schválené UI výjimky. Při každém dalším zadání načíst aktuální tento kontrakt z **nejnovějšího uživatelem dodaného FULL ZIPu / přiloženého projektového souboru**; pouhá existence v GitHubu nezaručuje, že jej jiný chat automaticky načte.


## 11. Společný časový interval a samostatné počasí skupin (18. 11. 2026, v93.933)

**[NOVÉ VÝSLOVNÉ ROZHODNUTÍ VLASTNÍKA – ZÁVAZNÉ]** Společný časový interval slouží jen ke stanovení **celkové plánované délky v minutách** a k jedinému závěrečnému potvrzení času. Při založení intervalu **nevybírat ani nevynucovat výchozí globální počasí**, nepřenášet je automaticky do nových skupin.

Každá plánovaná skupina/činnost si před svým vyhodnocením **samostatně vybere platné, již v Kalendáři GM potvrzené denní počasí**. Výběr se ukládá jako vlastnost daného řádku skupiny a zůstává nezávislý na ostatních skupinách; bez platného výběru se pravidlové testy skupiny nespustí. Žádné nové počasí ani nové kostky se tím nevytvářejí.

Odstranit dosavadní tlačítko **„Vrátit skupinu do plánu“**, které bylo přidáno kvůli opravě počasí již rozpracované skupiny, a jeho nevyužitou obsluhu; zachovat běžné možnosti změny plánu **před zahájením testů** i možnost bezpečně zrušit celý neuzavřený interval. Z bezpečnostních důvodů nedovolit nepřiznanou změnu počasí skupiny po zahájení jejích testů ani přepočítání již potvrzených dokladů.

**Kompatibilita:** starší rozpracovaná okna mohou mít v původním sidecaru pole `sharedDefaultWeatherId`; při jejich obnově se ignoruje, ale explicitní `weatherId` již připravených řádků skupin zůstává beze změny. Neměnit autoritu času Kalendáře ani historii kampaně.
