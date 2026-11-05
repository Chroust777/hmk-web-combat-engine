# HMK Keeper’s Ledger — závazná projektová zásada potvrzování GM

Tento dokument zachycuje dlouhodobý požadavek zadavatele, uplatněný ve v93.737:

1. **Pouhé otevření formuláře, vybrání možnosti, ruční zapsání hodnoty nebo kliknutí na tlačítko kostky nezakládá autoritativní výsledek** a nesmí měnit kampaň, zdravotní stav, inventář ani čas.
2. **Pravidlový výsledek odhalit až po výslovné akci GM** s jasným popisem „Vyhodnotit …“ nebo „Potvrdit …“. Náhled pravidlové tabulky jako obecná nápověda k možným hodnotám smí být k dispozici, avšak nesmí se vydávat za skutečný rozhodnutý výsledek.
3. **Perzistentní změny nastávají jen za samostatnou potvrzovací hranicí.** Před zápisem validovat vstupy, příslušnost ke kampani, splatnost a idempotenci; zachovat původní hod/provenienci.
4. Po změně vstupu, ze kterého byl dříve dočasně odvozen výsledek, **zrušit dočasné vyhodnocení** a znovu vyžádat kliknutí. Nikdy nepřipojit starý Shock/Compound k nově změněnému hodu.
5. Pravidelné již dříve GM schválené automatické děje (např. spotřeba dávek při denní uzávěrce) jsou jiná kategorie: smějí se vykonat v rámci **dříve schváleného posunu času**, avšak musí mít auditovatelný, neopakovatelný doklad.
6. U neznámých či nedoložených skutečností nevyrábět náhodné hody nebo fakta. Uživatelsky pomocné vstupní odhady a kontrola rozpočtu jsou označeny jako neautoritativní a žádný z nich nesmí sám zápisem změnit kampaň.

## Testování interaktivního rozhraní

Přímé klikání do nasazeného webu GitHub Pages není v obvyklém běhu asistentovi k dispozici a **nesmí se prezentovat jako provedeno**. Pro E2E lze použít lokální/in-memory Chromium, Playwright či jiný dostupný lokální mechanismus. Když serverová adresa není přístupná z bezpečnostních důvodů, lze načíst přes `page.set_content()` produkční skripty a CSS do izolovaného Chromium; ověření se výslovně označí jako **lokální prohlížečové**, nikoliv GitHub Pages E2E. U každé změny uvést konkrétní scénáře a omezení testu.

**Rozsah tohoto pravidla:** všechny stávající a budoucí formuláře HMK; kontrolovat zvlášť i předčasně zobrazované vypočtené následky, i když zatím nic neukládají.


## Globální zásady UI od v93.738
- Je-li pravidlový krok nepřístupný (např. ještě nenastal zdravotní termín), musí být **současně** vypnuté tlačítko potvrzení, softwarové generování hodu a ruční vstup do příslušného pole. Nesmí být možné tento zámek obejít událostí click/submit.
- Po uvolnění kroku musí všechny tři prvky znovu fungovat; volitelné plánovací vstupy se nesmějí blokovat, pokud jsou potřebné pro odemknutí kroku.
- Veškeré nadpisy používají `--hmk-font-heading`, běžné texty `--hmk-font-body`. Konkrétní velikosti a řádkování jsou centrální tokeny v `styles.css`; nové komponenty mají použít tyto tokeny. Medicínské souhrny jsou menší než nadpisy.
- Edice Chronicle Spread: Skills, Fatigue, Attributes a Coins sdílejí pergamenovou paletu, nikoli samostatný tmavý formulář.
- E2E testing: nespoléhat na přímé ovládání produkční GitHub Pages; testovat lokální stránku v Chromium (případně offline bezsíťový browser bundle) a jasně uvádět hranici pokrytí.
