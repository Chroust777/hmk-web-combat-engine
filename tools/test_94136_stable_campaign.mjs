import assert from 'node:assert/strict';
import {createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {assertCampaignActorTimeIsolation, beginAdditionalCalendar, switchCampaign}
 from '../src/integration/hmk-calendar-multi-campaign.js';
import {STABLE_HUB_FORMAT_574, assertStableHubAppendOnly, validateStableHub}
 from '../src/integration/hmk-stable-hub-574.js';
import {livestockOffer} from '../src/integration/hmk-livestock-562.js';
import {BEASTS_P122, VEHICLES_TACK_P122} from '../src/rules/conveyance-printed-p122.js';

const clock=(id,characterIds)=>createCampaignCalendar({day:1,hour:23,minute:55,eventId:'start-'+id,
 campaignId:id,label:id,characterIds,gmConfirmed:true});
const beast=BEASTS_P122.find(x=>x.name==='Palfrey, riding horse');
const bags=VEHICLES_TACK_P122.find(x=>x.name==='Saddle bags, 15 lb');
const animal={id:'horse',name:'QA horse',ownerId:'owner',campaignId:'origin',minute:0,beastId:beast.id,
 priceD:beast.priceD,mode:'free',transactionId:'horse-gift'};
const item={id:'bags',characterId:'owner',slot:'stable',stableAnimalId:'horse',quantity:1,
 sourceItemId:'hmk:stable-gear:'+bags.id,
 snapshot:{name:bags.name,properties:{stableTackId:bags.id,weightLb:bags.weightLb}}};
const origin={campaignClock:clock('origin',['owner','visitor']),
 characters:[{id:'owner',name:'Owner',hmk:{livestock:[animal]}},{id:'visitor',name:'Visitor',hmk:{}}],
 inventory:[item],journal:[
  {id:'horse-proof',characterId:'owner',calendarCampaignId:'origin',campaignMinute:0,livestockAcquisition:{
   animalId:animal.id,ownerId:animal.ownerId,beastId:animal.beastId,name:animal.name,priceD:animal.priceD,
   mode:animal.mode,transactionId:animal.transactionId}},
  {id:'load-proof',characterId:'owner',calendarCampaignId:'origin',campaignMinute:1434,stableHub574:{
   format:STABLE_HUB_FORMAT_574,type:'inventory-gear-attach',ownerId:'owner',animalId:'horse',
   entryId:'attachment',inventoryId:'bags',itemId:bags.id,name:bags.name,weightLb:bags.weightLb,
   quantity:1,role:'tack',reason:'QA doložení připnutí brašen'}}
 ]};
const validate=(db)=>assert.equal(validateStableHub(db,livestockOffer),true);
validate(origin);
const separate=beginAdditionalCalendar(origin,clock('separate',['visitor']));
validate(separate);
assertCampaignActorTimeIsolation(origin,separate);
const fork=beginAdditionalCalendar(separate,clock('fork',['owner','visitor']));
validate(fork);
assert.equal(fork.inventory[0].slot,'carried');
assert.equal(Object.hasOwn(fork.inventory[0],'stableAnimalId'),false);
const restored=switchCampaign(fork,'origin');
validate(restored);
assert.deepEqual(restored.inventory,[item]);
assertStableHubAppendOnly(origin,restored);
validate(switchCampaign(restored,'fork'));
validate(switchCampaign(restored,'separate'));

const forged=structuredClone(separate);
delete forged.campaignActorBranches.origin.owner;
assert.throws(()=>validate(forged),/umístění inventáře/);
const missing=structuredClone(restored);
missing.inventory=[];
assert.throws(()=>validate(missing),/naložený inventární předmět/);
const foreignActive=structuredClone(fork);
foreignActive.inventory=[item];
assert.throws(()=>validate(foreignActive),/umístění inventáře/);
console.log('PASS Stable isolation on creation, fork, switch and tampered locations');
