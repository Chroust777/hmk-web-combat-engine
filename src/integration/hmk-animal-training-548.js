/** HMK v1.2, p.65, Animalcraft Animal Training.
 * Computes a verifiable result from a completed, saved Animalcraft SV and
 * actual d10/d3 rolls. Returns an immutable evidence projection only: neither
 * the animal's skills, the clock, nor its fatigue/injury are silently changed.
 */
const requireTrue=(ok,msg)=>{if(!ok)throw Error(msg);};
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const starCount=sv=>Math.min(5,Math.max(0,sv-4));
export function animalTrainingCandidate(proof){
 if(proof?.type!=='secondary-mastery-value-test'||(proof.skills?.[0]||proof.skill)!=='Animalcraft')return null;
 const a=proof.a||proof.result;
 if(!a||!int(a.roll,1,100)||!int(a.sv,-200,500)||!['CF','F','S','CS'].includes(a.level))return null;
 return {actorId:proof.actorId,roll:a.roll,sv:a.sv,level:a.level,page:65};
}
export function resolveAnimalTraining({proof,originId,actorId,animalName,reasoning,creativity,
 newborn=true,wasWild=false,previousBestStars=0,previousMasteryBoosts=0,
 shortenByOneMonth=false,trainingD10=[],criticalD3=null,periodConfirmed=false,
 baseSVNotPreAdjusted=false}={}){
 const source=animalTrainingCandidate(proof);
 requireTrue(source&&typeof originId==='string'&&originId.length>0&&actorId===source.actorId,'Chybí původní skutečný Animalcraft Success Value test stejného trenéra');
 requireTrue(typeof animalName==='string'&&animalName.trim().length>=1&&animalName.length<=120,'Nutno určit konkrétní trénované zvíře');
 requireTrue(int(reasoning,1,100)&&int(creativity,1,100),'REA a CRE zvířete musejí být skutečné atributy');
 requireTrue(typeof newborn==='boolean'&&typeof wasWild==='boolean','Věk a divokost zvířete musí být potvrzeny');
 requireTrue(periodConfirmed===true,'GM musí potvrdit skutečný dokončený výcvik (6 měsíců; asi hodina denně)');
 requireTrue(baseSVNotPreAdjusted===true,'GM musí potvrdit, že věk/divokost ještě nejsou v uloženém SV zahrnuty');
 requireTrue(int(previousBestStars,0,5),'Nedoložený předchozí nejlepší hvězdný výsledek');
 const masteryBoostCap=Math.ceil(creativity/2);
 requireTrue(int(previousMasteryBoosts,0,masteryBoostCap),'Předchozí získané mastery boosty překračují CRE limit');
 const adjustedSV=source.sv-(newborn?0:1)-(wasWild?1:0);
 const stars=starCount(adjustedSV);
 const isRetraining=previousBestStars>0;
 const qualifiesForNewRolls=!isRetraining||stars>=previousBestStars;
 requireTrue(!shortenByOneMonth||stars>=1&&qualifiesForNewRolls,
  'Výcvik lze zkrátit jen výměnou za existující bonusový Training Roll');
 const rollsRequired=qualifiesForNewRolls?Math.max(0,stars-(shortenByOneMonth?1:0)):0;
 requireTrue(Array.isArray(trainingD10)&&trainingD10.length===rollsRequired,
  `HMK 65 vyžaduje právě ${rollsRequired} fyzických d10 Training Rolls`);
 requireTrue(trainingD10.every(x=>int(x,1,10)),'Training Roll musí být celé skutečné d10 (1–10)');
 requireTrue(source.level==='CF'?int(criticalD3,1,3):criticalD3===null,
  'Jen Critical Failure přidává skutečný d3 měsíců; bez CF se d3 nehází');
 const trainingSuccesses=trainingD10.filter(d=>d<=reasoning).length;
 const awardedBoosts=Math.min(trainingSuccesses,masteryBoostCap-previousMasteryBoosts);
 const finalBoosts=previousMasteryBoosts+awardedBoosts;
 const additionalMonths=source.level==='CF'?criticalD3:0;
 const months=6-(shortenByOneMonth?1:0)+additionalMonths;
 const status=adjustedSV<=2?'faulty':adjustedSV<=4?'base':'masterwork';
 return {type:'animal-training',format:'hmk-animal-training-p65-v1',originId,actorId,animalName:animalName.trim(),
  sourcePage:65,sourceRoll:source.roll,sourceLevel:source.level,sourceSV:source.sv,
  newborn,wasWild,reasoning,creativity,adjustedSV,status,stars,
  previousBestStars,qualifiesForNewRolls,isRetraining,
  previousMasteryBoosts,masteryBoostCap,
  shortenByOneMonth,rollsRequired,physicalTrainingDice:[...trainingD10],
  trainingSuccesses,awardedBoosts,finalBoosts,bestStarsAfter:Math.max(stars,previousBestStars),
  controlSecondaryPenalty:status==='faulty'?-1:0,
  baseMonths:6,criticalD3,additionalMonths,months,periodConfirmed:true,
  boostedSkills:['Initiative','Shock','all natural Melee skills','Dodge','Press'],
  animalSkillsCommitted:false,timeAdvanced:false,sourceModified:false};
}
