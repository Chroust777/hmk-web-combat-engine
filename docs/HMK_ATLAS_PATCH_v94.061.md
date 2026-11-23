# HMK Atlas – patch v94.061 – společný soukromý GitHub Cloud

Navazuje na v94.060. Patch mění pouze Atlas a minimální integrační body hlavní aplikace.

## Změna úložiště

Vlastní značky hlavní mapy I4–L7 a detailu K5, jejich typy, názvy, poznámky, mapové souřadnice, přesuny a pozice družiny se nyní ukládají do **stávajícího dokumentu HMK kampaně** pod vlastností `atlasMarkers`:

```json
"atlasMarkers": {
  "overview": [],
  "K5": []
}
```

Hlavní JSON je stále v existující soukromé GitHub Cloud cestě `campaigns/hmk-ledger-cloud.json` ve stávajícím soukromém repozitáři. Repozitář, token, cloudový formát, kontrola SHA/CAS, fronta neodeslaných změn, ochrana proti konfliktům a obnovování ze záloh se nemění. NENÍ potřeba Firebase, další repozitář ani nový token. Nové verze souborů s mapami se nenahrávají.

- Vlastní značky se zapisují pouze pomocí existujícího `save()` hlavní aplikace. Při odmítnutém zápisu se změny značek vrátí do posledního potvrzeného stavu.
- Bez připojeného GitHub Cloud se změna uloží jen do běžného místního JSON aplikace; propojení druhého zařízení vyžaduje připojení ke stejnému cloudovému repozitáři.
- Měření vzdálenosti zůstává dočasné, **do cloudu se neukládá**.
- Značky stále nemění lokaci postav, cestování, kalendář nebo zdravotní data.

## Jednorázové převzetí starých značek

Značky vytvořené ve v94.058–v94.060 zůstávají v původním `localStorage` klíči `hmk-atlas-markers-v1`. Po otevření Atlasu se vpravo objeví tlačítko **Převzít místní značky do cloudu**, pokud existují místní značky dosud nepřítomné ve společných datech.

Tlačítko přidá do kampaně jen dosud chybějící ID; značky již v cloudu nemaže ani nemění. U mapy s existující pozicí družiny má přednost cloudová pozice (jen jedna na mapu). Starou místní kopii automaticky nemažeme. Převzetí se provede přes běžný cloudový zápis, nikoli přímo do GitHub API.

Doporučený postup: na zařízení, kde jsou původní značky, připojit stávající GitHub Cloud (stav `Cloud ✓ uloženo`), otevřít Atlas a použít převzetí. Na druhém zařízení připojeném do stejného soukromého repozitáře potom obnovit stránku nebo ručně načíst aktuální cloudový stav.

## Kontroly

- `node --check app.js`, `node --check src/ui/atlas-viewer.js`: OK.
- Izolovaný prohlížeč s plnou implementací Atlasu a simulovaným datovým adaptérem: vložení značky, zápis do JSON, návrat po znovuotevření, odmítnutý zápis bez ztráty potvrzených dat: OK.
- Izolovaný prohlížeč: jednorázové převzetí místních značek při zachování existujících cloudových značek a pozice družiny: OK.
- Skutečné čtení/zápis do uživatelova soukromého GitHub repozitáře **nebyly testovány**; nemáme autentizované připojení k tomuto účtu. Cloudový modul je beze změn.

## Instalace

Přepsat v kořeni repozitáře `index.html`, `app.js`, `atlas.css`, `src/ui/atlas-viewer.js`, přidat tento dokument. **Nemazat** mapová PDF/WebP ani starý lokální klíč pro značky před ověřeným převzetím do cloudu.
