# HMK Atlas PATCH v94.069 – Esc a přístup k mlze války

Navazuje na v94.068. Instalujte pouze změněné soubory do kořene stávajícího repozitáře; všechny původní mapové podklady zůstávají.

## Změny

1. **Mlha války**: její rozbalovací panel vyžaduje při každém novém otevření heslo `anakin`. Nesprávné heslo sekci neotevře. Zadávání lze zrušit tlačítkem či klávesou Esc. Heslo chrání pouze **uživatelské rozhraní**, nikoli samotná data nebo přístup k veřejnému JS kódu; neopírejte o něj bezpečnost soukromých informací.
2. **Klávesa Esc**: ukončí aktivní kreslení a editaci mapových objektů, štětec mlhy, rozepsané umístění značky či její formulář, zvýraznění a popisek vybrané značky, ovládání po najetí na objekt, nabídku vrstev, seznam značek a také **měření trasy** včetně odstranění jeho dočasných bodů. Tlačítko „Ukončit měření“ zůstává beze změny. Již uložené posuny bodů a značek Esc nevrací; nepotvrzené změny formuláře se neuloží.
3. **Pozice družiny**: horní tlačítko je neaktivní, pokud není na právě otevřené mapě uložena ikonka družiny. Po vytvoření značky typu „Pozice družiny“ přes „Přidat značku“ se aktivuje, po jejím smazání se znovu deaktivuje. Stávající vycentrování na pozici družiny na 107 % zůstává.
4. **Izolace**: změny pouze v Atlasu. Beze změn herních modulů, datového formátu, PDF map i GitHub Cloud writeru.

## Ověření

- Kontroly syntaxe `node --check` pro oba moduly Atlasu a `app.js`.
- Samostatné funkční průchody v Chromium při 1510 px a 390 px: heslo správně/špatně, zavření dialogu, Esc pro vrstvy, značky, formulář, mapový výběr, měření, nástroj kreslení a mlhu, zachování uložených objektů a přepínání na K5.
- Samostatná kontrola odstranění družiny s celou historií, vypnutí jejího tlačítka a zachování již uloženého přetažení bodu trasy po Esc.
- Funkční prohlížečové testy používaly izolované úložiště a simulaci PDF.js. Skutečný vzdálený GitHub zápis a načtení PDF z CDN se neověřovaly.

## Instalace

Rozbalte ZIP do kořene GitHub Pages repozitáře tak, aby se přepsaly `index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js` a `src/ui/atlas-cartography.js`. Poté obnovte web přes Ctrl+F5. Mapové obrázky, legendy a `assets/atlas/k5-detail-map.pdf` ponechte.
