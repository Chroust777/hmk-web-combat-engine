# v94.102 — Chat a stránkovaná kronika

Navazuje na v94.101; patch obsahuje jen změny. Bez zásahu do Atlasu, kalendáře, struktury cloudového JSONu nebo literárních pravidel.

- Odstraněna viditelná cloudová stavová hláška; chyby zápisu a načtení zůstávají v textové zpětné vazbě. Obnovit a Zavřít chat jsou na řádku nadpisu Chat.
- Správa jmen a barev se při otevření chatu a změně role sbalí. Odstraněn vzorník nad výběrem palety; barevné označení existujících jmen zůstává.
- Posledních 50 zpráv a jednotlivé archivní strany jsou vykresleny sestupně podle pořadí zápisu; po odeslání nebo změně archivní strany je posuvník nahoře. Při běžné synchronizaci je zachována čtená pozice, pokud uživatel není nahoře. Úložiště a chronologické čtení kroniky jsou nezměněné.
- Posuvná oblast je omezena na 460 px, 48 % výšky okna a součet výšek sedmi nejmenších karet s mezerami (nejnižší z těchto limitů). Dlouhé zprávy, editační pole a seznam jmen mají vlastní omezený prostor. Méně než sedm karet může být vidět podle délky zpráv/velikosti okna.
- Kronika má souvislou sazbu bez prázdných řádků mezi zápisy. Text se podle dostupné šířky a výšky skutečně zalomeného textu rozdělí na strany; šipky jsou dole. Při změně velikosti okna se přepočítá, při běžné aktualizaci zůstává čtená pozice podle znakového offsetu. Editace nadále upravuje celou kroniku. Původní ruční text není hromadně přepisován; čtecí pohled normalizuje mezery a nové pasáže se spojují mezerou.

## Ověření
- Chromium, sestavené aktuální moduly, produkční CSS, izolované lokální úložiště: 56 zpráv (50+6), sestupné řazení, nová zpráva nahoře, posuvník, nejvýše 7 celých karet (5 při 1700×1050), tři strany kroniky bez ztráty textu, přepočet po změně okna na 1450×850, GM správa sbalená i po návratu, odstraněný vzorník.
- Regrese v94.101: odesílání, herní datum/čas, společná kniha, editace/mazání kroniky, oprávnění, původní formulář a data. Bez výjimek v testech.
- Node: testy v94.099–101 (v testu v94.100 aktualizováno očekávané spojení vět z dvojitého zalomení na mezeru).
- Nebyl ověřen produkční GitHub Pages ani vzdálené cloudové připojení; v prohlížečovém testu nebyly načteny grafické textury.
