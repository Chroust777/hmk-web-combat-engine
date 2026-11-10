/** HMK 1.2 pp.62,149,169. An involuntary Endurance (Survival) resistance
 * is NOT an independent action by an incapacitated patient. Never silently
 * grant success, and never write a Combat turn. This is a read-only dice proof. */
import {availableMasteries,resolveSkillTest} from './hmk-skill-test-engine.js';
import {skillConditionAvailability} from './hmk-skill-context.js';
const assert=(ok,message)=>{if(!ok)throw Error(message)};
export const PASSIVE_WEATHER_FORMAT='hmk-involuntary-weather-resistance-v1';
export function passiveWeatherResistance(actor,roll,confirmed=false){
 const shock=actor?.hmk?.healthState?.shock;
 assert(['INC','UNC'].includes(shock),'Pasivní ochranný hod je určen pouze pro doložený Shock INC/UNC.');
 assert(confirmed===true,'GM musí potvrdit skutečně provedený pasivní Endurance (Survival) hod.');
 assert(Number.isSafeInteger(roll)&&roll>=1&&roll<=100,'Zadejte skutečný d100 pro pasivní zdravotní odolnost (1–100).');
 const masteries=availableMasteries(actor);
 const endurance=masteries.find(m=>m.name==='Endurance');
 const survival=masteries.find(m=>m.name==='Survival');
 assert(endurance?.ml>0,'Chybí doložená hodnota Endurance postavy.');
 assert(survival?.ml>0,'Chybí doložená sekundární dovednost Survival (HMK 62); GM musí vyřešit pravidlovou výjimku.');
 const condition=skillConditionAvailability({actor,name:'Endurance',inventory:[]});
 assert(condition.fatigue.ready,'Nelze doložit Fatigue pacienta: '+(condition.fatigue.reason||'neznámý stav'));
 const r=resolveSkillTest({ml:endurance.ml,roll,secondaryMLs:[survival.ml],gmModifier:condition.fatigue.modifier});
 return {format:PASSIVE_WEATHER_FORMAT,shock,roll,enduranceML:endurance.ml,survivalML:survival.ml,
  fatigue:condition.fatigue.totals?.total??condition.fatigue.total??0,
  fatigueModifier:condition.fatigue.modifier,eml:r.eml,level:r.level,gmConfirmed:true,
  scope:'involuntary-weather-resistance-only',sourcePages:[62,149,169]};
}
export function verifyPassiveWeatherResistance(p){
 if(!p||p.format!==PASSIVE_WEATHER_FORMAT||!['INC','UNC'].includes(p.shock)||p.gmConfirmed!==true||
  p.scope!=='involuntary-weather-resistance-only'||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||
  !Number.isSafeInteger(p.enduranceML)||p.enduranceML<1||p.enduranceML>1000||
  !Number.isSafeInteger(p.survivalML)||p.survivalML<1||p.survivalML>1000||
  !Number.isSafeInteger(p.fatigue)||p.fatigue<0||p.fatigue>1000||
  !Number.isSafeInteger(p.fatigueModifier)||p.fatigueModifier!==-p.fatigue)return false;
 const r=resolveSkillTest({ml:p.enduranceML,roll:p.roll,secondaryMLs:[p.survivalML],gmModifier:p.fatigueModifier});
 return p.eml===r.eml&&p.level===r.level&&Array.isArray(p.sourcePages)&&p.sourcePages.join(',')==='62,149,169'&&
  Object.keys(p).sort().join('|')==='eml|enduranceML|fatigue|fatigueModifier|format|gmConfirmed|level|roll|scope|shock|sourcePages|survivalML';
}
