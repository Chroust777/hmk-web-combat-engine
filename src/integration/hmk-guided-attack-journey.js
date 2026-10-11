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
import {createGuidedBlockWeaponDamage,guidedBlockWeaponDamageRequirement,submitGuidedBlockWeaponDamageDie,completeGuidedBlockWeaponDamage} from './hmk-guided-block-weapon-damage.js';
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
 precisionDice=0,weaponByActor,weaponItemIds=null,usedArms=null}={}){
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
   attackerEML:melee.attackerEML,defenderEML:melee.defenderEML,attackerML:melee.attackerML??null,
   defenderML:melee.defenderML??null,defenderEMLByDefence:melee.defenderEMLByDefence,
   defenderMLByDefence:melee.defenderMLByDefence??null,allowedDefences:melee.allowedDefences,sourceSignature});
 }
 if(kind==='missile'){
  assert(missile&&['bow','crossbow','sling','thrown'].includes(missile.weaponType),'Chybí údaje skutečné střelné/vrhací zbraně');
  assert(int(missile.ml,0,200)&&Number.isFinite(missile.distance)&&Number.isFinite(missile.baseRange)&&missile.baseRange>0,
   'Chybí ověřený Missile ML, vzdálenost nebo Base Range');
  assert(int(missile.impactDieSides,2,100)&&Number.isSafeInteger(missile.weaponImpactModifier),
   'Chybí ověřená zbraňová Impact kostka');
  if(missile.forcedCF===true)assert(Array.isArray(missile.forcedCFMishaps)&&
   missile.forcedCFMishaps.length>=1&&missile.forcedCFMishaps.length<=2&&
   new Set(missile.forcedCFMishaps).size===missile.forcedCFMishaps.length&&
   missile.forcedCFMishaps.every(k=>['fumble','stumble'].includes(k))&&
   Array.isArray(missile.forcedCFWoundIds)&&missile.forcedCFWoundIds.length>0,
   'Grievous Missile vyžaduje doložené zranění a povinné automatické Mishaps');
  assert(weaponByActor[attackerId]?.aspect&&weaponByActor[attackerId]?.impactDie===missile.impactDieSides,
   'Zbraň Missile neodpovídá doloženému Strike Mode');
 }
 return {format:'hmk-guided-attack-journey-v1',id,timelineId,round,attackerId,defenderId,kind,
  sourceSignature,meleeSession,missile:missile?copy(missile):null,
  participants:copy(participants),inventory:copy(inventory),direction,opponents,aimZN,armourReduction,
  impactTA,precisionDice,weaponByActor:copy(weaponByActor),weaponItemIds:weaponItemIds?copy(weaponItemIds):null,
  weaponDamageSession:null,weaponDamageProof:null,usedArms:usedArms?copy(usedArms):null,
  counterDirection:null,counterOpponents:null,missileRoll:null,
  missileImpactRoll:null,choiceImpactTA:null,nearbyD20:null,nearbyImpactD10:null,
  volleyRolls:[],volleyImpactD10:null,selectedTargetRollIndex:null,spoiledDisposition:null,spoiledD100:null,
  deviationD8:null,deviationTargetCount:null,targetSlots:[],nearbySlots:[],deviationSlots:[],
  missileActualTargetId:null,missileActualDirection:null,missileActualOpponents:null,
  physicalDice:[],hitSession:null,finalAttack:null,phase:kind==='melee'?'melee':'missile'};
}
function missileArgs(s){return {...s.missile,roll:s.missileRoll,
 choiceImpactTA:s.choiceImpactTA,impactDieRoll:s.missileImpactRoll,
 nearbyD20:s.nearbyD20,nearbyImpactD10:s.nearbyImpactD10,
 targetRolls:s.volleyRolls,volleyImpactD10:s.volleyImpactD10,
 selectedTargetRollIndex:s.selectedTargetRollIndex,
 spoiledDisposition:s.spoiledDisposition,spoiledD100:s.spoiledD100,
 deviationD8:s.deviationD8,deviationTargetCount:s.deviationTargetCount};}
function missileSlotRequirement(s,category,index,count){
 const candidates=Object.keys(s.participants).filter(id=>id!==s.attackerId&&
  s.participants[id]?.state&&int(s.participants[id]?.shockML,0,200)&&
  int(s.participants[id]?.strengthML,0,1000)&&s.participants[id]?.zoneCount===10);
 assert(candidates.length>0,'Žádný doložený účastník nemá platný stav pro náhodný Missile zásah');
 return {kind:'choice',id:`missile-slot-${category}-${index}`,fact:true,
  label:`Skutečně přítomný cíl na TAR pozici ${index+1}/${count} (${category}); u TAR2+ opakujte identifikátor`,
  choices:candidates.map(id=>({value:id,label:`${id} – skutečná TAR pozice ${index+1}/${count}`}))};
}
function missileStep(s){
 // HMK p.170: using an unusable Grievous zone forces CF. No normal d100,
 // no flight, target selection, near-by strike, or impact dice can occur.
 if(s.missile.forcedCF===true){
  assert(s.missileRoll===null&&s.physicalDice.length===0,'Forced Grievous CF nesmí mít hod útoku');
  const pre=resolveHMKMissileAttack({...missileArgs(s),roll:null,probeOnly:true});
  return {kind:'automatic',id:'finish-missile',resolution:{complete:true,hit:false,
   sl:'CF',forcedCF:true,forcedMishaps:[...s.missile.forcedCFMishaps],
   forcedWoundIds:[...s.missile.forcedCFWoundIds],range:pre.range,
   attackType:pre.range.type,eml:pre.eml,physicalDice:[]}};
 }
 // HMK p.163 Spoiled Attack is resolved BEFORE any ordinary attack die.
 // For a wasted action no die exists; for automatic failure ONLY the EML05
 // check (if required) is physically rolled. Never ask for an unused d100.
 if(s.missileRoll===null){
  const pre=resolveHMKMissileAttack({...missileArgs(s),roll:null,probeOnly:true});
  if(!pre.spoiled){
   // The numbered creature/TAR slots are established BEFORE the physical
   // target d20/d10. A result cannot later be assigned to a convenient foe.
   const category=pre.range.type==='volley'?'target':'nearby';
   const count=pre.range.type==='volley'?s.missile.targetCount:s.missile.nearbyTargetCount;
   const slots=category==='target'?(s.targetSlots??[]):(s.nearbySlots??[]);
   if(slots.length<count)return missileSlotRequirement(s,category,slots.length,count);
   return {kind:'die',id:'missileRoll',faces:100,label:'Missile Attack d100 (HMK pp163–164)',actorId:s.attackerId};
  }
 }
 // A Critical Success can allocate one Impact TA or an extra Precision Die;
 // never silently choose which of the two the player wanted.
 if(s.missileRoll!==null&&s.choiceImpactTA===null){
  // The TA choice follows the FINAL adjusted EML, never base ML.
  const probe=resolveHMKMissileAttack({...missileArgs(s),choiceImpactTA:0});
  if(probe.attackType==='direct'&&probe.sl==='CS'&&probe.hit!==false)
   return {kind:'choice',id:'missile-ta-choice',choices:[
    {value:'0',label:'Precision TA (extra Zone Die)'},{value:'1',label:'Impact TA'}]};
 }
 const r=resolveHMKMissileAttack(missileArgs(s));
 if(r.pending?.type==='volley-deviation-target-count')return {kind:'input',id:'deviationTargetCount',
  min:0,max:200,label:`Potvrzený počet TAR pozic v sousední 15ft oblasti určené fyzickým d8=${s.deviationD8} (0 = prázdná)`};
 if(s.deviationTargetCount>0&&(s.deviationSlots??[]).length<s.deviationTargetCount)
  return missileSlotRequirement(s,'deviation',s.deviationSlots.length,s.deviationTargetCount);
 if(r.complete)return {kind:'automatic',id:'finish-missile',resolution:r};
 const pending=r.pending?.type;
 if(pending==='volley-deviation-d8')return {kind:'die',id:'deviationD8',faces:8,
  label:'Volley – d8 pro jednu z osmi sousedních 15ft oblastí (HMK str.164)',actorId:s.attackerId};
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
 if(s.phase==='missile-hit-direction')return {kind:'choice',id:'missile-actual-direction',
  label:'Směr zásahu skutečně zasažené postavy',choices:['front','side','rear'].map(value=>({value,label:value}))};
 if(s.phase==='missile-hit-opponents')return {kind:'input',id:'missile-actual-opponents',min:1,max:100,
  label:'Skutečný počet protivníků zasažené postavy (směrová ochrana)'};
 if(s.phase==='counter-direction')return {kind:'choice',id:'counterstrike-direction',actorId:s.defenderId,
  choices:['front','side','rear'].map(value=>({value,label:`Skutečný směr Counterstrike: ${value}`}))};
 if(s.phase==='counter-opponents')return {kind:'input',id:'counterstrike-opponents',actorId:s.attackerId,
  min:1,max:100,label:'Skutečný počet protivníků původního útočníka pro směrovou ochranu Counterstrike'};
 if(s.phase==='melee-weapon-damage')return guidedBlockWeaponDamageRequirement(s.weaponDamageSession);
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
 const target=s.kind==='melee'&&outcome.counterStrike?s.attackerId:
  s.kind==='missile'?(s.missileActualTargetId??s.defenderId):s.defenderId;
 const striker=s.kind==='melee'&&outcome.counterStrike?s.defenderId:s.attackerId;
 const entry=s.participants[target];assert(entry?.state&&int(entry.shockML,0,200)&&int(entry.strengthML,0,200),
  'Chybí potvrzený Shock/Strength ML zasažené postavy');
 if(s.kind==='missile'&&strike)assert(entry.zoneCount===10,
  'Pro tento cíl není doložena kompatibilní anatomická tabulka. Nelze použít lidské lokace.');
 const weapon=s.weaponByActor[striker];
 assert(!strike||weapon&&int(weapon.impactDie,2,100),'Útočník nemá doloženou nasazenou zbraň pro zásah');
 const precision=s.kind==='melee'?s.precisionDice:outcome.precisionTA;
 const impact=s.kind==='melee'?s.impactTA:outcome.impactTA;
 const indirect=s.kind==='missile'&&(outcome.attackType==='volley'||outcome.chosenTargetIndex!=null);
 const sourceWeapon=weapon?{...weapon,zoneDie:s.kind==='missile'?(indirect?Math.max(10,s.participants[target]?.zoneCount??10):outcome.range?.zd):weapon.zoneDie}:null;
 // The striker may be the COUNTERSTRIKING defender; protection reduction
 // must follow the weapon that actually hit, never the initial attacker.
 const reduction=sourceWeapon?.armourReduction??s.armourReduction;
 assert(int(reduction,0,99),'Zbraň neobsahuje platný Armour Reduction');
 // HMK p.165 resolves the Injury Sequence BEFORE the Melee CF Mishaps.
 // Only the subordinate Injury resolver is masked; the authoritative original
 // outcome and both pending Mishaps remain signed on the attack journey.
 const safeOutcome=s.kind==='melee'?{...outcome,attackerMishap:null,defenderMishap:null,
  weaponDamageResolved:!!s.weaponDamageProof||!outcome.weaponDamageCheck}:outcome;
 const hit=createGuidedFullHit({id:s.id,timelineId:s.timelineId,round:s.round,
  attackerId:s.attackerId,defenderId:s.kind==='melee'?s.defenderId:target,kind:s.kind,outcome:safeOutcome,
  weapon:sourceWeapon,aimZN:s.aimZN,precisionDice:precision,impactTA:impact,
  armourReduction:reduction,direction:outcome.counterStrike?s.counterDirection:
   s.kind==='missile'&&s.missileActualTargetId!==s.defenderId?s.missileActualDirection:s.direction,
  opponents:outcome.counterStrike?s.counterOpponents:
   s.kind==='missile'&&s.missileActualTargetId!==s.defenderId?s.missileActualOpponents:s.opponents,
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
   if(gate.counterStrike){
    return {...s,meleeSession:m,finalAttack:copy(gate),physicalDice:finished.physicalDice,
     phase:'counter-direction'};
   }
   if(gate.weaponDamageCheck){
    assert(s.weaponItemIds?.[s.attackerId]&&s.weaponItemIds?.[s.defenderId],
     'Poškození zbraně vyžaduje skutečně vybrané zbraně obou účastníků');
    const rolls=finished.physicalDice;
    const a=rolls.find(x=>x.id==='attackerRoll')?.value;
    const d=rolls.find(x=>x.id==='defenderRoll')?.value;
    const weaponDamageSession=createGuidedBlockWeaponDamage({id:s.id+':wq',timelineId:s.timelineId,round:s.round,
     attackerId:s.attackerId,defenderId:s.defenderId,gate,attackerRoll:a,defenderRoll:d,
     attackerEML:s.meleeSession.attackerEML,defenderEML:s.meleeSession.defenderEML,
     inventory:s.inventory,attackerItemId:s.weaponItemIds[s.attackerId],
     defenderItemId:s.weaponItemIds[s.defenderId],weaponByActor:s.weaponByActor,sourceSignature:s.sourceSignature});
    return {...s,meleeSession:m,finalAttack:copy(gate),physicalDice:finished.physicalDice,
     weaponDamageSession,phase:'melee-weapon-damage'};
   }
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
 if(s.phase==='melee-weapon-damage'){
  const next=submitGuidedBlockWeaponDamageDie(s.weaponDamageSession,v);
  const pending={...s,weaponDamageSession:next};
  return guidedBlockWeaponDamageRequirement(next).kind==='complete'
   ?transitionToHit({...pending,weaponDamageProof:true},s.finalAttack,s.physicalDice):pending;
 }
 if(s.phase==='hit')return {...s,hitSession:submitGuidedFullHitDie(s.hitSession,v)};
 throw Error('Nepovolený krok');
}
export function chooseGuidedAttack(s,value){
 const req=guidedAttackRequirement(s);assert(req.kind==='choice','Nyní se nevybírá pravidlová volba');
 const picked=String(value);assert(req.choices.some(x=>String(x.value??x)===picked),'Tato volba není v nabídce');
 if(s.phase==='missile-hit-direction')return {...s,missileActualDirection:picked,phase:'missile-hit-opponents'};
 if(s.phase==='counter-direction')return {...s,counterDirection:picked,phase:'counter-opponents'};
 if(s.phase==='melee'){
  const m=chooseGuidedMeleeDefence(s.meleeSession,picked);
  return {...s,meleeSession:m};
 }
 if(s.phase==='melee-weapon-damage')return guidedBlockWeaponDamageRequirement(s.weaponDamageSession);
 if(s.phase==='melee-ta'){
  const [impact,precision]=picked.split(':').map(Number);
  assert(int(impact,0,3)&&int(precision,0,4),'Neplatné využití TA');
  const next={...s,impactTA:impact,precisionDice:precision};
  return transitionToHit(next,s.finalAttack,s.physicalDice);
 }
 if(s.phase==='missile'){
  if(req.id.startsWith('missile-slot-')){
   const category=req.id.split('-')[2];
   const key=category==='target'?'targetSlots':category==='nearby'?'nearbySlots':'deviationSlots';
   return advanceGuidedAttack({...s,[key]:[...(s[key]??[]),picked]});
  }
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
/** A counterstrike reverses the actual strike direction. The original
 * attack's angle and opponent count cannot be reused for its target. */
export function submitGuidedAttackFact(s,raw){
 const req=guidedAttackRequirement(s);
 assert(req.kind==='input'&&['counterstrike-opponents','missile-actual-opponents','deviationTargetCount'].includes(req.id),
  'Žádný prostorový fakt není nyní splatný');
 const str=String(raw);
 assert(/^\d+$/.test(str),'Počet nebo TAR pozice musí být celé číslo');
 const n=Number(str);assert(int(n,req.min??1,req.max??100),'Skutečný prostorový údaj je mimo rozsah');
 if(req.id==='deviationTargetCount')return advanceGuidedAttack({...s,deviationTargetCount:n});
 if(req.id==='missile-actual-opponents'){
  const next={...s,missileActualOpponents:n};
  return transitionToHit(next,next.finalAttack,next.physicalDice);
 }
 const next={...s,counterOpponents:n};
 if(s.finalAttack?.extraTA>0)return {...next,phase:'melee-ta'};
 return transitionToHit(next,s.finalAttack,s.physicalDice);
}
function completedMissileToHit(s,r){
 let targetId=s.defenderId;
 if(r.hit===true){
  const directNearby=r.attackType==='direct'&&r.chosenTargetIndex!=null;
  const volley=r.attackType==='volley';
  if(directNearby||volley){
   const slots=directNearby?(s.nearbySlots??[]):(r.deviation?(s.deviationSlots??[]):(s.targetSlots??[]));
   const index=r.chosenTargetIndex;
   assert(int(index,1,200)&&index<=slots.length,'Výsledek d20/d10 nemá předem doloženou TAR pozici');
   targetId=slots[index-1];
   assert(s.participants[targetId]?.state,'Skutečně zasažený cíl nemá doložený bojový stav');
  }
 }
 const n={...s,missileActualTargetId:targetId,finalAttack:{...r,actualTargetId:targetId}};
 if(r.hit===true&&targetId!==s.defenderId)return {...n,phase:'missile-hit-direction'};
 return transitionToHit(n,n.finalAttack,n.physicalDice);
}
export function advanceGuidedAttack(s){
 if(s.phase==='missile'){
  const req=missileStep(s);
  if(req.kind==='automatic'&&req.id==='finish-missile')return completedMissileToHit(s,req.resolution);
 }
 if(s.phase==='hit')return {...s,hitSession:advanceGuidedFullHit(s.hitSession)};
 return s;
}
export function completeGuidedAttack({session,currentState,sourceSignature,currentInventory=null}={}){
 assert(session?.phase==='hit'&&session.hitSession,'Původní útok ještě nebyl uzavřen');
 const hit=finalizeGuidedFullHit({session:session.hitSession,currentState,sourceSignature});
 if(!session.weaponDamageSession)return hit;
 const wq=completeGuidedBlockWeaponDamage({session:session.weaponDamageSession,
  currentInventory:currentInventory??session.inventory,sourceSignature});
 return {...hit,weaponDamage:wq,inventory:wq.inventory};
}
