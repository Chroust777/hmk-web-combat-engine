'use strict';
/** Pochod I/B: no Bestiary follow-up; only live owned animals in selected team. */
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {transportVehicleReceipt93756:receipt,validateTransportVehicleHistory93756}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
const cid='scope-761',time=480,owner={id:'gm',name:'GM',kind:'PC',hmk:{livestock:[]}};
const data={characters:[owner],journal:[],inventory:[],campaignClock:{minute:time,characterIds:['gm']}};
let checks=0,i=0;function eq(a,b){assert.deepEqual(a,b);checks++}function pass(a){assert.ok(a);checks++}function bad(fn,re){assert.throws(fn,re);checks++}
function buy(id,beastId){const spec=livestockOffer(beastId);const a={id,name:id,ownerId:'gm',campaignId:cid,beastId,minute:400,mode:'free',priceD:spec.priceD,maxMB:spec.maxMasteryBoosts,transactionId:'tx-'+id};owner.hmk.livestock.push(a);data.journal.push({id:'buy-'+id,characterId:'gm',calendarCampaignId:cid,campaignMinute:400,livestockAcquisition:{animalId:id,ownerId:'gm',beastId,name:id,priceD:spec.priceD,mode:'free',transactionId:'tx-'+id}});return spec}
function live(id,breed){const actor={id,name:id,kind:'NPC',hmk:{verifiedMountedBreed:breed,healthState:initialCombatState()}};data.characters.push(actor);return actor}
function gear(id,type,itemId,key){const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);const entryId=key;data.journal.push({id:'gear-'+(++i),characterId:'gm',calendarCampaignId:cid,campaignMinute:430+i,stableHub574:{format:STABLE_HUB_FORMAT_574,type,animalId:id,ownerId:'gm',entryId,itemId,weightLb:item.weightLb,priceD:item.priceD,mode:'gift',transactionId:'txn-'+i,reason:'GM verified actual asset'}})}
function args(vehicleKey,conveyance,team,patientIds=['patient1','patient2'],otherLoadLb=150,weights={patient1:140,patient2:160}){return {data,campaignId:cid,minute:time,conveyance,vehicleKey,teamIds:team,stableAnimalIds:team,transportedMemberIds:patientIds,patientLoadLb:weights,otherLoadLb,gmCoLocated:true}}
const cartHorse=buy('h1','hmk-p122-beast-10');const h1=live('h1',cartHorse.breed);gear('h1','vehicle-add','hmk-p122-tack-03','cartH');gear('h1','tack-add','hmk-p122-tack-05','harnessH');
const oxspec=buy('o1','hmk-p122-beast-01'),o1=live('o1',oxspec.breed);gear('o1','vehicle-add','hmk-p122-tack-03','cartO');gear('o1','tack-add','hmk-p122-tack-06','harnessO');
const o2spec=buy('o2','hmk-p122-beast-01'),o2=live('o2',o2spec.breed);gear('o2','vehicle-add','hmk-p122-tack-13','wagonO');gear('o2','tack-add','hmk-p122-tack-06','harnessO2');
const dSpec=buy('d1','hmk-p122-beast-04'),d1=live('d1',dSpec.breed);gear('d1','vehicle-add','hmk-p122-tack-03','cartD');gear('d1','tack-add','hmk-p122-tack-05','harnessD');
const h= args('h1::cartH','cart',['h1']);eq(receipt(h).capacityLb,2000);eq(receipt(args('o1::cartO','cart',['o1'])).capacityLb,2500);
eq(receipt(args('o2::wagonO','wagon',['o1','o2'])).capacityLb,8000);
bad(()=>receipt(args('d1::cartD','cart',['d1'])),/doložená tažná skupina|tažná skupina/);
bad(()=>receipt(args('o2::wagonO','wagon',['o2','h1'])),/doložená tažná skupina|tažná skupina/);
bad(()=>receipt(args('o2::wagonO','wagon',['o2'])),/doložená tažná skupina|tažná skupina/);
bad(()=>receipt(args('o1::cartO','cart',['o1'],['patient1','patient2'],2500)),/překračuje/);
// Crucial independence: a gravely exhausted animal NOT selected in this episode does not block the other team.
h1.hmk.healthState.fatigue.weariness=40;
bad(()=>receipt(h),/Fatigue/);
eq(receipt(args('o2::wagonO','wagon',['o1','o2'])).capacityLb,8000);
eq(data.campaignClock.minute,time);eq(data.journal.filter(x=>x.calendarTimeEpisode).length,0);
h1.hmk.healthState.fatigue.weariness=0;
o1.hmk.healthState.shock='UNC';bad(()=>receipt(args('o2::wagonO','wagon',['o1','o2'])),/Shock/);
eq(receipt(h).capacityLb,2000);o1.hmk.healthState.shock='NONE';
// No effective change to unrelated PC, animals or inventory from read-only capacity preview.
const oldState=JSON.stringify(data);for(let q=0;q<10;q++)pass(receipt(h).totalLb===450);eq(JSON.stringify(data),oldState);
// Different campaign must not reuse stable assets.
bad(()=>receipt({...h,campaignId:'other'}),/neexistuje|nevlastní/);
console.log('PASS',checks,'Pochod: cart horse/ox cart/2 ox wagon, donkey and mixed teams rejected, incapacitated nonmember does not freeze other travellers, no clock or inventory write');
