'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const H=require('../src/integration/hmk-stable-hub-574.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {VEHICLES_TACK_P122,BEASTS_P122}=require('../src/rules/conveyance-printed-p122.js');
let tested=0;const check=(x,what)=>{assert.ok(x,what);tested++};const eq=(x,y,what)=>{assert.deepEqual(x,y,what);tested++};const wantFail=(data,substr,what)=>{assert.throws(()=>H.validateStableHub(data,livestockOffer),new RegExp(substr),what);tested++};
const cid='c93838',owner='a',minute=490;
const beast=(name,id)=>{const b=BEASTS_P122.find(x=>x.name===name);return {id,name,beastId:b.id,ownerId:owner,priceD:b.priceD,mode:'free',campaignId:cid,minute:0,maxMB:b.maxMasteryBoosts,transactionId:'tx-'+id,spec:livestockOffer(b.id)}};
const ox=beast('Bovine (Oxen)','ox'),horse=beast('Palfrey, riding horse','horse');
const data={characters:[{id:owner,hmk:{livestock:[ox,horse]}}],inventory:[],journal:[],campaignClock:{minute,campaignId:cid}};
const journal=(animal,x,id)=>({id,characterId:owner,calendarCampaignId:cid,campaignMinute:minute,createdAt:'now',title:'test',body:'test',stableHub574:{format:H.STABLE_HUB_FORMAT_574,animalId:animal.id,ownerId:owner,reason:'test transfer',...x}});
for(const a of [ox,horse])data.journal.push({id:'acq-'+a.id,characterId:owner,calendarCampaignId:cid,campaignMinute:0,livestockAcquisition:{animalId:a.id,ownerId:owner,beastId:a.beastId,name:a.name,priceD:a.priceD,mode:'free',transactionId:a.transactionId}});
const bags=VEHICLES_TACK_P122.find(x=>x.name==='Saddle bags, 15 lb');
data.journal.push(journal(ox,{type:'tack-add',entryId:'purchased-bags',itemId:bags.id,weightLb:bags.weightLb,priceD:bags.priceD,elephantMultiplier:1,mode:'gift',transactionId:'tx-bags'},'receipt-bags'));
check(H.validateStableHub(data,livestockOffer),'legacy purchased gear accepted');
eq(H.stableBurden(data,cid,ox).tackLb,3,'old bags weigh 3 lb');
const item={id:'physical-bags',currentWQ:null,characterId:owner,sourceItemId:'hmk:stable-gear:'+bags.id,snapshot:{id:'hmk:stable-gear:'+bags.id,name:bags.name,category:'other',properties:{stableTackId:bags.id,weightLb:bags.weightLb}},quantity:1,condition:'',slot:'carried',acquisition:{mode:'stable-recovery',at:'now',campaignId:cid,campaignMinute:minute,pricePence:0,stableSourceProofId:'receipt-bags',stableSourceEntryId:'purchased-bags'}};
data.inventory.push(item);
data.journal.push(journal(ox,{type:'legacy-gear-detach',entryId:'purchased-bags',inventoryId:item.id,role:'tack',itemId:bags.id,weightLb:3,sourceProofId:'receipt-bags'},'recovery'));
check(H.validateStableHub(data,livestockOffer),'historical purchase recovered once into inventory');
eq(H.stableBurden(data,cid,ox).tackLb,0,'source no longer carries bags');
eq(data.inventory.length,1,'exactly one physical inventory item');
const target={type:'inventory-gear-attach',entryId:'attached-horse',inventoryId:item.id,itemId:bags.id,role:'tack',name:bags.name,quantity:1,weightLb:3};
item.slot='stable';item.stableAnimalId=horse.id;
data.journal.push(journal(horse,target,'attach-horse'));
check(H.validateStableHub(data,livestockOffer),'atomic original stable purchase to horse legal');
eq(H.stableBurden(data,cid,horse).tackLb,3,'destination bears 3 lb');
eq(H.stableBurden(data,cid,ox).tackLb,0,'source remains 0 lb');
const tampered=structuredClone(data);tampered.inventory[0].snapshot.properties.weightLb=1;
wantFail(tampered,'historický postroj','tampered weight rejected');
const tamperedSource=structuredClone(data);tamperedSource.journal.find(x=>x.id==='recovery').stableHub574.sourceProofId='fake';
wantFail(tamperedSource,'původní doklad','fabricated source rejected');
const duplicated=structuredClone(data);duplicated.journal.push(journal(ox,{type:'legacy-gear-detach',entryId:'purchased-bags',inventoryId:'physical-bags',role:'tack',itemId:bags.id,weightLb:3,sourceProofId:'receipt-bags'},'recovery-2'));
wantFail(duplicated,'původní doklad','second recovery blocked');
for(const [gearName,src,dst,ok] of [['Harness, ox',ox,horse,false],['Harness, ox',ox,ox,true],['Saddle, riding',horse,ox,false],['Saddle bags, 15 lb',horse,horse,true],['Pack harness',horse,horse,true],['Saddle, riding',horse,horse,true],['Horseshoes, 4',horse,ox,false]]){
 const g=VEHICLES_TACK_P122.find(x=>x.name===gearName);eq(H.stableGearFit93838(g,dst).ok,ok,gearName+' on '+dst.name);
}
const dog=beast('Dog, guard','dog'),hawk=beast('Hawk • Falcon','hawk');
for(const animal of [dog,hawk])for(const gearName of ['Pack harness','Saddle bags, 15 lb']){const gear=VEHICLES_TACK_P122.find(g=>g.name===gearName);eq(H.stableGearFit93838(gear,animal).ok,false,animal.name+' cannot automatically use '+gearName);}
check(H.assertStableHubAppendOnly({journal:data.journal.slice(0,4)},data),'older purchase and original transaction proof preserved');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');for(const marker of ["stableEquipmentReference93839(a.ownerId)","stableGearMove93838(raw,animal,owner,campaignId,minute,p)","if(!ask(`Potvrdit skutečný přesun", "i.slot=other?'stable':'carried'", "type:'legacy-gear-detach'", "const APP_VERSION='93.840'"]){check(source.includes(marker),'UI/controller contract '+marker)}
console.log('PASS '+tested+' v93.839 physical stable custody / original proof / destination fit / tamper / atomic UI contract');
