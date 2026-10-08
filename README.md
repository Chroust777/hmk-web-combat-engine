# HMK Web Combat Engine

Release-candidate rules kernel for HârnMaster combat, implemented as vanilla JavaScript ES modules with JSON-safe persistent state and no framework dependency. The HMK PDF is the sole rules authority; rule ambiguity and GM discretion are surfaced explicitly rather than guessed.

## Validated RC status

- Rules/kernel audit: **complete for the audited combat/trauma scope**.
- Deterministic regression suite: **407/407 PASS**.
- Export coverage: every exported kernel/state/domain symbol has a direct test reference.
- Persistence: canonical JSON export/import, stable injury/event references, pending-resolution round trips, action commitments and timed trauma events are regression-tested.
- GitHub Pages: repository contains a static entry shell and uses only browser-compatible ES modules for future UI integration.

The validated kernel covers d100/EML/SL, opposed/SV/Secondary tests, alertness/reaction, initiative, engagement/actions, melee/missile/volley, Tactical Advantages, weapon/shield/armour options, Injury/Shock/Bleeding/Amputation, healing and ailments, mental trauma, mounted and creature combat, Dragon Breath, Spirit Conflict and possession lifecycle, scheduler/state persistence, and explicit Advice/Options/GM-decision boundaries.

## Run tests

Requires a current Node.js runtime.

```bash
npm test
```

## Repository layout

- `src/domain/` — JSON-safe contracts.
- `src/rules/` — deterministic HMK rule resolvers.
- `src/state/` — scheduler, persistence and action-state composition.
- `tests/` — deterministic regression and end-to-end kernel tests.
- `docs/rules-contracts.md` — audit notes and rule-contract decisions.
- `index.html`, `app.js`, `styles.css` — GitHub Pages entry shell for the next UI implementation phase.

## Scope boundary

This checkpoint certifies the **rules/combat kernel audit**, not a finished player-facing combat UI. The next development phase is to build the guided web interface on top of these frozen/tested contracts without duplicating rule logic in the UI.
