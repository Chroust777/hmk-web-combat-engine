# HMK Keeper’s Ledger v94.086 — Kartografické nástroje nad mlhou

Výchozí stav: původní kompletní ZIP v94.077 + vydané patche v94.078–v94.085 v pořadí verzí.

- Při zapnutém zakrytí se objekty sekce Trasy, oblasti a kreslení (včetně jejich bodů, popisků, rozpracované kresby a ovládání) vykreslují nad mlhou. Po vypnutí mlhy se vrstva vrátí na původní úroveň.
- Klasické měření je nad mlhou včetně bodů, spojnic a dílčích vzdáleností. Aktivace měření ukončí předchozí nástroj stejným mechanismem jako doposud. Měření zůstává dočasné a nic nezapisuje do kampaně.
- Samostatná vrstva historie družiny a vrstva vlastních značek zůstávají pod mlhou; jejich stávající ovládání a datové struktury zůstávají zachovány. Vrstva kartografických objektů není během měření interaktivní, takže měření má přednost.
- Obsah a neprůsvitnost masky mlhy, synchronizace mezi mapami, uložené objekty a ostatní herní systémy se nemění. Změny v app.js a index.html jsou pouze označení verze a cache-busting.

## Ověření

- Kontrola syntaxe všech tří dotčených JS souborů.
- Chromium, skutečné klikání a tažení s produkčními CSS nad izolovanými moduly Atlasu a paměťovým adaptérem: I4–L7 a K5, měření přes plně neprůsvitnou mlhu, přechod ze štětce přímo na měření, odebrání bodu a nové měření, vytváření trasy, kliknutí na bod a otevření tužky/křížku, přesun bodu, oblast a její ovládání, volná kresba a její ovládání, přednost měření před objekty, kontrola pixelů skutečně vykreslených bodů, neměnnost masky a dat při měření, původní vrstvy po vypnutí mlhy.
- Regrese Chromium: historie družiny (mazání, okamžité přesuny, poznámky, kompaktní tlačítka, drag, Esc, odmítnutý zápis, undo/redo), navigace na družinu, obousměrné zakrytí, ořez na hranici K5, průsvitnost, starší data a odmítnutý zápis. Bez zachycených JS výjimek.
- Nebyl ověřen úplný start aplikace z produkčních GitHub Pages, vzdálený GitHub Cloud ani skutečný PDF.js. Žádná produkční data či repozitář nebyly upraveny.

Instalace: rozbalit patch do kořene aplikace v94.085, přepsat uvedené soubory a po publikaci obnovit Ctrl+F5.
