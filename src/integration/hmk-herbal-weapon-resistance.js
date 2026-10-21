/** HMK v1.2 p.75: weapon-applied Poison grants +20 to the injured victim's
 * Resistance Roll. Neither the herbal table nor the generic Poison/Toxin
 * course on p.186 specifies an unambiguous base EML for this resistance.
 * The GM must attest that base and its actual d100: never invent an END,
 * HR, or automatically advance a toxin course on the strength of this roll.
 * Existing historical hit proofs are append-only. */
import {effectiveMasteryLevel,successLevel,SL} from '../rules/tests.js';
const need=(v,m)=>{if(!v)throw Error('Poison Resistance: '+m)};
const minuteOk=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const goodId=s=>typeof s==='string'&&s.length>=3&&s.length<=160;
export const PASTE_RESIST_FORMAT='hmk-herbal-weapon-resistance-v1';
const labels=['CF','F','S','CS'];
export function pendingWeaponPoisonResistance(journal=[],campaignId=''){
 const resolved=new Set(journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbWeaponResistance)
  .map(j=>j.calendarHerbWeaponResistance.hitProofId));
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbWeaponPasteHit&&!resolved.has(j.id))
  .map(j=>({hitProofId:j.id,...j.calendarHerbWeaponPasteHit}));
}
/** A confirmed poisoned hit must be resisted on its actual combat round. */
export function requireWeaponPoisonResistanceRoundMayAdvance({journal=[],campaignId,timelineId,currentRound,nextRound}={}){
 need(Number.isSafeInteger(currentRound)&&Number.isSafeInteger(nextRound)&&nextRound>currentRound,
  'neplatný přechod bojových kol');
 const outstanding=pendingWeaponPoisonResistance(journal,campaignId).find(p=>p.timelineId===timelineId&&p.round<nextRound);
 need(!outstanding,'nelze přeskočit Resistance Roll k zásahu '+outstanding?.hitEventId+' v kole '+outstanding?.round);
 return true;
}
export function requireWeaponPoisonResistanceGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const outstanding=pendingWeaponPoisonResistance(journal,campaignId).find(p=>p.minute<afterMinute);
 need(!outstanding,'nelze posunout GM čas před Resistance Roll k zásahu '+outstanding?.hitEventId);
 return true;
}
export function createWeaponPoisonResistance({journal=[],campaignId,minute,hitProofId,targetId,
 baseEML,basis,d100,timelineId,round,gmConfirmed=false}={}){
 need(gmConfirmed===true&&typeof campaignId==='string'&&campaignId.length>0&&minuteOk(minute)&&goodId(hitProofId)&&goodId(targetId),
  'chybí potvrzení GM, kampaň, zranění či pacient');
 need(Number.isSafeInteger(baseEML)&&baseEML>=-200&&baseEML<=300,
  'GM musí uvést doložený základní EML (-200 až 300), bez +20');
 need(typeof basis==='string'&&basis.trim().length>=8&&basis.trim().length<=400,
  'GM musí uvést, podle jakého pravidla stanovil základní Resistance EML');
 need(Number.isSafeInteger(d100)&&d100>=1&&d100<=100,'vyžadován skutečný d100 od 1 do 100');
 const hit=journal.find(j=>j.id===hitProofId&&j.calendarCampaignId===campaignId&&j.calendarHerbWeaponPasteHit);
 need(hit&&hit.characterId===targetId&&hit.calendarHerbWeaponPasteHit.targetId===targetId,
  'neexistuje doložený zraňující zásah tohoto pacienta a kampaně');
 need(hit.calendarHerbWeaponPasteHit.resistanceModifier===20,
  'původní +20 bonus pro oběť nesmí být pozměněn');
 need(minute===hit.campaignMinute&&timelineId===hit.calendarHerbWeaponPasteHit.timelineId&&round===hit.calendarHerbWeaponPasteHit.round,
  'Resistance Roll musí proběhnout ve stejné minutě, bojové ose a kole jako zraňující zásah');
 need(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarHerbWeaponResistance?.hitProofId===hitProofId),
  'Resistance Roll k tomuto zásahu již existuje');
 const rawEML=baseEML+20,eml=effectiveMasteryLevel(rawEML),sl=labels[successLevel(d100,rawEML)],resisted=sl==='S'||sl==='CS';
 return {format:PASTE_RESIST_FORMAT,campaignId,minute,hitProofId,targetId,
  pasteId:hit.calendarHerbWeaponPasteHit.pasteId,timelineId,round,
  hitEventId:hit.calendarHerbWeaponPasteHit.hitEventId,
  woundId:hit.calendarHerbWeaponPasteHit.woundId,
  resistanceModifier:20,baseEML,basis:basis.trim(),rawEML,eml,d100,sl,resisted,
  medicalDisposition:resisted?'RESISTED_NO_COURSE':'FAILED_PENDING_GM_POISON_COURSE',
  gmConfirmed:true,sourcePages:[75,186]};
}
export function validateWeaponPoisonResistanceJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  if(row.calendarHerbWeaponResistance){
   const p=row.calendarHerbWeaponResistance;
   need(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&row.characterId===p.targetId,
    'historický záznam odporu neodpovídá pacientovi, času nebo kampani');
   const expected=createWeaponPoisonResistance({journal:prior,campaignId:p.campaignId,minute:p.minute,
    hitProofId:p.hitProofId,targetId:p.targetId,baseEML:p.baseEML,basis:p.basis,d100:p.d100,
    timelineId:p.timelineId,round:p.round,gmConfirmed:p.gmConfirmed});
   need(JSON.stringify(expected)===JSON.stringify(p),'pozměněný původ, bonus, d100, EML či výsledek odporu');
  }
  prior.push(row);
 }
 return true;
}
export function assertWeaponPoisonResistanceAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarHerbWeaponResistance)
  need(JSON.stringify(byId.get(row.id))===JSON.stringify(row),'historický Resistance Roll nelze smazat ani změnit');
 return true;
}
