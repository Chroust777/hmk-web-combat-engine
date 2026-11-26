import assert from 'node:assert/strict';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
import {occupationPrimaryConvocation,validateStartingPvarSpells} from '../src/integration/hmk-creation-starting-pvar.js';
import {knowsExposureBalm,prepareTrekkingWeatherTest,resolveBalmExposureRecovery,startTrekkingWeatherExposureTreatment,
 advanceTrekkingWeatherExposure} from '../src/integration/hmk-weather-hazard-aftermath.js';

const actor={id:'patient',hmk:{attributes:{end:14,wil:14}}};
const caster={id:'mage',hmk:{arcane:{knownSpells:['Balm']}}};
const sourceId='exposure-1';
const state=prepareTrekkingWeatherTest({state:initialCombatState(),sourceId,
 kind:'cold',coldCondition:'damp',originalSL:'F',weatherHazardConfirmed:true,gmConfirmed:true}).state;
const args={state,actor,caster,sourceId,round:2,minute:110,originMinute:100,spellML:70,castingEML:65,
 castingD100:11,recoveryD100:11,range:'touch',understanding:'Úspěšný Diagnosis',gmConfirmed:true};

const research={occupation:'Shèk-Pvâr (Fývria: Herblore + Physician)',pvarismML:36,primary:'Fývria',chantryStars:3,startingARP:9};
assert.equal(occupationPrimaryConvocation(research.occupation),'Fývria');
assert.equal(occupationPrimaryConvocation('Shèk-Pvâr (Fývria)'),'Fývria');
assert.equal(occupationPrimaryConvocation('Shèk-Pvâr (Jmôrvi)'),'Jmôrvi');
assert.equal(occupationPrimaryConvocation('Physician'),null);
assert.throws(()=>validateStartingPvarSpells({...research,primary:'Jmôrvi'}),/odpovídat povolání/);
const legacyResearch={...research,primary:'Fývria: Herblore + Physician',chantryConvocation:'Fývria'};
const legacyProof=validateStartingPvarSpells(legacyResearch);
assert.equal(legacyProof.primary,legacyResearch.primary);
assert.deepEqual(validateStartingPvarSpells({...legacyProof,choices:[]}),legacyProof);
function createdMage(knownSpell){
 const starting=validateStartingPvarSpells({...research,choices:[{id:knownSpell,assisted:true}]});
 return {id:'trained-mage',occupation:research.occupation,hmk:{
  attributes:{agl:12,aur:16,emp:11,end:12,cre:12,elo:12,rea:13,per:12,wil:14,str:12},
  creation:{status:'complete',completed:{},step:14,values:{startingPvarSpellsProof:starting},
   skillDP:{'Optional Skills':{'Pvârism':6}}},
  startingPvarSpells:structuredClone(starting)
 }};
}
const trainedCaster=createdMage('Fývria::Balm');
assert.equal(knowsExposureBalm(trainedCaster),true);
assert.equal(trainedCaster.hmk.startingPvarSpells.spells[0].arpCost,1);
assert.equal(resolveBalmExposureRecovery({...args,caster:trainedCaster}).report.casterId,trainedCaster.id);
assert.equal(knowsExposureBalm(createdMage('Fývria::Diagnosis')),false);
const corruptedCaster=structuredClone(trainedCaster);
corruptedCaster.hmk.startingPvarSpells.spells[0].arpCost=0;
assert.equal(knowsExposureBalm(corruptedCaster),false);
assert.throws(()=>resolveBalmExposureRecovery({...args,caster:corruptedCaster}),/známé kouzlo/);

const successful=resolveBalmExposureRecovery(args);
assert.deepEqual([successful.report.castingSL,successful.report.sl,successful.report.fromHR,successful.report.toHR],['S','S',4,5]);
assert.equal(successful.state.environmentalHazards[0].lastElapsedMinutes,0);
assert.equal(successful.state.environmentalHazards[0].sequence,0);
assert.equal(state.environmentalHazards[0].hr,4);
assert.throws(()=>resolveBalmExposureRecovery({...args,state:structuredClone(successful.state),round:3}),/jednou/);

for(const [recoveryD100,level] of [[81,'F'],[95,'CF']]){
 const failed=resolveBalmExposureRecovery({...args,recoveryD100});
 assert.equal(failed.report.failureIgnored,true);
 assert.equal(failed.report.sl,level);
 assert.deepEqual(failed.state.environmentalHazards,state.environmentalHazards);
 assert.deepEqual(failed.state.fatigue,state.fatigue);
 assert.throws(()=>resolveBalmExposureRecovery({...args,state:failed.state,round:3}),/jednou/);
}
const critical=resolveBalmExposureRecovery({...args,spellML:90,range:'ten-feet-los',castingD100:5,recoveryD100:5});
assert.deepEqual([critical.report.bonus,critical.report.toHR,critical.state.environmentalHazards[0].active],[10,6,false]);
assert.throws(()=>resolveBalmExposureRecovery({...args,castingD100:95}),/úspěšný Spellfire/);
assert.throws(()=>resolveBalmExposureRecovery({...args,spellML:69}),/Spell ML/);
assert.throws(()=>resolveBalmExposureRecovery({...args,range:'ten-feet-los'}),/dotyk/);
assert.throws(()=>resolveBalmExposureRecovery({...args,caster:{id:'other'}}),/známé kouzlo/);
assert.throws(()=>resolveBalmExposureRecovery({...args,sourceId:'other'}),/aktivní expozici/);
assert.throws(()=>resolveBalmExposureRecovery({...args,minute:99}),/minutu/);
assert.throws(()=>resolveBalmExposureRecovery({...args,gmConfirmed:false}),/potvrzení GM/);

const heat=prepareTrekkingWeatherTest({state:initialCombatState(),sourceId,kind:'heat',originalSL:'F',
 weatherHazardConfirmed:true,gmConfirmed:true}).state;
const compress=startTrekkingWeatherExposureTreatment({state:heat,sourceId,round:2,elapsedMinutes:10,
 removedFromHazard:true,treatmentConfirmed:true,coolWater:true,gmConfirmed:true}).state;
const failedBalm=resolveBalmExposureRecovery({...args,state:compress,round:3,minute:112,recoveryD100:95});
const natural=advanceTrekkingWeatherExposure({state:failedBalm.state,actor,sourceId,round:4,method:'healing',elapsedMinutes:15,
 roll:5,removedFromHazard:true,treatmentConfirmed:true,coolWater:true,gmConfirmed:true});
assert.equal(natural.report.defeated,true);

console.log('PASS Balm from both legacy and validated Shèk-Pvâr spellbooks, witnessed casting, SI and range, no duplicate, F/CF without change, and independent wet Compress.');
