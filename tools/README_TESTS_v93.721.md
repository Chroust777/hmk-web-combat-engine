# Reprodukce testů HMK Web Combat Engine v93.721

Rozbalte zvláštní balíček TESTS kamkoliv. V příkazech dosaďte místo `<FULL_TREE_93721>` úplnou pracovní složku aplikace vzniklou aplikací produkčního PATCH v93.721 na přesný stav v93.720, včetně `src/` a produkčního bundlu. **PATCH neobsahuje testy ani tools/**.

```
node tests/test_cold_concurrency_93721.cjs <FULL_TREE_93721>
python tests/test_skill_stage_browser_93721.py <FULL_TREE_93721>
node tests/previous/test_concurrent_93718.cjs <FULL_TREE_93721>
node tests/previous/test_global_parallel_93719.cjs <FULL_TREE_93721>
node tests/previous/test_mixed_deadlock_93718.cjs <FULL_TREE_93721>
node tests/previous/test_sleep_parallel_93719.cjs <FULL_TREE_93721>
node tests/previous/test_weather_concurrency_93718.cjs <FULL_TREE_93721>
node tests/previous/test_fear_parallel_93720.cjs <FULL_TREE_93721>
```

Node testy používají TypeScript compiler (`typescript`, nebo systémový `/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js`); browser test požaduje Python Playwright a dostupný `/usr/bin/chromium`. Doplňkové staré Weather 37/46 testy se spouštěly přímo z `tools/` plného vývojového stromu a musí ukazovat na aktuální `src`, nikoliv na dřívější symbolický odkaz.

`test_skill_stage_browser_93721.py` používá pomocný vstup do reálného sestaveného `app.js` pro řízení stavu a zápisu. Neprohlašuje se za manuální End-to-End všech formulářů.
