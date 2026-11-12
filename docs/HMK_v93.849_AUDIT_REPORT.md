# HMK Web Combat Engine — v93.849 — Travel UX / potvrzování hodů / Orienteering Modes

**Datum:** 12. listopadu 2026. **Přesný výchozí FULL:** `hmk-web-combat-engine-main_12_11_20267.zip`, interní `v93.848`. **Pravidlová autorita:** uživatelem přiložené HMK v1.2, zejména str. 145–150. **Čas:** minutový. **Původní FULL neměněn.** Nový FULL/PATCH sestavený z této přesné výchozí verze; soupis souborů, SHA-256 a roundtrip dokládá samostatné `HMK_v93.849_PATCH_VERIFICATION.json`.

## 1. Opravy a jejich příčina

1. **Drover: bezúčelné „Přejít na Skill“.** Odstraněn čistě navigační odkaz, který nesloužil jako potvrzení a mátl uživatele. Povinný Riding / Animalcraft Drover je stále vyžadován až ve skutečném návazném úkolu po „Vyhodnotit epizodu“, bez domyšleného výsledku.
2. **Tracking: zavádějící „Potvrdit stopu a pokračovat k Tracking testu“.** Odstraněn mezikrok, který předtím volal společné vyhodnocení; při přítomnosti mountu tak logicky předřadil Riding/Drover. Zapsaná stopa je pouze vstup. Její identita/stopař se přijmou až určeným „Vyhodnotit epizodu“. Skutečný Tracking Skill Test následuje jako samostatný požadovaný důkaz. Editace ani Enter trvale nepotvrzuje nic.
3. **Čísla d4/d6/d10/d100 v cestování a návaznostech.** Počet a rozsah skutečných hodů se uživateli zobrazí přímo vedle pole. Každé z těchto polí se nyní zadává dvoufázově: psaní / „⚄“ jen rozpracuje hodnotu; až **„Vložit číslo“** ji přijme, validuje formát, přesný počet a rozsah, a dovolí další úkol. Příklady: `10` jediný d10; `1,10,5` tři hodinové END d10. Změna prvního znaku, `blur`, `change` ani generátor nejsou samy potvrzením. Validace nepřijme chybné, chybějící ani nadbytečné hodnoty. Stejný handler pokrývá dynamicky generované encounter/počasí/Survival Hazard a další dílčí d10, pro které je v cestovním formuláři kostkové tlačítko.
4. **Stabilní volba priorit.** „Cíl rozdělení výhod při Pochodu“ se po „Vyhodnotit epizodu“ zablokuje; předem lze přepnout a následné ruční rozdělení hvězd zůstává dostupné.
5. **Chyba zdroje počtu ★.** `computeEpisodeOrientation()` předtím vracel starý počet z původního `Survival` dokladu, zatímco pravidlová kontrola alokace správně pracovala s `adjustment.advantageModes` ze situačně **upraveného Orienteering SV**. Výstup byl nekonzistentní. `orientation.stars`, informativní popisky a ruční alokační rozpočet jsou sjednoceny podle upraveného SV; vysvětleno automatické i ruční přidělení. Chyba překročení rozpočtu ukazuje na ovládání alokace, její skutečný počet ★ a umožňuje opravu.
6. **Neaktivní dokončovací tlačítko.** Závěrečná ochrana odděluje potvrzené hody od neúplných rozpracovaných hodnot a neschovává či neblokuje dokončení kvůli neaktivním skrytým polím. Dvě paralelní skupiny byly skutečně dokončeny až po potvrzení obou řádků a jediném kalendářním commitu. To je **cílený důkaz**, nikoli certifikace všech možných cest.
7. **Grafika.** Původní pergamenové styly, struktura a data ponechány; pouze kompaktní styl pro doplněné potvrzovací ovladače.

## 2. Konkrétní Chromium testy — izolovaná stránka s aktuálním sestaveným bundle

| Kontrola | Stav | Důkaz |
|---|---|---|
| Foraging / Tracking / Pochod: volby a zobrazování, žádný předčasný zápis či posun času | **PASS** | `tools/browser_93848_activity_ui.py`; `tools/evidence_93849/CHROMIUM_ACTIVITY.log` |
| 2 skupiny / překrývající se čas / rezervace jediného koně / skutečné Survival testy / explicitní d10 / 2 epizody / 1 commit 480 → 525 | **PASS** | `tools/browser_93849_two_groups_confirm.py`; `CHROMIUM_GROUPS.log`, `TWO_GROUPS_AFTER_COMMIT.png` |
| Ruční rozpočet: skutečný Survival → upravené SV 6, přesně 2 ★; pokus 3 ★ odmítnut; klikací „Otevřít požadované pole“ skutečně zaměří alokaci; po opravě celé dvě skupiny dokončeny | **PASS** | `tools/browser_93849_manual_modes.py`; `CHROMIUM_MANUAL.log` |
| Kliknutí generátoru d10 jen vyplní rozpracovaný hod; psaní `1` nevyhodnotí ani neposune; `10` se přijme teprve „Vložit číslo“; požadavek více Progress d10 | **PASS** | `tools/browser_93849_manual_modes.py`; `CHROMIUM_MANUAL.log` |
| Double Time 135 minut: 3 skutečné END d10, viditelná instrukce pro čárkami oddělené hody, druhý řádek dokončen; jediný commit 480 → 615 | **PASS** | `tools/browser_93849_double_time.py`; `CHROMIUM_DOUBLETIME.log` |
| Survival CF → Equipment d10 → Cloth Tunic → Textilecraft (F) → rozbitá/nepoužitelná položka bez automatické opravy; čas +60 min až po komitu | **PASS** | `tools/browser_93849_equipment_confirm.py F`; `CHROMIUM_EQUIPMENT.log`, `BROWSER_EQUIPMENT_F.json` |
| Stejná klikací procedura Equipment při opravářském výsledku S, CS, CF | **PASS (scénářově)** | `tools/browser_93849_equipment_confirm.py S`, `CS`, `CF`; `CHROMIUM_EQUIPMENT_*.log`, příslušné `BROWSER_EQUIPMENT_*.json` |

**Testovací politika:** d100/d10 vytvořeny pouze v izolované kampani reprodukčního skriptu; žádný živý uživatelský zápis. V aktuálních dokončených UI bězích nebyly hlášeny runtime `pageerror` výjimky. Běhy přes `set_content` + aktuální bundle **nejsou** ověřením HTTP/GitHub Pages.

## 3. Cílené regresní skripty

- **PASS 7 869**: `test_93785_travel_matrix.mjs` (počasí, orientace, pohyb, směr, Encounter, expozice).
- **PASS 1 539**: `test_93833_full_foraging_matrix_audit.cjs`.
- **PASS 70**: `test_93835_stationary_foraging.cjs`.
- **PASS 48**: `test_93836_stationary_cf.cjs`.
- **PASS 58**: `test_93843_equipment_skill.mjs`.
- **PASS 38**: `test_93845_gm_equipment.mjs`.
- **PASS 45**: `test_93846_accident_tracking_complication.mjs`.
- **PASS 79**: `test_93847_anatomy_mount.mjs` (16 druhů).

Tyto počty jsou počty asercí dle jednotlivých skriptů, **nikoli** počet nezávislých UI scénářů a **nikoli** procento pokrytí aplikace.

**Zastaralá očekávání:** `test_93840_hazard_confirmation.cjs` a `test_93842_interaction_contract.cjs` jsou verzově připnuty na 93.840/93.842. `test_93844_equipment_time.mjs` vyžaduje automatickou povinnou časovou opravu, **kterou uživatel v93.845 výslovně zakázal**. Jejich historické aserce nelze po přijetí těchto změn vydávat za současné vývojové závady. Pro Equipment je platný `test_93845_gm_equipment.mjs`.

## 4. Vydání a omezení

- Změněny výhradně potřebné aplikační soubory `app.js`, `src/integration/hmk-time-episodes.js`, `book-templates.css`, `index.html` a nově sestavený `hmk-app.bundle.js`; plus tento report, upřesnění auditního standardu, reprodukční skripty, evidence a manifest. Historické neaktualizované pomocné soubory zůstávají dle uživatele záměrně neúplné.
- **NEOVĚŘENO:** celý původní dlouhý cyklus Stalking → Tracking CF → Bearing → jízda/vůz → reload URL jako jeden opakovaný souvislý scénář v93.849. V tomto vydání nejsou všechny kombinace Accident / Complication / Encounter a všech zdravotních návazností prokliknuty.
- **NEOVĚŘENO:** skutečné GitHub Pages, externí cloud sync, perzistence existující uživatelské kampaně a všechna zařízení. Izolované Chromium a statické moduly nenahrazují reálný HTTP reload.
- **ZACHOVÁNO:** bez automatických 240min oprav; žádné změny formátu uložených historických epizod, žádné nedoložené hody, nezměněná pravidlová autorita HMK v1.2.

## 5. Jak reprodukovat

Z kořene po rozbalení FULL: `node tools/build_93849_bundle.cjs` (vyžaduje přítomný TypeScript v prostředí), `node tools/test_93785_travel_matrix.mjs`, `python tools/browser_93849_manual_modes.py`, `python tools/browser_93849_double_time.py`, `python tools/browser_93849_equipment_confirm.py F`. Pro Browser skripty je nutný Playwright + Chromium. Jejich seed je výlučně testovací.

Výstupní integrita a kontrola FULL+PATCH: samostatný `HMK_v93.849_PATCH_VERIFICATION.json`.
