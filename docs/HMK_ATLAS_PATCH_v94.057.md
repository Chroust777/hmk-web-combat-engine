# HMK Atlas – PATCH v94.057: měření zapnout / ukončit

**Základ:** aplikace s nainstalovaným patchem v94.056. Změnový patch, ne celý ZIP aplikace.

## Změny

- V pravém panelu měření je dvoustavové tlačítko **Zapnout měření** / **Ukončit měření**. Pozastavit/pokračovat se již nepoužívá.
- Z panelu odstraněny požadované věty: „Součet přímých úseků mezi po sobě označenými body; nikoliv automatické sledování silnice. Zoom výsledek nemění.“ a „Zapněte měření a označte první bod A.“
- Zachována pouze stručná definice jednotky: 1 hârnická liga ≈ 4 km.
- Při **každé změně mapy mezi přehledem a K5** se aktivní měření VYPNE na obou mapách. Trasy se nemažou: ponechávají se viditelné pro pozdější prohlížení a ruční odstranění.
- Ovládání vícebodové trasy, její popisky, kalibrace obou map, PDF.js i zoom se nemění.

## Instalace
Rozbalit do kořene GitHub repozitáře, přepsat pouze:

- `index.html` (nové verze odkazů pro cache prohlížeče)
- `app.js` (pouze přepnutí verze importu Atlasu)
- `src/ui/atlas-viewer.js` (ovládání měření a reset jeho aktivního stavu při přechodu)

**Neodstraňovat** mapové podklady ani `atlas.css`; tyto soubory se tímto patchem nemění.

## Poznámky
- Při vypnutí měření zůstanou body a výsledky v paměti té mapy; uživatel je může smazat nebo vytvořit novou trasu.
- Pokud je měření právě zapnuté na přehledové mapě, běžné klikání slouží k přidávání bodů, ne k otevření sektoru. K otevření detailu myší nejprve klikněte **Ukončit měření**. Přechod vždy zruší aktivní režim na obou mapách.
- Funkce Atlasu stále nemají žádný přístup ke kalendáři, cestování ani herním datům.
