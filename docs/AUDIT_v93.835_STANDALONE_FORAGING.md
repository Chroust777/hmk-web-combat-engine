# HMK Web Combat Engine v93.835 — audit samostatného minutového Foraging

**Základ:** archiv `hmk-web-combat-engine-main_11_11_20267.zip`, deklarovaná v93.834, HMK v1.2, strany 145–150.  
**Rozsah:** skutečné zdrojové moduly, svázaný browser bundle, headless Chromium (izolovaná lokální stránka), stacionární Foraging v minutovém modelu, nezávislý účet zásob, úložná data a základní regresní kontrola Tracking.  
**Význam statusů:** PASS = skutečně provedený test uspěl; FAIL = reprodukovaná chyba; BLOCKED = funkční scénář zastaven reálnou chybou nebo omezením prostředí; SKIP = záměrně vynechán; NEOVĚŘENO = neprovedeno.

## 1. Vstupní kontrola FULL ZIP

- Originální archiv má 1 352 položek (1 338 souborů + 14 adresářů) a velikost přibližně 44,6 MiB. ZIP CRC kontrola: PASS; duplicitní cesty: 0; podezřelé cesty mimo kořen: 0.
- `index.html` a vstupní `app.js` původně deklarovaly v93.834. Zdrojové `src`, aplikace `app.js`, sestavený `hmk-app.bundle.js`, složky `tools`, `assets` a `docs` jsou obsaženy. Nový build synchronizoval tři upravené zdrojové moduly; Chromium vykonal test nad výsledným bundlovaným JavaScriptem.
- Soubor **`docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md` není součástí vstupního archivu**. Byl respektován standard explicitně napsaný v zadání uživatele; původní chybějící dokument nebyl uměle vytvořen nebo nahrazen.
- Původní samostatný Foraging přijímal `forageD10` bez důkazu Survival/Orienteering a počtu dosažených Foraging Modes: **FAIL reprodukováno z původního zdroje**, následně opraveno.

## 2. Autorita HMK v1.2 a realizace

| Prvek | Pravidlo HMK | Implementace v93.835 | Status |
|---|---|---|---|
| Samostatný sběr bez pohybu | Orienteering z Survival SV s bonusem +2 SV (s. 145) | Samostatná větev vždy vyžaduje nový prokazatelný Survival Skill Test v aktuální minutě, upravený +2 SV | PASS, browser / model |
| Foraging Modes | První dvě existující hvězdy povinně Foraging; další Foraging, Stalking nebo Vigilance; žádný Progress/Bearing (s. 145) | Automatická alokace primárně Foraging; ruční alokace zkontrolována modelem | PASS, model; některé ruční UI kombinace NEOVĚŘENO |
| Samostatné d10 | Jeden d10 **za každý** skutečně přidělený Foraging Mode, před hodem se určí potrava/voda nebo konkrétní bylina (s. 147) | 1–5 nezávislých vstupů; bez odpovídajícího Mode nelze uzavřít epizodu | PASS, browser 5 hodů; cíle bylin v UI NEOVĚŘENO |
| Doba | HMK poskytuje čtyřhodinovou referenční výtěžnost | Zachován výhradně uživatelský model celých minut a poměrné dávky s přenosem zlomků | PASS, aritmetika; **implementační rozhodnutí, nikoli přímé HMK pravidlo** |
| Bez pohybu | Foraging na místě nepřináší ušlou vzdálenost | `distanceMeters=0`, bez převzetí Progress/Bearing z cesty | PASS, browser |
| Potrava/voda | `none` = nic; `0` = 0 food-days a 1 water-day; kladný výsledek n = n food-days i water-days (s. 147) | Tabulka výnosu i voda odděleně; zlomky po minutovém přepočtu | PASS, 1 539 kombinací a cílené případy |
| Byliny | `none`/`0` = 0 dávek, kladná hodnota je počet dávek (s. 147) | Výpočet implementován; explicitní druh byliny; mezi epizodami se přenášejí poměrné zbytky | PASS, matematická matice; UI end-to-end bylin NEOVĚŘENO |
| Ledger a historie | Samostatné potvrzené nálezy se nesmějí ztratit ani zdvojit | `standaloneForaging[]` je autoritativní množina nálezů; staré `foraging` zůstává kompatibilním aliasem prvního nálezu; ledger jej znovu nenačte | PASS, browser, replay a cílené testy |
| Inventář | Příjem nálezů se musí dokládat skutečnými položkami / kapacitou nádoby | V Kalendáři se zobrazí nálezy k samostatnému převzetí GM; fyzický inventář se nevytváří pouhým zadáním d10 | PASS, vizuálně zkontrolováno; dokončení všech tlačítek převzetí NEOVĚŘENO |
| Důsledky Survival CF | HMK s. 145 odkazuje na Survival Hazard podle s. 148 | **BLOCKED:** stacionární CF se nedá plně dokončit původním navazujícím hazard workflow; raději je zamítnuto potvrzení než fiktivně připsaný nález | BLOCKED, otevřená pravidlová větev |

Tabulka Foraging Results (HMK s. 147):

| d10 | Trace | Poor | Fair | Average | Good | Excellent |
|---|---:|---:|---:|---:|---:|---:|
| 1–2 | none | none | none | 0 | 1 | 1 |
| 3–4 | none | none | 0 | 0 | 1 | 1 |
| 5–7 | none | 0 | 1 | 1 | 1 | 2 |
| 8–9 | 0 | 1 | 1 | 2 | 2 | 3 |
| 10 | 1 | 2 | 2 | 3 | 3 | 4 |

## 3. Reprodukované chyby a opravy

1. **V93.834:** volně zadané d10 bylo možné vyhodnotit mimo Pochod bez doloženého Orienteering. **Oprava:** nový Survival SV, bonus +2 SV, povinné přidělení hvězd a d10 podle počtu Modes; průkaz starých cestovních SV nelze znovu použít.
2. **Regresní zjištění při skutečném proklikávání:** `Cannot access 'result' before initialization` po návratu z uloženého Skill Testu. **Oprava:** zápis značky validační politiky provést až po vytvoření `result`.
3. **Regresní zjištění při skutečném potvrzení:** společný kalendář odmítal samostatné sbírání hláškou „Foraging při cestě není vyhodnocen.“ **Oprava:** starý validátor požaduje cestovní `travelForaging` pouze pro `kind='travel'`; stacionární výstup validuje samostatná nová pravidlová větev.
4. **Kompatibilita:** původní samostatné epizody a historické zápisy zůstávají čitelné; nové zápisy mají explicitní značku `stationaryForagingPolicy='hmk-stationary-v93.835'`.

## 4. Skutečná kontrola přes Chromium

**Soubor:** `tools/browser_93835_stationary_foraging.py`, doklady `tools/browser_93835_result.json`, `tools/browser_93835_before_commit.png`, `tools/browser_93835_after_commit.png`.

V testu se **skutečně klikalo** na vytvoření společného 60min intervalu, plán činnosti, otevření samostatného Foraging, vyhodnocení, otevření Skill Tests, zadání a potvrzení d100 = 31 při ML 80, návrat do Foraging, zadání a přepis d10 pro pět Modes, vložení do fronty a závěrečné potvrzení GM. Do posledního potvrzovacího kroku se čas nezměnil; po potvrzení se změnil z 08:00 na 09:00. Bonus +2 SV; pět získaných Modes a pět samostatných nálezů z d10 = 10 v prostředí Mixed Forest, jaro (Fair). Za 60 minut vzniklo souhrnně **2,5 food-days a 2,5 water-days**. Dvojí contabilizace starého aliasu nenastala. Pozměněný d10, nedoložený režim, změněný přenos a odstraněný Survival doklad byly při replay validaci odmítnuty. **38 PASS klikacích a doplňkových ověřovacích podmínek.**

**Limit prostředí:** Chromium zde odmítá navigace na `http://127.0.0.1`, `file://` i `data:` s `ERR_BLOCKED_BY_ADMINISTRATOR`. Test proto používá `page.set_content(...)`, kompletní produkční CSS a bundle v reálném Chromium. Nová záložka, do které byly načteny stejné uložené bajty, zachovala čas, položky účetní evidence i počet epizod. **Skutečný reload existující URL ani end-to-end obsluhu nasazeného GitHub Pages nelze označit za PASS (NEOVĚŘENO).** Změny runtime `settings` objektu po novém startu vyžadují další diferenciální audit; bez změny zásob nebo hodin.

**Poznámka k UI:** po prvním explicitním stisku „Vyhodnotit epizodu“ aplikace při následných editacích dopočítává pracovní náhled, aniž trvale zapisuje. Vyžaduje se stále tlačítko připravení a závěrečné potvrzení. Přísnější požadavek na nové potvrzení každé změny náhledu v budoucnu doporučuji ověřit odděleným interakčním auditem; nepokládám za doložené, že by běžné editace samy zapsaly zásoby nebo čas.

## 5. Regrese

| Test | Výsledek |
|---|---|
| `node tools/test_93835_stationary_foraging.cjs` | PASS 70 assertions |
| `node tools/test_93833_full_foraging_matrix_audit.cjs` | PASS 1 539 assertions |
| `node tools/test_93834_party_tracker_reuse.cjs` | PASS 15 assertions |
| `node tools/test_93831_interaction_contract.cjs` | PASS 11 assertions (statický kontrakt) |
| `node tools/test_93832_shelter_tracking_contract.cjs` | PASS 12 assertions (statický kontrakt) |
| `node tools/test_93827_calendar_coma_unblock.cjs` | PASS 10 assertions |
| `node tools/test_93829_foraging_no_double_gm.cjs` | PASS |
| `node tools/test_93829_weather_no_double_confirmation.cjs` | PASS |
| `python tools/browser_93835_stationary_foraging.py` | PASS 38 kontroly, Chromium, 60 min, 5 Modes, korektní účet |
| Syntax `node --check` vstupního JS a změněných modulů, bundle | PASS |
| Skutečná navigace a reload původní URL | BLOCKED prostředím |
| Survival CF → plný navazující hazard při Foraging | BLOCKED aplikací, další priorita |
| Ruční alokace všech Modes, herbs UI, všechny zdravotní a inventářové návaznosti | NEOVĚŘENO |
| Stalking → Tracking CF → povinný Bearing → další cestovní interval: plné klikání, změna členů, reload | NEOVĚŘENO v nové verzi; statická regrese Tracking PASS 15 |

## 6. Reprodukce

1. Spusťte `node tools/build_93835_bundle.cjs` pro synchronizaci změněných ES zdrojů do browser bundle.
2. Spusťte uvedené testy podle tabulky, zejména `python tools/browser_93835_stationary_foraging.py` v prostředí s Python Playwright a Chromium.
3. Doklady Chromium vzniknou v `tools/browser_93835_*`.
4. Zkontrolujte SHA-256 manifest (všechny soubory kromě manifestu samotného) a patch-vs-full stromový test popsaný v přiloženém `tools/HMK_v93.835_PATCH_VERIFICATION.json`.

## 7. Otevřená priorita

**Následující skutečná chyba:** Survivor CF při stacionárním Foraging vyžaduje pravidlový Survival Hazard, ale neexistuje kompletní klikací navazující hazard cesta pro `kind='forage'`. Nesmí se přeskakovat ani nahrazovat fiktivním d10. Dokud není dokončena tato větev včetně testů a zdravotních důsledků, samostatný Foraging nelze označit za kompletně uzavřený. Po ní navázat na celou dosud otevřenou Tracking CF → Bearing sekvenci.
