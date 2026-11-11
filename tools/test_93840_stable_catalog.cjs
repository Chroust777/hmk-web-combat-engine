'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {BEASTS_P122,VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {stableGearFit93838}=require('../src/integration/hmk-stable-hub-574.js');
const {libraryPurchaseOffer,coinBalance,prepareLibraryPurchase}=require('../src/integration/hmk-library-economy.js');
const app=fs.readFileSync(root+'/app.js','utf8'),css=fs.readFileSync(root+'/styles.css','utf8'),html=fs.readFileSync(root+'/index.html','utf8');
let n=0;const check=(v,m)=>{assert.ok(v,m);n++},eq=(x,y,m)=>{assert.deepEqual(x,y,m);n++};
eq(BEASTS_P122.length,16,'all species');
const names=new Set(VEHICLES_TACK_P122.map(x=>x.name));
for(const b of BEASTS_P122){
 const sp=livestockOffer(b.id);check(!!sp,'known livestock '+b.name);
 const suitable=VEHICLES_TACK_P122.filter(t=>t.name!=='Wheel'&&stableGearFit93838(t,{spec:sp}).ok);
 if(b.name.startsWith('Dog,')||b.name.startsWith('Hawk'))eq(suitable.length,0,'No unsupported gear purchase '+b.name);
 if(b.name==='Bovine (Oxen)'){
  check(suitable.some(g=>g.name==='Harness, ox'),'Ox-specific harness');
  check(!suitable.some(g=>g.name==='Saddle, riding'),'No bogus ox saddle');
 }
 if(b.name==='Palfrey, riding horse'){
  check(suitable.some(g=>g.name==='Saddle, riding'),'Riding saddle');
  check(!suitable.some(g=>g.name==='Cart, 2-wheel'),'No unverified riding-horse cart');
 }
 if(b.name==='Elephant')check(suitable.some(g=>g.name==='Pack harness'),'Special factor must remain separate');
}
for(const gear of VEHICLES_TACK_P122){
 const i={properties:{pricePence:gear.priceD,weightLb:gear.weightLb,stableTackId:gear.id}};
 eq(libraryPurchaseOffer(i)?.pricePence,gear.priceD,'Library item price for '+gear.name);
}
for(const snippet of ["const APP_VERSION='93.840'",'stableEquipmentReference93839(a.ownerId)','data-hmk-stable-guide-buy','data-library-form="item"','data-hmk-stable-guide-use','data-hmk-stable-guide-gear','stableEquipmentPurpose93839(g,beast)','v.useMode','receiver.id!==f.closest',"if(f.hasAttribute('data-hmk-stable-guide-buy'))",'let stableEquipmentGuideOpen93839=false','node.isConnected','hmk-stable-compact-table','aria-label="Kam předat','stableGearMove93838(raw,animal,owner,campaignId,minute,p)'])check(app.includes(snippet),'source contract '+snippet);
for(const snippet of ['parchment_dynamic_texture.png','hmk-stable-guide-buy','grid-template-columns:minmax(0,1fr) minmax(0,1fr)','hmk-stable-gear-action .hmk-stable-move','hmk-stable-guide-field .sr-only'])check(css.includes(snippet),'style contract '+snippet);
check(html.includes('v93.840')&&html.includes('93.840-interaction-audit'),'Release version consistent');
console.log('PASS',n,'species catalogue, forbidden fits, library printed prices, source, rendered controls and parchment styles');
