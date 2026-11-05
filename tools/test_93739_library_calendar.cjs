/* Maintained historical regression: originally introduced in v93.739,
   re-anchored to current semantics rather than old version/tooltip wording. */
'use strict';const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=s=>fs.readFileSync(path.join(root,s),'utf8');
const app=read('app.js'),cal=read('src/integration/hmk-campaign-calendar-ui.js'),lib=read('library.css'),css=read('book-templates.css'),newCss=read('hmk-global-ui-93741.css'),html=read('index.html'),cold=read('src/integration/hmk-cold-gear-93740.js');
const tests=[
 ['release matches',/APP_VERSION='93\.741'/.test(app)&&html.includes('93.741')],
 ['slash B/E/P/F',app.includes(' / e${numeric(armourValue.e)} / p${numeric(armourValue.p)} / f${numeric(armourValue.f)}')],
 ['no covered location duplication',app.includes("const identicalProtection=baseProtection&&locRows.every")],
 ['omit nested duplicate coverage',app.includes("'locationProtection','coveredLocations'")],
 ['Cold Hazard source present',cold.includes("reference:'HMK p.149'")],
 ['Cold AV vs F Area AV explained',cold.includes('Ochrana F na krytých místech se započte do Area AV')],
 ['cloth and padded cloak explicit',cold.includes("'cloth cloak':listed['cloak (cloth)']")&&cold.includes("'padded cloak':listed['cloak (padded)']")],
 ['legality layer clarification',app.includes('Pravidla kombinování vrstev viz strany 117 a 119')],
 ['verified suit links only',app.includes('resolved.ok?resolved.parts[i]:null')],
 ['accurate suit link target',app.includes('link.dataset.libraryPartId')&&app.includes('libraryTab=\'armour\'')],
 ['printed page next to title',app.includes('library-source-inline')],
 ['two-column spread',css.includes('hc-calendar-overview-grid')],
 ['fullwidth stacked left weekly',newCss.includes('.hc-week-tabs>details')&&newCss.includes('width:100%!important')],
 ['no list height restriction',newCss.includes('max-height:none!important')],
 ['mobile stack preserved',css.includes('@media(max-width:800px){.content-calendar .hc-calendar-overview-grid')],
 ['printed page inline style',lib.includes('.library-item-title .library-source-inline')],
 ['part crossrefs still interactive but unadorned',lib.includes('.library-part-link')&&newCss.includes('text-decoration:none!important')]
];
for(const [label,ok] of tests)assert.ok(ok,label);
console.log('PASS '+tests.length+' maintained v93.739→v93.741 library/calendar historical contracts');
