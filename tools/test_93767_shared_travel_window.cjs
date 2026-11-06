'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(path.resolve(__dirname,'../src/integration/hmk-shared-travel-window-93767.js'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('module','exports',js)(m,m.exports);
const {openSharedTravelWindow93767:open,addSharedTravelGroup93767:addGroup,
 addSharedTravelActivity93767:addActivity,sharedTravelWindowBudget93767:budget,
 setSharedTravelActivityProof93767:proof,validateSharedTravelWindow93767:check,
 finalizeSharedTravelWindow93767:finish}=m.exports;
let checks=0;function ok(fn){fn();checks++;}function eq(a,b){ok(()=>assert.deepStrictEqual(a,b));}function throws(fn,regex){ok(()=>assert.throws(fn,regex));}
let w=open({campaignId:'camp',windowId:'window',startMinute:480,requestedMinutes:60,maxAllowedMinutes:40,limitMinute:520});
eq(w.minutes,40);eq(w.endMinute,520);eq(w.shortened,true);eq(w.requestedMinutes,60);
throws(()=>open({campaignId:'camp',windowId:'window',startMinute:480,requestedMinutes:60,maxAllowedMinutes:0}),/splatná/);
throws(()=>open({campaignId:'camp',windowId:'window',startMinute:480,requestedMinutes:60,maxAllowedMinutes:40,limitMinute:510}),/termín/);
throws(()=>open({campaignId:'camp',windowId:'window',startMinute:480,requestedMinutes:0,maxAllowedMinutes:40}),/1–10/);
w=addGroup(w,{groupId:'group-a',name:'Průvodce',memberIds:['pc-a','pc-b']});
w=addGroup(w,{groupId:'group-b',name:'Průzkumník',memberIds:['pc-c']});
w=addGroup(w,{groupId:'group-c',name:'Jiné činnosti',memberIds:['pc-d']});
eq(w.groups.length,3);
throws(()=>addGroup(w,{groupId:'group-x',memberIds:['pc-b']}),/jiné/);
throws(()=>addGroup(w,{groupId:'group-x',memberIds:[]}),/jednu/);
throws(()=>addGroup(w,{groupId:'group-a',memberIds:['pc-e']}),/existuje/);
throws(()=>addGroup(w,{groupId:'group-x',memberIds:['pc-e','pc-e']}),/duplicitní/);
w=addActivity(w,{groupId:'group-a',activityId:'walk-20',kind:'travel',minutes:20});
eq(budget(w,'group-a').remainingMinutes,20);eq(budget(w,'group-b').remainingMinutes,40);
w=addActivity(w,{groupId:'group-a',activityId:'forage-10',kind:'forage',minutes:10});
eq(budget(w,'group-a').nextMinute,510);eq(budget(w,'group-a').remainingMinutes,10);
w=addActivity(w,{groupId:'group-b',activityId:'walk-30',kind:'travel',minutes:30});
eq(budget(w,'group-b').remainingMinutes,10);
w=addActivity(w,{groupId:'group-c',activityId:'rest-40',kind:'rest',minutes:40});
eq(budget(w,'group-c').remainingMinutes,0);
throws(()=>addActivity(w,{groupId:'group-c',activityId:'over',kind:'travel',minutes:1}),/přesáhla/);
throws(()=>addActivity(w,{groupId:'group-b',activityId:'bad',kind:'combat',minutes:5}),/Neznámá/);
throws(()=>addActivity(w,{groupId:'group-b',activityId:'walk-20',kind:'travel',minutes:5}),/duplicitní/);
throws(()=>finish(w,{gmConfirmed:true,clockEventId:'clock'}),/doklad/);
throws(()=>proof(w,{activityId:'walk-20',proofId:'pr1',sourceStartMinute:480,sourceEndMinute:505,participantIds:['pc-a','pc-b']}),/časové/);
throws(()=>proof(w,{activityId:'walk-20',proofId:'pr1',sourceStartMinute:480,sourceEndMinute:500,participantIds:['pc-a']}),/účastníkům/);
w=proof(w,{activityId:'walk-20',proofId:'pr1',sourceStartMinute:480,sourceEndMinute:500,participantIds:['pc-b','pc-a']});
throws(()=>proof(w,{activityId:'walk-20',proofId:'replacement',sourceStartMinute:480,sourceEndMinute:500,participantIds:['pc-b','pc-a']}),/přepsán/);
throws(()=>proof(w,{activityId:'walk-30',proofId:'pr1',sourceStartMinute:480,sourceEndMinute:510,participantIds:['pc-c']}),/patří/);
w=proof(w,{activityId:'forage-10',proofId:'pr2',sourceStartMinute:500,sourceEndMinute:510,participantIds:['pc-a','pc-b']});
w=proof(w,{activityId:'walk-30',proofId:'pr3',sourceStartMinute:480,sourceEndMinute:510,participantIds:['pc-c']});
w=proof(w,{activityId:'rest-40',proofId:'pr4',sourceStartMinute:480,sourceEndMinute:520,participantIds:['pc-d']});
eq(check(w,{requireProofs:true}),true);
throws(()=>finish(w,{gmConfirmed:false,clockEventId:'clock'}),/GM/);
const completed=finish(w,{gmConfirmed:true,clockEventId:'clock'});
eq(completed.episodeIds,['pr1','pr2','pr3','pr4']);eq(completed.endMinute,520);eq(completed.clockEventId,'clock');
const mutated=structuredClone(w);mutated.groups[0].activities[1].startMinute=480;
throws(()=>check(mutated),/Časová/);
const mutable=structuredClone(w);mutable.groups[1].memberIds=['pc-b'];throws(()=>check(mutable),/Duplicitní/);
let v=open({campaignId:'x',windowId:'w',startMinute:100,requestedMinutes:60,maxAllowedMinutes:60});
v=addGroup(v,{groupId:'a',memberIds:['a']});v=addGroup(v,{groupId:'b',memberIds:['b']});
v=addActivity(v,{groupId:'a',activityId:'v1',kind:'travel',minutes:20,vehicleKey:'wagon'});
throws(()=>addActivity(v,{groupId:'b',activityId:'v2',kind:'travel',minutes:20,vehicleKey:'wagon'}),/vůz/);
v=addActivity(v,{groupId:'b',activityId:'r',kind:'rest',minutes:20});
v=addActivity(v,{groupId:'b',activityId:'v2',kind:'travel',minutes:20,vehicleKey:'wagon'});
eq(check(v),true);eq(v.groups[1].activities[1].startMinute,120);
// Animal evidence belongs to the original group, never inferred or silently dropped.
let animal=open({campaignId:'a',windowId:'w',startMinute:0,requestedMinutes:30,maxAllowedMinutes:30});
animal=addGroup(animal,{groupId:'ga',memberIds:['driver'],animalIds:['horse']});
animal=addActivity(animal,{groupId:'ga',activityId:'pull',kind:'travel',minutes:30});
throws(()=>proof(animal,{activityId:'pull',proofId:'p',sourceStartMinute:0,sourceEndMinute:30,participantIds:['driver']}),/zvířatům/);
animal=proof(animal,{activityId:'pull',proofId:'p',sourceStartMinute:0,sourceEndMinute:30,participantIds:['driver'],animalIds:['horse']});
eq(check(animal,{requireProofs:true}),true);
// Every valid pair in a 60-minute window: A duration 1..60, B can spend remainder;
// no real die is generated by this pure calculator.
for(let n=1;n<=60;n++){
 let x=open({campaignId:'x',windowId:'z',startMinute:100,requestedMinutes:60,maxAllowedMinutes:60});
 x=addGroup(x,{groupId:'g',memberIds:['pc']});x=addActivity(x,{groupId:'g',activityId:'a',kind:'travel',minutes:n});
 eq(budget(x,'g').remainingMinutes,60-n);
 if(n<60){x=addActivity(x,{groupId:'g',activityId:'b',kind:'rest',minutes:60-n});eq(budget(x,'g').remainingMinutes,0);}
}
console.log('PASS',checks,'shared-time-window planning/health cap/group independence/receipt integrity checks');
