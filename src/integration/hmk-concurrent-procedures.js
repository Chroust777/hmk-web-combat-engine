/**
 * HMK concurrent, append-only procedure receipts (v93.718 foundation).
 * A confirmed start is durable immediately, but does not complete treatment,
 * alter the patient's Health State or advance shared time. Completion is
 * another immutable receipt, at the attested deadline; duplicate outcomes
 * and forged post-dated actions are rejected. Same-minute starts are unordered.
 * This is intentionally a scheduling/evidence layer, NOT a second rule engine.
 */
const requireFact=(test,message)=>{if(!test)throw Error(message)};
const number=(v,min=0,max=1000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const id=(v)=>typeof v==='string'&&v.length>0&&v.length<=200;
const forms=new Set(['hmk-treatment-form','hmk-frost-amputation-form']);
const typeNames=new Set(['start','finish','cancel']);
export function validateConcurrentProcedures(clock){
 const rows=clock?.concurrentProcedures??[];
 requireFact(Array.isArray(rows)&&rows.length<=30000,'Neplatná souběžná evidence');
 const keys=new Set(),started=new Map(),terminal=new Set();
 for(const r of rows){
  requireFact(r&&typeNames.has(r.type)&&id(r.id)&&!keys.has(r.id)&&id(r.startId)&&
   number(r.minute)&&r.minute<=clock.minute,'Neplatný nebo duplicitní zápis souběžné procedury');
  keys.add(r.id);
  if(r.type==='start'){
   const p=r.procedure;
   requireFact(r.startId===r.id&&p&&forms.has(p.formId)&&id(p.characterId)&&id(p.woundId)&&
    id(p.eventId)&&id(p.healerId)&&number(p.startMinute)&&p.startMinute===r.minute&&
    number(p.endMinute,p.startMinute+1)&&p.endMinute<=p.startMinute+10080&&
    p.eventId!==r.id&&p.confirmed===true&&p.args&&typeof p.args==='object'&&!Array.isArray(p.args)&&
    number(p.args.physicianRoll,1,100),'Neplatný původ nebo čas léčebné procedury');
   const scope=String(p.characterId)+'::'+p.woundId;
   requireFact(![...started.values()].some(x=>x.scope===scope&&!terminal.has(x.id)),'Rána už má rozpracovaný zákrok');
   requireFact(![...started.values()].some(x=>x.eventId===p.eventId),
    'Každý léčebný výsledek musí mít vlastní původní identitu');
   // A healer cannot physically conduct two timed procedures during the
   // same minutes. This is a LOCAL resource constraint, never a global
   // block on another actor, patient, clock view or emergency export.
   requireFact(![...started.values()].some(x=>x.healerId===p.healerId&&
    x.startMinute<p.endMinute&&p.startMinute<x.endMinute),
    'Vybraný léčitel již v tomto čase provádí jiný zákrok; vyberte jiného léčitele nebo pozdější termín');
   started.set(r.id,{...p,scope,id:r.id});
  }else{
   requireFact(started.has(r.startId)&&!terminal.has(r.startId),'Chybí zahájení, nebo je operace již uzavřená');
   const p=started.get(r.startId);
   requireFact(r.type==='cancel'||r.minute===p.endMinute,'Dokončení musí odpovídat skutečnému konci zákroku');
   requireFact(r.type!=='finish'||(id(r.resultEventId)&&r.resultEventId===p.eventId),
    'Dokončení musí použít původní uložený hod a ID');
   terminal.add(r.startId);
  }
 }
 return true;
}
export function openConcurrentProcedures(clock){
 validateConcurrentProcedures(clock);
 const finished=new Set((clock.concurrentProcedures??[]).filter(x=>x.type!=='start').map(x=>x.startId));
 return (clock.concurrentProcedures??[]).filter(x=>x.type==='start'&&!finished.has(x.id))
  .map(x=>({startId:x.id,...x.procedure})).sort((a,b)=>a.endMinute-b.endMinute||a.startId.localeCompare(b.startId));
}
export function startConcurrentProcedure(clock,{id:startId,procedure}={}){
 validateConcurrentProcedures(clock);
 requireFact(id(startId)&&procedure?.startMinute===clock.minute,'Zahájení musí potvrdit aktuální minutu');
 const next=structuredClone(clock);
 next.concurrentProcedures??=[];
 next.concurrentProcedures.push({type:'start',id:startId,startId,minute:clock.minute,procedure:structuredClone(procedure)});
 validateConcurrentProcedures(next);return next;
}
export function finishConcurrentProcedure(clock,{id:receiptId,startId,resultEventId}={}){
 validateConcurrentProcedures(clock);
 const start=openConcurrentProcedures(clock).find(x=>x.startId===startId);
 requireFact(start&&start.endMinute===clock.minute&&start.eventId===resultEventId&&id(receiptId),
  'Zákrok lze dokončit právě jednou a pouze ve skutečné koncové minutě');
 const next=structuredClone(clock);next.concurrentProcedures.push({type:'finish',id:receiptId,startId,
  resultEventId,minute:clock.minute});validateConcurrentProcedures(next);return next;
}
export function assertConcurrentProceduresAppendOnly(before,after){
 validateConcurrentProcedures(before);validateConcurrentProcedures(after);
 const old=before.concurrentProcedures??[],current=after.concurrentProcedures??[];
 requireFact(current.length>=old.length&&old.every((v,i)=>JSON.stringify(v)===JSON.stringify(current[i])),
  'Souběžné procedury nelze přepisovat ani mazat');return true;
}

/** Interruption is an explicit attested decision, never a silent deletion. */
export function cancelConcurrentProcedure(clock,{id:receiptId,startId,reason,confirmed=false}={}){
 validateConcurrentProcedures(clock);
 const op=openConcurrentProcedures(clock).find(x=>x.startId===startId);
 requireFact(confirmed===true&&op&&id(receiptId)&&typeof reason==='string'&&reason.trim().length>=5&&reason.length<=400,
  'Přerušení vyžaduje doložený důvod GM a existující nedokončený zákrok');
 const next=structuredClone(clock);
 next.concurrentProcedures.push({type:'cancel',id:receiptId,startId,minute:clock.minute,reason:reason.trim()});
 validateConcurrentProcedures(next);return next;
}
