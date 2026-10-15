import {baseOutnumberedPenalty} from '../rules/melee.js';

/** HMK p.159: -10 for each additional threatening foe. The GM must exclude prone/ignored foes. */
export function outnumberedEMLModifier(threateningFoeCount){
  if(!Number.isSafeInteger(threateningFoeCount)||threateningFoeCount<1||threateningFoeCount>100)
    return {ok:false,reason:'Počet skutečně ohrožujících protivníků musí být celé číslo 1–100.'};
  const value=baseOutnumberedPenalty(Array.from({length:threateningFoeCount},(_,i)=>`foe-${i}`));
  return {ok:true,label:'Outnumbered (HMK p.159; GM potvrzený počet)',value:value===0?0:value,threateningFoeCount};
}
