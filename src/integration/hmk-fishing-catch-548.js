/** HMK v1.2 pp.70–71: complete Fishing SV catch arithmetic.
 * Pure evidence projection: no random dice, automatic time, inventory or trauma.
 * A natural CF has a SEPARATE Dex/Agility mishap & injury handoff.
 */
const required=(yes, message)=>{if(!yes)throw Error(message);};
const die=(value,faces)=>Number.isSafeInteger(value)&&value>=1&&value<=faces;
const range=(value,lo,hi)=>Number.isSafeInteger(value)&&value>=lo&&value<=hi;
export const FISHING_CONDITIONS=Object.freeze([
 Object.freeze({lo:1,hi:5,condition:'Poor',tn:1}),
 Object.freeze({lo:6,hi:25,condition:'Fair',tn:3}),
 Object.freeze({lo:26,hi:75,condition:'Average',tn:5}),
 Object.freeze({lo:76,hi:95,condition:'Good',tn:7}),
 Object.freeze({lo:96,hi:100,condition:'Excellent',tn:9})
]);
export function fishingCatchCandidate(proof){
 if(proof?.type!=='secondary-mastery-value-test'||(proof.skills?.[0]||proof.skill)!=='Fishing')return null;
 const r=proof.a||proof.result;
 if(!r||!range(r.roll,1,100)||!range(r.sv,-200,500)||!['CF','F','S','CS'].includes(r.level))return null;
 return {actorId:proof.actorId,roll:r.roll,sv:r.sv,level:r.level,secondarySkills:proof.secondarySkills||[],sourcePage:71};
}
export function fishingConditions(d100,gmSaturationPenalty=0){
 required(die(d100,100),'Podmínky rybolovu vyžadují skutečný d100');
 required(range(gmSaturationPenalty,0,100),'GM úprava při přeplnění revíru musí být celé číslo 0–100');
 const band=FISHING_CONDITIONS.find(c=>d100>=c.lo&&d100<=c.hi);
 return {source:'physical-d100',roll:d100,condition:band.condition,baseTN:band.tn,gmSaturationPenalty,tn:band.tn-gmSaturationPenalty};
}
export function fishingConditionsSelected(condition,gmSaturationPenalty=0){
 required(range(gmSaturationPenalty,0,100),'GM úprava při přeplnění revíru musí být celé číslo 0–100');
 const band=FISHING_CONDITIONS.find(c=>c.condition===condition);
 required(band,'GM musí zvolit jednu z pěti vytištěných Fishing Conditions (HMK 71)');
 return {source:'gm-selected',roll:null,condition:band.condition,baseTN:band.tn,
  gmSaturationPenalty,tn:band.tn-gmSaturationPenalty};
}
export function resolveFishingCatch({proof,originId,actorId,technique='line',conditionsMode='roll',conditionsD100=null,gmCondition=null,
 gmSaturationPenalty=0,foodD10=[],saltWater=false,offshore=false,periodConfirmed=false,
 baseSVNotPreAdjusted=false}={}){
 const source=fishingCatchCandidate(proof);
 required(source&&typeof originId==='string'&&originId&&actorId===source.actorId,'Chybí doložené původní Fishing SV stejné postavy');
 required(periodConfirmed===true,'GM musí potvrdit dokončenou čtyřhodinovou rybářskou činnost');
 required(baseSVNotPreAdjusted===true,'GM musí potvrdit, že úpravy techniky a slané vody nejsou v původním SV již započteny');
 required(['line','bare','net','spear'].includes(technique),'Nedoložená technika rybolovu');
 required(typeof saltWater==='boolean'&&typeof offshore==='boolean','Nepotvrzené rybářské prostředí');
 if(technique==='bare')required(source.secondarySkills.includes('Dexterity'),
  'Bare Hands vyžaduje původní Fishing (Dexterity) SV; nový SR nelze domyslet');
 if(technique==='spear')required(source.secondarySkills.some(s=>['Dexterity','Melee'].includes(s)),
  'Spear vyžaduje původní Fishing (Melee nebo Dexterity) SV');
 required(['roll','gm'].includes(conditionsMode),'Neznámý způsob určení podmínek rybolovu');
 const conditions=conditionsMode==='roll'?(required(gmCondition===null,'Nemíchejte d100 a volbu GM'),fishingConditions(conditionsD100,gmSaturationPenalty)):
  (required(conditionsD100===null,'Při volbě GM se nehází další d100'),fishingConditionsSelected(gmCondition,gmSaturationPenalty));
 // HMK p.71: for a salt-water CS add +2 instead of the ordinary CS +1.
 const saltCSBonus=saltWater&&source.level==='CS'?1:0;
 const adjustedSV=source.sv+(technique==='bare'?-2:0)+saltCSBonus;
 const expectedDice=adjustedSV<=0?0:adjustedSV<=2?2:4;
 required(Array.isArray(foodD10)&&foodD10.length===expectedDice,
  `Fishing SV ${adjustedSV} vyžaduje přesně ${expectedDice} fyzických d10`);
 required(foodD10.every(x=>die(x,10)),'Každý d10 úlovku musí být skutečný celý hod 1–10');
 const successes=foodD10.filter(v=>v<=conditions.tn).length;
 const stars=Math.min(5,Math.max(0,adjustedSV-4));
 // Four d10 successes double ONLY food-days derived from stars, not the
 // extra d10 successes. HMK p.71 explicitly separates those quantities.
 const doubledStars=expectedDice===4&&stars>0&&successes===4;
 const starFoodDays=stars*(doubledStars?2:1);
 const baseFoodDays=successes+starFoodDays;
 const locationMultiplier=offshore?2:1,gearMultiplier=technique==='net'?2:1;
 const foodDays=baseFoodDays*locationMultiplier*gearMultiplier;
 return {type:'fishing-catch',format:'hmk-fishing-catch-p71-v1',originId,actorId,
  sourcePage:71,sourceRoll:source.roll,sourceLevel:source.level,sourceSV:source.sv,
  technique,saltWater,offshore,periodHours:4,periodConfirmed:true,
  baseSVNotPreAdjusted:true,saltCSBonus,adjustedSV,conditions,
  physicalFoodDice:[...foodD10],expectedDice,successes,stars,doubledStars,
  starFoodDays,baseFoodDays,locationMultiplier,gearMultiplier,foodDays,
  totalFishPounds:foodDays*6,ediblePounds:foodDays*3,
  criticalFailureHandoffRequired:source.level==='CF',
  inventoryCommitted:false,timeAdvanced:false,sourceModified:false};
}
