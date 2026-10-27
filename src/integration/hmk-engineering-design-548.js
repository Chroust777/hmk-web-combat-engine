/** HMK 1.2 p.70 Engineering – Design Roll, a pure construction hand-off.
 * No dice are auto-generated, no construction work is completed by design.
 */
const ensure=(v,msg)=>{if(!v)throw Error(msg)};
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const designs={
 'Castle, large':125,'Castle, medium':70,'Castle, small':40,
 'Cottage, large':4,'Keep, large':60,'Keep, medium':25,'Keep, small':15,
 'Manorhouse, large':12,'Manorhouse, small':9,
 'Mill, large':2,'Mill, small':1,'Mine':20,
 'Siege Engine, large':4,'Siege Engine, small':2,
 'Stockade tower':6,'Townhouse, exclusive':9,'Townhouse, modest':6
};
export const ENGINEERING_DESIGN_DAYS=Object.freeze({...designs});
export function engineeringDesignCandidate(proof){
 if(proof?.type!=='secondary-mastery-value-test'||(proof.skills?.[0]||proof.skill)!=='Engineering')return null;
 const a=proof.a||proof.result;
 if(!a||!integer(a.roll,1,100)||!integer(a.sv,-200,500)||!['CF','F','S','CS'].includes(a.level))return null;
 return {actorId:proof.actorId,roll:a.roll,sv:a.sv,level:a.level,secondarySkills:proof.secondarySkills||[],page:70};
}
export function resolveEngineeringDesign({proof,originId,actorId,edifice,mathematicsML=0,designD10=[],
 randomizeTime=false,timeD3A=null,timeD3B=null,
 gmConfirmsConstructionParticipation=false,gmConfirmsNoPreviousModifiers=false}={}){
 const source=engineeringDesignCandidate(proof);
 ensure(source&&typeof originId==='string'&&originId&&source.actorId===actorId,'Design Roll vyžaduje doložený Engineering SV stejného konstruktéra');
 ensure(Object.hasOwn(designs,edifice),'HMK str. 70: zvolte konstrukci z tabulky, nikoli Cottage small / Hovel');
 ensure(gmConfirmsConstructionParticipation===true,'Konstruktér i stavitel musí být přímo zapojeni do díla');
 ensure(gmConfirmsNoPreviousModifiers===true,'GM musí potvrdit, že původní SV ještě neobsahuje příplatky výsledku Design Rollu');
 const requiredSecondary=edifice.startsWith('Mill')?'Milling':edifice==='Mine'?'Mineralogy':edifice.startsWith('Siege Engine')?'Weaponcraft':null;
 ensure(!requiredSecondary||source.secondarySkills.includes(requiredSecondary),`Konstrukce ${edifice} vyžaduje Engineering (${requiredSecondary}) SV`);
 ensure(integer(mathematicsML,0,1000),'Mathematics ML musí být doložená celá hodnota');
 const mathematicsIndex=Math.floor(mathematicsML/10);
 const stars=Math.max(0,Math.min(5,source.sv-4));
 ensure(Array.isArray(designD10)&&designD10.length===stars,`Engineering SV ${source.sv}: zadejte přesně ${stars} fyzických Design d10`);
 ensure(designD10.every(d=>integer(d,1,10)),'Doložte jednotlivé skutečné d10 (1–10)');
 ensure(typeof randomizeTime==='boolean','Neplatná volba časového rozptylu');
 ensure(randomizeTime?(integer(timeD3A,1,3)&&integer(timeD3B,1,3)):(timeD3A===null&&timeD3B===null),
 'Volitelné náhodné ±20% doby vyžaduje dva konkrétní d3, jinak nesmí být žádné');
 const successes=designD10.filter(d=>d<=mathematicsIndex).length;
 const constructionSVModifier=source.sv<=2?-1:Math.min(2,successes);
 const extraTimeReductionPercent=Math.max(0,successes-2)*10;
 const randomTimePercent=randomizeTime?10*(timeD3A-timeD3B):0;
 const baseDays=designs[edifice];
 // Keep the two independently defined changes distinct. HMK does not define
 // the order for jointly applying optional random time and bonus time reductions.
 const timeAfterMathOnly=baseDays*(1-extraTimeReductionPercent/100);
 const timeAfterRandomOnly=baseDays*(1+randomTimePercent/100);
 const combinedTimeNeedsGM=extraTimeReductionPercent>0&&randomizeTime&&randomTimePercent!==0;
 const timeIfAdded=baseDays*(1+(randomTimePercent-extraTimeReductionPercent)/100);
 return {type:'engineering-design',format:'hmk-design-p70-v1',originId,actorId,sourcePage:70,
  sourceRoll:source.roll,sourceSV:source.sv,sourceLevel:source.level,
  edifice,requiredSecondary,mathematicsML,mathematicsIndex,stars,
  physicalDesignDice:[...designD10],successes,constructionSVModifier,
  baseDays,randomizeTime,timeD3A,timeD3B,randomTimePercent,extraTimeReductionPercent,
  timeAfterMathOnly,timeAfterRandomOnly,timeIfAdded,combinedTimeNeedsGM,
  designerInvolved:true,constructionRollPending:true,
  sourceModified:false,timeAdvanced:false,buildingConstructed:false};
}
