/** HMK: Roleplaying in the World of Kèthîra, printed p.161.
 * One-turn Grope: unsling a shield. Unlike lifting a DROPPED item, this
 * example has no special threatened-Melee requirement in the printed rule.
 * A physical fact that the shield really is slung must be confirmed, never
 * guessed from the generic inventory 'carried' slot. No dice are generated.
 * All returned values are drafts until one atomic application transaction.
 */
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn,dueEncounterEvents,confirmConcentrationCompletion as completeConcentration} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
const requireFact=(yes,message)=>{if(!yes)throw Error(message)};

/** HMK p.170: a Grievous arm/area injury renders its location unusable.
 * Never infer left/right arm from an unevidenced handedness.
 */
function requireUsableHand(state,hand,character){
 const grievous=(state.wounds||[]).filter(w=>w.healed!==true&&w.severity==='G');
 requireFact(!grievous.some(w=>String(w.location).trim().toLowerCase()==='area'),
  'Grope: Grievous Area injury prohibits use of the required arm');
 const armLoc=new Set(['sh','ua','el','fo','ha','shoulder','upper arm','elbow','forearm','hand']);
 const arms=grievous.filter(w=>armLoc.has(String(w.location).trim().toLowerCase()));
 if(!arms.length)return;
 const dominant=String(character?.hmk?.handedness??'').toLowerCase().trim();
 requireFact(['left','right','levá','pravá'].includes(dominant),
  'Grope: Grievous arm injury requires verified character handedness');
 const right=['right','pravá'].includes(dominant);
 const used=hand==='main_hand'?(right?'right':'left'):(right?'left':'right');
 requireFact(arms.every(w=>['left','right'].includes(w.side)),
  'Grope: grievous arm injury lacks an evidenced left/right side');
 requireFact(!arms.some(w=>w.side===used),
  'Grope: selected hand is unusable because of Grievous arm injury');
}

export function resolveGuidedShieldUnsling({id,sequence,states,inventory,actorId,itemId,hand,character=null,
 slungConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireFact(typeof id==='string'&&id.length>0&&id.length<=120&&typeof actorId==='string',
  'Grope: chybí stabilní ID akce a postavy');
 requireFact(s.active&&!s.interruptActiveId&&currentEncounterActor(s)===actorId,
  'Grope vyžaduje skutečný aktivní IR jednajícího účastníka');
 requireFact(Array.isArray(inventory)&&states?.[actorId], 'Grope: chybí úplný inventář nebo trvalý stav');
 validateCombatState(states[actorId]);
 requireFact(guidedTurnChoices(s,states).kind==='player-choice'&&
  guidedTurnChoices(s,states).choices.includes('grope'),
  'Grope nyní není legální: nejprve vyhodnoťte povinný následek nebo omezení tahu');
 // An end-of-next-turn STN Shock Reroll does not precede the Grope.
 // finishEncounterTurn() stages this one-turn action and requests the physical
 // Shock roll afterwards (HMK p.169). Only immediate mandatory events block.
 requireFact(!dueEncounterEvents(s,states).length,
  'Grope nelze uzavřít před splatným okamžitým bojovým následkem');
 requireFact(['main_hand','off_hand'].includes(hand)&&typeof itemId==='string'&&itemId,
  'Grope: zvolte konkrétní štít a skutečně volnou ruku');
 requireUsableHand(states[actorId],hand,character);
 requireFact(slungConfirmed===true,'GM musí potvrdit, že konkrétní štít je opravdu zavěšen a dosažitelný');
 const matches=inventory.filter(x=>x.id===itemId&&x.characterId===actorId);
 requireFact(matches.length===1&&matches[0].snapshot?.category==='shield'&&
  matches[0].slot==='carried'&&matches[0].quantity===1&&matches[0].destroyed!==true&&
  matches[0].gearStowage!=='backpack',
  'Grope: štít není samostatně nesený dostupný kus mimo batoh');
 requireFact(!inventory.some(x=>x.characterId===actorId&&x.slot===hand),
  'Grope: cílová ruka již drží jiný předmět');
 const nextInventory=structuredClone(inventory);
 nextInventory.find(x=>x.id===itemId&&x.characterId===actorId).slot=hand;
 const nextSequence=finishEncounterTurn(s,states,{action:'grope',gmConfirmed:true});
 const proof={sourceEventId:id,actionKind:'grope-unsling-shield',timelineId:s.timelineId,
  round:s.round,actorId,itemId,hand,slungConfirmed:true,
  source:'HMK World of Kèthîra p.161',physicalDice:[]};
 return {sequence:nextSequence,inventory:nextInventory,proof};
}

/** HMK pp.161,165: resheathing or reslinging an actually held weapon is
 * a one-turn Grope (not a free draw). The GM confirms the physical sheath.
 */
export function resolveGuidedWeaponStow({id,sequence,states,inventory,actorId,itemId,character=null,
 secureStowageConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireFact(typeof id==='string'&&id.length>0&&id.length<=120&&typeof actorId==='string',
  'Grope: chybí identita akce');
 requireFact(s.active&&!s.interruptActiveId&&currentEncounterActor(s)===actorId,
  'Grope se provádí na skutečném vlastním IR');
 requireFact(Array.isArray(inventory)&&states?.[actorId],'Grope: chybí inventář nebo stav');
 validateCombatState(states[actorId]);
 const choice=guidedTurnChoices(s,states);
 requireFact(choice.kind==='player-choice'&&choice.choices.includes('grope'),
  'Nyní nelze stow Grope provést: nejprve dokončete povinné následky');
 requireFact(secureStowageConfirmed===true,
  'GM musí doložit skutečnou pochvu nebo bezpečné zavěšení konkrétní zbraně');
 const items=inventory.filter(i=>i.id===itemId&&i.characterId===actorId);
 requireFact(items.length===1&&items[0].snapshot?.category==='weapon'&&
  ['main_hand','off_hand'].includes(items[0].slot)&&items[0].quantity===1&&
  items[0].destroyed!==true,'Zbraň není jednoznačně držena ve vlastní ruce');
 requireUsableHand(states[actorId],items[0].slot,character);
 const nextInventory=structuredClone(inventory);
 nextInventory.find(i=>i.id===itemId&&i.characterId===actorId).slot='carried';
 const nextSequence=finishEncounterTurn(s,states,{action:'grope',gmConfirmed:true});
 const proof={sourceEventId:id,actionKind:'grope-stow-weapon',timelineId:s.timelineId,
  round:s.round,actorId,itemId,originHand:items[0].slot,secureStowageConfirmed:true,
  source:'HMK World of Kèthîra pp.161,165',physicalDice:[]};
 return {sequence:nextSequence,inventory:nextInventory,proof};
}

/** HMK pp.160–161: searching an actual backpack is a one-round Grope.
 * The item is only moved when concentration has lasted the whole round;
 * no early inventory change, no invented search success or random rolls.
 * A special case needing a skill test must use its own guide instead.
 */
export function startGuidedBackpackGrope({id,sequence,states,inventory,actorId,itemId,hand,character=null,
 ordinarySearchConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireFact(typeof id==='string'&&id.length>0&&id.length<=120&&typeof actorId==='string',
  'Backpack Grope: chybí jednoznačné ID');
 requireFact(s.active&&!s.interruptActiveId&&currentEncounterActor(s)===actorId,
  'Backpack Grope vyžaduje vlastní probíhající IR');
 requireFact(Array.isArray(inventory)&&states?.[actorId],'Backpack Grope: chybí inventář nebo trvalý stav');
 validateCombatState(states[actorId]);
 const choice=guidedTurnChoices(s,states);
 requireFact(choice.kind==='player-choice'&&choice.choices.includes('concentrate-start'),
  'Backpack Grope není povoleno: povinný následek, omezení nebo soustředění');
 requireFact(ordinarySearchConfirmed===true,
  'GM musí potvrdit běžné vyhledání známého předmětu bez mimořádného testu');
 requireFact(['main_hand','off_hand'].includes(hand)&&typeof itemId==='string'&&itemId,
  'Zvolte konkrétní předmět a volnou ruku');
 const found=inventory.filter(i=>i.id===itemId&&i.characterId===actorId);
 requireFact(found.length===1&&found[0].slot==='carried'&&found[0].gearStowage==='backpack'&&
  found[0].quantity===1&&found[0].destroyed!==true,
  'Předmět není jednoznačně doložen jako jeden kus v batohu této postavy');
 requireFact(found[0].snapshot?.category!=='armor',
  'Nasazování zbroje nemá automaticky čas jedné akce Grope');
 requireFact(!inventory.some(i=>i.characterId===actorId&&i.slot===hand),
  'Pro předmět vyjmutý z batohu není volná zvolená ruka');
 requireUsableHand(states[actorId],hand,character);
 const next=finishEncounterTurn(s,states,{action:'concentrate-start',durationRounds:1,gmConfirmed:true});
 requireFact(next.commitments?.[actorId]?.status==='in-progress','Backpack Grope nezačalo koncentraci');
 next.commitments[actorId].task={kind:'grope-backpack',id,itemId,hand,
  itemWitness:JSON.stringify(found[0]),ordinarySearchConfirmed:true};
 const proof={sourceEventId:id,actionKind:'grope-backpack-start',timelineId:s.timelineId,
  round:s.round,actorId,itemId,hand,completionRound:s.round+1,
  source:'HMK World of Kèthîra pp.160–161',physicalDice:[]};
 return {sequence:validateEncounterSequence(next),proof};
}

export function completeGuidedBackpackGrope({id,sequence,states,inventory,actorId,
 uninterruptedConfirmed=false,character=null}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId],task=c?.task;
 requireFact(typeof id==='string'&&id.length>0&&id.length<=120&&
  task?.kind==='grope-backpack'&&c?.status==='in-progress',
  'Neexistuje nedokončené Backpack Grope');
 requireFact(c.durationRounds===1&&c.completionRound===c.startRound+1,
  'Backpack Grope musí trvat přesně jedno celé kolo');
 requireFact(Array.isArray(inventory)&&states?.[actorId],
  'Backpack Grope: chybí aktuální inventář nebo bojový stav');
 validateCombatState(states[actorId]);
 const items=inventory.filter(i=>i.id===task.itemId&&i.characterId===actorId);
 requireFact(items.length===1&&JSON.stringify(items[0])===task.itemWitness&&
  items[0].slot==='carried'&&items[0].gearStowage==='backpack',
  'Backpack Grope: předmět se změnil během vícekolové činnosti');
 requireFact(!inventory.some(i=>i.characterId===actorId&&i.slot===task.hand),
  'Backpack Grope: cílová ruka byla obsazena během koncentrace');
 requireUsableHand(states[actorId],task.hand,character);
 requireFact(uninterruptedConfirmed===true,
  'GM musí potvrdit, že během hledání nedošlo k přerušení koncentrace');
 const completed=completeConcentration(s,states,{actorId,gmConfirmed:true});
 const nextInventory=structuredClone(inventory);
 nextInventory.find(i=>i.id===task.itemId&&i.characterId===actorId).slot=task.hand;
 nextInventory.find(i=>i.id===task.itemId&&i.characterId===actorId).gearStowage='normal';
 completed.log.push({round:completed.round,type:'grope-backpack-complete',actorId,itemId:task.itemId,eventId:id});
 const proof={sourceEventId:id,originalEventId:task.id,actionKind:'grope-backpack-complete',
  timelineId:s.timelineId,round:s.round,startedRound:c.startRound,actorId,
  itemId:task.itemId,hand:task.hand,uninterruptedConfirmed:true,
  source:'HMK World of Kèthîra pp.160–161,182',physicalDice:[]};
 return {sequence:validateEncounterSequence(completed),inventory:nextInventory,proof};
}
