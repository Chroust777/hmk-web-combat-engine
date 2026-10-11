/** HMK World of Kèthîra p.161: a readied 1-turn action is actually resolved
 * during an interruption, rather than being dismissed by GM confirmation.
 * Pure transitions: caller atomically persists sequence, inventory and proof.
 * Threatened Grope is staged through the same physical-dice Mishap Recovery chain.
 */
import {validateEncounterSequence,completeReadiedEncounterAction} from './encounter-turn-sequence.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
import {validateCombatState} from './persistent-combat-state.js';
import {createGuidedMishapRecovery,chooseGuidedRecoveryHand} from './hmk-guided-mishap-recovery.js';
const requireFact=(v,m)=>{if(!v)throw Error(m)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const safeId=x=>typeof x==='string'&&x.length>0&&x.length<=120;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function base({id,sequence,states,battlefield,actorId,kind}){
 const s=validateEncounterSequence(structuredClone(sequence)),ready=s.readied[actorId];
 requireFact(safeId(id)&&safeId(actorId)&&ready?.kind===kind&&ready.triggered===true&&
  ready.resolved===false&&s.interruptActiveId===actorId&&s.round===ready.fromRound,
  'Připravovaná akce neodpovídá právě otevřenému přerušení');
 requireFact(!ready.resolution,'Připravená akce již má vyhodnocený výsledek');
 const st=states?.[actorId];validateCombatState(st);
 requireFact(!['INC','UNC','KIA'].includes(st.shock)&&!st.coma?.active&&st.morale?.state!=='catatonic'&&
  !st.posture?.passNextTurn,'Postava při přerušení nemůže tuto akci vykonat');
 requireFact(battlefield?.units?.length===s.order.length&&s.order.every(a=>battlefield.units.filter(u=>u.id===a).length===1),
  'Přerušení vyžaduje kompletní skutečnou mapu účastníků');
 const saved=s.spatialUnits;
 if(saved!=null&&(!Array.isArray(saved)||saved.length!==0))requireFact(Array.isArray(saved)&&saved.length===s.order.length&&s.order.every(a=>{
  const u=saved.find(x=>x.id===a),v=battlefield.units.find(x=>x.id===a);
  return u&&v&&finite(u.x)&&finite(u.y)&&finite(v.x)&&finite(v.y)&&dist(u,v)<1e-7;
 }), 'Mapa není doložená v trvalé Initiative nebo byly změněny pozice');
 else requireFact(saved==null||Array.isArray(saved)&&saved.length===0,'Neplatná uložená mapa');
 if(!saved?.length)s.spatialUnits=battlefield.units.map(u=>({id:u.id,x:u.x,y:u.y}));
 return {s,st};
}
function finish(s,{id,actorId,kind,proof}){
 s.readied[actorId].resolution={kind,actorId,eventId:id,timelineId:s.timelineId,round:s.round};
 const completed=completeReadiedEncounterAction(s,{gmConfirmed:true});
 completed.log.push({round:s.round,type:'readied-guided-resolution',actorId,kind,eventId:id});
 return {sequence:completed,proof};
}
export function resolveGuidedReadiedMove({id,sequence,states,battlefield,actorId,path,
 effectiveMove,difficultSources=0}={}){
 const {s,st}=base({id,sequence,states,battlefield,actorId,kind:'move'});
 requireFact(!st.posture?.prone,'Postava vleže musí nejprve vyřešit vstávání jako zvláštní Move');
 requireFact(Number.isSafeInteger(effectiveMove)&&effectiveMove>=0&&effectiveMove<=100000,
  'Chybí skutečný Effective Move z atributů, ENC, Fatigue a zranění');
 const projection=projectGuidedSpatialPath({actorId,battlefield,path,action:'move',moveRate:'half',
  effectiveMove,stunned:st.shock==='STN',difficultSources});
 requireFact(!projection.requiresStumble,'Readied half Move nesmí vyžadovat Double Move Stumble');
 const proof={sourceEventId:id,actionKind:'readied-move',kind:'move',timelineId:s.timelineId,
  round:s.round,actorId,interruptIR:s.readied[actorId].interruptIR,
  projection:structuredClone(projection),physicalDice:[]};
 s.spatialUnits=s.spatialUnits.map(u=>u.id===actorId?{...u,x:projection.finalPosition.x,y:projection.finalPosition.y}:u);
 s.spatialEvents??=[];
 requireFact(!s.spatialEvents.some(e=>e.id===id),'Duplicitní prostorová událost');
 s.spatialEvents.push({id,actorId,round:s.round,readied:true,projection:structuredClone(projection)});
 return {...finish(s,{id,actorId,kind:'move',proof}),inventory:null};
}
export function resolveGuidedReadiedGropePickup({id,sequence,states,battlefield,actorId,
 inventory,itemId,hand,droppedItemPosition}={}){
 const {s,st}=base({id,sequence,states,battlefield,actorId,kind:'grope'});
 requireFact(Array.isArray(inventory)&&safeId(itemId)&&['main_hand','off_hand'].includes(hand),
  'Grope vyžaduje jediný konkrétní předmět a doloženou volnou ruku');
 requireFact(st.posture?.dropPending===true,'Není evidováno upuštění předmětu po Mishap');
 const drops=[...new Set((st.events||[]).map(e=>e.details?.droppedItemId).filter(Boolean))];
 const item=inventory.find(i=>i.id===itemId&&i.characterId===actorId&&i.slot==='none'&&!i.destroyed);
 requireFact(item&&drops.includes(itemId)&&inventory.filter(i=>i.characterId===actorId&&
  drops.includes(i.id)&&i.slot==='none'&&!i.destroyed).length===1,
  'Z historie Mishap nelze jednoznačně doložit zvedaný předmět');
 requireFact(!inventory.some(i=>i.characterId===actorId&&i.slot===hand),'Vybraná ruka je již obsazena');
 const actor=battlefield.units.find(u=>u.id===actorId);
 requireFact(droppedItemPosition&&finite(droppedItemPosition.x)&&finite(droppedItemPosition.y)&&
  dist(actor,droppedItemPosition)<=5+1e-7,'Předmět není doložen na dosah (nejvýše 5 stop)');
 requireFact(!battlefield.units.some(u=>u.id!==actorId&&u.foe&&u.threatens&&u.aware&&
  !u.helpless&&!u.concentrating&&!u.reachImpeded&&finite(u.reachFt)&&
  dist(actor,u)<=Math.max(5,u.reachFt)+1e-7),
  'Readied Grope v ohrožení vyžaduje fyzický Melee d100 a případný Fumble/Stumble; nelze ho bez tohoto průvodce potvrdit');
 const changed=structuredClone(inventory);changed.find(i=>i.id===itemId).slot=hand;
 const statesNext=structuredClone(states);statesNext[actorId].posture.dropPending=false;
 const proof={sourceEventId:id,actionKind:'readied-grope-pickup',kind:'grope',timelineId:s.timelineId,
  round:s.round,actorId,interruptIR:s.readied[actorId].interruptIR,
  itemId,hand,droppedItemPosition:structuredClone(droppedItemPosition),threatened:false,physicalDice:[]};
 statesNext[actorId].events.push({id,type:'mishap-recovery',round:s.round,details:structuredClone(proof)});
 statesNext[actorId].lastRound=Math.max(statesNext[actorId].lastRound,s.round);
 validateCombatState(statesNext[actorId]);
 s.readiedGropeEvents??=[];
 requireFact(!s.readiedGropeEvents.some(e=>e.id===id),'Duplicitní Grope');
 s.readiedGropeEvents.push({id,actorId,round:s.round,itemId,hand});
 return {...finish(s,{id,actorId,kind:'grope',proof}),inventory:changed,states:statesNext};
}

/** Start a physical-dice-only Readied Grope. No persistent state is changed
 * before completeGuidedMishapRecovery commits the whole interrupt.
 * The hand/target are actual player choices made at the initial form.
 */
export function createGuidedReadiedGropeSession({id,sequence,states,battlefield,actorId,
 character,inventory,itemId,hand,droppedItemPosition}={}){
 const {st}=base({id,sequence,states,battlefield,actorId,kind:'grope'});
 requireFact(character?.id===actorId,'Chybí skutečná postava připraveného Grope');
 requireFact(Array.isArray(inventory)&&safeId(itemId)&&['main_hand','off_hand'].includes(hand),
  'Readied Grope vyžaduje doložený předmět a volnou ruku');
 const available=inventory.filter(i=>i.characterId===actorId&&i.slot==='none'&&!i.destroyed&&
  (st.events||[]).some(e=>e.details?.droppedItemId===i.id));
 requireFact(available.length===1&&available[0].id===itemId,
  'Readied Grope může zvednout jen jediný konkrétně doložený upuštěný předmět');
 const session=createGuidedMishapRecovery({id,sequence,states,character,inventory,kind:'retrieve',
  battlefield,droppedItemPosition,readied:true});
 requireFact(session.targetItemId===itemId,'Zvedaný předmět se změnil');
 requireFact(session.choices.includes(hand),'Zadaná ruka není skutečně volná');
 return chooseGuidedRecoveryHand(session,hand,{character,state:st,inventory});
}
