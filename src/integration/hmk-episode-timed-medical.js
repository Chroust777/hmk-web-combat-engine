/** Transactional preview of nutrition/Thirst/Starvation controls inside a GM
 * minute episode. Nothing here writes to the live character, journal or clock.
 * Results are replayed at their ACTUAL due minute with the authoritative HMK
 * nutrition and malnutrition modules, then committed with the whole episode.
 */
import {dueMalnutritionCases,resolveMalnutritionCourse,applyDueMalnutritionOnsets} from './hmk-malnutrition-medical.js';
import {activeNutritionPolicies,finishDueNutritionDays,enrollUnmonitoredNutrition} from './hmk-nutrition-days.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {needsAssistedIntake,assistedIntakeForDay,createAssistedIntake} from './hmk-nutrition-assisted-intake.js';
import {episodeTimedCourseAgenda,episodeTimedCourseStep,episodeTimedCourseKey,episodeTimedCourseFields} from './hmk-episode-timed-courses.js';
const incapacitating=new Set(['INC','UNC','KIA']);
export function episodeTimedMedicalKey(t){return [t.characterId,t.episodeId,t.dueMinute].join('|');}
export function episodeActorCanAct(state){
 if(!state)return true;
 return !incapacitating.has(state.shock)&&!state.coma?.active&&!state.asphyxiaComaPending?.active;
}
export function episodeTimedMedicalPreview(database,{endMinute,rolls={},idFactory,stamp}={}){
 const start=database.campaignClock?.minute;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(endMinute)||endMinute<start||endMinute>start+10080)
  throw Error('Neplatné hranice časové epizody.');
 const temp=structuredClone(database),campaignId=campaignKey(temp.campaignClock);
 const ids=typeof idFactory==='function'?idFactory:(()=>{let n=0;const prefix='episode-timed:'+start+':'+endMinute+':'+(database.campaignClock.events.at(-1)?.id||'origin')+':';return ()=>prefix+(++n);})();
 const now=typeof stamp==='function'?stamp:()=>new Date(0).toISOString();
 const originalJournalIds=new Set(temp.journal.map(x=>x.id));
 const changes=[],requirements=[],incapacitations=[],seen=new Set();
 // The provisional clock is local to the clone. Its events never reach the
 // real campaign calendar: the final episode creates ONE advance event only.
 const virtualMinute=minute=>{
  if(minute<temp.campaignClock.minute)return;
  temp.campaignClock={...temp.campaignClock,minute,events:[...temp.campaignClock.events,
   {id:ids(),type:'advance',minute,reason:'Dočasný výpočet splatné kontroly uvnitř epizody'}]};
 };
 enrollUnmonitoredNutrition(temp,{fromMinute:start,idFactory:ids,stamp:now});
 let at=start,limit=0;
 while(at<=endMinute){
  if(++limit>11000)throw Error('Příliš mnoho zdravotních změn uvnitř jedné epizody.');
  const policies=activeNutritionPolicies(temp.journal,campaignId);
  const dayEnds=policies.map(p=>{
   const days=temp.journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===p.characterId&&j.calendarNutritionDay?.policyId===p.id);
   return (days.at(-1)?.calendarNutritionDay.endMinute??p.campaignMinute)+1440;
  }).filter(m=>m>=at&&m<=endMinute);
  const dueCases=dueMalnutritionCases(temp).filter(t=>t.dueMinute<endMinute);
  const dueTimes=dueCases.map(t=>Math.max(at,t.dueMinute));
  const courseAgenda=episodeTimedCourseAgenda(temp,endMinute-1);
  const next=Math.min(endMinute,...dayEnds,...dueTimes,...courseAgenda.map(t=>Math.max(at,t.minute)));
  virtualMinute(next);
  // A character in INC/UNC/Coma cannot be assumed to swallow a day's
  // rations. This GM fact is distinct from a d100 and is recorded with the
  // exact nutrition day; it must not become an unrelated calendar event.
  let intakeMissing=false;
  for(const p of activeNutritionPolicies(temp.journal,campaignId)){
   const days=temp.journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===p.characterId&&j.calendarNutritionDay?.policyId===p.id);
   const startDay=days.at(-1)?.calendarNutritionDay.endMinute??p.campaignMinute;
   const endDay=startDay+1440;
   if(endDay>next)continue;
   const actor=temp.characters.find(c=>c.id===p.characterId);
   if(!actor||!needsAssistedIntake(actor)||assistedIntakeForDay(temp.journal,campaignId,p.characterId,startDay,endDay))continue;
   const key=['assisted-intake',p.characterId,startDay,endDay].join('|'),v=rolls[key];
   const fields=[
    {name:'foodAccepted',label:'Jídlo skutečně přijato?',type:'choice',options:[{value:'yes',label:'Ano'},{value:'no',label:'Ne'}]},
    {name:'waterAccepted',label:'Voda skutečně přijata?',type:'choice',options:[{value:'yes',label:'Ano'},{value:'no',label:'Ne'}]},
    {name:'caregiver',label:'Kdo / jak postavě pomohl?',type:'text'},
    {name:'reason',label:'Skutečné okolnosti podání / nepodání',type:'text'}];
   const valid=v&&['yes','no'].includes(v.foodAccepted)&&['yes','no'].includes(v.waterAccepted)&&
    typeof v.caregiver==='string'&&v.caregiver.trim().length>=2&&typeof v.reason==='string'&&v.reason.trim().length>=3;
   if(!valid){requirements.push({key,characterId:p.characterId,kind:'assisted-intake',dueMinute:endDay-1,
    reason:'GM musí doložit skutečnou pomoc s jídlem a vodou za 24 hodin, nikoli smyšlený hod.',fields,values:v||{}});
    intakeMissing=true;continue;}
   const proof=createAssistedIntake({campaignId,actorId:p.characterId,minute:endDay-1,startMinute:startDay,
    foodAccepted:v.foodAccepted==='yes',waterAccepted:v.waterAccepted==='yes',caregiver:v.caregiver,reason:v.reason});
   temp.journal.push({id:ids(),characterId:p.characterId,calendarCampaignId:campaignId,campaignMinute:proof.minute,
    createdAt:now(),title:'HMK · pomoc s příjmem během Cestování',body:proof.reason,calendarNutritionAssistedIntake:proof});
   changes.push({key,actorId:p.characterId,dueMinute:proof.minute,kind:'assisted-intake',description:'Doložen skutečný příjem potravy/vody',shockAfter:actor.hmk.combatState?.shock});
  }
  if(intakeMissing)break;
  finishDueNutritionDays(temp,{idFactory:ids,stamp:now});
  applyDueMalnutritionOnsets(temp,{idFactory:ids,stamp:now});
  const payable=dueMalnutritionCases(temp).filter(t=>t.dueMinute<endMinute&&t.dueMinute<=next).sort((a,b)=>a.dueMinute-b.dueMinute||a.characterId.localeCompare(b.characterId));
  let missing=false;
  for(const due of payable){
   const key=episodeTimedMedicalKey(due);
   if(seen.has(key))throw Error('Duplicitní zdravotní termín '+key);
   seen.add(key);
   const value=rolls[key],n=Number(value);
   if(!/^(?:[1-9]|[1-9][0-9]|100)$/.test(String(value??''))||!Number.isInteger(n)){
    requirements.push({key,...due,kind:'malnutrition-course',reason:due.mode==='pending'?'Nejdříve doložte skutečné denní příděly.':'Vyžaduje skutečný zdravotní d100.'});
    missing=true;continue;
   }
   const actor=temp.characters.find(c=>c.id===due.characterId),before=actor?.hmk?.combatState;
   if(due.mode==='pending'){
    requirements.push({key,...due,kind:'malnutrition-course',reason:'Bez uzavřeného a doloženého nutričního dne není povoleno určit Advance/Healing.'});
    missing=true;continue;
   }
   const entry=resolveMalnutritionCourse(temp,{actorId:due.characterId,episodeId:due.episodeId,roll:n,
    rollOrigin:'manual',gmConfirmed:true,idFactory:ids,stamp:now});
   const after=actor.hmk.combatState;
   changes.push({key,actorId:due.characterId,dueMinute:due.dueMinute,kind:due.kind,roll:n,
    beforeHR:entry.proof.beforeHR,afterHR:entry.proof.afterHR,sl:entry.proof.sl,
    proof:entry.proof,shockAfter:after.shock});
   if(episodeActorCanAct(before)&&!episodeActorCanAct(after))incapacitations.push({actorId:due.characterId,
    minute:due.dueMinute,shock:after.shock,cause:due.kind,sourceKey:key});
  }
  if(missing)break;
  // Every specialized timed course uses its ORIGINAL executor. A completed
  // action can create a NEW due event later in this very episode.
  for(const event of courseAgenda.filter(t=>t.minute<=next)){
   const key='special:'+event.id+':'+event.minute;
   if(seen.has(key))throw Error('Duplicitní zdravotní termín '+key);
   seen.add(key);
   try{
    const step=episodeTimedCourseStep(temp,event,{rolls,idFactory:ids,stamp:now});
    if(step.requirement){requirements.push(step.requirement);missing=true;continue;}
    changes.push(step.change);
    if(step.incapacitation)incapacitations.push(step.incapacitation);
   }catch(error){
    // Conflicting active ailments, missing evidence and GM-specific secondary
    // modifiers are NOT valid reasons to invent a successful health test.
    requirements.push({key:episodeTimedCourseKey(event),characterId:event.characterId,
     dueMinute:event.minute,kind:event.kind,reason:'Vyžaduje doložení v původním pravidlovém modulu: '+error.message,
     fields:[],error:error.message});
    missing=true;
   }
  }
  if(missing)break;
  if(next>=endMinute)break;
  at=next+1;
 }
 // Show ALL already known independent dated tests, not just the first
 // chronological blocker. Their actual health transitions are still applied
 // only in timestamp order; a later test can be cancelled by an earlier
 // death/incapacity without ever manufacturing a result.
 if(requirements.length){
  const visible=new Set([...changes,...requirements].map(x=>x.key));
  for(const event of episodeTimedCourseAgenda(database,endMinute-1)){
   const key=episodeTimedCourseKey(event);
   if(visible.has(key))continue;
   const stagedActor=temp.characters.find(c=>c.id===event.characterId);
   if(stagedActor?.hmk?.combatState?.shock==='KIA')continue;
   requirements.push({key,kind:event.kind,characterId:event.characterId,dueMinute:event.minute,
    reason:event.description+' · nezávislý známý termín; výsledek se vypočte až ve skutečném čase.',
    fields:episodeTimedCourseFields(event),values:rolls[key]||{},provisional:true});
   visible.add(key);
  }
 }
 return {requirements,changes,incapacitations,complete:requirements.length===0,
  generatedJournal:temp.journal.filter(j=>!originalJournalIds.has(j.id)).map(j=>({...j,
   calendarEpisodeTimedMedical:{...j.calendarEpisodeTimedMedical,format:'hmk-episode-timed-medical-v1',startMinute:start,endMinute}})),
  characters:temp.characters,inventory:temp.inventory,medicalClockMinute:temp.campaignClock.minute};
}
