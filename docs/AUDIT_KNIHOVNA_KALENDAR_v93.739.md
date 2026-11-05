# HMK Keeper’s Ledger v93.739 — Knihovna, ochrana před chladem, Přehled a čas

Základ: úplná v93.738. Změny vymezené požadavky GM. Zásada výslovného potvrzování pravidlových hodů zachována; nová úprava nemění stav postavy, inventář ani výsledky hodů.

## Opravy knihovny
- U částí zbroje jsou pokryté lokace ze struktury `locationProtection` zobrazeny jednou. Paralelní pole `coveredLocations` je vynecháno z duplicitního podrobného výpisu. Ostatní sémanticky odlišné informace o krytí zůstávají.
- Sloupec ochrany uvádí `b0 / e1 / p0 / f1` (číselné hodnoty dle jednotlivého předmětu).
- Samostatně se zobrazuje doložený Cold Hazard AV: Cloak (Cloth) +1; Cloak (Padded) +2. U ostatních částí zbroje katalog nepředstírá speciální bonus, který pravidla výslovně nepřidělují. F (Fire/Frost) není totožné s bonusem do Cold Hazard Roll. HMK str. 117, 120 a 149.
- Původní poznámka o dosud neověřených vrstvách nahrazena přesnější informací: pravidla vrstev jsou obsažena na str. 117 a povolené kombinace na str. 119; konkrétní nasazené vrstvy se stále musí posoudit v samostatném validátoru. Samotný detail Knihovny není potvrzením legality kompletů.
- Názvy částí hotových kompletů vedou jako odkazy na příslušnou kategorii a vyhledávání konkrétní katalogové součásti. Odkaz se nabízí jen pro jedinečně rozpoznanou součást přes `resolveSuitCatalogParts` (název, materiál, cenu, hmotnost), nikoliv při nejednoznačném výsledku.
- Zdroj `Pravidla str. …` je nyní inline vedle názvu položky, nikoli na samostatném řádku.

## Přehled a čas
- Sedmidenní seznam má vlevo sekce `K vyřízení` a `Plánované události a činnosti` pod sebou, obě přes šířku levého sloupce.
- Odstraněna výšková hranice 400 px; položky expandují směrem dolů.
- Datový kalendář je na pravé straně nahoře, na desktopu `position:sticky` při skrolování obsahu přehledu. Na úzkých displejích se oba sloupce přeskupí pod sebe.

## Testy
- `tools/test_93739_library_calendar.cjs`: 17/17 statických kontraktů PASS.
- `tools/test_93734_episode_allocation.cjs`: 44 PASS.
- `tools/test_93734_stalking_vigilance.cjs`: 30 PASS.
- `tools/test_93734_animal_health.cjs`: 70 PASS.
- `tools/test_93734_skill_chain_545.cjs`: PASS, 1905 assertions.
- `tools/test_armour_rigidity_526.cjs`: PASS.
- Bundle: 428 modulů, přegenerován `hmk-app.bundle.js`; `node --check` obou změněných JS souborů PASS.

## Omezení
- Není doložené plné interaktivní E2E v prohlížeči pro novou obrazovku: otevření testovací stránky bylo blokováno správou prostředí (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- Starší test `test_93738_ui_contract.cjs` očekává napevno verzi v93.738; po zvýšení verze selhal na této kontrolní konstantě. Další historické testy (`test_library_help_495`, `test_registry_library_491`, `test_calendar_timeline_clarity_506_507`) obsahují předchozí či kontextově neúplná očekávání a nejsou vykázány jako PASS. Nemění se tím výsledek výše uvedených cílených kontrol.
- Samostatné pravidlo vrstvení pro konkrétní kombinaci zbroje nadále vyžaduje použití původního validátoru; přehled Knihovny jej nenahrazuje. Nelze tvrdit, že každý historický uživatelsky vytvořený katalogový předmět byl nezávisle vizuálně prověřen v prohlížeči.

Instalace: PATCH v93.739 nahrajte do stejného kořene jako předchozí v93.738. Zachovat `src/integration`, `docs`, `tools`.
