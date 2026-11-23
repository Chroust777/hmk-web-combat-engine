# HMK Atlas PATCH v94.076 – Koncové body tras a neviditelné sektorové odkazy

Navazuje přímo na **v94.075**. Pouze změny Atlasu.

## Trasy
- **Prostřední bod**: tužka dovoluje přemisťovat body tažením, ale kliknutí na volné místo nepřidá žádný nový úsek ani vrchol.
- **První bod**: tužka přepne na prodlužování směrem od začátku trasy; nové kliknutí bod předřadí.
- **Poslední bod**: tužka prodlužuje trasu od posledního konce stejně jako dříve.
- Tužka na samotné spojnici otevře běžný režim přesouvání existujících bodů, bez přidávání nových.
- Křížek zkracování tras, úplné odstranění v pravém panelu, výpočet délek, přesouvání, Esc i cloudové ukládání zůstávají zachované.

## Hlavní mapa I4–L7
- Šestnáct sektorových tlačítek je pouze neviditelná klikací plocha.
- Žádné zesvětlení při najetí, hnědé orámování při výběru ani čáry mezi sektory z HTML vrstvy; žádný filtr, obrys nebo efekt po kliknutí či při zaměření.
- Kliknutí na K5 stále přejde na detail. Ostatní sektory zachovávají dosavadní informaci, že detail ještě není připojen.
- PDF K5, nástroje mlhy, uložené objekty a jiné moduly aplikace se nemění.

## Instalace
Rozbalit přes v94.075 do kořene repozitáře, přepsat `index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js` a `src/ui/atlas-cartography.js`; obnovit Ctrl+F5. Žádné mapové obrázky nebo PDF se nemění.
