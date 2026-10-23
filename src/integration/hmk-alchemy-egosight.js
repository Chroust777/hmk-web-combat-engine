/** HMK v1.2 p.271 — touching and identifying artefacts with active Egosight.
 * Uses immutable Imbibing/Decay evidence and the GM's real-world observation.
 * Does not create an inventory object, bypass the GM, or assign a fictitious ML.
 */
import {activeEgosight} from './hmk-alchemy-imbibing.js';
export const EGOSIGHT_TOUCH_FORMAT='hmk-egosight-touch-v1';
const check=(condition,message)=>{if(!condition)throw Error(message)};
const minuteOK=m=>Number.isSafeInteger(m)&&m>=0&&m<=1e9;
/** Historical source AS is referenced rather than copied as an independently mutable pool. */
export function egosightTouchContext({journal=[],campaignId,minute,actorId,auralShockLevels=0}={}){
 check(typeof campaignId==='string'&&campaignId&&minuteOK(minute)&&typeof actorId==='string'&&actorId,
  'Egosight: chybí kampaň, čas nebo příjemce');
 check(Number.isSafeInteger(auralShockLevels)&&auralShockLevels>=0,'Egosight: neznámý Aural Shock');
 const sources=activeEgosight(journal,campaignId,actorId,minute);
 check(sources.every(x=>x.state.nextDueMinute>minute),'Egosight: nejprve vyhodnoťte splatný Decay');
 return {active:sources.length>0&&auralShockLevels===0,suspended:auralShockLevels>0,
  sourceUseIds:sources.map(x=>x.useId),strengths:sources.map(x=>({sourceUseId:x.useId,as:x.state.currentAS}))};
}
/** GM determines observed *existing* artefact facts; Egosight cannot reveal
 * minor powers or the exact Will score of a Will-volition major artefact.
 */
export function createEgosightTouch({journal=[],campaignId,minute,actorId,auralShockLevels=0,
 artefactReference,gmClassification,ego=null,egoSubversion=null,
 touchedConfirmed=false,gmConfirmed=false}={}){
 check(gmConfirmed===true&&touchedConfirmed===true,'Egosight: GM musí potvrdit skutečný dotyk s artefaktem');
 const current=egosightTouchContext({journal,campaignId,minute,actorId,auralShockLevels});
 check(current.active,'Egosight: není využitelný (chybí účinek nebo trvá Aural Shock)');
 check(typeof artefactReference==='string'&&artefactReference.trim().length>=3&&artefactReference.trim().length<=160,
  'Egosight: nutné existující jednoznačné označení dotčeného artefaktu');
 check(['minor','major-ego','major-will'].includes(gmClassification),'Egosight: GM musí určit druh artefaktu');
 if(gmClassification==='major-ego'){
  check(Number.isSafeInteger(ego)&&ego>=0&&ego<=1000&&typeof egoSubversion==='boolean',
   'Egosight: významný artefakt vyžaduje doložené Ego a stav Ego Subversion');
 }else check(ego===null&&egoSubversion===null,
  'Egosight: minor artefakt a major Will nedovolují přidat nevyslovené Ego ani Ego Subversion');
 check(!journal.some(j=>j.calendarCampaignId===campaignId&&j.campaignMinute===minute&&
  j.calendarAlchemyEgosightTouch?.actorId===actorId&&
  j.calendarAlchemyEgosightTouch.artefactReference===artefactReference.trim()),
  'Egosight: tentýž dotyk již má doložený historický výsledek');
 return {format:EGOSIGHT_TOUCH_FORMAT,campaignId,minute,actorId,
  artefactReference:artefactReference.trim(),gmClassification,
  ...(gmClassification==='major-ego'?{ego,egoSubversion}:{}),
  sourceUseIds:current.sourceUseIds,sourceStrengths:current.strengths,
  learnedPowers:false,learnedExactWill:false,auralShockAtObservation:0,
  touchedConfirmed:true,gmConfirmed:true,sourcePage:271};
}
export function validateEgosightTouchJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarAlchemyEgosightTouch;
  if(p){
   check(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.actorId===row.characterId,
    'Egosight: záznam patří do jiné kampaně či postavě');
   const expected=createEgosightTouch({...p,journal:prior,auralShockLevels:0,
    ego:p.ego??null,egoSubversion:p.egoSubversion??null});
   check(JSON.stringify(expected)===JSON.stringify(p),'Egosight: historický artefaktový důkaz byl změněn');
  }
  prior.push(row);
 }
 return true;
}
export function assertEgosightTouchAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarAlchemyEgosightTouch)
  check(JSON.stringify(byId.get(row.id))===JSON.stringify(row),'Egosight: historický důkaz nelze změnit ani smazat');
 return true;
}
