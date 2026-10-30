/** Keeper's Ledger – trekking day overview, HMK 1.2 pp. 141–150.
 * Pure projection only. A day plan is a documented intention, NOT a weather
 * roll, travel proof, medical event, time commitment or permission to spend.
 * Historical Trekking/END evidence remains the single source of actual events.
 */
export const TREK_DAY_PLAN_FORMAT='hmk-trekking-day-plan-v1';
export const TREK_WATCH_CANCEL_FORMAT='hmk-trekking-watch-intent-cancel-v1';
const validText=(v,n=90)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const oneOf=(v,items)=>items.includes(v);
export function validateTrekDayPlan(value){
 if(!value||value.format!==TREK_DAY_PLAN_FORMAT||!Number.isSafeInteger(value.dayIndex)||value.dayIndex<0)
  throw Error('Neplatný den cestovního plánu.');
 if(!validText(value.area)||!oneOf(value.climate,['subpolar','cool','warm','subtropical','dry-tropical','wet-tropical'])||
 !oneOf(value.landscape,['flat','rough','mountain'])||
 !oneOf(value.conveyance,['foot','mount','cart','wagon'])||
 !oneOf(value.environ,['highway','rural','wilderness','underworld'])||!validText(value.terrain,40))
  throw Error('Denní plán má neplatnou oblast nebo prostředí.');
 if(!validText(value.guideId,128)||!Array.isArray(value.memberIds)||!value.memberIds.includes(value.guideId)||
 value.memberIds.length===0||new Set(value.memberIds).size!==value.memberIds.length||
 !value.memberIds.every(x=>validText(x,128)))throw Error('Denní plán musí obsahovat průvodce a doložené členy družiny.');
 if(value.watchIntents!==undefined&&(!Array.isArray(value.watchIntents)||value.watchIntents.length!==6||
  !value.watchIntents.every(x=>['none','travel','rest','sleep','foraging','watch','other'].includes(x))))
  throw Error('Denní plán má neplatnou činnost hlídky.');
 if(!['auto','spring','summer','autumn','winter'].includes(value.season)||
 !['paved-road','unpaved-road','rural-track','wilderness-trail','cropland-grassland','mixed-woodland','cold-woodland','heath-moor','needleleaf-forest','mixed-forest','dunes','wetlands','alpine-vegetation','ice-snow-rockfield'].includes(value.terrain))
 throw Error('Neznámý terén či sezóna.');
 return value;
}
export function trekDayPlans(journal=[],campaignId,dayIndex){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTrekDayPlan?.format===TREK_DAY_PLAN_FORMAT&&
 j.calendarTrekDayPlan.dayIndex===dayIndex).map(j=>j.calendarTrekDayPlan);
}
export function latestTrekDayPlan(journal=[],campaignId,dayIndex){
 return trekDayPlans(journal,campaignId,dayIndex).at(-1)??null;
}
/** The last confirmed daily plan is the only authority for currently planned
 * slots. Cancellations refer to that exact immutable plan ID, never the day
 * number alone, so new explicitly confirmed revisions cannot be silently
 * modified by old cancellations. */
export function latestTrekDayPlanRecord(journal=[],campaignId,dayIndex){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTrekDayPlan?.format===TREK_DAY_PLAN_FORMAT&&
 j.calendarTrekDayPlan.dayIndex===dayIndex).at(-1)??null;
}
export function cancelledTrekWatchIntents(journal=[],campaignId,planRecord){
 if(!planRecord)return new Map();
 const result=new Map();
 for(const row of journal){const c=row.calendarTrekWatchCancel;
  if(c?.format!==TREK_WATCH_CANCEL_FORMAT||row.calendarCampaignId!==campaignId||c.planId!==planRecord.id)continue;
  result.set(c.watchIndex,{...c,receiptId:row.id});
 }
 return result;
}
export function effectiveTrekWatchIntents(journal=[],campaignId,planRecord){
 const raw=planRecord?.calendarTrekDayPlan?.watchIntents??Array(6).fill('none');
 const cancelled=cancelledTrekWatchIntents(journal,campaignId,planRecord);
 return raw.map((name,index)=>cancelled.has(index)?'none':name);
}
export function validateTrekWatchCancelRecord(row,journal=[]){
 const c=row?.calendarTrekWatchCancel;
 if(!c||c.format!==TREK_WATCH_CANCEL_FORMAT||typeof row.id!=='string'||!row.id||
  !Number.isSafeInteger(c.dayIndex)||c.dayIndex<0||!Number.isInteger(c.watchIndex)||c.watchIndex<0||c.watchIndex>5||
  typeof c.planId!=='string'||!c.planId||typeof row.calendarCampaignId!=='string'||!row.calendarCampaignId||
  typeof row.characterId!=='string'||!row.characterId||!Number.isSafeInteger(row.campaignMinute)||
  row.campaignMinute!==c.effectiveMinute||Math.floor(row.campaignMinute/1440)!==c.dayIndex||
  !validText(c.reason,240)||c.reason.trim().length<3)throw Error('Zrušení hlídky nemá platný čas, důvod nebo vazbu na kampaň.');
 const source=journal.find(j=>j.id===c.planId);
 if(!source||source.calendarCampaignId!==row.calendarCampaignId||
  source.calendarTrekDayPlan?.format!==TREK_DAY_PLAN_FORMAT||source.calendarTrekDayPlan.dayIndex!==c.dayIndex||
  source.characterId!==row.characterId||
  source.calendarTrekDayPlan.watchIntents?.[c.watchIndex]==='none'||
  !source.calendarTrekDayPlan.watchIntents?.[c.watchIndex]||
  !Number.isSafeInteger(source.campaignMinute)||source.campaignMinute>row.campaignMinute||
  row.campaignMinute >= c.dayIndex*1440+(c.watchIndex+1)*240)
  throw Error('Zrušení musí odkazovat na existující dosud platný plán, a to nejpozději před koncem hlídky.');
 return true;
}
export function previousTrekContext(journal=[],campaignId,minute){
 const previous=journal.filter(j=>j.calendarCampaignId===campaignId&&j.campaignMinute<=minute&&j.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1').at(-1);
 const p=previous?.calendarTrekProof;
 return p?{area:p.area,season:'auto',climate:p.climate,landscape:p.landscape,terrain:p.terrain,
 conveyance:p.conveyance,environ:p.modes?.environ??'rural',guideId:previous.characterId,
 memberIds:p.partyModes?.memberIds??[previous.characterId]}:null;
}
export function trekDailyWatchSlots(journal=[],campaignId,dayIndex,currentMinute){
 const start=dayIndex*1440;
 return Array.from({length:6},(_,index)=>{
  const from=start+index*240,to=from+240;
  const prepared=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&j.campaignMinute>=from&&j.campaignMinute<to);
  const completed=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarExpeditionProof&&j.campaignMinute>from&&j.campaignMinute<=to);
  return {index,from,to,preparedCount:prepared.length,completedCount:completed.length,
   atCurrent:currentMinute>=from&&currentMinute<to,phase:completed.length?'completed':prepared.length?'prepared':currentMinute>=to?'elapsed':currentMinute<from?'future':'open',
   area:prepared.at(-1)?.calendarTrekProof?.area??null,
   actualEvents:completed.length,
   preparedEvidence:prepared.map(j=>({id:j.id,guideId:j.characterId,area:j.calendarTrekProof.area,
     movement:j.calendarTrekProof.effectiveMovement??j.calendarTrekProof.movement,
     encounter:j.calendarTrekProof.encounter,weather:j.calendarTrekProof.weatherWatch,
     unresolved:j.calendarTrekProof.unresolved??[],
     survivalRecorded:journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarTrekSkillSource?.sourceId===j.id&&x.calendarTrekSkillSource?.hazard==='survival')}))};
 });
}
export function trekDayWeatherSummary(journal=[],campaignId,dayIndex){
 const rows=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTrekProof?.dayIndex===dayIndex);
 const unique=new Map();
 for(const j of rows){const p=j.calendarTrekProof;const key=JSON.stringify([p.area,p.climate,p.season,p.landscape,p.alpine,p.aridDesert]);
  if(!unique.has(key))unique.set(key,{area:p.area,weather:p.weatherDay});}
 return [...unique.values()];
}
/** Day intentions are never rewritten, rebased or silently cleared. */
export function validateTrekDayHistory(journal=[]){
 const ids=new Set();
 for(const row of journal){
  const plan=row?.calendarTrekDayPlan;
  if(!plan)continue;
  validateTrekDayPlan(plan);
  if(typeof row.id!=='string'||!row.id||ids.has(row.id)||
    typeof row.calendarCampaignId!=='string'||!row.calendarCampaignId||
    row.characterId!==plan.guideId||!Number.isSafeInteger(row.campaignMinute)||
    Math.floor(row.campaignMinute/1440)!==plan.dayIndex)
   throw Error('Denní cestovní plán není navázán na původní čas, kampaň a průvodce.');
  ids.add(row.id);
 }
 const canceledKeys=new Set();
 const idsAll=new Set();
 for(const row of journal){
  if(row?.id&&idsAll.has(row.id)&&row.calendarTrekWatchCancel)throw Error('Duplicitní ID dokladu zrušení hlídky.');
  if(row?.id)idsAll.add(row.id);
  if(!row?.calendarTrekWatchCancel)continue;
  validateTrekWatchCancelRecord(row,journal);
  const key=JSON.stringify([row.calendarCampaignId,row.calendarTrekWatchCancel.planId,row.calendarTrekWatchCancel.watchIndex]);
  if(canceledKeys.has(key))throw Error('Stejná hlídka už má potvrzené zrušení.');
  canceledKeys.add(key);
 }
 return true;
}
export function assertTrekDayAppendOnly(before=[],after=[]){
 const current=new Map(after.filter(j=>j?.calendarTrekDayPlan).map(j=>[j.id,j]));
 for(const old of before){if(!old?.calendarTrekDayPlan)continue;
  const row=current.get(old.id);
  if(!row||JSON.stringify(row)!==JSON.stringify(old))
   throw Error('Potvrzený denní plán není možné změnit ani smazat. Vytvořte nový potvrzený doklad.');
 }
 const cancellations=new Map(after.filter(j=>j?.calendarTrekWatchCancel).map(j=>[j.id,j]));
 for(const old of before){if(!old?.calendarTrekWatchCancel)continue;
  const row=cancellations.get(old.id);
  if(!row||JSON.stringify(row)!==JSON.stringify(old))
   throw Error('Historický doklad zrušení hlídky nelze změnit ani smazat.');
 }
 return true;
}
