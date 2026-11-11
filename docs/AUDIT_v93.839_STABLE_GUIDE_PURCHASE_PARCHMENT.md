# HMK Keeper’s Ledger — v93.839: Stáj, katalog výstroje a kompaktní převody

**Výchozí stav:** kontrolovaný `HMK_v93.838_FULL.zip`.  **Pravidlový referenční základ:** HMK v1.2, tištěná strana 122; pravidlová kompatibilita je převzata z `src/integration/hmk-stable-hub-574.js`.  **Změněné zdroje:** `app.js`, `styles.css`, `index.html`, synchronizovaný `hmk-app.bundle.js`.

## Požadavek a reprodukce

Původní přehled 16 zvířat v levé straně Stáje měl jen textové sloupce, bez interaktivního pořízení, a používal průsvitné obdélníkové pozadí, které neodpovídalo konzistentní pergamenové knize. Pravá stránka zobrazovala každou položku výstroje v širokém řádku, formulář „Kam předat“ zabíral zbytečně mnoho prostoru.

## Změny ve v93.839

1. **Skutečný pergamen**: přehled pod anatomickými zónami používá již existující `assets/ui/book/parchment_dynamic_texture.png`, zlatohnědé dělení, přiměřenou typografii a adaptivní tabulku. Ovládací tlačítka jsou na levé stránce viditelná bez vodorovného posunu. Tabulka obsahuje všech 16 katalogových druhů z HMK 122. Po potvrzeném nákupu zůstává panel otevřený.
2. **Dva neukládající seznamy v každém řádku**: „Využití / tah“ vybírá kategorii aplikací podporované výstroje a „Vhodná výstroj“ nabízí pouze katalogové položky kompatibilní s daným druhem. Seznamy neukládají žádný údaj, nehází kostkami, neposouvají čas a neprovádějí nákup. Po přepnutí se mění jen volby, pomocný popisek a zobrazená cena.
3. **Sémantické popisky**: název zvířete (konkrétní funkce, hranice automatiky, katalogová cena, výcvik), zvolené vybavení (účel, cena, hmotnost a způsob předání) a nápověda nad jednotlivými option mají `data-hmk-help` a `title`. Neuvádí se neprokázané mechaniky jako pravidla.
4. **`Koupit` / `Vzít zdarma` používají původní handler `data-library-form="item"`** — stejné katalogové ID `hmk:stable-gear:...`, stejné ověření aktuální kampaně a postavy, ceny, přítomnosti peněz, potvrzovací dialog placeného nákupu, fyzický inventární doklad a záznam do `campaignCashAccounts.*.purchases`. Bezplatné převzetí zachovává inventární identitu a zapisuje způsob pořízení, bez fikce hotovosti. Předmět je **nejprve v inventáři postavy**, stejně jako v Knihovně. **Nenasadí se automaticky**: vyžaduje zvláštní potvrzení ve Stáji, které provede původní transakci a přepočet ENC, PF a kapacity.
5. **Bezpečnost**: submitter určuje `buy` / `free`, ne formulářový přepínač. Handler vynucuje platného majitele Stáje, shodu vybrané katalogové položky s druhem i kontextovým účelem, kompatibilitu a ochranu před neoprávněným účtováním. U psa/sokola bez kompatibilní výstroje jsou tlačítka nedostupná. **Výjimka — slon**: Knihovna má běžnou hmotnost/cenu předmětu, ale speciální sloní výstroj vyžaduje násobek ×5 a nemůže být bezpečně automaticky nasazena; tuto větev tabulka transparentně blokuje a odkazuje na již existující speciální nákup přímo v detailu zvířete. Nezařazujeme fiktivní katalogovou identitu.
6. **Kompaktní tabulky**: u postrojů, vozidel a fyzického nákladu jsou řádky nízké, původní zdroj se zachovává jako plný tooltip a v tabulce zkracuje, doklad je dál uložen beze změny. Seznam „Kam předat“ a jediné tlačítko „Přesunout“ jsou vedle sebe na stejném řádku; samotná volba cíle nic nezapisuje. Původní `stableGearMove93838` a jeho atomické účetní, inventární, kapacitní a pravidlové kontroly se **neměnily**.

## Chromium — ověřený průchod

`tools/browser_93839_stable_catalog.py` spouští reálné ovládací prvky proti sestavenému `hmk-app.bundle.js`, syntetické postavě s **výchozí doloženou hotovostí 300 d** a dvěma skutečnými zvířaty získanými klikáním v Knihovně. Neprovede žádné smyšlené hody. Výsledek **PASS 38** kontrol:

- 16 druhů, všechny dvojice seznamů, všechna tlačítka, tooltipy, pergamenová cesta, zablokovaná nevhodná výstroj psů;
- opakovaná změna účelu a vybavení **bez zápisu**;
- placený nákup originálních `Saddle bags, 15 lb`: přímý odpis katalogové ceny, správná inventární identita, trvalý peněžní doklad, žádný automatický převod na zvíře a žádný posun kalendáře;
- bezplatné převzetí `Harness, ox`: bez peněžního výdaje a s reálným novým inventárním předmětem;
- skutečné kliknutí „Nasadit vlastněnou výstroj“, potvrzený převod vola na koně a odpovídající změny hmotnosti; `Přesunout` v jednom řádku se seznamem; kontrola zachování ID;
- rekonstruování stavu z uloženého JSON s totožnými penězi, vlastními kusy výstroje a zvířaty;
- žádná chyba JavaScriptu v Chromiu.

`tools/browser_93839_transfer_regression.py`: **PASS 44** původních interaktivních kontrol starší historické výstroje a převodů po přizpůsobení testu nové podobě katalogové tabulky, **bez změny testované obchodní nebo stájové logiky**.

## Zdrojové regrese

| Scénář | Stav |
|---|---|
| Nová matice katalogu, ceny, povolené druhy a UI kontrakt | **PASS 61** |
| Původní fyzické převody, doklady, integrita | **PASS 29** |
| Smíšená jízda + globální počasí | **PASS 20** |
| Samostatný Foraging | **PASS 70** |
| Foraging CF matematika | **PASS 48** |
| Kompletní Foraging tabulka | **PASS 1539** |
| Shelter + Tracking kontrakt | **PASS 12** |
| Tracking změny členů a svědectví | **PASS 15** |
| Inventární dispozice | **PASS 63** |
| Inventární batch a truhla/prodej | **PASS** |
| Browser samostatná kupní/tabulková cesta | **PASS 38** |
| Browser starší přesuny | **PASS 44** |
| Otevření lokální HTTP adresy / skutečný HTTP reload | **BLOCKED** — `net::ERR_BLOCKED_BY_ADMINISTRATOR` |

**Nevydáváme za otestované:** reálné načtení na GitHub Pages, dálková synchronizace, fyzické načtení pergamenového assetu ve skutečné HTTP stránce, úplná matice všech typů vybavení na všech druzích, dlouhodobé kalendářní a finanční scénáře v produkční kampani. V testovacím Chromiu je CSS pravidlo na skutečný pergamenový soubor a soubor je součástí ZIP; izolovaná `set_content` stránka nemůže spolehlivě načíst externí relativní asset.

## Otevřené předchozí větve

Foraging Survival CF → úplné Equipment/Accident/Complication, Tracking CF → povinný Bearing → nový Pochod a historicky nevyřešená zdravotní regrese počasí zůstávají **NEOVĚŘENO/BLOCKED**; změna v93.839 se jich nepokouší předčasně uzavírat.

**Trvalý standard** `docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md` byl zachován beze změny.
