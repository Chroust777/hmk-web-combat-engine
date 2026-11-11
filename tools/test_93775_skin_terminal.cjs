'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(root+path.sep+'src'+path.sep)?
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):old(mod,file);
const {initialCombatState,applyConfirmedShockRecovery,shockFollowupReadiness,applyExtendedShockCourse,applyComaCourse}=require(root+'/src/integration/persistent-combat-state.js');
const {prepareTrekkingWeatherTest}=require(root+'/src/integration/hmk-weather-hazard-aftermath.js');
const {prepareExposureSkinInjuries,prepareColdWaterShock}=require(root+'/src/integration/hmk-weather-trauma-completion.js');
const {createCampaignCalendar,campaignCalendarAgenda,advanceCampaignCalendar}=require(root+'/src/integration/hmk-campaign-calendar.js');
let checks=0;const ok=(condition,msg)=>{assert.ok(condition,msg);checks++};
const actor={id:'actor-kia',name:'Frostbite Patient',hmk:{attributes:{end:14,wil:14,will:14},skills:[{name:'Shock',ml:70}]}};
const one=(sourceId,rows,options={})=>{
 const s=prepareTrekkingWeatherTest({state:initialCombatState(),sourceId,round:1,
  kind:'cold',originalSL:'CF',coldCondition:'dry',weatherHazardConfirmed:true,gmConfirmed:true}).state;
 return prepareExposureSkinInjuries({actor,state:s,inventory:[],sourceId,round:2,
  originMinute:720,windD20:4,durationD20:20,maximumExposureMinutes:240,rows,
  gmConfirmed:true,allLocationsReviewed:true,...options});
};
const skull={location:'sk',side:null,av:0,shockD100:100};
const face={location:'fa',side:null,av:0,shockD100:100};
const fatal=one('audit-fatal-two',[skull,face]);
ok(fatal.state.shock==='KIA','fatal shock persists');
ok(fatal.state.wounds.length===1,'no fictitious post-mortem wound');
ok(fatal.report.reviewedLocations===2,'every exposed location audited');
ok(fatal.report.wounds.length===1&&fatal.report.wounds[0].location==='sk','first valid wound preserved');
ok(fatal.report.skippedAfterKIA.length===1&&fatal.report.skippedAfterKIA[0].location==='fa','next exposed location kept in evidence');
ok(fatal.report.skippedAfterKIA[0].shockD100===100&&fatal.report.skippedAfterKIA[0].il===4,'witnessed dice retained');
ok(fatal.report.terminalShock==='KIA','explicit fatal outcome');
ok(fatal.state.events.filter(x=>x.type==='skill-weather-skin-complete').length===1,'atomic incident completes once');
ok(fatal.state.environmentalHazards[0].skinPending===null&&fatal.state.environmentalHazards[0].skinResolved,'no duplicate unresolved review');
const single=one('audit-fatal-single',[skull]);
ok(single.state.shock==='KIA'&&single.report.skippedAfterKIA.length===0,'single fatal site regression');
const survivor=one('audit-survive',[{...skull,shockD100:1},{...face,shockD100:1}]);
ok(survivor.state.wounds.length===2&&survivor.report.skippedAfterKIA.length===0,'two successful locations retain two wounds');
for(const [name,rows] of [
 ['missing-postKIA-d100',[skull,{...face,shockD100:null}]],
 ['invalid-postKIA-d100',[skull,{...face,shockD100:101}]],
 ['falsified-postKIA-AV',[skull,{...face,av:3}]],
 ['duplicate-postKIA-site',[skull,skull]],
 ['bad-postKIA-side',[skull,{...face,side:'left'}]],
 ['invented-postKIA-compound',[skull,{...face,compoundD10:5}]],
 ]){
 assert.throws(()=>one('reject-'+name,rows),undefined,'invalid evidence must reject: '+name);checks++;
}
const withDeath={...actor,hmk:{...actor.hmk,healthState:fatal.state}};
const c=createCampaignCalendar({day:1,hour:12,minute:0,label:'KIA',eventId:'begin-fatal',campaignId:'audit-fatal',gmConfirmed:true,characterIds:[actor.id]});
const agenda=campaignCalendarAgenda(c,[withDeath],[]);
ok(agenda.due.every(e=>e.characterId!==actor.id)&&agenda.future.every(e=>e.characterId!==actor.id),'dead actor not given fictitious recovery tasks');
const cold=prepareColdWaterShock({actor,state:initialCombatState(),sourceId:'audit-cold-water-unc',round:1,
 condition:'freezingWater',d6s:[3,4,5],enduranceD100:100,originMinute:720,gmConfirmed:true});
ok(cold.state.shock==='UNC'&&cold.state.shockFollowup?.domain==='travel-weather','cold water UNC has real non-combat origin');
const cunc=createCampaignCalendar({day:1,hour:12,minute:0,label:'UNC',eventId:'begin-unc',campaignId:'audit-unc',gmConfirmed:true,characterIds:[actor.id]});
const injured={...actor,hmk:{...actor.hmk,healthState:cold.state}};
const au=campaignCalendarAgenda(cunc,[injured],[]);
ok(au.future.some(e=>e.kind==='weather-shock'&&e.minute===730),'UNC has precise 10 minute reroll');
assert.throws(()=>advanceCampaignCalendar(cunc,{deltaMinutes:11,eventId:'invalid-skip',reason:'test',gmConfirmed:true,characters:[injured],journal:[],inventory:[]}),/Nelze přeskočit/);checks++;
const timing=shockFollowupReadiness({state:cold.state,round:1,characterId:actor.id,actorId:actor.id,turnEnded:true,elapsedMinutesSinceOriginal:10});
ok(timing.due,'UNC becomes eligible at 10 minutes');
const recovered=applyConfirmedShockRecovery({state:cold.state,round:1,eventId:'unc-real-recovery',sl:'S',timingConfirmed:true,
 characterId:actor.id,actorId:actor.id,turnEnded:true,elapsedMinutesSinceOriginal:10,shockML:70,roll:1});
ok(recovered.state.shock==='STN'&&recovered.state.shockFollowup?.domain==='travel-weather','UNC recovers only to STN; no Combat coupling');
// Separate executor-level negative branch: UNC + CF opens two independent
// medical courses. Neither elapsed-hour nor elapsed-day evidence is fabricated.
const cf=applyConfirmedShockRecovery({state:cold.state,round:1,eventId:'unc-critical-reroll',sl:'CF',
 timingConfirmed:true,characterId:actor.id,actorId:actor.id,turnEnded:true,
 elapsedMinutesSinceOriginal:10,shockML:70,roll:100,
 comaLocationShock:5,comaInjuryLevel:4,initialComaD10:2});
ok(cf.state.shock==='UNC'&&cf.state.extendedShock?.hr===4,'UNC CF must open Extended Shock HR4');
ok(cf.state.coma?.active===true&&cf.state.coma.hr===3&&cf.state.coma.nextCourseDays===2,'UNC CF initial Coma d10 evidenced');
ok(cf.state.extendedShock.domain==='travel-weather'&&cf.state.coma.domain==='travel-weather','both parallel course origins remain non-combat');
assert.throws(()=>applyExtendedShockCourse({state:cf.state,round:1,eventId:'too-early-course',healingBase:14,roll:5,elapsedHoursSinceOnset:3,gmConfirmed:true}),/Course Roll/);checks++;
const hour4=applyExtendedShockCourse({state:cf.state,round:1,eventId:'after-4-hours',healingBase:14,roll:5,elapsedHoursSinceOnset:4,gmConfirmed:true});
ok(hour4.state.shock==='UNC'&&hour4.state.coma?.active,'Extended Shock resolution must not silently delete Coma');
assert.throws(()=>applyComaCourse({state:hour4.state,round:1,eventId:'too-early-coma',healingBase:14,roll:5,periodD10:1,daysElapsed:1,gmConfirmed:true}),/předchozí d10denní/);checks++;
const day2=applyComaCourse({state:hour4.state,round:1,eventId:'coma-day2',healingBase:14,roll:5,periodD10:1,daysElapsed:2,gmConfirmed:true});
ok(day2.state.coma?.active&&day2.state.coma.nextCourseDays===1,'Coma persists with a separate GM rolled future d10');
const day3=applyComaCourse({state:day2.state,round:1,eventId:'coma-day3',healingBase:14,roll:5,daysElapsed:1,periodD10:null,gmConfirmed:true});
ok(day3.state.coma===null&&day3.state.shock==='NONE','Coma ends only after its own successful course');
console.log('PASS '+checks+' assertions: fatal multi-location, strict invalid inputs, UNC/CF Extended Shock and independent Coma');
