'use strict';
/** v93.442 / HMK pp.269–274: independent printed-effect registry audit.
 * No new imbibing permission, journal row, fatigue pool or mandatory die.
 */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const E=require('../src/integration/hmk-alchemy-ill-effects.js');
const C=require('../src/integration/hmk-creation-starting-elixirs.js');
let count=0;
const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const check=x=>{assert.ok(x);count++};
const fail=(fn,re)=>{assert.throws(fn,re);count++};
const applied=['Acid','Eruption','Fumebomb','Mending','Object Aegis','Weakness'];
const aural={Egosight:1,Erudition:1,Exsiccation:1,Footpad:1,Physic:1,Verity:1,Wakefulness:1,
 Ghostsight:3,Equipoise:5,Formfix:5,Dreamwalk:3};
const wear5=['Airtap','Aqua','Fireshield','Iceshield','Shadowbreath','Soulcloak','Sustenance','Warmth'];
const wear10=['Soulbuffer','Traumashield'];
const weak5=['Healing','Mindsalve'];
const penalty=['Darkvision','Might','Shout'];
const none=['Poison','Quiescence'];
const all=[...applied,...Object.keys(aural),...wear5,...wear10,...weak5,...penalty,...none,'Passion'];
eq(all.length,35);eq(new Set(all).size,35);eq(Object.keys(E.CANONICAL_ALCHEMY_ILL_EFFECTS).length,35);
eq([...C.STARTING_ELIXIR_NAMES].sort(),[...all].sort());
for(const name of all){
 const v=E.canonicalAlchemyIllEffect(name);
 check(Object.isFrozen(v));check(Number.isInteger(v.sourcePage));
 if(applied.includes(name)){
  eq(v.kind,'not-imbibed');fail(()=>E.planAlchemyIllEffect({elixirName:name,baseAS:7}),/Applied/);
 }else for(const as of [1,5,6,7,8,11]){
  const p=E.planAlchemyIllEffect({elixirName:name,baseAS:as});
  check(Object.isFrozen(p));eq(p.sourcePage,v.sourcePage);
  if(Object.hasOwn(aural,name)){
   if(name==='Dreamwalk'){
    eq(p.kind,'deferred');eq(p.trigger,'after-reembodiment');
    const later=E.planAlchemyIllEffect({elixirName:name,baseAS:as,stage:'after-reembodiment'});
    eq(later.kind,'aural-shock');eq(later.levels,3);eq(later.weakness,15);
   }else{eq(p.kind,'aural-shock');eq(p.levels,aural[name]);eq(p.weakness,aural[name]*5);eq(p.recoveryPending,true);}
  }else if(wear5.includes(name)||wear10.includes(name)){
   eq(p.kind,'weariness');eq(p.amount,as*(wear5.includes(name)?5:10));
  }else if(weak5.includes(name)){
   eq(p.kind,'weakness');eq(p.amount,as*5);eq(p.removal,name==='Healing'?'healing-routine':'mindsalve-routine');
  }else if(penalty.includes(name)){
   eq(p.kind,'exposure-penalty');eq(p.penalty,Math.round(as*2.5));eq(p.healingPeriod,'d6-days');eq(p.healingRate,5);
  }else if(none.includes(name))eq(p.kind,'none');
  else{eq(name,'Passion');eq(p.kind,'psyche-impulse');eq(p.psyche,Math.round(as/2));eq(p.gmTraitChoiceRequired,true);}
 }
}
for(const input of [{elixirName:'__proto__',baseAS:7},{elixirName:'Fake',baseAS:7},{elixirName:'Darkvision',baseAS:0},
 {elixirName:'Darkvision',baseAS:12},{elixirName:'Darkvision',baseAS:1.3},{elixirName:'Darkvision',baseAS:'7'},
 {elixirName:'Darkvision',baseAS:NaN},{elixirName:'Darkvision',baseAS:7,stage:'tomorrow'}])fail(()=>E.planAlchemyIllEffect(input),/Alchemy Ill Effects|Profusion/);
// v93.441 historical schemas must be exactly unchanged, including discriminators.
for(const name of ['Darkvision','Erudition','Footpad','Egosight']){
 const src={elixirName:name,asBefore:7,useId:'old-'+name},got=E.supportedAlchemyConcurrentIllEffect(src);
 eq(got.sourceUseId,src.useId);
 eq(got,name==='Darkvision'?{sourceUseId:src.useId,kind:'vision-light-penalty',baseAS:7,penalty:18}:
  {sourceUseId:src.useId,kind:'aural-shock',levels:1,weakness:5,
   ...(['Footpad','Egosight'].includes(name)?{sourceElixir:name}:{})});
}
fail(()=>E.supportedAlchemyConcurrentIllEffect({elixirName:'Healing',asBefore:7,useId:'a'}),/nelze/);
fail(()=>E.supportedAlchemyConcurrentIllEffect({elixirName:'Darkvision',asBefore:7}),/nelze/);
const snap=JSON.stringify(E.CANONICAL_ALCHEMY_ILL_EFFECTS);
for(let i=0;i<5;i++)E.planAlchemyIllEffect({elixirName:'Physic',baseAS:7});
eq(JSON.stringify(E.CANONICAL_ALCHEMY_ILL_EFFECTS),snap);
console.log('PASS Alchemy canonical Ill Effects 442:',count,'assertions');
