/** HMK 1.2 p.186: proof-based daily nutrition accounting, not a fabricated
 * inventory or completed malnutrition Course Roll. The GM explicitly opts
 * characters into a Foraging-only provisioning profile. Those without an
 * attested sole source are NOT automatically declared hungry or thirsty.
 * Only the GM's clock mutation closes a 24-hour interval. Receipts and
 * shortages are atomic; the daily ledger never advances the clock.
 */
import {availableSupplyLots,createSupplyUse} from './hmk-foraging-supply-ledger.js';
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
export function createNutritionPolicy({campaignId,minute,actorId,foodNeed=1,waterNeed=1,foragingOnly=false,enabled=true}={}){
 check(typeof campaignId==='string'&&campaignId&&validMinute(minute),'Denní režim potřebuje doložený čas kampaně');
 check(typeof actorId==='string'&&actorId,'Denní režim musí mít konkrétní postavu');
 check(ration(foodNeed)&&[0.5,1,2].includes(waterNeed)&&foodNeed<=1,'HMK 186: neplatný denní příděl');
 check(typeof enabled==='boolean','Neplatná volba aktivity denního režimu');
 check(!enabled||foragingOnly===true,'Automatickou spotřebu lze zapnout jen při doložení, že nejsou jiné zdroje potravy či vody');
 return {format:NUTRITION_POLICY_FORMAT,campaignId,minute,actorId,foodNeed,waterNeed,foragingOnly:enabled,enabled,sourcePages:[147,186]};
}
const dayRecords=(journal,campaignId,actorId)=>journal.filter(x=>x.calendarCampaignId===campaignId&&x.characterId===actorId&&x.calendarNutritionDay?.format===NUTRITION_DAY_FORMAT);
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
   if(got>=need){zeros=0;halves=0;continue;}
   if(got===0){zeros++;halves=0;}else if(got===need/2){halves++;zeros=0;}
   else {zeros=0;halves=0;}
   if(zeros>=1||halves>=2)risks[risk]=true;
  }
 }
 return risks;
}
/** Called ONLY inside the confirmed GM clock mutation. Works for multi-day
 * jumps; no reruns or duplicate debits after reload. Avoid future lots and
 * count existing manually recorded food/water first. */
export function finishDueNutritionDays(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Nutriční účetnictví vyžaduje auditní identifikátory');
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const members=new Set(clock.characterIds??database.characters.map(c=>c.id));
 const policies=activeNutritionPolicies(database.journal,campaignId,[...members]).sort((a,b)=>a.characterId.localeCompare(b.characterId));
 const completed=[];
 // Process in CHRONOLOGICAL order across all actors, not each actor's entire
 // history first: the first hungry person cannot claim a future resource.
 const cursors=policies.map(policy=>{
  const last=dayRecords(database.journal,campaignId,policy.characterId).filter(x=>x.calendarNutritionDay.policyId===policy.id).at(-1);
  return {policy,start:last?.calendarNutritionDay.endMinute??policy.campaignMinute};
 });
 let steps=0;
 while(true){
  const due=cursors.filter(c=>c.start+DAY<=clock.minute).sort((a,b)=>(a.start-b.start)||a.policy.characterId.localeCompare(b.policy.characterId))[0];
  if(!due)break;
  check(++steps<=3660,'Příliš mnoho nutričních dnů v jediném posunu; rozdělte dlouhý časový skok GM');
  const {policy,start}=due,end=start+DAY,actorId=policy.characterId,p=policy.calendarNutritionPolicy;
  const actor=database.characters.find(c=>c.id===actorId);
  check(actor&&members.has(actorId),'Nutriční režim postavy mimo aktuální kampaň');
  // A dead character cannot keep automatically consuming supplies.
  if(actor.hmk?.combatState?.shock==='KIA'){due.start=clock.minute;continue;}
  const automatic=[],received={};
  for(const [unit,required] of [['foodDays',p.foodNeed],['waterDays',p.waterNeed]]){
   const manual=Math.min(required,consumeBeforeDay(database.journal,actorId,campaignId,start,end,unit,start===policy.campaignMinute));
   let remaining=round(required-manual);
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
  }
  const dayProof={format:NUTRITION_DAY_FORMAT,policyId:policy.id,actorId,campaignId,startMinute:start,endMinute:end,
   foodNeed:p.foodNeed,waterNeed:p.waterNeed,foodReceived:received.foodDays,waterReceived:received.waterDays,
   foodShortfall:round(p.foodNeed-received.foodDays),waterShortfall:round(p.waterNeed-received.waterDays),
   automaticDebitIds:automatic.map(x=>x.id),medicalApplied:false,sourcePages:[186]};
  const row={id:idFactory(),characterId:actorId,calendarCampaignId:campaignId,campaignMinute:end,createdAt:stamp(),
   title:'HMK · 24h zásobování · '+actor.name,
   body:`24h: potrava ${dayProof.foodReceived}/${p.foodNeed}, voda ${dayProof.waterReceived}/${p.waterNeed}; `+
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
  const use=row.calendarForagingSupplyUse;
  if(use?.nutritionDayId){check(typeof use.nutritionDayId==='string'&&use.nutritionDayId,'Poškozená vazba automatického výdeje');
   if(!seen.has(use.nutritionDayId))seen.set(use.nutritionDayId,[]);seen.get(use.nutritionDayId).push(row);
  }
  const d=row.calendarNutritionDay;
  if(!d){prior.push(row);continue;}
  const policy=known.get(d.policyId)?.calendarNutritionPolicy;
  const token=`${d.policyId}:${d.endMinute}`;
  check(d.format===NUTRITION_DAY_FORMAT&&policy?.enabled===true&&d.actorId===row.characterId&&d.actorId===policy.actorId&&
   d.campaignId===row.calendarCampaignId&&d.campaignId===policy.campaignId&&
   d.startMinute===last.get(d.policyId)&&d.endMinute===d.startMinute+DAY&&row.campaignMinute===d.endMinute&&
   ration(d.foodNeed)&&[0.5,1,2].includes(d.waterNeed)&&d.foodNeed===policy.foodNeed&&d.waterNeed===policy.waterNeed&&
   [d.foodReceived,d.waterReceived,d.foodShortfall,d.waterShortfall].every(x=>Number.isFinite(x)&&x>=0&&Number.isInteger(x*2))&&
   round(d.foodReceived+d.foodShortfall)===d.foodNeed&&round(d.waterReceived+d.waterShortfall)===d.waterNeed&&
   d.medicalApplied===false&&JSON.stringify(d.sourcePages)==='[186]'&&!days.has(token),
   'Neplatná nebo duplicitní denní evidence HMK zásobování');
  const debitRows=seen.get(token)||[];
  const expectedFood=round(Math.min(d.foodNeed,consumeBeforeDay(prior,d.actorId,d.campaignId,d.startMinute,d.endMinute,'foodDays',d.startMinute===policy.minute))+
   debitRows.filter(x=>x.calendarForagingSupplyUse.unit==='foodDays').reduce((n,x)=>n+x.calendarForagingSupplyUse.quantity,0));
  const expectedWater=round(Math.min(d.waterNeed,consumeBeforeDay(prior,d.actorId,d.campaignId,d.startMinute,d.endMinute,'waterDays',d.startMinute===policy.minute))+
   debitRows.filter(x=>x.calendarForagingSupplyUse.unit==='waterDays').reduce((n,x)=>n+x.calendarForagingSupplyUse.quantity,0));
  check(d.foodReceived===expectedFood&&d.waterReceived===expectedWater,'Doložená denní spotřeba neodpovídá výdejům');
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
