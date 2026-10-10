/**
 * HMK: Roleplaying in the World of Kèthîra, printed pp.61,165,191.
 * Resolve Weapon Damage from a VERIFIED tied-success Block, without a GM
 * checkbox or an invented die. A Block wards the blow regardless of the
 * weapon-damage tiebreak winner. The higher d100, then EML, then physical
 * d10 tiebreak determines WHICH readied weapon rolls impact.
 *
 * Immutable until finalize: no mutation of the live inventory, no dice RNG.
 */
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {applyConfirmedWeaponWQ} from './hmk-combat-aftereffects.js';
const check=(p,m)=>{if(!p)throw Error(m)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const clone=structuredClone;
const stamp=x=>JSON.stringify(x);
const actual=(a,id)=>a?.find(x=>x.id===id);

export function createGuidedBlockWeaponDamage({id,timelineId,round,attackerId,defenderId,
 gate,attackerRoll,defenderRoll,attackerEML,defenderEML,
 inventory,attackerItemId,defenderItemId,sourceSignature,weaponByActor}={}){
 check(typeof id==='string'&&id&&typeof timelineId==='string'&&timelineId&&
  typeof sourceSignature==='string'&&sourceSignature,'Chybí identita potvrzeného Melee testu');
 check(integer(round,1,9999)&&attackerId&&defenderId&&attackerId!==defenderId,'Neplatní účastníci');
 check(gate?.ok===true&&gate.defence==='block'&&gate.weaponDamageCheck===true&&
  gate.tiedSuccess===true&&gate.attackerSL===gate.defenderSL&&gate.attackerSL>=2,
  'Weapon Damage p191 vyžaduje přesně doložené shodné úspěchy Block');
 check(integer(attackerRoll,1,100)&&integer(defenderRoll,1,100)&&
  integer(attackerEML,0,100)&&integer(defenderEML,0,100),
  'Chybí skutečné d100 a vypočtené EML původního Melee');
 check(Array.isArray(inventory)&&attackerItemId&&defenderItemId,'Chybí skutečné vybavení');
 check(weaponByActor&&[attackerId,defenderId].every(id=>integer(weaponByActor[id]?.impactDie,2,100)&&Number.isSafeInteger(weaponByActor[id]?.modifier)),
  'Chybí ověřený plný Strike Impact z původního bojového výpočtu');
 for(const [itemId,characterId] of [[attackerItemId,attackerId],[defenderItemId,defenderId]]){
  const item=actual(inventory,itemId);
  check(item&&item.characterId===characterId&&['main_hand','off_hand'].includes(item.slot)&&
   ['weapon','shield'].includes(item.snapshot?.category)&&integer(item.currentWQ,1,100),
   `Weapon Damage: předmět ${itemId} není skutečně připravený s ověřenou WQ`);
 }
 let winner=null;
 if(attackerRoll!==defenderRoll)winner=attackerRoll>defenderRoll?'attacker':'defender';
 else if(attackerEML!==defenderEML)winner=attackerEML>defenderEML?'attacker':'defender';
 return {format:'hmk-guided-block-weapon-damage-v1',id,timelineId,round,attackerId,defenderId,
  gate:clone(gate),attackerRoll,defenderRoll,attackerEML,defenderEML,
  inventory:clone(inventory),inventoryWitness:stamp(inventory),attackerItemId,defenderItemId,
  sourceSignature,weaponByActor:clone(weaponByActor),winner,phase:winner?'impact':'tiebreak',tiebreakRolls:[],impactRoll:null,
  impactSource:null,proof:[],result:null};
}
const winnerInfo=s=>{
 const own=s.winner==='attacker';
 const sourceId=own?s.attackerItemId:s.defenderItemId;
 const victimId=own?s.defenderItemId:s.attackerItemId;
 const source=actual(s.inventory,sourceId),target=actual(s.inventory,victimId);
 const mode=source?.snapshot?.properties?.verifiedModes;
 check(Array.isArray(mode)&&mode.length===1&&/^d(?:4|6|8|10|12|20)$/.test(String(mode[0].impactDie))&&
  integer(mode[0].impactModifier,-50,50),'Vítězná zbraň nemá ověřený Strike Mode a Impact kostku');
 check(target&&integer(target.currentWQ,1,100),'Cílová zbraň nemá ověřenou WQ');
 return {source,target,mode:mode[0],sides:Number(mode[0].impactDie.slice(1))};
};
export function guidedBlockWeaponDamageRequirement(s){
 check(s?.format==='hmk-guided-block-weapon-damage-v1','Neplatná návaznost Weapon Damage');
 if(s.phase==='tiebreak')return {kind:'die',id:s.tiebreakRolls.length?'defenderWeaponTiebreak':'attackerWeaponTiebreak',
  faces:10,label:'Weapon Damage: rozhodovací d10 (HMK p191)',actorId:s.tiebreakRolls.length?s.defenderId:s.attackerId};
 if(s.phase==='impact'){
  const info=winnerInfo(s);
  return {kind:'die',id:'weaponDamageImpact',faces:info.sides,
   label:`Weapon Damage: Impact d${info.sides}, ${info.source.snapshot.name}`,actorId:info.source.characterId};
 }
 return {kind:'complete',result:s.result};
}
export function submitGuidedBlockWeaponDamageDie(s,value){
 const req=guidedBlockWeaponDamageRequirement(s);
 check(req.kind==='die','Žádná další kostka není vyžádána');
 const n=readPhysicalDieValue(value,req.faces);
 const proof={id:req.id,faces:req.faces,value:n,label:req.label,source:'GM-entered-physical-die'};
 const out={...s,proof:[...s.proof,proof]};
 if(s.phase==='tiebreak'){
  const rolls=[...s.tiebreakRolls,n];
  if(rolls.length===2){
   if(rolls[0]===rolls[1])return {...out,tiebreakRolls:[],phase:'tiebreak'};
   return {...out,tiebreakRolls:rolls,phase:'impact',winner:rolls[0]>rolls[1]?'attacker':'defender'};
  }
  return {...out,tiebreakRolls:rolls};
 }
 return {...out,phase:'ready',impactRoll:n};
}
export function completeGuidedBlockWeaponDamage({session,currentInventory,sourceSignature}={}){
 const s=session;
 check(s?.format==='hmk-guided-block-weapon-damage-v1'&&s.phase==='ready',
  'Weapon Damage nemá doložený skutečný hod Impact');
 check(stamp(currentInventory)===s.inventoryWitness&&sourceSignature===s.sourceSignature,
  'Inventář nebo kontext původního Melee se změnily');
 const {source,target,mode}=winnerInfo(s);
 // Printed weapon strike impact includes its certified modifier; +5 for a
 // shield, -5 for a thrust, +5 for winning a CS tiebreak (HMK p191).
 const verifiedMode=s.weaponByActor[source.characterId];
 check(verifiedMode.impactDie===Number(mode.impactDie.slice(1)),'Původní Impact Die nesouhlasí se zdrojovou zbraní');
 const strikeImpact=s.impactRoll+verifiedMode.modifier;
 const result=applyConfirmedWeaponWQ({inventory:s.inventory,targetInventoryId:target.id,
  strikeImpact,csTiebreak:s.gate.attackerSL===3,targetIsShield:target.snapshot.category==='shield',
  thrust:mode.thrust===true,sourceNatural:mode.natural===true,
  targetArmed:target.snapshot.category==='weapon',gmConfirmed:true});
 return {kind:'weapon-damage',result,inventory:result.inventory,ownerId:source.characterId,
  targetId:target.characterId,sourceItemId:source.id,targetItemId:target.id,
  physicalDice:[...s.proof],round:s.round,timelineId:s.timelineId,sourceSignature:s.sourceSignature,
  source:'HMK World of Kèthîra pp.61,165,191'};
}
