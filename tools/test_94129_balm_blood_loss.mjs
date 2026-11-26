import assert from 'node:assert/strict';
import {applyConfirmedBloodLossHealing} from '../src/integration/hmk-healing-persistence.js';
import {initialCombatState, validateCombatState} from '../src/integration/persistent-combat-state.js';
import {resolveBalmBloodLossRecovery} from '../src/integration/hmk-weather-hazard-aftermath.js';
import {anchorCampaignOrigin, campaignCalendarAgenda, createCampaignCalendar, getCampaignAnchor} from '../src/integration/hmk-campaign-calendar.js';

const actor = {id:'patient',name:'QA patient',hmk:{attributes:{end:12}}};
const caster = {id:'mage',hmk:{arcane:{knownSpells:['Balm']}}};
const state = initialCombatState();
Object.assign(state.bloodLoss,{bp:3,weaknessFatigue:15,healingNextDay:10});
Object.assign(state.fatigue,{otherWeakness:5,windedness:10,weariness:5});
let clock = createCampaignCalendar({day:3,hour:8,minute:0,eventId:'start',gmConfirmed:true,
 campaignId:'balm-blood-qa',characterIds:[actor.id,caster.id]});
clock = anchorCampaignOrigin(clock,{kind:'blood-loss',characterId:actor.id,eventId:'blood-onset',
 combatEventId:'original-loss',elapsedMinutes:2880,source:'confirmed-health'});
const anchor = getCampaignAnchor(clock,'blood-loss',actor.id);
const term = healthState => campaignCalendarAgenda(clock,[{...actor,hmk:{...actor.hmk,healthState}}],[],[]).all
 .find(x=>x.kind==='blood-loss')?.minute;
assert.equal(term(state),14880);

const input = {state,actor,caster,sourceId:anchor.eventId,minute:clock.minute,originMinute:anchor.minute,
 spellML:70,castingEML:65,castingD100:11,recoveryD100:51,range:'touch',understanding:'Úspěšný Diagnosis',gmConfirmed:true};
const success = resolveBalmBloodLossRecovery(input);
assert.deepEqual([success.report.sl,success.report.eml,success.report.bpBefore,success.report.bpAfter],['S',55,3,2]);
assert.deepEqual(success.state.fatigue,state.fatigue);
assert.equal(success.state.bloodLoss.weaknessFatigue,10);
assert.equal(term(success.state),term(state));
const restored = JSON.parse(JSON.stringify(success.state));
validateCombatState(restored);
assert.equal(term(restored),term(state));
assert.throws(()=>resolveBalmBloodLossRecovery({...input,state:restored}),/jednou/);

for (const [roll,level] of [[56,'F'],[60,'CF']]) {
 const failed = resolveBalmBloodLossRecovery({...input,recoveryD100:roll});
 assert.deepEqual([failed.report.sl,failed.report.failureIgnored],[level,true]);
 assert.deepEqual(failed.state.bloodLoss,state.bloodLoss);
 assert.equal(term(failed.state),term(state));
 assert.throws(()=>resolveBalmBloodLossRecovery({...input,state:failed.state}),/jednou/);
}
const critical = resolveBalmBloodLossRecovery({...input,castingD100:5,recoveryD100:65});
assert.deepEqual([critical.report.sl,critical.report.bonus,critical.report.eml,critical.state.bloodLoss.bp],['CS',10,65,1]);
assert.equal(term(critical.state),term(state));
const light = structuredClone(state);
Object.assign(light.bloodLoss,{bp:2,weaknessFatigue:10});
const healed = resolveBalmBloodLossRecovery({...input,state:light,recoveryD100:5});
assert.deepEqual(healed.state.bloodLoss,{...light.bloodLoss,bp:0,weaknessFatigue:0,healingNextDay:null});
assert.equal(term(healed.state),undefined);
assert.throws(()=>resolveBalmBloodLossRecovery({...input,spellML:69}),/70/);
assert.throws(()=>resolveBalmBloodLossRecovery({...input,castingD100:100}),/úspěšný Spellfire/);
assert.throws(()=>resolveBalmBloodLossRecovery({...input,state:initialCombatState()}),/aktivní Blood Loss/);

const normal = {state:restored,round:2,eventId:'ordinary-blood-healing',daySinceBloodLoss:10,endurance:12,roll:60,gmConfirmed:true};
assert.throws(()=>applyConfirmedBloodLossHealing({...normal,daySinceBloodLoss:2}),/splatný den 10/);
assert.equal(applyConfirmedBloodLossHealing(normal).nextHealingDay,30);
console.log('PASS: Balm Blood Loss (SI 7+, F/CF, S/CS, calendar, duplicate and reload), normal schedule unchanged');
