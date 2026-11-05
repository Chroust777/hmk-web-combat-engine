# HMK Keeper’s Ledger v93.736 — automatické nesené dávky a počasí u data

**Datum:** 5. listopadu 2026  
**Podklad:** produkční v93.735 z dodaného kompletního archivu  
**Pravidla:** HârnMaster Kèthîra v1.2, str. 120–121, 144, 147, 184–186.

## Co je změněno

### Nesené zásoby = automaticky použitelný zdroj

- Nesená, skutečně doložená, jedlá a neprošlá potrava a pitná voda v doloženě naplněné nádobě znamenají, že postava má **dostupné osobní zdroje**. Již není potřebné zvlášť potvrzovat „snědl“ či „vypil“ k jejich každodennímu čerpání.
- Při původní 24hodinové uzávěrce výživy se bez nového tlačítka provádí **autoritativní výdej** z dostupných zásob. Nese vlastní identitu a nelze jej zopakovat. Inventář, hmotnost a ENC se aktualizují podle původních autoritativních výdejů, nikoliv fiktivním minutovým odečtem.
- Ukazatele Zásob a výživy označují dostupné nesené zásoby jako zajištění postavy; zahrnují také osobní porce převedené z nálezů Foraging. Časový ukazatel nabízí **orientační odpočet** do vyčerpání a skutečného následujícího 24h odečtu. Poměr během dne není nové pravidlo o čtvrtinových dávkách ani samostatný výdej v inventáři.
- Příděly v neznámém skladu, mimo dosah, u jiného vlastníka, nedoloženě pitná voda či potrava s prošlou trvanlivostí **nejsou** automaticky zajištěním. Existující potvrzení skutečné čerstvosti fyzických přídělů a naplnění nádoby zůstává potřeba, pokud ještě neexistuje: nevymýšlíme, že prázdný vak obsahuje vodu nebo stará potravina je poživatelná.
- Doložené jídlo a voda z GM zajištěného prostředí stále fungují, ale nezdvojují inventární spotřebu. Postavy, které se samy nemohou stravovat, stále vyžadují skutečný záznam asistovaného příjmu.
- Společné, ještě nerozdělené nálezy se nesmějí vydávat za osobní zásobu.

### Starvation / Thirst při obnovení výživy

- Nástup zůstává podle pravidel str. 186 po jednom dni bez dávky nebo po dvou dnech s polovičními dávkami.
- Starvation původně pokračuje Advance po třech dnech (šesti při polovičních dávkách); Thirst po jednom dni (dvou při polovičních dávkách), podle kompletního odpočinku také dle pravidel.
- Jakmile má nemocná postava skutečně doložené dostupné dávky schopné pokrýt další nutriční den, **předpověď kalendáře** ukáže dřívější denní Healing, neboť skutečný autoritativní výdej při konci dne doplní plnou dávku. Původní `Advance` se neopakuje vedle Healing. Pokud jsou dávky mezitím ztraceny, přeloženy mimo dosah nebo zkaženy, předpověď se znovu odvodí.
- Již vzniklá Starvation / Thirst v persistentním Combat State se automaticky nemaže pouhým vlastnictvím zásob. Teprve dokončený celý nutriční den s plnou dávkou mění příští lékařský hod na Healing, který GM provede skutečným d100 v původním zdravotním modulu.
- Aplikace vede oddělenou dokumentovanou historii posledního **denního pokrytí** jídlem/vodou. Bez ručního potvrzování jednotlivých jídel nelze pravdivě znát přesnou hodinu sousta; automatická uzávěrka se proto označuje jako **účetní čas**, ne jako předstíraná minuta jídla.

### Počasí vedle hlavního kalendářního data

- Hlavní hlavička kalendáře zobrazuje aktuálně doložené denní počasí z původních HMK dvojic d10, podle oblasti.
- Uplatní se doložená pozdější změna GM; změna platná až v budoucnu se předčasně nezobrazí. Po přechodu do nového dne se včerejší počasí **nepřebírá**.
- Při více doložených oblastech kalendář nevymýšlí, ve které družina právě stojí: ukazuje oblasti zvlášť.
- Den/noc se vypočte z existující orientační délky světla; HMK neudává pevnou hodinu východu. Při neurčeném soumraku zobrazíme obě varianty.
- Je-li počasí nepotvrzené, místo vymyšlených hodnot vidí GM informaci „Denní počasí dosud nebylo GM potvrzeno“.

## Konkrétní regresní scénáře

- Den 1 bez zdrojů → Den 2 skutečně vznikne Starvation a Thirst → dvě hodiny poté získány nesené plné dávky → kalendář naplánuje Healing na Den 3, nikoli jen původní Advance v Dni 5 → po skutečném konci celého dne automaticky odečtena 1 potravní dávka a 2 × 0,5 gal vody → žádný duplicitní výdej, platný audit.
- Dostupné zásoby po celý první den → žádný falešný nástup. Po vyčerpání bez doplnění → další den vznikne správný nedostatek.
- Zásoba ve stáji bez doloženého přístupu, zásoba prošlá před uzávěrkou a poloviční dávka → žádná falešná předpověď plného Healing.
- Současné počasí dvou oblastí, změna GM v budoucnosti a od její minuty, přechod do dalšího dne bez nových d10.
- Časový odpočet množství je jen UI odhad, nikoliv skrytý okamžik spotřeby; původní výdeje zůstávají neměnné.

## Testy

| Sada | Počet | Stav |
|---|---:|---|
| `test_93736_carried_auto_weather.cjs` | 36 | PASS |
| `test_93735_supply_malnutrition.cjs` | 52 | PASS |
| `test_93734_episode_allocation.cjs` | 44 | PASS |
| `test_93734_stalking_vigilance.cjs` | 30 | PASS |
| `test_foraging_water_storage.cjs` | 45 | PASS |
| `test_93734_animal_health.cjs` | 70 | PASS |
| `test_93734_animal_completion.cjs` | 26 | PASS |
| `test_93734_animal_load_timeline.cjs` | 118 | PASS |
| `test_93734_animal_weather.cjs` | nejméně 93 | PASS |
| `test_93734_healing_remaining_544.cjs` | 68 | PASS |
| `test_93734_healing_surgical_audit_542.cjs` | 39 | PASS |
| `test_93734_multi_infection_healing_541.cjs` | 49 | PASS |
| `test_93734_animal_departure.cjs` | 15 | PASS |
| `test_93734_skill_chain_545.cjs` | 1905 | PASS |
| `test_93734_skill_animal_survival_539.cjs` | 55 | PASS |
| `test_nutrition_activity_392.cjs` | 50 | PASS |

**Součet:** nejméně **2 695 PASS**, všech **16** uvedených sad PASS; syntaxe všech změněných JS a opětovné sestavení balíku PASS.

### Neověřené / omezení

- **Plné prohlížečové E2E** klikání přes skutečné mobilní GitHub Pages UI není v tomto prostředí doloženo a není označeno jako PASS. Pro ověření po nasazení proveďte v nové testovací kampani uvedený třídenní scénář.
- Dva historické testy odpočinku `test_nutrition_rest_calendar_501.cjs` a `test_nutrition_rest_calendar_501_507.cjs` dříve selhávaly na starém modelu weariness; tato etapa je nepřepisuje a mezi PASS je nepočítá.
- Stará chybná zdravotní data uložená v kampani se nesmějí „léčit“ odstraněním historických záznamů. Tato změna opravuje **nové rozhodování a prognózu**; historické opravy potřebují zvláštní audit.

## Instalace

Patch v93.736 je překryv nad kompletní v93.735. V kořeni repozitáře GitHub nahraďte soubory při zachování adresářové struktury. Nový zdroj `src/integration/hmk-calendar-current-weather-93736.js` je **povinný** pro načtení v93.736. `index.html`, `app.js`, `book-templates.css` a přebalený `hmk-app.bundle.js` mají sladěnou verzi v93.736.
