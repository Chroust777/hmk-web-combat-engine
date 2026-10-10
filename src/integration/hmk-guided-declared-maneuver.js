/**
 * HMK World of Kèthîra pp.106,165–166,171–172.
 * One declared Press/Trip/Grab -> opposed Melee -> one d6+STR contest ->
 * compulsory aftermath -> persistent outcome. Physical dice ONLY.
 * Requires a complete, live-calculated Melee session; no GM victory checkbox.
 * This is an atomic proposal, not an immediate write to the character.
 */
import {guidedMeleeRequirement,chooseGuidedMeleeDefence,submitGuidedMeleeDie,guidedMeleeResult} from './hmk-guided-melee-sequence.js';
import {decideDeclaredManeuver,applyAutomaticDeclaredManeuver,resolveTripAutomaticGrab,applyAutomaticGrabTake} from './hmk-automatic-decisions.js';
import {applyConfirmedManeuverConsequence,verifiedManeuverConsequence} from './hmk-maneuver-persistence.js';
import {successLevel} from '../rules/tests.js';
import {createGuidedFullHit,guidedFullHitRequirement,chooseGuidedFullHit,submitGuidedFullHitDie,advanceGuidedFullHit,finalizeGuidedFullHit} from './hmk-guided-full-hit.js';
import {createGuidedBlockWeaponDamage,guidedBlockWeaponDamageRequirement,submitGuidedBlockWeaponDamageDie,completeGuidedBlockWeaponDamage} from './hmk-guided-block-weapon-damage.js';
import {guidedMandatoryEvents,createGuidedMandatory,guidedMandatoryRequirement,submitGuidedMandatoryDie,commitGuidedMandatory} from './hmk-guided-mandatory.js';
import {verifiedCombatMishap,applyGuidedCombatMishap} from './hmk-guided-combat-mishap.js';
import {validateCombatState} from './persistent-combat-state.js';
import {heldSlotInGrabZone} from '../rules/melee.js';
const req=(condition,message)=>{if(!condition)throw Error(message)};
const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const physical=(raw,faces)=>{req(/^\d+$/.test(String(raw)),`Zadejte skutečný celý hod d${faces}`);const n=Number(raw);req(integer(n,1,faces),`Hod d${faces} musí být 1–${faces}`);return n;};
const copy=structuredClone;
const zoneOf=(zd,aimZN)=>{
 const zn=aimZN+zd-1;
 if(zn===1)return 'head';if(zn===2)return 'right-arm';if(zn===3)return 'left-arm';
 if(zn>=4&&zn<=7)return 'torso';if(zn>=8&&zn<=10)return 'legs';
 return null;
};
export function createGuidedDeclaredManeuver({id,sourceSession,technique,attacker,defender,inventory,
 targetState,sourceSignature,aimZN=1,attackerUsedArms=null,defenderUsedArms=null}={}){
 req(['press','trip','grab'].includes(technique),'Je nutná deklarace Press, Trip nebo Grab před Melee');
 req(sourceSession?.kind==='melee'&&sourceSession.meleeSession?.phase==='choose-defence',
  'Chybí předem ověřená živá Melee posloupnost');
 req(attacker?.id===sourceSession.attackerId&&defender?.id===sourceSession.defenderId&&attacker.id!==defender.id,
  'Neplatní účastníci');
 req(sourceSignature===sourceSession.sourceSignature,'Nesouhlasí podpis aktuálních postav a výbavy');
 req(targetState&&Array.isArray(targetState.events)&&Array.isArray(inventory),'Chybí trvalý stav cíle nebo inventář');
 const ownerSTR=attacker.hmk?.attributes?.str,targetSTR=defender.hmk?.attributes?.str;
 req(integer(ownerSTR,1,40)&&integer(targetSTR,1,40),'Chybí přesná Strength obou postav');
 req(technique!=='grab'||aimZN===1,'Jiné zamíření Grab vyžaduje zohlednění Aim Penalty již při Melee; tento průvodce ho nemá');
 return {format:'hmk-guided-declared-v1',id,technique,attackerId:attacker.id,defenderId:defender.id,
  round:sourceSession.round,timelineId:sourceSession.timelineId,sourceSignature,aimZN,
  meleeSession:copy(sourceSession.meleeSession),attacker:copy(attacker),defender:copy(defender),
  inventory:copy(inventory),originalInventory:copy(inventory),originalState:copy(targetState),targetState:copy(targetState),
  attackContext:copy({weaponByActor:sourceSession.weaponByActor,weaponItemIds:sourceSession.weaponItemIds,participants:sourceSession.participants,
   direction:sourceSession.direction,opponents:sourceSession.opponents}),
  originalStates:copy({[attacker.id]:sourceSession.participants[attacker.id].state,[defender.id]:targetState}),
  states:copy({[attacker.id]:sourceSession.participants[attacker.id].state,[defender.id]:targetState}),
  usedArms:{[attacker.id]:attackerUsedArms,[defender.id]:defenderUsedArms},
  counterHit:null,counterHitProof:null,weaponDamageSession:null,weaponDamageProof:null,
  injuryAftermath:null,injuryMode:null,counterAbe:null,counterDirection:null,counterOpponents:null,injuryAlternative:null,mishapPending:[],mishapMode:null,mishapProofs:[],counterImpactTA:0,counterPrecisionTA:0,
  ownerSTR,targetSTR,phase:'melee',gate:null,decision:null,impactTA:null,grabAction:'hold',grabZone:null,
  ownerD6:null,targetD6:null,physicalDice:[],consequence:null,margin:null,displacement:null,finished:false};
}
export function guidedDeclaredRequirement(s){
 req(s?.format==='hmk-guided-declared-v1','Neplatný průběh HMK manévru');
 if(s.phase==='melee')return guidedMeleeRequirement(s.meleeSession);
 if(s.phase==='weapon-damage')return guidedBlockWeaponDamageRequirement(s.weaponDamageSession);
 if(s.phase==='counter-direction')return {kind:'choice',id:'counterstrike-direction',actorId:s.defenderId,
  choices:[{value:'front',label:'Zepředu – skutečný směr Counterstrike'},{value:'side',label:'Z boku – skutečný směr Counterstrike'},
   {value:'rear',label:'Zezadu – skutečný směr Counterstrike'}]};
 if(s.phase==='counter-opponents')return {kind:'input',id:'counter-opponents',min:1,max:100,
  label:'Skutečný počet protivníků původního útočníka pro Counterstrike',actorId:s.attackerId};
 if(s.phase==='counter-ta'){
  const n=s.gate.extraTA;return {kind:'choice',id:'counterstrike-ta',choices:Array.from({length:n+1},(_,impact)=>
   Array.from({length:n-impact+1},(_,precision)=>({value:`${impact}:${precision}`,
    label:`Counterstrike Impact TA ${impact}, Precision TA ${precision}; zbývá ${n-impact-precision}`}))).flat()};
 }
 if(s.phase==='counter-hit')return guidedFullHitRequirement(s.counterHit);
 if(s.phase==='counter-injury-choice')return {kind:'choice',id:'counter-injury-technique',actorId:s.attackerId,
  choices:[{value:'attribute',label:'Mishap test atributem'},{value:s.injuryAlternative,label:`Mishap dovedností ${s.injuryAlternative}`}]};
 if(s.phase==='counter-need-aberrance')return {kind:'input',id:'counter-aberrance',min:0,max:200,
  label:`Skutečná Aberrance ${s.defender.name} pro povinný Morale Test (nikoliv odhad)`,actorId:s.attackerId};
 if(s.phase==='injury-aftermath')return {...guidedMandatoryRequirement(s.injuryAftermath),actorId:s.attackerId};
 if(s.phase==='melee-mishap'){
  const id=s.mishapPending[0];if(!id)return {kind:'automatic',id:'finish-melee-mishaps'};
  if(s.states[id].shock==='KIA')return {kind:'automatic',id:'skip-dead-melee-mishap'};
  const kind=id===s.attackerId?s.gate.attackerMishap:s.gate.defenderMishap;
  const ch=id===s.attackerId?s.attacker:s.defender;
  const usedArms=s.usedArms[id];
  const arms=usedArms==='both'?['left','right']:['left','right'].includes(usedArms)?[usedArms]:null;
  const profile=verifiedCombatMishap({kind,actor:ch,state:s.states[id],round:s.round,timelineId:s.timelineId,
   usesDEX:id===s.attackerId||['block','counterstrike'].includes(s.meleeSession.defence),usedArms:arms,
   technique:s.mishapMode??'attribute'});
  if(s.mishapMode===null&&profile.alternative)return {kind:'choice',id:'combat-mishap-technique',actorId:id,
   choices:[{value:'attribute',label:'Mishap atribut DEX/AGL'},{value:profile.alternative,label:`Mishap ${profile.alternative}`}]};
  if(profile.forcedCF)return {kind:'automatic',id:'combat-mishap-forced-cf',actorId:id};
  return {kind:'die',id:'combatMishapD100',faces:100,actorId:id,label:`Povinný ${profile.type} (${profile.skill}) d100 – HMK 161`};
 }
 if(s.phase==='ta')return {kind:'choice',id:'maneuver-impact-ta',choices:Array.from({length:s.gate.extraTA+1},(_,i)=>({value:String(i),label:`Impact TA ${i} (zbývá ${s.gate.extraTA-i})`}))};
 if(s.phase==='grab-action'){
  const hasItem=s.inventory.some(i=>i.characterId===s.defenderId&&i.quantity===1&&['main_hand','off_hand'].includes(i.slot));
  return {kind:'choice',id:'grab-type',choices:[{value:'hold',label:'Grab – Hold'},...(hasItem?[{value:'take',label:'Grab – Take'}]:[])]};
 }
 if(s.phase==='grab-zone')return {kind:'die',id:'grabZoneDie',faces:4,label:'Grab Zone Die d4 (HMK p.106)',actorId:s.attackerId};
 if(s.phase==='owner-roll')return {kind:'die',id:'ownerD6',faces:6,label:`${s.technique} STR + d6 útočníka`,actorId:s.attackerId};
 if(s.phase==='target-roll')return {kind:'die',id:'targetD6',faces:6,label:`${s.technique} STR + d6 obránce`,actorId:s.defenderId};
 if(s.phase==='displacement')return {kind:'maneuver-position',id:'maneuver-displacement',label:'Přesné polohy a volná skutečná dráha Press / Trip'};
 if(s.phase==='consequence'&&verifiedManeuverConsequence({state:s.targetState,character:s.defender,round:s.round,timelineId:s.timelineId}).forcedCF)
  return {kind:'automatic',id:'maneuver-forced-cf'};
 if(s.phase==='consequence')return {kind:'die',id:'maneuverConsequenceD100',faces:100,
  label:s.targetState.pendingManeuver?.kind==='stumble'?'Povinný Stumble AGL d100':'Povinný Shock d100',actorId:s.defenderId};
 if(s.phase==='automatic-grab')return {kind:'choice',id:'trip-grab-choice',choices:[{value:'decline',label:'Nepoužít Grab'},{value:'hold',label:'Grab Hold'},{value:'take',label:'Grab Take'}]};
 if(s.phase==='automatic-grab-zone')return {kind:'die',id:'automaticGrabZoneD4',faces:4,label:'Trip 10+ – Grab Zone Die d4 (HMK p.106)',actorId:s.attackerId};
 if(s.phase==='take-item'){
  const slot=heldSlotInGrabZone(s.targetState.pendingGrabTake?.zone,s.defender.hmk?.handedness);
  const items=s.inventory.filter(i=>i.characterId===s.defenderId&&i.slot===slot&&i.quantity===1);
  return items.length?{kind:'choice',id:'grab-item',choices:items.map(i=>({value:i.id,label:i.snapshot?.name??i.id}))}:
   {kind:'blocked',reason:'Cíl nedrží žádný jednotlivý předmět: Take nemůže být dokončen bez skutečného cíle'};
 }
 if(s.phase==='blocked')return {kind:'blocked',reason:s.blockReason};
 if(s.phase==='complete')return {kind:'complete',result:s.margin};
 throw Error('Neznámá fáze deklarovaného HMK manévru');
}
function finishDeclared(s){
 const states={...s.states,[s.defenderId]:s.targetState};
 const next={...s,states};
 const pending=[s.gate?.attackerMishap?s.attackerId:null,s.gate?.defenderMishap?s.defenderId:null].filter(Boolean);
 return pending.length?{...next,mishapPending:pending,phase:'melee-mishap'}:{...next,phase:'complete',finished:true};
}
function afterManeuver(s){
 const maneuver=s.targetState.events.find(e=>e.id===s.id+':maneuver');
 const effect=maneuver?.details?.effect;
 if((effect?.backFeet||effect?.thrownFeet)&&!s.displacement)return {...s,phase:'displacement'};
 if(s.targetState.pendingManeuver)return {...s,phase:'consequence'};
 if(s.targetState.pendingAutomaticGrab)return {...s,phase:'automatic-grab'};
 if(s.targetState.pendingGrabTake){
  const zone=s.targetState.pendingGrabTake.zone,slot=heldSlotInGrabZone(zone,s.defender.hmk?.handedness);
  const possible=s.inventory.some(i=>i.characterId===s.defenderId&&i.slot===slot&&i.quantity===1);
  if(possible)return {...s,phase:'take-item'};
  const targetState=copy(s.targetState);targetState.pendingGrabTake=null;
  targetState.events.push({id:s.id+':take-no-object',round:s.round,type:'hmk-grab-take-no-object',
   details:{zone,grabberId:s.attackerId,targetId:s.defenderId,reason:'no-object-held-in-struck-zone'}});
  return finishDeclared({...s,targetState});
 }
 return finishDeclared(s);
}
function afterOriginalMelee(s){
 const mishaps=[s.gate.attackerMishap?s.attackerId:null,s.gate.defenderMishap?s.defenderId:null].filter(Boolean);
 if(mishaps.length)return {...s,mishapPending:mishaps,phase:'melee-mishap'};
 return {...s,phase:'complete',finished:true};
}
function afterCounterInjury(s){
 const targetId=s.attackerId,state=s.states[targetId];
 const immediate=guidedMandatoryEvents({state,characterId:targetId,round:s.round,actorId:s.attackerId,
  turnEnded:false,timelineId:s.timelineId}).filter(x=>['injury-mishap','injury-morale','blood-loss'].includes(x.kind));
 if(!immediate.length)return afterOriginalMelee(s);
 const actor=s.attacker,source=s.defender,first=immediate[0];
 const abe=s.counterAbe??source.hmk?.attributes?.aberrance??source.hmk?.attributes?.abe??null;
 if(first.kind==='injury-morale'&&!integer(abe,0,200))return {...s,phase:'counter-need-aberrance'};
 if(first.kind==='injury-mishap'&&s.injuryMode===null){
  const mishap=state.mishaps.find(x=>x.id===first.id);
  const alternative=mishap?.kind==='fumble-roll'?'legerdemain':mishap?.kind==='stumble-roll'?'acrobatics':null;
  if(alternative&&(actor.hmk?.skills??[]).some(x=>String(x.name??x.key??'').toLowerCase()===alternative&&integer(x.ml,0,200)))
   return {...s,phase:'counter-injury-choice',injuryAlternative:alternative};
 }
 // Actual combat attack uses DEX; the defender has already been injured.
 const injuryAftermath=createGuidedMandatory({state,character:actor,round:s.round,
  eventId:s.id+':counter-aftermath:'+state.events.length,actorId:s.attackerId,turnEnded:false,
  timelineId:s.timelineId,abe,mishapTechnique:s.injuryMode??'attribute',mishapContext:{actionUsesDEX:true,usedArms:
    s.usedArms[targetId]==='both'?['left','right']:
    ['left','right'].includes(s.usedArms[targetId])?[s.usedArms[targetId]]:null}});
 return {...s,injuryAftermath,phase:'injury-aftermath'};
}
function enterCounterHit(s,impact=0,precision=0){
 const x=s.attackContext,owner=s.defenderId,target=s.attackerId;
 const weapon=x.weaponByActor[owner];
 req(weapon&&x.participants[target]&&['front','side','rear'].includes(s.counterDirection)&&integer(s.counterOpponents,1,100),
  'Counterstrike: chybí ověřená zbraň, skutečný směr nebo počet protivníků protiútoku');
 // Melee mishaps are resolved AFTER injury (HMK p.165). They are retained
 // in the original gate but excluded from the subordinate injury-only stage.
 const safeGate={...s.gate,attackerMishap:null,defenderMishap:null};
 const hit=createGuidedFullHit({id:s.id+':counter-hit',timelineId:s.timelineId,round:s.round,
  attackerId:s.attackerId,defenderId:s.defenderId,kind:'melee',outcome:safeGate,
  weapon,aimZN:1,impactTA:impact,precisionDice:precision,armourReduction:weapon.armourReduction??0,
  direction:s.counterDirection,opponents:s.counterOpponents,inventory:s.inventory,targetState:s.states[target],
  shockML:x.participants[target].shockML,strengthML:x.participants[target].strengthML,
  sourceSignature:s.sourceSignature,physicalDice:s.physicalDice});
 return {...s,margin:0,counterImpactTA:impact,counterPrecisionTA:precision,counterHit:hit,phase:'counter-hit'};
}
function resolvedMelee(s,melee){
 const result=guidedMeleeResult(melee),gate=result.gate;
 const next={...s,meleeSession:melee,gate,physicalDice:result.physicalDice};
 if(gate.counterStrike)return {...next,phase:'counter-direction'};
 if(gate.weaponDamageCheck){
  const x=s.attackContext,rolls=result.physicalDice;
  const wd=createGuidedBlockWeaponDamage({id:s.id+':wq',timelineId:s.timelineId,round:s.round,
   attackerId:s.attackerId,defenderId:s.defenderId,gate,attackerRoll:rolls.find(x=>x.id==='attackerRoll')?.value,
   defenderRoll:rolls.find(x=>x.id==='defenderRoll')?.value,
   attackerEML:melee.attackerEML,defenderEML:melee.defenderEML,inventory:s.inventory,
   attackerItemId:x.weaponItemIds[s.attackerId],defenderItemId:x.weaponItemIds[s.defenderId],
   weaponByActor:x.weaponByActor,sourceSignature:s.sourceSignature});
  return {...next,weaponDamageSession:wd,phase:'weapon-damage'};
 }
 if(!gate.attackerStrike||gate.winner!=='attacker')return afterOriginalMelee({...next,margin:0});
 return {...next,phase:'ta'};
}
function advanceMishap(s,roll=null){
 const id=s.mishapPending[0];req(id,'Žádný Melee Mishap není splatný');
 const c=id===s.attackerId?s.attacker:s.defender;
 const a=s.usedArms[id],arms=a==='both'?['left','right']:['left','right'].includes(a)?[a]:null;
 const p=verifiedCombatMishap({kind:id===s.attackerId?s.gate.attackerMishap:s.gate.defenderMishap,
  actor:c,state:s.states[id],round:s.round,timelineId:s.timelineId,
  usesDEX:id===s.attackerId||['block','counterstrike'].includes(s.meleeSession.defence),
  usedArms:arms,technique:s.mishapMode??'attribute'});
 const result=applyGuidedCombatMishap({state:s.states[id],round:s.round,
  eventId:s.id+':melee-mishap:'+id,actorId:id,profile:p,roll});
 const states={...s.states,[id]:result.state};const inventory=copy(s.inventory);
 // The equipped weapon used in this CF is the witnessed item. On a Fumble,
 // it falls out of the hand (slot 'none' = unequipped); never leave it readied.
 if(result.result.effect==='drop-item'){
  const item=inventory.find(x=>x.id===s.attackContext.weaponItemIds[id]&&x.characterId===id);
  req(item&&['main_hand','off_hand'].includes(item.slot),'Mishap: původně používaná zbraň už není v ruce');
  item.slot='none';
  result.state.events.at(-1).details.droppedItemId=item.id;
 }
 const out={...s,states,targetState:states[s.defenderId],inventory,mishapPending:s.mishapPending.slice(1),mishapMode:null,
  physicalDice:roll===null?s.physicalDice:[...s.physicalDice,{id:'combatMishapD100:'+id,faces:100,value:roll,source:'GM-entered-physical-die'}],
  mishapProofs:[...s.mishapProofs,{actorId:id,result:result.result}]};
 return out.mishapPending.length?out:{...out,phase:'complete',finished:true};
}
/** Automatically drive only deterministic branches, never roll a gameplay die. */
export function advanceGuidedDeclared(s){
 const r=guidedDeclaredRequirement(s);
 if(s.phase==='counter-hit'&&r.kind==='automatic')return {...s,counterHit:advanceGuidedFullHit(s.counterHit)};
 if(s.phase==='counter-hit'&&r.kind==='complete'){
  const x=finalizeGuidedFullHit({session:s.counterHit,currentState:s.states[s.attackerId],sourceSignature:s.sourceSignature});
  const states=x.strike?{...s.states,[s.attackerId]:x.state}:s.states;
  return afterCounterInjury({...s,states,counterHitProof:x,physicalDice:x.proof?.rolls??s.counterHit.physicalDice});
 }
 if(s.phase==='injury-aftermath'&&r.kind==='automatic'){
  const out=commitGuidedMandatory({session:s.injuryAftermath,state:s.states[s.attackerId],character:s.attacker,
   round:s.round,actorId:s.attackerId,turnEnded:false,timelineId:s.timelineId,elapsedMinutesSinceOriginal:null});
  return afterCounterInjury({...s,states:{...s.states,[s.attackerId]:out.state},injuryAftermath:null,injuryMode:null,injuryAlternative:null,
   physicalDice:[...s.physicalDice,...s.injuryAftermath.rolls]});
 }
 if(s.phase==='melee-mishap'&&r.id==='combat-mishap-forced-cf')return advanceMishap(s);
 if(s.phase==='melee-mishap'&&r.id==='finish-melee-mishaps')return {...s,phase:'complete',finished:true};
 if(s.phase==='melee-mishap'&&r.id==='skip-dead-melee-mishap'){
  const rest={...s,mishapPending:s.mishapPending.slice(1),mishapMode:null};
  return rest.mishapPending.length?rest:{...rest,phase:'complete',finished:true};
 }
 return s;
}
export function chooseGuidedDeclared(s,value){
 const r=guidedDeclaredRequirement(s);
 req(r.kind==='choice'&&r.choices.some(x=>String(x.value??x)===String(value)),'Nepovolená volba v manévru');
 if(s.phase==='counter-injury-choice')return afterCounterInjury({...s,injuryMode:String(value)});
 if(s.phase==='counter-direction')return {...s,counterDirection:String(value),phase:'counter-opponents'};
 if(s.phase==='counter-ta'){
  const [a,p]=String(value).split(':').map(Number);
  req(Number.isSafeInteger(a)&&Number.isSafeInteger(p)&&a+p<=s.gate.extraTA,'Neplatné Counterstrike TA');
  return enterCounterHit(s,a,p);
 }
 if(s.phase==='counter-hit')return {...s,counterHit:chooseGuidedFullHit(s.counterHit,{id:r.id,value:String(value)})};
 if(s.phase==='melee-mishap'&&r.id==='combat-mishap-technique')return {...s,mishapMode:String(value)};
 if(s.phase==='melee'){
  const melee=chooseGuidedMeleeDefence(s.meleeSession,value);return {...s,meleeSession:melee};
 }
 if(s.phase==='ta'){
  const ta=Number(value);
  const gate={...s.gate,impactTA:ta};
  const decision=decideDeclaredManeuver({gate:{...gate,attackerMishap:null,defenderMishap:null},attackerId:s.attackerId,defenderId:s.defenderId,
   round:s.round,timelineId:s.timelineId,sourceSignature:s.sourceSignature,
   attackerTechnique:s.technique,defenderCounterTechnique:'strike',meleeProofKey:s.id});
  req(decision.eligible,'Deklarovaný manévr nebyl pravidlově přiznán');
  return {...s,impactTA:ta,decision,phase:s.technique==='grab'?'grab-action':'owner-roll'};
 }
 if(s.phase==='grab-action')return {...s,grabAction:value,phase:'grab-zone'};
 if(s.phase==='automatic-grab'){
  if(value==='decline')return afterManeuver({...s,targetState:resolveTripAutomaticGrab({state:s.targetState,round:s.round,
   eventId:s.id+':trip-choice',grabberId:s.attackerId,targetId:s.defenderId,choice:value}).state});
  return {...s,grabAction:value,phase:'automatic-grab-zone'};
 }
  if(s.phase==='take-item'){
  const out=applyAutomaticGrabTake({state:s.targetState,inventory:s.inventory,round:s.round,
   eventId:s.id+':take',grabberId:s.attackerId,targetId:s.defenderId,itemId:value,
   targetHandedness:s.defender.hmk?.handedness});
  return afterManeuver({...s,targetState:out.state,inventory:out.inventory});
 }
 throw Error('Neznámá hráčská volba');
}
export function submitGuidedDeclaredDie(s,raw){
 const r=guidedDeclaredRequirement(s);req(r.kind==='die','Žádný fyzický hod není splatný');
 const value=physical(raw,r.faces),physicalDice=[...s.physicalDice,
  {id:r.id,faces:r.faces,value,source:'GM-entered-physical-die'}];
 if(s.phase==='weapon-damage'){
  const next=submitGuidedBlockWeaponDamageDie(s.weaponDamageSession,value);
  if(guidedBlockWeaponDamageRequirement(next).kind!=='complete')return {...s,weaponDamageSession:next};
  const out=completeGuidedBlockWeaponDamage({session:next,currentInventory:s.inventory,sourceSignature:s.sourceSignature});
  return afterOriginalMelee({...s,weaponDamageSession:next,weaponDamageProof:out,
   inventory:out.inventory,physicalDice:[...s.physicalDice,...out.physicalDice],margin:0});
 }
 if(s.phase==='counter-hit')return {...s,counterHit:submitGuidedFullHitDie(s.counterHit,value)};
 if(s.phase==='injury-aftermath')return {...s,injuryAftermath:submitGuidedMandatoryDie(s.injuryAftermath,value)};
 if(s.phase==='melee-mishap')return advanceMishap(s,value);
 if(s.phase==='melee'){
  const melee=submitGuidedMeleeDie(s.meleeSession,value);
  return guidedMeleeRequirement(melee).kind==='resolved'?resolvedMelee({...s,physicalDice:[]},melee):{...s,meleeSession:melee};
 }
 if(s.phase==='automatic-grab-zone'){
  const zone=zoneOf(value,s.aimZN);
  if(!zone)throw Error('Grab Zone Die nezasáhl žádnou dovolenou zónu');
  const out=resolveTripAutomaticGrab({state:s.targetState,round:s.round,eventId:s.id+':trip-choice',
   grabberId:s.attackerId,targetId:s.defenderId,choice:s.grabAction,zone});
  return afterManeuver({...s,targetState:out.state,physicalDice});
 }
 if(s.phase==='grab-zone'){
  const zone=zoneOf(value,s.aimZN);req(zone,'Zone Die míjí tělo; manévr bez zasažené zóny');
  return {...s,grabZone:zone,phase:'owner-roll',physicalDice};
 }
 if(s.phase==='owner-roll')return {...s,ownerD6:value,phase:'target-roll',physicalDice};
 if(s.phase==='target-roll'){
  const out=applyAutomaticDeclaredManeuver({decision:s.decision,round:s.round,timelineId:s.timelineId,
   sourceSignature:s.sourceSignature,attackerId:s.attackerId,defenderId:s.defenderId,
   aftermathResolved:true,state:s.targetState,eventId:s.id+':maneuver',ownerSTR:s.ownerSTR,targetSTR:s.targetSTR,
   ownerD6:s.ownerD6,targetD6:value,grabAction:s.grabAction,zone:s.grabZone});
  return afterManeuver({...s,targetD6:value,margin:out.margin,targetState:out.state,physicalDice});
 }
 if(s.phase==='consequence'){
  const ctx=verifiedManeuverConsequence({state:s.targetState,character:s.defender,round:s.round,timelineId:s.timelineId});
  req(!ctx.forcedCF,'Grievous impairment způsobuje automatické CF – nesmí se házet d100');
  const out=applyConfirmedManeuverConsequence({state:s.targetState,round:s.round,eventId:s.id+':consequence',
   kind:ctx.kind,ml:ctx.ml,hasLegs:ctx.hasLegs,roll:value,gmConfirmed:true});
  return afterManeuver({...s,targetState:out.state,physicalDice});
 }
 throw Error('Hod není v této fázi povolen');
}

/** Request a genuine missing combat fact rather than interpreting absent Aberrance as zero. */
export function submitGuidedDeclaredFact(s,raw){
 req(['counter-need-aberrance','counter-opponents'].includes(s?.phase),'Není splatný chybějící údaj');
 req(/^\d+$/.test(String(raw)),'Musí být zadané celé číslo');
 const value=Number(raw);
 if(s.phase==='counter-opponents'){
  req(integer(value,1,100),'Skutečný počet protivníků musí být 1–100');
  const next={...s,counterOpponents:value};
  return s.gate.extraTA>0?{...next,phase:'counter-ta'}:enterCounterHit(next);
 }
 req(integer(value,0,200),'Aberrance musí být 0–200');
 return afterCounterInjury({...s,counterAbe:value});
}

/** HMK p.170: an unusable zone means automatic CF, no physical die. */
export function advanceGuidedDeclaredForcedConsequence(s){
 req(guidedDeclaredRequirement(s).id==='maneuver-forced-cf','Není splatné automatické CF manévru');
 const ctx=verifiedManeuverConsequence({state:s.targetState,character:s.defender,round:s.round,timelineId:s.timelineId});
 const out=applyConfirmedManeuverConsequence({state:s.targetState,round:s.round,eventId:s.id+':consequence',
  kind:ctx.kind,ml:ctx.ml,hasLegs:ctx.hasLegs,forcedCF:true,gmConfirmed:true});
 return afterManeuver({...s,targetState:out.state});
}

/** HMK p.106: Press (5/10 ft) and Trip (5 ft) physically displace the
 * opponent. No coordinates or freedom from obstacles may be inferred. */
export function submitGuidedDeclaredDisplacement(s,{units,destination,clearPath}={}){
 req(s?.phase==='displacement','Není splatné přemístění Press / Trip');
 req(clearPath===true,'Chybí pozorované potvrzení volné skutečné dráhy přesunu');
 req(Array.isArray(units)&&units.length>=2&&units.every(u=>typeof u.id==='string'&&Number.isFinite(u.x)&&Number.isFinite(u.y)),
  'Zadejte přesné polohy všech účastníků');
 req(new Set(units.map(u=>u.id)).size===units.length,'Duplicitní pozice účastníka');
 req(Number.isFinite(destination?.x)&&Number.isFinite(destination?.y),'Chybí přesné cílové souřadnice');
 const attacker=units.find(u=>u.id===s.attackerId),target=units.find(u=>u.id===s.defenderId);
 req(!!attacker&&!!target,'Chybí počáteční pozice útočníka nebo cíle');
 const currentEvent=s.targetState.events.find(e=>e.id===s.id+':maneuver');
 const effect=currentEvent?.details?.effect||{};
 const feet=effect.backFeet||effect.thrownFeet;
 req([5,10].includes(feet),'Manévr nemá přípustný prostorový účinek');
 const d=Math.hypot(destination.x-target.x,destination.y-target.y);
 req(Math.abs(d-feet)<0.00001,`HMK str.106: ${s.technique} vyžaduje skutečný přesun přesně ${feet} stop`);
 if(effect.backFeet){
  const before=Math.hypot(target.x-attacker.x,target.y-attacker.y);
  const after=Math.hypot(destination.x-attacker.x,destination.y-attacker.y);
  req(after>before+0.00001,'Press musí odstrčit cíl od útočníka, nikoli k němu');
 }
 req(!units.some(u=>u.id!==s.defenderId&&Math.hypot(u.x-destination.x,u.y-destination.y)<0.00001),
  'Cílovou polohu již zaujímá jiná postava');
 return afterManeuver({...s,displacement:{kind:s.technique,actorId:s.attackerId,targetId:s.defenderId,
  feet,from:{x:target.x,y:target.y},to:{x:destination.x,y:destination.y},units:structuredClone(units),
  observedClearPath:true,source:'HMK p.106'}});
}

export function completeGuidedDeclaredManeuver({session,currentState,currentInventory,sourceSignature}={}){
 const s=session;req(s?.format==='hmk-guided-declared-v1'&&s.phase==='complete'&&s.finished,
  'Manévr nemá vyhodnocány všechny povinné hody a volby');
 req(sourceSignature===s.sourceSignature,'Změna původního bojového stavu');
 req(JSON.stringify(currentState)===JSON.stringify(s.originalState),'Trvalý stav cíle se mezitím změnil');
 req(JSON.stringify(s.states[s.defenderId])===JSON.stringify(s.targetState),'Nesouhlasí výsledek manévru s trvalým stavem obránce');
 req(JSON.stringify(currentInventory)===JSON.stringify(s.originalInventory),
  'Inventář se mezitím změnil');
 return {format:'hmk-guided-declared-proof-v1',id:s.id,actorId:s.attackerId,targetId:s.defenderId,
  round:s.round,technique:s.technique,gate:s.gate,margin:s.margin,
  physicalDice:copy(s.physicalDice),state:copy(s.states[s.defenderId]),states:copy(s.states),
  originalStates:copy(s.originalStates),counterHit:copy(s.counterHitProof),
  weaponDamage:copy(s.weaponDamageProof),meleeMishaps:copy(s.mishapProofs),
  inventory:copy(s.inventory),
  displacement:s.displacement?copy(s.displacement):null,
  outcome:s.margin===null||s.margin<=0?'not-won':s.targetState.events.at(-1)?.type,
  source:'HMK World of Kèthîra p.106'};
}
