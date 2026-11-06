'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||path.resolve(__dirname,'..'));
const old=require.extensions['.js'];require.extensions['.js']=(m,file)=>file.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):old(m,file);
const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar,validateCampaignCalendar,assertCampaignCalendarAppendOnly}=require(path.join(root,'src/integration/hmk-campaign-calendar.js'));
const {initialCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {removeCalendarSafely,validateCalendarEvidenceArchives}=require(path.join(root,'src/integration/hmk-calendar-campaign-lifecycle.js'));
const {startConcurrentProcedure,finishConcurrentProcedure,openConcurrentProcedures}=require(path.join(root,'src/integration/hmk-concurrent-procedures.js'));
let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++};const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const throws=(f,pattern)=>{assert.throws(f,pattern);checks++};
const c=(id)=>({id,name:id,hmk:{healthState:(()=>{const s=initialCombatState();s.wounds.push({id:'w:'+id,location:'fo',severity:'S',level:3,aspect:'e',bleeding:false,nextAdvanceRound:null,healed:false});return s})()}});
const chars=['Pepa','Michal','Karel','Jana'].map(c);
function initial(){let clock=createCampaignCalendar({day:1,hour:9,minute:20,label:'test',eventId:'init',campaignId:'c',gmConfirmed:true,characterIds:chars.map(c=>c.id)});for(const ch of chars)clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:ch.id,woundId:'w:'+ch.id,eventId:'anchor-'+ch.id,gmConfirmed:true});return clock}
function step(clock,name){const minute=clock.minute;return startConcurrentProcedure(clock,{id:'start-'+name,procedure:{formId:'hmk-treatment-form',characterId:name,woundId:'w:'+name,healerId:'doctor-'+name,startMinute:minute,endMinute:minute+5,eventId:'medical-'+name,confirmed:true,args:{physicianRoll:25}}})}
function permute(arr){if(!arr.length)return [[]];return arr.flatMap((x,i)=>permute(arr.filter((_,j)=>j!==i)).map(rest=>[x,...rest]))}
let permutations=0;
for(const order of permute(chars.map(c=>c.id))){
 let clock=initial();
 for(const ch of order)clock=step(clock,ch);
 eq(openConcurrentProcedures(clock).map(x=>x.characterId).sort(),chars.map(c=>c.id).sort());
 eq(campaignCalendarAgenda(clock,chars).all.filter(x=>x.kind==='treatment').length,0);
 eq(campaignCalendarAgenda(clock,chars).all.filter(x=>x.kind==='concurrent-treatment').length,4);
 const previous=clock;
 clock=advanceCampaignCalendar(clock,{deltaMinutes:5,eventId:'advance',reason:'Doložené ošetření paralelně',gmConfirmed:true,characters:chars});
 eq(clock.minute,565);ok(assertCampaignCalendarAppendOnly({campaignClock:previous},{campaignClock:clock}));
 for(const ch of order.slice().reverse()){
  const p=openConcurrentProcedures(clock).find(p=>p.characterId===ch);ok(p&&p.endMinute===565);
  const before=clock;clock=finishConcurrentProcedure(clock,{id:'finish-'+ch,startId:p.startId,resultEventId:p.eventId});
  ok(assertCampaignCalendarAppendOnly({campaignClock:before},{campaignClock:clock}));
 }
 eq(openConcurrentProcedures(clock).length,0);
 throws(()=>finishConcurrentProcedure(clock,{id:'duplicate',startId:'start-'+order[0],resultEventId:'medical-'+order[0]}),/Zákrok lze/);
 permutations++;
}
let clock=step(initial(),'Pepa');
throws(()=>step(clock,'Pepa'),/Rána už má|duplicitní zápis/);
throws(()=>finishConcurrentProcedure(clock,{id:'early',startId:'start-Pepa',resultEventId:'medical-Pepa'}),/Zákrok lze/);
throws(()=>advanceCampaignCalendar(clock,{deltaMinutes:6,eventId:'skip',reason:'Přeskočení konce',gmConfirmed:true,characters:chars}),/Nelze přeskočit povinný termín/);
const busy={formId:'hmk-treatment-form',characterId:'Michal',woundId:'w:Michal',healerId:'doctor-Pepa',startMinute:clock.minute,endMinute:clock.minute+5,eventId:'medical-busy',confirmed:true,args:{physicianRoll:45}};
throws(()=>startConcurrentProcedure(clock,{id:'busy',procedure:busy}),/léčitel již/);
throws(()=>startConcurrentProcedure(clock,{id:'duplicate-outcome',procedure:{...busy,healerId:'different-healer',eventId:'medical-Pepa'}}),/vlastní původní identitu/);
const again=structuredClone(clock);again.concurrentProcedures[0].procedure.args.physicianRoll=99;
throws(()=>assertCampaignCalendarAppendOnly({campaignClock:clock},{campaignClock:again}),/nelze přepisovat/);
// Two unrelated obligations in one minute must never prevent a safe START.
let mixed=initial();let s=chars[0].hmk.healthState;s.environmentalHazards=[];
// Calendar's due Treatment at 09:20 does not block another patient's start.
mixed=step(mixed,'Pepa');ok(openConcurrentProcedures(mixed).length===1);
ok(campaignCalendarAgenda(mixed,chars).due.some(x=>x.characterId==='Michal'&&x.kind==='treatment'));
const db={campaignClock:clock,characters:chars,inventory:[],journal:[],calendarEvidenceArchives:[]};
const archive=removeCalendarSafely(db,'archive-concurrency');
eq(archive.campaignClock,undefined);
eq(archive.calendarEvidenceArchives[0].concurrentProcedures,clock.concurrentProcedures);
ok(validateCalendarEvidenceArchives(archive.calendarEvidenceArchives));
ok(assertCampaignCalendarAppendOnly(db,archive));
const falsified=structuredClone(archive);falsified.calendarEvidenceArchives[0].concurrentProcedures=[];
throws(()=>assertCampaignCalendarAppendOnly(db,falsified),/souběžných výkonů/);
console.log(`PASS: ${checks} assertions, ${permutations} permutations of 4 simultaneous starts and completions; append-only/reload-contract, no duplicate, deadline protection`);
