import assert from 'node:assert/strict';
import {createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {beginAdditionalCalendar,switchCampaign,assertCampaignActorTimeIsolation,
 assertCampaignPortfolioAppendOnly} from '../src/integration/hmk-calendar-multi-campaign.js';
import {assertPhysicalRationBacking} from '../src/integration/hmk-physical-ration-ledger.js';

const actor={id:'QA',name:'QA',hmk:{}};
const clock=id=>createCampaignCalendar({day:1,hour:8,minute:0,eventId:'start-'+id,campaignId:id,
 label:id,characterIds:[actor.id],gmConfirmed:true});
const stock={id:'stock',characterId:actor.id,quantity:1,slot:'carried'};
const first={campaignClock:clock('F'),characters:[actor],inventory:[stock],journal:[{
 id:'open-stock',characterId:actor.id,calendarCampaignId:'F',calendarInventoryRationStock:{itemId:stock.id},
}]};
const second=beginAdditionalCalendar(first,clock('CF'));
second.inventory[0].quantity=2;

const restored=switchCampaign(second,'F');
assert.equal(restored.inventory[0].quantity,1);
assert.deepEqual(restored.journal,second.journal);
assert.doesNotThrow(()=>assertCampaignActorTimeIsolation(second,restored));
assert.doesNotThrow(()=>assertCampaignPortfolioAppendOnly(second,restored));
assert.doesNotThrow(()=>assertPhysicalRationBacking(second,restored));

const edited=structuredClone(restored);
edited.inventory[0].quantity=3;
assert.throws(()=>assertPhysicalRationBacking(second,edited),/Doloženou zásobu/);
assert.throws(()=>assertPhysicalRationBacking(restored,edited),/Doloženou zásobu/);
const missing={...restored,inventory:[]};
assert.throws(()=>assertPhysicalRationBacking(second,missing),/Doloženou zásobu/);
const returned=switchCampaign(restored,'CF');
assert.equal(returned.inventory[0].quantity,2);
assert.doesNotThrow(()=>assertPhysicalRationBacking(restored,returned));
console.log('PASS v94.116: obnovení rozdílných zásob po přepnutí, zachování zápisů, ochrana proti změně i odstranění zásob');

const {initialCombatState}=await import('../src/integration/persistent-combat-state.js');
const {prepareGMHealthOverride,validateGMHealthOverrideEvidence}=await import('../src/integration/hmk-gm-health-override.js');
const {assertCampaignColdShockHistory}=await import('../src/integration/hmk-calendar-multi-campaign.js');
const reason='QA: samostatná kontrola původu rány.';
function woundIn(db,eventId){
 const result=prepareGMHealthOverride({state:db.characters[0].hmk.healthState??initialCombatState(),
  action:'add',location:'fo',side:'left',level:2,aspect:'blunt',initialCare:'pending',eventId,reason,gmConfirmed:true});
 db.characters[0].hmk.healthState=result.state;
 db.journal.push({id:eventId,characterId:actor.id,calendarCampaignId:db.campaignClock.campaignId,
  calendarGMHealthOverride:{format:'hmk-gm-health-override-v1',action:'add',
   sourceEventId:eventId,woundId:result.woundId,reason,actualRoll:null}});
}
function validateHealth(db){
 return validateGMHealthOverrideEvidence(db.characters,db.journal,[],{
  activeCampaignId:db.campaignClock.campaignId,campaignActorBranches:db.campaignActorBranches});
}
const a={campaignClock:clock('a'),characters:[structuredClone(actor)],inventory:[],journal:[]};
woundIn(a,'qa-origin-wound-a');
const b=beginAdditionalCalendar(a,clock('b'));
woundIn(b,'qa-origin-wound-b');
const switched=switchCampaign(b,'a');
assert.equal(switched.characters[0].hmk.healthState.wounds.length,1);
assert.doesNotThrow(()=>validateHealth(switched));
assert.doesNotThrow(()=>assertCampaignColdShockHistory(b,switched));
assert.doesNotThrow(()=>assertCampaignColdShockHistory(switched,switchCampaign(switched,'b')));
const tampered=structuredClone(switched);
tampered.journal.at(-1).calendarCampaignId='a';
assert.throws(()=>validateHealth(tampered),/chybí stejná původní událost a rána/);
const erased=structuredClone(switched);
erased.campaignActorBranches.b[actor.id].hmk.healthState.events.pop();
assert.throws(()=>assertCampaignColdShockHistory(b,erased),/nesmí být přepsán/);
console.log('PASS v94.116: původ GM rány a neměnnost událostí zůstávají ověřené v obou kampaních');

const {calculateTimeEpisode,episodeEncounterByMinutes,validateTimeEpisodes}
 =await import('../src/integration/hmk-time-episodes.js');
const episode=calculateTimeEpisode({minute:480,minutes:30,kind:'travel',topography:'flat',
 terrain:'paved-road',conveyance:'foot',memberIds:[actor.id],enduranceByActor:{QA:12},
 endRollByActor:{QA:5},encByActor:{QA:0}});
episode.encounter={...episodeEncounterByMinutes({minutes:30,environ:'rural',night:false,d100:1}),resolved:false};
const row={id:'qa-encounter',calendarCampaignId:'a',campaignMinute:480,calendarTimeEpisode:episode};
assert.doesNotThrow(()=>validateTimeEpisodes([row]));
episode.encounter.chance+=Number.EPSILON;
assert.doesNotThrow(()=>validateTimeEpisodes([row]));
const forged=structuredClone(row);
forged.calendarTimeEpisode.encounter.found=true;
assert.throws(()=>validateTimeEpisodes([forged]),/Minutové riziko setkání/);
episode.encounter.chance+=1e-8;
assert.throws(()=>validateTimeEpisodes([row]),/Minutové riziko setkání/);
console.log('PASS v94.116: přenos minutového Encounter mezi JS enginy a přesná kontrola výsledků');
