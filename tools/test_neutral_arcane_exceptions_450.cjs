'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const E=require('../src/integration/hmk-neutral-arcane-exceptions.js');
const C=require('../src/integration/hmk-alchemy-arcane-casting-readiness.js');
const D=require('../src/integration/hmk-alchemy-neutral-detection.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};
const yes=a=>{assert.ok(a);n++};const bad=(f,regex)=>{assert.throws(f,regex);n++};
for(const [si,sl,wl] of [[1,'S',1],[2,'S',1],[3,'S',2],[4,'CS',4],[7,'CS',6]]){
 const r=E.neutralWardProfile({spellSI:si,castingSL:sl,sourceCategory:'Elixir'});
 eq(r.wardLevel,wl);eq(r.wardDispelPenalty,-wl*10);
 eq(r.protectedSourceVisibleToDetect,false);eq(r.mayCommit,false);
}
for(const category of ['Active spell','Active talent','Artefact enchantment','Elixir','Rune object']){
 const x=E.neutralWardProfile({spellSI:5,castingSL:'CS',sourceCategory:category});
 eq(x.wardLevel,5);eq(x.sourceCategory,category);yes(x.protecting);
}
let weaker=E.neutralWardProfile({spellSI:6,castingSL:'S',sourceCategory:'Elixir',priorWardLevel:5});
eq(weaker.supersedesPrior,false);eq(weaker.protecting,false);
weaker=E.neutralWardProfile({spellSI:6,castingSL:'S',sourceCategory:'Active spell',sourceStillActive:false});
eq(weaker.protecting,false);
bad(()=>E.neutralWardProfile({spellSI:5,castingSL:'F',sourceCategory:'Elixir'}),/Ward spellfire/);
bad(()=>E.neutralWardProfile({spellSI:6,castingSL:'S',sourceCategory:'Raw principle'}),/kategorii/);
bad(()=>E.neutralWardProfile({spellSI:6.4,castingSL:'S',sourceCategory:'Elixir'}),/Index/);
for(const [sl,roll,d6s,shock,loss] of [
 ['CF',95,[],0,0],['F',76,[1,2,3,4,5,6],6,21],
 ['S',31,[3,3,3,3],4,12],['CS',30,[6,1],2,7]]){
 const x=E.neutralTotalReleaseSpirit({spellCL:2,spiritML:60,verifiedOtherModifiers:0,
  modifiersVerified:true,spiritD100:roll,lossD6:d6s});
 eq(x.spiritSL,sl);eq(x.auralShock,shock);eq(x.spiritMLLoss,loss);
 eq(x.psycheStress,3);eq(x.fatalTransformation,sl==='CF');eq(x.mayCommit,false);
}
for(const cl of [1,2,3,4,5,6]){
 const s=E.neutralChaosStormGeometry(cl);
 eq(s.spellSI,cl);eq(s.durationRounds,cl);eq(s.roamingDiameterFeet,20*cl);
 eq(s.initialDiameterFeet,5);eq(s.casterMayShieldSources,true);
}
bad(()=>E.neutralTotalReleaseSpirit({spellCL:2,spiritML:60,spiritD100:32,lossD6:[2,3]}),/modifikátory/);
bad(()=>E.neutralTotalReleaseSpirit({spellCL:2,spiritML:60,verifiedOtherModifiers:0,
 modifiersVerified:true,spiritD100:31,lossD6:[1,2]}),/fyzické d6/);
bad(()=>E.neutralTotalReleaseSpirit({spellCL:2,spiritML:60,verifiedOtherModifiers:0,
 modifiersVerified:true,spiritD100:30,lossD6:[1,7]}),/fyzické d6/);
bad(()=>E.neutralTotalReleaseSpirit({spellCL:2,spiritML:60,verifiedOtherModifiers:0,
 modifiersVerified:true,spiritD100:100,lossD6:[1,1]}),/fyzické d6/);
bad(()=>E.neutralChaosStormGeometry(7),/spell CL/);
for(const [roll,d20,sl,unit] of [[41,null,'S',null],[40,null,'CS',null],[81,7,'F','rounds'],[95,13,'CF','hours']]){
 const x=E.neutralVortexSourceRoll({category:'Elixir',currentAS:14,d100:roll,d20});
 eq(x.successLevel,sl);eq(x.suppressionUnit,unit);
 eq(x.permanentASLoss,0);eq(x.casterPsycheStress,sl==='CS'?1:0);
 eq(x.mayCommit,false);
}
const ward=E.neutralVortexSourceRoll({category:'Ward',wardLevel:2,d100:76,d20:20});
eq(ward.targetML,20);eq(ward.suppressionUnit,'rounds');eq(ward.suppressionDuration,20);
bad(()=>E.neutralVortexSourceRoll({category:'Elixir',currentAS:8,protectedByActiveWard:true,d100:45}),/nejdřív/);
bad(()=>E.neutralVortexSourceRoll({category:'Elixir',currentAS:8,d100:75}),/d20/);
bad(()=>E.neutralVortexSourceRoll({category:'Elixir',currentAS:8,d100:20,d20:10}),/d20/);
bad(()=>E.neutralVortexSourceRoll({category:'Rune object',d100:35}),/pouze/);
for(const [spell,cl] of [['Detect',1],['Reveal',1],['Dispel',2]]){
 const dice=C.neutralSpellfireDice({spell,fullEML:50,castingD100:95,misfireD100:100});
 eq(dice.rawPrincipleGeometry.spellSI,cl);eq(dice.rawPrincipleGeometry.durationRounds,cl);
 eq(dice.requiredEvidence.length,7);eq(dice.diceComplete,false);eq(dice.mayCommit,false);
}
for(const source of [{sourceId:'ward-001',category:'Active spell',distanceFeet:5,spell:'Ward'},
 {sourceId:'ward-002',category:'Active spell',distanceFeet:5,wardLevel:4},
 {sourceId:'ward-003',category:'Active spell',distanceFeet:5,protectsSourceId:'alchemy-1'}]){
 bad(()=>D.buildNeutralDetectCensus({journal:[],inventory:[],campaignId:'C',minute:0,
  distancesByFinishId:{},otherSources:[source],maxRangeFeet:30,gmAllSourcesConfirmed:true}),/Ward.*historie/);
}
console.log('PASS Neutral Ward / Total Release / Chaos Storm 450:',n,'checks');
