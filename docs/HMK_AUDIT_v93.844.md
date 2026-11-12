# HMK v93.844 — Equipment Hazard F/CF: povinné minutové pokračování

**Výchozí FULL:** v93.843. **Autorita:** HârnMaster v1.2, tištěná strana 148; původní časová referenční jednotka odpovídá 240 minutám. **Datum auditu:** 12. 11. 2026.

## Reprodukovaná chyba v93.843

Opravářský Skill Test určoval skutečný výsledek a průchod Hazardem zapisoval stav věci, ale u výsledků **F/CF** chyběl účetní a časový závazek. Po první epizodě mohl uživatel zahájit další Pochod bez spotřebování času oprav; u F mohl GM označit věc za použitelnou i bez tohoto času. Navazující Slow Mode u výsledku **S** byl navázán na délku aktuální uživatelské epizody, nikoli na původní referenční délku HMK.

## Pravidlová fakta / explicitní implementační adaptace

Podle HMK v1.2, str. 148: **CS** opraví předmět bez zdržení; **S** opraví předmět a přidá jeden Slow Mode při následujícím cestování; **F** opraví předmět za cenu celého následujícího původního časového období; **CF** spotřebuje celé následující původní období neúspěšnými opravami a předmět se musí opustit. Jedna postava z aktuální družiny provádí původní Skill Test; jeho d100 se neopakuje při zpracování času.

**Implementační rozhodnutí pro minutový model (není doslovným textem HMK):** závazek F/CF se rovná 240 minutám, které smí uživatel potvrdit v libovolných kladných celočíselných úsecích se součtem přesně 240; interval nevyžaduje 240 minut najednou. U S se Slow Mode nese do skutečně odcestovaných 240 minut, aby 30/60minutový Pochod nevymazal následky dříve. Referenční délka 240 minut nevynucuje pevné trvání nových epizod.

## Funkční změny

- Nový autoritativní `src/integration/hmk-equipment-time-work-93844.js` znovu sestavuje povinnosti z neměnných epizodových dokladů a každého nově potvrzeného opravářského úseku. Doklady obsahují konkrétní zdrojový hazard, opraváře, vlastníka, ID předmětu, původní Skill Test a přesně spotřebované / zbývající minuty.
- Nové F a CF jsou v původním inventáři nedostupné; u F se stejná věc označí za opravenou až po 240 minutách, u CF se až po 240 minutách skutečně odstraní z inventáře. Původní finanční historie ani původní opravářský hod se nepřepisuje.
- Běžný **Pochod celé původní družiny** se nespustí, dokud její Equipment F/CF povinnost není odpracována. Původně vybraný opravář musí v novém intervalu vybrat **Jiná činnost**, výslovně kliknout **Potvrdit opravářskou činnost v tomto intervalu** a dokončit skutečnou kalendářní transakci. Samotný select, Enter ani toto tlačítko neposouvají čas. Jiný člen původní skupiny může mezitím vykonat nepohybovou činnost.
- Přenos odpovědnosti mezi opraváři či podvržení nového d100 není povolen. Kontroluje se změna, opakované použití nebo přečerpání minut, identita předmětu a původní opravář.
- GM nemůže nově vzniklý F opravit ruční změnou inventárního stavu, dokud neuplyne povinných 240 minut. Staré uložené epizody bez nového markeru se **nemění**, abychom nezaváděli fiktivní historický čas.
- Zobrazení povinnosti a potvrzovacího tlačítka používá standardní pergamenovou grafiku.

## Skutečné testy a jejich hranice

| Test | Výsledek | Artefakt |
| --- | --- | --- |
| Chromium F: první 60minutový Pochod, skutečný Survival CF / d10 Equipment / Textilecraft F | **PASS** | `tools/browser_93844_equipment_work.py F` |
| Chromium F: pokus zahájit další běžný Pochod před opravou, odmítnutí + zrušení bez změny kampaně | **PASS** | `tools/evidence_93844/EQUIPMENT_F_WORK_E2E.json` a log |
| Chromium F: čtyři další explicitně potvrzené 60minutové činnosti, F obnoví předmět až po 240 minutách | **PASS** | stejný skript, `EQUIPMENT_F_TIME_PANEL.png` |
| Chromium CF: stejné čtyři intervaly, zablokování dalšího Pochodu, odstranění předmětu až na konci | **PASS** | `tools/browser_93844_equipment_work.py CF` |
| Obnova aplikace z uložených dat po prvním 60minutovém úseku (bez HTTP reloadu) | **PASS** | oba Chromium skripty |
| Chromium: původní Equipment CS, S, ponechání a opuštění | **PASS** | `tools/browser_93843_equipment_e2e.py` a samostatné logy v důkazech |
| Čisté jednotkové testy, tamper replay, dvojí použití, změna opraváře, minutová mez, S s přenosy 60 minut | **PASS – 60 kontrol** | `tools/test_93844_equipment_time.mjs` |
| Opravářská dovednost podle předmětu, doklady | **PASS – 58 kontrol** | `tools/test_93843_equipment_skill.mjs` |
| Základní pravidlová matice počasí, cestování, orientace atd. | **PASS – 7 869 kontrol** | `tools/test_93785_travel_matrix.mjs` |
| Reálný HTTP reload GitHub Pages, uživatelova konkrétní kampaň | **BLOCKED / NEOVĚŘENO** | Toto prostředí netestovalo uživatelův skutečný web. |
| Úplná paralelní plánovací matice jiných členů, přechod přes půlnoc, všechny kombinace výstroje | **NEOVĚŘENO** | Není součástí deklarovaných PASS. |
| Historické testy s natvrdo vyžadovanou `APP_VERSION='93.840'` a `93.842` | **SKIP – zastaralá kontrola verze** | Nejde o úspěšnou regresi ani důkaz nové chyby. |

Chromium testy používají **produkčně sestavený 455modulový bundle** na izolované lokální stránce, skutečné ovládací prvky, Skill Tests, tlačítka a kalendářní potvrzení. Skutečný reload HTTP adresy není potvrzen.

## Co zůstává otevřené mimo tuto cílenou návaznost

Samostatné Survival CF / Accident a Complication návaznosti, Tracking CF → Bearing → další Pochod, historická zdravotní regrese počasí a plná kombinatorika souběžných činností. Tyto větve nebyly touto změnou označeny PASS.

**Poznámka k minulosti:** nové povinnosti vznikají pouze z F/CF epizod uložených se značkou `equipmentMinutePolicy=hmk-148-240-minute-splittable-v93.844`. Staré doklady v93.843 zůstávají čitelné a nevytváří se jim zpětné fiktivní časové výsledky.
