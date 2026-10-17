/** Core HMK p191 Weapon Damage helpers. */
export function weaponDamageImpact({strikeImpact,csTiebreak=false,targetIsShield=false,thrust=false,sourceNatural=false,targetArmed=false}={}){
  let impact=strikeImpact;
  if(csTiebreak) impact+=5;
  if(targetIsShield) impact+=5;
  if(thrust) impact-=5;
  if(sourceNatural && targetArmed) impact-=5;
  return impact;
}
export function weaponDamageResult({impact,currentWQ}={}){
  if(!Number.isFinite(impact)||!Number.isFinite(currentWQ)) throw new TypeError('impact and currentWQ required');
  if(impact>currentWQ*2) return {destroyed:true,wqLoss:0};
  if(impact>currentWQ) return {destroyed:false,wqLoss:1};
  return {destroyed:false,wqLoss:0};
}
export function applyWeaponDamage(instance,result){
  if(result.destroyed){ instance.destroyed=true; return instance; }
  if(result.wqLoss) instance.currentWQ=Math.max(0,instance.currentWQ-result.wqLoss);
  return instance;
}
export function qualityImpactPenalty({baseWQ,currentWQ}={}){ const loss=Math.max(0,baseWQ-currentWQ); return loss===0?0:-loss; }
export function metalArmourWeaponDamage({aspect,effectiveImpact,metalArmour,d6,currentWQ}={}){
  const eligible=(aspect==='e'||aspect==='p') && !!metalArmour && effectiveImpact<0;
  if(!eligible) return {eligible:false};
  const impact=d6+Math.abs(effectiveImpact);
  return {eligible:true,impact,...weaponDamageResult({impact,currentWQ})};
}
