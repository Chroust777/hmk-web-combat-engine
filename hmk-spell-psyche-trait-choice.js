/** HMK v1.2 pp.188–189, 203: explicit GM choice for pending spell-induced
 * Psyche Stress. Choice is separate from the later 10-minute manifestation
 * and d6-day recovery; those MUST remain pending rather than invented here.
 * Reuses the sole verified full-document CAS writer. Never rolls dice.
 */
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {validateCombatState} from './persistent-combat-state.js';
import {addSamePsycheTrait} from '../rules/mental-trauma.js';
const cp=structuredClone, js=JSON.stringify;
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const SPELL_PSYCHE_TRAITS=Object.freeze([
 'Angry','Depressed','Detached','Hallucinatory','Haunted',
 'Hyperactive','Nervous','Paranoid','Phobic','Reckless'
]);
export function pendingSpellPsycheChoices(document){
 return (document?.characters??[]).filter(c=>c?.hmk?.arcane?.pendingPsycheTraitChoice)
  .map(c=>({characterId:c.id,name:c.name||c.id,
   sourceEventId:c.hmk.arcane.pendingPsycheTraitChoice.sourceEventId,
   levels:c.hmk.arcane.pendingPsycheTraitChoice.levels}));
}
/** Complete one previously stored pending choice, WITHOUT recovering PSY. */
export function persistSpellPsycheTraitChoice({document,characterId,sourceEventId,trait,
 gmConfirmed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&typeof characterId==='string'&&
  typeof sourceEventId==='string'&&sourceEventId.length>0&&
  SPELL_PSYCHE_TRAITS.includes(trait),'Volba Psyche musí být výslovně potvrzeným GM rozhodnutím HMK');
 const person=document?.characters?.find(c=>c.id===characterId);
 check(person&&document.characters.filter(c=>c.id===characterId).length===1,
  'Chybí jediná odpovídající postava');
 const arc=person.hmk?.arcane, pending=arc?.pendingPsycheTraitChoice;
 check(pending?.sourceEventId===sourceEventId&&whole(pending.levels,1,99999),
  'Neexistuje odpovídající nevyřešená událost Psyche Stress');
 const state=person.hmk?.combatState;
 check(whole(state?.morale?.psycheStress,0,99999)&&
  state.morale.psycheStress>=pending.levels,'Ztracený nebo změněný persistentní PSY stav');
 // Source must have been committed before an after-effect can be resolved.
 check((document.journal??[]).some(j=>j.combatProof?.sourceEventId===sourceEventId)||
  (state.events??[]).some(e=>e.type==='hmk-spell-total-release'&&e.details?.sourceEventId===sourceEventId),
  'Psyche Trait nesmí vzniknout bez autoritativně uloženého příčinného kouzla');
 const oldCases=arc.psycheTraumas??[];
 check(Array.isArray(oldCases)&&oldCases.every(z=>z&&typeof z.trait==='string'&&
  whole(z.psycheLevels,z.recovered===true?0:1,99999)&&
  (z.recovered!==true||z.psycheLevels===0)&&['trait','impulse','disorder'].includes(z.intensity)&&
  Array.isArray(z.sourceEventIds)),'Poškozená evidence dřívějšího spell Psyche traumatu');
 check(!oldCases.some(z=>z.sourceEventIds.includes(sourceEventId)),
  'Stejný Psyche důkaz byl již potvrzen');
 const out=cp(document),personNext=out.characters.find(c=>c.id===characterId),next=personNext.hmk.arcane;
 const stateNext=validateCombatState(personNext.hmk.combatState);
 let addedManifestedWeakness=0;
 next.psycheTraumas??=[];
 const prior=next.psycheTraumas.find(z=>z.trait===trait&&z.recovered!==true)??
  next.psycheTraumas.find(z=>z.trait===trait&&z.recovered===true&&z.permanent===true);
 if(prior){
  check(!prior.psycheExpressionActive,'Psyche: nelze slučovat stres při nedokončeném projevu Impulse/Disorder');
  // A permanent trait remains present after PSY reaches zero. New stress
  // with the same trait MUST intensify it, not create a second Trait.
  if(prior.recovered===true){
   check(prior.permanent===true&&prior.psycheLevels===0&&prior.manifested===true,
    'Psyche: nelze znovu aktivovat neplatně archivovaný permanentní trait');
   prior.recovered=false;prior.inactive=false;prior.recoverySchedulePending=true;
   prior.psycheRecoveryPlan=null;prior.psycheRecoveryLastRollDay=null;
  }
  const combined=addSamePsycheTrait({currentLevels:prior.psycheLevels,
   currentIntensity:prior.intensity,newLevels:pending.levels});
  prior.psycheLevels=combined.psycheLevels;prior.intensity=combined.intensity;
  prior.sourceEventIds.push(sourceEventId);
  // HMK p.188–189: the same already-manifested trait now carries the SUM
  // of both PSY instances, so its associated weakness rises immediately.
  if(prior.manifested===true&&prior.manifestationPending===false){
   addedManifestedWeakness=pending.levels*5;
   check(stateNext.fatigue.otherWeakness+addedManifestedWeakness<=99999,
    'Psyche: přetečení Weakness při spojení projeveného stejného traitu');
   stateNext.fatigue.otherWeakness+=addedManifestedWeakness;
  }
 }else next.psycheTraumas.push({trait,psycheLevels:pending.levels,intensity:'trait',
  permanent:false,manifested:false,manifestationPending:true,
  recoverySchedulePending:true,sourceEventIds:[sourceEventId],recovered:false});
 next.pendingPsycheTraitChoice=null;
 validateCombatState(stateNext);
 const journalId='psyche-choice:'+sourceEventId;
 check(!(out.journal??[]).some(j=>j.id===journalId),'Duplicitní Psyche rozhodnutí');
 out.journal.push({id:journalId,characterId,createdAt:new Date().toISOString(),
  title:`HMK Psyche Trait — ${trait}`,
  body:`GM přiřadil ${trait} k traumatu ${sourceEventId}, PSY ${pending.levels}. ${addedManifestedWeakness?'Již projevený stejnojmenný trait: Weakness +'+addedManifestedWeakness+'. ':''}Nástup nového traitu, pokud dosud neprojeven, a d6-denní Recovery zůstávají otevřené.`,
  combatProof:{actionKind:'spell-psyche-trait-choice',sourceEventId,
   gmConfirmed:true,trait,psycheLevels:pending.levels,manifestedWeaknessAdded:addedManifestedWeakness,
   manifestationPending:next.psycheTraumas.find(z=>z.trait===trait&&z.recovered!==true)?.manifestationPending===true,
   recoverySchedulePending:true}});
 const serialized=js(out),res=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...res,document:res.ok?out:null,serialized:res.ok?serialized:null};
}
