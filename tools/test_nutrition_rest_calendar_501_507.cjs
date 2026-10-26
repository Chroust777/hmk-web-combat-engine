'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=function(m,file){if(!file.startsWith(path.join(root,'src')+path.sep))return old(m,file);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)};
const N=require('../src/integration/hmk-nutrition-activity.js'),B=require('../src/integration/hmk-nutrition-rest-bridge.js'),A=require('../src/integration/hmk-calendar-activities.js'),C=require('../src/integration/hmk-campaign-calendar-ui.js'),CLOCK=require('../src/integration/hmk-campaign-calendar.js'),E=require('../src/integration/hmk-calendar-expedition.js');
const Combat=require('../src/integration/persistent-combat-state.js');
let n=0,s=0;const next=()=>`id-${++s}`,yes=(x,msg)=>{assert.ok(x,msg);n++},eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);n++};
const newCase=(type='rest-inactive')=>{
 const actor={id:'c1',name:'Karel',hmk:{combatState:Object.assign(Combat.initialCombatState(),{fatigue:{windedness:10,weariness:20,otherWeakness:15}}),expedition:{claims:{}}}};
 const clock=CLOCK.createCampaignCalendar({day:1,hour:0,minute:0,label:'Test',eventId:next(),gmConfirmed:true,campaignId:'test',characterIds:['c1']});
 const policyRow={id:'policy-1',characterId:'c1',calendarCampaignId:'test',calendarNutritionPolicy:{format:'hmk-nutrition-policy-v1',campaignId:'test',actorId:'c1',autoNeeds:true,enabled:true,minute:0}};
 const p=N.createNutritionDayConditions({journal:[policyRow],policyRow,campaignId:'test',actorId:'c1',minute:0,kind:type});
 const row={id:next(),characterId:'c1',calendarCampaignId:'test',campaignMinute:0,calendarNutritionConditions:p};
 const journal=[policyRow,row];const activity=B.nutritionRestActivity({journal:[policyRow],clock,actor,conditionRow:row,id:next()});
 if(activity)journal.push(activity);return {actor,clock,policyRow,row,activity,journal};
};
const t=newCase();yes(t.activity,'full rest schedules a real four-hour fatigue activity');eq(t.activity.calendarActivityProof.endMinute,240);eq(t.activity.calendarActivityProof.plan.nutritionConditionsId,t.row.id);
eq(t.actor.hmk.combatState.fatigue,{windedness:10,weariness:20,otherWeakness:15},'no immediate credit');
let map=N.calendarNutritionConditionActivities(t.clock,[t.actor],t.journal);eq(map.length,1);eq(map[0].status,'active');eq([map[0].minute,map[0].endMinute],[0,1440]);
let board=C.campaignCalendarBoardHTML({clock:t.clock,characters:[t.actor],journal:t.journal,ui:{mode:'month',monthShift:0,dayNumber:1,hour:0,prefillMinute:null},escapeHTML:x=>String(x)});
yes(board.includes('Právě probíhající činnosti'),'visible at overview without expanding details');yes(board.includes('Celodenní odpočinek a nečinnost'),'explicit nutrition interval');yes(board.includes('Odpočinek · 4 hodiny'),'fatigue interval linked in calendar');
t.clock.minute=239;eq(A.finishDueHMKActivities({characters:[t.actor],journal:t.journal,campaignClock:t.clock},{idFactory:next,stamp:()=>''}).length,0,'no premature credit');eq(t.actor.hmk.combatState.fatigue.weariness,20);
t.clock.minute=240;const db={characters:[t.actor],journal:t.journal,campaignClock:t.clock};eq(A.finishDueHMKActivities(db,{idFactory:next,stamp:()=>''}).length,1);eq(t.actor.hmk.combatState.fatigue.weariness,15,'four hours restores 5');eq(t.actor.hmk.combatState.fatigue.windedness,10,'windedness not restored');eq(t.actor.hmk.combatState.fatigue.otherWeakness,15,'weakness stays');eq(A.finishDueHMKActivities(db,{idFactory:next,stamp:()=>''}).length,0,'idempotent');yes(db.journal.some(x=>x.calendarExpeditionProof?.activityId===t.activity.id),'original proof linked');
const cancelled=newCase();cancelled.clock.minute=120;const stop=B.interruptionForCancelledNutritionRest({journal:cancelled.journal,clock:cancelled.clock,planRow:cancelled.row,reason:'Přerušení odpočinku',id:next(),createdAt:''});yes(stop?.calendarActivityInterruptProof,'before-four-hours interruption recorded');cancelled.journal.push(stop);cancelled.clock.minute=240;eq(A.finishDueHMKActivities({characters:[cancelled.actor],journal:cancelled.journal,campaignClock:cancelled.clock},{idFactory:next,stamp:()=>''}).length,0);eq(cancelled.actor.hmk.combatState.fatigue.weariness,20);
for(const kind of ['hot','inactive']){const x=newCase(kind);eq(x.activity,null,kind+' cannot confer rest');}
const prior=newCase('rest-hot');prior.actor.hmk.expedition.claims.lastFourHour=0;eq(B.nutritionRestActivity({journal:[prior.policyRow],clock:prior.clock,actor:prior.actor,conditionRow:prior.row,id:next()}),null,'already used this day does not block nutrition schedule');
const after=newCase('rest');after.actor.hmk.combatState.shock='INC';after.actor.hmk.combatState.extendedShock={originState:'INC',hr:4,elapsedHours:0};eq(B.nutritionRestActivity({journal:[after.policyRow],clock:after.clock,actor:after.actor,conditionRow:after.row,id:next()}),null,'special medical recovery not inferred');
const historical=newCase('rest');historical.journal=historical.journal.filter(x=>x.id!==historical.activity.id);eq(N.calendarNutritionConditionActivities(historical.clock,[historical.actor],historical.journal).length,1,'legacy recorded rest displays interval without retroactive fatigue');
console.log('PASS '+n+' calendar nutrition rest / fatigue bridge assertions');
