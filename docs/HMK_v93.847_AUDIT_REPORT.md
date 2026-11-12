# HMK Web Combat Engine — v93.847 · Audit Tracking CF / Bearing / Complication / Zvířata

**Základ:** přesně nahraný `HMK_v93.846_FULL.zip`. **Pravidlová autorita:** HMK v1.2, str. 122, 145–149 a bestiář 354–357. **Poznámka k testům:** pevně zadané d100/d10 jsou pouze izolovaná testovací data v Chromiu, nikoli hody skutečné kampaně. Každý popsaný průchod používal skutečné prvky aplikace a potvrzovací tlačítka; nová aplikace sama hody negenerovala.

## Doložené opravy

**C01 – zmizelé potvrzení Complication.** Reprodukce: Survival CF, Hazard d10 9, Animalcraft Skill Test F/CF, po návratu vyplnit přesnou minutu překážky. Formulář mohl skrýt výběr, přestože stav vyžadoval novou potvrzovací akci: nepřekonatelná blokace. `app.js` nyní ponechá povinné tlačítko viditelné, dokud změny nejsou výslovně potvrzeny. Samotné psaní minuty ani checkbox změny trasy nic neukládají. Pro CF se skutečně potvrdila změna trasy, u F se potvrdila minuta 25. Obě epizody byly klikacím testem uloženy s celkem 60 minutami.

**C02 – rozdíl mezi interním pravidlem jízdy a seznamem zvířat.** Kontrola `isRidingAnimal93837()` znala vedle koní a velbloudů také osla a mezka, ale UI `<select name="travelRideAnimalId">` je filtrovalo jinak. Při zobrazení se nyní používá stejná ověřovací funkce jako v pravidlové validaci, bez přidání nedoloženého jízdního druhu. Výběr není zápis.

**C03 – kontrola anatomie.** Žádný z 16 druhů nepostrádá druhovou anatomickou tabulku: vůl C, velbloud C, tři psi D/E, osel B, slon J, sokol I, mezek C, palfrey C, warhorses C, warpony B. Nezaváděl jsem umělé anatomické ani zdravotní profily. Zvíře **bez vlastního aktuálního zdravotního profilu** může absolvovat běžný Pochod, pokud jinak splňuje podmínky pro daný typ cesty. **Accident** se ale stále nesmí vyhodnotit losováním, které by takové zvíře vyloučilo: musí se nejprve doložit relevantní zdravotní evidence, bez podvržení zdravého stavu. Slon se speciální anatomií J nemůže být pro Injury vydáván za koně.

## Opravdu proklikané scénáře

- **Tracking CF → další Pochod (A): PASS.** Založen samostatný 40minutový Tracking, název stopy zadán znak po znaku a potvrzen, skutečný test d100 100 (CF) otevřen a potvrzen, návrat a uložení prvního intervalu. V následujícím 40minutovém pěším Pochodu byl vyžadován a proveden nový Survival, d10 Progress, d10 Direction, případný směrový hazard se samostatným potvrzením, END a finální zápis. Čas 480 → 520 → 560; počet dosud splatných Bearing 0 → 1 → 0. Starý Tracking d100 se nepoužil jako Survival.
- **Tracking CF → další Pochod (B): PASS.** Stejný skutečný klikací průchod znovu s jiným aktérem/stopařem/průvodcem B namísto A, dvě nezávislé 40minutové epizody, Bearing jednou.
- **Complication / Animalcraft F: PASS.** Skill Test otevřen v aplikaci, návrat, minuta 25, znovupotvrzení volby, poslední tlačítko pro uložení 60 minut; výsledek F se skutečně zapsal.
- **Complication / Animalcraft CF: PASS.** Jako F, s výslovným potvrzením změny trasy, skutečný zápis 60 minut a původní CF doklad.
- **Vůz se dvěma voly, nezávislá pěší družina: PASS v cílené klikací regresi.** Přes UI pořízeni oba voli, postroje, čtyřkolový vůz, přeprava pacienta s tělesnou hmotností doloženou z postavy, celkem 270 lb osob, kapacita 8 000 lb, jedna společná 45minutová epizoda. Pořizování nezměnilo čas před finálním potvrzením.

## Zdrojové, výpočetní a integrační testy

| Kontrola | Výsledek |
|---|---|
| `node tools/test_93847_anatomy_mount.mjs` | **PASS 79**; všech 16 anatomií, jezdecký výběr, volský/koňský vůz, Stáj bez zdravotního profilu |
| `node tools/test_93846_accident_tracking_complication.mjs` | **PASS 45**; CF Bearing / Complication / zvířata |
| `node tools/test_93785_travel_matrix.mjs` | **PASS 7 869**; tabulkové přepočty |
| `python tools/browser_93847_tracking_full.py` | **PASS**, 2 potvrzené epizody A |
| `python tools/browser_93847_tracking_actor_b.py` | **PASS**, 2 potvrzené epizody B |
| `python tools/browser_93847_complication_animalcraft.py` | **PASS F i CF**, každá epizoda 60 minut |
| `python tools/browser_93818_ox_wagon_complete.py` | **PASS**, dvě současné skupiny, vůz a voli, 45 minut |

Přímé důkazy jsou v `tools/evidence_93847/` (JSON stavy, skutečné snímky) a v reprodukčních skriptech `tools/`.

## Poctivě otevřené, neprohlašovat za PASS

- **Stalking aktivovaný jako Mode přímo při cestování → Tracking CF → změna průvodce → další Pochod na koni či se spřežením**: **NEOVĚŘENO jako jeden nepřetržitý klikací scénář**. Dokončené Tracking/Bearing klikání a vůz jsou dvě samostatné izolované regrese, ne jeden společný výchozí stav.
- **Kompletní Complication vozky s reálným tažným spřežením → další Pochod**: **NEOVĚŘENO jako jediný klikací scénář**. Animalcraft F/CF a samostatný vůz PASS, spojení všech okolností zatím není doložené.
- **Přímo změna průvodce/stopaře během jedné již vyhodnocené epizody** musí zůstat zakázaná, nelze ji vydávat za úspěšnou migraci starého dokladu. Ověřený druhý aktér B znamená nový nezávislý běh.
- **Úplná Accident Injury / Shock u slona a ostatních speciálních anatomií**: **BLOCKED/NEOVĚŘENO** podle druhu; existence tabulky sama nedokazuje napojení na zdravotní formuláře.
- **Skutečný reload uživatelského HTTP/GitHub Pages a jeho uložené kampaně**: **NEOVĚŘENO**; izolovaná stránka v Chromiu není HTTP reload.

## Minutový a potvrzovací standard

Žádný nově přidaný automatický čtyřhodinový časový blok ani dohledávání starého hodu; opakované potvrzování je povinné u změny následku Hazardu. Čas se mění až finálním tlačítkem při uložení. Rozhodnutí o pozdějším opravování Equipment zůstává v režii GM, v souladu s projektní výjimkou.
