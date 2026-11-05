# TESTY – HMK Web Combat Engine v93.725

V tomto archivu jsou auditní protokol, výpis skutečných výsledků a vybrané testovací soubory. Produkční PATCH je samostatný archiv.

K testování použijte **úplný zdrojový repozitář v93.725** vzniklý aplikací PATCH v93.725 na v93.724. Testy vyžadují Node 22 a TypeScript transpiler podle cest v testovacích skriptech. Je-li TypeScript nainstalovaný jinde, testovací loader je nutno přizpůsobit; nesmí se použít starší kopie zdrojového stromu.

Test `test_global_shock_93722_rescoped.cjs` se při samostatném spuštění musí nacházet v `tools/` pod skutečným zdrojovým kořenem, protože importuje relativní `../src/`. V auditní kopii byl umístěn právě takto.

Průběh regresí: `regression_log_final.txt`. Souhrn zjištění a nezavřené oblasti: `AUDIT_v93.725.md`.

Základní testy:

```bash
node --check app.js
node --check hmk-app.bundle.js
node tools/build_bundle.cjs
node tests/test_93725.cjs /cesta/k/produkcnimu/zdroji
```

Archiv není náhradou za prohlížečové E2E a reálnou synchronizaci s cloudem.
