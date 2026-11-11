# HMK v93.836 — dílčí audit Survival CF, předání trvalého standardu

**Pravidlový zdroj:** HMK v1.2, str. 145, 148–149. **Základ:** ověřený FULL v93.835. **Povaha:** dílčí vydání s otevřenými větvemi, nikoli certifikované dokončení Foraging.

## Opravené chování
- Stacionární Foraging s novým Survival CF nyní vyžaduje skutečný hazard d10, využívá původní Survival Hazard tabulku a nepřidává cestovní vzdálenost ani Direction Hazard.
- Hazard 1–3 = Equipment, 4–6 = Accident, 7–10 = Complication. CF bez hazardního d10 zůstává blokovaný.
- Původní accident následky jsou předány zavedenému řetězci Agility / Injury; přímý automatický zápis zdravotních dat z kalendářního pole není povolen.
- Některé Complication následky u stacionární činnosti vyžadují pravidlovou volbu GM a minutový přepočet zdržení; zatím jsou fail-closed, ne automaticky vyřešené.
- Přidán rekonstruovaný závazný standard `docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md`, vzniklý z uživatelova zadání a doložené projektové dokumentace. Není vydáván za původní doslovný dokument.

## Provedené testy
- `node tools/test_93836_stationary_cf.cjs`: PASS 48 (modelový test).
- `node tools/test_93835_stationary_foraging.cjs`: PASS 70 (modelový test).
- `node tools/test_93833_full_foraging_matrix_audit.cjs`: PASS 1539 (tabulkový test).
- `node tools/test_93834_party_tracker_reuse.cjs`: PASS 15 (modelový test).
- `node tools/test_93831_interaction_contract.cjs`: PASS 11 (statický kontrakt).
- `python tools/browser_93836_foraging_cf.py`: 17 PASS, Chromium s izolovaným DOM a produkčním bundlovaným JS.
- `python tools/browser_93836_cf_equipment.py`: 17 PASS, izolovaný Chromium; pozor, nelze tvrdit dokončení všech reálných oprav vybavení.
- `python tools/browser_93836_cf_complication.py`: 12 PASS včetně negativního scénáře (blokace chybějícího povinného dořešení).
- `python tools/browser_93836_tracking_input.py`: PASS pro psaní identifikace stopy, explicitní potvrzení a návrat; ne celý CF → Bearing.
- Node `--check` pro změněné JS a bundle: PASS.

## Otevřené / rizika
1. **NEOVĚŘENO:** Plný Equipment CF/F a oprava ve Skills, Slow Mode v dalším intervalu, skutečný inventář.
2. **NEOVĚŘENO:** Accident až po náhodnou oběť, Agility, impact, location, AV, Injury, Health a následný reload.
3. **BLOCKED:** Complication některých výsledků; bezpečně odmítnuto do pravidlového dořešení minutové prodlevy.
4. **NEOVĚŘENO:** Všechny varianty bylin, sběr zásob do inventáře, plný cloud/import/export a skutečný URL reload. Chromium bylo spuštěno přes `page.set_content`, nikoli produkční HTTP stránku.
5. **NEOVĚŘENO:** Kompletní Stalking → Tracking CF → Bearing → další interval, změny průvodce a stopaře.
6. **OTEVŘENÉ PROŠETŘENÍ:** U testované epizody replay přijímá změnu hodnoty `standaloneForaging[1].roll` na 1, zatímco jiné zásahy do přenosů odmítá. Je třeba ověřit, zda šlo o sémanticky ekvivalentní výsledek nebo nechtěně chybějící kontrolu; nepovažovat ochranu proti změně hodu za kompletní PASS.

### Statusy
PASS jen pro výše uvedené uskutečněné testy. BLOCKED pro konkrétní nepřístupné pravidlové pokračování. NEOVĚŘENO pro ostatní větve. Není deklarováno dokončení ani 100% pokrytí.
