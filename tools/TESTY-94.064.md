# v94.064 · rozsah ověření

## Přenos kampaně

Produkční index původního ZIPu spouští app.js jako ES modul. Historický hmk-app.bundle.js slouží také mnoha starším testům. Test nového přenosu načetl aktuální ES moduly. Byl vypnut vykreslovací krok a nahrazeno DOM, síť a úložiště. Každé zařízení mělo novou instanci hlavního modulu a vlastní úložiště. Obě komunikovala se stejným imitovaným GitHub Contents API. Test nerenderoval obrazovku ani neklikal fyzické hody.

| Scénář | Výsledek |
|---|---|
| Rozpracované 30minutové cestování, minuta kampaně 480, zadaná nehoda v 15. minutě | Přeneslo se stejné okno, hodnoty a následující pole Direction. Po obnově byl čas 480 a potvrzený deník beze změny. Výchozí rozpracované údaje byly nasazeny testem. Dokončení cestovní nehody v UI zůstává otevřené. |
| Blood Stoppage u krvácející rány | Původní engine přijal Physician 93. Druhá instance obnovila průvodce, přijala Strength 42 a dokončila vyhodnocení. Celý výsledný stav pacienta a oba záznamy fyzických hodů se shodovaly s nepřerušenou kontrolou. |
| Zastaralé zařízení | Původní test adaptéru potvrdil odmítnutí přepsání novějšího SHA a zachování neodeslané místní verze. |
| GitHub v reálné síti | Bez vzdáleného zápisu. Testy běžely na izolovaných datech. |

## Co ukládají jednotlivé moduly

| Oblast | Způsob obnovy a hranice |
|---|---|
| Cestování, více skupin, Direction, Lost, Foraging, Tracking | Původní místní pracovní záznam uchovává vstupy, vazby na testy, jejich doklady, potvrzené hody, plány a frontu připravených skupin. Přenos váže záznam na přesný potvrzený základ kampaně. Přenášejí se také fáze hodnocení, návrat ze Skill Testu a neodsouhlasený vstup kostky. Dokončené skupiny obnovuje původní validátor datových dokladů. |
| Nehoda, Hazard a Surprise | Potvrzení Agility má vlastní úložiště. Podmínky Hazardu jsou ve formuláři epizody. Samostatný formulář Encounter/Surprise má vlastní posloupnost přijatých hodů. Patch zahrnuje všechny tři mechanismy. |
| Kalendář, postavy, inventář, zvířata, Infection, léčebné projekty a zápisy do kroniky | Potvrzený stav, termíny a události jsou již v kampani. Při načtení není třeba znovu potvrzovat léčbu či měnit čas. Formuláře Treatment, Healing a Infection navíc přenášejí pracovní hodnoty. |
| Combat a krvácení | Initiative používá combatRuntime. Průvodci mají ještě dočasnou relaci s kontrolou pacienta, účastníků, vybavení, kola nebo časové osy. Zahrnuty jsou vyjmenované herní klíče této relace. |
| Další hody | Přidány datové stavy původních front pro Skill Workbench, speciální Secondary Roll, počasí, výcvik, Talisman, podmíněné řetězce Shock/Coma a další formuláře registrované stejným mechanismem. Hod se obnovuje do existujícího řadiče. Spuštění konečného pravidlového zápisu dál patří původnímu formuláři. |
| Atlas | Přenos zahrnuje potvrzenou databázi s vlastními značkami. Kód pro mapy, K5 PDF, dotykové přiblížení a měření má totožné soubory jako v94.063. Živá dotyková regrese zůstává otevřená. |
| Omezení | Rozhodnutí uvnitř otevřeného asynchronního dialogu Fate nemá úplnou přenositelnou pokračovací proceduru. U formulářů, jejichž struktura nebo pravidlová volba po načtení nesouhlasí, může být nutné nastavení znovu vybrat. Úplný průchod všemi takovými průvodci v prohlížeči nebyl doložen. |

## Chat

- 54 souběžných HTTP požadavků na skutečný server s izolovaným úložištěm. Nejnovější výpis měl 50 zpráv, starší stránka čtyři.
- Přijetí zprávy GM i hráče, načtení z jiného klienta, úprava vlastní archivované zprávy, odmítnutí zásahu jiného hráče i s klientským údajem role GM, odmítnutí zastaralé revize, smazání GM a odmítnutí neznámého klíče.
- Dvě samostatné instance serveru s produkčním adaptérem nad jedním simulovaným GitHubem. Vynucen souběžný konflikt SHA a ztracena odpověď po úspěšném zápisu. Opakování na druhém serveru zanechalo jednu kopii zprávy. Soubor testovací kampaně nebyl čten ani měněn.

## Srovnání přiložených regresních sad

Ze 14 vybraných sad prošlo stejných 10 na původní i upravené verzi. Obsahují 341 kontrol Surprise, 240 kontrol následků ve stejné minutě, 54 kontrol pořadí a serializace dokladů, 49 kontrol léčení a více infekcí a 49 680 kombinací ochrany zbrojí. U dvou starších skriptů byl jejich historický překladač nahrazen načtením stejného modulu přímo v Node. Těla testů a očekávané výsledky zůstaly stejné.

Stejné čtyři sady selhaly na stejné podmínce v obou verzích: 93.797 očekává odmítnutí určitého dokladu Shock/Coma, 93.841 vyžaduje doslovné číslo verze 93.841, 93.844 očekává celoskupinovou blokaci cestování při opravě vybavení a 93.846 očekává konkrétní výběr slona. Jde o zjištěné rozdíly proti historickým očekáváním. Tato kontrola nerozhoduje o správném pravidlovém výkladu každého rozdílu.

## Prohlížečové ověření a opakování

Start Chromium zde odmítl operační systém při vytvoření socketu. Náhradní prohlížeč neměl spojení na místní testovací server. Povinný průchod ve dvou skutečně samostatných prohlížečových kontextech, ovládání archivu na mobilu a úplná vizuální regrese zůstávají neověřené. Soubory browser_94064.py a browser_chat_94064.py obsahují spustitelné testy pro prostředí s Chromium a Python Playwright. Skript přenosu kontroluje rozpracovaný plán a konflikt. Neobsahuje úplnou koncovou matici nehod a léčení.

Z kořene rozbalené úplné aplikace lze spustit nezávislé testy pomocí Node 22+:

```sh
node tools/test_work_94064.mjs
node tools/test_chat_94064.mjs
node tools/test_chat_github_94064.mjs
node tools/test_93787_cloud_two_devices.mjs
```

Na stroji s prohlížečem spusť python tools/browser_94064.py. Pro chat spusť v jednom terminálu node tools/test_chat_94064.mjs --serve a ve druhém python tools/browser_chat_94064.py URL, kde URL je vypsaná místní testovací adresa. Oba skripty standardně používají /usr/bin/chromium, cestu lze nastavit v jejich volání launch.

Pro úplné herní převzetí zbývá na nové testovací kampani porovnat skutečné potvrzení stejné cesty se shodnými fyzickými hody před a po přepnutí zařízení. Kontrolní body jsou poslední doklad Survival, přesná minuta nehody, čas po konečném potvrzení okna, počet zranění, návazný Shock a zápisy v kronice. Zopakovat též u přerušeného časovaného ošetření a splatného Infection Course. Pro současný provoz je třeba ověřit otevření chatu v průběhu těchto formulářů, zobrazení hráče a GM v telefonu, ovládání archivu a K5 s dotykovým zoomem.
