/** HMK p.171: explicit, auditable transitions. No inferred combat state. */
export function validateInCloseTransition({active,reason,withinFiveFeet=false,targetCondition=null,successfulGrab=false,actionTA=false,separationFeet=null,gmTightQuarters=false}={}){
  if(typeof active!=='boolean')return {ok:false,reason:'State must be boolean'};
  if(active){
    if(reason==='free-condition' && withinFiveFeet && ['prone','confused','stunned','unaware','helpless'].includes(targetCondition))return {ok:true,active:true,reason};
    if(reason==='grab' && successfulGrab)return {ok:true,active:true,reason};
    if(reason==='action-ta' && actionTA)return {ok:true,active:true,reason};
    if(reason==='tight-quarters' && gmTightQuarters)return {ok:true,active:true,reason};
    return {ok:false,reason:'HMK In Close entry condition not verified'};
  }
  if(reason==='separation' && Number.isFinite(separationFeet) && separationFeet>=5)return {ok:true,active:false,reason};
  if(reason==='tight-quarters-ended' && gmTightQuarters)return {ok:true,active:false,reason};
  return {ok:false,reason:'HMK In Close exit condition not verified'};
}
