const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),cal=fs.readFileSync(path.join(root,'src/integration/hmk-campaign-calendar-ui.js'),'utf8'),lib=fs.readFileSync(path.join(root,'library.css'),'utf8'),css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tests=[
 ['release version',/APP_VERSION='93\.739'/.test(app)&&html.includes('v93.739')],
 ['slash B/E/P/F',app.includes(' / e${numeric(armourValue.e)} / p${numeric(armourValue.p)} / f${numeric(armourValue.f)}')],
 ['remove covered locations semantic duplication',app.includes("key==='coveredLocations'&&locRows.length")],
 ['nested coverage skip',app.includes("'locationProtection','coveredLocations'")],
 ['separate cold bonus',app.includes('Cold Hazard AV +${coldBonus}')],
 ['no F cold conflation',app.includes('Ochrana F značí ochranu před Fire/Frost')],
 ['cloth and padded cloak',app.includes("p.material==='D'?2:1")],
 ['replace pending layer note',app.includes('Pravidla kombinování vrstev viz strany 117 a 119')],
 ['suit verified links only',app.includes('resolved.ok?resolved.parts[i]:null')],
 ['link destination',app.includes("libraryTab='armour';libraryPage=0;query=link.dataset.libraryPartSearch")],
 ['inline printed source',app.includes('library-source-inline')],
 ['two-column calendar',cal.includes('hc-calendar-overview-grid')],
 ['stack left sidebar',css.includes('.hc-calendar-overview-left .hc-week-tabs{display:flex;flex-direction:column')],
 ['no constrained list height',css.includes('.hc-calendar-overview-left .hc-week-list{max-height:none')],
 ['mobile stacking',css.includes('@media(max-width:800px){.content-calendar .hc-calendar-overview-grid')],
 ['source inline style',lib.includes('.library-item-title .library-source-inline')],
 ['suit part interaction',lib.includes('.library-part-link')]
];
for(const [name,ok] of tests)assert.ok(ok,name);
console.log(`PASS ${tests.length} v93.739 library/calendar contracts`);
