import assert from 'node:assert/strict';
import {applyConfirmedShockRecovery, applyComaCourse, initialCombatState, validateCombatState} from '../src/integration/persistent-combat-state.js';
import {prepareColdWaterShock} from '../src/integration/hmk-weather-trauma-completion.js';
import {resolveBalmTraumaCourse} from '../src/integration/hmk-weather-hazard-aftermath.js';
import {anchorCampaignOrigin, campaignCalendarAgenda, createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';

const actor = {id:'patient', name:'QA patient', hmk:{attributes:{end:14,wil:14}}};
const caster = {id:'mage', hmk:{arcane:{knownSpells:['Balm']}}};
const sourceId = 'ice-water';
const cold = prepareColdWaterShock({actor,state:initialCombatState(),sourceId,condition:'freezingWater',
 originMinute:480,d6s:[6,6,6],enduranceD100:100,gmConfirmed:true});
const onset = applyConfirmedShockRecovery({state:cold.state,round:2,eventId:'shock-reroll',sl:'CF',
 timingConfirmed:true,characterId:actor.id,actorId:actor.id,elapsedMinutesSinceOriginal:10,
 shockML:60,roll:100,immersionComaHR:4,initialComaD10:3}).state;
assert.equal(onset.shock,'UNC');

let clock = createCampaignCalendar({day:1,hour:8,minute:10,eventId:'start',gmConfirmed:true,
 campaignId:'balm-qa',characterIds:[actor.id,caster.id]});
for (const kind of ['extended-shock','coma']) {
 clock = anchorCampaignOrigin(clock,{kind,characterId:actor.id,eventId:'anchor-'+kind,
  combatEventId:'shock-reroll',source:'confirmed-health'});
}
const deadlines = state => campaignCalendarAgenda(clock,[{...actor,hmk:{...actor.hmk,healthState:state}}],[],[]).future
 .filter(x=>['extended-shock','coma'].includes(x.kind)).map(x=>[x.kind,x.minute]);
assert.deepEqual(deadlines(onset),[['extended-shock',730],['coma',4810]]);

const input = {state:onset,actor,caster,sourceId,kind:'extended-shock',round:3,minute:500,originMinute:490,
 spellML:80,castingEML:65,castingD100:11,recoveryD100:11,range:'touch',understanding:'Úspěšný Diagnosis',gmConfirmed:true};
for (const [roll,level] of [[81,'F'],[100,'CF']]) {
 for (const kind of ['extended-shock','coma']) {
  const failed = resolveBalmTraumaCourse({...input,kind,recoveryD100:roll,restfulShelter:true});
  assert.equal(failed.report.failureIgnored,true);
  assert.equal(failed.report.sl,level);
  assert.deepEqual(failed.state.extendedShock,onset.extendedShock);
  assert.deepEqual(failed.state.coma,onset.coma);
  assert.deepEqual(deadlines(failed.state),deadlines(onset));
  assert.throws(()=>resolveBalmTraumaCourse({...input,kind,state:failed.state,restfulShelter:true}),/jednou/);
 }
}
const extended = resolveBalmTraumaCourse(input);
assert.deepEqual([extended.report.sl,extended.report.fromHR,extended.report.toHR],['S',4,5]);
assert.deepEqual(deadlines(extended.state),deadlines(onset));
const coma = resolveBalmTraumaCourse({...input,kind:'coma',state:extended.state,restfulShelter:true});
assert.deepEqual([coma.report.toHR,coma.state.coma.elapsedDays,coma.state.coma.nextCourseDays],[5,0,3]);
assert.deepEqual(deadlines(coma.state),deadlines(onset));
const restored = JSON.parse(JSON.stringify(coma.state));
validateCombatState(restored);
assert.deepEqual(deadlines(restored),deadlines(onset));
const ordinary = applyComaCourse({state:restored,round:4,eventId:'regular-coma-course',healingBase:12,
 roll:5,daysElapsed:3,gmConfirmed:true});
assert.equal(ordinary.state.coma,null);
assert.equal(ordinary.state.shock,'UNC');
assert.deepEqual(deadlines(ordinary.state),[['extended-shock',730]]);

const recoveredShock = resolveBalmTraumaCourse({...input,castingD100:5,recoveryD100:5});
assert.deepEqual([recoveredShock.report.bonus,recoveredShock.state.extendedShock,recoveredShock.state.shock],[10,null,'UNC']);
const recoveredComa = resolveBalmTraumaCourse({...input,kind:'coma',state:recoveredShock.state,
 restfulShelter:true,recoveryD100:5});
assert.deepEqual([recoveredComa.state.coma,recoveredComa.state.shock],[null,'NONE']);
assert.deepEqual(deadlines(recoveredComa.state),[]);
assert.throws(()=>resolveBalmTraumaCourse({...input,spellML:79}),/80/);
assert.throws(()=>resolveBalmTraumaCourse({...input,castingD100:100}),/úspěšný Spellfire/);
assert.throws(()=>resolveBalmTraumaCourse({...input,sourceId:'other'}),/konkrétní aktivní/);
assert.throws(()=>resolveBalmTraumaCourse({...input,minute:489}),/minutu/);
assert.throws(()=>resolveBalmTraumaCourse({...input,kind:'coma'}),/prostředí/);
console.log('PASS: Balm immediate trauma courses, failures, duplicate prevention, calendar and persisted state');
