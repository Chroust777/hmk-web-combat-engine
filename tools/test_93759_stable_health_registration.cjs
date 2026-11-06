'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),original=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):original(m,f);
const {prepareStableAnimalHealthRegistration93759:register}=require('../src/integration/hmk-stable-animal-health-registration-93759.js');
const {transportVehicleReceipt93756:receipt,validateTransportVehicleHistory93756:history}=require('../src/integration/hmk-travel-vehicle-93756.js');
const {livestockOffer}=require('../src/integration/hmk-livestock-562.js');
const {STABLE_HUB_FORMAT_574}=require('../src/integration/hmk-stable-hub-574.js');
const {VEHICLES_TACK_P122}=require('../src/rules/conveyance-printed-p122.js');
const cid='vet-test',owner={id:'owner',name:'GM owner',kind:'PC',hmk:{livestock:[]}};
const data={characters:[owner],journal:[],inventory:[],campaignClock:{minute:480,characterIds:['owner']}};
let checks=0;const yes=(v)=>{assert.ok(v);checks++},eq=(a,b)=>{assert.deepEqual(a,b);checks++},bad=(fn,regex)=>{assert.throws(fn,regex);checks++};
function buy(animalId,beastId='hmk-p122-beast-10'){
 const spec=livestockOffer(beastId);owner.hmk.livestock.push({id:animalId,name:animalId,ownerId:owner.id,campaignId:cid,beastId,minute:400,mode:'free',priceD:spec.priceD,maxMB:spec.maxMasteryBoosts,transactionId:'tx-'+animalId});
 data.journal.push({id:'buy-'+animalId,characterId:owner.id,calendarCampaignId:cid,campaignMinute:400,livestockAcquisition:{animalId,ownerId:owner.id,beastId,name:animalId,priceD:spec.priceD,mode:'free',transactionId:'tx-'+animalId}});
}
function st(animalId,type,itemId,entryId){const item=VEHICLES_TACK_P122.find(x=>x.id===itemId);data.journal.push({id:'st-'+entryId,characterId:owner.id,calendarCampaignId:cid,campaignMinute:420,stableHub574:{format:STABLE_HUB_FORMAT_574,type,animalId,ownerId:owner.id,entryId,itemId,weightLb:item.weightLb,priceD:item.priceD,mode:'gift',reason:'GM confirmed original stable equipment'}})}
function reg(animalId,proofId='health-'+animalId){return register({data,campaignId:cid,minute:480,animalId,proofId,gmConfirmed:true,examinedHealthy:true,examNote:'GM personally examined animal; healthy, no fatigue, shock, wounds, coma or due obligations.'})}
function commitReg(animalId){const r=reg(animalId);data.characters.push(r.actor);data.campaignClock.characterIds.push(animalId);data.journal.push({id:'health-'+animalId,characterId:owner.id,calendarCampaignId:cid,campaignMinute:480,animalHealthRegistration93759:r.proof});return r}
function args(animalId,conveyance='cart',teamIds=[animalId],vehicleId='cart-a'){return {data,campaignId:cid,minute:480,conveyance,vehicleKey:animalId+'::'+vehicleId,teamIds,stableAnimalIds:teamIds,transportedMemberIds:['patient-a','patient-b'],patientLoadLb:{'patient-a':170,'patient-b':180},otherLoadLb:200,gmCoLocated:true}}
buy('horse-a');st('horse-a','vehicle-add','hmk-p122-tack-03','cart-a');st('horse-a','tack-add','hmk-p122-tack-05','harness-a');
bad(()=>receipt(args('horse-a')),/Stáj potvrzuje vlastnictví, nikoliv zdraví/);
bad(()=>register({data,campaignId:cid,minute:480,animalId:'horse-a',proofId:'other',gmConfirmed:true,examinedHealthy:false,examNote:'GM personally examined'}),/GM musí/);
bad(()=>register({data,campaignId:cid,minute:480,animalId:'horse-a',proofId:'other',gmConfirmed:false,examinedHealthy:true,examNote:'GM personally examined'}),/GM musí/);
bad(()=>register({data,campaignId:cid,minute:480,animalId:'horse-a',proofId:'other',gmConfirmed:true,examinedHealthy:true,examNote:'x'}),/podklad/);
bad(()=>register({data,campaignId:cid,minute:481,animalId:'horse-a',proofId:'other',gmConfirmed:true,examinedHealthy:true,examNote:'GM examined'}),/kalendář/);
const before=data.journal.length,r=reg('horse-a');eq(data.journal.length,before);eq(data.characters.length,1);eq(data.campaignClock.minute,480);eq(r.actor.hmk.healthState.shock,'NONE');eq(r.actor.hmk.verifiedMountedBreed,'palfrey');eq(r.proof.gmConfirmed,true);
commitReg('horse-a');eq(data.campaignClock.minute,480);eq(data.characters.filter(x=>x.id==='horse-a').length,1);eq(receipt(args('horse-a')).totalLb,550);
bad(()=>reg('horse-a'),/existující zdravotní aktér/);
data.characters.find(x=>x.id==='horse-a').hmk.healthState.fatigue.weariness=40;bad(()=>receipt(args('horse-a')),/Fatigue/);data.characters.find(x=>x.id==='horse-a').hmk.healthState.fatigue.weariness=0;
const proof=receipt(args('horse-a'));data.journal.push({id:'travel-1',characterId:owner.id,calendarCampaignId:cid,campaignMinute:480,calendarTimeEpisode:{format:'hmk-time-episode-v1',kind:'travel',startMinute:480,endMinute:490,minutes:10,conveyance:'cart',memberIds:['owner','patient-a','patient-b'],transportedMemberIds:['patient-a','patient-b'],settings:{stableAnimalIds:['horse-a']},transportProof:{vehicle:proof}}});
yes(history(data));data.campaignClock.minute=490;
const now=data.journal.length;bad(()=>reg('horse-a'),/kalendář/);eq(data.journal.length,now);
// Unknown old Bestiary trauma must never be erased by a new clean baseline.
buy('horse-b');data.journal.push({bestiaryEncounter:{id:'enc-old',campaignId:cid,ownerAnimalId:'horse-b',ownerId:'owner'},calendarCampaignId:cid});data.journal.push({bestiaryTrauma:{targetId:'enc-old',campaignId:cid},calendarCampaignId:cid});
bad(()=>register({data,campaignId:cid,minute:490,animalId:'horse-b',proofId:'other',gmConfirmed:true,examinedHealthy:true,examNote:'GM examined real animal, healthy'}),/starší zdravotní doklady/);
// A NEW Bestiary trauma recorded after healthy registration must not be ignored
// merely because the canonical Health State has not yet been reconciled.
const split=structuredClone(data);
split.journal.push({id:'split-enc-759',calendarCampaignId:cid,bestiaryEncounter:{id:'split-enc-id-759',ownerAnimalId:'horse-a',campaignId:cid}});
split.journal.push({id:'split-trauma-759',calendarCampaignId:cid,bestiaryTrauma:{targetId:'split-enc-id-759',campaignId:cid}});
bad(()=>receipt({...args('horse-a'),data:split,minute:490}),/Bestiář eviduje samostatný zdravotní následek/);
console.log('PASS',checks,'stable-only health evidence fail-closed, explicit GM registration, single state, no clock advance, identity, inherited historical proof, fatigue 40, trauma no-overwrite');
