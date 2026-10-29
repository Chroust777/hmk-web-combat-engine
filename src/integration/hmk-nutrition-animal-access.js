/** v93.603: A GM-certified, dated co-location of an OWNED pack animal.
 * This is an accessibility receipt, never an inventory or food source.
 * It does not change historic daily use or authorize cross-owner transfers.
 */
export const ANIMAL_ACCESS_FORMAT='hmk-nutrition-animal-access-v1';
export const ANIMAL_USE_FORMAT='hmk-nutrition-animal-use-v1';
const check=(v,m)=>{if(!v)throw Error('Zásoby na zvířeti: '+m)};
const minute=m=>Number.isSafeInteger(m)&&m>=0&&m<=1e9;
const key=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
export function nutritionAnimals(data,actorId,campaignId){
 const actor=(data.characters||[]).find(c=>c.id===actorId);
 return (actor?.hmk?.livestock||[]).filter(a=>a.ownerId===actorId&&a.campaignId===campaignId&&
  !(data.journal||[]).some(j=>j.calendarCampaignId===campaignId&&j.stableHub574?.animalId===a.id&&
   ['sale','release'].includes(j.stableHub574.type)&&j.campaignMinute<=data.campaignClock?.minute));
}
function accessEvents(journal,campaignId,actorId,animalId){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===actorId&&
  j.calendarNutritionAnimalAccess?.animalId===animalId);
}
/** Historical accessibility for the WHOLE day, even after later revocation.
 * No GM certificate => no animal consumption. Both endpoints are checked,
 * so a mid-day loss of access cannot silently count as a full-day source. */
export function animalAccessForDay(data,campaignId,actorId,animalId,start,end){
 const actor=(data.characters||[]).find(c=>c.id===actorId);
 const animal=actor?.hmk?.livestock?.find(a=>a.id===animalId&&a.ownerId===actorId&&a.campaignId===campaignId);
 if(!animal||animal.minute>start)return null;
 const exits=(data.journal||[]).filter(j=>j.calendarCampaignId===campaignId&&j.stableHub574?.animalId===animalId&&
  ['sale','release'].includes(j.stableHub574.type));
 if(exits.some(j=>j.campaignMinute<end))return null;
 const events=accessEvents(data.journal||[],campaignId,actorId,animalId).filter(j=>j.campaignMinute<end);
 const opening=events.filter(j=>j.campaignMinute<=start).at(-1);
 if(!opening?.calendarNutritionAnimalAccess?.accessible)return null;
 if(events.some(j=>j.campaignMinute>start&&!j.calendarNutritionAnimalAccess.accessible))return null;
 return opening;
}
/** The identity of each loaded item is the stable's immutable inventory-load
 * receipt. Present-day slot alone never proves historical animal custody. */
export function animalLoadedItemAt(data,campaignId,actorId,itemId,atMinute,beforeReceiptId=null){
 // Campaign branches may be archived while another campaign is active.
 // The original food/water source + stable load are the durable owner proof;
 // a CURRENT inventory snapshot from another campaign must not erase it.
 const item=(data.inventory||[]).find(i=>i.id===itemId&&i.characterId===actorId);
 const source=(data.journal||[]).find(j=>j.calendarCampaignId===campaignId&&j.characterId===actorId&&
  (j.calendarInventoryRationStock?.itemId===itemId||j.calendarInventoryRationTransfer?.receivedItemId===itemId&&
  j.calendarInventoryRationTransfer?.recipientId===actorId||j.calendarInventoryWaterFill?.itemId===itemId));
 if(!item&&!source)return null;
 const receiptIndex=beforeReceiptId?(data.journal||[]).findIndex(j=>j.id===beforeReceiptId):Infinity;
 const last=(data.journal||[]).filter((j,i)=>j.calendarCampaignId===campaignId&&
  (j.campaignMinute<atMinute||j.campaignMinute===atMinute&&i<receiptIndex)&&
  j.stableHub574?.inventoryId===itemId&&['inventory-load','inventory-unload'].includes(j.stableHub574.type)).at(-1);
 if(last?.stableHub574.type!=='inventory-load')return null;
 const animalId=last.stableHub574.animalId;
 const animal=(data.characters||[]).find(c=>c.id===actorId)?.hmk?.livestock?.find(a=>a.id===animalId&&a.ownerId===actorId&&a.campaignId===campaignId);
 return animal?{animalId,loadId:last.id}:null;
}
export function createAnimalAccess(data,{actorId,animalId,accessible,reason,minute:atMinute}={}){
 const clock=data.campaignClock,campaignId=key(clock);
 check(clock&&clock.minute===atMinute&&minute(atMinute),'chybí aktuální čas GM');
 check((clock.characterIds??data.characters.map(c=>c.id)).includes(actorId),'postava nepatří do kampaně');
 check(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=160,'GM musí uvést skutečné okolnosti dostupnosti');
 check(typeof accessible==='boolean','neplatná dostupnost');
 check(nutritionAnimals(data,actorId,campaignId).some(a=>a.id===animalId),'zvíře není aktivně vlastněno touto postavou');
 const last=accessEvents(data.journal||[],campaignId,actorId,animalId).at(-1);
 check(!last||last.campaignMinute<=atMinute,'změna dostupnosti je zpětně v čase');
 check(!last||last.calendarNutritionAnimalAccess.accessible!==accessible,'tato dostupnost už je zaznamenána');
 if(accessible)check((data.journal||[]).some(j=>j.calendarCampaignId===campaignId&&j.campaignMinute<=atMinute&&
   j.stableHub574?.animalId===animalId&&j.stableHub574.type==='inventory-load'&&
   animalLoadedItemAt(data,campaignId,actorId,j.stableHub574.inventoryId,atMinute)?.animalId===animalId),
   'na zvířeti není doložená naložená položka inventáře');
 return {format:ANIMAL_ACCESS_FORMAT,campaignId,actorId,animalId,minute:atMinute,accessible,
  reason:reason.trim(),confirmedByGM:true,sourcePages:[120,121,122,186]};
}
export function validateNutritionAnimalAccess(data){
 const journal=data.journal||[],prior=[],seen=new Set();
 for(const row of journal){
  const a=row.calendarNutritionAnimalAccess;
  if(a){
   const owner=(data.characters||[]).find(c=>c.id===a.actorId);
   const livestock=owner?.hmk?.livestock?.find(x=>x.id===a.animalId&&x.campaignId===a.campaignId&&x.ownerId===a.actorId);
   const last=accessEvents(prior,a.campaignId,a.actorId,a.animalId).at(-1);
   check(a.format===ANIMAL_ACCESS_FORMAT&&row.characterId===a.actorId&&row.calendarCampaignId===a.campaignId&&
    row.campaignMinute===a.minute&&minute(a.minute)&&livestock&&livestock.minute<=a.minute&&
    a.confirmedByGM===true&&typeof a.accessible==='boolean'&&
    typeof a.reason==='string'&&a.reason.trim()===a.reason&&a.reason.length>=3&&a.reason.length<=160&&
    JSON.stringify(a.sourcePages)==='[120,121,122,186]'&&
    (!a.accessible||(data.journal||[]).some(j=>j.calendarCampaignId===a.campaignId&&j.campaignMinute<=a.minute&&
     j.stableHub574?.animalId===a.animalId&&j.stableHub574.type==='inventory-load'&&
     animalLoadedItemAt(data,a.campaignId,a.actorId,j.stableHub574.inventoryId,a.minute)?.animalId===a.animalId))&&
    (!last||last.campaignMinute<=a.minute&&last.calendarNutritionAnimalAccess.accessible!==a.accessible)&&
    !prior.some(j=>j.calendarCampaignId===a.campaignId&&j.campaignMinute<=a.minute&&
     j.stableHub574?.animalId===a.animalId&&['sale','release'].includes(j.stableHub574.type)),
    'poškozené doložení dostupnosti zvířete');
  }
  const u=row.calendarNutritionAnimalUse;
  if(u){
   const ration=row.calendarInventoryRationUse,water=row.calendarInventoryWaterUse;
   const proof=ration||water,dayToken=proof?.nutritionDayId;
   const access=prior.find(j=>j.id===u.accessId&&j.calendarNutritionAnimalAccess);
   const actual=animalLoadedItemAt(data,row.calendarCampaignId,row.characterId,u.inventoryId,row.campaignMinute,row.id);
   const start=row.campaignMinute-1440;
   const eligible=animalAccessForDay(data,row.calendarCampaignId,row.characterId,u.animalId,start,row.campaignMinute);
   check(u.format===ANIMAL_USE_FORMAT&&!!proof&&!!dayToken&&
    proof.itemId===u.inventoryId&&row.characterId===u.actorId&&u.animalId===actual?.animalId&&
    access?.characterId===row.characterId&&access.calendarCampaignId===row.calendarCampaignId&&
    eligible?.id===u.accessId&&u.loadId===actual?.loadId&&
    typeof row.id==='string'&&!seen.has(row.id),'nepodložený automatický výdej z nákladu zvířete');
   seen.add(row.id);
  }
  prior.push(row);
 }
 return true;
}
export function assertNutritionAnimalAppendOnly(before=[],after=[]){
 const rows=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarNutritionAnimalAccess||r.calendarNutritionAnimalUse)
  check(rows.has(r.id)&&JSON.stringify(rows.get(r.id))===JSON.stringify(r),'historický doklad dostupnosti/výdeje se nesmí přepsat');
 return true;
}
