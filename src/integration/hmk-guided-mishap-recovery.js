/** HMK: Roleplaying in the World of Kèthîra, printed p.161.
 * Stand: one Move action, 10 feet charged; dropped object: one-turn Grope,
 * contested by a physical Melee d100 when threatened. A pure draft: caller
 * MUST commit state, inventory, Initiative and evidence in ONE transaction.
 */
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn,completeReadiedEncounterAction,dueEndTurnEvents} from './encounter-turn-sequence.js';
import {validateCombatState,combatFatigueTotals,applyConfirmedShockRecovery} from './persistent-combat-state.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {successLevel,SL} from '../rules/tests.js';
import {combatMishap} from '../rules/mishaps.js';
import {verifiedCombatMishap,applyGuidedCombatMishap} from './hmk-guided-combat-mishap.js';
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
const need=(v,m)=>{if(!v)throw Error(m)};
const valid=(n,low,high)=>Number.isSafeInteger(n)&&n>=low&&n<=high;
const clone=structuredClone;
const witness=v=>JSON.stringify(v);
const handSlots=['main_hand','off_hand'];
function recoverableDrops(state,inventory,actorId){
 const ids=[...new Set((state.events||[]).map(e=>e.details?.droppedItemId).filter(Boolean))];
 return inventory.filter(i=>i.characterId===actorId&&ids.includes(i.id)&&i.slot==='none'&&!i.destroyed);
}
function threatAt({actorId,battlefield}){
 need(battlefield&&Array.isArray(battlefield.units),'Grope: chybí doložené pozice, vztahy a Threat všech účastníků');
 const u=battlefield.units.find(u=>u.id===actorId);
 need(u&&Number.isFinite(u.x)&&Number.isFinite(u.y),'Grope: chybí přesná poloha postavy');
 return battlefield.units.some(e=>e.id!==actorId&&e.foe&&e.threatens&&e.aware&&!e.helpless&&!e.concentrating&&!e.reachImpeded&&
  Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.reachFt)&&e.reachFt>=0&&
  Math.hypot(e.x-u.x,e.y-u.y)<=Math.max(5,e.reachFt)+1e-7);
}
function verifiedShockML(character){
 const matches=(character?.hmk?.skills||[]).filter(x=>String(x.name??x.key??'').trim().toLowerCase()==='shock'&&valid(x.ml,0,200));
 need(matches.length===1,'Shock Recovery: chybí doložené jediné Shock ML postavy');
 return matches[0].ml;
}
function meleeEML({character,state,inventory,round,timelineId,usedArms}){
 const matches=(character.hmk?.skills||[]).filter(x=>String(x.name??'').trim().toLowerCase()==='melee'&&valid(x.ml,0,200));
 need(matches.length===1,'Grope v ohrožení: chybí jednoznačně doložené Melee ML postavy');
 const load=resolveCombatantLoad({character,inventory});
 need(load.ready&&load.encReady&&load.bulkReady,'Grope: nelze doložit ENC/Bulk z inventáře');
 const injury=projectLiveInjuries({state,round,test:'melee',usedArms,timelineId});
 need(injury.ready&&!injury.unusable,'Grope: Melee je omezené neověřeným nebo nepoužitelným zraněním');
 const fatigue=combatFatigueTotals(state).total;
 const parts={base:matches[0].ml,enc:load.agilityAndMeleePenalty,bulk:load.meleeBulkPenalty,
  fatigue,injury:injury.modifier,prone:state.posture.prone?-20:0};
 need(Object.values(parts).every(x=>Number.isSafeInteger(x)), 'Grope: chybí výpočet EML');
 return {eml:parts.base+parts.enc+parts.bulk-parts.fatigue+parts.injury+parts.prone,parts};
}
export function createGuidedMishapRecovery({id,sequence,states,character,inventory,kind,
 effectiveMove=null,battlefield=null,droppedItemPosition=null,readied=false}={}){
 const seq=validateEncounterSequence(sequence),actorId=currentEncounterActor(seq);
 need((readied?seq.interruptActiveId===actorId&&seq.readied?.[actorId]?.kind==='grope'&&
  seq.readied[actorId].triggered&&!seq.readied[actorId].resolved&&seq.readied[actorId].fromRound===seq.round:
  seq.active&&!seq.interruptActiveId)&&actorId===character?.id&&valid(seq.round,1,9999),
  'Mishap recovery: není aktivní Grope na vlastním IR ani vyvolané Readied přerušení');
 need(typeof id==='string'&&id&&Array.isArray(inventory),'Chybí identita akce nebo aktuální inventář');
 const state=states?.[actorId];validateCombatState(state);
 need(!['INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&state.morale?.state!=='catatonic',
  'Bezvládná postava nesmí provést zotavovací akci');
 need((readied||!seq.entryForcedPass)&&!state.posture.passNextTurn,'Povinný Pass nelze obejít vstáváním ani Grope');
 need(['stand','retrieve'].includes(kind)&&(!readied||kind==='retrieve'),'Readied Grope nelze změnit na Move');
 const due=readied?[]:dueEndTurnEvents(seq,states);
 need(due.every(x=>x.type==='shock-end-turn'&&x.characterId===actorId),'Akci blokuje jiný povinný následek na konci tahu');
 const needsShock=due.some(x=>x.type==='shock-end-turn');
 const shockML=needsShock?verifiedShockML(character):null;
 let choices=[],targetItemId=null,threatened=false,profile=null;
 if(kind==='stand'){
  need(state.posture.prone===true,'Postava již stojí');
  const standCost=state.shock==='STN'?20:10;
  need(valid(effectiveMove,standCost,100000),`Vstávání vyžaduje alespoň ${standCost} stop Effective Move (${state.shock==='STN'?'STN Difficult Movement':'běžný Move'})`);
 }else{
  need(state.posture.dropPending===true,'Postava nemá evidovaný upuštěný předmět');
  const drops=recoverableDrops(state,inventory,actorId);
  need(drops.length===1,'Nelze určit jeden konkrétní upuštěný předmět podle potvrzené historie Mishap');
  targetItemId=drops[0].id;
  need(droppedItemPosition&&Number.isFinite(droppedItemPosition.x)&&Number.isFinite(droppedItemPosition.y),
   'Grope: zadejte skutečně doloženou pozici upuštěného předmětu');
  need(battlefield&&Array.isArray(battlefield.units),'Grope: chybí mapové pozice účastníků');
  const position=battlefield.units.find(u=>u.id===actorId);
  need(position&&Number.isFinite(position.x)&&Number.isFinite(position.y),'Grope: není doložena poloha postavy');
  need(Math.hypot(position.x-droppedItemPosition.x,position.y-droppedItemPosition.y)<=5+1e-7,
   'Grope: předmět neleží v dosahu postavy (5 ft)');
  choices=handSlots.filter(slot=>!inventory.some(i=>i.characterId===actorId&&i.slot===slot));
  need(choices.length>0,'Pro zvednutí předmětu je nutná skutečně volná ruka');
  threatened=threatAt({actorId,battlefield});
  // The actual hand is chosen in the next step; arm impairment must use that hand.
 }
 return {format:'hmk-guided-mishap-recovery-v1',id,actorId,kind,targetItemId,round:seq.round,timelineId:seq.timelineId,
  sequenceWitness:witness(seq),statesWitness:witness(states),inventoryWitness:witness(inventory),characterWitness:witness(character),readied,
  phase:kind==='stand'?'stand-option':'hand',choices,selectedHand:null,threatened,profile,effectiveMove,roll:null,
  battlefield:battlefield?clone(battlefield):null,standProjection:null,actorShockAtStart:state.shock,
  needsShock,shockML,shockRoll:null,droppedItemPosition:droppedItemPosition?clone(droppedItemPosition):null,
  mishapKind:null,mishapProfile:null,mishapTechnique:null,mishapRoll:null};
}
export function guidedMishapRecoveryRequirement(s){
 need(s?.format==='hmk-guided-mishap-recovery-v1','Neplatná návaznost zotavení po Mishap');
 if(s.phase==='stand-option')return {kind:'choice',id:'recovery-stand-continuation',choices:[
  {value:'stay',label:'Pouze vstát a ukončit Move'},
  {value:'continue',label:'Vstát a pokračovat ve zbývajícím Move (s doloženou mapou)'}]};
 if(s.phase==='stand-path')return {kind:'point',id:'recovery-stand-path'};
 if(s.phase==='hand')return {kind:'choice',id:'recovery-hand',choices:s.choices.map(x=>({value:x,label:x==='main_hand'?'Volná hlavní ruka':'Volná vedlejší ruka'}))};
 if(s.phase==='die')return {kind:'die',id:'recovery-melee-d100',faces:100,actorId:s.actorId,label:'Grope pod hrozbou – Melee d100'};
 if(s.phase==='shock-die')return {kind:'die',id:'recovery-shock-d100',faces:100,actorId:s.actorId,label:'Konec tahu – povinný Shock Recovery d100'};
 if(s.phase==='mishap-choice')return {kind:'choice',id:'recovery-mishap-technique',actorId:s.actorId,
  choices:[{value:'attribute',label:'Povinný Combat Mishap – test atributu DEX/AGL'},
   {value:s.mishapProfile.alternative,label:'Povinný Combat Mishap – naučená dovednost'}]};
 if(s.phase==='mishap-die')return {kind:'die',id:'recovery-mishap-d100',faces:100,actorId:s.actorId,
  label:`Povinný Combat Mishap (${s.mishapProfile.type}) – fyzický d100`};
 if(s.phase==='ready')return {kind:'complete',id:'recovery-commit'};
 return {kind:'blocked',reason:'Nepodporovaný krok zotavení po Mishap'};
}
/** Standing consumes 10 ft of the SAME Move action, or 20 ft when
 * STN doubles the movement cost. Continuing is optional, never a new turn. */
export function chooseGuidedRecoveryStandContinuation(s,value){
 need(s.phase==='stand-option'&&['stay','continue'].includes(value),'Neplatné pokračování Move po vstávání');
 if(value==='stay')return {...s,phase:s.needsShock?'shock-die':'ready'};
 const spent=s.actorShockAtStart==='STN'?20:10;
 need(s.battlefield?.units?.some(u=>u.id===s.actorId),
  'Pokračování pohybu po vstávání vyžaduje skutečnou doloženou mapu');
 need(s.effectiveMove-spent>=5,'Po odečtení vstávání nezbývá ani 5 ft pro další pohyb');
 return {...s,phase:'stand-path'};
}
export function setGuidedRecoveryStandPath(s,{path,difficultSources}={}){
 need(s.phase==='stand-path','Pokračování pohybu není právě splatné');
 const spent=s.actorShockAtStart==='STN'?20:10;
 need(valid(difficultSources,0,8),'Difficult Movement zdroje musí být doložené celé číslo 0–8');
 const projection=projectGuidedSpatialPath({actorId:s.actorId,battlefield:s.battlefield,path,
  action:'move',moveRate:'full',effectiveMove:s.effectiveMove-spent,
  stunned:s.actorShockAtStart==='STN',difficultSources});
 need(!projection.requiresStumble,'Vstávání s běžným Move nemá vyžadovat Double Move Stumble');
 return {...s,standProjection:projection,phase:s.needsShock?'shock-die':'ready'};
}
export function chooseGuidedRecoveryHand(s,hand,{character,state,inventory}={}){
 need(s.phase==='hand'&&s.choices.includes(hand),'Vybraná ruka není volná');
 const dominance=String(character?.hmk?.handedness??'').trim().toLowerCase();
 if(s.threatened)need(['right','left','pravá','levá'].includes(dominance),'Grope: není doloženo, kterou ruku má postava dominantní');
 const mainRight=['right','pravá'].includes(dominance);
 const usedArm=hand==='main_hand'?(mainRight?'right':'left'):(mainRight?'left':'right');
 const profile=s.threatened?meleeEML({character,state,inventory,round:s.round,timelineId:s.timelineId,usedArms:[usedArm]}):null;
 return {...s,selectedHand:hand,profile,phase:s.threatened?'die':s.needsShock?'shock-die':'ready'};
}
function mishapRecoveryProfile(s,character,state,technique='attribute'){
 const dominance=String(character?.hmk?.handedness??'').trim().toLowerCase();
 need(['right','left','pravá','levá'].includes(dominance),'Mishap: chybí doložená dominantní ruka');
 const right=['right','pravá'].includes(dominance);
 const arm=s.selectedHand==='main_hand'?(right?'right':'left'):(right?'left':'right');
 return verifiedCombatMishap({kind:s.mishapKind,actor:character,state,round:s.round,
  timelineId:s.timelineId,usesDEX:true,usedArms:[arm],technique});
}
export function chooseGuidedRecoveryMishapTechnique(s,technique,{character,state}={}){
 need(s.phase==='mishap-choice'&&['attribute',s.mishapProfile.alternative].includes(technique),
  'Nepovolená volba techniky Combat Mishap');
 const profile=mishapRecoveryProfile(s,character,state,technique);
 return {...s,mishapTechnique:technique,mishapProfile:profile,
  phase:profile.forcedCF?(s.needsShock?'shock-die':'ready'):'mishap-die'};
}
export function submitGuidedRecoveryDie(s,value,{character=null,state=null}={}){
 need(['die','shock-die','mishap-die'].includes(s.phase),'Žádný další fyzický hod není splatný');
 const die=readPhysicalDieValue(value,100);
 if(s.phase==='shock-die')return {...s,shockRoll:die,phase:'ready'};
 if(s.phase==='mishap-die')return {...s,mishapRoll:die,phase:s.needsShock?'shock-die':'ready'};
 need(s.threatened,'Melee test je vyžadován jen při skutečném ohrožení');
 const naturalSL=successLevel(die,s.profile.eml),finalSL=state?.shock==='STN'?Math.max(SL.CF,naturalSL-1):naturalSL;
 const kind=combatMishap({finalSL,roll:die,naturalSL});
 if(!kind)return {...s,roll:die,phase:s.needsShock?'shock-die':'ready'};
 need(character?.id===s.actorId&&state,'Pro navazující Combat Mishap chybí doložená postava a stav');
 const next={...s,roll:die,mishapKind:kind,mishapTechnique:'attribute'};
 const profile=mishapRecoveryProfile(next,character,state);
 return {...next,mishapProfile:profile,phase:profile.alternative?'mishap-choice':
  profile.forcedCF?(s.needsShock?'shock-die':'ready'):'mishap-die'};
}

export function completeGuidedMishapRecovery({session,sequence,states,character,inventory}={}){
 const s=session,seq=validateEncounterSequence(sequence);
 need(guidedMishapRecoveryRequirement(s).kind==='complete','Nedokončený fyzický hod nebo hráčská volba');
 need(s.sequenceWitness===witness(seq)&&s.statesWitness===witness(states)&&
  s.inventoryWitness===witness(inventory)&&s.characterWitness===witness(character),
  'Změna Initiative, vybavení nebo bojového stavu zneplatnila výpočet');
 need(currentEncounterActor(seq)===s.actorId,'Zotavení nepatří právě jednající postavě');
 if(s.readied){
  const r=seq.readied?.[s.actorId];
  need(r?.kind==='grope'&&r.triggered===true&&!r.resolved&&r.fromRound===seq.round&&
    seq.interruptActiveId===s.actorId&&!r.resolution,'Přerušení Grope již není otevřené');
  const map=seq.spatialUnits??[];
  need(s.battlefield?.units?.length===seq.order.length&&seq.order.every(id=>{
   const observed=s.battlefield.units.find(u=>u.id===id);
   const existing=map.find(u=>u.id===id);
   return observed&&Number.isFinite(observed.x)&&Number.isFinite(observed.y)&&
    (!map.length||existing&&Math.hypot(existing.x-observed.x,existing.y-observed.y)<1e-7);
  }), 'Readied Grope: mapa přerušení se změnila nebo není úplná');
 }
 const state=clone(states[s.actorId]);validateCombatState(state);
 const moveCostAtAction=state.shock==='STN'?20:10;
 const nextInventory=clone(inventory);
 let result='stood',action='move',sl=null;
 if(s.kind==='stand'){
  need(state.posture.prone&&s.effectiveMove>=(state.shock==='STN'?20:10),'Postava nyní nemůže vstát');
  state.posture.prone=false;
  if(s.standProjection){
   need(s.standProjection.actorId===s.actorId&&s.standProjection.action==='move',
    'Neplatný pokračující pohyb po vstávání');
   need(s.standProjection.chargedMovementFt<=s.effectiveMove-moveCostAtAction+1e-7,
    'Trasa přesáhla zbývající efektivní Move');
  }
 }else{
  action='grope';
  need(state.posture.dropPending&&handSlots.includes(s.selectedHand),'Grope: chybí upuštěný předmět nebo volná ruka');
  const item=nextInventory.find(i=>i.id===s.targetItemId&&i.characterId===s.actorId&&i.slot==='none'&&!i.destroyed);
  need(item&&!nextInventory.some(i=>i.characterId===s.actorId&&i.slot===s.selectedHand),
   'Grope: předmět nebo volná ruka se změnily');
  if(s.threatened){
   const naturalSL=successLevel(s.roll,s.profile.eml);
   sl=states[s.actorId].shock==='STN'?Math.max(SL.CF,naturalSL-1):naturalSL;
   const kind=combatMishap({finalSL:sl,roll:s.roll,naturalSL});
   need(kind===s.mishapKind,'Změnila se klasifikace povinného Mishap');
  }
  if(!s.threatened||sl>=SL.S){
   item.slot=s.selectedHand;
   state.posture.dropPending=false;
   result='retrieved';
  }else result='failed-grope';
 }
 let mishapEvidence=null;
 if(s.mishapKind){
  need(s.mishapProfile&&
   (s.mishapProfile.forcedCF||valid(s.mishapRoll,1,100)),
   'Nejsou dokončeny fyzické hody povinného Combat Mishap');
  const applied=applyGuidedCombatMishap({state,round:s.round,eventId:s.id+':grope-mishap',
   actorId:s.actorId,profile:s.mishapProfile,roll:s.mishapProfile.forcedCF?null:s.mishapRoll,origin:'melee'});
  // The item being manipulated during Grope already lies on the ground.
  // A failed Fumble must not silently drop an unrelated weapon from another hand.
  Object.assign(state,applied.state);
  mishapEvidence={kind:s.mishapKind,profile:s.mishapProfile,result:applied.result,
   die:s.mishapRoll};
 }
 let shockEvidence=null;
 if(s.needsShock){
  need(valid(s.shockRoll,1,100)&&valid(s.shockML,0,200),'Nedokončený povinný Shock Recovery Roll');
  const shockEML=s.shockML-combatFatigueTotals(state).total;
  const resolved=applyConfirmedShockRecovery({state,round:s.round,eventId:s.id+':shock-recovery',
   sl:successLevel(s.shockRoll,shockEML),timingConfirmed:true,characterId:s.actorId,actorId:s.actorId,
   turnEnded:true,timelineId:s.timelineId,shockML:s.shockML,roll:s.shockRoll});
  Object.assign(state,resolved.state);
  shockEvidence={faces:100,value:s.shockRoll,actorId:s.actorId,kind:'shock-recovery',shockML:s.shockML,rawEML:shockEML,source:'GM-entered-physical-die'};
 }
 const statesNext={...states,[s.actorId]:state};
 let nextSeq;
 if(s.readied){
  nextSeq=clone(seq);
  if(!nextSeq.spatialUnits?.length)nextSeq.spatialUnits=s.battlefield.units.map(u=>({id:u.id,x:u.x,y:u.y}));
  nextSeq.readiedGropeEvents??=[];
  need(!nextSeq.readiedGropeEvents.some(e=>e.id===s.id),'Duplicitní Readied Grope');
  nextSeq.readiedGropeEvents.push({id:s.id,actorId:s.actorId,round:s.round,itemId:s.targetItemId,
   hand:s.selectedHand,result});
  nextSeq.readied[s.actorId].resolution={kind:'grope',actorId:s.actorId,eventId:s.id,
   timelineId:s.timelineId,round:s.round};
  nextSeq=completeReadiedEncounterAction(nextSeq,{gmConfirmed:true});
  nextSeq.log.push({round:s.round,type:'readied-guided-resolution',actorId:s.actorId,kind:'grope',
   eventId:s.id,result});
 }else nextSeq=finishEncounterTurn(seq,statesNext,{action,gmConfirmed:true});
 if(s.standProjection){
  const positions=(s.battlefield?.units||[]).map(u=>({id:u.id,x:u.x,y:u.y}));
  const actor=positions.find(u=>u.id===s.actorId);
  need(actor,'Pro trvalý zápis pohybu chybí poloha postavy');
  actor.x=s.standProjection.finalPosition.x;
  actor.y=s.standProjection.finalPosition.y;
  nextSeq.spatialUnits=positions;
 }
 const dice=s.roll==null?[]:[{faces:100,value:s.roll,actorId:s.actorId,kind:'grope-melee',eml:s.profile.eml,
  source:'GM-entered-physical-die'}];
 if(mishapEvidence?.die!=null)dice.push({faces:100,value:mishapEvidence.die,actorId:s.actorId,kind:'combat-mishap',
  source:'GM-entered-physical-die'});
 if(shockEvidence)dice.push(shockEvidence);
 const proof={sourceEventId:s.id,timelineId:s.timelineId,round:s.round,actorId:s.actorId,
  actionKind:s.kind==='stand'?'stand-with-move':s.readied?'readied-grope-pickup':'grope-retrieve',
  kind:s.readied?'grope':null,interruptIR:s.readied?seq.readied[s.actorId].interruptIR:null,action,result,itemId:s.targetItemId,
  droppedItemPosition:s.droppedItemPosition,
  hand:s.selectedHand,movementSpentFt:s.kind==='stand'?moveCostAtAction+(s.standProjection?.chargedMovementFt??0):0,
  standingCostFt:s.kind==='stand'?moveCostAtAction:0,
  continuedMovementFt:s.standProjection?.actualFt??0,
  spatial:s.standProjection?clone(s.standProjection):null,threatened:s.threatened,sl,eml:s.profile?.eml??null,
  physicalDice:dice,mishap:mishapEvidence};
 state.events.push({id:s.id,type:'mishap-recovery',round:s.round,details:clone(proof)});
 state.lastRound=Math.max(state.lastRound,s.round);validateCombatState(state);
 return {sequence:nextSeq,states:{...states,[s.actorId]:state},inventory:nextInventory,proof};
}
