# HMK Atlas v94.071 – Výběr kliknutím, skupiny značek, Enter pro mlhu

Navazuje na v94.070. Změny pouze v Atlasu.

- Tužka a křížek u značky se zobrazí až po kliknutí na značku, ne při pouhém najetí. Esc výběr zavře.
- Kreslené objekty zobrazují najetím jen poznámku (kde existuje); kliknutím se zobrazí nabídka úprav a odstranění.
- Body historie pohybu družiny po kliknutí mírně vyrostou a nabídnou malé mazací ×. Samotný hover je nemaže a neukazuje křížek.
- Rozbalovací seznam značek je rozdělený do skupin Vesnice, Tábor, Nález, Nebezpečí a Jiné. Kliknutí na značku vystředí mapu na 107 %.
- Nadpisy pravých sekcí mají stejné 12px písmo jako tlačítko Pozice družiny.
- Potvrzení hesla Fog of War dál funguje tlačítkem Odemknout; formulář umožňuje také Enter (HTML submit již existoval, ověřeno v prohlížeči).

Instalace: nahradit index.html, app.js, atlas.css, src/ui/atlas-viewer.js, src/ui/atlas-cartography.js. Nemazat obrazové podklady ani PDF. Před změnami doporučujeme zálohu cloudové kampaně.
