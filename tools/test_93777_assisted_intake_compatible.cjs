'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const old=require.extensions['.js'];require.extensions['.js']=function(m,f){if(!f.startsWith(path.join(root,'src')+path.sep))return old(m,f);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f)};
const N=require('../src/integration/hmk-nutrition-days.js');
const E=require('../src/integration/hmk-episode-timed-medical.js');
const A=require('../src/integration/hmk-nutrition-assisted-intake.js');
const CAL=require('../src/integration/hmk-campaign-calendar.js');
let checks=0,serial=0;
const id=()=>`test-${++serial}`,stamp=()=>`2026-11-07T00:00:00.000Z`;
function make(shock,{gmProvisioned=true,coma=false,clock=1440}={}){
 const actor={id:'a',name:'Patient',hmk:{healthState:{shock,coma:{active:coma}}}};
 const p=N.createNutritionPolicy({campaignId:'camp',minute:0,actorId:'a',gmProvisioned,autoNeeds:true,enabled:true,foragingOnly:!gmProvisioned});
 const journal=[{id:id(),characterId:'a',calendarCampaignId:'camp',campaignMinute:0,calendarNutritionPolicy:p}];
 const campaignClock=CAL.createCampaignCalendar({day:1,hour:0,minute:0,label:'Test',eventId:id(),gmConfirmed:true,campaignId:'camp',characterIds:['a']});
 if(clock) { campaignClock.minute=clock;campaignClock.events.push({id:id(),type:'advance',minute:clock,reason:'Testovací posun hodin'});}
 return {characters:[actor],inventory:[],journal,campaignClock};
}
for(const state of [{shock:'UNC'}, {shock:'INC'}, {shock:'NONE',coma:true}]){
 const db=make(state.shock,{coma:state.coma||false});
 const before=db.journal.length;
 assert.equal(A.needsAssistedIntake(db.characters[0]),true);checks++;
 const done=N.finishDueNutritionDays(db,{idFactory:id,stamp});
 assert.equal(done.length,1);checks++;
 assert.deepEqual([done[0].calendarNutritionDay.foodReceived,done[0].calendarNutritionDay.waterReceived],[1,1]);checks++;
 assert.equal(done[0].calendarNutritionDay.assistedIntakeId,undefined);checks++;
 assert.equal(db.journal.length,before+1);checks++;
 assert.equal(N.validateNutritionJournal(db.journal),true);checks++;
 assert.equal(db.journal.some(r=>r.calendarNutritionAssistedIntake),false);checks++;
 assert.equal(N.finishDueNutritionDays(db,{idFactory:id,stamp}).length,0);checks++;
}
// GM did not declare supplies: no additional assisted feeding prompt, but existing supply/malnutrition policy still applies.
const empty=make('UNC',{gmProvisioned:false});
const dry=N.finishDueNutritionDays(empty,{idFactory:id,stamp});
assert.equal(dry.length,1);checks++;assert.deepEqual([dry[0].calendarNutritionDay.foodReceived,dry[0].calendarNutritionDay.waterReceived],[0,0]);checks++;
assert.equal(N.validateNutritionJournal(empty.journal),true);checks++;
// Even in a multi-day travel episode no assisted-intake requirement is synthesized.
for(const status of ['UNC','INC']){
 const db=make(status,{gmProvisioned:true,clock:0});
 const preview=E.episodeTimedMedicalPreview(db,{endMinute:1440,idFactory:id,stamp});
 assert.equal(preview.requirements.some(r=>r.kind==='assisted-intake'),false);checks++;
 assert.equal(preview.generatedJournal.some(r=>r.calendarNutritionAssistedIntake),false);checks++;
 assert.equal(preview.generatedJournal.some(r=>r.calendarNutritionDay),true);checks++;
}
const source=fs.readFileSync(path.join(root,'app.js'),'utf8'),bundle=fs.readFileSync(path.join(root,'hmk-app.bundle.js'),'utf8');
assert.equal(source.includes('data-provision-assisted-intake'),false);checks++;
assert.equal(bundle.includes('data-provision-assisted-intake'),false);checks++;
assert.ok(source.includes("APP_VERSION='93.777'")&&bundle.includes("APP_VERSION = '93.777'"));checks++;
console.log('PASS',checks,'assisted feeding removed / no prompts / daily closure / old nutrition intact / bundle parity');
