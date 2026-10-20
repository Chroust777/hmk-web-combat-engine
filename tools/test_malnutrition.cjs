/** Standalone reproducible HMK 184-186 + campaign clock regression.
 * Run: node tools/test_malnutrition.cjs (no browser, no npm install).
 * Synthetic daily receipts here model attested consumption; this suite does
 * NOT claim to have exercised the separate Foraging proof generator.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..');
const extension=require.extensions['.js'];
require.extensions['.js']=function(module,filename){
 if(!filename.startsWith(path.join(root,'src')+path.sep))return extension(module,filename);
 const content=fs.readFileSync(filename,'utf8');
 const compiled=ts.transpileModule(content,{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 module._compile(compiled,filename);
};
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {createNutritionPolicy,finishDueNutritionDays,validateNutritionJournal}=require('../src/integration/hmk-nutrition-days.js');
const {applyDueMalnutritionOnsets,dueMalnutritionCases,resolveMalnutritionCourse,validateMalnutritionEvidence}=require('../src/integration/hmk-malnutrition-medical.js');
const {automaticHMKFollowups}=require('../src/integration/hmk-calendar-automatic-followups.js');
const {assertGMOnlyCampaignTime}=require('../src/integration/hmk-gm-clock-authority.js');
const {createCampaignCalendar}=require('../src/integration/hmk-campaign-calendar.js');
const {beginAdditionalCalendar,switchCampaign}=require('../src/integration/hmk-calendar-multi-campaign.js');
const {removeCalendarSafely,validateCalendarEvidenceArchives}=require('../src/integration/hmk-calendar-campaign-lifecycle.js');
const {malnutritionSchedule}=require('../src/rules/ailments.js');
const DAY=1440;
let checks=0,ids=0;
const uuid=()=>`synthetic:${++ids}`;
const stamp=()=>`synthetic-time`;
const ok=(condition,label)=>{assert.ok(condition,label);checks++};
const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++};
const reject=(fn,re,label)=>{assert.throws(fn,re,label);checks++};
function db({campaignId='A',foodNeed=1,waterNeed=1,foragingOnly=true,waterFull=true,foodFull=false}={}){
 const actor={id:'hero',name:'Test Hero',hmk:{attributes:{end:12,wil:10},combatState:initialCombatState()}};
 const clock={campaignId,minute:0,characterIds:['hero'],events:[]};
 const database={campaignClock:clock,characters:[actor],journal:[]};
 const policy=createNutritionPolicy({campaignId,minute:0,actorId:actor.id,foodNeed,waterNeed,foragingOnly});
 database.journal.push({id:uuid(),characterId:actor.id,calendarCampaignId:campaignId,campaignMinute:0,body:'synthetic policy',calendarNutritionPolicy:policy});
 return {database,actor,policy,waterFull,foodFull};
}
function day(ctx,{food=ctx.foodFull?1:0,water=ctx.waterFull?1:0}={}){
 const d=ctx.database,clock=d.campaignClock;
 const start=clock.minute,end=start+DAY;
 // The separate Foraging module already validates the real source. Here only
 // model its consumed daily receipts to test the medical integration.
 for(const [unit,q] of [['foodDays',food],['waterDays',water]])if(q>0)
  d.journal.push({id:uuid(),characterId:'hero',calendarCampaignId:clock.campaignId,campaignMinute:end,
   calendarForagingSupplyUse:{unit,quantity:q,disposition:'consumed'},body:'synthetic attested ration'});
 clock.minute=end;
 finishDueNutritionDays(d,{idFactory:uuid,stamp});
 applyDueMalnutritionOnsets(d,{idFactory:uuid,stamp});
 validateNutritionJournal(d.journal);
 validateMalnutritionEvidence(d);
 return d;
}
function course(ctx,{kind='starvation',roll=11}={}){
 const d=ctx.database,ep=ctx.actor.hmk.combatState.malnutritionEpisodes.find(x=>x.kind===kind&&x.status==='active');
 return resolveMalnutritionCourse(d,{actorId:'hero',episodeId:ep.id,gmConfirmed:true,roll,rollOrigin:'manual',idFactory:uuid,stamp});
}
// No automatic starvation for actors who may have other unknown supplies.
reject(()=>createNutritionPolicy({campaignId:'A',minute:0,actorId:'hero',foragingOnly:false}),/doložení/, 'no false sole-source claim');
const detached={campaignClock:{campaignId:'A',minute:DAY,characterIds:['hero']},characters:[{id:'hero',name:'Hero',hmk:{combatState:initialCombatState()}}],journal:[]};
eq(applyDueMalnutritionOnsets(detached,{idFactory:uuid,stamp}).length,0,'no policy=no medical onset');
const d1=db();day(d1,{food:0,water:1});
eq(d1.actor.hmk.combatState.malnutritionEpisodes.map(x=>x.kind),['starvation'],'starvation onset from day 1 only');
eq(d1.actor.hmk.combatState.fatigue.otherWeakness,5,'HR5 means weakness 5');
eq(dueMalnutritionCases(d1.database)[0].dueMinute,4*DAY,'starvation first advance day 4');
ok(automaticHMKFollowups(d1.database.campaignClock,d1.database.characters,d1.database.journal).all.some(x=>x.kind==='malnutrition-course'&&x.minute===4*DAY),'calendar auto-followup');
const initialMinute=d1.database.campaignClock.minute;
const activeEp=d1.actor.hmk.combatState.malnutritionEpisodes[0];
reject(()=>resolveMalnutritionCourse(d1.database,{actorId:'hero',episodeId:activeEp.id,gmConfirmed:true,roll:12,idFactory:uuid,stamp}),/ještě není splatný/,'never roll before due');
eq(d1.database.campaignClock.minute,initialMinute,'medical procedure never moves time');
// Once given a full ration on the very next day, roll Healing HB x5 at day 2.
day(d1,{food:1,water:1});
eq(dueMalnutritionCases(d1.database)[0].mode,'healing','full ration grants healing instead of forced advance');
eq(dueMalnutritionCases(d1.database)[0].dueMinute,2*DAY,'first available healing day');
const healed=course(d1,{roll:5});
eq(healed.episode.hr,6,'critical success heals HR5 to HR6');
eq(healed.episode.status,'defeated','course closure');
eq(d1.actor.hmk.combatState.fatigue.otherWeakness,0,'no remaining malnutrition weakness');
eq(d1.database.campaignClock.minute,2*DAY,'healing has no time mutation');
// Regression: stale day-1 shortage must NOT resurrect an already cured case.
day(d1,{food:1,water:1});
eq(d1.actor.hmk.combatState.malnutritionEpisodes.length,1,'no retroactive recurrence after cure');
day(d1,{food:0,water:1});
eq(d1.actor.hmk.combatState.malnutritionEpisodes.length,2,'genuine new deprivation after cure causes new onset');
eq(d1.actor.hmk.combatState.malnutritionEpisodes[1].originMinute,4*DAY,'new case has new origin');
const t1=db();day(t1,{food:1,water:0});
eq(t1.actor.hmk.combatState.malnutritionEpisodes[0].kind,'thirst','thirst without water');
eq(t1.actor.hmk.combatState.fatigue.otherWeakness,10,'HR4 weakness 10');
eq(dueMalnutritionCases(t1.database)[0].dueMinute,2*DAY,'thirst advance daily');
day(t1,{food:1,water:0});eq(dueMalnutritionCases(t1.database)[0].mode,'advance','thirst continues without water');
const worsen=course(t1,{kind:'thirst',roll:100});
eq(worsen.episode.hr,2,'CF exposure advance is -2 HR');
eq(t1.actor.hmk.combatState.shock,'INC','HR2 applies incapacitated state');
eq(t1.actor.hmk.combatState.fatigue.otherWeakness,0,'shock replaces weakness rather than stacking');
eq(t1.database.campaignClock.minute,2*DAY,'advance roll did not move clock');
const half=db();day(half,{food:.5,water:1});eq(half.actor.hmk.combatState.malnutritionEpisodes?.length??0,0,'half rations for one day not yet onset');
day(half,{food:.5,water:1});eq(half.actor.hmk.combatState.malnutritionEpisodes.length,1,'two consecutive half-ration days produce starvation');
eq(dueMalnutritionCases(half.database)[0].dueMinute,8*DAY,'half ration six-day advance schedule');
eq(malnutritionSchedule({kind:'thirst',halfRations:true,completeRest:true}).advanceEveryDays,4,'thirst half/rest interval');
// Old medical proofs must resolve in their inactive campaign branch.
const multi=structuredClone(d1.database);
const branchState=structuredClone(multi.characters[0].hmk.combatState);
multi.campaignActorBranches={A:{hero:{hmk:{combatState:branchState},inventory:[]}}};
multi.campaignClock={campaignId:'B',minute:0,characterIds:['hero'],events:[]};
multi.characters[0].hmk.combatState=initialCombatState();
eq(validateMalnutritionEvidence(multi),true,'campaign A records validate after switching to B');
// Real portfolio transitions must preserve historical medical proofs.
const actual=structuredClone(d1.database);
actual.inventory=[];actual.trash=[];
actual.campaignClock=createCampaignCalendar({day:5,hour:0,minute:0,label:'A',eventId:uuid(),gmConfirmed:true,campaignId:'A',characterIds:['hero']});
actual.campaignClocks=[];
const other=createCampaignCalendar({day:1,hour:0,minute:0,label:'B',eventId:uuid(),gmConfirmed:true,campaignId:'B',characterIds:['hero']});
const switched=beginAdditionalCalendar(actual,other);
eq(switched.campaignClock.campaignId,'B','real campaign B activated');
eq(validateMalnutritionEvidence(switched),true,'archived campaign medical proofs validate after real switch');
const returned=switchCampaign(switched,'A');
eq(returned.campaignClock.campaignId,'A','real campaign A restored');
eq(validateMalnutritionEvidence(returned),true,'medical proofs survive round-trip switching');
const removed=removeCalendarSafely(actual,uuid());
delete removed.campaignClock;
removed.characters[0].hmk.combatState=initialCombatState();
eq(validateCalendarEvidenceArchives(removed.calendarEvidenceArchives),true,'calendar deletion preserves scoped medical snapshot');
eq(validateMalnutritionEvidence(removed),true,'historical malnutrition audit survives calendar deletion');
const prior={campaignClock:{campaignId:'A',minute:1,characterIds:['hero'],events:[]},campaignClocks:[]};
const changed=structuredClone(prior);changed.campaignClock.minute=5;
changed.campaignClock.events.push({type:'advance',minute:5,reason:'Explicit GM confirmation'});
reject(()=>assertGMOnlyCampaignTime(prior,changed),/GM tlačítkem/,'no silent clock advance');
eq(assertGMOnlyCampaignTime(prior,changed,{gmClockAdvance:true}),true,'explicit GM action can advance clock');
// Test journal provenance of manual/software dice and rejection of duplicate attempts.
const dueId=t1.actor.hmk.combatState.malnutritionEpisodes[0].id;
reject(()=>resolveMalnutritionCourse(t1.database,{actorId:'hero',episodeId:dueId,gmConfirmed:true,roll:100,idFactory:uuid,stamp}),/ještě není splatný/,'cannot reroll course before new due');
console.log(`PASS: ${checks} HMK malnutrition / multi-campaign / clock assertions`);
