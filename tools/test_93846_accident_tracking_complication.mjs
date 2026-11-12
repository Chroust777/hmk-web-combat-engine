/** v93.846 · native source rules and party/animal/vehicle regression.
 * Does not impersonate Chromium clicks; results are tagged SOURCE in report.
 * Node: node tools/test_93846_accident_tracking_complication.mjs */
import assert from 'node:assert/strict';
import {survivalAccidentVictimPool93846 as pool} from '../src/integration/hmk-survival-accident-pool-93846.js';
import {pendingTrackingCFBearing} from '../src/integration/hmk-time-episodes.js';
import {stableHauling575} from '../src/integration/hmk-stable-operations-575.js';
import {episodeHazardFollowup} from '../src/integration/hmk-episode-travel-detail.js';
import {verifiedMountedAnimalAnatomy} from '../src/integration/hmk-mounted-live-animal-falling.js';
import {prepareAnimalSurvivalAccident} from '../src/integration/hmk-skill-animal-survival-539.js';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
let n=0;
const eq=(got,want,name)=>{assert.deepEqual(got,want,name);n++};
const ok=(got,name)=>{assert.ok(got,name);n++};
const deny=(fn,pattern,name)=>{assert.throws(fn,pattern,name);n++};
const c=(id,kind='PC',profile=true)=>({id,name:id,kind,hmk:kind==='Animal'&&profile?{verifiedMountedBreed:'palfrey',healthState:{}}:{}});
const group=['guide','tracker'],stable=['cartA','cartB'],members=[...group,...stable];
let chars=[c('guide'),c('tracker'),c('cartA','Animal'),c('cartB','Animal')];
let p=pool({memberIds:group,stableAnimalIds:stable,characters:chars,activeIds:members});
ok(p.ok,'registered oxen/horses can be accident victims');
eq(p.eligible.map(x=>x.id),members,'exact registered party eligible once');
eq(p.expectedIds,members,'expected includes both draught animals');
p=pool({memberIds:group,stableAnimalIds:stable,characters:chars.slice(0,3),activeIds:members});
eq(p.missingAnimals,['cartB'],'unregistered second draught animal retained as missing');
ok(!p.ok,'no biased human-only draw');
p=pool({memberIds:group,stableAnimalIds:stable,characters:chars,activeIds:group});
eq(p.missingAnimals,stable,'inactive veterinary profiles cannot silently enter draw');
p=pool({memberIds:group,stableAnimalIds:['cartA','cartA'],legacyAnimalIds:['cartA'],characters:chars,activeIds:members});
eq(p.expectedIds,['guide','tracker','cartA'],'duplicate Stable and legacy roster ID counted once');
p=pool({memberIds:group,stableAnimalIds:['cartA'],characters:[...chars.slice(0,2),c('cartA','Animal',false)],activeIds:members});
eq(p.missingAnimals,['cartA'],'unverified bestiary profile not accepted');
p=pool({memberIds:group,characters:chars,activeIds:members});
ok(p.ok,'ordinary foot party unaffected');
eq(p.eligible.length,2,'two participants in foot party');
p=pool({memberIds:group,stableAnimalIds:['elephant'],characters:[...chars,{id:'elephant',name:'Slon',kind:'Animal',hmk:{verifiedMountedBreed:'elephant',healthState:{}}}],activeIds:[...members,'elephant']});
eq(p.unsupportedAnimals,['elephant'],'elephant J-table is not silently treated as horse C-table');
ok(!p.ok,'unsupported animal requires GM handoff, not false Injury success');
for(const breed of ['bovine','camel']){
 const anatomy=verifiedMountedAnimalAnatomy(breed);
 eq(anatomy.bodyTable??anatomy.table,'C','bovine/camel have printed C anatomy');
 const state=initialCombatState(),actor={id:'a',kind:'Animal',hmk:{verifiedMountedBreed:breed,attributes:{agl:8},skills:[],healthState:state}};
 const avoided=prepareAnimalSurvivalAccident({actor,state,inventory:[],sourceId:'avoid-'+breed,round:1,gmConfirmed:true,hazardD10:5,agilityD100:10,randomVictimConfirmed:true,originMinute:100});
 ok(avoided.avoided&&avoided.sl==='CS','confirmed '+breed+' Agility success avoids injury');
 const wounded=prepareAnimalSurvivalAccident({actor,state,inventory:[],sourceId:'wound-'+breed,round:1,gmConfirmed:true,hazardD10:5,agilityD100:75,randomVictimConfirmed:true,originMinute:100,impactDie:2,zoneD10:5,locationD10:2,shockD100:50});
 eq(wounded.impact,11,'actual CF adds 5 to d6+4 impact');
 eq(wounded.armourValue,breed==='bovine'?6:5,'printed natural blunt AV for '+breed);
 ok(!!wounded.injury,'actual '+breed+' injury event created from true dice');
}

p=pool({memberIds:group,stableAnimalIds:stable,characters:chars,activeIds:members});
const old=[{id:'ep1',calendarCampaignId:'C',campaignMinute:100,
 calendarTimeEpisode:{kind:'travel',startMinute:100,endMinute:160,memberIds:group,
 settings:{conveyance:'wagon',stableAnimalIds:stable,transportTeamIds:stable,guideId:'guide'},
 trackingMemory:{sourceMode:'new',trackerId:'tracker',level:'CF'}}}];
eq(pendingTrackingCFBearing(old,'C',160,group),1,'Tracking CF from wagon imposes next travel Bearing');
eq(pendingTrackingCFBearing(old,'C',160,['someone']),0,'unrelated party cannot consume CF');
eq(pendingTrackingCFBearing(old,'otherCampaign',160,group),0,'foreign campaign cannot borrow CF');
deny(()=>pendingTrackingCFBearing(old,'C',160,['guide']),/rozhodnutí GM/,'split party cannot evade Bearing');
const afterRest=[...old,{id:'rest',calendarCampaignId:'C',campaignMinute:160,calendarTimeEpisode:{kind:'rest',startMinute:160,endMinute:180,memberIds:group}}];
eq(pendingTrackingCFBearing(afterRest,'C',180,group),1,'rest does not consume mandatory Bearing');
const next={id:'ep2',calendarCampaignId:'C',campaignMinute:180,calendarTimeEpisode:{kind:'travel',startMinute:180,endMinute:200,
 memberIds:group,settings:{conveyance:'mount',stableAnimalIds:['cartB'],guideId:'tracker'},trackingMemory:null}};
eq(pendingTrackingCFBearing([...afterRest,next],'C',200,group),0,'new animal and different guide still consume Bearing only once');
const unrelated={...next,id:'other',calendarTimeEpisode:{...next.calendarTimeEpisode,memberIds:['outsider']}};
eq(pendingTrackingCFBearing([...afterRest,unrelated],'C',200,group),1,'other group travel must not consume party Bearing');
const standalone={id:'standalone',calendarCampaignId:'C',campaignMinute:100,
 calendarTimeEpisode:{kind:'tracking',startMinute:100,endMinute:160,memberIds:group,
 trackingMemory:{sourceMode:'new',trackerId:'tracker',level:'CF'}}};
eq(pendingTrackingCFBearing([standalone],'C',160,group),1,'standalone Tracking CF carries forward');
const cart={spec:{breed:'palfrey',name:'Palfrey, cart horse'}};
const ox={spec:{breed:'bovine',name:'Bovine (Oxen)'}};
eq(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[ox,ox]}).capacityLb,8000,'two oxen wagon capacity');
eq(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[cart,cart]}).capacityLb,6400,'two cart horses wagon capacity');
eq(stableHauling575({vehicleName:'Cart, 2-wheel',team:[ox]}).capacityLb,2500,'ox cart capacity');
eq(stableHauling575({vehicleName:'Cart, 2-wheel',team:[cart]}).capacityLb,2000,'horse cart capacity');
eq(stableHauling575({vehicleName:'Sled',team:[cart,cart]}).capacityLb,3000,'two horse sled capacity');
eq(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[ox,cart]}).capacityLb,null,'mixed draught teams do not invent rated capacity');
for(const [level,expect] of [['CF','irreparable'],['F','long-delay'],['S','short-delay'],['CS','no-delay']]){
 eq(episodeHazardFollowup({hazard:'complication',complicationDecision:'test',complicationSkill:'Animalcraft',complicationLevel:level}).result,expect,
  'Animalcraft complication '+level);
}
eq(episodeHazardFollowup({hazard:'complication',complicationDecision:'reroute'}).result,'reroute','GM-confirmed reroute');
deny(()=>episodeHazardFollowup({hazard:'complication',complicationDecision:'test',complicationSkill:'Accounting',complicationLevel:'S'}),/pravidlovou dovednost/,'invalid invented skill rejected');
for(let d=4;d<=6;d++)eq(episodeHazardFollowup({hazard:'accident'}).result,'pending','accident hazard remains pending for physical Agility/injury');
console.log('PASS SOURCE / v93.846 accident, tracking, draught team, complication:',n,'assertions');
