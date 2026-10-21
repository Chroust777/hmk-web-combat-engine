/** Physical herbal potion in a *real, existing* 4 oz vial (HMK pp.74–75,121).
 * No vial or contents is created by this journal; the original inventory item
 * already contributes its printed 0.25 lb to ENC. Potion mass is unprinted.
 * Ownership/stowage follows normal whole-item inventory/chest proof events.
 */
export const HERB_VIAL_FORMAT='hmk-herb-vial-binding-v1';
export const HERB_VIAL_DISCARD_FORMAT='hmk-herb-vial-contents-discard-v1';
export const PRINTED_VIAL='hmk:gear:hmk-p121-075';
const ok=(x,m)=>{if(!x)throw Error(m)};
const minuteOk=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
export const vialBinding=(journal=[],campaignId,completeId)=>journal.find(x=>x.calendarCampaignId===campaignId&&x.calendarHerbVialBinding?.completeId===completeId)||null;
export function vialState(journal=[],campaignId,completeId,minute){
 const b=vialBinding(journal,campaignId,completeId);if(!b)return null;
 const p=b.calendarHerbVialBinding;let owner=p.actorId,slot=p.initialSlot;
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||!minuteOk(row.campaignMinute)||row.campaignMinute>minute)continue;
  // Only movements *after* the binding are relevant. The binding's own proof
  // fixes the owner's and slot's original state.
  if(row===b)continue;
  const d=row.calendarInventoryDisposition;
  if(d?.sourceItemId===p.vialId&&d.kind==='transfer'&&d.resultItemId===p.vialId){
   if(row.campaignMinute<p.minute||row.campaignMinute===p.minute&&journal.indexOf(row)<journal.indexOf(b))continue;
   ok(d.actorId===owner&&d.quantity===1,'Převod lahvičky nemá návaznost na předchozího vlastníka');
   owner=d.recipientId;slot='carried';
  }
  const c=row.calendarChestTransfer;
  if(c?.sourceItemId===p.vialId&&c.movedItemId===p.vialId){
   if(row.campaignMinute<p.minute||row.campaignMinute===p.minute&&journal.indexOf(row)<journal.indexOf(b))continue;
   ok(c.actorId===owner&&c.fromSlot===slot,'Přesun lahvičky do Truhlice neodpovídá původnímu uložení');
   slot=c.toSlot;
  }
 }
 return {bindingId:b.id,vialId:p.vialId,ownerId:owner,slot,completeId};
}
export function createHerbVialBinding({journal=[],inventory=[],campaignId,minute,actorId,completeId,vialId,confirmedByGM=false}={}){
 ok(confirmedByGM===true,'Naplnění fyzické lahvičky musí potvrdit GM');
 ok(typeof campaignId==='string'&&campaignId&&minuteOk(minute)&&typeof actorId==='string'&&actorId,'Chybí kampaň a čas');
 const c=journal.find(x=>x.id===completeId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionComplete);
 ok(c&&c.characterId===actorId&&c.campaignMinute<=minute&&c.calendarHerbPotionComplete.usable,'Lektvar musí být skutečně vyroben stejnou postavou');
 ok(minute<c.calendarHerbPotionComplete.expiryMinute,'Nelze plnit prošlý lektvar');
 ok(!vialBinding(journal,campaignId,completeId),'Tento lektvar už má fyzickou lahvičku');
 ok(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbPotionAdminister?.completeId===completeId),'Podaný lektvar nelze plnit do lahvičky');
 ok(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbWeaponPaste?.completeId===completeId),'Nanesený Poison již nelze nalít zpět do nové lahvičky');
 const item=inventory.find(x=>x.id===vialId&&x.characterId===actorId);
 ok(item&&item.sourceItemId===PRINTED_VIAL&&item.snapshot?.properties?.weightLb===0.25&&item.quantity===1&&['carried','none'].includes(item.slot),'Je nutná samostatná skutečně nesená lahvička Vial, 4 oz (1 ks)');
 ok(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbVialBinding?.vialId===vialId&&
   x.campaignMinute<=minute&&x.calendarHerbPotionComplete===undefined&&(()=>{
     const old=x.calendarHerbVialBinding,cp=journal.find(j=>j.id===old.completeId)?.calendarHerbPotionComplete;
     return cp&&cp.expiryMinute>minute&&!journal.some(j=>j.calendarCampaignId===campaignId&&(j.calendarHerbPotionAdminister?.completeId===old.completeId||j.calendarHerbVialDiscard?.completeId===old.completeId||j.calendarHerbWeaponPaste?.completeId===old.completeId));
   })()),'Lahvička již obsahuje jiný účinný nepodaný lektvar');
 return {format:HERB_VIAL_FORMAT,campaignId,minute,actorId,completeId,vialId,printedCatalogId:PRINTED_VIAL,
  quantity:1,emptyVialWeightLb:0.25,initialSlot:item.slot,confirmedByGM:true,contentsWeight:'not-specified-by-HMK',sourcePages:[74,75,121]};
}
export function createHerbVialDiscard({journal=[],inventory=[],campaignId,minute,actorId,completeId,reason='',confirmedByGM=false}={}){
 ok(confirmedByGM===true,'Odpis obsahu musí potvrdit GM');
 ok(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=240,'Zadejte doložený důvod rozlití či vyřazení');
 ok(minuteOk(minute),'Neplatný čas odpisu');
 const state=vialState(journal,campaignId,completeId,minute);
 ok(state&&state.ownerId===actorId&&['carried','none'].includes(state.slot),'Obsah lze odepsat jen ze skutečně nesené lahvičky vlastníka');
 const item=inventory.find(x=>x.id===state.vialId&&x.characterId===actorId);
 ok(item&&item.sourceItemId===PRINTED_VIAL&&item.snapshot?.properties?.weightLb===0.25&&item.quantity===1&&['carried','none'].includes(item.slot),'Chybí doložená fyzická lahvička');
 ok(!journal.some(x=>x.calendarCampaignId===campaignId&&
   (x.calendarHerbPotionAdminister?.completeId===completeId||x.calendarHerbVialDiscard?.completeId===completeId||x.calendarHerbWeaponPaste?.completeId===completeId)),
   'Obsah již byl podán nebo odepsán');
 const c=journal.find(x=>x.id===completeId&&x.calendarCampaignId===campaignId)?.calendarHerbPotionComplete;
 ok(c&&minute>=c.minute&&minute<c.expiryMinute,'Odpis je určen pro dosud účinný fyzický lektvar');
 return {format:HERB_VIAL_DISCARD_FORMAT,campaignId,minute,actorId,completeId,vialId:state.vialId,
  bindingId:state.bindingId,reason:reason.trim(),confirmedByGM:true,emptyVialRetained:true};
}
export function validateHerbVialJournal(journal=[]){const prior=[];for(const row of journal){
 if(row.calendarHerbVialDiscard){const p=row.calendarHerbVialDiscard;
  ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.actorId===row.characterId,'Vadný odpis obsahu lahvičky');
  const state=vialState(prior,p.campaignId,p.completeId,p.minute);
  const inv=state?[{id:state.vialId,characterId:state.ownerId,sourceItemId:PRINTED_VIAL,quantity:1,slot:state.slot,snapshot:{properties:{weightLb:0.25}}}]:[];
  const reproduced=createHerbVialDiscard({journal:prior,inventory:inv,campaignId:p.campaignId,minute:p.minute,actorId:p.actorId,completeId:p.completeId,reason:p.reason,confirmedByGM:p.confirmedByGM});
  ok(JSON.stringify(p)===JSON.stringify(reproduced),'Důkaz odpisu obsahu není odvozen od lahvičky');
 }
 if(row.calendarHerbVialBinding){const p=row.calendarHerbVialBinding;
  ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.actorId===row.characterId,'Vadná návaznost lahvičky na kampaň');
  // A historical source inventory item may later be transferred/consumed; do
  // not pretend that today's inventory represents the historical snapshot.
  const proofInventory=[{id:p.vialId,characterId:p.actorId,sourceItemId:p.printedCatalogId,quantity:p.quantity,slot:p.initialSlot,snapshot:{properties:{weightLb:p.emptyVialWeightLb}}}];
  const reproduced=createHerbVialBinding({journal:prior,inventory:proofInventory,campaignId:p.campaignId,minute:p.minute,
   actorId:p.actorId,completeId:p.completeId,vialId:p.vialId,confirmedByGM:p.confirmedByGM});
  ok(JSON.stringify(p)===JSON.stringify(reproduced),'Historický důkaz lahvičky neodpovídá původu');
 }
 prior.push(row);
 }return true;}
export function assertHerbVialAppendOnly(before=[],after=[]){const mapped=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarHerbVialBinding||row.calendarHerbVialDiscard)ok(JSON.stringify(mapped.get(row.id))===JSON.stringify(row),'Důkaz naplnění lahvičky nelze změnit či odstranit');return true;}
export function assertActiveHerbVials(data){const clock=data.campaignClock;if(!clock)return true;
 const key=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 for(const row of data.journal){const p=row.calendarHerbVialBinding;if(!p||row.calendarCampaignId!==key)continue;
  const complete=data.journal.find(x=>x.id===p.completeId)?.calendarHerbPotionComplete;
  if(!complete||clock.minute>=complete.expiryMinute||data.journal.some(x=>x.calendarCampaignId===key&&(x.calendarHerbPotionAdminister?.completeId===p.completeId||x.calendarHerbVialDiscard?.completeId===p.completeId||x.calendarHerbWeaponPaste?.completeId===p.completeId)))continue;
  const state=vialState(data.journal,key,p.completeId,clock.minute);
  const item=data.inventory.find(x=>x.id===p.vialId);
  ok(item&&item.sourceItemId===PRINTED_VIAL&&item.snapshot?.properties?.weightLb===0.25&&item.quantity===1&&item.characterId===state.ownerId&&item.slot===state.slot,
   'Naplněnou lahvičku nelze odstranit, rozdělit ani přepsat. Nejprve ji auditovaně podejte nebo vyčkejte expirace.');
 }
 return true;}
