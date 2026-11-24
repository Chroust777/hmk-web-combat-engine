# HMK Keeper’s Ledger v94.092 – trvalá mlha v režimu hráče

Výchozí stav: autoritativní ZIP v94.077 + aplikované patche v94.078–v94.091. Obsah všech sedmi dotčených zdrojových souborů byl ověřen proti řetězci ZIPů.

- Hráč má vždy plně neprůsvitnou masku zakrytí, nezávisle na `fog.enabled` a GM průsvitnosti. Základ je zcela zahalený; následně se aplikují původní místní a společné chronologické tahy. V režimu GM se zachovává stávající chování přepínače i původní částečný základ K5.
- Přepínač viditelnosti GM není odhalením; jeho původní ukládání v kampani zůstává zachováno. GM může pomocí potvrzené akce Odstranit mlhu skutečně odhalit celou mapu; pro hlavní mapu se nyní zapíše existující typ celoplošného odhalovacího tahu, aby byl odlišitelný od prázdné mapy. Detailní celoplošná operace zůstává beze změny.
- Staré tahy se nemigrují. U starého stavu bez tahů nelze rozlišit nedotčenou mapu od dřívějšího celoplošného odstranění mlhy: hráč proto uvidí bezpečnější plné zakrytí. GM může celoplošné odhalení potvrdit znovu. Stejně tak starý implicitně odkrytý prostor mimo K5 již hráč neuvidí, pokud nemá výslovný odhalovací tah.
- Zpět/Znovu v režimu hráče nesmí obnovit dřívější stav mlhy; běžné poznámky a kartografické objekty zůstávají funkční. Žádné změny formátu JSON, pravidel, cloudového protokolu ani produkčního repozitáře.

## Ověření
- Node syntax check: app.js, atlas-viewer.js, atlas-cartography.js.
- Chromium (izolovaný adaptér paměťového úložiště, produkční styly Atlasu): prázdná mapa, přihlášení/odhlášení reálnými ovladači GM, vypnutí mlhy, průsvitnost 100 %, změna role bez zápisu, přepínání map a opětovný mount, zamezení undo mlhy, převod tahů mezi mapami, hranice K5, plné odhalení/zakrytí obou map i samotného K5, odmítnutý zápis, zachování původních tahů, historie družiny GM i hráč, poznámky, přetažení a zkrácení historie. Všechny provedené testy PASS, bez zachycených JS výjimek.
- Živý GitHub Cloud, GitHub Pages, externí PDF.js a úplný start aplikace nebyly ověřeny. Jde o vizuální režim pro důvěryhodnou skupinu, nikoli serverovou autorizaci.

Instalace: rozbalit do kořene repozitáře s v94.091, přepsat uvedené soubory, publikovat a obnovit Ctrl+F5.
