import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {applyConfirmedInjuryHealing} from '../src/integration/hmk-healing-persistence.js';
import {resolveBalmInjuryRecovery} from '../src/integration/hmk-weather-hazard-aftermath.js';
import {anchorCampaignOrigin,campaignCalendarAgenda,createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';

const actor={id:'patient',hmk:{attributes:{end:12,wil:12}}};
const caster={id:'mage',hmk:{arcane:{knownSpells:['Balm']}}};
const state=initialCombatState();
const target={id:'target',location:'fo',side:'left',severity:'S',level:2,aspect:'edge',
 bleeding:false,nextAdvanceRound:null,originDomain:'gm',healed:false};
const other={...target,id:'other',side:'right'};
state.wounds=[target,other];
const treated=structuredClone(state);
treated.wounds[0].healing={treated:true,healingRate:4,nextHealingDay:5,infectionPossible:true};
const args={state,actor,caster,sourceId:target.id,originMinute:0,minute:1800,
 spellML:36,castingEML:35,castingD100:11,recoveryD100:33,range:'touch',
 understanding:'Doložená zjevná řezná rána',gmConfirmed:true};

const partial=resolveBalmInjuryRecovery(args);
assert.deepEqual([partial.report.hr,partial.report.eml,partial.report.sl,partial.report.ilAfter],[3,36,'S',1]);
assert.equal(partial.state.wounds[0].healing,undefined);
assert.deepEqual(partial.state.wounds[1],other);
assert.deepEqual(state.wounds[0],target);
assert.throws(()=>resolveBalmInjuryRecovery({...args,state:JSON.parse(JSON.stringify(partial.state))}),/jednou/);
assert.equal(resolveBalmInjuryRecovery({...args,state:partial.state,sourceId:other.id}).report.ilAfter,1);

let clock=createCampaignCalendar({day:2,hour:6,minute:0,eventId:'start',gmConfirmed:true,
 campaignId:'balm-injury-qa',characterIds:[actor.id,caster.id]});
clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:actor.id,woundId:target.id,elapsedMinutes:1800,eventId:'wound-anchor',gmConfirmed:true});
const nextHealing=healthState=>campaignCalendarAgenda(clock,[{...actor,hmk:{...actor.hmk,healthState}}],[],[]).all
 .find(x=>x.kind==='healing'&&x.woundId===target.id)?.minute;
const treatedPartial=resolveBalmInjuryRecovery({...args,state:treated,recoveryD100:47});
assert.equal(treatedPartial.report.ilAfter,1);
assert.equal(treatedPartial.state.wounds[0].healing.nextHealingDay,5);
assert.equal(nextHealing(treatedPartial.state),nextHealing(treated));
assert.equal(nextHealing(treated),7200);

const critical=resolveBalmInjuryRecovery({...args,state:treated,castingD100:5,recoveryD100:55});
assert.deepEqual([critical.report.sl,critical.report.bonus,critical.report.ilAfter,critical.report.healed],['CS',10,0,true]);
assert.equal(nextHealing(critical.state),undefined);
const untreatedCritical=resolveBalmInjuryRecovery({...args,recoveryD100:5});
assert.equal(untreatedCritical.state.wounds[0].healed,true);
validateCombatState(JSON.parse(JSON.stringify(untreatedCritical.state)));

for(const [recoveryD100,level] of [[91,'F'],[95,'CF']]){
 const failure=resolveBalmInjuryRecovery({...args,state:treated,recoveryD100});
 assert.deepEqual([failure.report.sl,failure.report.failureIgnored],[level,true]);
 assert.deepEqual(failure.state.wounds,treated.wounds);
 assert.deepEqual(failure.state.fatigue,treated.fatigue);
 assert.equal(nextHealing(failure.state),nextHealing(treated));
}
const infected=structuredClone(treated);
infected.wounds[1].healing={infected:true};
assert.throws(()=>resolveBalmInjuryRecovery({...args,state:infected}),/infekce/);
assert.throws(()=>resolveBalmInjuryRecovery({...args,castingD100:95}),/úspěšný Spellfire/);
assert.throws(()=>resolveBalmInjuryRecovery({...args,minute:-1}),/minutu/);
assert.throws(()=>resolveBalmInjuryRecovery({...args,range:'ten-feet-los'}),/dotyk/);

const ordinary={state:treated,round:1,eventId:'ordinary',woundId:target.id,
 daySinceInjury:1,endurance:12,will:12,roll:95,gmConfirmed:true};
assert.throws(()=>applyConfirmedInjuryHealing(ordinary),/pětideního intervalu/);
assert.equal(applyConfirmedInjuryHealing({...ordinary,daySinceInjury:5}).infected,true);
console.log('PASS: Balm wound targeting, CF Treatment HR, F/CF, S/CS, calendar, persistence and ordinary healing');
