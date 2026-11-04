'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(process.argv[2]||path.resolve(__dirname,'..')),original=require.extensions['.js'];
require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):original(m,p);
const {initialCombatState,validateCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {prepareColdWaterShock,prepareExposureSkinInjuries}=require(path.join(root,'src/integration/hmk-weather-trauma-completion.js'));
const {prepareTrekkingWeatherTest}=require(path.join(root,'src/integration/hmk-weather-hazard-aftermath.js'));
const {createCampaignCalendar,campaignCalendarAgenda}=require(path.join(root,'src/integration/hmk-campaign-calendar.js'));
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const actor={id:'a1',hmk:{attributes:{end:14},skills:[{name:'Shock',ml:70}]}};
function shock({shock,course=true}={}){const s=initialCombatState();s.shock=shock;
 if(course){s.shockFollowup={kind:shock,originRound:1,dueRound:shock==='UNC'?121:2,phase:shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:null,domain:'travel-weather',sourceId:'previous-shock',originMinute:600};s.shockOriginRound=1;}
 validateCombatState(s);return s;}
function cold(state,sourceId,condition='coolWater',roll=100){return prepareColdWaterShock({state,actor,sourceId,round:2,condition,d6s:[3,4,5],enduranceD100:roll,originMinute:720,gmConfirmed:true});}
// HMK p169: new STN on existing STN escalates to INC; less severe incoming
// state on INC/UNC retains the higher state and its original Course.
for(const [prior,condition,expected] of [['STN','coolWater','INC'],['INC','coolWater','INC'],['UNC','coolWater','UNC']]){
 const src=shock({shock:prior});const snapshot=structuredClone(src);const r=cold(src,'new-'+prior,condition);
 eq(src,snapshot);eq(r.state.shock,expected);
 if(prior==='STN'){eq(r.report.supersededFollowup,snapshot.shockFollowup);eq(r.state.shockFollowup.kind,'INC');}
 else eq(r.state.shockFollowup,snapshot.shockFollowup);
 eq(r.report.previousShock,prior);yes(r.state.events.some(e=>e.id==='skill-cold-shock:new-'+prior));
 validateCombatState(r.state);
}
// HMK p169: new INC on existing INC escalates to UNC, with an explicit
// superseded next-turn reroll and the new ten-minute due time.
const incToUnc=cold(shock({shock:'INC'}),'inc-repeat','coldWater',95);
eq(incToUnc.report.shock,'INC');eq(incToUnc.state.shock,'UNC');
eq(incToUnc.state.shockFollowup.phase,'after-ten-minutes');
eq(incToUnc.report.supersededFollowup.sourceId,'previous-shock');
// A stronger new state replaces only the native next-turn reroll, while
// retaining the superseded obligation's exact provenance in the new event.
const prevStn=shock({shock:'STN'}),oldQ=structuredClone(prevStn.shockFollowup);
const promoted=cold(prevStn,'strong','freezingWater',100);
eq(promoted.state.shock,'UNC');eq(promoted.state.shockFollowup.sourceId,'strong');
eq(promoted.report.supersededFollowup,oldQ);
yes(promoted.state.events.some(e=>e.details?.report?.supersededFollowup?.sourceId==='previous-shock'));
// An ongoing four-hour Extended Shock is NOT the same kind of native reroll.
const ext=initialCombatState();ext.shock='INC';ext.extendedShock={originState:'INC',hr:5,elapsedHours:0};ext.shockOriginRound=1;
validateCombatState(ext);
bad(()=>cold(ext,'must-preserve-coma','freezingWater',100),/Silnější nový Cold Shock/);
// No existing Course: a more severe immersion Shock remains timed and is registered.
const sc=shock({shock:'STN',course:false});const r=cold(sc,'strong-unopposed','freezingWater',100);
eq(r.state.shock,'UNC');eq(r.state.shockFollowup?.domain,'travel-weather');eq(r.state.shockFollowup?.sourceId,'strong-unopposed');
// A fully covered exposure is a real completed health procedure even with
// existing trauma/shock: no extraneous Shock test is required.
for(const prior of ['STN','UNC']){
 const s=prepareTrekkingWeatherTest({state:shock({shock:prior}),sourceId:'skin-'+prior,round:2,kind:'cold',originalSL:'CF',coldCondition:'dry',gmConfirmed:true,weatherHazardConfirmed:true}).state;
 const done=prepareExposureSkinInjuries({state:s,actor,inventory:[],sourceId:'skin-'+prior,round:3,originMinute:720,windD20:4,durationD20:14,rows:[],allLocationsReviewed:true,gmConfirmed:true});
 eq(done.report.wounds.length,0);eq(done.state.shock,prior);eq(done.state.shockFollowup,s.shockFollowup);
 yes(done.state.environmentalHazards.find(x=>x.sourceId==='skin-'+prior).skinResolved);validateCombatState(done.state);
}
// Actual Frostbite wound, not just covered skin: run the original shared
// Injury/Carryover executor while a different weather Shock remains pending.
for(const prior of ['STN','INC','UNC']){
 const first=shock({shock:prior});
 const hazardous=prepareTrekkingWeatherTest({state:first,sourceId:'frost-real-'+prior,round:2,kind:'cold',originalSL:'CF',coldCondition:'dry',gmConfirmed:true,weatherHazardConfirmed:true}).state;
 let out=null,accepted=0;
 for(const d100 of [1,20,40,75,90,100]){
  try{
   out=prepareExposureSkinInjuries({actor:{...actor,hmk:{...actor.hmk,skills:[{name:'Shock',ml:70}]}},state:hazardous,
    inventory:[],sourceId:'frost-real-'+prior,round:3,originMinute:720,windD20:4,durationD20:14,
    rows:[{location:'ft',side:'left',av:0,skinD10:null,shockD100:d100,compoundD10:null}],allLocationsReviewed:true,gmConfirmed:true});
   accepted++;validateCombatState(out.state);
   eq(out.report.wounds.length,1);yes(out.state.events.some(x=>x.type==='travel-weather-injury'));
   if(out.state.shockFollowup)eq(out.state.shockFollowup.domain,'travel-weather');
  }catch(err){if(!/Extended Shock|původní Course|Coma/.test(err.message))throw err;}
 }
 yes(accepted>0);
}
// Confirmed duplicate physical immersion evidence remains forbidden.
bad(()=>cold(r.state,'strong-unopposed','freezingWater',100),/už byl vyhodnocen/);
console.log('PASS '+n+' Cold Water/covered Frostbite concurrency assertions (Extended Shock/Coma source-keyed recovery still open)');
