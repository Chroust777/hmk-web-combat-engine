/** Fletching project evidence from HMK pp. 71–72, 109. */
import {PRINTED_MISSILE_WEAPONS_P109_110} from '../rules/missile-weapons-printed-p109-110.js';

const stock = Object.fromEntries([
 ['lightArrows','Lehké šípy (12)',2,20],['heavyArrows','Těžké šípy (12)',3,25],
 ['lightQuarrels','Lehké střely do kuše (12)',3,20],['heavyQuarrels','Těžké střely do kuše (12)',3,25],
].map(([key,name,costD,hours])=>[key,{name,costD,hours,projectiles:true,secondary:['Woodworking','Metalcraft']}]));
// The workshop table lists wooden crossbows at 5/6/7 lb, while the
// possessions table lists the corresponding light/medium/heavy rows at 3/4/5 lb.
const woodenCrossbowCraftWeight={'03':'7','02':'6','01':'5'};
const tables = {
 compositeBow:{2:[24,10],3:[30,11],4:[36,12]},
 longbow:{2:[20,30],3:[24,50],4:[28,90]},
 compositeCrossbow:{7:[36,280],9:[36,280]},
 woodenCrossbow:{3:[12,90],4:[15,130],5:[18,170]},
 kuzhanSteelbow:{12:[54,500]}
};
for(const item of PRINTED_MISSILE_WEAPONS_P109_110){
 const [, , ,family,variant]=item.id.split(':');
 const recipe=tables[family]?.[item.properties.weightLb];
 if(!recipe)continue;
 const [costD,hours]=recipe;
 const weightLabel=family==='woodenCrossbow'?woodenCrossbowCraftWeight[variant]+' lb v tabulce výroby':item.properties.weightLb+' lb';
 stock[item.id]={name:item.name+' · '+weightLabel,costD,hours,
  months:family==='compositeBow'?hours:0,
  bow:['compositeBow','longbow'].includes(family),kuzhan:family==='kuzhanSteelbow',
  wq:item.properties.quality,draw:item.properties.draw,rangeFt:item.properties.baseRangeFt,priceD:item.properties.pricePence,
  secondary:family==='kuzhanSteelbow'?['Metalcraft']:['Woodworking',family==='compositeBow'?'Hideworking':'Timbercraft']};
}
export const MISSILE_CRAFT_PROJECTS=Object.freeze({
 fletching:{label:'Fletching · HMK 71–72',primary:'Fletching'},
 slingcraft:{label:'Praky · Hideworking · HMK 72',primary:'Hideworking'},
 missileMetalcraft:{label:'Střely a napínáky · Metalcraft · HMK 72',primary:'Metalcraft'}
});
export const isMissileCraft=kind=>Object.hasOwn(MISSILE_CRAFT_PROJECTS,kind);
Object.assign(stock,{
 handSling:{kind:'slingcraft',name:'Prak',costD:2,hours:10,wq:9,secondary:[]},
 staffSling:{kind:'slingcraft',name:'Tyčový prak',costD:4,hours:20,wq:9,secondary:['Woodworking']},
 leadBullets:{kind:'missileMetalcraft',name:'Olověné střely do praku (12)',costD:4,hours:10,projectiles:true,secondary:[]},
 beltClaw:{kind:'missileMetalcraft',name:'Napínák Belt & Claw',costD:3,hours:10,pull:3,secondary:[]},
 crossbowLever:{kind:'missileMetalcraft',name:'Napínák Lever',costD:6,hours:40,pull:5,rareTransfer:true,secondary:[]},
 crossbowWindlass:{kind:'missileMetalcraft',name:'Napínák Windlass',costD:15,hours:90,pull:10,kuzhan:true,secondary:[]}
});
export function missileCraftItem(kind,scope){
 if(!Object.hasOwn(stock,scope))return null;
 const item=stock[scope];
 return (item.kind??'fletching')===kind?item:null;
}
export const FLETCHING_ITEMS=Object.freeze(stock);
const fieldValid=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
export function fletchingPlan(scope,workshop,providerId='',hartbow=false){
 const item=Object.hasOwn(stock,scope)?stock[scope]:null;
 if(!item||!fieldValid(workshop,1,5)||typeof providerId!=='string'||providerId&&(!item.projectiles||item.kind)||
  typeof hartbow!=='boolean'||hartbow&&!item.bow)throw Error('Vyberte výrobek, dílnu 1–5 a odpovídající způsob výroby.');
 return {workshop,providerId,hartbow,costD:item.costD*(providerId?2:1),
  workMinutes:(item.months?item.months*30*600:item.hours*60)/(providerId?2:1)};
}
export function fletchingDue(scope,start,plan,factor=1){
 const months=stock[scope].months;
 if(months)return start+Math.ceil(months*30*1440*factor);
 const work=Math.ceil(plan.workMinutes*factor);
 const fullDays=Math.floor((work-1)/600);
 return start+fullDays*1440+work-fullDays*600;
}
export function fletchingNeeds(scope,proof,timeStars){
 const sv=proof?.a?.sv,level=proof?.a?.level;
 if(!Number.isSafeInteger(sv)||!['CF','F','S','CS'].includes(level))throw Error('Chybí původní Success Value výroby.');
 const stars=Math.max(0,Math.min(5,sv-4));
 if(!fieldValid(timeStars,0,Math.min(3,stars)))throw Error('Na čas lze použít nejvýše tři získané hvězdy.');
 const max=stock[scope].pull?5:stock[scope].projectiles?2:stock[scope].wq-8;
 return {flaw:sv<=2,count:stars-timeStars,max,factor:(100+(level==='CF'?50:0)-10*timeStars)/100};
}
export function fletchingOutcome(project,proof,timeStars,rolls){
 const {scope,startMinute,fletching996:plan}=project;
 const need=fletchingNeeds(scope,proof,timeStars);
 if(!Array.isArray(rolls)||rolls.length!==(need.flaw?1:need.count)||
  !rolls.every(n=>fieldValid(n,1,need.flaw?2:10)))throw Error('Potvrďte všechny předepsané kostky zvlášť.');
 const item=stock[scope],successes=need.flaw?0:rolls.filter(n=>n<=plan.workshop).length;
 const applied=Math.min(need.max,successes),mod=Math.floor(applied/2);
 const flaw=need.flaw?rolls[0]*(proof.a.sv<=0?2:1):0;
 if(item.pull)return {timeStars,rolls:[...rolls],successes,applied,
  flaw,drawBonusPct:mod*10,pull:item.pull,valueMultiplier:applied+1,
  dueMinute:fletchingDue(scope,startMinute,plan,need.factor)};
 return {timeStars,rolls:[...rolls],successes,applied,
  qualityDelta:Math.ceil(applied/2)-flaw,impactDelta:item.projectiles?mod-flaw:null,
  rangeDeltaFt:item.projectiles?null:(mod-flaw)*30,
  valueMultiplier:applied+1,dueMinute:fletchingDue(scope,startMinute,plan,need.factor),
  halfDraw:!!(plan.hartbow&&proof.secondaryRollResult?.success)};
}
export function validFletchingProof(project,proof){
 const item=stock[project.scope],plan=project.fletching996;
 return JSON.stringify(proof?.secondarySkills)===JSON.stringify(item.secondary)&&
  (proof.fletchingSecondaryProxy?.actorId??'')===plan.providerId&&
  (plan.hartbow?proof.secondaryRollResult?.routineId==='fletching-hartbow':!proof.secondaryRollResult);
}
