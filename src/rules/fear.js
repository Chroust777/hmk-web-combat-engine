import { SL } from './tests.js';
export const FEAR={CATATONIC:'catatonic',TERRIFIED:'terrified',AFRAID:'afraid',STEADY:'steady',BRAVE:'brave'};
export function fearEML({willML,aberrance=0,brave=false}={}){return willML-(5*Math.max(0,aberrance))+(brave?20:0);}
export function fearResult({sl,roll,aberrance=0}={}){
 const abe=Math.max(0,aberrance);
 if(sl===SL.CF){const cf0=roll%10===0;return cf0?{state:FEAR.CATATONIC,psycheStress:2+abe,recoveryTest:'will',reactionTiming:'end-next-turn'}:{state:FEAR.TERRIFIED,psycheStress:1+abe,safeRecoveryMinutes:10};}
 if(sl===SL.F)return {state:FEAR.AFRAID,psycheStress:abe,recoveryTest:'will',reactionTiming:'end-turn',safeRecoveryMinutes:1};
 if(sl===SL.S)return {state:FEAR.STEADY,psycheStress:Math.floor(abe/2)};
 if(sl===SL.CS)return {state:FEAR.BRAVE,psycheStress:0,bonus:20,durationMinutes:5};
 throw new RangeError('Fear SL required');
}
export function fearActionPolicy(state,{fleePossible=true}={}){
 if(state===FEAR.CATATONIC)return {defences:[],action:'none',mayMove:false};
 if(state===FEAR.TERRIFIED)return {defences:['block-readied','dodge'],action:fleePossible?'move':'pass',rate:fleePossible?'full':null,direction:fleePossible?'flee':null};
 if(state===FEAR.AFRAID)return {defences:['block-readied','dodge'],actions:['pass','move-away']};
 return {defences:'any',action:'any'};
}
export function fearRecovery({state,willSL}={}){
 const success=willSL===SL.S||willSL===SL.CS;
 if(state===FEAR.CATATONIC) return {state:success?FEAR.TERRIFIED:FEAR.CATATONIC,retest:!success};
 if(state===FEAR.AFRAID) return {state:success?FEAR.STEADY:FEAR.AFRAID,retest:!success};
 return {state,retest:false};
}
/** Aberrance fear penalty also applies to Initiative tests, including Reaction and Morale. */
export function aberranceInitiativeEML({initiativeML,aberrance=0,brave=false}={}){return initiativeML-(5*Math.max(0,aberrance))+(brave?20:0);}
