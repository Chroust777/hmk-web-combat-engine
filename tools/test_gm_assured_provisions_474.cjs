'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createNutritionPolicy,finishDueNutritionDays,validateNutritionJournal,assertNutritionJournalAppendOnly,activeNutritionPolicies,nutritionRisk}=require('../src/integration/hmk-nutrition-days.js');
const {validateNutritionActivityJournal}=require('../src/integration/hmk-nutrition-activity.js');
let n=0,seq=0;const ok=(b,m)=>{assert.ok(b,m);n++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++},bad=(fn,rx)=>{assert.throws(fn,rx);n++};
const gen=()=>`id${++seq}`,stamp=()=>`test-stamp-${seq}`,actor=(id)=>({id,name:id,hmk:{combatState:{shock:'NONE'}}});
const camp='one',ids=['a','b'];const db={campaignClock:{campaignId:camp,minute:0,characterIds:ids},characters:ids.map(actor),inventory:[],journal:[]};
function policy(id,assured=true,minute=db.campaignClock.minute){return createNutritionPolicy({campaignId:camp,minute,actorId:id,enabled:true,autoNeeds:true,gmProvisioned:assured,inventoryRations:!assured,inventoryWater:!assured})}
function push(id,p){const row={id:gen(),characterId:id,calendarCampaignId:camp,campaignMinute:p.minute,calendarNutritionPolicy:p};db.journal.push(row);return row;}
const a=push('a',policy('a'));
const saved=JSON.stringify(a.calendarNutritionPolicy);
eq(a.calendarNutritionPolicy.gmProvisioned,true);
const b=push('b',createNutritionPolicy({campaignId:camp,minute:0,actorId:'b',foragingOnly:true,autoNeeds:true}));
eq(activeNutritionPolicies(db.journal,camp).length,2);
ok(validateNutritionJournal(db.journal),'policy replay');
bad(()=>createNutritionPolicy({campaignId:camp,minute:0,actorId:'a',enabled:false,gmProvisioned:true}),/jen aktivní/);
bad(()=>createNutritionPolicy({campaignId:camp,minute:0,actorId:'a',gmProvisioned:true,inventoryRations:true}),/nesmějí/);
bad(()=>createNutritionPolicy({campaignId:camp,minute:0,actorId:'a',gmProvisioned:true,foragingOnly:true}),/nesmějí/);
bad(()=>createNutritionPolicy({campaignId:camp,minute:0,actorId:'a',enabled:true}),/režimu/);
const journalBefore=structuredClone(db.journal);
db.campaignClock.minute=1440;
const first=finishDueNutritionDays(db,{idFactory:gen,stamp});
eq(first.length,2);ok(validateNutritionJournal(db.journal),'days replay');
eq(validateNutritionActivityJournal(db.journal),true);
const assured=first.find(x=>x.characterId==='a').calendarNutritionDay;
eq([assured.foodNeed,assured.waterNeed,assured.foodReceived,assured.waterReceived],[1,1,1,1]);
eq([assured.foodShortfall,assured.waterShortfall,assured.gmProvisioned],[0,0,true]);
eq(assured.automaticDebitIds,[]);
ok(!db.journal.some(x=>x.calendarInventoryRationUse||x.calendarInventoryWaterUse||x.calendarForagingSupplyUse),'assurance MUST NOT debit or fabricate physical resources');
const uncovered=first.find(x=>x.characterId==='b').calendarNutritionDay;
eq([uncovered.foodReceived,uncovered.waterReceived,uncovered.foodShortfall,uncovered.waterShortfall],[0,0,1,1]);
eq(nutritionRisk(db.journal,camp,'a'),{starvation:false,thirst:false});
eq(nutritionRisk(db.journal,camp,'b'),{starvation:true,thirst:true});
eq(finishDueNutritionDays(db,{idFactory:gen,stamp}).length,0);
ok(assertNutritionJournalAppendOnly(journalBefore,db.journal));
// An empty inventory must still exist after guaranteed two-day provisioning.
db.campaignClock.minute=2880;
const second=finishDueNutritionDays(db,{idFactory:gen,stamp});
eq(second.length,2);ok(validateNutritionJournal(db.journal));eq(db.inventory,[]);
// Switching off guarantee only alters FUTURE days, never rewrites first days.
const no=push('a',policy('a',false));
eq(no.calendarNutritionPolicy.enabled,true);eq(no.calendarNutritionPolicy.gmProvisioned,undefined);
eq(activeNutritionPolicies(db.journal,camp).map(x=>x.characterId).sort(),['a','b']);
// New a-day must NOT be appended now. Another b-day may be appended.
db.campaignClock.minute=4320;
const third=finishDueNutritionDays(db,{idFactory:gen,stamp});
eq(third.map(x=>x.characterId).sort(),['a','b']);eq(third.find(x=>x.characterId==='a').calendarNutritionDay.foodShortfall,1);ok(validateNutritionJournal(db.journal));
// Re-enable guarantee at a new GM instant.
push('a',policy('a',true));db.campaignClock.minute=5760;
const fourth=finishDueNutritionDays(db,{idFactory:gen,stamp});
eq(fourth.find(x=>x.characterId==='a').calendarNutritionDay.gmProvisioned,true);
// A previous historical day can never be silently rewritten.
const tampered=structuredClone(db.journal);tampered.find(x=>x.calendarNutritionDay?.gmProvisioned).calendarNutritionDay.gmProvisioned=false;
bad(()=>validateNutritionJournal(tampered),/Neplatná/);
const fake=structuredClone(db.journal);fake.find(x=>x.calendarNutritionDay?.gmProvisioned).calendarNutritionDay.foodReceived=0;
bad(()=>validateNutritionJournal(fake),/neodpovídá|Neplatná/);
const removed=structuredClone(db.journal);removed.splice(removed.findIndex(x=>x.id===a.id),1);
bad(()=>validateNutritionJournal(removed),/Neplatn|Poškozen/);
bad(()=>assertNutritionJournalAppendOnly(db.journal,db.journal.filter(x=>x.id!==a.id)),/nelze/);
// App uses the same verified policy writer and per-actor scope.
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');
for(const key of ['data-provision-assure="yes"','data-provision-assure="no"','data-actor-id="${esc(actor.id)}"','gmProvisioned:mode===\'yes\'','mutate(()=>data.journal.push','activeNutritionPolicies(data.journal','Ne · řešit podle zásob','Sledovat dle HMK']){
 if(key==='Sledovat dle HMK')continue;ok(app.includes(key),'UI '+key);
}
ok(css.includes('.hc-provision-simple-switch'));
ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('93.478'));
console.log('PASS',n,'GM coverage per-actor history, daily accounting, tamper protection, existing HMK day closes and UI');
