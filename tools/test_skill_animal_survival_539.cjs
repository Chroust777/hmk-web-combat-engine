'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {prepareSkillPhysicalInjury}=await import('../src/integration/hmk-skill-physical-consequences.js');
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 const {guidedMandatoryEvents,guidedMandatoryMastery}=await import('../src/integration/hmk-guided-mandatory.js');
 const {automaticHMKFollowups}=await import('../src/integration/hmk-calendar-automatic-followups.js');
 const {applyConfirmedTreatment,applyConfirmedInjuryHealing}=await import('../src/integration/hmk-healing-persistence.js');
 const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar}=await import('../src/integration/hmk-campaign-calendar.js');
 let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};const bad=(fn,reg)=>{assert.throws(fn,reg);n++};
 const mk=(breed='mule')=>({id:'animal-1',kind:'Animal',name:'Pack mule',hmk:{verifiedMountedBreed:breed,
  attributes:{agl:12,end:12,str:20},combatState:initialCombatState()}});
 function opts(actor,state=actor.hmk.combatState,more={}){return {kind:'survival-accident',actor,state,inventory:[],sourceId:'watch-one',round:1,gmConfirmed:true,hazardD10:5,agilityD100:81,randomVictimConfirmed:true,...more}}
 const animal=mk(),baseline=JSON.stringify(animal.hmk.combatState);
 const avoided=prepareSkillPhysicalInjury(opts(animal,undefined,{agilityD100:5}));eq(avoided.avoided,true);eq(avoided.bodyKind,'horse');eq(avoided.state.events.length,1);eq(JSON.stringify(animal.hmk.combatState),baseline);
 bad(()=>prepareSkillPhysicalInjury(opts(mk('cow'))),/ověřeným plemenem|ověřené plemeno|ověřené zvíře|registered|plemenem/);
 bad(()=>prepareSkillPhysicalInjury(opts(animal)),/Impact d6/);
 const args={impactDie:6,zoneD10:2,locationD10:2,shockD100:10};
 const p=prepareSkillPhysicalInjury(opts(animal,undefined,args));
 eq(p.avoided,false);eq(p.bodyKind,'horse');eq(p.location,'hd');eq(p.armourValue,4);eq(p.impact,10);eq(p.effectiveImpact,6);eq(p.physicalDice.map(x=>x.value),[5,81,6,2,2,10]);assert.ok(validateCombatState(p.state));n++;
 eq(JSON.stringify(animal.hmk.combatState),baseline);
 bad(()=>prepareSkillPhysicalInjury(opts(animal,p.state,args)),/zapsána|zapsán/);
 bad(()=>prepareSkillPhysicalInjury(opts(animal,undefined,{...args,zoneD10:0})),/ZD d10/);
 bad(()=>prepareSkillPhysicalInjury(opts(animal,undefined,{...args,shockD100:null})),/Shock d100/);
 bad(()=>prepareSkillPhysicalInjury(opts(animal,undefined,{...args,impactDie:7})),/Impact d6/);
 const cf=prepareSkillPhysicalInjury(opts(animal,undefined,{...args,agilityD100:100}));eq(cf.impact,15);
 const other=mk('pony'),w=prepareSkillPhysicalInjury(opts(other,undefined,{...args,impactDie:1,shockD100:10}));eq(w.armourValue,4);
 const witness={...animal,hmk:{...animal.hmk,combatState:p.state}};
 const clock={campaignId:'campaign-one',minute:480,characterIds:[animal.id]};
 const open=automaticHMKFollowups(clock,[witness],[],()=>null);
 eq(open.all.some(e=>e.kind==='treatment'&&e.woundId===p.state.wounds[0].id),true);
 eq(open.all.some(e=>e.kind==='injury-morale'&&e.woundId===p.state.wounds[0].id),true);
 eq(open.all.some(e=>e.kind==='bleeding'),false);
 const woundId=p.state.wounds[0].id;
 const treatment=applyConfirmedTreatment({state:p.state,round:1,eventId:'treatment-one',woundId,daySinceInjury:0,untreated:true,gmConfirmed:true});
 eq(treatment.state.wounds[0].bodyKind,'horse');
 eq(treatment.state.wounds[0].healing.treated,true);
 eq(automaticHMKFollowups(clock,[{...witness,hmk:{...witness.hmk,combatState:treatment.state}}],[],()=>null).all.some(e=>e.kind==='treatment'),false);
 const rate=treatment.state.wounds[0].healing.healingRate;
 if(rate>2&&!treatment.state.wounds[0].healing.noMundaneHealing){
  const healed=applyConfirmedInjuryHealing({state:treatment.state,round:2,eventId:'healing-one',woundId,daySinceInjury:5,endurance:12,will:12,roll:3,gmConfirmed:true});
  eq(healed.state.events.some(e=>e.type?.includes('healing')),true);
  bad(()=>applyConfirmedInjuryHealing({state:treatment.state,round:2,eventId:'healing-too-early',woundId,daySinceInjury:1,endurance:12,will:12,roll:3,gmConfirmed:true}),/day|den|dne|čas|5/);
 }
 // Date the confirmed wound in the canonical calendar and verify that the
 // original treatment/healing machinery, not a second animal scheduler, owns the due rolls.
 let campaign=createCampaignCalendar({day:1,hour:8,minute:0,label:'animal accident',eventId:'start539',gmConfirmed:true,campaignId:'campaign-one',characterIds:[animal.id]});
 campaign=anchorCampaignOrigin(campaign,{kind:'wound',characterId:animal.id,woundId,source:'confirmed-combat',combatEventId:p.state.events[0].id,eventId:'anchor539'});
 const dueBefore=campaignCalendarAgenda(campaign,[witness],[]);
 eq(dueBefore.due.some(e=>e.kind==='treatment'&&e.woundId===woundId),true);
 bad(()=>advanceCampaignCalendar(campaign,{deltaMinutes:300,eventId:'skip-treatment539',reason:'skip unresolved injury',gmConfirmed:true,characters:[witness],journal:[]}),/treatment|Treatment|událost|závazek|vyřešit/);
 const treatedActor={...witness,hmk:{...witness.hmk,combatState:treatment.state}};
 const dueAfter=campaignCalendarAgenda(campaign,[treatedActor],[]);
 eq(dueAfter.future.some(e=>e.kind==='healing'&&e.woundId===woundId),true);
 eq(dueAfter.future.find(e=>e.kind==='healing'&&e.woundId===woundId).minute,campaign.minute+5*1440);
 bad(()=>advanceCampaignCalendar(campaign,{deltaMinutes:6*1440,eventId:'skip-healing539',reason:'skip future healing',gmConfirmed:true,characters:[treatedActor],journal:[]}),/healing|Healing|událost|závazek|vyřešit/);
 // All seven verified animal breeds use their own B/C body tables.
 for(const breed of ['donkey','pony','mule','palfrey','courser','charger','destrier']){
  const a=mk(breed);const res=prepareSkillPhysicalInjury(opts(a,undefined,{...args,agilityD100:81}));
  eq(res.bodyKind,'horse');eq(res.breed,breed);
 }
 const animalShock=prepareSkillPhysicalInjury(opts(animal,undefined,{...args,shockD100:95}));
 eq(animalShock.state.shockFollowup?.kind,'UNC');
 eq(guidedMandatoryMastery({kind:'shock-recovery',character:animal}).ml,39);
 bad(()=>guidedMandatoryMastery({kind:'shock-recovery',character:mk('cow')}),/Shock ML/);
 const shockWitness={...witness,hmk:{...witness.hmk,combatState:animalShock.state}};
 eq(automaticHMKFollowups(clock,[shockWitness],[],()=>null).unknown.some(x=>x.kind==='shock-followup'),true);
 const deadline=campaignCalendarAgenda(campaign,[shockWitness],[]).future.find(x=>x.kind==='shock-followup');
 eq(deadline?.minute,campaign.minute+10);
 eq(deadline?.status,'future');
 const serialization=JSON.parse(JSON.stringify(animalShock.state));eq(validateCombatState(serialization)!=null,true);
 console.log('PASS animal survival v93.539',n,'checks: animal B/C, CF+5, dice, authoritative Combat State, duplicate, invalid body, shock');
})().catch(e=>{console.error(e.stack);process.exit(1)});
