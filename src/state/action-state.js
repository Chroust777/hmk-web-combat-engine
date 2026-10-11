import { SHOCK_STATE, shockStateEffects } from '../rules/shock.js';
import { ALERTNESS, alertnessLimits } from '../rules/alertness.js';
import { FEAR, fearActionPolicy } from '../rules/fear.js';
import { MORALE, moraleActionPolicy } from '../rules/morale.js';

/** Central pre-action gate. This composes already-defined HMK state restrictions
 * so callers cannot bypass them by invoking an individual action helper directly.
 * It does not resolve the action itself and never invents a player/GM choice. */
export function actionLegality({
  action,
  moveRate=null,
  shockState=SHOCK_STATE.NONE,
  alertness=ALERTNESS.AWARE,
  fearState=FEAR.STEADY,
  moraleState=MORALE.STEADY,
  fleePossible=true,
  threatened=false,
  requiresConcentration=false,
  concentrationAllowed=true,
  requiresUnusableZone=false
}={}){
 const reasons=[];
 const shock=shockStateEffects(shockState);
 if(shockState===SHOCK_STATE.KIA) reasons.push('killed');
 else if(shockState===SHOCK_STATE.UNC) reasons.push('unconscious');
 else if(shockState===SHOCK_STATE.INC) reasons.push('incapacitated-no-independent-actions');

 const alert=alertnessLimits(alertness);
 if(!alert.mayAct){
   if(alert.forcedAction==='pass' && action!=='pass') reasons.push('confused-must-pass');
   else if(alertness===ALERTNESS.UNAWARE) reasons.push('unaware-no-action');
 }

 const fear=fearActionPolicy(fearState,{fleePossible});
 if(fear.action==='none') reasons.push('fear-no-action');
 else if(fear.action==='move' && action!=='move') reasons.push('terrified-must-flee');
 else if(Array.isArray(fear.actions) && !fear.actions.includes(action)) reasons.push('afraid-pass-or-move-away');
 else if(fear.action==='pass' && action!=='pass') reasons.push('fear-must-pass');

 const morale=moraleActionPolicy(moraleState,{fleePossible,threatened});
 if(morale.action==='none') reasons.push('morale-no-action');
 else if(morale.action==='move' && action!=='move') reasons.push('morale-must-move');
 else if(morale.action==='pass' && action!=='pass') reasons.push('morale-must-pass');

 if(shockState===SHOCK_STATE.STN && action==='evade') reasons.push('stunned-cannot-evade');
 if(shockState===SHOCK_STATE.STN && moveRate==='double') reasons.push('stunned-no-double-move');
 if(requiresConcentration && !concentrationAllowed) reasons.push('concentration-blocked');

 // p170: use of a Grievous/unusable zone is not silently disallowed; it is an automatic CF.
 const automaticCF=!!requiresUnusableZone;
 return {legal:reasons.length===0,reasons,automaticCF,shock,forcedAction:alert.forcedAction??null};
}

/** After a readied action interrupts another turn, the interrupted actor must
 * still be legally capable of continuing the originally declared action.
 * The caller supplies the actor's post-interrupt state; no pre-interrupt legality is cached.
 */
export function resumeInterruptedAction({action,postInterruptState={}}={}){
  const legality=actionLegality({action,...postInterruptState});
  return {mayResume:legality.legal,legality,originalAction:action};
}
