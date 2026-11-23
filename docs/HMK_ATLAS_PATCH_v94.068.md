# HMK Atlas v94.068 — Horní lišta a navigace značek

Základ: v94.067. Patch upravuje pouze Atlas.

- Přesunutí tlačítka **Pozice družiny** do mapové lišty přesně mezi **Celá mapa** a **Vrstvy mapy**. Existující polohu vycentruje na 107 %, při první poloze otevře umístění.
- Rozbalovací **Značky na této mapě** je ve výchozím stavu sbalené. Jeho seznam obsahuje jen běžné značky, nikoliv Pozici družiny. Kliknutí na název vystředí danou značku na 107 %.
- Odstraněny dvě nápovědné věty z Měření trasy a Vlastních značek.
- V pravém panelu odstraněny **Nástroje mapy** a podtitulek o práci přímo nad mapou. Místo nich jsou nyní **Kartografické nástroje** a **Zpět / Znovu**. Vlastní kartografická sekce již nadpis ani tlačítka neduplikuje.
- Zpět/Znovu používají stejnou historii a stejné události jako předtím. Měření, kreslení, značky, mlha, ukládání ani napojení do herních systémů se nemění.

## Instalace

Rozbal obsah ZIP do kořene GitHub Pages repozitáře. Nahraď odpovídající soubory a obnov stránku Ctrl+F5. Všechny mapové podklady a PDF zůstávají beze změny.

## Ověření

Syntaktická kontrola aktualizovaných modulů, test HTML selektorů a prohlížečové klikání na přepnuté ovládání, seznam značek a Zpět/Znovu. Skutečné volání soukromého GitHub API a načtení PDF.js ze CDN nebylo ověřeno.
