/** Parallel actor actions; campaign time is owned exclusively by the GM.
 * Scheduling never edits the clock or fatigue. The existing HMK fatigue
 * calculation is committed only after GM advances past the documented end.
 * This module does not infer activities for other party members.
 */
import {commitExpeditionFatigue,expeditionRestRecovery,expeditionCombatState} from './hmk-calendar-expedition.js';
import {trekRegisteredAnimalHealth} from './hmk-trekking-animal-health.js';
import {validateAnimalWeariness,actualAnimalWeariness} from './hmk-trekking-animal-fatigue.js';
import {animalDoubleTimeCutoff} from './hmk-trekking-animal-timeline.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const min=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
const F='hmk-calendar-actor-activity-v1';
const DONE='hmk-expedition-time-v1';
const STOP='hmk-calendar-activity-interruption-v1';
const activeClockKey=c=>c?.campaignId||`legacy:${c?.events?.[0]?.id||''}`;
export function plannedHMKActivities(journal=[],campaignId){return journal.filter(row=>row?.calendarActivityProof?.format===F&&row.calendarCampaignId===campaignId);}
export function scheduledHMKCompletionIds(journal=[]){return new Set(journal.filter(row=>row?.calendarExpeditionProof?.format===DONE&&row.calendarExpeditionProof?.activityId).map(row=>row.calendarExpeditionProof.activityId));}
export function interruptedHMKActivityIds(journal=[]){return new Set(journal.filter(row=>row?.calendarActivityInterruptProof?.format===STOP).map(row=>row.calendarActivityInterruptProof.activityId));}
export function activeHMKActivities(journal=[],clock){
 if(!clock)return [];
 const done=scheduledHMKCompletionIds(journal),stopped=interruptedHMKActivityIds(journal);
 return plannedHMKActivities(journal,activeClockKey(clock)).filter(row=>!done.has(row.id)&&!stopped.has(row.id)&&row.calendarActivityProof.endMinute>clock.minute);
}
/** GM records an interruption; it never moves campaign time, alters a past
 * activity, or awards recovery for an incomplete rest. */
/** Printed p.146 scales actual distance for short treks; p.150 establishes
 * per-HOUR Double Time END rolls. HMK gives no automatic fractional-hour
 * fatigue or fractional Loaded surcharge: GM must explicitly adjudicate it.
 * Existing full-hour rolls are never discarded or rerolled.
 */
export function interruptedTrekOutcome(plan,elapsedMinutes,partialWeariness=null){
 check(plan?.kind==='travel'&&min(elapsedMinutes)&&elapsedMinutes<plan.durationMinutes,
  'Přerušená cesta musí být kratší než skutečně plánovaný interval.');
 const doubled=['double-walk','double-drover'].includes(plan.mode);
 const fullHours=doubled?Math.floor(elapsedMinutes/60):0;
 const partialHourMinutes=doubled?elapsedMinutes%60:elapsedMinutes;
 const completedHourRolls=doubled?plan.rolls.slice(0,fullHours):[];
 const earned=completedHourRolls.reduce((sum,r)=>sum+Math.max(0,plan.base-(r.success?5:0)),0);
 const automatic=elapsedMinutes===0||(doubled&&partialHourMinutes===0&&
  !(plan.extraLoad||plan.animalExtraLoad||plan.weatherExtra));
 check(automatic||Number.isSafeInteger(partialWeariness),
  'Částečná cestovní únava vyžaduje rozhodnutí GM: zadejte Weariness za skutečně absolvovaný interval.');
 const accrual=automatic?earned:partialWeariness;
 check(Number.isSafeInteger(accrual)&&accrual>=earned&&accrual<=plan.accrual,
  'Únava při přerušení musí zahrnout již dokončené hodinové END testy a nesmí převýšit celou hlídku.');
 const round=x=>Math.round(x*1000)/1000;
 return {format:'hmk-interrupted-travel-accounting-v1',elapsedMinutes,fullHours,partialHourMinutes,
  completedHourRolls,earnedByFullHours:earned,accrual,gmDecision:automatic?null:partialWeariness,
  travelledLeagues:round(plan.travelledLeagues*elapsedMinutes/plan.durationMinutes),
  travelledKilometres:round(plan.travelledKilometres*elapsedMinutes/plan.durationMinutes),
  sourcePages:[145,146,150]};
}
export function interruptHMKActivity({journal=[],clock,activityId,reason,id,createdAt,partialWeariness=null,animalPartialWeariness=null}={}){
 check(clock&&min(clock.minute)&&typeof id==='string'&&id&&!journal.some(row=>row.id===id),'Neplatné potvrzení přerušení');
 check(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=400,'Doložte důvod přerušení');
 const source=plannedHMKActivities(journal,activeClockKey(clock)).find(row=>row.id===activityId);
 check(source,'Činnost nepatří do aktuální kampaně');
 const activity=source.calendarActivityProof;
 check(!scheduledHMKCompletionIds(journal).has(source.id)&&!interruptedHMKActivityIds(journal).has(source.id),
  'Tato činnost už byla dokončena nebo přerušena');
 check(clock.minute<activity.endMinute,'Nelze zpětně přerušit již ukončenou činnost');
 const elapsed=Math.max(0,clock.minute-activity.startMinute);
 const partial=activity.plan.kind==='travel'?interruptedTrekOutcome(activity.plan,elapsed,partialWeariness):null;
 const animalPolicies=activity.plan.travelGroup?.animalWeariness??[];
 if(animalPolicies.length){
  // Derived policy needs no GM fields; legacy GM rates still do.
  const provided=animalPartialWeariness??{};
  check(provided&&typeof provided==='object'&&!Array.isArray(provided)&&
   Object.keys(provided).every(id=>animalPolicies.some(p=>p.actorId===id)),
   'Neznámá dílčí únava zvířete.');
  animalPartialWeariness={};
  for(const decision of animalPolicies){
   const supplied=Object.hasOwn(provided,decision.actorId)?provided[decision.actorId]:null;
   const delta=actualAnimalWeariness(decision,elapsed,supplied);
   check(decision.gmConfirmed===false||supplied!==null,
    'Chybí rozhodnutí GM pro zvíře '+decision.actorId);
   animalPartialWeariness[decision.actorId]=delta;
  }
 }
 const p={format:STOP,activityId:source.id,characterId:activity.characterId,
  campaignId:activeClockKey(clock),startMinute:activity.startMinute,
  minute:clock.minute,elapsedMinutes:Math.max(0,clock.minute-activity.startMinute),
  reason:reason.trim(),awardFatigue:false,...(partial?{partialTravel:partial}:{}),
  ...(animalPolicies.length?{animalPartialWeariness:structuredClone(animalPartialWeariness)}:{}),
  ...(!partial&&activity.plan.kind==='travel'&&Number.isFinite(activity.plan.travelledLeagues)&&Number.isFinite(activity.plan.travelledKilometres)?{
   // Printed short-trek ratio p.146: provisional distance only. END SR is
   // NEVER prorated from a four-hour test or awarded for an incomplete watch.
   projectedShortTravel:{format:'hmk-interrupted-short-trek-v1',
    elapsedMinutes:Math.max(0,clock.minute-activity.startMinute),
    projectedLeagues:Math.round(activity.plan.travelledLeagues*Math.max(0,clock.minute-activity.startMinute)/activity.durationMinutes*1000)/1000,
    projectedKilometres:Math.round(activity.plan.travelledKilometres*Math.max(0,clock.minute-activity.startMinute)/activity.durationMinutes*1000)/1000,
    confirmedDistance:false,sourcePage:146}}:{})};
 return {id,createdAt,characterId:source.characterId,calendarCampaignId:source.calendarCampaignId,
  campaignMinute:clock.minute,title:'HMK · přerušeno · '+activity.kind+' · '+activity.name,
  body:'Přerušeno: '+reason.trim()+'. Nedokončený odpočinek neobnovuje únavu. '+(partial?'Doložená částečná cesta: '+partial.elapsedMinutes+' minut, '+partial.travelledLeagues+' leagues, Weariness +'+partial.accrual+'.':'Další zdravotní následky vyhodnocuje GM.')+
   (p.projectedShortTravel?' Orientační vzdálenost při nepřetržitém tempu '+p.projectedShortTravel.projectedLeagues+' leagues; skutečná trasa není automaticky potvrzena.':''),
  calendarActivityInterruptProof:p};
}
export function scheduleHMKActivity({journal=[],clock,characterId,name='',kind,plan,id,origin='none'}={}){
 check(clock&&min(clock.minute)&&typeof characterId==='string'&&characterId&&typeof id==='string'&&id,'Činnost vyžaduje postavu, čas a jedinečné ID');
 check(plan&&min(plan.durationMinutes)&&plan.durationMinutes>0&&clock.minute+plan.durationMinutes<=1e9,'Neplatné trvání činnosti');
 check(!journal.some(row=>row.id===id),'Duplicitní identita činnosti');
 const campaignId=activeClockKey(clock),startMinute=clock.minute,endMinute=startMinute+plan.durationMinutes;
 const done=scheduledHMKCompletionIds(journal),stopped=interruptedHMKActivityIds(journal);
 // Only one pending activity per character can cover a given minute; other
 // characters remain independent and may sleep/travel in parallel.
 for(const row of plannedHMKActivities(journal,campaignId)){
  const a=row.calendarActivityProof;
  if(a.characterId!==characterId||done.has(row.id)||stopped.has(row.id))continue;
  check(endMinute<=a.startMinute||startMinute>=a.endMinute,
   'Postava '+(name||characterId)+' už má v této době naplánovanou činnost ('+a.kind+').');
 }
 // A guide's single authenticated Trekking watch is shared by the party,
 // but each traveler owns independent END dice, fatigue and completion.
 // A second group cannot reuse that watch; a second member of the SAME group can.
 const sameSource=journal.filter(row=>plan.trekSourceId&&(
  row.calendarActivityProof?.plan?.trekSourceId===plan.trekSourceId||
  row.calendarExpeditionProof?.trekSourceId===plan.trekSourceId));
 check(!sameSource.some(row=>row.characterId===characterId||
  !plan.travelGroup||row.calendarActivityProof?.plan?.travelGroup?.id!==plan.travelGroup.id),
  'Cestovní hlídka už byla vyhodnocena nebo patří jinému plánování.');
 const activity={format:F,id,characterId,name,kind,startMinute,endMinute,durationMinutes:plan.durationMinutes,origin,plan:structuredClone(plan)};
 return {id,characterId,calendarCampaignId:campaignId,campaignMinute:startMinute,
  title:'HMK · '+kind+' · '+name,
  body:'Naplánovaná činnost '+name+' · '+kind+' · '+startMinute+'–'+endMinute+' min. Únava bude změněna až po posunu času GM.',
  calendarActivityProof:activity};
}
/** A single group completion posts the GM-approved animal weariness once.
 * All travellers must have genuine completed activity proofs first.
 */
function finishApprovedAnimalWeariness(database,{idFactory,stamp,campaignId}){
 const activities=plannedHMKActivities(database.journal,campaignId);
 const groups=new Map();
 for(const row of activities){
  const group=row.calendarActivityProof.plan?.travelGroup;
  if(group?.animalWeariness?.length){
   if(!groups.has(group.id))groups.set(group.id,[]);
   groups.get(group.id).push(row);
  }
 }
 const output=[];
 for(const rows of groups.values()){
  const plan=rows[0].calendarActivityProof.plan,group=plan.travelGroup;
  if(rows.length!==group.memberIds.length)continue;
  const results=rows.map(row=>database.journal.find(j=>j.calendarExpeditionProof?.activityId===row.id));
  if(results.some(r=>!r))continue;
  const interrupts=results.map(r=>r.calendarExpeditionProof.interrupted===true);
  check(interrupts.every(v=>v===interrupts[0]),'Skupina nemá shodný stav přerušení.');
  check(results.every(r=>JSON.stringify(r.calendarExpeditionProof.animalPartialWeariness??null)===
   JSON.stringify(results[0].calendarExpeditionProof.animalPartialWeariness??null)),
   'Přerušení celé družiny vyžaduje shodné zdravotní rozhodnutí GM pro každé zvíře.');
  const elapsed=results[0].calendarExpeditionProof.durationMinutes;
  check(results.every(r=>r.calendarExpeditionProof.durationMinutes===elapsed&&
   r.campaignMinute===results[0].campaignMinute), 'Zvířecí únava vyžaduje společnou dokončenou dobu cesty.');
  const already=new Set(database.journal.filter(j=>j.calendarTrekAnimalFatigueProof?.groupId===group.id).map(j=>j.characterId));
  const trek=database.journal.find(j=>j.id===plan.trekSourceId)?.calendarTrekProof;
  check(trek?.partyModes,'Zvířecí únava nemá původní Trekking Routine.');
  validateAnimalWeariness(trek.partyModes.animals??[],group.animalWeariness,group.planningKind);
  // Preflight all animal decisions before a single animal is altered.
  const work=group.animalWeariness.filter(policy=>!already.has(policy.actorId)).map(policy=>{
   const actor=database.characters.find(c=>c.id===policy.actorId);
   check(actor?.hmk?.combatState,'Chybí původní Combat State zvířete '+policy.actorId);
   const partial=interrupts[0]?results[0].calendarExpeditionProof.animalPartialWeariness?.[policy.actorId]:null;
   const delta=actualAnimalWeariness(policy,elapsed,partial??null);
   if(!interrupts[0]){
    const atStart=(trek.partyModes.animals??[]).find(x=>x.id===policy.actorId)?.health;
    check(atStart&&JSON.stringify(trekRegisteredAnimalHealth(actor))===JSON.stringify(atStart),
     'Zdravotní stav zvířete se změnil; GM musí doložit okamžik přerušení.');
   }
   return {policy,actor,delta};
  });
  for(const {policy,actor,delta} of work){
   const proof=commitExpeditionFatigue(actor,{kind:'travel',accrual:delta,durationMinutes:elapsed,sourcePages:[145,150,176]},
    results[0].campaignMinute,'gm-adjudication',group.id+':'+policy.actorId);
   database.journal.push({id:idFactory(),characterId:policy.actorId,createdAt:stamp(),calendarCampaignId:campaignId,
    campaignMinute:results[0].campaignMinute,title:'HMK · zvíře · Weariness · '+(actor.name||actor.id),
    body:(policy.gmConfirmed?'Rozhodnutí GM':'Odvozený automatický režim')+
     ' ('+policy.reason+'), skutečně '+elapsed+' minut, Weariness +'+delta+'.',
    calendarTrekAnimalFatigueProof:{format:'hmk-calendar-animal-fatigue-v1',groupId:group.id,
     trekSourceId:plan.trekSourceId,animalId:policy.actorId,elapsedMinutes:elapsed,delta,
     gmPolicy:structuredClone(policy),priorFatigue:proof.priorFatigue,finalFatigue:proof.finalFatigue,
     sourcePages:[145,150,176]}});
   output.push(database.journal[database.journal.length-1]);
  }
 }
 return output;
}
/** Called atomically from the GM clock advance mutation, never on form submit.
 * Each completed action produces an append-only authoritative rule proof.
 */
export function finishDueHMKActivities(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Chybí generátor auditních ID');
 const campaignId=activeClockKey(clock),done=scheduledHMKCompletionIds(database.journal),stopped=interruptedHMKActivityIds(database.journal);
 // Even if the GM jumps only part of a watch (no completion due yet), do
 // not silently pass a known Fatigue-40 threshold mid–Double Time. Preserve
 // the previous minutes on transaction rollback and permit stopping exactly
 // at the last completed, safe hour. Never fabricate a mode transition.
 for(const row of plannedHMKActivities(database.journal,campaignId)){
  if(done.has(row.id)||stopped.has(row.id))continue;
  const act=row.calendarActivityProof,group=act.plan?.travelGroup;
  if(!group?.animalWeariness?.length)continue;
  const trek=database.journal.find(j=>j.id===act.plan.trekSourceId)?.calendarTrekProof;
  for(const policy of group.animalWeariness){
   if(policy.period!=='hour')continue;
   const animal=trek?.partyModes?.animals?.find(a=>a.id===policy.actorId);
   if(!animal?.health)continue;
   const cutoff=animalDoubleTimeCutoff(act.startMinute,animal.health.fatigue,policy);
   check(cutoff===null||clock.minute<=cutoff,
    'Zvíře '+policy.actorId+' dosahuje Fatigue 40 v minutě '+cutoff+
    '. Čas nesmí pokračovat bez přerušení této hlídky v doložené minutě a rozhodnutí GM (HMK 145).');
  }
 }
 const due=plannedHMKActivities(database.journal,campaignId).filter(row=>
  !done.has(row.id)&&!stopped.has(row.id)&&row.calendarActivityProof.endMinute<=clock.minute)
  .sort((a,b)=>a.calendarActivityProof.endMinute-b.calendarActivityProof.endMinute||a.id.localeCompare(b.id));
 // Preflight ALL due travel activities before ANY actor receives Fatigue.
 // A mount/pack beast injured or exhausted since scheduling cannot secretly
 // complete an unchanged 4-hour trek. The GM must interrupt the group at the
 // actual incident minute; only then is a partial distance/fatigue warranted.
 for(const row of due){
  const proof=row.calendarActivityProof?.plan;
  if(proof?.kind!=='travel'||!proof.trekSourceId)continue;
  const trek=database.journal.find(j=>j.id===proof.trekSourceId)?.calendarTrekProof;
  for(const animal of trek?.partyModes?.animals??[]){
   if(!animal.health)continue; // v93.512 text-only animals have no fabricated state.
   const actor=database.characters.find(c=>c.id===animal.id);
   check(actor,'Registrované cestovní zvíře '+animal.id+' již není v autoritativním registru. GM musí rozhodnout o přerušení cesty.');
   const current=trekRegisteredAnimalHealth(actor);
   check(JSON.stringify(current)===JSON.stringify(animal.health),
    'Zdravotní stav zvířete '+animal.id+' se během plánované hlídky změnil. GM musí cestu přerušit v čase události; nelze přiznat celou vzdálenost.');
  }
 }
 const completed=[];
 for(const row of due){
  const activity=row.calendarActivityProof;
  const actor=database.characters.find(c=>c.id===activity.characterId);
  check(actor,'Nelze dokončit činnost: postava už není dostupná.');
  // A new injury, fatigue event or earlier rest can alter the fatigue during
  // this interval. Recalculate recovery using CURRENT authoritative state.
  // A rest cannot finish if the actor was demonstrably acting/injured in
  // its middle. GM must interrupt the interval at the event time; otherwise
  // a sleep interrupted by combat would incorrectly heal Weariness.
  if(activity.plan.kind!=='travel'){
   const i=database.journal.findIndex(x=>x.id===row.id);
   const collision=database.journal.slice(i+1).find(x=>x.characterId===actor.id&&
    x.calendarCampaignId===campaignId&&Number.isSafeInteger(x.campaignMinute)&&
    x.campaignMinute>=activity.startMinute&&x.campaignMinute<activity.endMinute&&
    (x.combatProof||x.skillTestProof||x.calendarTrekProof));
   check(!collision,actor.name+': během plánovaného odpočinku proběhla jiná doložená akce. '+
    'Před dalším posunem času GM nejprve přerušte činnost v jejím aktuálním čase.');
  }
  // The actor might never have entered Combat.  Do not read the optional
  // raw profile directly: its Fatigue authority is created at the FIRST
  // completed activity, then kept by the ordinary persistent Combat State.
  // A corrupted existing state is rejected rather than silently reset.
  const state=expeditionCombatState(actor);
  const plan=activity.plan.kind==='travel'?activity.plan:
   expeditionRestRecovery({minute:activity.startMinute,kind:activity.kind,
    current:state.fatigue[activity.kind==='winded'?'windedness':'weariness'],
    claims:actor.hmk.expedition?.claims||{}});
  const proof=commitExpeditionFatigue(actor,plan,activity.endMinute,activity.origin,row.id);
  proof.activityId=row.id;
  const result={id:idFactory(),characterId:actor.id,createdAt:stamp(),calendarCampaignId:campaignId,
   campaignMinute:activity.endMinute,title:'HMK · dokončeno · '+activity.kind+' · '+actor.name,
   body:'Dokončeno v minutě '+activity.endMinute+' na základě činnosti '+row.id+'. Změna únavy '+proof.delta+'.',
   calendarExpeditionProof:proof};
  database.journal.push(result);completed.push(result);
 }
 completed.push(...finishApprovedAnimalWeariness(database,{idFactory,stamp,campaignId}));
 return completed;
}
/** Commit interrupted travel at the actual stop minute, exactly once; never
 * award the missing future part of the watch. Legacy interruptions (v93.511)
 * stay historical and are NOT silently recalculated on import.
 */
export function finishInterruptedHMKTravel(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Chybí generátor důkazů');
 const campaignId=activeClockKey(clock),done=scheduledHMKCompletionIds(database.journal);
 const results=[];
 for(const stop of [...database.journal]){
  const p=stop.calendarActivityInterruptProof,part=p?.partialTravel;
  if(p?.format!==STOP||!part||stop.calendarCampaignId!==campaignId||
    stop.campaignMinute>clock.minute||done.has(p.activityId))continue;
  const source=database.journal.find(row=>row.id===p.activityId);
  check(source?.calendarActivityProof?.plan?.kind==='travel','Chybí původní cestovní aktivita');
  const a=source.calendarActivityProof,actor=database.characters.find(c=>c.id===a.characterId);
  check(actor,'Neznámá postava přerušené cesty');
  check(JSON.stringify(interruptedTrekOutcome(a.plan,p.elapsedMinutes,part.gmDecision))===JSON.stringify(part),
   'Nesouhlasí přerušený čas, END ani únava.');
  const plan={...a.plan,durationMinutes:p.elapsedMinutes,accrual:part.accrual,
   travelledLeagues:part.travelledLeagues,travelledKilometres:part.travelledKilometres,
   rolls:part.completedHourRolls};
  const proof=commitExpeditionFatigue(actor,plan,p.minute,a.origin,source.id);
  proof.activityId=source.id;proof.interrupted=true;proof.interruptionId=stop.id;
  if(p.animalPartialWeariness)proof.animalPartialWeariness=structuredClone(p.animalPartialWeariness);
  const result={id:idFactory(),createdAt:stamp(),characterId:actor.id,
   calendarCampaignId:campaignId,campaignMinute:p.minute,
   title:'HMK · dílčí cesta · '+actor.name,
   body:'Přerušení po '+p.elapsedMinutes+' min: '+part.travelledLeagues+
    ' leagues, Weariness +'+part.accrual+' (nedokončená část hlídky bez účinku).',
   calendarExpeditionProof:proof};
  database.journal.push(result);done.add(source.id);results.push(result);
 }
 results.push(...finishApprovedAnimalWeariness(database,{idFactory,stamp,campaignId}));
 return results;
}
/** Read-only timeline: individual actions remain visible through the entire
 * activity interval and in the original history. No duplicate state is stored.
 */
export function calendarActorActivities(clock,characters=[],journal=[]){
 if(!clock)return [];
 const campaignId=activeClockKey(clock),allowed=new Map(characters.map(c=>[c.id,c.name]));
 const done=scheduledHMKCompletionIds(journal),interrupts=new Map(journal.filter(row=>row.calendarActivityInterruptProof?.format===STOP).map(row=>[row.calendarActivityInterruptProof.activityId,row]));
 const activities=plannedHMKActivities(journal,campaignId).filter(row=>allowed.has(row.characterId)).map(row=>{
  const a=row.calendarActivityProof,finished=done.has(row.id),stop=interrupts.get(row.id),interrupted=!!stop,isStarted=a.startMinute<=clock.minute;
  const labels={winded:'Klid · 10 minut',rest:'Odpočinek · 4 hodiny',sleep:'Spánek · 8 hodin',travel:'Cesta'};
  return {id:'activity:'+row.id,sourceId:row.id,origin:'activity',kind:a.kind,
   name:allowed.get(row.characterId),characterId:row.characterId,title:labels[a.kind]||'Činnost · '+a.kind,
   description:'Činnost postavy',note:interrupted?'GM přerušil činnost v minutě '+stop.campaignMinute+' ('+stop.calendarActivityInterruptProof.reason+'); '+(stop.calendarActivityInterruptProof.partialTravel?'dokončený podíl cestovní únavy +'+stop.calendarActivityInterruptProof.partialTravel.accrual:'bez obnovy za neúplný odpočinek')+'.':finished?'Pravidlový výsledek byl dokončen a zapsán.':
    clock.minute>=a.endMinute?'Čas činnosti uplynul; pravidlový zápis musí proběhnout při potvrzeném posunu času GM (bez dalšího tlačítka).':isStarted?'Činnost probíhá. Účinek se zapíše teprve po uplynutí intervalu a posunu času GM.':'Naplánovaná činnost.',
   minute:a.startMinute,dueMinute:a.startMinute,endMinute:interrupted?Math.max(a.startMinute,stop.campaignMinute):a.endMinute,
   status:interrupted?'cancelled':finished?'resolved':clock.minute>=a.endMinute?'elapsed':isStarted?'active':'future',destination:'notes'};
 });
 // A cancelled eight-hour rest stops at its documented interruption minute.
 // Record that exact minute as its own visible history event as well.
 const stops=journal.filter(row=>row.calendarActivityInterruptProof?.format===STOP&&
  row.calendarCampaignId===campaignId&&allowed.has(row.characterId)&&
  row.campaignMinute<=clock.minute).map(row=>({
    id:'activity-stop:'+row.id,sourceId:row.id,origin:'activity',kind:'activity-interruption',
    characterId:row.characterId,name:allowed.get(row.characterId),
    title:'HMK · přerušení činnosti',description:'Přerušení činnosti postavy',
    note:row.calendarActivityInterruptProof.reason+' · '+(row.calendarActivityInterruptProof.partialTravel?'částečná cesta vyhodnocena dle absolvovaného času':'neúplný odpočinek bez automatické obnovy')+'.',
    minute:row.campaignMinute,dueMinute:row.campaignMinute,status:'cancelled',destination:'notes'
  }));
 // A stationary Foraging watch covers four hours in one hex. It is not a
 // travelling/fatigue activity and must not secretly advance the GM clock.
 // Show every party member during the documented interval, but do not mark
 // the task completed until its actual Foraging proof exists.
 const stationary=journal.filter(row=>row.calendarCampaignId===campaignId&&
  row.calendarTrekProof?.orienteeringContext?.stationaryForaging===true).flatMap(row=>{
   const start=row.campaignMinute,end=start+240;
   const finished=journal.some(j=>j.calendarCampaignId===campaignId&&
    j.calendarTrekWildernessProof?.sourceId===row.id);
   return (row.calendarTrekProof.partyModes?.memberIds??[row.characterId])
    .filter(id=>allowed.has(id)).map(id=>({
     id:'stationary-foraging:'+row.id+':'+id,sourceId:row.id,origin:'activity',
     kind:'foraging-stationary',characterId:id,name:allowed.get(id),
     title:'HMK · Foraging na místě',description:'Čtyřhodinová hlídka v počátečním hexu',
     note:finished?'Nález doložený skutečnými Foraging hody.':
      'Čeká na doložené Foraging hody. Družina se nepřesunula.',
     minute:start,dueMinute:start,endMinute:end,
     status:finished&&clock.minute>=end?'resolved':clock.minute>=end?'due':clock.minute>=start?'active':'future',
     destination:'notes'
    }));
  });
 return [...activities,...stops,...stationary];
}
/** Explicitly inspect all scheduled cases; legacy evidence is not mutated. */
export function validateHMKActivityEvidence(journal=[]){
 const ids=new Set(),all=new Map(journal.map(row=>[row.id,row]));
 for(const row of journal){
  const a=row.calendarActivityProof;if(!a)continue;
  check(a.format===F&&a.id===row.id&&a.characterId===row.characterId&&min(a.startMinute)&&min(a.endMinute)&&a.endMinute>a.startMinute&&a.endMinute-a.startMinute===a.durationMinutes&&a.plan?.durationMinutes===a.durationMinutes&&row.campaignMinute===a.startMinute,
   'Poškozený časový interval činnosti');
  check(!ids.has(a.id),'Duplicitní činnost');ids.add(a.id);
 }
 // Audit every group as one atomic, time-synchronous watch. Never accept a
 // partial group or a fabricated additional passenger in imported evidence.
 const groups=new Map(),travelWatchOwners=new Map();
 for(const row of journal){
  const a=row.calendarActivityProof,g=a?.plan?.travelGroup;
  if(a?.plan?.trekSourceId){
   const id=a.plan.trekSourceId,owner=g?.id??'solo:'+row.id;
   check(!travelWatchOwners.has(id)||travelWatchOwners.get(id)===owner,
    'Jedna doložená cestovní hlídka nesmí být použita dvěma nezávislými skupinami');
   travelWatchOwners.set(id,owner);
  }
  if(!g)continue;
  const trek=all.get(a.plan.trekSourceId),skill=all.get(a.plan.orienteeringId);
  check(!trek?.calendarTrekProof?.partyModes||(
   g.memberIds.length===trek.calendarTrekProof.partyModes.memberIds.length&&
   g.memberIds.every(id=>trek.calendarTrekProof.partyModes.memberIds.includes(id))),
   'Cestovní skupina není totožná se skupinou doloženou v Trekking Routine.');
  check(trek?.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&
   trek.characterId===g.guideId&&trek.calendarCampaignId===row.calendarCampaignId&&
   trek.campaignMinute===a.startMinute&&
   skill?.calendarTrekSkillSource?.sourceId===trek.id&&
   skill.calendarTrekSkillSource.hazard==='survival'&&
   skill.characterId===g.guideId&&skill.calendarCampaignId===row.calendarCampaignId,
   'Skupinový průvodce nemá vlastní původní Trekking/Survival důkazy');
  check(a.plan.kind==='travel'&&g.format==='hmk-group-watch-v1'&&typeof g.id==='string'&&g.id&&
   typeof g.guideId==='string'&&Array.isArray(g.memberIds)&&g.memberIds.length>=1&&
   g.memberIds.length===new Set(g.memberIds).size&&g.memberIds.includes(a.characterId)&&
   g.memberIds.includes(g.guideId)&&typeof a.plan.trekSourceId==='string'&&
   typeof a.plan.orienteeringId==='string','Poškozený skupinový cestovní důkaz');
  const signature=JSON.stringify([g,row.calendarCampaignId,a.startMinute,a.endMinute,
   a.plan.trekSourceId,a.plan.orienteeringId,g.planningKind??a.plan.mode]);
  if(g.planningKind){
   const party=trek?.calendarTrekProof?.partyModes;
   check(party&&['walk','ride','drive','double-walk','double-drover'].includes(g.planningKind),
    'Chybí pravidlový původ skupiny.');
   if(g.animalWeariness)validateAnimalWeariness(party.animals??[],g.animalWeariness,g.planningKind);
   const animalDrover=(party.animals??[]).some(x=>x.droverId===a.characterId);
   const expected=g.planningKind==='double-walk'&&animalDrover?'double-drover':g.planningKind;
   check(a.plan.mode===expected,'Hodinová únava neodpovídá roli cestujícího / honáka.');
   const bypass=trek.calendarTrekProof.modes?.ignoreLoaded===true;
   const animalCharge=bypass?(party.animals??[]).filter(x=>x.loaded&&x.droverId===a.characterId)
    .reduce((sum,x)=>sum+Math.floor(x.enc/20)*10,0):0;
   const member=party.members.find(x=>x.id===a.characterId);
   const folkCharge=bypass&&member?.loaded?Math.floor(member.modifiedENC/10)*10:0;
   check(a.plan.animalExtraLoad===animalCharge&&a.plan.extraLoad===folkCharge&&
    a.plan.ignoreLoaded===undefined&&Number.isSafeInteger(a.plan.accrual)&&
    a.plan.accrual===a.plan.rolls.reduce((sum,x)=>sum+Math.max(0,a.plan.base-(x.success?5:0)),0)+
     folkCharge+animalCharge+a.plan.weatherExtra,
    'Fatigue skupiny neodpovídá END SR a doloženému ENC jednotlivých cestujících a zvířat.');
  }
  if(!groups.has(g.id))groups.set(g.id,{signature,members:new Set(),expected:g.memberIds});
  const grp=groups.get(g.id);
  check(grp.signature===signature&&!grp.members.has(a.characterId),'Nesoulad členů a časů skupinové cesty');
  grp.members.add(a.characterId);
 }
 for(const group of groups.values())check(group.members.size===group.expected.length&&
  group.expected.every(id=>group.members.has(id)), 'Skupinová cesta musí být uložena pro všechny vybrané postavy najednou');
 const stopped=new Set(),finished=new Set(),interruptRows=new Map();
 for(const row of journal){const p=row.calendarActivityInterruptProof;if(!p)continue;
  const source=all.get(p.activityId),a=source?.calendarActivityProof;
  check(p.format===STOP&&a&&p.characterId===a.characterId&&row.characterId===a.characterId&&
   p.campaignId===source.calendarCampaignId&&row.calendarCampaignId===source.calendarCampaignId&&
   min(p.minute)&&p.minute===row.campaignMinute&&p.minute<a.endMinute&&
   p.startMinute===a.startMinute&&p.elapsedMinutes===Math.max(0,p.minute-a.startMinute)&&
   p.awardFatigue===false&&(!a.plan.travelGroup?.animalWeariness?.length||
    (p.animalPartialWeariness&&a.plan.travelGroup.animalWeariness.every(policy=>
      p.animalPartialWeariness[policy.actorId]===actualAnimalWeariness(policy,p.elapsedMinutes,p.animalPartialWeariness[policy.actorId]))))&&(!p.partialTravel||JSON.stringify(interruptedTrekOutcome(a.plan,p.elapsedMinutes,p.partialTravel.gmDecision))===JSON.stringify(p.partialTravel))&&(!p.projectedShortTravel||(
    p.projectedShortTravel.format==='hmk-interrupted-short-trek-v1'&&
    p.projectedShortTravel.confirmedDistance===false&&
    p.projectedShortTravel.elapsedMinutes===p.elapsedMinutes&&
    a.plan.kind==='travel'&&
    p.projectedShortTravel.projectedLeagues===Math.round(a.plan.travelledLeagues*p.elapsedMinutes/a.durationMinutes*1000)/1000&&
    p.projectedShortTravel.projectedKilometres===Math.round(a.plan.travelledKilometres*p.elapsedMinutes/a.durationMinutes*1000)/1000))&&
   typeof p.reason==='string'&&p.reason.length>=3&&!stopped.has(p.activityId),
   'Přerušení činnosti nemá jednoznačný platný zdroj');
  stopped.add(p.activityId);interruptRows.set(p.activityId,row);
 }
 for(const row of journal){const p=row.calendarExpeditionProof;if(!p?.activityId)continue;
  const source=all.get(p.activityId),a=source?.calendarActivityProof;
  const stop=interruptRows.get(p.activityId),partial=stop?.calendarActivityInterruptProof?.partialTravel;
  check(a&&a.characterId===row.characterId&&source.calendarCampaignId===row.calendarCampaignId&&
   p.campaignMinute===row.campaignMinute&&!finished.has(p.activityId)&&
   (p.interrupted===true?!!partial&&p.interruptionId===stop.id&&
     row.campaignMinute===stop.campaignMinute&&p.durationMinutes===partial.elapsedMinutes&&
     p.delta===partial.accrual&&p.travelledLeagues===partial.travelledLeagues&&
     p.travelledKilometres===partial.travelledKilometres:
    !stopped.has(p.activityId)&&a.endMinute===row.campaignMinute)&&
   (!a.plan.travelGroup||JSON.stringify(p.travelGroup)===JSON.stringify(a.plan.travelGroup)),
   'Výsledek činnosti nemá jednoznačný správný zdroj');
  finished.add(p.activityId);
 }
 // Each interrupted member of a group must attest the SAME animal
 // amounts: otherwise one member could forge a later partial outcome.
 const interruptedGroupDecisions=new Map();
 for(const row of journal){
  const result=row.calendarExpeditionProof;
  if(!result?.interrupted||!result.activityId)continue;
  const source=all.get(result.activityId),group=source?.calendarActivityProof?.plan?.travelGroup;
  if(!group?.animalWeariness?.length)continue;
  const signature=JSON.stringify(result.animalPartialWeariness??null);
  check(!interruptedGroupDecisions.has(group.id)||interruptedGroupDecisions.get(group.id)===signature,
   'Členové přerušené družiny mají rozdílná GM rozhodnutí o zvířecí únavě.');
  interruptedGroupDecisions.set(group.id,signature);
 }
 // One animal result per group/animal and only after every group member has finished.
 const animalKeys=new Set();
 for(const row of journal){
  const p=row.calendarTrekAnimalFatigueProof;if(!p)continue;
  const key=p.groupId+':'+p.animalId;
  const rows=journal.filter(j=>j.calendarActivityProof?.plan?.travelGroup?.id===p.groupId);
  check(p.format==='hmk-calendar-animal-fatigue-v1'&&p.animalId===row.characterId&&
   !animalKeys.has(key)&&rows.length>0&&rows.length===rows[0].calendarActivityProof.plan.travelGroup.memberIds.length,
   'Duplicitní nebo osiřelá zvířecí únava.');
  animalKeys.add(key);
  const policy=rows[0].calendarActivityProof.plan.travelGroup.animalWeariness?.find(x=>x.actorId===p.animalId);
  check(policy&&JSON.stringify(policy)===JSON.stringify(p.gmPolicy)&&
   rows.every(r=>journal.some(j=>j.calendarExpeditionProof?.activityId===r.id&&
    j.campaignMinute===row.campaignMinute&&j.calendarExpeditionProof.durationMinutes===p.elapsedMinutes))&&
   p.delta===actualAnimalWeariness(policy,p.elapsedMinutes,
    journal.find(j=>j.calendarExpeditionProof?.activityId===rows[0].id)?.calendarExpeditionProof?.animalPartialWeariness?.[p.animalId]??null)&&
   p.finalFatigue===p.priorFatigue+p.delta&&row.calendarCampaignId===rows[0].calendarCampaignId&&
   row.campaignMinute===rows[0].calendarActivityProof.startMinute+p.elapsedMinutes,
   'Zvířecí zdravotní doklad neodpovídá času, rozhodnutí GM nebo Combat State.');
 }
 return true;
}

/** Treat new activity schedules and their completion proofs as immutable. */
export function assertHMKActivitiesAppendOnly(previous=[],next=[]){
 const current=new Map(next.map(row=>[row.id,row]));
 for(const row of previous){
  if(!row.calendarActivityProof&&!row.calendarExpeditionProof?.activityId&&!row.calendarActivityInterruptProof&&!row.calendarTrekAnimalFatigueProof)continue;
  check(current.has(row.id)&&JSON.stringify(current.get(row.id))===JSON.stringify(row),
   'Dříve uloženou časovanou činnost nebo její výsledek nelze přepsat ani odstranit.');
 }
 return true;
}
