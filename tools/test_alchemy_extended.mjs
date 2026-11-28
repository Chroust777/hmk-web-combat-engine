import assert from 'node:assert/strict';
import {initialCombatState,specialActionReadiness} from '../src/integration/persistent-combat-state.js';
import {createExtendedAlchemyImbibing,createAlchemyPhysicImbibing,activeAlchemyProfusionCohort,
 activeAlchemyPhysicTargets,validateAlchemyImbibingJournal} from '../src/integration/hmk-alchemy-imbibing.js';
import {createAlchemyVialBinding,createAlchemyVialEmpty} from '../src/integration/hmk-alchemy-vial-ledger.js';
import {createAlchemyDecay,alchemyElixirStrength,validateAlchemyDecayJournal} from '../src/integration/hmk-alchemy-decay.js';
import {fireshieldProtection,iceshieldProtection,quiescenceUses,mindsalveRollPlan,startExtendedAlchemy,advanceExtendedAlchemy,
 pendingExtendedAlchemy,applyExtendedAlchemyInteractions,settleExtendedAlchemy,requireExtendedAlchemyTime,
 validateExtendedAlchemy,assertExtendedAlchemyAppendOnly} from '../src/integration/hmk-alchemy-extended.js';
import {warmthProtection,createWarmthProximity,validateWarmthProximityJournal,assertWarmthProximityAppendOnly} from '../src/integration/hmk-alchemy-warmth.js';
import {soulcloakStatus,createSoulcloakDefence,validateSoulcloakJournal,assertSoulcloakAppendOnly} from '../src/integration/hmk-alchemy-soulcloak.js';
import {airtapEvidence,airtapTravelUnits} from '../src/integration/hmk-alchemy-airtap.js';
import {calculateTimeEpisode,validateTimeEpisodes} from '../src/integration/hmk-time-episodes.js';
import {prepareEnclosedSmokeStart,prepareEnclosedSmokeCompletion} from '../src/integration/hmk-mundane-fire-smoke.js';
import {prepareSwimmingConsequence} from '../src/integration/hmk-skill-environment-consequences.js';
import {elixirBreathSources,activeElixirBreathAreas,createElixirBreath,validateElixirBreathJournal,assertElixirBreathAppendOnly} from '../src/integration/hmk-alchemy-exsiccation.js';
import {applyAlchemyExsiccationAural,createExsiccationProfusionIll,applyExsiccationProfusionAural,validateExsiccationProfusionJournal} from '../src/integration/hmk-alchemy-imbibing.js';
import {historicalHMKCalendarEntries} from '../src/integration/hmk-calendar-history.js';
import {previewAreaCohort} from '../src/integration/hmk-area-cohort-preview.js';
import {prepareTrekkingWeatherTest,advanceTrekkingWeatherExposure} from '../src/integration/hmk-weather-hazard-aftermath.js';
import {prepareColdWaterShock,prepareExposureSkinInjuries} from '../src/integration/hmk-weather-trauma-completion.js';
import {prepareMundaneFireStrike} from '../src/integration/hmk-mundane-fire-smoke.js';
import {evaluateTrekkingWeatherRoll} from '../src/integration/hmk-trekking-weather-roll.js';
import {episodeWeatherExposure} from '../src/integration/hmk-episode-travel-detail.js';
import {PRINTED_VIAL} from '../src/integration/hmk-herbal-vial-ledger.js';
import {DAY_MINUTES} from '../src/integration/hmk-campaign-calendar.js';

const campaignId='qa',actorId='test-person',minute=100;
const clock={campaignId,minute,characterIds:[actorId]};
const clean={id:actorId,hmk:{attributes:{wil:15,end:15},healthState:initialCombatState(),arcane:{}}};
const row=(id,field,proof,time=minute)=>({id,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:time,
 [field]:proof});
function asActor(before,out){return {...before,hmk:{...before.hmk,healthState:out.state,arcane:out.arcane}};}
function drink({name,useId,d100=11,baseAS=6,prior=[],actor=clean,mindRolls,symptomD10s}){
 const finishId=useId+'-dose',vialId=useId+'-vial',emptyId=useId+'-empty';
 const inventory=[{id:vialId,characterId:actorId,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{properties:{weightLb:0.25}}}];
 const filled=[...prior,row(finishId,'calendarAlchemyFinish',{campaignId,minute,result:'completed',elixirName:name,baseAS})];
 const base={campaignId,minute,actorId,finishId,inventory};
 const bound=createAlchemyVialBinding({...base,journal:filled,vialId,confirmedByGM:true,
  storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 const source=[...filled,row(useId+'-bound','calendarAlchemyVialBinding',bound)];
 const create=name==='Physic'?createAlchemyPhysicImbibing:createExtendedAlchemyImbibing;
 const proof=create({...base,journal:source,targetId:actorId,testSkill:'Aura',ml:75,d100,origin:'manual',emptyId,gmConfirmed:true});
 const empty=createAlchemyVialEmpty({...base,journal:source,reason:'Consumed',confirmedByGM:true});
 const used=[...source,row(emptyId,'calendarAlchemyVialEmpty',empty),row(useId,'calendarAlchemyImbibing',proof)];
 const start=name==='Physic'?{state:actor.hmk.healthState,arcane:actor.hmk.arcane,rows:[]}:
  startExtendedAlchemy({actor,proof,useId,journal:source,mindRolls,symptomD10s});
 const interaction=applyExtendedAlchemyInteractions({actor:asActor(actor,start),journal:source,trigger:proof,triggerId:useId});
 const journal=[...used,...start.rows,...interaction.rows];
 const recipient=asActor(actor,interaction);
 assert.equal(validateAlchemyImbibingJournal(journal),true);
 assert.doesNotThrow(()=>validateExtendedAlchemy(journal,[recipient],{},campaignId));
 return {journal,proof,actor:recipient,finishId,receipt:start.rows[0]?.calendarAlchemyExtendedRecovery};
}

const mindActor=structuredClone(clean);
mindActor.hmk.healthState.morale.state='routed';
mindActor.hmk.healthState.morale.psycheStress=3;
mindActor.hmk.healthState.fatigue.otherWeakness=15;
mindActor.hmk.arcane={shadow:{resistancePending:true},psycheTraumas:[{
 trait:'Reckless',psycheLevels:3,sourceEventIds:['stress-first'],intensity:'impulse',permanent:false,manifested:true
}]};
const mind=drink({name:'Mindsalve',useId:'mind',actor:mindActor,d100:95,mindRolls:[11]});
assert.equal(mind.actor.hmk.healthState.morale.state,'steady');
assert.deepEqual(mind.actor.hmk.arcane.shadow,{resistancePending:true});
assert.equal(mind.actor.hmk.healthState.morale.psycheStress,2);
assert.equal(mind.receipt.nextMinute,minute+DAY_MINUTES);
assert.equal(mind.receipt.weakness,30);
assert.equal(activeAlchemyProfusionCohort(mind.journal,campaignId,actorId,minute).length,1);
const dailyContext={actor:mind.actor,clock:{...clock,minute:minute+DAY_MINUTES},journal:mind.journal,campaignId,useId:'mind',gmConfirmed:true};
const naturallyHealed=structuredClone(mind.actor);
naturallyHealed.hmk.arcane.psycheTraumas[0].psycheLevels=0;
naturallyHealed.hmk.arcane.psycheTraumas[0].recovered=true;
naturallyHealed.hmk.healthState.morale.psycheStress=0;
naturallyHealed.hmk.healthState.fatigue.otherWeakness=30;
assert.equal(settleExtendedAlchemy({...dailyContext,actor:naturallyHealed}).state.fatigue.otherWeakness,0);
const fails=advanceExtendedAlchemy({...dailyContext,dailyRoll:10});
assert.equal(fails.rows[0].calendarAlchemyExtendedRecovery.asAfter,mind.proof.finalAS-1);
assert.deepEqual(mindsalveRollPlan(mind.actor,mind.receipt),[{trait:'Reckless',levels:2}]);
const succeeds=advanceExtendedAlchemy({...dailyContext,dailyRoll:1,mindRolls:[5]});
assert.equal(succeeds.state.morale.psycheStress,0);
assert.equal(succeeds.state.fatigue.otherWeakness,0);
assert.equal(succeeds.rows[0].calendarAlchemyExtendedRecovery.active,false);
assert.doesNotThrow(()=>validateExtendedAlchemy([...mind.journal,...succeeds.rows],[asActor(mind.actor,succeeds)],{},campaignId));
assert.throws(()=>assertExtendedAlchemyAppendOnly([...mind.journal,...succeeds.rows],mind.journal),/nelze/);

const fire=drink({name:'Fireshield',useId:'fire',baseAS:8,d100:95});
assert.equal(fire.actor.hmk.healthState.fatigue.weariness,40);
const fireContext={journal:fire.journal,campaignId,minute,actorId};
const shield=fireshieldProtection(fireContext);
assert.equal(shield.av,3);
assert.equal(shield.advanceBonus,15);
assert.equal(fireshieldProtection({...fireContext,auralShockLevels:1}).av,0);
assert.equal(evaluateTrekkingWeatherRoll({kind:'heat',areaAV:2,roll:1,fireshieldAV:shield.av}).exposed,false);
assert.equal(episodeWeatherExposure({kind:'heat',areaAV:2,roll:1,fireshieldAV:shield.av}).tn,0);
assert.equal(episodeWeatherExposure({kind:'cold',areaAV:2,roll:1}).tn,2);
const fireTarget={...clean,hmk:{...clean.hmk,skills:[{name:'Shock',ml:75}]}};
const area=previewAreaCohort({id:'fire-area',timelineId:'test-combat',round:1,aspect:'fire',strikeImpact:3,
 targetIds:[actorId],characters:[fireTarget],states:{[actorId]:clean.hmk.healthState},inventory:[],
 fireProtection:{[actorId]:shield.av},rollsByTarget:{[actorId]:{shockD100:null}}});
assert.equal(area.results[actorId].areaAV,3);
assert.throws(()=>previewAreaCohort({id:'frost-area',timelineId:'test-combat',round:1,aspect:'frost',
 strikeImpact:3,targetIds:[actorId],characters:[fireTarget],states:{[actorId]:clean.hmk.healthState},inventory:[],
 fireProtection:{[actorId]:shield.av},rollsByTarget:{[actorId]:{shockD100:null}}}),/Shock d100/);
const contact=prepareMundaneFireStrike({actor:fireTarget,inventory:[],state:clean.hmk.healthState,sourceId:'fire-contact',
 fireSize:0,impactD4:1,contactHand:true,handSide:'right',fireshieldAV:shield.av,gmConfirmed:true});
assert.equal(contact.report.armourValue,3);
assert.equal(contact.report.woundId,null);

const secondFire=drink({name:'Fireshield',useId:'second-fire',baseAS:8,d100:83,prior:fire.journal,actor:fire.actor});
assert.equal(secondFire.proof.profusionCF,true);
assert.equal(secondFire.actor.hmk.healthState.fatigue.weariness,120);

const poison=drink({name:'Poison',useId:'poison',d100:91,symptomD10s:[1,2,3,4],prior:fire.journal,actor:fire.actor});
assert.equal(poison.proof.finalAS,7);
assert.equal(poison.proof.otherActiveElixirs,0);
assert.equal(poison.receipt.hr,3);
const poisonContext={actor:poison.actor,clock,journal:poison.journal,campaignId,useId:'poison',gmConfirmed:true};
assert.throws(()=>requireExtendedAlchemyTime({...poisonContext,actors:[poison.actor],afterMinute:minute+1}),/kola Poison/);
assert.throws(()=>advanceExtendedAlchemy({...poisonContext,elapsedRounds:2}),/následující/);
const onset=advanceExtendedAlchemy({...poisonContext,elapsedRounds:1});
assert.equal(onset.state.shock,'STN');
const course=advanceExtendedAlchemy({...poisonContext,actor:asActor(poison.actor,onset),journal:[...poison.journal,...onset.rows],
 elapsedRounds:2,courseD100:5});
assert.equal(course.state.toxinCourses[0].hr,5);
assert.equal(course.rows[0].calendarAlchemyExtendedRecovery.elapsedSeconds,10);
const neutralized=drink({name:'Physic',useId:'physic',baseAS:8,actor:asActor(poison.actor,course),prior:[...poison.journal,...onset.rows,...course.rows]});
assert.equal(neutralized.actor.hmk.healthState.toxinCourses[0].status,'defeated');
assert.equal(pendingExtendedAlchemy(neutralized.actor,clock,neutralized.journal,campaignId).length,0);
assert.deepEqual(activeAlchemyPhysicTargets(neutralized.journal,campaignId,actorId,minute),[]);

const dormant=drink({name:'Quiescence',useId:'q',d100:95});
assert.equal(dormant.proof.finalAS,8);
assert.deepEqual(quiescenceUses(dormant.journal,campaignId,actorId,minute),['q']);
assert.equal(activeAlchemyProfusionCohort(dormant.journal,campaignId,actorId,minute).length,0);
const qState={...dormant.actor.hmk.healthState,alchemyDormancy:['q']};
assert.equal(specialActionReadiness(qState).ready,false);
assert.equal(specialActionReadiness(qState,{role:'defender',defence:'ignore'}).ready,true);
const due=alchemyElixirStrength(dormant.journal,campaignId,dormant.finishId).nextDueMinute;
const decayContext={journal:dormant.journal,campaignId,actorId,finishId:dormant.finishId,minute:due,origin:'manual',gmConfirmed:true};
const s=createAlchemyDecay({...decayContext,d10:1}),f=createAlchemyDecay({...decayContext,d10:10});
assert.equal(s.asAfter,6);assert.equal(f.asAfter,7);
assert.equal(validateAlchemyDecayJournal([...dormant.journal,row('q-decay','calendarAlchemyDecay',s,due)]),true);
const legacy=createAlchemyDecay({...decayContext,d10:1,replayLegacyQuiescence:true});
assert.equal(legacy.asAfter,7);
assert.equal(validateAlchemyDecayJournal([...dormant.journal,row('q-old-decay','calendarAlchemyDecay',legacy,due)]),true);
const freed=drink({name:'Physic',useId:'q-physic',baseAS:8,actor:dormant.actor,prior:dormant.journal});
assert.deepEqual(quiescenceUses(freed.journal,campaignId,actorId,minute),[]);
console.log('PASS Mindsalve, Fireshield, Poison and Quiescence: rule outcomes, clock, effects, Physic and historical replay');

const ice=drink({name:'Iceshield',useId:'ice',baseAS:10,d100:95});
assert.equal(ice.actor.hmk.healthState.fatigue.weariness,50);
const iceContext={journal:ice.journal,campaignId,minute,actorId};
const iceShield=iceshieldProtection(iceContext);
assert.equal(iceShield.av,4);
assert.equal(iceShield.advanceBonus,20);
assert.equal(fireshieldProtection(iceContext).av,0);
assert.equal(iceshieldProtection({...iceContext,auralShockLevels:1}).av,0);
const iceHazard={kind:'cold',areaAV:2,roll:4};
assert.equal(evaluateTrekkingWeatherRoll({...iceHazard,iceshieldAV:iceShield.av}).exposed,false);
assert.equal(evaluateTrekkingWeatherRoll(iceHazard).exposed,true);
assert.equal(episodeWeatherExposure({...iceHazard,iceshieldAV:iceShield.av}).tn,4);
assert.throws(()=>episodeWeatherExposure({...iceHazard,kind:'heat',iceshieldAV:iceShield.av}),/pouze proti Cold/);
const water={actor:clean,state:clean.hmk.healthState,sourceId:'ice-water',condition:'coolWater',
 d6s:[1,1,1],enduranceD100:81,gmConfirmed:true,originMinute:100};
const without=prepareColdWaterShock(water).report;
const withIce=prepareColdWaterShock({...water,iceshieldBonus:iceShield.advanceBonus}).report;
assert.equal(withIce.endEML,without.endEML+20);
assert.notEqual(withIce.sl,without.sl);
const cold=prepareTrekkingWeatherTest({state:clean.hmk.healthState,sourceId:'frost-watch',kind:'cold',
 originalSL:'CF',coldCondition:'dry',weatherHazardConfirmed:true,gmConfirmed:true}).state;
const exposed=cold.environmentalHazards[0];
const advance={state:cold,actor:clean,sourceId:'frost-watch',elapsedMinutes:exposed.periodMinutes,roll:48,gmConfirmed:true};
assert.equal(advanceTrekkingWeatherExposure({...advance,iceshieldBonus:20}).report.eml,
 advanceTrekkingWeatherExposure(advance).report.eml+20);
const frost=prepareExposureSkinInjuries({actor:clean,state:cold,inventory:[],sourceId:'frost-watch',
 iceshieldAV:4,originMinute:100,windD20:10,durationD20:12,
 rows:[{location:'tx',av:4}],allLocationsReviewed:true,gmConfirmed:true});
assert.equal(frost.report.iceshieldAV,4);
assert.equal(frost.report.wounds.length,0);
const guarded=previewAreaCohort({id:'protected-frost',timelineId:'test-combat',round:1,aspect:'frost',strikeImpact:3,
 targetIds:[actorId],characters:[fireTarget],states:{[actorId]:clean.hmk.healthState},inventory:[],
 frostProtection:{[actorId]:iceShield.av},rollsByTarget:{[actorId]:{shockD100:null}}});
assert.equal(guarded.results[actorId].areaAV,4);
const nextIce=drink({name:'Iceshield',useId:'second-ice',baseAS:6,d100:83,prior:ice.journal,actor:ice.actor});
assert.equal(nextIce.actor.hmk.healthState.fatigue.weariness,130);
const iceCleared=drink({name:'Physic',useId:'ice-physic',baseAS:8,actor:ice.actor,prior:ice.journal});
assert.equal(iceshieldProtection({...iceContext,journal:iceCleared.journal}).av,0);
console.log('PASS Iceshield: protection, Cold Hazard cap, Cold Shock, Exposure Advance, Frostbite, Area, Profusion and Physic');

const warm=drink({name:'Warmth',useId:'warmth',baseAS:6,d100:95});
assert.equal(warm.proof.finalAS,4);
assert.equal(warm.proof.sourcePages.at(-1),274);
assert.equal(warm.actor.hmk.healthState.fatigue.weariness,30);
const companion={...structuredClone(clean),id:'escort'};
const nearbyContext={journal:warm.journal,campaignId,minute,sourceActorId:actorId,nearbyIds:[companion.id],gmConfirmed:true};
const facts=createWarmthProximity(nearbyContext);
assert.throws(()=>createWarmthProximity({...nearbyContext,nearbyIds:[actorId]}),/seznam/);
assert.throws(()=>createWarmthProximity({...nearbyContext,gmConfirmed:false}),/GM/);
const noted=[...warm.journal,row('near','calendarAlchemyWarmthProximity',facts)];
assert.doesNotThrow(()=>validateWarmthProximityJournal(noted));
assert.throws(()=>assertWarmthProximityAppendOnly(noted,warm.journal),/odstranit/);
const atWarm={actorId,campaignId,minute,journal:noted,characters:[warm.actor,companion],memberIds:[actorId,companion.id]};
const ownHeat=warmthProtection(atWarm);
assert.equal(ownHeat.av,2);
assert.equal(ownHeat.advanceBonus,10);
const ally={...atWarm,actorId:companion.id};
assert.equal(warmthProtection({...ally,journal:warm.journal}).av,0);
assert.deepEqual(warmthProtection(ally),{av:1,advanceBonus:5,sources:[{useId:'warmth',sourceActorId:actorId,as:4}]});
assert.equal(warmthProtection({...ally,minute:minute+1}).av,0);
const empty=createWarmthProximity({...nearbyContext,journal:noted,nearbyIds:[]});
assert.equal(warmthProtection({...ally,journal:[...noted,row('new-near','calendarAlchemyWarmthProximity',empty)]}).av,0);
const positions=[{id:actorId,x:0,y:0},{id:companion.id,x:3,y:4}];
assert.equal(warmthProtection({...ally,spatialUnits:positions}).av,1);
assert.equal(warmthProtection({...ally,spatialUnits:[positions[0],{...positions[1],y:4.01}]}).av,0);
assert.equal(warmthProtection({...ally,spatialUnits:[positions[0]]}).av,0);
const shocked=structuredClone(warm.actor);
shocked.hmk.arcane.auralShockLevels=1;
assert.equal(warmthProtection({...ally,characters:[shocked,companion]}).av,0);
const warmCF=drink({name:'Fireshield',useId:'triggers-warmth',baseAS:6,d100:83,prior:noted,actor:warm.actor});
assert.equal(warmCF.proof.profusionCF,true);
assert.equal(warmCF.actor.hmk.healthState.fatigue.weariness,90);
const coldPhysic=drink({name:'Physic',useId:'warmth-physic',baseAS:8,actor:warm.actor,prior:noted});
assert.equal(warmthProtection({...ally,journal:coldPhysic.journal}).av,0);
assert.equal(evaluateTrekkingWeatherRoll({...iceHazard,warmthAV:ownHeat.av}).exposed,false);
assert.equal(episodeWeatherExposure({...iceHazard,warmthAV:ownHeat.av}).tn,4);
assert.equal(prepareColdWaterShock({...water,warmthBonus:ownHeat.advanceBonus}).report.endEML,without.endEML+10);
assert.equal(advanceTrekkingWeatherExposure({...advance,warmthBonus:5}).report.eml,
 advanceTrekkingWeatherExposure(advance).report.eml+5);
const warmFrost=prepareExposureSkinInjuries({actor:clean,state:cold,inventory:[],sourceId:'frost-watch',
 warmthAV:1,originMinute:100,windD20:10,durationD20:1,
 rows:[{location:'tx',av:1}],allLocationsReviewed:true,gmConfirmed:true});
assert.equal(warmFrost.report.warmthAV,1);
assert.equal(warmFrost.report.wounds.length,0);
console.log('PASS Warmth: own and nearby protection, 5-ft combat boundary, GM witness, expiry, weather, Profusion and Physic');

const cloak=drink({name:'Soulcloak',useId:'cloak',d100:95});
assert.equal(cloak.proof.finalAS,4);
assert.equal(cloak.actor.hmk.healthState.fatigue.weariness,30);
assert.equal(cloak.proof.sourcePages.at(-1),274);
const cloakContext={journal:cloak.journal,campaignId,actorId,minute,auralShockLevels:0,
 attemptReference:'First True Sight',origin:'manual',gmConfirmed:true};
const misses=createSoulcloakDefence({...cloakContext,d10:5});
assert.equal(misses.blocked,false);
assert.equal(misses.asAfter,4);
assert.throws(()=>createSoulcloakDefence({...cloakContext,d10:4,auralShockLevels:1}),/Aural Shock/);
const blocked=createSoulcloakDefence({...cloakContext,d10:4});
assert.equal(blocked.blocked,true);
assert.equal(blocked.asAfter,3);
const cloakJournal=[...cloak.journal,row('sc-try','calendarAlchemySoulcloakDefence',blocked)];
assert.equal(soulcloakStatus({...cloakContext,journal:cloakJournal}).state.currentAS,3);
assert.equal(activeAlchemyProfusionCohort(cloakJournal,campaignId,actorId,minute)[0].state.currentAS,3);
assert.throws(()=>createSoulcloakDefence({...cloakContext,journal:cloakJournal,d10:4}),/už byl/);
assert.throws(()=>createSoulcloakDefence({...cloakContext,campaignId:'another',d10:1}),/chybí/);
assert.doesNotThrow(()=>validateSoulcloakJournal(cloakJournal));
const cloakHistory=historicalHMKCalendarEntries(clock,[{...cloak.actor,name:'QA'}],[cloakJournal.at(-1)]).find(x=>x.kind==='alchemy-soulcloak-defence');
assert.match(cloakHistory.note,/d10 \(4\).*AS 4 → 3.*automaticky selhal/);
const altered=structuredClone(cloakJournal);
altered.at(-1).calendarAlchemySoulcloakDefence.asAfter=1;
assert.throws(()=>validateSoulcloakJournal(altered),/změněn/);
assert.throws(()=>assertSoulcloakAppendOnly(cloakJournal,altered),/nelze/);
const dueCloak=soulcloakStatus({...cloakContext,journal:cloakJournal}).state.nextDueMinute;
assert.equal(soulcloakStatus({...cloakContext,minute:dueCloak}),null);
const cloakDecay=createAlchemyDecay({...cloakContext,finishId:cloak.finishId,journal:cloakJournal,minute:dueCloak,d10:10});
assert.equal(cloakDecay.asBefore,3);assert.equal(cloakDecay.asAfter,1);
const decayed=[...cloakJournal,row('sc-decay','calendarAlchemyDecay',cloakDecay,dueCloak)];
assert.equal(validateAlchemyDecayJournal(decayed),true);
const depleted=createSoulcloakDefence({...cloakContext,journal:decayed,minute:dueCloak,attemptReference:'Last True Sight',d10:1});
const depletedJournal=[...decayed,row('sc-last','calendarAlchemySoulcloakDefence',depleted,dueCloak)];
assert.equal(soulcloakStatus({...cloakContext,journal:depletedJournal,minute:dueCloak}),null);
assert.doesNotThrow(()=>validateSoulcloakJournal(depletedJournal));
const anotherCloak=drink({name:'Soulcloak',useId:'second-cloak',baseAS:6,d100:83,prior:cloakJournal,actor:cloak.actor});
assert.equal(anotherCloak.actor.hmk.healthState.fatigue.weariness,90);
assert.equal(soulcloakStatus({...cloakContext,journal:anotherCloak.journal}).state.currentAS,4);
const suppressed=drink({name:'Physic',useId:'cloak-physic',baseAS:8,actor:cloak.actor,prior:cloakJournal});
assert.equal(soulcloakStatus({...cloakContext,journal:suppressed.journal}),null);
console.log('PASS Soulcloak: True Sight, journal replay, duplicate defence, Aural Shock, CF/Profusion, Decay and Physic');

const dry=drink({name:'Exsiccation',useId:'dry'});
const dryContext={journal:dry.journal,campaignId,actorId,minute,useId:'dry',auralShockLevels:0,gmConfirmed:true,waterReference:'Rainwater'};
const breath=createElixirBreath(dryContext);
assert.equal(breath.asBefore,6);
assert.equal(breath.asAfter,5);
assert.equal(breath.radiusFeet,5);
assert.equal(breath.endMinute,minute+6);
const dryJournal=[...dry.journal,row('dry-breath','calendarAlchemyExsiccationBreath',breath)];
assert.equal(elixirBreathSources({...dryContext,journal:dryJournal})[0].state.currentAS,5);
assert.deepEqual(activeElixirBreathAreas({...dryContext,journal:dryJournal,minute:minute+5}),[breath]);
assert.deepEqual(activeElixirBreathAreas({...dryContext,journal:dryJournal,minute:minute+6}),[]);
assert.deepEqual(activeElixirBreathAreas({...dryContext,journal:dryJournal,auralShockLevels:1}),[]);
assert.throws(()=>createElixirBreath({...dryContext,auralShockLevels:1}),/Aural Shock/);
assert.throws(()=>createElixirBreath({...dryContext,journal:dryJournal}),/již byl/);
assert.doesNotThrow(()=>validateElixirBreathJournal(dryJournal));
assert.throws(()=>assertElixirBreathAppendOnly(dryJournal,dry.journal),/odstranit/);
const harshDry=drink({name:'Exsiccation',useId:'dry-cf',d100:95});
const exsiccationShock=applyAlchemyExsiccationAural({proof:harshDry.proof,eventId:'dry-cf',state:harshDry.actor.hmk.healthState});
assert.equal(exsiccationShock.arcane.auralShockLevels,1);
assert.equal(exsiccationShock.state.fatigue.otherWeakness,5);
const trigger=drink({name:'Fireshield',useId:'dry-trigger',d100:83,prior:dryJournal,actor:dry.actor});
const ill=createExsiccationProfusionIll({journal:trigger.journal,campaignId,minute,triggerUseId:'dry-trigger',sourceUseId:'dry',targetId:actorId});
const afterIll=applyExsiccationProfusionAural({journal:trigger.journal,proof:ill,eventId:'dry-prof',state:trigger.actor.hmk.healthState});
assert.equal(afterIll.arcane.auralShockLevels,1);
assert.equal(validateExsiccationProfusionJournal([...trigger.journal,row('dry-prof','calendarAlchemyExsiccationProfusionIll',ill)]),true);
const wetAgain=drink({name:'Physic',useId:'dry-physic',prior:dryJournal,actor:dry.actor,baseAS:8});
assert.deepEqual(activeElixirBreathAreas({...dryContext,journal:wetAgain.journal}),[]);
console.log('PASS Exsiccation: radius, duration, expenditure, Aural Shock, Profusion, history and Physic');

const shadow=drink({name:'Shadowbreath',useId:'shadow',d100:95});
assert.equal(shadow.proof.sourcePages.at(-1),274);
assert.equal(shadow.actor.hmk.healthState.fatigue.weariness,30);
const shadowContext={journal:shadow.journal,campaignId,actorId,minute,useId:'shadow',elixirName:'Shadowbreath',
 auralShockLevels:0,gmConfirmed:true};
const darkness=createElixirBreath(shadowContext);
assert.deepEqual(darkness.sourcePages,[270,274]);
assert.equal(darkness.radiusFeet,5);
assert.equal(darkness.asAfter,3);
const darkJournal=[...shadow.journal,row('shadow-breath','calendarAlchemyShadowbreath',darkness)];
assert.doesNotThrow(()=>validateElixirBreathJournal(darkJournal));
assert.deepEqual(activeElixirBreathAreas({...shadowContext,journal:darkJournal,minute:minute+3}),[darkness]);
assert.deepEqual(activeElixirBreathAreas({...shadowContext,journal:darkJournal,minute:minute+4}),[]);
assert.deepEqual(activeElixirBreathAreas({...shadowContext,journal:darkJournal,elixirName:'Exsiccation'}),[]);
const physicShadow=drink({name:'Physic',useId:'shadow-physic',actor:shadow.actor,prior:darkJournal});
assert.deepEqual(activeElixirBreathAreas({...shadowContext,journal:physicShadow.journal}),[]);
console.log('PASS Shadowbreath: moving area, expiry, AS consumption, CF and Physic');

const air=drink({name:'Airtap',useId:'air',d100:11});
const airContext={journal:air.journal,campaignId,actorId,minute};
const airEffect=airtapEvidence(airContext);
assert.equal(airEffect.sourcePage,271);
assert.equal(airtapEvidence({...airContext,auralShockLevels:1}),null);
const march=calculateTimeEpisode({minute,minutes:97,memberIds:[actorId],enduranceByActor:{[actorId]:12},endRollByActor:{[actorId]:10}});
const walker=march.actors[0];
const halfUnits=airtapTravelUnits(walker,{minutes:97,begin:minute,onFoot:true,airtap:airEffect});
assert.equal(halfUnits,walker.movementFatigueUnits/2);
assert.equal(halfUnits,242.5);
const afterMarch=calculateTimeEpisode({minute:minute+97,minutes:1,memberIds:[actorId],enduranceByActor:{[actorId]:12},endRollByActor:{[actorId]:10},previousCarry:{[actorId]:halfUnits%240}});
assert.equal(afterMarch.actors[0].carryOut,7.5);
const movement={...walker,airtap:airEffect,movementFatigueUnits:halfUnits,rate:halfUnits/97,delta:1,carryOut:2.5};
assert.doesNotThrow(()=>validateTimeEpisodes([...air.journal,row('air-march','calendarTimeEpisode',{...march,actors:[movement]})]));
assert.throws(()=>validateTimeEpisodes([...air.journal,row('air-march','calendarTimeEpisode',{...march,actors:[{...movement,movementFatigueUnits:480}]})]),/Airtap/);
const fast=calculateTimeEpisode({minute,minutes:90,memberIds:[actorId],enduranceByActor:{[actorId]:12},endRollByActor:{[actorId]:[3,9]},doubleTime:true});
assert.equal(airtapTravelUnits(fast.actors[0],{minutes:90,begin:minute,onFoot:true,airtap:airEffect}),fast.actors[0].movementFatigueUnits/2);
assert.equal(airtapTravelUnits(walker,{minutes:97,begin:airEffect.untilMinute-1,onFoot:true,airtap:airEffect}),482.5);
const swimmer={...air.actor,hmk:{...air.actor.hmk,attributes:{str:12,end:12,wil:12},skills:[{name:'Swimming',ml:30}]}};
const swimArgs={actor:swimmer,state:swimmer.hmk.healthState,inventory:[],sourceId:'actual-swimming',round:1,
 original:{roll:58,rawEML:-20,ml:30},water:'inland',windForce:0,soakedClothingENC:0,
 roundsWithoutAir:2,rescued:true,willD100:11,gmConfirmed:true};
const normalSwim=prepareSwimmingConsequence(swimArgs).report;
assert.equal(prepareSwimmingConsequence({...swimArgs,airtap:airEffect}).report.capacity,normalSwim.capacity*2);
const smoke=prepareEnclosedSmokeStart({actor:swimmer,state:swimmer.hmk.healthState,sourceId:'actual-smoke',round:1,
 enclosedArea:true,firePresent:true,smokePresent:true,gmConfirmed:true});
const smoky={actor:swimmer,state:smoke.state,sourceId:'actual-smoke',round:1,airRestored:true,roundsWithoutAir:2,willD100:11,gmConfirmed:true};
const baseBreath=prepareEnclosedSmokeCompletion(smoky).report.maximumRounds;
const longBreath=prepareEnclosedSmokeCompletion({...smoky,airtap:airEffect,roundsWithoutAir:baseBreath+1}).report;
assert.equal(longBreath.maximumRounds,baseBreath*2);
const badAir=drink({name:'Airtap',useId:'air-cf',d100:95});
assert.equal(badAir.actor.hmk.healthState.fatigue.weariness,30);
const clearAir=drink({name:'Physic',useId:'air-physic',prior:air.journal,actor:air.actor,baseAS:9});
assert.equal(airtapEvidence({...airContext,journal:clearAir.journal}),null);
console.log('PASS Airtap: swimming and smoke, ordinary and fast march, fractional carry, history, CF and Physic');
