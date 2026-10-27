'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 const {applyConfirmedTreatment,applyConfirmedInjuryHealing}=await import('../src/integration/hmk-healing-persistence.js');
 const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda}=await import('../src/integration/hmk-campaign-calendar.js');
 let checks=0;
 const yes=(b,m)=>{assert.ok(b,m);checks++};
 const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
 const err=(f,re)=>{assert.throws(f,re);checks++};
 const fresh=({id='w1',level=3,aspect='p',impaled=true}={})=>{
  const s=initialCombatState();s.wounds=[{id,location:'ua',severity:level>=4?'G':level>=2?'S':'M',level,aspect,
   projectileArrowOrBolt:aspect==='p',impaled,bleeding:false,nextAdvanceRound:null}];
  validateCombatState(s);return s;
 };
 const act=(state,opts={})=>applyConfirmedTreatment({state,round:state.lastRound+1,eventId:'surgical:'+String(state.events.length+1),woundId:'w1',daySinceInjury:0,
  physicianML:50,physicianIndex:5,physicianRoll:21,available:['surgery-tools','water','bandages','needle-thread'],gmConfirmed:true,...opts});
 // p178: every extraction, even a critical failure, removes an embedded arrow.
 for(const [roll,expected] of [[21,'S'],[61,'F'],[65,'CF'],[20,'CS']]){
  const r=act(fresh({level:3}),{physicianRoll:roll});
  eq(r.state.wounds[0].impaled,false,'S3 extraction must remove the arrow for '+expected);
  eq(r.state.events.at(-1).details.projectileExtracted,true,'extraction evidenced in event');
  eq(r.state.wounds[0].healing.treatments[0].treatmentMethod,'ext');
  eq(r.state.wounds[0].healing.treatments[0].procedureMinutes,30);
  validateCombatState(JSON.parse(JSON.stringify(r.state)));checks++;
 }
 // G4 extraction F -> bleeder; same projectile is not removed twice.
 let r=act(fresh({level:4}),{physicianRoll:61});
 yes(r.state.wounds[0].bleeding,'G failed extraction must cause a bleeding injury');
 eq(r.state.wounds[0].nextAdvanceRound,r.state.lastRound+60,'bleeding Advance due');
 eq(r.state.wounds[0].impaled,false);
 eq(r.state.events.at(-1).details.surgeryBleeder,true);
 // S followed by F: retained prior HR, but the *later* failed surgery
 // has a fresh physical bleeding effect, not suppressed by a higher SL.
 let s=fresh({level:4,aspect:'e',impaled:false});
 r=act(s,{physicianML:65,physicianIndex:6,physicianRoll:41});s=r.state;
 yes(!s.wounds[0].bleeding,'successful first surgery without table bleeder');
 const previousHR=s.wounds[0].healing.healingRate;
 r=act(s,{physicianML:65,physicianIndex:7,physicianRoll:91});s=r.state;
 yes(s.wounds[0].bleeding,'later F surgery is a bleeder even when prior result wins');
 eq(s.wounds[0].healing.healingRate,previousHR,'retain best SL for HR only');
 eq(s.wounds[0].healing.treatments.length,2,'all actual attempts persisted');
 eq(s.events.at(-1).details.bleedingAfterTreatment,true);
 // Before treating any other injury, bleed must stop (p178).
 const another={id:'w2',location:'ll',severity:'M',level:1,aspect:'b',bleeding:false,nextAdvanceRound:null};
 s.wounds.push(another);
 err(()=>applyConfirmedTreatment({state:s,round:s.lastRound+1,eventId:'block2',woundId:'w2',daySinceInjury:0,
  untreated:true,gmConfirmed:true}),/krvácení|krv|Shock/i);
 // A G wound left untreated inherits the CF *bleeder*, not only HR.
 r=applyConfirmedTreatment({state:fresh({level:4,aspect:'b',impaled:false}),round:1,
  eventId:'untreated-grievous',woundId:'w1',daySinceInjury:0,untreated:true,gmConfirmed:true});
 yes(r.state.wounds[0].bleeding,'untreated G blunt CF causes physical bleed');
 eq(r.state.wounds[0].nextAdvanceRound,61,'untreated bleeder due after five minutes');
 eq(r.state.events.at(-1).details.untreatedBleeder,true,'untreated bleed recorded as rule effect');
 eq(r.state.wounds[0].healing.treatments.length,0,'no invented Physician roll');
 // No invented roll, material equipment, or treatment outcome when blocked.
 err(()=>act(fresh({level:4}),{physicianRoll:61,available:[]}),/vybavení|Chybí/);
 yes(!fresh({level:4}).wounds[0].healing,'original untouched');
 // Calendar sees physical bleeding as a real mandatory follow-up.
 let clock=createCampaignCalendar({day:1,hour:10,minute:0,label:'Surgical',gmConfirmed:true,eventId:'start',campaignId:'sur542',characterIds:['victim']});
 clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'victim',woundId:'w1',elapsedMinutes:0,eventId:'anchor',gmConfirmed:true});
 const agenda=campaignCalendarAgenda(clock,[{id:'victim',name:'Victim',hmk:{combatState:s}}],[]);
 yes(agenda.all.some(x=>x.kind==='bleeding')||agenda.due.some(x=>x.kind==='bleeding'),'calendar lists surgical bleeding');
 // Treatment carries no guessed wall-clock advancement; caller must record
 // actual duration separately with the authoritative campaign clock.
 eq(s.events.at(-1).details.procedureMinutes,30);
 eq(s.events.at(-1).details.daySinceInjury,0);
 console.log('PASS v93.542 surgical side effects, extraction, bleeding and calendar:',checks,'checks');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
