# HMK Keeper’s Ledger v93.770 — audit Pochod A–I, nehoda v souběžném časovém okně

**Datum:** 7. 11. 2026  
**Vstup:** uživatelem dodaný kompletní `hmk-web-combat-engine-main_07_11_2026.zip` (aplikace v93.769).  
**Pravidlový zdroj:** přiložená HMK v1.2, zejména Trekking / Foraging / Encounter / Accident (str. 142–150) a Physical Trauma / Treatment / Healing (str. 166–181).  
**Rozsah změn:** pouze aplikace a testovací doklady k cestování; žádné změny v původním Combat/Alchemy/Healing engine.  
**Výsledek:** *v93.770 – oprava konkrétní chyby s časovou hranicí nehody; všechny větve Pochodu A–I nejsou definitivně uzavřeny.*

## 1. Prokázané chyby v dodané v93.769

### A. Nedostupný povinný vstup „minuta nehody“

Při Survival CF a Hazard d10 = 4–6 musí GM uvést, v jaké minutě epizody nehoda nastala. Průvodce však držel celý oddíl dalších hodů skrytý až do vyhodnocení, zatímco vyhodnocení už tento údaj vyžadovalo. Vstup se nedal běžným naváděním dosáhnout. V `app.js` je nyní při požadavku na `hazardAtMinute` zobrazen a otevřen i nadřazený panel `rolls`; další skupiny se tak mohou validně připravit až po přesném určení okamžiku.

### B. Překročení nevyřešené nehody společným kalendářem

**Reprodukce:** Den 1, 08:00. Společný interval 30 minut, skupina A Pochod 20 min, Survival CF, Hazard d10 = 5, nehoda v 8. minutě; skupina B Odpočinek 30 min. V93.769 umožnila po zkrácení činnosti skupiny A finální potvrzení až na **08:30**, přestože původní Agility / Injury Sequence nebyla v **08:08** vyhodnocena.

**Oprava v93.770:**

1. Připravená nehoda s nevyřešeným zdravotním následkem zkrátí **celé společné okno** na minutu úrazu (08:08), ne pouze činnost postižené skupiny.
2. Pokud již byla jiná činnost doložena přes okamžik nehody, aplikace odmítne zpětné přepočítání hodů; uživatel musí postup bezpečně opravit, nikoli pokračovat s vymyšlenými důkazy.
3. Poslední potvrzení GM odmítne i podvržený nebo zastaralý pracovní doklad, který by přeskočil okamžik nehody.
4. Historický validátor `validateSharedTimeWindowJournal93767` odmítá doklad s otevřenou nehodou před koncem okna. Tato ochrana se uplatňuje také při načítání uloženého stavu.
5. Následný nový interval zůstane správně blokován původní povinností v kalendáři, dokud není potvrzena původní zdravotní procedura. Nový hod Survival/Hazard se při přechodu do Skill Tests nevytváří.

## 2. Interaktivně ověřené řetězce v lokálním Chromiu

| Scénář | Výsledek |
|---|---|
| A Pochod 08:00–08:20 → Foraging 08:20–08:30; B souběžný Odpočinek do 08:30 | PASS; 3 doklady, jedno GM potvrzení |
| A nehoda v 08:08, B Odpočinek 08:00–08:08 | PASS; celkové okno končí 08:08 a vytváří jediný posun kalendáře |
| Pokus o další okno před vyřešením nehody | PASS; zablokován povinným zdravotním testem v 08:08 |
| Přechod ze Survival CF + Hazard d10 = 5 do původního Agility / Impact / Injury / Shock | PASS; záznam skutečné rány vznikl v 08:08 ve sdíleném `healthState` |
| Samostatný Injury Morale po zranění | PASS; originální rána i původní minuta zůstaly beze změny, žádný další posun času |
| Následný Treatment jako povinná kalendářová událost v 08:08 | PASS; nové časové okno do té doby není dostupné |
| Dvě skupiny 23:50–00:20, činnosti rozdělené přesně o půlnoci | PASS; 4 vlastní doklady, denní počasí pro každý ze dvou dnů, jediný finální posun |
| Původní v93.769 obnovitelné pracovní doklady a společné časové okno | PASS v dříve provedených testech; viz testovací skripty v `tools/` |

Testy prohlížeče používají Chromium nad skutečně sestaveným `hmk-app.bundle.js`, načteným do testovacího dokumentu. **Nejde o ověření nasazení na GitHub Pages**, protože přímé navigaci na veřejnou URL v tomto prostředí brání omezení prohlížeče.

## 3. Nové samostatné regresní testy

- `tools/test_93770_accident_global_cutoff.cjs` — historické doklady, odmítnutí přeskoku přes nehodu, přijetí přesné hranice, odmítnutí dvojího posunu, tamper guard.
- `tools/browser_93770_accident_parallel.py` — skutečný interaktivní průchod se dvěma skupinami a nehodou.
- `tools/browser_93770_accident_blocked.py` — další interval před vyhodnocením zdravotní povinnosti.
- `tools/browser_93770_accident_health_probe.py` — pokračování přes Agility, Injury a Injury Morale; ověření kalendářového Treatment termínu.
- `tools/browser_93770_cross_midnight.py` — dvě skupiny se čtyřmi činnostmi přecházejícími přes půlnoc.

## 4. Hranice dokončeného auditu

**Není uzavřeno:** jediný souvislý interaktivní průchod, který zároveň obsahuje pozitivní Encounter, Foraging, Accident, několik odlišných Healing termínů a pokračování další den, ani všechny možné permutace zdravotních a dovednostních procedur mezi skupinami. Takový test proto nelze prohlásit za PASS. Simulace přes půlnoc a přechod nehoda → zdravotní následky byly testovány odděleně. Činnost potvrzená až po rozpracovaném zdravotním následku zůstává záměrně blokována, aby nedošlo k přeskoku skutečné minuty.

**Způsob uvolnění:** verze **93.770** opravuje a kontroluje výše uvedený prokázaný problém; není prohlášením o dokončení všech větví Pochodu A–I ani plošným auditem všech modulů aplikace. Rozdílový PATCH je třeba aplikovat přímo na kompletní dodaný v93.769; není automaticky zaměnitelný s PATCH pro starší v93.766.

## 5. Regresní kontrola a srovnání s původní verzí

1. **15/15 PASS** v současné cílové sadě `test_93760*` až `test_93770*` (včetně nových 6 asercí pro minutu nehody). `node --check` pro `app.js` i `hmk-app.bundle.js` prošel.
2. **Široká historická sada 265 skriptů:** 147 PASS, 118 FAIL. Tyto staré skripty nejsou všechny udržované ani zapojené do aktuálního release gate; některé očekávají neexistující testovací složku `repo`, jiné ověřují historické chování jiných subsystémů.
3. **Kontrolní srovnání proti nepozměněné původní v93.769:** všech 118 z neúspěšných skriptů skončilo FAIL i proti původní verzi. **Nová selhání typu v93.769 PASS → v93.770 FAIL: 0/118 prověřených kandidátů.** Toto potvrzuje shodné rozdělení PASS/FAIL, nikoli automaticky totožnou příčinu každého starého selhání.
4. **Chromium:** potvrzen interaktivní scénář nehodové hranice, nový kalendářový zákaz, návazná Injury/Morale, původní navazující činnosti. Přechod přes půlnoc prošel i po finální opravě (4 doklady, 4 nezávislé denní meteorologické položky, jediný posun na Den 2 · 00:20). Při jednom opakování se objevil přechodný problém testovacího průvodce (nezobrazené tlačítko Stage po vyplnění počasí); další úplné opakování prošlo. Příčina přechodného stavu zatím není izolována, takže spolehlivost všech permutací není prohlášena za stoprocentní.
5. **Integrita distribuce:** zdrojový ZIP obsahuje 1 109 souborů. V souboru SHA-256 je doloženo, že `původní v93.769 + PATCH v93.770` dává stejný obsah jako `FULL v93.770`, a že žádný původní soubor nebyl odstraněn.

**Závěr release-gate:** Nová oprava časového okna nemá proti původní v93.769 nově vzniklé selhání v celé prozkoušené historické regresi. Přesto nelze tvrdit „všechny testy PASS“ ani „Pochod A–I 100 % hotovo“: historie má existující chyby/zastaralé testy a cílený dlouhý Encounter + více Healing + další den scénář zůstává otevřen.
