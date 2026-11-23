# HMK Keeper’s Ledger – Atlas PATCH v94.063

Navazuje na v94.062. **Základní aplikace, herní logika, mapové obrázky, originální K5 PDF a cloudový modul zůstávají nezměněné.**

## Změny Atlasu

1. Ikony všech typů značek mírně větší při stejném přiblížení (křivka velikosti dle absolutního zoomu zachována).
2. **Pozice družiny** používá standardní formulář s možností vyplnit volitelný název a popisek; ikona je vidět před potvrzením. Uložit lze i s oběma poli prázdnými. Při změně pozice již uložené družiny se původní záznam aktualizuje až stiskem **Uložit značku**; zrušení formuláře původní stav zachová.
3. **Všechny ostatní značky** umožňují uložit prázdný název i prázdný popisek. V seznamu se bez názvu zobrazí typ značky. Žádné nové povinné údaje.
4. **Pinch-to-zoom**: na mobilu se na přehledové mapě i detailním K5 dá přibližovat a oddalovat dvěma prsty a současně přesouvat mapou. Přerušení dvouprstého gesta nepřidá omylem značku nebo měřicí bod.
5. Odstraněna věta „Značky, vrstevnice, sídla, cesty a hranice z K5.pdf“.
6. Kliknutí na název značky v pravém seznamu ji vystředí a **nastaví přesně 107 % zoom**. Přímé kliknutí na ikonku nadále jen zobrazí/zavře její popisek.
7. Stávající mazání značky vyřadí položku z `atlasMarkers` v JSON kampaně. Atlas samostatně nezapisuje historii, tombstone ani herní deník pro odstranění značky. **Pozor**: každá dříve zapsaná verze JSON může i nadále existovat v historii commitů *soukromého repozitáře GitHub*. Tento patch historii GitHubu nemění.

## Instalace

Rozbalit ZIP do kořene GitHub Pages repozitáře a přepsat `index.html`, `app.js`, `atlas.css` a `src/ui/atlas-viewer.js`. Soubory PDF a WebP zachovat. Po nasazení načíst stránku znovu (Ctrl+F5).

## Kontroly

- `node --check`: bez syntaktických chyb.
- Izolovaný prohlížečový test: prázdná pole a uložení všech typů, rychlá změna pozice družiny se zachováním záznamu, navigace na značku při 107 %, smazání bez Atlas historie, změna velikosti ikonek, pinch na I4–L7 a K5.
- Vykreslení PDF.js s externím CDN a skutečné vzdálené odeslání do soukromého GitHubu nebyly při tomto testu provedeny; příslušná část kódu se neměnila.
