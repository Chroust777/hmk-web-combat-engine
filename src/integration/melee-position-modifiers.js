import {proneEffects} from '../rules/positioning.js';
/** HMK p.171: a prone walking combatant suffers -20 to melee tests. */
export function proneMeleeEMLModifier({prone=false,walks=true}={}){
 if(typeof prone!=='boolean'||typeof walks!=='boolean')return {ok:false,reason:'invalid-prone-state'};
 if(prone&&!walks)return {ok:false,reason:'nonwalking-creature-cannot-be-prone'};
 const value=prone?proneEffects({walks}).meleeModifier:0;
 return {ok:true,label:'Prone (HMK p.171)',value,source:'rules/positioning.js'};
}
