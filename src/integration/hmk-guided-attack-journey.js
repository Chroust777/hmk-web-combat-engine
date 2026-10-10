/**
 * Unified, headless user-facing attack -> injury journey.
 * Only the authoritative HârnMaster: Roleplaying in the World of Kèthîra
 * (pp.163–170) is used. The engine never generates a gameplay die.
 * A signed snapshot of the live participants/inventory must be checked by
 * the caller at the final atomic commit.
 */
import {createGuidedMeleeSequence,guidedMeleeRequirement,chooseGuidedMeleeDefence,submitGuidedMeleeDie,guidedMeleeResult} from './hmk-guided-melee-sequence.js';
import {resolveHMKMissileAttack} from './hmk-missile-combat.js';
import {createGuidedFullHit,guidedFullHitRequirement,chooseGuidedFullHit,submitGuidedFullHitDie,finalizeGuidedFullHit,advanceGuidedFullHit} from './hmk-guided-full-hit.js';
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {successLevel,SL} from '../rules/tests.js';
const assert=(x,message)=>{if(!x)throw Error(message)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const copy=structuredClone;
const physical=(id,faces,label,value)=>({id,faces,label,value,source:'GM-entered-physical-die'});
const signature=state=>JSON.stringify(state);

/** Independent preflight: a complete signature covers both parties, equipped
 * weapons and layer state, plus the exact original attack modifiers. */
export function createGuidedAttackJourney({id,timelineId,round,attackerId,defenderId,
 kind,sourceSignature,melee=null,missile=null,participants,inventory,
 direction,opponents=1,aimZN=1,armourReduction=0,impactTA=0,
 precisionDice=0,weaponByActor}={}){
 assert(['melee','missile'].includes(kind)&&typeof sourceSignature==='string'&&sourceSignature,
  'Chybí potvrzený výběr útoku a jeho pravidlový podpis');
 assert(participants&&participants[attackerId]&&participants[defenderId]&&Array.isArray(inventory)&&weaponByActor,
  'Chybí skutečná data obou postav a zbraní');
 assert(['front','rear','side'].includes(direction)&&int(opponents,1,100)&&int(aimZN,1,10),
  'Chybí směr nebo doložené okolnosti zásahu');
 assert(int(armourReduction,0,99)&&int(impactTA,0,3)&&int(precisionDice,0,4),
  'Neplatná volba Tactical Advantage / Armour Reduction');
 let meleeSession=null;
 if(kind==='melee'){
  assert(melee&&int(melee.attackerEML,0,100)&&int(melee.defenderEML,0,100),'Chybí doložené finální Melee EML');
  meleeSession=createGuidedMeleeSequence({id:id+':attack',timelineId,round,attackerId,defenderId,
   attackerEML:melee.attackerEML,defenderEML:melee.defenderEML,allowedDefences:melee.allowedDefences,sourceSignature});
 }
 if(kind==='missile'){
  assert(missile&&['bow','crossbow','sling','thrown'].includes(missile.weaponType),'Chybí údaje skutečné střelné/vrhací zbraně');
  assert(int(missile.ml,0,200)&&Number.isFinite(missile.distance)&&Number.isFinite(missile.baseRange)&&missile.baseRange>0,
   'Chybí ověřený Missile ML, vzdálenost nebo Base Range');
  assert(int(missile.impactDieSides,2,100)&&Number.isSafeInteger(missile.weaponImpactModifier),
   'Chybí ověřená zbraňová Impact kostka');
  assert(weaponByActor[attackerId]?.aspect&&weaponByActor[attackerId]?.impactDie===missile.impactDieSides,
   'Zbraň Missile neodpovídá doloženému Strike Mode');
 }
 return {format:'hmk-guided-attack-journey-v1',id,timelineId,round,attackerId,defenderId,kind,
  sourceSignature,meleeSession,missile:missile?copy(missile):null,
  participants:copy(participants),inventory:copy(inventory),direction,opponents,aimZN,armourReduction,
  impactTA,precisionDice,weaponByActor:copy(weaponByActor),missileRoll:null,
  missileImpactRoll:null,choiceImpactTA:null,nearbyD20:null,nearbyImpactD10:null,
  volleyRolls:[],volleyImpactD10:null,selectedTargetRollIndex:null,spoiledDisposition:null,spoiledD100:null,
  physicalDice:[],hitSession:null,finalAttack:null,phase:kind==='melee'?'melee':'missile'};
}
function missileArgs(s){return {...s.missile,roll:s.missileRoll,
 choiceImpactTA:s.choiceImpactTA,impactDieRoll:s.missileImpactRoll,
 nearbyD20:s.nearbyD20,nearbyImpactD10:s.nearbyImpactD10,
 targetRolls:s.volleyRolls,volleyImpactD10:s.volleyImpactD10,
 selectedTargetRollIndex:s.selectedTargetRollIndex,
 spoiledDisposition:s.spoiledDisposition,spoiledD100:s.spoiledD100};}
function missileStep(s){
 if(s.missileRoll===null)return {kind:'die',id:'missileRoll',faces:100,label:'Missile Attack d100 (HMK pp163–164)',actorId:s.attackerId};
 // A Critical Success can allocate one Impact TA or an extra Precision Die;
 // never silently choose which of the two the player wanted.
 const sl=successLevel(s.missileRoll,s.missile.ml);
 if(sl===SL.CS&&s.choiceImpactTA===null){
  // Exact CS is retested by the missile resolver after the choice; since
  // modifiers alter EML, only ask for the choice when the range is Direct.
  const probe=resolveHMKMissileAttack({...missileArgs(s),choiceImpactTA:0});
  if(probe.attackType==='direct'&&probe.sl==='CS'&&probe.hit!==false)
   return {kind:'choice',id:'missile-ta-choice',choices:[
    {value:'0',label:'Precision TA (extra Zone Die)'},{value:'1',label:'Impact TA'}]};
 }
 const r=resolveHMKMissileAttack(missileArgs(s));
 if(r.complete)return {kind:'automatic',id:'finish-missile',resolution:r};
 const pending=r.pending?.type;
 if(pending==='target-count-dice')return {kind:'die',id:'volleyTargetRoll',faces:r.pending.die==='d10'?10:20,label:`Volley target ${r.pending.die}`,actorId:s.attackerId};
 if(pending==='target-roll-choice')return {kind:'choice',id:'volley-target-choice',choices:r.pending.choices.map(x=>({value:String(x),label:'Volley target die '+(x+1)}))};
 if(pending==='impact-ta-d10')return {kind:'die',id:s.nearbyD20!==null?'nearbyImpactD10':'volleyImpactD10',faces:10,label:'Impact TA d10 (HMK p164)',actorId:s.attackerId};
 if(pending==='weapon-impact-die')return {kind:'die',id:'missileImpactRoll',faces:s.missile.impactDieSides,label:`Missile Weapon Impact d${s.missile.impactDieSides}`,actorId:s.attackerId};
 if(pending==='nearby-d20')return {kind:'die',id:'nearbyD20',faces:20,label:'Near-by potential strike d20',actorId:s.attackerId};
 if(pending==='eml05-cf-check')return {kind:'die',id:'spoiledD100',faces:100,label:'Spoiled Missile check at EML05 d100',actorId:s.attackerId};
 if(pending==='spoiled-missile-disposition')return {kind:'choice',id:'spoiled-disposition',choices:r.pending.choices.map(x=>({value:x,label:x}))};
 // A Volley deviation or an unknown printed branch can require target geometry,
 // not just a die; block rather than silently dropping a valid strike.
 return {kind:'blocked',reason:'Missile/Volley potřebuje ještě kontext či zvláštní podmínku: '+JSON.stringify(r.pending??r)};
}
export function guidedAttackRequirement(s){
 assert(s?.format==='hmk-guided-attack-journey-v1','Neplatný HMK průvodce celým útokem');
 if(s.phase==='melee')return guidedMeleeRequirement(s.meleeSession);
 if(s.phase==='missile')return missileStep(s);
 if(s.phase==='melee-ta'){
  const gate=s.finalAttack;const remaining=gate?.extraTA??0;
  const allowed=gate?.taTypes??[];
  const options=[];for(let impact=0;impact<=remaining;impact++)for(let precision=0;precision<=remaining-impact;precision++){
   if(impact&&!allowed.includes('impact')||precision&&!allowed.includes('precision'))continue;
   options.push({value:`${impact}:${precision}`,label:`Impact TA ${impact}, Precision TA ${precision}, nevyužito ${remaining-impact-precision}`});
  }
  return {kind:'choice',id:'melee-ta-allocation',choices:options};
 }
 if(s.phase==='hit')return guidedFullHitRequirement(s.hitSession);
 if(s.phase==='complete')return {kind:'complete',strike:!!s.hitSession&&s.hitSession.phase!=='miss',attack:s.finalAttack};
 throw Error('Neznámý krok útoku');
}
function transitionToHit(s,outcome,dice){
 const strike=s.kind==='melee'?outcome.attackerStrike||outcome.counterStrike:outcome.hit===true;
 const target=s.kind==='melee'&&outcome.counterStrike?s.attackerId:s.defenderId;
 const striker=s.kind==='melee'&&outcome.counterStrike?s.defenderId:s.attackerId;
 const entry=s.participants[target];assert(entry?.state&&int(entry.shockML,0,200)&&int(entry.strengthML,0,200),
  'Chybí potvrzený Shock/Strength ML zasažené postavy');
 const weapon=s.weaponByActor[striker];
 assert(!strike||weapon&&int(weapon.impactDie,2,100),'Útočník nemá doloženou nasazenou zbraň pro zásah');
 const precision=s.kind==='melee'?s.precisionDice:outcome.precisionTA;
 const impact=s.kind==='melee'?s.impactTA:outcome.impactTA;
 const sourceWeapon=weapon?{...weapon,zoneDie:s.kind==='missile'?outcome.range?.zd:weapon.zoneDie}:null;
 // The striker may be the COUNTERSTRIKING defender; protection reduction
 // must follow the weapon that actually hit, never the initial attacker.
 const reduction=sourceWeapon?.armourReduction??s.armourReduction;
 assert(int(reduction,0,99),'Zbraň neobsahuje platný Armour Reduction');
 const hit=createGuidedFullHit({id:s.id,timelineId:s.timelineId,round:s.round,
  attackerId:s.attackerId,defenderId:s.defenderId,kind:s.kind,outcome,
  weapon:sourceWeapon,aimZN:s.aimZN,precisionDice:precision,impactTA:impact,
  armourReduction:reduction,direction:s.direction,opponents:s.opponents,
  inventory:s.inventory,targetState:entry.state,shockML:entry.shockML,strengthML:entry.strengthML,
  sourceSignature:s.sourceSignature,physicalDice:dice});
 return {...s,hitSession:hit,finalAttack:copy(outcome),phase:'hit'};
}
export function submitGuidedAttackDie(s,value){
 const req=guidedAttackRequirement(s);assert(req.kind==='die','Není vyžádán fyzický hod');
 const v=readPhysicalDieValue(value,req.faces);
 if(s.phase==='melee'){
  const m=submitGuidedMeleeDie(s.meleeSession,v);
  if(guidedMeleeRequirement(m).kind==='resolved'){
   const finished=guidedMeleeResult(m);
   const gate=finished.gate;
   if((gate.attackerStrike||gate.counterStrike)&&gate.extraTA>0){
    return {...s,meleeSession:m,finalAttack:copy(gate),physicalDice:finished.physicalDice,phase:'melee-ta'};
   }
   return transitionToHit({...s,meleeSession:m},gate,finished.physicalDice);
  }
  return {...s,meleeSession:m};
 }
 if(s.phase==='missile'){
  const next={...s,physicalDice:[...s.physicalDice,physical(req.id,req.faces,req.label,v)]};
  if(req.id==='volleyTargetRoll')next.volleyRolls=[...s.volleyRolls,v];
  else next[req.id]=v;
  return advanceGuidedAttack(next);
 }
 if(s.phase==='hit')return {...s,hitSession:submitGuidedFullHitDie(s.hitSession,v)};
 throw Error('Nepovolený krok');
}
export function chooseGuidedAttack(s,value){
 const req=guidedAttackRequirement(s);assert(req.kind==='choice','Nyní se nevybírá pravidlová volba');
 const picked=String(value);assert(req.choices.some(x=>String(x.value??x)===picked),'Tato volba není v nabídce');
 if(s.phase==='melee'){
  const m=chooseGuidedMeleeDefence(s.meleeSession,picked);
  return {...s,meleeSession:m};
 }
 if(s.phase==='melee-ta'){
  const [impact,precision]=picked.split(':').map(Number);
  assert(int(impact,0,3)&&int(precision,0,4),'Neplatné využití TA');
  const next={...s,impactTA:impact,precisionDice:precision};
  return transitionToHit(next,s.finalAttack,s.physicalDice);
 }
 if(s.phase==='missile'){
  const updates={...s};
  if(req.id==='missile-ta-choice')updates.choiceImpactTA=Number(picked);
  else if(req.id==='volley-target-choice')updates.selectedTargetRollIndex=Number(picked);
  else if(req.id==='spoiled-disposition')updates.spoiledDisposition=picked;
  else throw Error('Neznámá volba Missile');
  return advanceGuidedAttack(updates);
 }
 if(s.phase==='hit')return {...s,hitSession:chooseGuidedFullHit(s.hitSession,{id:req.id,value:picked})};
 throw Error('Nepovolená volba');
}
export function advanceGuidedAttack(s){
 if(s.phase==='missile'){
  const req=missileStep(s);
  if(req.kind==='automatic'&&req.id==='finish-missile')return transitionToHit(s,req.resolution,s.physicalDice);
 }
 if(s.phase==='hit')return {...s,hitSession:advanceGuidedFullHit(s.hitSession)};
 return s;
}
export function completeGuidedAttack({session,currentState,sourceSignature}={}){
 assert(session?.phase==='hit'&&session.hitSession,'Původní útok ještě nebyl uzavřen');
 return finalizeGuidedFullHit({session:session.hitSession,currentState,sourceSignature});
}
