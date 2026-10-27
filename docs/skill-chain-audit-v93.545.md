# HMK Keeper’s Ledger v93.545 — Skill / Opposed / Injury Chain Audit

Date: 2026-10-27. Rule authority: *HârnMaster: Roleplaying in the World of Kèthîra*, v1.2 (2024), particularly printed pp. 60–62, 138, 148, 169–170.

## Scope and findings

This patch focuses on the **actual web application** (`app.js` / `src/`), not the discontinued Excel workbook. Existing saved combat-state, character, journal, inventory and campaign calendar formats were not migrated or overwritten.

**Correction 1 — opposed victory margin with Stunned (pp.61,169–170).** The previous result kept the four-category `SL` but clamped the numerical `SL` at CF, making an opposed success S vs a stunned original CF score **two** rather than **three** stars. The corrected result retains the ordinary category `sl=CF` for CF-based consequences and Success Value (SV), while recording `victorySL=-1` and `victoryLevel=CF−1` for the uncapped numerical margin. Opposed winner, star margins and optional ties now compare that unbounded value. The actual app-level secondary-roll upgrade also uses the unbounded starting value: SR +1 takes CF−1 to CF, **not** to F. The actual value is displayed alongside the categorical result in the skill workbench and persisted journal evidence. Failed-vs-failed still grants no victor except where a specific rule such as opposed Persuasion explicitly requires a tie-break.

**Correction 2 — ordinary human Agility attribute during Survival Accident (pp.61,148).** A Survival Hazard accident required an Agility test but sought Agility in `character.hmk.skills`; actual characters record it under `hmk.attributes.agl`. As a result, standard human records without an invented `Agility` skill failed before the injury procedure. The handler now retrieves the canonical attribute/skill Mastery Level from `availableMasteries`, including Agility = attribute score × 5. It continues to require the original d100, physical hazard and impact dice, armour evidence and shock roll where applicable. No dice or injuries are synthesized. The derived persistent injury, shock and follow-up state still belong to the canonical Combat engine.

## Verification performed

- **11/11 relevant currently runnable integration suites PASS**: v93.545 skill chain; existing opposed+health v93.540; skill activity chain v93.536; opposed follow-up v93.535; skill workbench v93.535; subsequent skill v93.537; animal survival v93.539; tracking/awareness v93.537; healing remaining v93.544; surgical audit v93.542; multi-infection v93.541.
- **1,905 assertions** in new `tools/test_skill_chain_545.cjs`, including 800 original d100 rolls at eight different ML values (1,600 numerical comparisons against the expected categorical outcomes), secondary modifier/SR ranges, 16 opposed SL pairs, Persuasion F/CF ties, unbounded Stunned victory margin and game-app secondary result integration, a human Agility attribute rescue, physical fall -> Injury Sequence -> Shock -> pending injury mishap/treatment and Shock recovery schedule, serializable validated state, duplicate prevention and input validation.
- **362/362 JavaScript files parse** under Node.js 22. **1,158 checked relative import declarations, zero missing import targets**. (Static import check is limited to the source patterns scanned, not runtime network availability.)
- Opposed pair roster and skill follow-up catalog were also checked by the existing v93.535 suite covering the **69 base skills**. Rule-specific activity follow-ups do not exist for every skill: the source does not supply a universal additional die after F/CF, and the engine intentionally does not invent one.

## Historical test and coverage limitations

Two old static/UI assertions (`tools/test_skill_evidence_529.cjs`, `tools/test_skill_evidence_535_regression.cjs`) did not pass *before this patch*: the first expects an older parchment CSS selector, the second expects an older hard-coded version string. They are not rule-resolution regressions and were not used to force an unrelated visual change. A trial of the entire historical test catalog did **not** finish within the permitted execution window; **do not describe the entire catalog as passing**. No live Chromium/Playwright browser session or GitHub Pages deployment was performed. Thus the project has **strong focused rule regression**, not a certificate of complete 1:1 coverage of all HMK skills, situation-specific modifiers, spells, environmental consequences, injury treatments and user-interface paths.

## Files updated

- `src/integration/hmk-skill-test-engine.js`
- `src/integration/hmk-skill-physical-consequences.js`
- `src/integration/hmk-skill-result-evidence-529.js`
- `app.js`
- `index.html` (cache/release identifier v93.545)
- `tools/test_skill_chain_545.cjs` (new)
- `docs/skill-chain-audit-v93.545.md` (new)

**Deployment note:** `index.html` directly loads the modular `app.js` entry point. The legacy `hmk-app.bundle.js` is not referenced by that entry point and has not been rebuilt.
