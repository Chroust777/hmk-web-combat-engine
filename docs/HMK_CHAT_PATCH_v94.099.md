# HMK Keeper’s Ledger v94.099 — Chat a kronika družiny

Základ: v94.098. Atlas ani herní pravidla se nemění.

## Rozhraní
- Chat je společné tlačítko v hlavním menu. Otevře samostatné modální dvoustránkové okno s existujícím pergamenem, bez přepnutí herní trasy, volání `render()` či změny kampaně. Zavřít chat / Escape vrátí uživatele na původní formulář; Escape se nepřenese na podkladový Atlas. Rozpracovaná zpráva je uložena v sessionStorage odděleně pro roli a repozitář.
- GM píše vždy pod jménem GameMaster (světle hnědá). Hráč vybírá aktivní PC z registru (bez NPC, bez veterinárních profilů; bílá), případně jméno vytvořené GM s barvou z palety. Správa jmen, barev a tvorba kroniky jsou pouze v GM režimu. Změna/odstranění jména nepřepisuje historické odeslané zprávy. Protože aplikace nemá samostatné účty hráčů, každý hráč může upravovat/mazat ne-GM zprávy; GM všechny. Jde o stejný lokální prezentační model jako v94.089, nikoliv o serverové vynucení rolí.
- Zprávy mají editaci, odstranění s potvrzením, autora, barvu, čas a revizi. Zobrazuje se posledních 50 chronologicky, starší jsou v archivu po 50. Archiv není druhý soubor a nic se automaticky nemaže.

## Samostatná databáze
- `campaigns/hmk-ledger-chat.json` ve stejném SOUKROMÉM repozitáři, který už má připojený GitHub Cloud. Vznikne při prvním potvrzeném zápisu. Formát `hmk-ledger-chat-v1`: `nextSequence`, `messages`, `speakers`, `chronicle:{entries,generatedAt}`. Kronika obsahuje `sourceId`, revizi, pořadí a vytvořený text.
- Znovu použije aktuální token uvnitř stávajícího cloudového adaptéru; žádný token ani herní JSON se nekopíruje do chatu. Chat má samostatný GET/PUT a SHA. Při souběžném odesílání načte aktuální verzi a opakuje CAS; zastaralá editace se odmítne. Nová zpráva má stabilní ID při opakování nepotvrzeného zápisu. Obnova každých 15 sekund během otevřeného chatu, také ručně. Limit 900 KB nekomprimovaného JSONu; překročení je odmítnuto, nikoli oříznuto.
- Pokud Cloud ještě není nastavený, chat je pouze místní (klíč `hmk-ledger-chat-v1`); lokální chat se při připojení automaticky nemíchá s cloudovým. Je-li Cloud nakonfigurován, ale nepřipraven, zápisy do chatu jsou zablokované, nikoli potichu přesměrované do lokálního úložiště. Stávající synchronizace kampaně a její reset se nemění; reset kampaně sám nemaže chat. Pro vzdálené sdílení musí být zařízení připojena ke stejnému soukromému repozitáři.
- Není zaveden žádný další server, API klíč ani externí AI služba.

## Kronika
- První verze je místní konzervativní pravidlový převod: GM vyprávění se zachová, jednoduchá vyjádření v první osobě se převádějí do třetí osoby, ostatní zápisy zůstávají jako citovaná svědectví. Nevymýšlí nové herní skutečnosti. Nejde o generativní jazykový model; kvalita stylu je určena omezenými pravidly.
- Na první kliknutí se zpracují všechny zprávy včetně archivu. Na další kliknutí se zachovají již zpracované nezměněné pasáže; doplní nové, přepočítají revidované a odstraní pasáže po smazaných zprávách. Bez změn se nic znovu nepublikuje. Hráči kroniku čtou.

## Ověření
- `node tools/test_94099_chat.mjs`: skutečný zdroj cloudového adaptéru proti simulované GitHub Contents API, dvě izolovaná zařízení, vytvoření odděleného souboru, SHA konflikt/retry, idempotence, 53 zpráv, archiv, přírůstková kronika, revize/mazání, správa jmen, role, nulová změna SHA kampaně/její fronty, místní režim.
- Chromium/Playwright: celý skutečný kód aplikace (484 modulů zabalených pouze pro test; HTTP navigace blokována prostředím), produkční CSS a izolované úložiště. Dvě PC a skutečně vytvořená NPC; GM přihlášení/odhlášení, viditelnost tlačítek, výběr PC/jmen, barvy, zprávy, editace/mazání, správa jmen, zachování DOM a dat/draftu, otevřený cestovní formulář a Escape. 56 zpráv: 50 + 6 v archivu, kronika 56 bez duplicit, opakované zpracování beze změn. Bez JavaScriptových výjimek v dokončených testech.
- Aktivní společný interval nebylo možné zahájit v použité kalendářové fixture kvůli existující povinné zdravotní stopce; ověřeno zachování cestovního formuláře, ne celý aktivní interval. Skutečný vzdálený GitHub, GitHub Pages, HTTP module loader, načítání grafických assetů v testovacím prohlížeči a PDF.js nebyly ověřeny. Žádný produkční zápis nebyl proveden.
