# HMK Web Combat Engine v93.841 — dílčí audit a předání PATCH

**Výchozí stav:** FULL v93.840. **Rozsah:** vzhled Stáje a orientační tabulka 16 druhů; povolení jezdecké soupravy pro osla a mezka. **Pravidlový zdroj:** HMK v1.2, tištěná str. 122.

## Změny

- V části „Výstroj, náklad a vozidla“ jsou výraznější pergamenové podklady tabulek, boxů, formulářů a přehledu zatížení.
- Z tabulky druhů zmizely zavádějící technické poznámky „bez automatického režimu“, „nepovolen“ apod. Nahradily je popisy konkrétních, tiskem HMK doložených kategorií.
- Vyhodnocení jezdeckého zvířete zahrnuje osla a mezka jako equidy; kontrola výstroje nyní připouští jezdeckou soupravu (uzda, deka, sedlo). Ověření výstroje a skutečné identity zvířete se nadále provádí v původních mechanismech aplikace.
- U tahačů je zachována přesná tabulková mechanika HMK: kára jeden vůl / cart horse, vůz dva voli / cart horses, saně jeden až dva cart horses.
- Slon: poznámka o speciální plošině (200 lb / 480d) a základu ENC 5 za 80 plných lb. Kompletní automatizace převozu na sloní plošině *není součástí této aktualizace*.

## Ověření

- `node --check` pro `app.js`, oba změněné integrační moduly a sestavený bundle: PASS.
- `node tools/test_93841_stable_rules.mjs`: PASS, 37 cílených kontrol zdrojového modelu.
- `node tools/test_93785_travel_matrix.mjs`: PASS, 7 869 matematických kombinací.
- Skutečný klikací průchod Pochodu s oslem/mezkem a následným intervalem: **NEOVĚŘENO**.
- Záznam o uzamčení nastavení sledování stopy z další epizody: **NEOPRAVENO, otevírá se v následujícím auditu**.
- Pokrytí *všech* možných výstrojních kombinací napříč 16 druhy, speciální sloní plošina a nové druhy tažení mimo explicitně tištěnou tabulku: **NEOVĚŘENO** nebo nepodloženo pravidly; tato aktualizace je neprezentuje jako hotové.

## Instalace

Rozbalit PATCH do stejné kořenové složky jako FULL v93.840 (včetně souborů pod `src/` a `docs/`), přepsat změněné soubory; obnovit stránku bez cache. Při nasazení na GitHub Pages je třeba nahrát *obsah rozbaleného PATCH*, nikoliv pouze soubor ZIP.
