/** HMK 1.2 pp.169, 179: Coma HR derives from the original causal injury.
 * A travel hazard can never provide fictitious Location Shock / IL inputs.
 * Read only; uses original shared healthState and its immutable injury event.
 */
import {MEDICAL_ORIGIN,isNoncombatMedicalOrigin} from './hmk-medical-origin.js?v=93.982';
import {verifiedHumanLocationShock} from './hmk-weather-trauma-completion.js';
import {verifiedMountedAnimalAnatomy} from './hmk-mounted-live-animal-falling.js';
const unavailable=reason=>({ready:false,reason});
export function verifiedNoncombatComaCause({actor,state,shockFollowup}={}){
 const q=shockFollowup;
 if(!actor?.id||!state||!q||!isNoncombatMedicalOrigin(q.domain)||typeof q.sourceId!=='string'||!q.sourceId)
  return unavailable('Chybí doložený nevojenský původ Shock a původní zdroj.');
 const grim=state.events?.find(e=>e.id===q.sourceId&&e.type==='grim-wound-shock'&&e.details?.woundId===q.woundId);
 if(grim){
  const {locationShock,injuryShock:injuryLevel,woundId}=grim.details;
  const initialHR=12-locationShock-injuryLevel;
  if(Number.isSafeInteger(locationShock)&&locationShock>=0&&locationShock<=10&&
     Number.isSafeInteger(injuryLevel)&&injuryLevel>=4&&injuryLevel<=5&&initialHR>0&&
     state.wounds?.some(w=>w.id===woundId))
   return {ready:true,locationShock,injuryLevel,woundId,sourceEventId:grim.id,initialHR};
  return unavailable('Grim Wound nemá doložený Location Shock nebo IL pro Coma.');
 }
 if(![MEDICAL_ORIGIN.TRAVEL,MEDICAL_ORIGIN.FALL].includes(q.domain))
  return unavailable('Původní klimatický Shock nemá doložené vyvolávající anatomické zranění: Location Shock a IL nelze odhadovat.');
 const type=q.domain===MEDICAL_ORIGIN.FALL?'skill-fall-injury':'travel-accident-injury';
 const matches=(state.events||[]).filter(e=>e?.type===type&&e.details?.sourceId===q.sourceId&&e.details?.domain===q.domain&&e.details?.targetId===actor.id&&typeof e.details.woundId==='string');
 if(matches.length!==1)return unavailable('Chybí právě jedna doložená původní událost zranění.');
 const event=matches[0];
 const wounds=(state.wounds||[]).filter(w=>w?.id===event.details.woundId&&w.originEventId===event.id&&w.originDomain===q.domain);
 if(wounds.length!==1)return unavailable('Původní rána nesouhlasí s událostí zranění.');
 const w=wounds[0];
 if(!Number.isSafeInteger(w.level)||w.level<1||w.level>5)
  return unavailable('Není doložen přesný Injury Level původní rány.');
 const animalBreed=actor.hmk?.verifiedMountedBreed;
 const loc=String(w.location||'').toLowerCase();
 let ls;
 if(animalBreed){
  const anatomy=verifiedMountedAnimalAnatomy(animalBreed);
  if(!anatomy)return unavailable('Není ověřena anatomie zvířete HMK str.355.');
  ls=anatomy.locations.find(x=>x.code===loc)?.shock;
 }else{
  if(w.bodyKind&&w.bodyKind!=='human')return unavailable('Neodpovídající anatomie původní lidské rány.');
  ls=verifiedHumanLocationShock(loc);
 }
 if(!Number.isSafeInteger(ls)||ls<0||ls>15)return unavailable('Původní rána neobsahuje ověřenou lokalizaci Shock.');
 if(12-ls-w.level<=0)return unavailable('Coma HR z původní anatomie není v pravidlovém rozsahu.');
 return {ready:true,locationShock:ls,injuryLevel:w.level,woundId:w.id,sourceEventId:event.id,initialHR:12-ls-w.level};
}
