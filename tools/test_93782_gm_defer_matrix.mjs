import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {preparePoisonStart,preparePoisonOnset} from '../src/integration/hmk-poison-course.js';
import {prepareDiseaseExposure,prepareDiseaseProfile} from '../src/integration/hmk-disease-course.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar,deferGMCalendarHealthObligation,assertCampaignCalendarAppendOnly,validateCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {mandatoryCalendarWindow} from '../src/integration/hmk-calendar-chronology.js';
let assertions=0;const ok=(v,m)=>{assert.ok(v,m);assertions++};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++};
function actor(i){return {id:'a'+i,kind:'PC',name:'Pacient '+i,hmk:{attributes:{end:12,wil:12},healthState:initialCombatState()}};}
function build(){
 const actors=Array.from({length:8},(_,i)=>actor(i+1));
 for(let i=0;i<3;i++){
  const a=actors[i];
  for(let j=0;j<2;j++){
   const src='viper-'+i+'-'+j;
   const start=preparePoisonStart({actor:a,state:a.hmk.healthState,sourceId:src,
    transmission:'contact',onsetMinutes:60,periodMinutes:60,initialHR:5,
    symptomD10s:[1,3,5,8],actualExposureConfirmed:true,gmConfirmed:true});
   const onset=preparePoisonOnset({actor:a,state:start.state,sourceId:src,elapsedMinutes:60,gmConfirmed:true});
   a.hmk.healthState=onset.state;
  }
 }
 for(let i=3;i<6;i++){
  const a=actors[i],src='fever-'+i;
  const ex=prepareDiseaseExposure({actor:a,state:a.hmk.healthState,sourceId:src,diseaseKey:'winter-fever',
   transmission:'airborne',contagionIndex:5,contagionD100:100,confirmedStandardLethal:true,gmConfirmed:true});
  ok(ex.report.contracted,'disease actually contracted');
  a.hmk.healthState=prepareDiseaseProfile({actor:a,state:ex.state,sourceId:src,
   onsetD6:1,initialHR:5,symptomD10s:[1,2,3,4],gmConfirmed:true}).state;
 }
 for(let i=6;i<8;i++){
  const s=actors[i].hmk.healthState;
  s.shock='UNC';s.extendedShock={originState:'UNC',hr:4,elapsedHours:0};
  s.coma={active:true,hr:4,elapsedDays:0,nextCourseDays:1};
 }
 for(const a of actors)ok(validateCombatState(a.hmk.healthState),'strict health valid '+a.id);
 return actors;
}
for(let permutation=0;permutation<6;permutation++){
 const actors=build();
 let clock=createCampaignCalendar({day:1,hour:0,minute:0,gmConfirmed:true,eventId:'init-'+permutation,characterIds:actors.map(a=>a.id)});
 for(let i=0;i<3;i++)for(let j=0;j<2;j++)clock=anchorCampaignOrigin(clock,{kind:'poison',characterId:actors[i].id,episodeId:'poison:viper-'+i+'-'+j,gmConfirmed:true,eventId:'anchor-'+permutation+'-'+i+'-'+j});
 for(let i=3;i<6;i++)clock=anchorCampaignOrigin(clock,{kind:'disease',characterId:actors[i].id,episodeId:'disease:fever-'+i,gmConfirmed:true,eventId:'anchor-'+permutation+'-'+i});
 for(let i=6;i<8;i++)for(const kind of ['coma','extended-shock'])clock=anchorCampaignOrigin(clock,{kind,characterId:actors[i].id,gmConfirmed:true,eventId:'anchor-'+permutation+'-'+i+'-'+kind});
 const source=JSON.stringify(actors.map(a=>a.hmk.healthState));
 let agenda=campaignCalendarAgenda(clock,actors,[]);
 eq(agenda.future.filter(x=>x.kind==='poison').length,6,'six independent poison deadlines');
 eq(agenda.future.filter(x=>x.kind==='disease').length,3,'three independent disease deadlines');
 eq(agenda.future.filter(x=>x.kind==='coma').length,2,'two coma deadlines');
 eq(agenda.future.filter(x=>x.kind==='extended-shock').length,2,'two shock deadlines');
 eq(mandatoryCalendarWindow({minute:clock.minute,agenda,maxMinutes:1000}).maxAllowed,120,'earliest poison deadline');
 clock=advanceCampaignCalendar(clock,{deltaMinutes:120,eventId:'advance-'+permutation,reason:'První dvě hodiny',gmConfirmed:true,characters:actors});
 agenda=campaignCalendarAgenda(clock,actors,[]);
 eq(agenda.due.length,6,'six independently due poison checks');
 assert.throws(()=>advanceCampaignCalendar(clock,{deltaMinutes:1,eventId:'cannot',reason:'Premature advance',gmConfirmed:true,characters:actors}),/povinný/);assertions++;
 const perm=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]][permutation];
 let count=0;
 for(const i of perm)for(let j=0;j<2;j++){
  const a=actors[i],ev=campaignCalendarAgenda(clock,actors,[]).due.find(x=>x.characterId===a.id&&x.kind==='poison'&&x.episodeId==='poison:viper-'+i+'-'+j);
  ok(!!ev,'verified due event');
  const before=clock;
  clock=deferGMCalendarHealthObligation(clock,{obligation:ev,characters:actors,eventId:'defer-'+permutation+'-'+i+'-'+j,reason:'Zkušební výjimka GM při selhání formuláře',gmConfirmed:true});
  ok(assertCampaignCalendarAppendOnly({campaignClock:before},{campaignClock:clock}),'append only');
  count++;
  eq(campaignCalendarAgenda(clock,actors,[]).due.length,6-count,'other medical sources remain blocked');
  eq(campaignCalendarAgenda(clock,actors,[]).deferred.length,count,'deferred preserved visibly');
  eq(clock.minute,120,'no clock move from deferral');
 }
 eq(JSON.stringify(actors.map(a=>a.hmk.healthState)),source,'no state edited or fabricated');
 for(const [ev,id,confirm] of [[agenda.due[0],'dup',true],[agenda.future[0],'future',true],[{id:'faked',characterId:'a1',kind:'poison',minute:120},'fake',true],[agenda.due[0],'not-confirmed',false]]){
  assert.throws(()=>deferGMCalendarHealthObligation(clock,{obligation:ev,characters:actors,eventId:id,reason:'Reason long enough',gmConfirmed:confirm}));assertions++;
 }
 eq(mandatoryCalendarWindow({minute:clock.minute,agenda:campaignCalendarAgenda(clock,actors,[]),maxMinutes:600}).maxAllowed,120,'next different medical deadline');
 clock=advanceCampaignCalendar(clock,{deltaMinutes:120,eventId:'after-'+permutation,reason:'Další dvě hodiny',gmConfirmed:true,characters:actors});
 eq(clock.minute,240,'advanced only to next event');
 eq(campaignCalendarAgenda(clock,actors,[]).due.filter(x=>x.kind==='extended-shock').length,2,'independent shock now due');
 const reload=JSON.parse(JSON.stringify(clock));ok(validateCampaignCalendar(reload),'reload validated');
 eq(campaignCalendarAgenda(reload,actors,[]).deferred.length,6,'six unchanged debts survive reload');
}
console.log('PASS v93.782',assertions,'actual-source health obligations, six resolution orders, no invented dice, no combat');
