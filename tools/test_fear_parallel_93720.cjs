'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||'/mnt/data/hmk_dev_93720');
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):old(m,p);
const {initialCombatState,validateCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {createEncounterSequence}=require(path.join(root,'src/integration/encounter-turn-sequence.js'));
const {projectFearExposure,persistFearSafeRecovery}=require(path.join(root,'src/integration/hmk-fear-aberrance-persistence.js'));
const {assertCommittedFearTransitions}=require(path.join(root,'src/integration/hmk-fear-write-invariant.js'));
const {activeFearSources}=require(path.join(root,'src/integration/hmk-concurrent-fear.js'));
const {persistSpellPsycheTraitChoice}=require(path.join(root,'src/integration/hmk-spell-psyche-trait-choice.js'));
let n=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++},ok=(x,m)=>{assert.ok(x,m);n++},reject=(f)=>{assert.throws(f);n++};
function doc(){return {characters:[{id:'A',name:'A',hmk:{attributes:{wil:12},arcane:{},healthState:initialCombatState()}}],journal:[],combatRuntime:{sequence:createEncounterSequence({roster:[{id:'A',name:'A',initiativeML:50,awarenessEML:50}],timelineId:'combat-1'})}};}
function fear(d,{id,source,roll,abe=0}={}){
 const next=projectFearExposure({document:d,characterId:'A',sourceId:source,sourceKind:'gm-event',sourceDescription:'Distinct source '+source+' emerged',aberrance:abe,d100:roll,eventId:id,gmConfirmed:true,gmConfirmedSource:true}).document;
 ok(validateCombatState(next.characters[0].hmk.healthState));assertCommittedFearTransitions(d,next);n++;return next;
}
function outcomes(d){return d.characters[0].hmk.healthState;}
for(const order of [[['one',71],['two',95]],[['two',95],['one',71]]]){
 let d=doc();for(const [name,roll] of order)d=fear(d,{id:'fear-'+name,source:'entity-'+name,roll});
 let s=outcomes(d);eq(s.fear.state,'terrified');eq(s.fearSources.length,2);eq(s.morale.psycheStress,1);
 eq(d.characters[0].hmk.arcane.pendingPsycheTraitChoice,{sourceEventId:'fear-two',levels:1});
 const before=structuredClone(d),storage={value:JSON.stringify(d),getItem(){return this.value},setItem(k,x){this.value=x}};
 const result=persistFearSafeRecovery({document:d,characterId:'A',eventId:'recover-two',elapsedMinutes:10,safeFromSource:true,gmConfirmed:true,storage,key:'x',baseline:storage.value});
 eq(result.ok,true);let recovered=result.document;eq(outcomes(recovered).fear.state,'afraid','previously weaker fear must reappear');
 eq(outcomes(recovered).fearSources.filter(x=>x.state==='steady').length,1);
 eq(recovered.journal.at(-1).combatProof.originalFearEventId,'fear-two');
 eq(storage.value,JSON.stringify(recovered));
 // The remaining Fear recovers only after its own elapsed safety/LOS proof.
 const next=persistFearSafeRecovery({document:recovered,characterId:'A',eventId:'recover-one',elapsedMinutes:1,
  safeFromSource:true,outOfLOS:true,gmConfirmed:true,storage,key:'x',baseline:storage.value});
 eq(next.ok,true);eq(outcomes(next.document).fear.state,'steady');eq(outcomes(next.document).fearSources.length,2);

}
// Multiple independent PSY debts do not erase the previously pending choice.
{let d=doc();d=fear(d,{id:'fear-one',source:'entity-one',roll:95,abe:0});d=fear(d,{id:'fear-two',source:'entity-two',roll:100,abe:0});
 const a=d.characters[0].hmk.arcane;eq(a.pendingPsycheTraitChoice,{sourceEventId:'fear-one',levels:1});eq(a.pendingPsycheTraitChoices,[{sourceEventId:'fear-two',levels:2}]);eq(outcomes(d).morale.psycheStress,3);
 const clone=structuredClone(d);clone.characters[0].hmk.arcane.pendingPsycheTraitChoices=[];reject(()=>assertCommittedFearTransitions(d,clone));
}
// Physically witnessed Fear PSY1 and PSY2 are two separate GM choices, not one overwriting the other.
{let d=doc();d=fear(d,{id:'fear-one',source:'entity-one',roll:95});d=fear(d,{id:'fear-two',source:'entity-two',roll:100});
 const storage={value:JSON.stringify(d),getItem(){return this.value},setItem(k,x){this.value=x}};
 const first=persistSpellPsycheTraitChoice({document:d,characterId:'A',sourceEventId:'fear-one',trait:'Nervous',gmConfirmed:true,storage,key:'x',baseline:storage.value});
 eq(first.ok,true);eq(first.document.characters[0].hmk.arcane.pendingPsycheTraitChoice.sourceEventId,'fear-two');
 const second=persistSpellPsycheTraitChoice({document:first.document,characterId:'A',sourceEventId:'fear-two',trait:'Paranoid',gmConfirmed:true,storage,key:'x',baseline:storage.value});
 eq(second.ok,true);eq(second.document.characters[0].hmk.arcane.pendingPsycheTraitChoice,null);
 eq(second.document.characters[0].hmk.arcane.psycheTraumas.length,2);
}
// A second physical die must not be allowed to reuse a source or event ID.
{let d=doc();d=fear(d,{id:'fear-A',source:'entity-A',roll:71});reject(()=>fear(d,{id:'fear-B',source:'entity-A',roll:55}));reject(()=>fear(d,{id:'fear-A',source:'entity-B',roll:55}));}
// Even alongside a legitimate new roll, rewriting a previous origin must fail.
{let d=doc();d=fear(d,{id:'fear-one',source:'entity-one',roll:71});
 const next=fear(d,{id:'fear-two',source:'entity-two',roll:95});
 const tampered=structuredClone(next);
 tampered.characters[0].hmk.healthState.fearSources[0].state='terrified';
 reject(()=>assertCommittedFearTransitions(d,tampered));
}
// Brave is an independent source: it survives a stronger visible Fear and
// must be recoverable without erasing the source of that stronger Fear.
{let d=doc();d=fear(d,{id:'fear-one',source:'entity-one',roll:71});
 d=fear(d,{id:'fear-brave',source:'entity-brave',roll:20});
 eq(outcomes(d).fear.state,'afraid');
 eq(outcomes(d).fearSources.find(x=>x.sourceEventId==='fear-brave').state,'brave');
 const storage={value:JSON.stringify(d),getItem(){return this.value},setItem(k,x){this.value=x}};
 const next=persistFearSafeRecovery({document:d,characterId:'A',sourceEventId:'fear-brave',eventId:'recover-brave',elapsedMinutes:5,
  gmConfirmed:true,storage,key:'x',baseline:storage.value});
 eq(next.ok,true);
 eq(outcomes(next.document).fear.state,'afraid');
 eq(outcomes(next.document).fearSources.find(x=>x.sourceEventId==='fear-brave').state,'steady');
}
console.log('PASS '+n+' concurrent Fear assertions');
