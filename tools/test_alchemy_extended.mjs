import assert from 'node:assert/strict';
import {initialCombatState,specialActionReadiness} from '../src/integration/persistent-combat-state.js';
import {createExtendedAlchemyImbibing,createAlchemyPhysicImbibing,activeAlchemyProfusionCohort,
 activeAlchemyPhysicTargets,validateAlchemyImbibingJournal} from '../src/integration/hmk-alchemy-imbibing.js';
import {createAlchemyVialBinding,createAlchemyVialEmpty} from '../src/integration/hmk-alchemy-vial-ledger.js';
import {createAlchemyDecay,alchemyElixirStrength,validateAlchemyDecayJournal} from '../src/integration/hmk-alchemy-decay.js';
import {fireshieldProtection,quiescenceUses,mindsalveRollPlan,startExtendedAlchemy,advanceExtendedAlchemy,
 pendingExtendedAlchemy,applyExtendedAlchemyInteractions,settleExtendedAlchemy,requireExtendedAlchemyTime,
 validateExtendedAlchemy,assertExtendedAlchemyAppendOnly} from '../src/integration/hmk-alchemy-extended.js';
import {previewAreaCohort} from '../src/integration/hmk-area-cohort-preview.js';
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
