# HMK Keeper’s Ledger v94.095 – prázdný nový text na mapě

Základ: původní ZIP v94.077 a překryvy patchů v94.078–v94.094 ověřené proti ZIPům.
Při výběru nástroje Text na mapě se vyprázdní název a poznámka. Ostatní nástroje, barva, uložené objekty a editace jejich metadat beze změny. Při odmítnutém zápisu zůstanou zadané hodnoty. Aktualizace verze a importů kvůli cache.

## Testy
Chromium s produkčními CSS a izolovaným paměťovým adaptérem: reprodukce původní chyby, nový text s prázdnými poli, několik samostatných textů, editace původního textu, zrušení nového textu, neúspěšný zápis a opakování – PASS na I4–L7 a K5 pro hráče i GM. Regrese: vyskakovací poznámky, přesun textu, jediný kotevní bod, čištění starých bodů, trasy a oblasti – PASS. Bez zachycených JS výjimek. Syntaxe JS PASS.
Neověřeno: vzdálený GitHub Cloud, GitHub Pages, PDF.js a kompletní start aplikace.

Instalace: rozbalit do kořene verze v94.094, nahradit soubory, publikovat a Ctrl+F5.
