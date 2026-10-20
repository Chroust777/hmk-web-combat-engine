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
const assessments=(journal,c)=>inCampaign(journal,c).filter(j=>j.calendarHerbPotency);
const findAssessment=(j,c,id,n)=>assessments(j,c).find(r=>r.calendarHerbPotency.sourceId===id&&r.calendarHerbPotency.resultIndex===n);
function sourceLot(j,c,sourceId,resultIndex){
 const src=j.find(x=>x.id===sourceId);
 requireTrue(src?.calendarCampaignId===c&&src.calendarTrekWildernessProof,'Chybí pravý Foraging důkaz v kampani');
 const found=src.calendarTrekWildernessProof.results?.[resultIndex];
 requireTrue(found&&integer(found.herbDoses,1,100)&&typeof found.herbName==='string'&&found.herbName.trim(),'Zdroj neobsahuje doložené dávky byliny');
 return {src,found};
}
export function createHerbPotency({journal=[],campaignId,minute,sourceId,resultIndex,doses,actorId,potencyMode='per-dose'}={}){
 requireTrue(campaignId&&integer(minute,0,1e9)&&actorId,'Chybí kampaň/čas/postava');
 const {src,found}=sourceLot(journal,campaignId,sourceId,resultIndex);
 requireTrue(src.campaignMinute<=minute,'Budoucí bylina není dostupná');
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
  sourceMinute:src.campaignMinute,herbName:found.herbName,doses:proven,sourcePages:[74,147]};
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
function skillResult(j,c,actor,minute,skillId){const row=j.find(x=>x.id===skillId),p=row?.skillTestProof,r=p?.a||p?.result;
 requireTrue(row?.calendarCampaignId===c&&row.campaignMinute===minute&&row.characterId===actor&&
 (p?.skills?.[0]||p?.skill)==='Herblore'&&integer(r?.sv,-100,100)&&integer(r?.ml,1,1000),
 'Nutný skutečný Herblore Success Value ze Skill Workbench ve stejné kampani a minutě');
 requireTrue(!inCampaign(j,c).some(x=>x.calendarHerbPreservation?.skillId===skillId||x.calendarHerbPotionComplete?.skillId===skillId),'Herblore hod již byl použit');
 return r;}
export function createHerbPreservation({journal=[],campaignId,minute,actorId,assessmentId,doseIndex,skillId,workshopConfirmed=false}={}){
 requireTrue(workshopConfirmed,'Konzervace vyžaduje suchou tmavou dílnu');
 const a=journal.find(x=>x.id===assessmentId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotency)?.calendarHerbPotency;
 requireTrue(a&&minute>=a.minute,'Chybí doložená dávka');
 requireTrue(!inCampaign(journal,campaignId).some(x=>x.calendarHerbPreservation?.assessmentId===assessmentId&&x.calendarHerbPreservation?.doseIndex===doseIndex),'Dávka již konzervována');
 requireTrue(!inCampaign(journal,campaignId).some(x=>x.calendarHerbPotionStart?.assessmentId===assessmentId&&x.calendarHerbPotionStart?.doseIndex===doseIndex),'Použitá dávka nesmí být konzervována');
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
export function createHerbPotionStart({journal=[],campaignId,minute,actorId,reserveId,herbType}={}){
 const {row,p,index}=reservedIndex(journal,reserveId);
 requireTrue(row.calendarCampaignId===campaignId&&row.characterId===actorId&&row.campaignMinute<=minute,'Cizí či budoucí rezervace');
 requireTrue(!inCampaign(journal,campaignId).some(x=>x.calendarHerbPotionStart?.reserveId===reserveId),'Rezervace již využita');
 requireTrue(EXOTIC_POTIONS.includes(herbType),'Přípravek není jednou z doložených kategorií HMK p75');
 requireTrue(p.herbName?.toLowerCase().trim()===herbType,'Typ lektvaru musí odpovídat skutečně hledané bylině');
 const q=herbDoseStatus(journal,campaignId,p.sourceId,p.resultIndex,index,minute);
 requireTrue(q.quality>0,'Bylina ztratila veškerou potenci');
 return {format:HERB_POTION_START_FORMAT,campaignId,minute,actorId,reserveId,assessmentId:q.assessmentId,
  sourceId:p.sourceId,resultIndex:p.resultIndex,doseIndex:index,herbType,quality:q.quality,dueMinute:minute+10,sourcePages:[74,75]};
}
export function createHerbPotionComplete({journal=[],campaignId,minute,actorId,startId,skillId,shelfD6,shelfOrigin='manual'}={}){
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionStart),p=row?.calendarHerbPotionStart;
 requireTrue(p&&p.actorId===actorId&&integer(minute,p.dueMinute,1e9),'Příprava ještě netrvala 10 minut GM času');
 requireTrue(!inCampaign(journal,campaignId).some(x=>x.calendarHerbPotionComplete?.startId===startId),'Již dokončeno');
 requireTrue(integer(shelfD6,1,6)&&ORIGINS.includes(shelfOrigin),'Trvanlivost vyžaduje auditovaný d6');
 const r=skillResult(journal,campaignId,actorId,minute,skillId),idx=Math.floor(r.ml/10),usable=r.sv>0;
 return {format:HERB_POTION_COMPLETE_FORMAT,campaignId,minute,actorId,startId,skillId,herbType:p.herbType,potency:p.quality,
  sv:r.sv,herbloreIndex:idx,shelfD6,shelfOrigin,usable,expiryMinute:usable?minute+(shelfD6+idx)*DAY:null,
  application:'NOT_APPLIED',sourcePages:[74,75]};
}
export function validateHerbalJournal(j=[]){const prior=[];for(const r of j){const p=r.calendarHerbPotency||r.calendarHerbPreservation||r.calendarHerbPotionStart||r.calendarHerbPotionComplete;
 if(p){requireTrue(r.calendarCampaignId===p.campaignId&&r.campaignMinute===p.minute&&r.characterId===p.actorId,'Neplatný původ bylinného důkazu');
 const args={journal:prior,...p};const x=r.calendarHerbPotency?createHerbPotency(args):r.calendarHerbPreservation?createHerbPreservation(args):r.calendarHerbPotionStart?createHerbPotionStart(args):createHerbPotionComplete(args);
 requireTrue(JSON.stringify(p)===JSON.stringify(x),'Bylinný důkaz neodpovídá původnímu postupu');}
 prior.push(r);}return true;}
export function assertHerbalJournalAppendOnly(before=[],after=[]){const map=new Map(after.map(x=>[x.id,x]));for(const r of before)if(r.calendarHerbPotency||r.calendarHerbPreservation||r.calendarHerbPotionStart||r.calendarHerbPotionComplete){
 requireTrue(map.has(r.id)&&JSON.stringify(map.get(r.id))===JSON.stringify(r),'Nelze upravit ani odstranit bylinný důkaz');}return true;}
export function herbAssessmentCandidates(j,c){return supplyLots(j,c).filter(x=>x.unit==='herbDoses'&&!findAssessment(j,c,x.sourceId,x.resultIndex));}
export function herbPotionReservationCandidates(j,c,minute){const rows=[];for(const r of inCampaign(j,c))if(r.calendarForagingSupplyUse?.unit==='herbDoses'&&r.calendarForagingSupplyUse.disposition==='ingredient-reserved'&&r.calendarForagingSupplyUse.quantity===1){
 if(inCampaign(j,c).some(x=>x.calendarHerbPotionStart?.reserveId===r.id))continue;
 try{const {p,index}=reservedIndex(j,r.id);const status=herbDoseStatus(j,c,p.sourceId,p.resultIndex,index,minute);if(status.quality>0)rows.push({row:r,index,status});}catch{}}
 return rows;}
