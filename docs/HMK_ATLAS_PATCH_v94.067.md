# HMK Atlas – patch v94.067

Základ: **v94.066**. Aktualizace pouze Atlasu. Zachovává existující mapové podklady, GitHub Cloud JSON, herní pravidla a ostatní moduly.

## Změny

1. **Vrstvy mapy:** položka „Mlha války“ odstraněna z přepínačů vrstev. Mlha se nadále ovládá v pravé sekci „Mlha války“. Historické uložené nastavení `layers.fog` zůstává v JSON pro zpětnou kompatibilitu, ale nijak již neblokuje ovládání mlhy.
2. **Historie družiny:** křížek při najetí na bod cesty zmenšen na 13 × 13 px (přibližně 30 % dřívějšího 42px ovládání). Potvrzení mazání navazující trasy zůstává.
3. **Zakreslené trasy:** u **každého úseku** se zobrazuje vzdálenost v metrech (pod 1 km) nebo v kilometrech. U všech bodů trasy jsou viditelné malé tečky včetně zalomení. Délky a spojnice se průběžně přepočítávají při kreslení a přetahování vrcholů; celková délka se přepočítává rovněž. Souřadnice a měřítka používají stávající kalibraci hlavní mapy a K5.
4. **Text na mapě:** při najetí na objekt typu Text se zobrazí pouze ovládací tužka a křížek; vyskakovací duplikát textu/poznámky již ne.
5. **Pozice družiny:** tlačítko se trvale jmenuje „Pozice družiny“. Pokud poloha již existuje, přiblíží a vycentruje na ni mapu (107 %), bez přepínání do režimu „Zrušit pozici družiny“. Pokud dosud neexistuje, umožní ji kliknutím umístit a následně uložit formulářem. Stávající možnost **přetáhnout ikonu** jinam zůstává.
6. **Priorita mapových ovládacích režimů:** při umisťování značky a měření se vypne zachytávání kliknutí starými mapovými objekty. Při umisťování a při kreslení se také správně vypíná zachytávání kliknutí již existujícími značkami (opravena chybná CSS specificita). Umožní bez blokace střídání trase/oblasti/kružnice/kresby/šipky/textu a nové značky.

## Testy

- `node --check` pro `app.js`, `src/ui/atlas-viewer.js`, `src/ui/atlas-cartography.js`.
- Izolovaný Chromium/Playwright: kreslení tříbodové trasy, viditelné 3 body a 2 segmentové popisky, přetažení prostředního bodu a nové segmentové délky.
- Reálné klikání myší: po vykreslení každého z typů Trasa, Oblast, Dosah, Kresba, Šipka a Text následné přidání značky přes existující objekt. Úspěšně ve velikosti 1540 px i 390 px.
- Pozice družiny: první uložení, opakované tlačítko přesune pohled na 107 %, opětovné umístění neodstraní ikonku.
- U textu skrytí duplicitního tooltipu; u trasy družiny 13px křížek.
- Mobilní rozložení 390 px bez horizontálního přetékání.
- Testy měly mock zdrojového mapového obrázku/PDF.js; skutečný vzdálený GitHub Cloud a načítání PDF přes CDN nebyly ověřeny. Ukládání probíhalo do izolovaného validovaného testovacího JSON, nikoli živé kampaně.

## Instalace

Na již nasazenou **v94.066** rozbalte patch do kořene GitHub Pages repozitáře a přepište:

- `index.html`
- `app.js`
- `atlas.css`
- `src/ui/atlas-viewer.js`
- `src/ui/atlas-cartography.js`

Žádné PDF ani mapové obrázky nemažte. Obnovte prohlížeč pomocí Ctrl+F5. Doporučujeme před změnami zálohu aktuálního cloudového JSON.
