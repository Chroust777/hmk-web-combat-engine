/** Transactional preview of nutrition/Thirst/Starvation controls inside a GM
 * minute episode. Nothing here writes to the live character, journal or clock.
 * Results are replayed at their ACTUAL due minute with the authoritative HMK
 * nutrition and malnutrition modules, then committed with the whole episode.
 */
import {dueMalnutritionCases,resolveMalnutritionCourse,applyDueMalnutritionOnsets} from './hmk-malnutrition-medical.js';
import {activeNutritionPolicies,finishDueNutritionDays,enrollUnmonitoredNutrition} from './hmk-nutrition-days.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
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
  if(++limit>300)throw Error('Příliš mnoho zdravotních změn uvnitř jedné epizody.');
  const policies=activeNutritionPolicies(temp.journal,campaignId);
  const dayEnds=policies.map(p=>{
   const days=temp.journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===p.characterId&&j.calendarNutritionDay?.policyId===p.id);
   return (days.at(-1)?.calendarNutritionDay.endMinute??p.campaignMinute)+1440;
  }).filter(m=>m>=at&&m<=endMinute);
  const dueCases=dueMalnutritionCases(temp).filter(t=>t.dueMinute<=endMinute);
  const dueTimes=dueCases.map(t=>Math.max(at,t.dueMinute));
  const next=Math.min(endMinute,...dayEnds,...dueTimes);
  virtualMinute(next);
  finishDueNutritionDays(temp,{idFactory:ids,stamp:now});
  applyDueMalnutritionOnsets(temp,{idFactory:ids,stamp:now});
  const payable=dueMalnutritionCases(temp).filter(t=>t.dueMinute<=next).sort((a,b)=>a.dueMinute-b.dueMinute||a.characterId.localeCompare(b.characterId));
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
  if(next>=endMinute)break;
  at=next+1;
 }
 return {requirements,changes,incapacitations,complete:requirements.length===0,
  generatedJournal:temp.journal.filter(j=>!originalJournalIds.has(j.id)).map(j=>({...j,
   calendarEpisodeTimedMedical:{format:'hmk-episode-timed-medical-v1',startMinute:start,endMinute}})),
  characters:temp.characters,inventory:temp.inventory,medicalClockMinute:temp.campaignClock.minute};
}
