import { SL } from './tests.js';
export function aberrantMoraleOption({abe=0,triggersAlreadyIgnored=0}={}){return {mayIgnoreTrigger:triggersAlreadyIgnored<abe,moraleBonus:abe*5,remainingIgnoredTriggers:Math.max(0,abe-triggersAlreadyIgnored)};}
export function attenuatedABE({baseABE=0,successfulFearRolls=[]}={}){const reduction=successfulFearRolls.reduce((n,sl)=>n+(sl===SL.CS?2:(sl===SL.S?1:0)),0);return Math.max(0,baseABE-reduction);}
export function groupABE(baseABE){return baseABE;}
export function relativeABE({baseABE=0,immunityAmount=0}={}){return Math.max(0,baseABE-immunityAmount);}
