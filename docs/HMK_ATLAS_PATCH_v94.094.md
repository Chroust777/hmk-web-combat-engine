# HMK Keeper’s Ledger v94.094 – poznámka textu na mapě

Základ: v94.077 a patche v94.078–v94.093, aktuální překryvy ověřeny proti ZIPům.

- Odstraněna výjimka v `showHover`, která skrývala uloženou poznámku u typu `text`. Název zůstává na mapě. Poznámka je viditelná ve stejném okně jako u ostatních objektů, po najetí i kliknutí. Prázdná poznámka nevytváří prázdné okno při najetí. Žádné změny dat ani dalších nástrojů.
- Aktualizována verze a importy kvůli cache.

## Testy
Chromium, produkční CSS, izolovaný paměťový adaptér: reprodukce na obou mapách v94.093, po opravě na obou mapách PASS zobrazení poznámky při najetí i kliknutí, editace a opětovné načtení, hráč i GM, vymazání poznámky, poznámka trasy, jediný kotevní bod, přesun textu, starší nadbytečné body, trasy a oblasti. Regrese trvalé mlhy hráče, přepínání rolí, obousměrné zakrytí, úplné odhalení: PASS. Bez zachycených JS výjimek. Node kontrola syntaxe: PASS.

Živý GitHub Cloud, GitHub Pages, PDF.js ani kompletní start aplikace nebyly testovány.

Instalace: rozbalit do kořene repozitáře v94.093, přepsat soubory, publikovat, Ctrl+F5.
