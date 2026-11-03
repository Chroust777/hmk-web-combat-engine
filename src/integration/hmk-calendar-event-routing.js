/** A read-only destination for existing HMK calendar obligations.
 * Skill/profession never authorizes or produces dice here: the original form
 * and its persisted evidence remain the only rules executor.
 */
export function calendarEventDestination(event){
 // HMK Travel encounter is a GM-notification only. Never let historical
 // or current travel evidence navigate to the Combat encounter engine.
 if(event?.kind==='trek-encounter')return 'calendar';
 // Even stale events carrying route='combat' must never send Weather
 // consequences into the combat encounter UI.
 if(['weather-course','weather-skin','weather-onset','weather-shock'].includes(event?.kind))return 'hazards';
 if(event?.route&&['combat','healing','hazards','skills','inventory','calendar'].includes(event.route))return event.route;
 switch(event?.kind){
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
