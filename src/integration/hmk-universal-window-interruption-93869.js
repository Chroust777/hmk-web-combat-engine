/** v93.869: independent, explicitly confirmed interruption of ONE activity
 * inside a full fixed calendar window. No rolls, health mutations or clock
 * movement occur here. The source-specific HMK routine remains authoritative.
 */
export const UNIVERSAL_STOP_FORMAT_93869='hmk-confirmed-window-activity-stop-v93.869';
export const UNIVERSAL_STOP_REASONS_93869=Object.freeze({
 'external-injury':'Zranění / nehoda mimo automatický Survival Hazard',
 'medical-incapacity':'Neschopnost pokračovat / zdravotní kolaps',
 'animal-incapacity':'Zvíře přestalo být schopné pokračovat',
 'encounter-stop':'Setkání skutečně zastavilo činnost',
 'weather-stop':'Počasí skutečně znemožnilo pokračovat',
 'equipment-stop':'Závada vybavení skutečně zastavila výkon',
 'terrain-stop':'Jiná fyzická překážka zastavila činnost',
 'other-stop':'Jiná doložená událost, která zastavila výkon'
});
export const UNIVERSAL_STOP_ACTIVITY_KINDS_93869=Object.freeze(['travel','rest','sleep','winded','forage','tracking','watch','other']);
const validInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function ensure(ok,message){if(!ok)throw Error(message)}
export function confirmUniversalStop93869({startMinute,minutes,activityKind,reason,atMinute,source='manual',description=''}={}){
 ensure(validInt(startMinute,0,1e9)&&validInt(minutes,1,10080)&&startMinute+minutes<=1e9,
  'Přerušení: neplatná délka nebo začátek společného okna.');
 ensure(UNIVERSAL_STOP_ACTIVITY_KINDS_93869.includes(activityKind),'Přerušení: neznámá časová činnost.');
 ensure(Object.hasOwn(UNIVERSAL_STOP_REASONS_93869,reason),'Přerušení: vyberte skutečný důvod.');
 ensure(validInt(atMinute,1,minutes),'Přerušení: minuta musí být 1 až '+minutes+'.');
 ensure(['manual','cryptographic-software-minute'].includes(source),'Přerušení: neplatný původ minuty.');
 ensure(typeof description==='string'&&description.trim().length>=3&&description.trim().length<=400,
  'Přerušení: zapište stručně skutečnou událost (3–400 znaků).');
 return {format:UNIVERSAL_STOP_FORMAT_93869,activityKind,reason,description:description.trim(),source,
  startMinute,windowMinutes:minutes,atMinute,eventMinute:startMinute+atMinute,
  recordAtMinute:startMinute+minutes,performedMinutes:atMinute,remainingMinutes:minutes-atMinute,
  calendarWindowIntact:true,medicalDeferred:true,confirmedBy:'confirm-minute-button'};
}
export function validateUniversalStop93869(proof,expect={}){
 ensure(proof?.format===UNIVERSAL_STOP_FORMAT_93869,'Přerušení: chybí potvrzená událost.');
 const rebuilt=confirmUniversalStop93869({...expect,reason:proof.reason,source:proof.source,
  description:proof.description,atMinute:proof.atMinute});
 ensure(JSON.stringify(rebuilt)===JSON.stringify(proof),
  'Přerušení: potvrzená minuta, činnost nebo popis byly změněny. Potvrďte je znovu.');
 return rebuilt;
}
export function effectiveActivityMinutes93869(windowMinutes,stop=null){
 ensure(validInt(windowMinutes,1,10080),'Neplatná délka časového intervalu.');
 if(stop===null)return windowMinutes;
 ensure(stop?.format===UNIVERSAL_STOP_FORMAT_93869&&validInt(stop.atMinute,1,windowMinutes)&&
  stop.windowMinutes===windowMinutes,'Neplatný doklad přerušeného výkonu.');
 return stop.atMinute;
}
/** Generic events do not invent medical consequences or divide random yields.
 * Each caller must use its existing rule-specific accounting for partial work. */
export function stopTaxonomy93869(){return Object.entries(UNIVERSAL_STOP_REASONS_93869).map(([value,label])=>({value,label}));}

/** No event may be resolved before its full time window is committed.
 * The outcome is a GM-described actual result, never synthetic injury dice.
 */
export const UNIVERSAL_STOP_RESOLUTION_FORMAT_93869='hmk-window-stop-aftercare-v93.869';
export function validateUniversalStopResolutions93869(journal=[]){
 const episodes=new Map(journal.filter(j=>j.calendarTimeEpisode?.generalStop93869).map(j=>[j.id,j]));
 const resolved=new Set();
 for(const j of journal){
  const r=j.calendarEpisodeGeneralResolution93869;if(!r)continue;
  ensure(r.format===UNIVERSAL_STOP_RESOLUTION_FORMAT_93869&&typeof r.episodeId==='string'&&
   ['consequences-completed','no-further-consequences'].includes(r.outcome)&&
   typeof r.details==='string'&&r.details.trim()===r.details&&r.details.length>=6&&r.details.length<=400,
   'Přerušení: neplatný doklad následného vyhodnocení.');
  const source=episodes.get(r.episodeId);
  ensure(source&&source.calendarCampaignId===j.calendarCampaignId&&
   source.calendarTimeEpisode.generalStop93869.recordAtMinute<=j.campaignMinute&&
   source.characterId===j.characterId,
   'Přerušení: vyhodnocení nemá potvrzenou epizodu nebo předbíhá kalendář.');
  ensure(!resolved.has(r.episodeId),'Přerušení: stejná událost byla vyhodnocena vícekrát.');
  resolved.add(r.episodeId);
 }
 return resolved.size;
}
