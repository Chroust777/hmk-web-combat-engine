# HMK Atlas · patch v94.055 – měření vzdáleností

**Základ:** nejnovější nasazený patch v94.054 (K5 z vektorového PDF).  
**Rozsah:** Atlas výhradně; nedotčena pravidla HMK, cestování, kampaně, postavy ani cloud.

## Instalace
Přepsat následující čtyři soubory (zachovat podsložku `src/ui`):

- `index.html`
- `app.js`
- `atlas.css`
- `src/ui/atlas-viewer.js`

Ostatní mapové soubory z v94.054 ponechat: zejména `assets/atlas/k5-detail-map.pdf`, `assets/atlas/k5-detail-legend.webp`, `assets/atlas/harn-I4-L7.webp`, `assets/atlas/harn-map-key.webp`. V tomto patchi nejsou duplicitní kopie.

## Funkce
- Třetí sloupec **Nástroje mapy** napravo od mapy. Na úzkých obrazovkách přejde pod mapu, aby zůstala čitelná.
- **Zapnout měření** → kliknout A → kliknout B. Výsledky: přímá vzdálenost v km, m a hârnických ligách; 1 liga = 4 km.
- Oba body a spojnice jsou v samostatné vrstvě nad mapou a při zoomu/pohybování zůstávají na původních mapových pozicích. Posun tažením zůstává aktivní i během měření.
- **Nové měření** vymaže body a aktivuje znovu volbu A, B. **Odstranit body** smaže body i spojnici. **Ukončit měření** vypne režim, body ponechá do manuálního vymazání (další zapnutí po dokončení zahájí nové měření).
- Každá mapa má svou vlastní dočasnou dvojici bodů (přepínání mezi I4–L7 a K5 ji nemaže). Nenahrává se nic do kampaně ani na cloud, po obnovení stránky se body vymažou.
- Grafická stupnice se přepočítává se zoomem a nezkresluje délku případným CSS omezením.
- Měřená vzdálenost je přímá, nereflektuje výšku terénu, trasy ani skutečnou dobu cesty.

## Kalibrace
- **K5:** původní grafická stupnice 0–5 hârnických lig = cca 20 km. V originálním PDF je lišta přibližně 141,28 PDF bodu (mapa je v Atlasu vykreslena v 400/72 obrazových bodů na PDF bod).
- **Hlavní mapa:** z původního měřítka 1 hex = 5 lig = cca 20 km; pixelová velikost hexu při originálním výřezu 300 DPI.

## Nezahrnuje
Vlastní značky, textové poznámky ani měření vícebodové trasy – pro ně je připraven prostor napravo, ale dosud se nespouštějí.
