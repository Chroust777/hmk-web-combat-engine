/** Cross-ledger hand-off, HMK pp.120–121,147,186.
 * A found water-day is not drunk when placed into a carried waterskin.
 * Debit the actual Foraging lot once, then create a physically weighed
 * half-gallon fill. Both proofs commit atomically in the same campaign-minute.
 * No new HMK rule, water source, inventory stack or campaign time is created.
 */
import {createSupplyUse,availableSupplyLots} from './hmk-foraging-supply-ledger.js';
import {createPotableWaterFill} from './hmk-physical-water-ledger.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function createForagingWaterStorage({inventory=[],journal=[],campaignId,actorId,minute,itemId,
 sourceId,resultIndex,fillId,useId,gmConfirmed=false}={}){
 check(typeof fillId==='string'&&fillId&&typeof useId==='string'&&useId&&fillId!==useId&&
  !journal.some(j=>j.id===fillId||j.id===useId),'Převod potřebuje dva nové auditní identifikátory');
 const lot=availableSupplyLots(journal,campaignId).find(l=>l.sourceId===sourceId&&
  l.resultIndex===resultIndex&&l.unit==='waterDays'&&l.minute<=minute&&l.remaining>=0.5);
 check(lot,'Zvolený Foraging již nemá půl dne vody, není v této kampani, nebo vznikne teprve později');
 const proof=createSupplyUse({journal,campaignId,minute,sourceId,resultIndex,unit:'waterDays',quantity:0.5,
  actorId,disposition:'stored-in-container',containerFillId:fillId});
 const fill=createPotableWaterFill({inventory,journal,campaignId,actorId,minute,itemId,
  gmConfirmed,waterSource:`Foraging ${sourceId} · výsledek ${resultIndex+1}`,foragingSupplyUseId:useId});
 return {use:proof,fill};
}
/** Validate one-to-one provenance, same actor/timestamp/campaign and replay order.
 * A missing partner or a mismatched water receipt is never silently ignored. */
export function validateForagingWaterStorageJournal(journal=[]){
 const debits=new Map(),fills=new Map(),index=new Map();
 for(let i=0;i<journal.length;i++){
  const row=journal[i];index.set(row.id,i);
  if(row.calendarForagingSupplyUse?.disposition==='stored-in-container'){
   check(!debits.has(row.id),'Duplicitní důkaz uložení Foraging vody');debits.set(row.id,row);
  }
  if(row.calendarInventoryWaterFill?.foragingSupplyUseId){
   check(!fills.has(row.id),'Duplicitní důkaz naplnění vody');fills.set(row.id,row);
  }
 }
 const matched=new Set();
 for(const [fillId,row] of fills){
  const f=row.calendarInventoryWaterFill,origin=debits.get(f.foragingSupplyUseId),p=origin?.calendarForagingSupplyUse;
  check(origin&&p&&p.containerFillId===fillId&&p.unit==='waterDays'&&p.quantity===0.5&&
   p.actorId===row.characterId&&origin.characterId===row.characterId&&
   origin.calendarCampaignId===row.calendarCampaignId&&origin.campaignMinute===row.campaignMinute&&
   f.campaignId===row.calendarCampaignId&&f.minute===row.campaignMinute&&
   index.get(origin.id)<index.get(row.id)&&!matched.has(origin.id),
   'Nepárový, cizí nebo časově nesouhlasící převod Foraging vody do měchu');
  matched.add(origin.id);
 }
 check(matched.size===debits.size,'Převod z Foraging nemá odpovídající doložené naplnění Waterskin');
 return true;
}
