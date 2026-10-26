'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-trekking-party-modes.js'), E=require('../src/integration/hmk-calendar-expedition.js');
const O=require('../src/integration/hmk-trekking-orienteering.js');
const R=require('../src/integration/hmk-trekking-readiness.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const characters=['guide','handler'].map(id=>({id,name:id,hmk:{combatState:initialCombatState(),attributes:{str:12,end:10}}}));
const group=enc=>P.trekPartyModes({memberIds:['guide','handler'],guideId:'guide',characters,conveyance:'mount',drovingAnimals:[{id:'mule',enc,droverId:'handler'}]});
for(const enc of [0,19,20,21,39,40,59,60]){
 const p=group(enc);eq(p.loaded,enc>=20);eq(p.animals[0].loaded,enc>=20);eq(P.validateTrekPartySnapshot(p),true);
 const surcharge=Math.floor(enc/20)*10;
 const result=E.expeditionWatchFatigue({mode:'ride',endurance:10,rolls:[10],animalExtraLoad:surcharge});
 eq(result.animalExtraLoad,surcharge);eq(result.accrual,5+surcharge);
}
const many=P.trekPartyModes({memberIds:['guide','handler'],guideId:'guide',characters,conveyance:'wagon',drovingAnimals:[{id:'mule1',enc:20,droverId:'handler'},{id:'mule2',enc:39,droverId:'handler'}]});
eq(many.loaded,true);eq(many.animals.length,2);eq(P.validateTrekPartySnapshot(many),true);
bad(()=>group(-1),/zvíře|ENC/);const tampered=structuredClone(group(20));tampered.animals[0].enc=19;bad(()=>P.validateTrekPartySnapshot(tampered),/zvířat/);
bad(()=>P.trekPartyModes({memberIds:['guide','handler'],guideId:'guide',characters,conveyance:'mount',drovingAnimals:[{id:'x',enc:20,droverId:'stranger'}]}),/honáka/);
bad(()=>P.trekPartyModes({memberIds:['guide','handler'],guideId:'guide',characters,conveyance:'mount',drovingAnimals:[{id:'x',enc:20,droverId:'handler'},{id:'x',enc:20,droverId:'guide'}]}),/jedinečné/);
const footWithAnimal=O.createOrienteeringContext({partySize:2,conveyance:'foot',droverId:'handler',animalsPresent:true});
bad(()=>O.adjustedOrienteeringSV({baseSV:5,context:footWithAnimal}),/Drover Test/);
const certified=O.adjustedOrienteeringSV({baseSV:5,context:footWithAnimal,droverResult:{level:'F'}});
eq(certified.droverPenalty,-1);eq(certified.adjustedSV,4);
const walk=E.expeditionWatchFatigue({mode:'double-walk',endurance:10,rolls:[10,10,10,10]});
const drover=E.expeditionWatchFatigue({mode:'double-drover',endurance:10,rolls:[10,10,10,10],animalExtraLoad:20});
eq(walk.accrual,40);eq(drover.accrual,40);eq(drover.rolls[0].tn,5); // no rider/driver +2 on a foot drover
bad(()=>E.expeditionWatchFatigue({mode:'walk',endurance:10,rolls:[10],animalExtraLoad:-10}),/příplatek/);
console.log('PASS '+n+' loaded animal threshold, multiple handlers, ENC 20-step surcharge, mount/foot drover skill, Double Time END TN');
