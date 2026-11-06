'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {transportVehicleReceipt93756}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
const cid='live-757',animalId='draft-horse',owner={id:'keeper',name:'Keeper',hmk:{livestock:[]}};
const animal={id:animalId,name:'Horse',kind:'Animal',hmk:{verifiedMountedBreed:'palfrey',healthState:initialCombatState()}};
const spec=livestockOffer('hmk-p122-beast-10');
owner.hmk.livestock.push({id:animalId,name:'Horse',ownerId:'keeper',campaignId:cid,beastId:'hmk-p122-beast-10',minute:400,mode:'free',priceD:spec.priceD,maxMB:spec.maxMasteryBoosts,transactionId:'tx-horse'});
const data={characters:[owner,animal],journal:[{id:'receipt-horse',characterId:'keeper',calendarCampaignId:cid,campaignMinute:400,livestockAcquisition:{animalId,ownerId:'keeper',beastId:'hmk-p122-beast-10',name:'Horse',priceD:spec.priceD,mode:'free',transactionId:'tx-horse'}}],inventory:[]};
function op(type,itemId,entryId){const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);data.journal.push({id:'stable-'+entryId,characterId:'keeper',calendarCampaignId:cid,campaignMinute:450,stableHub574:{format:STABLE_HUB_FORMAT_574,type,animalId,ownerId:'keeper',entryId,itemId,weightLb:item.weightLb,priceD:item.priceD,reason:'GM evidence',mode:'gift'}})}
op('vehicle-add','hmk-p122-tack-03','cart1');op('tack-add','hmk-p122-tack-05','harness1');
const args={data,campaignId:cid,minute:480,conveyance:'cart',vehicleKey:animalId+'::cart1',teamIds:[animalId],stableAnimalIds:[animalId],transportedMemberIds:['patient1','patient2'],patientLoadLb:{patient1:170,patient2:200},otherLoadLb:100,gmCoLocated:true};
let n=0;function pass(){assert.equal(transportVehicleReceipt93756(args).totalLb,470);n++}function bad(re){assert.throws(()=>transportVehicleReceipt93756(args),re);n++}
pass();animal.hmk.healthState.fatigue.weariness=20;pass();animal.hmk.healthState.fatigue.weariness=39;pass();animal.hmk.healthState.fatigue.weariness=40;bad(/Fatigue/);animal.hmk.healthState.fatigue.weariness=0;
for(const shock of ['STN','INC','UNC','KIA']){animal.hmk.healthState.shock=shock; if(shock!=='KIA')animal.hmk.healthState.shockOriginRound=1;bad(/Shock/);}animal.hmk.healthState=initialCombatState();
animal.hmk.healthState.coma={active:true};bad(/Coma/);animal.hmk.healthState=initialCombatState();
animal.hmk.healthState.wounds=[{id:'grievous',location:'hlg',severity:'G',level:5,aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false}];bad(/Grievous/);animal.hmk.healthState=initialCombatState();
animal.hmk.healthState.wounds=[{id:'serious',location:'hlg',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false}];pass();
console.log('PASS',n,'live draught animal health: 2 patients, healthy/injured/exhausted/shock/coma/grievous');
