# HMK Atlas PATCH v94.075 – Tužka na bodech a prodlužování uložené trasy

Navazuje na **v94.074**. V ostatních herních modulech nejsou žádné funkční změny.

- Kliknutí na **tečku uložené trasy** zobrazí nyní **tužku ✎ i křížek ×**.
- **Tužka na posledním bodě** zapne úpravu stávající trasy a současně režim prodlužování. Každé další kliknutí na volné místo mapy **připojí nový úsek za poslední bod**. Popisky km/m a délka trasy se přepočítávají.
- **Tužka na jiném bodě** otevře běžnou editaci: body lze přemisťovat tažením; kliknutí na volné místo zachová původní způsob vložení vrcholu mezi nejbližší úsek.
- **Křížek** zachovává dosavadní zkracování trasy; **Odebrat celou trasu** zůstává v editoru.
- **Esc** ukončí úpravy, ale nevrací již úspěšně uložené přesuny a prodloužení. Neúspěšný cloudový zápis vrátí předchozí stav.
- Mapa K5, značky, Fog of War, měření i čas/herní pravidla beze změn.

## Instalace

Rozbalit ZIP do kořene repozitáře, přepsat `index.html`, `app.js`, `src/ui/atlas-viewer.js`, `src/ui/atlas-cartography.js` a obnovit stránku Ctrl+F5. PDF, mapové obrázky a CSS se nemění.
