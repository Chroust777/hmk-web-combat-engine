export const SL={CF:0,F:1,S:2,CS:3};
export const indexOf=ml=>Math.floor(ml/10);
export function effectiveMasteryLevel(raw,{min=5,max=95,clamp=true}={}){
  if(!Number.isFinite(raw)) throw new TypeError('EML required');
  return clamp ? Math.min(max,Math.max(min,raw)) : raw;
}
export function successLevel(roll, eml,{clamp=true,min=5,max=95}={}){
  if(!Number.isInteger(roll)||roll<1||roll>100) throw new RangeError('d100 roll must be 1..100');
  const finalEML=effectiveMasteryLevel(eml,{min,max,clamp});
  const success=roll<=finalEML;
  const critical=roll%5===0;
  return critical ? (success?SL.CS:SL.CF) : (success?SL.S:SL.F);
}
export function successValue({ml,sl,extra=0}){
  const mod=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?0:1;
  return indexOf(ml)+mod+extra;
}
export function secondaryModifier(ml){
  const idx=indexOf(ml); return idx<=10 ? [-25,-20,-15,-10,-5,0,5,10,15,20,25][idx] : 25+(idx-10)*5;
}
export function secondaryRoll(d10,tn){ if(!Number.isInteger(d10)||d10<1||d10>10) throw new RangeError('d10 must be 1..10'); return d10<=tn; }
export function opposed({a,b,tie='none',finalD10A=null,finalD10B=null}){
  if(a.sl!==b.sl){
    if(a.sl<SL.S && b.sl<SL.S) return {winner:null,stars:0,bothFailed:true};
    return a.sl>b.sl?{winner:'a',stars:a.sl-b.sl}:{winner:'b',stars:b.sl-a.sl};
  }
  if(tie==='a') return {winner:'a',stars:1,tiedSuccess:true};
  if(tie==='b') return {winner:'b',stars:1,tiedSuccess:true};
  if(tie!=='break') return {winner:null,stars:0,tie:true};
  if(a.roll!==b.roll) return {winner:a.roll>b.roll?'a':'b',stars:1,tiebreak:true};
  if(a.ml!==b.ml) return {winner:a.ml>b.ml?'a':'b',stars:1,tiebreak:true};
  if(finalD10A==null||finalD10B==null) return {winner:null,stars:0,needsFinalD10:true};
  if(finalD10A===finalD10B) return {winner:null,stars:0,needsFinalD10:true};
  return {winner:finalD10A>finalD10B?'a':'b',stars:1,tiebreak:true};
}
