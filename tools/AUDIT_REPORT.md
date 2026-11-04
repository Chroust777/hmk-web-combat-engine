# HMK v93.712 – Weather Treatment timing and E2E audit

Source baseline: complete production v93.711. Sole rules source: HârnMaster: Roleplaying in the World of Kèthîra v1.2, notably pp. 177–181, 185. Date: 2026-11-04.

## Production changes

- **Calendar-authoritative Treatment timing:** new pure calculation `src/integration/hmk-weather-treatment-timing.js` derives actual procedure duration, start, end, and wound age for Warming, Compress, Set, Clean/Dress, Surgery, Extraction and Frost G Amputation. Users cannot supply or overwrite the start/end times in Weather Injury Care.
- **Atomic Calendar commit:** treatment and its time move together only after proof checks. The Calendar refuses other intervening due events; same-minute independent Cold/Heat Courses remain required. Untreated (CF) does not invent time or dice.
- **Single relevant health task:** when Exposure Course is due now, time-consuming Treatment is deferred and hidden until Course is resolved; auto section selection no longer silently selects Grim Shock because of undefined properties.
- **Frost G Amputation special case:** one-minute procedure, recognizes original Grievous Frost rather than a normal Warming case. Projected completed amputation is accepted as a verified treatment by the Calendar. It creates a separate Edge injury and possible Bleeding/Shock. The derived Edge wound retains *travel-weather* medical origin by verified immutable source events rather than being mistaken for Combat; follow-up Shock uses weather time. New Bleeding from this procedure remains an open follow-up (below).
- Production `index.html` and `app.js` version advanced to **93.712**; bundle rebuilt from production src.

## Successful tests

| Category | Checked | Result |
|---|---|---|
| Pure timing rule assertions | 58 | PASS |
| Chromium: 2 actors / 3 Frostbite Warming procedures and two coincident Cold Exposure Courses | 1 scenario | PASS |
| Chromium: 2 actors / 3 wounds / two infections / healing-suspension / resumption / complete healing | 1 scenario | PASS |
| Chromium: 4 actors / 4 weather exposures / 3 wounds / 2 infections / all wounds healed / persist and reload | 1 scenario | PASS |
| Chromium: 4-actor fixture, new completed 30-minute Trek and reload | 1 scenario | PASS |
| Chromium: genuine Frost G4 from Weather, 1-min Amputation, new Weather Edge injury, due Bleeding+Shock | 1 scenario | PASS to the listed boundary |
| Selected Node regression suites | 6 | PASS |
| Selected obsolete Node suites failing on unchanged v93.711 as well | 7 | HISTORICAL FAIL, not a new regression |
| Actual HTTP Chromium navigation index.html → app.js → src | — | NOT VERIFIED due to execution environment restrictions |

### Evidence and limits

- Tests used the **production bundle injected into Chromium**, and fully generated characters from existing validated fixture states; they are not a successful HTTP navigation test.
- Some later-day Calendar advances and feeding provisions in the long-term scenarios were made through original rule functions, not click-through on every Calendar input screen. Reuse of stored, complete scenarios across phases is not proof of one uninterrupted end-to-end session from day 1 to final day for *every* travel mode.
- Tests did **not** exhaust all combinations of Weather → Shock → Extended Shock/Coma → simultaneous bleeding → infection → later travel, all weather/terrain/inventory variations, or every one of the 8 Travel activities. Therefore **Travel/Trekking is not at 100%** and no subsequent activity should be treated as fully audited yet.
- **Known open integration gap:** after Frost G amputation the newly created Edge injury can be a Bleeder. It is correctly scheduled in the Calendar and correctly tied to travel-weather, but `focusCalendarRuleAction(kind='bleeding')` still opens a Combat Blood Stoppage form. A separate non-Combat bleeding executor (with true 5-minute treatment and physical dice) needs to be completed and fully retested before declaring Weather complete.
- Normal Combat rules/Initiative logic are deliberately not audited here; its physical injuries share `healthState` but Travel never automatically starts Combat.

## Test reproducibility

The audit scripts were written against the in-container project path `/mnt/data/hmk93712_work` with source fixtures from `/mnt/data/hmk93707_work/fixtures`. The separate audit ZIP contains scripts, logs, and representative fixtures for analysis; when running elsewhere, adjust path constants to your project location. Tests are not part of the production PATCH.
