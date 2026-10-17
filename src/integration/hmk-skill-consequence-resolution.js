/** HMK v1.2 pp.60–62,161,169–170: deterministic consequences of standalone
 * Skill Workbench tests. All Combat / Trauma writes remain owned by the
 * existing guided Combat engine. This module never rolls or mutates anything.
 */
import {SL,successValue} from '../rules/tests.js';
import {combatMishap} from '../rules/mishaps.js';
import {dueInjuryMorale,unresolvedInjuryMishaps,validateCombatState} from './persistent-combat-state.js';
import {SUCCESS_LEVEL_NAMES,successValueTier} from './hmk-skill-test-engine.js';
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const COMBAT_SKILLS=Object.freeze({Melee:'melee',Archery:'missile',Throwing:'missile',Slings:'missile',Dodge:'dodge'});
/** Forced CF carries no invented d100 or spurious CF0/CF5. */
export function automaticCriticalFailure({ml,reason,woundIds=[],svExtra=0}={}){
 if(!int(ml,1,1000)||!int(svExtra,-50,50)||typeof reason!=='string'||!reason.trim()||!Array.isArray(woundIds))throw Error('Vynucené CF nemá ověřené ML, důvod nebo zranění');
 const sv=successValue({ml,sl:SL.CF,extra:svExtra});
 return {kind:'hmk-skill-test-v1',ml,index:Math.floor(ml/10),roll:null,rollOrigin:'rule-forced-no-die',
  forcedCF:true,secondary:[],assistance:0,gmModifier:0,eml:null,rawEML:null,forcedReason:reason,unusableWoundIds:[...woundIds],sl:SL.CF,level:'CF',
  sv,svExtra,svTier:successValueTier(sv),unopposedStars:0,splitCF:null,preTraumaSL:null,traumaSLPenalty:0};
}
/** Read-only projection; same pending IDs are NEVER copied into another queue. */
export function pendingCombatConsequences(actor){
 const s=actor?.hmk?.combatState;
 if(!s)return {state:'unknown',events:[],reason:'Není potvrzen Combat State'};
 try{validateCombatState(s);}catch(e){return {state:'invalid',events:[],reason:e.message};}
 const events=[];
 for(const m of unresolvedInjuryMishaps(s))events.push({type:'injury-mishap',id:m.id,sourceId:m.woundId,label:`Injury Mishap ${m.kind}`});
 for(const w of dueInjuryMorale(s))events.push({type:'injury-morale',id:`morale:${w.id}`,sourceId:w.id,label:'Povinný Morale po zranění'});
 if(s.shockFollowup)events.push({type:'shock-followup',id:`shock:${s.shockFollowup.originRound}:${s.shockFollowup.kind}`,sourceId:s.shockFollowup.kind,label:'Shock Recovery v předepsaném čase'});
 if(s.extendedShock)events.push({type:'extended-shock',id:`extended:${s.extendedShock.originState}`,sourceId:s.extendedShock.originState,label:'Extended Shock – další pravidlový průběh'});
 if(s.coma?.active)events.push({type:'coma',id:'coma:active',sourceId:'coma',label:'Coma – další průběh'});
 if(s.bloodShockPending===true)events.push({type:'blood-shock',id:'blood-shock:pending',sourceId:'blood-shock',label:'Blood Shock – trvalý povinný následek'});
 for(const w of s.wounds??[])if(w.bleeding&&Number.isSafeInteger(w.nextAdvanceRound))events.push({type:'bleeding-scheduled',id:`bleeding:${w.id}:${w.nextAdvanceRound}`,sourceId:w.id,label:`Blood Loss – plánováno kolo ${w.nextAdvanceRound}; splatnost vyhodnotí Combat`});
 for(const x of s.morale?.specialPending??[])events.push({type:'special-morale',id:`special-morale:${x.id}`,sourceId:x.sourceEventId,label:x.description});
 const seen=new Set();return {state:'confirmed',events:events.filter(e=>!seen.has(e.id)&&seen.add(e.id)),source:'authoritative-character.hmk.combatState',readOnly:true};
}
/** Context is explicit. The generic CF has NO universal physical mishap.
 * In combat, only existing Combat can commit mishap and equipment/posture changes.
 */
export function classifySkillConsequence({actor,skill,result,trauma,context='general'}={}){
 if(!result||!int(result.sl,0,3)||!int(result.ml,1,1000)||typeof skill!=='string'||!skill)throw Error('Chybí validní Success Test a Skill');
 if(!['general','combat'].includes(context))throw Error('Neznámý kontext testu');
 const pending=pendingCombatConsequences(actor),forced=result.forcedCF===true;
 const critical=result.sl===SL.CF;
 if(!critical)return {version:1,type:'none',status:'resolved',forced:false,roll:result.roll,context,skill,sourcePages:[60,61],pending};
 if(context==='combat'){
  const role=COMBAT_SKILLS[skill];
  if(!role)throw Error('Pro bojový kontext je třeba doložit bojovou dovednost');
  const original=forced?SL.CF:result.preTraumaSL??result.sl;
  const mishap=forced?'context-required':combatMishap({finalSL:SL.CF,roll:result.roll,naturalSL:original,dodge:role==='dodge'});
  // Stunned can downgrade natural Failure to CF; existing classifier handles units parity.
  return {version:1,type:'combat-handoff',status:'requires-combat',skill,context,forced,
    roll:result.roll,splitCF:forced?null:result.splitCF??null,combatRole:role,
    mishap,mishapOrigin:forced?'unusable-zone':original!==SL.CF?'downgraded-failure':'natural-critical-failure',
    reason:forced?'Grievous: povinné CF; druh Mishap musí určit skutečná zasažená oblast':
      'Mishap je rozhodnut, ale jeho hod a účinek provede autoritativní Combat průvodce',
    sourcePages:[161,169,170],pending};
 }
 return {version:1,type:forced?'automatic-critical-failure':'context-specific-critical-failure',
  status:forced?'resolved':'requires-activity-rule',skill,context,forced,roll:result.roll,
  splitCF:forced?null:result.splitCF??null,
  woundIds:forced?[...(result.unusableWoundIds??[])]:[],
  reason:forced?'Automatické CF dle Grievous: bez hodu d100. Žádný bojový Mishap bez bojové akce.':
   'CF0/CF5 nemá pro všechny Skills univerzální následek; vyžaduje pravidlo konkrétní činnosti',
  sourcePages:forced?[170]:[60,61],pending};
}
/** Idempotent, immutable journal proof for UI and regression. */
export function skillConsequenceProof({eventId,actorId,skill,result,consequence,rollOrigin}={}){
 if(typeof eventId!=='string'||!eventId||typeof actorId!=='string'||!actorId||!consequence||!result||!skill)throw Error('Chybí zdrojová událost následku');
 if(result.forcedCF&&rollOrigin!=='rule-forced-no-die')throw Error('Automatické CF nesmí předstírat hod');
 return {version:1,eventId,actorId,skill,consequence,rollOrigin,
   originalRoll:result.roll??null,finalSL:SUCCESS_LEVEL_NAMES[result.sl],
   sources:consequence.sourcePages,readOnly:true};
}
export function assertUniqueSkillConsequence(journal,eventId){
 if(!Array.isArray(journal)||typeof eventId!=='string'||!eventId)throw Error('Neplatný klíč události');
 if(journal.some(row=>row?.skillTestProof?.consequenceProof?.eventId===eventId))throw Error('Tento Skill Consequence už byl trvale vyhodnocen');
 return true;
}
/** Skill test proofs are historical evidence, not editable narrative notes.
 * Deletion of a whole character/archive remains a separate explicit workflow.
 */
export function assertSkillProofAppendOnly(before,after){
 if(!Array.isArray(before?.journal)||!Array.isArray(after?.journal)||!Array.isArray(after?.characters)||!Array.isArray(after?.trash))throw Error('Skill historie: neplatný kontrolní bod');
 const retained=new Set([...after.characters,...after.trash].map(c=>c.id));
 const byId=new Map(after.journal.map(row=>[row.id,row]));
 for(const row of before.journal.filter(x=>x.skillTestProof)){
  if(!retained.has(row.characterId))continue; // explicit permanent character purge only
  const saved=byId.get(row.id);
  if(!saved||JSON.stringify(saved)!==JSON.stringify(row))throw Error('Ověřený Skill Test nebo následek nelze upravit ani smazat');
 }
 const ids=new Set();
 for(const row of after.journal){
  const id=row.skillTestProof?.consequenceProof?.eventId;
  if(id!==undefined){if(typeof id!=='string'||!id||ids.has(id))throw Error('Duplicitní nebo neplatný zdroj Skill Consequence');ids.add(id);}
 }
 return true;
}
