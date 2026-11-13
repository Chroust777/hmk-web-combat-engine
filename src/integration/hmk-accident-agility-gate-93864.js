/** v93.864: non-mutating Agility gate for confirmed Survival Accidents.
 * HMK p.61,148. This module does not create dice, advance the calendar or
 * append health receipts. The final injury executor remains authoritative.
 */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals} from './persistent-combat-state.js';
import {successLevel} from '../rules/tests.js';
const must=(ok,message)=>{if(!ok)throw Error(message);};
export const ACCIDENT_AGILITY_STAGE_FORMAT_93864='hmk-survival-accident-agility-confirmation-v1';
export function accidentAgilityML93864(actor){
 const m=availableMasteries(actor).filter(x=>x.name.toLowerCase()==='agility');
 must(m.length===1&&Number.isSafeInteger(m[0].ml)&&m[0].ml>0,'Postava nemá doložené Agility ML.');
 return m[0].ml;
}
export function inspectAccidentAgility93864({actor,state,inventory,round=1,sourceId,roll=null}={}){
 must(actor?.id&&state&&Array.isArray(inventory)&&typeof sourceId==='string'&&sourceId,
  'Pro Agility chybí potvrzená oběť, zdravotní stav nebo zdroj nehody.');
 const ml=accidentAgilityML93864(actor);
 must(state.shock==='NONE'&&!state.coma?.active&&!state.extendedShock,
  'Agility nelze vyhodnotit při aktivním Shock/Coma; rozhodnutí náleží GM.');
 const injury=projectLiveInjuries({state,round,test:'agility',usedArms:['left','right'],timelineId:'skill:'+sourceId});
 must(injury.ready&&!injury.unusable&&!injury.stunned,
  'Aktuální zranění neumožňují Agility: '+(injury.reason||'nedoložený zdravotní stav'));
 const animal=!!actor.hmk?.verifiedMountedBreed;
 let loadPenalty=0;
 if(animal){
  must(Number.isSafeInteger(actor.hmk?.attributes?.agl),'Zvíře nemá ověřenou Agility.');
  must(!inventory.some(x=>x.characterId===actor.id&&x.slot==='worn'),
   'Zvíře má výstroj na těle; bez ověřeného zdravotního posouzení nelze automaticky určit Agility.');
 }else{
  const load=resolveCombatantLoad({character:actor,inventory});
  must(load.ready&&load.encReady&&load.bulkReady,
   'Agility nemá doložené ENC/Bulk; nejprve opravte výstroj.');
  loadPenalty=load.agilityAndMeleePenalty;
 }
 const eml=ml-combatFatigueTotals(state).total+loadPenalty+injury.modifier;
 must(Number.isSafeInteger(eml),'Agility EML není pravidlově doloženo.');
 if(roll===null)return {ml,eml,level:null,roll:null};
 must(Number.isSafeInteger(roll)&&roll>=1&&roll<=100,'Agility d100 musí být celé číslo 1–100.');
 const level=['CF','F','S','CS'][successLevel(roll,eml)];
 return {ml,eml,roll,level,failed:level==='F'||level==='CF'};
}
/** A confirmed draft can only be used with the unchanged source, victim,
 * roll, campaign and effective mastery. It is NOT a permanent injury receipt. */
export function validateAccidentAgilityStage93864(stage,{sourceId,campaignId,victimId,roll,ml,eml,level}={}){
 return !!(stage&&stage.format===ACCIDENT_AGILITY_STAGE_FORMAT_93864&&
  stage.sourceId===sourceId&&stage.campaignId===campaignId&&stage.victimId===victimId&&
  stage.roll===roll&&stage.ml===ml&&stage.eml===eml&&stage.level===level&&
  stage.confirmed===true);
}
