/** HMK 1.2 p.186: proof-based daily nutrition accounting, not a fabricated
 * inventory or completed malnutrition Course Roll. The GM explicitly opts
 * characters into a Foraging-only provisioning profile. Those without an
 * attested sole source are NOT automatically declared hungry or thirsty.
 * Only the GM's clock mutation closes a 24-hour interval. Receipts and
 * shortages are atomic; the daily ledger never advances the clock.
 */
import {availableSupplyLots,createSupplyUse} from './hmk-foraging-supply-ledger.js';
import {assertExclusiveForagingProven} from './hmk-inventory-provisions.js';
import {availableRationLots,createPhysicalRationUse,projectCampaignRationInventory} from './hmk-physical-ration-ledger.js';
import {availablePhysicalWater,createPhysicalWaterUse} from './hmk-physical-water-ledger.js';
import {dailyNutritionNeeds} from './hmk-nutrition-activity.js';
import {animalAccessForDay,animalLoadedItemAt,ANIMAL_USE_FORMAT} from './hmk-nutrition-animal-access.js';
import {needsAssistedIntake,assistedIntakeForDay} from './hmk-nutrition-assisted-intake.js';
export const NUTRITION_POLICY_FORMAT='hmk-nutrition-policy-v1';
export const NUTRITION_DAY_FORMAT='hmk-nutrition-day-v1';
const DAY=1440;
const check=(v,m)=>{if(!v)throw Error(m)};
const validMinute=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
const ration=x=>[0.5,1,2].includes(x);
const round=x=>Math.round(x*2)/2;
const policyEntries=(journal=[],campaignId)=>journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarNutritionPolicy?.format===NUTRITION_POLICY_FORMAT);
export function activeNutritionPolicies(journal=[],campaignId,actorIds=null){
 const byActor=new Map(),allowed=actorIds?new Set(actorIds):null;
 for(const row of policyEntries(journal,campaignId))if(!allowed||allowed.has(row.characterId))byActor.set(row.characterId,row);
 return [...byActor.values()].filter(row=>row.calendarNutritionPolicy.enabled!==false);
}
/** Explicitly confirmed source restriction, activity and climate. A different
 * carried ration source is not inferable from the Foraging supply ledger.
 */
export function createNutritionPolicy({campaignId,minute,actorId,foodNeed=1,waterNeed=1,foragingOnly=false,inventoryRations=false,inventoryWater=false,enabled=true,autoNeeds=false,gmProvisioned=false}={}){
 check(typeof campaignId==='string'&&campaignId&&validMinute(minute),'Denní režim potřebuje doložený čas kampaně');
 check(typeof actorId==='string'&&actorId,'Denní režim musí mít konkrétní postavu');
 check(ration(foodNeed)&&[0.5,1,2].includes(waterNeed)&&foodNeed<=1,'HMK 186: neplatný denní příděl');
 check(typeof autoNeeds==='boolean'&&(!autoNeeds||(foodNeed===1&&waterNeed===1)),'Automatický den vyžaduje běžný výchozí příděl 1/1');
 check(typeof gmProvisioned==='boolean'&&(!gmProvisioned||enabled===true),'GM zásobování může být jen aktivní režim');
 check(!gmProvisioned||(!foragingOnly&&!inventoryRations&&!inventoryWater),'GM zajištěné zásoby nesmějí vytvářet inventární ani Foraging výdej');
 check(typeof enabled==='boolean'&&typeof inventoryWater==='boolean'&&(!inventoryWater||inventoryRations===true),'Neplatný režim pitné vody');
 check(!enabled||gmProvisioned||(foragingOnly===true)!==(inventoryRations===true),'Vyžadováno doložení právě jednoho režimu: výhradně Foraging nebo vlastní fyzické příděly + Foraging');
 return {format:NUTRITION_POLICY_FORMAT,campaignId,minute,actorId,foodNeed,waterNeed,foragingOnly:enabled&&foragingOnly,enabled,
  ...(inventoryRations?{inventoryRations:true}:{}),...(inventoryWater?{inventoryWater:true}:{}),...(autoNeeds?{autoNeeds:true}:{}),...(gmProvisioned?{gmProvisioned:true}:{}),sourcePages:gmProvisioned?[186]:inventoryWater?[120,121,147,186]:inventoryRations?[120,147,186]:[147,186]};
}
const dayRecords=(journal,campaignId,actorId)=>journal.filter(x=>x.calendarCampaignId===campaignId&&x.characterId===actorId&&x.calendarNutritionDay?.format===NUTRITION_DAY_FORMAT);
/** A policy change is a dated source transition, not permission to erase
 * the unfinished old day's consumption or to reopen an already closed day.
 * HMK 186 has no arbitrary fractions of a 24-hour nutrition day. */
export function assertNutritionPolicyBoundary(journal=[],campaignId,actorId,atMinute){
 const previous=policyEntries(journal,campaignId).filter(x=>x.characterId===actorId).at(-1);
 if(!previous||previous.calendarNutritionPolicy.enabled===false)return true;
 const last=dayRecords(journal,campaignId,actorId).filter(x=>x.calendarNutritionDay.policyId===previous.id).at(-1);
 const start=last?.calendarNutritionDay.endMinute??previous.campaignMinute;
 check(atMinute===start || (atMinute>start&&(atMinute-start)%DAY===0),
  'Změnu zásobovacího režimu potvrďte na 24h hranici sledovaného dne; rozpracovaný den nelze zahodit.');
 return true;
}
/** First activation at a confirmed clock advance: existing character/campaign
 * policy decisions (including paused policies) are never overridden. No
 * inventory or medical result is fabricated by enrolling a member. */
export function enrollUnmonitoredNutrition(database,{fromMinute,idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(validMinute(fromMinute)&&fromMinute<=clock.minute&&typeof idFactory==='function'&&typeof stamp==='function',
  'Automatické sledování potřebuje potvrzený výchozí čas');
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const registered=new Set(policyEntries(database.journal,campaignId).map(x=>x.characterId));
 const allowed=new Set(clock.characterIds??database.characters.map(x=>x.id));const added=[];
 for(const actor of database.characters.filter(x=>allowed.has(x.id)&&!registered.has(x.id))){
  const proof=createNutritionPolicy({campaignId,minute:fromMinute,actorId:actor.id,
   autoNeeds:true,inventoryRations:true,inventoryWater:true});
  const row={id:idFactory(),characterId:actor.id,calendarCampaignId:campaignId,
   campaignMinute:fromMinute,createdAt:stamp(),title:'HMK · automatické sledování výživy',
   body:'Zahájeno při potvrzeném posunu času GM. Pouze skutečně doložené zdroje; bez fiktivního jídla či vody.',
   calendarNutritionPolicy:proof};
  database.journal.push(row);added.push(row);
 }
 return added;
}
/** Only genuinely carried assets are automatically reachable. Stock stored
 * on a stable animal or inside a chest remains owned but cannot be eaten
 * merely because the owner and the container exist in the same campaign.
 * Attested hand-off receipts are carried until explicitly relocated. */
function itemSlotAtMinute(database,campaignId,item,atMinute){
 // The inventory field is the CURRENT custody snapshot. Reconstruct an
 // earlier day's custody from immutable load/unload receipts, not from that
 // current snapshot (which might already reflect a later relocation).
 const events=(database.journal??[]).filter(j=>j.calendarCampaignId===campaignId&&
  j.stableHub574?.inventoryId===item.id&&
  ['inventory-load','inventory-unload'].includes(j.stableHub574.type));
 const recent=events.filter(j=>j.campaignMinute<=atMinute).at(-1);
 if(recent)return recent.stableHub574.type==='inventory-load'?'stable':'carried';
 const earliest=events.find(j=>j.campaignMinute>atMinute);
 if(earliest)return earliest.stableHub574.type==='inventory-load'?'carried':'stable';
 return item.slot;
}
function rationCustody(data,campaignId,actorId,itemId,start,end){
 const item=(data.inventory||[]).find(i=>i.id===itemId&&i.characterId===actorId);
 if(item&&['carried','main_hand','off_hand'].includes(itemSlotAtMinute(data,campaignId,item,end)))return null;
 const loaded=animalLoadedItemAt(data,campaignId,actorId,itemId,end);
 if(!loaded)return undefined;
 const access=animalAccessForDay(data,campaignId,actorId,loaded.animalId,start,end);
 return access?{animalId:loaded.animalId,loadId:loaded.loadId,accessId:access.id}:undefined;
}
function reachableFoodLots(database,campaignId,actorId,start,end){
 const inventory=new Map((database.inventory??[]).map(x=>[x.id,x]));
 return availableRationLots(database.journal,campaignId,actorId,end).flatMap(l=>{
  const item=inventory.get(l.itemId);
  if(!item)return database.journal.some(j=>j.id===l.sourceId&&j.calendarCampaignId===campaignId&&
    j.calendarInventoryRationTransfer?.recipientId===actorId&&j.calendarInventoryRationTransfer?.receivedItemId===l.itemId)?[{...l}]:[];
  if(item.characterId!==actorId)return [];
  const slot=itemSlotAtMinute(database,campaignId,item,end);
  if(['carried','main_hand','off_hand'].includes(slot))return [{...l}];
  if(slot!=='stable')return [];
  const animal=rationCustody(database,campaignId,actorId,l.itemId,start,end);
  return animal?[{...l,animal}]:[];
 });
}
function reachableWaterLots(database,campaignId,actorId,start,end){
 const inventory=new Map((database.inventory??[]).map(x=>[x.id,x]));
 return availablePhysicalWater(database.journal,campaignId,actorId,end).flatMap(l=>{
  const item=inventory.get(l.itemId);
  if(!item||item.characterId!==actorId)return [];
  const slot=itemSlotAtMinute(database,campaignId,item,end);
  if(slot==='carried')return [{...l}];
  if(slot!=='stable')return [];
  const animal=rationCustody(database,campaignId,actorId,l.itemId,start,end);
  return animal?[{...l,animal}]:[];
 });
}

const consumeBeforeDay=(journal,actorId,campaignId,start,end,unit,includeStart=false)=>round(journal.filter(x=>x.characterId===actorId&&x.calendarCampaignId===campaignId&&x.calendarForagingSupplyUse?.unit===unit&&
 x.calendarForagingSupplyUse?.disposition==='consumed'&&x.calendarForagingSupplyUse?.nutritionDayId===undefined&&
 (includeStart?x.campaignMinute>=start:x.campaignMinute>start)&&x.campaignMinute<=end).reduce((n,x)=>n+x.calendarForagingSupplyUse.quantity,0));
/** A deficit is **accounted**, not an applied medical ailment. The original
 * Starvation/Thirst onset, HR and Advance/Healing Rolls remain unresolved
 * until committed in the persistent ailment executor.
 */
export function nutritionRisk(journal=[],campaignId,actorId){
 const records=dayRecords(journal,campaignId,actorId).sort((a,b)=>a.calendarNutritionDay.endMinute-b.calendarNutritionDay.endMinute);
 const risks={starvation:false,thirst:false};
 for(const [unit,risk] of [['foodDays','starvation'],['waterDays','thirst']]){
  let zeros=0,halves=0;
  for(const row of records){const p=row.calendarNutritionDay,need=unit==='foodDays'?p.foodNeed:p.waterNeed,got=unit==='foodDays'?p.foodReceived:p.waterReceived;
   if(got>=need){zeros=0;halves=0;risks[risk]=false;continue;}
   if(got===0){zeros++;halves=0;}else if(got===need/2){halves++;zeros=0;}
   else {zeros=0;halves=0;}
   risks[risk]=zeros>=1||halves>=2;
  }
 }
 return risks;
}
/** When a common pool cannot cover several characters for one day, its
 * distribution is a GM choice, not something that follows from HMK or ID order.
 * Existing manual provisions are counted first; private dated stock is reserved
 * to its owner. Reject only a PARTIALLY sufficient common pool, not an empty
 * one (all short) nor a full one (all supplied). This preflight is read-only. */
function requireUnambiguousSharedAllocation(database,campaignId,cohort){
 if(cohort.length<2)return;
 const journal=database.journal;
 for(const unit of ['foodDays','waterDays']){
  const end=cohort[0].start+DAY;
  const demands=[];
  for(const c of cohort){
   const p=c.policy.calendarNutritionPolicy,actorId=c.policy.characterId;
   if(p.gmProvisioned===true)continue;
   const need=p.autoNeeds===true?dailyNutritionNeeds({journal,campaignId,actorId,policyId:c.policy.id,startMinute:c.start,endMinute:end}):{foodNeed:p.foodNeed,waterNeed:p.waterNeed};
   const required=unit==='foodDays'?need.foodNeed:need.waterNeed;
   const actor=database.characters.find(a=>a.id===actorId);
   if(needsAssistedIntake(actor)){
    const assistance=assistedIntakeForDay(journal,campaignId,actorId,c.start,end);
    check(assistance,'Postava '+(actor?.name||actorId)+' se nemůže sama stravovat. GM musí v Zásobování potvrdit skutečné podání i přijetí jídla a vody pro '+(c.start/DAY+1)+'. den před jeho uzávěrkou.');
    if(!(unit==='foodDays'?assistance.calendarNutritionAssistedIntake.foodAccepted:assistance.calendarNutritionAssistedIntake.waterAccepted))continue;
   }
   const manual=Math.min(required,consumeBeforeDay(journal,actorId,campaignId,c.start,end,unit,c.start===p.minute));
   let leftover=round(required-manual);
   const personal=unit==='foodDays'&&p.inventoryRations===true?
     reachableFoodLots(database,campaignId,actorId,c.start,end).reduce((n,l)=>n+l.remaining,0):
     unit==='waterDays'&&p.inventoryWater===true?
     reachableWaterLots(database,campaignId,actorId,c.start,end).reduce((n,l)=>n+l.remaining,0):0;
   leftover=round(Math.max(0,leftover-Math.min(leftover,personal)));
   if(leftover>0)demands.push({actorId,quantity:leftover});
  }
  if(demands.length<2)continue;
  const total=round(demands.reduce((n,x)=>n+x.quantity,0));
  const shared=round(availableSupplyLots(journal,campaignId).filter(l=>l.unit===unit&&l.minute<=end)
    .reduce((n,l)=>n+l.remaining,0));
  if(shared>0&&shared<total)throw Error('Společných zásob '+(unit==='waterDays'?'pitné vody':'potravy')+
   ' je méně, než potřebují současně zásobované postavy. GM musí nejdříve přidělit dostupné dávky jednotlivým postavám ve Společném zásobování; nelze je automaticky přidělit podle pořadí ID.');
 }
}
/** Called ONLY inside the confirmed GM clock mutation. Works for multi-day
 * jumps; no reruns or duplicate debits after reload. Avoid future lots and
 * count existing manually recorded food/water first. */
export function finishDueNutritionDays(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Nutriční účetnictví vyžaduje auditní identifikátory');
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const members=new Set(clock.characterIds??database.characters.map(c=>c.id));
 const policies=policyEntries(database.journal,campaignId).filter(x=>members.has(x.characterId));
 const completed=[];
 // Preserve every historically effective policy, even if a later GM decision
 // replaced or paused it. Process by day-end across all actors; no old policy
 // can spend supplies that became available only after a later timestamp.
 const cursors=policies.filter(x=>x.calendarNutritionPolicy.enabled!==false).map(policy=>{
  const last=dayRecords(database.journal,campaignId,policy.characterId).filter(x=>x.calendarNutritionDay.policyId===policy.id).at(-1);
  const successor=policies.slice(policies.indexOf(policy)+1).find(x=>x.characterId===policy.characterId);
  return {policy,start:last?.calendarNutritionDay.endMinute??policy.campaignMinute,
   limit:Math.min(clock.minute,successor?.campaignMinute??clock.minute)};
 });
 let steps=0;
 while(true){
  const due=cursors.filter(c=>c.start+DAY<=c.limit).sort((a,b)=>(a.start-b.start)||a.policy.characterId.localeCompare(b.policy.characterId))[0];
  if(!due)break;
  requireUnambiguousSharedAllocation(database,campaignId,cursors.filter(c=>c.start===due.start&&c.start+DAY<=c.limit));
  check(++steps<=3660,'Příliš mnoho nutričních dnů v jediném posunu; rozdělte dlouhý časový skok GM');
  const {policy,start}=due,end=start+DAY,actorId=policy.characterId,p=policy.calendarNutritionPolicy;
  const needs=p.autoNeeds===true?dailyNutritionNeeds({journal:database.journal,campaignId,actorId,policyId:policy.id,startMinute:start,endMinute:end}):
   {foodNeed:p.foodNeed,waterNeed:p.waterNeed};
  const actor=database.characters.find(c=>c.id===actorId);
  check(actor&&members.has(actorId),'Nutriční režim postavy mimo aktuální kampaň');
  // A dead character cannot keep consuming supplies and cannot be forced
  // into a new ration-source decision merely by a later GM clock advance.
  if(actor.hmk?.combatState?.shock==='KIA'){due.start=clock.minute;continue;}
  // A disabled character may possess food but cannot be assumed to ingest
  // it. This GM attestation is factual, not a new HMK rule or a die roll.
  const assistance=needsAssistedIntake(actor)?assistedIntakeForDay(database.journal,campaignId,actorId,start,end):null;
  if(needsAssistedIntake(actor))check(assistance,
   'Postava '+actor.name+' je neschopná samostatného příjmu. V Zásobování potvrďte GM skutečné podání/přijetí jídla a vody pro 24 hodin '+start+'–'+end+'; bez doložení nelze tento den automaticky uzavřít.');
  const assisted=assistance?.calendarNutritionAssistedIntake;
  // Character-specific purchased/owned rations invalidate a former
  // Foraging-only claim, unless all of that CAMPAIGN's physical stock has
  // really been debited in the immutable physical ration ledger.
  if(p.foragingOnly){assertExclusiveForagingProven({inventory:projectCampaignRationInventory(database.inventory??[],database.journal,campaignId),actorId});
   if(availablePhysicalWater(database.journal,campaignId,actorId,end).length)throw Error('Výhradní Foraging není prokázán: postava nese doloženou pitnou vodu.');}
  const automatic=[],received={};
  for(const [unit,required] of [['foodDays',needs.foodNeed],['waterDays',needs.waterNeed]]){
   const permitted=!assisted||(unit==='foodDays'?assisted.foodAccepted:assisted.waterAccepted);
   const manual=Math.min(required,consumeBeforeDay(database.journal,actorId,campaignId,start,end,unit,start===policy.campaignMinute));
   check(permitted||manual===0,'U postavy '+actor.name+' je ručně evidována spotřeba, přestože GM pro tento den výslovně nepotvrdil skutečné přijetí '+(unit==='foodDays'?'jídla':'vody')+'.');
   // A GM-certified source means resources exist, not that an unconscious
   // person swallowed them. It bypasses physical inventory, never care.
   if(p.gmProvisioned===true){received[unit]=permitted?required:0;continue;}
   if(!permitted){received[unit]=0;continue;}
   let remaining=round(required-manual);
   // Only a GM-attested, time-stamped physical ration stock can supply food.
   // Expired lots are NOT consumed, and carried waterskins do not imply water.
   if(unit==='foodDays'&&p.inventoryRations===true){
    while(remaining>0){
     const lot=reachableFoodLots(database,campaignId,actorId,start,end)[0];
     if(!lot)break;
     const quantity=Math.min(remaining,lot.remaining);
     const proof=createPhysicalRationUse({journal:database.journal,campaignId,actorId,minute:end,sourceId:lot.sourceId,quantity});
     proof.nutritionDayId=`${policy.id}:${end}`;
     const row={id:idFactory(),characterId:actorId,calendarCampaignId:campaignId,campaignMinute:end,createdAt:stamp(),
      title:'HMK · automatická fyzická potrava',body:`${quantity} food-days · ${actor.name} · inventární stack ${lot.itemId}; bez posunu času`,
      calendarInventoryRationUse:proof,
      ...(lot.animal?{calendarNutritionAnimalUse:{format:ANIMAL_USE_FORMAT,actorId,inventoryId:lot.itemId,...lot.animal}}:{})};
     database.journal.push(row);automatic.push(row);remaining=round(remaining-quantity);
    }
   }
   if(unit==='waterDays'&&p.inventoryWater===true){
    while(remaining>=0.5){
     const bottle=reachableWaterLots(database,campaignId,actorId,start,end)[0];if(!bottle)break;
     const proof=createPhysicalWaterUse({journal:database.journal,campaignId,actorId,minute:end,fillId:bottle.fillId});
     proof.nutritionDayId=`${policy.id}:${end}`;
     const row={id:idFactory(),characterId:actorId,calendarCampaignId:campaignId,campaignMinute:end,createdAt:stamp(),
      title:'HMK · automatický výdej pitné vody',body:`0,5 gal pitné vody · ${actor.name} · Waterskin ${bottle.itemId}; bez posunu času`,
      calendarInventoryWaterUse:proof,
      ...(bottle.animal?{calendarNutritionAnimalUse:{format:ANIMAL_USE_FORMAT,actorId,inventoryId:bottle.itemId,...bottle.animal}}:{})};
     database.journal.push(row);automatic.push(row);remaining=round(remaining-0.5);
    }
   }
   while(remaining>0){
    const lot=availableSupplyLots(database.journal,campaignId).find(l=>l.unit===unit&&l.minute<=end&&l.remaining>=0.5);
    if(!lot)break;
    const quantity=Math.min(remaining,lot.remaining);
    const recordId=idFactory();
    const proof=createSupplyUse({journal:database.journal,campaignId,minute:end,sourceId:lot.sourceId,resultIndex:lot.resultIndex,
     unit,quantity,actorId,disposition:'consumed'});
    proof.nutritionDayId=`${policy.id}:${end}`;
    const row={id:recordId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:end,createdAt:stamp(),
     title:'HMK · automatický denní příděl',body:`${quantity} ${unit} · ${actor.name} · zdroj ${lot.sourceId}; bez samostatného posunu času.`,calendarForagingSupplyUse:proof};
    database.journal.push(row);automatic.push(row);remaining=round(remaining-quantity);
   }
   received[unit]=round(required-remaining);
   // HMK 186 specifies 0, half and full daily rations; a quarter or
   // three-quarter ration cannot silently reset a Starvation/Thirst course.
   // Require a GM source/dose decision instead of inventing a rule.
   const fraction=required>0?received[unit]/required:0;
   check(fraction===0||fraction===0.5||fraction===1,
    'HMK 186 neurčuje zdravotní účinek čtvrtinových ani jiných nestandardních dávek '+
    (unit==='waterDays'?'vody':'potravy')+'. GM musí doložit plný, poloviční nebo nulový příděl.');
  }
  const dayProof={format:NUTRITION_DAY_FORMAT,policyId:policy.id,actorId,campaignId,startMinute:start,endMinute:end,
   foodNeed:needs.foodNeed,waterNeed:needs.waterNeed,foodReceived:received.foodDays,waterReceived:received.waterDays,
   foodShortfall:round(needs.foodNeed-received.foodDays),waterShortfall:round(needs.waterNeed-received.waterDays),
   automaticDebitIds:automatic.map(x=>x.id),medicalApplied:false,...(assistance?{assistedIntakeId:assistance.id}:{}),...(p.autoNeeds?{activityNeeds:needs}:{}),...(p.gmProvisioned?{gmProvisioned:true}:{}),sourcePages:[186]};
  const row={id:idFactory(),characterId:actorId,calendarCampaignId:campaignId,campaignMinute:end,createdAt:stamp(),
   title:'HMK · 24h zásobování · '+actor.name,
   body:`24h: potrava ${dayProof.foodReceived}/${needs.foodNeed}, voda ${dayProof.waterReceived}/${needs.waterNeed}; `+
    (p.gmProvisioned?'GM potvrdil průběžně zajištěný přístup bez inventárního výdeje. ':'')+
    (dayProof.foodShortfall||dayProof.waterShortfall?'Nedostatek – přezkoumat Starvation/Thirst podle HMK 186.':'Denní dávky účetně doložené.')+
    ' Lékařský Course/Healing Roll se bez výsledku neprovádí.',
   calendarNutritionDay:dayProof};
  database.journal.push(row);completed.push(row);due.start=end;
 }
 return completed;
}
/** Replay audit of policy/day identity and receipts. Older saves do not
 * carry these records and are unaffected. */
export function validateNutritionJournal(journal=[]){
 const known=new Map(),last=new Map(),days=new Set(),seen=new Map(),prior=[];
 for(const row of journal){
  const p=row.calendarNutritionPolicy;
  if(p){check(row.characterId===p.actorId&&row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&
   JSON.stringify(createNutritionPolicy({...p}))===JSON.stringify(p),'Poškozený nebo nedoložený denní režim');
   known.set(row.id,row);last.set(row.id,p.minute);
  }
  const physical=row.calendarInventoryRationUse;
  if(physical?.nutritionDayId){check(typeof physical.nutritionDayId==='string','Neplatný výdej fyzických dávek');
   if(!seen.has(physical.nutritionDayId))seen.set(physical.nutritionDayId,[]);seen.get(physical.nutritionDayId).push(row);}
  const water=row.calendarInventoryWaterUse;
  if(water?.nutritionDayId){check(typeof water.nutritionDayId==='string'&&water.nutritionDayId,'Poškozená vazba automatického výdeje vody');
   if(!seen.has(water.nutritionDayId))seen.set(water.nutritionDayId,[]);seen.get(water.nutritionDayId).push(row);}
  const use=row.calendarForagingSupplyUse;
  if(use?.nutritionDayId){check(typeof use.nutritionDayId==='string'&&use.nutritionDayId,'Poškozená vazba automatického výdeje');
   if(!seen.has(use.nutritionDayId))seen.set(use.nutritionDayId,[]);seen.get(use.nutritionDayId).push(row);
  }
  const d=row.calendarNutritionDay;
  if(!d){prior.push(row);continue;}
  const policy=known.get(d.policyId)?.calendarNutritionPolicy;
  const nextPolicy=journal.find(x=>x.calendarNutritionPolicy&&x.calendarCampaignId===d.campaignId&&
   x.characterId===d.actorId&&x.id!==d.policyId&&x.campaignMinute>=policy?.minute&&
   journal.indexOf(x)>journal.findIndex(y=>y.id===d.policyId));
  check(!nextPolicy||d.endMinute<=nextPolicy.campaignMinute,
   'Denní spotřeba překračuje doloženou změnu zásobovacího režimu');
  const effective=policy?.autoNeeds?dailyNutritionNeeds({journal:prior,campaignId:d.campaignId,actorId:d.actorId,policyId:d.policyId,startMinute:d.startMinute,endMinute:d.endMinute}):null;
  const assistance=d.assistedIntakeId?prior.find(x=>x.id===d.assistedIntakeId):null;
  if(d.assistedIntakeId)check(assistance?.calendarNutritionAssistedIntake?.format==='hmk-nutrition-assisted-intake-v1'&&
   assistance.calendarCampaignId===d.campaignId&&assistance.characterId===d.actorId&&
   assistance.calendarNutritionAssistedIntake.startMinute===d.startMinute&&
   assistance.calendarNutritionAssistedIntake.endMinute===d.endMinute,
   'Denní vyúčtování má neplatný či cizí doklad asistovaného příjmu.');
  const allowedFood=assistance?.calendarNutritionAssistedIntake.foodAccepted!==false;
  const allowedWater=assistance?.calendarNutritionAssistedIntake.waterAccepted!==false;
  const token=`${d.policyId}:${d.endMinute}`;
  check(d.format===NUTRITION_DAY_FORMAT&&policy?.enabled===true&&d.actorId===row.characterId&&d.actorId===policy.actorId&&
   d.campaignId===row.calendarCampaignId&&d.campaignId===policy.campaignId&&
   d.startMinute===last.get(d.policyId)&&d.endMinute===d.startMinute+DAY&&row.campaignMinute===d.endMinute&&
   ration(d.foodNeed)&&[0.5,1,2].includes(d.waterNeed)&&d.foodNeed===(effective?.foodNeed??policy.foodNeed)&&d.waterNeed===(effective?.waterNeed??policy.waterNeed)&&
   (!policy.autoNeeds||JSON.stringify(d.activityNeeds)===JSON.stringify(effective))&&
   (d.gmProvisioned===true)===(policy.gmProvisioned===true)&&
   [d.foodReceived,d.waterReceived,d.foodShortfall,d.waterShortfall].every(x=>Number.isFinite(x)&&x>=0&&Number.isInteger(x*2))&&
   round(d.foodReceived+d.foodShortfall)===d.foodNeed&&round(d.waterReceived+d.waterShortfall)===d.waterNeed&&
   d.medicalApplied===false&&JSON.stringify(d.sourcePages)==='[186]'&&!days.has(token),
   'Neplatná nebo duplicitní denní evidence HMK zásobování');
  const debitRows=seen.get(token)||[];
  const expectedFood=policy.gmProvisioned?(allowedFood?d.foodNeed:0):round(Math.min(d.foodNeed,consumeBeforeDay(prior,d.actorId,d.campaignId,d.startMinute,d.endMinute,'foodDays',d.startMinute===policy.minute))+
   debitRows.filter(x=>x.calendarForagingSupplyUse?.unit==='foodDays').reduce((n,x)=>n+x.calendarForagingSupplyUse.quantity,0)+
   debitRows.filter(x=>x.calendarInventoryRationUse?.unit==='foodDays').reduce((n,x)=>n+x.calendarInventoryRationUse.quantity,0));
  const expectedWater=policy.gmProvisioned?(allowedWater?d.waterNeed:0):round(Math.min(d.waterNeed,consumeBeforeDay(prior,d.actorId,d.campaignId,d.startMinute,d.endMinute,'waterDays',d.startMinute===policy.minute))+
   debitRows.filter(x=>x.calendarForagingSupplyUse?.unit==='waterDays').reduce((n,x)=>n+x.calendarForagingSupplyUse.quantity,0)+
   debitRows.filter(x=>x.calendarInventoryWaterUse?.unit==='waterDays').reduce((n,x)=>n+x.calendarInventoryWaterUse.quantity,0));
  check(d.foodReceived===expectedFood&&d.waterReceived===expectedWater&&(!policy.gmProvisioned||debitRows.length===0)&&
   (allowedFood||d.foodReceived===0)&&(allowedWater||d.waterReceived===0),
   'Doložená denní spotřeba neodpovídá výdejům nebo skutečnému příjmu potvrzenému GM');
  check(JSON.stringify(d.automaticDebitIds)===JSON.stringify(debitRows.map(x=>x.id))&&
   debitRows.every(x=>x.characterId===d.actorId&&x.calendarCampaignId===d.campaignId&&x.campaignMinute===d.endMinute),
   'Automatické denní dávky nemají souvislý audit původu');
  days.add(token);last.set(d.policyId,d.endMinute);prior.push(row);
 }
 for(const [token] of seen)check(days.has(token),'Osiřelý automatický výdej denních dávek');
 return true;
}
export function assertNutritionJournalAppendOnly(previous=[],next=[]){
 const ids=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarNutritionPolicy||row.calendarNutritionDay){
  check(ids.has(row.id)&&JSON.stringify(ids.get(row.id))===JSON.stringify(row),'Původní denní výživu ani její rozhodnutí nelze běžně přepsat');
 }
 return true;
}
