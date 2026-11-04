'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||'/mnt/data/hmk_dev_93719');const old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):old(m,p);
const {initialCombatState,validateCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {prepareSleeplessDay,prepareSleeplessNight,prepareSleeplessFourHourRest}=require(path.join(root,'src/integration/hmk-sleep-deprivation.js'));
const actor={id:'sleep-A',hmk:{attributes:{end:12},arcane:{psycheTraumas:[]}}};let n=0;
function eq(a,b){assert.equal(a,b);n++}function valid(s){assert.ok(validateCombatState(s));n++}
for(const amount of [0,7,20,200]){
 for(const rest of ['sleep','four-hour']){
  let s=prepareSleeplessDay({actor,state:initialCombatState(),episodeId:'night-001',hoursAwake:24,enduranceD10:1,gmConfirmed:true}).state;
  const own=s.sleepDeprivation.activeWeariness;s.fatigue.weariness+=amount;
  s=rest==='sleep'?prepareSleeplessNight({actor,state:s,episodeId:'night-001',sleepHours:8,gmConfirmed:true}).state:
   prepareSleeplessFourHourRest({actor,state:s,episodeId:'night-001',startMinute:100,endMinute:340,gmConfirmed:true}).state;
  const recovered=rest==='sleep'?Math.min(own,15):Math.min(own,5);
  eq(s.fatigue.weariness,amount+own-recovered);
  eq(s.sleepDeprivation.activeWeariness,own-recovered);
  eq(s.events.filter(e=>e.type.endsWith(rest==='sleep'?'sleep':'rest')).length,1);
  valid(s);
  const input=rest==='sleep'?{actor,state:s,episodeId:'night-001',sleepHours:8,gmConfirmed:true}:
   {actor,state:s,episodeId:'night-001',startMinute:100,endMinute:340,gmConfirmed:true};
  assert.throws(()=>rest==='sleep'?prepareSleeplessNight(input):prepareSleeplessFourHourRest(input));n++;
 }
}
console.log('PASS '+n+' sleep/rest concurrent-source assertions');
