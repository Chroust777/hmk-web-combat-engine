# HMK Keeper’s Ledger v93.740 — zpětná kontrola a propojení Cold Hazard

Základ: úplná verze v93.739. Pravidlový podklad: HMK v1.2, především str. 117–120, 133 a 149. V rozporu mezi popisy vybavení se pro Cold Hazard řídíme tabulkou str. 149 podle výslovného rozhodnutí GM.

## Změny v této verzi

- **Knihovna:** u ověřených předmětů je navíc explicitní Cold Hazard AV: blanket/bedroll/cloth cloak +1, heavy bedroll/padded cloak +2, stan +2 jen při jeho postavení. B/E/P/F nadále znamenají ochranu těla a F se přes oblastní ochranu počítá do Area AV. U ostatních jednotlivých částí zbroje není vymyšlen individuální speciální bonus: detail nyní přesně popíše, že jejich F vstupuje do celkového Area AV; předchozí matoucí věta o neexistujícím bonusu odstraněna. Duplicity pokrytých míst potlačeny včetně nadbytečných vnořených struktur; směrové výjimky se uchovávají samostatně.
- **Inventář:** oblečený zbrojní plášť je rozpoznáván ze slotu `worn`. U cestovního pláště z obecného vybavení GM výslovně potvrzuje `coldWorn`, aniž by tím změnil slot používaný Combatem. Při změně majitele / slotu se flag ruší. Nesený bedroll nebo stan automaticky neznamená jeho rozložení.
- **Cestování:** v Cold Hazard zadává GM skutečně používané vybavení z inventáře, nikoli ničím nepodložené libovolné AV. Oblečený plášť se použije automaticky. Další bedroll/blanket, postavený stan, jeskyně a oheň mají potvrzovací krok. Nesčítáme mechanicky všechna dostupná zařízení; zdroje jsou doloženy u výsledku. Area AV se vypočítává ze skutečně oblečené zbroje a je omezeno na max. 4 body dle HMK str. 149.
- **Předměty a zdroje:** Heavy bedroll +2 dle str. 149; ostatní hodnoty podle téže tabulky.
- **Pravidla str.:** nyní ověřeno v lokálním Chromium ve skutečném výsledném knižním (folio) zobrazení: text i stránka v tomtéž řádku jako název (Padded Cloak i Bedroll). Odkazy součástí kompletů přecházejí na přesné ID katalogové položky a rozbalí její parametry.
- **Záhlaví Knihovny:** dodatečně opraven počet záhlaví po zavedení samostatného sloupce Chlad AV; jinak se Cena/Hmotnost zobrazovaly pod chybnými názvy.

## Zpětná kontrola požadavků a hranice ověření

| Požadavek | Současný stav | Doklad |
|---|---|---|
| Duplicita anatomického krytí | Upraveno v detailu; kontrolovat další vlastní katalogové záznamy s nestandardní strukturou | zdrojový kód + lokální folio vykreslení |
| B/E/P/F oddělit `/` | Pro ověřené části funguje | knihovní vykreslení a testy |
| Cold Hazard AV správné | Pro ověřené typy vybavení; neznámé předměty nevytváří automatické AV | 33 kontrol nového modulu |
| Nahradit neověřenou větu o vrstvení | Starší věta odstraněna; přípustnost konkrétní kombinace dál ověřuje validátor | zdrojový kód |
| Odkazy hotových kompletů | Klikací odkaz na konkrétní ID ověřený v Chromium | lokální Chromium |
| Pravidla str. vedle názvu | Opraveno v HTML výsledné knihy, nikoli jen tabulky | lokální Chromium, screenshot |
| K vyřízení + Plánované události vlevo; kalendář nahoře vpravo | V lokálním Chromium ověřeno rozložení ve dvou stranách; levý seznam bez pevné hranice výšky | prohlížečová diagnostika |
| Globální deaktivace všech nedostupných hodů a typografická jednotnost | Pravidla z v93.738 zachována, neproveden úplný audit všech historických obrazovek | otevřená oblast, nelze označit za 100 % |
| Zásady explicitního potvrzení GM | Zachovány v nových výběrech vybavení; žádný náhodný hod ani záznam při samotném výběru | cílené testy a QA |

## Testy

- `tools/test_93740_cold_gear.cjs`: 33 PASS.
- `tools/test_93740_area_weather.cjs`: 14 PASS.
- Lokální Chromium: odkazy kompletů, vykreslení zdroje u názvu, knihovní AV, inventární potvrzení pláště, formulář počasí a uspořádání kalendáře — bez JS page errors.
- Navazující regresní běh: **18 PASS / 20 spuštěných**. Jedna sada `test_93739_library_cold_layers.cjs` ve skutečnosti v projektu chybí, a proto ji nelze interpretovat jako selhání funkce. `test_library_help_495.cjs` selhává na historickém doslovném porovnání atributu `title`, který je nyní nahrazen `data-hmk-help`. Nepovažuji tyto dvě sady za PASS.
- Původní `test_93739_library_calendar.cjs` je pevně vázán na starou verzi a starou větu o Cold AV; nelze jej bez modernizace označovat za test nové logiky.

## Dosud otevřeno

1. Plné integrované prohlížečové E2E všech kombinací zbroje, aktivit a obnovy z archivů; aktuálně proběhly lokální izolované klikací scénáře, nikoli test nasazeného GitHub Pages.
2. Zpětný audit všech historických UI testů na zastaralé textové kotvy a kontrola všech vlastních katalogových položek.
3. Celková auditní podmínka, že žádná jiná obrazovka nemá předčasné vyhodnocení nebo aktivní nedostupný hod — neschvaluji plošně bez samostatného auditu.

**Nepovažovat tuto verzi za konec celého projektu ani za kompletní audit všech jeho částí.**
