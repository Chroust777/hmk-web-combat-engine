# HMK Web Combat Engine – audit změn v93.838

**Vstup:** ověřený `HMK_v93.837_FULL.zip`. **Výstup:** v93.838 FULL a rozdílový PATCH.  
**Pravidlová autorita:** HârnMaster Kèthîra v1.2, tištěná strana **122** (Conveyance, Beasts, Vehicles & Tack, Mount Encumbrance).  
**Rozsah:** Stáj → mapa anatomických zón, majetek zvířete, inventář vlastníka, přesuny výstroje, soumary/vozidla, zatížení a návaznost na Pochod.

## 1. Reprodukce problému

Ve v93.837 má výstroj pořízená přímo ve Stáji pouze události `tack-add` nebo `vehicle-add`. Dosavadní tlačítko `Sejmout / vyřadit` vytvořilo opačnou stájovou událost, ale **nevytvořilo fyzickou inventární položku**, takže už nebylo co předat zpět postavě nebo jinému zvířeti. Výstroj pořízená v Knihovně měla samostatnou inventární identitu. Jde o reálnou asymetrii v datovém modelu, ne jen textový problém tlačítka.

## 2. Co bylo změněno

1. **Tabulka 16 druhů** z HMK str. 122 je umístěna ve Stáji pod anatomickými zónami. Obsahuje účel, vhodnou výstroj, podporované způsoby jízdy a tahu a omezení aplikace. Ve vysvětlivce je výslovně odděleno pravidlo HMK od konzervativní podpory aplikace: kniha neobsahuje úplnou tabulku všech kombinací druh–postroj. Údaje o cenách/hmotnosti zůstávají v existujícím katalogu.
2. Pro **výstroj a vozidla** je místo destruktivního odstranění samostatný výběr cíle `Do inventáře vlastníka` / `Na [vhodné zvíře]` a tlačítko **Potvrdit přesun**. Změna rozbalovacího seznamu sama nic nemění; před zápisem následuje potvrzovací dialog.
3. Při prvním přesunu **historicky pořízené** výstroje pouze ve Stáji vznikne *jedna* inventární fyzická položka s trvalým ID a odkazem na původní doklad; k původnímu nákupu se připojí nepeněžní převodní doklad `legacy-gear-detach`. Další přesuny používají existující události `inventory-gear-attach` / `inventory-gear-detach` se stejným inventárním ID. Nejde o nový nákup ani klon.
4. Jedna atomická transakce aktualizuje umístění inventární položky i doklady obou zvířat. Validátor dokladů kontroluje zdroj, původní cenu a hmotnost, jedinečnost a vlastnictví, kampaně a časy. Odmítá opakované vyzvednutí stejné historické položky a manipulaci s dokladem/hmotností.
5. Při sejmutí brašen či nákladního postroje se kontroluje **zbývající nákladová kapacita**. Brašny s 10 lb nákladu nelze sejmout, pokud po přesunu nezůstane kapacita pro tento náklad. U vozidel se před přesunem vyžaduje vyložení vozidlového nákladu.
6. Po potvrzení se skutečné vybavení promítne do **hmotnosti/ENC/PF zvířete** a `slot` inventáře ovlivní **hmotnost/Gear ENC postavy**. Váha konstrukce káry nebo vozu se nepočítá jako náklad nesený na hřbetě.
7. Kompatibilita výstroje se ověřuje před přesunem a při pořízení, včetně výslovného upozornění na válečné sedlo vyrobené na míru. Zvláštní sloní výstroj používá pravidlový násobek hmotnosti; univerzální soumarský postroj a brašny se nenabízejí psům a sokolům.

## 3. Ověření v Chromiu

**PASS: 44 skutečných kontrol v izolovaném Chromiu, produkční JS bundle.** Skript `tools/browser_93838_stable_transfer.py` používá skutečné formuláře, změny hodnot, kliknutí a potvrzovací dialogy; ověřuje i persistovanou kopii uloženého stavu. Pro deterministický průchod vytváří syntetickou testovací kampaň se třemi zvířaty. Pouze připravenost Character Creation pro tuto syntetickou postavu je v testu překlenuta, Stáj a její tlačítka nejsou mockována.

- Přímo v UI pořízen vůl Blesk, jezdecký kůň Vítr a tažný kůň Tulák.
- Kontrola tabulky 16 zvířat pod anatomickou mapou.
- Skutečný převod 3 lb brašen: Blesk → Vítr → inventář Michala → Blesk; identické inventární ID, původní doklad zachován.
- Změna výběru bez potvrzení neuložila nic; validátor odmítl odebrání brašen s 10 lb nákladu.
- Sedlo 20 lb: na koni základní ENC +5 a postava bez tohoto břemene; po přesunu postavě základní ENC koně −5 a Gear ENC postavy +5.
- Skutečný převod káry 200 lb: vůl → tažný kůň → inventář vlastníka; 200 lb není započteno na hřbet zvířete.
- Ověřeno, že se původní jednotlivé předměty neduplikují a uložený stav má správnou lokaci (`stable` vs `carried`). Zároveň proběhlo znovuvytvoření stavu z uloženého lokálního JSON; identita tří kusů i Gear ENC vlastníka 55 zůstaly zachovány.

Důkazy: `tools/evidence_93838/BROWSER_STABLE_TRANSFERS.json`, `STABLE_16_SPECIES_GUIDE.png`, `TRANSFER_DESTINATION_DRAFT.png`, `STABLE_2_ANIMALS_CUSTODY.png`.

## 4. Zdrojové a regresní testy

| Kontrola | Výsledek |
|---|---|
| Nové validace Stáje a transferů | **PASS 29** |
| Jízda a globální počasí v93.837 (aktualizovaný marker verze) | **PASS 20** |
| Izolovaný Chromium Stáj | **PASS 44** |
| Chromium běžný Foraging v93.835–v93.838 | **PASS 38** |
| Chromium smíšená jízda a globální počasí | **PASS 39** |
| Foraging CF | **PASS 48** (výpočetní smlouva; nezavírá všechny interaktivní větve) |
| Samostatný Foraging | **PASS 70** |
| Foraging matice | **PASS 1539** |
| Tracking party/doklady | **PASS 15** |
| Shelter/Tracking kontrakt | **PASS 12** |
| Drover party | **PASS 10** |
| Inventář batch | **PASS** |
| Inventář disposition | **PASS 63** |
| JS syntax + sestavení bundle | **PASS** |

Logy části regresních kontrol jsou v `tools/evidence_93838/*.log`. Starší `test_trekking_loaded_animals_512.cjs` **FAIL** pro synteticky nepřipraveného průvodce, stejným způsobem již na výchozí v93.837; není to regresí tohoto PATCH, ale nesmí být označen za PASS.

## 5. Limity a otevřené oblasti

- **NEOVĚŘENO:** skutečný HTTP reload URL na reálné trvalé kampani a dlouhodobá synchronizace mezi více zařízeními; test potvrdil zapsání a rehydrataci z uloženého lokálního stavu, ne plný HTTP reload.
- **NEOVĚŘENO:** všechny možné kombinace 16 druhů × 14 druhů výstroje, zejména speciální sloní platforma a skutečný režim vícespřeží. Vysvětlivka označuje podporu aplikace odděleně od pravidel HMK.
- **NEOVĚŘENO:** všechny zdravotní, kronikové, finanční a kapacitní návaznosti po libovolné dlouhé sekvenci přesunů. Nová transakce **nevytváří** čas ani peněžní příjem/výdaj.
- **Rozsah mimo tuto opravu:** ručně zapsaný volný náklad (`cargo-add`) není automaticky plnohodnotnou inventární položkou a jeho vyložení funguje podle původního protokolu. Oprava je zaměřena na skutečně pořízenou výstroj a vozidla; nepřepisuje starší volné náklady.
- **Otevřené předchozí větve:** kompletní Survival CF/Equipment/Accident/Complication, Tracking CF → Bearing → další Pochod, historicky problematický zdravotní test počasí. Neprohlašujeme je za uzavřené.

## 6. Způsob vydání a integrita

FULL a PATCH vznikají výhradně z v93.837 FULL a rozdílu skutečně změněných/přidaných souborů. Původní důkazní soubory v93.835–v93.837 jsou zachovány. SHA-256 manifest uvádí hash všech aktuálních souborů (kromě samotného manifestu) a zvlášť je provedena kontrola *v93.837 FULL + PATCH = v93.838 FULL* bitově po souborech. Podrobnosti `HMK_v93.838_PATCH_VERIFICATION.json`.
