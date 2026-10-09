/** HMK pp.120, 122: inventory-weight accounting, independent of character/combat state.
 * Each physical item appears once. Worn armour is excluded; stowed armour is gear.
 * A packed backpack halves the weight of its contents (up to 30 lb), not the backpack itself.
 * Awkward/poorly stowed gear doubles its effective weight. These statuses are exclusive.
 */
const validWeight=(n,label)=>{if(!Number.isFinite(n)||n<0)throw new RangeError(`${label} must be non-negative finite lb`);return n;};
export function calculateGearLoad(items=[]){
 if(!Array.isArray(items))throw new TypeError('items must be an array');
 const ids=new Set();let physicalLb=0,effectiveLb=0,packedContentsLb=0;
 for(const item of items){
  if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id.trim()||ids.has(item.id))throw new RangeError('Each item requires a unique nonempty id');
  ids.add(item.id);
  const lb=validWeight(item.weightLb,`weight of ${item.id}`);
  const quantity=item.quantity??1;
  if(!Number.isInteger(quantity)||quantity<1)throw new RangeError('Quantity must be a positive integer');
  const weight=lb*quantity;validWeight(weight,'total weight');
  const status=item.stowage??'normal';
  if(!['normal','awkward','backpack','worn'].includes(status))throw new RangeError(`Unknown stowage: ${status}`);
  if(status==='worn')continue;
  physicalLb+=weight;
  if(status==='backpack'){packedContentsLb+=weight;effectiveLb+=weight/2;}
  else effectiveLb+=weight*(status==='awkward'?2:1);
 }
 if(packedContentsLb>30)throw new RangeError('Backpack contents exceed the 30 lb printed capacity');
 return Object.freeze({physicalLb,effectiveLb,packedContentsLb,gearENC:Math.floor(effectiveLb/20)*5});
}
/** HMK p.122 stowed suit estimate, not for armour currently worn. */
export function estimatedStowedSuitWeight(unadjustedENC,{clothing=null}={}){
 if(clothing==='normal')return 5;
 if(clothing==='heavy')return 10;
 if(clothing!==null)throw new RangeError('Unknown clothing category');
 validWeight(unadjustedENC,'Unadjusted armour ENC');
 return 10+2*unadjustedENC;
}
/** HMK p.122 animal loads: horse/bovine 20, camel 40, elephant 80 lb per 5 ENC. */
export function mountLoadENC(weightLb,{kind='horse'}={}){
 validWeight(weightLb,'Mount carried weight');
 const step={horse:20,bovine:20,camel:40,elephant:80}[kind];
 if(!step)throw new RangeError('Unsupported mount kind');
 return Math.floor(weightLb/step)*5;
}

/** HMK p.122: mount PF = 5 + 1/4 adjusted ENC, fractional part rounded down to nearest 0 or 5. */
export function mountPersonalFatigue(adjustedENC){
 if(!Number.isFinite(adjustedENC)||adjustedENC<0)throw new RangeError('Adjusted ENC must be nonnegative');
 return 5+Math.floor((adjustedENC/4)/5)*5;
}
/** Source p.122: training rates in denari per Mastery Boost. */
export const MOUNT_TRAINING_COST_PER_MB_P122=Object.freeze({dog:12,hawk:60,horse:80,camel:80,elephant:240});
export const MOUNT_TACK_REQUIREMENTS_P122=Object.freeze({riding:['bit & bridle','horse blanket','saddle'],draft:['special harness'],pack:['special harness'],elephantTackWeightMultiplier:5,elephantTackPriceMultiplier:5});
export const CONVEYANCE_NOTES_P122=Object.freeze({oxenInherentSlowMode:1,oxenTrekkingRoutineStep:4,elephantDomesticated:false,elephantPlatform:{weightLb:200,priceD:480,capacity:'drover and three archers'},packHarnessBodyWeightFraction:0.2,warSaddleUnseatingStumbleModifier:20,warSaddleMountAction:'Move',warSaddleMountRequiresControlTest:true,sledRate:'Cart over snow',sourcePages:[65,145,146,161,172,356]});
