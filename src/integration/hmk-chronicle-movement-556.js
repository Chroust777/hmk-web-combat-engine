/** Read-only HMK 1.2 pp.56, 160: Move - ENC - Fatigue - Impairment.
 * Needs real, currently certified equipment and injuries. Missing evidence is
 * never replaced by a made-up zero. This module commits no state or rolls.
 */
export function projectChronicleMovement({baseMove,load,fatigue,injury,shock='NONE',narcoticPenalty=0}={}){
 const fail=reason=>({ready:false,reason});
 if(!Number.isSafeInteger(baseMove)||baseMove<0)return fail('Chybí pravidlové základní Move');
 if(!load?.encReady||!Number.isSafeInteger(load.modifiedENC))return fail('ENC z nasazené zbroje a nesené výbavy není doloženo');
 if(!Number.isSafeInteger(fatigue)||fatigue<0)return fail('Fatigue není doloženo');
 if(!injury?.ready||!Number.isSafeInteger(injury.impairment)||injury.impairment<0)return fail('Impairment nelze doložit: '+(injury?.reason||'neověřené zranění'));
 if(!Number.isFinite(narcoticPenalty)||narcoticPenalty<0)return fail('Narcotic Move postih není doložen');
 const enc=load.modifiedENC,raw=baseMove-enc-fatigue-injury.impairment;
 const effective=Math.floor(Math.max(0,raw-narcoticPenalty));
 const blocked=injury.blocked||['INC','UNC','KIA'].includes(shock)||effective<5;
 const half=blocked?0:Math.floor(effective/10)*5;
 return {ready:true,base:baseMove,enc,fatigue,impairment:injury.impairment,
  narcoticPenalty,effective,half,full:blocked?0:effective,
  double:blocked?0:effective*2,blocked,source:'HMK 1.2 pp.56,160'};
}
