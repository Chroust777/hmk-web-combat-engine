'use strict';
/** v93.735: actual starvation/thirst scheduling with dated GM provisioning,
 * safe-lodging UI sync, no phantom reroll, no day shifted silently. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=function(m,f){if(!f.startsWith(path.join(root,'src')+path.sep))return old(m,f);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f)};
const N=require('../src/integration/hmk-nutrition-days.js');
const M=require('../src/integration/hmk-malnutrition-medical.js');
const S=require('../src/integration/hmk-pc-sheltered-stay-93730.js');
const C=require('../src/integration/hmk-campaign-calendar.js');
const F=require('../src/integration/hmk-calendar-automatic-followups.js');
let n=0,seq=0;const id=()=>`93735-${++seq}`,stamp=()=>`proof-${seq}`;const yes=(v,m)=>{assert.ok(v,m);n++};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++};const DAY=1440;
const at=(day,hour=8)=>((day-1)*DAY+hour*60);
function make(){
 const actor={id:'p',name:'Petr',kind:'PC',hmk:{attributes:{end:12,wil:12},healthState:require('../src/integration/persistent-combat-state.js').initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:id(),gmConfirmed:true,campaignId:'campaign',characterIds:['p']});
 const db={campaignClock:clock,characters:[actor],journal:[],inventory:[]};
 const policy=N.createNutritionPolicy({campaignId:'campaign',minute:clock.minute,actorId:'p',autoNeeds:true,inventoryRations:true,inventoryWater:true});
 db.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',campaignMinute:clock.minute,calendarNutritionPolicy:policy});
 return db;
}
function advanceTo(db,minute){
 const delta=minute-db.campaignClock.minute; yes(delta>0,'positive time jump');
 const next=C.advanceCampaignCalendar(db.campaignClock,{deltaMinutes:delta,eventId:id(),reason:'Doložené plynutí času GM',gmConfirmed:true,characters:db.characters,journal:db.journal});
 db.campaignClock=next;
 N.finishDueNutritionDays(db,{idFactory:id,stamp}); M.applyDueMalnutritionOnsets(db,{idFactory:id,stamp});
}
function switchGM(db,minute,provisioned){
 const proof=N.createNutritionProvisionSwitch({campaignId:'campaign',actorId:'p',minute,provisioned});
 db.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',campaignMinute:minute,calendarNutritionProvisionSwitch:proof});
}
function shelter(db,minute,enabled){
 const proof=S.createPCShelteredStay({campaignId:'campaign',actorId:'p',minute,enabled});
 db.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',campaignMinute:minute,calendarPCShelteredStay:proof});
}
// First day is actually empty; onset is real and must not be erased later.
let db=make();advanceTo(db,at(2));
eq(db.journal.filter(x=>x.calendarNutritionDay).length,1,'first real daily closure');
eq(db.characters[0].hmk.healthState.malnutritionEpisodes.map(e=>e.kind).sort(),['starvation','thirst'],'one-day actual lack creates both');
const original=Object.fromEntries(db.characters[0].hmk.healthState.malnutritionEpisodes.map(e=>[e.kind,e.nextDueMinute]));
eq(original.starvation,at(5),'starvation initial +3 days');eq(original.thirst,at(3),'thirst initial +1 day');
// Two hours after onset: continual GM provisioning, no invented prior food.
advanceTo(db,at(2,10));switchGM(db,at(2,10),true);
yes(N.effectivelyProvisionedAt(db.journal,'campaign','p',at(2,10)),'GM current supply switch');
eq(N.projectedVerifiedMalnutritionHealingMinute(db.journal,'campaign','p',at(2,10),'starvation',original.starvation),at(3),'starvation healing forecast moves forward precisely to next daily closure');
let agenda=F.automaticHMKFollowups(db.campaignClock,db.characters,db.journal).all.filter(e=>e.kind==='malnutrition-course');
eq(agenda.length,2,'two medical courses remain independent');
eq(agenda.map(e=>[e.description.startsWith('Starvation')?'starvation':'thirst',e.minute]).sort(),[['starvation',at(3)],['thirst',at(3)]],'both course deadlines visible and equal');
yes(agenda.find(e=>e.description.startsWith('Starvation')).description.includes('Healing'),'forecast explains early Healing rather than old Advance');
assert.throws(()=>C.advanceCampaignCalendar(db.campaignClock,{deltaMinutes:23*60,eventId:id(),reason:'Nesmí přeskočit healing',gmConfirmed:true,characters:db.characters,journal:db.journal}),/Nelze přeskočit povinný termín.*Healing/, 'calendar proactively stops at next real potential healing date');n++;
advanceTo(db,at(3));
eq(db.journal.filter(x=>x.calendarMalnutritionMedical?.phase==='onset').length,2,'no second spontaneous illness onset');
let due=M.dueMalnutritionCases(db);
eq(due.map(e=>e.mode),['healing','healing'],'full-day evidenced nutrition changes old advance into healing');
eq(due.map(e=>e.dueMinute),[at(3),at(3)],'no apparent day-off mismatch');
eq(db.characters[0].hmk.healthState.malnutritionEpisodes.length,2,'no duplicate illness episode');
eq(N.validateNutritionJournal(db.journal),true,'nutrition journal validates');
eq(M.validateMalnutritionEvidence(db),true,'medical evidence validates');
// Shelter alone must activate both resource indicators without a new GM switch.
let covered=make();advanceTo(covered,at(1,10));shelter(covered,at(1,10),true);
yes(N.effectivelyProvisionedAt(covered.journal,'campaign','p',at(1,10)),'shelter automatically assures both resources');
eq(N.gmProvisionedAt(covered.journal,'campaign','p',at(1,10)),false,'no duplicate GM switch generated');
advanceTo(covered,at(2));const coveredDay=covered.journal.find(x=>x.calendarNutritionDay).calendarNutritionDay;
eq([coveredDay.foodReceived,coveredDay.waterReceived],[1,1],'22 hours in shelter produces full daily food and water at closure');
eq(covered.characters[0].hmk.healthState.malnutritionEpisodes?.length||0,0,'no onset when real nourishment covered');
shelter(covered,at(2),false);yes(!N.effectivelyProvisionedAt(covered.journal,'campaign','p',at(2)),'shelter off restores independent resource tracking');
// The past 24h evidence remains the same; nothing retroactively erased.
eq(covered.journal.find(x=>x.calendarNutritionDay).calendarNutritionDay.foodReceived,1,'prior covered day immutable');
// A current GM switch survives switching shelter off; independent decisions.
let both=make();switchGM(both,at(1),true);shelter(both,at(1),true);shelter(both,at(1),false);
yes(N.effectivelyProvisionedAt(both.journal,'campaign','p',at(1)),'independent GM access remains even after sheltered stay ends');
// Exact witnessed intake is distinct from an automatic 24h accounting close.
const OVERVIEW=require('../src/integration/hmk-character-provisions-overview.js');
const last=OVERVIEW.lastNutritionConsumptionEvidence([
 {id:'purchased-only',calendarCampaignId:'campaign',characterId:'p',campaignMinute:120,
  calendarInventoryRationStock:{quantity:3}},
 {id:'ate',calendarCampaignId:'campaign',characterId:'p',campaignMinute:150,
  calendarForagingSupplyUse:{unit:'foodDays',quantity:1,disposition:'consumed'}},
 {id:'bottle-only',calendarCampaignId:'campaign',characterId:'p',campaignMinute:160,
  calendarInventoryWaterFill:{quantity:1}},
 {id:'water',calendarCampaignId:'campaign',characterId:'p',campaignMinute:170,
  calendarInventoryWaterUse:{quantity:0.5}},
 {id:'close',calendarCampaignId:'campaign',characterId:'p',campaignMinute:DAY,
  calendarInventoryRationUse:{quantity:1,nutritionDayId:'policy:1440'}},
 ],'campaign','p',DAY);
eq([last.food?.minute,last.water?.minute],[DAY,170],'actual receipts remain distinct for food and water');
eq([last.food?.accountingOnly,last.water?.accountingOnly],[true,false],'exact physical intake vs accounting-only proof clearly distinguished');
const early=OVERVIEW.lastNutritionConsumptionEvidence([
 {id:'late',calendarCampaignId:'campaign',characterId:'p',campaignMinute:100,
  calendarForagingCarryEat:{quantity:1}},
 ],'campaign','p',99);
eq(early.food,null,'future consumption never counted retroactively');
const shelterUI=S.calendarPCShelteredControlsHTML({clock:covered.campaignClock,characters:covered.characters,
 journal:covered.journal,escapeHTML:String});
yes(shelterUI.includes('data-calendar-pc-shelter="p"')&&shelterUI.includes('Běžné potřeby a expozice'),
 'shelter control renders current off state');
const liveCard=OVERVIEW.characterProvisionsOverview(covered,'p');
eq(liveCard.intake.foodLastAccountedMinute,at(2),'last covered day is an audited day, not an invented exact mealtime');
const code=fs.readFileSync(path.join(root,'app.js'),'utf8');
yes(code.includes('const assured=effectivelyProvisionedAt(')&&code.includes('const covered=effectivelyProvisionedAt('),
 'both calendar provisioning panels use the same effective secured-state selector');
yes(code.includes('Nejprve vypněte zajištěné prostředí v Přehledu a čase'),
 'supplying UI refuses conflicting manual override during safe stay');
yes(code.includes("missed.mode==='healing'?'Healing'"),'calendar error explains healing vs advance');
// Separately recorded food/water consumption in the 24h interval must be
// counted, not debited again or mislabeled as an empty day. Animal care is NOT
// food/water actually eaten by the owner.
const personal=make();
for(let k=0;k<2;k++)personal.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',
 campaignMinute:at(1,10+k),calendarInventoryRationUse:{unit:'foodDays',quantity:0.5},
 calendarInventoryWaterUse:{unit:'waterDays',quantity:0.5}});
advanceTo(personal,at(2));
const pd=personal.journal.find(r=>r.calendarNutritionDay).calendarNutritionDay;
eq([pd.foodReceived,pd.waterReceived,pd.automaticDebitIds.length],[1,1,0],
 'already witnessed personal consumption credits full day without double debits');
eq(personal.characters[0].hmk.healthState.malnutritionEpisodes?.length||0,0,
 'actual consumed food/water prevents false starvation and thirst');
eq(N.validateNutritionJournal(personal.journal),true,'replay accepts manual physical consumption');
const livestock=make();livestock.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',
 campaignMinute:at(1,10),stableHub574:{type:'care',kind:'food'},
 calendarInventoryRationUse:{unit:'foodDays',quantity:1},calendarInventoryWaterUse:{unit:'waterDays',quantity:1}});
advanceTo(livestock,at(2));
const ld=livestock.journal.find(r=>r.calendarNutritionDay).calendarNutritionDay;
eq([ld.foodReceived,ld.waterReceived],[0,0],'feeding a horse cannot feed its human owner');
eq(livestock.characters[0].hmk.healthState.malnutritionEpisodes.length,2,
 'real owner deprivation still creates both medical conditions');
eq(OVERVIEW.lastNutritionConsumptionEvidence(livestock.journal,'campaign','p',at(2)).food,null,
 'feeding animal does not fabricate owner mealtime');
// Found food/water counts only when the actual GM-approved consumption
// is written to the source ledger; discovery/carrying is not eating.
const SUPPLY=require('../src/integration/hmk-foraging-supply-ledger.js');
const gathered=make();advanceTo(gathered,at(2));advanceTo(gathered,at(2,10));
const source={id:id(),characterId:'p',calendarCampaignId:'campaign',campaignMinute:at(2,10),
 calendarTrekWildernessProof:{results:[{foodDays:1,waterDays:1,herbDoses:0}]}};
gathered.journal.push(source);
const bareOriginal=gathered.characters[0].hmk.healthState.malnutritionEpisodes.find(e=>e.kind==='starvation').nextDueMinute;
eq(N.projectedVerifiedMalnutritionHealingMinute(gathered.journal,'campaign','p',at(2,10),'starvation',bareOriginal),null,
 'found but unconsumed food does not establish a healed day');
for(const unit of ['foodDays','waterDays']){
 const proof=SUPPLY.createSupplyUse({journal:gathered.journal,campaignId:'campaign',minute:at(2,10),
  sourceId:source.id,resultIndex:0,unit,quantity:1,actorId:'p',disposition:'consumed'});
 gathered.journal.push({id:id(),characterId:'p',calendarCampaignId:'campaign',campaignMinute:at(2,10),
  calendarForagingSupplyUse:proof});
}
eq(N.projectedVerifiedMalnutritionHealingMinute(gathered.journal,'campaign','p',at(2,10),'starvation',bareOriginal),at(3),
 'actual eaten Foraging moves Healing forecast to next nutrition close');
advanceTo(gathered,at(3));
eq(gathered.journal.findLast(x=>x.calendarNutritionDay).calendarNutritionDay.foodReceived,1,
 'consumed found food credits the correct day');
eq(gathered.journal.findLast(x=>x.calendarNutritionDay).calendarNutritionDay.waterReceived,1,
 'consumed found water credits the correct day');
eq(gathered.characters[0].hmk.healthState.malnutritionEpisodes.length,2,
 'prior conditions persist until original healing rolls');
console.log('PASS',n,'v93.735 nutrition/shelter/healing schedule checks');
