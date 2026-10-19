/**
 * HMK v1.2 p.178–182: absolute campaign-time *evidence*, not an alternative
 * combat or healing rules engine. Only GM-confirmed time is authoritative.
 * A day has 1,440 minutes. Day numbers are intentionally neutral: no
 * unsupported Kèthîran month/calendar names or real-world timezone.
 */
import {validateCalendarPlans,nextGMBlockingEvent,assertCalendarPlansAppendOnly} from './hmk-calendar-planner.js';
export const DAY_MINUTES=1440;
const validInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
const MAX_MINUTE=1000000000;
const KEY=(kind,characterId,woundId='')=>`${kind}:${characterId}:${woundId}`;
const KNOWN=['wound','extended-shock','coma','blood-loss','poison','disease'];
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
   ['gm-attested','confirmed-combat'].includes(a.source)&&
   (a.source!=='confirmed-combat'||(typeof a.combatEventId==='string'&&a.combatEventId.length>0))&&
   (a.eventId==null||(typeof a.eventId==='string'&&a.eventId.length>0))&&
   (a.episodeId==null||(['poison','disease'].includes(a.kind)&&typeof a.episodeId==='string'&&a.episodeId.length>0&&a.episodeId.length<=200)),
   'Neplatný důkaz počátku časované procedury');
  const key=KEY(a.kind,a.characterId,a.woundId);
  // Wound IDs are permanent. Shock/Coma/BP may begin another episode after recovery.
  if(a.kind==='wound')ensure(!keys.has(key),'Duplicitní časový počátek '+key);
  keys.add(key);
  if(a.source==='confirmed-combat'){const origin=key+'@'+a.combatEventId;ensure(!combatKeys.has(origin),'Duplicitní zdroj časové epizody');combatKeys.add(origin);}
 }
 let last=-1;const eventIds=new Set();
 for(const e of clock.events){
  ensure(e&&typeof e.id==='string'&&e.id.length>0&&!eventIds.has(e.id)&&
   ['init','advance','anchor','resolution','tr-origin','plan','resolve-plan','cancel-plan'].includes(e.type)&&validInt(e.minute,0,MAX_MINUTE)&&
   e.minute>=last&&typeof e.reason==='string'&&e.reason.length>0&&e.reason.length<=400,
   'Neplatná nebo zpětně vložená časová událost');
  eventIds.add(e.id);last=e.minute;
 }
 ensure(clock.events.length>0&&clock.events[0].type==='init'&&clock.events.at(-1).minute===clock.minute,
  'Kalendář nemá doložený poslední čas');
 validateCalendarPlans(clock);
 return clock;
}
export function createCampaignCalendar({day,hour,minute,label='',eventId,gmConfirmed}={}){
 ensure(gmConfirmed===true,'Založení kalendáře musí potvrdit GM');
 ensure(validInt(day,1,600000)&&validInt(hour,0,23)&&validInt(minute,0,59),
  'Zadejte platný den kampaně a čas HH:MM');
 ensure(typeof eventId==='string'&&eventId.length>0,'Chybí identita potvrzení');
 const current=(day-1)*DAY_MINUTES+hour*60+minute;
 const c={format:'hmk-campaign-calendar-v1',label:String(label).slice(0,120),minute:current,
  anchors:[],events:[{id:eventId,type:'init',minute:current,reason:'GM potvrdil výchozí den a čas kampaně'}]};
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
 ensure(gmConfirmed===true||source==='confirmed-combat','Původ historické události musí potvrdit GM');
 ensure(KNOWN.includes(kind)&&typeof characterId==='string'&&characterId&&
  (kind!=='wound'||(typeof woundId==='string'&&woundId)), 'Neplatný cíl kotvy');
 const prior=['poison','disease'].includes(kind)?getCampaignEpisodeAnchor(clock,kind,characterId,combatEventId||episodeId):getCampaignAnchor(clock,kind,characterId,woundId);
 ensure(!prior||(source==='confirmed-combat'&&kind!=='wound'&&combatEventId&&combatEventId!==prior.combatEventId),
  'Časový počátek této události už byl jednou potvrzen');
 ensure(!['poison','disease'].includes(kind)||
  (source==='confirmed-combat'?!!combatEventId:typeof episodeId==='string'&&episodeId.length>0),'Poison/Disease vyžaduje identitu jedné konkrétní epizody');
 ensure(validInt(elapsedMinutes,0,MAX_MINUTE)&&elapsedMinutes<=clock.minute+MAX_MINUTE/2,
  'Neplatná doložená doba od začátku');
 ensure(typeof eventId==='string'&&eventId.length>0&&!clock.events.some(e=>e.id===eventId),
  'Duplicitní časová událost');
 ensure(source!=='confirmed-combat'||(typeof combatEventId==='string'&&combatEventId),
  'Automatická kotva vyžaduje ID potvrzeného bojového výsledku');
 const next=structuredClone(clock);
 next.anchors.push({kind,characterId,...(kind==='wound'?{woundId}:{}),minute:clock.minute-elapsedMinutes,source,eventId,...(episodeId?{episodeId}:{}),...(source==='confirmed-combat'?{combatEventId}:{})});
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
  reason:`Pravidlově potvrzené ${kind}; Combat event ${sourceEventId}`});
 validateCampaignCalendar(next);return next;
}
/** Returns scheduled obligations only when their start times are attested.
 * Procedure validation/physical dice remain with their EXISTING engines.
 */
export function campaignCalendarAgenda(clock,characters=[]){
 if(!clock)return {due:[],future:[],unknown:[],all:[]};
 validateCampaignCalendar(clock);
 const all=[],unknown=[];
 const add=(c,kind,description,daysOrHours,woundId=null,unit='days')=>{
  const anchor=getCampaignAnchor(clock,kind==='healing'||kind==='infection'||kind==='grim'?'wound':kind,c.id,woundId);
  if(!anchor){unknown.push({characterId:c.id,name:c.name,kind,woundId,description,reason:'Chybí potvrzený okamžik začátku'});return;}
  const minute=anchor.minute+daysOrHours*(unit==='hours'?60:DAY_MINUTES);
  all.push({id:KEY(kind,c.id,woundId),characterId:c.id,name:c.name,kind,woundId,
   description,minute,anchorMinute:anchor.minute,status:minute<=clock.minute?'due':'future'});
 };
 for(const c of characters){
  const s=c?.hmk?.combatState;if(!s||s.shock==='KIA')continue;
  if(s.wounds?.some(w=>w.bleeding))unknown.push({characterId:c.id,name:c.name,kind:'bleeding',
   description:'Aktivní krvácení: Blood Loss Advance / Stoppage patří do bojové časové osy',
   reason:'Nejprve vyřešte krvácení přes Combat; 60 kol není automaticky potvrzených 5 minut kampaně'});
  if(s.shockFollowup)unknown.push({characterId:c.id,name:c.name,kind:'shock-followup',
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
    description:t.status==='incubating'?'Poison Onset (HMK 186)':'Poison Course d100 (HMK 184/186)',
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
    description:t.status==='pending-profile'?'Disease Profile (GM/d6+d10; HMK 183)':t.status==='incubating'?'Disease Onset (HMK 183)':'Disease Course d100 (HMK 184)',
    minute,anchorMinute:anchor.minute,status:minute<=clock.minute?'due':'future'});
  }
  const blocked=s.wounds?.some(w=>w.healing?.infected);
  for(const w of s.wounds??[]){
   if(w.healed)continue;
   const h=w.healing;if(!h)continue;
   if(h.infected&&Number.isSafeInteger(h.nextInfectionDay))add(c,'infection','Infection Course (denně)',h.nextInfectionDay,w.id);
   if(h.grimWound&&Number.isSafeInteger(h.nextGrimShockDay))add(c,'grim','Grim Wound Shock (denně)',h.nextGrimShockDay,w.id);
   if(h.treated&&!blocked&&!h.noMundaneHealing&&Number.isSafeInteger(h.nextHealingDay))
    add(c,'healing','Injury Healing Roll',h.nextHealingDay,w.id);
  }
 }
 all.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 return {due:all.filter(x=>x.status==='due'),future:all.filter(x=>x.status==='future'),unknown,all};
}
export function advanceCampaignCalendar(clock,{deltaMinutes,eventId,reason,gmConfirmed,characters=[]}={}){
 validateCampaignCalendar(clock);
 ensure(gmConfirmed===true,'GM musí potvrdit skutečně uplynulý čas');
 ensure(validInt(deltaMinutes,1,MAX_MINUTE)&&clock.minute+deltaMinutes<=MAX_MINUTE,
  'Čas kampaně nelze vrátit nebo překročit bezpečný limit');
 ensure(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=400,
  'Uveďte doložený důvod posunu času (alespoň 3 znaky)');
 ensure(typeof eventId==='string'&&eventId.length>0&&!clock.events.some(e=>e.id===eventId),'Duplicitní ID');
 const agenda=campaignCalendarAgenda(clock,characters);
 if(agenda.unknown.length)throw Error('Nelze posunout čas: neověřený nebo neuzavřený časový závazek – '+
  agenda.unknown[0].name+' / '+agenda.unknown[0].description+'. '+agenda.unknown[0].reason);
 const nextMinute=clock.minute+deltaMinutes;
 const gmBlocking=nextGMBlockingEvent(clock,nextMinute);
 if(gmBlocking)throw Error(`Nelze přeskočit nevyřízenou GM událost „${gmBlocking.title}“: ${displayCampaignMinute(gmBlocking.dueMinute)}.`);
 const blocked=agenda.all.find(x=>x.minute<nextMinute);
 if(blocked)throw Error(`Nelze přeskočit povinný termín ${blocked.description} u ${blocked.name}: ${displayCampaignMinute(blocked.minute)}. Nejprve vyřešte událost.`);
 const next=structuredClone(clock);next.minute=nextMinute;
 next.events.push({id:eventId,type:'advance',minute:nextMinute,reason:reason.trim()});
 validateCampaignCalendar(next);return next;
}
export function assertCampaignCalendarAppendOnly(before,after){
 if(!before?.campaignClock)return true;
 validateCampaignCalendar(before.campaignClock);
 ensure(after?.campaignClock,'Potvrzený kalendář nelze odstranit běžnou změnou');
 validateCampaignCalendar(after.campaignClock);
 const old=before.campaignClock,now=after.campaignClock;
 ensure(now.minute>=old.minute&&now.label===old.label,'Kalendář se nesmí vracet ani přejmenovat bez migrace');
 ensure(now.events.length>=old.events.length&&now.anchors.length>=old.anchors.length&&
  old.events.every((x,i)=>JSON.stringify(x)===JSON.stringify(now.events[i]))&&
  old.anchors.every((x,i)=>JSON.stringify(x)===JSON.stringify(now.anchors[i])),
  'Dřívější potvrzené důkazy času nelze přepisovat');
 assertCalendarPlansAppendOnly(old,now);
 return true;
}
