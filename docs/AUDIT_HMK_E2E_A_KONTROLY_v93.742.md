# HMK Keeper’s Ledger v93.742 — rozšíření auditu otevřených integračních větví

**Základ:** úplná produkční verze v93.741. **Cíl:** rozšířené ověření zbroj × počasí, soukromé předměty, obnova JSON a deaktivace zdravotních hodů; nevydávat testovanou podmnožinu za plnou exhaustivní kontrolu.

## 1. Změněné chování produkční aplikace

1. **Cold Hazard / vlastní položky:** `src/integration/hmk-cold-gear-93740.js` přiznává přímo pravidlový bonus Cold AV jen doložené tištěné položce. Kontroluje kanonické ID, původní název, hmotnost, kategorii a u zbroje materiál i ověřené anatomické krytí. Záznam v inventáři musí odpovídat svému zdroji, pokud obsahuje `sourceItemId`. Historická záloha s kanonickým snapshotem bez tohoto novějšího pole zůstává použitelná. Vlastní položka pojmenovaná „Padded Cloak“ s deklarovaným `coldAV:99` nezíská oficiální bonus jen podle názvu. Samotná F ochrana z validní zbroje v Area AV tím není dotčena.
2. **Počasí / nedostupný hod:** pokud není možné doložit aktuální Area AV, ruční číslo Weather Hazard, tlačítko automatického hodu i potvrzení jsou deaktivované. Navíc samotný JavaScriptový handler generování kontroluje tento stav, takže syntetický klik nevytvoří neplatný hod.
3. **Weather Shock:** všechny ručně zadávané hodnoty Shock d100, UNC/CF Location Shock, Injury Level a první Coma d10 jsou blokovány stejně jako potvrzení, dokud nenastane doložený termín nebo není dostupné Shock ML.
4. **Paralelní Cold Water Shock:** před splatností je blokován Shock Reroll i pomocné Coma HR/d10. Pro Extended Shock a Coma Course jsou zablokovány Course d100, Physician, přístřeší a další Course parametry až do správného času.
5. **Weather Trauma:** odstraněný duplicitní skrytý `sourceId` z formuláře.
6. **Vydání:** `index.html` a `app.js` aktualizovány na v93.742, včetně query cache bustingu pro GitHub Pages.

Všechny uvedené změny zachovávají výslovné potvrzování GM, nedovolují nevynucené hody a nemění existující historii potvrzených zdravotních událostí.

## 2. Pravidlové ověření ochrany

Podle HMK v1.2 str. 133 a 149 je F-aspect ověřené, skutečně oblečené zbroje součástí Area AV. **Cold:** `min(Area AV, 4) + gear AV + shelter AV + fire FS`; bonus konkrétního oblečeného pláště se přičítá zvlášť, za nesené vybavení či úkryt je nutné doložit použití. **Heat:** `max(Area AV, 1)`; příspěvek pláště ani bedrollu jako Cold gear AV se do Heat nepřenáší. Doložené tištěné vybavení: Blanket +1, Bedroll +1, Bedroll heavy +2, Cloth Cloak +1, Padded Cloak +2, postavený stan +2.

Otestováno 64 vybraných kombinací šesti položek (`Cloth Cloak`, `Leather Shoes`, `Leather Vest`, `Padded Cap`, `Leather Bracers`, `Mail Cowl`). **7 sestav má ověřený úplný Area AV**, takže byly provedeny jednotlivé výpočty všech příslušných Cold d6/d10 a Heat d4/d6/d8/d10/d12 výsledků. **57 sestav se nepodařilo prokázat jako připravené** kvůli neúplnému vrstvení / pravidlovému původu; aplikace je odmítla. Není to důkaz, že všech 57 je podle HMK zakázaných, ani pokrytí všech možných kombinací existující Knihovny. Tento zbytek zůstává pro specializovaný audit konkrétních vrstvených outfitů.

## 3. Test zálohy a soukromých předmětů — lokální Chromium

Na syntetické kampani s postavou, Combat/Health state, kalendářem, skutečně oblečeným katalogovým Cloth Cloak, neseným Heavy Bedroll, vlastní GM položkou a historickým deníkovým zápisem:

- Exportován autentický JSON datový model přes existující aplikaci; záměrně změněny položky, oblečení a deník.
- Soubor skutečně vybrán v prohlížečovém `input type=file` („Importovat JSON zálohu“). Po souhlasu GM obnoveny původní počty a ID, oblečený plášť i jeho Area AV, datum kampaně a potvrzený deník. JSON po obnově odpovídal původnímu exportu.
- Opakovaný import nevytvořil duplicitní záznam. Neplatný JSON byl zamítnut bez přepsání uloženého stavu.
- Nešlo o uživatelskou reálnou soukromou zálohu. Data reálného prohlížeče nejsou v distribučním ZIPu; jejich úplnou kontrolu nelze tvrdit.

## 4. Lokální interaktivní test formulářů

- Weather Shock: před termínem 4/4 číselná pole + potvrzení blokované; v termínu vše aktivní.
- Paralelní Cold Water Shock: před termínem Reroll, Extended Course i Coma Course kompletně nedostupné, ve správném čase zpřístupněné (včetně vedlejších čísel a přepínačů).
- Weather Hazard: při nedoložené zbroji ruční vstup + automatický hod + potvrzení deaktivované; syntetické kliknutí nezmění výsledek. Po doložení AV se prvky zpřístupní, hod pouze vyplní pole.
- Provedeno bez přístupu na veřejný GitHub Pages, s reálným Chromium nad lokálně injektovanou aplikací a testovacím úložištěm. Není to plošný prohlížečový průchod všech obrazovek webu.

## 5. Regrese a jejich klasifikace

**Široká vybraná regrese:** 37 sad, po aktualizaci předpokladů testů aktuálního zdravotního modelu a správných lokálních importů **33 PASS, 4 FAIL**. Běh zahrnuje starší moduly Cestování, nemocí, zbroje, kalendáře, zvířat, výživy a počasí.

**Dílčí cílené testy (samostatně, ne sečtené s širokou regresí):**
- `test_93742_provenance_and_weather.cjs`: **1 722 PASS**; z toho jen 7 konkrétních sestav prošlo do úplného Area AV, ostatní se bezpečně nepovažovaly za doložené.
- `test_93742_medical_weather_ui.cjs`: **22 PASS** statických kontrol; doplněno klikáním v Chromium.
- `test_93740_cold_gear.cjs`: **33 PASS** po převedení testovacích katalogových položek na skutečné původní záznamy.
- `test_93740_area_weather.cjs`: **14 PASS**.
- `test_93741_weather_ui_contract.cjs`: **24 PASS**.
- `test_calendar_all_time_barriers_509.cjs`: **55 PASS** po opravě zastaralého testovacího pole `combatState` na dnešní `healthState` a aktualizaci počtu skutečných handlerů; jde o opravu fixture, nikoliv důkaz nové opravy kalendářního algoritmu.

**Čtyři dosud neúspěšné historické sady:**
1. `test_inventory_stacking_496.cjs` — deleguje na starou sadu v93.497.
2. `test_inventory_library_497.cjs` — vyžaduje sloučení předmětů se shodným názvem/WQ i při různém umístění, provenienci a obsahu; tento předpoklad je v rozporu s bezpečnou evidencí současného inventáře.
3. `test_inventory_ui_498.cjs` — naopak vyžaduje samostatné řádky / per-row ovladače, které neodpovídají některým dnešním přehledům; staré UI kontrakty nebyly kompletně přepsány na současné rozhraní.
4. `test_trekking_ui_519.cjs` — očekává staré HTML bloky a statické názvy formulářů, které jsou v novém cestování jinak strukturované.

**Závěr:** Tyto čtyři testy nejsou PASS a nejsou ani důkazem, že je správné aplikaci vrátit do starého chování. Před další úplnou regresí je nutné vytvořit soulad nových testů s aktuálním skutečným pravidlovým kontraktem inventáře a Cestování, nikoliv pouze odstranit asserty. V tomto vydání je neoznačuji za uzavřené.

## 6. Zbývající otevřené hranice

- Úplný kombinatorický audit všech vrstev a všech skutečně vlastněných předmětů: **otevřeno**.
- Import konkrétních soukromých dat uživatele a reálný běh jeho dlouhodobé kampaně: **nelze ověřit bez dané zálohy**.
- Kompletní proklikání všech historických průvodců (včetně neaktivních kostek a jejich ručních vstupů): **otevřeno**; nové nalezené chyby byly opraveny, ne všechna místa jsou pokryta.
- Čtyři výše popsané historické regresní sady: **neuzavřeno**.
- Přímé klikání na nasazené GitHub Pages: **neprovedeno a nepovažováno za dostupnou testovací metodu**.

**Nasazení:** v93.742 se instaluje přes kompletní v93.741. Je nutné zachovat přesné cesty včetně `src/integration/hmk-cold-gear-93740.js`, aktualizovat `index.html`, `app.js` a nevynechat žádný soubor v PATCH. Před změnou si ponechat zálohu kampaně. Nezaměňovat testovací QA JSON za skutečnou zálohu uživatele.
