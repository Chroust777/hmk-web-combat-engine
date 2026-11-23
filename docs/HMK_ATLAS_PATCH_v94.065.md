# HMK Keeper's Ledger – Atlas patch v94.065

**Výchozí verze:** v94.064. Ostatní herní moduly zůstávají beze změn.

## Instalace

Rozbalte ZIP do kořene webového GitHub Pages repozitáře a přepište:

- `index.html`
- `app.js`
- `atlas.css`
- `src/ui/atlas-viewer.js`
- `src/ui/atlas-cartography.js`

Ponechte existující `assets/atlas/` včetně vektorového `k5-detail-map.pdf` a všech legend a obrázků. Po nasazení obnovte stránku přes Ctrl+F5. Nejdříve ověřte funkce na testovací kampani a zálohujte původní soukromý JSON.

## Změny

1. **Odstraněno vyhledávání a rychlý přesun.** Sekce Mapové záložky byla rovněž skryta kvůli zjednodušení pravého panelu. Dříve uložené záložky nejsou z cloudového JSON automaticky mazány kvůli zpětné kompatibilitě.
2. **Pozice družiny:** její automatická historie se nadále kreslí jako tečkovaná spojnice, bez seznamu historie a bez tlačítka „Zapsat aktuální polohu“. Najetím na bod trasy se ukáže **×**, kterým se odstraní tento a všechny následující body až do aktuální polohy. Smazání značky Pozice družiny odstraní i **kompletní historii na příslušné mapě** v jediném společném zápisu do cloudového JSON; pokud zápis selže, obojí zůstane zachované.
3. **Značky:** najetím na značku se zobrazí mapové ovládání **✎ / ×**. Editace a odstranění jsou dostupné přímo na mapě. V pravém panelu zůstává pouze výběr názvu pro přesun pohledu na značku (107 %), nikoliv seznam úprav/smazání.
4. **Kreslené objekty (trasy, oblasti, kružnice, šipky, texty, kresby):** při najetí na geometrii se zobrazí **×** a odstraní daný objekt bez dalšího potvrzení. Kliknutí na objekt otevře jeho vlastnosti v nástroji; body lze upravovat nástrojem „Upravit body vybraného objektu“. Pravý seznam uložených objektů byl odstraněn.
5. **Fog of War:** předchozí průsvitná vrstva je nahrazena plně neprůhlednou kreslenou mlhou s jemnou texturou. Přidány jasné volby **Odhalovat** a **Vrátit mlhu**, samostatné nastavení poloměru štětce (v km) a kruhový náhled štětce. Tažením myši se maska přímo mění; výsledná neprůhlednost nepřibývá při opakovaném zakrývání. Původní odhalené oblasti se načítají ze stejné datové struktury, `fog.strokes`, bez migrace.
6. **Sbalené sekce:** „Měření trasy“ a „Vlastní značky“ se po otevření Atlasu zobrazují sbalené.
7. **Ukončit nástroj:** nadbytečné tlačítko odstraněno. Rozpracované kreslení lze zrušit „Zrušit kreslení“, aktivní nástroj vypnout výběrem prázdné položky nebo klávesou Esc.

## Ukládání, mazání a bezpečnost

Atlas zůstává zcela oddělený od cestování, herního času, Combat a Healing. Stále používá **stávající soukromý GitHub Cloud JSON** (`atlasMarkers` a `atlasCartography`). Jediná nová funkce persistence je atomický společný zápis `writeBundle` pro odstranění pozice družiny spolu s její historií. Záložky a historická pole existujících dat se při načítání nemažou automaticky.

Odstraněná značka/objekt není uložen v aktuálním JSON, ale GitHub může uchovávat starší verze souboru v historii commitů. Nástroj Zpět/Znovu si uchovává pouze krátkou pracovní historii v aktuálně otevřeném prohlížeči.

## Ověření

- `node --check`: `app.js`, `atlas-viewer.js`, `atlas-cartography.js`.
- Izolované Chromium: vytvoření/smazání objektu přímo křížkem, zobrazení nástroje po reálném přejetí myší, editace a smazání značky, záznam trasy družiny, smazání koncového úseku, atomické smazání pozice družiny a celé historie, odmítnutí cloudového zápisu s návratem dat, přepnutí na K5 a zpět.
- Fog: vzorky alfa kanálu 255 pod plně zakrytou mapou, 0 ve vymazaném místě, opět 255 po vrácení mlhy; bez průsvitných nebo sčítajících se vrstev.
- Mobilní samostatný kontext s šířkou 390 px: sbalené sekce, vytvoření družiny, přechod na K5, neprůhledná mlha, bez horizontálního přetečení a bez JS chyb.

**Omezení testu:** Prohlížečové testy byly izolované od produkčního cloudu. Reálný zápis do tvého soukromého repozitáře ani skutečné načítání PDF.js z CDN nebyly v tomto prostředí ověřeny (PDF vrstva v testu byla simulovaná). Souběžnost více živých cloudových klientů zůstává závislá na stávajících ochranách celého HMK.
