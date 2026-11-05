# HMK Keeper’s Ledger – audit oblékání a návazných UI změn v93.745

## Autoritativní základ
Úpravy navazují na kompletní v93.744 a zachovávají provedený audit vrstvení zbroje. Změny v93.745 se týkají primárně rozhraní a kontextových nápověd; samotné pravidlové algoritmy ochrany a inventáře nebyly měněny pro kosmetickou úpravu.

## Oblékání – potvrzené testy

Prošlo **5/5 cílených integračních regresních sad**:
1. `tools/test_outfit_521.cjs`: 17dílný Plate & Mail, přepočet ENC, duplicitní kusy, změna oblečení, odmítnutí neplatného stavu.
2. `tools/test_outfit_exact_524.cjs`: přesný výběr z nesených/oblečených a z truhly, pravidlově ověřené vrstvení, bez domyšlené optimality.
3. `tools/test_chest_outfit_unified_528.cjs`: výběr z truhly, vlastnictví, ochrana ostatních položek a atomické selhání.
4. `tools/test_printed_outfits_all_521.cjs`: všech dvanáct originálních HMK kompletů.
5. `tools/test_93745_outfit_regression.cjs`: nová regrese běžného oblečení s doloženou koženou vestou a bezpečnostních validačních vlastností.

**Interaktivní testování v lokálním Chromium:**
- 17dílný Plate & Mail, Armour ENC 40: tlačítko nasazení → běžný oděv → návrat ke zbroji, bez zdvojení součástí.
- Výběr z truhly, potvrzení a skutečný přesun do oblečeného inventáře, návrat k běžnému oděvu, zachování vlastnictví, srovnání počtu inventárních záznamů.
- Tyto klikací testy používají syntetickou postavu a v testovacím obalu přeskočí pouze validaci její kompletnosti v Character Creation. Ověřené produkční algoritmy oblékání, ověřování vlastnictví a výpočtu zbroje nejsou přeskakovány. **Nejde o přístup ke skutečnému GitHub Pages.**

**Historické testy `test_auto_outfit_520.cjs` a `test_auto_outfit_521_regression.cjs` zůstávají jako historické, neoznačené PASS**: vyžadují oděv výhradně z látky a mají pevná očekávání starých textů/verzí. Nová regrese 93.745 obsahuje aktuální podloženou klasifikaci běžných oděvů včetně kožené vesty a kontrolu dalších invariantů.

## UI a kalendář
- **14 skutečných kroků tvorby postavy**: ověřeno vykreslení a hover nápovědy (bez otazníků), u relevantních kroků tlačítka kostek, bez druhého duplicitního generátoru.
- Vstup `d1000` pro region a `d100` byly v lokálním Chromium skutečně vygenerovány do vstupu; výsledek se tím sám neukládá. Používá se kryptografický generátor a kontrola dostupnosti.
- **Modrá tlačítka kostek:** po zjištění přebarvení poslední CSS vrstvou bylo pravidlo doplněno do finálního souboru `hmk-global-ui-93741.css`. Výsledná barva: tmavě modrý gradient, bílé písmo 13px/700.
- **Horní podzáložková menu** Knihovny, Skills i postavy: skutečně naměřená velikost `13px` a font-weight `700`.
- **Modré Primary ML/EML hodnoty v Skills:** skutečně naměřeno `24px` a barva `rgb(23, 70, 108)`.
- **Kalendář:** Řízení času kampaně, Přidat událost GM i Posun času GM jsou pod kalendářem na pravé stránce; ověřeno v DOM lokálního prohlížeče v tomto pořadí.
- **Zkrácená hlavička počasí:** pro déšť bez teplotního rizika naměřeno `Deštivé počasí · Běžná teplota`, nikoli opakované `déšť`; rozdílné denní a noční podmínky se neschovávají.
- Při obnovení stránky / změně obsahu se nepřenáší staré plovoucí okno s nápovědou do nové záložky.

## Technický stav a hranice ověření
- `node --check` produkčních změněných JavaScriptových modulů: PASS.
- **5/5 cílených testovacích sad PASS**; lokální prohlížečové scénáře uvedené výše PASS.
- Plný E2E reálných uživatelských dat, všech historických formulářů a interakce přímo na GitHub Pages **neproběhl**. Tato etapa nic z toho nepředstírá a nemění žádnou uživatelskou zálohu.
- Dvě původní historické sady zůstávají otevřené ke konzistentní aktualizaci; nová ověřená regrese je nenahrazuje potichu.
