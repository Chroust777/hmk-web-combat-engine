/** HMK 1.2 p.64: Acrobatics (Balance) SV 3–4 -> Will test -> 1-star move.
 * The original SV is an immutable witness. No die, physical movement, turn or
 * injury is generated here. The GM must separately attest the activity.
 */
import {successLevel,SL} from '../rules/tests.js';
const fail=(condition,message)=>{if(!condition)throw Error(message);};
const integer=(v,low,high)=>Number.isSafeInteger(v)&&v>=low&&v<=high;
const LEVELS=['CF','F','S','CS'];
export function balanceNervesCandidate(proof){
 if(!proof||!['success-value-test','success-value-specific','secondary-mastery-value-test'].includes(proof.type))return null;
 const skill=proof.skill||proof.skills?.[0],result=proof.a||proof.result;
 if(!['Acrobatics','Agility'].includes(skill)||!integer(result?.sv,3,4)||!integer(result?.roll,1,100)||!integer(result?.ml,1,1000))return null;
 return {actorId:proof.actorId,skill,sv:result.sv,roll:result.roll,sourcePage:64};
}
export function resolveBalanceNerves({proof,originId,actorId,widthInches,activityConfirmed=false,
 widthPenaltyConfirmed=false,willML,willEML,willRoll}={}){
 const source=balanceNervesCandidate(proof);
 fail(source&&typeof originId==='string'&&originId&&source.actorId===actorId,'Chybí doložený originální Balance SV 3–4 postavy');
 fail(activityConfirmed===true,'GM musí potvrdit, že originální test byl Acrobatics/Agility Balance, nikoliv Gymnastics');
 const min=source.skill==='Acrobatics'?1:4,max=source.skill==='Acrobatics'?3:6;
 fail(integer(widthInches,min,max),source.skill+' vyžaduje šířku cesty '+min+'–'+max+' palců (HMK 64)');
 if(source.skill==='Acrobatics')fail(widthPenaltyConfirmed===true,'GM musí potvrdit, že původní SV již obsahuje postih −1 za každý palec pod čtyři');
 fail(integer(willML,1,1000)&&Number.isSafeInteger(willEML)&&integer(willRoll,1,100),
  'Will test vyžaduje aktuální ověřené ML, EML a skutečný d100');
 const sl=successLevel(willRoll,willEML),passed=sl>=SL.S;
 return {type:'balance-nerves-will',format:'hmk-balance-nerves-p64-v1',originId,actorId,
  skill:source.skill,sourceRoll:source.roll,sourceSV:source.sv,widthInches,
  widthPenalty:source.skill==='Acrobatics'?4-widthInches:0,widthPenaltyConfirmed:source.skill==='Acrobatics',
  will:{ml:willML,eml:Math.max(5,Math.min(95,willEML)),roll:willRoll,sl,level:LEVELS[sl]},
  moveStars:passed?1:0,moveFeetBeforeHalfMoveCap:passed?5:0,
  movementCommitted:false,originalTestModified:false,sourcePage:64};
}
