# HMK Keeper's Ledger – Atlas patch v94.064

Výchozí stav: kompletní aplikace **v94.063** (nikoli experimentální úpravy z jiného chatu).

## Instalace

Rozbalte ZIP do **kořenové složky** webového repozitáře a přepište odpovídající soubory:

- `index.html`
- `app.js`
- `atlas.css`
- `src/ui/atlas-viewer.js`
- **NOVÝ** `src/ui/atlas-cartography.js`

`docs/HMK_ATLAS_PATCH_v94.064.md` je tento návod.

**Nemažte** `assets/atlas/harn-I4-L7.webp`, `assets/atlas/harn-map-key.webp`, `assets/atlas/k5-detail-map.pdf`, `assets/atlas/k5-detail-legend.webp` ani jiné existující soubory. Nenahrávejte přiložené testovací snímky. Po publikování otevřete Atlas a obnovte stránku pomocí Ctrl+F5.

## Funkce

Vpravo v sekci **Kartografické nástroje** jsou dostupné:

1. **Pojmenované trasy:** klikáním vložte body; „Uložit objekt“ uloží trasu, zaznamená vzdálenost v km. Přepínání viditelnosti, hledání, editace názvu, poznámky, herního data, barvy, přesun vrcholů a doplnění dalších bodů. Vyvolání „Body“ u uložené trasy zpřístupní přetahování vrcholů a kliknutím vložení dalšího bodu. „Zpět bod“ odstraní poslední vrchol (při zachování minimálního počtu).
2. **Oblasti a měření plochy:** mnohoúhelník, průhledná výplň, název a poznámka; rozloha km². Barvu a průhlednost lze upravit.
3. **Kružnice dosahu:** zadejte fyzický poloměr v kilometrech a klikněte do mapy. Jde o přímý geometrický dosah, nikoli cestovní čas nebo dosah kouzla.
4. **Fog of War:** „Zapnout mlhu“ zakryje aktuální mapu. Režim „Mlha: odhalovat“ / „Mlha: znovu zakrývat“ a poloměr štětce v km mění viditelnou oblast tažením po mapě. Odhalování lze anulovat, úplně obnovit nebo skrýt vrstvu. Každá mapa má vlastní masku. Mlha se nesynchronizuje s pravidly ani s postavami.
5. **Vrstvy:** značky, trasy, oblasti, kružnice, kresby, šipky, texty, pohyb družiny a mlha lze samostatně skrýt/zobrazit bez mazání.
6. **Vyhledávání:** podle vlastních značek a popisků, tras a mapových objektů; na hlavní mapě také podle sektoru (K5 otevře detail).
7. **Volné kreslení:** čára od ruky, šipka, text do mapy.
8. **Záložky:** uložený název, poloha a zoom, který lze později obnovit.
9. **Historie pohybu družiny:** automaticky při přidání/přemístění značky „Pozice družiny“ a ručně tlačítkem „Zapsat aktuální polohu“. V datové vrstvě Atlasu může mít herní datum a poznámku. Historii lze jednotlivě nebo kompletně mazat.
10. **Měření plochy:** vypočtené přímo při uložení mnohoúhelníku (viz bod 2).
11. **Zpět / Znovu:** lokální historie posledních 30 změn kartografie a značek, zapisovaná i do společného JSON. Historie Zpět/Znovu se po zavření stránky neskladuje.
12. **Časové poznámky u značek:** ve formuláři značky lze přidat události Objeveno / Navštíveno / Opuštěno / Poznámka s herním datem a textem. Po smazání značky zmizí také její poznámky z aktuálního souboru kampaně.

Existující nástroje měření vzdáleností, značky, zoom, mobilní pinch, přehledová mapa i vektorové PDF K5 zůstávají v původním řešení.

## Datové úložiště a izolace

Nové nástroje přidávají výhradně pole `atlasCartography` do **existujícího** privátního JSON dokumentu kampaně. Existující značky nadále používají `atlasMarkers` (s volitelným `events` v záznamech značek). Obě datové části používají původní validační funkci a hlídané `save()` GitHub Cloudu. Žádná nová databáze, token ani samostatné repozitářové oprávnění.

Neprovádí se změny cestovních intervalů, času, pravidel HMK, léčení ani boje. Fog of War není oddělený GM/Player pohled; je to **společná mapa Atlasu** v dané cloudové kampani. Před rozšířením na hráčská oprávnění je nutné řešit přístupovou vrstvu samostatně.

**Důležité:** GitHub ponechává vlastní historii verzí JSON, i když objekt ve výchozím aktuálním JSON smažete. Při velkém množství dlouhých fog tahů může hlavní JSON narůst; proto jsou nastaveny limity počtu objektů a bodů.

## Validace

- Syntaktické kontroly JavaScriptu (`node --check`): `app.js`, `atlas-viewer.js`, `atlas-cartography.js`.
- Izolovaný browser test v Chromium bez produkčního cloudu: uložení trasy, plocha, poloměr, kreslení, šipka, text, Fog of War, Zpět/Znovu, vrstvy, záložky, značka s časovou poznámkou, marker undo, historie družiny, hledání a 107% zaměření.
- K5: ověřeno přepnutí a oddělené uložení kartografických objektů; PDF rendering byl ve funkčním testu simulován.
- Oddělený mobilní browser kontext se sdíleným testovacím datovým snapshotem; prohlížečové chyby nenalezeny.
- Odmítnutý zápis: nový objekt se vrátí do posledního potvrzeného stavu, existující data nejsou přepsána. Poškozený cloudový dokument nových nástrojů blokuje jejich zápisy.

**Neověřeno v tomto prostředí:** skutečné vzdálené zapsání do soukromého GitHub repozitáře, reálné CDN vykreslování K5.pdf a kompletní regresní průchod dalších modulů aplikace. Před nasazením do produkční kampaně doporučuji zálohu původního cloudového JSON a vyzkoušení na kopii kampaně.
