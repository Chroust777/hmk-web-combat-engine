/** HMK v1.2 pp.178,180. UI-independent plan for a new ordinary treatment.
 * The campaign clock, not the healer or a free-text GM estimate, owns time.
 * This is a projection only: it cannot advance time or write a wound.
 */
import {treatmentContract,treatmentDurationMinutes} from '../rules/healing.js';
const nonNegativeInteger=x=>Number.isSafeInteger(x)&&x>=0;
export function weatherTreatmentTiming({wound,startMinute,onsetMinute,untreated=false,allowAmputation=false}={}){
 if(!wound||wound.healed)throw Error('Treatment: neexistující nebo již zhojená rána.');
 if(!nonNegativeInteger(startMinute)||!nonNegativeInteger(onsetMinute)||startMinute<onsetMinute)
  throw Error('Treatment: chybí ověřený počátek rány nebo skutečný čas Kalendáře.');
 const currentDays=Math.floor((startMinute-onsetMinute)/1440);
 if(untreated)return {method:'untreated',durationMinutes:0,startMinute,endMinute:startMinute,
  daySinceInjury:currentDays,untreated:true};
 const aspect=wound.projectileArrowOrBolt===true||wound.impaled===true?'projectile':
  ({b:'blunt',e:'edge',p:'point',f:'fire'})[String(wound.aspect).toLowerCase()]||String(wound.aspect).toLowerCase();
 const contract=treatmentContract({aspect,injuryLevel:wound.level});
 if(contract.treatment==='amp'&&!allowAmputation)throw Error('Grievous Frost vyžaduje samostatný Amputation Treatment; běžný Treatment není možný.');
 if(allowAmputation&&contract.treatment!=='amp')throw Error('Amputation Treatment patří pouze Grievous Frost ráně.');
 const durationMinutes=treatmentDurationMinutes({treatment:contract.treatment,injuryLevel:wound.level});
 if(!Number.isSafeInteger(durationMinutes)||durationMinutes<1||startMinute+durationMinutes>1e9)
  throw Error('Treatment: nelze určit bezpečný čas zákroku.');
 const endMinute=startMinute+durationMinutes;
 return {method:contract.treatment,durationMinutes,startMinute,endMinute,
  daySinceInjury:Math.floor((endMinute-onsetMinute)/1440),untreated:false,
  crossesCalendarDay:Math.floor(startMinute/1440)!==Math.floor(endMinute/1440)};
}
