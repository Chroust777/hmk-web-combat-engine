/** Disjoint origin for healthcare actions; physical consequences are shared.
 * A weather wound is NOT a Melee/Combat hit. A Combat encounter reads its
 * actual impairment but does not own its original Weather tests or treatment.
 * HMK v1.2 pp. 167–170, 177–182, 185.
 */
export const MEDICAL_ORIGIN=Object.freeze({WEATHER:'travel-weather',COMBAT:'combat'});
export function medicalOriginOfWound(wound,events=[]){
 if(!wound||typeof wound.id!=='string')return null;
 const original=Array.isArray(events)?events.find(e=>e.id===wound.originEventId):null;
 if(wound.originDomain===MEDICAL_ORIGIN.WEATHER&&original?.type==='travel-weather-injury'&&
  original.details?.domain===MEDICAL_ORIGIN.WEATHER&&
  original.details?.woundId===wound.id)return MEDICAL_ORIGIN.WEATHER;
 if(wound.originDomain===MEDICAL_ORIGIN.COMBAT&&original?.type==='confirmed-hit')return MEDICAL_ORIGIN.COMBAT;
 // A frost amputation makes a NEW Edge wound. It inherits the medical origin
 // of the original documented frost injury, NOT the name of the executor.
 // Strictly verify both immutable event links; never classify an ordinary
 // Combat Edge wound as Travel solely because it is an amputation.
 if(wound.fromFrostWoundId&&original?.type==='frost-amputation-treatment'&&
    original.details?.newWoundId===wound.id&&
    original.details?.woundId===wound.fromFrostWoundId){
  const source=events.find(e=>e.id===String(wound.fromFrostWoundId).replace(/^wound:/,''));
  if(source?.type==='travel-weather-injury'&&source.details?.domain===MEDICAL_ORIGIN.WEATHER&&
    source.details?.woundId===wound.fromFrostWoundId)return MEDICAL_ORIGIN.WEATHER;
 }
 // Previous pre-release Weather state: use its immutable original proof rather
 // than treating every frost/fire injury as environmental.
 if(wound.originDomain===undefined&&String(wound.originEventId||'').startsWith('skill-weather-skin:')&&
  original?.details?.weatherTrauma?.sourceId)return MEDICAL_ORIGIN.WEATHER;
 return MEDICAL_ORIGIN.COMBAT;
}
export function medicalWounds(state,origin){
 if(!state||!Array.isArray(state.wounds)||!Array.isArray(state.events))throw Error('Chybí doložený zdravotní stav');
 if(!Object.values(MEDICAL_ORIGIN).includes(origin))throw Error('Neznámý původ lékařské procedury');
 return state.wounds.filter(w=>medicalOriginOfWound(w,state.events)===origin);
}
export function medicalWeatherShockDue(state,minute){
 const q=state?.shockFollowup;
 if(q?.domain!==MEDICAL_ORIGIN.WEATHER)return null;
 if(!Number.isSafeInteger(q.originMinute)||q.originMinute<0||!q.sourceId)throw Error('Weather Shock nemá původní kalendářovou minutu');
 const dueMinute=q.kind==='UNC'?q.originMinute+10:q.originMinute;
 return {sourceId:q.sourceId,kind:q.kind,originMinute:q.originMinute,dueMinute,
  due:Number.isSafeInteger(minute)&&minute>=dueMinute};
}
