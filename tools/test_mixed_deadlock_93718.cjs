'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||path.resolve(__dirname,'..'));const original=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):original(m,f);
const {initialCombatState}=require(root+'/src/integration/persistent-combat-state.js');
const {prepareTrekkingWeatherTest}=require(root+'/src/integration/hmk-weather-hazard-aftermath.js');
const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar}=require(root+'/src/integration/hmk-campaign-calendar.js');
const {startConcurrentProcedure,openConcurrentProcedures}=require(root+'/src/integration/hmk-concurrent-procedures.js');
let tests=0;
for(const order of [['medical','cold'],['cold','medical']]){
 const p={id:'Pepa',name:'Pepa',hmk:{healthState:initialCombatState()}},m={id:'Michal',name:'Michal',hmk:{healthState:initialCombatState()}};
 p.hmk.healthState.wounds.push({id:'w',location:'fo',severity:'M',level:1,aspect:'frost',bleeding:false,nextAdvanceRound:null,healed:false});
 const cold=(s,sourceId,round)=>prepareTrekkingWeatherTest({state:s,sourceId,round,kind:'cold',coldCondition:'damp',originalSL:'F',weatherHazardConfirmed:true,gmConfirmed:true}).state;
 m.hmk.healthState=cold(m.hmk.healthState,'old-cold',1);
 let cl=createCampaignCalendar({day:1,hour:9,minute:20,campaignId:'same-minute',eventId:'begin',characterIds:['Pepa','Michal'],gmConfirmed:true});
 cl=anchorCampaignOrigin(cl,{kind:'wound',characterId:'Pepa',woundId:'w',eventId:'anchor',gmConfirmed:true});
 cl=anchorCampaignOrigin(cl,{kind:'weather',characterId:'Michal',episodeId:'skill-weather:old-cold:cold',eventId:'old-anchor',gmConfirmed:true});
 for(const step of order){
  if(step==='medical')cl=startConcurrentProcedure(cl,{id:'start-p',procedure:{formId:'hmk-treatment-form',characterId:'Pepa',woundId:'w',healerId:'Pepa',startMinute:cl.minute,endMinute:cl.minute+120,eventId:'med-p',confirmed:true,args:{physicianRoll:20}}});
  else {m.hmk.healthState=cold(m.hmk.healthState,'new-cold',2);cl=anchorCampaignOrigin(cl,{kind:'weather',characterId:'Michal',episodeId:'skill-weather:new-cold:cold',eventId:'new-anchor',gmConfirmed:true});}
  tests++;
 }
 assert.equal(m.hmk.healthState.environmentalHazards.filter(x=>x.active).length,2);tests++;
 assert.equal(m.hmk.healthState.fatigue.otherWeakness,20);tests++;
 assert.equal(openConcurrentProcedures(cl).length,1);tests++;
 const agenda=campaignCalendarAgenda(cl,[p,m]);assert(!agenda.due.some(x=>x.kind==='treatment'&&x.characterId==='Pepa'));tests++;
 cl=advanceCampaignCalendar(cl,{deltaMinutes:120,eventId:'advance',reason:'Doba ošetření',characters:[p,m],gmConfirmed:true});
 assert.equal(cl.minute,680);tests++;
}
console.log('PASS '+tests+' assertions: Pepa Treatment start + Michal second Cold F on existing damp HR4, both orders, and 120-min safe advance');
