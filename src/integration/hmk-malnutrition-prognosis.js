/** HMK v1.2 pp.184–186: READ-ONLY presentation of recorded malnutrition.
 * Predict possible results, never roll a die, mutate a character, or invent
 * evidence of ingestion. The current due minute is authoritative. */
import {ailmentOutcome,exposureAdvance,exposureHealing,malnutritionSchedule} from '../rules/ailments.js';
import {SL} from '../rules/tests.js';
import {healingBase} from '../rules/healing.js';

const DAY=1440;
export const MALNUTRITION_HR_STATES=Object.freeze({
  6:'Vyléčeno',5:'Weakness 5',4:'Weakness 10',3:'Stunned (omráčen)',
  2:'Incapacitated (neschopen činnosti)',1:'Unconscious (bezvědomí)',0:'Dead (smrt)'
});
const resultLabels={CF:'CF · kritické selhání',F:'F · selhání',S:'S · úspěch',CS:'CS · kritický úspěch'};
export function malnutritionStateLabel(hr){return MALNUTRITION_HR_STATES[hr]??'Neznámý HR'}
export function malnutritionPrognosis({kind,hr,mode,dueMinute,nowMinute,attr,rest=false,half=false}={}){
 if(!['starvation','thirst'].includes(kind)||!Number.isInteger(hr)||hr<0||hr>6||
  !Number.isSafeInteger(dueMinute)||dueMinute<0||!Number.isSafeInteger(nowMinute)||nowMinute<0)
  throw new Error('Malnutrition prognosis: neplatný stav nebo kalendář');
 const hb=Number.isSafeInteger(attr?.end)&&Number.isSafeInteger(attr?.wil)
  ?healingBase({endurance:attr.end,will:attr.wil}):null;
 // The same Healing Base rule is used by the medical writer; never derive
 // an alternative HR or outcome from a UI-owned counter.
 const branches=(mode==='pending'?['advance','healing']:[mode]).filter(x=>['advance','healing'].includes(x));
 return {
  current:malnutritionStateLabel(hr),dueMinute,nowMinute,ready:nowMinute>=dueMinute,
  hb,branches:branches.map(branch=>{
   const eml=hb===null?null:hb*(branch==='healing'?5:hr);
   const nextInterval=branch==='healing'?DAY:
    malnutritionSchedule({kind,halfRations:half,completeRest:rest}).advanceEveryDays*DAY;
   return {mode:branch,eml,nextInterval,results:['CF','F','S','CS'].map(key=>{
    const outcome=branch==='healing'?exposureHealing({healingRate:hr,sl:SL[key]}):
     exposureAdvance({healingRate:hr,sl:SL[key]});
    const nextHR=Math.max(0,Math.min(6,outcome.healingRate));
    const next=ailmentOutcome(nextHR);
    return {key,label:resultLabels[key],nextHR,currentHR:hr,state:malnutritionStateLabel(nextHR),
      change:nextHR-hr,skipNext:outcome.skipNext,
      nextDueMinute:nextHR===0||nextHR===6?null:dueMinute+nextInterval*(outcome.skipNext?2:1)};
   })};
  })
 };
}
