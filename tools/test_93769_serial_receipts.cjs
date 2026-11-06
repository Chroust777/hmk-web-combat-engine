'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const p=path.join(__dirname,'../src/integration/hmk-shared-serial-receipts-93769.js');
const source=fs.readFileSync(p,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);const {captureSharedActivityDelta93769:capture,replaySharedActivityDelta93769:replay,verifySharedActivityQueue93769:verify}=mod.exports;
let count=0;function eq(a,b){assert.deepStrictEqual(a,b);count++}function fail(f,expected){assert.throws(f,expected);count++}
const base={campaignClock:{minute:480,events:[{id:'init'}]},characters:[{id:'a',fatigue:0},{id:'b',fatigue:0}],inventory:[{id:'item-a',characterId:'a',condition:'new'}],journal:[],settings:{abc:1}};
let tmp=structuredClone(base);tmp.characters[0].fatigue=4;tmp.journal.push({id:'proof1',calendarTimeEpisode:{startMinute:480,endMinute:500}});
let a=capture(base,tmp,{activityId:'proof1',groupId:'g',startMinute:480,endMinute:500});eq(a.characters.length,1);
let next=structuredClone(tmp);next.characters[0].fatigue=6;next.journal.push({id:'proof2',calendarTimeEpisode:{startMinute:500,endMinute:510}});
let b=capture(tmp,next,{activityId:'proof2',groupId:'g',startMinute:500,endMinute:510});
eq(verify(base,[{sourceId:'proof1',patch:a},{sourceId:'proof2',patch:b}]),next);
const clone=JSON.parse(JSON.stringify([a,b]));eq(verify(base,[{sourceId:'proof1',patch:clone[0]},{sourceId:'proof2',patch:clone[1]}]),next);
fail(()=>verify(base,[{sourceId:'proof2',patch:b},{sourceId:'proof1',patch:a}]),/Zastaralý/);
fail(()=>verify(base,[{sourceId:'proof1',patch:a},{sourceId:'proof1',patch:a}]),/Duplicitní/);
fail(()=>verify(base,[{sourceId:'proof1',patch:a},{sourceId:'proof2',patch:b},{sourceId:'proof2',patch:b}]),/Duplicitní/);
let edited=structuredClone(base);edited.characters[0].fatigue=100;fail(()=>verify(edited,[{sourceId:'proof1',patch:a}]),/Zastaralý/);
let cpy=structuredClone(base);replay(cpy,a);eq(cpy.characters[0].fatigue,4);
fail(()=>replay(cpy,a),/Zastaralý|Duplicitní/);
let future=structuredClone(base);future.campaignClock.minute=500;
fail(()=>capture(base,future,{activityId:'no',groupId:'g',startMinute:480,endMinute:500}),/kalendář/);
let inventory=structuredClone(base);inventory.inventory[0].condition='used';inventory.journal=[{id:'inv',calendarTimeEpisode:{startMinute:480,endMinute:485}}];
let inv=capture(base,inventory,{activityId:'inv',groupId:'g2',startMinute:480,endMinute:485});eq(verify(base,[{sourceId:'inv',patch:inv}]),inventory);
let deleted=structuredClone(base);deleted.inventory=[];deleted.journal=[{id:'del',calendarTimeEpisode:{startMinute:480,endMinute:485}}];
let rem=capture(base,deleted,{activityId:'del',groupId:'g2',startMinute:480,endMinute:485});eq(verify(base,[{sourceId:'del',patch:rem}]),deleted);
let bad=structuredClone(base);bad.settings.abc=2;bad.journal=[{id:'bad',calendarTimeEpisode:{startMinute:480,endMinute:485}}];fail(()=>capture(base,bad,{activityId:'bad',groupId:'g',startMinute:480,endMinute:485}),/vedlejší/);
let overwritten=structuredClone(tmp);overwritten.journal[0].id='proof1';overwritten.journal[0].title='changed';fail(()=>capture(tmp,overwritten,{activityId:'xxx',groupId:'g',startMinute:500,endMinute:520}),/historické/);
for(let m=0;m<40;m++){
 const x=structuredClone(base);x.characters[0].fatigue=m;x.journal=[{id:'x'+m,calendarTimeEpisode:{startMinute:480,endMinute:481}}];
 const patch=capture(base,x,{activityId:'x'+m,groupId:'g'+m,startMinute:480,endMinute:481});eq(verify(base,[{sourceId:'x'+m,patch}]),x);
}
console.log('PASS',count,'serial delta, idempotency rejection, stale state, journal, inventory, later anchor, JSON reload');
