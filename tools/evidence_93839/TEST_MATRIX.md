# v93.839 – test evidence

- Chromium catalogue purchases, tooltips, cash and stable movement: **PASS 38**, `BROWSER_STABLE_GUIDE.json`.
- Chromium legacy transfers, cargo, ENC, wagon: **PASS 44**, `BROWSER_TRANSFER_REGRESSION.log`.
- Source matrix + 16 species printed prices: **PASS 61** via `tools/test_93839_stable_catalog.cjs`.
- Legacy physical stable: **PASS 29** via `tools/test_93839_stable_transfer_regression.cjs`.
- Weather / mounted travel: **PASS 20**; Foraging: **PASS 70 + 48 + 1539**; Tracking: **PASS 12 + 15**; inventory disposition: **PASS 63**.
- HTTP navigation/reload: **BLOCKED**, tool policy `net::ERR_BLOCKED_BY_ADMINISTRATOR`, see `BROWSER_ROUTED_HTTP_RELOAD.json`.

Clicking buttons in isolated Chromium was not replaced by source-level checks. No dice were invented.
