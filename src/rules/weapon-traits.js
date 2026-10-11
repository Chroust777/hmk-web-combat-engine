/** Data-driven HMK melee weapon trait helpers, p98. */
export const DEFAULT_IMPACT_TA={b:3,e:5,p:4,f:2};
export function armourAfterReduction(av,ar=0){return Math.max(0,av-ar);}
export function defenceAvailability({counterOnly=false,blockAvailable=true,counterstrikeAvailable=true}={}){
  return {block:counterOnly?false:blockAvailable,counterstrike:counterstrikeAvailable};
}
export function weaponTestModifier({melee=0,block=0,defence=0,mode='strike'}={}){
  if(mode==='block') return melee+defence+block;
  if(mode==='counterstrike') return melee+defence;
  if(mode==='strike'||mode==='thrown') return melee;
  return 0;
}
export function opponentDefencePenalty({oppDefence=0}={}){return oppDefence;}
export function shieldModifiers({shieldMod=0,role,defence}={}){
  if(role==='defender'&&(defence==='block'||defence==='dodge')) return {self:shieldMod,opponent:0};
  if(role==='attacker'&&defence==='press') return {self:shieldMod,opponent:0};
  if(defence==='counterstrike') return {self:0,opponent:-Math.abs(shieldMod)};
  return {self:0,opponent:0};
}
export function slowPenalty({slow=false,slowOneHanded=false,twoHanded=false,threateningFoeCount=0,defence}={}){
  if(defence!=='block'&&defence!=='counterstrike') return 0;
  if(threateningFoeCount<2) return 0;
  if(!slow && !(slowOneHanded&&!twoHanded)) return 0;
  return -10;
}
export function impactTABonus({aspect,count=1,override=null}={}){
  const per=override?.[aspect]??DEFAULT_IMPACT_TA[aspect]; if(per==null) throw new RangeError('Unknown impact aspect'); return per*count;
}
export function longWeaponRestriction({long=false,inClose=false,distanceFeet=null,primaryMode=true}={}){
  const restricted=!!long&&!!primaryMode&&(!!inClose||(distanceFeet!=null&&distanceFeet<=5));
  return {mayThreaten:!restricted,mayStrike:!restricted};
}
export function lowAimRule({lowAim=false,aimZN}={}){
  if(!lowAim) return {modifier:0,jumpingSRRequired:false};
  if(aimZN>=7) return {modifier:0,jumpingSRRequired:false};
  return {modifier:-10,jumpingSRRequired:aimZN===1};
}
export function entangleAttack({entangle=false}={}){return entangle?{available:true,attack:'grab-hold',armed:true}:{available:false};}
export function envelopDefencePenalty({envelop=false}={}){return envelop?-20:0;}
export function createEnvelopedCondition({sourceId=null}={}){return {type:'enveloped',source:sourceId,attackModifier:-20,defenceModifier:-20,moveModifier:-20,escape:{action:'grope',test:'dexterity-success-value',targetSV:15,accumulatedSV:0}};}
export function applyEnvelopEscapeSV(condition,sv){if(condition?.type!=='enveloped') throw new TypeError('Enveloped condition required'); condition.escape.accumulatedSV+=sv; return {escaped:condition.escape.accumulatedSV>=condition.escape.targetSV,accumulatedSV:condition.escape.accumulatedSV};}
export function couchedHeft({heft,mounted=false,couched=false}={}){return mounted&&couched?heft-3:heft;}
