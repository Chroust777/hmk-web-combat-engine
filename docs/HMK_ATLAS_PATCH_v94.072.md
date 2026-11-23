# HMK Atlas PATCH v94.072 – Enter a zkracování tras

Navazuje na v94.071. Změněny jsou pouze Atlas a úzká výjimka v globálním zákazu implicitního odeslání formulářů.

- Heslo Mlhy války lze odeslat hlavním Enterem nebo numerickým Enterem; ostatní HMK formuláře nadále vyžadují vlastní tlačítko.
- Po kliknutí na tužku u trasy se otevře její editace. Kliknutí na bod zobrazí křížek; křížek odřízne navazující část trasy až k poslednímu bodu (při výběru posledního bodu odstraní poslední úsek). Trasa musí mít alespoň dva body.
- Vpravo v editaci je vedle **Uložit změny** tlačítko **Odebrat celou trasu**. Obě destruktivní akce se potvrzují.
- Přetahování vrcholů, přepočet vzdáleností, Esc a cloudové ukládání zůstávají zachovány.

Instalace: přepsat index.html, app.js, atlas.css, src/ui/atlas-viewer.js a src/ui/atlas-cartography.js. Nenahrazovat mapy, PDF ani jiné herní soubory.
