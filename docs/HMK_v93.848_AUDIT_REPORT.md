# HMK Web Combat Engine v93.848 — UI a interaktivní audit

**Základ:** `HMK_v93.847_FULL.zip` v aktuální konverzaci. **Pravidlová autorita:** HMK v1.2, zejména strany 122, 145–149, 354–357.  **Časový model:** minutový, bez automatických pevných čtyřhodinových intervalů. **Doklady testů:** `tools/evidence_93848/` a reprodukční `tools/browser_93848_*.py`.

## A. Vyřešené a skutečně reprodukované chyby

**A01 – irelevantní cestovní priorita při samostatném Foraging a Tracking.** Společný formulář předtím nabízel `Cíl rozdělení výhod` také u samostatných aktivit. Nyní se zobrazí pouze u skutečného Pochodu, kde přidělení Progress/Bearing představuje cestovní rozhodnutí. Samostatný Foraging má dál své povinné pravidlové přidělení Foraging Modes z vlastního Orienteering, bez jeho odstranění. Samostatné Tracking nepoužívá cestovní alokační nabídku. Přepnutí `kind` je rozpracovaný výběr, ne trvalý zápis.

**A02 – souběžné skupiny rezervovaly jedno zvíře jen v závěrečné validaci.** Zvířata přidělená jiné skupině v překrývajícím se časovém okně zůstávala zaškrtávatelná. `episodeAnimalReservations93848()` / `episodeEnforceAnimalReservations93848()` je nyní nechávají v seznamu viditelná, ale odškrtnutá a `disabled`, při novém renderu i při obnově draftu. Původní závěrečná ochrana společného Pochodu nadále platí. Jediným potvrzením času obou skupin není zvíře duplicitně použito.

**A03 – Equipment Hazard nabízel cizí a nepoužitelné opraváře.** Opravářský seznam nyní zobrazuje `ML` skutečně odvozené dovednosti, připouští pouze **aktuální členy dané skupiny** a zakazuje ML=0. Validace při spuštění samotného Skill Testu provádí stejné kontroly, aby vypnutý `<option>` nebyl jedinou obranou. Př.: Cloth Tunic → Textilecraft; ML 75 člen skupiny = ano, ML 0 ve skupině = zakázán, ML 75 mimo skupinu = zakázán. Nemění se vlastníkův originální inventární doklad.

**A04 – Equipment Hazard obsahoval nadbytečné potvrzení výběru.** Při režimu „Opravit“ již není třeba nejprve stisknout další mezitlačítko, aby šel otevřít opravářský test. Tlačítko **„Potvrdit výběr a otevřít [dovednost] Skill Test“** je jedinou výslovnou akcí potvrzení právě zvoleného předmětu, postupu a opraváře a současně otevře správný test. Pouhé select/change/Enter/checkbox výběr nepotvrdí ani nezapíše. U jiných rozhodnutí Equipment (ponechat / odložit) zůstává příslušné potvrzovací tlačítko; není automatizováno.

**A05 – Pochod se Stalking Mode působil jako povinné Tracking.** Pochod nyní odlišuje přidělování režimu **Stalking** od volitelného **sledování konkrétní stopy (Tracking)**. Při běžném Pochodu je výchozí režim sledování `none`; nový Tracking test nebo převzetí existujícího důkazu musí uživatel výslovně zvolit. Popisy vysvětlují, kdy je nutný skutečný test; když nejde o stopu, nezobrazí se přidružené identifikační kroky. Povinný Bearing po skutečném Tracking CF zůstává zachován a nelze jej ignorovat.

## B. Skutečné testy v izolovaném Chromiu (produkční sestavený JavaScript)

| Test | Stav | Důkaz / skript |
|---|---|---|
| Přepínání samostatného Foraging, Tracking a Pochodu; skrytí nepříslušné priority; žádný předčasný zápis | **PASS** | `browser_93848_activity_ui.py`, `ACTIVITY_*.png` |
| Dvě překrývající se skupiny, stejný živý kůň, první cestuje, druhá ho nemůže zaškrtnout; oba záznamy potvrzeny jedním posunem o 45 min | **PASS** | `browser_93848_two_groups_animal_reservation.py`, `ANIMAL_RESERVED_SECOND_GROUP.png`, `TWO_GROUPS_COMMITTED.png` |
| Cloth Tunic → Textilecraft F; jedno tlačítko otevře skutečný Skill Test; po dokončení předmět zůstává rozbitý, žádný povinný čas opravy | **PASS** | `browser_93848_equipment_oneclick.py`, `BROWSER_EQUIPMENT_F.json` |
| Jiný opravář/člen skupiny ML 0, opravář mimo skupinu ML 75 zakázáni; správný ML 75 připuštěn | **PASS** | `browser_93848_eligibility_from_e2e.py`, záznam `EQUIPMENT_ML_PARTY_NEGATIVE_CLICK_TEST.log` |
| Equipment výsledek CS, S, F a CF v různých izolovaných průchodech | **PASS** | `browser_93848_equipment_oneclick.py` a místní výsledkové protokoly; finální F opakováno po změně evidence |
| Tracking CF d100 100 → povinný Bearing → další nový pěší Pochod se samostatným Survival a Direction; Bearing 1→0 | **PASS** | `browser_93847_tracking_full.py`, log `TRACKING_CF_BEARING_CLICK_REGRESSION.log` |
| Complication Animalcraft F → minuta 25 → potvrzení → 60minutová epizoda | **PASS** | `browser_93847_complication_animalcraft.py F`, log `COMPLICATION_ANIMALCRAFT_F_CLICK_REGRESSION.log` |
| Cestovní tabulková matice | **PASS 7 869** | `node tools/test_93785_travel_matrix.mjs` |
| Anatomie a druhy / montáž | **PASS 79** | `node tools/test_93847_anatomy_mount.mjs` |
| Foraging tabulka | **PASS 1 539** | `node tools/test_93833_full_foraging_matrix_audit.cjs` |
| Samostatný minutový Foraging | **PASS 70** | `node tools/test_93835_stationary_foraging.cjs` |

Všechna čísla d100/d10 jsou **výlučně testovací hody v izolované kampani**, nejsou domyšlenými hody v reálné uživatelské kampani. Čas kampaně ani inventář se nemění pouhou změnou nabídky. Záznam vzniká až přes určené tlačítko.

## C. Otevřené testy a omezení

- **NEOVĚŘENO:** jeden **souvislý** Stalking při jízdě → Tracking CF → Bearing při změně průvodce/stopaře → následný Pochod s tažným vozem či zvířetem. Výše doložené Tracking/Bearing, skupiny a doprava jsou samostatné klikací regrese, ne tento jediný řetězec.
- **NEOVĚŘENO:** všechny kombinace Equipment typů a všech specifických ML; testovaná Cloth Tunic/Textilecraft je reprezentativní, ne důkaz pro všechny materiály.
- **NEOVĚŘENO:** skutečné kompletní obnovení na veřejné HTTP URL uživatelovy kampaně; testovací Chromium používá izolovanou stránku s produkčním sestaveným JS.
- **NEOVĚŘENO:** změna původních skutečných uložených kampaní, u nichž se v minulosti překrývající se skupiny už potvrdily; změna není zpětným přepisem jejich starých dokladů.
- Pokračující priority v širším projektu: Accident s úplným zdravotním dořešením nestandardních zvířat; jediný souvislý Complication vozky/tažná zvířata → následný Pochod.

## D. Vydání a integrita

Výchozí ZIP v93.847 je neměnný; nové úpravy byly provedeny pouze nad jeho rozbalenou pracovní kopií. Rozdílový patch v93.847→v93.848 obsahuje pouze nové a změněné soubory (bez nahodilých změn historických důkazů). Vydání obsahuje SHA-256 manifest; po aplikaci PATCH na starý FULL se všechny soubory ověří proti novému FULL, se zvláštní kontrolou ZIP integrity. Přesné počty a SHA-256 výsledky jsou v přiloženém `HMK_v93.848_PATCH_VERIFICATION.json`.
