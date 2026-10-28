/** HMK 1.2 pp. 168, 355, 357: exact animal amputation marks.
 * Separate metadata from the existing anatomical grid so historical wound
 * proofs keep their original byte-identical location objects.
 * White triangle: beast STR ML70; grey: ML50; black: ML30.
 */
import {successLevel,SL} from '../rules/tests.js';
const MARKS=Object.freeze({
  nk:'white',flg:'grey',hlg:'grey',leg:'grey',wng:'grey',ear:'grey',trn:'grey',tl:'black'
});
const ML=Object.freeze({white:70,grey:50,black:30});
export function animalAmputationMark570(location){
  if(!location||!/^([a-m])$/.test(String(location.table||'')))return null;
  const shade=MARKS[location.id];
  if(!shade)return null;
  return Object.freeze({shade,ml:ML[shade],modifier:shade==='white'?20:shade==='grey'?0:-20,sourcePage:168});
}
export function resolveAnimalAmputation570({location,injuryLevel,aspect,roll=null}={}){
  const mark=animalAmputationMark570(location);
  if(injuryLevel!==5||aspect!=='e'||!mark){
    if(roll!==null&&roll!==undefined)throw Error('Amputation d100 pouze pro G5e s anatomickým trojúhelníkem.');
    return null;
  }
  if(!Number.isInteger(roll)||roll<1||roll>100)throw Error('G5e: zadej skutečný Amputation d100 (1–100).');
  const sl=successLevel(roll,mark.ml);
  const severed=sl===SL.CF||sl===SL.F;
  const paired=['flg','hlg','leg','wng','ear'].includes(location.id);
  // HMK p352: for a paired limb or wing, odd LD = left, even LD = right.
  const side=paired?((location.ld%2)?'left':'right'):null;
  return Object.freeze({shade:mark.shade,ml:mark.ml,modifier:mark.modifier,roll,
    sl:sl===SL.CF?'CF':sl===SL.F?'F':sl===SL.S?'S':'CS',severed,
    side,permanentLoss:severed?location.id:null,lethalNeck:severed&&location.id==='nk',
    shockPenalty:sl===SL.S?-20:0,
    bleedingForced:sl===SL.CF||severed&&sl===SL.F,
    sourcePage:168});
}
