import {successLevel,SL} from '../rules/tests.js';
import {resolveMeleeOutcome,DEFENCE,TA} from '../rules/melee.js';

/** Fail-closed attack/defence bridge. Only an attacker strike can feed the defender injury pipeline. */
export function resolveMeleeAttackGate({defence,attackerEML,attackerRoll,defenderEML,defenderRoll,impactTA=0,finalD10Attacker=null,finalD10Defender=null,attackerSetup=0,defenderSetup=0}={}){
 if(!Object.values(DEFENCE).includes(defence))return {ok:false,reason:'unknown-defence'};
 if(!Number.isSafeInteger(attackerEML)||attackerEML<0||attackerEML>100||!Number.isSafeInteger(attackerRoll)||attackerRoll<1||attackerRoll>100)return {ok:false,reason:'invalid-attacker-test'};
 if(defence!==DEFENCE.IGNORE&&(!Number.isSafeInteger(defenderEML)||defenderEML<0||defenderEML>100||!Number.isSafeInteger(defenderRoll)||defenderRoll<1||defenderRoll>100))return {ok:false,reason:'invalid-defender-test'};
 if(![attackerSetup,defenderSetup].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=3)||defence===DEFENCE.IGNORE&&defenderSetup!==0)return {ok:false,reason:'invalid-setup-TA'};
 if(!Number.isSafeInteger(impactTA)||impactTA<0||impactTA>3)return {ok:false,reason:'invalid-impact-TA'};
 if((finalD10Attacker!==null||finalD10Defender!==null)&&(!Number.isSafeInteger(finalD10Attacker)||finalD10Attacker<1||finalD10Attacker>10||!Number.isSafeInteger(finalD10Defender)||finalD10Defender<1||finalD10Defender>10))return {ok:false,reason:'invalid-final-d10'};
 const aNatural=successLevel(attackerRoll,attackerEML);
 const a={ml:attackerEML,roll:attackerRoll,naturalSL:aNatural,sl:Math.min(SL.CS,aNatural+attackerSetup)};
 const dNatural=defence===DEFENCE.IGNORE?null:successLevel(defenderRoll,defenderEML);
 const d=defence===DEFENCE.IGNORE?null:{ml:defenderEML,roll:defenderRoll,naturalSL:dNatural,sl:Math.min(SL.CS,dNatural+defenderSetup)};
 const outcome=resolveMeleeOutcome({attacker:a,defender:d,defence,finalD10Attacker,finalD10Defender});
 if(outcome.needsFinalD10)return {ok:false,reason:'final-d10-tiebreak-required'};
 const counterStrike=outcome.striker==='defender'&&outcome.strike&&defence===DEFENCE.COUNTERSTRIKE;
 const attackerStrike=outcome.striker==='attacker'&&outcome.strike;
 if(impactTA>0&&(!(attackerStrike||counterStrike)||!outcome.taTypes.includes(TA.IMPACT)||impactTA>outcome.extraTA))return {ok:false,reason:'impact-TA-not-earned'};
 return {ok:true,attackerStrike,counterStrike,strikeOwner:attackerStrike?'attacker':counterStrike?'defender':null,impactBonus:null,impactTA,attackerSL:a.sl,defenderSL:d?.sl??null,attackerNaturalSL:aNatural,defenderNaturalSL:dNatural,attackerSetup,defenderSetup,defence,winner:outcome.winner,taTypes:outcome.taTypes,stars:outcome.stars,extraTA:outcome.extraTA,striker:outcome.striker,usedTiebreak:outcome.usedTiebreak,weaponDamageCheck:outcome.weaponDamageCheck,attackerMishap:outcome.attackerMishap,defenderMishap:outcome.defenderMishap,summary:outcome.striker==='defender'?'Counterstrike obránce: zásah původního útočníka.':outcome.strike?'Zásah útočníka.':'Bez zásahu útočníka.'};
}
