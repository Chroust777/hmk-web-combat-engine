/** HMK pp.166,171: derive selectable TA from a resolved Melee outcome.
 * Does not silently convert TA to persistent credits; Impact/Precision are immediate.
 */
export function meleeTAAwardOptions(gate,{attackerId,defenderId}={}){
 if(!gate?.ok||!attackerId||!defenderId||attackerId===defenderId) return {ok:false,reason:'invalid-melee-outcome'};
 const ownerId=gate.striker==='defender'||(!gate.striker&&gate.defence!=='ignore'&&gate.winner==='defender')?defenderId:attackerId;
 if(!gate.striker&&gate.winner!=='defender')return {ok:true,ownerId:null,remaining:0,allowed:[]};
 const allowed=Array.isArray(gate.taTypes)?gate.taTypes.filter(t=>['action','setup','impact','precision'].includes(t)):[];
 const spentImpact=gate.impactTA||0;
 if(!Number.isSafeInteger(gate.extraTA)||gate.extraTA<0||!Number.isSafeInteger(spentImpact)||spentImpact<0||spentImpact>gate.extraTA||spentImpact>0&&!allowed.includes('impact'))return {ok:false,reason:'invalid-ta-budget'};
 return {ok:true,ownerId,remaining:gate.extraTA-spentImpact,allowed,spentImpact};
}
export function allocateMeleeTACredit(options,{type,count=1}={}){
 if(!options?.ok||!options.ownerId||!['action','setup'].includes(type)||!options.allowed.includes(type))throw new Error('TA type unavailable for outcome');
 if(!Number.isSafeInteger(count)||count<1||count>options.remaining)throw new Error('TA exceeds available outcome budget');
 return {ownerId:options.ownerId,type,count};
}
