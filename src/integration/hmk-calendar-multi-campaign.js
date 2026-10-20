/** Concurrent campaign calendars without changing the single authoritative
 * active campaignClock consumed by the existing rules engines. Inactive
 * calendars are dormant, unmodified snapshots. Switching is an atomic swap.
 * Characters may only belong to one live calendar: their persistent HMK
 * condition/history is shared, not a per-campaign clone.
 */
import {validateCampaignCalendar,assertCampaignCalendarAppendOnly} from './hmk-campaign-calendar.js';
const fail=(msg)=>{throw Error(msg)};
export function campaignKey(clock){return clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;}
export function allCampaignClocks(database){return [...(database.campaignClock?[database.campaignClock]:[]),...(database.campaignClocks||[])];}
export function validateCampaignPortfolio(database){
 const inactive=database.campaignClocks??[];
 if(!Array.isArray(inactive)||inactive.length>49)fail('Příliš mnoho kalendářů kampaní (nejvýše 50)');
 const used=new Set(),members=new Set();
 for(const clock of allCampaignClocks(database)){
  validateCampaignCalendar(clock);
  const key=campaignKey(clock);
  if(!key||used.has(key))fail('Duplicitní identifikátor kalendáře');used.add(key);
  for(const id of clock.characterIds??(database.characters||[]).map(c=>c.id)){
   if(members.has(id))fail('Postava je již zahrnuta v jiném kalendáři. Pro oddělené kampaně použijte kopii postavy.');
   members.add(id);
  }
 }
 return true;
}
export function availableCampaignCharacters(database,except=null){
 const occupied=new Set(allCampaignClocks(database).filter(c=>campaignKey(c)!==except).flatMap(c=>c.characterIds??(database.characters||[]).map(a=>a.id)));
 return (database.characters||[]).filter(c=>!occupied.has(c.id));
}
export function switchCampaign(database,key){
 validateCampaignPortfolio(database);
 const next=structuredClone(database);
 if(campaignKey(next.campaignClock)===key)return next;
 const i=(next.campaignClocks||[]).findIndex(c=>campaignKey(c)===key);
 if(i<0)fail('Kalendář nebyl nalezen');
 const chosen=next.campaignClocks.splice(i,1)[0];
 if(next.campaignClock)next.campaignClocks.push(next.campaignClock);
 next.campaignClock=chosen;
 validateCampaignPortfolio(next);return next;
}
export function beginAdditionalCalendar(database,clock){
 validateCampaignCalendar(clock);
 const next=structuredClone(database);
 next.campaignClocks??=[];
 if(next.campaignClock)next.campaignClocks.push(next.campaignClock);
 next.campaignClock=clock;
 validateCampaignPortfolio(next);return next;
}
/** The original append-only validator is applied to every matching calendar.
 * Removal is legal only when its original time evidence was archived.
 */
export function assertCampaignPortfolioAppendOnly(before,after){
 validateCampaignPortfolio(after);
 const previous=allCampaignClocks(before),present=new Map(allCampaignClocks(after).map(c=>[campaignKey(c),c]));
 for(const clock of previous){
  const next=present.get(campaignKey(clock));
  if(next){assertCampaignCalendarAppendOnly({campaignClock:clock},{campaignClock:next});continue;}
  assertCampaignCalendarAppendOnly({campaignClock:clock,calendarEvidenceArchives:before.calendarEvidenceArchives},
   {calendarEvidenceArchives:after.calendarEvidenceArchives});
 }
 return true;
}
/** A ruled time-bound change must be recorded against the actor's own active
 * campaign. This rejects changes that would otherwise borrow another
 * campaign's clock, while allowing ordinary editing of the character sheet.
 */
export function assertCampaignActorTimeIsolation(before,after){
 if(!after.campaignClock)return true;
 const ids=new Set(after.campaignClock.characterIds??(after.characters||[]).map(c=>c.id));
 const oldPeople=new Map((before.characters||[]).map(c=>[c.id,c]));
 const signature=c=>JSON.stringify({combat:c?.hmk?.combatState??null,
  magic:c?.hmk?.liveEffects??null,aural:c?.hmk?.arcane?.auralShockLevels??null,
  psyche:c?.hmk?.arcane?.psycheTraumas??null});
 for(const c of after.characters||[]){
  const old=oldPeople.get(c.id);
  if(!old||ids.has(c.id))continue;
  if(signature(old)!==signature(c))fail(`Postava ${c.name} není v právě otevřené kampani. Před pravidlovým zápisem otevřete její kalendář, jinak by se použil chybný čas.`);
 }
 return true;
}
