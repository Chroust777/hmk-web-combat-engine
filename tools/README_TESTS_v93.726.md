# Testy v93.726

Produkční PATCH se aplikuje na **v93.725**. Nezabalovat jeho obsah do jiné vnořené složky. Testy a audit nejsou produkční soubory.

## Testy

1. `node tests/test_exposure_course_93726.cjs /cesta/ke/kořeni/webu` (vyžaduje Node 22 a TypeScript v závislostech prostředí).
2. `python tests/test_exposure_ui_93726.py /cesta/ke/kořeni/webu /výstupní/složka` (vyžaduje Python, Playwright a místní Chromium).
3. Regresní srovnání a omezení viz `AUDIT_v93.726.md`, výpis v `regression_compare.tsv`.

Test Chromium vykresluje produkční formuláře v izolovaném testovacím dokumentu; screenshot není důkaz vzhledu reálného GitHub Pages webu. Výsledek 19 kontrol zahrnuje skutečné události a zápis v testovací simulaci, nikoli přímou cloudovou synchronizaci.

Nepoužívat mazání cookies/localStorage jako metodu opravy chyby. Před nasazením si stáhnout zálohu stávající kampaně a nejdříve prověřit na kopii.
