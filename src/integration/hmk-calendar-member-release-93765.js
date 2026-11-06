/** GM offboarding from calendar monitoring. Not a combat/healing roll.
 * A removed actor ceases to acquire medical obligations; historical journal
 * and health event evidence remain immutable. Death (KIA) survives removal.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
const need=(ok,msg)=>{if(!ok)throw Error('Vyřazení z kalendáře: '+msg)};
export const MEMBER_RELEASE_FORMAT_93765='hmk-calendar-member-release-v93.765';
export function releaseCalendarMembers93765(database,ids,{campaignId,minute,idFactory,stamp,gmConfirmed=false}={}){
 need(database&&Array.isArray(database.characters)&&Array.isArray(database.journal), 'chybí kampaň');
 need(gmConfirmed===true,'GM musí výslovně potvrdit vyřazení');
 need(typeof campaignId==='string'&&campaignId&&Number.isSafeInteger(minute)&&minute>=0,'neplatná časová kotva');
 need(typeof idFactory==='function'&&typeof stamp==='function','chybí identifikátor potvrzení');
 need(Array.isArray(ids)&&new Set(ids).size===ids.length,'neplatný nebo duplicitní výběr');
 const roster=new Set(database.campaignClock?.characterIds||[]);
 const out=[];
 for(const id of ids){
  need(roster.has(id),'postava již není účastníkem');
  const actor=database.characters.find(c=>c.id===id);
  need(!!actor,'postava neexistuje');
  const h=actor.hmk??={};
  const before=structuredClone(h.healthState??initialCombatState());
  validateCombatState(before);
  const wasKIA=before.shock==='KIA';
  const oldInjuries=structuredClone(h.injuries??[]);
  const oldExpedition=structuredClone(h.expedition??null);
  const after=initialCombatState();
  after.shock=wasKIA?'KIA':'NONE';
  // Preserve the original medical event stream as read-only provenance.
  // A number of historical treatment/alchemy receipts refer to these IDs.
  // The live health projection has NO wounds, conditions or due test.
  after.events=structuredClone(before.events);
  validateCombatState(after);
  const receipt={format:MEMBER_RELEASE_FORMAT_93765,campaignId,minute,
   actorId:id,previousShock:before.shock,resultShock:after.shock,
   historicalEventCount:before.events.length,gmConfirmed:true};
  h.healthState=after;h.injuries=[];h.expedition={claims:{}};
  // Confirmed historical proof is preserved in the chronological journal,
  // rather than a second competing live Health State on the character.
  const rowId=idFactory();
  database.journal.push({id:rowId,characterId:id,calendarCampaignId:campaignId,
   campaignMinute:minute,createdAt:stamp(),title:'GM · ukončení sledování v kalendáři',
   body:'GM vyřadil postavu z povinného zdravotního sledování. '+
    (wasKIA?'Stav KIA trvá.':'Aktuální stav Healthy.')+
    ' Bez nového hodu a bez posunu času; dosavadní historie zůstává zachována.',
   calendarMemberRelease:receipt,
   calendarMemberReleaseArchive:{healthState:before,injuries:oldInjuries,expedition:oldExpedition}});
  out.push(receipt);
 }
 return out;
}
