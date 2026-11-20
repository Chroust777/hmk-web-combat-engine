/** Shipwright, HMK 1.2 pp. 60–62, 84, 123. */
import {constructionCrew} from './hmk-construction.js?v=94.000';
import {effectiveMasteryLevel,secondaryModifier,successLevel,successValue} from '../rules/tests.js';

const carvel='carvel',clinker='clinker';
export const SHIPWRIGHT_VESSELS=Object.freeze(Object.fromEntries([
 ['dak','Dak',48,110,68,[clinker]],['karune','Karúnè',60,200,120,[]],
 ['karvik','Kárvik',54,100,60,[carvel]],['laru','Larú',60,125,75,[carvel]],
 ['larumar','Larúmar',90,340,203,[carvel]],['nivik','Nívik',36,45,27,[clinker]],
 ['pinda','Pínda',15,5,3,[carvel,clinker]],['raem','Raém',48,80,48,[carvel]],
 ['talbar','Tálbar',24,15,10,[carvel,clinker]],['vaserskab','Vasérskåb',60,150,90,[clinker]]
].map(([id,name,length,workerMonths,costL,styles])=>[id,Object.freeze({name,length,workerMonths,costD:costL*240,styles:Object.freeze(styles)})])));
export const SHIPWRIGHT_REGIONS=Object.freeze({
 'Ázeryàn':carvel,'Býria':carvel,'Chogôro & Mafán':carvel,'Dalkésh':carvel,'Hèpekéria':carvel,'Karéjia':carvel,'Ûmélria':carvel,
 'Emélrenè':clinker,'Hârbáal':clinker,'Hârn':clinker,'Ivínia':clinker,'Shôrkýnè':clinker,
 'Palíthanè':'both','Tríerzòn':'both','Chelemby':'shipyard','Jiný region':'other'
});
const minutesPerWorkMonth=24*1440;
const ensure=(test,message)=>{if(!test)throw Error(message)};
const int=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const styles=[carvel,clinker];

export function shipwrightHomeStyle(region){
 return Object.hasOwn(SHIPWRIGHT_REGIONS,region)?SHIPWRIGHT_REGIONS[region]:null;
}
export function shipwrightPlan({vessel,style,region,homeStyle,knowsKarune,masterML,groups,startMinute}){
 const item=Object.hasOwn(SHIPWRIGHT_VESSELS,vessel)?SHIPWRIGHT_VESSELS[vessel]:null;
 const tradition=shipwrightHomeStyle(region);
 ensure(item&&tradition&&int(masterML,1,1000)&&int(startMinute,0),'Vyberte plavidlo, doložený region a mistra s Shipwright ML.');
 ensure(tradition==='shipyard'?homeStyle===null:(styles.includes(homeStyle)&&(!styles.includes(tradition)||homeStyle===tradition)),
  'Domácí styl neodpovídá doloženému regionu mistra.');
 const karune=vessel==='karune',nativeKarune=tradition==='both'||tradition==='shipyard';
 ensure(karune?(style===null&&typeof knowsKarune==='boolean'&&(nativeKarune||knowsKarune)):
  item.styles.includes(style)&&knowsKarune===false,
  'Zvolte styl povolený pro trup. U Karúnè mimo doložená střediska potvrďte znalost tohoto návrhu.');
 const {workerCount,averageML}=constructionCrew(groups);
 const stylePenalty=karune||tradition==='shipyard'||style===homeStyle?0:tradition==='both'?-20:-40;
 // The style rule modifies ML itself, before the Shipwright Index is read.
 const testedML=Math.max(0,masterML+stylePenalty);
 const baseWorkMinutes=Math.ceil(item.workerMonths*minutesPerWorkMonth/workerCount);
 return {vessel,style,region,homeStyle,knowsKarune,masterML,groups:groups.map(({count,ml})=>({count,ml})),startMinute,
  workerCount,woodworkingML:averageML,stylePenalty,testedML,baseWorkMinutes,baseDueMinute:startMinute+baseWorkMinutes,costD:item.costD};
}

export function resolveShipwrightRoll(plan,roll){
 const secondaryEML=secondaryModifier(plan.woodworkingML);
 const eml=effectiveMasteryLevel(plan.testedML+secondaryEML);
 const sl=successLevel(roll,eml);
 return {roll,secondaryEML,eml,level:['CF','F','S','CS'][sl],sv:successValue({ml:plan.testedML,sl})};
}

export function resolveShipwrightFactors(plan,{timePct,costPct,reason}){
 ensure(Number.isFinite(timePct)&&timePct>0&&Number.isFinite(costPct)&&costPct>=0,
  'Zadejte kladné procento doby a nezáporné procento ceny.');
 ensure(typeof reason==='string'&&reason.trim().length>0&&reason.trim().length<=240,'Zapište pravidlo nebo rozhodnutí GM k násobitelům.');
 const base=SHIPWRIGHT_VESSELS[plan.vessel].workerMonths*minutesPerWorkMonth;
 const workMinutes=Math.ceil(base*timePct/(100*plan.workerCount));
 const costD=Math.round(plan.costD*costPct/100),dueMinute=plan.startMinute+workMinutes;
 ensure(int(workMinutes,1)&&int(costD,0)&&int(dueMinute,0),'Upravená doba či cena je mimo podporovaný rozsah.');
 return {timePct,costPct,reason:reason.trim(),workMinutes,costD,dueMinute};
}

export function validateShipwright(journal,characters){
 const starts=new Map(),rolls=new Map(),factors=new Map(),completed=new Set();
 for(const row of journal){
  const start=row.calendarShipwrightStart,roll=row.calendarShipwrightRoll,terms=row.calendarShipwrightFactors,done=row.calendarShipwrightComplete;
  if(!start&&!roll&&!terms&&!done)continue;
  ensure([start,roll,terms,done].filter(Boolean).length===1&&int(row.campaignMinute,0)&&
   typeof row.calendarCampaignId==='string'&&row.calendarCampaignId&&characters.some(person=>person.id===row.characterId),
   'Neplatný doklad Shipwright.');
  if(start){
   ensure(start.startMinute===row.campaignMinute&&same(start,shipwrightPlan(start))&&!starts.has(row.id),'Neplatné zahájení stavby plavidla.');
   starts.set(row.id,row);
   continue;
  }
  const origin=starts.get((roll??terms??done).startId);
  ensure(origin&&origin.characterId===row.characterId&&origin.calendarCampaignId===row.calendarCampaignId&&
   row.campaignMinute>=origin.campaignMinute,'Doklad musí odkazovat na vlastní projekt ve stejné kampani.');
  const plan=origin.calendarShipwrightStart,originalRoll=rolls.get(origin.id),originalFactors=factors.get(origin.id);
  if(roll){
   ensure(!originalRoll&&same(roll.result,resolveShipwrightRoll(plan,roll.result?.roll)),'Shipwright hod je duplicitní nebo nesouhlasí s dovednostmi a stylem.');
   rolls.set(origin.id,row);
  }else if(terms){
   ensure(originalRoll?.id===terms.rollId&&row.campaignMinute>=originalRoll.campaignMinute&&!originalFactors&&
    same(terms.result,resolveShipwrightFactors(plan,terms.result)),'Násobitele musí navázat na původní Shipwright Roll.');
   factors.set(origin.id,row);
  }else{
   ensure(originalFactors?.id===done.factorsId&&!completed.has(origin.id)&&
    row.campaignMinute>=Math.max(originalFactors.campaignMinute,originalFactors.calendarShipwrightFactors.result.dueMinute),
    'Dokončení plavidla vyžaduje uložené násobitele a dosažený termín.');
   completed.add(origin.id);
  }
 }
}
export function assertShipwrightAppendOnly(previous,next){
 const current=new Map(next.map(row=>[row.id,row]));
 for(const row of previous)if(row.calendarShipwrightStart||row.calendarShipwrightRoll||row.calendarShipwrightFactors||row.calendarShipwrightComplete)
  ensure(same(row,current.get(row.id)),'Potvrzený doklad Shipwright nelze změnit ani smazat.');
}
