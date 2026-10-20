/** Automatic HMK follow-up discovery. No dice, no guessed physical context.
 * Every obligation is derived from an actual persistent state or a committed
 * Skill Test. Calendar date is authoritative; combat rounds are not minutes.
 * HMK v1.2 pp.62,67,71,148,169,175–190.
 */
import {criticalActivities} from './hmk-skill-critical-activities.js';
const DAY=1440;
const safe=(x)=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const key=(...xs)=>xs.map(x=>encodeURIComponent(String(x))).join(':');
export function automaticHMKFollowups(clock,characters=[],journal=[],episodeAnchor=()=>null){
 const all=[],unknown=[];
 if(!clock)return {all,unknown};
 const push=(person,kind,sourceId,description,minute,route='combat',extra={})=>{
  if(!safe(minute))return unknown.push({characterId:person.id,name:person.name,kind,description,reason:'Chybí doložený okamžik či lhůta'});
  const id=key('automatic',kind,person.id,sourceId);
  if(all.some(x=>x.id===id))return;
  all.push({id,characterId:person.id,name:person.name,kind,sourceId,description,minute,
   route,status:minute<=clock.minute?'due':'future',...extra});
 };
 for(const c of characters){
  const s=c?.hmk?.combatState;if(!s||s.shock==='KIA')continue;
  // All these are current unresolved obligations, not new fabricated time intervals.
  for(const w of s.wounds??[])if(w.bleeding&&!w.healed)
   push(c,'bleeding',w.id,'Aktivní Bleeder – Blood Stoppage / Blood Loss Advance (HMK 177–178)',clock.minute,'combat',{woundId:w.id});
  // Every committed injury without a resolved initial treatment decision
  // needs routing into the existing Treatment/Untreated workflow. No roll is
  // fabricated and the GM may explicitly record that treatment was absent.
  for(const w of s.wounds??[])if(!w.healed&&!w.healing)
   push(c,'treatment',w.id,'Nová rána – Treatment nebo doložené bez ošetření (HMK 178–179)',clock.minute,'combat',{woundId:w.id});
  if(s.shockFollowup)push(c,'shock-followup',s.shockFollowup.originRound??'shock',
   'Povinný Shock Follow-up – dokončit v bojovém průvodci (HMK 169)',clock.minute,'combat');
  if(s.bloodShockPending)push(c,'blood-shock','pending','Povinný Blood Loss Shock (HMK 177)',clock.minute,'combat');
  if(s.asphyxiaComaPending?.active)push(c,'asphyxia','pending','Asphyxia / Coma – dokončit doložené následky (HMK 183)',clock.minute,'hazards');
  if(c.hmk?.arcane?.pendingPsycheTraitChoice)push(c,'psyche-choice','pending',
   'Nevyřízená volba Psyche Traitu (HMK 188–190)',clock.minute,'combat');
  for(const h of s.environmentalHazards??[]){
   if(!h.active)continue;
   if(h.skinPending)push(c,'weather-skin',h.sourceId,'Frostbite / Sunburn: dokončit anatomická zranění (HMK 185)',clock.minute,'skills');
   const origin=episodeAnchor(clock,'weather',c.id,h.id);
   if(!origin){unknown.push({characterId:c.id,name:c.name,kind:'weather',sourceId:h.sourceId,
    description:`${h.kind} Exposure – trvající stav`,reason:'Chybí ověřená minuta vzniku expozice (starý záznam)'});continue;}
   // An active treatment can use different 5/15/120-minute periods.
   // Without the persisted treatment method this interval is not inferable.
   if(h.treatmentStarted){unknown.push({characterId:c.id,name:c.name,kind:'weather',sourceId:h.sourceId,
    description:'Exposure Healing v běhu',reason:'Neuložený režim léčby / voda – nelze odhadnout další časový interval'});continue;}
   if(safe(h.lastElapsedMinutes)&&safe(h.periodMinutes)&&h.periodMinutes>0)
    push(c,'weather-course',h.sourceId,`${h.kind==='cold'?'Cold':'Heat'} Exposure Course d100 (HMK 185)`,
      origin.minute+h.lastElapsedMinutes+h.periodMinutes,'skills',{elapsedMinutes:h.lastElapsedMinutes+h.periodMinutes});
  }
  const sleep=s.sleepDeprivation;
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
   if(t.recovered===true||!t.manifested||t.manifestationPending)continue;
   const id=key(t.trait,...(t.sourceEventIds??[]));
   if(t.recoverySchedulePending)push(c,'psyche-interval',id,
    `Psyche Recovery · ${t.trait}: nejprve d6 dní (HMK 189)`,clock.minute,'combat');
   else if(Number.isSafeInteger(t.psycheRecoveryPlan?.dueGameDay))push(c,'psyche-recovery',id,
    `Psyche Recovery · ${t.trait}: Will d100 (HMK 189)`,
    (t.psycheRecoveryPlan.dueGameDay-1)*DAY,'combat',{dayPrecision:true});
  }
 }
 // A critical failure has *activity-dependent* consequences: request the
 // existing follow-up workflow, never fabricate a fall, injury or date.
 const byId=new Map(journal.map(e=>[e.id,e]));
 for(const e of journal){
  const p=e?.skillTestProof;if(!p)continue;
  if(p.type==='critical-followup'){
   if(!['CF','F'].includes(p.result?.level))continue;
   if(['climb-easy','climb-difficult','acro-balance','jumping-sv'].includes(p.activity)&&
      !journal.some(z=>['climbing-falling','skill-physical-consequence'].includes(z.skillTestProof?.type)&&z.skillTestProof.sourceId===e.id)){
    const actor=characters.find(c=>c.id===p.actorId);
    if(actor)push(actor,'skill-fall',e.id,'CF navazujícího testu – ověřit výšku a Falling Routine (HMK 67)',clock.minute,'skills');
   }
   if((p.activity==='fishing-sv'&&p.result?.level==='CF')||p.activity==='trek-survival-hazard'){
    if(!journal.some(z=>z.skillTestProof?.type==='skill-physical-consequence'&&z.skillTestProof.sourceId===e.id)){
     const actor=characters.find(c=>c.id===p.actorId);
     if(actor)push(actor,'skill-injury',e.id,'Následek Skill CF – dokončit přes původní Skill Test (HMK 71,148)',clock.minute,'skills');
    }
   }
   continue;
  }
  if(!['success-value-test','success-value-specific','secondary-mastery-value-test','secondary-mastery-test','assistance-success-test','opposed-success-test'].includes(p.type))continue;
  const sides=p.a?[{id:p.actorId,skill:p.skills?.[0],result:p.a,side:'A'},...(p.b?[{id:p.opponentId,skill:p.skills?.[1],result:p.b,side:'B'}]:[])]:[{id:p.actorId,skill:p.skill,result:p.result,side:'A'}];
  for(const x of sides){if(x.result?.level!=='CF'||x.result.forcedCF||!criticalActivities(x.skill).length)continue;
   if(journal.some(z=>z.skillTestProof?.type==='critical-followup'&&z.skillTestProof.originId===e.id&&z.skillTestProof.side===x.side))continue;
   const c=characters.find(c=>c.id===x.id);
   if(c)push(c,'skill-critical',e.id+'-'+x.side,`${x.skill} CF – zvolit skutečnou činnost a navazující pravidlový test`,clock.minute,'skills');
  }
 }
 all.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 return {all,unknown};
}
