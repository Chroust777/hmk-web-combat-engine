# v94.103 — Denní kronika a ruční odstavce

Navazuje na v94.102. Nahraďte soubory v kořeni repozitáře podle cest v ZIPu.

- Vedle ovládání kroniky je výběr herního dne dostupný GM i hráčům. Nabídka zahrnuje dny již zpracovaných zpráv, bez hodin/minut; použije historický snapshot data zprávy, nikoli okamžik generování. Zprávy bez doloženého data mají samostatnou položku. Při otevření je preferován aktuální herní den, pokud v kronice existuje, jinak poslední dostupný den. Přepnutí dne začíná na první straně a stránkování se vztahuje jen k vybranému dni.
- GM edituje vybraný den. Ruční text včetně všech řádků, mezer a prázdných odstavců je zachován při uložení a stránkování. Generované pasáže jsou nadále souvislé a přidávají se k příslušnému dni bez přepisování ruční úpravy. Smazat vše zůstává mazáním celé kroniky, nikoli zpráv.
- Starší záznamy se při čtení přiřazují k datu původní zprávy. Starší ručně upravený text přes více dnů se nedělí odhadem: zůstává k dispozici v samostatné položce „Starší ruční kronika (více dnů)“, vedle původních generovaných pasáží podle dnů. Jednodenní starší ruční text se přiřadí k danému dni. Nová metadata gameDay a manualDays jsou volitelná v existujícím samostatném JSONu chatu; formát souboru a cesta se nemění.
- Atlas, kalendář, mechaniky, herní JSON, paleta, pozadí a cloudová transportní vrstva beze změny.

## Ověření
- Node: test_94103_chat_days.mjs — seskupení podle dne, chybějící datum, ruční odstavce, pozdější doplnění starého dne, ochrana ručních úprav, starší data, revize, oprávnění a vymazání/regenerace. Původní test_94100_chat.mjs včetně simulovaného GitHub CAS prošel.
- Chromium: aktuální sestavené moduly aplikace, produkční CSS, izolované úložiště; 56 zpráv, dva herní dny, filtr obou rolí, přesný text přes více stran, editace jednoho dne bez ovlivnění druhého, změna velikosti okna, odhlášení GM a znovuotevření Chatu, nezměněný herní JSON; bez JS výjimek.
- Skutečný vzdálený GitHub Cloud a GitHub Pages nebyly ověřeny. Prohlížečový test nenačítal grafické textury; vzhled knihy nebyl upravován.
