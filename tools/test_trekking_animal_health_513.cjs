'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-trekking-party-modes.js');
const H=require('../src/integration/hmk-trekking-animal-health.js');
const E=require('../src/integration/hmk-calendar-expedition.js');
let n=0;
function eq(a,b){assert.deepEqual(a,b);n++}
function bad(fn,re){assert.throws(fn,re);n++}
const actor=(id,breed)=>({id,name:id,hmk:{verifiedMountedBreed:breed,attributes:{str:20,end:12},combatState:initialCombatState()}});
const human=(id)=>({id,name:id,hmk:{attributes:{str:12,end:10},combatState:initialCombatState()}});
const chars=[human('guide'),human('drover'),actor('mule-01','mule'),actor('pony-01','pony')];
const watch=(a=[{id:'mule-01',enc:20,droverId:'drover'}],conveyance='foot')=>P.trekPartyModes({
 memberIds:['guide','drover'],guideId:'guide',characters:chars,conveyance,drovingAnimals:a});
const mule=chars[2];
const wound=(id,loc,sev)=>({id,location:loc,severity:sev,level:sev==='G'?5:sev==='S'?3:1,
 aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false});
const fresh=watch();eq(fresh.animals[0].health.actorId,'mule-01');eq(fresh.animals[0].health.breed,'mule');eq(fresh.wearied,false);eq(fresh.injured,false);eq(fresh.loaded,true);eq(P.validateTrekPartySnapshot(fresh),true);
// No animal per-hour travel fatigue exists in HMK 150: no mutation at snapshot or human completion.
const baseState=JSON.stringify(mule.hmk.combatState),roll=E.expeditionWatchFatigue({mode:'double-drover',endurance:10,rolls:[1,1,1,1],animalExtraLoad:10});
eq(roll.accrual,10);eq(JSON.stringify(mule.hmk.combatState),baseState);
for(const fatigue of [0,5,19,20,39]){
 mule.hmk.combatState.fatigue.weariness=fatigue;
 const w=watch();eq(w.animals[0].health.fatigue,fatigue);eq(w.wearied,fatigue>=20);eq(w.forcedSlow,fatigue>=20?1:0);eq(P.validateTrekPartySnapshot(w),true);
 const serialized=JSON.parse(JSON.stringify(w));eq(P.validateTrekPartySnapshot(serialized),true);
}
mule.hmk.combatState.fatigue.weariness=40;
for(const mode of ['foot','mount','cart','wagon'])bad(()=>watch(undefined,mode),/Fatigue ≥ 40/);
mule.hmk.combatState.fatigue.weariness=0;
mule.hmk.combatState.wounds=[wound('hock','hlg','S')];
for(const mode of ['foot','mount','cart']){const w=watch(undefined,mode);eq(w.injured,true);eq(w.forcedSlow,1);eq(w.animals[0].health.seriousWounds[0].zone,'legs');eq(P.validateTrekPartySnapshot(w),true);}
// A healed wound or minor wound doesn't impose serious-injury party Slow.
mule.hmk.combatState.wounds=[wound('minor','hlg','M')];eq(watch().injured,false);
mule.hmk.combatState.wounds[0].healed=true;eq(watch().injured,false);
mule.hmk.combatState.wounds=[wound('grievous','hd','G')];
for(const mode of ['foot','mount','cart','wagon'])bad(()=>watch(undefined,mode),/Grievous/);
mule.hmk.combatState.wounds=[wound('bad','th','S')];bad(()=>watch(),/neznámou zvířecí lokaci/);
mule.hmk.combatState.wounds=[];
for(const shock of ['STN','INC','UNC','KIA']){
 mule.hmk.combatState.shock=shock;
 if(shock!=='KIA') {mule.hmk.combatState.shockOriginRound=1;
 mule.hmk.combatState.shockFollowup={kind:shock,originRound:1,dueRound:shock==='UNC'?121:2,phase:shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:null};}
 if(shock==='KIA') {mule.hmk.combatState.shockFollowup=null;mule.hmk.combatState.shockOriginRound=1;}
 bad(()=>watch(),/Shock/);
}
mule.hmk.combatState=initialCombatState();
const two=watch([{id:'mule-01',enc:25,droverId:'guide'},{id:'pony-01',enc:19,droverId:'drover'}]);
eq(two.animals.length,2);eq(P.validateTrekPartySnapshot(two),true);
const altered=structuredClone(two);altered.animals[0].health.fatigue=40;bad(()=>P.validateTrekPartySnapshot(altered),/Naložení|zvířat/);
const falseSerious=structuredClone(two);falseSerious.animals[0].health.injured=true;bad(()=>P.validateTrekPartySnapshot(falseSerious),/zdravotní|zvířat/);
const erased=structuredClone(two);delete erased.animals[0].health;eq(P.validateTrekPartySnapshot(erased),true); // Historic free-text proof remains valid.
// A free-text animal WITHOUT a registered entity stays load evidence only.
const freeText=watch([{id:'nonregistered',enc:39,droverId:'drover'}]);eq(freeText.animals[0].health,undefined);eq(freeText.injured,false);
// ID collision with human actor or crew membership cannot fabricate an animal.
bad(()=>watch([{id:'guide',enc:20,droverId:'drover'}]),/zvíře|Zvíře/);
const accidental=actor('mule-01','mule');accidental.hmk.combatState=undefined;
const saved=chars[2];chars[2]=accidental;bad(()=>watch(),/Combat State/);chars[2]=saved;
// No mutable independent health store: canonical Combat State changes only on actual committed medical outcomes.
eq(Object.keys(two.animals[0].health).includes('wounds'),false);
console.log(`PASS ${n} animal health: canonical verified mount, injury zones, 20/40 fatigue, shock, legacy, multi-animal, snapshot tampering, no invented accrual`);
