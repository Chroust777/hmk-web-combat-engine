# HMK Atlas v94.070 — Výchozí štětec a sjednocené sekce

Navazuje přímo na v94.069. Všechny změny jsou omezeny na Atlas.

- Výchozí poloměr štětce **Mlha války** je **5 km** na přehledové mapě I4–L7 a **0,2 km** na detailu K5. Po přepnutí map se výchozí hodnota určí podle nově otevřené mapy. Uživatel může hodnotu kdykoliv upravit. Původní uložené tahy mlhy se nepřepočítávají ani nemažou.
- Sekce **Měření trasy**, **Vlastní značky**, **Trasy, oblasti a kreslení** a **Mlha války** mají shodnou velikost, písmo a rámeček. Nad kartografickými nástroji není oddělovací čára.
- **Trasy, oblasti a kreslení** jsou standardně sbalené, stejně jako Měření trasy a Vlastní značky. Heslo mlhy, Esc a ostatní ovládání z v94.069 zůstávají zachované.

## Instalace

Rozbalit ZIP do kořene aplikace po v94.069, přepsat pět existujících souborů; složka `docs/` přidává dokumentaci. Mapové obrázky a PDF beze změny. Po nasazení vyprázdnit cache pomocí Ctrl+F5.

## Kontrola

Syntaktická kontrola JavaScriptu, ZIP integrity, prohlížečový test základních i detailních výchozích hodnot, vzhledu a sbalení sekcí. Skutečný GitHub zápis a PDF.js přes CDN nejsou předmětem této malé úpravy.
