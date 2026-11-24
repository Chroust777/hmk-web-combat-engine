# HMK Keeper’s Ledger v94.084 – navigace k družině a propojení mlhy

Základ: původní uživatelem dodaný ZIP v94.077, následně patche v94.078–v94.083 v jejich pořadí. Tento patch je určen pro v94.083.

## Pozice družiny
- Na hlavní mapě je tlačítko aktivní i tehdy, když je značka družiny uložena pouze v K5. Otevře K5 a vycentruje/zvolí existující značku.
- Pokud jsou samostatné značky na obou mapách, má pro tuto navigaci přednost detailní značka v K5; nezměněné značky ani historie se automaticky neslučují.
- Pokud je značka pouze na hlavní mapě a leží v K5, otevře a vycentruje odpovídající místo na detailu bez vytvoření duplicitní značky. Pokud leží v sektoru bez detailní mapy, zobrazí značku na hlavní mapě a vypíše název sektoru.

## Mlha
- Nové tahy se ukládají jednou v původní mapě, s volitelným společným pořadím `syncOrder`. Při vykreslení obou map se aplikují ve stejném pořadí. Pozdější tah zakrytí či odhalení má přednost.
- Převod je odvozen z rozměrů map a polohy K5 v mřížce hlavní mapy. Štětec, včetně jeho poloměru, je transformován společně s mapou; tahy z K5 jsou oříznuty na hranice sektoru. Nejde o přesnou geodetickou registraci dvou různých kartografických podkladů.
- Při zásahu do společné oblasti se aktivuje mlha i na druhé mapě. Jestliže se dosud prázdná vypnutá hlavní mapa poprvé aktivuje z detailu, její základ zakrytí je pouze v K5 (`baseK5Only`), takže okolní sektory nezmizí. Přepínač viditelnosti a GM průsvitnost zůstávají lokální; další relevantní tah mlhu na druhé mapě znovu aktivuje.
- Starší samostatné tahy bez `syncOrder` se zachovají jako původní maska každé mapy. Bez časového pořadí nelze jejich případné rozpory automaticky sjednotit bez přepsání uživatelských dat. Nové tahy se promítají nad nimi.
- Potvrzené úplné zahalení/odstranění mlhy na hlavní mapě platí pro obě mapy; totéž na detailu platí jen pro K5. Celoplošný tah K5 (`wholeMap`) nepřesahuje sektor. Změny se ukládají jedinou existující transakcí; odmítnutý zápis se vrací.
- Verze struktury kartografie zůstává 1; nové atributy jsou volitelné. Bez změny dat při samotném otevření aplikace.

## Ověření
- Node.js: syntaktická kontrola app.js a obou modulů Atlasu.
- Chromium: skutečné UI Atlasu s produkčními CSS a izolovaným paměťovým adaptérem, kontrola alfa kanálu vykreslené mlhy po kliknutí a tažení, přechody mezi mapami, pořadí tahů, měřítko, ořez na hranici K5, nezasažené sousední sektory, stará data, undo/redo, odmítnutý zápis, nové načtení z uloženého snapshotu, průsvitnost GM, celoplošné operace.
- Regrese historie družiny na obou mapách: poznámky, mazání bodů, přichycení ikonky, posun mapy, Esc, odmítnutý a opakovaný zápis.
- Živý GitHub Cloud, GitHub Pages a externí PDF.js nebyly ověřeny. Test adaptéru není test vzdáleného cloudu.

## Instalace
Rozbalit do kořene v94.083, přepsat soubory a obnovit Ctrl+F5. Žádný produkční repozitář nebyl upraven. Cestování, léčení, boj, herní čas, chat a ostatní pravidlové moduly nejsou součástí změny.
