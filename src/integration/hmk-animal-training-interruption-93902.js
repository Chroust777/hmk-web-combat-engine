/** GM-attested interruptions of a particular animal's six-month training.
 * Historical starts and outcomes stay immutable. Missed days are NOT inferred
 * from merely elapsed calendar time: GM explicitly records them on resumption.
 */
export const TRAINING_INTERRUPTION_FORMAT93902='hmk-animal-training-interruption-93902-v1';
const err=s=>{throw Error('Animal Training: '+s)};
const records=(journal,startRow)=>journal.filter(j=>j.calendarCampaignId===startRow.calendarCampaignId&&
 j.calendarAnimalTrainingInterruption93902?.startId===startRow.id); // Journal insertion order is authoritative even for same-minute GM decisions.
function startInfo(startRow){
 if(!startRow?.id||!startRow.calendarAnimalTrainingStart590)return err('chybí původní začátek výcviku.');
 return startRow.calendarAnimalTrainingStart590;
}
export function trainingInterruptionState93902(journal,startRow){
 const s=startInfo(startRow);let pausedAt=null,missedDays=0,changes=0,lastMinute=s.startMinute;
 for(const row of records(journal,startRow)){
  const p=row.calendarAnimalTrainingInterruption93902;
  if(p.format!==TRAINING_INTERRUPTION_FORMAT93902||p.startId!==startRow.id||p.ownerId!==s.ownerId||
   p.animalId!==s.animalId||row.characterId!==s.ownerId||
   row.campaignMinute!==p.minute||!Number.isSafeInteger(p.minute)||p.minute<lastMinute||
   typeof p.reason!=='string'||p.reason.trim().length<3||p.reason.length>240||
   p.gmConfirmed!==true)return err('neplatný nebo neodsouhlasený doklad přerušení.');
  if(p.action==='pause'){
   if(pausedAt!==null||p.missedDays!==null)return err('duplicitní pozastavení výcviku.');
   pausedAt=p.minute;
  }else if(p.action==='resume'){
   const maximum=pausedAt===null?null:Math.ceil((p.minute-pausedAt)/1440);
   if(pausedAt===null||!Number.isSafeInteger(p.missedDays)||p.missedDays<0||p.missedDays>maximum)
    return err('obnovení musí doložit skutečně zameškané dny v době přerušení.');
   missedDays+=p.missedDays;pausedAt=null;
  }else return err('neznámá akce.');
  lastMinute=p.minute;changes++;
 }
 return {paused:pausedAt!==null,pausedAt,missedDays,changes,lastMinute};
}
export function trainingEffectiveDue93902(journal,startRow,baseDue){
 const state=trainingInterruptionState93902(journal,startRow);
 if(!Number.isSafeInteger(baseDue)||baseDue<0)return err('neplatný termín.');
 return {...state,due:state.paused?null:baseDue+state.missedDays*1440};
}
export function createTrainingInterruption93902({journal,startRow,minute,action,reason,missedDays=null,gmConfirmed=false}={}){
 const p=startInfo(startRow),state=trainingInterruptionState93902(journal,startRow);
 if(!Number.isSafeInteger(minute)||minute<state.lastMinute||minute<p.startMinute)return err('čas před zahájením nebo před posledním potvrzením.');
 if(!['pause','resume'].includes(action)||action==='pause'===state.paused)return err('zvolte skutečné pozastavení nebo obnovení.');
 const why=String(reason||'').trim();if(!gmConfirmed||why.length<3||why.length>240)return err('chybí výslovné potvrzení GM a důvod.');
 if(action==='pause'&&missedDays!==null)return err('zameškané dny lze potvrdit až při obnovení.');
 if(action==='resume'&&(!Number.isSafeInteger(missedDays)||missedDays<0||missedDays>Math.ceil((minute-state.pausedAt)/1440)))
  return err('potvrďte skutečně neodpracované dny mezi pozastavením a obnovením.');
 return {format:TRAINING_INTERRUPTION_FORMAT93902,startId:startRow.id,animalId:p.animalId,
  ownerId:p.ownerId,action,minute,reason:why,missedDays:action==='resume'?missedDays:null,gmConfirmed:true};
}
export function validateTrainingInterruption93902(journal=[]){
 const starts=new Map(journal.filter(j=>j.calendarAnimalTrainingStart590).map(j=>[j.id,j]));
 for(const start of starts.values()){
  const rows=records(journal,start);let prior=[];
  for(const row of rows){
   const p=row.calendarAnimalTrainingInterruption93902;
   const want=createTrainingInterruption93902({journal:prior,startRow:start,minute:row.campaignMinute,
    action:p.action,reason:p.reason,missedDays:p.missedDays,gmConfirmed:p.gmConfirmed});
   if(JSON.stringify(want)!==JSON.stringify(p))return err('uložené rozhodnutí nesouhlasí s původním potvrzením.');
   prior.push(row);
  }
 }
 for(const row of journal)if(row.calendarAnimalTrainingInterruption93902){
  const start=starts.get(row.calendarAnimalTrainingInterruption93902.startId);
  if(!start||row.calendarCampaignId!==start.calendarCampaignId||row.characterId!==start.characterId)
   return err('doklad nepatří původnímu výcviku, kampani nebo trenérovi.');
 }
 return true;
}
export function assertTrainingInterruptionAppendOnly93902(before=[],after=[]){
 const newer=new Map(after.filter(j=>j.calendarAnimalTrainingInterruption93902).map(j=>[j.id,j]));
 for(const row of before)if(row.calendarAnimalTrainingInterruption93902&&JSON.stringify(row)!==JSON.stringify(newer.get(row.id)))
  return err('starší potvrzení přerušení nelze změnit.');
 return true;
}
