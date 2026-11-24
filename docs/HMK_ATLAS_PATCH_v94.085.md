# HMK Keeper’s Ledger v94.085 — body historie pohybu družiny

Výchozí stav: kompletní ZIP v94.077 + dodané patche v94.078 až v94.084 v pořadí. Patch je rozdílový vůči v94.084. Rozbalit do kořene repozitáře a přepsat uvedené soubory.

- Odstraněna samostatná ikonka poznámky. Kliknutí na uloženou tečku otevře popisek (pokud existuje), tužku a křížek. Tužka otevře editaci trasy a poznámku daného bodu vpravo. V editaci se poznámka otevře kliknutím přímo na tečku; tažení bod přemístí. Kliknutí na koncovou ikonku družiny funguje jako kliknutí na poslední bod. Původní ovládání samostatné značky zůstává dostupné přes tlačítko Pozice družiny na její mapě.
- Tlačítka Bod N vpravo jsou kompaktní (min-height 20 px, padding 2/6 px, font 11 px). Zobrazují se pouze poznámky a právě otevřený editor.
- Historie určuje koncovou pozici při editaci. Pokud starší uložená pozice nesouhlasí s posledním bodem, nevznikne při otevření editoru další bod na staré pozici. Původní uložené údaje se nemění až do potvrzení přes Esc. Překreslení po změně předává skutečný poslední bod rozpracované trasy přímo vykreslení ikonky. Smazání prostředního bodu spojí sousedy; smazání posledního bodu okamžitě přemístí družinu na předchozí. Jeden výchozí bod zůstává chráněn.
- Uložení polohy i historie společným stávajícím zápisem, Esc, Zpět/Znovu, tažení volné mapy a přidávání nové pozice zůstávají zachovány. Bez změny datového schématu, pravidlových modulů či synchronizace.

## Ověření

Node --check: app.js, oba moduly Atlasu — PASS.
Chromium s produkčními CSS a skutečnými moduly Atlasu v izolované stránce s paměťovým persistence adaptérem: obě mapy, běžná a záměrně nesouhlasící starší pozice. Skutečné kliknutí na koncovou ikonku i tečky, otevření poznámky bez další ikonky, kompaktní výška tlačítka <=22 px, opakované smazání koncových bodů (souřadnice DOM ikonky ověřeny přímo v pointerdown po provedení handleru a před Esc), odstranění prostředního bodu, undo/redo, přetažení bodu, pan, přidání přesunu, Esc, odmítnutí zápisu a opakování, poznámka v popupu — PASS. Regrese v94.084: navigace k družině, obousměrné zakrytí včetně měřítka a hranic, starší tahy, reset, průsvitnost a undo/redo — PASS. Bez zachycených JS výjimek.

Původní konkrétní kampaň nebyla k dispozici; reprodukována byla slabina s nesouhlasící starší pozicí, neprokázáno, že jde o jedinou příčinu hlášené závady. Vzdálený GitHub Cloud, kompletní spuštění z GitHub Pages ani externí PDF.js nebyly ověřeny. Produkční repozitář nebyl změněn.
