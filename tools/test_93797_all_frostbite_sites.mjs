import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {prepareExposureSkinInjuries} from '../src/integration/hmk-weather-trauma-completion.js';
import {applyConfirmedTreatment} from '../src/integration/hmk-healing-persistence.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda} from '../src/integration/hmk-campaign-calendar.js';
import {GM_HEALTH_LOCATIONS,prepareGMHealthOverride} from '../src/integration/hmk-gm-health-override.js';
const limbs=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
const sites=GM_HEALTH_LOCATIONS.flatMap(location=>limbs.has(location)?[{location,side:'left'},{location,side:'right'}]:[{location,side:null}]);
assert.equal(sites.length,24);assert.equal(new Set(sites.map(s=>s.location+':'+s.side)).size,24);
const sourceId='frost-all-body-93797';
let state=initialCombatState();state.environmentalHazards=[{id:'frost-hazard',sourceId,kind:'cold',hr:5,initialHR:5,
 periodMinutes:60,active:true,lastElapsedMinutes:0,sequence:0,weaknessApplied:0,shockApplied:'NONE',
 skinPending:'frostbite',treatmentStarted:false}];
state.events.push({id:'frost-hazard',type:'skill-trekking-weather-hazard',round:1,details:{}});
const actor={id:'full-frost',name:'Simulovaná postava – omrzliny na všech lokalitách',hmk:{
 attributes:{str:15,end:15,agl:15,dex:15,per:15,wil:15,rea:15},
 skills:[{name:'Shock',ml:200}],healthState:state}};
const rows=sites.map(s=>({...s,av:0,shockD100:5}));
const result=prepareExposureSkinInjuries({actor,inventory:[],state,sourceId,round:1,
 windD20:4,durationD20:1,rows,originMinute:480,gmConfirmed:true,allLocationsReviewed:true,
 maximumExposureMinutes:60});
state=result.state;validateCombatState(state);
assert.equal(result.report.wounds.length,24,JSON.stringify(result.report));
assert.equal(result.report.skippedAfterKIA.length,0);assert.equal(state.wounds.length,24);
assert.equal(new Set(state.wounds.map(w=>w.id)).size,24);
assert.equal(new Set(state.wounds.map(w=>w.location+':'+w.side)).size,24);
assert(state.wounds.every(w=>w.level===1&&w.severity==='M'&&w.aspect==='frost'));
console.log('FROST input: 15 anatomical codes / 24 side-specific sites; IL1 across naked skin; shock =',state.shock);
// Explicitly decide untreated for every wound. Actual HMK untreated care applies
// the printed HR without inventing a physical Physician roll.
for(let i=0;i<state.wounds.length;i++){
 const w=state.wounds[i],t=applyConfirmedTreatment({state,round:1,eventId:'treatment:none:'+i,
  woundId:w.id,daySinceInjury:0,untreated:true,gmConfirmed:true});state=t.state;
}
validateCombatState(state);
let clock=createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'frost-test',eventId:'clock-start',gmConfirmed:true,
 characterIds:[actor.id]});
for(let i=0;i<state.wounds.length;i++)clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:actor.id,
 woundId:state.wounds[i].id,elapsedMinutes:0,eventId:'anchor-frost-'+i,gmConfirmed:true});
actor.hmk.healthState=state;
let agenda=campaignCalendarAgenda(clock,[actor],[],[]);
const healing=agenda.all.filter(x=>x.kind==='healing');
console.log('CALENDAR:',{wounds:state.wounds.length,healing:healing.length,
 infections:agenda.all.filter(x=>x.kind==='infection').length,
 grim:agenda.all.filter(x=>x.kind==='grim').length,
 other:agenda.all.filter(x=>!['healing','infection','grim'].includes(x.kind)).map(x=>x.kind),
 unknown:agenda.unknown.map(x=>x.kind)});
assert.equal(healing.length,24,'Every different frost wound must have its OWN scheduled Healing');
assert.equal(new Set(healing.map(x=>x.woundId)).size,24,'No repeated wound IDs in Healing calendar');
assert.equal(new Set(healing.map(x=>x.id)).size,24,'No duplicate calendar event IDs');
assert(healing.every(x=>x.minute===480+5*1440),'Each fresh M1 starts five-day schedule at its own anchor');
const victim=state.wounds.find(w=>w.location==='ha'&&w.side==='left');
const others=healing.filter(x=>x.woundId!==victim.id);
const closure=prepareGMHealthOverride({state,action:'resolve',woundId:victim.id,
 eventId:'resolve-frost-left-hand',reason:'GM doložil úplné odeznění omrzliny levé ruky',gmConfirmed:true});
state=closure.state;actor.hmk.healthState=state;agenda=campaignCalendarAgenda(clock,[actor],[],[]);
const remaining=agenda.all.filter(x=>x.kind==='healing');
assert.equal(remaining.length,23);
assert(!remaining.some(x=>x.woundId===victim.id));
assert.deepEqual(new Set(remaining.map(x=>x.woundId)),new Set(others.map(x=>x.woundId)));
// Repeat the SAME incident in a second projection to verify it's not duplicated
// when calendars are rebuilt, refreshed, or opened on a later screen.
const repeat=campaignCalendarAgenda(clock,[structuredClone(actor)],[],[]);
assert.deepEqual(repeat.all.filter(x=>x.kind==='healing').map(x=>x.id).sort(),remaining.map(x=>x.id).sort());
console.log('PASS 93.797: 24 distinct frostbite site wounds -> 24 unique healing event IDs; closing 1 leaves 23; calendar refresh stable; no cross-site duplicate');
