# HMK Keeper’s Ledger v94.093 – jediný kotevní bod textu

Základ: v94.077 a patche v94.078–v94.092; poslední obsah všech sedmi dotčených souborů ověřen proti řetězci ZIPů.

- Text na mapě už při editaci neumožňuje přidávání vrcholů kliknutím do mapy. Vložení nového textu zůstává jednorázové.
- Zobrazuje se pouze první kotevní bod. Tažením lze text přesunout. U dříve uložených textů s nadbytečnými body se tyto body odstraní až při úspěšném uložení popisu nebo přesunu textu; prosté otevření editace nic nezapisuje. Žádná plošná migrace.
- Upřesněna nápověda editace textu. Žádné změny dalších typů objektů, rolí, herních mechanik nebo formátu JSON.

## Testy
Chromium, produkční CSS, izolovaný paměťový adaptér: na I4–L7 i K5 reprodukována chyba v94.092 (dva kliky -> tři uložené body a tři kolečka). Po opravě: jednorázové vložení, opakované kliky mimo text bez nového bodu, jediný viditelný kotevní bod, přesun, editace názvu, odstranění starých nadbytečných bodů při uložení, běžné vytváření trasy a oblasti. PASS. Regrese trvalého zakrytí hráče, přepínání rolí, průsvitnosti GM a obousměrných tahů: PASS. Bez zachycených JS výjimek. Node kontrola syntaxe všech tří JS souborů: PASS.

Neověřen živý GitHub Cloud, GitHub Pages, vzdálené PDF.js ani kompletní start aplikace.

Instalace: rozbalit do kořene repozitáře v94.092, přepsat uvedené soubory, publikovat a obnovit Ctrl+F5.
