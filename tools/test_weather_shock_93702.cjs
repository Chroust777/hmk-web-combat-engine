'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'hmk-web-combat-engine-main');const old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState,applyConfirmedShockRecovery,shockFollowupReadiness}=require(root+'/src/integration/persistent-combat-state.js');
const {prepareTrekkingWeatherTest}=require(root+'/src/integration/hmk-weather-hazard-aftermath.js');
const {prepareExposureSkinInjuries,prepareColdWaterShock}=require(root+'/src/integration/hmk-weather-trauma-completion.js');
const {campaignCalendarAgenda,createCampaignCalendar}=require(root+'/src/integration/hmk-campaign-calendar.js');
const {medicalWounds,medicalOriginOfWound,medicalWeatherShockDue}=require(root+'/src/integration/hmk-medical-origin.js');
const actor={id:'c1',name:'Ověřená testovací postava',hmk:{attributes:{end:14,will:14},skills:[{name:'Shock',ml:70}]}};
let tested=0;
const affirm=(v,msg)=>{assert.ok(v,msg);tested++};
for(const roll of [20,40,63,75,84,91,96,100]){
 try{
  const s=prepareTrekkingWeatherTest({state:initialCombatState(),sourceId:'source-cold-'+roll,round:1,kind:'cold',originalSL:'CF',coldCondition:'dry',gmConfirmed:true,weatherHazardConfirmed:true}).state;
  const r=prepareExposureSkinInjuries({actor,state:s,inventory:[],sourceId:'source-cold-'+roll,round:2,originMinute:720,windD20:4,durationD20:14,rows:[{location:'ft',side:'left',av:0,skinD10:null,shockD100:roll,compoundD10:null}],gmConfirmed:true,allLocationsReviewed:true});
  console.log('Roll',roll,'=>',r.state.shock,'wound',r.state.wounds[0].level,'followup',r.state.shockFollowup,'origin',medicalOriginOfWound(r.state.wounds[0],r.state.events));
  affirm(medicalWounds(r.state,'travel-weather').length===1,'weather wound was not classified');
  affirm(r.state.events.some(e=>e.type==='travel-weather-injury'),'weather event must not be combat confirmed-hit');
  if(['STN','INC','UNC'].includes(r.state.shock)){
   const q=r.state.shockFollowup;affirm(q?.domain==='travel-weather'&&q.originMinute===720,'shock original time');
   const clock=createCampaignCalendar({day:1,hour:12,minute:0,label:'Test',eventId:'begin',gmConfirmed:true,campaignId:'camp',characterIds:['c1']});
   const ag=campaignCalendarAgenda(clock,[{...actor,hmk:{...actor.hmk,combatState:r.state}}],[]);
   affirm(ag.all.some(x=>x.kind==='weather-shock'&&x.characterId==='c1'),'calendar must schedule medical shock');
   affirm(!ag.unknown.some(x=>x.kind==='shock-followup'),'no combat shock legacy blocker');
   const timing=medicalWeatherShockDue(r.state,720);affirm(!!timing,'weather shock time');
   const due=shockFollowupReadiness({state:r.state,round:r.state.lastRound,characterId:'c1',actorId:'c1',turnEnded:true,elapsedMinutesSinceOriginal:0});
   if(q.kind!=='UNC')affirm(due.due,'GM-controlled next action should be available without Combat round');
   if(q.kind!=='UNC'){
    const sl='S';
    try{const healed=applyConfirmedShockRecovery({state:r.state,round:r.state.lastRound,eventId:'shock-test:'+roll,sl,timingConfirmed:true,characterId:'c1',actorId:'c1',turnEnded:true,elapsedMinutesSinceOriginal:0,shockML:null,roll:null});
    affirm(healed.state.events.at(-1).details.domain==='travel-weather','weather-specific shock receipt');
    console.log('Recovery',healed.state.shock);
    }catch(e){console.log('Recovery check failed',e.message);throw e;}
   }
  }
 }catch(e){console.error('ERROR at roll '+roll,e.stack);process.exit(1)}
}
console.log('PASS',tested,'assertions');
for(const [condition,roll,expected] of [['coolWater',100,'STN'],['coldWater',100,'INC'],['freezingWater',100,'UNC']]){
 const id='immersion-'+condition,one=prepareColdWaterShock({actor,state:initialCombatState(),sourceId:id,round:1,condition,d6s:[3,4,5],enduranceD100:roll,originMinute:720,gmConfirmed:true});
 console.log('COLD-WATER',condition,one.report.sl,one.state.shock);
 affirm(one.state.shock===expected,`Cold Water must generate ${expected}`);
 affirm(one.state.shockFollowup?.domain==='travel-weather','domain must be travel-weather');
 const calendar=createCampaignCalendar({day:1,hour:12,minute:0,label:'Test',eventId:'begin-'+condition,gmConfirmed:true,campaignId:'camp',characterIds:['c1']});
 const agenda=campaignCalendarAgenda(calendar,[{...actor,hmk:{...actor.hmk,combatState:one.state}}],[]);
 console.log('AGENDA',agenda.all.filter(x=>x.kind==='weather-shock'), 'UNKNOWN',agenda.unknown);
 affirm(agenda.all.some(x=>x.kind==='weather-shock'&&x.characterId==='c1'),'calendar must report weather shock');
 affirm(!agenda.unknown.some(x=>x.kind==='shock-followup'),'weather shock must not be combat mystery');
 const due=shockFollowupReadiness({state:one.state,round:1,characterId:'c1',actorId:'c1',turnEnded:true,elapsedMinutesSinceOriginal:expected==='UNC'?10:0});
 affirm(due.due,'calendar must release Shock when proper GM evidence exists');
 const end=applyConfirmedShockRecovery({state:one.state,round:1,eventId:id+'-recovery',sl:'S',timingConfirmed:true,characterId:'c1',actorId:'c1',turnEnded:true,elapsedMinutesSinceOriginal:expected==='UNC'?10:0,shockML:70,roll:1});
 console.log('RECOVERED',expected,'->',end.state.shock,end.state.shockFollowup);
 affirm(end.state.events.at(-1).details.domain==='travel-weather','shock recovery event origin kept');
 affirm(end.state.shockFollowup===null||end.state.shockFollowup.domain==='travel-weather','subsequent Shock origin must not revert to Combat');
}
console.log('PASS TOTAL',tested,'assertions');
