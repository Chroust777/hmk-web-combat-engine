/**
 * Calendar-time automatic *onsets* only.  HMK 1.2 pp.183–186.
 * The source exposure and its initial profile/dice must already be committed.
 * Onset does not roll dice; subsequent Disease/Poison Course DOES.
 * Do not use this classifier for other time-sensitive obligations.
 */
export function automaticAilmentOnset(event,characters=[]){
 if(!event||!['poison','disease'].includes(event.kind))return null;
 const actor=characters.find(c=>c.id===event.characterId);
 const state=actor?.hmk?.combatState;
 const courses=event.kind==='poison'?state?.toxinCourses:state?.diseaseCourses;
 const matching=(courses??[]).filter(t=>t.status==='incubating'&&t.sourceId===event.sourceId&&
  Number.isSafeInteger(t.onsetMinutes)&&t.onsetMinutes>=0&&
  Number.isSafeInteger(t.initialHR)&&t.initialHR>=1&&t.initialHR<=5);
 if(matching.length!==1||!Number.isSafeInteger(event.minute)||
  !Number.isSafeInteger(event.anchorMinute)||event.anchorMinute+matching[0].onsetMinutes!==event.minute)return null;
 const course=matching[0];
 const period=event.kind==='poison'?course.periodMinutes:1440;
 if(!Number.isSafeInteger(period)||period<=0)return null;
 return {event,actor,course,nextCourseMinute:event.minute+period};
}
/** The agenda is still the single source for event identity and chronology. */
export function automaticAilmentOnsets(agenda,characters=[],targetMinute){
 return (agenda?.all??[]).filter(e=>e.minute<=targetMinute).map(e=>automaticAilmentOnset(e,characters)).filter(Boolean)
  .sort((a,b)=>a.event.minute-b.event.minute||a.event.id.localeCompare(b.event.id));
}
