# HMK Atlas – patch v94.062 – odstranění převzetí místních značek

Navazuje na v94.061. Jde pouze o zjednodušení rozhraní Atlasu.

- V pravém panelu je odstraněno tlačítko **Převzít místní značky do cloudu**, jeho nápověda a celý jednorázový převod lokálních značek.
- Odstraněny nepoužívané obslužné funkce a CSS pro tento import.
- **Cloudové značky se nadále načítají a ukládají stejným způsobem** v již existujícím JSON kampaně pod `atlasMarkers` v soukromém GitHub repozitáři.
- Neměnil se samotný cloudový modul, měření, mapy, PDF.js, typy značek, přesun ani ukládání pozice družiny.
- Dříve uložené lokální značky tímto patchem nejsou smazány ze zařízení; nebudou však automaticky převáděny do cloudu.

## Instalace

Z ZIPu přepsat `index.html`, `app.js`, `atlas.css` a `src/ui/atlas-viewer.js`; ostatní soubory zachovat. Mapy ani PDF nemažte. Potom obnovit stránku Ctrl+F5.

## Kontroly

Staticky ověřena nepřítomnost migračních prvků a volání, platné JavaScriptové moduly a zachování stávajícího připojení Atlasu k datovému adaptéru.
