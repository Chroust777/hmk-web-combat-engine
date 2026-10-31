/** Automatic HMK follow-up discovery. No dice, no guessed physical context.
 * Every obligation is derived from an actual persistent state or a committed
 * Skill Test. Calendar date is authoritative; combat rounds are not minutes.
 * HMK v1.2 pp.62,67,71,148,169,175–190.
 */
import {criticalActivities,skillFollowupActivities} from './hmk-skill-critical-activities.js';
import {trekkingOutstandingCases} from './hmk-trekking-followups.js';
import {pendingTrackingAwareness} from './hmk-tracking-awareness-537.js';
import {dueInjuryMorale,unresolvedInjuryMishaps} from './persistent-combat-state.js';
const DAY=1440;
const safe=(x)=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const key=(...xs)=>xs.map(x=>encodeURIComponent(String(x))).join(':');
export function automaticHMKFollowups(clock,characters=[],journal=[],episodeAnchor=()=>null){
 const all=[],unknown=[];
 if(!clock)return {all,unknown};
 const push=(person,kind,sourceId,description,minute,route='combat',extra={})=>{
  if(!safe(minute))return unknown.push({characterId:person.id,name:person.name,kind,sourceId,route,description,reason:kind==='skill-fall'?'Původní Skill Test nemá doloženou minutu. Falling Routine je třeba vyřešit podle skutečné výšky; původní test zůstává zachován.':'Chybí doložený okamžik či lhůta'});
  const id=key('automatic',kind,person.id,sourceId);
  if(all.some(x=>x.id===id))return;
  all.push({id,characterId:person.id,name:person.name,kind,sourceId,description,minute,
   route,status:minute<=clock.minute?'due':'future',...extra});
 };
 for(const c of characters){
  const s=c?.hmk?.combatState; if(s?.shock==='KIA')continue;
  // HMK pp.184–186: nutrition is an ailment in persistent Combat State.
  // Its first onset is based on explicit sole-source 24h ration proofs.
  // Advance and Healing dice are NEVER inferred from the time alone.
  for(const m of s?.malnutritionEpisodes??[])if(m.status==='active'&&m.campaignId===(clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`))
   push(c,'malnutrition-course',m.id,`${m.kind==='thirst'?'Thirst':'Starvation'} · Exposure Advance/Healing d100 (HMK 185–186)`,
    m.nextDueMinute,'calendar',{episodeId:m.id});
  // HMK p.300: a bestowed talisman does NOT simply expire. At the exact
  // end of every period its recipient must make Spirit SR (two successful
  // SR for outsiders). The ORIGINAL astral-talisman executor extends the
  // period or terminates the effect; the calendar cannot skip that roll.
  for(const talisman of c.hmk?.liveEffects?.talismans??[]){
   if(talisman.active===false||!Number.isSafeInteger(talisman.until)||
     talisman.until<0||!talisman.itemId)continue;
   push(c,'talisman-period',talisman.itemId,
    'Talisman – Spirit SR při konci období (HMK 300; outsider 2 úspěchy)',
    talisman.until,'skills',{sourceId:talisman.itemId});
  }
  // Mental-trauma recovery is independently valid without an encounter/combat state.
  // The wound and environmental branches below need actual combat evidence.
  // All these are current unresolved obligations, not new fabricated time intervals.
  for(const w of s?.wounds??[])if(w.bleeding&&!w.healed)
   push(c,'bleeding',w.id,'Aktivní Bleeder – Blood Stoppage / Blood Loss Advance (HMK 177–178)',clock.minute,'combat',{woundId:w.id});
  // Skill-generated Serious/Grievous injuries use the SAME mandatory
  // Injury Morale and Mishap queue as a weapon hit (HMK pp.161–162,170).
  // Previously, a Skill Accident outside active Initiative could leave them
  // hidden even though Treatment/Healing were already displayed.
  if(s?.format==='hmk-persistent-combat-v1'){
   for(const m of unresolvedInjuryMishaps(s))push(c,'injury-mishap',m.id,
    'Nevyřízený Injury Mishap – původní Combat průvodce (HMK 161,170)',clock.minute,'combat',{woundId:m.woundId});
   for(const m of dueInjuryMorale(s))push(c,'injury-morale',m.woundId,
    'Povinný Morale po Serious/Grievous zranění (HMK 162)',clock.minute,'combat',{woundId:m.woundId});
  }
  // Every committed injury without a resolved initial treatment decision
  // needs routing into the existing Treatment/Untreated workflow. No roll is
  // fabricated and the GM may explicitly record that treatment was absent.
  for(const w of s?.wounds??[])if(!w.healed&&!w.healing&&!s?.extendedShock&&!(s?.wounds??[]).some(x=>x.bleeding))
   push(c,'treatment',w.id,'Nová rána – Treatment nebo doložené bez ošetření (HMK 178–179)',clock.minute,'combat',{woundId:w.id});
  if(s?.shockFollowup){
   const pending=s.shockFollowup;
   if(pending.kind==='UNC'&&pending.phase==='after-ten-minutes'){
    // HMK p169: an unconscious subject rerolls after ten actual minutes.
    // Use only the ORIGINAL wound-time anchor, never the current clock
    // (which otherwise creates a deadlock before the ten minutes can elapse).
    const origins=(s.wounds??[]).filter(w=>w.recordedRound===pending.originRound&&
      (!pending.timelineId||w.timelineId===pending.timelineId));
    const matches=origins.flatMap(w=>(clock.anchors??[]).filter(a=>a.kind==='wound'&&
      a.characterId===c.id&&a.woundId===w.id));
    const unique=[...new Set(matches.map(a=>a.minute))];
    if(unique.length===1)push(c,'shock-followup',pending.originRound,
      'UNC Shock Reroll po 10 minutách od potvrzeného zranění (HMK 169)',unique[0]+10,'combat');
    else unknown.push({characterId:c.id,name:c.name,kind:'shock-followup',
      description:'UNC Shock Reroll po 10 minutách (HMK 169)',
      reason:'Chybí jednoznačná časová kotva původního zranění; GM musí potvrdit okamžik vzniku Shock'});
   }else push(c,'shock-followup',pending.originRound??'shock',
    'Povinný Shock Follow-up – dokončit v bojovém průvodci (HMK 169)',clock.minute,'combat');
  }
  if(s?.bloodShockPending)push(c,'blood-shock','pending','Povinný Blood Loss Shock (HMK 177)',clock.minute,'combat');
  if(s?.asphyxiaComaPending?.active)push(c,'asphyxia','pending','Asphyxia / Coma – dokončit doložené následky (HMK 183)',clock.minute,'hazards');
  if(c.hmk?.arcane?.pendingPsycheTraitChoice)push(c,'psyche-choice','pending',
   'Nevyřízená volba Psyche Traitu (HMK 188–190)',clock.minute,'combat');
  for(const h of s?.environmentalHazards??[]){
   if(!h.active)continue;
   if(h.skinPending)push(c,'weather-skin',h.sourceId,'Frostbite / Sunburn: dokončit anatomická zranění (HMK 185)',clock.minute,'skills');
   const origin=episodeAnchor(clock,'weather',c.id,h.id);
   if(!origin){unknown.push({characterId:c.id,name:c.name,kind:'weather',sourceId:h.sourceId,
    description:`${h.kind} Exposure – trvající stav`,reason:'Chybí ověřená minuta vzniku expozice (starý záznam)'});continue;}
   // An active treatment can use different 5/15/120-minute periods.
   // Without the persisted treatment method this interval is not inferable.
   // Healing uses a distinct period (warming 120 min, compress 15 min,
   // cool-water compress 5 min); never schedule an exposure advance during healing.
   const method=h.treatmentStarted?'healing':'advance';
   const period=h.treatmentStarted?(h.healingIntervalMinutes??(h.kind==='cold'?120:null)):h.periodMinutes;
   if(!safe(period)||period<=0){unknown.push({characterId:c.id,name:c.name,kind:'weather',sourceId:h.sourceId,
    description:'Exposure Healing v běhu',reason:'Není doložen režim chlazení (5 nebo 15 minut)'});continue;}
   if(safe(h.lastElapsedMinutes))
    push(c,'weather-course',h.sourceId,`${h.kind==='cold'?'Cold':'Heat'} Exposure ${method==='healing'?'Healing':'Course'} d100 (HMK 185)`,
      origin.minute+h.lastElapsedMinutes+period,'skills',{elapsedMinutes:h.lastElapsedMinutes+period,method});
  }
  const sleep=s?.sleepDeprivation;
  if(sleep?.status==='awake'){
   const origin=episodeAnchor(clock,'sleep',c.id,sleep.episodeId);
   if(origin&&safe(sleep.hoursAwake))push(c,'sleep-deprivation',sleep.episodeId,
     'Sleep Deprivation – další END SR d10 po 24 h bdění (HMK 176,186)',
     origin.minute+(sleep.hoursAwake+24)*60,'hazards',{hoursAwake:sleep.hoursAwake+24});
   else unknown.push({characterId:c.id,name:c.name,kind:'sleep-deprivation',
    description:'Sleep Deprivation – otevřené bdění',reason:'Chybí potvrzený začátek 24h období'});
  }
  const arc=c.hmk?.arcane;
  if(arc?.auralShockLevels>0){
   const origin=clock.anchors.filter(a=>a.kind==='aural'&&a.characterId===c.id).at(-1)??null;
   if(origin){
    const last=arc.auralRecoveryLastDay;
    // For repeat rolls use the last certified in-game minute, NEVER midnight
    // inferred from a mere day index. A legacy roll without minute stays unknown.
    const prior=journal.filter(j=>j.characterId===c.id&&j.combatProof?.actionKind==='aural-shock-recovery'&&j.combatProof.gameDay===last).at(-1);
    if(Number.isSafeInteger(last)&&!safe(prior?.campaignMinute)){
     unknown.push({characterId:c.id,name:c.name,kind:'aural-recovery',
      description:'Aural Shock Recovery – další den',reason:'Starší úspěšný hod nemá doloženou minutu kampaně'});
    }else{
     const next=Number.isSafeInteger(last)?prior.campaignMinute+DAY:origin.minute+DAY;
     push(c,'aural-recovery','aural',`Aural Shock Recovery – Will d100 (HMK 190)`,next,'combat');
    }
   }else unknown.push({characterId:c.id,name:c.name,kind:'aural-recovery',
    description:'Aural Shock Recovery',reason:'Chybí doložený okamžik vzniku Aural Shock'});
  }
  for(const t of arc?.psycheTraumas??[]){
   if(t.recovered===true)continue;
   const id=key(t.trait,...(t.sourceEventIds??[]));
   // HMK p.188: the chosen Psyche Trait manifests about ten minutes
   // after trauma, separately from its later d6-day recovery.
   if(t.manifestationPending&&!t.manifested){
    // Source-event identity belongs to the ORIGINAL trauma, not the later
    // administrator's selection of the trait. Choosing a trait five minutes
    // later does not shift its physiologic ~10-minute manifestation time.
    const sources=(t.sourceEventIds??[]).map(originId=>journal.find(j=>j.characterId===c.id&&
      j.combatProof?.sourceEventId===originId&&
      j.combatProof?.actionKind!=='spell-psyche-trait-choice')??
      journal.find(j=>j.characterId===c.id&&j.skillTestProof?.report?.sourceEventId===originId));
    if(sources.length&&sources.every(j=>safe(j?.campaignMinute))){
     push(c,'psyche-manifestation',id,`Psyche Trait ${t.trait} – nástup po přibližně 10 minutách (HMK 188)`,
      Math.max(...sources.map(j=>j.campaignMinute))+10,'combat',{trait:t.trait});
    } else unknown.push({characterId:c.id,name:c.name,kind:'psyche-manifestation',sourceId:id,
      description:`Nástup Psyche Traitu ${t.trait}`,reason:'Chybí ověřený čas vzniku traumatu v historickém zápisu'});
    continue;
   }
   if(!t.manifested)continue;
   if(t.recoverySchedulePending)push(c,'psyche-interval',id,
    `Psyche Recovery · ${t.trait}: nejprve d6 dní (HMK 189)`,clock.minute,'combat');
   else if(Number.isSafeInteger(t.psycheRecoveryPlan?.dueGameDay)){
    const plan=t.psycheRecoveryPlan;
    const witness=journal.find(j=>j.characterId===c.id&&j.combatProof?.actionKind==='psyche-recovery-schedule'&&j.combatProof?.sourceEventId===plan.scheduleEventId);
    if(safe(witness?.campaignMinute))push(c,'psyche-recovery',id,
      `Psyche Recovery · ${t.trait}: Will d100 (HMK 189)`,
      witness.campaignMinute+plan.intervalD6*DAY,'combat');
    else unknown.push({characterId:c.id,name:c.name,kind:'psyche-recovery',sourceId:id,description:`Psyche Recovery · ${t.trait}`,reason:'Chybí přesná minuta doloženého d6 plánu; nelze určit čas Will testu'});
   }
  }
 }
 // Persistent trekking results become distinct obligations until an actual
 // rules-executor proof, not a calendar click, resolves each hazard.
 for(const t of trekkingOutstandingCases(characters,journal,clock.campaignId??null)){
  const actor=characters.find(c=>c.id===t.characterId);
  if(actor)push(actor,t.kind,t.sourceId,t.description,t.minute,t.route,{hazard:t.hazard});
 }
 // A critical failure has *activity-dependent* consequences: request the
 // existing follow-up workflow, never fabricate a fall, injury or date.
 for(const e of journal){
  const p=e?.skillTestProof;if(!p)continue;
  if(e.calendarCampaignId&&clock.campaignId&&e.calendarCampaignId!==clock.campaignId)continue;
  if(p.type==='critical-followup'){
   // A non-dice Survival Hazard follows the original Trekking CF. It has no
   // secondary SL at all, but still requires actual hazard dice / GM routing.
   if(!['CF','F'].includes(p.result?.level)&&p.activity!=='trek-survival-hazard')continue;
   if(['climb-easy','climb-difficult','acro-balance','jumping-sv'].includes(p.activity)&&
      !journal.some(z=>['climbing-falling','skill-physical-consequence'].includes(z.skillTestProof?.type)&&z.skillTestProof.sourceId===e.id)){
    const actor=characters.find(c=>c.id===p.actorId);
    if(actor){
     const activity=criticalActivities(p.skill).find(a=>a.id===p.activity);
     const context=[p.skill,activity?.label||p.activity,p.technique||'navazující test',p.result?.level].filter(Boolean).join(' · ');
     push(actor,'skill-fall',e.id,`Pád po ${context}: určit skutečnou výšku a dokončit Falling Routine (HMK 67)`,e.campaignMinute,'skills');
    }
   }
   if((p.activity==='fishing-sv'&&p.result?.level==='CF')||p.activity==='trek-survival-hazard'){
    if(!journal.some(z=>z.skillTestProof?.type==='skill-physical-consequence'&&z.skillTestProof.sourceId===e.id)){
     const actor=characters.find(c=>c.id===p.actorId);
     if(actor)push(actor,'skill-injury',e.id,'Následek Skill CF – dokončit přes původní Skill Test (HMK 71,148)',e.campaignMinute,'skills');
    }
   }
   continue;
  }
  if(!['success-value-test','success-value-specific','secondary-mastery-value-test','secondary-mastery-test','assistance-success-test','opposed-success-test','success-test'].includes(p.type))continue;
  const sides=p.a?[{id:p.actorId,skill:p.skills?.[0],result:p.a,side:'A'},...(p.b?[{id:p.opponentId,skill:p.skills?.[1],result:p.b,side:'B'}]:[])]:[{id:p.actorId,skill:p.skill,result:p.result,side:'A'}];
  for(const x of sides){
   if(!['F','CF'].includes(x.result?.level)||x.result.forcedCF||!skillFollowupActivities(x.skill,x.result.level).length)continue;
   // An Orienteering Survival CF already has its mandatory p.148 Survival
   // Hazard resolved by the *same* confirmed travel episode. Do not create a
   // second, generic calendar CF for the identical d100. During atomic episode
   // completion, the caller supplies an in-memory (never persisted) preflight
   // certificate. Once committed, the durable episode result is the proof.
   // Before either exists the original CF still blocks unrelated time jumps.
   const episodeOrienteeringCF=x.skill==='Survival'&&x.result.level==='CF'&&
    e.calendarEpisodeSkillLink?.field==='orientationProofId';
   const episodeAlreadyHandled=episodeOrienteeringCF&&journal.some(z=>
    (z.calendarScopedCriticalResolution?.originId===e.id&&
     z.calendarScopedCriticalResolution.campaignId===e.calendarCampaignId)||
    (z.calendarCampaignId===e.calendarCampaignId&&
     z.calendarTimeEpisode?.orientation?.skillId===e.id&&
     !!z.calendarTimeEpisode.survivalHazard&&
     (z.calendarTimeEpisode.hazardDetails||[]).every(h=>!h.requiresGMCompletion)));
   if(episodeAlreadyHandled)continue;
   if(journal.some(z=>z.skillTestProof?.type==='critical-followup'&&z.skillTestProof.originId===e.id&&z.skillTestProof.side===x.side))continue;
   const c=characters.find(c=>c.id===x.id);
   if(c)push(c,'skill-critical',e.id+'-'+x.side,`${x.skill} ${x.result.level} – GM ověří konkrétní činnost a případný navazující test (HMK ${skillFollowupActivities(x.skill,x.result.level)[0].page})`,e.campaignMinute,'skills',
    {originId:e.id,side:x.side,level:x.result.level,decisionRequired:true});
  }
 }
 // A real d3 Animal Training extension and a Will-based Writing delay
 // cannot be assigned a calendar due minute without the ORIGINAL start/end
 // plan. Surface the unresolved scheduling decision, not a fabricated date.
 for(const event of journal){
  if(event.calendarCampaignId!==clock.campaignId)continue;
  const t=event.skillTestProof?.trainingExtension,w=event.skillTestProof?.writingExtension;
  if(!t&&!w)continue;
  const person=characters.find(c=>c.id===event.characterId);if(!person)continue;
  const reason=t?'Původní datum výcviku není doloženo: GM musí odvodit termín podle kalendářních měsíců.':'Doba psaní vyžaduje doložený původní kalendářní plán a skutečný pracovní rytmus.';
  const description=t?`Animal Training CF · ${t.animalName}: d3 ${t.dieD3} → +${t.additionalMonths} měsíce (HMK 65)`:
   `Writing CF · ${w.scope}: ${w.completionTimeMultiplier*100} % původního času (HMK 132)`;
  unknown.push({characterId:person.id,name:person.name,kind:t?'animal-training-date':'writing-completion-date',
    sourceId:event.id,description,reason});
 }
 // Tracking SV 3–4 has a *conditional* p.147 Awareness check, not an
 // unconditional extra d100. Restore this obligation from immutable journal.
 for(const tracking of pendingTrackingAwareness(journal,clock.campaignId??null)){
  const p=tracking.calendarTrekTrackingProof;
  const actor=characters.find(c=>c.id===p.trackerId);
  if(actor)push(actor,'tracking-awareness',tracking.id,
   'Tracking SV '+p.score.adjustedSV+' → Awareness d100; úspěch = 1 Spoor star (HMK 147)',
   tracking.campaignMinute,'skills',{trackingId:tracking.id,decisionRequired:true});
 }
 all.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 return {all,unknown};
}
