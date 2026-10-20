import {TR_MONTHS,campaignTRDate,formatTRDate,gmCalendarAgenda,campaignSunsignForDate} from './hmk-calendar-planner.js';
import {displayCampaignMinute,campaignCalendarAgenda} from './hmk-campaign-calendar.js';
import {passiveHMKCalendarMilestones} from './hmk-calendar-campaign-lifecycle.js';
import {historicalHMKCalendarEntries} from './hmk-calendar-history.js';
import {calendarActorActivities} from './hmk-calendar-activities.js';
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
function eventMark(p){return p.status==='resolved'?'✓':p.status==='cancelled'?'–':p.status==='due'?'!':p.status==='elapsed'?'◷':p.status==='active'?'▶':'•';}
function eventStatus(p){return p.status==='resolved'?(p.kind==='trek-preparation'?'Podklady zapsány':p.origin==='history'?'Vyhodnoceno':'Dokončeno'):p.status==='cancelled'?'Zrušeno':p.status==='due'?'K vyřízení':p.status==='elapsed'?'Proběhlo':p.status==='active'?'Probíhá':'Naplánováno';}
function eventName(p){return p.title||p.description||'Událost';}
function eventDestination(p){return p.destination==='healing'?'Healing · Combat':p.destination==='skills'?'Skill Tests':p.destination==='combat'?'Combat':p.destination==='inventory'?'Arsenal & Gear':p.destination==='hazards'?'Nebezpečí / Trauma':'Deník postavy';}
function issueAction(p,esc){if(p.origin==='passive')return '<span class="hc-soft">Automatická časová změna · bez hodu</span>';const id=esc(p.id),isRule=p.origin==='hml'||p.origin==='history';
 return `${p.characterId?`<button type="button" class="hc-small" data-cal-link="${esc(p.characterId)}" data-cal-destination="${esc(p.destination||'healing')}" data-cal-kind="${esc(p.kind||'gm')}" data-cal-source="${esc(p.sourceId||p.woundId||'')}" data-cal-elapsed="${esc(p.elapsedMinutes??'')}" ${p.origin==='history'?`data-cal-history-id="${esc(p.sourceId)}"`:''}>Otevřít ${esc(eventDestination(p))} ↗</button>`:(!isRule?`<span class="hc-soft">${esc(p.place||'Celá kampaň')}</span>`:'')}
 ${!isRule&&!p.resolution?`<button type="button" class="hc-small" data-cal-resolve="${id}">GM: vyřídit</button><button type="button" class="hc-small" data-cal-cancel="${id}">Zrušit</button>`:''}`;
}
function renderAgendaEntry(p,esc,clock){
 const type=p.origin==='activity'?'HMK · činnost postavy':p.origin==='history'?'HMK · uložený pravidlový výsledek':p.origin==='passive'?'HMK · automatický konec časového účinku':p.origin==='hml'?'HMK · vyžaduje pravidlový průvodce':p.requiresAction?'GM · čeká na rozhodnutí':'GM · událost';
 return `<article class="hc-entry ${p.status==='due'?'hc-entry--due':''} ${['resolved','cancelled'].includes(p.status)?'hc-entry--done':''}"><div class="hc-entry-head"><strong>${esc(eventName(p))}</strong><span>${esc(displayCampaignMinute(p.dueMinute))}</span><span class="hc-status hc-status--${esc(p.status)}">${esc(eventStatus(p))}</span></div>
 <p class="hc-annotation">${esc(type)}${p.characterId&&p.name?' · postava: '+esc(p.name):''}${p.place?' · '+esc(p.place):''}${p.woundId?' · rána '+esc(p.woundId):''}</p>
 ${p.note?`<p>${esc(p.note)}</p>`:''}${p.resolution?`<p class="hc-annotation">${esc(p.status==='cancelled'?'Zrušeno':'Dokončeno')} ${esc(displayCampaignMinute(p.resolution.minute))}${p.resolution.note?' · '+esc(p.resolution.note):''}</p>`:''}${p.endMinute>p.minute?`<p class="hc-annotation">Trvání: ${esc(displayCampaignMinute(p.minute))} → ${esc(displayCampaignMinute(p.endMinute))}</p>`:''}
 <div class="hc-actions">${issueAction(p,esc)}</div></article>`;
}
export function campaignCalendarBoardHTML({clock,characters=[],journal=[],ui,escapeHTML}={}){
 const esc=escapeHTML,agenda=campaignCalendarAgenda(clock,characters,journal),custom=gmCalendarAgenda(clock);
 const all=[...agenda.all.map(p=>({...p,dueMinute:p.minute,origin:'hml',title:p.name+' · '+p.description,destination:['poison','disease','asphyxia','sleep-deprivation'].includes(p.kind)?'hazards':p.route==='skills'?'skills':p.route==='hazards'?'hazards':['treatment','healing','infection','grim','blood-loss','coma','extended-shock'].includes(p.kind)?'healing':'combat'})),...passiveHMKCalendarMilestones(clock,characters),...historicalHMKCalendarEntries(clock,characters,journal),...calendarActorActivities(clock,characters,journal),...custom.map(p=>({...p,origin:'gm',name:characters.find(x=>x.id===p.characterId)?.name||''}))];
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
 const weekRule=all.filter(p=>p.origin==='hml'&&inWeek(p));
 const weekGM=all.filter(p=>p.origin==='gm'&&inWeek(p));
 const weekActivities=all.filter(p=>p.origin==='activity'&&inWeek(p));
 const weeklyUnknown=agenda.unknown;
 const compactWeek=(rows,label)=>`<div class="hc-week-list">${rows.map(p=>renderAgendaEntry(p,esc,clock)).join('')||`<p>Žádné ${label} během následujících 7 dní.</p>`}</div>`;
 const badges=`<section class="hc-calendar hc-weekly"><h3>Přehled na 7 dní · ${esc(displayCampaignMinute(clock.minute))} až ${esc(displayCampaignMinute(weekEnd))}</h3><div class="hc-stats"><span>◷ <b>${esc(displayCampaignMinute(clock.minute))}</b></span><span>${esc(dayLabel(clock,today))}</span>${currentSign?`<span>Sunsign <b>${esc(currentSign.name)}</b>${currentSign.cusp?` · cusp ${esc(currentSign.cusp)}`:''}</span>`:''}</div>
 <div class="hc-week-tabs"><details open><summary>Činnosti postav · ${weekActivities.length}</summary>${compactWeek(weekActivities,'činnosti postav')}</details><details><summary>HMK · ${weekRule.length}</summary>${compactWeek(weekRule,'HMK termíny')}</details><details><summary>GM čekající · ${weekGM.filter(p=>p.status==='due'&&!p.resolution).length} · naplánované ${weekGM.length}</summary>${compactWeek(weekGM,'GM události')}</details><details><summary>Nedoložené · ${weeklyUnknown.length}</summary>${weeklyUnknown.map(x=>`<p class="hc-warning">${esc(x.name)} · ${esc(x.description)} — ${esc(x.reason)}</p>`).join('')||'<p>Žádné nedoložené termíny.</p>'}</details></div></section>`;
 const title=`<div class="hc-title"><div><h2>Tuzyn Reckoning · kalendář</h2><p>12 měsíců × 30 dní · tři desetidenní úseky na měsíc (HMK str. 11, 22). Časová osa používá minuty; bojová kola nejsou převedena na minuty.</p></div><button type="button" class="hc-small" data-cal-action="today">Dnes · ${esc(currentTime)}</button></div>`;
 let visualization='';
 if(ui.mode==='month'){
  const cells=Array.from({length:30},(_,i)=>{
   const n=(month?.startDay??1)+i,valid=n>=1&&n<=694444;
   const events=valid?[...(eventsByDay.get(n)||[]),...spanningGM.filter(x=>dayNumber(x.dueMinute)!==n&&dayNumber(x.minute)<=n&&dayNumber(x.endMinute)>=n)]:[];
   return `<button type="button" class="hc-date ${n===today?'hc-date--now':''} ${n===selected?'hc-date--selected':''}" data-cal-day="${n}" ${valid?'':'disabled'} aria-label="${valid?esc(dayLabel(clock,n)): 'Mimo evidovanou časovou osu'}${n===today?' · nyní':''}">
   <strong>${i+1}</strong>${n===today?'<span class="hc-now-mark">NYNÍ</span>':''}<span class="hc-count">${events.length?esc(String(events.length)+' událostí'):' '}</span>
   ${events.slice(0,2).map(x=>`<span class="hc-date-event ${x.status==='due'?'hc-date-event--due':''}">${x.origin==='gm'&&dayNumber(x.dueMinute)!==n?'↔':eventMark(x)} ${esc(x.name?x.name+' · ':'')}${esc(eventName(x))}${x.status==='resolved'?' · '+esc(eventStatus(x)):''}</span>`).join('')}</button>`;
  });
  visualization=`<section class="hc-calendar"><div class="hc-month-bar"><button type="button" data-cal-action="prev-month" class="hc-small">‹ Předchozí</button><h3>${esc(month?.label||'Mimo rozsah')}</h3><button type="button" data-cal-action="next-month" class="hc-small">Následující ›</button></div>
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
 const weekVisible=all.filter(inWeek);
 const eventsHTML=`<section class="hc-calendar hc-plans"><h3>Časované události a pravidlové závazky</h3><p>Načasované HMK procedury se odvozují z potvrzených stavů postav. Ruční události GM jsou oddělené a nesmějí samy změnit úraz, stav či výsledek hodu.</p>
  ${agenda.unknown.length?`<details><summary>Nedoložené nebo blokující procedury (${agenda.unknown.length})</summary>${agenda.unknown.map(x=>`<p class="hc-warning">${esc(x.name)} · ${esc(x.description)} — ${esc(x.reason)}</p>`).join('')}</details>`:''}
  <details open><summary>Ke zpracování / čeká na hod (${weekVisible.filter(p=>p.status==='due').length})</summary><div class="hc-event-list">${weekVisible.filter(p=>p.status==='due').map(p=>renderAgendaEntry(p,esc,clock)).join('')||'<p>Žádné splatné události.</p>'}</div></details>
  <details><summary>Budoucí události (${weekVisible.filter(p=>p.status==='future').length})</summary><div class="hc-event-list">${weekVisible.filter(p=>p.status==='future').map(p=>renderAgendaEntry(p,esc,clock)).join('')||'<p>Žádné budoucí události.</p>'}</div></details>
  ${weekVisible.some(p=>p.origin==='gm'&&p.minute<clock.minute&&p.endMinute>clock.minute)?`<details><summary>Právě probíhající vícedenní GM události</summary><div class="hc-event-list">${weekVisible.filter(p=>p.origin==='gm'&&p.minute<clock.minute&&p.endMinute>clock.minute).map(p=>renderAgendaEntry(p,esc,clock)).join('')}</div></details>`:''}
  <p class="hc-hint">Historii vyhodnocených událostí najdete přímo v minulých dnech a minutách. Souhrn výše ukazuje pouze termíny od nyní do +7 dní.</p></section>`;
 const create=`<section class="hc-calendar hc-planner" id="hc-planner"><h3>Přidat událost GM</h3><p>Trvání zahrnuje začátek a konec intervalu. Volbou „vyžaduje vyřízení“ zabráníte přeskočení termínu bez potvrzení GM.</p>
  <form id="campaign-plan-form"><div class="hc-fields"><label>Název události<input name="title" maxlength="160" required placeholder="Například příjezd posla"></label><label>Místo<input name="place" maxlength="160" placeholder="Pevnost, les, vesnice…"></label><label>Postava<select name="characterId">${opts(charOptions,'')}</select></label><label>Odkaz na část aplikace<select name="destination">${opts([['notes','Deník / poznámky'],['skills','Skill Tests'],['healing','Healing / Combat'],['hazards','Nebezpečí / Trauma'],['combat','Combat'],['inventory','Arsenal & Gear']],'notes')}</select></label>
  <label>Den kampaně<input name="day" required type="number" min="1" max="694444" value="${planDay}"></label><label>Hodina<input name="hour" required type="number" min="0" max="23" value="${planHour}"></label><label>Minuta<input name="minute" required type="number" min="0" max="59" value="${planMinute}"></label><label>Trvání · dny<input name="durationDays" type="number" min="0" max="10000" value="0"></label><label>Trvání · hodiny<input name="durationHours" type="number" min="0" max="23" value="0"></label><label>Trvání · minuty<input name="durationMinutes" type="number" min="0" max="59" value="0"></label><label>Požadovaný okamžik řešení<select name="trigger">${opts([['start','Na začátku'],['end','Na konci trvání']],'start')}</select></label></div>
  <label>Popis / instrukce / podmínky<textarea name="note" maxlength="2000" rows="3" placeholder="Co musí GM nebo hráč udělat…"></textarea></label><label class="hc-check"><input type="checkbox" name="requiresAction" value="yes"> Vyžaduje rozhodnutí / upozornění: nelze přeskočit termín</label><label class="hc-check"><input type="checkbox" name="gmConfirmed" value="yes" required> GM potvrzuje plánovanou událost</label><button type="submit">Zapsat událost na časovou osu</button></form></section>`;
 const origin=clock.trOrigin,originForm=origin?`<p>Výchozí datum TR bylo GM potvrzeno: <strong>${esc(formatTRDate(campaignTRDate(clock,clock.minute)))}</strong>.</p>`:`<p><strong>TR datum není přiděleno.</strong> Starší kalendář zůstává použitelný bez zpětně domyšlených dat. GM může přiřadit skutečné datum k dnešnímu dni kampaně:</p><form id="campaign-tr-origin-form" class="hc-inline"><label>Rok TR<input name="year" type="number" min="1" max="9999" value="720" required></label><label>Měsíc<select name="month">${opts(TR_MONTHS.map((n,i)=>[i+1,n]),1)}</select></label><label>Den<input name="day" type="number" min="1" max="30" value="1" required></label><label class="hc-check"><input name="gmConfirmed" value="yes" type="checkbox" required> Datum potvrzeno GM</label><button type="submit">Přiřadit datum TR</button></form>`;
 return `${title}${badges}${visualization}<section class="hc-calendar hc-time-control"><h3>Řízení času kampaně</h3><p class="hc-hint">Čas lze nastavit přímo v jednotlivé minutě zvoleného dne tlačítkem „▶ Nastavit čas“. Již potvrzené minuty nelze vrátit zpět.</p><form id="campaign-quick-advance-form" class="hc-inline"><label>Posun o<select name="deltaMinutes">${opts([[1,'1 minutu'],[5,'5 minut'],[10,'10 minut'],[30,'30 minut'],[60,'1 hodinu'],[240,'4 hodiny'],[1440,'1 den'],[7200,'5 dní']],1)}</select></label><label>Důvod<input name="reason" maxlength="400" required value="Plynutí času ve hře"></label><label class="hc-check"><input name="gmConfirmed" value="yes" type="checkbox" required> Potvrzuji uplynutí času</label><button type="submit">Odmáčknout čas ›</button></form><p class="hc-hint">Není možné přeskočit nevyřízený doložený HMK termín ani závaznou událost GM. Každé splatné pravidlové vyhodnocení otevře původní pravidlový průvodce; nikdy nepoužívejte náhodné číslo bez zápisu jeho původu.</p></section>
 ${eventsHTML}${create}<section class="hc-calendar"><h3>Tuzyn Reckoning · přiřazení skutečného data</h3>${originForm}</section>`;
}
