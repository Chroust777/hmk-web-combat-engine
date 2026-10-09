/** HMK World of Kèthîra pp.158–162, 169, 176–179.
 * GM-controlled turn sequence. No dice rolls, time gaps, or unknown character
 * attributes are inferred. Event gates inspect the authoritative persistent
 * character state after each confirmed transition.
 */
import {validateCombatState,dueInjuryMorale,unresolvedInjuryMishaps} from './persistent-combat-state.js';
import {successLevel,SL} from '../rules/tests.js';

const ACTIONS=new Set(['attack','charge','evade','grope','incant','move','pass','ready','other','incapacitated','concentrate-start','concentrate-hold','concentrate-abandon']);
const MAX_ROUND=9999;
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
function fail(message){throw new Error(message)}
function requireValid(condition,message){if(!condition)fail(message)}
function clone(value){return structuredClone(value)}

export function orderHMKInitiative(roster,{astralscape=false}={}){
 requireValid(Array.isArray(roster)&&roster.length>0&&roster.length<=100,'Střetnutí vyžaduje 1–100 účastníků');
 const ids=new Set();
 const normalized=roster.map(x=>{
  requireValid(x&&typeof x.id==='string'&&x.id&&!ids.has(x.id),'Duplicitní nebo neplatné ID účastníka');ids.add(x.id);
  const isPC=x.isPC===true;
  const source=x.spiritWorld===true||x.initiativeML===null?'spirit':'initiative';
  const ml=source==='spirit'?x.spiritML:x.initiativeML;
  requireValid(int(ml,0,200),'Initiative Rank vyžaduje skutečné Initiative ML nebo Spirit ML (HMK str.159)');
  const awareness=x.awarenessEML;
  requireValid(int(awareness,0,200),'Shodu IR rozhoduje potvrzené Awareness EML');
  requireValid(['aware','confused','unaware'].includes(x.alertness??'aware'),'Neplatný výchozí stav Alertness');
  const empathy=astralscape?x.empathyEML:null;
  if(astralscape)requireValid(int(empathy,0,200),'Astralscape vyžaduje Empathy EML pro shody');
  requireValid(x.tieOrder===null||x.tieOrder===undefined||int(x.tieOrder,0,999),'GM pořadí shody musí být celé číslo 0–999');
  return {id:x.id,name:String(x.name||x.id),isPC,rank:ml,baseInitiativeML:x.baseInitiativeML??x.initiativeML,source,awarenessEML:awareness,empathyEML:empathy,
   tieOrder:x.tieOrder??null,alertness:x.alertness||'aware'};
 });
 normalized.sort((a,b)=>b.rank-a.rank||(astralscape?b.empathyEML-a.empathyEML:b.awarenessEML-a.awarenessEML)
   ||(a.isPC===b.isPC?0:a.isPC?-1:1)||(a.tieOrder??0)-(b.tieOrder??0));
 for(let i=1;i<normalized.length;i++){
  const a=normalized[i-1],b=normalized[i];
  if(a.rank===b.rank&&(astralscape?a.empathyEML===b.empathyEML:a.awarenessEML===b.awarenessEML)
   &&a.isPC===b.isPC){
   requireValid(a.tieOrder!==null&&b.tieOrder!==null&&a.tieOrder!==b.tieOrder,
    `Nevyřešená shoda Initiative Rank mezi ${a.name} a ${b.name}: zadejte GM/PC pořadí (HMK str.159)`);
  }
 }
 return normalized;
}
export function validateEncounterSequence(input){
 const s=clone(input);
 requireValid(s&&s.format==='hmk-initiative-sequence-v1'&&int(s.round,1,MAX_ROUND),'Neplatná časová osa Initiative');
 requireValid(Array.isArray(s.roster)&&s.roster.length>0&&s.roster.length<=100,'Chybí účastníci');
 requireValid(Array.isArray(s.order)&&s.order.length===s.roster.length,'Nesouhlasí pořadí účastníků');
 const ids=s.roster.map(x=>x.id),idset=new Set(ids);
 requireValid(idset.size===ids.length&&new Set(s.order).size===s.order.length&&s.order.every(id=>idset.has(id)),'Pořadí obsahuje neznámé postavy');
 requireValid(int(s.cursor,0,s.order.length)&&typeof s.active==='boolean','Neplatný ukazatel tahu');
 requireValid(Array.isArray(s.log)&&s.log.length<=30000,'Neplatná historie tahů');
 requireValid(s.readied&&typeof s.readied==='object'&&!Array.isArray(s.readied),'Neplatný seznam připravených akcí');
 requireValid(s.interruptActiveId===undefined||s.interruptActiveId===null||s.order.includes(s.interruptActiveId),'Neplatný přerušující aktér');
 requireValid(s.confirmedHits===undefined||s.confirmedHits&&typeof s.confirmedHits==='object'&&!Array.isArray(s.confirmedHits),'Neplatný registr potvrzených zásahů');
 requireValid(s.commitments===undefined||s.commitments&&typeof s.commitments==='object'&&!Array.isArray(s.commitments),'Neplatná vícekolová akce');
 requireValid(s.reactions===undefined||s.reactions&&typeof s.reactions==='object'&&!Array.isArray(s.reactions),'Neplatné Reaction Rolls');
 requireValid(s.entryAlertness===undefined||s.entryAlertness===null||['aware','confused','unaware'].includes(s.entryAlertness),'Neplatná Alertness při zahájení tahu');
 requireValid(s.entryShock===undefined||s.entryShock===null||['NONE','STN','INC','UNC','KIA'].includes(s.entryShock),'Neplatný původní Shock na začátku tahu');
 requireValid(s.entryMorale===undefined||s.entryMorale===null||typeof s.entryMorale==='string','Neplatná původní Morale na začátku tahu');
 requireValid(s.entryForcedPass===undefined||typeof s.entryForcedPass==='boolean','Neplatný původní Mishap Pass');
 requireValid(typeof s.timelineId==='string'&&s.timelineId.length>0,'Chybí ID časové osy');
 return s;
}
export function createEncounterSequence({roster,round=1,timelineId,astralscape=false}={}){
 requireValid(int(round,1,MAX_ROUND),'První kolo musí být celé číslo 1–9999');
 requireValid(typeof timelineId==='string'&&timelineId.length>0&&timelineId.length<=100,'Chybí ID střetnutí');
 const sorted=orderHMKInitiative(roster,{astralscape});
 return validateEncounterSequence({format:'hmk-initiative-sequence-v1',round,timelineId,astralscape,
  roster:sorted,order:sorted.map(x=>x.id),cursor:0,active:false,entryAlertness:null,interruptActiveId:null,reactions:{},readied:{},commitments:{},confirmedHits:{},log:[]});
}
function persistentState(states,id){
 const s=states[id];requireValid(!!s,`Účastník ${id} nemá doložený trvalý bojový stav`);validateCombatState(s);return s;
}
/** Mandatory current-round events, independent of turn order or inferred IR. */
export function dueEncounterEvents(sequence,states){
 const s=validateEncounterSequence(sequence),due=[];
 for(const id of s.order){
  const ps=persistentState(states,id);
  if(ps.shock==='KIA')continue;
  for(const w of ps.wounds||[]){
   if(w.bleeding&&int(w.nextAdvanceRound,1,MAX_ROUND)&&w.nextAdvanceRound<=s.round){
    due.push({characterId:id,type:'blood-loss',woundId:w.id,dueRound:w.nextAdvanceRound});
   }
  }
  // HMK pp.162,170: injury mishaps resolve immediately. A serious/grievous
  // wound's Morale Roll becomes mandatory after all associated Shock ends.
  for(const m of unresolvedInjuryMishaps(ps))due.push({characterId:id,type:'injury-mishap',mishapId:m.id,dueRound:s.round});
  for(const m of dueInjuryMorale(ps))due.push({characterId:id,type:'injury-morale',woundId:m.woundId,dueRound:s.round});
  if(ps.morale?.state==='brave'&&ps.morale.braveTimelineId===s.timelineId
   &&int(ps.morale.braveSince,1,MAX_ROUND)&&ps.morale.braveSince+60<=s.round){
   due.push({characterId:id,type:'brave-expiry',dueRound:ps.morale.braveSince+60});
  }
  const q=ps.shockFollowup;
  if(q&&q.kind==='UNC'&&q.phase==='after-ten-minutes'&&q.timelineId===s.timelineId&&q.dueRound<=s.round){
   due.push({characterId:id,type:'unc-shock-reroll',dueRound:q.dueRound});
  }
  if(q&&q.phase==='after-all-bleeding-stopped')due.push({characterId:id,type:'blood-shock-reroll',dueRound:q.dueRound});
 }
 return due;
}
export function dueEndTurnEvents(sequence,states){
 const s=validateEncounterSequence(sequence);
 if(!s.active||s.cursor>=s.order.length)return [];
 const id=s.order[s.cursor],p=persistentState(states,id),q=p.shockFollowup,due=[];
 if(q&&['STN','INC'].includes(q.kind)&&q.phase==='end-next-turn'&&q.timelineId===s.timelineId&&q.dueRound<=s.round){
  due.push({characterId:id,type:'shock-end-turn',dueRound:q.dueRound});
 }
 if(p.shock!=='KIA'&&p.posture?.passNextTurn)due.push({characterId:id,type:'mishap-pass-end-turn',dueRound:s.round});
 if(p.shock!=='KIA'&&p.morale?.state==='catatonic'&&
   !(p.morale.lastReactionRound===s.round&&p.morale.lastReactionTimelineId===s.timelineId)){
  due.push({characterId:id,type:'catatonic-end-turn-reaction',dueRound:s.round});
 }
 return due;
}
export function startEncounterTurn(sequence,states){
 const s=validateEncounterSequence(sequence);
 requireValid(!s.active&&!s.interruptActiveId&&s.cursor<s.order.length,'Tah již běží nebo kolo skončilo');
 const events=dueEncounterEvents(s,states);
 requireValid(events.length===0,'Před dalším tahem musí GM vyřešit splatné události: '+events.map(e=>`${e.type} ${e.characterId}${e.woundId?' / '+e.woundId:''}`).join(', '));
 const id=s.order[s.cursor],p=persistentState(states,id);
 const ongoing=s.commitments?.[id];
 if(ongoing?.status==='in-progress'&&ongoing.completionRound<=s.round&&p.shock!=='KIA')
  fail('Vícekolová akce na tomto IR skončí právě teď: GM musí potvrdit nepřerušené soustředění nebo akci opustit');
 if(ongoing?.status==='in-progress'&&p.shock==='KIA'){
  ongoing.status='interrupted';ongoing.reason='KIA';
  s.log.push({round:s.round,type:'concentration-interrupted',actorId:id,reason:'KIA'});
 }
 s.active=true;s.entryAlertness=s.roster.find(x=>x.id===id)?.alertness||'aware';
 s.entryShock=p.shock;s.entryMorale=p.morale?.state??'steady';s.entryForcedPass=!!p.posture?.passNextTurn;
 s.log.push({round:s.round,type:'turn-start',actorId:id,shock:p.shock,alertness:s.entryAlertness});
 return s;
}
export function finishEncounterTurn(sequence,states,{action='pass',durationRounds=null,readiedAction=null,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(s.active&&s.cursor<s.order.length&&!s.interruptActiveId,'Nelze ukončit tah, který nezačal, nebo právě probíhá přerušující akce');
 requireValid(gmConfirmed===true,'GM musí potvrdit skutečné dokončení tahu');
 requireValid(ACTIONS.has(action),'Neznámá kategorie bojové akce');
 const pending=dueEndTurnEvents(s,states);
 const id=s.order[s.cursor];const startedConfused=s.entryAlertness==='confused';
 if(startedConfused)requireValid(s.reactions?.[id]?.round===s.round&&s.reactions[id].phase==='end-turn',
  'Confused musí na konci tahu vyhodnotit skutečný Initiative Reaction Roll (HMK str.159)');
 requireValid(!pending.length,'Nelze ukončit tah: povinný Shock / Mishap Pass / Catatonic Reaction na konci tahu ještě nebyl vyhodnocen');
 const p=persistentState(states,id);
 if(action==='evade')requireValid(s.entryShock!=='STN'&&p.shock!=='STN','Stunned postava nesmí vybrat Evade (HMK str.161)');
 const helpless=['INC','UNC','KIA'].includes(p.shock)||p.coma?.active||p.morale?.state==='catatonic';
 if(helpless)requireValid(action==='incapacitated','Bezvládná či mrtvá postava nemůže vykonat akci');
 if(['INC','UNC','KIA'].includes(s.entryShock)||s.entryMorale==='catatonic')
  requireValid(action==='incapacitated','Postava začala tah bezvládná či Catatonic; zotavení na konci tahu nedovoluje zpětně vykonat akci');
 if(s.entryForcedPass)requireValid(action==='pass','Mishap přikazuje v tomto tahu Pass, i když je následný efekt na konci tahu vyřešen');
 if(!helpless&&p.morale?.state==='routed')requireValid(['move','pass'].includes(action),'Routed musí utíkat nebo Pass podle HMK str.162');
 if(!helpless&&p.morale?.state==='withdrawing')requireValid(['move','pass'].includes(action),'Withdrawing musí ustupovat nebo Pass');
 const row=s.roster.find(x=>x.id===id);
 if(!helpless&&s.entryAlertness==='confused')requireValid(action==='pass','Confused musí Pass; Reaction na konci tahu umožní akci až v dalším tahu');
 if(!helpless&&s.entryAlertness==='unaware')requireValid(action==='incapacitated','Unaware nesmí jednat, dokud není upozorněna na nebezpečí (HMK str.158)');
 const running=s.commitments?.[id];
 if(running?.status==='in-progress'){
  requireValid(['concentrate-hold','concentrate-abandon'].includes(action)||(helpless&&action==='incapacitated'),
   'Vícekolová akce vyžaduje pokračování koncentrace nebo výslovné opuštění');
  if(action==='concentrate-abandon'||(helpless&&action==='incapacitated')){
   running.status='abandoned';running.reason=helpless?'incapacitated':'GM-abandoned';
   s.log.push({round:s.round,type:'concentration-abandoned',actorId:id});
  }
 }else if(action==='concentrate-start'){
  requireValid(!helpless&&row.alertness==='aware','Vícekolovou akci může začít pouze schopný a Aware účastník');
  requireValid(int(durationRounds,1,9999)&&s.round+durationRounds<=MAX_ROUND,'Požadována potvrzená délka 1+ round akce');
  s.commitments??={};s.commitments[id]={startRound:s.round,startIR:row.rank,completionRound:s.round+durationRounds,
   durationRounds,status:'in-progress'};
  s.log.push({round:s.round,type:'concentration-start',actorId:id,completionRound:s.round+durationRounds});
 }else if(['concentrate-hold','concentrate-abandon'].includes(action))fail('Tato akce není v koncentraci');
 if(action==='ready'){
  requireValid(!s.readied[id],'Postava už má otevřenou připravenou akci');
  requireValid(['attack','grope','move'].includes(readiedAction),'Připravit lze pouze 1-turn Attack, Grope či Move (HMK str.161)');
  s.readied[id]={fromRound:s.round,originalRank:row.rank,kind:readiedAction,resolved:false};
 }
 s.log.push({round:s.round,type:'turn-complete',actorId:id,action});s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryForcedPass=false;s.cursor++;
 return s;
}
/** Readied 1-turn actions resolve later, may interrupt another turn;
 * next-round IR is the confirmed interrupt IR. Does not grant another turn. */
export function resolveReadiedEncounterAction(sequence,{actorId,interruptIR,moveHalfConfirmed=false,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Přerušení připravenou akcí musí potvrdit GM');
 const r=s.readied[actorId];
 requireValid(r&&!r.resolved&&r.fromRound===s.round,'Není otevřená připravená akce z tohoto kola');
 requireValid(!s.interruptActiveId,'Jiná připravená akce už právě přerušuje tah');
 requireValid(int(interruptIR,0,200),'Je nutné potvrzené IR, při kterém se akce vyvolala');
 if(r.kind==='move')requireValid(moveHalfConfirmed===true,'Readied Move je nejvýše half Move; GM musí potvrdit dodržení limitu (HMK str.161)');
 if(s.active){const interrupted=s.roster.find(x=>x.id===s.order[s.cursor]);requireValid(interruptIR===interrupted.rank,'Přerušení během cizího tahu nastává na skutečném Initiative Rank tohoto tahu');}
 else {
  const before=s.cursor>0?s.roster.find(x=>x.id===s.order[s.cursor-1])?.rank:200;
  const after=s.cursor<s.order.length?s.roster.find(x=>x.id===s.order[s.cursor])?.rank:0;
  requireValid(interruptIR<=before&&interruptIR>=after,'Připravenou akci nelze vyvolat na minulém ani budoucím IR; GM musí potvrdit aktuální pořadí');
 }
 // A readied action cannot travel backward in initiative time.
 requireValid(interruptIR<=r.originalRank,'Připravená akce se smí vykonat až na pozdějším IR');
 r.triggered=true;r.interruptIR=interruptIR;s.interruptActiveId=actorId;
 s.log.push({round:s.round,type:'readied-triggered',actorId,interruptIR});return s;
}
export function nextEncounterRound(sequence,states){
 const s=validateEncounterSequence(sequence);
 requireValid(!s.active&&!s.interruptActiveId&&s.cursor===s.order.length,'Nové kolo lze zahájit jen po skončení všech tahů a přerušení');
 requireValid(s.round<MAX_ROUND,'Překročen maximální počet kol');
 requireValid(dueEncounterEvents(s,states).length===0,'Nelze přeskočit nevyřešené splatné události');
 requireValid(!Object.entries(s.readied).some(([,r])=>!r.resolved),'Nevyřízená připravená akce: GM ji musí nejprve vyhodnotit nebo zrušit');
 for(const [id,r] of Object.entries(s.readied)){
  if(r.resolved){const original=s.roster.find(x=>x.id===id);original.rank=r.interruptIR;original.source='readied-action';}
 }
 s.readied={};s.reactions={};s.round++;s.cursor=0;s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryForcedPass=false;s.interruptActiveId=null;
 // Rank changes due to Readied Action affect the next round. Tie resolution
 // remains explicit; no arbitrary id-order fallback.
 const ordered=orderHMKInitiative(s.roster.map(x=>({...x,initiativeML:x.rank,spiritWorld:false})),{astralscape:s.astralscape});
 s.roster=ordered;s.order=ordered.map(x=>x.id);
 s.log.push({round:s.round,type:'round-start'});return s;
}
export function cancelReadiedEncounterAction(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);requireValid(gmConfirmed,'GM musí potvrdit nevyužitou připravenou akci');
 requireValid(s.readied[actorId]&&!s.readied[actorId].resolved,'Není nevyužitá připravená akce');
 delete s.readied[actorId];s.log.push({round:s.round,type:'readied-cancelled',actorId});return s;
}
function currentAttackToken(s){
 requireValid(!!currentEncounterActor(s),'Zásah nemá aktivního jednajícího účastníka');
 return `${s.timelineId}:${s.round}:${s.cursor}:${s.interruptActiveId||'main'}`;
}
export function assertScheduledHitCanCommit(sequence,actorId){
 const s=validateEncounterSequence(sequence);
 requireValid(currentEncounterActor(s)===actorId,'Zásah je mimo aktivní tah útočníka');
 requireValid(!s.confirmedHits?.[currentAttackToken(s)],'Tento účastník již potvrdil zásah v aktuální Attack akci; další samostatný zásah vyžaduje nový tah');
}
export function recordScheduledHitCommit(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Zápis do seznamu útoků vyžaduje skutečné potvrzení GM');
 assertScheduledHitCanCommit(s,actorId);
 s.confirmedHits??={};s.confirmedHits[currentAttackToken(s)]={round:s.round,actorId};
 s.log.push({round:s.round,type:'hit-confirmed',actorId,token:currentAttackToken(s)});
 return s;
}
export function setEncounterTieOrder(sequence,{actorId,tieOrder,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Pořadí shody musí potvrdit GM či hráči');
 requireValid(int(tieOrder,0,999),'Pořadí shody musí být 0–999');
 const row=s.roster.find(r=>r.id===actorId);requireValid(!!row,'Účastník nenalezen');
 row.tieOrder=tieOrder;s.log.push({round:s.round,type:'initiative-tie-decision',actorId,tieOrder});return s;
}
export function currentEncounterActor(sequence){const s=validateEncounterSequence(sequence);return s.interruptActiveId|| (s.active?s.order[s.cursor]:null);}
export function completeReadiedEncounterAction(sequence,{gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);requireValid(gmConfirmed,'GM musí potvrdit skutečné dokončení přerušující akce');
 const id=s.interruptActiveId;requireValid(!!id&&s.readied[id]?.triggered&&!s.readied[id]?.resolved,'Není otevřené přerušení připravenou akcí');
 s.readied[id].resolved=true;s.interruptActiveId=null;
 s.log.push({round:s.round,type:'readied-complete',actorId:id,interruptIR:s.readied[id].interruptIR});return s;
}
/** HMK p.160: concentration completes immediately BEFORE the actor's IR
 * on round R+N; it does NOT consume that new turn. The GM supplies evidence
 * of uninterrupted concentration, never automatically assumed from a clock. */
export function confirmConcentrationCompletion(sequence,states,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId];
 requireValid(gmConfirmed===true,'GM musí potvrdit nepřerušenou koncentraci po všechna kola');
 requireValid(!s.active&&s.order[s.cursor]===actorId,'Dokončení nastává bezprostředně před vlastním IR');
 requireValid(c?.status==='in-progress'&&c.completionRound===s.round,'Vícekolová akce není ve správném kole a IR');
 const p=persistentState(states,actorId);
 requireValid(!['INC','UNC','KIA'].includes(p.shock)&&!p.coma?.active,'Postava není schopna dokončit soustředění bez zvláštního rozhodnutí GM');
 c.status='completed';c.completedRound=s.round;
 s.log.push({round:s.round,type:'concentration-complete',actorId,startRound:c.startRound,durationRounds:c.durationRounds});
 return s;
}
export function abandonEncounterConcentration(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId];
 requireValid(gmConfirmed===true,'GM musí potvrdit opuštění koncentrace');
 requireValid(c?.status==='in-progress','Žádná nedokončená koncentrace');
 c.status='abandoned';c.reason='GM-abandoned';
 s.log.push({round:s.round,type:'concentration-abandoned',actorId});return s;
}
export function ongoingEncounterConcentration(sequence,actorId){
 const s=validateEncounterSequence(sequence);return s.commitments?.[actorId]?.status==='in-progress'?s.commitments[actorId]:null;
}
export function assertScheduledMeleeActor(sequence,attackerId){
 if(!sequence)return;
 const s=validateEncounterSequence(sequence);
 requireValid(currentEncounterActor(s)===attackerId,'Melee Attack lze nyní vyhodnotit jen pro právě jednající postavu v Initiative pořadí');
 if(s.interruptActiveId)requireValid(s.readied[s.interruptActiveId]?.kind==='attack','Melee Attack nelze vyhodnotit pro připravenou akci Grope či Move');
}

/** p.159: Initiative Reaction for Confused is mandatory at end of turn.
 * An Unaware foe may react immediately after a separately GM-confirmed alert.
 * Initiative EML is original Initiative ML minus confirmed Fatigue; never IR
 * modified by a readied action. Outcome depends on the actual d100.
 */
export function confirmAlertnessReaction(sequence,states,{actorId,roll,immediateAlert=false,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'GM musí potvrdit skutečný Reaction Roll');
 const row=s.roster.find(x=>x.id===actorId);
 requireValid(!!row,'Reaction patří neznámé postavě');
 if(immediateAlert)requireValid(row.alertness==='unaware','Immediate alert lze použít jen pro Unaware');
 else requireValid(s.active&&s.order[s.cursor]===actorId&&s.entryAlertness==='confused',
  'Confused Reaction patří na konec právě probíhajícího tahu');
 const key=actorId;
 requireValid(!(s.reactions?.[key]?.round===s.round&&s.reactions[key].phase===(immediateAlert?'immediate':'end-turn')),
  'Reaction už byl v tomto okamžiku vyhodnocen');
 const p=persistentState(states,actorId);
 requireValid(int(roll,1,100),'Reaction potřebuje skutečný d100');
 const fat=p.fatigue??{};
 const total=Number(fat.windedness??0)+Number(fat.weariness??0)+Number(fat.otherWeakness??0)+Number(p.bloodLoss?.weaknessFatigue??0);
 requireValid(int(total,0,999),'Fatigue pro Reaction není potvrzená');
 requireValid(int(row.baseInitiativeML,0,200),'Reaction vyžaduje skutečné Initiative ML a ne jen posunutý IR');
 const rawEML=row.baseInitiativeML-total;
 const sl=successLevel(roll,rawEML);
 const success=sl===SL.S||sl===SL.CS;
 row.alertness=success?'aware':immediateAlert?'confused':row.alertness;
 s.reactions??={};s.reactions[key]={round:s.round,phase:immediateAlert?'immediate':'end-turn',roll,rawEML,sl,after:row.alertness};
 s.log.push({round:s.round,type:'alertness-reaction',actorId,phase:s.reactions[key].phase,roll,rawEML,sl,after:row.alertness});
 return s;
}
