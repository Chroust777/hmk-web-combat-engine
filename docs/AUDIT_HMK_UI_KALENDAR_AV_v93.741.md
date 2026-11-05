# HMK Keeper's Ledger v93.741 — zpětná kontrola, jednotné UI a AV

Základ: kompletní v93.740, pravidla HMK v1.2, zejména strany 118, 133, 149. Testováno lokálně v Chromium přes in-memory dokument, nikoli klikáním na produkční GitHub Pages.

## 1. Co se změnilo ve v93.741

- Nová **závěrečná CSS vrstva** `hmk-global-ui-93741.css`, načítaná až po dřívějších stylech. Typografické tokeny: nadpis záložky Cinzel 19px, nadpis panelu/tabulky Cinzel 15px, běžný text Cormorant Garamond 13px, doplňkový text 12px. Náhradní font Georgia. Rodiny fontu se uplatní i na vnořené div/span/strong, ne pouze na `p` a `label`. V prvním plošném měření Chromium navíc odhalen a opraven skutečný rozdíl: titulní H3 měl 23,905px namísto 19px a podnadpis H2 17px namísto 15px. Následné přeměření na hlavních stránkách potvrdilo 19 / 15 / 13px. Výjimky respektují originální Chronicle Spread a numerické prvky Skill Testu.
- Specificky sjednoceny panely „Jak funguje Skill Test“ a „1. Secondary Mastery“: identický pergamenový gradient, okraj, nadpis a velikost textu. Nápověda „Primární dovednost“ a odstavec o nepovinném Secondary Mastery mají stejný vypočtený font a velikost.
- Odstraněny kruhové informační `ⓘ` ze dvou míst v hlavní aplikaci a ze seznamu měsíců. Hover/focus nápovědy `data-hmk-help` zůstávají; vlastní interaktivní otazníky nenahrazovány.
- Odkazy na ověřené součásti hotových kompletů fungují dál jako skutečná tlačítka, ale jsou vzhledově obyčejným pergamenovým textem bez modrého pozadí i bez podtržení. Focus pro klávesnici zachován.
- **Kalendář:** `Přehled na 7 dní`, `K vyřízení` a `Plánované události a činnosti` jsou pod sebou v celé využitelné šířce **levé** strany, seznamy nemají pevný svislý scroll. Pravá strana s měsíčním kalendářem zůstává samostatná v původním prostoru. Mobilní rozložení se skládá podle existujícího breakpointu.
- Starší testy `test_library_help_495.cjs` a `test_93739_library_calendar.cjs` přepsány tak, aby testovaly aktuální sémantiku nápověd, zdroje ochrany, aktuální CSS a propojení, nikoli staré doslovné verze.
- Přidán regresní test `test_93741_weather_ui_contract.cjs` a trvalá specifikace `docs/UI_TYPOGRAFIE_A_AUDIT_v93.741.md`.

## 2. Přenos ochrany z inventáře do cestování

**Ano, v ověřeném scénáři přenos funguje.** Volá se `calculateWeatherAreaAV({inventory,actorId})` nad skutečně oblečenými kusy (`slot='worn'`). Hodnota F jednotlivých anatomických lokací vstupuje do váženého Area AV podle HMK str. 133.

- Cold Hazard: `min(Area AV,4) + Gear AV + Shelter AV + Fire FS`. Oblečený **Cloth Cloak** má vedle svého příspěvku F i speciální **Gear AV +1**. Blanket a běžný bedroll mají +1, heavy bedroll a padded cloak +2 podle závazné tabulky HMK str. 149. Použití neseného bedrollu nebo stanu stále vyžaduje potvrzení GM (vlastnictví ≠ použití).
- Heat Hazard: `max(Area AV,1)`; bonus za plášť, přikrývku, bedroll či stan jako Cold Gear AV se zde nepřipočte. Ostatní okolnosti vedra se vyhodnocují zvlášť podle HMK.
- Poškozená/zneplatněná zbroj neprojde tiše jako AV 0: systém vyžaduje opravu zdroje.
- Při svlečení pláště se v dalším vyhodnocení přepočte Area AV a automatický bonus pláště přestane platit. Přímé prohlížečové scénáře pokrývají oblečený plášť a oba formuláře, čisté výpočtové testy také prázdný inventář.

### Pozor

Případné **vlastní** předměty GM nejsou automaticky považovány za pravidlově doložené jen podle jejich názvu nebo libovolného vlastního pole `coldAV`. Opravdu vlastní záznamy uložené jen v soukromém `localStorage` konkrétního uživatele nejsou součástí předaného ZIPu.

## 3. Skutečná kontrola výsledného rozhraní

Lokální Chromium, produkční styly a aktuální produkční kód v samostatné QA kopii (bez přímého přístupu ke GitHub Pages):

1. **Skill Tests**: identický vypočtený font a velikost hlavních odstavců na obou panelech, stejné pozadí a fonty nadpisů. Obrázek `HMK_v93.741_skills.png`.
2. **Kalendář**: oba levé seznamy pod sebou, více než 93 % šířky panelu, overflow `visible`; měsíční kalendář pouze na pravé stránce. Obrázek `HMK_v93.741_calendar.png`.
3. **Knihovna**: 12 kompletů, klikací odkaz součásti otevře přesné ID, vypočtené `background=transparent` a `text-decoration=none`. Obrázek `HMK_v93.741_library.png`.
4. **Cold / Heat**: v obou formulářích načtená správná Area AV z oblečené Cloth Cloak; pouze Cold nabízí vybavení a ukazuje automatický +1, Heat nepoužívá žádný Cold Gear AV.
5. **Vlastní katalogová položka (syntetický test)**: atypický záznam s `coveredLocations` a `locationProtection` vykreslen bez druhé sekce anatomického krytí, ochrana ve formátu `b0 / e1 / p0 / f1`; nevyvolal JS error. Nejde o audit soukromých uživatelských položek.

## 4. Výsledek regresí

- 21/21 běžných starších a navazujících sad **PASS**, včetně dvou dříve problematických kategorií (starší test nápověd aktualizován, chybějící sada nahrazena existujícími 93.740 testy). V rámci těchto sad jsou i 1 905 tvrzení u Skill Chain 545.
- Historický test Knihovny/kalendáře v nové sémantice: **17 PASS**.
- Nová cílená sada Cold/Heat/typografie: **24 PASS**.
- Lokální prohlížečové scénáře: výše uvedené části **PASS**, bez JS page errors; testy nesimulují živý vzdálený GitHub ani soukromý prohlížeč GM.
- `node --check` pro `app.js` a `hmk-app.bundle.js`: **PASS**.

## 5. Zpětně otevřené nebo neúplné úkoly — poctivý stav

| Úkol | Doložené pokrytí | Co nelze tvrdit |
|---|---|---|
| Kompletní prohlížečové E2E zbroj × aktivita × obnova ze zálohy | Testy cestování/zbroje, archivní roundtrip v některých modulových sadách, lokální klikací Knihovna/počasí | Úplný prohlížečový průchod každé kombinace a obnovy ze skutečné soukromé zálohy dosud neproběhl |
| Všechny vlastní katalogové položky | Syntetický atypický armor/other + existující validační procedury | Skutečná uživatelská data nebyla předána, nelze je auditovat |
| Všechny historické testy | 21 hlavních sad + aktualizovaný test 93.739 + nová sada | Všech cca 500 testovacích souborů neproběhlo |
| Všechny formuláře: blokovaná kostka/input i vyhodnocení až po potvrzení | Regrese předchozích oprav, zdrojový kontrakt, nové formuláře žádný zápis při výběru | Bez vlastních prohlížečových testů každého průvodce nelze slibovat absolutní celoplošné pokrytí |
| Jednotné písmo úplně všech historických obrazovek | Závěrečná společná CSS vrstva a lokálně ověřené Skill Tests, Knihovna, Kalendář | Neprokázána pixelová kontrola každého historického panelu; ponechat otevřené do systematického vizuálního průchodu |

Závěr: opravy typografie, dvoustránkového kalendáře, textových odkazů a přenosu Area AV do obou Weather Hazard mají potvrzené cílené testy. Zbylé plošné audity je třeba vykonat po částech, nikoli je předčasně označovat za hotové.
