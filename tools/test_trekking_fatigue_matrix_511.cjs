'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const E=require('../src/integration/hmk-calendar-expedition.js'),A=require('../src/integration/hmk-calendar-activities.js');
let n=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++},yes=(x,m)=>{assert.ok(x,m);n++},bad=(cb,re)=>{assert.throws(cb,re);n++};
// Exhaust all END success patterns for four separately witnessed Double Time hours.
for(const mode of ['walk','ride','drive','double-walk','double-drover']){
 const doubled=mode.startsWith('double-'),count=doubled?4:1,base=doubled?(mode==='double-drover'?5:10):5;
 for(const end of [2,6,10,18])for(const pattern of Array.from({length:2**count},(_,i)=>i)){
  const tn=Math.floor(end/2)+(['ride','drive'].includes(mode)?2:0);
  // Force success/failure by using roll 1 or 10, unless TN>=10.
  const rolls=Array.from({length:count},(_,i)=>(pattern>>i)&1?1:10);
  for(const weather of [0,5,10]){
   const out=E.expeditionWatchFatigue({mode,endurance:end,rolls,weatherExtra:weather});
   const expected=rolls.reduce((sum,die)=>sum+Math.max(0,base-(die<=tn?5:0)),weather);
   eq(out.accrual,expected,mode+' END='+end+' rolls='+rolls+' weather='+weather);
   eq(out.rolls.length,count);for(let i=0;i<count;i++){eq(out.rolls[i].tn,tn);eq(out.rolls[i].success,rolls[i]<=tn)}
  }
 }
}
// Loaded is a single surcharge per four-hour watch, even in Double Time.
for(const enc of [10,19,20,22,29,30,40,99])for(const mode of ['walk','double-walk']){
 for(const dice of [1,10]){
  const rolls=mode==='walk'?[dice]:[dice,dice,dice,dice];
  const out=E.expeditionWatchFatigue({mode,endurance:10,rolls,ignoreLoaded:true,modifiedENC:enc});
  const expectedBase=rolls.reduce((sum,roll)=>sum+(mode==='walk'?5:10)-(roll<=5?5:0),0);
  eq(out.extraLoad,Math.floor(enc/10)*10);
  eq(out.accrual,expectedBase+Math.floor(enc/10)*10);
 }
}
for(const badMode of ['ride','drive','double-drover'])bad(()=>E.expeditionWatchFatigue({mode:badMode,endurance:10,rolls:badMode.startsWith('double-')?[10,10,10,10]:[10],ignoreLoaded:true,modifiedENC:20}),/pěší/);
bad(()=>E.expeditionWatchFatigue({mode:'double-walk',endurance:10,rolls:[10,10,10,10],ignoreLoaded:true,modifiedENC:9}),/ENC alespoň 10/);
bad(()=>E.expeditionWatchFatigue({mode:'walk',endurance:10,rolls:[10],ignoreLoaded:false,modifiedENC:20}),/Bez ignorovaného/);
bad(()=>E.expeditionWatchFatigue({mode:'double-walk',endurance:10,rolls:[10]}),/Počet hodů/);
for(const mode of ['walk','double-walk']){
 const count=mode==='walk'?1:4,rolls=Array(count).fill(4),submitted=E.expeditionDiceSubmission({kind:mode,rawValues:rolls.map(String),generated:{kind:mode,rolls}});
 eq(submitted.origin,'cryptographic-software-die');eq(submitted.rolls,rolls);
 const manual=E.expeditionDiceSubmission({kind:mode,rawValues:rolls.map((v,i)=>i===0?'5':String(v)),generated:{kind:mode,rolls}});
 eq(manual.origin,'manual');bad(()=>E.expeditionDiceSubmission({kind:mode,rawValues:['0',...rolls.slice(1)]}),/platný/);
}
// Time and Combat State: only commit at actual due minute, one roll = one linked proof.
const state=E.expeditionCombatState({id:'example',hmk:{}});eq(state.fatigue.weariness,0);
const actor={id:'walker',name:'Walker',hmk:{}};
const clock={campaignId:'t511',minute:400};let serial=0;
const plan={...E.expeditionWatchFatigue({mode:'double-walk',endurance:10,rolls:[10,1,10,1],ignoreLoaded:true,modifiedENC:20}),kind:'travel'};
const schedule=A.scheduleHMKActivity({journal:[],clock,characterId:actor.id,name:actor.name,kind:'double-walk',plan,id:'activity-511',origin:'manual'});
const db={campaignClock:{...clock,minute:639},characters:[actor],journal:[schedule]};
let done=A.finishDueHMKActivities(db,{idFactory:()=>`completed-${++serial}`,stamp:()=>new Date(0).toISOString()});eq(done.length,0);eq(actor.hmk?.combatState?.fatigue?.weariness,undefined);
db.campaignClock.minute=640;done=A.finishDueHMKActivities(db,{idFactory:()=>`completed-${++serial}`,stamp:()=>new Date(0).toISOString()});eq(done.length,1);eq(actor.hmk.combatState.fatigue.weariness,plan.accrual);eq(done[0].calendarExpeditionProof.activityId,'activity-511');
db.campaignClock.minute=700;done=A.finishDueHMKActivities(db,{idFactory:()=>`completed-${++serial}`,stamp:()=>new Date(0).toISOString()});eq(done.length,0);eq(serial,1);yes(A.validateHMKActivityEvidence(db.journal));
console.log('PASS '+n+' Trekking Fatigue matrix: 5 modes, 4 END attributes, hourly masks, weather, loaded ENC, provenance, atomic calendar completion');
