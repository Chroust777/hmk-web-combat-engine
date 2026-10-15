/** HMK v1.2 printed pp.112,117–118,169–170. Non-mutating Skill Workbench trauma projection.
 * Missing evidence never becomes a zero. Full medical effects remain in Combat.
 */
import {validateCombatState} from './persistent-combat-state.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {impairedTestZones} from '../rules/injury-effects.js';
import {resolveCombatantLoad,bulkForTest} from './combatant-load.js';
import {skillDefinition,perceptionDefinition} from './hmk-character-creation.js';
const BODY_ZONES=['head','arms','torso','legs'];
const IMPAIRED_NAME=Object.freeze({Acrobatics:'acrobatics',Agility:'agility',Archery:'archery',Awareness:'awareness',Climbing:'climbing',Dancing:'dancing',Dexterity:'dexterity',Dodge:'dodge',Jumping:'jumping',Legerdemain:'legerdemain',Melee:'melee',Riding:'riding',Slings:'slings',Stealth:'stealth',Strength:'strength',Swimming:'swimming',Throwing:'throwing'});
const DERIVED_PER=new Set(['Sight','Sound','Odour']);
const ATTRIBUTES=new Set(['Strength','Endurance','Dexterity','Agility','Perception','Comeliness','Aura','Will','Reasoning','Creativity','Empathy','Eloquence']);
const num=(v,max,label)=>{if(v===null||v===undefined||String(v).trim()===''||!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>max||Number(v)%5)throw Error(label+' musí být doložené nezáporné celé číslo po pěti');return Number(v)};
const whichMode=(s,label)=>{if(!['auto','manual','omit'].includes(s))throw Error(label+': neznámé rozhodnutí');return s;};
export function impairedSkillKind(actor,name){
 if(IMPAIRED_NAME[name])return IMPAIRED_NAME[name];
 if(ATTRIBUTES.has(name))return null;
 const def=skillDefinition(actor,name);
 if(def?.group==='Craft')return 'crafts';
 return null;
}
export function skillPerceptionApplicability(actor,name){
 if(name==='Perception'||DERIVED_PER.has(name))return 'applies';
 if(ATTRIBUTES.has(name))return 'not-applicable';
 const def=skillDefinition(actor,name);if(!def)return 'unknown';
 const sb=perceptionDefinition(actor,def);
 if(!sb?.primary||!sb?.secondary)return 'unknown';
 return [sb.primary,sb.secondary].some(x=>['per','eye','hrg','sml'].includes(x))?'applies':'not-applicable';
}
function ownedArmour(inventory,actor){return Array.isArray(inventory)&&inventory.some(x=>x?.characterId===actor?.id&&x.slot==='worn');}
function ruleZones(test){return impairedTestZones(test).map(x=>x==='arm'?'arms':x);}
export function skillTraumaAvailability({actor,inventory=[],name,mounted=false,bulkAssessed=false,bulkZones=[]}={}){
 const state=actor?.hmk?.combatState;
 let shock={ready:false,reason:'Chybí potvrzený stav Shock'};
 if(state){try{validateCombatState(state);shock={ready:true,value:state.shock,source:'confirmed-combat-state'};}catch(e){shock={ready:false,reason:'Neplatný Combat State: '+e.message};}}
 const kind=impairedSkillKind(actor,name),wounds=state?.wounds;
 let injury={ready:false,reason:'Pro případná zranění chybí potvrzený bojový stav'};
 if(shock.ready){injury=(!wounds.length)?{ready:true,modifier:0,source:'confirmed-no-wounds',slPenalty:0}
 :{ready:false,reason:kind?'Aktuální kolo, časovou osu a použitou ruku musí potvrdit GM':'Test není výslovně uveden v tabulce Impaired Tests; účinek ran musí rozhodnout GM'};}
 let bulk={ready:false,reason:'Body-zone Bulk nebyl vyhodnocen'},perception={ready:false,reason:'Vliv zbroje na PER nebyl vyhodnocen'};
 const perApplies=skillPerceptionApplicability(actor,name);
 // Bulk on the printed Impaired Tests table cannot apply to an unrelated
 // skill: absence from that list is a verified non-applicability, not a GM switch.
 if(!kind)bulk={ready:true,modifier:0,source:'not-an-impaired-test'};
 if(!Array.isArray(inventory)) { /* No inventář != no armour; require GM evidence. */ }
 else if(!ownedArmour(inventory,actor)){
   bulk={ready:true,modifier:0,source:'confirmed-unarmoured'};
   perception={ready:true,modifier:0,source:'confirmed-unarmoured'};
 }else if(Array.isArray(inventory)){
   try{
    const load=resolveCombatantLoad({character:actor,inventory,mounted,
     bulkConfirmation:bulkAssessed?{assessed:true,violatingZones:bulkZones}:null});
    if(!kind)bulk={ready:true,modifier:0,source:'not-an-impaired-test'};
    else if(load.bulkReady===true&&!(load.issues||[]).length){const b=bulkForTest(load,ruleZones(kind));bulk=b.ready?{...b,modifier:b.penalty,source:load.bulkSource,loadSource:load.mode}:{ready:false,reason:b.reason};}
    else bulk={ready:false,reason:(load.issues||[]).join('; ')||'Bulk u tištěného kompletu vyžaduje výslovné posouzení vrstvení GM (HMK p.117)'};
    if(perApplies==='not-applicable')perception={ready:true,modifier:0,source:'skill-base-not-perception'};
    else if(perApplies==='unknown')perception={ready:false,reason:'Skill Base a vztah k PER nejsou ověřeny'};
    else if(load.encReady&&Number.isSafeInteger(load.perceptionPenalty)&&!(load.issues||[]).length)
     perception={ready:true,modifier:load.perceptionPenalty,source:load.mode,armourSource:load.source};
    else perception={ready:false,reason:(load.issues||[]).join('; ')||'Přesný postih zbroje na PER nelze doložit'};
   }catch(e){bulk={ready:false,reason:'Bulk: '+e.message};perception={ready:false,reason:'PER: '+e.message};}
 }
 return {shock,injury,bulk,perception,impairedKind:kind,perceptionApplicability:perApplies,sourcePages:[112,117,118,169,170]};
}
/** Called BEFORE generating a die. Confirmed INC/UNC/KIA cannot be overridden. */
export function resolveSkillTrauma({actor,inventory=[],name,mounted=false,
  shockMode='auto',injuryMode='auto',bulkMode='auto',perceptionMode='auto',
  currentRound=null,usedArm=null,bulkAssessed=false,bulkZones=[],
  manualInjury=null,manualBulk=null,manualPerception=null}={}){
 const preview=skillTraumaAvailability({actor,inventory,name,mounted,bulkAssessed,bulkZones});
 const state=actor?.hmk?.combatState;
 const sm=['auto','gm-ready'].includes(shockMode)?shockMode:null;
 if(!sm)throw Error('Shock: GM musí zvolit potvrzený Combat State nebo potvrdit akceschopnost mimo doložený stav');
 if(state&&!preview.shock.ready)throw Error('Shock: neplatný potvrzený Combat State; nelze jej obejít ruční volbou');
 if(preview.shock.ready&&['INC','UNC','KIA'].includes(preview.shock.value))throw Error('Shock '+preview.shock.value+': samostatný Skill Test není dovolen (HMK p.169)');
 if(sm==='auto'&&!preview.shock.ready)throw Error('Shock: '+preview.shock.reason+'. GM musí výslovně potvrdit akceschopnost.');
 const shock=preview.shock.ready?{...preview.shock,mode:'auto'}:{ready:true,value:'GM-CONFIRMED-ABLE',mode:'gm-ready',source:'explicit-gm-no-confirmed-shock'};
 const kind=preview.impairedKind;
 let injury;
 if(whichMode(injuryMode,'Injury')==='auto'){
  if(!preview.shock.ready)throw Error('Injury: chybí doložený bojový stav; GM musí určit postih nebo výslovně nepotvrdit jeho použití');
  if(!state.wounds.length)injury={...preview.injury,mode:'auto'};
  else {
   if(!kind)throw Error('Injury: pro tuto dovednost není ověřená tabulka Impaired Tests; rozhodne GM');
   if(currentRound===null||currentRound===''||!Number.isSafeInteger(Number(currentRound))||Number(currentRound)<1||Number(currentRound)>9999)
    throw Error('Injury: GM musí potvrdit skutečné aktuální bojové kolo');
   if(!['left','right','both','none'].includes(usedArm))throw Error('Injury: GM musí určit používané ruce');
   const arms=usedArm==='both'?['left','right']:usedArm==='none'?['none']:[usedArm];
   const projection=projectLiveInjuries({state,round:Number(currentRound),test:kind,usedArms:arms,timelineId:state.encounterTimelineId??null});
   if(!projection.ready)throw Error('Injury: '+projection.reason);
   // Grievous: no ordinary die. Caller resolves an automatic CF and records the source.
   const forcedCF=projection.unusable===true;
   injury={ready:true,mode:'auto',source:'confirmed-live-injury-projection',modifier:projection.modifier,slPenalty:projection.successLevelPenalty,
    round:Number(currentRound),timelineId:state.encounterTimelineId??null,usedArms:arms,woundIds:projection.affected.map(w=>w.id),unusableWoundIds:projection.unusableWoundIds??[],forcedCF,wounds:projection.affected};
  }
 }else if(injuryMode==='manual'){
  injury={ready:true,mode:'manual',source:'gm-adjudicated-injury',modifier:-num(manualInjury,1000,'GM Injury impairment'),slPenalty:shock.value==='STN'&&kind?1:0};
 }else injury={ready:true,mode:'omit',source:'gm-explicitly-adjudicated-no-injury-impairment',modifier:0,slPenalty:shock.value==='STN'&&kind?1:0};
 // Stunned: one Success Level lower for all impaired tests even with no wounds.
 injury.slPenalty=Math.max(injury.slPenalty??0,shock.value==='STN'&&kind?1:0);
 const decide=(key,mode,manual,label)=>{
  const m=whichMode(mode,label),p=preview[key];
  if(m==='auto'){if(!p.ready)throw Error(label+': '+p.reason+'. Potvrďte údaj GM nebo rozhodnutí Nepoužít.');return {...p,mode:'auto'};}
  if(m==='manual')return {ready:true,mode:'manual',source:'gm-confirmed-'+key,modifier:-num(manual,1000,'GM '+label)};
  return {ready:true,mode:'omit',source:'gm-explicitly-declined-'+key,modifier:0};
 };
 const bulk=decide('bulk',bulkMode,manualBulk,'Bulk');
 const perception=preview.perceptionApplicability==='not-applicable'?{ready:true,modifier:0,mode:'not-applicable',source:'skill-base-not-perception'}:
  decide('perception',perceptionMode,manualPerception,'PER armour');
 return {kind:'hmk-skill-trauma-v1',shock,injury,bulk,perception,modifier:injury.modifier+bulk.modifier+perception.modifier,
  slPenalty:injury.slPenalty,sourcePages:preview.sourcePages,readOnly:true};
}
