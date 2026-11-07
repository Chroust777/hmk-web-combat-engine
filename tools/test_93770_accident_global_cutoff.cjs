'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const file=path.join(__dirname,'../src/integration/hmk-shared-time-window-93767.js');
const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',src)(mod,mod.exports);
const {startSharedTimeWindow93767:start,addSharedTimeGroup93767:add,confirmSharedTimeWindow93767:confirm,validateSharedTimeWindowJournal93767:validate}=mod.exports;
let n=0;
function expect(label,fn){assert.doesNotThrow(fn,label);n++;}
function reject(label,fn,pattern){assert.throws(fn,pattern,label);n++;}
function fixture({windowMinutes,restMinutes,accidentPending=true,accidentMinute=488,extraEvents=[]}){
 let w=start({campaignId:'c',windowId:'w',startMinute:480,minutes:windowMinutes});
 w=add(w,{groupId:'ga',kind:'travel',memberIds:['a'],startMinute:480,minutes:8});
 w=add(w,{groupId:'gb',kind:'rest',memberIds:['b'],startMinute:480,minutes:restMinutes});
 const record=confirm(w,{episodeIds:['travel','rest'],clockEventId:'adv',gmConfirmed:true});
 const t={kind:'travel',sharedWindowId:'w',sharedGroupId:'ga',startMinute:480,endMinute:488,minutes:8,memberIds:['a'],animals:[],settings:{stableAnimalIds:[]},hazardDetails:[{hazard:'accident',externalMedicalPending:accidentPending,hazardAtMinute:8,hazardD10:5}]};
 const r={kind:'rest',sharedWindowId:'w',sharedGroupId:'gb',startMinute:480,endMinute:480+restMinutes,minutes:restMinutes,memberIds:['b'],animals:[],settings:{stableAnimalIds:[]},hazardDetails:[]};
 const journal=[{id:'travel',calendarCampaignId:'c',campaignMinute:480,calendarTimeEpisode:t},{id:'rest',calendarCampaignId:'c',campaignMinute:480,calendarTimeEpisode:r},{id:'proof',calendarCampaignId:'c',campaignMinute:480,calendarTimeWindow:record}];
 const clock={campaignId:'c',events:[{id:'adv',type:'advance',minute:480+windowMinutes},...extraEvents]};
 return {journal,clock};
}
{
 const x=fixture({windowMinutes:8,restMinutes:8});
 expect('Accident at exact end of shared window is accepted',()=>assert.equal(validate(x.journal,x.clock),true));
}
{
 const x=fixture({windowMinutes:30,restMinutes:30});
 reject('An unresolved injury at 08:08 prohibits the other group advancing to 08:30',()=>validate(x.journal,x.clock),/Nehoda před koncem/);
}
{
 const x=fixture({windowMinutes:30,restMinutes:30,accidentPending:false});
 expect('No unresolved accident does not impose a false cutoff',()=>assert.equal(validate(x.journal,x.clock),true));
}
{
 const x=fixture({windowMinutes:8,restMinutes:8});x.clock.events.push({id:'adv',type:'advance',minute:488});
 reject('Double calendar advancement proof rejected',()=>validate(x.journal,x.clock),/jediný/);
}
{
 const x=fixture({windowMinutes:8,restMinutes:8});x.journal[1].calendarTimeEpisode.endMinute=510;
 reject('An activity can never extend beyond the window',()=>validate(x.journal,x.clock),/neodpovídají|přesahuje|Činnost/);
}
{
 const x=fixture({windowMinutes:8,restMinutes:8});x.journal[0].calendarTimeEpisode.hazardDetails[0].externalMedicalPending=true;
 x.journal[0].calendarTimeEpisode.endMinute=487;x.journal[0].calendarTimeEpisode.minutes=7;
 reject('Tampered earlier accident minute cannot move the clock',()=>validate(x.journal,x.clock),/Nehoda před koncem/);
}
console.log('PASS',n,'global accident cutoff, historical receipt, no double clock, no false positives');
