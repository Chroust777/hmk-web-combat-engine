# HMK Atlas PATCH v94.073 – Viditelný křížek pro zkrácení trasy a původní Enter

Navazuje **výhradně na v94.072**. Žádné změny v jiných herních modulech.

- Kliknutí na **tečku libovolného bodu uložené trasy** přímo zobrazí křížek pro zkrácení trasy. Není nutné nejprve otevírat editaci tužkou. Bod má větší, průhlednou klikací plochu, která je nad klikací plochou samotné čáry.
- Kliknutí na **spojnici mimo body** nadále nabídne tužku pro úpravu trasy. V otevřené editaci funguje křížek i přetahování bodů.
- Potvrzením zkrácení zůstane vybraný bod a všechny předcházející úseky; při výběru posledního bodu zmizí poslední úsek. Zachovává se minimum dvou bodů; úplná trasa se smaže tlačítkem **Odebrat celou trasu** v editoru.
- **Enter a numerický Enter** v heslovém poli Mlhy války jsou znovu blokovány původním globálním pravidlem formulářů. Heslo se potvrzuje tlačítkem **Odemknout**.

Instalace: rozbalit ZIP v kořeni repozitáře, přepsat `index.html`, `app.js`, `src/ui/atlas-viewer.js`, `src/ui/atlas-cartography.js`; CSS a všechny mapové podklady ponechat. V ZIPu je i dokumentace.
