# HMK Keeper’s Ledger v94.100 – Chat: nezávislá jména a kronika

Navazuje na v94.099. Nahrát změněné soubory do kořene aplikace ve stejné struktuře. Po nasazení obnovit Ctrl+F5. Chatový JSON zůstává `campaigns/hmk-ledger-chat.json` a zachovává stávající formát `hmk-ledger-chat-v1` s volitelnými novými poli.

- Nové zprávy hráčů smějí používat výhradně vlastní jména spravovaná GM v chatu. Staré zprávy s autorem typu PC zůstávají čitelné, ale jejich jména se nepřenášejí do nabídky. Bílá je nově první výchozí barva palety.
- Jediná nově načítaná herní hodnota je datum aktivního herního kalendáře, pouze pro záznam zprávy. Uloží se v okamžiku odeslání; editace zprávy datum nemění. Bez TR původu se zobrazuje číslo dne kampaně; staré zprávy bez data jsou označeny jako nedoložené. Reálné datum a čas zůstávají vpravo.
- Chat používá skutečný `journalShell` (stejné rámování, pergamen, dekorace a CSS jako ostatní deníky), bez nových obrazových podkladů. Zůstává samostatným překryvným oknem, aby nezavíral rozpracovanou herní činnost. Textové plochy automaticky mění výšku podle obsahu.
- Lokální pravidlový generátor v2 přepisuje běžné české akce do třetí osoby, odstraňuje technické fráze a propojuje pokyn GM k hodu s výsledkem hráče. U rozpoznané navazující věty GM převede jasnou druhou osobu do vyprávění. U nejasného textu ponechá přímou řeč; nejde o generativní AI ani univerzální český jazykový model. Výstupy se ukládají s revizemi a kontextovými závislostmi; při prvním vytvoření ve v94.100 se přepočítají staré automatické pasáže. Další generování zachovává nezměněné pasáže.
- GM může editovat celou kroniku a smazat ji po potvrzení. U ruční úpravy se chrání upravený text; další generování doplní nové pasáže, starší ručně upravenou část nepřepisuje ani při změně zdrojové zprávy. Smazat vše smaže pouze kroniku i její checkpoint; nové generování ji může vytvořit z dochovaných zpráv. Čtení zůstává dostupné hráčům. Revize chrání před přepsáním novější úpravy jiného zařízení.
- Nemění se Atlas, cloudové připojení, herní JSON, čas, inventář ani pravidlové činnosti.

## Ověření
`node tools/test_94100_chat.mjs`: PASS nezávislá jména a role, kompatibilita starých dat, datum, převod příkladů uživatele, návazný hod a výsledek GM, přírůstková kronika, ruční editace, smazání, konflikt revizí, souběžný zápis dvou klientů proti simulovanému GitHub API, beze změny kampaně.

Chromium: skutečné moduly aplikace zkompilované do testovacího bundle, produkční CSS a izolované úložiště; PASS prázdná nabídka i při existujících PC, vytvoření jména GM, role, společná šablona knihy, automatická výška pole 35→98→35 px, obě data, příklady kroniky, editace a smazání, navazující pasáže, zachování podkladového formuláře a stavu kampaně. Testovací HTTP navigaci blokuje prostředí; obrazové assety knihy, vzdálený GitHub Cloud/Pages a PDF.js nebyly v tomto prohlížečovém testu ověřeny. Žádné změny produkčního repozitáře.
