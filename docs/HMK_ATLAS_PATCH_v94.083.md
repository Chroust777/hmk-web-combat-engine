# HMK Keeper’s Ledger v94.083 – Poznámky k historii družiny a okamžitý přesun ikonky

Výchozí stav: dodaný kompletní ZIP v94.077 s postupně aplikovanými patche v94.078–v94.082. Tento patch je přírůstkový k v94.082.

- Historie družiny zobrazuje pouze body s neprázdnou poznámkou; prázdné pole se zobrazí jen při výslovném otevření editoru modrým tlačítkem poznámky u bodu na mapě. Při přechodu na jiný bod nebo ukončení editace prázdná položka zmizí.
- V režimu editace má každý bod tlačítko poznámky. Mimo editaci mají tlačítko body s poznámkou a koncový bod, jehož střed překrývá ikonka družiny. Uložená poznámka se otevírá jako mapová bublina; prázdný koncový bod lze otevřít přímo k zápisu. Stávající tužka, křížky, Zpět/Znovu a Esc zůstávají.
- Náhled ikonky družiny se překreslí před ostatními částmi historie a bez CSS animace/transition. Po každém odstranění koncového bodu je na posledním zachovaném bodu ještě před Esc. Prostřední bod se odstraní se spojením sousedů. Poslední zbývající bod je nadále chráněn.
- Uložení přes Esc nadále atomicky ukládá polohu a historii; při odmítnutí zápisu zůstává rozpracovaný stav. Formát dat, GitHub CAS, herní moduly i Fog of War beze změny.

## Ověření
Chromium s reálnými zdrojovými moduly Atlasu a izolovaným paměťovým adaptérem, s CSS aplikace: I4–L7 i K5 – výchozí filtrování poznámek, otevření prázdného pole z mapy, změna a odstranění textu, popup koncového bodu, odstranění prostředního bodu z uložené historie, opakované smazání konce bez kliknutí do seznamu, shoda souřadnic ikonky s posledním bodem před Esc, Zpět/Znovu, posun mapy, tažení bodu, odmítnutý zápis a opakování, ochrana výchozího bodu. Bez JS výjimek. Regrese mlhy: obě mapy, průsvitnost, odhalování, zakrývání, zoom, reset náhledu, heslo a Enter. Syntaxe app.js a obou Atlas modulů ověřena.

Neověřován vzdálený GitHub Cloud, kompletní produkční start ani vykreslování PDF.js. Původní produkční zpoždění ikonky nebylo přímo reprodukováno; nový test kontroluje její polohu bezprostředně po každém smazání.
