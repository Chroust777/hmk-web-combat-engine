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
