/** Timed workshop projects with individual Masterwork rolls, HMK pp. 71–72, 78, 88, 109. */
import {PRINTED_MISSILE_WEAPONS_P109_110} from '../rules/missile-weapons-printed-p109-110.js';

import {MAKING_WEAPON_ITEMS,WEAPON_WORKSHOP_PROJECTS,weaponWorkshopTN,weaponWorkResult} from './hmk-making-weapons.js?v=94.001';
import {ARMOUR_WORKSHOP_PROJECTS,MAKING_ARMOUR_ITEMS,armourWorkResult} from './hmk-making-armour.js?v=94.012';
export {weaponWorkshopTN};

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
export const WORKSHOP_CRAFT_PROJECTS=Object.freeze({
 ...ARMOUR_WORKSHOP_PROJECTS,
 ...WEAPON_WORKSHOP_PROJECTS,
 lockcraft:{label:'Lockcraft · HMK 78',primary:'Lockcraft'},
 fletching:{label:'Fletching · HMK 71–72',primary:'Fletching'},
 slingcraft:{label:'Praky · Hideworking · HMK 72',primary:'Hideworking'},
 missileMetalcraft:{label:'Střely a napínáky · Metalcraft · HMK 72',primary:'Metalcraft'}
});
export const isWorkshopCraft=kind=>Object.hasOwn(WORKSHOP_CRAFT_PROJECTS,kind);
Object.assign(stock,MAKING_ARMOUR_ITEMS,MAKING_WEAPON_ITEMS,{
 handSling:{kind:'slingcraft',name:'Prak',costD:2,hours:10,wq:9,secondary:[]},
 staffSling:{kind:'slingcraft',name:'Tyčový prak',costD:4,hours:20,wq:9,secondary:['Woodworking']},
 leadBullets:{kind:'missileMetalcraft',name:'Olověné střely do praku (12)',costD:4,hours:10,projectiles:true,secondary:[]},
 beltClaw:{kind:'missileMetalcraft',name:'Napínák Belt & Claw',costD:3,hours:10,pull:3,secondary:[]},
 crossbowLever:{kind:'missileMetalcraft',name:'Napínák Lever',costD:6,hours:40,pull:5,rareTransfer:true,secondary:[]},
 crossbowWindlass:{kind:'missileMetalcraft',name:'Napínák Windlass',costD:15,hours:90,pull:10,kuzhan:true,secondary:[]}
});
const lockCosts=[2,3,4,6,12,24,36,60,120];
const lockHours=[50,75,100,150,240,400,450,600,1000];
for(const [index,costD] of lockCosts.entries()){
 const complexity=index+1;
 stock['lock'+complexity]={kind:'lockcraft',name:'Zámek či mechanismus · Complexity '+complexity,
  costD,hours:lockHours[index],complexity,secondary:['Metalcraft']};
}
export function workshopCraftItem(kind,scope){
 if(!Object.hasOwn(stock,scope))return null;
 const item=stock[scope];
 return (item.kind??'fletching')===kind?item:null;
}
export const FLETCHING_ITEMS=Object.freeze(stock);
const fieldValid=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
export function fletchingPlan(scope,workshop,providerId='',hartbow=false,toolQuality=0,helperIds=[]){
 const item=Object.hasOwn(stock,scope)?stock[scope]:null;
 if(!item||!fieldValid(workshop,1,5)||typeof providerId!=='string'||providerId&&(!item.projectiles||item.kind)||
  typeof hartbow!=='boolean'||hartbow&&!item.bow)throw Error('Vyberte výrobek, dílnu 1–5 a odpovídající způsob výroby.');
 if((item.meleeWeapon||item.armour)&&(!fieldValid(toolQuality,0,3)||!Array.isArray(helperIds)||helperIds.length>2||new Set(helperIds).size!==helperIds.length||helperIds.some(id=>typeof id!=='string'||!id)))
  throw Error('Vyberte kvalitu nástrojů 0–3 a nejvýše dva různé pomocníky.');
 return {workshop,providerId,hartbow,...(item.meleeWeapon||item.armour?{toolQuality,helperIds:[...helperIds]}:{}),costD:item.costD*(providerId?2:1),
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
 const item=stock[scope],max=item.armour?item.max:item.complexity||item.pull?5:item.projectiles?2:item.wq-8;
 if(item.meleeWeapon||item.armour)return {flaw:sv<=2,count:stars-timeStars,max,faces:10,dice:stars-timeStars,
  factor:(100+(level==='CF'?50:0)-10*timeStars)/100};
 const faces=sv<=2?(item.complexity?6:2):10;
 return {flaw:sv<=2,count:stars-timeStars,max,faces,dice:sv<=2?(item.complexity?2:1):stars-timeStars,factor:(100+(level==='CF'?50:0)-10*timeStars)/100};
}
export function fletchingOutcome(project,proof,timeStars,rolls){
 const {scope,startMinute,fletching996:plan}=project;
 const need=fletchingNeeds(scope,proof,timeStars);
 const item=stock[scope];
 if(!Array.isArray(rolls)||(item.armour?rolls.length>need.dice:rolls.length!==need.dice)||
  !rolls.every(n=>fieldValid(n,1,need.faces)))throw Error('Potvrďte všechny předepsané kostky zvlášť.');
 const successes=need.flaw?0:rolls.filter(n=>n<=plan.workshop).length;
 const dueMinute=fletchingDue(scope,startMinute,plan,need.factor);
 if(item.armour)return armourWorkResult(item,proof,timeStars,rolls,dueMinute,weaponWorkshopTN(plan));
 if(item.meleeWeapon)return weaponWorkResult(item,plan,proof,timeStars,rolls,dueMinute);
 if(item.complexity){
  const achieved=need.flaw?null:Math.min(item.complexity,4+successes);
  const lostDays=need.flaw?rolls[0]+rolls[1]:0;
  return {timeStars,rolls:[...rolls],successes,requestedComplexity:item.complexity,
   achievedComplexity:achieved,lostDays,materialCostD:plan.costD,salePriceD:achieved===null?null:6*lockCosts[achieved-1],
   dueMinute:dueMinute+lostDays*1440};
 }
 const applied=Math.min(need.max,successes),mod=Math.floor(applied/2);
 const flaw=need.flaw?rolls[0]*(proof.a.sv<=0?2:1):0;
 if(item.pull)return {timeStars,rolls:[...rolls],successes,applied,
  flaw,drawBonusPct:mod*10,pull:item.pull,valueMultiplier:applied+1,
  dueMinute};
 return {timeStars,rolls:[...rolls],successes,applied,
  qualityDelta:Math.ceil(applied/2)-flaw,impactDelta:item.projectiles?mod-flaw:null,
  rangeDeltaFt:item.projectiles?null:(mod-flaw)*30,
  valueMultiplier:applied+1,dueMinute,
  halfDraw:!!(plan.hartbow&&proof.secondaryRollResult?.success)};
}
export function validFletchingProof(project,proof){
 const item=stock[project.scope],plan=project.fletching996;
 const sr=proof?.secondaryRollResult;
 if(project.faerieLinked&&sr)return false;
 if(item.meleeWeapon){
  const helpers=proof?.weaponWorkHelpers??[];
  if(!Array.isArray(helpers)||helpers.some(helper=>!helper||!fieldValid(helper.ml,1,1000))||
   JSON.stringify(helpers.map(h=>h.actorId))!==JSON.stringify(plan.helperIds)||
   (sr&&!(item.name==='Longknife'&&sr.routineId==='weaponcraft-faerie')))return false;
  const bonus=Math.min(10,helpers.reduce((sum,h)=>sum+(h.ml*2>=proof.a.ml?Math.floor(h.ml/10):0),0));
  if((proof.a.assistance??0)!==bonus)return false;
 }
 return JSON.stringify(proof?.secondarySkills)===JSON.stringify(item.secondary)&&
  (proof.fletchingSecondaryProxy?.actorId??'')===plan.providerId&&
  (plan.hartbow?proof.secondaryRollResult?.routineId==='fletching-hartbow':item.meleeWeapon||!proof.secondaryRollResult);
}
