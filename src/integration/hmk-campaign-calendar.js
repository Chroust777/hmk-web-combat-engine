/**
 * HMK v1.2 p.178–182: absolute campaign-time *evidence*, not an alternative
 * combat or healing rules engine. Only GM-confirmed time is authoritative.
 * A day has 1,440 minutes. Day numbers are intentionally neutral: no
 * unsupported Kèthîran month/calendar names or real-world timezone.
 */
import {validateCalendarPlans,nextGMBlockingEvent,assertCalendarPlansAppendOnly} from './hmk-calendar-planner.js';
import {automaticHMKFollowups} from './hmk-calendar-automatic-followups.js';
import {projectedCalendarJournal} from './hmk-calendar-campaign-lifecycle.js';
import {automaticAilmentOnset} from './hmk-calendar-automatic-onsets.js';
export const DAY_MINUTES=1440;
const validInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
const MAX_MINUTE=1000000000;
const KEY=(kind,characterId,woundId='')=>`${kind}:${characterId}:${woundId}`;
const isVerifiedHealthSource=s=>s==='confirmed-combat'||s==='confirmed-health';
const KNOWN=['wound','extended-shock','coma','blood-loss','poison','disease','weather','sleep','aural'];
export function displayCampaignMinute(minute){
 ensure(validInt(minute,-MAX_MINUTE,MAX_MINUTE),'Neplatný čas kampaně');
 const day=Math.floor(minute/DAY_MINUTES)+1;
 const tod=((minute%DAY_MINUTES)+DAY_MINUTES)%DAY_MINUTES;
 return `Den ${day} · ${String(Math.floor(tod/60)).padStart(2,'0')}:${String(tod%60).padStart(2,'0')}`;
}
export function validateCampaignCalendar(clock){
 if(clock==null)return null;
 ensure(clock.format==='hmk-campaign-calendar-v1'&&validInt(clock.minute,0,MAX_MINUTE),
  'Neplatný formát nebo čas kalendáře');
 ensure(typeof clock.label==='string'&&clock.label.length<=120,'Neplatný název kalendáře');
 ensure(Array.isArray(clock.anchors)&&clock.anchors.length<=30000&&Array.isArray(clock.events)&&clock.events.length<=30000,
  'Neplatná časová evidence');
 const keys=new Set(),combatKeys=new Set();
 for(const a of clock.anchors){
  ensure(a&&KNOWN.includes(a.kind)&&typeof a.characterId==='string'&&a.characterId.length>0&&
   a.characterId.length<=200&&validInt(a.minute,-MAX_MINUTE,MAX_MINUTE)&&
   (a.kind!=='wound'||(typeof a.woundId==='string'&&a.woundId.length>0&&a.woundId.length<=200))&&
   (a.kind==='wound'||a.woundId==null)&&
   ['gm-attested','confirmed-combat','confirmed-health'].includes(a.source)&&
   (!isVerifiedHealthSource(a.source)||(typeof a.combatEventId==='string'&&a.combatEventId.length>0))&&
   (a.eventId==null||(typeof a.eventId==='string'&&a.eventId.length>0))&&
   (a.episodeId==null||(['poison','disease','weather','sleep','aural'].includes(a.kind)&&typeof a.episodeId==='string'&&a.episodeId.length>0&&a.episodeId.length<=200)),
   'Neplatný důkaz počátku časované procedury');
  const key=KEY(a.kind,a.characterId,a.woundId);
  // Wound IDs are permanent. Shock/Coma/BP may begin another episode after recovery.
  if(a.kind==='wound')ensure(!keys.has(key),'Duplicitní časový počátek '+key);
  keys.add(key);
  if(isVerifiedHealthSource(a.source)){const origin=key+'@'+a.combatEventId;ensure(!combatKeys.has(origin),'Duplicitní zdroj časové epizody');combatKeys.add(origin);}
 }
 let last=-1;const eventIds=new Set();
 for(const e of clock.events){
  ensure(e&&typeof e.id==='string'&&e.id.length>0&&!eventIds.has(e.id)&&
   ['init','advance','anchor','resolution','tr-origin','plan','resolve-plan','cancel-plan','membership'].includes(e.type)&&validInt(e.minute,0,MAX_MINUTE)&&
   e.minute>=last&&typeof e.reason==='string'&&e.reason.length>0&&e.reason.length<=400,
   'Neplatná nebo zpětně vložená časová událost');
  eventIds.add(e.id);last=e.minute;
 }
 ensure(clock.events.length>0&&clock.events[0].type==='init'&&clock.events.at(-1).minute===clock.minute,
  'Kalendář nemá doložený poslední čas');
 if(clock.characterIds!==undefined){ensure(Array.isArray(clock.characterIds)&&clock.characterIds.length<=10000&&clock.characterIds.every(x=>typeof x==='string'&&x)&&new Set(clock.characterIds).size===clock.characterIds.length,'Neplatné členství postav v kampani');}
 if(clock.journalMinuteEvidence!==undefined){ensure(Array.isArray(clock.journalMinuteEvidence)&&clock.journalMinuteEvidence.length<=400000,'Neplatné propojení starších časů');
  const jIds=new Set();for(const j of clock.journalMinuteEvidence){ensure(j&&typeof j.id==='string'&&j.id&&!jIds.has(j.id)&&typeof j.characterId==='string'&&validInt(j.minute,-MAX_MINUTE,MAX_MINUTE),'Neplatný historický čas hodu');jIds.add(j.id);}}
 validateCalendarPlans(clock);
 return clock;
}
export function createCampaignCalendar({day,hour,minute,label='',eventId,gmConfirmed,campaignId=null,characterIds=null}={}){
 ensure(gmConfirmed===true,'Založení kalendáře musí potvrdit GM');
 ensure(validInt(day,1,600000)&&validInt(hour,0,23)&&validInt(minute,0,59),
  'Zadejte platný den kampaně a čas HH:MM');
 ensure(typeof eventId==='string'&&eventId.length>0,'Chybí identita potvrzení');
 const current=(day-1)*DAY_MINUTES+hour*60+minute;
 const c={format:'hmk-campaign-calendar-v1',label:String(label).slice(0,120),minute:current,
  ...(campaignId?{campaignId}:{}),...(characterIds?{characterIds:[...characterIds]}:{}),anchors:[],events:[{id:eventId,type:'init',minute:current,reason:'GM potvrdil výchozí den a čas kampaně'}]};
 return validateCampaignCalendar(c);
}
export function getCampaignAnchor(clock,kind,characterId,woundId=null){
 if(!clock)return null;
 return clock.anchors.filter(x=>x.kind===kind&&x.characterId===characterId&&
  (kind!=='wound'||x.woundId===woundId)).at(-1)??null;
}
/** Episodes use the original verified Combat event ID, not a second timer. */
export function getCampaignEpisodeAnchor(clock,kind,characterId,episodeId){
 if(!clock)return null;
 return clock.anchors.filter(x=>x.kind===kind&&x.characterId===characterId&&
  (x.combatEventId===episodeId||x.episodeId===episodeId)).at(-1)??null;
}
export function elapsedCalendarDays(clock,kind,characterId,woundId=null){
 const a=getCampaignAnchor(clock,kind,characterId,woundId);
 return a?Math.floor((clock.minute-a.minute)/DAY_MINUTES):null;
}
export function anchorCampaignOrigin(clock,{kind,characterId,woundId=null,elapsedMinutes=0,eventId,source='gm-attested',combatEventId=null,episodeId=null,gmConfirmed=false}={}){
 validateCampaignCalendar(clock);
 ensure(gmConfirmed===true||isVerifiedHealthSource(source),'Původ historické události musí potvrdit GM');
 ensure(KNOWN.includes(kind)&&typeof characterId==='string'&&characterId&&
  (kind!=='wound'||(typeof woundId==='string'&&woundId)), 'Neplatný cíl kotvy');
 const prior=['poison','disease','weather','sleep','aural'].includes(kind)?getCampaignEpisodeAnchor(clock,kind,characterId,combatEventId||episodeId):getCampaignAnchor(clock,kind,characterId,woundId);
 ensure(!prior||(isVerifiedHealthSource(source)&&kind!=='wound'&&combatEventId&&combatEventId!==prior.combatEventId),
  'Časový počátek této události už byl jednou potvrzen');
 ensure(!['poison','disease','weather','sleep','aural'].includes(kind)||
  (isVerifiedHealthSource(source)?!!combatEventId:typeof episodeId==='string'&&episodeId.length>0),'Časovaná epizoda vyžaduje ověřenou identitu');
 ensure(validInt(elapsedMinutes,0,MAX_MINUTE)&&elapsedMinutes<=clock.minute+MAX_MINUTE/2,
  'Neplatná doložená doba od začátku');
 ensure(typeof eventId==='string'&&eventId.length>0&&!clock.events.some(e=>e.id===eventId),
  'Duplicitní časová událost');
 ensure(!isVerifiedHealthSource(source)||(typeof combatEventId==='string'&&combatEventId),
  'Automatická kotva vyžaduje ID potvrzené zdravotní nebo bojové události');
 const next=structuredClone(clock);
 next.anchors.push({kind,characterId,...(kind==='wound'?{woundId}:{}),minute:clock.minute-elapsedMinutes,source,eventId,...(episodeId?{episodeId}:{}),...(isVerifiedHealthSource(source)?{combatEventId}:{})});
 next.events.push({id:eventId,type:'anchor',minute:clock.minute,
  reason:`${source}: ${KEY(kind,characterId,woundId)}; doložený věk ${elapsedMinutes} minut`});
 validateCampaignCalendar(next);return next;
}
/** Add the verified Combat engine event to the SAME durable calendar log. */
export function recordCampaignResolution(clock,{eventId,sourceEventId,characterId,kind}={}){
 validateCampaignCalendar(clock);
 ensure(typeof eventId==='string'&&eventId&&!clock.events.some(e=>e.id===eventId),
  'Neplatná nebo duplicitní kalendářní událost');
 ensure(typeof sourceEventId==='string'&&sourceEventId&&
  typeof characterId==='string'&&characterId&&typeof kind==='string'&&kind&&
  !clock.events.some(e=>e.type==='resolution'&&e.sourceEventId===sourceEventId),
  'Chybí autoritativní událost, nebo je její čas už zapsán');
 const next=structuredClone(clock);
 next.events.push({id:eventId,type:'resolution',minute:clock.minute,sourceEventId,characterId,kind,
  reason:`Pravidlově potvrzené ${kind}; zdravotní událost ${sourceEventId}`});
 validateCampaignCalendar(next);return next;
}
/** Returns scheduled obligations only when their start times are attested.
 * Procedure validation/physical dice remain with their EXISTING engines.
 */
export function campaignCalendarAgenda(clock,characters=[],journal=[]){
 if(!clock)return {due:[],future:[],unknown:[],all:[],suspended:[]};
 validateCampaignCalendar(clock);
 characters=Array.isArray(clock.characterIds)?characters.filter(c=>clock.characterIds.includes(c.id)):characters;
 journal=projectedCalendarJournal(clock,journal);
 const all=[],unknown=[],suspended=[];
 const add=(c,kind,description,daysOrHours,woundId=null,unit='days')=>{
  const anchor=getCampaignAnchor(clock,kind==='healing'||kind==='infection'||kind==='grim'?'wound':kind,c.id,woundId);
  if(!anchor){unknown.push({characterId:c.id,name:c.name,kind,woundId,description,reason:'Chybí potvrzený okamžik začátku'});return;}
  const minute=anchor.minute+daysOrHours*(unit==='hours'?60:DAY_MINUTES);
  all.push({id:KEY(kind,c.id,woundId),characterId:c.id,name:c.name,kind,woundId,
   description,minute,anchorMinute:anchor.minute,status:minute<=clock.minute?'due':'future'});
 };
 for(const c of characters){
  const s=c?.hmk?.healthState;if(!s||s.shock==='KIA')continue;
  if(s.wounds?.some(w=>w.bleeding))unknown.push({characterId:c.id,name:c.name,kind:'bleeding',
   description:'Aktivní krvácení: Blood Loss Advance / Stoppage patří do bojové časové osy',
   reason:'Nejprve vyřešte krvácení přes Combat; 60 kol není automaticky potvrzených 5 minut kampaně'});
  if(s.shockFollowup?.domain==='travel-weather'){
   const q=s.shockFollowup,dueMinute=q.kind==='UNC'?q.originMinute+10:q.originMinute;
   // UNC: ten *actual* minutes from the original Shock; STN/INC: GM
   // certifies the next real action, never a synthetic Combat round.
   all.push({id:KEY('weather-shock',c.id,q.sourceId),characterId:c.id,name:c.name,
    kind:'weather-shock',sourceId:q.sourceId,
    description:q.kind==='UNC'?'Cold/Weather Shock Reroll – po 10 minutách':'Weather Shock Reroll – GM potvrdí další skutečnou akci',
    minute:dueMinute,anchorMinute:q.originMinute,status:dueMinute<=clock.minute?'due':'future'});
  }else if(s.shockFollowup)unknown.push({characterId:c.id,name:c.name,kind:'shock-followup',
   description:'Povinný Shock Reroll v bojové časové ose',reason:'Před posunem času dokončete Shock Follow-up'});
  if(s.extendedShock){add(c,'extended-shock','Extended Shock Course (4 h)',s.extendedShock.elapsedHours+4,null,'hours');}
  if(s.coma?.active&&s.coma.nextCourseDays!=null){add(c,'coma','Coma Course (d10 dní)',s.coma.elapsedDays+s.coma.nextCourseDays);}
  if(s.bloodLoss?.bp>0){add(c,'blood-loss','Blood Loss Regeneration (10 dní)',s.bloodLoss.healingNextDay??10);}
  // HMK p.183–184,186: onsets and courses are timed by confirmed GM data.
  // Older imported episodes lacking a real campaign origin remain unresolved,
  // never assigned a guessed start from their combat round.
  for(const t of s.toxinCourses??[]){
   if(!['incubating','active'].includes(t.status))continue;
   const anchor=getCampaignEpisodeAnchor(clock,'poison',c.id,t.id);
   if(!anchor){unknown.push({characterId:c.id,name:c.name,kind:'poison',description:'Poison '+t.sourceId+' · chybí potvrzená expozice v minutách',reason:'Ukotvěte historickou expozici v Kalendáři'});continue;}
   const minutes=t.status==='incubating'?t.onsetMinutes:t.elapsedMinutes+t.periodMinutes;
   if(!Number.isSafeInteger(minutes)||minutes<0){unknown.push({characterId:c.id,name:c.name,kind:'poison',description:'Poison Course čeká na přesný čas potvrzený GM',reason:'Chybí pravidlový interval'});continue;}
   const minute=anchor.minute+minutes;
   all.push({id:KEY('poison',c.id,t.id),characterId:c.id,name:c.name,kind:'poison',
    sourceId:t.sourceId,episodeId:t.id,elapsedMinutes:minutes,description:t.status==='incubating'?'Poison Onset (HMK 186)':'Poison Course d100 (HMK 184/186)',
    minute,anchorMinute:anchor.minute,status:minute<=clock.minute?'due':'future'});
  }
  for(const t of s.diseaseCourses??[]){
   if(!['pending-profile','incubating','active'].includes(t.status))continue;
   const anchor=getCampaignEpisodeAnchor(clock,'disease',c.id,t.id);
   if(!anchor){unknown.push({characterId:c.id,name:c.name,kind:'disease',description:'Disease '+t.diseaseKey+' · chybí potvrzená expozice v minutách',reason:'Ukotvěte historickou expozici v Kalendáři'});continue;}
   const minutes=t.status==='pending-profile'?0:t.status==='incubating'?t.onsetMinutes:t.elapsedMinutes+DAY_MINUTES;
   if(!Number.isSafeInteger(minutes)||minutes<0){unknown.push({characterId:c.id,name:c.name,kind:'disease',description:'Disease Course čeká na přesný čas potvrzený GM',reason:'Doplňte údaje o nástupu'});continue;}
   const minute=anchor.minute+minutes;
   all.push({id:KEY('disease',c.id,t.id),characterId:c.id,name:c.name,kind:'disease',
    sourceId:t.sourceId,episodeId:t.id,elapsedMinutes:minutes,description:t.status==='pending-profile'?'Disease Profile (GM/d6+d10; HMK 183)':t.status==='incubating'?'Disease Onset (HMK 183)':'Disease Course d100 (HMK 184)',
    minute,anchorMinute:anchor.minute,status:minute<=clock.minute?'due':'future'});
  }
  const blocked=s.wounds?.some(w=>w.healing?.infected);
  const validDueDay=(day)=>Number.isSafeInteger(day)&&day>=1&&day<=100000;
  const unresolved=(w,kind,description,reason)=>unknown.push({characterId:c.id,name:c.name,
   kind,woundId:w.id,description,reason});
  for(const w of s.wounds??[]){
   const h=w.healing;
   // Imported/partially migrated records must NEVER silently stop all
   // healing or make a mandatory daily infection roll disappear.
   if(w.healed){
    if(h?.infected)unresolved(w,'infection','Zhojená rána je stále označena jako infikovaná',
     'Nekonzistentní historický Combat State: GM musí doložit vyléčení infekce; neodhadovat d100 ani datum');
    continue;
   }
   if(!h)continue;
   if(!h.treated&&!h.infected){
    unresolved(w,'treatment','Rána má neúplný záznam Treatment / Untreated',
     'GM musí dokončit rozhodnutí o ošetření v původní zdravotní evidenci; záznam nesmí z kalendáře zmizet');
    continue;
   }
   if(h.infected){
    if(!validDueDay(h.nextInfectionDay)||!Number.isSafeInteger(h.infectionHR)||h.infectionHR<1||h.infectionHR>5){
     unresolved(w,'infection','Aktivní infekce bez platného dalšího Infection Course / HR',
      'Doložte aktuální Infection HR a termín denního Course v původní zdravotní evidenci; čas nelze bezpečně posunout');
    }else add(c,'infection','Infection Course (denně)',h.nextInfectionDay,w.id);
   }
   if(h.grimWound&&w.severity==='G'){
    if(!validDueDay(h.nextGrimShockDay))unresolved(w,'grim','Grim Wound bez platného denního Shock termínu',
     'Doložte poslední Grim Shock a jeho další pravidlový den; automatický d100 se nevytváří');
    else add(c,'grim','Grim Wound Shock (denně)',h.nextGrimShockDay,w.id);
   }
   if(h.treated&&h.noMundaneHealing){
    // Horse fractures and other explicitly blocked mundane recovery are NOT
    // silently assigned healing rolls, nor do they permanently block the
    // unrelated campaign clock. Show a non-dice status for the GM.
    suspended.push({characterId:c.id,name:c.name,kind:'healing-blocked',woundId:w.id,
     description:'Běžné Healing Rolls nejsou pro tuto ránu dostupné',
     reason:'Doložené omezení Healing Rate; rozhodnutí o zvláštním způsobu léčení vyžaduje GM (HMK str.354).'});
   }
   if(h.treated&&!h.noMundaneHealing){
    if(blocked){
     // Infection (HMK p.181) freezes every injury-healing schedule. The
     // stale pre-infection due day is NOT a new roll and must not block
     // calendar progress; after the LAST infection is defeated, the
     // original healing engine reschedules each wound from certified days.
     suspended.push({characterId:c.id,name:c.name,kind:'healing',woundId:w.id,
      description:'Healing Roll pozastaven – aktivní Infection Course',
      reason:'HMK str.181: žádný nový Healing d100 před vyléčením všech infekcí; termín se určí podle potvrzeného aktuálního dne rány.'});
    }else if(!validDueDay(h.nextHealingDay)||!Number.isSafeInteger(h.healingRate)||h.healingRate<1||h.healingRate>6){
     unresolved(w,'healing','Ošetřená rána bez doloženého termínu Healing Roll / HR',
      'Doložte Healing Rate a pětidení termín této rány; zmeškané hody nelze automaticky doplnit');
    }else add(c,'healing','Injury Healing Roll',h.nextHealingDay,w.id);
   }
  }
 }
 const automatic=automaticHMKFollowups(clock,characters,journal,getCampaignEpisodeAnchor);
 // A saved Trekking Routine is only a PREPARATION. It does not by itself
 // start a journey or expose the party to its possible hazards. Preserve its
 // skill/hazard navigation as nonblocking preparation until an authenticated
 // scheduled travel activity actually uses that source.
 // If an activity was cancelled at elapsed minute 0, it never started.
 // An interrupted activity with positive elapsed time remains a real event.
 const startedSources=new Set();
 const calendarId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const interrupts=new Map(journal.filter(j=>j.calendarActivityInterruptProof?.activityId)
  .map(j=>[j.calendarActivityInterruptProof.activityId,j.calendarActivityInterruptProof]));
 for(const row of journal){
  const a=row.calendarActivityProof;
  if(!a?.plan?.trekSourceId||row.calendarCampaignId!==calendarId)continue;
  const stopped=interrupts.get(row.id);
  if(!stopped||stopped.elapsedMinutes>0)startedSources.add(a.plan.trekSourceId);
 }
 for(const row of journal){
  if(row.calendarCampaignId!==calendarId)continue;
  if(row.calendarExpeditionProof?.trekSourceId&&
   (!row.calendarExpeditionProof.interrupted||row.calendarExpeditionProof.durationMinutes>0))
   startedSources.add(row.calendarExpeditionProof.trekSourceId);
  if(row.calendarTrekWildernessProof?.sourceId)startedSources.add(row.calendarTrekWildernessProof.sourceId);
 }
 const prepared=[];
 for(const item of automatic.all){
  if(item.kind.startsWith('trek-')&&!startedSources.has(item.sourceId))
   prepared.push({...item,status:'preparation'});
  else all.push(item);
 }
 unknown.push(...automatic.unknown);
 // Some legacy Combat-time notices have the same canonical obligation as a
 // live automatic entry. Render only the actionable event, retaining the
 // same blocking rule: the original Combat proof must resolve it.
 for(let i=unknown.length-1;i>=0;i--){
  const x=unknown[i];
  if(['bleeding','shock-followup'].includes(x.kind)&&
   all.some(y=>y.kind===x.kind&&y.characterId===x.characterId))unknown.splice(i,1);
 }
 // A potion remains due at exactly its ten-minute preparation deadline.
 // The GM may arrive at the deadline but not skip it without the Herblore result.
 const herbMembers=new Map(characters.map(c=>[c.id,c]));
 for(const j of journal){const h=j.calendarHerbPotionStart;
  if(!h||j.calendarCampaignId!==clock.campaignId||!herbMembers.has(j.characterId)||
   journal.some(x=>x.calendarHerbPotionComplete?.startId===j.id&&x.calendarCampaignId===clock.campaignId))continue;
  const actor=herbMembers.get(j.characterId);
  all.push({id:'herbal-potion:'+j.id,characterId:actor.id,name:actor.name,kind:'herbal-potion',
   sourceId:j.id,description:'Herblore SV – dokončení '+h.herbType+' (HMK 74)',
   minute:h.dueMinute,anchorMinute:h.minute,status:h.dueMinute<=clock.minute?'due':'future'});
 }
 all.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 return {due:all.filter(x=>x.status==='due'),future:all.filter(x=>x.status==='future'),unknown,all,suspended,prepared};
}
export function advanceCampaignCalendar(clock,{deltaMinutes,eventId,reason,gmConfirmed,characters=[],journal=[],deferConcurrentTreatmentAtStart=false}={}){
 validateCampaignCalendar(clock);
 ensure(gmConfirmed===true,'GM musí potvrdit skutečně uplynulý čas');
 ensure(validInt(deltaMinutes,1,MAX_MINUTE)&&clock.minute+deltaMinutes<=MAX_MINUTE,
  'Čas kampaně nelze vrátit nebo překročit bezpečný limit');
 ensure(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=400,
  'Uveďte doložený důvod posunu času (alespoň 3 znaky)');
 ensure(typeof eventId==='string'&&eventId.length>0&&!clock.events.some(e=>e.id===eventId),'Duplicitní ID');
 ensure(typeof deferConcurrentTreatmentAtStart==='boolean','Neplatný režim časovaného Treatment');
 const agenda=campaignCalendarAgenda(clock,characters,journal);
 if(agenda.unknown.length)throw Error('Nelze posunout čas: neověřený nebo neuzavřený časový závazek – '+
  agenda.unknown[0].name+' / '+agenda.unknown[0].description+'. '+agenda.unknown[0].reason);
 const nextMinute=clock.minute+deltaMinutes;
 const gmBlocking=nextGMBlockingEvent(clock,nextMinute);
 if(gmBlocking)throw Error(`Nelze přeskočit nevyřízenou GM událost „${gmBlocking.title}“: ${displayCampaignMinute(gmBlocking.dueMinute)}.`);
 // New Treatment is attested by the ONE wound being completed in this
 // transaction. Do not turn the concurrent-Treatment exception into a generic
 // way to skip old wounds or an arbitrary time interval.
 const completedInThisAdvance=[];
 if(deferConcurrentTreatmentAtStart){
  for(const c of characters)for(const w of c?.hmk?.healthState?.wounds??[]){
   const isOrdinary=w.healing?.treatments?.length===1;
   const isAmputation=w.healed===true&&w.healing?.frostAmputated===true&&
      !!w.healing.amputationResult&&!w.healing?.treatments?.length;
   const a=isAmputation?w.healing.amputationProcedureTime:
    w.healing?.treatments?.at(-1)?.procedureTime;
   if((isOrdinary||isAmputation)&&a?.gmConfirmed===true&&
      a.startMinute===clock.minute&&a.endMinute===nextMinute){
    const anchor=getCampaignAnchor(clock,'wound',c.id,w.id);
    if(anchor&&anchor.minute<=clock.minute)completedInThisAdvance.push({actorId:c.id,woundId:w.id,originMinute:anchor.minute});
   }
  }
  ensure(completedInThisAdvance.length===1,
   'Časovaná výjimka vyžaduje jediný nový, GM potvrzený Treatment se správným začátkem a koncem.');
 }
 const continuousTreatmentCohort=(originMinute)=>{
  if(originMinute===clock.minute)return true;
  if(originMinute>clock.minute)return false;
  const periods=[];
  for(const c of characters)for(const w of c?.hmk?.healthState?.wounds??[]){
   if(getCampaignAnchor(clock,'wound',c.id,w.id)?.minute!==originMinute)continue;
   const verifiedPeriods=[...(w.healing?.treatments??[]).map(t=>t.procedureTime)];
   if(w.healed===true&&w.healing?.frostAmputated===true&&w.healing.amputationResult)
    verifiedPeriods.push(w.healing.amputationProcedureTime);
   for(const t of verifiedPeriods){
    if(t?.gmConfirmed===true&&Number.isSafeInteger(t.startMinute)&&Number.isSafeInteger(t.endMinute)&&
       t.startMinute>=originMinute&&t.endMinute<=clock.minute&&t.startMinute<t.endMinute)
     periods.push({start:t.startMinute,end:t.endMinute});
   }
  }
  periods.sort((a,b)=>a.start-b.start||a.end-b.end);
  let coveredTo=originMinute;
  for(const t of periods){if(t.start!==coveredTo)return false;coveredTo=t.end;}
  return periods.length>0&&coveredTo===clock.minute;
 };
 // A verified incubating Poison/Disease onset is deterministic: its initial
 // HR and symptoms were committed at exposure/profile.  The executor applies
 // its effects atomically during THIS clock change, at the actual onset minute.
 // A subsequent d100 Course is mandatory; never jump past that deadline.
 const blockers=[];
 for(const event of agenda.all){
  if(event.minute>=nextMinute)continue;
  const automatic=automaticAilmentOnset(event,characters);
  if(automatic){
   if(automatic.nextCourseMinute<nextMinute){
    blockers.push({minute:automatic.nextCourseMinute,name:event.name,
     description:(event.kind==='poison'?'Poison':'Disease')+' Course d100 po automatickém nástupu'});
   }
   continue;
  }
  // When two fresh wounds arise at the same minute, a GM-confirmed real
  // Treatment may occupy time while another wound waits untreated. That second
  // Treatment obligation must remain overdue and block the NEXT time advance;
  // it must not make the first legitimate Treatment impossible.
  // This exception is available ONLY to the atomic Treatment executor, never
  // as a generic way to skip healing, infection, shock, or future obligations.
  if(deferConcurrentTreatmentAtStart===true&&event.kind==='treatment'&&event.status==='due'){
   const originMinute=getCampaignAnchor(clock,'wound',event.characterId,event.woundId??event.sourceId)?.minute;
   // A later wound from another onset, a gap between procedures or a second
   // pending health obligation is NOT eligible for this narrow exception.
   if(originMinute===completedInThisAdvance[0].originMinute&&
      continuousTreatmentCohort(originMinute))continue;
  }
  blockers.push(event);
 }
 blockers.sort((a,b)=>a.minute-b.minute);
 const blocked=blockers[0];
 if(blocked)throw Error(`Nelze přeskočit povinný termín ${blocked.description} u ${blocked.name}: ${displayCampaignMinute(blocked.minute)}. Nejprve vyřešte událost.`);
 const next=structuredClone(clock);next.minute=nextMinute;
 next.events.push({id:eventId,type:'advance',minute:nextMinute,reason:reason.trim()});
 validateCampaignCalendar(next);return next;
}
export function assertCampaignCalendarAppendOnly(before,after){
 if(!before?.campaignClock)return true;
 validateCampaignCalendar(before.campaignClock);
 if(!after?.campaignClock){
  const archives=after?.calendarEvidenceArchives??[],prior=before?.calendarEvidenceArchives??[];
  ensure(archives.length===prior.length+1&&archives.at(-1)?.format==='hmk-calendar-character-time-evidence-v1'&&
   before.campaignClock.anchors.length===archives.at(-1).anchors.length&&
   before.campaignClock.anchors.every((a,i)=>JSON.stringify(a)===JSON.stringify(archives.at(-1).anchors[i])),
   'Kalendář lze odstranit jen se zachováním všech časových důkazů postav');
  return true;
 }
 validateCampaignCalendar(after.campaignClock);
 const old=before.campaignClock,now=after.campaignClock;
 ensure(now.minute>=old.minute&&now.label===old.label,'Kalendář se nesmí vracet ani přejmenovat bez migrace');
 ensure(now.events.length>=old.events.length&&now.anchors.length>=old.anchors.length&&
  old.events.every((x,i)=>JSON.stringify(x)===JSON.stringify(now.events[i]))&&
  old.anchors.every((x,i)=>JSON.stringify(x)===JSON.stringify(now.anchors[i])),
  'Dřívější potvrzené důkazy času nelze přepisovat');
 assertCalendarPlansAppendOnly(old,now);
 if(JSON.stringify(old.characterIds??null)!==JSON.stringify(now.characterIds??null))
  ensure(now.events.slice(old.events.length).some(e=>e.type==='membership'),'Změna členství vyžaduje auditní zápis');
 return true;
}
