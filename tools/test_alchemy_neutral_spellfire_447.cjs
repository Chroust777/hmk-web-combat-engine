'use strict';
// HMK v1.2 pp.198,200–203: read-only spell arithmetic/dice scaffold.
// This is NOT a successful casting proof and must never write combat state.
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prior=require.extensions['.js'];require.extensions['.js']=(module,path)=>{
 if(!path.includes('/src/'))return prior(module,path);
 module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,path);
};
const {neutralSpellMastery,neutralSpellfireDice,alchemyArcaneCastingPreflight}=require('../src/integration/hmk-alchemy-arcane-casting-readiness.js');
let n=0;
const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=a=>{assert.ok(a);n++},reject=(f,msg)=>{assert.throws(f,msg);n++};
const spells={Detect:{cl:1,ml:64,si:6,range:30},Reveal:{cl:1,ml:64,si:6,range:6},Dispel:{cl:2,ml:62,si:6,range:30}};
for(const [spell,expect] of Object.entries(spells)){
 const x=neutralSpellMastery(70,spell);
 eq(x.spellML,expect.ml);eq(x.spellSI,expect.si);eq(x.complexity,expect.cl);
 eq(x.difficulty,expect.cl+2);eq(x.convocationDegree,2);eq(x.rangeFeet,expect.range);
 eq(x.convocationML,70);eq(x.sunsignModifier,0);
}
// Spell-specific indexes can differ, especially at tens boundaries.
eq(neutralSpellMastery(66,'Detect').spellSI,6);
eq(neutralSpellMastery(66,'Dispel').spellSI,5);
eq(neutralSpellMastery(40,'Detect').rangeFeet,15);
eq(neutralSpellMastery(40,'Dispel').rangeFeet,15);
eq(neutralSpellMastery(11,'Dispel').spellML,3);
eq(neutralSpellMastery(11,'Dispel').spellSI,0);
reject(()=>neutralSpellMastery(70,'Pyre'),/neznámé/);
reject(()=>neutralSpellMastery(null,'Detect'),/Pvârism/);
reject(()=>neutralSpellMastery(70.2,'Detect'),/Pvârism/);
for(const spell of Object.keys(spells)){
 for(const [roll,level,base] of [[41,'S',5],[40,'CS',0],[81,'F',5],[95,'CF',10]]){
  const result=neutralSpellfireDice({spell,fullEML:70,castingD100:roll});
  eq(result.castingSL,level);eq(result.castingFatigue,base);eq(result.complete,false);eq(result.mayCommit,false);
  eq(result.misfireRequired,level==='CF');eq(result.diceComplete,level!=='CF');
 }
}
let cf=neutralSpellfireDice({spell:'Dispel',fullEML:60,castingD100:95});
ok(cf.misfireRequired);eq(cf.totalFatigue,10);
const form=neutralSpellfireDice({spell:'Dispel',fullEML:60,castingD100:95,misfireD100:27});
eq(form.misfire.kind,'grievous');eq(form.misfire.extraFatigue,30);
eq(form.totalFatigue,40);eq(form.misfire.crucial,false);eq(form.diceComplete,true);
const confusion=neutralSpellfireDice({spell:'Detect',fullEML:60,castingD100:95,misfireD100:55});
eq(confusion.misfire.psycheStress,2);eq(confusion.totalFatigue,10);eq(confusion.misfire.crucial,true);
const leak=neutralSpellfireDice({spell:'Reveal',fullEML:60,castingD100:95,misfireD100:85});
eq(leak.misfire.auralShock,3);eq(leak.misfireRequired,false);eq(leak.complete,false);
const total=neutralSpellfireDice({spell:'Detect',fullEML:60,castingD100:95,misfireD100:100});
ok(total.totalReleaseNeedsSpiritAndRawPrinciple);eq(total.diceComplete,false);eq(total.misfire.kind,'total-release');
reject(()=>neutralSpellfireDice({spell:'Reveal',fullEML:null,castingD100:41}),/úplný/);
reject(()=>neutralSpellfireDice({spell:'Reveal',fullEML:60,castingD100:0}),/fyzický/);
reject(()=>neutralSpellfireDice({spell:'Reveal',fullEML:60,castingD100:41,misfireD100:15}),/pouze po Casting CF/);
reject(()=>neutralSpellfireDice({spell:'Reveal',fullEML:60,castingD100:95,misfireD100:0}),/pouze po Casting CF/);
reject(()=>neutralSpellfireDice({spell:'Pyre',fullEML:60,castingD100:41}),/neznámé/);
// Even a fully resolved dice branch never claims a committed attack/spell.
for(const die of [1,5,15,25,30,40,50,60,80,90,99,100]){
 const x=neutralSpellfireDice({spell:'Detect',fullEML:60,castingD100:95,misfireD100:die});
 eq(x.mayCommit,false);eq(x.complete,false);
}
const target={campaignId:'C',finishId:'finish',sourceId:'bind',phase:'stored',targetable:true,currentAS:6};
const unknown={id:'bad',hmk:{arcane:{auralShockLevels:1,misfireLostSpells:['Neutral::Dispel']}}};
const p=alchemyArcaneCastingPreflight({character:unknown,target,spell:'Dispel',distanceFeet:2});
ok(p.blockers.some(x=>x.includes('Aural Shock')));ok(p.blockers.some(x=>x.includes('Crucial Misfire')));
eq(p.complete,false);eq(p.mayCommit,false);
console.log('PASS canonical Neutral ML/SI/Casting d100/Fatigue/Misfire 447:',n,'checks');
