'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {transportVehicleReceipt93756,availableTransportVehicles93756,validateTransportVehicleHistory93756}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {validateStableHub,stableHubProjection,STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const cid='series-758',owner={id:'gm',name:'GM',kind:'PC',hmk:{livestock:[]}},data={characters:[owner],inventory:[],journal:[],campaignClock:{minute:480}};
let n=0,seq=0;const ok=(v,m)=>{assert.ok(v,m);n++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++},bad=(f,re)=>{assert.throws(f,re);n++};
function livestock(id){const b=livestockOffer('hmk-p122-beast-10');owner.hmk.livestock.push({id,name:id,ownerId:owner.id,campaignId:cid,beastId:b.id,minute:400,mode:'free',priceD:b.priceD,maxMB:b.maxMasteryBoosts,transactionId:'tx-'+id});data.characters.push({id,name:id,kind:'NPC',hmk:{verifiedMountedBreed:'palfrey',healthState:initialCombatState()}});data.journal.push({id:'buy-'+id,characterId:owner.id,calendarCampaignId:cid,campaignMinute:400,livestockAcquisition:{animalId:id,ownerId:owner.id,beastId:b.id,name:id,priceD:b.priceD,mode:'free',transactionId:'tx-'+id}})}
function op(animalId,type,entryId,at,itemId=null,extra={}){const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);const x={format:STABLE_HUB_FORMAT_574,type,animalId,ownerId:owner.id,entryId,reason:'GM confirms actual stable action',transactionId:'finance-'+(seq+1),...(item?{itemId:item.id,weightLb:item.weightLb,priceD:item.priceD,mode:'gift'}:{}),...extra};data.journal.push({id:'op-'+(++seq),characterId:owner.id,calendarCampaignId:cid,campaignMinute:at,stableHub574:x})}
function args(at,which,animalIds,patients,weights,other){return {data,campaignId:cid,minute:at,conveyance:which.includes('wagon')?'wagon':'cart',vehicleKey:which,teamIds:animalIds,stableAnimalIds:animalIds,transportedMemberIds:patients,patientLoadLb:weights,otherLoadLb:other,gmCoLocated:true}}
function commit(patients,at,receipt){data.journal.push({id:'episode-'+at,calendarCampaignId:cid,campaignMinute:at,calendarTimeEpisode:{format:'hmk-time-episode-v1',kind:'travel',startMinute:at,endMinute:at+5,minutes:5,conveyance:receipt.conveyance,memberIds:['guide',...patients],transportedMemberIds:patients,settings:{stableAnimalIds:receipt.teamIds},transportProof:{vehicle:receipt}}});data.campaignClock.minute=at+5}
livestock('horse-a');livestock('horse-b');
op('horse-a','vehicle-add','cart-a',450,'hmk-p122-tack-03');op('horse-a','tack-add','ha',451,'hmk-p122-tack-05');op('horse-b','tack-add','hb',452,'hmk-p122-tack-05');
const first=transportVehicleReceipt93756(args(480,'horse-a::cart-a',['horse-a'],['patient-1','patient-2'],{'patient-1':150,'patient-2':175},250));
eq(first.totalLb,575);eq(first.capacityLb,2000);commit(['patient-1','patient-2'],480,first);
op('horse-a','vehicle-cargo-add','cart-cargo',485,null,{vehicleId:'cart-a',name:'Bedrolls',weightLb:200});
eq(transportVehicleReceipt93756(args(490,'horse-a::cart-a',['horse-a'],['patient-1','patient-2'],{'patient-1':150,'patient-2':175},250)).cargoLb,200);
bad(()=>transportVehicleReceipt93756(args(490,'horse-a::cart-a',['horse-a'],['patient-1','patient-2'],{'patient-1':150,'patient-2':175},1500)),/překračuje/);
op('horse-a','vehicle-cargo-remove','cart-cargo',495);
op('horse-a','vehicle-remove','cart-a',496);
op('horse-b','vehicle-add','cart-b',497,'hmk-p122-tack-03');
eq(availableTransportVehicles93756(data,cid).map(x=>x.key),['horse-b::cart-b']);
const second=transportVehicleReceipt93756(args(500,'horse-b::cart-b',['horse-b'],['patient-2'],{'patient-2':175},210));
eq(second.totalLb,385);ok(second.vehicleId!=='cart-a');commit(['patient-2'],500,second);
// An incapacitated team member must not paralyse the remaining campaign or a differently owned cart.
data.characters.find(c=>c.id==='horse-a').hmk.healthState.fatigue.weariness=40;
bad(()=>transportVehicleReceipt93756(args(510,'horse-b::cart-b',['horse-a'],['patient-2'],{'patient-2':175},210)),/připojené/);
const independent=transportVehicleReceipt93756(args(510,'horse-b::cart-b',['horse-b'],['patient-3'],{'patient-3':200},200));
eq(independent.totalLb,400);commit(['patient-3'],510,independent);
op('horse-a','vehicle-add','wagon-a',520,'hmk-p122-tack-13');
bad(()=>transportVehicleReceipt93756(args(525,'horse-a::wagon-a',['horse-a','horse-b'],['patient-1','patient-3'],{'patient-1':150,'patient-3':200},400)),/Fatigue/);
data.characters.find(c=>c.id==='horse-a').hmk.healthState.fatigue.weariness=0;
const last=transportVehicleReceipt93756(args(525,'horse-a::wagon-a',['horse-a','horse-b'],['patient-1','patient-3'],{'patient-1':150,'patient-3':200},400));
eq(last.capacityLb,6400);eq(last.totalLb,750);commit(['patient-1','patient-3'],525,last);
for(const q of ['horse-a','horse-b'])ok(stableHubProjection(data,cid,q).tack.length===1);
ok(stableHubProjection(data,cid,'horse-a').vehicles.length===1);ok(stableHubProjection(data,cid,'horse-b').vehicles.length===1);
ok(validateStableHub(data));ok(validateTransportVehicleHistory93756(data));
const tampered=structuredClone(data);tampered.journal.find(j=>j.id==='episode-500').calendarTimeEpisode.transportProof.vehicle.otherLoadLb++;
bad(()=>validateTransportVehicleHistory93756(tampered),/změněny/);
console.log('PASS',n,'sequential real-cart->changed-cargo->new-cart->incapacitated-horse bypass->wagon, historic receipts intact, no duplicate stable entries');
