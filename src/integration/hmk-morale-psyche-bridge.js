/** HMK v1.2 pp.162,188–189: connect new, physically witnessed Morale PSY
 * to the existing Psyche Trait choice / manifestation / recovery sequence.
 * Mutates ONLY the caller's not-yet-committed full-document draft. The caller
 * must persist the resulting document with the existing atomic CAS writer.
 * No dice are rolled here and no new write channel is introduced.
 */
import {hmkMoraleTransition} from './injury-special-hmk.js';
const must=(ok,msg)=>{if(!ok)throw Error('Morale → Psyche: '+msg)};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const kinds=new Set(['injury-morale','group-cohesion-assessment','special-morale-resolution']);
const deep=x=>structuredClone(x);
function witnessedMorale(e,characterId,beforeState){
 const d=e.details??{};
 let psyche,roll,ml,fatigue,aberrance,brave;
 if(e.type==='injury-morale'){
  psyche=d.result?.psycheStress;roll=d.roll;ml=d.initiativeML;fatigue=d.fatigue;aberrance=d.aberrance;
 }else{
  psyche=d.psycheStress;roll=d.physicalDice?.rolls?.[0]?.value;
  ml=d.initiativeML;fatigue=d.fatigue;aberrance=d.aberrance;
 }
 must(int(psyche,1,99999)&&int(roll,1,100)&&int(aberrance,0,200)&&int(fatigue,0,99999),
  'chybí konkrétní PSY, fyzický d100, Fatigue nebo Aberrance');
 const dice=d.physicalDice?.rolls;
 if(dice){must(dice.length===1&&dice[0].faces===100&&dice[0].value===roll&&
   dice[0].source==='GM-entered-physical-die'&&
   (!dice[0].actorId||dice[0].actorId===characterId),
   'podvržený nebo neúplný fyzický hod');}
 // An injury Morale event carries calculated rawEML, not necessarily the
 // pre-modifier Initiative ML; reconstruct against the original event state.
 must(int(ml,0,200),'chybí doložená Initiative ML');
 const candidate=hmkMoraleTransition({initiativeML:ml,roll,fatigue,aberrance,
  brave:beforeState.morale.state==='brave'||beforeState.fear?.state==='brave',current:beforeState.morale.state});
 must(d.rawEML===candidate.rawEML,'podvržené výsledné Morale EML');
 must(candidate.result.psycheStress===psyche&&
  (d.slName===undefined||d.slName===candidate.slName)&&
  (d.sl===undefined||d.sl===candidate.slName),
  'PSY neodpovídá autoritativnímu Morale d100');
 return psyche;
}
/** Called before serialization of the complete combat snapshot. */
export function linkNewMoralePsycheAccrual(before,after){
 if(!before?.characters||!after?.characters||!Array.isArray(after.journal))return [];
 const processed=[];
 for(const person of after.characters){
  const prior=before.characters.find(c=>c.id===person.id);
  if(!prior?.hmk?.combatState||!person.hmk?.combatState)continue;
  const old=prior.hmk.combatState,now=person.hmk.combatState;
  const oldIds=new Set((old.events??[]).map(e=>e.id));
  const events=(now.events??[]).filter(e=>!oldIds.has(e.id)&&kinds.has(e.type));
  const acquired=events.filter(e=>e.type==='injury-morale'?e.details?.result?.psycheStress>0:e.details?.psycheStress>0);
  if(!acquired.length)continue;
  must(acquired.length===1,'více nových traumat stejné postavy nelze uzavřít bez výběru každého Traitu');
  const event=acquired[0];
  const n=witnessedMorale(event,person.id,old);
  must(int(old.morale?.psycheStress,0,99999)&&now.morale?.psycheStress===old.morale.psycheStress+n,
   'globální změna PSY nesouhlasí s novým zdrojem');
  must((after.journal??[]).some(j=>j.characterId===person.id&&
   j.combatProof?.sourceEventId===event.id&&
   j.combatProof?.transition?.id===event.id),
   'chybí atomicky zapisovaný autoritativní Journal důkaz');
  const arc=person.hmk.arcane??(person.hmk.arcane={});
  must(!arc.pendingPsycheTraitChoice,
   'existuje jiná nevyřešená volba Traitu — nelze ji přepsat');
  must(!(arc.psycheTraumas??[]).some(t=>t.sourceEventIds?.includes(event.id)),
   'tatáž událost už byla použita jako trauma');
  arc.pendingPsycheTraitChoice={sourceEventId:event.id,levels:n};
  processed.push({characterId:person.id,sourceEventId:event.id,levels:n});
 }
 return processed;
}

/** Storage-bound invariant: a direct module or stale UI cannot commit new
 * Morale-derived PSY without its still-unresolved source-bound trait choice.
 * Existing spell/aural commitments are unaffected.
 */
export function assertCommittedMoralePsycheDebts(before,after){
 if(!before?.characters||!after?.characters||!Array.isArray(after.journal))return;
 for(const person of after.characters){
  const prior=before.characters.find(c=>c.id===person.id);
  const old=prior?.hmk?.combatState,now=person.hmk?.combatState;
  if(!old||!now)continue;
  const ids=new Set((old.events??[]).map(e=>e.id));
  const accrued=(now.events??[]).filter(e=>!ids.has(e.id)&&kinds.has(e.type)&&
   (e.type==='injury-morale'?e.details?.result?.psycheStress>0:e.details?.psycheStress>0));
  if(!accrued.length)continue;
  must(accrued.length===1,'současné zdroje vyžadují oddělené volby traumatu');
  const e=accrued[0],level=witnessedMorale(e,person.id,old);
  must(now.morale?.psycheStress===old.morale?.psycheStress+level,
   'nový PSY není věrnou kopií potvrzeného Morale');
  must(person.hmk?.arcane?.pendingPsycheTraitChoice?.sourceEventId===e.id&&
   person.hmk.arcane.pendingPsycheTraitChoice.levels===level,
   'chybí povinná persistentní volba Traitu');
  must(after.journal.some(j=>j.characterId===person.id&&
   j.combatProof?.sourceEventId===e.id&&j.combatProof?.transition?.id===e.id),
   'chybí původní GM důkaz v témže checkpointu');
 }
}

/** Internal integration adapter for existing non-UI combat engines that already
 * hold a genuine, resolved Morale event. Attach its cross-document journal
 * witness and the pending Trait to the SAME draft, before the sole CAS.
 * This is not a storage writer and does not resolve any Morale roll itself.
 */
/** Attach source-bound journal receipts for genuine Morale events to a staged
 * document, leaving the actual Trait debt to the caller's existing save gate.
 * Used by the guided attack transaction where save() invokes the central
 * linkNewMoralePsycheAccrual exactly once. Does not access any storage.
 */
export function journalNewMoralePsycheSources(before,after){
 if(!before?.characters||!after?.characters||!Array.isArray(after.journal))return [];
 for(const c of after.characters){
  const original=before.characters.find(x=>x.id===c.id),old=original?.hmk?.combatState;
  if(!old||!c.hmk?.combatState)continue;
  const oldIds=new Set((old.events??[]).map(e=>e.id));
  for(const e of c.hmk.combatState.events.filter(x=>!oldIds.has(x.id)&&kinds.has(x.type)&&
   (x.type==='injury-morale'?x.details?.result?.psycheStress>0:x.details?.psycheStress>0))){
   // The event and its physical d100 are both checked before manufacturing
   // any inter-record reference. Never guess missing rolls.
   witnessedMorale(e,c.id,old);
   must(!after.journal.some(j=>j.id==='morale-source:'+e.id),'duplicitní Morale journal ID');
   after.journal.push({id:'morale-source:'+e.id,characterId:c.id,
    createdAt:new Date().toISOString(),
    title:'HMK Morale → Psyche Stress',
    body:'Morale d100 vyvolal Psyche Stress. Výběr Traitu, nástup a Recovery jsou povinné.',
    combatProof:{sourceEventId:e.id,actionKind:e.type,transition:deep(e),
     physicalDice:deep(e.details?.physicalDice??{
      format:'hmk-manual-dice-proof-v1',source:'HMK p.162',
      rolls:[{faces:100,value:e.details?.roll,actorId:c.id,source:'GM-entered-physical-die'}]})}});
  }
 }
 return true;
}

/** Other trusted combat engines prepare their own one-step CAS snapshots.
 * For these engines the same helper attaches both journal and pending choice.
 */
export function stageTrustedMoralePsycheSources(before,after){
 journalNewMoralePsycheSources(before,after);
 return linkNewMoralePsycheAccrual(before,after);
}
