/** HMK World of Kèthîra pp.108,160–163. Persistent, deterministic
 * Missile Span/Load preparation. These helpers never roll dice or write data.
 * They return a sequence and, when appropriate, inventory to be committed
 * together with the journal in the caller's existing atomic transaction.
 */
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn,dueEncounterEvents,encounterFreeActionAvailable,
 confirmConcentrationCompletion,recordEncounterFreeAction} from './encounter-turn-sequence.js';
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
import {combatFatigueTotals} from './persistent-combat-state.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {SL,successLevel} from '../rules/tests.js';
import {resolveCrossbowArcheryChoice} from './hmk-crossbow-archery-choice.js';

const demand=(ok,message)=>{if(!ok)throw Error(message);};
const weaponType=item=>item?.snapshot?.properties?.missileType??item?.snapshot?.properties?.verifiedModes?.[0]?.missileType;
const ammunitionType=item=>item?.snapshot?.properties?.projectileKind??item?.snapshot?.properties?.projectileType;
const ammoFor={bow:'arrow',crossbow:'bolt',sling:'stone'};
const checkedId=id=>{demand(typeof id==='string'&&id.length>0,'Chybí ID doložené akce');return id;};
const unique=(inventory,actorId,itemId)=>{
 const found=inventory.filter(x=>x.id===itemId&&x.characterId===actorId);
 demand(found.length===1,'Příprava střelby: předmět nemá jednoznačné vlastnictví');return found[0];
};
function heldWeapon(inventory,actorId,weaponId){
 const item=unique(inventory,actorId,weaponId);
 demand(item.snapshot?.category==='weapon'&&['main_hand','off_hand'].includes(item.slot)&&
  !item.destroyed&&item.quantity===1,'Střelná zbraň musí být skutečně držena v ruce');
 demand(['bow','crossbow','sling'].includes(weaponType(item)),
  'Span/Load platí pouze pro ověřený luk, kuši nebo prak');
 return item;
}
function requireFreePreparingHand(inventory,actorId,weapon){
 const opposite=weapon.slot==='main_hand'?'off_hand':'main_hand';
 demand(!inventory.some(x=>x.characterId===actorId&&x.slot===opposite),
  'Span/Load vyžaduje volnou druhou ruku pro manipulaci se střelou nebo tětivou');
}
function controlledTurn(sequence,states,actorId){
 const seq=validateEncounterSequence(sequence);
 demand(seq.active&&!seq.interruptActiveId&&currentEncounterActor(seq)===actorId&&
  !seq.pendingEndTurnAction,'Příprava střelby vyžaduje vlastní, dosud neuzavřený tah');
 demand(guidedTurnChoices(seq,states).choices?.includes('concentrate-start'),
  'Příprava střelby vyžaduje legální vícekolovou koncentraci');
 return seq;
}
const readiness=(seq,weaponId)=>seq.missileReadiness?.[weaponId]??null;
function verifiedProjectile(inventory,actorId,ammoId,expected){
 const ammo=unique(inventory,actorId,ammoId);
 demand(ammo.snapshot?.category==='other'&&ammo.slot==='carried'&&
  ammo.gearStowage!=='backpack'&&!ammo.destroyed&&Number.isSafeInteger(ammo.quantity)&&ammo.quantity>0,
  'Střelivo musí být skutečně nesené, dostupné a evidované s počtem kusů');
 demand(ammunitionType(ammo)===expected,
  'Typ střeliva musí být výslovně označen v parametrech předmětu (projectileKind)');
 return ammo;
}
const witness=x=>JSON.stringify(x);
/** HMK p.108 shaft/head table: derive impact and range from the real projectile,
 * not the missile weapon's generic impact die. Sling stones are different.
 * Do not invent a projectile aspect: the verified weapon mode supplies it.
 */
export function verifiedLoadedProjectileBallistics({weaponType,loaded}={}){
 demand(loaded?.ammoType===ammoFor[weaponType]&&loaded.itemSnapshot?.category==='other',
  'Chybí doložený druh skutečně nabitého střeliva');
 if(weaponType==='sling'){
  // HMK p.110 distinguishes manufactured lead ovoids from improvised rocks.
  // Neither form may be inferred from an arbitrary unclassified 'stone'.
  const form=loaded.itemSnapshot.properties?.slingProjectileForm;
  demand(['crafted-lead-ovoid','improvised-rock'].includes(form),
   'HMK str.110: chybí doložený typ sling stone (lead ovoid / improvised rock)');
  return {kind:'stone',slingProjectileForm:form,shaftWeight:null,headType:null,
   impactDieSides:null,volleyMaxMultiplier:null,armourReduction:null,
   impactTAValue:null,bluntHead:false,broadBleedingBonus:0};
 }
 demand(['bow','crossbow'].includes(weaponType),'Neznámý typ střelné zbraně');
 const p=loaded.itemSnapshot.properties??{};
 demand(['heavy','light'].includes(p.shaftWeight),'Střela nemá doloženou HMK Shaft Weight (heavy/light)');
 demand(['bodkin','blunt','broad'].includes(p.headType),'Střela nemá doložený HMK Head Type (bodkin/blunt/broad)');
 const heavy=p.shaftWeight==='heavy',bodkin=p.headType==='bodkin';
 return {kind:loaded.ammoType,shaftWeight:p.shaftWeight,headType:p.headType,
  impactDieSides:heavy?12:8,volleyMaxMultiplier:weaponType==='bow'?(heavy?3:4):(heavy?2:3),
  armourReduction:bodkin?4:0,impactTAValue:bodkin?3:null,
  bluntHead:p.headType==='blunt',broadBleedingBonus:p.headType==='broad'?5:0};
}
/** Explicit hand span or an evidenced real spanner. No GM-typed Pull value. */
export function startGuidedCrossbowSpan({id,sequence,states,inventory,actorId,weaponId,
 character,spanner='hand',spannerItemId=null}={}){
 const s=controlledTurn(sequence,states,actorId),w=heldWeapon(inventory,actorId,weaponId);
 requireFreePreparingHand(inventory,actorId,w);
 demand(weaponType(w)==='crossbow','Span je povolen pouze pro kuši');
 demand(typeof id==='string'&&id.length>0,'Chybí ID přípravy');
 const settings={hand:[1,1],beltClaw:[3,2],lever:[5,4],windlass:[10,8]};
 demand(Object.hasOwn(settings,spanner),'Neověřený způsob natahování kuše');
 const [multiplier,durationRounds]=settings[spanner];
 const str=character?.hmk?.attributes?.str;
 const skills=(character?.hmk?.skills||[]).filter(x=>String(x.name).toLowerCase()==='archery'||x.id==='archery');
 const draw=w.snapshot?.properties?.draw;
 demand(character?.id===actorId&&Number.isSafeInteger(str)&&str>=1&&
  skills.length===1&&Number.isSafeInteger(skills[0].ml)&&
  Number.isSafeInteger(draw)&&draw>0,'Span: chybí skutečný Archery ML, STR nebo Draw kuše');
 const pull=skills[0].ml+str*5;
 demand(pull*multiplier>=draw,'Archery Pull s daným napínákem nestačí na Draw kuše');
 let deviceWitness=null;
 if(spanner!=='hand'){
  const device=unique(inventory,actorId,spannerItemId);
  demand(device.slot==='carried'&&!device.destroyed&&device.quantity>0&&
   device.snapshot?.properties?.spannerType===spanner,
   'Požadovaný mechanický napínák není skutečně doložen ve vybavení');
  deviceWitness=witness(device);
 }
 demand(!readiness(s,weaponId)?.loaded&&!readiness(s,weaponId)?.spanned,
  'Natažení nesmí přepsat již nataženou ani nabitou kuši');
 const next=finishEncounterTurn(s,states,{action:'concentrate-start',durationRounds,gmConfirmed:true});
 next.commitments[actorId].task={kind:'missile-span',id,weaponId,weaponWitness:witness(w),
  spanner,spannerItemId,deviceWitness,pull,draw};
 return {sequence:validateEncounterSequence(next),proof:{sourceEventId:id,actionKind:'missile-span-start',
  actorId,weaponId,spanner,pull,draw,durationRounds,round:s.round,timelineId:s.timelineId,physicalDice:[]}};
}
/** Source ammunition must be in a quiver/arrow bag or sling pouch, not backpack. */
export function startGuidedMissileLoad({id,sequence,states,inventory,actorId,weaponId,ammoId,character=null,containerConfirmed=false}={}){
 const s=controlledTurn(sequence,states,actorId),w=heldWeapon(inventory,actorId,weaponId);
 requireFreePreparingHand(inventory,actorId,w);
 const type=weaponType(w),ready=readiness(s,weaponId);
 if(type==='bow'){
  const str=character?.hmk?.attributes?.str;
  const skills=(character?.hmk?.skills||[]).filter(x=>String(x.name).toLowerCase()==='archery'||x.id==='archery');
  const draw=w.snapshot?.properties?.draw;
  demand(character?.id===actorId&&Number.isSafeInteger(str)&&str>=1&&
   skills.length===1&&Number.isSafeInteger(skills[0].ml)&&Number.isSafeInteger(draw)&&draw>0,
   'Bow Load: chybí ověřené Archery ML, Strength nebo Draw luku');
  demand(skills[0].ml+str*5>=draw,
   'HMK str.108: Archery Pull nedosahuje Draw luku; nelze jej nabít');
 }
 demand(typeof id==='string'&&id.length>0,'Chybí ID Load');
 demand(!ready?.loaded,'Zbraň již drží nabitou střelu');
 if(type==='crossbow')demand(ready?.spanned===true,
  'Kuše musí být nejdříve natažena dokončeným Span (HMK str.163)');
 demand(containerConfirmed===true,'GM musí doložit, že šípy/šipky jsou skutečně v toulci či brašně nebo kameny ve váčku');
 const ammo=verifiedProjectile(inventory,actorId,ammoId,ammoFor[type]);
 verifiedLoadedProjectileBallistics({weaponType:type,loaded:{ammoType:ammoFor[type],itemSnapshot:ammo.snapshot}});
 const next=finishEncounterTurn(s,states,{action:'concentrate-start',durationRounds:1,gmConfirmed:true});
 next.commitments[actorId].task={kind:'missile-load',id,weaponId,weaponWitness:witness(w),
  ammoId,ammoWitness:witness(ammo),ammoType:ammoFor[type],containerConfirmed:true};
 return {sequence:validateEncounterSequence(next),proof:{sourceEventId:id,actionKind:'missile-load-start',
  actorId,weaponId,ammoId,ammoType:ammoFor[type],containerConfirmed:true,round:s.round,timelineId:s.timelineId,
  durationRounds:1,physicalDice:[]}};
}
/** HMK p.163: Aim uses a full round and can benefit only the attack
 * immediately following in the next round. It cannot be a user checkbox.
 * The weapon witness and completed action are kept in the saved timeline. */
export function startGuidedMissileAim({id,sequence,states,inventory,actorId,weaponId,character}={}){
 const s=controlledTurn(sequence,states,actorId);
 checkedId(id);
 const w=unique(inventory,actorId,weaponId),type=weaponType(w);
 demand(w.snapshot?.category==='weapon'&&['main_hand','off_hand'].includes(w.slot)&&
  w.quantity===1&&!w.destroyed&&['bow','crossbow','thrown'].includes(type),
  'Aim: zbraň musí být skutečně držena a dovolovat Aim (bow/crossbow/thrown)');
 const mark=readiness(s,weaponId);
 if(type==='bow'||type==='crossbow')requireFreePreparingHand(inventory,actorId,w);
 if(type==='bow'){
  const str=character?.hmk?.attributes?.str;
  const skills=(character?.hmk?.skills||[]).filter(x=>String(x.name).toLowerCase()==='archery'||x.id==='archery');
  const draw=w.snapshot?.properties?.draw;
  demand(character?.id===actorId&&Number.isSafeInteger(str)&&str>0&&
   skills.length===1&&Number.isSafeInteger(skills[0].ml)&&Number.isSafeInteger(draw)&&draw>0&&
   skills[0].ml+str*5-draw>=75,
   'HMK str.163: Aim s lukem vyžaduje Archery Pull vyšší než Draw nejméně o 75');
 }
 if(type==='bow'||type==='crossbow'){
  demand(mark?.loaded?.ammoType===ammoFor[type]&&mark.weaponWitness===witness(w)&&
   (type!=='crossbow'||mark.spanned===true),
   'Aim vyžaduje doloženou dokončenou přípravu skutečně nabité zbraně');
 }
 const next=finishEncounterTurn(s,states,{action:'concentrate-start',durationRounds:1,gmConfirmed:true});
 next.commitments[actorId].task={kind:'missile-aim',id,weaponId,weaponWitness:witness(w),weaponType:type};
 return {sequence:validateEncounterSequence(next),proof:{sourceEventId:id,actionKind:'missile-aim-start',
  actorId,weaponId,round:s.round,timelineId:s.timelineId,durationRounds:1,physicalDice:[]}};
}
/** HMK p.163: missile load from the other hand / immediate reach may be
 * a free action. The GM, not this module, decides whether the situation calls
 * for the explicit DEX or Missile test. Tested attempts are recorded even on
 * failure, so a physical d100 cannot be silently discarded and retried.
 * All functions produce drafts; only the host writes the transaction.
 */
function freeLoadTestProfile({sequence,states,inventory,character,actorId,weapon,method,crossbowBasis=null}){
 demand(['dex','missile'].includes(method),'Střelec musí zvolit DEX nebo Missile test (HMK str.163)');
 const state=states[actorId],type=weaponType(weapon);
 // Both arms are used to hold and load the missile weapon. Neither left/right
 // nor a missing injury side may be guessed from the inventory slot.
 const kind=method==='dex'?'dexterity':type==='sling'?'slings':'archery';
 const injury=projectLiveInjuries({state,round:sequence.round,test:kind,
  usedArms:['left','right'],timelineId:sequence.timelineId});
 demand(injury.ready,'Free Load: neověřený dopad Injury: '+injury.reason);
 // A Grievous affected zone calls for an automatic CF and its zone-specific
 // mishap, which cannot be resolved by simply inventing a d100 for Free Load.
 demand(!injury.unusable,'Free Load: Grievous vyžaduje samostatné automatické CF a povinné Mishaps');
 let baseML,source,load=null;
 if(method==='dex'){
  const dex=character?.hmk?.attributes?.dex;
  demand(Number.isSafeInteger(dex)&&dex>=1&&dex<=200,'Pro DEX test chybí skutečný atribut Dexterity');
  baseML=dex*5;source='DEX × 5';
 }else{
  const skillName=type==='sling'?'slings':'archery';
  const skills=(character?.hmk?.skills??[]).filter(x=>String(x.name??x.key??x.id??'').trim().toLowerCase()===skillName);
  demand(skills.length===1&&Number.isSafeInteger(skills[0].ml)&&skills[0].ml>=0&&skills[0].ml<=200,
   'Free Load Missile: chybí jednoznačný uložený '+skillName+' ML');
  baseML=skills[0].ml;source=skillName+' ML';
  // p.163 provides a real player choice, not automatic maximisation.
  if(type==='crossbow'){
   const choice=resolveCrossbowArcheryChoice({character,archerySkill:skills[0],basis:crossbowBasis});
   baseML=choice.baseML;source='Crossbow '+choice.source;
  }else demand(crossbowBasis===null,'Volba kušového SB×3 patří pouze ke kuši');
  // Real vision-impairing armour must be included for a missile skill test,
  // but gear or layer data MUST NOT be filled in with a fictitious zero.
  load=resolveCombatantLoad({character,inventory});
  demand(load.ready&&Number.isSafeInteger(load.perceptionPenalty),
   'Free Load Missile: nelze doložit postih hlavové zbroje / vybavení; '+(load.issues??[]).join('; '));
 }
 const fatigue=combatFatigueTotals(state).total;
 const armourPenalty=method==='missile'?load.perceptionPenalty:0;
 const rawEML=baseML-fatigue+injury.modifier+armourPenalty;
 demand(Number.isSafeInteger(rawEML),'Free Load: EML nelze vypočítat z potvrzených údajů');
 return {method,skill:kind,source,baseML,fatigue,injuryModifier:injury.modifier,
  armourPenalty,rawEML,stunned:state.shock==='STN',usedArms:['left','right']};
}
function freeLoadWitnessed({id,sequence,states,inventory,actorId,weaponId,ammoId,character,
 source='hand',reachableConfirmed=false,noTestRequiredConfirmed=false,
 testRequiredConfirmed=false,testMethod=null,crossbowBasis=null,physicalD100=null,profileOnly=false}={}){
 const s=validateEncounterSequence(sequence);checkedId(id);
 demand(Array.isArray(inventory)&&states?.[actorId]&&character?.id===actorId,
  'Free Load vyžaduje aktuální inventář, bojový stav a skutečnou postavu');
 demand(!dueEncounterEvents(s,states).length,
  'Free Load nesmí předběhnout povinné bojové následky');
 const state=states[actorId];
 demand(!['INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&
  state.morale?.state!=='catatonic'&&!state.posture?.passNextTurn&&
  !s.entryForcedPass,'Free Load není legální v aktuálním bojovém stavu');
 demand(guidedTurnChoices(s,states).kind==='player-choice'&&
  encounterFreeActionAvailable(s,actorId),
  'Free Load musí být jedinou volnou akcí před hlavní akcí');
 const weapon=heldWeapon(inventory,actorId,weaponId),type=weaponType(weapon);
 const opposite=weapon.slot==='main_hand'?'off_hand':'main_hand';
 const ammo=unique(inventory,actorId,ammoId);
 demand(ammo.snapshot?.category==='other'&&ammo.quantity===1&&!ammo.destroyed&&
  ammunitionType(ammo)===ammoFor[type],
  'Free Load vyžaduje přesně jednu skutečnou šipku, šíp nebo kámen');
 if(source==='hand')demand(ammo.slot===opposite,
  'Free Load z ruky: střela musí být skutečně držena v opačné ruce');
 else if(source==='nearby'||source==='nearby-tested'){
  demand(ammo.slot==='none'&&reachableConfirmed===true,
   'Nearby Free Load: střela musí skutečně ležet v bezprostředním dosahu');
  demand(!inventory.some(x=>x.characterId===actorId&&x.slot===opposite),
   'Nearby Free Load vyžaduje volnou manipulační ruku');
  if(source==='nearby')demand(noTestRequiredConfirmed===true&&!testRequiredConfirmed,
   'HMK str.163: bezhodový Free Load vyžaduje doložení, že test není nutný');
  else demand(testRequiredConfirmed===true&&noTestRequiredConfirmed!==true,
   'Tested Nearby Free Load vyžaduje GM potvrzení povinného DEX/Missile testu');
 }else demand(false,'Nedoložený zdroj Free Load');
 const old=readiness(s,weaponId);
 demand(!old?.loaded,'Free Load nesmí přepsat již nabitou střelu');
 if(type==='crossbow')demand(old?.spanned===true&&old.weaponWitness===witness(weapon),
  'Free Load kuše vyžaduje dokončené natažení této zbraně');
 if(type==='bow'){
  const str=character?.hmk?.attributes?.str,draw=weapon.snapshot?.properties?.draw;
  const skills=(character?.hmk?.skills||[]).filter(x=>String(x.name).toLowerCase()==='archery'||x.id==='archery');
  demand(Number.isSafeInteger(str)&&str>0&&Number.isSafeInteger(draw)&&draw>0&&
   skills.length===1&&Number.isSafeInteger(skills[0].ml)&&skills[0].ml+5*str>=draw,
   'Free Load luku: nelze obejít skutečný Archery Pull / Draw');
 }
 verifiedLoadedProjectileBallistics({weaponType:type,loaded:{ammoType:ammoFor[type],itemSnapshot:ammo.snapshot}});
 demand(!s.log.some(e=>e.eventId===id),'Duplicitní ID Free Load');
 const tested=source==='nearby-tested';
 const test=tested?freeLoadTestProfile({sequence:s,states,inventory,character,actorId,weapon,method:testMethod,crossbowBasis}):null;
 if(profileOnly){
  demand(tested,'Náhled fyzického testu lze použít jen pro Tested Nearby Free Load');
  return {profile:test};
 }
 if(tested)demand(Number.isSafeInteger(physicalD100)&&physicalD100>=1&&physicalD100<=100,
  'Tested Free Load: vyžaduje skutečně hozený d100 1–100');
 const naturalSL=tested?successLevel(physicalD100,test.rawEML):null;
 const sl=tested&&test.stunned?Math.max(SL.CF,naturalSL-1):naturalSL;
 const succeeded=!tested||sl>=SL.S;
 const next=recordEncounterFreeAction(s,{actorId,kind:'free-missile-load'});
 if(succeeded){
  next.missileReadiness??={};
  next.missileReadiness[weaponId]={actorId,weaponId,spanned:type==='crossbow',
   weaponWitness:witness(weapon),loaded:{ammoId,ammoType:ammoFor[type],
    itemSnapshot:structuredClone(ammo.snapshot),loadEventId:id,completedRound:s.round}};
 }
 next.log.push({type:succeeded?'missile-load-complete':'missile-free-load-test-failed',
  round:s.round,actorId,weaponId,ammoId,eventId:id,free:true,source,
  ...(tested?{testMethod,testEML:test.rawEML,physicalD100,sl:['CF','F','S','CS'][sl]}:{})});
 const resultInventory=succeeded?
  structuredClone(inventory).filter(x=>!(x.id===ammoId&&x.characterId===actorId)):
  structuredClone(inventory);
 const proof={sourceEventId:id,actionKind:tested?'missile-free-load-nearby-tested':
  source==='nearby'?'missile-free-load-nearby':'missile-free-load-hand',
  actorId,weaponId,ammoId,round:s.round,timelineId:s.timelineId,source,succeeded,
  ...(source!=='hand'?{gmConfirmedReachable:true}:{}),
  ...(source==='nearby'?{gmConfirmedNoTestRequired:true}:{}),
  ...(tested?{gmConfirmedTestRequired:true,profile:test,sl:['CF','F','S','CS'][sl]}:{}),
  physicalDice:tested?[{faces:100,value:physicalD100,kind:testMethod+'-free-load',
   actorId,eml:test.rawEML}]:[]};
 return {sequence:validateEncounterSequence(next),inventory:resultInventory,proof};
}
export function performGuidedFreeMissileLoad(input={}){
 return freeLoadWitnessed({...input,source:'hand'});
}
export function performGuidedNearbyFreeMissileLoad(input={}){
 return freeLoadWitnessed({...input,source:'nearby'});
}
export function previewGuidedTestedNearbyFreeMissileLoad(input={}){
 return freeLoadWitnessed({...input,source:'nearby-tested',profileOnly:true});
}
export function performGuidedTestedNearbyFreeMissileLoad(input={}){
 return freeLoadWitnessed({...input,source:'nearby-tested'});
}
/** Aim is valid ONLY for the turn immediately following successful Aim.
 * Recheck the held weapon and previous concentration-complete event. */
export function verifiedMissileAimBonus({sequence,inventory,actorId,weaponId}={}){
 const s=validateEncounterSequence(sequence),a=s.missileAim?.[weaponId];
 if(!a)return 0;
 const w=unique(inventory,actorId,weaponId);
 if(a.actorId!==actorId||a.weaponWitness!==witness(w)||a.completedRound!==s.round||
  a.startedRound!==s.round-1||!s.log.some(e=>e.type==='missile-aim-complete'&&
   e.eventId===a.eventId&&e.actorId===actorId&&e.weaponId===weaponId&&e.round===s.round))return 0;
 return 10;
}
/** Completion, before the next IR, removes exactly one unit from container.
 * The fired shot consumes the READY marker later, not another inventory unit.
 */
export function completeGuidedMissilePreparation({id,sequence,states,inventory,actorId}={}){
 const s=validateEncounterSequence(sequence),commitment=s.commitments?.[actorId],task=commitment?.task;
 demand(typeof id==='string'&&id.length>0&&['missile-span','missile-load','missile-aim'].includes(task?.kind),
  'Neexistuje doložená vícekolová Missile příprava');
 demand(Array.isArray(inventory),'Chybí úplný inventář pro dokončení Missile přípravy');
 const w=task.kind==='missile-aim'&&task.weaponType==='thrown'?
  unique(inventory,actorId,task.weaponId):heldWeapon(inventory,actorId,task.weaponId);
 demand(w.snapshot?.category==='weapon'&&['main_hand','off_hand'].includes(w.slot)&&!w.destroyed,
  'Dokončení přípravy vyžaduje stále drženou zbraň');
 demand(witness(w)===task.weaponWitness,'Zbraň se během koncentrace změnila');
 const done=confirmConcentrationCompletion(s,states,{actorId,gmConfirmed:true});
 done.missileReadiness??={};
 const old=readiness(s,task.weaponId);
 let nextInventory=inventory;
 if(task.kind==='missile-aim'){
  demand(witness(w)===task.weaponWitness,'Aim: změnila se zbraň');
  if(task.weaponType==='bow'||task.weaponType==='crossbow')
   demand(old?.loaded?.ammoType===ammoFor[task.weaponType]&&old.weaponWitness===witness(w),
    'Aim: zbraň již nemá původní doložené nabití');
  done.missileAim??={};done.missileAim[task.weaponId]={actorId,weaponId:task.weaponId,
   startedRound:commitment.startRound,completedRound:s.round,eventId:task.id,weaponWitness:task.weaponWitness};
 }else if(task.kind==='missile-span'){
  if(task.spannerItemId){
   const device=unique(inventory,actorId,task.spannerItemId);
   demand(witness(device)===task.deviceWitness,'Napínák se během Span změnil');
  }
  demand(!old?.loaded,'Nelze Span přes už nabitou kuši');
  done.missileReadiness[task.weaponId]={actorId,weaponId:task.weaponId,spanned:true,
   loaded:null,weaponWitness:task.weaponWitness};
 }else{
  const ammo=verifiedProjectile(inventory,actorId,task.ammoId,task.ammoType);
  demand(ammo.quantity>0&&witness(ammo)===task.ammoWitness,
   'Střelivo se od zahájení Load změnilo');
  demand(!old?.loaded,'Tato zbraň již byla nabita jinou střelou');
  verifiedLoadedProjectileBallistics({weaponType:weaponType(w),loaded:{ammoType:task.ammoType,itemSnapshot:ammo.snapshot}});
  if(weaponType(w)==='crossbow')demand(old?.spanned===true,'Kuše již není natažená');
  nextInventory=structuredClone(inventory);
  const row=nextInventory.find(x=>x.id===task.ammoId&&x.characterId===actorId);
  row.quantity-=1;if(row.quantity===0)nextInventory=nextInventory.filter(x=>x!==row);
  done.missileReadiness[task.weaponId]={actorId,weaponId:task.weaponId,
   spanned:weaponType(w)==='crossbow',weaponWitness:task.weaponWitness,
   loaded:{ammoId:task.ammoId,ammoType:task.ammoType,itemSnapshot:structuredClone(ammo.snapshot),
    loadEventId:task.id,completedRound:s.round}};
 }
 done.log.push({type:task.kind==='missile-span'?'missile-span-complete':
  task.kind==='missile-aim'?'missile-aim-complete':'missile-load-complete',
  round:s.round,actorId,weaponId:task.weaponId,ammoId:task.ammoId??null,eventId:task.id});
 const proof={sourceEventId:id,originEventId:task.id,
  actionKind:task.kind==='missile-span'?'missile-span-complete':
   task.kind==='missile-aim'?'missile-aim-complete':'missile-load-complete',
  actorId,weaponId:task.weaponId,ammoId:task.ammoId??null,round:s.round,timelineId:s.timelineId,
  physicalDice:[],source:'HMK World of Kèthîra pp.108,160,163'};
 return {sequence:validateEncounterSequence(done),inventory:nextInventory,proof};
}
/** Strict gate before even requesting a physical Missile d100. */
export function requireLoadedMissile({sequence,inventory,actorId,weaponId}={}){
 const s=validateEncounterSequence(sequence),w=heldWeapon(inventory,actorId,weaponId);
 const type=weaponType(w),mark=readiness(s,weaponId);
 demand(mark?.actorId===actorId&&mark?.weaponId===weaponId&&
  mark.weaponWitness===witness(w)&&mark.loaded?.ammoType===ammoFor[type],
  'Zbraň nemá doložený dokončený Load a skutečně připravenou střelu.');
 if(type==='crossbow')demand(mark.spanned===true,'Kuše nemá dokončený Span');
 verifiedLoadedProjectileBallistics({weaponType:type,loaded:mark.loaded});
 return structuredClone(mark);
}
/** Consume exactly once in the SAME atomic transaction as attack state. */
export function consumeLoadedMissile({sequence,inventory,actorId,weaponId}={}){
 const mark=requireLoadedMissile({sequence,inventory,actorId,weaponId});
 const s=validateEncounterSequence(sequence);
 if(s.missileAim)s.missileAim[weaponId]=null;
 s.missileReadiness[weaponId]={actorId,weaponId,spanned:false,loaded:null,
  weaponWitness:mark.weaponWitness,lastShotRound:s.round,
  lastLoadedEventId:mark.loaded.loadEventId};
 s.log.push({type:'missile-projectile-fired',round:s.round,actorId,weaponId,
  ammoId:mark.loaded.ammoId,loadEventId:mark.loaded.loadEventId});
 return {sequence:validateEncounterSequence(s),spent:mark.loaded};
}

/** HMK p.161, p.163: a crossbow may already be spanned AND loaded before
 * Initiative begins. This is a witnessed pre-combat fact, NEVER an automatic
 * weapon default and NEVER a newly rolled or free combat action.
 * The real bolt is consumed in the same atomic setup transaction.
 * This does not grant a pre-IR shot: that distinct p.161 action must be
 * adjudicated by its own turn-order mechanism.
 */
export function registerInitiallyLoadedCrossbow({id,sequence,inventory,actorId,weaponId,ammoId,
 gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 checkedId(id);
 demand(gmConfirmed===true,'GM musí výslovně potvrdit, že kuše byla natažena a nabita před střetnutím');
 demand(s.round===1&&s.cursor===0&&!s.active&&!s.interruptActiveId&&
  !s.pendingEndTurnAction&&!s.log.some(e=>['turn-start','turn-finished','missile-projectile-fired'].includes(e.type)),
  'Počáteční nabití je možné pouze před prvním IR prvního kola');
 demand(s.order.includes(actorId),'Střelec není účastníkem tohoto střetnutí');
 const w=heldWeapon(inventory,actorId,weaponId);
 demand(weaponType(w)==='crossbow','Počáteční nabití se vztahuje na kuši');
 demand(!readiness(s,weaponId)?.loaded&&!readiness(s,weaponId)?.spanned,
  'Tato kuše již má doloženou přípravu');
 const ammo=verifiedProjectile(inventory,actorId,ammoId,'bolt');
 verifiedLoadedProjectileBallistics({weaponType:'crossbow',loaded:{ammoType:'bolt',itemSnapshot:ammo.snapshot}});
 demand(!s.log.some(e=>e.eventId===id),'Duplicitní ID předbojové přípravy');
 const next=structuredClone(s),nextInventory=structuredClone(inventory);
 const row=nextInventory.find(x=>x.id===ammoId&&x.characterId===actorId);
 demand(row&&row.quantity>0,'Šipka již není dostupná');
 row.quantity-=1;
 if(row.quantity===0)nextInventory.splice(nextInventory.indexOf(row),1);
 next.missileReadiness??={};
 next.missileReadiness[weaponId]={actorId,weaponId,spanned:true,
  weaponWitness:witness(w),loaded:{ammoId,ammoType:'bolt',itemSnapshot:structuredClone(ammo.snapshot),
   loadEventId:id,completedRound:s.round}};
 next.log.push({type:'missile-load-complete',round:s.round,actorId,weaponId,ammoId,
  eventId:id,preCombat:true,gmConfirmed:true});
 const proof={sourceEventId:id,actionKind:'missile-precombat-crossbow-loaded',
  actorId,weaponId,ammoId,round:s.round,timelineId:s.timelineId,
  spannedBeforeCombat:true,loadedBeforeCombat:true,gmConfirmed:true,physicalDice:[]};
 return {sequence:validateEncounterSequence(next),inventory:nextInventory,proof};
}
