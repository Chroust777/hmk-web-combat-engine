# HMK Keeper’s Ledger v94.089 – GameMaster (lokální režim rozhraní)

Výchozí stav: autoritativní kompletní ZIP v94.077 a patche v94.078–v94.088 aplikované v pořadí. Žádný zásah do produkčního repozitáře.

- Nové kompaktní přihlášení pod kartou HârnMaster, nad zmenšenou navigací zpět/vpřed. Heslo dle zadání. Zapamatování používá samostatný klíč `hmk-keeper-gm-remember-v1` v localStorage; bez zaškrtnutí se role drží jen v aktuálně načtené aplikaci. Odhlášení odstraní klíč. Nezávislé prohlížeče a zařízení mají vlastní stav. V rámci stejného prohlížeče se zapamatovaná role aktualizuje i v dalších kartách.
- Defaultní režim hráče skrývá odkazy na Kalendář, Combat, GM · Historie činností, Cloud a zálohy a Archiv, včetně zkratky Cloud. Při odhlášení na těchto stránkách je obsah pouze skryt; DOM, stav i rozepsané údaje zůstávají. Stejné skrytí platí při návratu na GM stránku navigační historií.
- Atlas: sekce Vlastní značky a Zakrytí mapy jsou GM-only. Tužka a křížek vlastních značek jsou také skryty; stávající značky, družina, její historie, měření i kartografie zůstávají viditelné podle existujících nastavení vrstev. Nejde o změnu oprávnění ke změně dat ani ke všem ostatním gestům Atlasu. Původní formulář s heslem pro mlhu je odstraněn. Při odhlášení se vypne GM náhled průsvitnosti a aktivní štětec; uložené zakrytí se nemění. Rozpracované umisťování značky se ukončí.
- Role je výhradně vizuální pomůcka pro důvěryhodné hráče. Není serverovou autentizací ani ochranou před inspekcí dat nebo kódu. Herní JSON, synchronizace a pravidla se nemění.

## Testy
- Syntaxe změněných JS souborů: PASS.
- Chromium, balíček vytvořený z aktuálních zdrojových modulů aplikace, produkční CSS, izolované testovací úložiště se dvěma postavami: start, chybné heslo, Esc, přihlášení/odhlášení, velikost a pořadí tlačítek, viditelnost všech pěti položek, shoda DOM a dat Kalendáře před a po přihlášení, Atlas overview/K5 (skrytí nástrojů, otevření mlhy bez hesla, reset průsvitnosti, neměnnost kampaně), obnovení zapamatované role z testovacího úložiště v novém kontextu, nezávislý další kontext: PASS, bez pageerror.
- Izolované prohlížečové regresní testy skutečných modulů Atlasu: navigace družiny, propojení mlhy, měřítko, hranice sektoru, undo/redo, odmítnutý zápis, starší data, smazání poznámek a pohyb družiny: PASS, bez pageerror.
- HTTP navigace v testovacím prostředí byla zablokována (ERR_BLOCKED_BY_ADMINISTRATOR). Testovací úložiště bylo emulované, neověřeno skutečné GitHub Pages, vzdálený GitHub Cloud, PDF.js ani persistování localStorage na produkčním originu. Nešlo o úplný audit všech herních modulů.

Nahrát pouze obsah patche do kořene existujícího v94.088 repozitáře a provést Ctrl+F5.
