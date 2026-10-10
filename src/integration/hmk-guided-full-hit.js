/**
 * HârnMaster: Roleplaying in the World of Kèthîra, printed pp.166–170.
 * An atomic, headless continuation of a verified Melee or Missile strike.
 * All die results come from a human. There are no hidden rolls, inferred
 * armour values, GM-assigned success levels or partial persistent writes.
 *
 * The caller must provide a signed, already-completed Attack/Defence or
 * Missile/Volley outcome. Follow-up Mishap, Morale and Shock Recovery are
 * queued by the persistent state modules; they are not silently auto-rolled.
 */
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {injuryFromEffectiveImpact,compoundInjury,bleedingEligibleForInjury,limbSideFromRoll} from '../rules/injury.js';
import {successLevel,SL} from '../rules/tests.js';
import {calculateShockState,applyShockState,SHOCK_STATE} from '../rules/shock.js';
import {hmkHumanLocationSymbols,hmkAmputationAssessment} from './injury-special-hmk.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {applyConfirmedHit,validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';

const assert=(condition,message)=>{if(!condition)throw Error(message)};
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const STATE_CODES={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
const SL_NAME={0:'CF',1:'F',2:'S',3:'CS'};
const LOCATION_ROWS=Object.freeze({
 head:[['sk',1,5,5],['fa',6,8,4],['nk',9,10,5]],
 arms:[['sh',1,3,3],['ua',4,6,1],['el',7,7,2],['fo',8,9,1],['ha',10,10,2]],
 torso:[['tx',1,4,4],['ab',5,7,4],['pv',8,10,4]],
 legs:[['th',1,4,3],['kn',5,5,2],['ca',6,8,1],['ft',9,10,2]]
});
const ZONE=zn=>zn===1?'head':zn<=3?'arms':zn<=7?'torso':zn<=10?'legs':null;
const safeProof=proof=>Array.isArray(proof)&&proof.every(x=>integer(x?.value,1,x?.faces)&&typeof x?.source==='string'&&x.source.includes('physical-die'));
const clone=structuredClone;
const noMutation=session=>({...session});
const die=(id,faces,label,actorId)=>({kind:'die',id,faces,label,actorId});
const stateSignature=x=>JSON.stringify(x);
const requiresSide=x=>['arms','legs'].includes(x);

/** The signed strike is supplied by a separate, completed verified rules resolver.
 * For melee: `outcome` is the actual `resolveMeleeAttackGate` result.
 * For missile: `outcome` is the completed `resolveHMKMissileAttack` result.
 * Weapon impact configuration must match the currently equipped weapon and
 * must be attested again before storage. The caller cannot pass free-form AV. */
export function createGuidedFullHit({id,timelineId,round,attackerId,defenderId,kind,outcome,
 weapon,aimZN=1,precisionDice=0,impactTA=0,armourReduction=0,direction,
 opponents=1,inventory,targetState,shockML,strengthML,sourceSignature,physicalDice=[]}={}){
 assert(typeof id==='string'&&id&&typeof timelineId==='string'&&timelineId&&typeof sourceSignature==='string'&&sourceSignature,'Chybí identita nebo podpis původní akce');
 assert(integer(round,1,9999)&&typeof attackerId==='string'&&typeof defenderId==='string'&&attackerId!==defenderId,'Neplatní účastníci');
 assert(['melee','missile'].includes(kind),'Jen doložený Melee nebo Missile/Volley');
 assert(outcome?.ok===true&&kind==='melee'||kind==='missile'&&outcome?.complete===true,'Attack/Defence nebo Missile ještě není pravidlově uzavřeno');
 assert(safeProof(physicalDice)&&physicalDice.length>0,'Chybí doložené skutečné hody původního útoku');
 assert(targetState&&typeof targetState==='object','Chybí trvalý stav zasažené postavy');
 validateCombatState(targetState);
 assert(targetState.shock!=='KIA','Mrtvé postavě nelze znovu připsat zásah');
 assert(integer(aimZN,1,10)&&integer(precisionDice,0,4)&&integer(impactTA,0,3),'Neplatné Aim / Precision / Impact TA');
 assert(integer(armourReduction,0,99)&&['front','rear','side'].includes(direction)&&integer(opponents,1,100),'Chybí směr zásahu nebo okolnosti ochrany');
 assert(Array.isArray(inventory),'Chybí skutečný inventář cíle');
 assert(integer(shockML,0,200)&&integer(strengthML,0,200),'Chybí doložené Shock a Strength ML cíle');
 let strikerId=attackerId,targetId=defenderId;
 let strike=false,stars=0;
 if(kind==='melee'){
  assert(outcome.striker===null||outcome.striker==='attacker'||outcome.striker==='defender','Neznámý původce zásahu');
  strike=outcome.attackerStrike===true||outcome.counterStrike===true;stars=outcome.stars??0;
  if(outcome.striker==='defender'){strikerId=defenderId;targetId=attackerId;}
  assert(!outcome.attackerMishap&&!outcome.defenderMishap&&!outcome.weaponDamageCheck,
   'Před pokračováním musí být vyřešen okamžitý Melee Mishap nebo Weapon Damage');
  assert(impactTA<=Math.max(0,(outcome.extraTA??0)),'Impact TA nebyl získán');
  assert(precisionDice<=Math.max(0,(outcome.extraTA??0))-impactTA,'Precision TA nebyla získána');
 }else{
  strike=outcome.hit===true;stars=outcome.impactTA??0;
  assert(outcome.pending==null,'Missile/Volley vyžaduje nedokončený doplňkový hod nebo volbu');
  assert(precisionDice===(outcome.precisionTA??0),'Missile Precision TA musí odpovídat doloženému výsledku');
  assert(impactTA===(outcome.impactTA??0),'Missile Impact TA musí odpovídat doloženému výsledku');
 }
 if(strike){
  assert(weapon&&['b','e','p','f'].includes(weapon.aspect)&&integer(weapon.impactDie,2,100)&&Number.isSafeInteger(weapon.modifier),
   'Chybí ověřený Weapon Impact Die / aspekt');
  assert([4,6,8,10,12,20].includes(weapon.zoneDie),'Chybí ověřená Zone Die zbraně');
  if(kind==='melee')assert(integer(weapon.impactTABonus,0,30),'Chybí ověřený bonus Impact TA pro aspekt');
  if(armourReduction>0)assert(weapon.aspect==='p','Armour Reduction pouze pro Point');
 }
 return {format:'hmk-guided-full-hit-v1',id,timelineId,round,attackerId,defenderId,
  strikerId,targetId,kind,outcome:clone(outcome),weapon:weapon?clone(weapon):null,
  aimZN,precisionDice,impactTA,armourReduction,direction,opponents,
  inventory:clone(inventory),targetState:clone(targetState),stateWitness:stateSignature(targetState),sourceSignature,
  shockML,strengthML,physicalDice:clone(physicalDice),phase:strike?'zone':'miss',
  zoneRolls:[],zoneChoice:null,locationRolls:[],locationChoice:null,location:null,
  side:null,directionalD10:null,impactRoll:kind==='missile'&&strike?0:null,compoundD10:null,amputationRoll:null,
  shockRoll:null,computed:null,blockedReason:null};
}
function zoneResults(s){return s.zoneRolls.map((roll,index)=>({index,zn:s.aimZN+roll-1,zone:ZONE(s.aimZN+roll-1)}));}
function chosenZone(s){const valid=zoneResults(s).filter(x=>x.zone);
 if(!valid.length)return null;
 return s.zoneChoice===null?valid.length===1?valid[0]:null:valid.find(x=>x.index===s.zoneChoice)??null;}
function locationCandidates(s){const z=chosenZone(s);if(!z)return [];
 return s.locationRolls.map((roll,index)=>{const rec=LOCATION_ROWS[z.zone].find(([name,lo,hi])=>roll>=lo&&roll<=hi);
  assert(rec,'HMK Location Die mimo rozsah vybrané zóny');return {index,code:rec[0],shock:rec[3],zone:z.zone,roll};});}
function selectedLocation(s){const places=locationCandidates(s);return s.locationChoice===null?places.length===1?places[0]:null:places.find(x=>x.index===s.locationChoice)??null;}
const sameSidePrior=(s,loc,side)=>s.targetState.wounds.filter(w=>!w.healed&&w.location===loc&&(!requiresSide(ZONE(s.aimZN+s.zoneRolls[s.zoneChoice??0]-1))||w.side===side));

export function guidedFullHitRequirement(s){
 assert(s?.format==='hmk-guided-full-hit-v1','Neplatná pravidlová posloupnost');
 if(s.phase==='miss')return {kind:'complete',strike:false};
 if(s.phase==='zone'){
  if(s.zoneRolls.length<1+s.precisionDice)return die('zoneDie',s.weapon.zoneDie,'Body Zone Die (HMK p167)',s.strikerId);
  const zones=zoneResults(s).filter(x=>x.zone);
  if(zones.length===0)return {kind:'automatic',id:'zone-miss',label:'Zone Die míjí tělo cíle'};
  if(zones.length>1&&s.zoneChoice===null)return {kind:'choice',id:'zone-choice',choices:zones.map(x=>({value:String(x.index),label:`ZD ${x.roll}: ZN${x.zn} (${x.zone})`}))};
  const z=chosenZone(s),count=zoneResults(s).filter(x=>x.zone===z.zone).length;
  if(s.locationRolls.length<count)return die('locationDie',10,'Location Die d10 (HMK p167)',s.strikerId);
  if(count>1&&s.locationChoice===null)return {kind:'choice',id:'location-choice',choices:locationCandidates(s).map(x=>({value:String(x.index),label:`LD ${x.roll}: ${x.code}`}))};
  return {kind:'automatic',id:'finish-location'};
 }
 if(s.phase==='directional')return die('directionalD10',10,'Směrová ochrana d10 (HMK p118)',s.targetId);
 if(s.phase==='impact')return s.kind==='missile'?{kind:'automatic',id:'missile-impact-already-rolled'}:die('impactRoll',s.weapon.impactDie,`Weapon Impact d${s.weapon.impactDie} (HMK p167)`,s.strikerId);
 if(s.phase==='compound')return die('compoundD10',10,'Compound Injury d10 (HMK p168)',s.targetId);
 if(s.phase==='amputation')return die('amputationRoll',100,'Amputation Strength d100 (HMK p168)',s.targetId);
 if(s.phase==='shock')return die('shockRoll',100,'Shock d100 (HMK p169)',s.targetId);
 if(s.phase==='ready')return {kind:'complete',strike:true,computed:s.computed};
 throw Error('Neznámý krok HMK Injury Sequence');
}

/** Automatic advances perform no die rolls and no writes. */
export function advanceGuidedFullHit(s){
 let n=noMutation(s);
 if(n.phase==='zone'){
  const q=guidedFullHitRequirement(n);
  if(q.kind==='automatic'&&q.id==='zone-miss')return {...n,phase:'miss',computed:{reason:'zone-die-miss'}};
  if(q.kind==='automatic'&&q.id==='finish-location'){
   const loc=selectedLocation(n);assert(loc,'Zóna / lokace není jednoznačně doložena');
   const z=chosenZone(n);const side=requiresSide(z.zone)?limbSideFromRoll(loc.roll):null;
   const unknown=n.targetState.wounds.some(w=>!w.healed&&w.location===loc.code&&requiresSide(z.zone)&&!['left','right'].includes(w.side));
   assert(!unknown,'Starší zranění nemá doloženou stranu končetiny');
   n={...n,location:loc.code,locationShock:loc.shock,side,phase:'impact'};
  }
 }
 if(n.phase==='impact'&&n.impactRoll!==null){
  const armor=resolveLiveCombatArmour({inventory:n.inventory,targetId:n.targetId,location:n.location,aspect:n.weapon.aspect,
   direction:n.direction,mode:'auto',rigidStatus:'unknown',directionalContext:{opponents:n.opponents,d10:n.directionalD10}});
  if(!armor.ready){
   if(n.opponents>1&&n.directionalD10===null&&/d10|roll|hod/i.test(armor.reason))return {...n,phase:'directional'};
   throw Error('Nedoložená ochrana: '+armor.reason);
  }
  const impact=n.kind==='missile'?n.outcome.strikeImpact:
    Math.max(0,n.impactRoll+n.weapon.modifier+n.impactTA*n.weapon.impactTABonus+(n.weapon.otherModifier??0));
  assert(integer(impact,0,999),'Nedoložený Strike Impact');
  const effectiveAV=Math.max(0,armor.armourValue-n.armourReduction);
  const effectiveImpact=Math.max(0,impact-effectiveAV);
  const base=injuryFromEffectiveImpact({effectiveImpact,aspect:n.weapon.aspect,rigidArmour:armor.rigidArmour});
  const prior=n.targetState.wounds.filter(w=>!w.healed&&w.location===n.location&&(!n.side||w.side===n.side));
  const compatible=prior.filter(w=>{
   const elem=x=>x==='f'||x==='fire'||x==='frost';return elem(w.aspect)===elem(n.weapon.aspect);
  });
  const intermediate={...n,computed:{impact,armour:armor,effectiveAV,effectiveImpact,base,prior:compatible}};
  if(!base.injury&&!base.glancing)return {...intermediate,phase:'miss',computed:{...intermediate.computed,reason:'no-effective-impact'}};
  const phase=base.injury&&compatible.length?'compound':base.injury?'amputation':'shock';
  return phase==='amputation'?advanceGuidedFullHit({...intermediate,phase}):{...intermediate,phase};
 }
 if(n.phase==='directional'&&n.directionalD10!==null)return advanceGuidedFullHit({...n,phase:'impact'});
 if(n.phase==='compound'&&n.compoundD10!==null)return advanceGuidedFullHit({...n,phase:'amputation'});
 if(n.phase==='amputation'){
  const base=n.computed?.base;
  assert(base,'Chybí původní zranění');
  if(!base.injury)return {...n,phase:'shock'};
  const current={id:`wound:${n.id}`,location:n.location,level:base.injury.level,severity:base.injury.severity,aspect:n.weapon.aspect};
  const prior=n.computed.prior;
  const comp=prior.length?compoundInjury({existing:prior,incoming:current,d10:n.compoundD10}):null;
  const alt=comp?.compoundedExisting??comp?.injury??current;
  const symbols=hmkHumanLocationSymbols(n.location);assert(symbols,'Neznámá HMK anatomická lokace');
  const eligible=alt.level===5&&alt.severity==='G'&&alt.aspect==='e'&&symbols.triangle!==null;
  if(eligible&&n.amputationRoll===null)return {...n,computed:{...n.computed,compound:comp,amputationTarget:alt},phase:'amputation'};
  const amp=eligible?hmkAmputationAssessment({location:n.location,aspect:alt.aspect,level:5,severity:'G',strengthML:n.strengthML,roll:n.amputationRoll,isFolk:true}):null;
  return {...n,computed:{...n.computed,compound:comp,amputation:amp,amputationTarget:alt},phase:amp?.dead?'ready':'shock'};
 }
 if(n.phase==='shock'&&n.shockRoll!==null){
  const r=n.computed;assert(r,'Chybí výsledný Impact');
  const ampBonus=r.amputation?.shockTestModifier??0;
  const modifier=(r.base.shockTestModifier??0)+ampBonus;
  const fatigue=combatFatigueTotals(n.targetState).total;
  const rawEML=n.shockML-fatigue+modifier;
  const sl=successLevel(n.shockRoll,rawEML),slName=SL_NAME[sl];
  const injShock=r.compound?.injuryShock??r.base.injuryShock;
  const shock=calculateShockState({locationShock:n.locationShock,injuryShock:injShock,shockSL:sl});
  const carried=applyShockState(SHOCK_STATE[n.targetState.shock],shock.state);
  const cod=STATE_CODES[carried];assert(cod,'Neznámý výsledný Shock State');
  const causal=r.compound?.injury??r.base.injury;
  const bleeding=r.base.injury?(bleedingEligibleForInjury({bleedingClass:hmkHumanLocationSymbols(n.location).bleeds,injury:{...causal,aspect:n.weapon.aspect}})||r.amputation?.forceBleeder===true):false;
  return {...n,computed:{...r,shock:{slName,rawEML,shock,carried:cod},bleeding},phase:'ready'};
 }
 return n;
}

export function chooseGuidedFullHit(s,{id,value}={}){
 assert(s.phase==='zone'&&['zone-choice','location-choice'].includes(id),'Není splatná hráčská volba');
 const req=guidedFullHitRequirement(s);assert(req.kind==='choice'&&req.id===id&&req.choices.some(x=>x.value===String(value)),'Nepřípustná volba');
 const updated=id==='zone-choice'?{...s,zoneChoice:Number(value)}:{...s,locationChoice:Number(value)};
 return advanceGuidedFullHit(updated);
}
export function submitGuidedFullHitDie(s,value){
 const req=guidedFullHitRequirement(s);
 assert(req.kind==='die','Systém nyní nečeká na hod kostkou');
 const n=readPhysicalDieValue(value,req.faces);
 const roll={id:req.id,faces:req.faces,value:n,label:req.label,source:'GM-entered-physical-die'};
 let next={...s,physicalDice:[...s.physicalDice,roll]};
 if(req.id==='zoneDie')next.zoneRolls=[...s.zoneRolls,n];
 else if(req.id==='locationDie')next.locationRolls=[...s.locationRolls,n];
 else next[req.id]=n;
 // When the next step depends on choices/compound, only advance after those
 // requirements have been satisfied; otherwise never infer a missing roll.
 return advanceGuidedFullHit(next);
}

/** Return a candidate change. The caller MUST verify the live signature and
 * persist `state` using a single atomic database write. */
export function finalizeGuidedFullHit({session,currentState,sourceSignature}={}){
 assert(session?.format==='hmk-guided-full-hit-v1','Chybí dokončený původní útok');
 assert(stateSignature(currentState)===session.stateWitness&&session.sourceSignature===sourceSignature,
  'Postava, vybavení nebo výsledek útoku se změnily; spusťte nový výpočet');
 assert(session.phase==='ready'||session.phase==='miss','Výsledek není úplný: chybí kostka nebo volba');
 if(session.phase==='miss')return {strike:false,mutatesState:false,proof:clone(session.physicalDice),outcome:session.outcome};
 const r=session.computed,loc=session.location;
 assert(r?.shock||r?.amputation?.dead,'Povinný Shock Roll nebo ověřená smrt chybí');
 const sl=r.shock?.slName??'S';
 const injury=r.base.injury;
 const inj=injury?`${injury.severity}${injury.level}`:null;
 const kind=injury?'injury':r.base.glancing?'glancing':'none';
 const shockIndex=r.shock?.shock?.index??10;
 const shockState=r.amputation?.dead?'KIA':STATE_CODES[r.shock.shock.state];
 const carried=r.amputation?.dead?'KIA':r.shock.carried;
 const shockResult={state:shockState,shk:shockIndex,injuryShock:r.compound?.injuryShock??r.base.injuryShock,locationShock:session.locationShock,shockLevel:sl,rollModifier:{CF:2,F:1,S:0,CS:-1}[sl],glancingBonus:r.base.shockTestModifier??0};
 const draft={ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
  target:{id:session.targetId,name:session.targetId},location:loc,aspect:session.weapon.aspect,
  inputs:{impact:r.impact,armourReduction:session.armourReduction,rigidStatus:r.armour.rigidStatus,locationShock:session.locationShock,
   shockLevel:sl,compoundShock:r.compound?.injuryShock??null,previousState:currentState.shock},
  impactResult:{ok:true,baseAV:r.armour.armourValue,effectiveAV:r.effectiveAV,effectiveImpact:r.effectiveImpact,strikeImpact:r.impact,armourReduction:session.armourReduction,aspect:session.weapon.aspect},
  injuryResult:{ok:true,kind,injury:inj,injuryShock:r.base.injuryShock,shockRollBonus:r.base.shockTestModifier??0},
  shockResult,carryover:{ok:true,state:carried,escalated:carried!==shockState},proposalId:session.id};
 const adjudication={gmReviewed:true,compoundReviewed:!!r.compound,compoundD10:session.compoundD10,
  bleeding:!!r.bleeding,arrowOrBolt:session.kind==='missile'&&!!session.weapon.isArrowOrBolt,
  side:session.side,timelineId:session.timelineId,amputationStrengthML:r.amputation?session.strengthML:null,
  amputationRoll:session.amputationRoll,amputationIsFolk:true,
  shockML:r.amputation?.shockTestModifier===-20?session.shockML:null,
  shockRoll:r.amputation?.shockTestModifier===-20?session.shockRoll:null};
 const transition=applyConfirmedHit({state:currentState,characterId:session.targetId,draft,
  round:session.round,eventId:session.id,adjudication});
 const last=transition.state.events.at(-1);
 assert(last?.id===session.id,'Trvalý zápis zásahu se nepodařil');
 last.details.physicalDice={format:'hmk-manual-dice-proof-v1',source:'HMK World of Kèthîra pp166–170',rolls:clone(session.physicalDice)};
 last.details.guidedSequence={timelineId:session.timelineId,kind:session.kind,attackerId:session.attackerId,
  strikerId:session.strikerId,defenderId:session.defenderId,attackOutcome:session.outcome,
  location:loc,side:session.side,armourAV:r.armour.armourValue,weaponImpact:r.impact,
  effectiveImpact:r.effectiveImpact,shockEML:r.shock?.rawEML??null};
 validateCombatState(transition.state);
 return {strike:true,state:transition.state,transition,draft,proof:last.details.physicalDice};
}
