/** HMK 1.2 p.148 Equipment F/CF: a subsequent printed four-hour period is
 * consumed by (un)successful repairs. Keeper's Ledger uses arbitrary minute
 * intervals; splitting 240 reference minutes is an explicitly documented
 * implementation adaptation, NOT text of the printed HMK rule.
 *
 * Source records and work receipts are append-only and replayed from the
 * actual episode journal. No new Skill Test, die, health event or travel
 * distance is manufactured during the timed work.
 */
export const EQUIPMENT_TIME_WORK_FORMAT_93844='hmk-equipment-minute-work-v93.844';
export const EQUIPMENT_TIME_POLICY_93844='hmk-148-240-minute-splittable-v93.844';
export const EQUIPMENT_TIME_MINUTES_93844=240;
const fail=(message)=>{throw Error('Equipment · minutová oprava: '+message);};
const same=(a,b)=>JSON.stringify([...(a||[])].sort())===JSON.stringify([...(b||[])].sort());
const overlap=(a,b)=>(a||[]).some(id=>(b||[]).includes(id));
const isInt=n=>Number.isSafeInteger(n)&&n>=0;
function sourceOf(row){
 const e=row?.calendarTimeEpisode;
 const h=e?.hazardDetails?.find(h=>h.hazard==='equipment'&&
  h.equipmentMinutePolicy===EQUIPMENT_TIME_POLICY_93844&&['long-delay','irreparable'].includes(h.result));
 if(!h)return null;
 return {sourceEpisodeId:row.id,campaignId:row.calendarCampaignId,sourceStart:e.startMinute,
  sourceEnd:e.endMinute,memberIds:[...e.memberIds],itemId:h.itemId,itemOwnerId:h.itemOwnerId,
  repairProofId:h.repairProofId,repairWorkerId:h.workerId,result:h.result,requiredMinutes:EQUIPMENT_TIME_MINUTES_93844};
}
/** At a specified start minute, calculate *only* old, already committed work.
 * A pending obligation belongs to the original party, not the guide alone.
 */
export function pendingEquipmentTimeWork93844(journal=[],campaignId,minute=Infinity,memberIds=null){
 const sources=journal.filter(row=>row.calendarCampaignId===campaignId&&sourceOf(row)?.sourceEnd<=minute).map(sourceOf);
 const jobs=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimeEpisode?.equipmentTimeWork93844&&
  row.calendarTimeEpisode.startMinute<minute);
 return sources.map(source=>{
  const work=jobs.filter(j=>j.calendarTimeEpisode.equipmentTimeWork93844.sourceEpisodeId===source.sourceEpisodeId);
  const worked=work.reduce((sum,j)=>sum+j.calendarTimeEpisode.minutes,0);
  return {...source,workedMinutes:worked,remainingMinutes:source.requiredMinutes-worked};
 }).filter(s=>s.remainingMinutes>0&&(memberIds===null||overlap(s.memberIds,memberIds)));
}
/** Build one explicitly confirmed work receipt for an entire *user-entered*
 * time episode; the original repair d100 belongs to the previous episode.
 */
export function equipmentTimeWorkReceipt93844({journal=[],campaignId,minute,minutes,memberIds,sourceEpisodeId}={}){
 if(!isInt(minute)||!Number.isSafeInteger(minutes)||minutes<1||minutes>10080||
  !Array.isArray(memberIds)||!memberIds.length||new Set(memberIds).size!==memberIds.length)
  fail('neplatný čas nebo účastníci.');
 const pending=pendingEquipmentTimeWork93844(journal,campaignId,minute,memberIds);
 const source=pending.find(s=>s.sourceEpisodeId===sourceEpisodeId);
 if(!source||!memberIds.includes(source.repairWorkerId)||!memberIds.every(id=>source.memberIds.includes(id))||source.sourceEnd>minute)
  fail('není doložené právě tato povinnost původní družiny.');
 if(minutes>source.remainingMinutes)fail('interval přesahuje zbývajících '+source.remainingMinutes+' minut opravy.');
 const remaining=source.remainingMinutes-minutes;
 return {format:EQUIPMENT_TIME_WORK_FORMAT_93844,policy:EQUIPMENT_TIME_POLICY_93844,
  sourcePage:148,sourceEpisodeId,itemId:source.itemId,itemOwnerId:source.itemOwnerId,
  repairProofId:source.repairProofId,repairWorkerId:source.repairWorkerId,sourceResult:source.result,
  partyIds:[...source.memberIds],requiredMinutes:source.requiredMinutes,
  beforeMinutes:source.workedMinutes,workedMinutes:minutes,remainingMinutes:remaining,
  disposition:remaining?'in-progress':source.result==='long-delay'?'repaired':'abandoned'};
}
/** Replay the whole journal; block every later member-overlapping episode
 * until its party has a witnessed repair action. Other parties can continue.
 * Legacy receipts are intentionally untouched (no fabricated past work).
 */
export function validateEquipmentTimeWork93844(journal=[]){
 const campaigns=new Set(journal.filter(j=>j.calendarTimeEpisode).map(j=>j.calendarCampaignId));
 for(const cid of campaigns){
  const chronological=journal.filter(j=>j.calendarCampaignId===cid&&j.calendarTimeEpisode)
   .sort((a,b)=>a.calendarTimeEpisode.startMinute-b.calendarTimeEpisode.startMinute||
    journal.indexOf(a)-journal.indexOf(b));
  const seen=[];
  for(const row of chronological){
   const ep=row.calendarTimeEpisode;
   const pending=pendingEquipmentTimeWork93844(seen,cid,ep.startMinute,ep.memberIds);
   if(pending.length>1)fail('více souběžných nevyřešených oprav stejné skupiny.');
   const duty=pending[0],receipt=ep.equipmentTimeWork93844;
   if(duty){
    const isWorker=ep.memberIds.includes(duty.repairWorkerId);
    if(ep.kind==='travel')fail('Pochod je zakázaný, dokud opravář neodpracuje Equipment F/CF ('+duty.remainingMinutes+' min).');
    if(isWorker){
     if(ep.kind!=='other'||!receipt)fail('opravář nesmí přeskočit povinnou činnost '+duty.sourceEpisodeId+'.');
     const expected=equipmentTimeWorkReceipt93844({journal:seen,campaignId:cid,minute:ep.startMinute,
      minutes:ep.minutes,memberIds:ep.memberIds,sourceEpisodeId:duty.sourceEpisodeId});
     if(JSON.stringify(receipt)!==JSON.stringify(expected))fail('doklad opravy nebo odečtené minuty nesouhlasí s pravidlem.');
    }else if(receipt)fail('cizí postava nemůže odpracovat původní opravářský test.');
   }else if(receipt)fail('čas opravy bez předcházející povinnosti.');
   const own=sourceOf(row);
   if(own){
    if(!own.itemId||!own.itemOwnerId||!own.repairProofId||!own.repairWorkerId||
     !ep.memberIds.includes(own.itemOwnerId)||!ep.memberIds.includes(own.repairWorkerId))
     fail('zdrojový Equipment Hazard nemá skutečný předmět, opraváře a hod.');
   }
   seen.push(row);
  }
 }
 return true;
}
/** The current inventory must not show a new unsolved F/CF item as healthy.
 * Historical sources are intentionally excluded from this v93.844 invariant.
 */
export function validateEquipmentTimeInventory93844(data){
 const clock=data?.campaignClock;
 if(!clock)return true;
 const cid=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const all=(data.journal||[]).filter(row=>row.calendarCampaignId===cid&&sourceOf(row));
 for(const row of all){
  const src=sourceOf(row);
  const pending=pendingEquipmentTimeWork93844(data.journal,cid,Infinity).find(d=>d.sourceEpisodeId===src.sourceEpisodeId);
  const target=(data.inventory||[]).find(i=>i.id===src.itemId&&i.characterId===src.itemOwnerId);
  if(pending){
   if(!target||target.hmkEquipmentRepair?.sourceEpisodeId!==src.sourceEpisodeId||
    target.hmkEquipmentRepair?.status!==(src.result==='long-delay'?'damaged':'irreparable')||
    target.hmkEquipmentRepair?.workPolicy!==EQUIPMENT_TIME_POLICY_93844)
    fail('nevyřešený předmět byl předčasně obnoven nebo odstraněn.');
  }else if(src.result==='irreparable'&&target)fail('po dokončených neúspěšných opravách zůstal neodložený předmět.');
 }
 return true;
}
