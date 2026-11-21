/** HMK v1.2 pp.74–75. Append-only campaign-scoped herb potency, preservation,
 * and timed field potions. NEVER move GM time and NEVER infer administration. */
import {supplyLots} from './hmk-foraging-supply-ledger.js';
const requireTrue=(v,msg)=>{if(!v)throw Error(msg);};
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const ORIGINS=['manual','cryptographic-software-die'];
const DAY=1440;
export const HERB_ASSESSMENT_FORMAT='hmk-herb-potency-v1';
export const HERB_PRESERVATION_FORMAT='hmk-herb-preservation-v1';
export const HERB_POTION_START_FORMAT='hmk-herb-potion-start-v1';
export const HERB_POTION_COMPLETE_FORMAT='hmk-herb-potion-complete-v1';
export const EXOTIC_POTIONS=Object.freeze(['antivenin','aphrodisiac','aromatic','coagulant','curative','emetic','hallucinogenic','narcotic','paralytic','poison','soporific','stimulant']);
export function potencyLevel(d10){requireTrue(integer(d10,1,10),'Potence vyžaduje platný d10');return d10===10?3:d10>=7?2:1;}
export const potencyLabel=n=>['exhausted','Mild','Strong','Great'][n]||'exhausted';
const inCampaign=(journal,c)=>journal.filter(j=>j.calendarCampaignId===c);
export const herbPotionBatchLimit=ml=>Math.max(1,Math.floor(ml/20));
const potionReservations=p=>p?.batchReserveIds??(p?[p.reserveId]:[]);
const potionUsesReservation=(p,id)=>potionReservations(p).includes(id);
const assessments=(journal,c)=>inCampaign(journal,c).filter(j=>j.calendarHerbPotency);
const findAssessment=(j,c,id,n)=>assessments(j,c).find(r=>r.calendarHerbPotency.sourceId===id&&r.calendarHerbPotency.resultIndex===n);
function sourceLot(j,c,sourceId,resultIndex){
 const src=j.find(x=>x.id===sourceId&&x.calendarCampaignId===c);
 // One canonical, source-linked supply ledger covers historical Trekking,
 // moving travel and stationary Foraging. A time episode yields herbs only at
 // its END, never at the starting minute of the search (HMK pp.74,147).
 const lot=supplyLots(j,c).find(x=>x.sourceId===sourceId&&
  x.resultIndex===resultIndex&&x.unit==='herbDoses');
 requireTrue(src&&lot,'Chybí pravý Foraging důkaz v kampani');
 const found={herbDoses:lot.quantity,herbName:lot.herbName};
 requireTrue(integer(found.herbDoses,1,100)&&typeof found.herbName==='string'&&found.herbName.trim(),
  'Zdroj neobsahuje doložené dávky byliny');
 return {src,found,sourceMinute:lot.minute};
}
export function createHerbPotency({journal=[],campaignId,minute,sourceId,resultIndex,doses,actorId,potencyMode='per-dose'}={}){
 requireTrue(campaignId&&integer(minute,0,1e9)&&actorId,'Chybí kampaň/čas/postava');
 const {found,sourceMinute}=sourceLot(journal,campaignId,sourceId,resultIndex);
 requireTrue(sourceMinute<=minute,'Budoucí bylina není dostupná');
 requireTrue(!findAssessment(journal,campaignId,sourceId,resultIndex),'Potence nálezu je již doložena');
 requireTrue(Array.isArray(doses)&&doses.length===found.herbDoses,'Každá dávka potřebuje doložený d10 a intervaly 2d6');
 requireTrue(['per-dose','single-roll-all'].includes(potencyMode),'Neplatný způsob určení potence');
 const proven=doses.map(d=>{
  requireTrue(integer(d.potencyRoll,1,10)&&Array.isArray(d.decayRolls)&&d.decayRolls.length===3&&
   d.decayRolls.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(v=>integer(v,1,6))),'Neplatný d10/2d6 hod');
  const potencyOrigin=d.potencyOrigin||d.origin;
  const decayOrigins=d.decayOrigins||d.decayRolls.map(()=>[d.origin,d.origin]);
  requireTrue(ORIGINS.includes(potencyOrigin)&&Array.isArray(decayOrigins)&&decayOrigins.length===3&&
   decayOrigins.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(x=>ORIGINS.includes(x))), 'Chybí auditní původ každého d10/d6');
  return {potencyRoll:d.potencyRoll,initialPotency:potencyLevel(d.potencyRoll),decayRolls:d.decayRolls.map(x=>[...x]),
   intervalDays:d.decayRolls.map(x=>x[0]+x[1]),origin:d.origin||'manual',potencyOrigin,decayOrigins:decayOrigins.map(x=>[...x])};
 });
 if(potencyMode==='single-roll-all')requireTrue(proven.every(x=>x.potencyRoll===proven[0].potencyRoll&&x.potencyOrigin===proven[0].potencyOrigin),'Společný d10 musí být pro všechny dávky totožný');
 return {format:HERB_ASSESSMENT_FORMAT,campaignId,minute,actorId,sourceId,resultIndex,potencyMode,
  sourceMinute,herbName:found.herbName,doses:proven,sourcePages:[74,147]};
}
function unpreserved(dose,from,at){let p=dose.initialPotency,elapsed=at-from,threshold=0;
 for(let i=0;i<dose.initialPotency;i++){threshold+=dose.intervalDays[i]*DAY;if(elapsed>=threshold)p--;else break;}
 return p;}
function quality(j,c,assessId,doseIndex,at){
 const entry=j.find(x=>x.id===assessId&&x.calendarCampaignId===c&&x.calendarHerbPotency);
 const proof=entry?.calendarHerbPotency;
 requireTrue(proof&&integer(doseIndex,0,proof.doses.length-1)&&at>=proof.sourceMinute,'Nenalezená nebo nedoložená bylina');
 const d=proof.doses[doseIndex];
 const preservation=inCampaign(j,c).find(r=>r.calendarHerbPreservation?.assessmentId===assessId&&r.calendarHerbPreservation?.doseIndex===doseIndex&&r.campaignMinute<=at);
 let potency;
 if(preservation){const period=preservation.calendarHerbPreservation.periodDays*DAY;
  potency=Math.max(0,unpreserved(d,proof.sourceMinute,preservation.campaignMinute)-Math.floor((at-preservation.campaignMinute)/period));
 }else potency=unpreserved(d,proof.sourceMinute,at);
 return {quality:potency,potency:potencyLabel(potency),preserved:!!preservation,preservationId:preservation?.id||null};
}
export function herbDoseStatus(j,c,sourceId,resultIndex,doseIndex,minute){const a=findAssessment(j,c,sourceId,resultIndex);
 requireTrue(a,'Dávky nemají doloženou potenci');return {...quality(j,c,a.id,doseIndex,minute),assessmentId:a.id};}
function skillResult(j,c,actor,minute,skillId,sharedStartId){const row=j.find(x=>x.id===skillId),p=row?.skillTestProof,r=p?.a||p?.result;
 requireTrue(row?.calendarCampaignId===c&&row.campaignMinute===minute&&row.characterId===actor&&
 (p?.skills?.[0]||p?.skill)==='Herblore'&&integer(r?.sv,-100,100)&&integer(r?.ml,1,1000),
 'Nutný skutečný Herblore Success Value ze Skill Workbench ve stejné kampani a minutě');
 requireTrue(!inCampaign(j,c).some(x=>x.calendarHerbPreservation?.skillId===skillId||(x.calendarHerbPotionComplete?.skillId===skillId&&x.calendarHerbPotionComplete.startId!==sharedStartId)),'Herblore hod již byl použit');
 return r;}
export function createHerbPreservation({journal=[],campaignId,minute,actorId,assessmentId,doseIndex,skillId,workshopConfirmed=false}={}){
 requireTrue(workshopConfirmed,'Konzervace vyžaduje suchou tmavou dílnu');
 const a=journal.find(x=>x.id===assessmentId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotency)?.calendarHerbPotency;
 requireTrue(a&&minute>=a.minute,'Chybí doložená dávka');
 requireTrue(!inCampaign(journal,campaignId).some(x=>x.calendarHerbPreservation?.assessmentId===assessmentId&&x.calendarHerbPreservation?.doseIndex===doseIndex),'Dávka již konzervována');
 requireTrue(!inCampaign(journal,campaignId).some(x=>potionReservations(x.calendarHerbPotionStart).some(id=>{const {p,index}=reservedIndex(journal,id);return p.sourceId===a.sourceId&&p.resultIndex===a.resultIndex&&index===doseIndex;})),'Použitá dávka nesmí být konzervována');
 const before=quality(journal,campaignId,assessmentId,doseIndex,minute);
 requireTrue(before.quality>0,'Dávka již pozbyla potenci');
 const sv=skillResult(journal,campaignId,actorId,minute,skillId).sv,periodDays=30+sv*10;
 requireTrue(periodDays>0,'Příprava nesplnila kladný interval konzervace');
 return {format:HERB_PRESERVATION_FORMAT,campaignId,minute,actorId,assessmentId,doseIndex,skillId,
  qualityAtPreservation:before.quality,sv,periodDays,workshopConfirmed:true,sourcePage:74};
}
function reservedIndex(j,reserveId){const row=j.find(x=>x.id===reserveId),p=row?.calendarForagingSupplyUse;
 requireTrue(p?.unit==='herbDoses'&&p.disposition==='ingredient-reserved'&&p.quantity===1,'Lektvar vyžaduje rezervaci jedné skutečné bylinné dávky');
 let index=0;for(const x of j){if(x.id===reserveId)break;const u=x.calendarForagingSupplyUse;
  if(x.calendarCampaignId===row.calendarCampaignId&&u?.unit==='herbDoses'&&u.disposition==='ingredient-reserved'&&u.sourceId===p.sourceId&&u.resultIndex===p.resultIndex)index+=u.quantity;
 }return {row,p,index};}
export function createHerbPotionStart({journal=[],campaignId,minute,actorId,reserveId,herbType,batchReserveIds=null,herbloreML=null}={}){
 const ids=batchReserveIds??[reserveId];
 requireTrue(Array.isArray(ids)&&ids[0]===reserveId&&new Set(ids).size===ids.length&&
  (batchReserveIds===null||(integer(herbloreML,1,1000)&&integer(ids.length,2,herbPotionBatchLimit(herbloreML)))),
  'Výrobní dávka překračuje polovinu Herblore Indexu nebo opakuje rezervaci');
 requireTrue(EXOTIC_POTIONS.includes(herbType),'Přípravek není jednou z doložených kategorií HMK p75');
 const campaign=inCampaign(journal,campaignId);
 const doses=ids.map(id=>{
  const {row,p,index}=reservedIndex(journal,id);
  requireTrue(row.calendarCampaignId===campaignId&&row.characterId===actorId&&row.campaignMinute<=minute,'Cizí či budoucí rezervace');
  requireTrue(!campaign.some(x=>potionUsesReservation(x.calendarHerbPotionStart,id)),'Rezervace již využita');
  requireTrue(p.herbName?.toLowerCase().trim()===herbType,'Typ lektvaru musí odpovídat skutečně hledané bylině');
  const q=herbDoseStatus(journal,campaignId,p.sourceId,p.resultIndex,index,minute);
  requireTrue(q.quality>0,'Bylina ztratila veškerou potenci');
  return {assessmentId:q.assessmentId,sourceId:p.sourceId,resultIndex:p.resultIndex,doseIndex:index,quality:q.quality};
 });
 const first=doses[0];
 requireTrue(doses.every(x=>x.quality===first.quality),'Společná příprava vyžaduje stejnou potenci všech dávek');
 return {format:HERB_POTION_START_FORMAT,campaignId,minute,actorId,reserveId,assessmentId:first.assessmentId,sourceId:first.sourceId,resultIndex:first.resultIndex,doseIndex:first.doseIndex,herbType,quality:first.quality,dueMinute:minute+10,sourcePages:[74,75],
  ...(batchReserveIds?{batchReserveIds:[...ids],herbloreML}:{})};
}
export function createHerbPotionComplete({journal=[],campaignId,minute,actorId,startId,skillId,shelfD6,shelfOrigin='manual',doseNumber=null}={}){
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionStart),p=row?.calendarHerbPotionStart;
 requireTrue(p&&p.actorId===actorId&&integer(minute,p.dueMinute,1e9),'Příprava ještě netrvala 10 minut GM času');
 const previous=inCampaign(journal,campaignId).filter(x=>x.calendarHerbPotionComplete?.startId===startId);
 if(p.batchReserveIds){
  requireTrue(doseNumber===previous.length+1&&doseNumber<=p.batchReserveIds.length&&previous.every(({calendarHerbPotionComplete:x})=>
   x.skillId===skillId&&x.minute===minute&&x.shelfD6===shelfD6&&x.shelfOrigin===shelfOrigin),'Neplatné pořadí nebo společné hody výrobní dávky');
 }else requireTrue(doseNumber===null&&!previous.length,'Již dokončeno');
 requireTrue(integer(shelfD6,1,6)&&ORIGINS.includes(shelfOrigin),'Trvanlivost vyžaduje auditovaný d6');
 const r=skillResult(journal,campaignId,actorId,minute,skillId,p.batchReserveIds?startId:undefined);
 const idx=Math.floor(r.ml/10),usable=r.sv>0;
 requireTrue(!p.batchReserveIds||p.batchReserveIds.length<=herbPotionBatchLimit(r.ml),'Výrobní dávka překračuje polovinu aktuálního Herblore Indexu');
 return {format:HERB_POTION_COMPLETE_FORMAT,campaignId,minute,actorId,startId,skillId,herbType:p.herbType,potency:p.quality,
  sv:r.sv,herbloreIndex:idx,shelfD6,shelfOrigin,usable,expiryMinute:usable?minute+(shelfD6+idx)*DAY:null,
  application:'NOT_APPLIED',sourcePages:[74,75],...(p.batchReserveIds?{doseNumber}:{})};
}
export function validateHerbalJournal(j=[]){const prior=[];for(const r of j){const p=r.calendarHerbPotency||r.calendarHerbPreservation||r.calendarHerbPotionStart||r.calendarHerbPotionComplete;
 if(p){requireTrue(r.calendarCampaignId===p.campaignId&&r.campaignMinute===p.minute&&r.characterId===p.actorId,'Neplatný původ bylinného důkazu');
 const args={journal:prior,...p};const x=r.calendarHerbPotency?createHerbPotency(args):r.calendarHerbPreservation?createHerbPreservation(args):r.calendarHerbPotionStart?createHerbPotionStart(args):createHerbPotionComplete(args);
 requireTrue(JSON.stringify(p)===JSON.stringify(x),'Bylinný důkaz neodpovídá původnímu postupu');}
 prior.push(r);}
 const completedBatchSizes=new Map();
 for(const row of j){
  const done=row.calendarHerbPotionComplete;
  if(done?.doseNumber)completedBatchSizes.set(done.startId,done.doseNumber);
 }
 for(const row of j){
  const expected=row.calendarHerbPotionStart?.batchReserveIds?.length;
  const completed=completedBatchSizes.get(row.id);
  requireTrue(!completed||completed===expected,'Společná výroba musí dokončit všechny dávky současně');
 }
 return true;}
export function assertHerbalJournalAppendOnly(before=[],after=[]){const map=new Map(after.map(x=>[x.id,x]));for(const r of before)if(r.calendarHerbPotency||r.calendarHerbPreservation||r.calendarHerbPotionStart||r.calendarHerbPotionComplete){
 requireTrue(map.has(r.id)&&JSON.stringify(map.get(r.id))===JSON.stringify(r),'Nelze upravit ani odstranit bylinný důkaz');}return true;}
export function herbAssessmentCandidates(j,c){return supplyLots(j,c).filter(x=>x.unit==='herbDoses'&&!findAssessment(j,c,x.sourceId,x.resultIndex));}
export function herbPotionReservationCandidates(j,c,minute){const rows=[];for(const r of inCampaign(j,c))if(r.calendarForagingSupplyUse?.unit==='herbDoses'&&r.calendarForagingSupplyUse.disposition==='ingredient-reserved'&&r.calendarForagingSupplyUse.quantity===1){
 if(inCampaign(j,c).some(x=>potionUsesReservation(x.calendarHerbPotionStart,r.id)))continue;
 try{const {p,index}=reservedIndex(j,r.id);const status=herbDoseStatus(j,c,p.sourceId,p.resultIndex,index,minute);if(status.quality>0)rows.push({row:r,index,status});}catch{}}
 return rows;}
