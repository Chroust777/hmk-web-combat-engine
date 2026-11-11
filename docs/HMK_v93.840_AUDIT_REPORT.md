# HMK Web Combat Engine — audit v93.840

**Datum:** 11. listopadu 2026  
**Východisko:** doložený `HMK_v93.839_FULL.zip`  
**Rozsah:** explicitní potvrzování v Equipment/Complication/Direction Hazard, redukce obrazovky `3 · Zvířata a doprava`, přehlednější `Výstroj, náklad a vozidla` ve Stáji.

## 1. Reprodukce vady

Původní hazardové rozbalovací nabídky okamžitě spouštěly přepočet epizody a měnily průběh navazujícího průvodce. Některé změny nebyly finálním zápisem do kampaně, ale působily jako schválené rozhodnutí před kliknutím. Požadovaný kontrakt rozlišuje pouze rozpracovaný údaj a rozhodnutí GM potvrzené vlastním tlačítkem.

## 2. Oprava Hazard

- Nové **Potvrdit volbu Hazardu** (`type="button"`), vedle explicitního stavu „Rozpracované volby / Volby potvrzené GM“.
- Ochranná projekce `episodeFormSnapshot`: dokud hazardové rozhodnutí není potvrzeno, z výběrů se nesestavují nové závazné výstupy; pro průběžný náhled lze použít pouze dříve potvrzený obsah. Samotné `input` a `change` hazardních polí nesmějí vyvolat `updateEpisodePreview` ani zápis do kampaně.
- Pokryté pole: disposition, affected item, repair skill, worker, complication decision/scope, změna trasy, příslušné důkazy a stupně dovednosti, minuta události, direction d10, Awareness doklad/defer, delay a individuální komplikace.
- Před otevřením navazujícího testu a před finálním uložením se kontroluje příslušné potvrzení. Změní-li se vstupní kontext, staré potvrzení již neplatí.
- Při **opravářském Skill Testu** se nová nepřepsatelná vazba na doložený výsledek po skutečném potvrzení testu převede do již potvrzené volby. Ostatní ruční pole, volba předmětu a kostky se nikdy nepotvrdí automaticky. To řeší regresně odhalené zablokování tlačítka dokončení po výsledku opravářského testu.

## 3. Část 3 · Zvířata a doprava

- Režim *Pěšky / Jízda / Kára / Vůz* je nyní přímo na začátku stejné části spolu se stavovým indikátorem; nepřeskakuje se do jiné karty.
- Ovládání jízdního zvířete, vozidel, tažné skupiny a aktualizace Stáje jsou kompaktně seskupena, ale původní formuláře a jejich potvrzovací logika zůstávají zachovány.
- Kontrolní seznam dopravy má jeden kompaktní řádek na povinný krok; tlačítka jsou vedle názvu. Dlouhé odůvodnění se zobrazí přes `Proč je to potřeba?` na témže místě, takže nezabírá prostor před samotnými akcemi.
- Pro žádný ze čtyř režimů se při pouhém přepnutí dopravy neukládá nová cesta ani čas.

## 4. Stáj · Výstroj, náklad a vozidla

- Pergamenový podklad, horní čtyři kompaktní metriky (výstroj, náklad, volná kapacita, ENC/Move) a stručná vysvětlení skrytá za místním rozbalením.
- Výstroj, vozidla a náklad jsou nyní oddělené krátké operativní tabulky s předáním/potvrzením vedle položky; původ dokladu je nadále dostupný v tooltipu místo širokého samostatného sloupce.
- Zachovány původní funkce: nákup, přijetí zdarma, fyzický inventář, převod mezi zvířaty nebo zpět k vlastníkovi, vozidla, přepravovaný náklad, kapacity, výpočty ENC a evidenční doklady.
- Nákupy a přesuny mají nadále vlastní potvrzovací tlačítka. Rozbalovací seznam sám nepřevádí předmět.

## 5. Skutečně provedené testy

| Ověření | Stav | Důkaz |
|---|---|---|
| Chromium: Survival CF → Equipment → ponechat bez opravy → 60 min → persistentní záznam | PASS | `tools/browser_93840_hazard_e2e.py ignore --reload` |
| Dvojí změna Equipment select a Enter bez potvrzení; čas / doklad nezměněny | PASS | stejný skript, výpis `NO AUTO COMMIT ON SELECT` |
| Equipment → opuštění výstroje → uložený výsledek | PASS | `tools/browser_93840_hazard_e2e.py abandon` |
| Equipment → Hideworking S → návrat z testů → uložení → 3 další cestovní intervaly | PASS | `tools/browser_93840_hazard_e2e.py S` |
| Equipment → Hideworking F → uložení | PASS | `tools/browser_93840_hazard_e2e.py F` |
| Chromium: knihovní nákup zdarma/za peníze, Stáj, výstroj, fyzické přesuny | PASS, 38 kontrol | `tools/browser_93840_stable_catalog.py` |
| Chromium: převody mezi zvířaty, inventář, ENC, náklad a zakázané převody | PASS, 44 kontrol | `tools/browser_93840_transfer_regression.py` |
| Zdrojový kontrakt v93.840 | PASS, 29 kontrol | `tools/test_93840_hazard_confirmation.cjs` |
| Katalog Stáje (opravený kontrakt verze) | PASS, 61 | `tools/test_93840_stable_catalog.cjs` |
| Evidence inventáře a výstroje Stáje | PASS, 29 | `tools/test_93840_stable_transfer.cjs` |
| Jízda a globální počasí | PASS, 20 | `tools/test_93840_mount_weather.cjs` |
| Foraging matice | PASS, 1539 | `tools/test_93833_full_foraging_matrix_audit.cjs` |
| Samostatný Foraging | PASS, 70 | `tools/test_93835_stationary_foraging.cjs` |
| Samostatný Foraging CF | PASS, 48 | `tools/test_93836_stationary_cf.cjs` |
| Tracking reuse | PASS, 15 | `tools/test_93834_party_tracker_reuse.cjs` |
| Shelter / tracking kontrakt | PASS, 12 | `tools/test_93832_shelter_tracking_contract.cjs` |
| Globální počasí bez duplicitního GM potvrzení | PASS | `tools/test_93829_weather_no_double_confirmation.cjs` |
| HTTP adresa otevřená a reloadovaná skutečnou sítí | **BLOCKED** | prostředí odmítá přístup `ERR_BLOCKED_BY_ADMINISTRATOR`; neplést s kontrolou obnovení ze skutečně uloženého JSON v izolované stránce |
| Equipment repair CF celá související zdravotní/vybavovací návaznost | **NEOVĚŘENO** | pokus přerušen při dlouhé iteraci; částečné kroky nejsou PASS |
| Komplexní Tracking CF → Bearing → další Pochod | **NEOVĚŘENO** | mimo rozsah aktuální opravy |
| Starý `test_93764_cargo_wagon.cjs` | **FAIL (předchozí testovací fixture)** | test předává neaktivní zvířecí profil, samotný zdroj pro náklad/vozidla se v93.840 neměnil |

Starší zdrojové testy obsahující **natvrdo v93.839/v93.838** nebo historické názvy funkcí selžou na zastaralém kontraktu; jejich modernizované kopie jsou v nové sadě pod `tools/test_93840_...`. Neoznačují se za automaticky prošlé.

## 6. Důkazy

Nové snímky: `tools/evidence_93840/TRANSPORT_{FOOT,MOUNT,CART,WAGON}.png`, `tools/evidence_93840/STABLE_GUIDE_PARCHMENT_AND_COMPACT_ROWS.png`, `tools/evidence_93840/COMPACT_TRANSFER_INLINE.png`, `tools/evidence_93840/TRANSFER_DESTINATION_DRAFT.png`.

## 7. Další otevřené větve

Samostatný Foraging CF navazující na skutečné hazardy, kompletní Tracking CF → Bearing a historická selhávající větev zdravotních následků počasí jsou nadále **otevřené**; zde nebyly vydávány za ověřené. Úprava nepředstírá mechaniky, které dosud nebyly dotaženy.

## 8. Reprodukce, obnova a integrita

Archiv se skládá z původního FULL v93.839 a explicitně změněných či přidaných souborů. `HMK_v93.839_to_v93.840_PATCH.zip` nesmí obsahovat změněné historické důkazy ze starších verzí. Manifest SHA-256 pokrývá každý soubor ve FULL (kromě samotného manifestu). Ověření se provede porovnáním map relativních cest a kryptografických otisků po aplikaci PATCH na původní FULL.
