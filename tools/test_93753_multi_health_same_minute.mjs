/** Isolated 3-body same-minute original HMK medical event regression.
 * Real original accident Injury, Treatment, Shock, Coma/Ext and calendar agenda.
 * Verifies every completion order with NO changed campaign minute. */
import assert from 'node:assert/strict';
import {prepareSkillPhysicalInjury} from '../src/integration/hmk-skill-physical-consequences.js';
import {initialCombatState,applyConfirmedShockRecovery,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {applyConfirmedTreatment} from '../src/integration/hmk-healing-persistence.js';
import {verifiedNoncombatComaCause} from '../src/integration/hmk-noncombat-coma-cause-93753.js';
import {verifiedMountedShockML,verifiedMountedAnimalAnatomy} from '../src/integration/hmk-mounted-live-animal-falling.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {successLevel} from '../src/rules/tests.js';
let n=0; const eq=(a,b,note)=>{assert.deepEqual(a,b,note);n++};const ok=(a,note)=>{assert.ok(a,note);n++};
function buildActors(){
 const actors=[
  {id:'pc-a',kind:'PC',name:'Guide',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12},skills:[{name:'Shock',ml:65},{name:'Initiative',ml:65}],healthState:initialCombatState()}},
  {id:'pc-b',kind:'PC',name:'Tracker',hmk:{attributes:{str:14,end:14,dex:12,agl:11,per:14,wil:12,rea:12},skills:[{name:'Shock',ml:65},{name:'Initiative',ml:65}],healthState:initialCombatState()}},
  {id:'pony',kind:'Animal',name:'Pony',hmk:{verifiedMountedBreed:'pony',attributes:{str:20,end:12,agl:12},healthState:initialCombatState()}}
 ];
 for (const a of actors){
  const animal=!!a.hmk.verifiedMountedBreed;
  const injury=prepareSkillPhysicalInjury({kind:'survival-accident',actor:a,inventory:[],state:a.hmk.healthState,
   sourceId:'multi-753-'+a.id,round:1,gmConfirmed:true,originMinute:480,
   hazardD10:5,agilityD100:100,randomVictimConfirmed:true,
   impactDie:animal?1:1,zoneD10:animal?2:1,locationD10:animal?2:6,shockD100:100});
  a.hmk.healthState=injury.state;
  eq(a.hmk.healthState.shock,'UNC',a.id+' original UNC');
  eq(a.hmk.healthState.wounds.length,1,a.id+' one causal wound');
  const w=a.hmk.healthState.wounds[0];
  const cause=verifiedNoncombatComaCause({actor:a,state:a.hmk.healthState,shockFollowup:a.hmk.healthState.shockFollowup});
  eq(cause.ready,true,a.id+' verified printed anatomical LS and IL');
  if(animal)eq(cause.locationShock,verifiedMountedAnimalAnatomy('pony').locations.find(x=>x.code===w.location).shock,'Pony LS p355');
  const untreated=applyConfirmedTreatment({state:a.hmk.healthState,round:1,eventId:'untreated-'+a.id,woundId:w.id,daySinceInjury:0,untreated:true,gmConfirmed:true});
  a.hmk.healthState=untreated.state;
 }
 return actors;
}
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
for(const [caseIndex,order] of permutations.entries()){
 const actors=buildActors();
 let clock=createCampaignCalendar({day:1,hour:8,minute:0,label:'Same minute p753',eventId:'start-753-'+caseIndex,gmConfirmed:true,campaignId:'audit753-'+caseIndex,characterIds:actors.map(x=>x.id)});
 for(const a of actors){const w=a.hmk.healthState.wounds[0];clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:a.id,woundId:w.id,combatEventId:w.originEventId,eventId:'anchor-'+a.id,source:'confirmed-health'});}
 eq(clock.minute,480,'Original minute before shock');
 eq(campaignCalendarAgenda(clock,actors,[]).future.filter(x=>x.kind==='weather-shock').length,3,'Three same-minute health deadlines');
 clock=advanceCampaignCalendar(clock,{deltaMinutes:10,eventId:'advance-ten-'+caseIndex,reason:'GM-confirmed 10 minutes',gmConfirmed:true,characters:actors,journal:[],inventory:[]});
 eq(clock.minute,490,'Exactly +10 GM minutes');
 eq(campaignCalendarAgenda(clock,actors,[]).due.filter(x=>x.kind==='weather-shock').length,3,'Three health rolls due simultaneously');
 for(const i of order){
  const a=actors[i],old=a.hmk.healthState,q=old.shockFollowup;
  const ml=a.hmk.verifiedMountedBreed?verifiedMountedShockML(a):65;
  const roll=(i===0||i===2)?100:5;
  const eml=ml-(old.fatigue?.windedness||0)-(old.fatigue?.weariness||0)-(old.fatigue?.otherWeakness||0)-20;
  const sl=['CF','F','S','CS'][successLevel(roll,eml)];
  const cause=verifiedNoncombatComaCause({actor:a,state:old,shockFollowup:q});
  const coma=sl==='CF'?{comaLocationShock:cause.locationShock,comaInjuryLevel:cause.injuryLevel,initialComaD10:i===2?3:1}:{};
  const result=applyConfirmedShockRecovery({state:old,round:1,eventId:'shock-753-'+caseIndex+'-'+a.id,
   sl,timingConfirmed:true,characterId:a.id,actorId:a.id,turnEnded:false,elapsedMinutesSinceOriginal:10,shockML:ml,roll,...coma});
  ok(validateCombatState(result.state),'Valid shared health after shock for '+a.id);
  eq(result.state.events.length,old.events.length+1,'Exactly one event per original Shock Reroll');
  eq(result.state.events.at(-1).type,'shock-recovery','Original health writer');
  if(sl==='CF'){
   eq(result.state.coma.hr,cause.initialHR,'Coma HR from original anatomical evidence');
   eq(result.state.coma.nextCourseDays,coma.initialComaD10,'Original d10 interval');
   eq(result.state.extendedShock.sourceId,q.sourceId,'Extended Shock original Travel provenance');
   clock=anchorCampaignOrigin(clock,{kind:'extended-shock',characterId:a.id,eventId:'ext-'+caseIndex+'-'+a.id,combatEventId:result.state.events.at(-1).id,source:'confirmed-health'});
   clock=anchorCampaignOrigin(clock,{kind:'coma',characterId:a.id,eventId:'coma-'+caseIndex+'-'+a.id,combatEventId:result.state.events.at(-1).id,source:'confirmed-health'});
  }
  a.hmk.healthState=result.state;
  eq(clock.minute,490,'Health action cannot move calendar');
  eq(campaignCalendarAgenda(clock,actors,[]).due.filter(x=>x.kind==='weather-shock').length,3-order.slice(0,order.indexOf(i)+1).length,'Remaining simultaneous Shock obligations preserved');
  try{applyConfirmedShockRecovery({state:result.state,round:1,eventId:'repeat-'+a.id,sl,timingConfirmed:true,characterId:a.id,actorId:a.id,turnEnded:false,elapsedMinutesSinceOriginal:10,shockML:ml,roll,...coma});throw Error('Duplicated Shock accepted');}
  catch(e){ok(/Shock|zotav|Extended|not|require/i.test(e.message),'Repeat Shock must be rejected');}
 }
 ok(campaignCalendarAgenda(clock,actors,[]).future.some(x=>x.kind==='extended-shock'),'Post-accident Extended Shock scheduled');
 ok(campaignCalendarAgenda(clock,actors,[]).future.some(x=>x.kind==='coma'),'Post-accident Coma Course scheduled');
}
console.log('PASS',n,'assertions, 6 completion permutations, humans + original pony anatomy, all same-minute Shock obligations preserved.');
