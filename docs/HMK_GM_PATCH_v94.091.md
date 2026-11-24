# HMK Keeper’s Ledger v94.091 – inventář a historie družiny v režimu hráče

Výchozí stav: původní kompletní ZIP v94.077 a aplikované patche v94.078–v94.090 v pořadí. Pouze změněné soubory jsou součástí tohoto patche.

- Arsenal & Gear: celá sekce Předmět z knihovny je označena stávajícím data-hmk-gm-only. Inventář, nákup a předávání předmětů jsou zachovány.
- Atlas: běžný hráč nemůže přesouvat ikonku družiny ani body její historie, přidávat body nebo mazat trasu. Křížky jsou skryté; tužka umožňuje editovat poznámku. Esc ukládá pouze text do historie, nikoli změnu souřadnic nebo značky. Smazat text a undo/redo poznámek zůstávají dostupné.
- Undo/redo z předchozí GM relace nesmí v režimu hráče změnit geometrii historie ani polohu družiny. Při odhlášení během rozpracované změny geometrie se obnoví uložená geometrie; rozpracované poznámky k existujícím bodům se zachovají k uložení přes Esc. Nové neuložené body a jejich poznámky se zruší. Přihlášení nemění stav kampaně. GM, který se přihlásí během rozepsané hráčské poznámky, ji dokončí přes Esc před dalším pohybem.
- Stávající pohyb, zkrácení a editace trasy GM, navigace, běžné měření a zakrytí mapy jsou beze změny. Žádná změna formátu herního JSONu ani pravidlových modulů.

## Ověření

- Node --check: app.js a oba moduly Atlasu PASS.
- Chromium: reálné klikání a přetahování na I4–L7 i K5 v izolovaném testovacím úložišti; zámek geometrie hráče, viditelnost tužky/křížků, uložení poznámky včetně koncového bodu, undo/redo, přihlášení/odhlášení, obnovení uložené geometrie, opakovaný pohyb GM, zkrácení a okamžitý přesun ikonky, posouvání mapy, odmítnutý zápis GM – PASS.
- Chromium: skutečné šablony aplikace v testovacím bundlu, skrytí celého panelu Arsenal & Gear, přepínání role a zachování dat, přenos předmětu mezi PC v režimu hráče, předchozí omezení v94.090, obě mapy a regrese obousměrné mlhy – PASS. Bez zaznamenaných JS výjimek.
- Testy používají izolované úložiště; vzdálený GitHub Pages, Cloud a PDF.js nebyly ověřeny. Nejde o serverové zabezpečení, pouze o stávající lokální režim rozhraní.
