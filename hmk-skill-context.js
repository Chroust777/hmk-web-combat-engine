/** Read-only Skill Workbench condition adapter (HMK v1.2 pp.60–62,112,122,176).
 * Never creates or updates combat status; unknown evidence is NOT treated as zero.
 */
import {skillDefinition,perceptionDefinition} from './hmk-character-creation.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {fatigueEMLModifier} from './melee-fatigue.js';
import {encumbranceTestPenalty} from '../rules/encumbrance.js';
const I=(value,min,max,label)=>{const n=Number(value);if(value===null||value===undefined||(typeof value==='string'&&value.trim()==='')||!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+': vyžaduje doložené celé číslo '+min+' až '+max);return n;};
const DERIVED_SKILL_BASES=Object.freeze({Shock:['str','end'],Dodge:['agl','per'],Sight:['eye','wil'],Sound:['hrg','wil'],Odour:['sml','wil']});
const ATTRIBUTE_NAMES=new Set(['Strength','Endurance','Dexterity','Agility','Perception','Comeliness','Aura','Will','Reasoning','Creativity','Empathy','Eloquence']);
export function encApplicability(actor,name){
 if(name==='Agility')return {kind:'applies',source:'attribute-agility'};
 if(ATTRIBUTE_NAMES.has(name))return {kind:'not-applicable',source:'attribute-without-agility'};
 const derived=DERIVED_SKILL_BASES[name];
 if(derived)return {kind:derived.includes('agl')?'applies':'not-applicable',source:'hmk-derived-skill-base',primary:derived[0],secondary:derived[1]};
 const def=skillDefinition(actor,name);
 if(!def)return {kind:'unknown',source:'unresolved-skill-base'};
 const rated=perceptionDefinition(actor,def);
 if(!rated?.primary||!rated?.secondary)return {kind:'unknown',source:'undetermined-skill-base'};
 return {kind:[rated.primary,rated.secondary].includes('agl')?'applies':'not-applicable',source:'hmk-skill-base',primary:rated.primary,secondary:rated.secondary};
}
/** Returns a display preview, recalculated on every test submission. */
export function skillConditionAvailability({actor,inventory=[],name,mounted=false}={}){
 const applicability=encApplicability(actor,name);
 const out={applicability,fatigue:{ready:false,reason:'Postava nemá potvrzený trvalý bojový stav'},enc:{ready:false,reason:'Zatížení nebylo doloženo'}};
 const state=actor?.hmk?.combatState;
 if(state){try{validateCombatState(state);const fatigue=combatFatigueTotals(state);const modifier=fatigueEMLModifier(fatigue.total);out.fatigue=modifier.ok?{ready:true,modifier:modifier.value,totals:fatigue,shock:state.shock,source:'confirmed-combat-state'}:{ready:false,reason:'Únava v potvrzeném stavu nesplňuje pravidla p.176'};}catch(err){out.fatigue={ready:false,reason:'Neplatný trvalý bojový stav: '+err.message};}}
 if(applicability.kind==='not-applicable'){out.enc={ready:true,modifier:0,source:'not-applicable-by-skill-base'};return out;}
 if(applicability.kind==='unknown'){out.enc={ready:false,reason:'Skill Base není pravidlově ověřený'};return out;}
 if(!Array.isArray(inventory)){out.enc={ready:false,reason:'Chybí inventář'};return out;}
 try{const load=resolveCombatantLoad({character:actor,inventory,mounted});
  if(load.encReady===true&&load.issues.length===0&&Number.isSafeInteger(load.modifiedENC)){
   out.enc={ready:true,modifier:encumbranceTestPenalty({encumbrance:load.modifiedENC,skillBaseIncludesAgility:true}),modifiedENC:load.modifiedENC,baseENC:load.baseENC,armourENC:load.armourENC,gearENC:load.gearENC,strengthModifier:load.strengthModifier,mounted,source:'verified-inventory-load',inventoryIds:inventory.filter(x=>x.characterId===actor.id).map(x=>x.id)};
  }else out.enc={ready:false,reason:(load.issues||[]).join('; ')||'Neúplné ENC v inventáři (HMK p.112)'};
 }catch(err){out.enc={ready:false,reason:'ENC nelze ověřit: '+err.message};}
 return out;
}
const mode=(s,kind)=>{if(!['auto','manual','omit'].includes(s))throw Error(kind+': vyberte Automaticky / GM hodnota / Výslovně nepoužít');return s;};
/** All returned modifiers are independently justified and captured by the journal.
 * Missing data with auto mode aborts the roll before dice are generated. */
export function resolveSkillConditions({actor,inventory,name,fatigueMode='auto',manualFatigue=null,encMode='auto',manualENC=null,mounted=false}={}){
 const fMode=mode(fatigueMode,'Fatigue'),eMode=mode(encMode,'ENC');
 if(typeof mounted!=='boolean')throw Error('Pěší/jízdní stav musí být výslovně zvolen');
 const preview=skillConditionAvailability({actor,inventory,name,mounted});
 let fatigue,enc;
 if(fMode==='auto'){if(!preview.fatigue.ready)throw Error('Fatigue: '+preview.fatigue.reason+'. Zadejte potvrzenou hodnotu GM nebo výslovně zvolte Nepoužít.');fatigue={...preview.fatigue,mode:'auto'};}
 else if(fMode==='manual'){const total=I(manualFatigue,0,1000,'GM Fatigue');const modifier=fatigueEMLModifier(total);if(!modifier.ok)throw Error('GM Fatigue musí být násobek pěti (HMK p.176)');fatigue={ready:true,mode:'manual',source:'gm-confirmed-fatigue',total,modifier:modifier.value};}
 else fatigue={ready:true,mode:'omit',source:'gm-explicitly-declined-fatigue',modifier:0};
 if(preview.applicability.kind==='not-applicable'){enc={ready:true,mode:'not-applicable',source:preview.enc.source,modifier:0};}
 else if(eMode==='auto'){if(!preview.enc.ready)throw Error('ENC: '+preview.enc.reason+'. Zadejte ověřené ENC od GM nebo výslovně zvolte Nepoužít.');enc={...preview.enc,mode:'auto'};}
 else if(eMode==='manual'){const points=I(manualENC,0,500,'GM upravené ENC');if(points%5!==0)throw Error('GM ENC musí být násobek pěti');enc={ready:true,mode:'manual',source:'gm-confirmed-enc',modifiedENC:points,mounted,modifier:-points};}
 else enc={ready:true,mode:'omit',source:'gm-explicitly-declined-enc',mounted,modifier:0};
 return {kind:'hmk-skill-conditions-v1',skill:name,applicability:preview.applicability,fatigue,enc,mounted,modifier:fatigue.modifier+enc.modifier,sourcePages:[112,122,176],readOnly:true};
}
