import assert from 'node:assert/strict';
import {advanceCampaignCalendar,anchorCampaignOrigin,createCampaignCalendar,DAY_MINUTES} from '../src/integration/hmk-campaign-calendar.js';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {startAlchemyHealingRecovery,advanceAlchemyHealingRecovery,prepareAlchemyHealingUse,validateAlchemyHealingRecovery,assertAlchemyHealingRecoveryAppendOnly,healingArcaneRollAlreadyUsed} from '../src/integration/hmk-alchemy-healing-recovery.js';

import {validateAlchemyImbibingJournal,activeAlchemyProfusionCohort,activeAlchemyPhysicTargets} from '../src/integration/hmk-alchemy-imbibing.js';
import {alchemyElixirStrength} from '../src/integration/hmk-alchemy-decay.js';
import {createAlchemyVialBinding,alchemyVialState} from '../src/integration/hmk-alchemy-vial-ledger.js';
import {PRINTED_VIAL} from '../src/integration/hmk-herbal-vial-ledger.js';

const actor={id:'patient',hmk:{attributes:{end:16,wil:16}}},campaignId='campaign',useId='dose';
const when=createCampaignCalendar({day:3,hour:8,minute:12,eventId:'init',campaignId,characterIds:[actor.id],gmConfirmed:true});
const time=(clock,days)=>advanceCampaignCalendar(clock,{deltaMinutes:DAY_MINUTES*days,eventId:'advance:'+clock.minute,reason:'Plynutí testovacího času',gmConfirmed:true});
const anchor=(clock,kind,eventId,woundId=null)=>anchorCampaignOrigin(clock,{kind,characterId:actor.id,woundId,eventId,gmConfirmed:true});
const clock=anchor(anchor(when,'wound','wound-at','old'),'blood-loss','blood-at');
const wound=(id,level=3)=>({id,location:'ca',side:'left',severity:level===1?'M':'S',level,aspect:'blunt',bleeding:false,
 nextAdvanceRound:null,healing:{treated:true,healingRate:4,nextHealingDay:5}});
const health=initialCombatState();
health.wounds.push({...wound('old'),bleeding:true,nextAdvanceRound:61});
health.bloodLoss={bp:3,weaknessFatigue:15,healingNextDay:10};
health.fatigue={windedness:10,weariness:25,otherWeakness:5};
health.shock='INC';
health.shockOriginRound=1;
health.lastRound=1;
health.posture.prone=true;
const context={actor,clock,campaignId,useId,state:health,gmConfirmed:true};
const imbibing={elixirName:'Healing',campaignId,targetId:actor.id,minute:clock.minute,
 sl:'CF',baseAS:8,asBefore:8,finalAS:6};
const roll=(kind,sourceId,value)=>({kind,sourceId,value,origin:'manual'});
const r10=value=>({value,origin:'manual'});
const blood=roll('blood-loss','blood-at',5);
const old=roll('injury','old',5);
const original=structuredClone(health);

assert.throws(()=>startAlchemyHealingRecovery({...context,imbibing,rolls:[old]}),/právě jeden d100/);
assert.throws(()=>startAlchemyHealingRecovery({...context,imbibing,rolls:[old,old]}),/právě jeden d100/);
assert.deepEqual(health,original);
const start=startAlchemyHealingRecovery({...context,imbibing,rolls:[roll('injury','old',100),blood]});
assert.equal(start.state.shock,'NONE');
assert.equal(start.state.posture.prone,true);
assert.equal(start.state.fatigue.windedness,0);
assert.equal(start.state.fatigue.weariness,0);
assert.equal(start.state.fatigue.otherWeakness,45);
assert.equal(start.state.wounds[0].bleeding,false);
assert.equal(start.state.wounds[0].nextAdvanceRound,null);
assert.equal(start.state.wounds[0].level,3);
assert.equal(start.state.wounds[0].healing.nextHealingDay,5);
assert.equal(start.state.bloodLoss.healingNextDay,10);
assert.equal(start.state.bloodLoss.bp,1);
assert.deepEqual(start.receipt.traumas,[{kind:'injury',sourceId:'old'},{kind:'blood-loss',sourceId:'blood-at'}]);
assert.equal(start.receipt.nextMinute,clock.minute+DAY_MINUTES);
assert.throws(()=>startAlchemyHealingRecovery({...context,state:start.state,imbibing}),/již působila/);
assert.throws(()=>advanceAlchemyHealingRecovery({...context,state:start.state,clock:time(clock,2),dailyRoll:r10(1)}),/není právě splatná/);

const nextState=structuredClone(start.state);
nextState.wounds.push(wound('new',2));
const dayOne=anchor(time(clock,1),'wound','new-at','new');
assert.throws(()=>advanceAlchemyHealingRecovery({...context,clock:dayOne,state:nextState,dailyRoll:r10(10),rolls:[old]}),/nevytváří léčebné hody/);
const miss=advanceAlchemyHealingRecovery({...context,clock:dayOne,state:nextState,dailyRoll:r10(10)});
assert.equal(miss.receipt.asAfter,5);
assert.equal(miss.receipt.weakness,40);
assert.equal(miss.receipt.rolled.length,0);

const dayTwo=time(dayOne,1);
const persisted=JSON.parse(JSON.stringify(miss.state));
const hit=advanceAlchemyHealingRecovery({...context,clock:dayTwo,state:persisted,dailyRoll:r10(5),rolls:[old,blood]});
assert.equal(hit.receipt.asAfter,4);
assert.equal(hit.receipt.weakness,35);
assert.equal(hit.state.wounds.find(w=>w.id==='new').level,2);
assert.equal(hit.state.wounds.find(w=>w.id==='old').level,1);
assert.equal(hit.state.bloodLoss.bp,0);
const done=advanceAlchemyHealingRecovery({...context,clock:time(dayTwo,1),state:hit.state,dailyRoll:r10(1),rolls:[old]});
assert.equal(done.receipt.nextMinute,null);
assert.equal(done.state.fatigue.otherWeakness,5);
assert.equal(done.state.wounds.find(w=>w.id==='old').healed,true);
assert.equal(done.state.wounds.find(w=>w.id==='new').healed,undefined);
assert.doesNotThrow(()=>validateCombatState(done.state));
assert.deepEqual(health,original);

const balmState=structuredClone(health);
balmState.events.push({id:'balm-demo',type:'injury-healing-roll',round:1,details:{arcaneRecovery:{sourceId:'old',minute:clock.minute}}});
const journal=[{calendarCampaignId:campaignId,characterId:actor.id,campaignMinute:clock.minute,
 skillTestProof:{type:'arcane-balm-injury',sourceId:'old',report:{eventId:'balm-demo'}}}];
const overlap=startAlchemyHealingRecovery({...context,state:balmState,imbibing,journal,rolls:[blood]});
assert.deepEqual(overlap.receipt.overlapped,[{kind:'injury',sourceId:'old'}]);
assert.equal(overlap.receipt.rolled.length,1);
const livingActor={...actor,hmk:{...actor.hmk,healthState:health,attributes:{...actor.hmk.attributes,aur:15}}};
const inventory=[{id:'vial',characterId:actor.id,sourceItemId:PRINTED_VIAL,slot:'carried',
 quantity:1,snapshot:{properties:{weightLb:0.25}}}];
const dose={id:'finish',characterId:actor.id,campaignMinute:clock.minute,calendarCampaignId:campaignId,
 calendarAlchemyFinish:{campaignId,minute:clock.minute,result:'completed',elixirName:'Healing',baseAS:8}};
const vialContext={inventory,campaignId,minute:clock.minute,actorId:actor.id,finishId:dose.id};
const binding=createAlchemyVialBinding({...vialContext,journal:[dose],vialId:'vial',
 confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
const doseJournal=[dose,{id:'binding',characterId:actor.id,campaignMinute:clock.minute,calendarCampaignId:campaignId,
 calendarAlchemyVialBinding:binding}];
const use={clock,campaignId,useId:'vial-use',emptyId:'empty',actor:livingActor,maker:livingActor,
 finishId:dose.id,testSkill:'Aura',imbibingRoll:r10(5),journal:doseJournal,inventory,rolls:[old,blood],gmConfirmed:true};
assert.throws(()=>prepareAlchemyHealingUse(use),/schopný provést akci/);
const conscious={...livingActor,hmk:{...livingActor.hmk,healthState:{...health,shock:'NONE',shockOriginRound:null}}};
use.actor=conscious;use.maker=conscious;
const prepared=prepareAlchemyHealingUse(use);
assert.equal(prepared.imbibing.finalAS,9);
assert.equal(prepared.imbibing.temporary,false);
assert.equal(prepared.imbibing.ml,75);
assert.equal(prepared.empty.emptyVialRetained,true);
assert.equal(prepared.state.wounds[0].level,1);
assert.deepEqual(health,original);
assert.equal(alchemyVialState(doseJournal,campaignId,dose.id,clock.minute).full,true);
const closed=[...doseJournal,{id:use.emptyId,characterId:actor.id,campaignMinute:clock.minute,calendarCampaignId:campaignId,
 calendarAlchemyVialEmpty:prepared.empty}];
assert.throws(()=>prepareAlchemyHealingUse({...use,journal:closed}),/chybí nové identifikátory/);
assert.throws(()=>prepareAlchemyHealingUse({...use,journal:closed,useId:'second-use',emptyId:'second-empty'}),/dávka Healing není dostupná/);
assert.throws(()=>prepareAlchemyHealingUse({...use,inventory:[]}),/skutečná nádoba/);
assert.throws(()=>prepareAlchemyHealingUse({...use,campaignId:'other-campaign'}),/chybí živý příjemce/);
const extended=structuredClone(health);
extended.extendedShock={originState:'INC',hr:4,elapsedHours:0};
assert.throws(()=>startAlchemyHealingRecovery({...context,state:extended,imbibing,rolls:[old,blood]}),/všechny přítomné druhy/);
assert.deepEqual(health,original);
const event=(id,field,proof,minute=clock.minute)=>({id,characterId:actor.id,campaignMinute:minute,calendarCampaignId:campaignId,[field]:proof});
const useRow=event(use.useId,'calendarAlchemyImbibing',prepared.imbibing);
const initialRow=event(use.useId+':healing:0','calendarAlchemyHealingRecovery',prepared.receipt);
const saved=[...closed,useRow,initialRow];
const actors=[{...conscious,hmk:{...conscious.hmk,healthState:prepared.state}}];
assert.equal(validateAlchemyImbibingJournal(saved),true);
assert.equal(validateAlchemyHealingRecovery(saved,actors),true);
assert.equal(validateAlchemyHealingRecovery(saved,[],{[campaignId]:{[actor.id]:actors[0]}},'another-campaign'),true);
assert.equal(alchemyElixirStrength(saved,campaignId,dose.id,clock.minute).nextDueMinute,null);
assert.equal(healingArcaneRollAlreadyUsed(prepared.state,campaignId,clock.minute,{kind:'injury',sourceId:'old'}),true);
assert.throws(()=>validateAlchemyHealingRecovery(saved.slice(0,-1),actors),/chybí počáteční doklad/);
assert.throws(()=>assertAlchemyHealingRecoveryAppendOnly(saved,saved.slice(0,-1)),/nelze změnit ani odstranit/);
assert.throws(()=>activeAlchemyProfusionCohort(saved,campaignId,actor.id,clock.minute),/Healing/);
assert.throws(()=>activeAlchemyPhysicTargets(saved,campaignId,actor.id,clock.minute),/Healing/);
const exhausted={...initialRow,calendarAlchemyHealingRecovery:{...prepared.receipt,nextMinute:null}};
assert.equal(activeAlchemyProfusionCohort([...closed,useRow,exhausted],campaignId,actor.id,clock.minute).length,0);
console.log('PASS Healing: verified vial and emptiness proof, provenance, instant mitigation, failed magic without damage, daily AS, CF weakness, Balm overlap, original wounds only, reload');
