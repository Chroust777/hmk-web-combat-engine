/** HMK v1.2 p.75: read-only bridge between an attested Curative application
 * and the ORIGINAL injury Healing / Infection Course engines.
 * No new health state, dice, clock update, or inferred injury assignment.
 * If multiple applications to one wound exist, do not invent stacking rules.
 */
import {CURATIVE_AREA_DOSES,curativeAreaBonus,validateHerbAdministrationJournal} from './hmk-herbal-administration.js?v=94.031';
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
 const first=rows[0].calendarHerbPotionAdminister;
 ensure(first.curativeAreaGroup
   ?rows.length===CURATIVE_AREA_DOSES&&rows.every(row=>row.calendarHerbPotionAdminister.curativeAreaGroup===first.curativeAreaGroup)
   :rows.length===1,
  'Curative: pro jednu ránu existuje více podání; HMK neurčuje automatické sčítání bonusů. Rozhodne GM.');
 ensure(rows.every(row=>row.calendarHerbPotionAdminister.minute>=woundOnsetMinute&&row.calendarHerbPotionAdminister.method==='poultice'),
  'Curative: podání musí patřit k této již vzniklé ráně');
 return {bonus:first.curativeAreaGroup?curativeAreaBonus(rows.map(row=>row.calendarHerbPotionAdminister)):first.bonus,sourceIds:rows.map(row=>row.id),completeIds:rows.map(row=>row.calendarHerbPotionAdminister.completeId),sourcePage:75};
}
