/** HMK pp.169,179,185: independent cold immersion occurring while another
 * Extended Shock/Coma course already exists. Each physical roll and due time
 * stays source-keyed. Projection is presentation, never a replacement for an
 * existing Course. No dice are generated and no existing health event is edited.
 */
import {SL,successLevel} from '../rules/tests.js';
import {healingBase} from '../rules/healing.js';
import {initializeConcurrentShock,projectConcurrentShock} from './hmk-concurrent-shock-projection.js';
const fail=(m)=>{throw Error(m)};
const need=(v,m)=>{if(!v)fail(m)};
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const states=new Set(['NONE','STN','INC','UNC','KIA']);
const evidence=(s,id)=>s.events?.some(e=>e.id===id);
const fatigue=s=>s.fatigue.windedness+s.fatigue.weariness+s.fatigue.otherWeakness+s.bloodLoss.weaknessFatigue;
const level=sl=>Object.keys(SL).find(k=>SL[k]===sl);
const clone=structuredClone;
function live(s,sourceId){const a=(s.parallelColdShocks??[]).filter(x=>x.sourceId===sourceId);need(a.length===1,'Neplatný nebo duplicitní Cold Shock zdroj');return a[0];}
export function validateParallelColdShocks(s){
 const rows=s.parallelColdShocks??[];
 need(Array.isArray(rows)&&rows.length<=1000,'Neplatná source-keyed evidence Cold Shock');
 const seen=new Set();
 for(const x of rows){
  need(x&&typeof x.sourceId==='string'&&x.sourceId&&x.sourceId.length<=200&&!seen.has(x.sourceId)&&
   typeof x.originEventId==='string'&&evidence(s,x.originEventId)&&
   int(x.originMinute,0,1000000000)&&int(x.originRound,1,9999)&&states.has(x.shock)&&
   ['followup','extended','stunned','coma','resolved','dead'].includes(x.phase),
   'Cold Shock: chybí neměnný původ nebo je duplicitní');
  seen.add(x.sourceId);
  if(x.phase==='followup'||x.phase==='stunned'){
   need(x.followup&&x.followup.kind===x.shock&&['STN','INC','UNC'].includes(x.shock)&&
    int(x.followup.dueMinute,x.originMinute,1000000000),'Cold Shock: poškozený termín Shock Reroll');
  }else need(x.followup===null,'Cold Shock: již dokončený Reroll stále čeká');
  if(x.phase==='extended')need(x.extendedShock&&int(x.extendedShock.hr,1,5)&&
   int(x.extendedShock.startMinute,x.originMinute,1000000000)&&
   int(x.extendedShock.elapsedHours,0,100000)&&x.extendedShock.elapsedHours%4===0&&
   ['INC','UNC'].includes(x.shock),'Cold Shock: poškozený samostatný Extended Course');
  if(x.coma?.active)need(int(x.coma.hr,1,20)&&int(x.coma.startMinute,x.originMinute,1000000000)&&
   int(x.coma.elapsedDays,0,100000)&&int(x.coma.nextCourseDays,1,10),
   'Cold Shock: poškozený Coma Course');
  if(x.phase==='resolved')need(x.shock==='NONE'&&!x.extendedShock&&!x.coma?.active,'Cold Shock: nelze zahodit otevřený Course');
  if(x.phase==='dead')need(x.shock==='KIA'&&!x.extendedShock&&!x.coma?.active,'Cold Shock: úmrtí musí ukončit Course');
 }
 return true;
}
/** Only used for the *stronger* Cold Shock in an already live course. */
export function appendParallelColdShock(s,{sourceId,originEventId,originMinute,originRound,shock}){
 need(['INC','UNC'].includes(shock)&&int(originMinute,0,1000000000)&&int(originRound,1,9999),
  'Samostatná Cold Shock návaznost vyžaduje skutečný nový INC/UNC');
 need(!(s.parallelColdShocks??[]).some(x=>x.sourceId===sourceId),'Cold Shock stejného zdroje nelze založit dvakrát');
 initializeConcurrentShock(s); // Capture the old independently recovering shock as baseline.
 s.parallelColdShocks??=[];
 const row={sourceId,originEventId,originMinute,originRound,shock,phase:'followup',
  followup:{kind:shock,dueMinute:originMinute+(shock==='UNC'?10:0)},extendedShock:null,coma:null};
 s.parallelColdShocks.push(row);
 projectConcurrentShock(s,{round:originRound});
 return row;
}
/** A distinct physical Shock Reroll. Does not mutate the older Extended Shock. */
export function resolveParallelColdReroll({state,sourceId,round,eventId,minute,shockML,roll,
 initialComaHR=null,initialComaD10=null,gmConfirmed=false}={}){
 const s=clone(state);validateParallelColdShocks(s);
 need(gmConfirmed===true&&int(round,s.lastRound||1,9999)&&typeof eventId==='string'&&eventId&&
  !evidence(s,eventId)&&int(minute,0,1000000000)&&int(shockML,1,200)&&int(roll,1,100),
  'Cold Shock Reroll: chybí fyzický hod, platné ID nebo skutečná minuta');
 const x=live(s,sourceId);need(['followup','stunned'].includes(x.phase)&&minute>=x.followup.dueMinute,
  'Cold Shock Reroll není splatný');
 const before=x.shock,eml=shockML-fatigue(s)-(before==='STN'?0:20),sl=successLevel(roll,eml);
 if(before==='UNC'&&sl===SL.CF){
  // An immersion has no injury Location Shock/IL for p.179's printed coma
  // formula. Only explicit GM adjudication, never a fabricated injury.
  need(int(initialComaHR,1,20)&&int(initialComaD10,1,10),
   'Cold Water UNC+CF: GM musí výslovně rozhodnout počáteční Coma HR (ponoření nemá Injury Level) a hodit skutečný d10');
 }
 x.followup=null;
 if(before==='STN'){
  if(sl===SL.S||sl===SL.CS){x.shock='NONE';x.phase='resolved';}
  else{x.phase='stunned';x.followup={kind:'STN',dueMinute:minute};}
 }else if(sl===SL.CS){x.shock='NONE';x.phase='resolved';}
 else if(sl===SL.S){x.shock='STN';x.phase='stunned';x.followup={kind:'STN',dueMinute:minute};}
 else{
  x.phase='extended';x.extendedShock={originState:before,hr:sl===SL.CF?4:5,
   startMinute:minute,elapsedHours:0};
  if(before==='UNC'&&sl===SL.CF)x.coma={active:true,hr:initialComaHR,startMinute:minute,
   elapsedDays:0,nextCourseDays:initialComaD10,gmInitialHRAttested:true};
 }
 s.events.push({id:eventId,type:'parallel-cold-shock-reroll',round,details:{sourceId,before,after:x.shock,
  minute,shockML,roll,eml,sl:level(sl),comaHR:x.coma?.hr??null,comaD10:x.coma?.nextCourseDays??null}});
 s.lastRound=round;projectConcurrentShock(s,{round});validateParallelColdShocks(s);
 return {state:s,report:{sourceId,before,after:x.shock,sl:level(sl),eml,roll,phase:x.phase}};
}
/** Separate four-hour / d10 day courses; the original Course is untouched. */
export function resolveParallelColdCourse({state,sourceId,kind,round,eventId,minute,actor,
 roll,physicianStars=0,arcaneBonus=0,restfulShelter=true,nextComaD10=null,gmConfirmed=false}={}){
 const s=clone(state);validateParallelColdShocks(s);
 need(gmConfirmed===true&&int(round,s.lastRound||1,9999)&&typeof eventId==='string'&&eventId&&
  !evidence(s,eventId)&&int(minute,0,1000000000)&&int(roll,1,100)&&int(arcaneBonus,0,100),
  'Cold Shock Course: chybí povinný skutečný čas, ID nebo d100');
 const x=live(s,sourceId),course=kind==='extended-shock'?x.extendedShock:kind==='coma'?x.coma:null;
 need(course&&(kind==='extended-shock'?x.phase==='extended':course.active),
  'Cold Shock Course neexistuje nebo je dokončen');
 const due=kind==='extended-shock'?course.startMinute+(course.elapsedHours+4)*60:
  course.startMinute+(course.elapsedDays+course.nextCourseDays)*1440;
 need(minute===due,'Cold Shock Course: nejprve musí nastat přesně jeho vlastní doložený termín');
 const end=actor?.hmk?.attributes?.end,wil=actor?.hmk?.attributes?.wil;
 need(int(end,1,40)&&int(wil,1,40),'Cold Shock Course vyžaduje END a WIL postavy');
 const hb=healingBase({endurance:end,will:wil}),oldHR=course.hr;
 need(kind!=='extended-shock'||int(physicianStars,0,10),'Nedoložený Physician SV');
 need(kind!=='coma'||typeof restfulShelter==='boolean','Coma vyžaduje skutečné prostředí');
 const eml=hb*oldHR-fatigue(s)+(kind==='extended-shock'?5*physicianStars:(restfulShelter?0:-20))+arcaneBonus;
 const sl=successLevel(roll,eml),hr=oldHR+[-2,-1,1,2][sl];
 if(kind==='extended-shock'){
  course.elapsedHours+=4;
  if(hr<=0){x.shock='KIA';x.phase='dead';x.extendedShock=null;x.coma=null;}
  else if(hr>=6){x.shock=x.coma?.active?'UNC':'NONE';x.phase=x.coma?.active?'coma':'resolved';x.extendedShock=null;}
  else course.hr=hr;
 }else{
  const days=course.elapsedDays+course.nextCourseDays;
  if(hr>0&&hr<6)need(int(nextComaD10,1,10),'Coma pokračuje: povinný skutečný další d10');
  if(hr<=0){x.shock='KIA';x.phase='dead';x.extendedShock=null;x.coma=null;}
  else if(hr>=6){s.fatigue.weariness+=Math.floor(days/5)*5;x.coma=null;if(!x.extendedShock){x.shock='NONE';x.phase='resolved';}}
  else{course.hr=hr;course.elapsedDays=days;course.nextCourseDays=nextComaD10;}
 }
 s.events.push({id:eventId,type:'parallel-cold-'+kind+'-course',round,details:{sourceId,kind,minute,
  healingBase:hb,oldHR,nextHR:hr,roll,eml,sl:level(sl),physicianStars,arcaneBonus,
  restfulShelter,periodD10:nextComaD10}});
 s.lastRound=round;projectConcurrentShock(s,{round});validateParallelColdShocks(s);
 return {state:s,report:{sourceId,kind,sl:level(sl),oldHR,nextHR:hr,shock:s.shock}};
}

/** Immutable origins, monotone source sets and witnessed course transitions.
 * Used at the common save boundary for Travel, Combat and auxiliary forms. */
export function assertParallelColdShocksAppendOnly(before,after){
 const older=before?.parallelColdShocks??[],newer=after?.parallelColdShocks??[];
 validateParallelColdShocks(before);validateParallelColdShocks(after);
 const oldEvents=new Map((before.events??[]).map(e=>[e.id,e]));
 for(const [id,e] of oldEvents){
  const matches=(after.events??[]).filter(t=>t.id===id);
  need(matches.length===1&&JSON.stringify(matches[0])===JSON.stringify(e),
   'Původní potvrzený Cold Shock hod nesmí být přepsán');
 }
 for(const old of older){
  const matching=newer.filter(x=>x.sourceId===old.sourceId);
  need(matching.length===1,'Zdroj Cold Shock nesmí zmizet při jiné akci');
  const n=matching[0];
  need(n.originMinute===old.originMinute&&n.originRound===old.originRound&&n.originEventId===old.originEventId,
   'Původní minuta a ID Cold Shock nesmějí být změněny');
  if(JSON.stringify(n)!==JSON.stringify(old)){
   need((after.events??[]).some(e=>!oldEvents.has(e.id)&&
    e.type.startsWith('parallel-cold-')&&e.details?.sourceId===old.sourceId),
    'Změna Cold Shock Course vyžaduje vlastní potvrzený důkaz');
  }
 }
 return true;
}
