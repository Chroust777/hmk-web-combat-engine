# HMK Keeper’s Ledger v93.952 · cestování, nehody a Cold Water Shock

Živé testy 19. listopadu 2026 proběhly v izolovaných kampaních v Cloud Browseru. Každý níže uvedený hod prošel rozhraním aplikace. Pravidlové kontroly vycházejí z přiloženého HMK v1.2, zejména ze stran 141, 145–149, 169–181, 185 a 354–357.

## Smíšená doprava v jedné skupině

| Sestava | Kroky v prohlížeči | Výsledek |
| --- | --- | --- |
| Kára, samostatný jezdec, samostatný pěší vodič a pacient | Pochod. Pepa průvodce, Michal přepravovaný, Espar ve skupině. Zaškrtnout Hatatitlu, Vraníka a Kropenku. Zvolit káru, přiřadit Hatatitlu ke spřežení a potvrdit fyzické uspořádání. | Kára s pacientem se doloží. Pole pro Vraníkova jezdce i vodiče Kropenky jsou skrytá. Samotné zaškrtnutí zvířat roli neuloží. Scénář kombinované dopravy zůstává zablokovaný. |
| Vůz či kára s doprovodným jezdcem | Přepnout mezi kolovým vozidlem a jízdou na zvířeti. | Kolový režim neposkytuje přiřazení jezdce. Jezdecký režim sám neudrží doklad o kolovém vozidle a odmítá použít další zvíře s připojeným vozidlem v režimu vedeného zvířete. |
| Dva samostatní jezdci | Jízda na zvířeti. Přidat vybavené koně Vraníka a Ryšáka. Pro Vraníka vybrat jízdní zvíře a jednoho z obou schopných účastníků. | Druhý kůň nabízí jen pěšího vodiče. Druhé sedlo přímo v témže řádku aplikace nepřidělí. |

HMK str. 141 dovoluje využít více způsobů dopravy ve stejné skupině. Rozhoduje nejpomalejší způsob dopravy a hlavní Drover v kombinovaném režimu používá nižší z Riding a Animalcraft. K uzavření zbývá programová podpora samostatných jezdeckých dvojic, skutečné obsazení vozu, oddělené průkazy váhy a výstroje, tempo a uložení s obnovou. Hodnota 578,6 / 2 000 lb pozorovaná v režimu káry dokládá pouze jeho stávající výpočet nákladu. Neprokazuje správné rozdělení váhy mezi káru a zamýšleného jezdce.

## Cold Water Shock a Coma

Původní chyba: vyberte ledovou vodu, potvrďte 3d6 a Endurance d100 95 u postavy s EML pod 95. Vznikne UNC. Po deseti minutách otevřete Shock Reroll a potvrďte d100 95 proti EML 31. Aplikace dříve vyžadovala anatomickou ránu a nedovolila zadat d10 pro Coma, ačkoli původem bylo doložené ponoření.

Oprava: tři d6 a Endurance d100 mají jeden červený aktivní vstup v daném pořadí. Generování samo nepotvrzuje hodnotu. Po potvrzeném UNC + CF bez anatomické rány se otevře červené pole pro počáteční Coma HR podle rozhodnutí GM a následně d10. Při skutečné ráně se stále používá anatomický výpočet. HMK str. 179 odvozuje HR od vyvolávající rány. Pro samotné ponoření tento anatomický vstup chybí. Výslovné rozhodnutí GM navazuje na mechanismus, který aplikace již používá u samostatných souběžných Cold Water Courses.

### Živá vstupní matice

| Výsledek Endurance | Chladná, základ SHK 5 | Studená, základ SHK 6 | Ledová, základ SHK 7 |
| --- | --- | --- | --- |
| CS, d100 5 | NONE | NONE | NONE |
| S, d100 9 | NONE | NONE | STN |
| F, d100 98 | NONE | STN | INC |
| CF, d100 95 | STN | INC | UNC |

- UNC bylo splatné od 08:10. Při CF 95, HR 4 a d10 1 vznikly dvě nezávislé povinnosti. V 12:10 Extended Shock Course CS 5 ukončil Extended Shock. Coma zůstala do dne 2 v 08:10. Coma Course CS 5 obnovil stav NONE. Stav se zachoval po obnovení stránky.
- Při druhém průchodu s počátečním HR 5 pokračovala Coma po F 98 na HR 4. Teprve potvrzení F otevřelo další d10. Po d10 1 Kalendář ukázal nový termín den 3 v 08:10.
- „Kontrola“ u Shock Reroll i Coma přivedla fokus do viditelného červeného pole. U prvního d6 byl ověřen generátor i samostatné potvrzení. Pokračující Coma po F je doložená do vytvoření termínu. Druhý Course této varianty proběhl v pravidlovém regresním testu.
- Zbývá živá matice dalších Shock Reroll výsledků pro každou teplotu i všechny kombinace s dřívějším Shockem, Cold Exposure a paralelními zdravotními povinnostmi.

## Zvířecí nehody a léčení

Původní chyba: po zranění ze Survival Accident zvolte v kalendáři „Kontrola“ u Treatment se stále otevřeným Shockem. Kalendář otevřel správného koně, ale Stáj ukázala jen zdravotní stav. Chyběl vstup do povinného Shock Reroll. Oprava zpřístupňuje ze Stáje původní zdravotní formuláře konkrétního zvířete. Časovaný zákrok se zobrazuje s léčitelem a přesným koncem. Kalendář řídí splatné hody podle skutečné rány.

| Větev | Živý průchod |
| --- | --- |
| Agility S / CS | Havran, d100 49 a 5 ve dvou oddělených kampaních. Impact zůstal uzamčený a kalendář nezaložil povinnost k neexistující ráně. |
| Agility CF | Hatatitla. Survival 95, Hazard d10 5, minuta 8 z 20. Agility 95 otevřelo po řadě Impact 6, ZD 4, LD 2 a Shock 5. Vznikla S3 Blunt na hlavě. Kalendář otevřel červené pole zvířecího Shock Reroll. Reroll 5 → NONE, Injury Morale, Pepa provedl SET 11:36–11:51. Ošetření dokončeno z původního hodu. Kalendář otevřel Healing Roll zvířete ve dni 6 v 11:36. Healing CF infekci nevyvolalo, protože potvrzené Treatment CS ji pro tuto ránu pravidlově vylučovalo. |
| Agility F | Havran, d100 98. Impact byl červený, ZD a LD zůstaly zamčené. Vznikla S2 Blunt na hlavě, Shock a Morale se řešily samostatně. Pepa provedl patnáctiminutové SET s výsledkem CF. Healing CF ve dni 6 v 08:20 založil infekci. První Infection Course otevřel správné zvíře, ránu a červený d100. Hody 95, 98, 5, 5, 5 uzavřely infekci a obnovily Injury Healing Roll. |

Ověřeny jsou dvě varianty koně a všechny čtyři výsledky Agility v těchto scénářích. Zbývá úplné živé křížení druhů a anatomií, úvazků a přepravy, opakovaných ran a Compound, krvácení, Extended Shock a Coma u zvířat. Pravidlové testy samostatně pokryly 79 kontrol anatomie a dopravy pro 16 druhů a 110 kontrol koní a volů.

## Dvě souběžné skupiny

Obě skupiny začínaly v 08:00 a měly vlastní Survival i END. F odpovídalo d100 98 a CF odpovídalo 95. Po Skill Testu byl uložen původní výsledek bez dobrovolného Fate. Výzva otevřela přesné červené pole END a samotné zadání čísla neposunulo postup. U Complication F/CF po Climbing bylo nutné potvrdit přesný okamžik překážky. V obou skupinách se použilo stejné potvrzené počasí pro Tashal.

| Survival 1 | Survival 2 | Návaznost u CF | Uložení |
| --- | --- | --- | --- |
| F | F | Bez CF hazardu | Jeden posun 08:00 → 08:20 |
| F | CF | Complication d10 9, Climbing CF ve skupině 2 | Jeden posun 08:00 → 08:20 |
| CF | F | Complication d10 9, Climbing F ve skupině 1 | Jeden posun 08:00 → 08:20 |
| CF | CF | Skupina 1 Climbing F, skupina 2 Climbing CF | Jeden posun 08:00 → 08:20 |

Připravený výsledek první skupiny neposunul čas. Matice výše pokrývá pořadí F/CF pro dva Pochody a uvedenou komplikaci. Samostatně zůstává křížení různých činností, počasí, Equipment, Accident, Direction a případů se současnými zdravotními termíny.

## Regrese a instalace

Prošlo dalších 7 921 pravidlových variant cestování, 157 kontrol společného intervalu, 49 kontrol více infekcí a cílené kontroly původního anatomického Coma i nového, doloženého Cold Water Coma bez rány. Starší test skupin v93.806 obsahuje očekávání, že vícečlenný stacionární Foraging má být odmítnut. To je mimo aktuální podporovaný model, který skupinový Foraging záměrně povoluje. Touto sérií nebyla doložena aktuální regresní garance všech skupinových činností.

Patch je kumulativní od verze v93.938. Rozbalte jej do kořene projektu se zachováním cest. Proti v93.951 se mění `app.js`, `index.html`, `src/integration/hmk-confirmed-noncombat-chains-93918.js` a `src/integration/persistent-combat-state.js`. Testovací kampaně v balíku nejsou. Veřejná instalace na GitHub Pages nebyla změněna.
