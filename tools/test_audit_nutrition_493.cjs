'use strict';
/** v93.493: rules pp.147, 184–186, genuine Foraging/water receipts, daily debits,
 * cross-actor competition, due medical controls, idempotency and date isolation. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),ext=require.extensions['.js'];
require.extensions['.js']=function(m,f){if(!f.startsWith(path.join(root,'src')+path.sep))return ext(m,f);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f)};
const N=require('../src/integration/hmk-nutrition-days.js');
const M=require('../src/integration/hmk-malnutrition-medical.js');
const A=require('../src/integration/hmk-nutrition-activity.js');
const F=require('../src/integration/hmk-foraging-supply-ledger.js');
const W=require('../src/integration/hmk-physical-water-ledger.js');
const S=require('../src/integration/persistent-combat-state.js');
const CAL=require('../src/integration/hmk-calendar-automatic-followups.js');
let n=0,seed=0;const id=()=>`audit-${++seed}`,stamp=()=>`audit-time`,day=1440;
const eq=(a,b,l)=>{assert.deepEqual(a,b,l);n++};const ok=(a,l)=>{assert.ok(a,l);n++};
const row=(type,proof,who='a',minute=0,campaignId='A')=>({id:id(),characterId:who,calendarCampaignId:campaignId,campaignMinute:minute,[type]:proof});
const actor=(id,name)=>({id,name,hmk:{attributes:{end:12,wil:10},combatState:S.initialCombatState()}});
function make(actors=['a']){return {characters:actors.map((a,i)=>actor(a,'Actor '+i)),inventory:[],journal:[],campaignClock:{campaignId:'A',characterIds:actors,minute:0,events:[]}}}
function policy(db,who,opts={}){let x=N.createNutritionPolicy({campaignId:'A',minute:0,actorId:who,autoNeeds:true,foragingOnly:true,...opts});const r=row('calendarNutritionPolicy',x,who);db.journal.push(r);return r}
function forage(db,{food=0,water=0},minute=0,campaignId='A'){
 const p={results:[{foodDays:food,waterDays:water,herbDoses:0}]};const r=row('calendarTrekWildernessProof',p,'a',minute,campaignId);db.journal.push(r);return r
}
function tick(db,minutes=day){db.campaignClock.minute+=minutes;const done=N.finishDueNutritionDays(db,{idFactory:id,stamp});M.applyDueMalnutritionOnsets(db,{idFactory:id,stamp});eq(N.validateNutritionJournal(db.journal),true,'audit replay');return done}
// Multi-day GM time, same source cannot be spent twice. Priority is chronological,
// deterministic at identical timestamp. Unused personal stock cannot appear magically.
let db=make(['a','b']);policy(db,'a');policy(db,'b');const common=forage(db,{food:2,water:1});
db.campaignClock.minute=day;
assert.throws(()=>N.finishDueNutritionDays(db,{idFactory:id,stamp}),/GM musí nejdříve přidělit/,'scarce shared water needs GM allocation');n++;
eq(db.journal.some(x=>x.calendarNutritionDay),false,'no receipt on ambiguity');
db.campaignClock.minute=0;
// The GM chooses a fair 0.5 gal per person using the original proof writer.
for(const who of ['a','b']){
 const proof=F.createSupplyUse({journal:db.journal,campaignId:'A',minute:0,sourceId:common.id,resultIndex:0,unit:'waterDays',quantity:0.5,actorId:who,disposition:'consumed'});
 db.journal.push(row('calendarForagingSupplyUse',proof,who));
}
let d=tick(db,day);eq(d.length,2,'two closed days');
eq(d.map(x=>x.calendarNutritionDay.waterReceived),[0.5,0.5],'manual shared allocation reflected in each actor');
eq(d.map(x=>x.calendarNutritionDay.foodReceived),[1,1],'both actors got available food');
eq(F.supplyBalances(db.journal,'A').available.waterDays,0,'shared water depleted');
eq(db.characters.some(c=>c.hmk.combatState.malnutritionEpisodes?.length),false,'one half day without onset');
let proofCount=db.journal.length;eq(tick(db,0).length,0,'no new day without clock advance');eq(db.journal.length,proofCount,'no duplicate journal receipts');
// No source in later day -> both deficits. Supply in another campaign is isolated.
forage(db,{food:99,water:99},0,'B');eq(tick(db,day).length,2,'second day completed');
eq(M.dueMalnutritionCases(db).filter(x=>x.kind==='thirst').length,2,'two future thirst controls');
ok(CAL.automaticHMKFollowups(db.campaignClock,db.characters,db.journal).all.some(x=>x.kind==='malnutrition-course'),'medical due in calendar');
eq(F.supplyBalances(db.journal,'A').available.foodDays,0,'campaign separation');
eq(db.journal.filter(x=>x.calendarNutritionDay).length,4,'exactly four 24h receipts');
// Half rations two consecutive days -> onset; partial day not closed.
let half=make();policy(half,'a');forage(half,{food:1,water:2});
half.campaignClock.minute=day-1;eq(N.finishDueNutritionDays(half,{idFactory:id,stamp}).length,0,'no early charge');
let first=tick(half,1);eq(first[0].calendarNutritionDay.foodReceived,1,'full first day');
// Another actor with only 0.5 food on consecutive days.
let partial=make();policy(partial,'a');forage(partial,{food:1,water:2});
let x=F.createSupplyUse({journal:partial.journal,campaignId:'A',minute:0,sourceId:partial.journal.at(-1).id,resultIndex:0,unit:'foodDays',quantity:0.5,actorId:'a',disposition:'consumed'});
partial.journal.push(row('calendarForagingSupplyUse',x));
let a=tick(partial);eq(a[0].calendarNutritionDay.foodReceived,1,'manual food accounted before automatic debit');
// Physical bottle (0.5 gal) MUST count half a normal day, no phantom water.
let bottle=make();policy(bottle,'a',{foragingOnly:false,inventoryRations:true,inventoryWater:true});
const snap={id:W.WATER_ITEM,name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2}};
bottle.inventory=[{id:'skin',characterId:'a',sourceItemId:W.WATER_ITEM,snapshot:snap,slot:'carried',quantity:1}];
const fill=W.createPotableWaterFill({inventory:bottle.inventory,journal:bottle.journal,campaignId:'A',actorId:'a',itemId:'skin',minute:0,gmConfirmed:true,waterSource:'Studna'});
bottle.journal.push(row('calendarInventoryWaterFill',fill));
let day1=tick(bottle);eq(day1[0].calendarNutritionDay.waterReceived,0.5,'half gallon is half of active-day need');
eq(day1[0].calendarNutritionDay.waterShortfall,0.5,'half gallon is not one full day');
eq(W.availablePhysicalWater(bottle.journal,'A','a',day).length,0,'no duplicated water after use');
eq(tick(bottle)[0].calendarNutritionDay.waterReceived,0,'next day no water');
eq(W.validatePhysicalWaterJournal(bottle.journal,bottle.inventory),true,'water receipts remain valid');
// Full rest / complete inactivity / heat must follow PDF p.186, not assumptions about a 4h nap.
let weather=make();const pol=policy(weather,'a');
eq(A.dailyNutritionNeeds({journal:weather.journal,campaignId:'A',actorId:'a',policyId:pol.id,startMinute:0,endMinute:day}).waterNeed,1,'regular activity: 1 gal');
const plan=A.createNutritionDayConditions({journal:weather.journal,policyRow:pol,campaignId:'A',actorId:'a',minute:0,kind:'rest-inactive'});
weather.journal.push(row('calendarNutritionConditions',plan));
const rest=A.dailyNutritionNeeds({journal:weather.journal,campaignId:'A',actorId:'a',policyId:pol.id,startMinute:0,endMinute:day});eq([rest.foodNeed,rest.waterNeed],[0.5,0.5],'rest & inactive');
const hot=A.dailyNutritionNeeds({journal:[row('calendarTrekProof',{weatherWatch:{hazard:'heat'},partyModes:{memberIds:['a']}})],campaignId:'A',actorId:'a',policyId:'unused',startMinute:0,endMinute:day});eq(hot.waterNeed,2,'heat: 2 gal');
console.log('PASS',n,'v93.493 nutrition, actual receipts, 2 characters, 2 days, calendar follow-up, source separation, water and temperature');
// Additional actual 0.5-gallon/half-food receipts in two distinct 24-hour periods.
let twoHalves=make();policy(twoHalves,'a');forage(twoHalves,{food:0.5,water:0.5});
let h1=tick(twoHalves);eq([h1[0].calendarNutritionDay.foodReceived,h1[0].calendarNutritionDay.waterReceived],[0.5,0.5],'first half-ration day');
eq(twoHalves.characters[0].hmk.combatState.malnutritionEpisodes?.length||0,0,'one half day no immediate onset');
forage(twoHalves,{food:0.5,water:0.5},day);
let h2=tick(twoHalves);eq([h2[0].calendarNutritionDay.foodReceived,h2[0].calendarNutritionDay.waterReceived],[0.5,0.5],'second half-ration day');
eq(twoHalves.characters[0].hmk.combatState.malnutritionEpisodes.map(x=>x.kind).sort(),['starvation','thirst'],'onset after two half days both channels');
eq(M.dueMalnutritionCases(twoHalves).length,2,'separate future courses');
console.log('PASS 5 more half-ration proof checks');
