/** Read-only campaign-specific nutrition dashboard.
 * HMK pp.120–121, 147, 184–186. Never invents receipts, allocations, water,
 * eating, hunger, or a medical roll from an empty inventory / missing policy.
 * Physical food, bottled potable water and shared Foraging lots stay distinct.
 */
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {activeNutritionPolicies} from './hmk-nutrition-days.js';
import {rationStockBalances,availableRationLots} from './hmk-physical-ration-ledger.js';
import {availablePhysicalWater} from './hmk-physical-water-ledger.js';
import {provenCarriedRations} from './hmk-inventory-provisions.js';
import {supplyBalances} from './hmk-foraging-supply-ledger.js';
const DAY=1440;
const rounded=x=>Math.round(x*2)/2;
const status=(got,need)=>got>=need?'full':got===0?'none':got===need/2?'half':'partial';
function lastDays(journal,campaignId,actorId){
 return journal.filter(row=>row.calendarCampaignId===campaignId&&row.characterId===actorId&&
   row.calendarNutritionDay?.format==='hmk-nutrition-day-v1')
  .sort((a,b)=>a.calendarNutritionDay.endMinute-b.calendarNutritionDay.endMinute);
}
/** Whole future closed days of *personal* edible rations. A lot must still be
 * fresh at each day's END, not merely fresh at the moment of inspection.
 * The GM's weather/activity may change the real daily need later.
 */
export function conservativeRationDays(lots=[],now=0,dailyNeed=1){
 if(!Number.isSafeInteger(now)||now<0||!(dailyNeed>0))return 0;
 const remaining=lots.map(x=>({...x})).filter(x=>x.remaining>=0.5&&x.expiresAt>=now&&x.minute<=now);
 let days=0;
 for(let day=1;day<=365;day++){
  const close=now+day*DAY;
  let need=dailyNeed;
  for(const lot of remaining.sort((a,b)=>a.expiresAt-b.expiresAt)){
   if(lot.expiresAt<close||lot.remaining<=0)continue;
   const taken=Math.min(need,lot.remaining);
   lot.remaining=rounded(lot.remaining-taken);need=rounded(need-taken);
   if(need===0)break;
  }
  if(need>0)break;
  days++;
 }
 return days;
}
export function characterProvisionsOverview(database,actorId){
 const clock=database?.campaignClock;
 if(!clock||!Number.isSafeInteger(clock.minute))return {available:false,reason:'Postava nemá aktivní kalendář kampaně.'};
 const campaignId=campaignKey(clock),now=clock.minute;
 const memberIds=clock.characterIds??(database.characters??[]).map(c=>c.id);
 const actor=database.characters?.find(c=>c.id===actorId);
 if(!actor||!memberIds.includes(actorId))return {available:false,reason:'Postava není účastníkem aktuální kampaně.'};
 const journal=database.journal??[];
 const confirmedStocks=rationStockBalances(journal,campaignId,actorId,now);
 const fresh=availableRationLots(journal,campaignId,actorId,now);
 const foodUnits=rounded(fresh.reduce((sum,l)=>sum+l.remaining,0));
 const expiredFood=rounded(confirmedStocks.filter(l=>l.expiresAt<now&&l.remaining>0).reduce((sum,l)=>sum+l.remaining,0));
 const water=availablePhysicalWater(journal,campaignId,actorId,now);
 const waterGallons=rounded(water.reduce((sum,l)=>sum+l.remaining,0));
 const policy=activeNutritionPolicies(journal,campaignId,[actorId]).find(x=>x.characterId===actorId)??null;
 const records=lastDays(journal,campaignId,actorId);
 const foodNeed=policy?.calendarNutritionPolicy?.autoNeeds?1:policy?.calendarNutritionPolicy?.foodNeed??1;
 const waterNeed=policy?.calendarNutritionPolicy?.autoNeeds?1:policy?.calendarNutritionPolicy?.waterNeed??1;
 const currentPolicyRecords=policy?records.filter(r=>r.calendarNutritionDay.policyId===policy.id):[];
 const last=currentPolicyRecords.at(-1)?.calendarNutritionDay??null;
 const nextCloseMinute=policy?(currentPolicyRecords.at(-1)?.calendarNutritionDay.endMinute??policy.campaignMinute)+DAY:null;
 const illness=(actor.hmk?.combatState?.malnutritionEpisodes??[])
  .filter(e=>e.campaignId===campaignId&&e.status==='active')
  .map(e=>({kind:e.kind,hr:e.hr,nextDueMinute:e.nextDueMinute}));
 const attestedItemIds=new Set(confirmedStocks.map(l=>l.itemId));
 const baseline=provenCarriedRations(database.inventory??[],actorId).filter(l=>!attestedItemIds.has(l.itemId));
 return {available:true,actorId,campaignId,minute:now,
  food:{confirmedUnits:foodUnits,daysAtCurrentBaseline:conservativeRationDays(fresh,now,foodNeed),
   dailyBaseline:foodNeed,expiredUnits:expiredFood,
   unconfirmedInventoryUnits:rounded(baseline.reduce((n,l)=>n+l.foodDays,0)),
   lots:fresh.map(l=>({name:l.name,itemId:l.itemId,remaining:l.remaining,expiresAt:l.expiresAt}))},
  water:{confirmedGallons:waterGallons,daysAtCurrentBaseline:Math.floor(waterGallons/waterNeed),
   dailyBaseline:waterNeed,containers:water.map(l=>({itemId:l.itemId,remaining:l.remaining}))},
  policy:policy?{id:policy.id,foragingOnly:policy.calendarNutritionPolicy.foragingOnly===true,
    inventoryRations:policy.calendarNutritionPolicy.inventoryRations===true,
    autoNeeds:policy.calendarNutritionPolicy.autoNeeds===true,nextCloseMinute}:null,
  latestDay:last?{endMinute:last.endMinute,
    food:{received:last.foodReceived,need:last.foodNeed,status:status(last.foodReceived,last.foodNeed)},
    water:{received:last.waterReceived,need:last.waterNeed,status:status(last.waterReceived,last.waterNeed)}}:null,
  illness,
  // Zero provable receipts != proved deprivation. This result is deliberately
  // not a "fed" boolean nor a countdown to physiological starvation.
  nutritionEvidence:policy?(last?'last-closed-day':'awaiting-first-close'):'not-monitored'};
}
export function partyProvisionsOverview(database){
 const clock=database?.campaignClock;
 if(!clock)return {available:false,members:[],pooledForaging:null};
 const campaignId=campaignKey(clock),ids=clock.characterIds??(database.characters??[]).map(c=>c.id);
 return {available:true,members:ids.map(id=>({actor:database.characters.find(c=>c.id===id),
   supply:characterProvisionsOverview(database,id)})).filter(r=>r.actor&&r.supply.available),
   // A shared Foraging yield is not a personal ration or automatic ingestion.
   pooledForaging:supplyBalances(database.journal??[],campaignId).available};
}
