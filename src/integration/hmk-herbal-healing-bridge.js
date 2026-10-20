/** HMK v1.2 p.75: read-only bridge between an attested Curative application
 * and the ORIGINAL injury Healing / Infection Course engines.
 * No new health state, dice, clock update, or inferred injury assignment.
 * If multiple applications to one wound exist, do not invent stacking rules.
 */
import {herbPotionStageBonus,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const ensure=(ok,message)=>{if(!ok)throw Error(message)};
const safeMinute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
export function curativeHealingEvidence({journal=[],campaignId,minute,targetId,woundId,woundOnsetMinute}={}){
 ensure(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&safeMinute(minute)&&
  typeof targetId==='string'&&targetId&&typeof woundId==='string'&&woundId&&safeMinute(woundOnsetMinute),
  'Curative: chybí doložená kampaň, rána či čas jejího vzniku');
 ensure(woundOnsetMinute<=minute,'Curative: rána ještě nevznikla');
 const rows=journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbPotionAdminister?.herbType==='curative'&&
  x.calendarHerbPotionAdminister.targetId===targetId&&x.calendarHerbPotionAdminister.woundId===woundId&&x.campaignMinute<=minute);
 if(!rows.length)return {bonus:0,sourceIds:[],sourcePage:75};
 // Revalidate the persisted source chain, not merely the stored numeric bonus.
 validateHerbAdministrationJournal(journal);
 ensure(rows.length===1,'Curative: pro jednu ránu existuje více podání; HMK neurčuje automatické sčítání bonusů. Rozhodne GM.');
 const row=rows[0],p=row.calendarHerbPotionAdminister;
 ensure(row.campaignMinute===p.minute&&p.campaignId===campaignId&&p.minute>=woundOnsetMinute&&
  row.characterId===p.actorId&&p.method==='poultice',
  'Curative: nesoulad časové osy nebo původu aplikace k dané ráně');
 const complete=journal.find(x=>x.id===p.completeId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionComplete);
 ensure(complete&&complete.calendarHerbPotionComplete.usable&&complete.campaignMinute<=p.minute&&
  Number.isSafeInteger(complete.calendarHerbPotionComplete.expiryMinute)&&p.minute<complete.calendarHerbPotionComplete.expiryMinute,
  'Curative: chybí včas dokončený účinný lektvar');
 const value=herbPotionStageBonus(complete.calendarHerbPotionComplete.sv,complete.calendarHerbPotionComplete.potency);
 ensure(Number.isSafeInteger(value)&&value>0&&p.bonus===value,'Curative: uložený bonus neodpovídá výrobnímu Herblore SV');
 return {bonus:value,sourceIds:[row.id],completeIds:[complete.id],sourcePage:75};
}
