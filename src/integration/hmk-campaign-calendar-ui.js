import {TR_MONTHS,campaignTRDate,formatTRDate,gmCalendarAgenda,campaignSunsignForDate} from './hmk-calendar-planner.js';
import {displayCampaignMinute,campaignCalendarAgenda} from './hmk-campaign-calendar.js';
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
function eventMark(p){return p.status==='resolved'?'✓':p.status==='cancelled'?'×':p.status==='due'?'!':'•';}
function eventName(p){return p.title||p.description||'Událost';}
function eventDestination(p){return p.destination==='healing'?'Healing · Combat':p.destination==='skills'?'Skill Tests':p.destination==='combat'?'Combat':p.destination==='inventory'?'Arsenal & Gear':p.destination==='hazards'?'Nebezpečí / Trauma':'Deník postavy';}
function issueAction(p,esc){const id=esc(p.id),isRule=p.origin==='hml';
 return `${p.characterId?`<button type="button" class="hc-small" data-cal-link="${esc(p.characterId)}" data-cal-destination="${esc(p.destination||'healing')}" data-cal-kind="${esc(p.kind||'gm')}">Otevřít ${esc(eventDestination(p))} ↗</button>`:(!isRule?`<span class="hc-soft">${esc(p.place||'Celá kampaň')}</span>`:'')}
 ${!isRule&&!p.resolution?`<button type="button" class="hc-small" data-cal-resolve="${id}">GM: vyřídit</button><button type="button" class="hc-small" data-cal-cancel="${id}">Zrušit</button>`:''}`;
}
function renderAgendaEntry(p,esc,clock){
 const type=p.origin==='hml'?'HMK · vyžaduje pravidlový průvodce':p.requiresAction?'GM · čeká na rozhodnutí':'GM · událost';
 return `<article class="hc-entry ${p.status==='due'?'hc-entry--due':''} ${p.resolution?'hc-entry--done':''}"><div class="hc-entry-head"><strong>${esc(eventName(p))}</strong><span>${esc(displayCampaignMinute(p.dueMinute))}</span></div>
 <p class="hc-annotation">${esc(type)}${p.characterId&&p.name?' · '+esc(p.name):''}${p.place?' · '+esc(p.place):''}${p.woundId?' · rána '+esc(p.woundId):''}</p>
 ${p.note?`<p>${esc(p.note)}</p>`:''}${p.endMinute>p.minute?`<p class="hc-annotation">Trvání: ${esc(displayCampaignMinute(p.minute))} → ${esc(displayCampaignMinute(p.endMinute))}</p>`:''}
 <div class="hc-actions">${issueAction(p,esc)}</div></article>`;
}
export function campaignCalendarBoardHTML({clock,characters=[],ui,escapeHTML}={}){
 const esc=escapeHTML,agenda=campaignCalendarAgenda(clock,characters),custom=gmCalendarAgenda(clock);
 const all=[...agenda.all.map(p=>({...p,dueMinute:p.minute,origin:'hml',title:p.name+' · '+p.description,destination:['poison','disease'].includes(p.kind)?'hazards':['healing','infection','grim','blood-loss','coma','extended-shock'].includes(p.kind)?'healing':'combat'})),...custom.map(p=>({...p,origin:'gm',name:characters.find(x=>x.id===p.characterId)?.name||''}))];
 all.sort((a,b)=>a.dueMinute-b.dueMinute||a.id.localeCompare(b.id));
 const currentSign=campaignSunsignForDate(campaignTRDate(clock,clock.minute));
 const today=dayNumber(clock.minute),selected=minDay(ui.dayNumber),currentTime=shortTime(clock.minute),month=monthDetails(clock,ui.monthShift);
 const badges=`<div class="hc-stats"><span>◷ <b>${esc(displayCampaignMinute(clock.minute))}</b></span><span>${esc(dayLabel(clock,today))}</span>${currentSign?`<span>Sunsign <b>${esc(currentSign.name)}</b>${currentSign.cusp?` · cusp ${esc(currentSign.cusp)}`:''}</span>`:''}<span>HMK splatné <b>${agenda.due.length}</b></span><span>GM čekající <b>${custom.filter(x=>x.status==='due'&&!x.resolution).length}</b></span><span>Nedoložené <b>${agenda.unknown.length}</b></span></div>`;
 const title=`<div class="hc-title"><div><h2>Tuzyn Reckoning · kalendář</h2><p>12 měsíců × 30 dní · tři desetidenní úseky na měsíc (HMK str. 11, 22). Časová osa používá minuty; bojová kola nejsou převedena na minuty.</p></div><button type="button" class="hc-small" data-cal-action="today">Dnes · ${esc(currentTime)}</button></div>`;
 let visualization='';
 if(ui.mode==='month'){
  const cells=Array.from({length:30},(_,i)=>{
   const n=(month?.startDay??1)+i,valid=n>=1&&n<=694444;
   const events=valid?all.filter(x=>dayNumber(x.dueMinute)===n||
    (x.origin==='gm'&&x.endMinute>x.minute&&dayNumber(x.minute)<=n&&dayNumber(x.endMinute)>=n)):[];
   return `<button type="button" class="hc-date ${n===today?'hc-date--now':''} ${n===selected?'hc-date--selected':''}" data-cal-day="${n}" ${valid?'':'disabled'} aria-label="${valid?esc(dayLabel(clock,n)): 'Mimo evidovanou časovou osu'}${n===today?' · nyní':''}">
   <strong>${i+1}</strong>${n===today?'<span class="hc-now-mark">NYNÍ</span>':''}<span class="hc-count">${events.length?esc(String(events.length)+' událostí'):' '}</span>
   ${events.slice(0,2).map(x=>`<span class="hc-date-event ${x.status==='due'?'hc-date-event--due':''}">${x.origin==='gm'&&dayNumber(x.dueMinute)!==n?'↔':eventMark(x)} ${esc(eventName(x))}</span>`).join('')}</button>`;
  });
  visualization=`<section class="hc-calendar"><div class="hc-month-bar"><button type="button" data-cal-action="prev-month" class="hc-small">‹ Předchozí</button><h3>${esc(month?.label||'Mimo rozsah')}</h3><button type="button" data-cal-action="next-month" class="hc-small">Následující ›</button></div>
   ${[0,1,2].map(i=>`<div class="hc-decade-row-label">${i+1}. desetidenní úsek · dny ${i*10+1}–${i*10+10}</div><div class="hc-grid">${cells.slice(i*10,i*10+10).join('')}</div>`).join('')}<p class="hc-hint">Kliknutím na datum otevřete den s hodinami a minutovým rozpisem. Značka NYNÍ označuje skutečný čas kampaně.</p></section>`;
 } else {
  const marks=all.flatMap(x=>x.origin==='gm'&&x.endMinute>x.minute?
   [{...x,dueMinute:x.minute,title:'Začátek · '+x.title},
    {...x,dueMinute:x.endMinute,title:'Konec · '+x.title}]:[x]);
  const continuing=all.filter(x=>x.origin==='gm'&&x.endMinute>x.minute&&dayNumber(x.minute)<=selected&&dayNumber(x.endMinute)>=selected);
  const hours=Array.from({length:24},(_,h)=>{
   const entries=marks.filter(x=>dayNumber(x.dueMinute)===selected&&Math.floor(x.dueMinute%1440/60)===h);
   const active=today===selected&&Math.floor(clock.minute%1440/60)===h;
   return `<button type="button" data-cal-hour="${h}" class="hc-hour ${ui.hour===h?'hc-hour--selected':''} ${active?'hc-hour--now':''}"><strong>${pad(h)}:00</strong><span>${entries.length?esc(entries.length+' událostí'):'–'}</span>${active?'<em>NYNÍ</em>':''}</button>`;
  }).join('');
  const byMinute=Array.from({length:60},(_,m)=>{
   const at=(selected-1)*1440+ui.hour*60+m, entries=marks.filter(x=>x.dueMinute===at),now=at===clock.minute;
   return `<div class="hc-minute ${now?'hc-minute--now':''}" id="hc-minute-${at}"><button type="button" class="hc-minute-time" data-cal-prefill="${at}" title="Naplánovat událost na tuto minutu">${pad(ui.hour)}:${pad(m)} ${now?'◀ NYNÍ':'+'}</button><div class="hc-minute-events">${entries.length?entries.map(p=>renderAgendaEntry(p,esc,clock)).join(''):'<span class="hc-muted-tick">·</span>'}</div></div>`;
  }).join('');
  visualization=`<section class="hc-calendar"><div class="hc-month-bar"><button type="button" class="hc-small" data-cal-action="month">‹ Zpět na měsíce</button><h3>${esc(dayLabel(clock,selected))}</h3><button type="button" class="hc-small" data-cal-action="today">Aktuální den</button></div>${continuing.length?`<div class="hc-continuing"><strong>Probíhající vícedenní události:</strong> ${continuing.map(x=>`${esc(x.title)} (${esc(displayCampaignMinute(x.minute))}–${esc(displayCampaignMinute(x.endMinute))})`).join(' · ')}</div>`:''}<div class="hc-hours" aria-label="Hodiny dne">${hours}</div>
   <h4>Časová osa ${pad(ui.hour)}:00–${pad(ui.hour)}:59 · přesnost 1 minuta</h4><div class="hc-minutes" role="region" aria-label="Minuty ${pad(ui.hour)}. hodiny">${byMinute}</div><p class="hc-hint">Vyberte hodinu a konkrétní minutu. „+“ připraví formulář události na vybraný čas; automatický hod kostkou se neprovede.</p></section>`;
 }
 const scheduleAt=ui.prefillMinute??Math.max(clock.minute,(selected-1)*1440+ui.hour*60),planDay=dayNumber(scheduleAt),planHour=Math.floor(scheduleAt%1440/60),planMinute=scheduleAt%60;
 const charOptions=[['','— Celá kampaň —'],...characters.map(c=>[esc(c.id),esc(c.name)])];
 const eventsHTML=`<section class="hc-calendar hc-plans"><h3>Časované události a pravidlové závazky</h3><p>Načasované HMK procedury se odvozují z potvrzených stavů postav. Ruční události GM jsou oddělené a nesmějí samy změnit úraz, stav či výsledek hodu.</p>
  ${agenda.unknown.length?`<details><summary>Nedoložené nebo blokující procedury (${agenda.unknown.length})</summary>${agenda.unknown.map(x=>`<p class="hc-warning">${esc(x.name)} · ${esc(x.description)} — ${esc(x.reason)}</p>`).join('')}</details>`:''}
  <details open><summary>Ke zpracování / čeká na hod (${all.filter(p=>p.status==='due').length})</summary><div class="hc-event-list">${all.filter(p=>p.status==='due').map(p=>renderAgendaEntry(p,esc,clock)).join('')||'<p>Žádné splatné události.</p>'}</div></details>
  <details><summary>Budoucí události (${all.filter(p=>p.status==='future').length})</summary><div class="hc-event-list">${all.filter(p=>p.status==='future').slice(0,250).map(p=>renderAgendaEntry(p,esc,clock)).join('')||'<p>Žádné budoucí události.</p>'}</div></details>
  <details><summary>Vyřízené / zrušené (${all.filter(p=>p.resolution).length})</summary><div class="hc-event-list">${all.filter(p=>p.resolution).slice(-250).map(p=>renderAgendaEntry(p,esc,clock)).join('')||'<p>Bez uzavřených záznamů.</p>'}</div></details></section>`;
 const create=`<section class="hc-calendar hc-planner" id="hc-planner"><h3>Přidat událost GM</h3><p>Trvání zahrnuje začátek a konec intervalu. Volbou „vyžaduje vyřízení“ zabráníte přeskočení termínu bez potvrzení GM.</p>
  <form id="campaign-plan-form"><div class="hc-fields"><label>Název události<input name="title" maxlength="160" required placeholder="Například příjezd posla"></label><label>Místo<input name="place" maxlength="160" placeholder="Pevnost, les, vesnice…"></label><label>Postava<select name="characterId">${opts(charOptions,'')}</select></label><label>Odkaz na část aplikace<select name="destination">${opts([['notes','Deník / poznámky'],['skills','Skill Tests'],['healing','Healing / Combat'],['hazards','Nebezpečí / Trauma'],['combat','Combat'],['inventory','Arsenal & Gear']],'notes')}</select></label>
  <label>Den kampaně<input name="day" required type="number" min="1" max="694444" value="${planDay}"></label><label>Hodina<input name="hour" required type="number" min="0" max="23" value="${planHour}"></label><label>Minuta<input name="minute" required type="number" min="0" max="59" value="${planMinute}"></label><label>Trvání · dny<input name="durationDays" type="number" min="0" max="10000" value="0"></label><label>Trvání · hodiny<input name="durationHours" type="number" min="0" max="23" value="0"></label><label>Trvání · minuty<input name="durationMinutes" type="number" min="0" max="59" value="0"></label><label>Požadovaný okamžik řešení<select name="trigger">${opts([['start','Na začátku'],['end','Na konci trvání']],'start')}</select></label></div>
  <label>Popis / instrukce / podmínky<textarea name="note" maxlength="2000" rows="3" placeholder="Co musí GM nebo hráč udělat…"></textarea></label><label class="hc-check"><input type="checkbox" name="requiresAction" value="yes"> Vyžaduje rozhodnutí / upozornění: nelze přeskočit termín</label><label class="hc-check"><input type="checkbox" name="gmConfirmed" value="yes" required> GM potvrzuje plánovanou událost</label><button type="submit">Zapsat událost na časovou osu</button></form></section>`;
 const origin=clock.trOrigin,originForm=origin?`<p>Výchozí datum TR bylo GM potvrzeno: <strong>${esc(formatTRDate(campaignTRDate(clock,clock.minute)))}</strong>.</p>`:`<p><strong>TR datum není přiděleno.</strong> Starší kalendář zůstává použitelný bez zpětně domyšlených dat. GM může přiřadit skutečné datum k dnešnímu dni kampaně:</p><form id="campaign-tr-origin-form" class="hc-inline"><label>Rok TR<input name="year" type="number" min="1" max="9999" value="720" required></label><label>Měsíc<select name="month">${opts(TR_MONTHS.map((n,i)=>[i+1,n]),1)}</select></label><label>Den<input name="day" type="number" min="1" max="30" value="1" required></label><label class="hc-check"><input name="gmConfirmed" value="yes" type="checkbox" required> Datum potvrzeno GM</label><button type="submit">Přiřadit datum TR</button></form>`;
 return `${title}${badges}${visualization}<section class="hc-calendar hc-time-control"><h3>Řízení času kampaně</h3><form id="campaign-quick-advance-form" class="hc-inline"><label>Posun o<select name="deltaMinutes">${opts([[1,'1 minutu'],[5,'5 minut'],[10,'10 minut'],[30,'30 minut'],[60,'1 hodinu'],[240,'4 hodiny'],[1440,'1 den'],[7200,'5 dní']],1)}</select></label><label>Důvod<input name="reason" maxlength="400" required value="Plynutí času ve hře"></label><label class="hc-check"><input name="gmConfirmed" value="yes" type="checkbox" required> Potvrzuji uplynutí času</label><button type="submit">Odmáčknout čas ›</button></form><p class="hc-hint">Není možné přeskočit nevyřízený doložený HMK termín ani závaznou událost GM. Neověřené hody nikdy neproběhnou samy.</p></section>
 ${eventsHTML}${create}<section class="hc-calendar"><h3>Tuzyn Reckoning · přiřazení skutečného data</h3>${originForm}</section>`;
}
