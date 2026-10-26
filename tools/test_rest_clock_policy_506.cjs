'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),original=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)?mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):original(mod,file);
const C=require('../src/integration/hmk-campaign-calendar.js');
const A=require('../src/integration/hmk-calendar-activities.js');
const N=require('../src/integration/hmk-nutrition-activity.js');
const P=require('../src/integration/hmk-nutrition-days.js');
const B=require('../src/integration/hmk-nutrition-rest-bridge.js');
const G=require('../src/integration/hmk-calendar-planner.js');
let checks=0,i=0;const id=()=>`test-502-${++i}`;const yes=(v,msg)=>{assert.ok(v,msg);checks++};const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++};
const actor={id:'k',name:'Karel',hmk:{combatState:{fatigue:{windedness:5,weariness:15,weakness:9}},expedition:{claims:{}}}};
const clock=C.createCampaignCalendar({day:1,hour:0,minute:0,label:'Test',eventId:id(),gmConfirmed:true,campaignId:'test-502',characterIds:['k']});
let journal=[];
const pol=P.createNutritionPolicy({campaignId:clock.campaignId,minute:clock.minute,actorId:'k',enabled:true,autoNeeds:true,inventoryRations:true,inventoryWater:true});
const row={id:id(),characterId:'k',calendarCampaignId:clock.campaignId,campaignMinute:clock.minute,calendarNutritionPolicy:pol};journal.push(row);
const cond=N.createNutritionDayConditions({journal,policyRow:row,campaignId:clock.campaignId,actorId:'k',minute:clock.minute,kind:'rest-inactive'});
const condRow={id:id(),characterId:'k',calendarCampaignId:clock.campaignId,campaignMinute:clock.minute,calendarNutritionConditions:cond};journal.push(condRow);
const rest=B.nutritionRestActivity({journal,clock,actor,conditionRow:condRow,id:id()});journal.push(rest);
eq(N.calendarNutritionConditionActivities(clock,[actor],journal)[0].status,'active','ongoing 24-hour rest is informational');
const advance=delta=>{const next=C.advanceCampaignCalendar(clock,{deltaMinutes:delta,eventId:id(),reason:'Uplynul herní čas GM',gmConfirmed:true,characters:[actor],journal});Object.assign(clock,next);const db={characters:[actor],journal,campaignClock:clock};return A.finishDueHMKActivities(db,{idFactory:id,stamp:()=>''})};
eq(advance(239).length,0,'before completion no fatigue change');eq(actor.hmk.combatState.fatigue.weariness,15,'no premature weariness');
eq(advance(1).length,1,'reaches four hours, completion is automatic');eq(actor.hmk.combatState.fatigue.weariness,10,'five weariness recovered');eq(actor.hmk.combatState.fatigue.weakness,9,'weakness unchanged');
eq(advance(1).length,0,'further GM time advance not blocked by completed rest');
eq(A.calendarActorActivities(clock,[actor],journal).find(x=>x.sourceId===rest.id).status,'resolved','resolved rest is informational');
// 24h summary is not an actionable GM term even after its clock interval expires.
clock.minute=1440;eq(N.calendarNutritionConditionActivities(clock,[actor],journal)[0].status,'elapsed','24-hour conditions are elapsed until automatic day receipt, never a due GM decision');
const event=G.addGMCalendarPlan(clock,{id:id(),eventId:id(),title:'Pouhé oznámení',minute:1450,endMinute:1450,requiresAction:false,destination:'notes',confirmed:true});
Object.assign(clock,event);
yes(C.advanceCampaignCalendar(clock,{deltaMinutes:12,eventId:id(),reason:'Udalost je informativni',gmConfirmed:true,characters:[actor],journal}).minute===1452,'unresolved informational GM event never blocks');
const actual=G.addGMCalendarPlan(clock,{id:id(),eventId:id(),title:'Povinný hod',minute:1450,endMinute:1450,requiresAction:true,destination:'healing',confirmed:true});
Object.assign(clock,actual);
assert.throws(()=>C.advanceCampaignCalendar(clock,{deltaMinutes:12,eventId:id(),reason:'Povinnost nelze preskocit',gmConfirmed:true,characters:[actor],journal}),/nevyřízenou GM událost/);checks++;
// Real medical/Combat consequences are not converted into informational calendar entries.
const shocked=structuredClone(actor);shocked.hmk.combatState.shockFollowup={dueRound:1};
assert.throws(()=>C.advanceCampaignCalendar(clock,{deltaMinutes:1,eventId:id(),reason:'Bez klinickeho rozhodnuti',gmConfirmed:true,characters:[shocked],journal}),/časový závazek|termín|Shock/i);checks++;
// After the whole-day interval, consumption is an automatic receipt, not
// another mandatory "confirm rest" checkbox. An actual medical test remains
// a separate requirement if the recorded quantities are insufficient.
const full={characters:[structuredClone(actor)],journal:structuredClone(journal),campaignClock:structuredClone(clock),inventory:[]};
full.campaignClock.minute=1440;
const once=P.finishDueNutritionDays(full,{idFactory:id,stamp:()=>''});
eq(once.length,1,'full 24-hour nutrition interval closes without a manual rest resolution');
eq(P.finishDueNutritionDays(full,{idFactory:id,stamp:()=>''}).length,0,'no duplicated daily closure');
eq(N.calendarNutritionConditionActivities(full.campaignClock,full.characters,full.journal)[0].status,'resolved','informational interval becomes resolved from the daily receipt');
const V=require('../src/integration/hmk-calendar-timeline-visibility.js');
const archived=V.calendarVisibleActivities([
 {origin:'activity',kind:'rest',status:'resolved'},
 {origin:'activity',kind:'nutrition-conditions',status:'resolved'},
 {origin:'activity',kind:'sleep',status:'cancelled'},
 {origin:'activity',kind:'travel',status:'resolved'}]);
eq(archived.length,3,'historic rest and full-day conditions remain visible, completed travel stays private');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
yes(app.includes("const APP_VERSION='93.506'")&&html.includes('v93.506'),'version aligned');
yes(app.includes('data-provision-rest-planner')&&app.includes('scheduleHMKActivity({journal:data.journal,clock,characterId:actor.id'),'both UI entries call one calendar engine');
yes(app.includes('<details class="hc-provision-personal-rules" open>')&&app.includes('<details class="hc-person-provision-options" open>'),'advanced and daily panels expanded by default');
yes(app.includes('ensurePersonalNutritionTracking')&&app.includes("inventoryRations:true,inventoryWater:true"),'one auditable default no-shortage policy, no fabricated supplies');
console.log('PASS '+checks+' v93.506 cross-panel activity, time-gates, calendar and default policy checks');
