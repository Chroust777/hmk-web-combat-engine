/**
 * HMK World of Kèthîra pp.161,165–166: mandatory Melee CF consequences.
 * An injury (if any) must be resolved BEFORE entering this stage.
 * All state and inventory modifications are staged and returned for ONE atomic
 * caller commit. No gameplay dice are rolled by the program.
 */
import {verifiedCombatMishap,applyGuidedCombatMishap} from './hmk-guided-combat-mishap.js';
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {validateCombatState} from './persistent-combat-state.js';
const assert=(x,message)=>{if(!x)throw Error(message)};
const clone=structuredClone;
const validArms=x=>['left','right','both'].includes(x);
/** Restore an unfinished v93.123-era one-Mishap session without changing its
 * original result. New dual automatic Mishaps carry explicit kind/index.
 */
function pendingItem(s){
 const raw=s.pending?.[0];
 if(typeof raw==='string')return {actorId:raw,
  kind:raw===s.attackerId?s.gate.attackerMishap:s.gate.defenderMishap,
  forced:false,index:0};
 return raw??null;
}

export function createGuidedMeleeMishapFollowup({id,round,timelineId,gate,attackerId,defenderId,
 actors,states,inventory,weaponItemIds,usedArms,origin='melee'}={}){
 assert(typeof id==='string'&&id&&Number.isSafeInteger(round)&&round>0&&typeof timelineId==='string'&&timelineId,
  'Chybí důkaz původního Melee');
 assert(['melee','missile'].includes(origin),'Neznámý původ Mishap');
 assert(gate?.ok&&typeof attackerId==='string'&&typeof defenderId==='string'&&attackerId!==defenderId,
  'Melee test není potvrzen');
 assert(actors?.[attackerId]?.id===attackerId&&actors?.[defenderId]?.id===defenderId,
  'Chybí skutečné postavy obou účastníků');
 assert(Array.isArray(inventory)&&weaponItemIds&&usedArms,
  'Chybí původní zbraň nebo doložené použité paže pro Mishap');
 for(const participantId of [attackerId,defenderId])validateCombatState(states?.[participantId]);
 const forced=gate.attackerForcedMishaps;
 assert(forced==null||origin==='missile'&&Array.isArray(forced)&&forced.length>=1&&forced.length<=2&&
  new Set(forced).size===forced.length&&forced.every(k=>['fumble','stumble'].includes(k)),
  'Automatické Missile Mishaps musí mít přesné druhy podle Grievous zóny');
 const pending=forced?.length?forced.map((kind,index)=>({actorId:attackerId,kind,forced:true,index})):
  [gate.attackerMishap?{actorId:attackerId,kind:gate.attackerMishap,forced:false,index:0}:null,
   gate.defenderMishap?{actorId:defenderId,kind:gate.defenderMishap,forced:false,index:0}:null].filter(Boolean);
 assert(pending.every(x=>validArms(usedArms[x.actorId])),'Povinný Mishap vyžaduje doložené použité paže');
 return {origin,format:'hmk-guided-melee-mishap-followup-v1',id,round,timelineId,
  attackerId,defenderId,gate:clone(gate),actors:clone(actors),states:clone(states),
  inventory:clone(inventory),weaponItemIds:clone(weaponItemIds),usedArms:clone(usedArms),
  pending,technique:null,proofs:[],physicalDice:[]};
}
function profile(s,id){
 const item=pendingItem(s);
 assert(item&&item.actorId===id,'Neplatný pořadník Mishap');
 const used=s.usedArms[id],arms=used==='both'?['left','right']:[used];
 const result=verifiedCombatMishap({kind:item.kind,actor:s.actors[id],state:s.states[id],round:s.round,timelineId:s.timelineId,
  usesDEX:id===s.attackerId||['block','counterstrike'].includes(s.gate.defence),
  usedArms:arms,technique:s.technique??'attribute'});
 if(item.forced)assert(result.forcedCF,'Grievous Missile Mishap vyžaduje automatické selhání ze zraněné zóny');
 return result;
}
export function guidedMeleeMishapFollowupRequirement(s){
 assert(s?.format==='hmk-guided-melee-mishap-followup-v1','Neplatná návaznost Melee Mishap');
 const item=pendingItem(s),id=item?.actorId;
 if(!item)return {kind:'complete',id:'melee-mishaps-done'};
 if(s.states[id].shock==='KIA')return {kind:'automatic',id:'skip-dead-melee-mishap',actorId:id};
 const p=profile(s,id);
 if(s.technique===null&&!p.forcedCF&&p.alternative)return {kind:'choice',id:'melee-mishap-technique',actorId:id,
  choices:[{value:'attribute',label:'Mishap atributem DEX/AGL'},
   {value:p.alternative,label:`Mishap naučenou dovedností ${p.alternative}`}]};
 if(p.forcedCF)return {kind:'automatic',id:'melee-mishap-forced-cf',actorId:id};
 return {kind:'die',id:'melee-mishap-d100',faces:100,actorId:id,
  label:`${s.origin==='melee'?'Melee':'Missile'} CF → ${p.type} (${p.skill}) – skutečný d100 (HMK p.161)`};
}
export function chooseGuidedMeleeMishapTechnique(s,value){
 const r=guidedMeleeMishapFollowupRequirement(s);
 assert(r.kind==='choice'&&r.choices.some(c=>c.value===value),'Nepovolená volba pro Mishap');
 return {...s,technique:value};
}
function applyMishap(s,roll){
 const item=pendingItem(s),actorId=item.actorId,p=profile(s,actorId);
 const out=applyGuidedCombatMishap({state:s.states[actorId],round:s.round,
  eventId:`${s.id}:${s.origin}-mishap:${actorId}:${item.index}`,actorId,profile:p,roll,origin:s.origin});
 const inventory=clone(s.inventory);
 if(out.result.effect==='drop-item'){
  const item=inventory.find(x=>x.id===s.weaponItemIds[actorId]&&x.characterId===actorId);
  assert(item&&['main_hand','off_hand'].includes(item.slot),'Původní zbraň pro CF Fumble už není v ruce');
  item.slot='none';
  out.state.events.at(-1).details.droppedItemId=item.id;
 }
 const dice=roll===null?[]:[{id:`${s.origin}-mishap-d100:${actorId}`,faces:100,value:roll,
  actorId,source:'GM-entered-physical-die'}];
 return {...s,states:{...s.states,[actorId]:out.state},inventory,
  pending:s.pending.slice(1),technique:null,
  proofs:[...s.proofs,{actorId,kind:p.type,forced:item.forced,result:out.result,eventId:`${s.id}:${s.origin}-mishap:${actorId}:${item.index}`,
   physicalDice:dice}],physicalDice:[...s.physicalDice,...dice]};
}
export function submitGuidedMeleeMishapDie(s,value){
 const r=guidedMeleeMishapFollowupRequirement(s);
 assert(r.kind==='die','Není splatný fyzický hod Mishap');
 return applyMishap(s,readPhysicalDieValue(value,100));
}
export function advanceGuidedMeleeMishapFollowup(s){
 const r=guidedMeleeMishapFollowupRequirement(s);
 if(r.kind==='automatic'&&r.id==='skip-dead-melee-mishap'){
  return {...s,pending:s.pending.slice(1),technique:null,
   proofs:[...s.proofs,{actorId:r.actorId,skipped:'killed-before-mishap',physicalDice:[]}]};
 }
 if(r.kind==='automatic'&&r.id==='melee-mishap-forced-cf')return applyMishap(s,null);
 return s;
}
export function completeGuidedMeleeMishapFollowup(s){
 assert(guidedMeleeMishapFollowupRequirement(s).kind==='complete','Nevyřízený povinný Melee Mishap');
 return {states:clone(s.states),inventory:clone(s.inventory),proofs:clone(s.proofs),physicalDice:clone(s.physicalDice)};
}
