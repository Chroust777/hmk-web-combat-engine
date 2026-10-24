/** A read-only destination for existing HMK calendar obligations.
 * Skill/profession never authorizes or produces dice here: the original form
 * and its persisted evidence remain the only rules executor.
 */
export function calendarEventDestination(event){
 if(event?.route&&['combat','healing','hazards','skills','inventory','calendar'].includes(event.route))return event.route;
 switch(event?.kind){
  case 'herbal-potion':case 'malnutrition-course':return 'calendar';
  case 'poison':case 'disease':case 'asphyxia':case 'sleep-deprivation':return 'hazards';
  case 'healing':case 'infection':case 'grim':case 'treatment':case 'blood-loss':
  case 'coma':case 'extended-shock':case 'aural-recovery':case 'psyche-manifestation':
  case 'psyche-interval':case 'psyche-recovery':return 'healing';
  case 'skill-critical':case 'skill-fall':case 'skill-injury':case 'weather-course':
  case 'weather-skin':case 'talisman-period':return 'skills';
  default:return 'combat';
 }
}
