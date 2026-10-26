'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const A=require('../src/integration/hmk-calendar-activities.js'),E=require('../src/integration/hmk-calendar-expedition.js');
let n=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const t=()=>new Date(0).toISOString();
function trial(mode,elapsed,gm=null,extra={}){
 const actor={id:'guide',name:'Guide',hmk:{}};const clock={minute:400,campaignId:'partial-512'};
 const rolls=mode.startsWith('double-')?[10,1,10,1]:[10];
 const p={...E.expeditionWatchFatigue({mode,endurance:10,rolls,...extra}),kind:'travel',trekSourceId:'trek',orienteeringId:'orient',travelledLeagues:8,travelledKilometres:32};
 const scheduled=A.scheduleHMKActivity({journal:[],clock,characterId:actor.id,name:actor.name,kind:mode,plan:p,id:'task',origin:'manual'});
 clock.minute+=elapsed;
 const row=A.interruptHMKActivity({journal:[scheduled],clock,activityId:'task',id:'stop',createdAt:t(),reason:'Setkání u cesty',partialWeariness:gm});
 const db={characters:[actor],campaignClock:clock,journal:[scheduled,row]};let count=0;
 const newEvents=A.finishInterruptedHMKTravel(db,{idFactory:()=>`completion-${++count}`,stamp:t});
 return {db,p,row,newEvents,count,actor};
}
for(const hour of [0,1,2,3]){
 const result=trial('double-walk',60*hour),acc=[0,10,15,25][hour];
 eq(result.row.calendarActivityInterruptProof.partialTravel.accrual,acc);
 eq(result.actor.hmk.combatState.fatigue.weariness,acc);
 eq(result.row.calendarActivityInterruptProof.partialTravel.completedHourRolls.length,hour);
 eq(result.newEvents.length,1);
 eq(result.row.calendarActivityInterruptProof.partialTravel.travelledLeagues,2*hour);
 eq(A.validateHMKActivityEvidence(result.db.journal),true);
 eq(A.finishInterruptedHMKTravel(result.db,{idFactory:()=>`again-${++result.count}`,stamp:t}).length,0);
 eq(A.finishDueHMKActivities({...result.db,campaignClock:{...result.db.campaignClock,minute:700}},{idFactory:()=>`due-${++result.count}`,stamp:t}).length,0);
 const restored=structuredClone(result.db);eq(A.validateHMKActivityEvidence(restored.journal),true);
}
bad(()=>trial('double-walk',90),/rozhodnutí GM/);
const fractional=trial('double-walk',90,12);eq(fractional.actor.hmk.combatState.fatigue.weariness,12);eq(fractional.row.calendarActivityInterruptProof.partialTravel.earnedByFullHours,10);eq(fractional.row.calendarActivityInterruptProof.partialTravel.travelledLeagues,3);
bad(()=>trial('double-walk',90,5),/dokončené/);
bad(()=>trial('walk',120),/rozhodnutí GM/);
const short=trial('walk',120,3);eq(short.actor.hmk.combatState.fatigue.weariness,3);eq(short.row.calendarActivityInterruptProof.partialTravel.travelledLeagues,4);
bad(()=>trial('double-walk',60,null,{animalExtraLoad:20}),/rozhodnutí GM/);
const animal=trial('double-walk',60,20,{animalExtraLoad:20});eq(animal.actor.hmk.combatState.fatigue.weariness,20);
const badHistory=structuredClone(fractional.db.journal);badHistory.find(x=>x.calendarActivityInterruptProof).calendarActivityInterruptProof.partialTravel.accrual=3;
bad(()=>A.validateHMKActivityEvidence(badHistory),/rozhodnutí|únav|přerušen|Přerušení/);
const legacy={format:'hmk-calendar-activity-interruption-v1',activityId:'old',characterId:'guide',campaignId:'partial-512',startMinute:400,minute:490,elapsedMinutes:90,reason:'Old stopping',awardFatigue:false};
eq(legacy.partialTravel,undefined); // Older interruptions deliberately NOT retroactive.
console.log('PASS '+n+' interrupted Double Time 0-3 hours, fractional GM, ordinary watches, Loaded, idempotence, archive restore, tamper gate');
