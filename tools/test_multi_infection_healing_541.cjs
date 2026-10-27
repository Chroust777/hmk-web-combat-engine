'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 const {applyConfirmedInfectionCourse,applyConfirmedInjuryHealing}=await import('../src/integration/hmk-healing-persistence.js');
 const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar}=await import('../src/integration/hmk-campaign-calendar.js');
 let checks=0;const eq=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
 const yes=(a,why)=>{assert.ok(a,why);checks++};
 const fails=(f,pattern)=>{assert.throws(f,pattern);checks++};
 const fresh=(id,infected)=>({id,location:'ua',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null,
  healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:true,infected,
   ...(infected?{infectionHR:3,nextInfectionDay:6,infectionWeakness:5}:{infectionWeakness:0})}});
 let s=initialCombatState();s.wounds=[fresh('w-a',true),fresh('w-b',true),fresh('w-c',false)];s.fatigue.otherWeakness=10;
 validateCombatState(s);checks++;
 const actor=()=>[{id:'victim',name:'Patient',hmk:{combatState:s}}];
 let clock=createCampaignCalendar({day:7,hour:8,minute:0,label:'Two infections',gmConfirmed:true,eventId:'init541',campaignId:'med541',characterIds:['victim']});
 for(const w of s.wounds)clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'victim',woundId:w.id,elapsedMinutes:6*1440,eventId:'origin:'+w.id,gmConfirmed:true});
 let agenda=campaignCalendarAgenda(clock,actor(),[]);
 eq(agenda.due.filter(x=>x.kind==='infection').length,2,'two independent overdue infection courses');
 eq(agenda.suspended.length,3,'all three wounds are suspended');
 eq(agenda.all.filter(x=>x.kind==='healing').length,0,'no healing when any infection active');
 fails(()=>advanceCampaignCalendar(clock,{deltaMinutes:1,eventId:'skip',reason:'skip despite infection',gmConfirmed:true,characters:actor()}),/Infection Course/);
 const course=(id,day,roll,otherWoundDays={},eventId=`course:${id}:${day}`)=>{
  const r=applyConfirmedInfectionCourse({state:s,round:s.lastRound+1,eventId,woundId:id,daySinceInjury:day,endurance:12,will:12,roll,physicianSV:0,otherWoundDays,gmConfirmed:true});
  s=r.state;validateCombatState(s);checks++;return r.result;
 };
 // Both daily courses advance independently; weakness stacks and clears per wound.
 let r=course('w-a',6,5);eq(r.hr,5);eq(s.fatigue.otherWeakness,5,'first infection weakness clears without clearing the other');
 r=course('w-b',6,5);eq(r.hr,5);eq(s.fatigue.otherWeakness,0,'second infection weakness clears');
 r=course('w-a',7,1);yes(r.defeated,'first infection defeated');
 eq(s.wounds[0].healing.infected,false);eq(s.wounds[1].healing.infected,true);
 eq(s.wounds[0].healing.nextHealingDay,5,'first infection cannot yet resume healing');
 eq(campaignCalendarAgenda(clock,actor(),[]).suspended.length,3,'all still suspended after first cure');
 fails(()=>applyConfirmedInjuryHealing({state:s,round:10,eventId:'premature-healing',woundId:'w-a',daySinceInjury:7,endurance:12,will:12,roll:1,gmConfirmed:true}),/infek|infection|Infek|Infection/);
 fails(()=>applyConfirmedInfectionCourse({state:s,round:s.lastRound+1,eventId:'missing-ages',woundId:'w-b',daySinceInjury:7,endurance:12,will:12,roll:1,gmConfirmed:true}),/Chybí potvrzený počet dní/);
 r=course('w-b',7,1,{'w-a':7,'w-c':7});yes(r.defeated,'last infection ends');
 eq(s.wounds.map(w=>w.healing.nextHealingDay),[12,12,12]);
 eq(campaignCalendarAgenda(clock,actor(),[]).suspended.length,0,'no frozen healing after final cure');
 eq(campaignCalendarAgenda(clock,actor(),[]).all.filter(x=>x.kind==='healing').length,3);
 const saved=JSON.parse(JSON.stringify(s));validateCombatState(saved);checks++;
 eq(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:saved}}],[]).all.filter(x=>x.kind==='healing').length,3,'serialized state preserves all due times');
 // A second infection interrupts the freshly restarted five-day period.
 const second=applyConfirmedInjuryHealing({state:s,round:s.lastRound+1,eventId:'second-infection',woundId:'w-a',daySinceInjury:12,endurance:12,will:12,roll:95,gmConfirmed:true});
 yes(second.infected,'new CF creates second infection');s=second.state;
 eq(campaignCalendarAgenda(clock,actor(),[]).suspended.length,3,'a new infection freezes all again');
 fails(()=>applyConfirmedInfectionCourse({state:s,round:s.lastRound+1,eventId:'wrong-day',woundId:'w-a',daySinceInjury:12,endurance:12,will:12,roll:1,gmConfirmed:true}),/splatný|den/);
 r=course('w-a',13,1,{'w-b':13,'w-c':13});yes(r.defeated);
 eq(s.wounds.map(w=>w.healing.nextHealingDay),[18,18,18],'restart exactly 5 days after actual second cure');
 eq(s.events.filter(e=>e.type==='infection-course').length,5,'all infection rolls retained in history');
 // Historical delayed term: show overdue, do not auto-roll in the past or
 // fabricate a missed five-day period from the present calendar minute.
 let overdueClock=createCampaignCalendar({day:23,hour:8,minute:0,label:'Attested overdue',gmConfirmed:true,eventId:'overdue541',campaignId:'med541',characterIds:['victim']});
 for(const w of s.wounds)overdueClock=anchorCampaignOrigin(overdueClock,{kind:'wound',characterId:'victim',woundId:w.id,elapsedMinutes:22*1440,eventId:'overdue:'+w.id,gmConfirmed:true});
 const overdueAgenda=campaignCalendarAgenda(overdueClock,actor(),[]);
 eq(overdueAgenda.due.filter(x=>x.kind==='healing').length,3,'past confirmed due periods are explicitly overdue');
 fails(()=>advanceCampaignCalendar(overdueClock,{deltaMinutes:1,eventId:'skip-overdue',reason:'overdue still unresolved',gmConfirmed:true,characters:actor()}),/Nelze přeskočit|Healing Roll/);
 fails(()=>applyConfirmedInjuryHealing({state:s,round:s.lastRound+1,eventId:'late-unproved-roll',woundId:'w-b',daySinceInjury:22,endurance:12,will:12,roll:1,gmConfirmed:true}),/splatný přesně|pětideního/);
 const eventsBefore=s.events.length;
 // Invalid/legacy due fields are never invisible: mandatory GM remediation.
 const broken=structuredClone(s);broken.wounds[0].healing.nextHealingDay=null;
 let issues=campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:broken}}],[]).unknown;
 yes(issues.some(x=>x.woundId==='w-a'&&x.kind==='healing'),'no silent disappearance of missing healing deadline');
 fails(()=>advanceCampaignCalendar(clock,{deltaMinutes:1,eventId:'bad-advance',reason:'missing due proof',gmConfirmed:true,characters:[{id:'victim',name:'Patient',hmk:{combatState:broken}}]}),/doložen|neověřen/);
 const brokenInfection=structuredClone(s);brokenInfection.wounds[0].healing.infected=true;brokenInfection.wounds[0].healing.infectionHR=4;brokenInfection.wounds[0].healing.nextInfectionDay=null;
 issues=campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:brokenInfection}}],[]).unknown;
 yes(issues.some(x=>x.woundId==='w-a'&&x.kind==='infection'),'missing course due shown');
 eq(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:brokenInfection}}],[]).suspended.length,3,'infection still freezes all other wound healing');
 fails(()=>advanceCampaignCalendar(clock,{deltaMinutes:1,eventId:'no-skipping',reason:'missing course evidence',gmConfirmed:true,characters:[{id:'victim',name:'Patient',hmk:{combatState:brokenInfection}}]}),/neověřen|doložen/);
 const corruptHR=structuredClone(s);corruptHR.wounds[0].healing.healingRate=null;
 yes(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:corruptHR}}],[]).unknown.some(x=>x.kind==='healing'),'invalid healing HR blocks unsafe assumptions');
 const oldInfectedHealed=structuredClone(s);oldInfectedHealed.wounds[1].healed=true;oldInfectedHealed.wounds[1].healing.infected=true;
 yes(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:oldInfectedHealed}}],[]).unknown.some(x=>x.woundId==='w-b'&&x.kind==='infection'),'contradictory healed/infected state is visible');
 const partialTreatment=structuredClone(s);partialTreatment.wounds[0].healing={treated:false};
 yes(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:partialTreatment}}],[]).unknown.some(x=>x.woundId==='w-a'&&x.kind==='treatment'),'partial legacy treatment does not vanish');
 const nonMundane=structuredClone(s);nonMundane.wounds[0].healing.noMundaneHealing=true;
 const blockedRecovery=campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:nonMundane}}],[]);
 yes(blockedRecovery.suspended.some(x=>x.woundId==='w-a'&&x.kind==='healing-blocked'),'indefinite/non-mundane injury visible without a fictitious d100');
 yes(!blockedRecovery.all.some(x=>x.woundId==='w-a'&&x.kind==='healing'),'nonmundane injury never gets ordinary healing due');
 eq(s.events.length,eventsBefore,'invalid cases did not mutate original history');
 // Undocumented wound age remains unresolved even if next day has a number.
 const missingAnchor=createCampaignCalendar({day:7,hour:8,minute:0,label:'Legacy',gmConfirmed:true,eventId:'legacy541',campaignId:'med541',characterIds:['victim']});
 const unknown=campaignCalendarAgenda(missingAnchor,actor(),[]).unknown;
 eq(unknown.filter(x=>x.kind==='healing').length,3,'three wounds need authoritative age origin');
 fails(()=>advanceCampaignCalendar(missingAnchor,{deltaMinutes:1,eventId:'legacy-skip',reason:'legacy time gap',gmConfirmed:true,characters:actor()}),/neověřen|doložen/);
 console.log('PASS v93.541 multi-infection, repeated interruption, deadline evidence and durable calendar:',checks,'checks');
})().catch(e=>{console.error(e);process.exitCode=1});
