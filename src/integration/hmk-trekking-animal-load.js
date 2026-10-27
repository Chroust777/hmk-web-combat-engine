/** HMK v1.2 pp.112,122,145,354–355: burden evidence for a single beast.
 * An existing final ENC is NEVER modified again (legacy saves already mean
 * final modified ENC). Explicit lb cargo, by contrast, uses normal gear ENC,
 * the verified beast's STR and the mule's printed additional −20 ENC bonus.
 * GM must include rider, harness and other burden in the declared lb total.
 */
import {gearEncumbrance,strengthEncumbranceModifier} from '../rules/encumbrance.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const whole=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
export const ANIMAL_TREK_LOAD_FORMAT='hmk-trek-animal-load-lb-v1';
export function animalTrekLoad({animal,actor}={}){
 check(animal&&typeof animal==='object','Chybí záznam zatížení zvířete.');
 const hasLb=Object.hasOwn(animal,'loadLb');
 if(!hasLb){
  check(whole(animal.enc),'Zadané výsledné ENC zvířete musí být celé nezáporné číslo.');
  check(!Object.hasOwn(animal,'awkwardLb')&&!Object.hasOwn(animal,'encCalculation'),
   'Výsledné ENC nelze zároveň upravovat jako nový náklad.');
  return {enc:animal.enc}; // backward compatibility; do not apply mule −20 twice
 }
 check(!Object.hasOwn(animal,'enc'),'Zvolte buď výsledné ENC, nebo hmotnost v librách, ne obojí.');
 check(whole(animal.loadLb)&&whole(animal.awkwardLb??0)&&(animal.awkwardLb??0)<=animal.loadLb,
  'Hmotnost zvířecího nákladu a neobratné části musí být doložena v celých librách.');
 const breed=actor?.hmk?.verifiedMountedBreed,str=actor?.hmk?.attributes?.str;
 check(breed&&Number.isSafeInteger(str)&&str>0,
  'Automatický výpočet zatížení vyžaduje registrované zvíře, ověřené plemeno a STR.');
 const baseENC=gearEncumbrance(animal.loadLb,{awkwardWeightLb:animal.awkwardLb??0});
 const strengthMod=strengthEncumbranceModifier(str);
 const breedMod=breed==='mule'?-20:0;
 const enc=Math.max(0,baseENC+strengthMod+breedMod);
 return {enc,encCalculation:{format:ANIMAL_TREK_LOAD_FORMAT,loadLb:animal.loadLb,
  awkwardLb:animal.awkwardLb??0,baseENC,str,breed,strengthMod,breedMod,enc,
  sourcePages:[112,122,145,354,355]}};
}
export function validateAnimalTrekLoadProof(proof,enc,breed){
 check(proof?.format===ANIMAL_TREK_LOAD_FORMAT&&whole(proof.loadLb)&&whole(proof.awkwardLb)&&
  proof.awkwardLb<=proof.loadLb&&Number.isSafeInteger(proof.str)&&proof.str>0&&
  proof.breed===breed&&proof.baseENC===gearEncumbrance(proof.loadLb,{awkwardWeightLb:proof.awkwardLb})&&
  proof.strengthMod===strengthEncumbranceModifier(proof.str)&&proof.breedMod===(breed==='mule'?-20:0)&&
  proof.enc===Math.max(0,proof.baseENC+proof.strengthMod+proof.breedMod)&&enc===proof.enc&&
  JSON.stringify(proof.sourcePages)===JSON.stringify([112,122,145,354,355]),
  'Zvířecí ENC neodpovídá ověřenému plemeni, STR nebo doložené hmotnosti.');
 return true;
}
export function animalTrekInputFromSnapshot(a){
 return a.encCalculation?{id:a.id,droverId:a.droverId,loadLb:a.encCalculation.loadLb,
  awkwardLb:a.encCalculation.awkwardLb}:{id:a.id,droverId:a.droverId,enc:a.enc};
}
