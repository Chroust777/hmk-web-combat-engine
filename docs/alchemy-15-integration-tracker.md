# HMK Keeper’s Ledger · Bod 4 Alchemy · Priorita 1–15

Stav po v93.437. Verze 93.437 dokončuje samostatné implementační oblasti #1 a #2 **v ověřeném rozsahu přímé aplikace**. Jejich návaznost na vrženou lahvičku patří do samostatného bodu #3. Mechanicky neověřené katalogové oblečení nelze automaticky považovat za zbroj s AV; engine je správně předá k posouzení GM. Nejde o domýšlení jejich ochrany. **Závazné pořadí:** nejprve uzavřít všech 15 společných návazností, teprve potom další kanonické elixíry. Předchozí doporučené verze v93.436–438 se nesmějí považovat za závazná čísla etap; jednotlivé práce jsou zahrnuty do bodů 1–15.

Zdroj: HârnMaster v1.2, Alchemy strany 265–274; návazné zbrojní, bojové, inventární a zdravotní kapitoly podle potřeby. „Částečně“ není „hotovo“. Každý bod bude uzavřen teprve po úplném mechanickém propojení, kontrole neměnných důkazů, testování obnovy dat a regresi.

| # | Společná návaznost | Stav v93.436 | Zbývá před uzavřením |
|---:|---|---|---|
| 1 | Acid → Armour/Clothing AV | **Dokončeno pro přímou aplikaci na ověřené p118 články** | Fyzická lahvička, konkrétní skutečný oděv včetně látkového oblečení, GM určená lokace, AV −1 při úspěšném d10, AS −1 v každém kole, původní inventární kus, anatomie, reálný výpočet vrstvené ochrany (včetně směru), perzistence a neměnná historie. Bez falešného AV u jiných, neověřených předmětů. Splash je úkol #3. |
| 2 | Acid → Flesh / Burns / Shock | **Dokončeno pro přímé zasažení lidské anatomie** | Přímé nanesení na GM potvrzenou kůži, požití u 10-zónového člověka (smrt při IL2), skutečné rostoucí Fire Burn M1→S2→S3→G4→G5 v jedné původní ráně, Shock d100 při každém novém IL, původní Combat State a léčení, první Compound d10 se starší Fire/Frost ranou, pokračování skutečné časové osy bez automatického posunu, neměnné doklady a testy. Necertifikovaná anatomie jiných druhů vyžaduje GM; vržená lahvička je úkol #3. |
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

## V93.437: pravidlové hranice a ověřený rozsah

- „Úplné“ v bodu 1 znamená všechny ověřené inventární zbroje / kusy oděvů s doloženou ochranou p118. Engine **nesmí** vyrobit AV libovolnému předmětu bez ověřeného materiálu, anatomie a vrstvení.
- „Úplné“ v bodu 2 znamená přímý kontakt s **ověřenou lidskou anatomií** a lidské požití. Katalog dalších druhů těla není součástí této bezpečně ověřené větve.
- Každé úspěšné kolo zvyšuje kontinuální Fire Burn o IL, dokud p167 připouští maximálně G5. Následující kontakt stále snižuje Acid AS, ale nedělá fiktivní IL6 ani Shock bez nového IL.
- Starší Fire/Frost rána při prvním kontaktu vyžaduje Compound d10. Pozdější růst již vzniklé Acid rány Compound sám se sebou nevytváří.
- Když GM potvrdí požití lidským tělem (10 body zones), IL2 se uloží jako KIA; obě úrovně byly předtím doloženy vlastními Shock Rolls.
- Žádné části bodů 1–2 neprovádějí Thrown Weapon hit, šestipalcový Splash ani automatic targeting. Celá tato posloupnost čeká na bod #3.
