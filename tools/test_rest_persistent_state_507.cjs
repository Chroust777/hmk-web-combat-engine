'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)?mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):old(mod,file);
const C=require('../src/integration/hmk-campaign-calendar.js');
const A=require('../src/integration/hmk-calendar-activities.js');
const E=require('../src/integration/hmk-calendar-expedition.js');
const S=require('../src/integration/persistent-combat-state.js');
const B=require('../src/integration/hmk-nutrition-rest-bridge.js');
const N=require('../src/integration/hmk-nutrition-activity.js');
const R=require('../src/integration/hmk-calendar-event-controls.js');
let n=0,seq=0; const id=()=>`rest507-${++seq}`;
const eq=(actual,expected,msg)=>{assert.deepEqual(actual,expected,msg);n++};
const yes=(v,msg)=>{assert.ok(v,msg);n++};
function scene(actor,kind='rest'){
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:id(),gmConfirmed:true,campaignId:'test507-'+id(),characterIds:[actor.id]});
 const journal=[];
 const state=actor.hmk?.combatState??S.initialCombatState();
 const plan=E.expeditionRestRecovery({minute:clock.minute,kind,current:state.fatigue[kind==='winded'?'windedness':'weariness'],claims:actor.hmk?.expedition?.claims||{}});
 const scheduled=A.scheduleHMKActivity({journal,clock,characterId:actor.id,name:actor.name,kind,plan,id:id(),origin:'none'});journal.push(scheduled);
 const db={characters:[actor],journal,campaignClock:clock};
 function advance(amount){
  const next=C.advanceCampaignCalendar(db.campaignClock,{deltaMinutes:amount,eventId:id(),reason:'Utekl cas GM',gmConfirmed:true,characters:db.characters,journal:db.journal});
  db.campaignClock=next;
  return A.finishDueHMKActivities(db,{idFactory:id,stamp:()=>''});
 }
 return {db,actor,scheduled,advance};
}
// Real report: a character was generated with no Combat State. The calendar
// accepted the rest, but its automatic completion crashed when reading .fatigue.
for(const kind of ['rest','winded','sleep']){
 const actor={id:id(),name:'Karel',hmk:{skills:[],expedition:{}}};
 const t=scene(actor,kind);
 yes(!actor.hmk.combatState,kind+' scheduling must not fabricate a Combat State');
 const receipt=R.makeCalendarUIReceipt({journal:t.db.journal,campaignId:t.db.campaignClock.campaignId,eventId:'activity:'+t.scheduled.id,action:'acknowledge',minute:t.db.campaignClock.minute});
 t.db.journal.push({id:id(),characterId:actor.id,calendarCampaignId:t.db.campaignClock.campaignId,campaignMinute:t.db.campaignClock.minute,calendarUIReceipt:receipt});
 yes(!actor.hmk.combatState,kind+' checked calendar item remains just a UI receipt');
 const minutes=kind==='winded'?10:kind==='rest'?240:480;
 eq(t.advance(minutes-1).length,0,'not credited prematurely');
 yes(!actor.hmk.combatState,'no state created for a still unfinished interval');
 eq(t.advance(1).length,1,'completes automatically on GM clock advance');
 S.validateCombatState(actor.hmk.combatState);n++;
 const source=t.db.journal.filter(r=>r.calendarExpeditionProof?.activityId===t.scheduled.id);
 eq(source.length,1,'one original linked proof');
 eq(source[0].calendarExpeditionProof.delta,0,'no fatigue granted when character was never fatigued');
 eq(t.advance(1).length,0,'no duplicate proof or repeated fatigue');
 eq(t.db.journal.filter(r=>r.calendarExpeditionProof?.activityId===t.scheduled.id).length,1,'still one proof after further time advance');
 eq(A.calendarActorActivities(t.db.campaignClock,t.db.characters,t.db.journal).find(x=>x.sourceId===t.scheduled.id).status,'resolved');
}
// Missing HMK profile is allowed in old generated characters, but not a
// partially corrupted existing authoritative Combat State.
{
 const actor={id:id(),name:'Bez HMK'};const t=scene(actor);
 eq(t.advance(240).length,1);S.validateCombatState(actor.hmk.combatState);n++;
}
{
 const actor={id:id(),name:'Původní únava',hmk:{combatState:S.initialCombatState(),expedition:{}}};
 actor.hmk.combatState.fatigue.weariness=12;
 const t=scene(actor);eq(t.advance(240).length,1);eq(actor.hmk.combatState.fatigue.weariness,7);
 eq(actor.hmk.expedition.claims.lastFourHour,480);eq(t.advance(1).length,0);
}
{
 const actor={id:id(),name:'Poškozený Combat State',hmk:{combatState:{format:'hmk-persistent-combat-v1'},expedition:{}}};
 // We only simulate a previously persisted plan here; its original scheduler
 // would already have rejected the malformed state if it had read it.
 const valid={id:actor.id,name:actor.name,hmk:{}};
 const t=scene(valid);
 t.db.characters=[actor];
 assert.throws(()=>t.advance(240),/Shock State|Blood Loss Points|Neplatn|bojového stavu/);n++;
 yes(!actor.hmk.combatState.fatigue,'must not silently replace corrupt evidence');
}
// The daily nutrition rest form must ALSO work before Combat was ever opened,
// and planning does not create mutable Combat State or grant recovery early.
{
 const actor={id:id(),name:'Celodenní klid',hmk:{expedition:{claims:{}}}};
 const t=scene(actor,'rest');
 t.db.journal.length=0;
 const row={id:id(),characterId:actor.id,calendarCampaignId:t.db.campaignClock.campaignId,campaignMinute:480,calendarNutritionConditions:{kind:'rest',startMinute:480,actorId:actor.id,campaignId:t.db.campaignClock.campaignId}};
 const planned=B.nutritionRestActivity({journal:[],clock:t.db.campaignClock,actor,conditionRow:row,id:id()});
 yes(planned?.calendarActivityProof,'full day rest can plan before Combat');yes(!actor.hmk.combatState,'nutrition preview does not write Combat State');
 t.db.journal.push(row,planned);
 eq(t.advance(240).length,1,'four-hour rest completed from 24-hour conditions');
 eq(A.finishDueHMKActivities(t.db,{idFactory:id,stamp:()=>''}).length,0,'cannot complete twice');
}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
yes(app.includes("const APP_VERSION='93.507'")&&html.includes('v93.507'),'versions synchronized');
console.log(`PASS ${n} v93.507 regression checks for uninitialized canonical fatigue, UI acknowledge, clock, rest and 24h conditions`);
