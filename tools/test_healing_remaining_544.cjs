'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 const {applyConfirmedTreatment,applyConfirmedFrostAmputation,applyConfirmedInjuryHealing}=await import('../src/integration/hmk-healing-persistence.js');
 const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda}=await import('../src/integration/hmk-campaign-calendar.js');
 let n=0;
 const eq=(a,b,why)=>{assert.deepEqual(a,b,why);n++};
 const yes=(a,why)=>{assert.ok(a,why);n++};
 const nope=(fn,match)=>{assert.throws(fn,match);n++};
 const roundtrip=s=>{validateCombatState(JSON.parse(JSON.stringify(s)));n++};
 const testState=(aspect='frost',level=4,location='ua',side='left')=>{const s=initialCombatState();s.wounds.push({id:'w1',location,side,bodyKind:'human',severity:level>=4?'G':level>=2?'S':'M',level,aspect,bleeding:false,nextAdvanceRound:null});return s;};
 const amp=(s,physicianRoll=21,opts={})=>applyConfirmedFrostAmputation({state:s,eventId:'amp:'+physicianRoll,round:1,woundId:'w1',daySinceInjury:0,
  physicianML:80,physicianIndex:5,physicianRoll,locationShock:1,shockML:90,shockRoll:21,
  gmConfirmed:true,procedureTime:{startMinute:99,endMinute:100,gmConfirmed:true},...opts});
 for(const [roll,level] of [[20,2],[21,3],[81,4],[85,5]]){
  const state=testState();
  const opts=level===5?{amputationStrengthML:90,amputationRoll:20}:{};
  const out=amp(state,roll,opts);
  eq(out.edgeWound.level,level,'Amputation produces printed Edge level');
  eq(out.edgeWound.aspect,'e');
  eq(out.edgeWound.amputation.severed,true,'actual treatment severs frost-damaged part even for S2/S3 edge');
  eq(out.edgeWound.amputation.viaTreatment,true);
  eq(out.state.wounds.length,2);
  yes(out.state.wounds[0].healed,'Frost site replaced by new Edge wound');
  eq(out.state.wounds[0].healing.amputationResult,out.edgeWound.id);
  eq(out.edgeWound.bleeding,level!==2,'printed bleeder symbols');
  yes(out.state.events.at(-1).details.procedureTime?.endMinute===100);
  roundtrip(out.state);
 }
 nope(()=>amp(testState(),85),/Strength/);
 nope(()=>amp(testState(),21,{shockRoll:null}),/Shock|d100/);
 nope(()=>amp(testState(),21,{procedureTime:{startMinute:100,endMinute:100,gmConfirmed:true}}),/minutu|AMP/);
 nope(()=>amp(testState(),21,{gmConfirmed:false}),/ověřená|Frost/);
 nope(()=>amp(testState('frost',4,'tx',null),21),/končetina|obličej/);
 nope(()=>amp(testState('frost',4,'ua',null),21),/stranu/);
 nope(()=>amp(testState('frost',4,'ua','left'),21,{eventId:'amp:21',locationShock:20}),/Location Shock/);
 // Original states never mutate if any missing evidence.
 const old=testState();nope(()=>amp(old,85),/Strength/);eq(old.wounds.length,1);
 // Existing other Edge wound same site forces true Compound adjudication, no false injury.
 const oldWithEdge=testState();oldWithEdge.wounds.push({id:'other',location:'ua',side:'left',severity:'M',level:1,aspect:'e',bleeding:false,nextAdvanceRound:null});
 nope(()=>amp(oldWithEdge,21),/Compound/);
 // Frost G on the torso has no amputative treatment: grim + daily Shock,
 // but no fictional G5 Edge wound or guessed healing rate.
 const torso=testState('frost',4,'tx',null);
 const grim=applyConfirmedTreatment({state:torso,round:1,eventId:'grimFrost',woundId:'w1',daySinceInjury:0,
  untreated:true,gmConfirmed:true});
 eq(grim.state.wounds.length,1);
 eq(grim.state.wounds[0].healing.grimWound,true);
 eq(grim.state.wounds[0].healing.noMundaneHealing,true);
 eq(grim.state.wounds[0].healing.nextGrimShockDay,1);
 roundtrip(grim.state);
 // Surgical time attestation is real and cannot invent twenty-nine missing minutes.
 const s=testState('p',3);s.wounds[0].impaled=true;s.wounds[0].projectileArrowOrBolt=true;
 const treatmentOpts={state:s,round:1,eventId:'ext',woundId:'w1',daySinceInjury:0,physicianML:60,physicianIndex:5,physicianRoll:20,available:['surgery-tools'],gmConfirmed:true};
 nope(()=>applyConfirmedTreatment({...treatmentOpts,procedureTime:{startMinute:71,endMinute:100,gmConfirmed:true}}),/minimum|Čas zákroku/);
 const shortened=applyConfirmedTreatment({...treatmentOpts,procedureTime:{startMinute:71,endMinute:100,gmConfirmed:true,varianceReason:'GM recorded fast extraction'}});
 eq(shortened.state.events.at(-1).details.procedureTime.varianceReason,'GM recorded fast extraction');
 const healed=applyConfirmedTreatment({...treatmentOpts,procedureTime:{startMinute:70,endMinute:100,gmConfirmed:true}});
 eq(healed.state.events.at(-1).details.procedureTime.startMinute,70);
 eq(healed.state.events.at(-1).details.procedureTime.endMinute,100);
 roundtrip(healed.state);
 // Legitimate historic *already rolled* die replayed at its original due day,
 // and audited now; never a newly invented result or live herbal bonus.
 const h=initialCombatState();h.wounds.push({id:'w1',location:'ua',severity:'S',level:2,aspect:'e',bleeding:false,nextAdvanceRound:null,
  healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
 const doc={origin:'GM paper record page 12',recordedAtDay:12,gmConfirmed:true,noBonusConfirmed:true};
 nope(()=>applyConfirmedInjuryHealing({state:h,round:1,eventId:'historic',woundId:'w1',daySinceInjury:5,endurance:12,will:12,roll:21,gmConfirmed:true,historicalEvidence:{...doc,origin:''}}),/Historický/);
 const result=applyConfirmedInjuryHealing({state:h,round:1,eventId:'historic',woundId:'w1',daySinceInjury:5,endurance:12,will:12,roll:21,gmConfirmed:true,historicalEvidence:doc});
 eq(result.state.events.at(-1).details.historicalEvidence.recordedAtDay,12);
 eq(result.state.events.at(-1).details.historicalEvidence.sourceDay,5);
 eq(result.state.events.at(-1).details.roll,21);
 yes(result.state.wounds[0].healed!==true,'Level 2 reduced to 1, next overdue interval');
 eq(result.state.wounds[0].healing.nextHealingDay,10);
 roundtrip(result.state);
 // Calendar still considers the next historic interval overdue; never skipped.
 let clock=createCampaignCalendar({day:1,hour:9,minute:0,label:'Recovery',gmConfirmed:true,eventId:'start',campaignId:'h544',characterIds:['healer']});
 clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'healer',woundId:'w1',elapsedMinutes:0,eventId:'anchor',gmConfirmed:true});
 const initialAgenda=campaignCalendarAgenda(clock,[{id:'healer',name:'Healer',hmk:{combatState:result.state}}],[]);
 yes(initialAgenda.all.some(x=>x.kind==='healing')||initialAgenda.future.some(x=>x.kind==='healing'),'healing remains scheduled');
 console.log('PASS v93.544 healing audit',n,'assertions');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
