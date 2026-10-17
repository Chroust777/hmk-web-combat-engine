/** HMK pp112,117,122 encumbrance and bulk. */
export function strengthEncumbranceModifier(str,{mounted=false}={}){
 if(!Number.isFinite(str)||str<1) throw new RangeError('Positive STR required');
 let mod;
 if(str<=5) mod=15;
 else if(str<=7) mod=10;
 else if(str<=9) mod=5;
 else if(str<=11) mod=0;
 else mod=-5*Math.floor((str-10)/2);
 return mod-(mounted?15:0);
}
export function gearEncumbrance(weightLb,{awkwardWeightLb=0}={}){
 if(!Number.isFinite(weightLb)||weightLb<0||!Number.isFinite(awkwardWeightLb)||awkwardWeightLb<0) throw new RangeError('Non-negative weights required');
 // weightLb includes the awkward subset exactly once; add it once more to double it.
 if(awkwardWeightLb>weightLb) throw new RangeError('Awkward subset exceeds total weight');
 const effective=weightLb+awkwardWeightLb;
 return Math.floor(effective/20)*5;
}
export function modifiedEncumbrance({armourENC=0,gearENC=0,str,mounted=false}={}){
 const base=armourENC+gearENC;
 let mod=strengthEncumbranceModifier(str,{mounted});
 // STR below 10 increases ENC only when base ENC is at least 5.
 if(base<5&&mod>0) mod=0;
 return Math.max(0,base+mod);
}
export function encumbranceTestPenalty({encumbrance,testKind,skillBaseIncludesAgility=false}={}){
 if(testKind==='move'||testKind==='agility'||skillBaseIncludesAgility) return -encumbrance;
 return 0;
}
export function bulkPenalty({violatingZones=[],requiredZones=[]}={}){
 const v=new Set(violatingZones), r=new Set(requiredZones);
 let count=0; for(const z of v) if(r.has(z)) count++;
 return count===0?0:-5*count;
}
