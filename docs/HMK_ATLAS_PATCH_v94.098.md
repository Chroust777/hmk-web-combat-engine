# HMK Keeper’s Ledger v94.098 — Atlas

Base: original supplied ZIP with patches through v94.097 applied. Files from v94.097 patch were verified against the base tree.

- All six new-object modes (route, area, radius, draw, arrow, text) now clear the title and note fields on entry. Existing-object editing still loads saved metadata; styles are unchanged.
- History labels use `Type - Title` for named objects and `Type 1`, `Type 2`, … for unnamed objects. Counters include only unnamed objects and are independent per type and map. Numbers are recalculated after deletion. No stored metadata is rewritten. The previous source already used a hyphen for named objects; the reported discrepancy on deployed site was not reproduced.
- Version and module cache keys updated to 94.098.

## Local validation
- Chromium/Playwright with production Atlas modules and CSS, isolated storage adapter: 36 tool-to-tool transitions and 18 actual creations for each of four combinations of map (overview/K5) and role (GM/player); exact six-type labels, edit/rename, retry after failed write, deletion/undo and remount. All passed, no page errors.
- Regression: radius placement/edit/resize/legacy anchors, text metadata placement/retry/reset/popup, history labels/deletion/undo, both maps and roles. All passed.
- Regression: party navigation, fog synchronization/scale/clipping, undo/redo, rollback, local transparency, remount, clear/reset, legacy fog preservation. All passed.
- JS syntax checks passed.
- No remote GitHub Pages, GitHub Cloud, full application boot or external PDF.js test; no production changes. Existing incorrectly saved titles/notes are retained and can be edited manually.
