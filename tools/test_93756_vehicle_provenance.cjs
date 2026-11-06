'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {transportVehicleReceipt93756,availableTransportVehicles93756,validateTransportVehicleHistory93756}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
let n=0;function pass(x,m){assert.ok(x,m);n++}function eq(a,b,m){assert.deepEqual(a,b,m);n++}function bad(f,re){assert.throws(f,re);n++}
const cid='audit-vehicle-756',minute=480,beastName='hmk-p122-beast-10';
function fake(){
 const owner={id:'gm',name:'Owner',hmk:{livestock:[]}},data={characters:[owner],journal:[],inventory:[],campaignClock:{minute}};
 const mk=(id,beast='hmk-p122-beast-10')=>{const spec=livestockOffer(beast);
  owner.hmk.livestock.push({id,name:'Real '+id,ownerId:owner.id,campaignId:cid,beastId:beast,minute:400,mode:'free',priceD:spec.priceD,maxMB:spec.maxMasteryBoosts,transactionId:'tx-'+id});
  data.journal.push({id:'receipt-'+id,characterId:owner.id,calendarCampaignId:cid,campaignMinute:400,
   livestockAcquisition:{animalId:id,ownerId:owner.id,beastId:beast,name:'Real '+id,priceD:spec.priceD,mode:'free',transactionId:'tx-'+id}});
  return id;
 };
 const operation=(animalId,kind,itemId,entryId,extra={})=>{const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);
  data.journal.push({id:'stable-'+entryId,characterId:owner.id,calendarCampaignId:cid,campaignMinute:450,
   stableHub574:{format:STABLE_HUB_FORMAT_574,type:kind,animalId,ownerId:owner.id,entryId,itemId,
    weightLb:item?.weightLb,priceD:item?.priceD,reason:'GM documented ownership',mode:'gift',...extra}})};
 return {data,mk,operation};
}
const x=fake(),{data,mk,operation}=x;mk('horse1');mk('horse2');
operation('horse1','vehicle-add','hmk-p122-tack-03','cart1');
operation('horse1','tack-add','hmk-p122-tack-05','harness1');
operation('horse2','tack-add','hmk-p122-tack-05','harness2');
let cars=availableTransportVehicles93756(data,cid);eq(cars.length,1);
const base={data,campaignId:cid,minute,conveyance:'cart',vehicleKey:cars[0].key,
 teamIds:['horse1'],stableAnimalIds:['horse1'],transportedMemberIds:['patient1'],
 patientLoadLb:{patient1:170},otherLoadLb:200,gmCoLocated:true};
const p=transportVehicleReceipt93756(base);eq(p.capacityLb,2000);eq(p.totalLb,370);eq(p.patientLoadLb.patient1,170);
bad(()=>transportVehicleReceipt93756({...base,gmCoLocated:false}),/GM/);
bad(()=>transportVehicleReceipt93756({...base,vehicleKey:'fictional'}),/neexistuje/);
bad(()=>transportVehicleReceipt93756({...base,teamIds:['horse2'],stableAnimalIds:['horse2']}),/připojené/);
bad(()=>transportVehicleReceipt93756({...base,teamIds:[],stableAnimalIds:[]}),/tažná/);
bad(()=>transportVehicleReceipt93756({...base,teamIds:['horse1','horse2'],stableAnimalIds:['horse1','horse2']}),/tažná/);
bad(()=>transportVehicleReceipt93756({...base,patientLoadLb:{patient1:170,fictional:50}}),/každý pacient/);
bad(()=>transportVehicleReceipt93756({...base,patientLoadLb:{patient1:0}}),/každý pacient/);
bad(()=>transportVehicleReceipt93756({...base,otherLoadLb:0}),/kladnou/);
bad(()=>transportVehicleReceipt93756({...base,otherLoadLb:1831}),/překračuje/);
bad(()=>transportVehicleReceipt93756({...base,conveyance:'wagon'}),/neodpovídá/);
// Two patients, exact capacity boundary, without doubling an existing cargo receipt.
const two={...base,transportedMemberIds:['patient1','patient2'],patientLoadLb:{patient1:170,patient2:230},otherLoadLb:1600};
eq(transportVehicleReceipt93756(two).totalLb,2000);
bad(()=>transportVehicleReceipt93756({...two,otherLoadLb:1601}),/překračuje/);
operation('horse1','vehicle-add','hmk-p122-tack-13','wagon1');
cars=availableTransportVehicles93756(data,cid);
let wagonKey=cars.find(c=>c.conveyance==='wagon').key;
const wagon={...two,vehicleKey:wagonKey,conveyance:'wagon',teamIds:['horse1','horse2'],stableAnimalIds:['horse1','horse2'],otherLoadLb:3000};
eq(transportVehicleReceipt93756(wagon).capacityLb,6400);
// 1 ox: cart max 2500, two oxen: wagon max 8000.
const ox=fake(),ox1=ox.mk('ox1','hmk-p122-beast-01'),ox2=ox.mk('ox2','hmk-p122-beast-01');
ox.operation(ox1,'vehicle-add','hmk-p122-tack-13','wagonOx');
ox.operation(ox1,'tack-add','hmk-p122-tack-06','harnessOx1');ox.operation(ox2,'tack-add','hmk-p122-tack-06','harnessOx2');
const oxCar=availableTransportVehicles93756(ox.data,cid)[0];
eq(transportVehicleReceipt93756({...wagon,data:ox.data,vehicleKey:oxCar.key,teamIds:[ox1,ox2],stableAnimalIds:[ox1,ox2]}).capacityLb,8000);
// Recorded weight is checked when archived episode is reloaded; fake alteration fails.
const oldEpisode={format:'hmk-time-episode-v1',kind:'travel',startMinute:minute,endMinute:minute+5,minutes:5,conveyance:'wagon',
 memberIds:['guide','patient1','patient2'],transportedMemberIds:['patient1','patient2'],
 settings:{stableAnimalIds:['horse1','horse2']},transportProof:{vehicle:transportVehicleReceipt93756(wagon)}};
// Note: a complete application record also has its original detailed medical and weather receipts.
const snapshot={...data,journal:[...data.journal,{id:'confirmed-trip',campaignMinute:minute,calendarCampaignId:cid,calendarTimeEpisode:oldEpisode}]};
pass(validateTransportVehicleHistory93756(snapshot));
const altered=structuredClone(snapshot);altered.journal.at(-1).calendarTimeEpisode.transportProof.vehicle.otherLoadLb=3050;
bad(()=>validateTransportVehicleHistory93756(altered),/změněny/);
console.log('PASS',n,'real vehicle/teams/harness/patients/capacity/archived provenance');
