/** HMK World of Kèthîra, pp.106,161,172.
 * A source-verified Free Press in the SAME strike journey, AFTER the wound and
 * immediate Mishaps, BEFORE Action TA. The player only chooses whether to use
 * the optional Press; all dice must be physically entered. Writes are staged.
 */
import {decideFreePress,applyAutomaticFreePress} from './hmk-automatic-decisions.js';
import {applyConfirmedManeuverConsequence,verifiedManeuverConsequence} from './hmk-maneuver-persistence.js';
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {validateCombatState} from './persistent-combat-state.js';
const need=(c,m)=>{if(!c)throw Error(m)};
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=structuredClone;
const sig=x=>JSON.stringify(x);
const skill=(c,key)=>c?.hmk?.skills?.find(s=>String(s.name??'').trim().toLowerCase()===key)?.ml;
export function createGuidedFreePress({gate,attackerId,defenderId,round,timelineId,sourceSignature,
 eventId,actor,target,targetState,meleeProofKey=null}={}){
 const decision=decideFreePress({gate,attackerId,defenderId,round,timelineId,sourceSignature,meleeProofKey});
 need(decision.eligible,'HMK nedovoluje Free Press z tohoto Melee');
 need(actor?.id===decision.ownerId&&target?.id===decision.targetId,'Nesoulad skutečných účastníků Free Press');
 need(typeof eventId==='string'&&eventId,'Chybí ID Free Press');
 need(whole(actor.hmk?.attributes?.str,1,40)&&whole(target.hmk?.attributes?.str,1,40),
  'Free Press vyžaduje skutečné Strength obou účastníků');
 validateCombatState(targetState);
 return {format:'hmk-guided-free-press-v1',decision,eventId,actorId:actor.id,targetId:target.id,
  ownerSTR:actor.hmk.attributes.str,targetSTR:target.hmk.attributes.str,
  targetState:copy(targetState),stateWitness:sig(targetState),targetProfile:copy(target),
  phase:'choice',choice:null,ownerD6:null,targetD6:null,consequenceD100:null,physicalDice:[],staged:null,displacement:null};
}
export function guidedFreePressRequirement(s){
 need(s?.format==='hmk-guided-free-press-v1','Neplatná posloupnost Free Press');
 if(s.phase==='choice')return {kind:'choice',id:'free-press',choices:[
  {value:'yes',label:'Využít volitelný Free Press'}, {value:'no',label:'Nevyužít Free Press'}]};
 if(s.phase==='ownerD6')return {kind:'die',id:'freePressOwnerD6',faces:6,label:'Free Press: d6 vítěze',actorId:s.actorId};
 if(s.phase==='targetD6')return {kind:'die',id:'freePressTargetD6',faces:6,label:'Free Press: d6 cíle',actorId:s.targetId};
 if(s.phase==='displacement')return {kind:'maneuver-position',id:'free-press-displacement',label:'Volný Press musí zaznamenat skutečné odsunutí cíle'};
 if(s.phase==='consequence'&&verifiedManeuverConsequence({state:s.staged.state,character:s.targetProfile,round:s.decision.round,timelineId:s.decision.timelineId}).forcedCF)
  return {kind:'automatic',id:'free-press-forced-cf'};
 if(s.phase==='consequence')return {kind:'die',id:'freePressConsequenceD100',faces:100,
  label:`Press ${s.staged.state.pendingManeuver?.kind==='shock'?'Shock':'Stumble'}: d100 cíle`,actorId:s.targetId};
 return {kind:'complete',choice:s.choice,result:s.staged};
}
export function chooseGuidedFreePress(s,choice){
 need(guidedFreePressRequirement(s).kind==='choice'&&['yes','no'].includes(choice),'Neplatná volba Free Press');
 return {...s,choice,phase:choice==='yes'?'ownerD6':'ready'};
}
function proof(req,value){return {id:req.id,faces:req.faces,value,label:req.label,source:'GM-entered-physical-die'};}
export function submitGuidedFreePressDie(s,value){
 const req=guidedFreePressRequirement(s);need(req.kind==='die','Free Press právě nečeká na skutečný hod');
 const n=readPhysicalDieValue(value,req.faces),roll=proof(req,n);
 const next={...s,physicalDice:[...s.physicalDice,roll]};
 if(s.phase==='ownerD6')return {...next,ownerD6:n,phase:'targetD6'};
 if(s.phase==='targetD6'){
  const result=applyAutomaticFreePress({decision:s.decision,round:s.decision.round,
   timelineId:s.decision.timelineId,sourceSignature:s.decision.sourceSignature,
   attackerId:s.decision.attackerId,defenderId:s.decision.defenderId,
   aftermathResolved:true,state:s.targetState,eventId:s.eventId,ownerSTR:s.ownerSTR,targetSTR:s.targetSTR,
   ownerD6:s.ownerD6,targetD6:n});
  const pending=result.state.pendingManeuver;
  return {...next,targetD6:n,staged:result,phase:result.effect?.backFeet?'displacement':pending?'consequence':'ready'};
 }
 const pending=s.staged?.state?.pendingManeuver;
 need(pending?.kind==='shock'||pending?.kind==='stumble','Není splatný následek manévru');
 const ctx=verifiedManeuverConsequence({state:s.staged.state,character:s.targetProfile,round:s.decision.round,timelineId:s.decision.timelineId});
 need(!ctx.forcedCF,'Grievous impairment vyžaduje automatické CF bez d100');
 const changed=applyConfirmedManeuverConsequence({state:s.staged.state,round:s.decision.round,
  eventId:s.eventId+':consequence',kind:pending.kind,roll:n,ml:ctx.ml,hasLegs:ctx.hasLegs,gmConfirmed:true});
 return {...next,consequenceD100:n,staged:{...s.staged,state:changed.state,consequence:changed.outcome},phase:'ready'};
}

/** HMK p.170: no dice are generated/requested for an automatic CF. */
export function advanceGuidedFreePressForcedConsequence(s){
 need(guidedFreePressRequirement(s).id==='free-press-forced-cf','Není splatné automatické CF Free Press');
 const ctx=verifiedManeuverConsequence({state:s.staged.state,character:s.targetProfile,round:s.decision.round,timelineId:s.decision.timelineId});
 const changed=applyConfirmedManeuverConsequence({state:s.staged.state,round:s.decision.round,
  eventId:s.eventId+':consequence',kind:ctx.kind,ml:ctx.ml,hasLegs:ctx.hasLegs,forcedCF:true,gmConfirmed:true});
 return {...s,staged:{...s.staged,state:changed.state,consequence:changed.outcome},phase:'ready'};
}

export function submitGuidedFreePressDisplacement(s,{units,destination,clearPath}={}){
 need(s?.phase==='displacement'&&s.staged?.effect?.backFeet,'Free Press nevyžaduje prostorový krok');
 need(clearPath===true,'Chybí přesné potvrzení volné skutečné dráhy');
 need(Array.isArray(units)&&units.length>=2&&units.every(u=>typeof u.id==='string'&&Number.isFinite(u.x)&&Number.isFinite(u.y))&&new Set(units.map(u=>u.id)).size===units.length,
  'Chybí skutečné původní pozice účastníků');
 need(Number.isFinite(destination?.x)&&Number.isFinite(destination?.y),'Chybí doložený cíl Free Press');
 const owner=units.find(u=>u.id===s.actorId),target=units.find(u=>u.id===s.targetId);
 need(!!owner&&!!target,'Chybí skutečná poloha obránce nebo útočníka');
 const feet=s.staged.effect.backFeet;
 need(Math.abs(Math.hypot(destination.x-target.x,destination.y-target.y)-feet)<0.00001,
  `Free Press musí cíl přesunout přesně ${feet} stop`);
 need(Math.hypot(destination.x-owner.x,destination.y-owner.y)>Math.hypot(target.x-owner.x,target.y-owner.y)+0.00001,
  'Free Press musí cíl odstrčit od vítěze Melee');
 need(!units.some(u=>u.id!==s.targetId&&Math.hypot(u.x-destination.x,u.y-destination.y)<0.00001),
  'Cílové pole je obsazené');
 return {...s,displacement:{kind:'free-press',actorId:s.actorId,targetId:s.targetId,feet,
  units:copy(units),from:{x:target.x,y:target.y},to:copy(destination),observedClearPath:true,source:'HMK p.106'},
  phase:s.staged.state.pendingManeuver?'consequence':'ready'};
}

export function completeGuidedFreePress({session,currentState}={}){
 const s=session;need(s?.format==='hmk-guided-free-press-v1'&&s.phase==='ready',
  'Nedokončený nebo zrušený Free Press');
 need(sig(currentState)===s.stateWitness,'Cíl se po původním zásahu změnil; Free Press vyžaduje nový výpočet');
 if(s.choice==='no')return {used:false,choice:'no',state:copy(currentState),physicalDice:[]};
 need(s.staged?.state&&!s.staged.state.pendingManeuver,'Nedořešený Shock/Stumble po Press');
 const final=copy(s.staged.state);const event=final.events.find(e=>e.id===s.eventId);
 need(event,'Chybí potvrzený Press');
 event.details.physicalDice={format:'hmk-manual-dice-proof-v1',source:'HMK pp106,172',rolls:copy(s.physicalDice)};
 validateCombatState(final);
 return {used:true,choice:'yes',state:final,physicalDice:copy(s.physicalDice),
  margin:s.staged.margin,effect:s.staged.effect,ownerId:s.actorId,targetId:s.targetId,eventId:s.eventId,
  displacement:s.displacement?copy(s.displacement):null};
}
