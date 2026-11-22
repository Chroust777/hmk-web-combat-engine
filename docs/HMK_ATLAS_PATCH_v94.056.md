# HMK Atlas – PATCH v94.056: vícebodové měření trasy

**Základ:** aplikace s již instalovaným patchem v94.055. Patch je změnový, není to kompletní aplikace.
**Rozsah:** pouze Atlas; bez změn cestování, postav, kampaní, HMK boje, inventáře či cloudového úložiště.

## Obsah a instalace
Rozbalit do kořene GitHub repozitáře, zachovat cestu `src/ui/` a nahradit:

- `index.html` – označení verze, nové cache-busting hodnoty pro CSS a app.js.
- `app.js` – pouze aktualizovaný import Atlasu a zobrazení verze 94.056.
- `atlas.css` – styl vícebodové spojnice, popisků, značek a pravého seznamu úseků.
- `src/ui/atlas-viewer.js` – měření libovolného počtu bodů.

**Mapová data nemažte a znovu nenahrávejte:** `assets/atlas/harn-I4-L7.webp`, `harn-map-key.webp`, `k5-detail-legend.webp`, `k5-detail-map.pdf` se nemění. K5 nadále používá originální PDF přes PDF.js.

## Použití
1. V pravém panelu **Nástroje mapy** stisknout **Zapnout měření**.
2. Postupně klikat na mapu: **A → B → C → D → …**. Libovolný počet navazujících bodů.
3. Na každé úsečce se průběžně zobrazí její délka v m nebo km; vpravo je seznam všech úseků a součet v m, km a hârnických ligách.
4. **Pozastavit měření** zachová body a umožní opět běžně používat sektory. **Pokračovat v měření** přidává další body k původní trase (nenuluje ji).
5. **Odebrat poslední bod**, **Nové měření** a **Odstranit body** slouží k opravě či restartu trasy.
6. Kolečko myši, tažení mapy a dynamické grafické měřítko fungují jako předtím. Body a popisky se kreslí v obrazovkových souřadnicích odvozených od mapových, aby zůstaly čitelné a při zoomu přesně ukotvené. Čísla vzdáleností se přitom nemění.
7. Každá mapa uchovává svou dočasnou trasu odděleně. Vše se vymaže při obnovení celé stránky; nic se nezapisuje do kampaně.

## Převod lig a ověření původních měřítek
- **Přehledová mapa**: originální nápis doslova `One Hex (1cm) = 5 Hârnic Leagues or approx. 20km or 12.5 miles`. Při 300 DPI je 1 cm = 118,110236 px, tedy 5,9055118 px/km.
- **K5.pdf**: přímo na legendě je grafická lišta **LEAGUES 0 1 2 3 4 5**. Její délka cca 141,28 PDF bodu a mapový výřez je do souřadnic Atlasu promítnut v poměru 400/72 px/bod. Proto 5 lig = cca 784,89 mapových px a 1 km = cca 39,2444 px.
- Použitý převod **1 hârnická liga ≈ 4 km** je shodný pro obě mapy, liší se jen měřítko mapových podkladů. Z výslovně přibližných převodů v originálech plyne také přibližná přesnost měření.
- Každý úsek je eukleidovská vzdálenost mezi dvěma po sobě jdoucími body; výsledkem je součet úseků, nikoli vzdálenost prvního a posledního bodu. Nepřihlíží se k převýšení, zakřivení skutečných cest ani zeměpisné projekci.

## Kontrola
- JavaScript: `node --check` pro `app.js` a `atlas-viewer.js` bez chyby.
- Samostatná výpočetní kontrola obou měřítek: tři úseky po 5 ligách vrací 20 + 20 + 20 = 60 km na obou mapách.
- Izolované prohlížečové ověření s CSS aplikace: více bodů, segmenty a výsledky, zachování délky po zoomu/posunu, odebrání bodu, pauza/pokračování, nový začátek.
- Otevření K5 a měření v K5 v izolovaném prohlížeči ověřeno s **mockem vykreslování PDF**. Skutečný externí PDF.js a plné načtení K5 v cílovém webu nyní nebyly znovu ověřeny; PDF renderovací větev se tímto patchem nemění.
