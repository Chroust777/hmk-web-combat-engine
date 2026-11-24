# HMK Atlas – v94.079: Editovatelná historie pohybu družiny

Základ: dodaný kompletní ZIP v94.077 + patch v94.078 (průsvitnost mlhy). Patch obsahuje aktualizované soubory včetně předchozího posuvníku.

## Ovládání
- Přetažení značky Pozice družiny zahájí rozpracovaný pohyb. Sekce Historie pohybu družiny se otevře automaticky. Klikáním do mapy nebo dalším tažením ikonky přidáte body; již existující mezilehlé body lze přetahovat.
- Zpět o krok / Znovu (také horní Zpět / Znovu) pracují v rámci rozpracovaného pohybu bez zápisu. Uložit pohyb uloží celou historii a pozici atomicky. Zrušit změny či Esc vrátí poslední uložený stav. Přepnutí mapy, jiného nástroje nebo opětovné vykreslení Atlasu ruší neuložené úpravy.
- Tužka po kliknutí na uložený bod, nebo tlačítko Upravit body, otevře editaci. Tažením lze přemístit i poslední bod. Kliknutí vybere bod pro Odstranit vybraný bod; sousední body se spojí. Odebrat poslední bod je dostupné také přímo v sekci; změnu je třeba uložit. Ikonka při každé úpravě sleduje poslední bod.
- Křížek u uloženého bodu zkrátí historii od vybraného bodu po potvrzení, s okamžitým společným uložením. Výchozí bod zůstane zachován. Křížek u samotné značky nadále maže celou značku a historii. Uložené úpravy lze vrátit horním Zpět/Znovu v aktuálním zobrazení Atlasu, včetně vytvoření a odstranění družiny.
- Pokud stará uložená historie nekončí u skutečné pozice, při zahájení editace se v pracovní kopii doplní aktuální poloha; bez uložení se starý JSON nemění. Maximálně 1000 bodů na mapě, stejně jako dříve.

## Technické hranice
Použit existující validovaný `writeBundle` pro společný zápis `atlasMarkers` a `atlasCartography`. Formát JSON neměněn. Rozpracované body nejsou součástí synchronizace. Odmítnuté uložení ponechá rozpracované změny a nezmění uložená data. Žádný zásah do pravidel, herního času, chatu ani synchronizace rozpracovaných herních intervalů. App.js a index.html mění pouze verzi/cache URL.

## Ověření
Skutečné ovládání myší v Chromiu s vloženými zdrojovými moduly a izolovaným paměťovým adaptérem využívajícím původní validátory. Na obou mapách PASS: přetažení a přidání bodu bez zápisu, undo/redo/zrušení, uložení, tužka, přetažení vnitřního/koncového bodu, odstranění jednotlivého bodu, odmítnutý zápis a opakovaný pokus, odstranění posledního bodu, zkrácení křížkem, společné undo/redo, Esc a opětovné připojení pohledu. Další PASS: nová pozice s jedním atomickým zápisem, tlačítko Odebrat poslední bod, odstranění pozice a undo, běžná trasa a editace, původní průsvitnost mlhy/štětce/zoom/heslo/Enter na obou mapách. Bez JavaScriptových chyb v těchto testech. Syntaxe JS a integrita patche ověřeny. Nejde o test živého GitHub Cloudu, vzdáleného PDF.js ani kompletního startu aplikace z GitHub Pages.

Instalace: rozbalit do kořene repozitáře, nahradit soubory, publikovat a Ctrl+F5. Bez herních dat a mapových podkladů.
