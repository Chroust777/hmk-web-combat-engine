/** HMK v1.2 pp.75,178: Coagulant modifies only the Strength-based Blood
 * Loss Advance Roll of the named bleeder, NOT Physician/Blood Stoppage.
 * The round/minute relationship must be witnessed at application and must
 * still agree with the GM-controlled campaign clock at each subsequent roll.
 * Pure read-only evidence projection; never moves either clock or rolls dice.
 */
import {herbPotionEffectAt,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const requireProof=(ok,msg)=>{if(!ok)throw Error('Coagulant: '+msg);};
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function coagulantBleedingEvidence({journal=[],campaignId,minute,targetId,woundId,
 combatRound,timelineId}={}){
 requireProof(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&
  typeof targetId==='string'&&targetId&&typeof woundId==='string'&&woundId&&
  whole(combatRound,1,9999)&&typeof timelineId==='string'&&timelineId,
  'chybí jednoznačná kampaň, pacient, rána, minuta GM nebo bojová časová osa');
 const relevant=journal.filter(j=>j.calendarCampaignId===campaignId&&
  j.calendarHerbPotionAdminister?.herbType==='coagulant'&&
  j.calendarHerbPotionAdminister.targetId===targetId&&
  j.calendarHerbPotionAdminister.woundId===woundId&&j.campaignMinute<=minute);
 if(!relevant.length)return {bonus:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 validateHerbAdministrationJournal(journal);
 const active=[];
 for(const row of relevant){
  const p=row.calendarHerbPotionAdminister;
  requireProof(row.characterId===p.actorId&&p.minute===row.campaignMinute&&p.campaignId===campaignId,
   'nesoulad identity nebo času podání');
  const complete=journal.find(j=>j.id===p.completeId&&j.calendarCampaignId===campaignId&&j.calendarHerbPotionComplete);
  requireProof(complete&&complete.campaignMinute<=p.minute&&complete.calendarHerbPotionComplete.usable&&
   p.minute<complete.calendarHerbPotionComplete.expiryMinute,'nedoložený platný výrobní zdroj');
  const effect=herbPotionEffectAt(p,minute);
  if(effect.status!=='active')continue;
  const a=p.combatAnchor;
  requireProof(a&&a.confirmedByGM===true&&a.campaignMinute===p.minute&&
   whole(a.round,1,9999)&&typeof a.timelineId==='string'&&a.timelineId,
   'u aktivního podání chybí GM ověřená vazba na bojové kolo; nepoužívejte nedoložený bonus');
  requireProof(a.timelineId===timelineId&&combatRound>=a.round,
   'podání pochází z jiného střetnutí nebo z budoucího bojového kola');
  // One round is five seconds (p.161). An exact integral five-minute period
  // therefore requires 60 rounds AND five confirmed campaign minutes.
  const elapsedWholeMinutes=Math.floor((combatRound-a.round)/12);
  requireProof(minute===a.campaignMinute+elapsedWholeMinutes,
   'bojová kola a potvrzený čas GM nesouhlasí; nejprve opravte časovou osu');
  active.push({bonus:effect.bonus,stage:effect.stage,sourceId:row.id,completeId:complete.id,
   administrationMinute:p.minute,combatRound:a.round,timelineId:a.timelineId});
 }
 requireProof(active.length<=1,'více současně aktivních podání pro tutéž ránu nemá doložené sčítání; rozhodne GM');
 if(!active.length)return {bonus:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 const x=active[0];
 return {bonus:x.bonus,stage:x.stage,sourceIds:[x.sourceId],completeIds:[x.completeId],
  sourcePage:75,applicationMinute:x.administrationMinute,applicationRound:x.combatRound,timelineId};
}
