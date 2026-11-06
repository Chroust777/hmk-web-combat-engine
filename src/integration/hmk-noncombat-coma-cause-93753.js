/** HMK 1.2 pp.169, 179: Coma HR derives from the original causal injury.
 * A travel hazard can never provide fictitious Location Shock / IL inputs.
 * Read only; uses original shared healthState and its immutable injury event.
 */
import {verifiedHumanLocationShock} from './hmk-weather-trauma-completion.js';
import {verifiedMountedAnimalAnatomy} from './hmk-mounted-live-animal-falling.js';
const unavailable=reason=>({ready:false,reason});
export function verifiedNoncombatComaCause({actor,state,shockFollowup}={}){
 const q=shockFollowup;
 if(!actor?.id||!state||!q||!['travel-accident','travel-weather'].includes(q.domain)||typeof q.sourceId!=='string'||!q.sourceId)
  return unavailable('Chybí doložený nevojenský původ Shock a původní zdroj.');
 if(q.domain!=='travel-accident')
  return unavailable('Původní klimatický Shock nemá doložené vyvolávající anatomické zranění: Location Shock a IL nelze odhadovat.');
 const matches=(state.events||[]).filter(e=>e?.type==='travel-accident-injury'&&e.details?.sourceId===q.sourceId&&e.details?.domain===q.domain&&e.details?.targetId===actor.id&&typeof e.details.woundId==='string');
 if(matches.length!==1)return unavailable('Chybí právě jedna doložená původní Accident Injury událost.');
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
