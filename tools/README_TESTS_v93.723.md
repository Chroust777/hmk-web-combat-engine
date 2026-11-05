# Testy v93.723

Použij **zdrojovou složku v93.723**, nikoli v93.722.

```bash
node tests/test_weather_area_93723.cjs /path/to/hmk-dev-v93.723
python tests/test_weather_ui_93723.py /path/to/hmk-dev-v93.723
```

Chromium test předpokládá nainstalovaný `playwright` a `/usr/bin/chromium` a používá izolované paměťové localStorage, ne tvou kampaň. Pro zpětnou kompatibilitu proveď i `node tools/build_bundle.cjs` v kořeni projektu.

Omezení a přesný rozsah viz `AUDIT_v93.723.md`.
