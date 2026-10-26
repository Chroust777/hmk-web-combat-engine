import {TR_MONTHS,campaignTRDate,formatTRDate,gmCalendarAgenda,campaignSunsignForDate} from './hmk-calendar-planner.js';
import {calendarEventDestination} from './hmk-calendar-event-routing.js';
import {displayCampaignMinute,campaignCalendarAgenda} from './hmk-campaign-calendar.js';
import {passiveHMKCalendarMilestones} from './hmk-calendar-campaign-lifecycle.js';
import {historicalHMKCalendarEntries} from './hmk-calendar-history.js';
import {calendarActorActivities} from './hmk-calendar-activities.js';
import {calendarNutritionConditionActivities} from './hmk-nutrition-activity.js';
import {calendarVisibleHistory,calendarVisibleActivities} from './hmk-calendar-timeline-visibility.js';
const pad=(x)=>String(x).padStart(2,'0');
const dayNumber=(m)=>Math.floor(m/1440)+1;
const minDay=(n)=>Math.max(1,Math.min(n,694444));
const opts=(a,v)=>a.map(([id,label])=>`<option value="${id}" ${String(id)===String(v)?'selected':''}>${label}</option>`).join('');
export function calendarInitialUI(clock){return {mode:'month',monthShift:0,dayNumber:dayNumber(clock.minute),hour:Math.floor(clock.minute%1440/60),prefillMinute:null};}
function monthDetails(clock,shift){
 const date=campaignTRDate(clock,clock.minute),base=dayNumber(clock.minute);
 if(date){
  const idx=(date.year-1)*12+date.month-1+shift;
  if(idx<0||idx>=9999*12)return null;
  const year=1+Math.floor(idx/12),month=1+idx%12;
  const startDay=base-date.day+(idx-((date.year-1)*12+date.month-1))*30+1;
  return {year,month,label:`${TR_MONTHS[month-1]} · TR ${year}`,startDay};
 }
 const originMonth=Math.floor((base-1)/30),number=originMonth+shift;
 if(number<0||number>23000)return null;
 return {label:`Evidenční měsíc ${number+1} · bez doloženého data TR`,startDay:number*30+1};
}
function dayLabel(clock,n){
 const d=campaignTRDate(clock,(n-1)*1440);
 return d?`${d.day}. ${d.monthName} TR ${d.year}`:`Den kampaně ${n}`;
}
function shortTime(m){return `${pad(Math.floor((m%1440)/60))}:${pad(m%60)}`;}
function remainingActivityTime(minutes){const h=Math.floor(minutes/60),m=minutes%60;const parts=[];if(h)parts.push(h+' '+(h===1?'hodinu':h>=2&&h<=4?'hodiny':'hodin'));if(m)parts.push(m+' '+(m===1?'minutu':m>=2&&m<=4?'minuty':'minut'));return parts.join(' ')||'0 minut';}
function eventMark(p){return p.status==='resolved'?'✓':p.status==='cancelled'?'–':p.status==='due'?'!':p.status==='elapsed'?'◷':p.status==='active'?'▶':'•';}
function eventStatus(p){return p.status==='resolved'?(p.kind==='trek-preparation'?'Podklady zapsány':p.origin==='history'?'Vyhodnoceno':'Dokončeno'):p.status==='cancelled'?'Zrušeno':p.status==='due'?'K vyřízení':p.status==='elapsed'?'Proběhlo':p.status==='active'?'Probíhá':'Naplánováno';}
function eventName(p){return p.title||p.description||'Událost';}
function eventDestination(p){return p.destination==='healing'?'Healing · Combat':p.destination==='skills'?'Skill Tests':p.destination==='combat'?'Combat':p.destination==='inventory'?'Arsenal & Gear':p.destination==='hazards'?'Nebezpečí / Trauma':p.destination==='calendar'?'Kalendář · Starvation/Thirst':'Deník postavy';}
function shortEventName(p){
 // No duplicated HMK prefix, description or bookkeeping IDs in the timeline.
 if(p.origin==='hml')return p.description||p.title||'Pravidlová kontrola';
 if(p.origin==='history')return p.description||p.title||'Následek události';
 if(p.origin==='activity')return p.kind==='foraging-stationary'?'Foraging':p.title||'Plánovaná činnost';
 return p.title||p.description||'Událost světa';
}
function issueAction(p,esc){
 if(p.origin==='passive')return '<span class="hc-soft">Automaticky</span>';
 const id=esc(p.id),isRule=p.origin==='hml'||p.origin==='history';
 const text=p.origin==='history'?'Deník ↗':p.origin==='activity'?'Činnost ↗':
  p.origin==='gm'?'Otevřít ↗':'Kontrola ↗';
 return `${p.characterId?`<button type="button" class="hc-small hc-event-link" title="${esc(eventDestination(p))}" data-cal-link="${esc(p.characterId)}" data-cal-destination="${esc(p.destination||'healing')}" data-cal-kind="${esc(p.kind||'gm')}" data-cal-source="${esc(p.sourceId||p.woundId||'')}" data-cal-elapsed="${esc(p.elapsedMinutes??'')}" ${p.origin==='history'?`data-cal-history-id="${esc(p.sourceId)}"`:''}>${esc(text)}</button>`:(!isRule?`<span class="hc-soft">${esc(p.place||'Celá kampaň')}</span>`:'')}
 ${!isRule&&p.origin==='gm'&&!p.resolution?`<button type="button" class="hc-small hc-event-mark" title="GM: vyřídit událost" aria-label="GM: vyřídit událost" data-cal-resolve="${id}">✓</button><button type="button" class="hc-small hc-event-mark" title="Zrušit událost" aria-label="Zrušit událost" data-cal-cancel="${id}">×</button>`:''}`;
}
function renderAgendaEntry(p,esc,clock){
 const who=p.name||p.place||'Svět',due=esc(displayCampaignMinute(p.dueMinute));
 const note=p.origin==='gm'?(p.note||p.resolution?.note||''):'',label=shortEventName(p);
 const details=[p.woundId?`Rána ${p.woundId}`:'',note].filter(Boolean).join(' · ');
 return `<article class="hc-entry hc-entry--compact ${['skill-fall','skill-critical','skill-injury'].includes(p.kind)?'hc-entry--rule-detail':''} ${p.status==='due'?'hc-entry--due':''} ${['resolved','cancelled'].includes(p.status)?'hc-entry--done':''}" ${details?`title="${esc(details)}"`:''}>
 <div class="hc-event-line"><strong class="hc-event-person">${esc(who)}</strong><time>${due}</time><span class="hc-status hc-status--${esc(p.status)}">${esc(eventStatus(p))}</span></div>
 <div class="hc-event-line hc-event-line--task"><span class="hc-event-description">${esc(label)}</span><span class="hc-actions">${issueAction(p,esc)}</span></div>
 </article>`;
}
export function campaignCalendarBoardHTML({clock,characters=[],journal=[],ui,escapeHTML}={}){
 const esc=escapeHTML,agenda=campaignCalendarAgenda(clock,characters,journal),custom=gmCalendarAgenda(clock);
 const all=[...agenda.all.map(p=>({...p,dueMinute:p.minute,origin:'hml',title:p.name+' · '+p.description,destination:calendarEventDestination(p)})),...passiveHMKCalendarMilestones(clock,characters),...calendarVisibleHistory(historicalHMKCalendarEntries(clock,characters,journal),journal),...calendarVisibleActivities([...calendarActorActivities(clock,characters,journal),...calendarNutritionConditionActivities(clock,characters,journal)]),...custom.map(p=>({...p,origin:'gm',name:characters.find(x=>x.id===p.characterId)?.name||''}))];
 all.sort((a,b)=>a.dueMinute-b.dueMinute||a.id.localeCompare(b.id));
 // Index immutable evidence once. The day/hour/minute views otherwise scan
 // the entire character audit once per cell (30 + 24 + 60 repeated scans).
 const eventsByDay=new Map();
 for(const event of all){const n=dayNumber(event.dueMinute),list=eventsByDay.get(n)||[];list.push(event);eventsByDay.set(n,list);}
 const spanningGM=all.filter(x=>(x.origin==='gm'||x.origin==='activity')&&x.endMinute>x.minute);
 const currentSign=campaignSunsignForDate(campaignTRDate(clock,clock.minute));
 const today=dayNumber(clock.minute),selected=minDay(ui.dayNumber),currentTime=shortTime(clock.minute),month=monthDetails(clock,ui.monthShift);
 const weekEnd=Math.min(1000000000,clock.minute+7*1440);
 // The weekly agenda contains actionable appointments due during the next
 // seven rolling days. Historical completed events remain on their dates.
 const inWeek=p=>(p.dueMinute>=clock.minute&&p.dueMinute<=weekEnd)||
   (['gm','activity'].includes(p.origin)&&!p.resolution&&p.endMinute>clock.minute&&p.minute<=weekEnd);
 const actionable=all.filter(p=>(p.origin==='hml'||(p.origin==='gm'&&p.requiresAction))&&inWeek(p)&&p.status==='due');
 const upcoming=all.filter(p=>inWeek(p)&&!actionable.includes(p)&&p.origin!=='history'&&p.origin!=='passive'&&
  !['resolved','cancelled'].includes(p.status));
 const weeklyUnknown=agenda.unknown;
 const compactWeek=(rows,label)=>`<div class="hc-week-list">${rows.map(p=>renderAgendaEntry(p,esc,clock)).join('')||`<p>Žádné ${label}.</p>`}</div>`;
 const activeRest=all.filter(p=>p.origin==='activity'&&p.status==='active'&&p.endMinute>clock.minute);
 const restOverview=activeRest.length?`<section class="hc-calendar hc-active-actors"><h3>Právě probíhající činnosti · ${activeRest.length}</h3><div class="hc-event-list">${activeRest.map(p=>`<div class="hc-event"><strong>${esc(p.name||'Postava')} · ${esc(p.title)}</strong><p class="hc-hint">${esc(displayCampaignMinute(p.minute))} – ${esc(displayCampaignMinute(p.endMinute))} · konec za ${esc(remainingActivityTime(p.endMinute-clock.minute))}. ${p.kind==='nutrition-conditions'?'Podmínky denní spotřeby; obnova únavy má vlastní čtyřhodinovou činnost.':'Únava se přepočte až po uplynutí intervalu při posunu času GM.'}</p></div>`).join('')}</div></section>`:'';
 const badges=`<section class="hc-calendar hc-weekly"><h3>Přehled na 7 dní</h3><p class="hc-hint">${esc(displayCampaignMinute(clock.minute))} – ${esc(displayCampaignMinute(weekEnd))} · jen rozhodnutí GM, události světa a otevřené povinnosti</p>
 <div class="hc-week-tabs"><details open><summary>K vyřízení · ${actionable.length}</summary>${compactWeek(actionable,'splatné povinnosti')}</details><details><summary>Plánované události a činnosti · ${upcoming.length}</summary>${compactWeek(upcoming,'další termíny')}</details>${weeklyUnknown.length?`<details><summary>Vyžaduje upřesnění · ${weeklyUnknown.length}</summary>${weeklyUnknown.map(x=>`<p class="hc-warning">${esc(x.name)} · ${esc(x.description)} — ${esc(x.reason)}</p>`).join('')}</details>`:''}</div></section>`;
 const title=''; // The dated grid already carries the month and campaign time.
 let visualization='';
 if(ui.mode==='month'){
  const cells=Array.from({length:30},(_,i)=>{
   const n=(month?.startDay??1)+i,valid=n>=1&&n<=694444;
   const events=valid?[...(eventsByDay.get(n)||[]),...spanningGM.filter(x=>dayNumber(x.dueMinute)!==n&&dayNumber(x.minute)<=n&&dayNumber(x.endMinute)>=n)]:[];
   return `<button type="button" class="hc-date ${n===today?'hc-date--now':''} ${n===selected?'hc-date--selected':''}" data-cal-day="${n}" ${valid?'':'disabled'} aria-label="${valid?esc(dayLabel(clock,n)): 'Mimo evidovanou časovou osu'}${n===today?' · nyní':''}">
   <strong>${i+1}</strong>${n===today?'<span class="hc-now-mark">NYNÍ</span>':''}<span class="hc-count">${events.length?esc(String(events.length)+' událostí'):' '}</span>
   ${events.slice(0,2).map(x=>`<span class="hc-date-event ${x.status==='due'?'hc-date-event--due':''}">${x.origin==='gm'&&dayNumber(x.dueMinute)!==n?'↔':eventMark(x)} ${esc(x.name?x.name+' · ':'')}${esc(eventName(x))}${x.status==='resolved'?' · '+esc(eventStatus(x)):''}</span>`).join('')}</button>`;
  });
  visualization=`<section class="hc-calendar"><div class="hc-month-bar"><button type="button" data-cal-action="prev-month" class="hc-small">‹ Předchozí</button><div class="hc-month-guide"><button type="button" class="hc-month-guide-trigger" title="Zobrazit všech 12 měsíců Tuzyn Reckoning" aria-describedby="tr-months-reference">${esc(month?.label||'Mimo rozsah')} <span aria-hidden="true">ⓘ</span></button><div class="hc-month-guide-list" id="tr-months-reference" role="group" aria-label="Všechny měsíce Tuzyn Reckoning"><strong>12 měsíců · každý 30 dní</strong><ol>${TR_MONTHS.map((name,i)=>`<li class="${month?.month===i+1?'hc-month-current':''}">${esc(name)}</li>`).join('')}</ol></div></div><button type="button" data-cal-action="next-month" class="hc-small">Následující ›</button></div>
   ${[0,1,2].map(i=>`<div class="hc-decade-row-label">${i+1}. desetidenní úsek · dny ${i*10+1}–${i*10+10}</div><div class="hc-grid">${cells.slice(i*10,i*10+10).join('')}</div>`).join('')}<p class="hc-hint">Kliknutím na datum otevřete den s hodinami a minutovým rozpisem. Značka NYNÍ označuje skutečný čas kampaně.</p></section>`;
 } else {
  const marks=all.flatMap(x=>['gm','activity'].includes(x.origin)&&x.endMinute>x.minute?
   [{...x,dueMinute:x.minute,title:'Začátek · '+x.title},
    {...x,dueMinute:x.endMinute,title:'Konec · '+x.title}]:[x]);
  const continuing=spanningGM.filter(x=>dayNumber(x.minute)<=selected&&dayNumber(x.endMinute)>=selected);
  const byHour=new Map(),minuteIndex=new Map();
  for(const x of marks)if(dayNumber(x.dueMinute)===selected){
   const hour=Math.floor(x.dueMinute%1440/60),hourList=byHour.get(hour)||[];
   hourList.push(x);byHour.set(hour,hourList);
   const minuteList=minuteIndex.get(x.dueMinute)||[];minuteList.push(x);minuteIndex.set(x.dueMinute,minuteList);
  }
  const hours=Array.from({length:24},(_,h)=>{
   const entries=byHour.get(h)||[];
   const active=today===selected&&Math.floor(clock.minute%1440/60)===h;
   return `<button type="button" data-cal-hour="${h}" class="hc-hour ${ui.hour===h?'hc-hour--selected':''} ${active?'hc-hour--now':''}"><strong>${pad(h)}:00</strong><span>${entries.length?esc(entries.length+' událostí'):'–'}</span>${active?'<em>NYNÍ</em>':''}</button>`;
  }).join('');
  const hourStart=(selected-1)*1440+ui.hour*60,hourEnd=hourStart+60;
  const activeThisHour=spanningGM.filter(x=>x.origin==='activity'&&x.minute<hourEnd&&x.endMinute>hourStart);
  const hourlyActors=activeThisHour.length?`<div class="hc-continuing hc-active-actors"><strong>Činnost postav v této hodině:</strong> ${activeThisHour.map(x=>`${esc(x.name)} · ${esc(eventName(x))} (${esc(displayCampaignMinute(x.minute))}–${esc(displayCampaignMinute(x.endMinute))})`).join(' · ')}</div>`:'';
  const byMinute=Array.from({length:60},(_,m)=>{
   const at=(selected-1)*1440+ui.hour*60+m, entries=minuteIndex.get(at)||[],now=at===clock.minute;
   return `<div class="hc-minute ${now?'hc-minute--now':''}" id="hc-minute-${at}"><div class="hc-minute-commands"><button type="button" class="hc-minute-time" data-cal-prefill="${at}" title="Naplánovat událost na tuto minutu">${pad(ui.hour)}:${pad(m)} ${now?'◀ NYNÍ':'+'}</button>${at>clock.minute?`<button type="button" class="hc-minute-jump" data-cal-set-time="${at}" title="Posunout čas kampaně na ${pad(ui.hour)}:${pad(m)}">▶ Nastavit čas</button>`:''}</div><div class="hc-minute-events">${entries.length?entries.map(p=>renderAgendaEntry(p,esc,clock)).join(''):'<span class="hc-muted-tick">·</span>'}</div></div>`;
  }).join('');
  visualization=`<section class="hc-calendar"><div class="hc-month-bar"><button type="button" class="hc-small" data-cal-action="month">‹ Zpět na měsíce</button><h3>${esc(dayLabel(clock,selected))}</h3><button type="button" class="hc-small" data-cal-action="today">Aktuální den</button></div>${continuing.length?`<div class="hc-continuing"><strong>Činnosti postav a probíhající vícedenní události:</strong> ${continuing.map(x=>`${esc(x.title)} (${esc(displayCampaignMinute(x.minute))}–${esc(displayCampaignMinute(x.endMinute))})`).join(' · ')}</div>`:''}<div class="hc-hours" aria-label="Hodiny dne">${hours}</div>
   <h4>Časová osa ${pad(ui.hour)}:00–${pad(ui.hour)}:59 · přesnost 1 minuta</h4>${hourlyActors}<div class="hc-minutes" role="region" aria-label="Minuty ${pad(ui.hour)}. hodiny">${byMinute}</div><p class="hc-hint">Vyberte hodinu a konkrétní minutu. „+“ připraví událost GM. Tlačítko „Nastavit čas“ posune autoritativní čas kampaně na tuto minutu, pouze dopředu a po kontrole nevyřešených HMK termínů. Minulé dny a vyhodnocené případy zůstávají čitelné.</p></section>`;
 }
 const scheduleAt=ui.prefillMinute??Math.max(clock.minute,(selected-1)*1440+ui.hour*60),planDay=dayNumber(scheduleAt),planHour=Math.floor(scheduleAt%1440/60),planMinute=scheduleAt%60;
 const charOptions=[['','— Celá kampaň —'],...characters.map(c=>[esc(c.id),esc(c.name)])];
 const create=`<section class="hc-calendar hc-planner" id="hc-planner"><h3>Přidat událost GM</h3><p>Trvání zahrnuje začátek a konec intervalu. Volbou „vyžaduje vyřízení“ zabráníte přeskočení termínu bez potvrzení GM.</p>
  <form id="campaign-plan-form"><div class="hc-fields"><label>Název události<input name="title" maxlength="160" required placeholder="Například příjezd posla"></label><label>Místo<input name="place" maxlength="160" placeholder="Pevnost, les, vesnice…"></label><label>Postava<select name="characterId">${opts(charOptions,'')}</select></label><label>Odkaz na část aplikace<select name="destination">${opts([['notes','Deník / poznámky'],['skills','Skill Tests'],['healing','Healing / Combat'],['hazards','Nebezpečí / Trauma'],['combat','Combat'],['inventory','Arsenal & Gear']],'notes')}</select></label>
  <label>Den kampaně<input name="day" required type="number" min="1" max="694444" value="${planDay}"></label><label>Hodina<input name="hour" required type="number" min="0" max="23" value="${planHour}"></label><label>Minuta<input name="minute" required type="number" min="0" max="59" value="${planMinute}"></label><label>Trvání · dny<input name="durationDays" type="number" min="0" max="10000" value="0"></label><label>Trvání · hodiny<input name="durationHours" type="number" min="0" max="23" value="0"></label><label>Trvání · minuty<input name="durationMinutes" type="number" min="0" max="59" value="0"></label><label>Požadovaný okamžik řešení<select name="trigger">${opts([['start','Na začátku'],['end','Na konci trvání']],'start')}</select></label></div>
  <label>Popis / instrukce / podmínky<textarea name="note" maxlength="2000" rows="3" placeholder="Co musí GM nebo hráč udělat…"></textarea></label><label class="hc-check"><input type="checkbox" name="requiresAction" value="yes"> Vyžaduje rozhodnutí / upozornění: nelze přeskočit termín</label><label class="hc-check"><input type="checkbox" name="gmConfirmed" value="yes" required> GM potvrzuje plánovanou událost</label><button type="submit">Zapsat událost na časovou osu</button></form></section>`;
 return `${title}${restOverview}${badges}${visualization}<section class="hc-calendar hc-time-control"><h3>Řízení času kampaně</h3><p class="hc-hint">Čas lze nastavit přímo v jednotlivé minutě zvoleného dne tlačítkem „▶ Nastavit čas“. Již potvrzené minuty nelze vrátit zpět.</p><form id="campaign-quick-advance-form" class="hc-inline"><label>Posun o<select name="deltaMinutes">${opts([[1,'1 minutu'],[5,'5 minut'],[10,'10 minut'],[30,'30 minut'],[60,'1 hodinu'],[240,'4 hodiny'],[1440,'1 den'],[7200,'5 dní']],1)}</select></label><label>Důvod<input name="reason" maxlength="400" required value="Plynutí času ve hře"></label><label class="hc-check"><input name="gmConfirmed" value="yes" type="checkbox" required> Potvrzuji uplynutí času</label><button type="submit">Nastavit čas ›</button></form><p class="hc-hint">Není možné přeskočit nevyřízený doložený HMK termín ani závaznou událost GM. Každé splatné pravidlové vyhodnocení otevře původní pravidlový průvodce; nikdy nepoužívejte náhodné číslo bez zápisu jeho původu.</p></section>
 ${create}`;
}
