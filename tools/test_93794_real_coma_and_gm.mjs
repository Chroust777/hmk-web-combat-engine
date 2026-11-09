import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState,applyConfirmedShockRecovery,applyExtendedShockCourse,applyComaCourse} from '../src/integration/persistent-combat-state.js';
import {prepareSkillPhysicalInjury} from '../src/integration/hmk-skill-physical-consequences.js';
import {verifiedNoncombatComaCause} from '../src/integration/hmk-noncombat-coma-cause-93753.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,validateCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {prepareGMHealthOverride} from '../src/integration/hmk-gm-health-override.js';
const r='GM vyznačil skutečné zranění a jeho následky';
let checks=0;function ok(p,msg){assert.ok(p,msg);checks++};function rejected(f,msg){assert.throws(f,msg);checks++}
const actor={id:'a',name:'Zraněný cestující',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{name:'Shock',ml:65}],healthState:initialCombatState()}};
const original=prepareSkillPhysicalInjury({kind:'survival-accident',actor,inventory:[],state:actor.hmk.healthState,sourceId:'coma-93794',round:1,gmConfirmed:true,originMinute:480,hazardD10:5,agilityD100:100,randomVictimConfirmed:true,impactDie:1,zoneD10:1,locationD10:6,shockD100:100});
actor.hmk.healthState=original.state;
let s=actor.hmk.healthState;ok(s.shock==='UNC','original real Accident must induce UNC');
const cause=verifiedNoncombatComaCause({actor,state:s,shockFollowup:s.shockFollowup});ok(cause.ready&&cause.sourceEventId&&cause.initialHR>0,'verified causal source');
let clock=createCampaignCalendar({day:1,hour:8,minute:0,eventId:'coma93794-clock',gmConfirmed:true,campaignId:'coma93794',characterIds:['a']});
clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'a',woundId:s.wounds[0].id,eventId:'coma93794-anchor',combatEventId:s.wounds[0].originEventId,source:'confirmed-health'});
// Source Shock was at 08:00; this exercise certifies real 10 elapsed minutes and never invents a second roll.
const sl='CF';
rejected(()=>applyConfirmedShockRecovery({state:s,round:2,eventId:'missing-d10',sl,timingConfirmed:true,characterId:'a',actorId:'a',elapsedMinutesSinceOriginal:10,shockML:65,roll:100,comaLocationShock:cause.locationShock,comaInjuryLevel:cause.injuryLevel}), 'mandatory actual d10');
rejected(()=>applyConfirmedShockRecovery({state:s,round:2,eventId:'fake-cause',sl,timingConfirmed:true,characterId:'a',actorId:'a',elapsedMinutesSinceOriginal:10,shockML:65,roll:100,comaLocationShock:99,comaInjuryLevel:cause.injuryLevel,initialComaD10:4}), 'invalid causal LS');
const outcome=applyConfirmedShockRecovery({state:s,round:2,eventId:'valid-coma-reroll',sl,timingConfirmed:true,characterId:'a',actorId:'a',elapsedMinutesSinceOriginal:10,shockML:65,roll:100,comaLocationShock:cause.locationShock,comaInjuryLevel:cause.injuryLevel,initialComaD10:4});
s=outcome.state;actor.hmk.healthState=s;
ok(s.coma?.active&&s.extendedShock?.originState==='UNC'&&s.coma.hr===cause.initialHR&&s.coma.nextCourseDays===4,'coma and extended live together');
clock=anchorCampaignOrigin(clock,{kind:'extended-shock',characterId:'a',eventId:'coma93794-extended-anchor',combatEventId:'valid-coma-reroll',source:'confirmed-health'});
clock=anchorCampaignOrigin(clock,{kind:'coma',characterId:'a',eventId:'coma93794-coma-anchor',combatEventId:'valid-coma-reroll',source:'confirmed-health'});
const agenda=campaignCalendarAgenda(clock,[actor],[],[]);
ok(agenda.future.some(x=>x.kind==='extended-shock')&&agenda.future.some(x=>x.kind==='coma'),'two independent future calendar obligations');
const dueExt=agenda.future.find(x=>x.kind==='extended-shock');const dueComa=agenda.future.find(x=>x.kind==='coma');
ok(dueExt.minute===720&&dueComa.minute===6240,'4h and 4d earliest deadlines from shock-recovery anchor');
// Test both continuation and terminal paths in an isolated state copy, without prematurely changing calendar.
rejected(()=>applyExtendedShockCourse({state:s,round:3,eventId:'early-course',healingBase:13,roll:99,elapsedHoursSinceOnset:3,gmConfirmed:true}), '4h due');
const ext=applyExtendedShockCourse({state:s,round:3,eventId:'actual-extended',healingBase:13,roll:99,elapsedHoursSinceOnset:4,gmConfirmed:true});ok(ext.state.extendedShock&&ext.state.coma?.active,'extended course keeps coma when unfinished');
rejected(()=>applyComaCourse({state:s,round:3,eventId:'wrong-days',healingBase:13,roll:99,daysElapsed:3,periodD10:6,gmConfirmed:true}), 'cannot guess coma days');
const co=applyComaCourse({state:s,round:3,eventId:'coma-first',healingBase:13,roll:99,daysElapsed:4,periodD10:6,gmConfirmed:true});ok(co.state.coma?.active&&co.state.coma.elapsedDays===4&&co.state.coma.nextCourseDays===6,'coma continuation with new actual d10');
// GM action changes actual calendar future, never a note-only change.
let gc=createCampaignCalendar({day:1,hour:8,minute:0,eventId:'gm93794-start',gmConfirmed:true,campaignId:'gm93794',characterIds:['a']});
let gs=initialCombatState();const g1=prepareGMHealthOverride({state:gs,action:'add',eventId:'gm93794-severe',reason:r,gmConfirmed:true,location:'ha',level:4,aspect:'blunt'});gs=g1.state;
gc=anchorCampaignOrigin(gc,{kind:'wound',characterId:'a',woundId:g1.woundId,eventId:'gm93794-health-anchor',combatEventId:'gm93794-severe',source:'confirmed-health'});
actor.hmk.healthState=gs;const before=campaignCalendarAgenda(gc,[actor],[],[]);
ok(before.future.some(x=>x.kind==='bleeding')&&before.future.some(x=>x.kind==='grim'),'adding real grievous wound creates bleeding and grim calendar');
const g2=prepareGMHealthOverride({state:gs,action:'resolve',eventId:'gm93794-healed',reason:r,gmConfirmed:true,woundId:g1.woundId});actor.hmk.healthState=g2.state;const after=campaignCalendarAgenda(gc,[actor],[],[]);
ok(!after.all.some(x=>['bleeding','grim','healing','infection'].includes(x.kind))&&g2.state.wounds[0].healed,'resolving wound clears wound-bound future');
ok(g2.state.events.some(x=>x.id==='gm93794-severe')&&g2.state.events.some(x=>x.id==='gm93794-healed'),'both GM events retained');
validateCombatState(s);validateCombatState(g2.state);validateCampaignCalendar(gc);
console.log(JSON.stringify({result:'PASS',checks,cause:{locationShock:cause.locationShock,injuryLevel:cause.injuryLevel,initialHR:cause.initialHR},coma:{hr:s.coma.hr,firstCourseDays:s.coma.nextCourseDays},scheduled:{extended:dueExt.minute,coma:dueComa.minute},gmBefore:before.future.map(x=>x.kind),gmAfter:after.all.map(x=>x.kind)},null,2));
