/** HMK 70, 78, 91: construction plans, Construction Rolls and calendar receipts. */
import {effectiveMasteryLevel,secondaryModifier,successLevel,successValue} from '../rules/tests.js';
import {resolveEngineeringDesign} from './hmk-engineering-design-548.js';

const masonry=[
 ['Castle, large',15700,9400],['Castle, medium',4700,2800],['Castle, small',1600,1000],
 ['Keep, large',3500,2100],['Keep, medium',700,410],['Keep, small',300,175],
 ['Manorhouse, large',147,88],['Manorhouse, small',83,50],
 ['Mill, large',14,8],['Mill, small',7,4],['Townhouse, exclusive',83,50],
 ['Wall, stone',8,5,{label:'Wall, stone (10′ × 11′ × 5′)',design:null,secondary:null}]
];
const wood=[
 ['Cottage, small',10,6,{design:null}],['Cottage, large',20,12],
 ['Fence',1,1,{label:'Fence (4″ × 4′ × 120′)',design:null}],['Hovel',5,3,{design:null}],
 ['Palisade',1,1,{label:'Palisade (1′ × 10′ × 24′)',design:null}],
 ['Siege Weapon, large',6,12,{design:'Siege Engine, large'}],
 ['Siege Weapon, small',3,5,{design:'Siege Engine, small'}],
 ['Stockade tower',32,20],['Townhouse, modest',33,20,{secondary:'Masonry'}]
];
export const CONSTRUCTION_STRUCTURES=Object.freeze(Object.fromEntries(
 [[masonry,'Masonry','Woodworking'],[wood,'Woodworking',null]].flatMap(([rows,primary,secondary])=>
 rows.map(([id,workerMonths,costL,overrides])=>[id,Object.freeze({
  label:id,workerMonths,costD:costL*240,primary,secondary,design:id,...overrides
 })]))
));
const ensure=(test,message)=>{if(!test)throw Error(message)};
const integer=(n,lo,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const minutesPerDay=1440;
const workDaysPerMonth=24;
const workDaysPerYear=9*workDaysPerMonth;
const yearDays=360;

// Campaign dates use a start-relative schedule: 216 workdays, then 144
// nonworking days per year. The work-month figures remain independent of dates.
function constructionMinute(start,workMinutes){
 const yearWork=workDaysPerYear*minutesPerDay;
 const completedYears=Math.floor((workMinutes-1)/yearWork);
 return start+workMinutes+completedYears*(yearDays-workDaysPerYear)*minutesPerDay;
}
export function formatConstructionWork(workMinutes){
 const monthMinutes=workDaysPerMonth*minutesPerDay;
 const months=Math.floor(workMinutes/monthMinutes), remainder=workMinutes%monthMinutes;
 const days=Math.floor(remainder/minutesPerDay), minutes=remainder%minutesPerDay;
 return [months&&`${months} prac. měs.`,days&&`${days} prac. dnů`,minutes&&`${minutes} min`].filter(Boolean).join(' ');
}
export function constructionPlan({structure,groups,master,designId,startMinute}){
 const item=Object.hasOwn(CONSTRUCTION_STRUCTURES,structure)?CONSTRUCTION_STRUCTURES[structure]:null;
 ensure(item&&integer(startMinute,0),'Vyberte typ stavby a platný začátek.');
 ensure(Array.isArray(groups)&&groups.length>0&&groups.every(g=>integer(g.count,1)&&integer(g.ml,1,1000)),
  'Každá skupina potřebuje skutečný počet dělníků a ML 1–1000.');
 const workerCount=groups.reduce((sum,g)=>sum+g.count,0),totalML=groups.reduce((sum,g)=>sum+g.count*g.ml,0);
 ensure(integer(workerCount,1)&&integer(totalML,1),'Příliš vysoký počet dělníků.');
 ensure(item.secondary?master&&typeof master.id==='string'&&master.id&&integer(master.ml,1,1000):master===null,
  item.secondary?`Stavba vyžaduje jednoho mistra s ${item.secondary}.`:'Tato stavba nemá sekundární dovednost.');
 ensure(item.design?typeof designId==='string'&&designId.length:designId===null,'Tento typ stavby vyžaduje odpovídající dokončený návrh.');
 const baseNumerator=item.workerMonths*workDaysPerMonth*minutesPerDay;
 const baseWorkMinutes=Math.ceil(baseNumerator/workerCount);
 const baseML=Math.floor(totalML/workerCount);
 const halfWorkMinutes=Math.ceil(baseNumerator/(2*workerCount));
 return {structure,groups:groups.map(({count,ml})=>({count,ml})),master:master&&{id:master.id,ml:master.ml},designId,startMinute,
  workerCount,baseML,baseWorkMinutes,halfwayMinute:constructionMinute(startMinute,halfWorkMinutes),
  baseDueMinute:constructionMinute(startMinute,baseWorkMinutes)};
}
export function constructionDesignModifier(plan,rows,sourceRow,campaignId){
 const expected=CONSTRUCTION_STRUCTURES[plan.structure].design;
 if(!expected)return 0;
 const design=rows.get(plan.designId),proof=design?.skillTestProof,done=design?.calendarSkillProjectComplete591;
 const original=rows.get(done?.sourceId),start=rows.get(done?.startId),startProof=start?.calendarSkillProjectStart591;
 ensure(proof?.type==='engineering-design'&&proof.edifice===expected&&done?.kind==='engineering'&&
  design.calendarCampaignId===campaignId&&original?.calendarCampaignId===campaignId&&start?.calendarCampaignId===campaignId&&
  design.characterId===proof.actorId&&original.characterId===proof.actorId&&startProof?.scope===expected&&original.calendarSkillProjectSV591?.startId===start.id&&
  integer(design.campaignMinute,done.dueMinute,plan.startMinute)&&proof.originId===original.id&&
  sourceRow?.characterId,'K této stavbě patří dokončený Engineering Design stejného typu ze stejné kampaně.');
 const verified=resolveEngineeringDesign({proof:original.skillTestProof,originId:original.id,actorId:proof.actorId,
  edifice:expected,mathematicsML:proof.mathematicsML,designD10:proof.physicalDesignDice,
  gmConfirmsConstructionParticipation:proof.designerInvolved,gmConfirmsNoPreviousModifiers:true});
 ensure(proof.constructionSVModifier===verified.constructionSVModifier&&done.workMinutes===Math.ceil(verified.timeAfterMathOnly*minutesPerDay)&&
  done.dueMinute===startProof.startMinute+done.workMinutes,'Modifikátor návrhu nebo jeho dokončení nesouhlasí s původním Design Rollem.');
 return verified.constructionSVModifier;
}
export function resolveConstruction(plan,roll,designModifier){
 ensure(integer(designModifier,-1,2),'Chybí doložený modifikátor Engineering Design.');
 const item=CONSTRUCTION_STRUCTURES[plan.structure];
 const secondaryEML=plan.master?secondaryModifier(plan.master.ml):0;
 const eml=effectiveMasteryLevel(plan.baseML+secondaryEML);
 const sl=successLevel(roll,eml),level=['CF','F','S','CS'][sl];
 const baseSV=successValue({ml:plan.baseML,sl}),sv=baseSV+designModifier;
 const [timePct,costPct]=sv<=2?[140,130]:sv<=4?[130,120]:sv===5?[120,110]:
  sv===6?[110,100]:sv===7?[100,100]:sv===8?[90,100]:[80,90];
 const workMinutes=Math.ceil(item.workerMonths*workDaysPerMonth*minutesPerDay*timePct/(100*plan.workerCount));
 return {roll,secondaryEML,eml,level,baseSV,designModifier,sv,timePct,costPct,workMinutes,
  costD:item.costD*costPct/100,dueMinute:constructionMinute(plan.startMinute,workMinutes)};
}
const planFor=row=>row?.calendarConstructionStart;
export function validateConstruction(journal,characters){
 const rows=new Map(),rolls=new Map(),complete=new Set();
 for(const row of journal){
  const p=planFor(row),test=row.calendarConstructionRoll,done=row.calendarConstructionComplete;
  if(p||test||done){
   ensure(integer(row.campaignMinute,0)&&typeof row.calendarCampaignId==='string'&&row.calendarCampaignId.length&&
    characters.some(person=>person.id===row.characterId)&&[p,test,done].filter(Boolean).length===1,'Neplatný doklad Construction.');
   if(p){
    ensure(p.startMinute===row.campaignMinute&&identical(p,constructionPlan(p)),'Neplatné údaje o zahájení stavby.');
    ensure(!p.master||characters.some(person=>person.id===p.master.id),'Nedoložená postava mistra.');
    constructionDesignModifier(p,rows,row,row.calendarCampaignId);
   }else{
    const origin=rows.get((test??done).startId),plan=planFor(origin);
    ensure(plan&&origin.characterId===row.characterId&&origin.calendarCampaignId===row.calendarCampaignId,
     'Výsledek musí odkazovat na vlastní zahájenou stavbu ve stejné kampani.');
    if(test){
     const modifier=constructionDesignModifier(plan,rows,origin,row.calendarCampaignId);
     ensure(!rolls.has(origin.id)&&row.campaignMinute>=plan.halfwayMinute&&
      identical(test.result,resolveConstruction(plan,test.result?.roll,modifier)),
      'Construction Roll chybí, je duplicitní nebo neodpovídá polovině stavby a pravidlům.');
     rolls.set(origin.id,row);
    }else{
     const roll=rolls.get(origin.id);
     ensure(roll?.id===done.rollId&&!complete.has(origin.id)&&
      row.campaignMinute>=Math.max(roll.campaignMinute,roll.calendarConstructionRoll.result.dueMinute),
      'Dokončení stavby vyžaduje původní Construction Roll a dosažený termín.');
     complete.add(origin.id);
    }
   }
  }
  rows.set(row.id,row);
 }
}
export function assertConstructionAppendOnly(previous,next){
 const current=new Map(next.map(row=>[row.id,row]));
 for(const row of previous)if(planFor(row)||row.calendarConstructionRoll||row.calendarConstructionComplete){
  ensure(identical(row,current.get(row.id)),'Stavební doklad po potvrzení nelze změnit ani smazat.');
 }
}
