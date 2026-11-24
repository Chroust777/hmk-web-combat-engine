# HMK v94.082 – Uložení jazyka kroniky

Základ: původní v94.077 s navazujícími patche v94.078–v94.081. Předchozí soubory ověřeny proti ZIP v94.081.

- Přímá obsluha tlačítka Uložit jazyk kroniky v Notebooku (společný formulář také ve Stáji).
- Po potvrzeném místním zápisu zobrazí stav „Jazyk kroniky uložen.“; shodné hodnoty nevyvolají další zápis.
- Po odmítnutí zápisu zůstávají zadané hodnoty ve formuláři, včetně rodu a skloňování; opakování je možné až po odstranění příčiny.
- Zachována původní transakce mutate/save a všechny ochrany CAS / Cloud / cestovní epizody.

Testy: v izolované testovací kampani s dvěma postavami skutečné Chromium, aktuální zdrojové moduly převedené do dočasného testovacího bundle (481 modulů), skutečná navigace postav, opakované uložení, beze změny, oddělení obou profilů, odmítnutí místního zápisu a opakování, vymazání hodnot. Herní čas, inventář, deník a data Atlasu nezměněny. Syntaxe app.js ověřena.

Limit: původní popsanou závadu se bez konkrétního stavu uživatelské kampaně nepodařilo reprodukovat. Lokální testovací úložiště v paměti, vzdálený GitHub Cloud neověřen. Produkční ESM načtení přes HTTP blokováno prostředím. Žádný zásah do produkce.

Instalace: překopírovat app.js, index.html a dokumentaci do kořene aplikace v94.081; Ctrl+F5 po publikování.
