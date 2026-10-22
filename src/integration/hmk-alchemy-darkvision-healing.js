/** HMK v1.2 pp.185,270–271: Darkvision Critical Failure light sensitivity.
 * The existing Exposure Healing table supplies recovery SL effects. The GM
 * campaign clock is the only clock. Proofs are append-only journal events;
 * historical v93.421 imbibing records are never rewritten.
 */
import {healingBase} from '../rules/healing.js';
import {exposureHealing} from '../rules/ailments.js';
import {successLevel,SL} from '../rules/tests.js';
export const DARKVISION_HEAL_FORMAT='hmk-darkvision-ill-healing-v1';
const DAY=1440;
const req=(v,msg)=>{if(!v)throw Error(msg)};
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const originOK=x=>['manual','cryptographic-software-die'].includes(x);
const useRow=(journal,campaignId,useId)=>{
 const use=journal.find(j=>j.id===useId&&j.calendarCampaignId===campaignId&&j.calendarAlchemyImbibing);
 req(use?.calendarAlchemyImbibing?.elixirName==='Darkvision'&&use.calendarAlchemyImbibing.illEffect?.kind==='vision-light-penalty'&&
  use.calendarAlchemyImbibing.sl==='CF'&&use.calendarAlchemyImbibing.finalAS>0,
  'Darkvision Healing: chybí skutečně účinný CF Imbibing a citlivost na světlo');
 return use;
};
export function darkvisionHealingState(journal=[],campaignId,useId,minute=1e9){
 req(int(minute,0,1e9),'Darkvision Healing: neplatná minuta');
 const use=useRow(journal,campaignId,useId),p=use.calendarAlchemyImbibing;
 const rows=journal.filter(j=>j.calendarCampaignId===campaignId&&j.campaignMinute<=minute);
 const starts=rows.filter(j=>j.calendarAlchemyDarkvisionHealingStart?.useId===useId);
 req(starts.length<=1,'Darkvision Healing: opakovaný začátek léčení');
 const start=starts[0]?.calendarAlchemyDarkvisionHealingStart||null;
 let hr=5,nextDueMinute=start?.dueMinute??null,skipCount=0,recovered=false,rollCount=0;
 const rolls=rows.filter(j=>j.calendarAlchemyDarkvisionHealingRoll?.useId===useId);
 for(const j of rolls){
  const r=j.calendarAlchemyDarkvisionHealingRoll;
  req(!!start&&!recovered&&j.campaignMinute===nextDueMinute&&r.minute===nextDueMinute&&r.hrBefore===hr&&r.period===rollCount+1,
   'Darkvision Healing: chybná posloupnost léčení nebo splatnost');
  const sl=successLevel(r.d100,r.eml);
  const effects=exposureHealing({healingRate:hr,sl});
  req(r.sl===['CF','F','S','CS'][sl]&&r.hrAfter===Math.min(6,effects.healingRate)&&r.skipNext===effects.skipNext,
   'Darkvision Healing: výsledek zotavení se neshoduje s HMK Exposure Healing');
  hr=r.hrAfter;recovered=hr>=6;rollCount++;
  if(!recovered){skipCount+=effects.skipNext?1:0;nextDueMinute+=(effects.skipNext?2:1)*start.hpD6*DAY;}
  else nextDueMinute=null;
 }
 return {useId,campaignId,targetId:p.targetId,penalty:p.illEffect.penalty,baseAS:p.asBefore,
  onsetMinute:use.campaignMinute,startId:starts[0]?.id??null,start,
  healingRate:hr,nextDueMinute,recovered,rollCount,skipCount,
  pendingStart:!start,activePenalty:!recovered?p.illEffect.penalty:0};
}
export function createDarkvisionHealingStart({journal=[],campaignId,minute,useId,targetId,hpD6,origin,gmConfirmed=false}={}){
 const state=darkvisionHealingState(journal,campaignId,useId,minute);
 req(state.pendingStart&&minute===state.onsetMinute&&targetId===state.targetId,
  'Darkvision Healing: zahájení léčebné periody musí být doloženo při CF Imbibing ve stejné kampani a minutě');
 req(int(hpD6,1,6)&&originOK(origin)&&gmConfirmed===true,'Darkvision Healing: povinný d6 HP, původ hodu a potvrzení GM');
 const dueMinute=minute+hpD6*DAY;
 req(int(dueMinute,0,1e9),'Darkvision Healing: termín mimo kalendář');
 return {format:DARKVISION_HEAL_FORMAT,campaignId,minute,useId,targetId,hpD6,origin,dueMinute,
  initialHR:5,lightPenalty:state.penalty,gmConfirmed:true,sourcePages:[185,270,271]};
}
export function createDarkvisionHealingRoll({journal=[],campaignId,minute,useId,targetId,endurance,will,d100,origin,gmConfirmed=false}={}){
 const state=darkvisionHealingState(journal,campaignId,useId,minute);
 req(!state.pendingStart&&!state.recovered&&state.nextDueMinute===minute&&targetId===state.targetId,
  'Darkvision Healing: Healing Roll je možný pouze přesně v povinném termínu');
 req(int(endurance,1,99)&&int(will,1,99)&&int(d100,1,100)&&originOK(origin)&&gmConfirmed===true,
  'Darkvision Healing: chybí skutečné END, WIL, d100, původ hodu nebo potvrzení GM');
 const hb=healingBase({endurance,will}),rawEML=hb*state.healingRate;
 const sl=successLevel(d100,rawEML),result=exposureHealing({healingRate:state.healingRate,sl});
 const hrAfter=Math.min(6,result.healingRate),recovered=hrAfter>=6;
 return {format:DARKVISION_HEAL_FORMAT,campaignId,minute,useId,targetId,period:state.rollCount+1,
  endurance,will,hb,hrBefore:state.healingRate,rawEML,eml:Math.max(5,Math.min(95,rawEML)),
  d100,origin,sl:['CF','F','S','CS'][sl],hrAfter,skipNext:result.skipNext,recovered,
  nextDueMinute:recovered?null:minute+(result.skipNext?2:1)*state.start.hpD6*DAY,
  gmConfirmed:true,sourcePages:[185,270,271]};
}
export function pendingDarkvisionHealing(journal=[],campaignId,minute=1e9){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarAlchemyImbibing?.illEffect?.kind==='vision-light-penalty'&&j.calendarAlchemyImbibing.finalAS>0)
 .map(j=>darkvisionHealingState(journal,campaignId,j.id,minute)).filter(s=>!s.recovered);
}
export function requireDarkvisionHealingGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 req(int(beforeMinute,0,1e9)&&int(afterMinute,beforeMinute,1e9),'Darkvision Healing: neplatný posun GM');
 for(const s of pendingDarkvisionHealing(journal,campaignId,afterMinute)){
  if(s.pendingStart&&s.onsetMinute<afterMinute)throw Error('Darkvision Healing: nejprve doložte d6 Healing Period po CF Imbibing ('+s.useId+').');
  if(s.nextDueMinute!==null&&s.nextDueMinute<afterMinute)
   throw Error('Darkvision Healing: GM nesmí přeskočit povinný Healing Roll v minutě '+s.nextDueMinute+'.');
 }
 return true;
}
export function validateDarkvisionHealingJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const start=row.calendarAlchemyDarkvisionHealingStart,roll=row.calendarAlchemyDarkvisionHealingRoll;
  if(start){
   req(row.calendarCampaignId===start.campaignId&&row.campaignMinute===start.minute&&row.characterId===start.targetId,
    'Darkvision Healing: chybné propojení začátku s příjemcem');
   const expected=createDarkvisionHealingStart({journal:prior,campaignId:start.campaignId,minute:start.minute,
    useId:start.useId,targetId:start.targetId,hpD6:start.hpD6,origin:start.origin,gmConfirmed:start.gmConfirmed});
   req(JSON.stringify(expected)===JSON.stringify(start),'Darkvision Healing: změněný důkaz Healing Period');
  }
  if(roll){
   req(row.calendarCampaignId===roll.campaignId&&row.campaignMinute===roll.minute&&row.characterId===roll.targetId,
    'Darkvision Healing: chybné propojení zotavení s příjemcem');
   const expected=createDarkvisionHealingRoll({journal:prior,campaignId:roll.campaignId,minute:roll.minute,
    useId:roll.useId,targetId:roll.targetId,endurance:roll.endurance,will:roll.will,d100:roll.d100,
    origin:roll.origin,gmConfirmed:roll.gmConfirmed});
   req(JSON.stringify(expected)===JSON.stringify(roll),'Darkvision Healing: změněný výsledek zotavení');
  }
  prior.push(row);
 }
 return true;
}
export function assertDarkvisionHealingAppendOnly(before=[],after=[]){
 const saved=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarAlchemyDarkvisionHealingStart||j.calendarAlchemyDarkvisionHealingRoll)
  req(JSON.stringify(saved.get(j.id))===JSON.stringify(j),'Darkvision Healing: historický důkaz nelze změnit ani odstranit');
 return true;
}
