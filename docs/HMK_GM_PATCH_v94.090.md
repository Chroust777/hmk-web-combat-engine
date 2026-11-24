# HMK Keeper’s Ledger v94.090 – rozšíření režimu GameMaster

Výchozí stav: původní kompletní ZIP v94.077 + všechny patche v94.078–v94.089 v pořadí. Kontrolní SHA-256 app.js, gm-mode.css a index.html před změnou souhlasily s v94.089.

## Rozsah
- NPC podle `kind === 'NPC'` jsou skryté v registru i levém seznamu postav, včetně nových a rozpracovaných NPC. V režimu hráče se počitadla registru a postav zobrazují bez NPC. Otevřený deník/tvorba NPC se při odhlášení vizuálně zakryje bez nového renderu.
- Postavy: skrýt dvě automatické generace, Upravit tvorbu u hotových postav. Ruční založení a pokračování rozpracované tvorby nejsou změněny.
- Hlavní menu: Skill Tests (jen hlavní navigace).
- PC: Edit, Pravidlová tvorba, Combat & Conditions, Zdraví & Expozice, Provisions. Již otevřené tři vyhrazené kapitoly se po odhlášení zakryjí, ostatní záložky jsou dostupné. Přihlášení obnoví stávající DOM.
- Knihovna: Nový předmět, Vzít zdarma (sdílené formuláře katalogu včetně výstroje stáje), Bestiář a encountery, Pravidla a audit. Stáj: Převzít zdarma; nákup zůstává dostupný. Již otevřený Bestiář/Pravidla se skryje, navigace mezi povolenými záložkami zůstává.
- Vše je prezentační omezení. Seznamy pro výpočty, předávání a výběr příjemců nebyly filtrovány. Nejde o zabezpečení dat. Heslo a zapamatování zařízení beze změn. Herní JSON, cloud, pravidla, Atlas, čas a existující akční handlery beze změn.

## Kontrola
- Syntaxe app.js: PASS (Node, ES module).
- Chromium s aktuálními zdrojovými moduly (testovací bundle) a produkčními CSS, izolované lokální úložiště: PASS.
- Skutečné založení rozpracovaného NPC a skutečné automatické vygenerování hotového NPC, zobrazení GM a skrytí hráči: PASS.
- PC kapitoly, navigace, generátory, Upravit tvorbu, Skill Tests, všech šest kategorií Knihovny, Stáj, Bestiář a Pravidla, odhlášení při otevřené kapitole a opětovné přihlášení beze změny DOM/dat: PASS.
- Skutečné předání předmětu Belt pouch, 5 lb mezi dvěma PC v režimu hráče, zachování času a profilů postav: PASS.
- Regrese v94.089: správné/chybné heslo, zapamatování, oddělené kontexty, kalendář a obě mapy (viditelnost nástrojů, reset průsvitnosti, beze změny kampaně): PASS. Bez JS výjimek v dokončených testech.
- Vzdálené GitHub Pages, Cloud a PDF.js nebyly ověřeny. Produkční repozitář nebyl měněn.

Patch obsahuje app.js, gm-mode.css, index.html a tuto dokumentaci. Rozbalit přes v94.089 a obnovit Ctrl+F5.
