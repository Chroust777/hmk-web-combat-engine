/**
 * HMK World of Kèthîra – manual dice input boundary.
 * The application NEVER rolls gameplay dice here. It requests the actual
 * physical die result from the GM, validates it, and stores a deterministic
 * witness. A cancelled or incomplete queue cannot be consumed by rules.
 *
 * This is deliberately headless: the future guided encounter UI can use the
 * same queue without changing combat arithmetic or persistent state formats.
 */
const FACES=new Set([4,6,8,10,12,20,100]);
const fail=(message)=>{throw new Error(message)};
const validId=(s)=>typeof s==='string'&&s.length>0&&s.length<=160;
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;

export function readPhysicalDieValue(input,faces){
 if(!FACES.has(faces))fail(`Nepodporovaná kostka d${faces}`);
 // Number('') and Number(null) return zero; reject them explicitly.
 const value=typeof input==='number'?input:typeof input==='string'&&/^[0-9]+$/.test(input.trim())?Number(input.trim()):NaN;
 if(!integer(value,1,faces))fail(`Výsledek d${faces} musí být celé číslo od 1 do ${faces}`);
 return value;
}

export function createManualDiceQueue({id,source,round,actorId,requests}={}){
 if(!validId(id)||!validId(source)||!validId(actorId)||!integer(round,1,9999))fail('Nedoložené střetnutí, kolo nebo zdroj hodů');
 if(!Array.isArray(requests)||requests.length===0||requests.length>32)fail('Chybí doložené pořadí hodů');
 const ids=new Set();
 const entries=requests.map((r,i)=>{
  if(!validId(r?.id)||ids.has(r.id)||!FACES.has(r.faces)||!validId(r.label))fail('Neplatný nebo duplicitní požadavek na kostku');
  ids.add(r.id);
  return {id:r.id,faces:r.faces,label:r.label,ordinal:i+1};
 });
 return {format:'hmk-manual-dice-queue-v1',id,source,round,actorId,requests:entries,rolls:[],status:'waiting'};
}

export function nextManualDie(queue){
 assertQueue(queue);
 if(queue.status!=='waiting')return null;
 return queue.requests[queue.rolls.length]??null;
}

export function recordManualDie(queue,{requestId,value}={}){
 const next=nextManualDie(queue);
 if(!next)fail('Tato sada hodů už není otevřená');
 if(requestId!==next.id)fail('Hody musí být zadány v přesně určeném pořadí');
 const roll=readPhysicalDieValue(value,next.faces);
 const result={...queue,rolls:[...queue.rolls,{id:next.id,faces:next.faces,label:next.label,value:roll,ordinal:next.ordinal,source:'GM-entered-physical-die'}]};
 if(result.rolls.length===result.requests.length)result.status='complete';
 return result;
}

export function cancelManualDiceQueue(queue){
 assertQueue(queue);
 if(queue.status==='complete')fail('Dokončené hody nelze zpětně stornovat bez zrušení celé akce');
 return {...queue,status:'cancelled'};
}

export function completedManualDice(queue){
 assertQueue(queue);
 if(queue.status!=='complete'||queue.rolls.length!==queue.requests.length)fail('Hod není kompletní: bojový stav se nesmí změnit');
 const values={};for(const r of queue.rolls)values[r.id]=r.value;
 return {values,proof:{format:'hmk-manual-dice-proof-v1',queueId:queue.id,source:queue.source,round:queue.round,actorId:queue.actorId,
  rolls:queue.rolls.map(r=>({...r}))}};
}

export function assertQueue(queue){
 if(queue?.format!=='hmk-manual-dice-queue-v1'||!Array.isArray(queue.requests)||!Array.isArray(queue.rolls)||
  !['waiting','complete','cancelled'].includes(queue.status)||queue.rolls.length>queue.requests.length)fail('Neplatný stav požadavku na kostky');
 return true;
}

/** Browser presentation boundary. Passing a prompt callback makes it testable
 * without a real browser. null = cancelled, never a die result. On invalid
 * input, reject the entire action; no partial roll is committed anywhere.
 */
export function collectPhysicalDice({queue,promptValue}={}){
 assertQueue(queue);
 if(typeof promptValue!=='function')fail('Není dostupné okénko pro zadání skutečného hodu GM');
 let state=queue;
 while(nextManualDie(state)){
  const request=nextManualDie(state);
  const value=promptValue({faces:request.faces,label:request.label,ordinal:request.ordinal,total:state.requests.length,
   source:state.source,round:state.round,actorId:state.actorId});
  if(value===null||value===undefined)return {cancelled:true,queue:cancelManualDiceQueue(state)};
  state=recordManualDie(state,{requestId:request.id,value});
 }
 return {cancelled:false,queue:state,...completedManualDice(state)};
}
