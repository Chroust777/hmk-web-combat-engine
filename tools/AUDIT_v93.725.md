# HMK Web Combat Engine – audit v93.725

## Základ

- Výchozí verze: **v93.724**, sestavená ze skutečného hlavního ZIPu a rozdílových oprav.
- Verze změn: **v93.725**.
- Rozsah: odstranění plošných blokací nezávislých úkonů při aktivní Combat Initiative a sjednocení automatické ochrany AV ve zbývající aktivní bestiářové Frost Sequence.
- Pravidlová autorita: HMK v1.2. U potvrzených bojových rozhodnutí zůstává autoritativní pořadí a neměnnost historie.

## Změny Combatu

Původní podmínka `if(combatInitiativeSequence)` blokovala některé zápisy *všech* postav kampaně. Nová pomocná funkce `combatActorLocked93725(...ids)` kontroluje skutečné účastníky aktivní sekvence z paměti i z trvalého `combatRuntime.sequence.order`.

Úpravy se vztahují zejména na:

- inventář, výbavu, ruce, vrstvení, truhly, zásoby a převody; u transakcí se dvěma stranami se kontroluje také příjemce;
- nákup/převzetí z knihovny a přímé úpravy postav, které se střetnutí neúčastní;
- některé nezávislé zdravotní/Skill Test následky včetně Fall, Swimming, Frostbite, Cold Shock, Poison a Disease;
- související bylinné lektvary, práci s nádobami a lahvičkami, Talisman Bestowal, Trance, Reembodiment a některá vyhodnocení Special SR.

Při transakčním zápisu se navíc znovu ověřuje skutečný účastník. **Neodstraňovala se** ochrana bojovníků, kontrola pořadí tahů `assertScheduledHitCanCommit`, kontrola neměnnosti bojového důkazu `assertLegacyMutationDoesNotChangeCombat` ani append-only registr `assertGlobalActionLedgerAppendOnly`.

Přímé kontroly `if(combatInitiativeSequence)` klesly v `app.js` z 87 na 45. Zbývající kontroly zahrnují sdílený bojový čas, sestavu účastníků, řízené bojové tahy, import celých dat a některé specializované nezmapované postupy. **Nelze tedy tvrdit, že byly odstraněny všechny možná zbytečné blokace.** Část je oprávněnou ochranou, část potřebuje další reálný prohlížečový scénář.

## Automatické AV – audit aktivních cest

| Cesta | Zdroj AV | Závěr |
|---|---|---|
| Travel/Weather Hazard během epizody | `calculateWeatherAreaAV` z nasazené výstroje | Automatické, opakovaně testováno |
| Samostatný Weather Hazard z Kalendáře | Stejný výpočet, opět kontrolován při zápisu | Automatické |
| Standardní Combat hit, lokalizovaný zásah | `resolveLiveCombatArmour` – skutečné nasazené články a konkrétní lokace | Automatické, pokud jsou zdroje ověřené |
| Guided Area Attack / běžné Frostbite | Existující výpočty lokací / vrchních vrstev | Napojení existuje; není úplné E2E všech druhů zásahu |
| Bestiář – aktivní Frost Sequence 573 | Nový `resolveBestiaryFrostAV93725`, tištěná přirozená Frost AV z profilu tvora a kontrola skutečně oblečené výstroje | Ruční `locationAV`/`magicAreaAV` odstraněno |

### Významná výjimka: zvířecí zbroj

HMK kalkulace lidské výstroje používá ověřené lokace z p.118; současný katalog **nedokládá automatické mapování této výstroje na zvířecí anatomii a–m**. Má-li zvíře skutečně nasazený kus výstroje bez tohoto mapování, nová větev výslovně vyžádá doplnění pravidlového podkladu a **nevymyslí AV ani nepovolí podvrženou ruční hodnotu**. Zvíře bez takové výstroje používá svou tištěnou přirozenou AV. To není úplná implementace všech možných zvířecích brnění.

`gearAV` z bedrollu, pláště či úkrytu není totožná s anatomickou `Area AV` ze zbroje; její situační použití se stále určuje z faktických podmínek GM. Není součástí automatizace anatomického AV.

## Výsledky testů na výsledném bundle

- 6 souběhových regresních sad: **1009 / 1009 PASS**.
- Combat write-boundary: **127 / 127 PASS** (24 pořadí nezávislých zápisů).
- Paralelní Cold/Extended/Coma: **56 / 56 PASS**.
- AV z reálně nasazené výstroje: **10 / 10 PASS**.
- Předchozí cílený UI/source audit: **17 / 17 PASS** (opraveno pouze zastaralé očekávání čísla verze).
- Nový test AV a účastnických blokací: **77 / 77 PASS**.
- Celkem **1296 průchozích asercí v 11 testovacích sadách**. Syntaxe `app.js` a produkčního bundlu i sestavení: PASS.

Testy zahrnují případy nepodvrhnutelného AV, zavedení a uchování zdrojů Shocku, různá pořadí nezávislých akcí, ochranu inventáře účastníka a odmítnutí duplicit. **Nejde o 1296 nezávislých E2E scénářů.**

## Neověřeno / otevřeno

1. **Chromium E2E** se nepodařilo spustit: testovací prohlížeč zablokoval přístup ke stránce ještě před načtením aplikace. Neoznačujeme jej jako PASS.
2. Kompletní aktivní Combat UI (Initiative, Interrupt, Shock Followup, řízené tahy a všechny specializované zápisové cesty) nebylo možné proklikat a definitivně certifikovat jako bezblokovací.
3. Správnost výpočtu AV pro **zvířata s individuálně oblečenou zbrojí** vyžaduje ověřené mapování lokací. Nezkoušeno jako automaticky vypočtené.
4. Skutečná GitHub Cloud synchronizace a řešení konfliktů mezi zařízeními neověřena.
5. Staré historické testy s neplatnými cestami či zastaralým DOM selektorem nejsou důkazem nové produkční chyby, ale nemají být přeznačeny na PASS bez přepracování.

## Nasazení

Rozdílový PATCH použít výhradně proti v93.724. Obsahuje pouze skutečně změněné produkční soubory, nikoli testy. Před nasazením a zejména před úpravami rozehrané kampaně doporučeno uložit aktuální JSON zálohu. Při problému s aplikací nevymazávat cookies ani lokální úložiště.
