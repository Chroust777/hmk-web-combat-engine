# HMK Keeper’s Ledger v93.738 — audit deaktivovaných hodů, typografie a Chronicle Spread

**Základ:** kompletní balíček v93.737. **Rozsah:** uživatelsky požadovaná odbočka, nikoliv opakování kompletního pravidlového auditu celé aplikace.

## Závazné globální zásady

1. Není-li pravidlové vyhodnocení dostupné (např. budoucí termín nebo chybějící nutriční doklad), současně nejsou dostupné potvrzovací tlačítko, software-die a ruční číselný vstup **příslušného hodu**. Nelze je obcházet syntetickým `click` nebo `submit`. Pole pro definování podmínek, jež mohou povinnost odemknout, se bezdůvodně nezamykají.
2. Výsledky a zápisy vznikají až po potvrzení GM; generování pouze vyplní hod.
3. Web používá jednu rodinu písma pro nadpisy a jednu pro běžný text, s centrálními CSS tokeny. Nadpisy: `--hmk-font-heading` → Cinzel (fallback Georgia). Běžný text: `--hmk-font-body` → Cormorant Garamond (fallback Georgia). Přepisují se jen rodiny, ne plošně všechny velikosti a rozměry tabulek. Kód/JSON zůstává monospace.
4. Chronicle Spread — Skills a Fatigue při Edit používají pergamenovou paletu jako ostatní části deníku. Zdravotní souhrny v zásobování mají velikost doplňkového textu, ne velké nadpisy.

Trvalá projektová pravidla jsou také zapsána v `docs/PRAVIDLO_POTVRZOVANI_GM.md`.

## Změněné funkce

- **Hladovění / žízeň — osobní i skupinové Zásoby & výživa:** sjednocená podmínka `clock.minute < dueMinute || mode === 'pending'` pro číselné d100, tlačítko d100 a potvrzení. Dále kontrola stejné podmínky v obsluze kliku a odeslání formuláře.
- **Zvíře — Grim Wound / Coma Course:** pole skutečných hodů (včetně odvozených zadání) deaktivována, dokud není přesný termín.
- **Animalcraft Training:** když pravidlový výpočet požaduje 0 d10, jsou vypnuté generování i ruční zadávání série a neplatná hodnota se vyčistí.
- **Provisions:** texty „Aktivní následek“, „Vznik“, „Aktuální následek“ a „Další pravidlový zdravotní hod“ mají jednotnou kompaktní typografii.
- **Chronicle Spread / Edit:** Fatigue má pergamenový podklad a světlé vstupy; Skills mají světlý pergamen včetně záhlaví, lepkavého prvního sloupce, číselných polí a přehledových tabulek.
- **GitHub Pages:** verze v `index.html` a `app.js` je v93.738 a nové revizní řetězce CSS/JS omezují načtení staré mezipaměti. Aktualizován offline `hmk-app.bundle.js`.

## Výsledky testů

- **Regrese 16/16 PASS:** `test_93736_carried_auto_weather`, `test_93735_supply_malnutrition`, `test_93734_episode_allocation`, `test_93734_stalking_vigilance`, `test_foraging_water_storage`, `test_93734_animal_health`, `test_93734_animal_completion`, `test_93734_animal_load_timeline`, `test_93734_animal_weather`, `test_93734_healing_remaining_544`, `test_93734_healing_surgical_audit_542`, `test_93734_multi_infection_healing_541`, `test_93734_animal_departure`, `test_93734_skill_chain_545`, `test_93734_skill_animal_survival_539`, `test_nutrition_activity_392`.
- **Nová statická kontrola 16/16 PASS:** `tools/test_93738_ui_contract.cjs`.
- **Lokální interaktivní Chromium (bez produkčního GitHubu):** (A) den 3 08:00, zdravotní termín den 4 08:00 — d100/softwarový hod/potvrzení vypnuté; vynucený klik a submit beze změny deníku. (B) den 4 08:00, bez doložené dávky — všechny tři prvky stále vypnuté. (C) den 4 08:00, s doloženou dávkou — všechny tři prvky dostupné; kliknutí na softwarovou kostku jen připraví číselnou hodnotu a nemění deník. V prohlížeči nebyly zaznamenány JS chyby.
- **Vizuální Chromium:** samostatně ověřen vypočtený styl editačních komponent (Fatigue a Skills) a jednotná rodina písma. Záběr Chronicle je syntetická reprezentativní komponenta se skutečnými CSS selektory, ne screenshot reálné kompletní postavy.
- **Kontrola syntaxe:** `node --check app.js` prošla. ZIP integrita ověřena při balení.

## Přiznané hranice auditu

Nebylo provedeno klikání na veřejné GitHub Pages ani plná interaktivní prohlídka všech formulářů aplikace. Globální pravidlo je dokumentováno a opraveno u výše vyjmenovaných míst, nelze z toho odvozovat, že nikdy neexistuje žádný jiný historický formulář s obdobnou chybou. Tyto ostatní větve vyžadují vlastní cílený audit. Nové styly mění font-family globálně; jednotlivé historické komponenty mohou stále obsahovat specifické velikosti/řádkování, které je nutné revidovat po obrazovkách.

## Instalace

Rozbalte `PATCH_HMK_v93.738.zip` a nahrajte změněné soubory do kořene stejného GitHub repozitáře, **zachovejte přesné složky** (zejména `docs` a `tools`). Potom obnovte GitHub Pages. Pro úplné bezpečné vrácení/obnovu je přiložena také kompletní v93.738.
