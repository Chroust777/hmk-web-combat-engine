/** Reach must use the same weapon/mode as the actual strike for the striking actor.
 * This checks input consistency only; it does not infer Creature Size or In Close.
 */
export function validateStrikeReachSelection({strikeWeaponId,strikeMode='primary',reachWeaponId,reachMode='primary'}={}){
 if(typeof strikeWeaponId!=='string'||!strikeWeaponId||typeof reachWeaponId!=='string'||!reachWeaponId)return {ok:false,reason:'missing-strike-or-reach-weapon'};
 if(strikeWeaponId!==reachWeaponId)return {ok:false,reason:'strike-and-reach-weapon-mismatch'};
 if(strikeMode!==reachMode)return {ok:false,reason:'strike-and-reach-mode-mismatch'};
 return {ok:true};
}
