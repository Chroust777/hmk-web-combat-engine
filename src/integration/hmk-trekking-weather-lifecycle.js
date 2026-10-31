/** Daily-weather lifecycle: GM may withdraw an active area's forecast at
 * any point in its day. The old roll and all completed travel remain in the
 * append-only ledger; only future segments select a replacement. */
const key=s=>String(s??'').trim().toLocaleLowerCase('cs');
export const TREK_WEATHER_VOID_FORMAT='hmk-trek-weather-void-v1';
export function weatherAreaKey(area){return key(area)}
export function weatherVoidedIds(journal=[],campaignId=null){
 const ids=new Set();
 for(const j of journal){
  const v=j?.calendarTrekWeatherVoid;
  if(v?.format===TREK_WEATHER_VOID_FORMAT&&(!campaignId||campaignId===j.calendarCampaignId))ids.add(v.sourceId);
 }
 return ids;
}
export function activeAreaWeather(journal=[],campaignId,dayIndex,area){
 const voided=weatherVoidedIds(journal,campaignId),name=key(area);
 return journal.find(j=>j.calendarCampaignId===campaignId&&j.calendarTrekDayWeather?.dayIndex===dayIndex&&
    key(j.calendarTrekDayWeather.area)===name&&!voided.has(j.id))??null;
}
export function activeWeatherAreas(journal=[],campaignId,dayIndex){
 const voided=weatherVoidedIds(journal,campaignId);
 const result=[];
 for(const j of journal)if(j.calendarCampaignId===campaignId&&j.calendarTrekDayWeather?.dayIndex===dayIndex&&!voided.has(j.id)){
  if(!result.some(x=>key(x.calendarTrekDayWeather.area)===key(j.calendarTrekDayWeather.area)))result.push(j);
 }
 return result;
}
export function canVoidWeather(journal=[],sourceId,campaignId,minute){
 const row=journal.find(j=>j.id===sourceId&&j.calendarCampaignId===campaignId);
 if(!row?.calendarTrekDayWeather)return {ok:false,reason:'Původní doklad počasí již neexistuje.'};
 const w=row.calendarTrekDayWeather;
 if(weatherVoidedIds(journal,campaignId).has(sourceId))return {ok:false,reason:'Počasí již bylo zrušeno.'};
 if(Math.floor(minute/1440)!==w.dayIndex)return {ok:false,reason:'Po skončení dne nelze historické počasí zrušit.'};
 return {ok:true,reason:''};
}
export function validateWeatherLifecycle(journal=[]){
 const active=new Map(),voided=new Set(),byId=new Map();
 for(const j of journal){
  if(j?.id)byId.set(j.id,j);
  const w=j?.calendarTrekDayWeather;
  if(w){const k=JSON.stringify([j.calendarCampaignId,w.dayIndex,key(w.area)]);
   if(active.has(k)&&w.uniquenessPolicy==='area-day-v93.620')throw Error('V jedné oblasti lze pro jeden den doložit jen jediné aktivní počasí.');
   active.set(k,j.id);
  }
  const v=j?.calendarTrekWeatherVoid;
  if(v){
   if(v.format!==TREK_WEATHER_VOID_FORMAT||typeof v.sourceId!=='string'||!Number.isSafeInteger(v.minute)||
      v.minute!==j.campaignMinute||voided.has(v.sourceId))throw Error('Neplatné nebo opakované zrušení denního počasí.');
   const source=byId.get(v.sourceId),w=source?.calendarTrekDayWeather;
   if(!w||source.calendarCampaignId!==j.calendarCampaignId||Math.floor(j.campaignMinute/1440)!==w.dayIndex)
    throw Error('Zrušení počasí musí odkazovat na předchozí doklad téhož dne.');
   const allowed=canVoidWeather(journal.filter(x=>x!==j&&x.campaignMinute<=j.campaignMinute),v.sourceId,j.calendarCampaignId,j.campaignMinute);
   if(!allowed.ok)throw Error(allowed.reason);
   const k=JSON.stringify([j.calendarCampaignId,w.dayIndex,key(w.area)]);
   if(active.get(k)!==v.sourceId)throw Error('Zrušený doklad není aktivní počasí oblasti.');
   active.delete(k);voided.add(v.sourceId);
  }
 }
 return true;
}
export function assertWeatherVoidAppendOnly(before=[],after=[]){
 const now=new Map(after.filter(j=>j.calendarTrekWeatherVoid).map(j=>[j.id,j]));
 for(const old of before)if(old.calendarTrekWeatherVoid){
  const kept=now.get(old.id);if(!kept||JSON.stringify(kept)!==JSON.stringify(old))throw Error('Zrušení počasí je neměnný historický doklad.');
 }
 return true;
}
