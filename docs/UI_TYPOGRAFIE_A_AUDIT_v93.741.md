# HMK Keeper's Ledger v93.741 — jednotný vzhled a kritéria auditu

## Závazné globální zásady

- Nadpis celé záložky používá `--hmk-ui-page-heading` (19 px) a společnou rodinu `--hmk-ui-heading-font` (Cinzel, fallback Georgia).
- Nadpis tabulky nebo pravidlového panelu používá `--hmk-ui-panel-heading` (15 px) a tutéž rodinu nadpisů.
- Běžný text, popis, formulář a textové hodnoty používají `--hmk-ui-body` (13 px) a `--hmk-ui-body-font` (Cormorant Garamond, fallback Georgia). Doplňkové poznámky mohou používat `--hmk-ui-small` (12 px).
- Úmyslné výjimky z jednotné velikosti: originální Character Chronicle Spread a numerické EML/ML/Secondary Mastery/result prvky. Nesmí se jim bezpodmínečně přepsat font-size.
- Příbuzné pravidlové karty Skill Testu používají stejný pergamenový povrch, rámečky a tělo textu; pouze dvě úrovně nadpisů.
- Nepoužívat kruhové informační `ⓘ`: nápověda má zůstat dostupná pomocí hover/focus atributu `data-hmk-help`, případně pomocí existujícího `?` u šipky.
- Nedostupná procedura musí mít zakázaný potvrzovací krok, ruční hod i software kostku; pouhá změna vstupů nikdy nesmí zapsat pravidlový výsledek.
- Knihovní navigace na součásti kompletů je textová, bez modrého pozadí nebo podtržení, s přístupným focus-visible.
- Přehled na 7 dní a K vyřízení + Plánované události jsou v plné šíři **levé** strany; kalendář s dny zůstává na **pravé** straně v původní šíři.

## Způsob ověření

- Kód/přítomnost CSS není sám o sobě důkazem správného vykreslení. Ověřovat `getComputedStyle` a kliknutí v lokálním Chromium.
- Kontrolovat otevřené části knihovny včetně vlastních položek a vybrané stavy formality, ale netvrdit pokrytí soukromých dat kampaně, která nejsou v ZIPu.
- Cold/Heat Hazard: Area AV pouze ze skutečně oblečené sestavy, Cold Gear AV samostatně podle HMK str. 149; Heat nesmí přidávat Cold Gear AV.
- Pravidlový zápis jen po potvrzení GM. Ověřovat neplatné termíny, opakované hody, potvrzené termíny a stav inventáře po manipulaci.

## Hranice platnosti

Tyto zásady platí pro všechny budoucí obrazovky. Tato verze automatickými a lokálními prohlížečovými testy ověřuje vyjmenované obrazovky; neprokazuje interaktivní průchod každým historickým formulářem ani daty uloženými pouze v prohlížeči GM.
