/** HârnMaster World of Kèthîra p165, p171–172, p191. Conservative, GM-confirmed transitions.
 * Every new entry is deterministic, idempotent and tied to a real character/inventory.
 */
import {weaponDamageImpact,weaponDamageResult} from '../rules/weapon-damage.js';
import {resolveAreaHit} from '../rules/area.js';
import {controlEML,mountedTurnControl,riderImpactEffect} from '../rules/mounted.js';
import {SL,successLevel} from '../rules/tests.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {applyShockState} from '../rules/shock.js';
const assert=(b,m)=>{if(!b)throw Error(m)};
const valid=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=structuredClone;
function safeState(state,round,eventId,confirmed){const s=copy(state??initialCombatState());validateCombatState(s);assert(confirmed===true,'Vyžadováno explicitní potvrzení GM');assert(valid(round,1,9999)&&round>=s.lastRound,'Neplatné kolo');assert(typeof eventId==='string'&&eventId&&!s.events.some(x=>x.id===eventId),'Chybné nebo duplicitní ID');assert(s.shock!=='KIA','KIA');return s;}
function record(s,id,round,type,details){s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s;}
/** Use only actual WQ on an equipped object; threshold is strictly > current WQ, > double WQ. */
export function applyConfirmedWeaponWQ({inventory,targetInventoryId,strikeImpact,csTiebreak=false,targetIsShield=false,thrust=false,sourceNatural=false,targetArmed=false,gmConfirmed=false}={}){
 assert(gmConfirmed===true,'GM musí potvrdit úspěšný Weapon Damage Check (HMK p191)');
 assert(Array.isArray(inventory)&&valid(strikeImpact,0,1000),'Skutečný Strike Impact a inventář jsou povinné');
 const clone=copy(inventory),item=clone.find(x=>x.id===targetInventoryId);
 assert(!!item&&['main_hand','off_hand'].includes(item.slot)&&['weapon','shield'].includes(item.snapshot?.category),'Zasažen musí být skutečně nasazený Weapon/Shield');
 assert(typeof item.currentWQ==='number'&&valid(item.currentWQ,0,999),'Chybí ověřené aktuální WQ');
 assert(!!targetIsShield===(item.snapshot.category==='shield'),'Příznak Shield nesouhlasí se skutečným předmětem');
 const effective=weaponDamageImpact({strikeImpact,csTiebreak,targetIsShield,thrust,sourceNatural,targetArmed});
 const result=weaponDamageResult({impact:effective,currentWQ:item.currentWQ});
 const before=item.currentWQ;
 if(result.destroyed){item.condition='Destroyed (HMK Weapon Damage)';item.currentWQ=0;item.slot='none';}
 else if(result.wqLoss)item.currentWQ=Math.max(0,item.currentWQ-result.wqLoss);
 return {inventory:clone,itemId:item.id,effectiveImpact:effective,before,after:item.currentWQ,...result};
}
/** Area assault needs one explicit target per result; no invented LD, Dodge or Shock d100.
 * Additional Area events involving an existing Area wound require full Compound Injury adjudication.
 */
export function applyConfirmedAreaStrike({state,round,eventId,strikeImpact,areaAV,aspect='fire',dodgeML=null,dodgeRoll=null,shockML,shockRoll,compoundD10=null,gmConfirmed=false}={}){
 const s=safeState(state,round,eventId,gmConfirmed);
 assert(valid(strikeImpact,0,999)&&valid(areaAV,0,999)&&['fire','frost'].includes(aspect),'Neplatný Fire/Frost Area Impact nebo Area AV');
 assert(valid(shockML,0,200)&&valid(shockRoll,1,100),'Area Shock vyžaduje skutečný d100 a ověřené EML');
 assert(dodgeRoll==null||valid(dodgeML,0,200)&&valid(dodgeRoll,1,100),'Area Dodge vyžaduje kompletní ověřený hod');
 assert(compoundD10===null||valid(compoundD10,1,10),'Compound Injury pro Area vyžaduje skutečný d10');
 const priorArea=s.wounds.filter(w=>!w.healed&&w.location==='area').map(w=>({id:w.id,location:'area',area:true,level:w.level,severity:w.severity,aspect:w.aspect}));
 const dodgeSL=dodgeRoll==null?null:successLevel(dodgeRoll,dodgeML);
 const shockSL=successLevel(shockRoll,shockML);
 const previous={NONE:'none',STN:'stunned',INC:'incapacitated',UNC:'unconscious',KIA:'killed'}[s.shock];
 const r=resolveAreaHit({strikeImpact,areaAV,aspect,evadeDodgeSL:dodgeSL,currentShockState:previous,shockSL,existingInjuries:priorArea,compoundD10});
 assert(r.injury?.complete,'Area Injury Sequence / Compound Injury vyžaduje další ověření: '+JSON.stringify(r.injury?.pending));
 const incident=r.injury.step3?.injury;const incoming=r.injury.shock.state;
 const compoundedPrior=r.injury.step3?.compound?.compoundedExisting??null;
 if(compoundedPrior){const old=s.wounds.find(w=>w.id===compoundedPrior.id);assert(!!old,'Poškozený odkaz na předchozí Area Injury');old.level=compoundedPrior.level;old.severity=compoundedPrior.severity;}
 s.shock={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'}[applyShockState(previous,incoming)];
 if(dodgeSL!==null||['INC','UNC'].includes(s.shock))s.posture.prone=true;
 if(incident){
  const id=`area:${eventId}`;
  s.wounds.push({id,location:'area',severity:incident.severity,level:incident.level,aspect,bleeding:false,nextAdvanceRound:null,recordedRound:round,originEventId:eventId,shockSL:Object.keys(SL).find(k=>SL[k]===shockSL),moralePending:['S','G'].includes(incident.severity)});
 }
 if(s.shock==='KIA'){s.extendedShock=null;s.coma=null;s.shockFollowup=null;for(const w of s.wounds)w.nextAdvanceRound=null;}
 else if(s.shock!=='NONE')s.shockFollowup={kind:s.shock,originRound:round,dueRound:round+(s.shock==='UNC'?120:1),phase:s.shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:s.encounterTimelineId??null};
 return {state:record(s,eventId,round,'hmk-area-impact',{strikeImpact,areaAV,aspect,dodgeML,dodgeRoll,shockML,shockRoll,shockSL,compoundD10,compound:r.injury.step3?.compound?.required??false,kind:r.injury.base.injury?.severity,shock:s.shock}),result:r};
}
/** A mounted control roll is the Rider's real Riding ML + mount's Initiative secondary mod. */
export function applyConfirmedMountedControl({state,round,eventId,ridingML,mountInitiativeML,roll,retestRoll=null,gmConfirmed=false}={}){
 const s=safeState(state,round,eventId,gmConfirmed);
 assert(valid(ridingML,0,200)&&valid(mountInitiativeML,0,200)&&valid(roll,1,100),'Chybí Riding ML, Initiative ML nebo skutečný d100');
 const eml=controlEML({ridingML,mountInitiativeML});const sl=successLevel(roll,eml);
 let second=null;
 if(retestRoll!==null){assert(valid(retestRoll,1,100),'Neplatný Grope retest');assert(sl<SL.S,'Úspěšný Control nemá další Grope retest');second=successLevel(retestRoll,eml)>=SL.S;}
 const result=mountedTurnControl({controlSucceeded:sl>=SL.S,retestSucceeded:second});
 s.mountControl={...result,round,eml,roll,retestRoll,initialSL:Object.keys(SL).find(k=>SL[k]===sl)};
 return {state:record(s,eventId,round,'hmk-mounted-control',{ridingML,mountInitiativeML,eml,roll,retestRoll,result}),result};
}
/** Explicit measured mounted charge adds rider impact through the remainder of next round. */
export function applyConfirmedMountedCharge({state,round,eventId,mountRiderImpact,straightDistanceFt,gmConfirmed=false}={}){
 const s=safeState(state,round,eventId,gmConfirmed);
 assert(s.mountControl?.controlled===true&&s.mountControl.round===round,'Kůň musí být v tomto kole skutečně ovládaný');
 assert(valid(mountRiderImpact,0,30)&&Number.isFinite(straightDistanceFt)&&straightDistanceFt>=0,'Ověřený straight movement a mount rider impact jsou povinné');
 const result=riderImpactEffect({mountRiderImpact,straightDistanceFt,earnedRound:round});
 s.mountedRiderImpact=result;
 return {state:record(s,eventId,round,'hmk-mounted-impact',{mountRiderImpact,straightDistanceFt,...result}),result};
}
