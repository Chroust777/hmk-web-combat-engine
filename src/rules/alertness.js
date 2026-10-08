import { SL } from './tests.js';

export const ALERTNESS={AWARE:'aware',CONFUSED:'confused',UNAWARE:'unaware'};

/** p158 opposed Surprise: compare success levels only. Tied successes => both aware;
 * tied failures => both confused. Winner aware; loser confused, or unaware when losing by 2+ SL. */
export function opposedSurprise({aSL,bSL}={}){
  if(![SL.CF,SL.F,SL.S,SL.CS].includes(aSL)||![SL.CF,SL.F,SL.S,SL.CS].includes(bSL)) throw new RangeError('Valid success levels required');
  if(aSL===bSL){
    const state=aSL>=SL.S?ALERTNESS.AWARE:ALERTNESS.CONFUSED;
    return {a:state,b:state,tie:true};
  }
  const aWins=aSL>bSL, diff=Math.abs(aSL-bSL);
  const loser=diff>=2?ALERTNESS.UNAWARE:ALERTNESS.CONFUSED;
  return aWins?{a:ALERTNESS.AWARE,b:loser,tie:false}:{a:loser,b:ALERTNESS.AWARE,tie:false};
}

/** p158 unopposed Awareness Surprise Roll. CS also means awareness before the concealed actor acts. */
export function unopposedAwarenessSurprise(sl){
  if(sl===SL.CF) return {state:ALERTNESS.UNAWARE,awareBeforeOpponentActs:false};
  if(sl===SL.F) return {state:ALERTNESS.CONFUSED,awareBeforeOpponentActs:false};
  if(sl===SL.S) return {state:ALERTNESS.AWARE,awareBeforeOpponentActs:false};
  if(sl===SL.CS) return {state:ALERTNESS.AWARE,awareBeforeOpponentActs:true};
  throw new RangeError('Valid success level required');
}

export function alertnessLimits(state){
  if(state===ALERTNESS.AWARE) return {defences:['block','dodge','counterstrike','ignore'],mayAct:true,forcedAction:null,mayEarnTA:true,immediateReactionWhenAlerted:false};
  if(state===ALERTNESS.CONFUSED) return {defences:['block-readied','dodge'],mayAct:false,forcedAction:'pass',mayEarnTA:false,reactionTiming:'end-turn',immediateReactionWhenAlerted:false};
  if(state===ALERTNESS.UNAWARE) return {defences:['ignore'],mayAct:false,forcedAction:null,mayEarnTA:false,reactionTiming:null,immediateReactionWhenAlerted:true};
  throw new RangeError('Unknown alertness state');
}

/** p159 Reaction Roll is Initiative EML. Success permits normal action from next turn;
 * failure continues the condition and is repeated next turn. For an unaware combatant
 * alerted immediately, p158 expresses the same result as F/CF=>Confused, S/CS=>Aware. */
export function reactionResult({sl,currentState=ALERTNESS.CONFUSED,immediateAfterAlert=false}={}){
  const success=sl===SL.S||sl===SL.CS;
  if(immediateAfterAlert&&currentState===ALERTNESS.UNAWARE){
    return {state:success?ALERTNESS.AWARE:ALERTNESS.CONFUSED,mayActNormallyNextTurn:success,repeatNextTurn:!success};
  }
  return {state:success?ALERTNESS.AWARE:currentState,mayActNormallyNextTurn:success,repeatNextTurn:!success};
}

/** p159 optional Initiative Reaction Roll. When enabled, combatants who would
 * start aware instead begin Confused and test Reaction at the START of their
 * first turn; failures remain Confused and retest once each later turn. */
export function initialAlertnessWithInitiativeReaction({initialState=ALERTNESS.AWARE,optionEnabled=false}={}){
  if(!optionEnabled||initialState!==ALERTNESS.AWARE) return {state:initialState,reactionTiming:null,initiativeReaction:false};
  return {state:ALERTNESS.CONFUSED,reactionTiming:'start-first-turn',initiativeReaction:true};
}
export function initiativeReactionTurn({sl,firstTurn=false}={}){
  if(![SL.CF,SL.F,SL.S,SL.CS].includes(sl)) throw new RangeError('Valid success level required');
  const success=sl===SL.S||sl===SL.CS;
  return {state:success?ALERTNESS.AWARE:ALERTNESS.CONFUSED,mayActNormallyThisTurn:firstTurn&&success,mayActNormallyNextTurn:!firstTurn&&success,repeatNextTurn:!success,timing:firstTurn?'start-turn':'end-turn'};
}
