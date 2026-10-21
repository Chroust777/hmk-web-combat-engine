/** HMK v1.2 p.75: a herbal Poison potion can be spread on a blade.
 * Only an actual non-Glancing, injuring edge/point strike can transmit it.
 * Confirmed-hit does not contain the attacking weapon's ID: the GM must
 * explicitly attest that the coated weapon caused the referenced strike.
 * +20 belongs to the victim's Resistance Roll. The book's Poison Course
 * routine contains no unambiguous initial Resistance Roll formula here;
 * do not silently create a Poison Course or substitute an invented test.
 */
import {vialState} from './hmk-herbal-vial-ledger.js';
const need=(v,m)=>{if(!v)throw Error('Poison paste: '+m)};
const minuteOk=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const idOk=s=>typeof s==='string'&&s.length>=3&&s.length<=160;
export const PASTE_FORMAT='hmk-herbal-weapon-paste-v1';
export const PASTE_HIT_FORMAT='hmk-herbal-weapon-paste-hit-v1';
export const PASTE_DISCARD_FORMAT='hmk-herbal-weapon-paste-discard-v1';
function findSource(journal,campaignId,completeId){
 const j=journal.find(x=>x.id===completeId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionComplete);
 need(j&&j.calendarHerbPotionComplete.herbType==='poison'&&j.calendarHerbPotionComplete.usable===true,'chybí skutečný účinný Poison lektvar');
 return j;
}
function outstanding(journal,campaignId){
 const done=new Set(journal.filter(x=>x.calendarCampaignId===campaignId).map(x=>x.calendarHerbWeaponPasteHit?.pasteId||x.calendarHerbWeaponPasteDiscard?.pasteId).filter(Boolean));
 return journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbWeaponPaste&&!done.has(x.id));
}
export function pendingWeaponPoisonPastes(journal=[],campaignId=''){
 return outstanding(journal,campaignId).map(j=>({...j.calendarHerbWeaponPaste,pasteId:j.id}));
}
export function createHerbWeaponPaste({journal=[],inventory=[],campaignId,minute,actorId,completeId,weaponItemId,
 timelineId,round,witnessedHitIds=[],gmConfirmed=false}={}){
 need(gmConfirmed===true&&typeof campaignId==='string'&&campaignId.length>0&&minuteOk(minute)&&typeof actorId==='string'&&actorId.length>0&&idOk(completeId)&&idOk(weaponItemId),
  'GM musí potvrdit zdroj dávky, postavu, zbraň a kampaň');
 need(idOk(timelineId)&&Number.isSafeInteger(round)&&round>=1&&round<=9999,'nanesení během boje vyžaduje doloženou Initiative a kolo');
 need(Array.isArray(witnessedHitIds)&&witnessedHitIds.length<=10000&&witnessedHitIds.every(idOk)&&new Set(witnessedHitIds).size===witnessedHitIds.length,'neplatný přehled již potvrzených zranění');
 const src=findSource(journal,campaignId,completeId),p=src.calendarHerbPotionComplete;
 need(src.campaignMinute<=minute&&minute<p.expiryMinute,'pasta musí pocházet z ještě účinné dávky');
 need(Number.isInteger(p.potency)&&p.potency>=1&&p.potency<=3&&Number.isInteger(p.sv)&&p.sv>=1&&p.sv<15,
  'neplatná potence nebo nedoložená kladná doba nástupu');
 need(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbPotionAdminister?.completeId===completeId||
  x.calendarHerbVialDiscard?.completeId===completeId||x.calendarHerbWeaponPaste?.completeId===completeId)),
  'jedna fyzická dávka nesmí být nanesena, podána či vyřazena dvakrát');
 const vial=vialState(journal,campaignId,completeId,minute);
 need(vial?vial.ownerId===actorId&&['carried','none'].includes(vial.slot):src.characterId===actorId,
  'zdrojovou dávku musí skutečně nést natírající postava');
 const item=inventory.find(x=>x.id===weaponItemId&&x.characterId===actorId);
 need(item&&item.snapshot?.category==='weapon'&&item.quantity===1&&['main_hand','off_hand'].includes(item.slot),
  'natíraná zbraň musí být jeden skutečně vybavený kus v ruce');
 need(!outstanding(journal,campaignId).some(x=>x.calendarHerbWeaponPaste.weaponItemId===weaponItemId),
  'zbraň již nese nevyhodnocenou bylinnou pastu');
 return {format:PASTE_FORMAT,campaignId,minute,actorId,completeId,weaponItemId,
  weaponName:item.snapshot.name,weaponSourceItemId:item.sourceItemId??null,initialSlot:item.slot,timelineId,round,witnessedHitIds:[...witnessedHitIds].sort(),potency:p.potency,sv:p.sv,
  ...(vial?{vialId:vial.vialId,vialBindingId:vial.bindingId}:{}),
  resistanceModifier:20,gmConfirmed:true,sourcePage:75,
  outcome:'COATED_AWAITING_VERIFIED_INJURING_HIT'};
}
function pasteAt(journal,campaignId,pasteId){const row=journal.find(x=>x.id===pasteId&&x.calendarCampaignId===campaignId&&x.calendarHerbWeaponPaste);
 need(row,'neexistuje nanesení této dávky na zbraň');return row;}
export function createHerbWeaponPasteHit({journal=[],campaignId,pasteId,minute,actorId,targetId,weaponItemId,
 targetState,timelineId,round,hitEventId,gmConfirmed=false,weaponWitnessConfirmed=false}={}){
 need(gmConfirmed===true&&weaponWitnessConfirmed===true&&minuteOk(minute)&&idOk(targetId)&&idOk(hitEventId),
  'GM musí doložit skutečně použitou natřenou zbraň a potvrzený zraňující zásah');
 const row=pasteAt(journal,campaignId,pasteId),p=row.calendarHerbWeaponPaste;
 need(p.actorId===actorId&&p.weaponItemId===weaponItemId&&p.timelineId===timelineId&&
  Number.isInteger(round)&&round>=p.round&&minute>=p.minute,
  'zásah nepatří k doloženému nanesení, postavě či bojové ose');
 need(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbWeaponPasteHit?.pasteId===pasteId||
  x.calendarHerbWeaponPasteDiscard?.pasteId===pasteId)), 'tato natřená dávka už byla použita nebo vyřazena');
 need(!p.witnessedHitIds.includes(hitEventId),'zásah byl potvrzen ještě před nanesením pasty');
 need(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbWeaponPasteHit?.hitEventId===hitEventId),
  'tentýž potvrzený zásah již přenesl dávku pasty');
 const hit=targetState?.events?.find(x=>x.id===hitEventId&&x.type==='confirmed-hit');
 need(hit&&hit.round===round&&hit.details?.targetId===targetId&&hit.details?.kind==='injury'&&
  ['e','p','edge','point'].includes(hit.details.aspect)&&idOk(hit.details.woundId),
  'vyžadován skutečný ne-Glancing zraňující Edge/Point confirmed-hit');
 const wound=targetState.wounds?.find(w=>w.id===hit.details.woundId&&w.originEventId===hitEventId);
 need(wound&&wound.recordedRound===round&&wound.timelineId===timelineId&&
  ['e','p','edge','point'].includes(wound.aspect)&&wound.aspect===hit.details.aspect&&
  wound.location===hit.details.location, 'nepotvrzená rána či bojová osa');
 return {format:PASTE_HIT_FORMAT,campaignId,minute,pasteId,completeId:p.completeId,
  actorId,targetId,weaponItemId,hitEventId,woundId:wound.id,timelineId,round,
  aspect:hit.details.aspect,location:hit.details.location,injury:hit.details.injury,sourceEventKind:'confirmed-hit',
  resistanceModifier:20,gmConfirmed:true,weaponWitnessConfirmed:true,
  medicalDisposition:'PENDING_GM_RESISTANCE_ROLL_AND_POISON_COURSE',
  sourcePages:[75,186]};
}
export function createHerbWeaponPasteDiscard({journal=[],campaignId,pasteId,minute,actorId,reason,gmConfirmed=false}={}){
 need(gmConfirmed===true&&minuteOk(minute)&&typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=240,
  'GM musí potvrdit vyřazení nevyužité pasty a důvod');
 const p=pasteAt(journal,campaignId,pasteId).calendarHerbWeaponPaste;
 need(p.actorId===actorId&&minute>=p.minute,'pasta nepatří této postavě či času');
 need(outstanding(journal,campaignId).some(x=>x.id===pasteId),'pasta již byla vyhodnocena');
 return {format:PASTE_DISCARD_FORMAT,campaignId,minute,pasteId,actorId,weaponItemId:p.weaponItemId,
  reason:reason.trim(),gmConfirmed:true,sourcePage:75};
}
export function validateHerbWeaponPasteJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarHerbWeaponPaste;
  if(p){
   need(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&row.characterId===p.actorId,
    'pozměněný původ nanesení');
   const src=findSource(prior,p.campaignId,p.completeId),prev=src.calendarHerbPotionComplete;
   const fake=[{id:p.weaponItemId,characterId:p.actorId,sourceItemId:p.weaponSourceItemId,quantity:1,slot:p.initialSlot,snapshot:{category:'weapon',name:p.weaponName}}];
   const expected=createHerbWeaponPaste({journal:prior,inventory:fake,campaignId:p.campaignId,minute:p.minute,
    actorId:p.actorId,completeId:p.completeId,weaponItemId:p.weaponItemId,timelineId:p.timelineId,
    round:p.round,witnessedHitIds:p.witnessedHitIds,gmConfirmed:p.gmConfirmed});
   need(prev.potency===p.potency&&prev.sv===p.sv&&JSON.stringify(expected)===JSON.stringify(p),'pozměněná dávka nebo zbraň');
  }
  const h=row.calendarHerbWeaponPasteHit;
  if(h){
   need(row.calendarCampaignId===h.campaignId&&row.campaignMinute===h.minute&&row.characterId===h.targetId,
    'cizí kampaň nebo pacient');
   const p0=pasteAt(prior,h.campaignId,h.pasteId).calendarHerbWeaponPaste;
   // Reconstruct the immutable confirmed-hit witness; a past injury may be
   // healed, but its source event remains a signed-off record in this journal.
   const fakeState={events:[{id:h.hitEventId,type:'confirmed-hit',round:h.round,
    details:{targetId:h.targetId,kind:'injury',aspect:h.aspect,location:h.location,woundId:h.woundId,injury:h.injury}}],
    wounds:[{id:h.woundId,originEventId:h.hitEventId,recordedRound:h.round,timelineId:h.timelineId,aspect:h.aspect,location:h.location}]};
   const expected=createHerbWeaponPasteHit({journal:prior,campaignId:h.campaignId,pasteId:h.pasteId,
    minute:h.minute,actorId:h.actorId,targetId:h.targetId,weaponItemId:h.weaponItemId,
    targetState:fakeState,timelineId:h.timelineId,round:h.round,hitEventId:h.hitEventId,
    gmConfirmed:h.gmConfirmed,weaponWitnessConfirmed:h.weaponWitnessConfirmed});
   need(p0.weaponItemId===h.weaponItemId&&JSON.stringify(expected)===JSON.stringify(h),'pozměněné zranění či bonus');
  }
  const d=row.calendarHerbWeaponPasteDiscard;
  if(d){
   need(row.calendarCampaignId===d.campaignId&&row.campaignMinute===d.minute&&row.characterId===d.actorId,
    'cizí odpis');
   const expected=createHerbWeaponPasteDiscard({journal:prior,campaignId:d.campaignId,pasteId:d.pasteId,
    minute:d.minute,actorId:d.actorId,reason:d.reason,gmConfirmed:d.gmConfirmed});
   need(JSON.stringify(expected)===JSON.stringify(d),'pozměněný odpis');
  }
  prior.push(row);
 }
 return true;
}
export function assertHerbWeaponPasteAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarHerbWeaponPaste||row.calendarHerbWeaponPasteHit||row.calendarHerbWeaponPasteDiscard)
  need(JSON.stringify(byId.get(row.id))===JSON.stringify(row),'historický důkaz pasty nelze přepsat či smazat');
 return true;
}
export function assertActiveHerbWeaponPastes(data){
 const clock=data.campaignClock;if(!clock)return true;
 const key=clock.campaignId;
 for(const p of pendingWeaponPoisonPastes(data.journal,key)){
  const item=data.inventory.find(x=>x.id===p.weaponItemId);
  need(item&&item.characterId===p.actorId&&item.snapshot?.category==='weapon'&&item.snapshot.name===p.weaponName&&
   (item.sourceItemId??null)===p.weaponSourceItemId&&item.quantity===1&&
   ['main_hand','off_hand'].includes(item.slot),
   'Natřenou zbraň nelze předat, zahodit či přesunout, dokud GM nedoloží zraňující zásah nebo odpis pasty');
 }
 return true;
}
