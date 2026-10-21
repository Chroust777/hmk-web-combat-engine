/** HMK v1.2 p.74 / p.62: attested mundane herbal ingredient -> existing
 * craft Success Value. No fabricated recipe, workshop, duration, goods or
 * inventory mass. Only previously witnessed rolls are consumed.
 */
import {herbDoseStatus} from './hmk-herbal-concoctions.js';
import {secondaryModifier} from '../rules/tests.js';
export const MUNDANE_CRAFT_FORMAT='hmk-mundane-herbal-craft-v1';
export const MUNDANE_CRAFT_SKILLS=Object.freeze(['Brewing','Cookery','Embalming','Perfumery']);
const check=(v,m)=>{if(!v)throw Error(m)};
const validMinute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
const categoryFor=name=>{
 const n=String(name||'').trim().toLowerCase();
 const matched=/^(brewing|cookery|embalming|perfumery)(?:\s+herbs?)?$/.exec(n);
 return matched?MUNDANE_CRAFT_SKILLS.find(s=>s.toLowerCase()===matched[1]):null;
};
function reservationIndex(journal,reserveId,origin){
 let idx=0;
 for(const r of journal){
  if(r.id===reserveId)break;
  const p=r.calendarForagingSupplyUse;
  if(r.calendarCampaignId===origin.calendarCampaignId&&p?.unit==='herbDoses'&&p.disposition==='ingredient-reserved'&&
    p.sourceId===origin.calendarForagingSupplyUse.sourceId&&p.resultIndex===origin.calendarForagingSupplyUse.resultIndex)idx+=p.quantity;
 }
 return idx;
}
function getSkill(j,c,actor,skillId,minute,skill){
 const row=j.find(r=>r.id===skillId),p=row?.skillTestProof,result=p?.a||p?.result;
 check(row&&row.calendarCampaignId===c&&row.characterId===actor&&row.campaignMinute<=minute&&
  (p?.skills?.[0]||p?.skill)===skill&&Number.isSafeInteger(result?.ml)&&result.ml>0&&
  Number.isSafeInteger(result?.sv)&&Number.isSafeInteger(result?.roll)&&
  result.roll>=1&&result.roll<=100,'Chybí doložený SV/d100 pro '+skill);
 return {row,p,result};
}
/** This record is the completed *evaluation* of a GM-defined mundane recipe,
 * not physical manufacturing or an invented recipe-duration rule. */
export function createMundaneHerbalCraft({journal=[],campaignId,minute,actorId,reserveId,herbloreSkillId,craftSkillId,
  recipeName,gmLaborConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&validMinute(minute)&&typeof actorId==='string'&&actorId,
  'Mundánní Concoction potřebuje kampaň, postavu a aktuální GM čas');
 check(gmLaborConfirmed===true,'GM musí doložit skutečně provedenou práci; HMK pro všechny recepty neurčuje jednu dobu');
 check(typeof recipeName==='string'&&recipeName.trim().length>=3&&recipeName.trim().length<=120,
  'Doložte konkrétní recept (HMK nepředepisuje jednotnou recepturu)');
 const reserve=journal.find(r=>r.id===reserveId),p=reserve?.calendarForagingSupplyUse;
 check(reserve?.calendarCampaignId===campaignId&&reserve.characterId===actorId&&reserve.campaignMinute<=minute&&
  p?.unit==='herbDoses'&&p.disposition==='ingredient-reserved'&&p.quantity===1,
  'Nutná jedna dříve rezervovaná skutečná bylinná dávka z této kampaně');
 const source=journal.find(r=>r.id===p.sourceId&&r.calendarCampaignId===campaignId)?.calendarTrekWildernessProof?.results?.[p.resultIndex];
 check(source&&source.herbName===p.herbName,'Rezervace bylin neodpovídá původnímu Foraging nálezu');
 const skill=categoryFor(p.herbName);
 check(skill,'Nález musí být Brewing, Cookery, Embalming nebo Perfumery herbs (HMK 74)');
 check(!journal.some(r=>r.calendarCampaignId===campaignId&&
  (r.calendarHerbPotionStart?.reserveId===reserveId||r.calendarMundaneHerbalCraft?.reserveId===reserveId)),
  'Tato bylinná dávka již byla použita k přípravě');
 const doseIndex=reservationIndex(journal,reserveId,reserve);
 const status=herbDoseStatus(journal,campaignId,p.sourceId,p.resultIndex,doseIndex,minute);
 check(status.quality>0,'Bylina již pozbyla účinnou potenci');
 const herblore=getSkill(journal,campaignId,actorId,herbloreSkillId,minute,'Herblore');
 const craft=getSkill(journal,campaignId,actorId,craftSkillId,minute,skill);
 check(herblore.row.campaignMinute<=craft.row.campaignMinute,
  'Herblore musí být doloženo nejpozději při výrobním hodu');
 check(craft.row.campaignMinute===minute,'Výrobní SV musí být v aktuální minutě GM kalendáře');
 check(herbloreSkillId!==craftSkillId,'Herblore a výrobní SV jsou dva rozdílné důkazy');
 check(!journal.some(r=>r.calendarMundaneHerbalCraft?.craftSkillId===craftSkillId),
  'Stejný d100 výrobní hod již byl využit');
 const herbloreML=herblore.result.ml,modifier=secondaryModifier(herbloreML);
 const herbSecondaryIndex=craft.p.secondarySkills?.indexOf('Herblore')??-1;
 check(herbSecondaryIndex>=0&&craft.result.secondary?.[herbSecondaryIndex]?.modifier===modifier,
  'Výrobní SV musí skutečně obsahovat Herblore Secondary Modifier podle ML z doloženého hodu');
 const potencySV=status.quality-1;
 const baseSV=craft.result.sv;
 return {format:MUNDANE_CRAFT_FORMAT,campaignId,minute,actorId,reserveId,assessmentId:status.assessmentId,
  sourceId:p.sourceId,resultIndex:p.resultIndex,doseIndex,craftSkill:skill,herbName:p.herbName,
  recipeName:recipeName.trim(),herbloreSkillId,craftSkillId,herbloreML,herbloreModifier:modifier,
  herbPotency:status.quality,potencySV,baseSV,finalSV:baseSV+potencySV,
  gmLaborConfirmed:true,physicalOutput:'not-created',sourcePages:[62,74]};
}
export function mundaneCraftCandidates(journal=[],campaignId,minute){
 const candidates=[];
 for(const r of journal){const p=r.calendarForagingSupplyUse;
  if(r.calendarCampaignId!==campaignId||!validMinute(r.campaignMinute)||r.campaignMinute>minute||
    p?.unit!=='herbDoses'||p.disposition!=='ingredient-reserved'||p.quantity!==1||
    !categoryFor(p.herbName)||journal.some(j=>j.calendarCampaignId===campaignId&&
    (j.calendarMundaneHerbalCraft?.reserveId===r.id||j.calendarHerbPotionStart?.reserveId===r.id)))continue;
  try{const idx=reservationIndex(journal,r.id,r),s=herbDoseStatus(journal,campaignId,p.sourceId,p.resultIndex,idx,minute);
   if(s.quality>0)candidates.push({row:r,skill:categoryFor(p.herbName),status:s});
  }catch{}
 }
 return candidates;
}
export function validateMundaneHerbalJournal(journal=[]){
 const prior=[];
 for(const row of journal){if(row.calendarMundaneHerbalCraft){const p=row.calendarMundaneHerbalCraft;
  check(row.calendarCampaignId===p.campaignId&&row.characterId===p.actorId&&row.campaignMinute===p.minute,
   'Nesprávný historický původ mundánní Concoction');
  const reproduced=createMundaneHerbalCraft({journal:prior,...p});
  check(JSON.stringify(p)===JSON.stringify(reproduced),'Mundánní Concoction má pozměněný historický důkaz');
 }prior.push(row);}
 return true;
}
export function assertMundaneHerbalAppendOnly(before=[],after=[]){
 const next=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarMundaneHerbalCraft)
  check(JSON.stringify(next.get(r.id))===JSON.stringify(r),'Mundánní výrobní důkaz nelze odstranit ani měnit');
 return true;
}
