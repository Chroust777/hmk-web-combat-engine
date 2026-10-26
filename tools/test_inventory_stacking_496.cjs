'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const code=fs.readFileSync(path.join(root,'src/integration/hmk-inventory-overview.js'),'utf8');
 const {projectInventoryRows,groupInventoryDisplayRows,inventoryTotals}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 let checks=0;const check=(expr,msg)=>{assert.ok(expr,msg);checks++};
 const gear=(id,o={})=>({id,characterId:'A',quantity:1,sourceItemId:'water',slot:'carried',
  snapshot:{id:'water',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2,pricePence:24}},currentWQ:null,condition:'',...o});
 const base=[gear('a'),gear('b')];const original=JSON.stringify(base);
 const rows=projectInventoryRows(base);const stacked=groupInventoryDisplayRows(rows);
 check(stacked.length===1,'identical objects stack into single display row');
 check(stacked[0].qty===2&&stacked[0].totalWeight===4&&stacked[0].totalPrice===48,'quantities, weight, price add');
 check(stacked[0].itemIds.join(',')==='a,b','both original IDs survive');
 check(JSON.stringify(base)===original,'render grouping cannot change the database');
 check(inventoryTotals(rows).knownWeightLb===inventoryTotals(stacked).knownWeightLb,'no change to weight projection');
 const splitCases=[
  [gear('a',{condition:'poškozeno'}),gear('b')],
  [gear('a',{currentWQ:8}),gear('b',{currentWQ:10})],
  [gear('a',{slot:'chest'}),gear('b')],
  [gear('a',{waterContentsLb:5}),gear('b',{waterContentsLb:0})],
  [gear('a',{gearStowage:'awkward'}),gear('b',{gearStowage:'backpack'})],
  [gear('a',{snapshot:{id:'water',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:3,pricePence:24}}}),gear('b')]
 ];
 for(const pair of splitCases)check(groupInventoryDisplayRows(projectInventoryRows(pair)).length===2,'distinct physical state must not stack');
 const full=groupInventoryDisplayRows(projectInventoryRows([gear('a',{waterContentsLb:5}),gear('b',{waterContentsLb:5})]));
 check(full.length===1&&full[0].totalWeight===14,'equally filled waterskins stack with correct content weight');
 const half=groupInventoryDisplayRows(projectInventoryRows([gear('a',{quantity:.5,sourceItemId:'hmk:gear:hmk-p120-027'}),gear('b',{quantity:1,sourceItemId:'hmk:gear:hmk-p120-027'})]));
 check(half.length===1&&half[0].qty===1.5&&half[0].totalWeight===3,'physical half-day rations retain totals');
 const html=fs.readFileSync(path.join(root,'app.js'),'utf8'),css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 check(html.includes('groupInventoryDisplayRows(sourceRows)')&&html.includes('inventoryTotals(sourceRows)'),'stacking only in read-only view');
 check(html.includes('data-inv-member-select')&&html.includes("menu?.querySelector('[data-inv-member-select]')"),'individual original item selection before action');
 check(html.includes('catalog.slice().sort('),'alphabetical catalogue selector');
 check(html.includes('const currentWQ=Number.isSafeInteger(baseQuality)'),'initial WQ is catalog-derived');
 check(!html.includes("field('currentWQ','Aktuální WQ kusu"),'no redundant manual currentWQ field on add');
 check(html.includes('hc-provision-vessel-purchase" open'),'vessel acquisition open by default');
 check(html.includes("'Nesené předměty'"),'no unassigned display group');
 check(css.includes('v93.496')&&css.includes('repeat(4,minmax(0,1fr))'),'four-card desktop registry');
 check(index.includes('v93.496')&&index.includes('hmk-app.bundle.js?v=93.496'),'version cache correct');
 console.log('PASS',checks,'v93.496 inventory stacking, distinct condition/quality/contents/slot, immutable IDs, provenance and UI');
})().catch(e=>{console.error(e);process.exit(1)});
