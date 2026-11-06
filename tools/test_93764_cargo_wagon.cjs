'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {transportVehicleReceipt93756,availableTransportVehicles93756,validateTransportVehicleHistory93756}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {confirmTravelPosition93764,validateTravelPositions93764,travelPositionAt93764}=require('../src/integration/hmk-trek-positions-93764.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {prepareStableAnimalHealthRegistration93759}=require('../src/integration/hmk-stable-animal-health-registration-93759.js');
const {STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};const bad=(f,re)=>{assert.throws(f,re);n++};
const campaignId='cargo-audit',minute=360;
const owner={id:'gm',name:'Owner',hmk:{livestock:[]}},data={characters:[owner],journal:[],inventory:[],campaignClock:{minute}};
const spec=livestockOffer('hmk-p122-beast-10');
owner.hmk.livestock.push({id:'horse',name:'Hauler',ownerId:'gm',campaignId,beastId:'hmk-p122-beast-10',minute:300,mode:'free',priceD:spec.priceD,maxMB:spec.maxMasteryBoosts,transactionId:'tx-horse'});
data.journal.push({id:'buy',characterId:'gm',calendarCampaignId:campaignId,campaignMinute:300,livestockAcquisition:{animalId:'horse',ownerId:'gm',beastId:'hmk-p122-beast-10',name:'Hauler',priceD:spec.priceD,mode:'free',transactionId:'tx-horse'}});
function op(type,itemId,entryId){const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);
 data.journal.push({id:'j-'+entryId,characterId:'gm',calendarCampaignId:campaignId,campaignMinute:320,
  stableHub574:{format:STABLE_HUB_FORMAT_574,type,animalId:'horse',ownerId:'gm',entryId,itemId,weightLb:item.weightLb,priceD:item.priceD,reason:'GM confirmed',mode:'gift'}});}
op('vehicle-add','hmk-p122-tack-03','cart');op('tack-add','hmk-p122-tack-05','harness');
const health=prepareStableAnimalHealthRegistration93759({data,campaignId,minute,animalId:'horse',proofId:'health-horse',gmConfirmed:true,examinedHealthy:true,
 examNote:'GM visually inspected the same horse and documented no unrecorded wounds, fatigue, coma or Shock.'});
data.characters.push(health.actor);data.journal.push({id:'health-horse',characterId:'gm',calendarCampaignId:campaignId,campaignMinute:minute,animalHealthRegistration93759:health.proof});
const car=availableTransportVehicles93756(data,campaignId)[0];
const args={data,campaignId,minute,conveyance:'cart',vehicleKey:car.key,teamIds:['horse'],stableAnimalIds:['horse'],transportedMemberIds:[],patientLoadLb:{},otherLoadLb:150,gmCoLocated:true};
const receipt=transportVehicleReceipt93756(args);
eq(receipt.patientLoadLb,{});eq(receipt.passengerLb,0);eq(receipt.totalLb,150);eq(receipt.vehicleName,'Cart, 2-wheel');
bad(()=>transportVehicleReceipt93756({...args,vehicleKey:'fiction'}),/neexistuje/);
bad(()=>transportVehicleReceipt93756({...args,gmCoLocated:false}),/GM/);
bad(()=>transportVehicleReceipt93756({...args,otherLoadLb:0}),/kladnou/);
bad(()=>transportVehicleReceipt93756({...args,teamIds:[]}),/tažná/);
const p=confirmTravelPosition93764({journal:data.journal,campaignId,minute,memberIds:['gm'],stableAnimalIds:['horse'],vehicleKey:car.key,
 fromLocation:'Jižní brod',toLocation:'Severní tábor',gmConfirmed:true});
const episode={format:'hmk-time-episode-v1',kind:'travel',startMinute:minute,endMinute:minute+5,minutes:5,conveyance:'cart',memberIds:['gm'],
 settings:{travelFromLocation:'Jižní brod',travelToLocation:'Severní tábor',stableAnimalIds:['horse'],animalIds:[]},
 transportProof:{format:'gm-transport-confirmation-v93.756',vehicle:receipt},travelPositionProof:p};
const record={id:'ride',calendarCampaignId:campaignId,campaignMinute:minute,calendarTimeEpisode:episode};
const journal=[...data.journal,record];
eq(validateTransportVehicleHistory93756({...data,journal}),true);eq(validateTravelPositions93764(journal),true);
eq(travelPositionAt93764(journal,campaignId,minute+5).get('vehicle:'+car.key).location,'Severní tábor');
const missingVehicle=structuredClone(journal);delete missingVehicle.at(-1).calendarTimeEpisode.transportProof;
bad(()=>validateTravelPositions93764(missingVehicle),/skutečný vůz/);
const missingPosition=structuredClone(journal);delete missingPosition.at(-1).calendarTimeEpisode.travelPositionProof;
bad(()=>validateTravelPositions93764(missingPosition),/povinný GM doklad/);
const tampered=structuredClone(journal);tampered.at(-1).calendarTimeEpisode.transportProof.vehicle.totalLb=1000;
bad(()=>validateTransportVehicleHistory93756({...data,journal:tampered}),/změněny/);
console.log('PASS '+n+' empty-patient real cargo-cart provenance + Stable health + location');
