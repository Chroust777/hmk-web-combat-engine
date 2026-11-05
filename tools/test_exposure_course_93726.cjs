'use strict';
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
let ts;try {ts=require('typescript')}catch {ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const original=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)
 ? mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)
 : original(mod,file);
const M=require(path.join(root,'src/integration/hmk-weather-hazard-aftermath.js'));
const {initialCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
let passed=0;const yes=(v,m)=>{assert.ok(v,m);passed++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);passed++},no=(fn,re,m)=>{assert.throws(fn,re,m);passed++};
const actor={id:'a',name:'A',hmk:{attributes:{end:12,wil:12}}};
const seed=(kind,condition='dry',sl='F',source='source1')=>M.prepareTrekkingWeatherTest({state:initialCombatState(),sourceId:source,round:1,kind,coldCondition:condition,originalSL:sl,weatherHazardConfirmed:true,gmConfirmed:true}).state;
const start=(state,sourceId,elapsedMinutes,coolWater=false)=>M.startTrekkingWeatherExposureTreatment({state,sourceId,round:state.lastRound+1,elapsedMinutes,removedFromHazard:true,treatmentConfirmed:true,coolWater,gmConfirmed:true}).state;
const roll=(state,sourceId,elapsedMinutes,method='healing',r=40,coolWater=false)=>M.advanceTrekkingWeatherExposure({state,actor,sourceId,round:state.lastRound+1,elapsedMinutes,method,roll:r,removedFromHazard:true,treatmentConfirmed:true,coolWater,gmConfirmed:true}).state;
{
 const s=seed('cold','damp');eq(s.environmentalHazards[0].periodMinutes,240,'damp HR4 interval 240');
 const t=start(s,'source1',93);eq(t.environmentalHazards[0].healingIntervalMinutes,120,'warming 120 minutes');
 eq(t.environmentalHazards[0].treatmentStartElapsedMinutes,93,'warming origin physical minute');
 eq(s.environmentalHazards[0].treatmentStarted,false,'no input state mutation');
 no(()=>start(t,'source1',94),/již bylo zahájeno/,'no duplicate warming');
 no(()=>roll(t,'source1',212,'healing',40),/splatnému termínu/,'no premature healing');
 const u=roll(t,'source1',213);eq(u.environmentalHazards[0].lastActualElapsedMinutes,213,'first healing at physical minute 213');
 yes(u.events.some(e=>e.type==='skill-weather-course'&&e.details?.method==='healing'),'healing course evidence');
 no(()=>roll(u,'source1',213),/splatnému termínu|aktivní expozice/,'no replay at same minute');
 no(()=>M.advanceTrekkingWeatherExposure({state:t,actor,sourceId:'source1',round:3,elapsedMinutes:213,method:'advance',roll:30,gmConfirmed:true}),/Změna režimu/,'cannot call advance after warming started');
}
for(const [cool,period] of [[false,15],[true,5]]){
 const t=start(seed('heat'), 'source1',3,cool);eq(t.environmentalHazards[0].healingIntervalMinutes,period,`compress ${period} minutes`);
 const u=roll(t,'source1',3+period,'healing',40,cool);
 yes(u.events.some(e=>e.details?.sourceId==='source1'&&e.details?.healingIntervalMinutes===period),`compress ${period} evidence`);
 no(()=>roll(t,'source1',3+period,'healing',40,!cool),/Režim Compress/,'cannot spoof cooling checkbox');
}
{
 const a=seed('cold','dry');
 no(()=>start(a,'source1',0,true),/Chlazení vodou nelze/,'no cool water during cold warming');
 const one=start(a,'source1',10); const two=seed('heat','dry','F','src2');
 const mixed=M.prepareTrekkingWeatherTest({state:one,sourceId:'src3',round:3,kind:'cold',coldCondition:'damp',originalSL:'F',weatherHazardConfirmed:true,gmConfirmed:true}).state;
 yes(mixed.environmentalHazards.find(h=>h.sourceId==='source1')?.treatmentStarted,'concurrent new exposure does not reset warming');
 yes(mixed.environmentalHazards.find(h=>h.sourceId==='src3')?.active,'second exposure independently active');
 no(()=>M.startTrekkingWeatherExposureTreatment({state:one,sourceId:'source1',round:3,elapsedMinutes:11,removedFromHazard:false,treatmentConfirmed:true,gmConfirmed:true}),/již bylo zahájeno|vyjmutí/,'must not silently restart without GM evidence');
}
{
 const cold=seed('cold','dry');
 no(()=>M.advanceTrekkingWeatherExposure({state:cold,actor,sourceId:'source1',round:2,method:'advance',elapsedMinutes:90,roll:10,gmConfirmed:true}),/splatnému termínu/,'advance cannot roll before 240 minute due');
 const due=M.advanceTrekkingWeatherExposure({state:cold,actor,sourceId:'source1',round:2,method:'advance',elapsedMinutes:240,roll:50,gmConfirmed:true});
 eq(due.state.environmentalHazards[0].lastActualElapsedMinutes,240,'course actual 240 minute event');
}
console.log(`PASS ${passed} independent exposure reducer assertions`);
