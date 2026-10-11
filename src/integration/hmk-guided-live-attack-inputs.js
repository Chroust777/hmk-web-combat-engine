/** HMK World of Kèthîra pp.97,112,158–170.
 * A strict adapter from ACTUAL equipped character records to the guided attack
 * state machine. Never ask the referee to calculate an EML, Impact or SL.
 * If a mechanical prerequisite is missing, refuse the attack rather than use 0.
 * Situations not covered by this subset (defensive Dodge/counterstrike, exotic
 * reach, special traits, etc.) remain in the established full combat forms.
 */
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals,initialCombatState} from './persistent-combat-state.js';
import {strengthImpactModifier,heftPenalty,twoHandedImpactBonus} from '../rules/weapon-modes.js';
import {verifiedImpactTA,verifiedMeleeModifiers} from './melee-verified-modifiers.js';
import {qualityImpactPenalty} from '../rules/weapon-damage.js';
import {resolveCharacterReachSizeModifier} from './character-reach-size.js';
import {reachFromSelectedEquipment} from './melee-auto-reach.js';
import {verifiedReachEMLModifiers} from './melee-reach.js';
import {outnumberedEMLModifier} from './melee-outnumbered.js';
import {proneMeleeEMLModifier} from './melee-position-modifiers.js';
import {assembleMeleeEML} from './melee-eml.js';
import {createGuidedAttackJourney} from './hmk-guided-attack-journey.js';
import {verifiedLoadedProjectileBallistics} from './hmk-guided-missile-preparation.js';
import {resolveCrossbowArcheryChoice} from './hmk-crossbow-archery-choice.js';
const must=(test,text)=>{if(!test)throw Error(text)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
// Printed HMK weapon tables encode the Zone Die as e.g. 'd6', not always 6.
const printedDie=x=>Number.isSafeInteger(x)?x:(typeof x==='string'&&/^d(?:4|6|8|10|12|20)$/.test(x)?Number(x.slice(1)):null);
const skill=(person,skillId)=>{
 const match=person?.hmk?.skills?.filter(s=>s.id===skillId)??[];
 must(match.length===1&&int(match[0].ml,0,200),`Postava ${person?.name||'?'} nemá jednoznačně doloženou dovednost ML`);
 return match[0];
};
function held(inventory,id,itemId){
 const match=inventory.filter(i=>i.id===itemId&&i.characterId===id&&['main_hand','off_hand'].includes(i.slot));
 must(match.length===1&&match[0].snapshot?.category==='weapon','Vybraná zbraň není skutečně nasazena v ruce účastníka');
 const w=match[0],p=w.snapshot.properties??{},m=p.verifiedModes;
 must(Array.isArray(m)&&m.length===1,'Zbraň musí mít právě jeden ověřený základní Strike Mode');
 const x=m[0],zoneDie=printedDie(x.zoneDie??p.zoneDie);must(/^d(?:4|6|8|10|12|20)$/.test(String(x.impactDie))&&int(x.impactModifier,-30,30)&&
  ['b','e','p','f'].includes(x.aspect)&&[4,6,8,10,12,20].includes(zoneDie),
  'Zbraň nemá plně doložený Impact Die, Zone Die nebo aspekt z HMK');
 must(int(p.quality,0,100)&&int(w.currentWQ,0,100),'Chybí základní nebo aktuální Weapon Quality');
 must(!w.destroyed&&w.currentWQ>0,'Zničenou zbraň nelze použít');
 return {record:w,mode:x,impactDie:Number(x.impactDie.slice(1)),zoneDie};
}
function validatedActor({person,state,inventory,weaponId,skillId,usedArms,round,timelineId,threateningFoes=1}){
 must(person&&state&&int(round,1,9999),'Chybí skutečná postava nebo bojové kolo');
 must(state.shock==='NONE',`${person.name}: speciální akci pod Shock musí vyhodnotit pravidlové omezení`);
 must(state.morale?.state===undefined||['steady','brave', 'STEADY','BRAVE'].includes(state.morale.state),
  `${person.name}: nevyřešený Morale mění přípustné akce`);
 const w=held(inventory,person.id,weaponId),chosenSkill=skill(person,skillId);
 must(String(chosenSkill.name??'').trim().toLowerCase()==='melee',
  `${person.name}: Melee Strike/Block vyžaduje skutečnou dovednost Melee, nikoli jinou vybranou ML`);
 const str=person.hmk?.attributes?.str;
 must(int(str,1,200),`${person.name}: chybí ověřená Strength`);
 const load=resolveCombatantLoad({character:person,inventory});
 must(load.encReady&&load.bulkReady&&load.ready,`${person.name}: ENC/Bulk nelze určit bez ověřených vrstev a hmotností (${(load.issues||[]).join('; ')})`);
 const arms=usedArms==='both'?['left','right']:usedArms==='left'||usedArms==='right'?[usedArms]:null;
 must(arms,`${person.name}: hráč musí určit použitou ruku`);
 const trauma=projectLiveInjuries({state,round,test:'melee',usedArms:arms,timelineId});
 must(trauma.ready&&!trauma.unusable,`${person.name}: zranění nepovoluje tento Melee test (${trauma.reason||trauma.unusableWoundIds?.join(', ')})`);
 must(!trauma.stunned,`${person.name}: Stunned mění Success Level a dostupné obrany`);
 const size=resolveCharacterReachSizeModifier(person);
 must(size.ok,`${person.name}: Creature Size Reach modifier není ověřen`);
 const reach=reachFromSelectedEquipment(inventory,person.id,weaponId,{sizeReachModifier:size.value});
 must(reach.ok,`${person.name}: neověřený dosah zbraně (${reach.reason})`);
 const traitsAttack=verifiedMeleeModifiers(w.record.snapshot,{role:'attack',threateningFoeCount:threateningFoes});
 const traitsBlock=verifiedMeleeModifiers(w.record.snapshot,{role:'defence',defence:'block',threateningFoeCount:threateningFoes});
 must(traitsAttack.ok&&traitsBlock.ok,`${person.name}: nelze doložit všechny Melee/Block Traits`);
 const foe=outnumberedEMLModifier(threateningFoes);
 must(foe.ok,`${person.name}: neověřený počet protivníků`);
 const prone=proneMeleeEMLModifier({prone:state.posture?.prone===true});
 must(prone.ok,`${person.name}: neznámé omezení Prone`);
 const fatigue=combatFatigueTotals(state).total;
 must(int(fatigue,0,1000),`${person.name}: neověřená Fatigue`);
 const mode=w.mode;
 must(!mode.twoHanded||usedArms==='both',`${person.name}: obouruční zbraň potřebuje obě paže`);
 const heft=mode.heft??w.record.snapshot.properties.heft;
 must(int(heft,0,100),`${person.name}: nelze doložit Heft pro správný Melee modifikátor`);
 const offHand=w.record.slot==='off_hand';
 const heftResult=heftPenalty({str,hft:heft,twoHanded:!!mode.twoHanded,offHand});
 const quality=qualityImpactPenalty({baseWQ:w.record.snapshot.properties.quality,currentWQ:w.record.currentWQ});
 const ta=verifiedImpactTA({aspect:mode.aspect,count:1,override:w.record.snapshot.properties.impactTAModifier??null});must(ta.ok,`Chybí Impact TA pro aspekt ${mode.aspect}`);
 // HMK weapon-table Armour Reduction belongs to the CURRENT strike aspect.
 // In particular p.99 Pickaxe is Point AR3; do not silently replace it by 0.
 const arEntry=mode.armourReduction??w.record.snapshot.properties.armourReduction;
 const arValue=arEntry==null?0:(Number.isSafeInteger(arEntry)?arEntry:arEntry[mode.aspect]);
 must(int(arValue,0,30),`${person.name}: neověřený Armour Reduction zvoleného Strike Mode`);
 return {person,state,w,skill:chosenSkill,reach:reach.rch,load,trauma,foe,prone,fatigue,heft:heftResult.penalty,
  traitsAttack,traitsBlock,quality,weapon:{impactDie:w.impactDie,zoneDie:w.zoneDie,aspect:mode.aspect,
   armourReduction:arValue,modifier:mode.impactModifier+strengthImpactModifier(str)+(offHand?-1:0)+quality+
    twoHandedImpactBonus({str,listedHft:heft,twoHanded:!!mode.twoHanded}),impactTABonus:ta.bonus}};
}
function eml(a,role,reach){
 const traits=role==='attack'?a.traitsAttack:a.traitsBlock;
 const values=[{label:'ENC',value:a.load.agilityAndMeleePenalty},{label:'Bulk',value:a.load.meleeBulkPenalty},
  {label:'Fatigue',value:-a.fatigue},{label:'Injury Impairment',value:a.trauma.modifier},
  ...traits.modifiers,{label:'Outnumbered',value:a.foe.value},
  {label:'Prone',value:a.prone.value},{label:'Heft',value:a.heft},
  {label:'Reach',value:reach}];
 must(values.every(x=>Number.isSafeInteger(x.value)),'Vstupy Melee EML nejsou kompletní');
 const result=assembleMeleeEML({baseML:a.skill.ml,modifiers:values});must(result.ok,`Nelze sestavit Melee EML: ${result.reason}`);
 return result;
}
/** Supported live subset: primary-mode Melee Strike vs Ignore/Block.
 * No self-certified skill, unverified armour, guessed reach, default dice or manual EML.
 * Contextual situations such as In Close / mounted / free reach changes must be
 * represented by an authoritative persisted state, not a guessed checkbox. */
export function createLiveGuidedMelee({id,timelineId,round,attacker,defender,attackerWeaponId,defenderWeaponId,
 attackerSkillId,defenderSkillId,attackerUsedArms,defenderUsedArms,inventory,direction,opponents=1,
 attackerFoes=1,defenderFoes=1,aimZN=1,sourceSignature}={}){
 must(attacker?.id!==defender?.id&&attacker&&defender,'Chybí odlišný útočník a obránce');
 const a=validatedActor({person:attacker,state:attacker.hmk?.combatState??initialCombatState(),inventory,weaponId:attackerWeaponId,
  skillId:attackerSkillId,usedArms:attackerUsedArms,round,timelineId,threateningFoes:attackerFoes});
 const d=validatedActor({person:defender,state:defender.hmk?.combatState??initialCombatState(),inventory,weaponId:defenderWeaponId,
  skillId:defenderSkillId,usedArms:defenderUsedArms,round,timelineId,threateningFoes:defenderFoes});
 const reach=verifiedReachEMLModifiers({attackerRCH:a.reach,defenderRCH:d.reach,inClose:false});
 must(reach.ok,'Nelze matematicky vyhodnotit Reach');
 // When In Close is not persisted, allow only equal RCH (no silent reach assumption).
 must(a.reach===d.reach,'Různý dosah vyžaduje doložený In Close stav; nelze jej odhadnout');
 const ae=eml(a,'attack',reach.attacker),de=eml(d,'block',reach.defender),dc=eml(d,'attack',reach.defender);
 const shock=who=>{const matches=(who.person.hmk?.skills||[]).filter(s=>String(s.name).toLowerCase()==='shock');
  must(matches.length===1&&int(matches[0].ml,0,200),`${who.person.name}: chybí Shock ML`);
  return matches[0].ml;};
 const participants=Object.fromEntries([a,d].map(x=>[x.person.id,{state:x.state,shockML:shock(x),strengthML:x.person.hmk.attributes.str*5}]));
 const session=createGuidedAttackJourney({id,timelineId,round,attackerId:attacker.id,defenderId:defender.id,
  kind:'melee',sourceSignature,participants,inventory,direction,opponents,aimZN,
  melee:{attackerEML:ae.effectiveEML,defenderEML:de.effectiveEML,
   attackerML:a.skill.ml,defenderML:d.skill.ml,
   defenderEMLByDefence:{block:de.effectiveEML,counterstrike:dc.effectiveEML},
   defenderMLByDefence:{block:d.skill.ml,counterstrike:d.skill.ml},allowedDefences:['ignore','block','counterstrike']},
  weaponByActor:{[attacker.id]:a.weapon,[defender.id]:d.weapon},
  weaponItemIds:{[attacker.id]:a.w.record.id,[defender.id]:d.w.record.id},
  usedArms:{[attacker.id]:attackerUsedArms,[defender.id]:defenderUsedArms}});
 return {session,preflight:{attackerEML:ae,defenderEML:de,weaponByActor:{[attacker.id]:a.w.record.id,[defender.id]:d.w.record.id},
  source:'HMK pp.97,112,158–170; selected actual skills & equipped inventory',restrictions:['Primary Strike Mode only','Ignore or Block only','No unverified In Close, mounted context or situational TA']}};
}

/** Direct/Volley from a certified missile snapshot: all factors from the
 * owned item and the declaring player's observed battlefield context.
 * Missing projectile metadata cannot be repaired by typed-in arbitrary Impact. */
export function createLiveGuidedMissile({id,timelineId,round,attacker,defender,weaponId,skillId,
 inventory,direction,opponents=1,aimZN=1,sourceSignature,distance,targetMovement='still',potentialTargets=[],
 targetCount=0,nearbyTargetCount=0,windforce=0,crosswind=false,movingShooter=false,effectiveDodgeIndex=null,chargingThrow=false,chargeMovementFeet=null,attackerBulkConfirmation=null,attackerUsedArms=null,loadedProjectile=null,aimBonus=0,crossbowBasis=null}={}){
 must(attacker?.id&&defender?.id&&attacker.id!==defender.id,'Chybí střelec a skutečný cíl');
 const shot=held(inventory,attacker.id,weaponId);
 const p=shot.record.snapshot.properties;
 const type=p.missileType??shot.mode.missileType;
 must(['bow','crossbow','sling','thrown'].includes(type),'Zdrojová data zbraně neurčují typ Missile/Thrown');
 if(chargingThrow){must(type==='thrown'&&Number.isFinite(chargeMovementFeet)&&chargeMovementFeet>=20,
  'Charging Throw bonus vyžaduje skutečnou vrhací zbraň a alespoň 20 stop Charge');}
 if(chargeMovementFeet!==null)must(type==='thrown'&&Number.isFinite(chargeMovementFeet)&&chargeMovementFeet>0,
  'Vzdálenost Charge musí být ověřená skutečná trasa');
 // Printed HMK catalogue and older verified custom weapon rows use
 // baseRangeFt; the legacy Missile preview already reads this same property.
 // A second contradictory Base Range is not a fact to guess between.
 must((p.baseRangeFt==null||p.baseRange==null||p.baseRangeFt===p.baseRange),
  'Dva rozporné Base Range údaje téže zbraně');
 const baseRange=p.baseRangeFt??p.baseRange;
 must(Number.isFinite(baseRange)&&baseRange>0,'Zdrojová data zbraně neobsahují ověřený Base Range');
 const s=skill(attacker,skillId),str=attacker.hmk?.attributes?.str;
 const requiredSkill=type==='sling'?'slings':type==='thrown'?'throwing':'archery';
 must(String(s.name??'').trim().toLowerCase()===requiredSkill,
  `${attacker.name}: ${type} vyžaduje dovednost ${requiredSkill}, nikoli jinou vybranou ML`);
 must(type==='crossbow'||crossbowBasis===null,
  'Archery SB × 3 lze vybrat pouze pro skutečnou kuši');
 const crossbowChoice=type==='crossbow'?resolveCrossbowArcheryChoice({character:attacker,
  archerySkill:s,basis:crossbowBasis}):null;
 const attackML=crossbowChoice?.baseML??s.ml;
 must(int(str,1,200),'Střelec nemá STR');
 // HMK p.112: sensory headgear impairs PER-based Archery/Slings/Throwing.
 // HMK p.170: all four body zones are relevant to these Impaired tests.
 // Modified ENC affects AGL-based tests, NOT Archery/Slings/Throwing directly.
 // Never infer a missing printed-suit Bulk assessment as zero.
 const shooterLoad=resolveCombatantLoad({character:attacker,inventory,bulkConfirmation:attackerBulkConfirmation});
 must(shooterLoad.ready&&Number.isSafeInteger(shooterLoad.perceptionPenalty)&&
  Number.isSafeInteger(shooterLoad.meleeBulkPenalty),
  `${attacker.name}: neověřené ENC/Bulk nebo postih vnímání střelce (${(shooterLoad.issues||[]).join('; ')||'chybí ověřené zóny Bulk tištěného kompletu'})`);
 const targetState=defender.hmk?.combatState??initialCombatState();
 const attackerState=attacker.hmk?.combatState??initialCombatState();
 must(attackerState.shock==='NONE','Shock střelce mění oprávnění ke střelbě');
 // HMK p.170: Archery, Slings and Throwing are Impaired Tests. Minor and
 // Serious wounds modify the final test; they do NOT make firing illegal.
 // The affected arm(s) must come from the player's observed use of the
 // weapon, not from an inferred dominant hand. A Grievous required zone
 // cannot be treated as merely a numeric penalty or a normal success.
 const missileSkillTest=type==='sling'?'slings':type==='thrown'?'throwing':'archery';
 const missileArms=attackerUsedArms==='both'?['left','right']:
  ['left','right'].includes(attackerUsedArms)?[attackerUsedArms]:null;
 const injury=projectLiveInjuries({state:attackerState,round,test:missileSkillTest,
  usedArms:missileArms,timelineId});
 must(injury.ready,`${attacker.name}: účinky Injury pro Missile nelze ověřit (${injury.reason})`);
 // HMK p.170: a required Grievous zone makes the action automatic CF.
 // A head/area injury imposes BOTH automatically failed Fumble and Stumble,
 // while an arm gives Fumble and torso/legs Stumble. Resolve the complete
 // aftermath instead of blocking the action or requesting a fictitious d100.
 const unusableZones=injury.affected.filter(x=>x.unusable);
 // Multiple simultaneous unusable zones do not specify whether to repeat
 // the same automatic Mishap: block rather than invent a stacking policy.
 must(unusableZones.length<=1,
  `${attacker.name}: více Grievous zranění současně – násobení automatických Mishaps není v HMK jednoznačně určeno`);
 const forcedMissileMishaps=injury.unusable?[...new Set(unusableZones.flatMap(w=>
  w.mishap.filter(k=>k==='automatic-fumble'||k==='automatic-stumble')
    .map(k=>k==='automatic-fumble'?'fumble':'stumble')))]:[];
 must(!injury.unusable||forcedMissileMishaps.length>0,
  'Grievous Missile CF nemá doložený povinný zónový Mishap');
 must(Number.isSafeInteger(injury.modifier),
  `${attacker.name}: nevypočitatelný Impairment pro Missile`);
 const defenderFolk=String(defender.hmk?.folk??'').trim().toLowerCase();
 must(['human','human-sized','human sized','human folk'].includes(defenderFolk),
  'Missile Injury pro tohoto tvora nemá připojenou jeho vlastní anatomickou tabulku; nelze použít lidské lokace');
 const shockSkill=(defender.hmk?.skills??[]).filter(x=>String(x.name).toLowerCase()==='shock');
 must(shockSkill.length===1&&int(shockSkill[0].ml,0,200),'Cíl nemá doložený Shock ML');
 const strength=defender.hmk?.attributes?.str;
 must(int(strength,1,200),'Cíl nemá doloženou STR');
 must(int(distance,0,100000)&&int(opponents,1,100)&&int(targetCount,0,200)&&int(nearbyTargetCount,0,200),
  'Chybí ověřená vzdálenost nebo počty cílů');
 must(int(windforce,0,12)&&typeof crosswind==='boolean'&&typeof movingShooter==='boolean',
  'Chybí skutečné podmínky větru a pohybu střelce');
 must(['still','moving','evading'].includes(targetMovement),'Neznámý pohyb cíle');
 if(targetMovement==='evading')must(int(effectiveDodgeIndex,0,20),
  'Evading Target vyžaduje doložený Effective Dodge Index z platné Evade akce');
 // No guessed injury/encumbrance EML: the resolver itself handles range, wind,
 // movement, draw strength and actual projectile Impact rolls.
 const fatigue=combatFatigueTotals(attackerState).total;
 const ballistic=loadedProjectile===null?null:verifiedLoadedProjectileBallistics({weaponType:type,loaded:loadedProjectile});
 const improvisedSlingRock=type==='sling'&&ballistic?.slingProjectileForm==='improvised-rock';
 must(!improvisedSlingRock||baseRange>30,'Improvised sling rock needs BR > 30 ft (HMK p.110)');
 // HMK printed p.110 lists distinct throwing impacts for four Melee weapons.
 // A thrown Javelin, for example, has d8+2p, not its Melee d8+4p.
 const thrownMode=type==='thrown'?p.printedThrowingMode??null:null;
 if(thrownMode){
  must(thrownMode.source==='HMK p.110 / Thrown Weapons'&&
   thrownMode.impactDie==='d8'&&int(thrownMode.impactModifier,-20,20)&&
   ['p','e'].includes(thrownMode.aspect)&&[6,8].includes(thrownMode.pbZoneDie)&&
   thrownMode.baseRangeFt===baseRange&&thrownMode.heft===p.heft&&
   thrownMode.volleyMaxMultiplier===2,'Ověřený vrhací Strike Mode HMK str.110 nesouhlasí');
 }
 const missileStrikeMode=thrownMode??shot.mode;
 const projectileDie=ballistic?.impactDieSides??(thrownMode?8:shot.impactDie);
 const projectileAR=ballistic?.armourReduction??0;
 const projectileTA=ballistic?.impactTAValue;
 const ta=verifiedImpactTA({aspect:missileStrikeMode.aspect,count:1,override:projectileTA??null});
 must(ta.ok,'Nedoložený Missile Impact TA');
 const participants={
  [attacker.id]:{state:attackerState,shockML:0,strengthML:str*5},
  [defender.id]:{state:targetState,shockML:shockSkill[0].ml,strengthML:strength*5,zoneCount:10}};
 // Every possible secondary target must be a real, still-current combatant.
 // The human injury location table has 10 zones; nonhuman Anatomy must not
 // be silently mapped to the human table.
 for(const other of potentialTargets){
  if(!other?.id||other.id===attacker.id||other.id===defender.id)continue;
  const folk=String(other.hmk?.folk??'').trim().toLowerCase();
  if(!['human','human-sized','human sized','human folk'].includes(folk))continue;
  const ml=(other.hmk?.skills??[]).filter(x=>String(x.name).toLowerCase()==='shock');
  const strength=other.hmk?.attributes?.str;
  if(ml.length!==1||!int(ml[0].ml,0,200)||!int(strength,1,200))continue;
  participants[other.id]={state:other.hmk?.combatState??initialCombatState(),shockML:ml[0].ml,strengthML:strength*5,zoneCount:10};
 }
 must([0,10].includes(aimBonus),'Aim bonus musí pocházet výhradně z platné Initiative události');
 const missile={weaponType:type,distance,baseRange:baseRange-(improvisedSlingRock?30:0),ml:attackML,impactDieSides:projectileDie,
  volleyMaxMultiplier:ballistic?.volleyMaxMultiplier??thrownMode?.volleyMaxMultiplier??p.volleyMaxMultiplier??null,
  thrownPbZD:thrownMode?.pbZoneDie??null,bluntHead:!!ballistic?.bluntHead,
  weaponImpactModifier:missileStrikeMode.impactModifier+qualityImpactPenalty({baseWQ:p.quality,currentWQ:shot.record.currentWQ}),
  strengthImpactModifier:type==='thrown'?strengthImpactModifier(str)-1:type==='sling'?strengthImpactModifier(str):0,
  impactTAValue:ta.bonus,staffSlingConstrictedPB:type==='sling'&&p.slingType==='staff',improvisedSlingRock,targetMovement,effectiveDodgeIndex:targetMovement==='evading'?effectiveDodgeIndex:null,
  targetCount,nearbyTargetCount,windforce,crosswind,movingShooter,chargingThrow,aimedPreviousRound:aimBonus===10,
  forcedCF:injury.unusable,forcedCFMishaps:forcedMissileMishaps,
  forcedCFWoundIds:unusableZones.map(w=>w.id),
  // Missile EML resolver ADDS traumaPenalty; Fatigue must DECREASE EML.
  traumaPenalty:-fatigue+shooterLoad.perceptionPenalty+shooterLoad.meleeBulkPenalty+injury.modifier-(improvisedSlingRock?10:0),
  str,hft:p.heft??null,crossbowMasteryChoice:crossbowChoice};
 const weaponByActor={ [attacker.id]:{impactDie:projectileDie,zoneDie:thrownMode?.pbZoneDie??shot.zoneDie,aspect:missileStrikeMode.aspect,
  modifier:missile.weaponImpactModifier,impactTABonus:ta.bonus,armourReduction:projectileAR,
  broadBleedingBonus:ballistic?.broadBleedingBonus??0,
  isArrowOrBolt:type==='bow'||type==='crossbow'}};
 return {session:createGuidedAttackJourney({id,timelineId,round,attackerId:attacker.id,
  defenderId:defender.id,kind:'missile',sourceSignature,missile,participants,inventory,
  direction,opponents,aimZN,weaponByActor,weaponItemIds:{[attacker.id]:shot.record.id},
   usedArms:{[attacker.id]:attackerUsedArms}}),
  preflight:{source:'HMK pp112,117–118,163–164,170; actual missile skill and certified equipped weapon',
   missileType:type,baseRange,skillML:attackML,crossbowMasteryChoice:crossbowChoice,aimBonus,projectile:ballistic,
   printedThrowingMode:thrownMode,
   injury:{test:missileSkillTest,usedArms:injury.usedArms,impairment:injury.impairment,
    modifier:injury.modifier,affectedWoundIds:injury.affected.map(w=>w.id),
    forcedCF:injury.unusable,forcedMishaps:forcedMissileMishaps},
   load:{source:shooterLoad.mode,gearENC:shooterLoad.gearENC,modifiedENC:shooterLoad.modifiedENC,bulkPenalty:shooterLoad.meleeBulkPenalty,perceptionPenalty:shooterLoad.perceptionPenalty,fatiguePenalty:-fatigue},restrictions:['Projectile must carry verified Base Range and missileType','Unknown context is not inferred']}};
}
