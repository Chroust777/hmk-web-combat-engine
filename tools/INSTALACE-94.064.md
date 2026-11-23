# Keeper’s Ledger v94.064 · instalace na ověřovací kopii

Výchozí verze je kompletní v94.063 v přiloženém ZIPu. Tento kandidát obsahuje skutečnou aplikaci a server chatu. Před použitím se živou kampaní zbývá ověřit průchod popsaný v TESTY-94.064.md ve dvou prohlížečích. Zvlášť důležité jsou otevřené rozhodnutí Fate, závěr intervalu po nehodě a termín první zdravotní kontroly.

## Aplikace GM

1. Rozbal původní kompletní v94.063 do nové složky. Do stejného kořene rozbal tento patch a povol nahrazení shodných souborů. Vedle sebe mají ležet index.html, app.js, chat-config.js a složky src, assets, chat.
2. Publikuj tuto složku na samostatné testovací adrese nebo z ní spusť místní HTTP server. V obou prohlížečích zkontroluj verzi v94.064. V Cloud a zálohy připoj samostatný **soukromý testovací repozitář** s kopií kampaně. Pro novou prázdnou testovací databázi použij „Vytvořit první cloudovou databázi“.
3. Po kroku na A vyčkej na „Cloud ✓ uloženo“. Během čekání je poslední změna místní. Potom na B otevři stejnou verzi a připoj stejný repozitář. Již otevřená karta kontroluje změny při návratu nebo v intervalu 30 sekund. Ručně lze použít „Načíst aktualizaci z cloudu“.
4. Při konfliktu ponech otevřenou kartu s neodeslanými výsledky. V Cloud a zálohy je volba „Stáhnout rozpracovaný stav (JSON)“. „Převzít cloudový stav“ výslovně nahradí místní změny.

GitHub nadále uchovává soubor campaigns/hmk-ledger-cloud.json. Rozpracovaný stav a přesné znění potvrzené databáze cestují v jednom komprimovaném zápisu s kontrolou SHA souboru. Stará databáze bez pracovních dat se načítá původním způsobem. Hlavní místní databáze a běžný JSON export obsahují potvrzenou kampaň. Přenos s pracovním stavem vyžaduje v94.064 na obou zařízeních. Před návratem na starší verzi použij archiv původního kódu a příslušnou zálohu kampaně. Původní vývojová funkce vymazání úložiště přes F12 může resetovat připojenou sdílenou kampaň. Pro simulaci dalšího zařízení otevři nový profil prohlížeče.

## Server chatu

Jedna instance serveru obsluhuje jednu kampaň. Potřebuješ Node.js 22 nebo novější, stroj dostupný hráčům přes HTTPS a reverzní proxy. Lze použít vlastní existující server. Závislosti z npm nejsou potřeba. GitHub Pages poskytuje statické soubory. Oprávnění hráčů v tomto řešení vyhodnocuje server před zápisem na GitHub. [Dokumentace GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

1. Na server zkopíruj složku chat například do /opt/hmk/chat. Mimo veřejnou složku vytvoř adresář /etc/hmk s přístupem pouze pro správce a účet služby. V něm vytvoř chat.json. Jako repo uveď konkrétní soukromý repozitář a jako room stabilní název kampaně tvořený písmeny bez diakritiky, číslicemi, podtržítkem či pomlčkou.

   ```json
   {"repo":"VLASTNIK/SOUKROMY-REPOZITAR","room":"druzina","accounts":[]}
   ```

2. Vytvoř samostatný fine-grained GitHub token omezený na tento soukromý repozitář s oprávněním **Contents: Read and write**. Ulož ho do prostředí služby pod názvem HMK_CHAT_GITHUB_TOKEN. Účet serveru potřebuje přístup ke konfiguraci. Skutečný token i soubor s účty patří mimo Pages a mimo Git. Samostatný soukromý repozitář pro chat navíc omezí rozsah serverového tokenu. Při použití stejného repozitáře má tento token oprávnění na úrovni repozitáře. Server nabízí pouze pevnou cestu chat/ROOM/page-N.json. [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)

3. Z terminálu serveru založ GM a jednotlivé postavy. Každý příkaz jednou vypíše náhodný osobní klíč. Předej jej pouze jeho majiteli. Konfigurace uchovává hash klíče, roli, jméno postavy a stálé ID.

   ```bash
   node /opt/hmk/chat/account.mjs /etc/hmk/chat.json gm "GM"
   node /opt/hmk/chat/account.mjs /etc/hmk/chat.json player "Pepa"
   ```

4. Se zavedenou proměnnou HMK_CHAT_GITHUB_TOKEN spusť server. Při startu ověří soukromí repozitáře. Pro běžný provoz nastav stejný příkaz ve správci služeb hostitele a zapni opětovné spuštění po restartu. Po změně účtů restartuj službu. Přístup zrušíš odebráním účtu. Při přejmenování postavy ponech stejné ID, aby měla nadále právo upravovat starší zprávy.

   ```bash
   HMK_CHAT_CONFIG=/etc/hmk/chat.json PORT=8787 node /opt/hmk/chat/server.mjs
   ```

5. Nastav vlastní subdoménu pro chat. Příklad konfigurace Caddy po nasměrování DNS na server:

   ```
   chat.tvoje-domena.cz {
       reverse_proxy 127.0.0.1:8787
   }
   ```

6. Na webu Ledgeru zapiš do chat-config.js veřejnou adresu své služby.

   ```js
   window.HMK_CHAT_URL='https://chat.tvoje-domena.cz/';
   window.HMK_CHAT_ROOMS={};
   ```

   Máš-li v jedné databázi více kampaní s různými hráči, zprovozni pro každou samostatnou instanci, room, seznam účtů a adresu. Vyplň HMK_CHAT_ROOMS jako objekt se stabilním campaignClock.campaignId každé kampaně jako klíčem a HTTPS adresou jako hodnotou. Výchozí HMK_CHAT_URL může zůstat prázdná.

7. GM otevře **Chat** z levého menu. Otevře se v samostatné kartě, takže rozpracovaný formulář zůstane otevřený. Hráčům pošli přímo adresu chatu a každému jeho osobní klíč. Po přihlášení server přiřadí jméno a roli. Ruční zápis „Endurance – d100: 42“ vytvoří pouze zprávu. Výsledek do pravidlového formuláře přepíše GM.

Posledních 50 dostupných zpráv se během hraní obnovuje každých 6 sekund. „Archiv zpráv“ načítá předchozí stránku. Úpravy mají vlastní revizi zprávy. Po smazání zůstane v souboru technická značka bez textu, aby opožděné opakování požadavku zprávu neobnovilo. Git uchovává historii předchozích verzí souboru. Při výpadku zůstane rozepsaný požadavek v daném prohlížeči a tlačítkem Odeslat se zopakuje se stejným identifikátorem.
