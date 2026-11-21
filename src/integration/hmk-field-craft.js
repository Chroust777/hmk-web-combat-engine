import {effectiveMasteryLevel, SL, successLevel, successValue} from '../rules/tests.js';

export const PERFUMERY_GOODS=Object.freeze({
 Incense:[16,8], 'Oil, cinnamon':[1,60], 'Oil, myrtle':[1,25], 'Oil, rose':[1,20],
 'Perfume, cheap':[1,12], 'Perfume, typical':[1,48], 'Perfume, nice':[1,120], Soap:[1,2]
});
export const AGRICULTURE_ACRES=Object.freeze({
 Serf:0,Cottar:5,'Half-villein':15,Villein:30,'Beadle / Woodward':15,Reeve:30,Freeholder:65,Yeoman:80
});
export const WEATHER_SKILLS=Object.freeze(['Agriculture','Piloting','Seamanship','Survival']);
export const WEATHER_DETAIL=Object.freeze({CF:'neznámé',F:'neúplné',S:'obecné',CS:'konkrétní'});
export const EMBALMING_CLIMATES=Object.freeze({
 'Subpolar':[7,10,45,360,1440], 'Cool Temperate':[6,9,35,180,1080], 'Warm Temperate':[5,7,30,150,720],
 Subtropical:[4,6,20,120,540], 'Dry Tropical':[3,4,15,90,360], 'Wet Tropical':[2,3,15,90,360]
});
const whole=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const check=(condition,message)=>{if(!condition)throw Error(message);};
export function fieldCraftRoll({ml,penalty,d100,origin}){
 check(whole(ml,1,1000)&&whole(penalty,0,300000)&&whole(d100,1,100)&&
  ['manual','cryptographic-software-die'].includes(origin),'Je potřeba způsobilá dovednost a platný d100.');
 const eml=effectiveMasteryLevel(ml-penalty),level=successLevel(d100,eml),sv=successValue({ml,sl:level});
 return {ml,penalty,d100,origin,eml,sl:Object.keys(SL).find(name=>SL[name]===level),sv,stars:Math.min(5,Math.max(0,sv-4))};
}

export function perfumeryBatch(product,quantity){
 check(Object.hasOwn(PERFUMERY_GOODS,product)&&whole(quantity,1,10000),'Zvolte výrobek a počet celých dávek.');
 const [ounces,retail]=PERFUMERY_GOODS[product];
 return {product,quantity,ounces:ounces*quantity,listPence:retail*quantity,costFifths:4*retail*quantity};
}
export function perfumeryMarket(roll,market){
 check(whole(market,0,100),'MKT musí být celé číslo, 0 znamená obec bez MKT.');
 const result=fieldCraftRoll(roll);
 return {...result,market,limitHalfPence:result.stars*(market?2*market**2:1)};
}

export function weatherForecast({skill,roll,extension=[],temperature='',precipitation='',wind=''}){
 check(WEATHER_SKILLS.includes(skill),'Tuto dovednost nelze použít jako Weather Lore.');
 const result=fieldCraftRoll(roll);
 const critical=result.sl==='CS';
 check(Array.isArray(extension)&&(critical?extension.length===2&&extension.every(die=>whole(die,1,3)):!extension.length),
  'Při CS zadejte dva samostatné hody d3. Jinak se nehází.');
 const readings={temperature:temperature.trim(),precipitation:precipitation.trim(),wind:wind.trim()};
 const count=Object.values(readings).filter(Boolean).length;
 check(Object.values(readings).every(value=>value.length<=180)&&
  (result.sl==='CF'?count===0:result.sl==='F'?count<3:count===3),
  'CF neposkytuje údaje, F je neúplné a S/CS zahrnuje všechny tři vlastnosti.');
 return {skill,...result,extension:[...extension],readings,watches:critical?extension[0]+extension[1]:1,detail:WEATHER_DETAIL[result.sl]};
}
export function regionalWind({forceD100,directionD12,duration}){
 check(whole(forceD100,1,100)&&whole(directionD12,1,12)&&Array.isArray(duration)&&duration.length===3&&
  duration.every(die=>whole(die,1,4)),'Vítr vyžaduje d100, d12 a tři d4.');
 return {forceD100,directionD12,duration:[...duration],hours:duration.reduce((total,roll)=>total+roll,0),
  force:[15,55,84,99,100].findIndex(max=>forceD100<=max),
  direction:['N','N','NE','SE','SE','S','S','SW','SW','SW','NW','NW'][directionD12-1]};
}

export function embalmingState({climate,ageDays,shadow,sv}){
 check(Object.hasOwn(EMBALMING_CLIMATES,climate)&&Number.isFinite(ageDays)&&ageDays>=0&&
  whole(shadow,0,100)&&whole(sv,-2,101),'Zvolte podnebí a doložte stáří, Shadow Strength a SV.');
 const phases=['Minimal','Slight','Partial','Most','Whole'];
 const natural=EMBALMING_CLIMATES[climate];
 const next=natural.findIndex(days=>ageDays<days);
 const shadowCanExtend=next<0?false:next<=3;
 const factor=shadowCanExtend?shadow+1:1;
 return {climate,ageDays,shadow,sv,thresholds:natural.map((days,index)=>({
  phase:phases[index],days:Math.max(0,days*(index<3?factor:1)+(factor===1||index<3?sv:0))
 }))};
}
