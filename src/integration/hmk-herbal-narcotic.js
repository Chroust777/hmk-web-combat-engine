/** HMK v1.2 p75: Narcotic lowers pain, increasing Shock Roll EML, but
 * decreasing Move, AGL and AGL-based skills by HALF that same bonus.
 * Each potency stage lasts four hours (240 minutes). Provenance is strictly
 * the immutable journal; a read-only projection never changes GM time.
 */
import {herbPotionEffectAt,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const need=(ok,msg)=>{if(!ok)throw Error('Narcotic: '+msg)};
const minuteOK=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
export function narcoticEvidence({journal=[],campaignId,minute,targetId}={}){
 need(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&minuteOK(minute)&&
  typeof targetId==='string'&&targetId,'chybí kampaň, čas GM nebo příjemce');
 const rows=journal.filter(r=>r.calendarCampaignId===campaignId&&r.campaignMinute<=minute&&
  r.calendarHerbPotionAdminister?.herbType==='narcotic'&&
  r.calendarHerbPotionAdminister.targetId===targetId);
 if(!rows.length)return {bonus:0,movePenalty:0,agilityPenalty:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 validateHerbAdministrationJournal(journal);
 const active=[];
 for(const row of rows){
  const p=row.calendarHerbPotionAdminister;
  need(p.campaignId===campaignId&&p.minute===row.campaignMinute&&p.method==='ingested',
   'chybí shodný doklad požití');
  const made=journal.find(r=>r.id===p.completeId&&r.calendarCampaignId===campaignId&&
   r.calendarHerbPotionComplete&&r.campaignMinute<=p.minute);
  need(made&&made.calendarHerbPotionComplete.usable&&p.minute<made.calendarHerbPotionComplete.expiryMinute,
   'chybí účinný doložený výrobní zdroj');
  const effect=herbPotionEffectAt(p,minute);
  if(effect.status==='active')active.push({bonus:effect.bonus,stage:effect.stage,sourceId:row.id,completeId:made.id});
 }
 need(active.length<=1,'více současně aktivních dávek nemá doložené pravidlo sčítání; rozhodne GM');
 if(!active.length)return {bonus:0,movePenalty:0,agilityPenalty:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 const a=active[0];
 return {bonus:a.bonus,movePenalty:a.bonus/2,agilityPenalty:a.bonus/2,stage:a.stage,
  sourceIds:[a.sourceId],completeIds:[a.completeId],sourcePage:75};
}
/** Preserve the fractional half-penalty in the proof. Integer move is rounded
 * down only at the spatial resolver boundary; that engine accepts whole feet.
 */
export function narcoticMovement({baseMove,evidence}={}){
 need(Number.isSafeInteger(baseMove)&&baseMove>=0&&baseMove<=100000&&evidence&&
  Number.isFinite(evidence.movePenalty)&&evidence.movePenalty>=0,'neověřený Move nebo intoxikace');
 return {rawEffectiveMove:Math.max(0,baseMove-evidence.movePenalty),
  effectiveMove:Math.floor(Math.max(0,baseMove-evidence.movePenalty)),
  movePenalty:evidence.movePenalty,sourceIds:[...evidence.sourceIds]};
}
/** Shock result is resolved by the EXISTING persistent-combat Shock procedure.
 * This function computes only its evidence-backed additive modifier. */
export function narcoticShockEML({shockML,fatigue,rerollPenalty=0,evidence}={}){
 need(Number.isSafeInteger(shockML)&&shockML>=0&&shockML<=200&&
  Number.isSafeInteger(fatigue)&&fatigue>=0&&Number.isSafeInteger(rerollPenalty)&&
  (rerollPenalty===0||rerollPenalty===20)&&evidence&&Number.isSafeInteger(evidence.bonus),
  'Shock potřebuje doložené ML, Fatigue a aktivní výsledek Narcotic');
 const rawEML=shockML-fatigue-rerollPenalty+evidence.bonus;
 return {rawEML,effectiveEML:Math.max(5,Math.min(95,rawEML)),
  bonus:evidence.bonus,sourceIds:[...evidence.sourceIds],sourcePage:75};
}
