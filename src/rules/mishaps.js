import { SL } from './tests.js';
/** p161 combat mishap classification. When a condition downgrades a natural F to CF,
 * units parity replaces the ordinary CF0/CF5 distinction. Dodge CF is always Stumble. */
export function combatMishap({finalSL,roll,naturalSL=finalSL,dodge=false}={}){
  if(finalSL!==SL.CF) return null;
  if(dodge) return 'stumble';
  const units=roll%10;
  if(naturalSL===SL.F) return units%2===0?'fumble':'stumble';
  return units===0?'fumble':'stumble';
}
export function fumbleTestPolicy({hasDEX=true,actionUsesDEX=true,useLegerdemain=false}={}){
 if(!hasDEX||!actionUsesDEX) return {convertedTo:'stumble'};
 return {test:useLegerdemain?'legerdemain':'dexterity',onFailure:'drop-item'};
}
export function stumbleTestPolicy({hasLegs=true,useAcrobatics=false}={}){
 return {test:useAcrobatics?'acrobatics':'agility',onFailure:hasLegs?'prone':'pass-next-turn'};
}
export function droppedItemRecovery({threatened=false,meleeSuccess=null}={}){
 if(!threatened) return {action:'grope',time:'1-turn',pickedUp:true};
 if(meleeSuccess==null) return {action:'grope',time:'1-turn',pending:{type:'melee-test'}};
 return {action:'grope',time:'1-turn',pickedUp:!!meleeSuccess,turnEnds:!meleeSuccess};
}
