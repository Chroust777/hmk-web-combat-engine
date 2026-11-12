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
/** Legacy compatibility: preserve the authenticity of ALREADY SAVED v93.844
 * work receipts; never require future work or block movement. The GM owns all
 * subsequent repair scheduling after v93.845. Past entries are not rewritten.
 */
export function validateEquipmentTimeWork93844(journal=[]){
 const history=[];
 for(const row of journal){
  const ep=row.calendarTimeEpisode;
  if(!ep)continue;
  const receipt=ep.equipmentTimeWork93844;
  if(receipt){
   const expected=equipmentTimeWorkReceipt93844({journal:history,campaignId:row.calendarCampaignId,
    minute:ep.startMinute,minutes:ep.minutes,memberIds:ep.memberIds,
    sourceEpisodeId:receipt.sourceEpisodeId});
   if(JSON.stringify(receipt)!==JSON.stringify(expected))fail('historický doklad již vykonané opravy byl změněn.');
  }
  history.push(row);
 }
 return true;
}
/** Inventory after v93.845 is GM-managed, not locked to a 240-minute counter.
 * Old 93.844 work receipts retain their immutable journal validation above.
 */
export function validateEquipmentTimeInventory93844(data){
 for(const item of data?.inventory||[]){
  const status=item.hmkEquipmentRepair;
  if(status?.gmManaged!==true||!['damaged','irreparable'].includes(status.status))continue;
  if(Number.isSafeInteger(status.originalWQ)&&item.currentWQ!==0)
   fail('GM: rozbitý předmět s WQ musí zachovat WQ 0.');
  if(['worn','main_hand','off_hand'].includes(item.slot))
   fail('GM: rozbitý předmět nesmí být oblečený ani v ruce.');
 }
 return true;
}
