/** HMK printed p.120 expedition effects. Pure reference rules; no character/combat mutation. */
const integer=(v,name,min=0)=>{if(!Number.isInteger(v)||v<min)throw new RangeError(`${name} must be integer >= ${min}`);return v;};
export const EXPEDITION_EFFECTS_P120=Object.freeze([
 {item:'Arrow bag, holds 24',kind:'capacity',arrows:24,drawRounds:1,waterproof:true},
 {item:'Backpack, 30 lb',kind:'stowage',capacityLb:30,packedEffectiveWeightFactor:0.5},
 {item:'Bandages, 32',kind:'consumable',count:32,cleanDressPerInjuryLevel:1,staunchDicePerBloodlossPoint:'d6'},
 {item:'Bedroll',kind:'sleep',requiresEndSR:false},
 {item:'Bedroll, heavy',kind:'sleep',requiresEndSR:false,coldAV:1},
 {item:'Blanket',kind:'cold',coldAV:1},
 {item:'Cloak (Cloth)',kind:'cold',coldAV:1},
 {item:'Cloak (Padded)',kind:'cold',coldAV:2},
 {item:'Grappling hook',kind:'throw',baseRangeFt:15,catchOnCS:true,catchOnEvenSuccessOnesDie:true},
 {item:'Herbs, retail',kind:'price',potionPriceFactor:0.25},
 {item:'Lantern, 1/8 pint',kind:'light',radiusFt:30,oilPintsPer4Hours:0.125},
 {item:'Quiver, holds 12',kind:'capacity',arrows:12,drawRounds:1,waterproof:false},
 {item:'Quiver, holds 24',kind:'capacity',arrows:24,drawRounds:1,waterproof:false},
 {item:'Rations, standard',kind:'food',edibleDays:10},
 {item:'Rations, iron',kind:'food',edibleDays:30},
 {item:'Rope, hemp, 1″, 50′',kind:'rope',maxLoadLb:1000,lengthFt:50},
 {item:'Rope, hemp, ½″, 50′',kind:'rope',maxLoadLb:400,lengthFt:50},
 {item:"Rope, silk, ½″, 50′",kind:'rope',maxLoadLb:1000,lengthFt:50},
 {item:'Surgery tools',kind:'treatment',requiredFor:['extraction','surgery'],includesBandages:false},
 {item:'Tarpaulin, 4′ × 6′',kind:'shelter',heavyPrecipitation:true},
 {item:'Tent, 1-man',kind:'shelter',heavyPrecipitation:true,coldAV:2},
 {item:'Tent, 2-man',kind:'shelter',heavyPrecipitation:true,coldAV:2},
 {item:'Tent, conical 3-man',kind:'shelter',heavyPrecipitation:true,coldAV:2},
 {item:'Tinderbox',kind:'fire',requiredSurvivalSV:3,baseDice:6,dieSides:6,knifePenalty:-20},
 {item:'Torch',kind:'light',radiusFt:20,durationHours:1}
]);
/** No bedroll: successful END SR recovers 10 fatigue, failure 5; with either bedroll this extra SR is avoided. */
export function sleepingWearinessRecovery({hasBedroll=false,endSRSuccess=null}={}){
 if(hasBedroll)return Object.freeze({requiresEndSR:false,recoveryFatigue:null});
 if(typeof endSRSuccess!=='boolean')return Object.freeze({requiresEndSR:true,recoveryFatigue:null});
 return Object.freeze({requiresEndSR:true,recoveryFatigue:endSRSuccess?10:5});
}
export function bandagesForCleanDress(injuryLevel){return integer(injuryLevel,'injuryLevel');}
export function bandagesForStaunch(bloodlossPoints,d6Rolls){integer(bloodlossPoints,'bloodlossPoints');if(!Array.isArray(d6Rolls)||d6Rolls.length!==bloodlossPoints)throw new RangeError('One d6 roll per Bloodloss Point');return d6Rolls.reduce((sum,v)=>sum+integer(v,'d6',1)+(v>6?(()=>{throw new RangeError('d6 cannot exceed 6');})():0),0);}
export function grapplingHookCatches({criticalSuccess=false,success=false,onesDie=null}={}){if(criticalSuccess)return true;if(!success)return false;integer(onesDie,'onesDie');if(onesDie>9)throw new RangeError('onesDie must be 0–9');return onesDie%2===0;}
export function tinderboxLighting({stars=0,knifeInsteadOfFiresteel=false}={}){integer(stars,'stars');return Object.freeze({survivalSV:3,rollDice:Math.max(0,6-stars),dieSides:6,emlModifier:knifeInsteadOfFiresteel?-20:0});}
export function ropeLengthVariant({standardWeightLb,standardPrice,requestedLengthFt}){if(![standardWeightLb,standardPrice,requestedLengthFt].every(x=>Number.isFinite(x)&&x>=0))throw new RangeError('Nonnegative finite values required');return Object.freeze({weightLb:standardWeightLb*requestedLengthFt/50,price:standardPrice*requestedLengthFt/50});}
