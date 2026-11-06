'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {coldCatalogRule,coldInventoryChoices,resolveColdHazardEquipment,clothingColdText}=require('../src/integration/hmk-cold-gear-93740.js');const {applyInventoryItemEdit,transferInventoryItem}=require('../src/integration/hmk-inventory-edit.js');
let passed=0;const eq=(x,y)=>{assert.deepEqual(x,y);passed++},throws=(fn,re)=>{assert.throws(fn,re);passed++};
const {EXPEDITION_EQUIPMENT_P120}=require('../src/rules/possessions-printed.js');
const {missingPrintedArmourCatalogEntries}=require('../src/integration/armour-article-catalog.js');
const armour=missingPrintedArmourCatalogEntries([]);
const actor='PC1',other='PC2';
// v93.742: provenance, not an editable name, attests the printed Cold AV.
const obj=(id,name,category='other',slot='carried',extra={})=>{
 const row=category==='armor'?armour.find(x=>x.name===name):EXPEDITION_EQUIPMENT_P120.find(x=>x.name===name);
 const source=row?(category==='armor'?row:{id:`hmk:gear:${row.id}`,name:row.name,category:'other',builtin:true,properties:{weightLb:row.weightLb,referencePage:row.page}}):
  {id:'custom-'+id,name,category,builtin:false,properties:{}};
 return {id,characterId:actor,quantity:1,slot,condition:'',currentWQ:null,gearStowage:'normal',sourceItemId:source.id,snapshot:source,...extra};
};
for(const [name,expect] of [['Bedroll',1],['Bedroll, heavy',2],['Blanket',1],['Cloak (Cloth)',1],['Cloak (Padded)',2],['Cloth Cloak',1],['Padded Cloak',2],['Tent, 1-man',2]])eq(coldCatalogRule(obj('a',name, /^(Cloth|Padded) Cloak$/.test(name)?'armor':'other'))?.av,expect);
eq(coldCatalogRule(obj('a','Metal Boots','armor')),null);eq(clothingColdText({name:'Mail Hauberk',category:'armor'}).includes('nebyla doložena'),true); // v93.762: unknown F must not be presented as a numerical benefit
const cloak=obj('cloak','Padded Cloak','armor','worn'), blanket=obj('blanket','Blanket'), heavy=obj('heavy','Bedroll, heavy'), tent=obj('tent','Tent, 1-man'), cloth=obj('cloth','Cloak (Cloth)');
const inv=[cloak,blanket,heavy,tent,cloth];eq(coldInventoryChoices(inv,actor).automatic.length,1);eq(resolveColdHazardEquipment({inventory:inv,actorId:actor}).gearAV,2);
throws(()=>resolveColdHazardEquipment({inventory:inv,actorId:actor,gearId:'blanket'}),/potvrdit/);
eq(resolveColdHazardEquipment({inventory:inv,actorId:actor,gearId:'blanket',usedConfirmed:true}).gearAV,2); // no cloak + blanket stacking
const full=resolveColdHazardEquipment({inventory:inv,actorId:actor,gearId:'heavy',shelterId:'tent',usedConfirmed:true,fireFS:3,fireConfirmed:true});eq(full.gearAV,2);eq(full.shelterAV,2);eq(full.fireFS,3);eq(full.gearSourceId,'cloak');
throws(()=>resolveColdHazardEquipment({inventory:inv,actorId:actor,shelterId:'tent'}),/potvrdit/);
throws(()=>resolveColdHazardEquipment({inventory:inv,actorId:actor,fireFS:2}),/Oheň/);
throws(()=>resolveColdHazardEquipment({inventory:inv,actorId:actor,gearId:'fake',usedConfirmed:true}),/není v dostupném/);
eq(resolveColdHazardEquipment({inventory:inv,actorId:actor,shelterId:'cave',usedConfirmed:true}).shelterAV,3);
const locked=[obj('cloak','Padded Cloak','armor','chest'),obj('bed','Bedroll','other','stable'),obj('tent','Tent, 1-man','other','carried',{hmkEquipmentRepair:{status:'damaged'}})];eq(coldInventoryChoices(locked,actor).automatic.length,0);eq(coldInventoryChoices(locked,actor).shelters.length,0);
const doc={characters:[{id:actor},{id:other}],inventory:[obj('x','Cloak (Cloth)')]};let patched=applyInventoryItemEdit(doc,{ownerId:actor,itemId:'x',slot:'carried',quantity:1,currentWQ:null,condition:'',coldWorn:true});eq(patched.inventory[0].coldWorn,true);eq(coldInventoryChoices(patched.inventory,actor).automatic.length,1);eq(doc.inventory[0].coldWorn,undefined);throws(()=>applyInventoryItemEdit(doc,{ownerId:actor,itemId:'x',slot:'carried',quantity:2,currentWQ:null,condition:'',coldWorn:true}),/Cold Hazard/);
patched=transferInventoryItem(patched,{ownerId:actor,itemId:'x',recipientId:other});eq(patched.inventory[0].coldWorn,false);eq(coldInventoryChoices(patched.inventory,other).automatic.length,0);
const f=fs.readFileSync(path.join(root,'app.js'),'utf8');eq(f.includes('data-library-part-id="${esc(part.id)}"'),true);eq(f.includes("const card=[...document.querySelectorAll('[data-library-item]')].find(x=>x.dataset.libraryItem===itemId)"),true);eq(f.includes('${coldSummary}${table(equippedRows'),true);
console.log('PASS '+passed+' cold gear rules, identity, on-body status, transfer, stacked gear and UI source contracts');
