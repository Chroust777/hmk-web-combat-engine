# HMK Keeper's Ledger v93.711 – Audit výsledků

Výchozí stav: kompletní produkční v93.710 vzniklá z vydaného ZIPu v93.700 a návazných PATCHů.

## Opravené produkční chyby

1. **Katalogová cena vlastní položky.** Na původní v93.710 byl vstup „Cena / hodnota (text)“ ukládán do `properties.value`, zatímco katalog, cenové nabídky a výdej čtou výhradně `properties.pricePence`. V Chromium reprodukováno: vlastní položka s hodnotou 79 se zobrazila jako „Cena —“ a neměla cenovou nabídku. V nové verzi lze vyplnit samostatnou nezápornou celočíselnou cenu v d u všech čtyř kategorií, ukládá se do `pricePence`, je zobrazena jako „Cena 79 d“ a vytváří cenový doklad. Testována úprava 79 → 124 d, ostatní kategorie, cenová nula vs. prázdné pole.
2. **Dřívější vlastní ceny.** Pokud dřívější vlastní položka kategorie „ostatní“ obsahovala jednoznačné celé číslo v textovém `value`, je při načtení normalizováno do `pricePence`. Nejednoznačný text (např. „hodnota 8“ či pojmenování) se nehádá. Normalizace zůstane v paměti a při příštím uložení se uloží natrvalo. Chromium ověřil načtení a trvalé zapsání 75 d.
3. **Chybějící produkční modul v předchozím ZIPu.** `app.js` vydané v93.710 odkazovalo na `src/integration/hmk-weather-skin-coverage.js`, ale vydaný rozdílový ZIP tento soubor neobsahoval. To ohrožovalo přímou produkční načítací cestu `index.html → app.js → src/`, i když vestavěný bundle modul obsahoval. v93.711 přidává přesný modul; byla ověřena přítomnost všech 285 lokálních importů `app.js`, syntaktická kontrola a nové sestavení synchronizovaného bundle.

## Ověření oblečeného vs. neseného vybavení

Produkční Frostbite/Sunburn resolver i společný live armour resolver berou ochranné vrstvy pouze z `inventory.slot === 'worn'`. Carried, chest a worn jiné postavy se nezapočítávají. 10 cílených Node kontrol: **PASS**. Specifické kontroly fyzické ochrany oblečeného cloth, plate i neměnnosti carried.

## Regrese

- 15: Frostbite/Sunburn calculations — PASS
- 79: cestovní Weather Hazard, návaznosti, kalendář — PASS
- 49: současné infekce, přesné termíny — PASS
- 68: dlouhodobé Healing — PASS
- 39: chirurgické a infekční následky — PASS
- 10: worn vs. carried/foreign weather and shared armour — PASS

**Celkem 260 cílených Node kontrol PASS, žádné selhání v těchto sadách.**

Chromium s vloženým produkčním bundlem: reprodukce chyby v93.710; vytvoření a editace nové ceny v93.711 u všech kategorií; načtení staré ceny; Frostbite vznik jedné rány bez duplicate roll a přístup do Weather Injury Care. PASS v provedených scénářích.

**Nevyzkoušeno:** skutečné HTTP Chromium otevření; lokální HTTP server byl prostředím zablokován. Žádné potvrzení produkčního browser bootu nepředstíráme.

## Nedokončená auditní oblast Weather Injury

1. **Složená dlouhodobá zdravotní osa:** čtyři postavy se souběhem Frostbite, Sunburn, Shock, více ran na jedné postavě, Infekcí, Extended Shock/Coma, dokončením dalšího cestovního úseku v jednom čistém UI průchodu. Node testy tuto kombinaci nenahrazují.
2. **Časovaný Treatment v UI:** při Chromium kontrole správně fungovalo načtení dnů od rány a jednoho aktivního formuláře, ale pole `procedureStartMinute` a `procedureEndMinute` zůstala prázdná. Prověřit jejich automatické doplnění jen tam, kde to Kalendář skutečně dovoluje, i přesné navedení uživatele, pokud konec zákroku zatím nelze znát.
3. **Složitá krytí a vrstvy:** směrové krytí pláště, neúplně ověřená vlastní zbroj, poškozené vrstvy, události mezi svlečením a oblečením, a přechody F AV 0 / 1–3 / 4+. Neznámá ochrana musí zůstat blokována nebo být doložená GM, nikdy uhádnutá.
4. **Závěrečný UI audit:** přechod Kalendář → jediný povinný zdravotní krok → trvalý zápis → zmizení splněné povinnosti → další úkol. Musí platit i pro několik ran splatných v jedné minutě.
5. **Produkční HTTP E2E:** nezávisle potvrdit na GitHub Pages / dostupném HTTP serveru po aplikaci PATCH, včetně přímé cesty do nového modulu a zobrazení knihovní ceny.

**PATCH** proti v93.710: `app.js`, `hmk-app.bundle.js`, `index.html`, `src/integration/hmk-weather-skin-coverage.js`. Žádné ostatní produkční soubory nebyly změněny.
