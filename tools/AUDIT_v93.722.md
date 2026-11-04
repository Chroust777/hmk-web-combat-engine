# HMK Web Combat Engine — Audit v93.722

**Source baseline:** v93.721 (exact extracted current tree). **Deliverable:** differential production ZIP, plus separate test ZIP. **Rule basis:** HMK v1.2, pp. 169, 179, 185.

## Correction 1 — new Cold Water Shock during an older Extended Shock or Coma

Previously the stronger new Cold Water Shock was rejected whenever primary Extended Shock or Coma was active. v93.722 records a source-keyed `parallelColdShocks` entry with an immutable origin (`sourceId`, actual event ID, original minute and combat round). Primary Extended Shock and Coma remain intact. The visible Shock is the strongest currently effective source, not a replacement for either recovery schedule.

- Each concurrent Cold Water Shock has its **own** Shock Reroll at the actual next-action / UNC 10-minute deadline, and, when indicated by the actual d100, its own Extended Shock Course (4h) or Coma Course (initial actual d10 days).
- The calendar lists independently due entries (source ID included) and the health interface has separate linked forms. Neither form advances the campaign clock merely by saving the physical die result.
- Source event and origin fields are immutable at the common `save` boundary. Duplicate source IDs and duplicate physical event IDs are rejected. Completing one source never silently cancels the other.
- For Cold Water UNC + CF, the printed Coma HR expression contains Injury Location Shock/IL, which immersion does not supply. The interface requires **explicit GM judgment** for initial Coma HR and an **actual d10**; it does not fabricate an injury or die.

### Verified

- **56 new source-level assertions PASS**: primary Extended Shock alone and with existing Coma; new Cold Water UNC, distinct next-action deadline, original 4h/d10 schedules, old-first and new-first recoveries, continued independent Coma, invalid early roll, duplicate roll, evidence tampering/removal rejection, explicit UNC+CF coma decision.
- **Chromium E2E PASS** on a fully created 14-step character using the rebuilt production bundle: actual Cold Water Shock form available while an original Extended Shock HR5 is active; after 10 minutes the new Reroll takes a physical d100 (99) to its *own* HR5 course, original HR5 stays intact, and both survive a persisted reload. No page errors or dialogs.

### Not yet independently demonstrated by full browser E2E

The **entire** subsequent four-hour Extended Shock, original Coma d10 and new Coma d10 route, together through all UI buttons, has source-level tests but not an end-to-end browser test in this release. GitHub Cloud multi-device merging was not tested.

## Correction 2 — Combat write boundaries

The `mutate → save → persistVerifiedCombatSnapshot` boundary remains the authoritative persistent path. A generic note/inventory action may now change **nonparticipants** while Initiative is running, but changes to a participant's protected combat state, their equipped inventory, or prior Combat evidence are rejected. Existing guided Combat rounds remain under `commitGuidedTransition()`; no dice or turn order are invented or skipped.

- `active-combat-write-boundary.js` compares protected inventory by *participant identity*, not the entire campaign inventory.
- The UI removes broad Initiative gating from nonparticipant inventory addition, library acquisition, item reconciliation, loss/outfit functions, and archival/copy/restore of *nonparticipant* characters. Participant actions remain protected.
- **127 new boundary assertions PASS:** 24 orderings of four nonparticipant edits/notes/catalog writes preserving original Combat proof; each participant inventory/health or combatRuntime mutation and historical Combat proof deletion/edit/forgery is rejected.

### Remaining guarded write routes

Many **participant-owned** or combat-timed procedures remain subject to legitimate Initiative order checks: melee, hit/impact, maneuvers, poison on-hit events, medical timelines, abort/end of encounter, and certain imported or edited character actions. These are not certified for arbitrary reordering. The write boundary is not equivalent to a full certification of all Combat wizard paths. Running Initiative remains semantically ordered under HMK; independent character actions must not be blocked just because another fight exists.

## Regression — exact comparison

The same six historical regression scripts were run against **both** v93.721 and v93.722, with explicit source root arguments, not symlinks or an old workspace:

| Script | v93.721 | v93.722 | Tests |
|---|---|---|---|
| Concurrent timed procedures v93.718 | PASS | PASS | 373 |
| Fear parallel v93.720 | PASS | PASS | 67 |
| Global parallel ailments v93.719 | PASS | PASS | 501 |
| Mixed deadlock v93.718 | PASS | PASS | 14 |
| Sleep concurrent v93.719 | PASS | PASS | 40 |
| Weather concurrent v93.718 | PASS | PASS | 14 |

Total regression **1,009 assertions** passing on each version; new targeted tests **183 assertions** passing on v93.722. Bundle rebuilt successfully, app and new source syntax checked.

**Legacy test caveat:** `test_cold_93721.cjs` and `test_cold_concurrency_93721.cjs` were written to *require rejection* of a stronger Cold Water Shock during pre-existing Extended Shock. That old expectation passes on v93.721 but fails on v93.722 **intentionally**; the new source-specific parallel-course tests replace it. This is not hidden as a regression PASS.

## Release / safety notes

- Only production files changed; `tools/` never ships in the production patch. No other repo or private campaign mutated.
- Keep JSON backup before deployment, and try on copied campaign, especially active multi-origin Coma/Extended Shock.
- This release **does not justify** the global statement that no blocking/deadlock is possible anywhere in Combat or Cloud. Both still require broader integrated UI and multi-device tests.
