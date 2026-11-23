# HMK Keeper's Ledger – Atlas PATCH v94.066

Výchozí stav: **v94.065**. Změny platí jen pro samostatný Atlas I4–L7 a K5.

## Instalace
1. Zálohujte aktuální verzi kódu a sdílený JSON kampaně.
2. Nahraďte soubory z archivu ve stejných umístěních v kořeni GitHub Pages repozitáře.
3. Zachovejte všechny stávající soubory map, legend a `assets/atlas/k5-detail-map.pdf`.
4. Nasaďte změny a v prohlížeči proveďte Ctrl+F5.

## Změny
- Ovládací tlačítka **✎** a **×** vlastních značek se zobrazují pod ikonkou, aby nezakrývala horní okno s textem. Pohyb kurzoru mezi ikonkou a tlačítky má toleranci a tlačítka zůstávají dostupná.
- Odstraněn formulář typu události, herního data a tlačítko **Přidat časovou poznámku**. Zůstává volitelné textové pole **Popisek**. Historická data událostí v uložených značkách jsou zachována kvůli kompatibilitě; dřívější volné texty se nadále mohou zobrazit v popisku bez dat a typů událostí.
- Místo číselné hodnoty **Dosah / šířka štětce** pro kružnice se poloměr kružnice určuje přímo **tažením myší od středu**. Průběžná kružnice a vzdálenost jsou viditelné ještě před puštěním tlačítka. Prvním a druhým klepnutím lze zadat střed a kraj při ovládání bez tažení.
- Již uloženou kružnici lze změnit na mapě tažením středu nebo barevně označeného krajního bodu.
- Mapové objekty mají po najetí stabilní větší ovládací plochu s **✎** a **×**, ne tlačítko pronásledující kurzor. U kružnice je navíc záchytný bod uprostřed.
- Každý mapový objekt (trasa, oblast, kružnice, čára, šipka a text) má volitelnou **poznámku**. Na mapě se zobrazí po najetí na objekt, tužka otevře úpravu.
- Odstraňování **značek, kreslených objektů i části trasy družiny** vyžaduje výslovné potvrzení. Odmítnutí zruší pouze danou akci.
- Volba **Vrstvy mapy** se přesunula do horní lišty vedle tlačítka **Celá mapa**. Přepínání vrstev zůstává oddělené od ostatních herních modulů.
- Panel kartografie zobrazuje jen položky příslušné právě vybranému typu objektu. V režimu bez zvoleného nástroje skryje parametry; u kružnice není číselný poloměr, u trasy není průhlednost oblasti.
- **Uložit trasu** je přejmenováno na **Zakreslit trasu**. Odstraněna zbytečná volba **Upravit body vybraného objektu** (po kliknutí na mapový objekt se úpravy nabídnou automaticky). Odstraněno matoucí tlačítko **Zrušit kreslení** (ukončení přes prázdný nástroj nebo Esc).
- Odstraněna věta „Mapové poznámky se synchronizují přes společný soukromý GitHub JSON. Zpět/Znovu platí v aktuálně otevřeném Atlasu.“
- **Fog of War** a kalibrace vzdáleností zůstaly beze změny; průběžná kružnice patří nástroji dosahu, nikoliv štětci mlhy, který má vlastní nastavitelný poloměr a vizuální obrys.

## Kompatibilita
- Datový formát `atlasMarkers` a `atlasCartography` se **nemění**. Značky, mapové objekty, historie družiny i masky mlhy se zachovávají.
- Synchronizace probíhá přes stávající bezpečný mechanismus sdíleného JSON; nebylo potřeba přidat backend nebo přístupový klíč.
- Nejsou provedeny žádné úpravy pravidel, kalendáře, cestování, Healing, Combat ani logbooku.

## Kontroly
- `node --check` pro oba mapové moduly a pro `app.js`.
- Izolovaný Chromium/Playwright: vytvoření a dokončení trasy, náhled a uložení kružnice, úprava a smazání mapového objektu bez force-click, volitelná poznámka na hover, potvrzení odstranění, práce se značkou, zkrácení historie družiny, Fog of War, K5 navigace.
- Další test: úprava poloměru již existující kružnice přetažením koncového úchytu.
- Mobilní emulace 390px: bez vodorovného přetečení, vrstvy v horní liště, pozice družiny a K5 s neprůhlednou mlhou.

**Limity ověření:** Vektorový PDF.js rendering na CDN je v izolovaných testech nahrazen mockem; skutečný vzdálený zápis do soukromého GitHub repozitáře nebyl proveden. Doporučujeme nejprve ověřit v testovací kampani.
