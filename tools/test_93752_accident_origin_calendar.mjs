import assert from 'node:assert/strict';
import {prepareSkillPhysicalInjury} from '../src/integration/hmk-skill-physical-consequences.js';
import {initialCombatState,validateCombatState,applyConfirmedInjuryMishap,unresolvedInjuryMishaps,applyConfirmedShockRecovery,applyExtendedShockCourse,applyComaCourse,applyConfirmedInjuryMorale,dueInjuryMorale} from '../src/integration/persistent-combat-state.js';
import {medicalOriginOfWound,MEDICAL_ORIGIN} from '../src/integration/hmk-medical-origin.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {automaticHMKFollowups} from '../src/integration/hmk-calendar-automatic-followups.js';
import {travelBleedingTerm,beginTravelBloodStoppage,completeTravelBleedingInterval,completeTravelBloodShockReroll} from '../src/integration/hmk-travel-blood-stoppage-93714.js';
import {applyConfirmedTreatment} from '../src/integration/hmk-healing-persistence.js';
import {calendarEventDestination} from '../src/integration/hmk-calendar-event-routing.js';
import {guidedTraumaCourseReadiness} from '../src/integration/hmk-guided-trauma-course.js';
import {successLevel} from '../src/rules/tests.js';
let tests=0;function ok(cond,label){assert.ok(cond,label);tests++;}
function eq(a,b,label){assert.deepEqual(a,b,label);tests++;}
const day=1,hour=8,minute=0,origin=480;
const actor={id:'pc752',name:'Accident patient',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{name:'Survival',ml:70},{name:'Shock',ml:65},{name:'Initiative',ml:65}],healthState:initialCombatState()}};
let clock=createCampaignCalendar({day,hour,minute,label:'Accident 752',eventId:'start-752',gmConfirmed:true,campaignId:'audit752',characterIds:[actor.id]});
const sourceId='confirmed-survival-hazard-752';
const opts={kind:'survival-accident',actor,inventory:[],state:actor.hmk.healthState,
 sourceId,round:1,gmConfirmed:true,originMinute:origin,
 hazardD10:5,agilityD100:100,randomVictimConfirmed:true,
 impactDie:6,zoneD10:2,locationD10:2,shockD100:100};
const out=prepareSkillPhysicalInjury(opts);
actor.hmk.healthState=out.state;
ok(validateCombatState(out.state),'Valid committed accident health');
eq(out.state.wounds.length,1,'One wound');
const wound=out.state.wounds[0];
eq(medicalOriginOfWound(wound,out.state.events),MEDICAL_ORIGIN.TRAVEL,'Verified origin of travel accident');
eq(out.state.shock,'UNC','Shock UNC after accident');
eq(out.state.shockFollowup?.domain,MEDICAL_ORIGIN.TRAVEL,'Shock follows travel origin');
eq(out.state.shockFollowup?.originMinute,origin,'Shock has witnessed origin minute');
clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:actor.id,woundId:wound.id,combatEventId:wound.originEventId,eventId:'anchor-wound-752',source:'confirmed-health'});
const agenda=campaignCalendarAgenda(clock,[actor],[]);
const next=agenda.all.find(x=>x.kind==='weather-shock');ok(next,'Calendar has noncombat shock');eq(next.minute,490,'Shock Reroll due in 10 actual minutes');
const auto=automaticHMKFollowups(clock,[actor],[]);ok(auto.all.some(x=>x.kind==='injury-mishap'&&x.route==='hazards'),'Mishap routed to noncombat health');
// Current HMK 179–180: Treatment waits until immediate bleeding and Shock
// duties have been resolved; the calendar must allow the ten-minute Reroll.
ok(auto.suspended.some(x=>x.kind==='treatment'&&x.woundId===wound.id),
 'Treatment retained as suspended during acute Bleeding and Shock');
ok(!auto.all.some(x=>x.kind==='treatment'), 'Treatment does not block the earlier genuine Shock term');
ok(!auto.all.some(x=>x.kind==='shock-followup'&&x.route==='combat'),'No combat duplicate for shock');
eq(calendarEventDestination({kind:'shock-followup',originDomain:MEDICAL_ORIGIN.TRAVEL,route:'combat'}),'hazards','Legacy route override');
const m=unresolvedInjuryMishaps(actor.hmk.healthState);console.log('MISHAP kinds',m.map(x=>x.kind));
if(m.length){
  const item=m[0],isAuto=item.kind.startsWith('automatic-');
  const o=applyConfirmedInjuryMishap({state:actor.hmk.healthState,round:1,eventId:'mishap-752',mishapId:item.id,
    baseML:isAuto?null:60,roll:isAuto?null:40,hasDEX:true,actionUsesDEX:false,hasLegs:true,injuryImpairment:0,gmConfirmed:true});
  actor.hmk.healthState=o.state;
  ok(!unresolvedInjuryMishaps(o.state).some(x=>x.id===item.id),'Mishap one-time settled');
}
const treatment=applyConfirmedTreatment({state:actor.hmk.healthState,round:1,eventId:'untreated-752',woundId:wound.id,daySinceInjury:0,untreated:true,gmConfirmed:true});
actor.hmk.healthState=treatment.state;
ok(actor.hmk.healthState.wounds[0].healing?.treated,'GM chose untreated – recorded in original healthState');
// Untreated G injury creates a real Bleeder. Before UNC +10, a five-minute blood period is due.
const healer={id:'medic752',name:'Medic',kind:'PC',hmk:{attributes:{dex:14,str:12},skills:[{name:'Physician',ml:100}],healthState:initialCombatState()}};
clock.characterIds.push(healer.id); // isolated campaign fixture, no production mutation
const roster=[actor,healer];
const bleeder=actor.hmk.healthState.wounds[0];
ok(bleeder.bleeding,'Untreated G wound creates actual bleeding obligation');
const term=travelBleedingTerm({clock,actorId:actor.id,wound:bleeder,state:actor.hmk.healthState});
eq(term.dueMinute,485,'Blood Loss in 5 minutes anchored to original wound');
const plan=beginTravelBloodStoppage({clock,state:actor.hmk.healthState,patient:actor,healer,party:roster,woundId:bleeder.id,
 method:'cau',hasHeatedTool:true,eventId:'blood-start-752',gmConfirmed:true});
actor.hmk.healthState=plan.state;
clock=advanceCampaignCalendar(clock,{deltaMinutes:5,eventId:'five-752',reason:'Five-minute real treatment period',gmConfirmed:true,characters:roster});
eq(clock.minute,485,'Calendar exactly +5, no double time');
const outcome=completeTravelBleedingInterval({clock,state:actor.hmk.healthState,patient:actor,healer,party:roster,woundId:bleeder.id,
 mode:'stoppage',physicianRoll:10,strengthRoll:null,eventId:'blood-complete-752',gmConfirmed:true});
actor.hmk.healthState=outcome.state;
ok(outcome.stopped,'Confirmed cauterization ended bleeding');
console.log('BLOOD STOP',outcome.state.shock,outcome.state.shockFollowup);
try {advanceCampaignCalendar(clock,{deltaMinutes:6,eventId:'skip-752',reason:'No skipping shock after bleeding',gmConfirmed:true,characters:roster}); throw Error('Must block Shock deadline');}
catch(e){ok(/Nelze přeskočit|povinný|shock/i.test(e.message),'Do not skip Shock');}

clock=advanceCampaignCalendar(clock,{deltaMinutes:5,eventId:'five-again-752',reason:'GM verified another 5 minutes',gmConfirmed:true,characters:roster});
eq(clock.minute,490,'Calendar to UNC +10');
const shockState=actor.hmk.healthState,shockRoll=100,shockML=65;
const sl=['CF','F','S','CS'][successLevel(shockRoll,shockML)];
const shock=applyConfirmedShockRecovery({state:shockState,round:1,eventId:'shock-752',sl:'CF',timingConfirmed:true,
 characterId:actor.id,actorId:actor.id,turnEnded:false,elapsedMinutesSinceOriginal:10,shockML,roll:shockRoll,
 comaLocationShock:5,comaInjuryLevel:4,initialComaD10:3});
actor.hmk.healthState=shock.state;
eq(shock.state.extendedShock.domain,MEDICAL_ORIGIN.TRAVEL,'Extended Shock inherits accident origin');
eq(shock.state.coma.domain,MEDICAL_ORIGIN.TRAVEL,'Coma inherits accident origin');
eq(shock.state.coma.nextCourseDays,3,'Actual Coma d10 is persisted');
clock=anchorCampaignOrigin(clock,{kind:'extended-shock',characterId:actor.id,eventId:'anchor-ext-752',combatEventId:'shock-752',source:'confirmed-health'});
clock=anchorCampaignOrigin(clock,{kind:'coma',characterId:actor.id,eventId:'anchor-coma-752',combatEventId:'shock-752',source:'confirmed-health'});
const medical=campaignCalendarAgenda(clock,roster,[]);
const extDue=medical.all.find(x=>x.kind==='extended-shock'),comaDue=medical.all.find(x=>x.kind==='coma');
eq(extDue.minute,730,'Extended Shock exactly 4h');eq(comaDue.minute,490+3*1440,'Coma d10 days');
clock=advanceCampaignCalendar(clock,{deltaMinutes:240,eventId:'course-start-752',reason:'Four hours to Extended Shock test',gmConfirmed:true,characters:roster});
eq(clock.minute,730,'Exact +240 once');
const readiness=guidedTraumaCourseReadiness({state:actor.hmk.healthState,character:actor,kind:'extended-shock'});
ok(readiness.available&&readiness.nextHours===4,'Original Course executor agrees');
const extended=applyExtendedShockCourse({state:actor.hmk.healthState,round:1,eventId:'extended-course-752',healingBase:readiness.healingBase,roll:20,
 physicianStars:0,arcaneBonus:0,elapsedHoursSinceOnset:4,gmConfirmed:true});
actor.hmk.healthState=extended.state;
ok(extended.state.events.some(x=>x.id==='extended-course-752'),'Course event persisted');
ok(clock.minute===730,'Course did not alter authoritative time');
// A separate registered animal has the original HMK B/C body location and
// exactly the same immutable travel medical provenance; never copy the wound
// onto the human guide and never create an Initiative/Combat encounter.
const packAnimal={id:'pony752',name:'Pack pony',kind:'Animal',hmk:{verifiedMountedBreed:'pony',
 attributes:{agl:12,end:12,str:20},healthState:initialCombatState()}};
const animalResult=prepareSkillPhysicalInjury({kind:'survival-accident',actor:packAnimal,
 state:packAnimal.hmk.healthState,inventory:[],sourceId:'confirmed-animal-hazard-752',
 round:1,gmConfirmed:true,originMinute:480,hazardD10:5,agilityD100:81,
 randomVictimConfirmed:true,impactDie:6,zoneD10:2,locationD10:2,shockD100:95});
packAnimal.hmk.healthState=animalResult.state;
eq(animalResult.bodyKind,'horse','True animal anatomy used');
eq(packAnimal.hmk.healthState.shock,'UNC','Animal Shock UNC');
eq(packAnimal.hmk.healthState.wounds.length,1,'Animal has exactly one actual wound');
eq(medicalOriginOfWound(packAnimal.hmk.healthState.wounds[0],packAnimal.hmk.healthState.events),MEDICAL_ORIGIN.TRAVEL,'Animal wound origin');
let animalClock=createCampaignCalendar({day:1,hour:8,minute:0,label:'Animal health 752',eventId:'start-animal-752',gmConfirmed:true,campaignId:'audit752-animal',characterIds:[packAnimal.id]});
animalClock=anchorCampaignOrigin(animalClock,{kind:'wound',characterId:packAnimal.id,woundId:packAnimal.hmk.healthState.wounds[0].id,
 combatEventId:packAnimal.hmk.healthState.wounds[0].originEventId,eventId:'animal-wound-752',source:'confirmed-health'});
const animalDue=campaignCalendarAgenda(animalClock,[packAnimal],[]);
ok(animalDue.future.some(x=>x.kind==='weather-shock'&&x.minute===490),'Animal shock due at original +10m');
const animalFollowups=automaticHMKFollowups(animalClock,[packAnimal],[]);
ok(animalFollowups.suspended.some(x=>x.kind==='treatment'&&x.woundId===packAnimal.hmk.healthState.wounds[0].id),'Animal Treatment retained without blocking Shock');
ok(!animalFollowups.all.some(x=>x.kind==='shock-followup'&&x.route==='combat'),'No phantom animal Combat shock');
try{advanceCampaignCalendar(animalClock,{deltaMinutes:11,eventId:'animal-bad-skip',reason:'Cannot skip animal Shock',gmConfirmed:true,characters:[packAnimal]});
 throw Error('Skipping animal health deadline must be rejected');}
catch(e){ok(/Nelze přeskočit|povinný|shock/i.test(e.message),'Animal cannot skip Shock +10');}

// Unit-only proof of the next Coma roll at the previously witnessed d10-day
// boundary. This does NOT claim interactive passage across all intervening
// Extended Shock/other calendar deadlines.
const comaSimulation=applyComaCourse({state:actor.hmk.healthState,round:1,eventId:'coma-course-752',
 healingBase:readiness.healingBase,roll:20,periodD10:4,daysElapsed:3,
 restfulShelter:true,arcaneBonus:0,gmConfirmed:true});
ok(comaSimulation.state.events.some(x=>x.id==='coma-course-752'),'One Coma Course in original Health state');
ok(comaSimulation.state.coma===null||comaSimulation.state.coma.elapsedDays===3,'Coma progress is persisted');
try{applyComaCourse({state:actor.hmk.healthState,round:1,eventId:'early-coma-752',
 healingBase:readiness.healingBase,roll:20,periodD10:4,daysElapsed:2,restfulShelter:true,gmConfirmed:true});
 throw Error('Must reject early Coma Course');}
catch(e){ok(/d10denní|předchozí|Coma/.test(e.message),'Coma forbids prematurely rolled course');}

// A second real confirmed Travel injury with INC Shock: its next verified
// out-of-combat action may clear Shock and expose the original Injury Morale.
const moralePerson={id:'morale752',name:'Ranger with injury morale',kind:'PC',hmk:{
 attributes:{agl:12,str:12,end:12,dex:12,wil:12},
 skills:[{name:'Shock',ml:65},{name:'Initiative',ml:60}],healthState:initialCombatState()}};
const moraleWound=prepareSkillPhysicalInjury({kind:'survival-accident',actor:moralePerson,inventory:[],
 state:moralePerson.hmk.healthState,sourceId:'morale-provenance-752',round:1,gmConfirmed:true,originMinute:480,
 hazardD10:5,agilityD100:81,randomVictimConfirmed:true,impactDie:6,zoneD10:2,locationD10:2,shockD100:95});
eq(moraleWound.state.shock,'INC','INC shock after original injury');
const moraleRecovered=applyConfirmedShockRecovery({state:moraleWound.state,round:1,eventId:'morale-shock-recovered-752',
 sl:'CS',timingConfirmed:true,characterId:moralePerson.id,actorId:moralePerson.id,
 turnEnded:true,elapsedMinutesSinceOriginal:0,shockML:65,roll:10});
eq(moraleRecovered.state.shock,'NONE','Confirmed next action and CS recover from INC');
ok(dueInjuryMorale(moraleRecovered.state).some(x=>x.woundId===moraleWound.state.wounds[0].id),
 'Original pending Injury Morale appears after Shock recovery');
const moraleSolved=applyConfirmedInjuryMorale({state:moraleRecovered.state,round:1,eventId:'injury-morale-752',
 woundId:moraleWound.state.wounds[0].id,initiativeML:60,roll:20,aberrance:0,gmConfirmed:true});
ok(!dueInjuryMorale(moraleSolved.state).length,'One actual Injury Morale stored');
try{applyConfirmedInjuryMorale({state:moraleSolved.state,round:1,eventId:'duplicate-morale-752',
 woundId:moraleWound.state.wounds[0].id,initiativeML:60,roll:20,aberrance:0,gmConfirmed:true});
 throw Error('Repeated injury morale cannot pass');}
catch(e){ok(/Žádný splatný Morale/.test(e.message),'No second Injury Morale from same wound');}

// Reproduced defect: an immediate *post-all-Bleeders* reroll may convert
// INC to STN. The next STN follow-up must have an ordinary next-action
// requirement (originRound+1), not a stale same-round dueRound.
const afterAll=structuredClone(moraleWound.state);
afterAll.shockFollowup={kind:'INC',originRound:1,dueRound:1,phase:'after-all-bleeding-stopped',
 timelineId:null,domain:MEDICAL_ORIGIN.TRAVEL,sourceId:afterAll.wounds[0].id,originMinute:485};
ok(validateCombatState(afterAll),'Witness state has valid original accident and immediate Blood Shock');
const immediate=completeTravelBloodShockReroll({clock:{minute:485},state:afterAll,actorId:moralePerson.id,
 sourceId:afterAll.wounds[0].id,shockML:65,roll:37,eventId:'immediate-blood-shock-752',gmConfirmed:true});
eq(immediate.state.shock,'STN','Actual immediate Shock S recovers INC into STN');
eq(immediate.state.shockFollowup.dueRound,2,'STN next-action dueRound is following event order');
eq(immediate.state.shockFollowup.domain,MEDICAL_ORIGIN.TRAVEL,'New STN does not turn into Combat state');
ok(validateCombatState(immediate.state),'Immediate Shock→STN survives durable Health validation');
try{completeTravelBloodShockReroll({clock:{minute:485},state:immediate.state,actorId:moralePerson.id,
 sourceId:afterAll.wounds[0].id,shockML:65,roll:37,eventId:'duplicate-immediate-blood-752',gmConfirmed:true});
 throw Error('Duplicate immediate reroll cannot pass');}
catch(e){ok(/Okamžitý Blood Shock Reroll není splatný/.test(e.message),'Immediate Blood Shock cannot repeat twice');}
console.log('PASS',tests,'checks of provenance, same-minute obligations, bleeding, Shock, Extended and Coma scheduling');
