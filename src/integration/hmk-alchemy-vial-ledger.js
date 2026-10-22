/** HMK v1.2 p.268: a liquid elixir occupies one *existing* physical vial.
 * Its stated full mass (0.5 lb) is projected into the existing ENC pipeline,
 * never written over the printed empty-vial catalogue definition (0.25 lb).
 * Only the existing inventory, chest and disposition operations move items.
 */
import {PRINTED_VIAL} from './hmk-herbal-vial-ledger.js';
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
export const ALCHEMY_VIAL_FORMAT='hmk-alchemy-vial-binding-v1';
export const ALCHEMY_VIAL_EMPTY_FORMAT='hmk-alchemy-vial-empty-v1';
export const ALCHEMY_VIAL_FULL_LB=0.5;
const EMPTY_LB=0.25;
const check=(x,m)=>{if(!x)throw Error(m)};
const validMinute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
const campaignRows=(journal,c)=>journal.filter(j=>j.calendarCampaignId===c);
export function alchemyVialBinding(journal=[],campaignId,finishId){
 return campaignRows(journal,campaignId).find(j=>j.calendarAlchemyVialBinding?.finishId===finishId)||null;
}
export function alchemyVialState(journal=[],campaignId,finishId,minute=1e9){
 const binding=alchemyVialBinding(journal,campaignId,finishId);
 if(!binding)return null;
 const b=binding.calendarAlchemyVialBinding;
 check(validMinute(minute)&&minute>=b.minute,'Alchemy Vial: neplatná časová hranice');
 let ownerId=b.actorId,slot=b.initialSlot,emptied=false;
 const startIndex=journal.indexOf(binding);
 for(let i=startIndex+1;i<journal.length;i++){
  const row=journal[i];if(row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  const d=row.calendarInventoryDisposition;
  if(d?.sourceItemId===b.vialId){
   check(d.kind==='transfer'&&d.resultItemId===b.vialId&&d.quantity===1&&d.actorId===ownerId,
    'Alchemy Vial: naplněná nádoba byla odstraněna či rozdělena');
   ownerId=d.recipientId;slot='carried';
  }
  const c=row.calendarChestTransfer;
  if(c?.sourceItemId===b.vialId){
   check(c.movedItemId===b.vialId&&c.quantity===1&&c.split===false&&c.actorId===ownerId&&c.fromSlot===slot,
    'Alchemy Vial: neplatný přesun nebo rozdělení v Truhlici');
   slot=c.toSlot;
  }
  if(row.calendarAlchemyVialEmpty?.finishId===finishId){
   check(!emptied,'Alchemy Vial: dvojí vyprázdnění');emptied=true;
  }
 }
 return {bindingId:binding.id,finishId,vialId:b.vialId,ownerId,slot,emptied,full:!emptied};
}
function activeOtherFilling(journal,campaignId,vialId,minute){
 for(const row of journal){
  const a=row.calendarAlchemyVialBinding;
  if(row.calendarCampaignId!==campaignId||!a||a.vialId!==vialId||a.minute>minute)continue;
  if(alchemyVialState(journal,campaignId,a.finishId,minute).full)return true;
 }
 // Previously issued herbal potions use the same printed container; never
 // overlap an active herbal dose even though its contents mass is unspecified.
 for(const row of journal){
  const b=row.calendarHerbVialBinding;
  if(row.calendarCampaignId!==campaignId||!b||b.vialId!==vialId||b.minute>minute)continue;
  const done=journal.find(j=>j.id===b.completeId&&j.calendarCampaignId===campaignId)?.calendarHerbPotionComplete;
  if(!done||minute>=done.expiryMinute)continue;
  if(!campaignRows(journal,campaignId).some(j=>j.calendarHerbPotionAdminister?.completeId===b.completeId||
     j.calendarHerbVialDiscard?.completeId===b.completeId||j.calendarHerbWeaponPaste?.completeId===b.completeId))return true;
 }
 return false;
}
const inventoryVial=(inventory,id,owner)=>inventory.find(x=>x.id===id&&x.characterId===owner&&
 x.sourceItemId===PRINTED_VIAL&&x.snapshot?.properties?.weightLb===EMPTY_LB&&
 x.quantity===1&&['none','carried','chest'].includes(x.slot));
/** The GM may make a later affidavit about storage at preparation completion;
 * no historical inventory/clock record is silently backdated. */
export function createAlchemyVialBinding({journal=[],inventory=[],campaignId,minute,actorId,finishId,vialId,
 confirmedByGM=false,storageAtCompletionConfirmed=false,liquidConfirmed=false,material=null,corkConfirmed=false}={}){
 check(confirmedByGM===true&&storageAtCompletionConfirmed===true,
  'GM musí potvrdit skutečnou nádobu i její uložení při dokončení elixíru');
 check(liquidConfirmed===true&&['glass','ceramic'].includes(material)&&corkConfirmed===true,
  'HMK 268: GM musí potvrdit tekutý elixír, skleněnou/keramickou nádobu a korkovou zátku');
 check(typeof campaignId==='string'&&campaignId&&validMinute(minute)&&typeof actorId==='string'&&actorId&&
  typeof vialId==='string'&&vialId,'Alchemy Vial: chybí kampaň, čas nebo nádoba');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 check(state.actorId===actorId&&minute>=state.completedMinute,
  'Alchemy Vial: výrobek nepatří postavě nebo zatím nebyl dokončen');
 check(state.elixirName!=='Fumebomb','HMK 268: Fumebomb je plynný elixír, nikoli běžná tekutina v 4 oz vial');
 check(!alchemyVialBinding(journal,campaignId,finishId),'Alchemy Vial: výrobek již má doloženou fyzickou nádobu');
 const item=inventoryVial(inventory,vialId,actorId);
 check(item&&['carried','none'].includes(item.slot),'Alchemy Vial: nutná samostatná prázdná nesená Vial, 4 oz (1 ks)');
 check(!activeOtherFilling(journal,campaignId,vialId,minute),'Alchemy Vial: nádoba již obsahuje jiný elixír nebo bylinnou dávku');
 return {format:ALCHEMY_VIAL_FORMAT,campaignId,minute,actorId,finishId,vialId,
  printedCatalogId:PRINTED_VIAL,quantity:1,initialSlot:item.slot,
  emptyWeightLb:EMPTY_LB,fullWeightLb:ALCHEMY_VIAL_FULL_LB,
  sealedAtCompletionConfirmed:true,liquidConfirmed:true,material,corkConfirmed:true,confirmedByGM:true,sourcePage:268};
}
export function createAlchemyVialEmpty({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 reason='',confirmedByGM=false}={}){
 check(confirmedByGM===true&&validMinute(minute),'Alchemy Vial: GM musí potvrdit skutečné vyprázdnění');
 check(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=240,
  'Alchemy Vial: je nutný doložený důvod vyprázdnění (3–240 znaků)');
 const state=alchemyVialState(journal,campaignId,finishId,minute);
 check(state&&state.full&&state.ownerId===actorId&&['none','carried'].includes(state.slot),
  'Alchemy Vial: obsah smí vyprázdnit jen aktuální vlastník s fyzickou lahvičkou mimo Truhlici');
 check(inventoryVial(inventory,state.vialId,actorId)?.slot===state.slot,
  'Alchemy Vial: před vyprázdněním chybí skutečná nádoba');
 return {format:ALCHEMY_VIAL_EMPTY_FORMAT,campaignId,minute,actorId,finishId,
  vialId:state.vialId,bindingId:state.bindingId,reason:reason.trim(),confirmedByGM:true,
  emptyVialRetained:true,sourcePage:268};
}
export function projectAlchemyVialInventory(inventory=[],journal=[],campaignId,minute){
 if(!campaignId||!validMinute(minute))return inventory;
 const full=new Set();
 for(const row of journal){
  const p=row.calendarAlchemyVialBinding;
  if(row.calendarCampaignId!==campaignId||!p||p.minute>minute)continue;
  const state=alchemyVialState(journal,campaignId,p.finishId,minute);
  if(state.full)full.add(state.vialId);
 }
 return inventory.map(item=>full.has(item.id)?{...item,snapshot:{...item.snapshot,
  properties:{...item.snapshot.properties,weightLb:ALCHEMY_VIAL_FULL_LB}}}:item);
}
export function validateAlchemyVialJournal(journal=[]){
 const earlier=[];
 for(const row of journal){
  const b=row.calendarAlchemyVialBinding,e=row.calendarAlchemyVialEmpty;
  if(b){
   check(b.campaignId===row.calendarCampaignId&&b.actorId===row.characterId&&b.minute===row.campaignMinute,
    'Alchemy Vial: poškozený kontext historického naplnění');
   const inv=[{id:b.vialId,characterId:b.actorId,sourceItemId:b.printedCatalogId,
    quantity:b.quantity,slot:b.initialSlot,snapshot:{properties:{weightLb:b.emptyWeightLb}}}];
   const reproduced=createAlchemyVialBinding({journal:earlier,inventory:inv,
    campaignId:b.campaignId,minute:b.minute,actorId:b.actorId,finishId:b.finishId,vialId:b.vialId,
    confirmedByGM:b.confirmedByGM,storageAtCompletionConfirmed:b.sealedAtCompletionConfirmed,
    liquidConfirmed:b.liquidConfirmed,material:b.material,corkConfirmed:b.corkConfirmed});
   check(JSON.stringify(reproduced)===JSON.stringify(b),'Alchemy Vial: přepsaný důkaz fyzické nádoby');
  }
  if(e){
   check(e.campaignId===row.calendarCampaignId&&e.actorId===row.characterId&&e.minute===row.campaignMinute,
    'Alchemy Vial: poškozený kontext vyprázdnění');
   const state=alchemyVialState(earlier,e.campaignId,e.finishId,e.minute);
   const inv=state?[{id:state.vialId,characterId:state.ownerId,sourceItemId:PRINTED_VIAL,
    quantity:1,slot:state.slot,snapshot:{properties:{weightLb:EMPTY_LB}}}]:[];
   const reproduced=createAlchemyVialEmpty({journal:earlier,inventory:inv,campaignId:e.campaignId,
    minute:e.minute,actorId:e.actorId,finishId:e.finishId,reason:e.reason,confirmedByGM:e.confirmedByGM});
   check(JSON.stringify(reproduced)===JSON.stringify(e),'Alchemy Vial: přepsaný důkaz vyprázdnění');
  }
  earlier.push(row);
 }
 return true;
}
export function assertAlchemyVialAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarAlchemyVialBinding||row.calendarAlchemyVialEmpty)
  check(JSON.stringify(map.get(row.id))===JSON.stringify(row),
   'Alchemy Vial: důkaz naplnění/obsahu se nesmí měnit ani odstranit');
 return true;
}
export function assertActiveAlchemyVials(database){
 const clock=database.campaignClock;if(!clock)return true;
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 for(const row of database.journal){
  const b=row.calendarAlchemyVialBinding;
  if(row.calendarCampaignId!==campaignId||!b||b.minute>clock.minute)continue;
  const state=alchemyVialState(database.journal,campaignId,b.finishId,clock.minute);
  if(!state.full)continue;
  const item=database.inventory.find(x=>x.id===state.vialId);
  check(item&&item.characterId===state.ownerId&&item.slot===state.slot&&
   item.quantity===1&&item.sourceItemId===PRINTED_VIAL&&item.snapshot?.properties?.weightLb===EMPTY_LB,
   'Alchemy Vial: naplněný předmět nelze odstranit, přepsat nebo rozdělit');
  check(!campaignRows(database.journal,campaignId).some(j=>j.calendarHerbVialBinding?.vialId===state.vialId&&
   j.campaignMinute>=b.minute&&j.campaignMinute<=clock.minute&&!j.calendarHerbVialDiscard),
   'Alchemy Vial: tentýž předmět je současně použit jako bylinná lahvička');
 }
 return true;
}
