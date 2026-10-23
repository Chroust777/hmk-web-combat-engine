# HMK Keeper’s Ledger · Bod 4 Alchemy · Priorita 1–15

Stav po v93.436. **Závazné pořadí:** nejprve uzavřít všech 15 společných návazností, teprve potom další kanonické elixíry. Předchozí doporučené verze v93.436–438 se nesmějí považovat za závazná čísla etap; jednotlivé práce jsou zahrnuty do bodů 1–15.

Zdroj: HârnMaster v1.2, Alchemy strany 265–274; návazné zbrojní, bojové, inventární a zdravotní kapitoly podle potřeby. „Částečně“ není „hotovo“. Každý bod bude uzavřen teprve po úplném mechanickém propojení, kontrole neměnných důkazů, testování obnovy dat a regresi.

| # | Společná návaznost | Stav v93.436 | Zbývá před uzavřením |
|---:|---|---|---|
| 1 | Acid → Armour/Clothing AV | **Částečně** | Otestována a zprovozněna přímá aplikace mimo boj na ověřený inventární článek p118, vybraná tělesná lokace, AV každým úspěchem −1, AS každé kolo −1, zpětně rekonstruované důkazy a výpočet bojové ochrany. Zbývá neověřené / nekatalogové oblečení, další způsoby kontaktu a úplná regrese bojových situací. |
| 2 | Acid → Flesh / Burns / Shock | Neuzavřeno | f burn IL, každý nový IL → nový Shock Roll, zranění, léčba, zvláštní požití. |
| 3 | Acid → Thrown Vial / Splash | Neuzavřeno | Hod zbraní, rozbití lahvičky, 6palcový splash a anatomická lokace. |
| 4 | Další applied elixíry | Neuzavřeno | Především Mending a Object Aegis proti reálným předmětům. |
| 5 | Plošné elixíry | Neuzavřeno | Eruption, Fumebomb, Weakness; skutečné terče a bojové důsledky. |
| 6 | Profusion všech elixírů | Částečně | Rozšířit dosavadní Darkvision, Erudition, Footpad, Physic o každé další Imbibed a jeho výjimky, včetně kombinovaných CF. |
| 7 | Aural Shock / Ill Effects | Částečně | Sdílená zdravotní návaznost všech dalších elixírů včetně léčení a restrikce benefitů. |
| 8 | Physic všechny účinky | Částečně | Redukce AS všech účinných Imbibed včetně zvláštních Instantaneous. |
| 9 | AS / Decay | Částečně | Speciální čerpání a výjimky; bezpečná rekonstrukce dříve zmeškaných měsíčních hodů. |
| 10 | Spell / Arcane provázání | Neuzavřeno | Detect/Reveal/Dispel, Negation, Attunement, Spirit Sensing, True Sight a příslušné soul stavy. |
| 11 | Invent unikátní recepty | Částečně | Mechanické provádění konkrétních GM-defined účinků; samotná výroba existuje. |
| 12 | Alchemical Dissolution / Recovery | Částečně | Úplné end-to-end necombatové Recovery a zvláštní aplikované/intake stavy. |
| 13 | Fyzická evidence | Částečně | Thrown, rozbití, předání, ukončení a případné skutečné vyřazení, bez paralelního inventáře. |
| 14 | Kalendář / historické důkazy | Částečně | Další povinné splatnosti, migrace, přehrání celé historie a všechny elixíry. |
| 15 | Kompletní regrese | Průběžně | Node.js + Chromium každé větve, kombinace CF, zpětné načítání, Campaign Clock, Combat State, inventář a staré kampaně. |

## V93.436: konkrétní technická dohoda pro Acid AV

- Původní verifikovaná data p118 (`snapshot.properties.locationProtection`) se nikdy nepřepisují.
- Na reálném inventárním kusu se udržuje `acidAVDamageByLocation` jen pro konkrétní GM potvrzené pokryté anatomické lokace, nikoli automaticky pro celý oděv.
- Stávající `resolveLiveCombatArmour()` odečítá jen relevantní fyzicky doložené body, nejvýše původní AV článku v dané lokaci/aspektu a nejvýše celkovou aktuální AV. Nechráněné lokace zůstávají beze změny.
- Jedna operace vyprázdní již existující lahvičku a doloží počátek kontaktu; každé kolo má skutečný d10, původ hodu, změnu AS a AV.
- Dosavadní poškozování zbraní WQ a objektů zůstává samostatnou větví.
- Neautorizovaná hodnota `acidAVDamageByLocation` bez historického původu je odmítnuta při validaci kampaně.
- Acid ještě nepředstavuje bojový hit ani zranění živé postavy. Zařazení bodu 1 jako „částečně“ je záměrné.
