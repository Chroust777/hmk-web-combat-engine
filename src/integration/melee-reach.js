import {reachModifier} from '../rules/melee.js';
/** HMK p.159/171: reach comparison; explicit RCH avoids guessing creature size or equipped mode. */
export function verifiedReachEMLModifiers({attackerRCH,defenderRCH,inClose=false}={}){
 if(!Number.isInteger(attackerRCH)||!Number.isInteger(defenderRCH)||attackerRCH<0||defenderRCH<0||typeof inClose!=='boolean')return {ok:false,reason:'invalid-reach-state'};
 const attacker=reachModifier({attackerRCH,opponentRCH:defenderRCH,inClose});
 const defender=reachModifier({attackerRCH:defenderRCH,opponentRCH:attackerRCH,inClose});
 return {ok:true,attacker,defender,inClose};
}
