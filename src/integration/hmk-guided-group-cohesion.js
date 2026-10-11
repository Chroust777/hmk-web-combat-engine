/** HMK: Roleplaying in the World of Kèthîra, printed p.162.
 * Group Cohesion is an IMMEDIATE, repeatable Morale trigger on REALISING
 * at least half of the allies remaining since the previous threshold were
 * vanquished. Never infer who is an ally or what the observer noticed.
 * The immutable cohort and every awareness decision are auditable. All
 * functions are pure; the caller commits the returned state and sequence
 * in the existing single combat transaction. No random dice are generated.
 */
import { validateEncounterSequence } from './encounter-turn-sequence.js';
import { validateCombatState, combatFatigueTotals } from './persistent-combat-state.js';
import { hmkMoraleTransition } from './injury-special-hmk.js';
const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const integer=(x,a=0,b=9999)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const clone=v=>structuredClone(v);
const sort=ids=>[...ids].sort();
const identical=(a,b)=>JSON.stringify(sort(a))===JSON.stringify(sort(b));
function oneML(character,name){
 const rows=(character?.hmk?.skills??[]).filter(x=>String(x.name??x.key??'').trim().toLowerCase()===name);
 need(rows.length===1&&integer(rows[0].ml,0,200),`Group Cohesion: chybí jediný doložený ${name} ML`);
 return rows[0].ml;
}
/** Mechanical vanquishing only; GM-defined incapacitation is NOT guessed. */
export function definiteVanquished(state){
 validateCombatState(state);
 if(['INC','UNC','KIA'].includes(state.shock))return true;
 if(state.morale?.gmVanquished?.active===true)return true;
 if(['catatonic','routed','withdrawing'].includes(state.morale?.state))return true;
 return false;
}
function checkedParticipants(sequence,participants){
 const seq=validateEncounterSequence(sequence);
 need(Array.isArray(participants)&&participants.length===seq.order.length,'Group Cohesion: chybí úplný roster');
 const map=new Map();
 for(const p of participants){
  need(p?.character?.id&&seq.order.includes(p.character.id)&&!map.has(p.character.id),'Group Cohesion: neznámá nebo duplicitní postava');
  validateCombatState(p.state);map.set(p.character.id,p);
 }
 return {seq,map};
}
function rosterCheck(value,seq,observerId){
 need(Array.isArray(value)&&value.length>0&&value.length<seq.order.length,
  'Group Cohesion: potvrďte alespoň jednoho skutečného spojence');
 need(new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&seq.order.includes(id)&&id!==observerId),
  'Group Cohesion: v seznamu spojenců je cizí, duplicitní nebo vlastní ID');
}
function eventCheck(state,eventId){
 need(typeof eventId==='string'&&eventId.length>0&&!state.events.some(x=>x.id===eventId),
  'Group Cohesion: neplatné nebo duplicitní ID události');
}
export function registerGuidedCohesion({sequence,participants,observerId,allyIds,eventId}={}){
 const {seq,map}=checkedParticipants(sequence,participants),p=map.get(observerId);
 need(p,'Group Cohesion: pozorovatel není účastníkem boje');
 rosterCheck(allyIds,seq,observerId);
 need(!p.state.morale?.cohesion,'Group Cohesion: skupina už existuje; během boje ji nelze přepsat');
 need(allyIds.every(id=>!definiteVanquished(map.get(id).state)),
  'Group Cohesion: počáteční skupinu nelze založit až po prokazatelné ztrátě; chybí historický základ');
 eventCheck(p.state,eventId);
 const state=clone(p.state);
 state.morale.cohesion={timelineId:seq.timelineId,allyIds:sort(allyIds),
  remainingAtThreshold:sort(allyIds),knownVanquishedIds:[],assessedVanquishedIds:[],lastTriggerEventId:null};
 state.lastRound=Math.max(state.lastRound,seq.round);
 state.events.push({id:eventId,type:'group-cohesion-roster',round:seq.round,
  details:{allyIds:sort(allyIds),timelineId:seq.timelineId,source:'HMK p.162',physicalDice:{rolls:[]}}});
 validateCombatState(state);
 const next=clone(seq);next.log.push({round:seq.round,type:'group-cohesion-roster',actorId:observerId,eventId});
 return {state,sequence:next,event:state.events.at(-1)};
}
export function groupCohesionDue(sequence,participants){
 const {seq,map}=checkedParticipants(sequence,participants),due=[];
 for(const id of seq.order){
  const p=map.get(id),cohort=p.state.morale?.cohesion;
  if(!cohort||['INC','UNC','KIA'].includes(p.state.shock)||p.state.morale?.state==='catatonic')continue;
  need(cohort.timelineId===seq.timelineId,'Group Cohesion: skupina patří do jiné časové osy');
  const checked=new Set(cohort.assessedVanquishedIds);
  const casualties=cohort.allyIds.filter(ally=>definiteVanquished(map.get(ally).state)&&!checked.has(ally));
  if(casualties.length)due.push({characterId:id,type:'group-cohesion-assessment',dueRound:seq.round,casualtyIds:casualties});
 }
 return due;
}
/** All newly mechanically vanquished allies must be assessed; a previously
 * unobserved loss can be explicitly noticed in a later assessment. */
export function assessGuidedCohesion({sequence,participants,observerId,noticedIds=[],eventId,roll=null,aberrance=null}={}){
 const {seq,map}=checkedParticipants(sequence,participants),p=map.get(observerId);
 need(p,'Group Cohesion: neznámý pozorovatel');
 need(!['INC','UNC','KIA'].includes(p.state.shock)&&p.state.morale?.state!=='catatonic',
  'Group Cohesion: bezvládná nebo nevnímající postava právě nemůže zaznamenat ztrátu');
 const cohort=p.state.morale?.cohesion;
 need(cohort&&cohort.timelineId===seq.timelineId,'Group Cohesion: nejprve definujte spojence');
 eventCheck(p.state,eventId);
 need(Array.isArray(noticedIds)&&new Set(noticedIds).size===noticedIds.length,
  'Group Cohesion: neplatný seznam povšimnutých ztrát');
 const trueCasualties=cohort.allyIds.filter(id=>definiteVanquished(map.get(id).state));
 need(noticedIds.every(id=>trueCasualties.includes(id)),
  'Group Cohesion: nelze započítat neztraceného nebo neověřeného spojence');
 const oldKnown=new Set(cohort.knownVanquishedIds);
 need(trueCasualties.some(id=>!cohort.assessedVanquishedIds.includes(id))||
  noticedIds.some(id=>!oldKnown.has(id)),
  'Group Cohesion: nelze zapisovat událost bez nově doložené skutečnosti');
 const allKnown=new Set([...oldKnown,...noticedIds]);
 const fresh=cohort.remainingAtThreshold.filter(id=>allKnown.has(id));
 const count=cohort.remainingAtThreshold.length;
 const threshold=Math.ceil(count/2);
 const triggered=count>0&&fresh.length>=threshold;
 need(!triggered||integer(roll,1,100),'Group Cohesion: dosažený práh vyžaduje skutečný Initiative d100');
 need(triggered||(roll===null||roll===undefined),'Group Cohesion: bez překročení prahu se nehází');
 need(!triggered||integer(aberrance,0,200),'Group Cohesion: potvrďte skutečnou Aberrance (i 0 musí být doložená)');
 const state=clone(p.state),tracking=state.morale.cohesion;
 tracking.knownVanquishedIds=sort(allKnown);
 tracking.assessedVanquishedIds=sort(new Set([...tracking.assessedVanquishedIds,...trueCasualties]));
 let result=null;
 if(triggered){
  const initiativeML=oneML(p.character,'initiative');
  const fatigue=combatFatigueTotals(state).total;
  result=hmkMoraleTransition({initiativeML,fatigue,aberrance,brave:state.morale.state==='brave',roll,
   current:state.morale.state});
  state.morale.state=result.state;
  state.morale.psycheStress+=result.result.psycheStress;
  if(result.result.state==='brave'){
   state.morale.braveSince=seq.round;state.morale.braveTimelineId=seq.timelineId;
  }
  tracking.remainingAtThreshold=tracking.remainingAtThreshold.filter(id=>!allKnown.has(id));
  tracking.lastTriggerEventId=eventId;
 }
 state.lastRound=Math.max(state.lastRound,seq.round);
 const details={source:'HMK p.162',timelineId:seq.timelineId,allyIds:clone(tracking.allyIds),
  noticedIds:sort(noticedIds),allKnownIds:sort(allKnown),newlyVanquished:sort(fresh),
  threshold,previousRemaining:count,nextRemaining:tracking.remainingAtThreshold.length,
  triggered,initiativeML:result?oneML(p.character,'initiative'):null,
  fatigue:result?combatFatigueTotals(p.state).total:null,aberrance:result?aberrance:null,
  rawEML:result?.rawEML??null,sl:result?.slName??null,state:state.morale.state,
  physicalDice:{format:'hmk-manual-dice-proof-v1',source:'HMK p.162',rolls:triggered?
   [{id:'groupCohesionD100',faces:100,value:roll,actorId:observerId,source:'GM-entered-physical-die'}]:[]}};
 state.events.push({id:eventId,type:'group-cohesion-assessment',round:seq.round,details});
 validateCombatState(state);
 const next=clone(seq);next.log.push({round:seq.round,type:'group-cohesion-assessment',actorId:observerId,eventId,triggered});
 return {state,sequence:next,event:state.events.at(-1),triggered,result};
}

/** HMK p.162 Vanquished sidebar. GM explicitly adjudicates functional
 * inability (e.g. paralysis, entanglement, sleep, enthralment, disarmament
 * against armed foes). Unlike Shock, no engine can infer the factual cause.
 * An explicit later ruling can remove the condition. */
export function recordGuidedFunctionalVanquished({sequence,participants,targetId,active,category,reason,eventId,gmConfirmed=false}={}){
 const {seq,map}=checkedParticipants(sequence,participants),p=map.get(targetId);
 need(p&&typeof active==='boolean','Vanquished: vyberte skutečného účastníka a stav');
 need(gmConfirmed===true,'Vanquished: GM musí potvrdit skutečný funkční stav');
 need(['paralysis','entanglement','sleep','enthralment','grievous-functional-loss','disarmed-against-armed','other'].includes(category),
  'Vanquished: vyberte konkrétní pravidlovou příčinu');
 need(typeof reason==='string'&&reason.trim().length>=5&&reason.trim().length<=400,
  'Vanquished: důvod musí být doložen');
 need(!(p.state.shock==='KIA'&&!active),'Vanquished: mrtvou postavu nelze obnovit volbou GM');
 const before=p.state.morale?.gmVanquished?.active===true;
 need(before!==active,'Vanquished: potvrzený stav už platí; nelze zapsat duplicitní událost');
 eventCheck(p.state,eventId);
 const result=clone(p.state);
 result.morale.gmVanquished={active,category,reason:reason.trim(),timelineId:seq.timelineId,sourceEventId:eventId};
 result.lastRound=Math.max(result.lastRound,seq.round);
 result.events.push({id:eventId,type:'gm-functional-vanquished',round:seq.round,details:{
  source:'HMK p.162 Vanquished sidebar',active,category,reason:reason.trim(),
  timelineId:seq.timelineId,physicalDice:{rolls:[]},gmConfirmed:true}});
 validateCombatState(result);
 const next=clone(seq);next.log.push({round:seq.round,type:'gm-functional-vanquished',actorId:targetId,eventId,active});
 return {state:result,sequence:next,event:result.events.at(-1)};
}
