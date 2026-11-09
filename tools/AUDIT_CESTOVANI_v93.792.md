# HMK Keeper’s Ledger v93.792 — dílčí audit Cestování a zdravotních validací

Výchozí stav: přesný FULL ZIP v93.791. Zaměřeno pouze na necombatní zdravotní UI.

## Provedené změny

1. V cestovním Treatment Roll se mezi kandidáty nenabízí rána, pro kterou již běží časovaný Treatment/Amputation procedure. Původní časovaný zákrok zůstává dohledatelný v přehledu, s vlastním dokončením/přerušením; jiné rány lze řešit dále. Ošetřenou ránu bez *aktivně běžícího* zákroku ponecháváme dostupnou pro případné pravidlově povolené opakované ošetření vyšším Physician Index — žádné svévolné zrušení této možnosti.
2. Pokud není žádná rána vhodná k zahájení Treatment, nenabízí se neúplný červený formulář léčitele. Zobrazí se pokyn dokončit probíhající zákrok nebo další kalendářní povinnost.
3. Označení `(neošetřená)` u dosud neošetřených nezhojených ran ve výběrových seznamech. U úspěšně ošetřených ran označení zmizí.
4. Cestovní Injury Morale: prázdné d100 / Aberrance se již nepřevádí automaticky na 0. Chybějící pole je naváděno a označeno; pokud není Aberrance doložená přímo u rány, GM musí explicitně potvrdit její skutečný původ/hodnotu. Doplněna vysvětlivka po najetí/zaměření popisku.
5. Cestovní Treatment/Healing/Infection/Grim kalendářová navigace pro necombatní ránu vyvolá zdravotní záložku i z jiného aktivního pohledu. Nezasahuje do výpočetního modulu Combat.

## Kontroly skutečně provedené v této etapě

- `node --check app.js`: PASS.
- `node --check hmk-app.bundle.js`: PASS.
- `node tools/build_93792_bundle.cjs`: PASS, 445 modulů, změněn jen modul `app.js`.
- `node tools/test_concurrent_93718.cjs`: PASS, 373 asercí včetně 24 permutací souběžných zákroků.
- `node tools/test_93792_treatment_morale_guards.cjs`: PASS, 10 kontrol přítomnosti ochranných větví. Tento test je *strukturální*, nikoliv prohlížečový.
- Starší `test_weather_shock_93702.cjs`: **TEST SCRIPT ERROR** — obsahuje relativní cestu k neexistující vnořené složce. Není to důkaz selhání aplikace.

## Neuzavřené

- Nové uživatelské opravy dosud nemají úplný klikací browser průchod ze snímku od GM přes celý časovaný Treatment a potvrzení.
- Dynamické zamykání Shock d100 / Compound d10 u všech pádových a teplotních formulářů (u Skin Exposure kód explicitně skrývá a deaktivuje nepotřebné hody; ostatní podmíněné formuláře vyžadují klikací retest).
- Úplná automatizace Aberrance zdroje: bezpečně předvyplnit pouze tehdy, pokud je původ i hodnota doložená; nikdy nevyrábět 0.
- Komplexní návaznost Injury Morale a léčby z ostatních necombatních původů na různé úlohy Kalendáře.
- Posouzení údajných duplicit v deníku: snímek ukazuje opakované položky odlišných anatomických lokalit, neprokazuje totožná interní ID; vyžaduje datově podloženou kontrolu jedinečnosti `woundId` / historie.
- Kompletní vstupně-výstupní regrese skutečných Cold Exposure poranění pro každou lokalitu a stranu.

**Verdikt:** cílená dílčí oprava, nikoli definitivní uzavření Cestování. Combat a Mysteries nebyly měněny. Není tvrzeno, že byly proklikány všechny zbývající formuláře.
