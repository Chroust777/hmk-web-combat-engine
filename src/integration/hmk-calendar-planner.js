/** HMK v1.2 p.11, 22: TR uses 12 named 30-day months, three tendays per month.
 * GM scenario scheduling is application functionality, not an invented rule.
 * Campaign minute remains the sole authoritative clock (see hmk-campaign-calendar).
 */
export const TR_MONTHS=Object.freeze(['Núzyæl','Peónu','Kelén','Nólus','Laránè','Ágrazhâr','Azúra','Halánè','Savôr','Ilvín','Návek','Morgát']);
export const CALENDAR_DAY_MINUTES=1440;
// HMK v1.2 p.22 birth Sunsign dates, including the two-day cusp at each end.
const SUNSIGN_STARTS=Object.freeze([3,33,62,93,124,156,185,214,243,272,302,331]);
const SUNSIGNS=Object.freeze(['Ùlándus','Arálius','Fenéri','Áhnù','Angberélius','Nadái','Hîrin','Táræl','Tai','Skôrus','Masâra','Ládo']);
export function campaignSunsignForDate(date){
 if(!date)return null;
 test(integer(date.month,1,12)&&integer(date.day,1,30),'Neplatné datum pro Sunsign');
 const ordinal=(date.month-1)*30+date.day-1;
 let i=SUNSIGN_STARTS.findLastIndex(x=>ordinal>=x);if(i<0)i=11;
 const start=SUNSIGN_STARTS[i],next=SUNSIGN_STARTS[(i+1)%12]+(i===11?360:0);
 const effective=ordinal<start?ordinal+360:ordinal;
 const offset=effective-start,length=next-start;
 const previous=SUNSIGNS[(i+11)%12],following=SUNSIGNS[(i+1)%12];
 return {name:SUNSIGNS[i],cusp:offset<2?previous:offset>=length-2?following:null};
}

const test=(condition,message)=>{if(!condition)throw Error(message);};
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function validateTROrigin(origin){
 test(origin&&integer(origin.anchorDay,1,600000)&&integer(origin.year,1,9999)&&integer(origin.month,1,12)&&integer(origin.day,1,30),'Neplatné výchozí datum Tuzyn Reckoning');
 return origin;
}
export function campaignTRDate(clock,minute){
 if(!clock?.trOrigin)return null;
 validateTROrigin(clock.trOrigin);
 test(integer(minute,0,1e9),'Neplatná minuta kampaně');
 const dayNumber=Math.floor(minute/CALENDAR_DAY_MINUTES)+1;
 const origin=clock.trOrigin;
 const first=((origin.year-1)*360+(origin.month-1)*30+origin.day-1);
 const offset=first+dayNumber-origin.anchorDay;
 test(offset>=0&&offset<9999*360,'Datum překročilo podporovaný rozsah TR');
 const year=1+Math.floor(offset/360),inYear=offset%360,month=1+Math.floor(inYear/30),day=1+inYear%30;
 return {year,month,day,monthName:TR_MONTHS[month-1],tenday:1+Math.floor((day-1)/10),tendayDay:1+(day-1)%10,dayNumber};
}
export function campaignMinuteAtTRDate(clock,{year,month,day,hour=0,minute=0}={}){
 test(clock?.trOrigin,'Nejdříve potvrďte TR datum kampaně');
 validateTROrigin(clock.trOrigin);
 test(integer(year,1,9999)&&integer(month,1,12)&&integer(day,1,30)&&integer(hour,0,23)&&integer(minute,0,59),'Neplatné TR datum nebo čas');
 const base=clock.trOrigin;
 const dayOffset=(year-base.year)*360+(month-base.month)*30+(day-base.day)+base.anchorDay-1;
 const absolute=dayOffset*1440+hour*60+minute;
 test(integer(absolute,0,1e9),'Datum mimo časovou osu kampaně');
 return absolute;
}
export const formatTRDate=(d)=>d?`${d.day}. ${d.monthName} TR ${d.year}`:'TR datum není určeno';
export function validateCalendarPlans(clock){
 const plans=clock.plans??[],resolutions=clock.planResolutions??[];
 test(Array.isArray(plans)&&plans.length<=30000&&Array.isArray(resolutions)&&resolutions.length<=30000,'Neplatné GM události');
 if(clock.trOrigin)validateTROrigin(clock.trOrigin);
 const ids=new Set();
 for(const p of plans){
  test(p&&typeof p.id==='string'&&p.id.length>0&&!ids.has(p.id)&&
   typeof p.title==='string'&&p.title.trim().length>0&&p.title.length<=160&&
   typeof p.note==='string'&&p.note.length<=2000&&typeof p.place==='string'&&p.place.length<=160&&
   typeof p.characterId==='string'&&p.characterId.length<=200&&
   integer(p.minute,0,1e9)&&integer(p.endMinute,p.minute,1e9)&&
   ['notes','skills','healing','hazards','combat','inventory'].includes(p.destination)&&
   typeof p.requiresAction==='boolean'&&['start','end'].includes(p.trigger),
   'Neplatná nebo duplicitní časovaná událost GM');
  ids.add(p.id);
 }
 const done=new Set();
 for(const r of resolutions){
  test(r&&typeof r.id==='string'&&r.id&&ids.has(r.planId)&&!done.has(r.planId)&&
   integer(r.minute,0,1e9)&&typeof r.note==='string'&&r.note.length<=2000&&
   ['resolved','cancelled'].includes(r.kind),'Neplatné nebo duplicitní vyřízení události GM');
  done.add(r.planId);
 }
 return true;
}
function append(clock,id,type,reason){
 test(typeof id==='string'&&id.length>0&&!clock.events.some(x=>x.id===id),'Duplicitní ID zápisu');
 clock.events.push({id,type,minute:clock.minute,reason});
}
export function setCampaignTROrigin(clock,{year,month,day,eventId,confirmed}={}){
 test(confirmed===true,'TR datum musí potvrdit GM');
 test(!clock.trOrigin,'Výchozí TR datum je již potvrzeno');
 const next=structuredClone(clock);
 const anchorDay=Math.floor(clock.minute/1440)+1;
 next.trOrigin=validateTROrigin({anchorDay,year,month,day});
 append(next,eventId,'tr-origin',`GM přiřadil TR datum ${day}/${month}/${year} ke dni kampaně ${anchorDay}`);
 validateCalendarPlans(next);return next;
}
export function addGMCalendarPlan(clock,{id,eventId,title,note='',place='',characterId='',minute,endMinute=minute,destination='notes',requiresAction=false,trigger='start',confirmed=false}={}){
 test(confirmed===true,'GM musí potvrdit událost');
 const next=structuredClone(clock);
 next.plans??=[];
 next.plans.push({id,title:String(title).trim(),note:String(note),place:String(place),characterId:String(characterId),minute,endMinute,destination,requiresAction:!!requiresAction,trigger});
 validateCalendarPlans(next);
 append(next,eventId,'plan',`GM naplánoval: ${String(title).trim()}`);
 return next;
}
export function completeGMCalendarPlan(clock,{id,planId,note='',kind='resolved',confirmed=false}={}){
 test(confirmed===true,'Ukončení musí potvrdit GM');
 const next=structuredClone(clock),plan=next.plans?.find(p=>p.id===planId);
 test(plan,'Událost neexistuje');
 test(!next.planResolutions?.some(x=>x.planId===planId),'Událost už byla vyřízena');
 if(kind==='resolved')test(clock.minute>=(plan.trigger==='end'?plan.endMinute:plan.minute),'Událost ještě nenastala');
 next.planResolutions??=[];
 next.planResolutions.push({id,planId,minute:clock.minute,kind,note:String(note)});
 validateCalendarPlans(next);
 append(next,id,kind==='cancelled'?'cancel-plan':'resolve-plan',`${kind==='cancelled'?'GM zrušil':'GM potvrdil událost'}: ${plan.title}`);
 return next;
}
export function gmCalendarAgenda(clock){
 validateCalendarPlans(clock);
 const resolutions=new Map((clock.planResolutions??[]).map(r=>[r.planId,r]));
 return (clock.plans??[]).map(p=>{
  const dueMinute=p.trigger==='end'?p.endMinute:p.minute;
  return {...p,dueMinute,resolution:resolutions.get(p.id)||null,status:resolutions.has(p.id)?resolutions.get(p.id).kind:dueMinute<=clock.minute?(p.requiresAction?'due':'elapsed'):'future'};
 }).sort((a,b)=>a.dueMinute-b.dueMinute||a.id.localeCompare(b.id));
}
export function nextGMBlockingEvent(clock,nextMinute){
 return gmCalendarAgenda(clock).find(x=>x.requiresAction&&!x.resolution&&x.dueMinute<nextMinute)||null;
}
export function assertCalendarPlansAppendOnly(before,after){
 if(!before)return true;
 validateCalendarPlans(before);validateCalendarPlans(after);
 for(const key of ['plans','planResolutions']){
  const old=before[key]??[],next=after[key]??[];
  test(next.length>=old.length&&old.every((p,i)=>JSON.stringify(p)===JSON.stringify(next[i])),'Zapsanou kalendářní událost nelze přepsat ani smazat');
 }
 if(before.trOrigin)test(JSON.stringify(before.trOrigin)===JSON.stringify(after.trOrigin),'TR počátek nelze změnit bez migrace');
 return true;
}
