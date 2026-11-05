# HMK Keeper’s Ledger v93.744 — pravidlový audit vrstev všech zbrojí

**Základ:** plné vydání v93.743, ověřované proti přiloženému PDF *HârnMaster Roleplaying in the World of Kèthîra* (HMK v1.2). **Cíl:** material legality, přípustnost vrstev a jejich pořadí, anatomická zóna/lokace, rigidita, B/E/P/F, ENC a Bulk, tištěné komplety a předávání do Combat i Cold/Heat Hazard.

## 1. Originální pravidlový základ

- **Strana 111:** základní hodnoty jednotlivých materiálů: C 0/1/0/1, L 1/2/1/3, D 2/2/1/2, Q 4/3/2/3, G 6/5/4/5, K 4/6/5/4, S 4/8/5/5, M 2/8/7/3, P 6/11/9/5. Překryté lokální AV jsou součtem AV vrstev, rigidita má svůj lokální příznak.
- **Strany 112–116:** 15 anatomických lokací, 12 hotových tištěných kompletů. Publikované komplety mají vlastní autoritativní ENC a zobrazené AV; není přípustné je přepočítat jako neověřené vlastní oblečení a bez dalšího zamítnout.
- **Strana 117:** 9 řádků materiálových omezení v pěti sloupcích, max. pět překrývajících se vrstev, D/Q, ``[kp]`` jen paže/nohy, omezený vnější sloupec, **+5 ENC** při D/Q v posledním sloupci. Jeden porušující článek C/D na dotčenou *body zone* může vytvořit **Bulk −5 za zónu**. Příklad Obris: dodatečný Padded Coat nad Mail/Padded znamená **+5 ENC a Bulk −10** (paže, trup).
- **Strana 118:** krytí 92 částí, směrové krytí, rigidní příznaky, zvláštní ENC a PER údaje. Odlišné součásti na různých místech jedné zóny nejsou jedna hluboká souvislá vrstva.
- **Strana 119:** 138 vytištěných kombinací; tabulka má materiály, pokrytí a kombinace, nikoliv příkaz odhadovat skutečné pořadí podle inventáře.
- **Strany 133 a 149:** F-aspect tvoří Area AV vážené 15 anatomickými koeficienty; Cold Hazard používá omezenou Area AV + gear/shelter/fire; Heat Hazard používá jinou, samostatnou Area AV kontrolu. Bonus pláště není obecná F hodnota pro všechna vyhodnocení.

## 2. Katalog 92 částí a 12 kompletů

| Materiál | Počet částí |
|---|---:|
| cloth | 16 |
| leather | 7 |
| padded | 14 |
| quilted | 10 |
| gambeson | 6 |
| kurbul | 10 |
| scale | 9 |
| mail | 9 |
| plate | 11 |

**92/92** původních záznamů má validní zdrojové atributy anatomického krytí; **113/113** součástí všech kompletů je spárováno s p.118. Nejde o nový nezávislý ruční přepis každé grafické značky z PDF; kontrola používá existující vizuálně ověřený katalog a zkoumá v něm úplnost, vnitřní shodu a pravidlové chování. Katalogový export: `HMK_v93.744_ARMOUR_CATALOG_92.csv`.

| Komplet | Součásti | Tištěné ENC | Odvozené ENC | Tištěné PER | Odvozené PER | Počet čl. paže / max. překryv |
|---|---:|---:|---:|---:|---:|---:|
| Clothing | 4/4 | 0 | 0 | 0 | 0 | 1 / 1 |
| Heavy Clothing | 7/7 | 0 | 0 | 0 | 0 | 3 / 3 |
| Quilted Coat | 7/7 | 5 | 5 | 0 | 0 | 2 / 2 |
| Kûrbúl Cuirass | 9/9 | 5 | 5 | 0 | 0 | 3 / 2 |
| Scale Byrnie | 7/7 | 10 | 10 | 0 | 0 | 2 / 2 |
| Mail Byrnie | 7/7 | 5 | 5 | 0 | 0 | 2 / 2 |
| Gambeson | 9/9 | 10 | 10 | 0 | 0 | 1 / 1 |
| Scale Habergeon | 11/11 | 15 | 15 | 5 | 5 | 5 / 3 |
| Mail Habergeon | 8/8 | 10 | 10 | 0 | 0 | 2 / 2 |
| Mail Hauberk | 11/11 | 25 | 25 | 10 | 10 | 5 / 3 |
| Kûrbúl & Mail | 16/16 | 40 | 40 | 15 | 15 | 7 / 3 |
| Plate & Mail | 17/17 | 40 | 40 | 20 | 20 | 8 / 3 |

**12/12 tištěných ENC a PER odpovídá** použitému katalogu. U vyšších kompletů je vidět, proč součet všech odlišných kusů v celé zóně nelze vydávat za počet fyzicky se překrývajících vrstev. Tři komplety ze str. 116 (Mail Hauberk, Kûrbúl & Mail, Plate & Mail) nadále využívají zvláštní pravidlo aplikace pro přesný, nezměněný originální komplet. To **není** všeobecná výjimka HMK pro libovolně upravenou sestavu.

## 3. Exhaustivní audit materiálových pravidel

Z nezávisle zapsané tabulky str. 117 byla vytvořena sada **66 429 uspořádaných materiálových řetězců** délky 1–5 (9 + 81 + 729 + 6 561 + 59 049). Ověřeny byly přímé kombinace, nepřípustné pořadí a teoreticky dovolená jediná C/D Bulk výjimka.

- **118** přímo přípustných materiálových podpisů;
- **426** podpisů s možnou jedinou výjimkou C/D za Bulk (neznamená to automaticky doložený bonus ENC);
- **65 885** kombinací bez takového oprávnění;
- **0 neoprávněných povolení** při porovnání s nezávislou referenční kontrolou;
- **4 případy „unresolved“** v této matici, jejichž přípustnost/ENC závisí na přesném sloupci. Výsledek se bezpečně nepoužije jako Combat/Weather AV.

Pro 138 konkrétních řádků p.119 bylo navíc explicitně zadáno všech pět sloupců: **138/138 PASS**, bez fiktivního Bulk, správné +5 ENC u posledního sloupce D/Q. Bez těchto údajů se některé vrstvy důvodně klasifikují jako *unresolved*.

**Nalezený rozpor přímo v PDF:** u uspořádání ``• / • / D / K / •`` tabulka str. 119 uvádí **P5**, ale ze základních materiálů na str. 111 vychází **P1 + P5 = P6**. Ostatních 137 kombinací podle této účetní kontroly sedí. **Neprovádím tichou korekci originálního PDF ani předstíranou oficiální erratu.** Implementace obecných vrstev používá součet materiálů (P6); tento nesoulad vyžaduje výslovné pravidlové rozhodnutí, pokud GM požaduje doslovné přepsání p.119.

## 4. Skutečné katalogové části: kombinace, Combat, Cestování

- **8 372 orientovaných dvojic** všech 92 částí (každá ze 4 186 dvojic v obou fyzických pořadích): **15 158 PASS**, 0 přiznaných nepřípustných kombinací. Výsledky vyhodnocení: 7 236 compatible, 39 unresolved, 1 097 violation. Bulk se uplatnil u 633 compatible variant; vynucená nedoložená ochrana nebyla zjištěna.
- **49 680 kontrol jednotlivých částí** pro 15 anatomických lokací × 4 aspekty × 3 směry: všechny prošly, včetně nenulového AV pouze při skutečném krytí a rigidních příznaků.
- **50 000 deterministicky generovaných trojic** konkrétních částí v pořadí z inventáře: 33 307 compatible, 401 unresolved, 16 292 violation a **0 falešně potvrzených sestav** proti nezávislé lokální kontrole. Tato podmnožina je testovací vzorek, nikoliv všechny trojice.
- **21 dalších kontrol**: šest odlišných reálných chráničů paží → přípustná sestava → Combat na konkrétních lokacích → Area AV **2** → Cold/Heat Hazard. Optimalizátor správně vybral všech šest; po odejmutí součásti se vážená Area AV znovu přepočítá. Příklad Obris v HMK str. 117 potvrdil **Bulk −10 / ENC +5**.

## 5. Opravený kód

1. `src/integration/armour-layer-evaluation.js`: omezení překryvných vrstev a D/Q se ověřuje pro skutečné anatomické lokace; příznaky Bulk se účtují pro dotčené body zones; nerozhodnutá pozice vnější D/Q vrací „unresolved“, nikoliv nesprávné „violation“.
2. `src/integration/armour-layer-legality.js`: odstraněno nesprávné plošné zamítání více samostatných kusů v jedné zóně.
3. `src/integration/hmk-armour-feasibility.js`: nezávislá kontrola, zda sestavu lze uspořádat, pracuje s fyzicky překrývajícími se kusy.
4. `src/integration/armour-loadout-audit.js`: D/Q výstraha vzniká jen při skutečném překryvu.
5. `src/integration/hmk-outfit-optimizer.js`: odstraněno falešné předčasné vyřazování při >6 **různých článcích v zóně**; zachována horní hranice šesti fyzických vrstev (5 + případná C/D výjimka) v jedné lokaci. Staré odhady optima by jinak mohly být příliš nízké.
6. `src/rules/armour-layer-reference.js`: zpřesněny průvodní poznámky o fyzických překryvech a jedné C/D výjimce na zónu.
7. `app.js`, `index.html` a `hmk-app.bundle.js`: sjednocena verze **v93.744** a obsah distribučního JavaScriptu; předchozí vydání v93.743 ve skutečnosti stále neslo označení `93.742`, což je opraveno.

Při opravě nebyl zaveden nový paralelní stav zbroje ani změněny historicky zaznamenané hody/zranění. Nepřípustné a nevyřešené vrstvy zůstávají pro následné výpočty zablokované.

## 6. Širší regrese a neuzavřené hranice

**37 spuštěných obecných regresních sad, 33 PASS, 4 FAIL**. Starší testy očekávající číslo vydání byly aktualizovány pouze v příslušném kontrolním řetězci, bez úpravy očekávaných herních výsledků. Čtyři stále neúspěšné sady:
- `test_inventory_library_497.cjs` — historická struktura inventáře/rozhraní; nebyl prokázán nový p.117 layer bug a test se nezapočítává jako PASS.
- `test_inventory_stacking_496.cjs` — historická struktura inventáře/rozhraní; nebyl prokázán nový p.117 layer bug a test se nezapočítává jako PASS.
- `test_inventory_ui_498.cjs` — historická struktura inventáře/rozhraní; nebyl prokázán nový p.117 layer bug a test se nezapočítává jako PASS.
- `test_trekking_ui_519.cjs` — historická struktura inventáře/rozhraní; nebyl prokázán nový p.117 layer bug a test se nezapočítává jako PASS.

**Omezení závěru:** Neproběhl doslovný výpočet všech možných inventářů ze 92 kategorií (kombinatoricky řádově `2^92` podmnožin, plus kopie a pořadí); místo toho proběhl vyčerpávající test **materiálových tříd a omezení** a silná reálná matice částí. Nelze současně garantovat každou historickou či vlastní položku v soukromé záloze, chybějící originální pořadí/sloty nebo speciální GM rozhodnutí. Nebyl proveden plný prohlížečový E2E průchod všech částí v93.744 ani přímá interakce s nasazeným GitHub Pages. U tištěných originálních sad jsou zachovány jejich oddělené autoritativní tabulky.

**Nasazení:** PATCH v93.744 se nahraje přes v93.743 do kořene GitHub Pages se zachováním `src/...`, `tools/...`, `docs/...`. Důležité soubory `index.html`, `app.js`, `hmk-app.bundle.js` a všechny změněné moduly musí být z jediné shodné verze. Před nasazením uchovat zálohu kampaně.
