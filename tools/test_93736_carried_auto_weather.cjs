'use strict';
/** v93.736: nutrition needs no "eaten" checkbox; time-based automatic
 * ledger and forecast use the same owned stock, and weather stays factual. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=function(m,f){if(!f.startsWith(path.join(root,'src')+path.sep))return old(m,f);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f)};
const N=require('../src/integration/hmk-nutrition-days.js'),M=require('../src/integration/hmk-malnutrition-medical.js');
const C=require('../src/integration/hmk-campaign-calendar.js');
const W=require('../src/integration/hmk-calendar-current-weather-93736.js');
const T=require('../src/integration/hmk-trekking-routine.js');
const O=require('../src/integration/hmk-character-provisions-overview.js');
const CP=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-provisions-simple-view.js');
let passes=0,seq=0;const id=()=>`93736-test-${++seq}`,stamp=()=>`stamp-${seq}`;
const ok=(v,m)=>{assert.ok(v,m);passes++},eq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);passes++};
const DAY=1440,at=(d,h=8)=>(d-1)*DAY+h*60;
function fresh(){
 const actor={id:'p',name:'Petr',kind:'PC',hmk:{attributes:{end:12,wil:12},healthState:CP.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Full ration',eventId:id(),gmConfirmed:true,campaignId:'c',characterIds:['p']});
 const db={campaignClock:clock,characters:[actor],journal:[],inventory:[]};
 const policy=N.createNutritionPolicy({campaignId:'c',minute:clock.minute,actorId:'p',autoNeeds:true,inventoryRations:true,inventoryWater:true});
 db.journal.push({id:id(),characterId:'p',calendarCampaignId:'c',campaignMinute:clock.minute,calendarNutritionPolicy:policy});
 return db;
}
function advance(db,to){
 const next=C.advanceCampaignCalendar(db.campaignClock,{deltaMinutes:to-db.campaignClock.minute,eventId:id(),reason:'GM potvrzuje čas',gmConfirmed:true,characters:db.characters,journal:db.journal,inventory:db.inventory});
 db.campaignClock=next;
 N.finishDueNutritionDays(db,{idFactory:id,stamp});M.applyDueMalnutritionOnsets(db,{idFactory:id,stamp});
}
function addFoodWater(db,minute,{food=1,water=1,slot='carried',expiry=minute+30*DAY}={}){
 const foodId=id(),waterId=id();
 const foodItem={id:foodId,characterId:'p',slot,sourceItemId:'hmk:gear:hmk-p120-026',quantity:food,
  snapshot:{id:'hmk:gear:hmk-p120-026',name:'Trail ration',properties:{weightLb:3}}};
 const waterItem={id:waterId,characterId:'p',slot,sourceItemId:'hmk:gear:hmk-p120-041',quantity:1,
  snapshot:{id:'hmk:gear:hmk-p120-041',name:'Jug',properties:{weightLb:2}}};
 db.inventory.push(foodItem,waterItem);
 const rationRow={id:id(),calendarCampaignId:'c',characterId:'p',campaignMinute:minute,
  calendarInventoryRationStock:{format:'hmk-physical-ration-stock-v1',campaignId:'c',actorId:'p',minute,
   itemId:foodId,sourceItemId:foodItem.sourceItemId,name:'Trail ration',quantity:food,unitWeightLb:3,expiresAt:expiry,
   sourcePages:[120,186],freshnessAttestedByGM:true}};
 const waterRow={id:id(),calendarCampaignId:'c',characterId:'p',campaignMinute:minute,
  calendarInventoryWaterFill:{format:'hmk-physical-water-fill-v1',campaignId:'c',actorId:'p',minute,
   itemId:waterId,quantity:water,unit:'waterDays',weightLb:water*10,potableAndFilledConfirmedByGM:true,
   waterSource:'Village well',sourcePages:[120,121,186]}};
 db.journal.push(rationRow,waterRow);return {rationRow,waterRow,foodItem,waterItem};
}
// Existing Starvation + Thirst are not erased by acquiring rations. Actual
// automatically consumed food/water brings forward a daily healing duty.
let db=fresh();advance(db,at(2));
eq(db.characters[0].hmk.healthState.malnutritionEpisodes.length,2,'illness onset after a full day without food/water');
advance(db,at(2,10));
let lots=addFoodWater(db,db.campaignClock.minute);
let stock=N.personalNutritionStock(db,'c','p',at(2),at(3),at(2,10));
eq([stock.foodDays,stock.waterDays],[1,1],'actual carried food and water independently available');
const courses=db.characters[0].hmk.healthState.malnutritionEpisodes;
const starvation=courses.find(x=>x.kind==='starvation');
eq(starvation.nextDueMinute,at(5),'old onset advance due day 5');
eq(N.projectedVerifiedMalnutritionHealingMinute(db.journal,'c','p',db.campaignClock.minute,'starvation',starvation.nextDueMinute,
 {inventory:db.inventory,characters:db.characters}),at(3),'available carried ration forecasts day 3 healing automatically');
let projection=P.characterCarryProjection(db,'p');
 eq(projection.foodMinutes,1440,'one intact carried ration day');
 eq(projection.estimatedFoodMinutes,1320,'time indicator loses two elapsed hours in the active nutrition day');
 eq(projection.estimatedWaterMinutes,1320,'water time projection follows same 24h clock');
 let agenda=C.campaignCalendarAgenda(db.campaignClock,db.characters,db.journal,db.inventory);
const heal=agenda.all.find(x=>x.kind==='malnutrition-course'&&x.characterId==='p'&&x.description.startsWith('Starvation'));
eq(heal.minute,at(3),'the calendar shows day 3, not day 5');ok(heal.description.includes('automatický výdej'),'no eating click advertised');
advance(db,at(3));
const day=db.journal.filter(x=>x.calendarNutritionDay).at(-1).calendarNutritionDay;
eq([day.foodReceived,day.waterReceived],[1,1],'both personal supplies consumed in one authoritative 24h close');
eq(db.journal.filter(x=>x.calendarInventoryRationUse).length,1,'exactly one physical food debit');
eq(db.journal.filter(x=>x.calendarInventoryWaterUse).length,2,'exactly two half-gallon water debits');
eq(M.dueMalnutritionCases(db).map(x=>x.mode),['healing','healing'],'a full day causes healing, not obsolete advance');
eq(N.validateNutritionJournal(db.journal),true,'accounting replay validates');
eq(O.characterProvisionsOverview(db,'p').food.accessibleUnits,0,'food actually exhausted');
eq(O.characterProvisionsOverview(db,'p').water.accessibleGallons,0,'water actually exhausted');
eq(N.finishDueNutritionDays(db,{idFactory:id,stamp}).length,0,'cannot repeat same daily debit');
 eq(P.characterCarryProjection(db,'p').estimatedFoodMinutes,0,'food clock reflects exhausted inventory after true debit');
// Rejected: stored on an inaccessible mount, different actor, expired at
// closing time. Neither should bring a medical test forward.
for(const opts of [{slot:'stable'},{expiry:at(2,20)},{food:0.5}]){
 const other=fresh();advance(other,at(2));advance(other,at(2,10));addFoodWater(other,other.campaignClock.minute,opts);
 const value=N.personalNutritionStock(other,'c','p',at(2),at(3),at(2,10));
 const illness=other.characters[0].hmk.healthState.malnutritionEpisodes.find(x=>x.kind==='starvation');
 const forecast=N.projectedVerifiedMalnutritionHealingMinute(other.journal,'c','p',other.campaignClock.minute,'starvation',illness.nextDueMinute,
  {inventory:other.inventory,characters:other.characters});
 if(opts.slot==='stable'){eq([value.foodDays,value.waterDays],[0,0],'stored inventory not accessible');eq(forecast,null,'no stored forecast');}
 if(opts.expiry){eq(value.foodDays,0,'expiring before close not a safe full ration');eq(forecast,null,'expiry cannot fake full day');}
 if(opts.food===0.5){eq(value.foodDays,0.5,'half stock remains partial');eq(forecast,null,'half day cannot fake healing');}
}
// Unrestricted repeated day-to-day consumption: a single full ration is
// debited once and the next full day without supply creates a new onset.
const satisfied=fresh();addFoodWater(satisfied,at(1));advance(satisfied,at(2));
eq((satisfied.characters[0].hmk.healthState.malnutritionEpisodes||[]).length,0,'stock prevents onset');
eq(satisfied.journal.filter(x=>x.calendarInventoryWaterUse).length,2,'two water parts spent');
advance(satisfied,at(3));eq(satisfied.characters[0].hmk.healthState.malnutritionEpisodes.length,2,'without refill, starvation and thirst start after next unprovided full day');
// Weather: exact current campaign and day only; no duplicate d10 and no
// forward-looking GM shift; the day + night remain in the original proof.
const weatherDb=fresh(),clock=weatherDb.campaignClock;
eq(W.currentCampaignWeatherRows({journal:weatherDb.journal,clock}).length,0,'unconfirmed weather not invented');
const weather=T.trekWeatherDay({season:'spring',climate:'cool',landscape:'flat',temperatureD10:4,precipitationD10:2});
const first={id:id(),calendarCampaignId:'c',campaignMinute:at(1),calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:0,area:'Highlands',
 season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay:weather}};
const other={...first,id:id(),calendarTrekDayWeather:{...first.calendarTrekDayWeather,area:'Forest'}};
weatherDb.journal.push(first,other);
eq(W.currentCampaignWeatherRows({journal:weatherDb.journal,clock}).length,2,'two actual active areas individually shown');
const shiftWeather=T.trekWeatherDay({season:'spring',climate:'cool',landscape:'flat',temperatureD10:8,precipitationD10:10});
weatherDb.journal.push({id:id(),calendarCampaignId:'c',campaignMinute:at(1,12),calendarTrekWeatherShift:{format:'hmk-trek-gm-weather-shift-v1',dayIndex:0,area:'Highlands',weatherDay:shiftWeather}});
eq(W.currentCampaignWeatherRows({journal:weatherDb.journal,clock})[0].weather.temperatureD10,4,'future GM change ignored');
clock.minute=at(1,13);
const rows=W.currentCampaignWeatherRows({journal:weatherDb.journal,clock});
eq(rows[0].weather.temperatureD10,8,'latest GM change is visible immediately');
eq(rows[1].weather.temperatureD10,4,'the other area keeps its own weather');
eq(rows[0].changed,true,'GM change provenance visible');
clock.minute=at(2);
eq(W.currentCampaignWeatherRows({journal:weatherDb.journal,clock}).length,0,'yesterday weather not reused today');
// UI existence / version alignment
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
ok(app.includes('currentCampaignWeatherRows({journal:data.journal,clock})'),'actual weather summary in calendar heading');
ok(app.includes('inventory:data.inventory'),'full original inventory reaches the calendar gate');
console.log(`PASS ${passes} v93.736 carried stock, automatic nutrition, Healing and weather`);
