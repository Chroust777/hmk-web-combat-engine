'use strict';
// Standalone regression; do not ship in production patch.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'hmk-web-combat-engine-main');
const original=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)
 ? mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)
 : original(mod,file);
const {episodeWeatherExposure:we,episodeWeatherFatigueUnits:fatigue}=require(path.join(root,'src/integration/hmk-episode-travel-detail.js'));
const {prepareTrekkingWeatherTest:onset}=require(path.join(root,'src/integration/hmk-weather-hazard-aftermath.js'));
const {initialCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
let pass=0;function eq(a,b,why){assert.deepEqual(a,b,why);pass++}function yes(v,why){assert.ok(v,why);pass++}function bad(fn,re,why){assert.throws(fn,re,why);pass++}
// Cold: AV4 cap, real protection and FS, d6 vs continuous sleet d10.
eq(we({kind:'cold',areaAV:12,roll:null}).tn,4,'Cold AV cap');
eq(we({kind:'cold',areaAV:2,protection:2,fireStrength:1,roll:5}).exposed,false,'Cold protection + FS');
eq(we({kind:'cold',areaAV:0,roll:6}).exposed,true,'Cold exposure');
eq(we({kind:'cold',areaAV:0,continuousSleet:true,roll:null}).faces,10,'Sleet d10 without roll');
eq(we({kind:'cold',areaAV:0,continuousSleet:true,roll:10}).exposed,true,'Sleet d10 max');
bad(()=>we({kind:'cold',areaAV:0,roll:7}),/velikosti kostky/,'No d7 on d6');
// Heat: resting, shade, native climate, source-accurate dice, AV1 floor.
for(const [resting,shade,tropicalNative,expected] of [
 [false,false,false,4],[true,false,false,6],[true,true,false,10],
 [false,false,true,6],[true,false,true,8],[true,true,true,12]
])eq(we({kind:'heat',areaAV:0,roll:null,resting,shade,tropicalNative}).faces,expected,'Heat dice setting');
eq(we({kind:'heat',areaAV:0,roll:1}).tn,1,'Heat AV floor');
eq(we({kind:'heat',areaAV:1,roll:1}).exposed,true,'Heat low roll causes hazard');
eq(we({kind:'heat',areaAV:1,roll:4}).exposed,false,'Heat high roll avoids hazard');
bad(()=>we({kind:'heat',areaAV:1,roll:5}),/velikosti kostky/,'No d5 on d4');
// Four independent actor state engines: weather onset for mixed levels, no cross-writes.
const mixed=[['Mik','cold','CS'],['Nora','cold','S'],['Elin','cold','F'],['Vera','cold','CF']];
const reports=[];
for(const [id,kind,sl] of mixed){
 const seed=initialCombatState();const old=structuredClone(seed);
 const changed=onset({state:seed,sourceId:'weather-'+id,round:1,kind,originalSL:sl,
  weatherHazardConfirmed:true,gmConfirmed:true});
 reports.push(changed);eq(seed,old,'onset is immutable');
 eq(changed.report.hr,sl==='F'||sl==='CF'?5:null,'Correct health consequence');
 eq(changed.report.skinPending,sl==='CF'?'frostbite':null,'Only Cold CF requires Frostbite');
 yes(changed.state.environmentalHazards.every(e=>e.sourceId==='weather-'+id),'per-actor unique evidence');
}
for(const [kind,sl,w,hr,skin] of [
 ['heat','CS',5,null,null],['heat','S',10,null,null],['heat','F',0,5,null],['heat','CF',0,4,'sunburn']
]){const r=onset({state:initialCombatState(),sourceId:'source-'+kind+sl,round:1,kind,originalSL:sl,
 weatherHazardConfirmed:true,gmConfirmed:true});eq(r.report.addedWeariness,w,'Heat fatigue');eq(r.report.hr,hr,'Heat HR');eq(r.report.skinPending,skin,'Heat skin');}
// A time-additive carrier for non-discrete fatigue; the original discrete
// Hazard and Skill Test are intentionally *not* repeated in the split runs.
const weather={format:'hmk-trekking-weather-day-v1',daylightHazard:'cold',nightHazard:null};
const ex=[{id:'Mik',kind:'cold',effect:'fatigue-5'},{id:'Nora',kind:'cold',effect:'fatigue-10'}];
const one=fatigue({weather,exposure:ex,minutes:240,dayMinutes:240,nightMinutes:0});
const parts=[...Array(4)].map(()=>fatigue({weather,exposure:ex,minutes:60,dayMinutes:60,nightMinutes:0}));
for(const id of ['Mik','Nora'])eq(one[id],parts.reduce((a,r)=>a+r[id],0),'Minute carry is additive');
console.log('PASS '+pass+' assertions: v93.702 Weather rules, 1-4 independent actor state, 6 Heat dice modes, minute carry');
