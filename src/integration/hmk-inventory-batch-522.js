/** v93.522: atomic multi-item inventory custody, no parallel storage.
 * Existing chest/disposition receipts remain the only authoritative evidence.
 * Every selected item is validated before returning a changed database.
 */
import {moveInventoryChest} from './hmk-inventory-chest.js';
import {recordInventoryDisposition} from './hmk-inventory-disposition.js';
import {previewOptimalOutfit,applyOptimalOutfit} from './hmk-outfit-optimizer.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const own=(db,owner,id)=>db.inventory.find(x=>x.id===id&&x.characterId===owner);
const validIds=ids=>Array.isArray(ids)&&ids.length>0&&ids.length<=300&&ids.every(x=>typeof x==='string'&&x.length>0)&&new Set(ids).size===ids.length;
const current=(db,owner)=>db.characters.some(x=>x.id===owner);
const key=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
const sample=(ids,fn)=>ids.map(fn);
export function applyInventoryBatch(db,{ownerId,itemIds,action,location='',reason='',recipientId=null,confirmed=false,idFactory,createdAt}={}){
 check(db&&Array.isArray(db.inventory)&&Array.isArray(db.journal)&&Array.isArray(db.characters)&&current(db,ownerId),'Hromadná operace vyžaduje existujícího vlastníka a inventář.');
 check(validIds(itemIds),'Vyberte alespoň jeden jedinečný předmět (nejvýše 300).');
 check(['store','retrieve','loss','transfer'].includes(action),'Neznámá hromadná inventární operace.');
 check(confirmed===true,'GM musí potvrdit fyzickou dostupnost a skutečnou událost.');
 check(typeof idFactory==='function'&&typeof createdAt==='string'&&createdAt,'Chybí zdroj jedinečných ID a auditní čas.');
 const originals=itemIds.map(id=>own(db,ownerId,id));
 check(originals.every(x=>x&&Number.isSafeInteger(x.quantity)&&x.quantity>0),'Výběr obsahuje chybějící předmět nebo neplatné množství.');
 check(!db.combatRuntime?.sequence?.active,'Hromadné přesuny během aktivního boje nejsou povoleny.');
 if(action==='store')check(originals.every(x=>x.slot!=='chest'),'Uložení dovoluje pouze předměty mimo truhlu.');
 if(action==='retrieve')check(originals.every(x=>x.slot==='chest'),'Vyzvednutí dovoluje pouze předměty v truhle.');
 if(action==='loss'||action==='transfer')check(typeof reason==='string'&&reason.trim().length>=2,'Ztráta nebo předání vyžaduje skutečný důvod.');
 if(action==='transfer')check(typeof recipientId==='string'&&recipientId!==ownerId,'Vyberte jiného příjemce.');
 const needsLocation=action==='store'||action==='retrieve'||originals.some(x=>x.slot==='chest');
 if(needsLocation)check(typeof location==='string'&&location.trim().length>0&&location.trim().length<=160,'Zadejte skutečné místo truhly.');
 if(action==='retrieve'||(action!=='store'&&originals.some(x=>x.slot==='chest')))
  check(originals.filter(x=>x.slot==='chest').every(x=>x.chestLocation===location.trim()),'Vybrané předměty musí být skutečně na potvrzeném stejném místě truhly.');
 let next=db;
 for(const id of itemIds){
  let item=own(next,ownerId,id);
  check(item,'Předmět se změnil během hromadné operace.');
  if(action==='store'||action==='retrieve'||item.slot==='chest'){
   next=moveInventoryChest(next,{actorId:ownerId,itemId:id,quantity:item.quantity,newItemId:idFactory(),eventId:idFactory(),campaignId:next.campaignClock?key(next.campaignClock):null,minute:next.campaignClock?.minute??null,location:location.trim(),accessConfirmed:true,createdAt});
   item=own(next,ownerId,id);
  }
  if(action==='loss'||action==='transfer'){
   next=recordInventoryDisposition(next,{kind:action==='loss'?'loss':'transfer',actorId:ownerId,itemId:id,recipientId:action==='transfer'?recipientId:null,quantity:item.quantity,eventId:idFactory(),newItemId:idFactory(),reason,confirmedByGM:true,createdAt,campaignId:key(next.campaignClock),minute:next.campaignClock?.minute});
  }
 }
 return next;
}
/** Simulate only the chest items at the confirmed location as available gear.
 * Do not actually change them until a specific, verified outfit is chosen.
 */
export function previewChestOutfit(db,{ownerId,location,mode}={}){
 check(current(db,ownerId)&&['armour','clothing'].includes(mode),'Neplatná postava nebo režim oblékání.');
 check(typeof location==='string'&&location.length>0,'Vyberte skutečné místo truhly.');
 const chest=db.inventory.filter(x=>x.characterId===ownerId&&x.slot==='chest'&&x.chestLocation===location);
 check(chest.length,'Na daném místě není žádné vybavení této postavy.');
 const inventory=db.inventory.map(x=>chest.includes(x)?{...x,slot:'carried'}:x);
 const preview=previewOptimalOutfit(inventory,ownerId,mode);
 if(!preview.ready)return {ready:false,reason:preview.reason};
 const chosen=new Set(preview.equipIds),retrieved=chest.filter(x=>chosen.has(x.id));
 // A true optimum may already be worn/carried. That is a valid mathematical
 // conclusion: do not force a worse chest article merely to use the chest.
 // The UI reports a no-op when there is no chest component to retrieve.
 return {ready:true,mode,location,preview,ids:retrieved.map(x=>x.id),names:retrieved.map(x=>x.snapshot.name),virtual:inventory};
}
export function applyChestOutfit(db,{ownerId,location,mode,confirmed=false,idFactory,createdAt}={}){
 check(confirmed===true,'GM musí potvrdit skutečný přístup do truhly a převlečení.');
 const plan=previewChestOutfit(db,{ownerId,location,mode});
 check(plan.ready,plan.reason||'Nedoložená sestava');
 const staged=applyInventoryBatch(db,{ownerId,itemIds:plan.ids,action:'retrieve',location,confirmed,idFactory,createdAt});
 const fresh=previewOptimalOutfit(staged.inventory,ownerId,mode);
 check(fresh.ready&&JSON.stringify(fresh)===JSON.stringify(plan.preview),'Po vyzvednutí už návrh neodpovídá původním článkům.');
 const inventory=applyOptimalOutfit(staged.inventory,ownerId,fresh);
 return {...staged,inventory,plan};
}
