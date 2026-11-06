'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {verifiedMountedAnimalAnatomy,previewVerifiedMountedAnimalTrauma}=await import('../src/integration/hmk-mounted-live-animal-falling.js');
 const {travelEncounterCharacterHint}=await import('../src/integration/hmk-travel-encounter-context-93750.js');
 const {hmkAnimalLocationSymbols}=await import('../src/integration/injury-special-hmk.js');
 const {prepareSkillPhysicalInjury}=await import('../src/integration/hmk-skill-physical-consequences.js');
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 let total=0;const eq=(a,b)=>{assert.deepEqual(a,b);total++};const yes=v=>{assert.ok(v);total++};
 const breeds=['donkey','pony','mule','palfrey','courser','charger','destrier'];
 for(const breed of breeds){
  const anatomy=verifiedMountedAnimalAnatomy(breed);yes(anatomy);eq(anatomy.locations.length,8);
  eq(anatomy.table,['donkey','pony'].includes(breed)?'B':'C');
  eq(anatomy.maxZN,anatomy.table==='B'?16:20);
  for(const loc of anatomy.locations){eq(loc.shock,{
   hd:5,nk:5,flg:2,flk:4,ab:4,qtr:3,hlg:2,tl:1}[loc.code]);
   yes(hmkAnimalLocationSymbols(loc.code));}
  const actor={id:'animal-1',name:'Animal',kind:'Animal',hmk:{verifiedMountedBreed:breed,attributes:{agl:12,end:12,str:20},healthState:initialCombatState()}};
  const baseline=JSON.stringify(actor.hmk.healthState);
  for(const roll of [2,4,6,8,10]){
   const report=previewVerifiedMountedAnimalTrauma({mount:actor,printedBreed:breed,stumbleSL:'F',impactD10:6,zoneD:roll,locationD:2,aimZN:1,aimConfirmed:true});
   yes(anatomy.locations.some(l=>l.code===report.location));
   eq(report.naturalBluntAV,anatomy.naturalBluntAV);
  }
  const injury=prepareSkillPhysicalInjury({kind:'survival-accident',actor,inventory:[],state:actor.hmk.healthState,
   sourceId:'watch-750',originMinute:540,round:1,gmConfirmed:true,hazardD10:5,agilityD100:81,randomVictimConfirmed:true,
   impactDie:6,zoneD10:2,locationD10:2,shockD100:10});
  eq(injury.bodyKind,'horse');yes(injury.injury);yes(injury.state.wounds.length>0);
  yes(anatomy.locations.some(l=>l.code===injury.state.wounds[0].location));
  yes(validateCombatState(injury.state));eq(JSON.stringify(actor.hmk.healthState),baseline);
  // The original Injury Sequence must reject an already committed source ID.
  assert.throws(()=>prepareSkillPhysicalInjury({kind:'survival-accident',actor,
   inventory:[],state:injury.state,sourceId:'watch-750',originMinute:540,round:1,gmConfirmed:true,
   hazardD10:5,agilityD100:81,randomVictimConfirmed:true,impactDie:6,
   zoneD10:2,locationD10:2,shockD100:10}),/již byla zapsána/);
  total++;
 }
 eq(verifiedMountedAnimalAnatomy('cow'),null);
 function event({alertness='party-confused',decision='observe',offset=10,nonhostile=false,other={}}={}){
  return {calendarCampaignId:'c750',id:'episode750',calendarTimeEpisode:{startMinute:480,endMinute:540,
   memberIds:['pc1','pc2'],encounterDetails:[{i:0,offset,nonhostile,surprise:{verified:true,
    decision,alertness,party:{effective:'normal'},...other}}]}};
 }
 const args={campaignId:'c750',minute:540,actorId:'pc1'};
 const expectation={'party-confused':'confused','party-unaware':'unaware','both-confused':'confused',
  'both-aware':'aware','foe-confused':'aware','foe-unaware':'aware'};
 for(const [initial,expected] of Object.entries(expectation)){
  const r=travelEncounterCharacterHint({...args,journal:[event({alertness:initial})]});
  eq(r?.initialAlertness,expected);eq(r?.watchfulness,'normal');eq(r?.eventMinute,490);
  eq(r?.elapsedMinutes,50);eq(r?.autoCombat,false);eq(r?.provisional,true);
 }
 for(const variant of [{decision:'leave'},{nonhostile:true},{other:{verified:false}},
  {alertness:'pending'},{offset:100}])eq(travelEncounterCharacterHint({...args,journal:[event(variant)]}),null);
 eq(travelEncounterCharacterHint({...args,minute:541,journal:[event()]}),null); // no arbitrary minute timer; subsequent clock change clears hint
 eq(travelEncounterCharacterHint({...args,actorId:'nonmember',journal:[event()]}),null);
 eq(travelEncounterCharacterHint({...args,campaignId:'other',journal:[event()]}),null);
 eq(travelEncounterCharacterHint({...args,journal:[event(),event({nonhostile:true})]}),null);
 yes(travelEncounterCharacterHint({...args,journal:[event({decision:'ambush'})]}));
 console.log('PASS 93.750 animal B/C and read-only Encounter hint',total,'checks');
})().catch(e=>{console.error(e.stack);process.exit(1)});
