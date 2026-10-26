/** HMK 176 / 186: one attested 24h rest also contains one four-hour rest.
 * The 24h nutrition interval is distinct from the one and only authoritative
 * fatigue activity. No sleep or weakness recovery can be inferred from it.
 */
import {NUTRITION_CONDITIONS} from './hmk-nutrition-activity.js';
import {expeditionRestRecovery} from './hmk-calendar-expedition.js';
import {scheduleHMKActivity,interruptHMKActivity,scheduledHMKCompletionIds,interruptedHMKActivityIds} from './hmk-calendar-activities.js';
export function nutritionRestActivity({journal=[],clock,actor,conditionRow,id}={}){
 const p=conditionRow?.calendarNutritionConditions,settings=NUTRITION_CONDITIONS[p?.kind];
 if(!settings?.completeRest)return null;
 if(!clock||p.startMinute!==clock.minute||p.actorId!==actor?.id)throw Error('Celodenní odpočinek musí začít v autoritativním čase postavy.');
 const state=actor.hmk?.combatState;
 if(!state?.fatigue)throw Error('Chybí autoritativní HMK Fatigue postavy.');
 if(['KIA','INC','UNC'].includes(state.shock)||state.extendedShock||state.sleepDeprivation?.status==='awake'||state.environmentalHazards?.some(x=>x.active))
  return null; // Special recovery remains in its own verified health routine.
 const last=actor.hmk?.expedition?.claims?.lastFourHour;
 if(Number.isSafeInteger(last)&&clock.minute-last<1440)return null; // Once per day; nutrition plan remains valid.
 const finished=scheduledHMKCompletionIds(journal),interrupted=interruptedHMKActivityIds(journal);
 const other=journal.find(row=>{
  const a=row.calendarActivityProof;
  return a?.characterId===actor.id&&row.calendarCampaignId===p.campaignId&&
   !finished.has(row.id)&&!interrupted.has(row.id)&&a.startMinute<clock.minute+240&&a.endMinute>clock.minute;
 });
 if(other){
  if(['rest','sleep'].includes(other.calendarActivityProof.kind)&&other.calendarActivityProof.startMinute===clock.minute)return null;
  throw Error('Postava už má ve stejném čase jinou činnost. Před celodenním odpočinkem ji dokončete nebo přerušte.');
 }
 const plan=expeditionRestRecovery({minute:clock.minute,kind:'rest',current:state.fatigue.weariness,claims:actor.hmk?.expedition?.claims||{}});
 plan.nutritionConditionsId=conditionRow.id;
 return scheduleHMKActivity({journal:[...journal,conditionRow],clock,characterId:actor.id,name:actor.name,kind:'rest',plan,id,origin:'none'});
}
export function interruptionForCancelledNutritionRest({journal=[],clock,planRow,reason,id,createdAt}={}){
 const row=journal.find(x=>x.calendarActivityProof?.plan?.nutritionConditionsId===planRow?.id&&
  x.characterId===planRow.characterId&&x.calendarCampaignId===planRow.calendarCampaignId);
 if(!row||clock.minute>=row.calendarActivityProof.endMinute||
  scheduledHMKCompletionIds(journal).has(row.id)||interruptedHMKActivityIds(journal).has(row.id))return null;
 return interruptHMKActivity({journal,clock,activityId:row.id,reason,id,createdAt});
}
