/** Keeper's Ledger – trekking day overview, HMK 1.2 pp. 141–150.
 * Pure projection only. A day plan is a documented intention, NOT a weather
 * roll, travel proof, medical event, time commitment or permission to spend.
 * Historical Trekking/END evidence remains the single source of actual events.
 */
export const TREK_DAY_PLAN_FORMAT='hmk-trekking-day-plan-v1';
export const TREK_WATCH_CANCEL_FORMAT='hmk-trekking-watch-intent-cancel-v1';
export const TREK_WATCH_REACTIVATE_FORMAT='hmk-trekking-watch-intent-reactivate-v1';
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
/** Current cancellation is a projection of immutable cancel/reactivate receipts.
 * Each reactivation must refer to the EXACT cancellation it reverses. */
export function cancelledTrekWatchIntents(journal=[],campaignId,planRecord){
 if(!planRecord)return new Map();
 const result=new Map();
 for(const row of journal){
  const c=row.calendarTrekWatchCancel;
  if(c?.format===TREK_WATCH_CANCEL_FORMAT&&row.calendarCampaignId===campaignId&&c.planId===planRecord.id){
   result.set(c.watchIndex,{...c,receiptId:row.id});
  }
  const r=row.calendarTrekWatchReactivate;
  if(r?.format===TREK_WATCH_REACTIVATE_FORMAT&&row.calendarCampaignId===campaignId&&r.planId===planRecord.id){
   if(result.get(r.watchIndex)?.receiptId===r.cancelId)result.delete(r.watchIndex);
  }
 }
 return result;
}
/** v93.617: A watch restored with revised parameters uses its own confirmed
 * immutable configuration. Legacy reactivations (without it) remain readable. */
export function reactivatedTrekWatchConfiguration(journal=[],campaignId,planRecord,watchIndex){
 if(!planRecord||cancelledTrekWatchIntents(journal,campaignId,planRecord).has(watchIndex))return null;
 const latest=[...journal].reverse().find(row=>row.calendarCampaignId===campaignId&&
  row.calendarTrekWatchReactivate?.format===TREK_WATCH_REACTIVATE_FORMAT&&
  row.calendarTrekWatchReactivate.planId===planRecord.id&&
  row.calendarTrekWatchReactivate.watchIndex===watchIndex);
 return latest?.calendarTrekWatchReactivate?.watchContext??null;
}
export function effectiveTrekWatchIntents(journal=[],campaignId,planRecord){
 const raw=planRecord?.calendarTrekDayPlan?.watchIntents??Array(6).fill('none');
 const cancelled=cancelledTrekWatchIntents(journal,campaignId,planRecord);
 return raw.map((name,index)=>{
  if(cancelled.has(index))return 'none';
  const latest=[...journal].reverse().find(row=>row.calendarCampaignId===campaignId&&
   row.calendarTrekWatchReactivate?.format===TREK_WATCH_REACTIVATE_FORMAT&&
   row.calendarTrekWatchReactivate.planId===planRecord?.id&&
   row.calendarTrekWatchReactivate.watchIndex===index);
  return latest?.calendarTrekWatchReactivate?.watchIntent??name;
 });
}
export function validateTrekWatchCancelRecord(row,journal=[]){
 const c=row?.calendarTrekWatchCancel;
 if(!c||c.format!==TREK_WATCH_CANCEL_FORMAT||typeof row.id!=='string'||!row.id||
  !Number.isSafeInteger(c.dayIndex)||c.dayIndex<0||!Number.isInteger(c.watchIndex)||c.watchIndex<0||c.watchIndex>5||
  typeof c.planId!=='string'||!c.planId||typeof row.calendarCampaignId!=='string'||!row.calendarCampaignId||
  typeof row.characterId!=='string'||!row.characterId||!Number.isSafeInteger(row.campaignMinute)||
  row.campaignMinute!==c.effectiveMinute||Math.floor(row.campaignMinute/1440)!==c.dayIndex||
  (row.campaignMinute<c.dayIndex*1440+c.watchIndex*240
   ? typeof c.reason!=='string'||c.reason.length>240
   : !validText(c.reason,240)||c.reason.trim().length<3))throw Error('Zrušení hlídky nemá platný čas, důvod nebo vazbu na kampaň.');
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
/** Re-activation is allowed only before the planned four-hour watch begins.
 * It never rewrites earlier history and does not commit any activity. */
export function validateTrekWatchReactivateRecord(row,journal=[]){
 const r=row?.calendarTrekWatchReactivate;
 if(!r||r.format!==TREK_WATCH_REACTIVATE_FORMAT||typeof row.id!=='string'||!row.id||
  !Number.isSafeInteger(r.dayIndex)||r.dayIndex<0||!Number.isInteger(r.watchIndex)||r.watchIndex<0||r.watchIndex>5||
  typeof r.planId!=='string'||!r.planId||typeof r.cancelId!=='string'||!r.cancelId||
  typeof row.calendarCampaignId!=='string'||!row.calendarCampaignId||
  typeof row.characterId!=='string'||!row.characterId||!Number.isSafeInteger(row.campaignMinute)||
  row.campaignMinute!==r.effectiveMinute||Math.floor(row.campaignMinute/1440)!==r.dayIndex||
  row.campaignMinute>=r.dayIndex*1440+r.watchIndex*240)
  throw Error('Opětovná aktivace je možná pouze pro budoucí hlídku a platný čas kampaně.');
 const plan=journal.find(j=>j.id===r.planId);
 const cancel=journal.find(j=>j.id===r.cancelId);
 // Pre-v93.617 receipts did not contain revised watch details; preserve them.
 // New reactivations must provide BOTH the chosen activity and a complete,
 // validated watch-specific context rather than silently reviving old values.
 if(r.watchIntent!==undefined||r.watchContext!==undefined){
  if(!['travel','rest','sleep','foraging','watch','other'].includes(r.watchIntent)||
   !r.watchContext||typeof r.watchContext!=='object'||Array.isArray(r.watchContext))
   throw Error('Pro obnovení hlídky nejdříve vyberte novou činnost a vyplňte její nastavení.');
  validateTrekDayPlan({format:TREK_DAY_PLAN_FORMAT,dayIndex:r.dayIndex,
   ...r.watchContext,watchIntents:Array(6).fill('none')});
 }
 if(!plan||plan.calendarCampaignId!==row.calendarCampaignId||
  plan.calendarTrekDayPlan?.format!==TREK_DAY_PLAN_FORMAT||
  plan.calendarTrekDayPlan.dayIndex!==r.dayIndex||plan.characterId!==row.characterId||
  !plan.calendarTrekDayPlan.watchIntents?.[r.watchIndex]||plan.calendarTrekDayPlan.watchIntents[r.watchIndex]==='none'||
  !cancel||cancel.calendarCampaignId!==row.calendarCampaignId||
  cancel.calendarTrekWatchCancel?.format!==TREK_WATCH_CANCEL_FORMAT||
  cancel.calendarTrekWatchCancel.planId!==r.planId||cancel.calendarTrekWatchCancel.watchIndex!==r.watchIndex||
  cancel.campaignMinute>row.campaignMinute)
  throw Error('Opětovná aktivace musí navazovat na doložené zrušení stejné hlídky.');
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
     unresolved:(j.calendarTrekProof.unresolved??[]).filter(u=>!String(u).startsWith('Random Encounter')||!journal.some(r=>r.calendarCampaignId===campaignId&&r.calendarTrekEncounterGM?.sourceId===j.id)),
     encounterResolved:journal.some(r=>r.calendarCampaignId===campaignId&&r.calendarTrekEncounterGM?.sourceId===j.id),
     survivalRecorded:journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarTrekSkillSource?.sourceId===j.id&&x.calendarTrekSkillSource?.hazard==='survival'),
     survivalSV:(()=>{const row=journal.find(x=>x.calendarCampaignId===campaignId&&x.calendarTrekSkillSource?.sourceId===j.id&&x.calendarTrekSkillSource?.hazard==='survival');return Number.isFinite(row?.skillTestProof?.a?.sv)?row.skillTestProof.a.sv:Number.isFinite(row?.skillTestProof?.result?.sv)?row.skillTestProof.result.sv:null;})()}))};
 });
}
export function trekDayWeatherSummary(journal=[],campaignId,dayIndex){
 const voided=new Set(journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTrekWeatherVoid?.sourceId).map(j=>j.calendarTrekWeatherVoid.sourceId));
 const rows=journal.filter(j=>j.calendarCampaignId===campaignId&&!voided.has(j.id)&&(j.calendarTrekProof?.dayIndex===dayIndex||j.calendarTrekDayWeather?.dayIndex===dayIndex));
 const unique=new Map();
 for(const j of rows){const p=j.calendarTrekDayWeather??j.calendarTrekProof;const key=JSON.stringify([p.area,p.climate,p.season,p.landscape,p.alpine,p.aridDesert]);
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
 const activeCancellations=new Map();
 const idsAll=new Set();
 for(const row of journal){
  if(row?.id&&idsAll.has(row.id)&&(row.calendarTrekWatchCancel||row.calendarTrekWatchReactivate))
   throw Error('Duplicitní doklad změny plánu hlídky.');
  if(row?.id)idsAll.add(row.id);
  if(row?.calendarTrekWatchCancel){
   validateTrekWatchCancelRecord(row,journal);
   const c=row.calendarTrekWatchCancel;
   const key=JSON.stringify([row.calendarCampaignId,c.planId,c.watchIndex]);
   if(activeCancellations.has(key))throw Error('Stejná hlídka už má platné zrušení.');
   activeCancellations.set(key,row.id);
  }
  if(row?.calendarTrekWatchReactivate){
   validateTrekWatchReactivateRecord(row,journal);
   const r=row.calendarTrekWatchReactivate;
   const key=JSON.stringify([row.calendarCampaignId,r.planId,r.watchIndex]);
   if(activeCancellations.get(key)!==r.cancelId)
    throw Error('Hlídku lze znovu aktivovat pouze po platném zrušení.');
   activeCancellations.delete(key);
  }
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
 for(const field of ['calendarTrekWatchCancel','calendarTrekWatchReactivate']){
  const retained=new Map(after.filter(j=>j?.[field]).map(j=>[j.id,j]));
  for(const old of before){if(!old?.[field])continue;
   const row=retained.get(old.id);
   if(!row||JSON.stringify(row)!==JSON.stringify(old))
    throw Error('Historický doklad změny plánované hlídky nelze změnit ani smazat.');
  }
 }
 return true;
}
