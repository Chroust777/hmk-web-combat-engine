# HMK Keeper’s Ledger v93.956 · audit cestování

Pravidlový základ pro dopravní sestavy je HMK 1.2, strany 122, 141 a 145–150. Živé scénáře proběhly v izolované kopii kampaně. Ostatní kontroly běžely nad pravidlovými moduly a uloženými doklady.

## 1. Smíšená doprava

| Sestava | Ověření | Výsledek |
| --- | --- | --- |
| Pepa na Ryšákovi a Espar na Vraníkovi | Prohlížeč, 11:16–11:36 | Obě obsazení šla samostatně vybrat. Náklad jednotlivých sedel byl 224,2 a 224,7 lb, obě ENC 15. Základní tempo bylo 9 lig za 240 minut. Riding, Survival a oba END byly potvrzeny. Čas se posunul jedním potvrzením a obě role se po obnově zobrazily v kronice. |
| Kára s pacientem a samostatný jezdec | Prohlížeč, 11:36–11:46 | Hatatitla táhl káru, Pepa řídil, Michal se vezl a Espar jel na Vraníkovi. Kára hlásila 367,9 z 2 000 lb. Z toho činil náklad Michala 157,7 lb a Pepy 210,2 lb. Espar se počítal na vlastní sedlo. Tempo odpovídalo pomalejší káře, 4 ligy za 240 minut. END potvrdili Pepa a Espar. Epizoda se uložila a její role zůstaly po obnově stránky. |
| Čtyřkolový vůz, samostatný jezdec, pěší vodič a pacient | Automatizovaná kontrola | Hmotnost vozu obsahovala posádku a pacienta. Pěší vodič a jezdec měli různé TN pro END. Pacient neměl cestovní END. Obnovený doklad jízdy vrátil správného jezdce. |
| Neplatné přiřazení | Automatizovaná kontrola a vybrané živé vstupy | Odmítnuto dvojí sedlo pro jednu postavu, současná jízda a pěší vedení, pacient v roli samostatného jezdce, Drover mimo posádku vozu a další zvíře s jiným připojeným vozidlem. V prohlížeči byl u Vraníka Michal pro samostatnou jízdu i pěší vedení nepřístupný. |

Prošlo 150 kombinací základního tempa napříč přípustnými sloupci, krajinami a pěším doprovodem. Výpočet používá nejpomalejší způsob dopravy a odmítá terén neprůchodný pro některou část sestavy. Jízda v každém sedle má vlastní doklad výstroje a hmotnosti. Zátěž se vyhodnotí po přičtení jezdce. Rozhraní při změně obsazení vyžaduje nový Orienteering, pokud by starý hod vycházel z jiné sestavy.

Živě ještě zbývá čtyřkolový vůz s jezdcem, více druhů spřežení a hraniční překročení nosnosti u sestav se samostatnými jezdci.

## 2. Pochod a souběžné skupiny

Opravil jsem volbu předchozí epizody v samotném výpočtu. Souběžně uložená epizoda bez společného účastníka teď už nemůže překrýt předchozí Orienteering vlastní skupiny. Automaticky ověřeny obě skupiny ve stejné minutě a 172 kontrol plánování společného intervalu, zdravotního limitu a jediného potvrzení. Prošlo také 24 kontrol odchodu člena a přenosu únavy nebo vzdálenosti, 32 kontrol cestovních pravidel, kombinace všech tří tříd Survival Hazard s vybranými výsledky Direction a obecná regrese 7 921 variant.

Otevřené jsou živé kombinace Equipment, Accident a Direction s různým počasím, více činnostmi a souběžnými zdravotními termíny ve stejném intervalu.

## 3. Stacionární činnosti

Prošlo 448 kontrol sedmi činností při různých délkách a mezních hodech počasí. Výpočet zachoval nulovou cestovní vzdálenost a nevytvořil cestovní END. Prošlo 1 539 kontrol Foraging, 70 kontrol stacionárního Orienteering a výnosů, 48 kontrol stacionárního Foraging CF a 26 skupin kontrol Tracking CF a bezplatného Bearing.

Otevřené jsou živé průchody jednotlivými přerušeními, střety a počasím u všech činností a druhy a následky Scent při Tracking.

## 4. Zdravotní následky

Prošlo 93 zvířecích a povětrnostních kontrol, 24 samostatných lokalit Frostbite a 49 kontrol souběžných infekcí. Dále prošlo 48 kombinací tří teplot vody, čtyř výsledků Endurance a čtyř výchozích stavů Shock. Opakované STN správně přechází na INC a opakované INC na UNC. Při slabším šoku se zachová původní termín. Cílená regrese potvrdila samostatné vyřízení Extended Shock a Coma po ponoření, pokračování Coma po F i zotavení po CS. Starší sada Shock prošla 37 kontrolami po přenesení své testovací položky na aktuální `healthState`. Zdrojový test v projektu zůstal beze změny.

Starší scénář Accident stále očekává, že kandidát ze sloní tabulky J bude odmítnut jako nepodporovaný. Tuto sadu nelze vykázat jako plně prošlou. Otevřené jsou živé kombinace zvířecího poranění podle druhu a role, opakované rány, zátěž počasím a souběh Cold Water Shock se staršími zdravotními závazky. Audit Skill Tests je další samostatná etapa.

## Instalace

Patch je kumulativní od v93.938. Rozbalte jej do kořenové složky projektu při zachování cest. Testovací kampaně v archivu nejsou.
