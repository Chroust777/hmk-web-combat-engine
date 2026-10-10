/** HMK Kèthîra pp.161,165,170: live, manual-dice-only Melee CF aftermath.
 * A Melee mishap is distinct from an INJURY mishap and must be applied after
 * the strike's Injury Sequence. Pure staged state; no persistent write here.
 */
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {hmkMishapTransition} from './injury-special-hmk.js';
import {successLevel,SL} from '../rules/tests.js';
const assert=(c,m)=>{if(!c)throw Error(m)};
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const copy=structuredClone;
export function verifiedCombatMishap({kind,actor,state,round,timelineId,usesDEX=true,usedArms=null,technique='attribute'}={}){
 validateCombatState(state);
 assert(['fumble','stumble'].includes(kind)&&actor?.id&&actor.hmk,'Chybí skutečný Melee CF nebo postava');
 const a=actor.hmk.anatomy??{},human=String(actor.hmk.folk??'').toLowerCase()==='human';
 const hasDEX=typeof a.hasDEX==='boolean'?a.hasDEX:human&&int(actor.hmk.attributes?.dex,1,40)?true:null;
 const amputations=new Set(state.wounds.filter(w=>w.amputation?.severed&&['th','kn','ca','ft','thigh','knee','calf','foot'].includes(w.location)&&['left','right'].includes(w.side)).map(w=>w.side));
 const hasLegs=amputations.size===2?false:typeof a.hasLegs==='boolean'?a.hasLegs:human?true:null;
 assert(typeof hasDEX==='boolean'&&typeof hasLegs==='boolean','Mishap vyžaduje doloženou anatomii tvora');
 const type=kind==='fumble'&&hasDEX&&usesDEX?'fumble':'stumble';
 const test=type==='fumble'?'dexterity':'agility';
 const alternative=type==='fumble'?'legerdemain':'acrobatics';
 const learned=(actor.hmk.skills??[]).find(s=>String(s.name??s.key??'').toLowerCase()===alternative&&int(s.ml,0,200));
 assert(technique==='attribute'||technique===alternative&&learned,'Nepovolená náhrada dovednosti při Mishap');
 const ml=technique==='attribute'?5*actor.hmk.attributes?.[type==='fumble'?'dex':'agl']:learned.ml;
 assert(int(ml,0,200),'Chybí ověřené DEX/AGL nebo naučená dovednost');
 const projection=projectLiveInjuries({state,round,test:technique==='attribute'?test:alternative,
  usedArms:type==='fumble'?(usedArms??null):['none'],timelineId});
 assert(projection.ready,'Mishap: '+projection.reason);
 const fatigue=combatFatigueTotals(state).total;
 return {kind:type==='fumble'?'fumble-roll':'stumble-roll',type,hasDEX,hasLegs,actionUsesDEX:usesDEX,
  baseML:ml,skill:technique,alternative:learned?alternative:null,injuryImpairment:projection.impairment,
  fatigue,stunned:state.shock==='STN',forcedCF:projection.unusable,test};
}
export function applyGuidedCombatMishap({state,eventId,round,actorId,profile,roll=null}={}){
 validateCombatState(state);
 assert(state.shock!=='KIA','Mrtvý účastník nepodstupuje Melee Mishap');
 assert(!state.events.some(e=>e.id===eventId)&&int(round,1,9999)&&round>=state.lastRound,'Duplicitní nebo zastaralý Mishap');
 assert(profile&&profile.kind,'Chybí původní ověřená pravidlová projekce');
 if(!profile.forcedCF)assert(int(roll,1,100),'Mishap vyžaduje skutečný fyzický d100');
 const result=hmkMishapTransition({kind:profile.forcedCF?(profile.type==='fumble'?'automatic-fumble':'automatic-stumble'):profile.kind,roll,baseML:profile.baseML,
  hasDEX:profile.hasDEX,hasLegs:profile.hasLegs,actionUsesDEX:profile.actionUsesDEX,
  injuryImpairment:profile.injuryImpairment,fatigue:profile.fatigue,stunned:profile.stunned,
  forcedCF:profile.forcedCF});
 const next=copy(state);
 if(result.effect==='drop-item')next.posture.dropPending=true;
 if(result.effect==='prone')next.posture.prone=true;
 if(result.effect==='pass-next-turn')next.posture.passNextTurn=true;
 next.events.push({id:eventId,type:'hmk-melee-mishap',round,details:{actorId,profile:copy(profile),result,
  physicalDice:roll===null?[]:[{id:'combatMishapD100',faces:100,value:roll,source:'GM-entered-physical-die'}]}});
 next.lastRound=round;validateCombatState(next);return {state:next,result};
}
