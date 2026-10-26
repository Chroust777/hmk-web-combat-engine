/** HMK 1.2 pp.144, 186 – day-specific, auditable activity/climate evidence.
 * A Trekking heat weather roll is itself authoritative; a single four-hour
 * sleep is NOT evidence of complete 24h rest/inactivity. Plans never advance
 * the GM clock or record consumption. Legacy nutrition policies are unchanged.
 */
export const NUTRITION_PLAN='hmk-nutrition-day-conditions-v1';
export const NUTRITION_CANCEL='hmk-nutrition-conditions-cancel-v1';
const DAY=1440;
const check=(x,msg)=>{if(!x)throw Error(msg)};
const minute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
export const NUTRITION_CONDITIONS=Object.freeze({
 rest:{completeRest:true,inactive:false,hot:false},
 inactive:{completeRest:false,inactive:true,hot:false},
 'rest-inactive':{completeRest:true,inactive:true,hot:false},
 hot:{completeRest:false,inactive:false,hot:true},
 'rest-hot':{completeRest:true,inactive:false,hot:true}
});
const records=(journal,campaignId,actorId)=>journal.filter(x=>x.calendarCampaignId===campaignId&&x.characterId===actorId);
export function nextNutritionDayStart(journal,policyRow){
 const p=policyRow?.calendarNutritionPolicy;
 check(p?.autoNeeds===true,'Den podle aktivity vyžaduje aktivní automatický režim');
 const days=records(journal,p.campaignId,p.actorId).filter(x=>x.calendarNutritionDay?.policyId===policyRow.id);
 return days.length?days.at(-1).calendarNutritionDay.endMinute:p.minute;
}
/** A GM attestations records a complete-day plan at its beginning only.
 * Deviations must first cancel it; later events are never backdated.
 */
export function createNutritionDayConditions({journal=[],policyRow,campaignId,actorId,minute:now,kind}={}){
 const p=policyRow?.calendarNutritionPolicy;
 check(p?.enabled&&p.autoNeeds===true&&p.actorId===actorId&&p.campaignId===campaignId,
  'Vyberte aktivní automatický režim postavy v této kampani');
 const start=nextNutritionDayStart(journal,policyRow);
 check(now===start&&minute(now),'Podmínky celého dne lze plánovat jen v jeho počáteční minutě GM');
 check(Object.hasOwn(NUTRITION_CONDITIONS,kind),'Neznámé denní podmínky HMK');
 const previous=journal.filter(x=>x.calendarNutritionConditions?.policyId===policyRow.id&&
  x.calendarNutritionConditions.startMinute===start);
 check(!previous.length,'Denní podmínky již byly jednou potvrzeny; nelze je přepsat');
 return {format:NUTRITION_PLAN,policyId:policyRow.id,actorId,campaignId,minute:now,
  startMinute:start,endMinute:start+DAY,kind,gmConfirmed:true,sourcePages:[144,186]};
}
export function createNutritionConditionsCancel({journal=[],planRow,campaignId,actorId,minute:now,reason}={}){
 const p=planRow?.calendarNutritionConditions;
 check(p?.format===NUTRITION_PLAN&&p.actorId===actorId&&p.campaignId===campaignId,
  'Nelze zrušit cizí denní režim');
 check(minute(now)&&now>=p.minute&&now<p.endMinute,'Celodenní plán lze zrušit pouze před koncem dne');
 check(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=300,'Doložte příčinu změny denního režimu');
 check(!journal.some(x=>x.calendarNutritionConditionsCancel?.planId===planRow.id),
  'Tento denní plán byl již zrušen');
 return {format:NUTRITION_CANCEL,planId:planRow.id,actorId,campaignId,minute:now,
  reason:reason.trim(),sourcePage:186};
}
function competingActivity(journal,campaignId,actorId,start,end){
 return journal.some(x=>x.calendarCampaignId===campaignId&&(
  (x.characterId===actorId&&x.calendarActivityProof?.plan?.kind==='travel'&&
   x.calendarActivityProof.startMinute<end&&x.calendarActivityProof.endMinute>start)||
  (x.characterId===actorId&&x.campaignMinute>=start&&x.campaignMinute<end&&
   (x.combatProof||x.calendarCombatProof))||
  (x.calendarTrekProof&&x.campaignMinute>=start&&x.campaignMinute<end&&
   (x.calendarTrekProof.partyModes?.memberIds??[x.characterId]).includes(actorId))));
}
/** Read only evidence available *before* closing a particular nutrition day.
 * The same function is used for calculation and tamper-proof replay.
 */
export function dailyNutritionNeeds({journal=[],campaignId,actorId,policyId,startMinute,endMinute}={}){
 check(minute(startMinute)&&endMinute===startMinute+DAY,'Denní potřeba vyžaduje přesný 24h interval');
 const plans=journal.filter(x=>x.calendarNutritionConditions?.format===NUTRITION_PLAN&&
  x.calendarNutritionConditions.policyId===policyId&&x.calendarNutritionConditions.startMinute===startMinute&&
  x.calendarCampaignId===campaignId&&x.characterId===actorId);
 check(plans.length<=1,'Duplicitní plán denní potřeby');
 const plan=plans[0],cancels=plan?journal.filter(x=>x.calendarNutritionConditionsCancel?.planId===plan.id):[];
 check(cancels.length<=1,'Duplicitní zrušení denního režimu');
 const active=plan&&!cancels.length;
 const settings=active?NUTRITION_CONDITIONS[plan.calendarNutritionConditions.kind]:null;
 check(!active||!!settings,'Neplatné plánované denní podmínky');
 if(settings?.completeRest||settings?.inactive)check(!competingActivity(journal,campaignId,actorId,startMinute,endMinute),
  'Úplný odpočinek/nečinnost jsou v rozporu s doloženou cestovní nebo Foraging hlídkou; nejprve plán zrušte');
 const weather=journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarTrekProof?.weatherWatch?.hazard==='heat'&&
  x.campaignMinute>=startMinute&&x.campaignMinute<endMinute&&
  (x.calendarTrekProof.partyModes?.memberIds??[x.characterId]).includes(actorId));
 const hot=!!settings?.hot||weather.length>0;
 check(!(hot&&settings?.inactive),'Současné horko a úplná nečinnost vyžadují samostatné rozhodnutí GM o kombinované potřebě vody');
 return {foodNeed:settings?.completeRest?0.5:1,waterNeed:hot?2:settings?.inactive?0.5:1,
  completeRest:!!settings?.completeRest,completeInactivity:!!settings?.inactive,hot,
  conditionsId:active?plan.id:null,heatWatchIds:weather.map(x=>x.id),sourcePages:[144,186]};
}
/** Present original 24h nutrition conditions on the shared calendar timeline.
 * Historical plans remain visible as evidence but never gain retroactive fatigue.
 */
export function calendarNutritionConditionActivities(clock,characters=[],journal=[]){
 if(!clock)return [];
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const names=new Map(characters.map(c=>[c.id,c.name]));
 const cancelled=new Set(journal.filter(j=>j.calendarNutritionConditionsCancel).map(j=>j.calendarNutritionConditionsCancel.planId));
 const completed=new Set(journal.filter(j=>j.calendarNutritionDay?.activityNeeds?.conditionsId).map(j=>j.calendarNutritionDay.activityNeeds.conditionsId));
 const titles={rest:'Celodenní odpočinek',inactive:'Celodenní nečinnost','rest-inactive':'Celodenní odpočinek a nečinnost',hot:'Celodenní horko','rest-hot':'Celodenní odpočinek v horku'};
 return journal.filter(j=>j.calendarNutritionConditions?.format===NUTRITION_PLAN&&j.calendarCampaignId===campaignId&&names.has(j.characterId)).map(j=>{
  const p=j.calendarNutritionConditions,isCancelled=cancelled.has(j.id),isDone=completed.has(j.id);
  const status=isCancelled?'cancelled':isDone?'resolved':clock.minute>=p.endMinute?'due':clock.minute>=p.startMinute?'active':'future';
  return {id:'nutrition-plan:'+j.id,sourceId:j.id,origin:'activity',kind:'nutrition-conditions',
   name:names.get(j.characterId),characterId:j.characterId,title:titles[p.kind]||'Denní podmínky',description:'24hodinový režim výživy',
   note:'Doložený interval mění spotřebu až při uzávěrce dne. Samotný záznam neobnovuje Fatigue; případná čtyřhodinová obnova je doložena samostatnou časovou činností.',
   minute:p.startMinute,dueMinute:p.startMinute,endMinute:p.endMinute,status,destination:'notes'};
 });
}
export function validateNutritionActivityJournal(journal=[]){
 const ids=new Map(),seenPlans=new Set(),cancelled=new Set(),closed=new Set();
 for(const row of journal){
  check(!ids.has(row.id),'Duplicitní identita dokladu');ids.set(row.id,row);
  const day=row.calendarNutritionDay;if(day)closed.add(day.policyId+':'+day.startMinute);
  const p=row.calendarNutritionConditions;
  if(p){check(!closed.has(p.policyId+':'+p.startMinute),'Nelze dodatečně plánovat již uzavřený den');const policy=ids.get(p.policyId)?.calendarNutritionPolicy;
   check(p.format===NUTRITION_PLAN&&policy?.autoNeeds===true&&policy.enabled===true&&
    policy.actorId===p.actorId&&policy.campaignId===p.campaignId&&row.characterId===p.actorId&&
    row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&p.minute===p.startMinute&&
    p.endMinute===p.startMinute+DAY&&Object.hasOwn(NUTRITION_CONDITIONS,p.kind)&&
    p.gmConfirmed===true&&JSON.stringify(p.sourcePages)==='[144,186]',
    'Denní podmínky nemají platný GM důkaz');
   const key=p.policyId+':'+p.startMinute;check(!seenPlans.has(key),'Duplicitní denní podmínky');seenPlans.add(key);
  }
  const c=row.calendarNutritionConditionsCancel;
  if(c){const plan=ids.get(c.planId),p=plan?.calendarNutritionConditions;
   check(!p||!closed.has(p.policyId+':'+p.startMinute),'Nelze zpětně zrušit již zúčtovaný den');
   check(c.format===NUTRITION_CANCEL&&p&&c.actorId===p.actorId&&c.campaignId===p.campaignId&&
    row.characterId===c.actorId&&row.calendarCampaignId===c.campaignId&&row.campaignMinute===c.minute&&
    minute(c.minute)&&c.minute>=p.startMinute&&c.minute<p.endMinute&&
    typeof c.reason==='string'&&c.reason.length>=3&&c.reason.length<=300&&
    c.sourcePage===186&&!cancelled.has(c.planId),'Neplatné nebo opakované zrušení denních podmínek');
   cancelled.add(c.planId);
  }
 }
 // Complete-day assertions must continue to hold across later evidence
 // inserts, including before a confirmed GM time advance.
 for(const row of journal){const p=row.calendarNutritionConditions;if(!p||cancelled.has(row.id))continue;
  const conditions=NUTRITION_CONDITIONS[p.kind];
  if(conditions.completeRest||conditions.inactive)check(!competingActivity(journal,p.campaignId,p.actorId,p.startMinute,p.endMinute),
   'Následná činnost odporuje plánu úplného odpočinku/nečinnosti; zrušte jej před zahájením činnosti');
 }
 return true;
}
export function assertNutritionActivityAppendOnly(before=[],after=[]){
 const current=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarNutritionConditions||row.calendarNutritionConditionsCancel)
  check(current.has(row.id)&&JSON.stringify(row)===JSON.stringify(current.get(row.id)),
   'Historické denní podmínky nelze přepisovat ani odstranit');
 return true;
}
