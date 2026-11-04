# Regression comparison v93.720 versus v93.721

| Test | v93.720 | v93.721 |
|---|---|---|
| `test_concurrent_93718.cjs` | PASS: PASS: 373 assertions, 24 permutations of 4 simultaneous starts and completions; append-only/reload-contract, no duplicate, deadline protection | PASS: PASS: 373 assertions, 24 permutations of 4 simultaneous starts and completions; append-only/reload-contract, no duplicate, deadline protection |
| `test_global_parallel_93719.cjs` | PASS: PASS 501 assertions; 24 medical four-source permutations; 6 global-ledger orderings | PASS: PASS 501 assertions; 24 medical four-source permutations; 6 global-ledger orderings |
| `test_mixed_deadlock_93718.cjs` | PASS: PASS 14 assertions: Pepa Treatment start + Michal second Cold F on existing damp HR4, both orders, and 120-min safe advance | PASS: PASS 14 assertions: Pepa Treatment start + Michal second Cold F on existing damp HR4, both orders, and 120-min safe advance |
| `test_sleep_parallel_93719.cjs` | PASS: PASS 40 sleep/rest concurrent-source assertions | PASS: PASS 40 sleep/rest concurrent-source assertions |
| `test_weather_concurrency_93718.cjs` | PASS: PASS 14 assertions for two simultaneous damp Cold exposures, both orders, accumulated Weakness, preserved source events | PASS: PASS 14 assertions for two simultaneous damp Cold exposures, both orders, accumulated Weakness, preserved source events |
| `test_fear_parallel_93720.cjs` | PASS: PASS 67 concurrent Fear assertions | PASS: PASS 67 concurrent Fear assertions |
