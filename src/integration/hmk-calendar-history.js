/** The calendar's read-only, evidence-backed history of actual completed
 * HMK actions. Never mistake elapsed calendar time for a resolved test.
 * Only committed rule proofs with a verified campaign minute are displayed;
 * an unfinished wound, poison episode, etc. retains its own pending event.
 */
import {projectedCalendarJournal,calendarMemberIds} from './hmk-calendar-campaign-lifecycle.js';
const safeMinute=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
export function historicalHMKCalendarEntries(clock,characters=[],journal=[]){
 if(!clock)return [];
 const allowed=new Map(calendarMemberIds(clock,characters).map(c=>[c.id,c.name]));
 const seen=new Set(),out=[];
 for(const entry of projectedCalendarJournal(clock,journal)){
  if(!entry||typeof entry.id!=='string'||!entry.id||seen.has(entry.id)||
    (entry.calendarCampaignId&&clock.campaignId&&entry.calendarCampaignId!==clock.campaignId&&!clock.journalMinuteEvidence?.some(e=>e.id===entry.id))||
    !allowed.has(entry.characterId)||!safeMinute(entry.campaignMinute)||
    entry.campaignMinute>clock.minute)continue;
  const skill=entry.skillTestProof,combat=entry.combatProof,special=entry.specialOutcomeProof;
  // Ordinary free-text GM notes and unverified timestamps are NOT marked done.
  if(!skill&&!combat&&!special)continue;
  seen.add(entry.id);
  const name=allowed.get(entry.characterId),
   action=skill?.type||combat?.actionKind||special?.kind||'pravidlový výsledek',
   original=typeof entry.title==='string'&&entry.title.trim()?entry.title.trim():action;
  out.push({id:'history:'+encodeURIComponent(entry.id),origin:'history',
   characterId:entry.characterId,name,kind:skill?'skill-result':combat?'combat-result':'special-result',
   sourceId:entry.id,title:original,description:action,
   note:'Uložený výsledek konkrétního pravidlového kroku. Navazující léčba a další povinnosti se evidují samostatně.',
   minute:entry.campaignMinute,dueMinute:entry.campaignMinute,status:'resolved',
   destination:'notes'});
 }
 return out.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
}
