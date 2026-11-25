import {isNoncombatMedicalOrigin,medicalOriginOfWound} from './hmk-medical-origin.js?v=93.988';

const woundCareKinds=new Set(['treatment','frost-amputation','healing','infection','grim','bleeding','injury-morale','injury-mishap']);
const shockKinds=new Set(['weather-shock','shock-followup','blood-shock']);
const bloodEvents=new Set(['travel-blood-loss','travel-blood-stoppage','blood-loss-advance','blood-stoppage']);

export function noncombatHealthDestination(event,state){
 const kind=event?.kind;
 if(['weather-shock','weather-course','weather-skin','weather-onset','concurrent-treatment'].includes(kind))return true;
 const woundCare=woundCareKinds.has(kind),shock=shockKinds.has(kind),trauma=kind==='extended-shock'||kind==='coma';
 if(!(woundCare||shock||trauma||kind==='blood-loss'))return false;
 if(event.route==='hazards'||isNoncombatMedicalOrigin(event.originDomain)||isNoncombatMedicalOrigin(event.domain))return true;
 if(!state)return false;
 const source=event.sourceId||event.woundId;
 if(woundCare){
  const woundId=kind==='injury-mishap'?(state.mishaps||[]).find(m=>m.id===source)?.woundId||event.woundId:source;
  return !!woundId&&isNoncombatMedicalOrigin(medicalOriginOfWound(state.wounds?.find(w=>w.id===woundId),state.events));
 }
 if(shock)return isNoncombatMedicalOrigin(state.shockFollowup?.domain);
 if(trauma){
  const course=kind==='coma'?state.coma:state.extendedShock;
  return (isNoncombatMedicalOrigin(course?.domain)&&(!source||source===course.sourceId))||
   !!source&&(state.parallelColdShocks||[]).some(x=>x.sourceId===source&&(kind==='coma'?x.coma?.active:!!x.extendedShock));
 }
 const loss=state.events?.findLast(e=>bloodEvents.has(e.type)&&(e.details?.gainedBP>0||(e.type==='blood-stoppage'&&e.details?.advanceSL!=null)));
 return !!loss&&loss.type.startsWith('travel-');
}

/** A read-only destination for existing HMK calendar obligations.
 * Skill/profession never authorizes or produces dice here: the original form
 * and its persisted evidence remain the only rules executor.
 */
export function calendarEventDestination(event){
 // HMK Travel encounter is a GM-notification only. Never let historical
 // or current travel evidence navigate to the Combat encounter engine.
 if(event?.kind==='trek-encounter')return 'calendar';
 if(event?.kind==='morale-reaction')return 'calendar';
 if(noncombatHealthDestination(event))return 'hazards';
 if(event?.route&&['combat','healing','hazards','skills','inventory','calendar'].includes(event.route))return event.route;
 switch(event?.kind){
  case 'herbal-paralytic':case 'herbal-soporific-end':case 'herbal-soporific-onset':
  case 'herbal-potion':case 'malnutrition-course':return 'calendar';
  case 'poison':case 'disease':case 'asphyxia':case 'sleep-deprivation':
  case 'weather-course':case 'weather-skin':case 'weather-onset':case 'weather-shock':return 'hazards';
  case 'healing':case 'infection':case 'grim':case 'treatment':case 'blood-loss':
  case 'coma':case 'extended-shock':case 'aural-recovery':case 'psyche-manifestation':
  case 'psyche-interval':case 'psyche-recovery':return 'healing';
  case 'trek-survival':case 'trek-drover-test':case 'trek-direction-hazard':case 'trek-weather-hazard':
  case 'skill-critical':case 'skill-fall':case 'skill-injury':case 'talisman-period':return 'skills';
  default:return 'combat';
 }
}
