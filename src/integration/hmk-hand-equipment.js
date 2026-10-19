/** Single inventory hand-slot gate for Keeper's Ledger (HMK pp. 97–106, 165).
 * A two-hand mode reserves the second physical hand; it never creates a second
 * inventory entry or an invented off-hand item. No character migration occurs.
 */
const HANDS=['main_hand','off_hand'];
export function isHandheldItem(item){
 const category=item?.snapshot?.category;
 return category==='weapon'||category==='shield'||(category==='other'&&item.snapshot?.properties?.handheld===true);
}
export function requiresTwoHands(item){
 const p=item?.snapshot?.properties||{};
 if(item?.snapshot?.category!=='weapon')return false;
 const modes=Array.isArray(p.verifiedModes)?p.verifiedModes:[];
 // Only explicitly documented handedness of the currently listed primary mode.
 return p.twoHanded===true||modes[0]?.twoHanded===true;
}
export function validateHandInventory(inventory,ownerId){
 if(!Array.isArray(inventory)||!ownerId)throw Error('Neplatný inventář nebo vlastník');
 const equipped=inventory.filter(x=>x.characterId===ownerId&&HANDS.includes(x.slot));
 if(equipped.length>2||new Set(equipped.map(x=>x.slot)).size!==equipped.length)
  throw Error('Ruka je již obsazena jiným předmětem');
 for(const x of equipped){
  if(!isHandheldItem(x)||x.destroyed||!Number.isSafeInteger(x.quantity)||x.quantity!==1)
   throw Error('V ruce smí být pouze přípustný, nepoškozením zničený jednotlivý předmět');
 }
 if(equipped.length===2&&equipped.some(requiresTwoHands))
  throw Error('Obouruční režim vyžaduje obě volné ruce; nelze současně držet štít ani jiný předmět');
 return true;
}
export function equipInventoryHand(doc,{ownerId,slot,itemId='',newItemId=null}={}){
 if(!HANDS.includes(slot)||!doc?.characters?.some(x=>x.id===ownerId))throw Error('Neplatná postava nebo ruka');
 validateHandInventory(doc.inventory,ownerId);
 const chosen=itemId?doc.inventory.find(x=>x.id===itemId&&x.characterId===ownerId):null;
 if(itemId&&(!chosen||!isHandheldItem(chosen)||chosen.destroyed||!['carried','none',slot].includes(chosen.slot??'none')))
  throw Error('Předmět není dostupný nebo není pravidlově určen k držení v ruce');
 const current=doc.inventory.find(x=>x.characterId===ownerId&&x.slot===slot);
 if(current?.id===chosen?.id)return structuredClone(doc);
 const next=structuredClone(doc),active=next.inventory.find(x=>x.characterId===ownerId&&x.slot===slot);
 if(active){active.slot='carried';active.gearStowage='normal';}
 const target=chosen&&next.inventory.find(x=>x.id===chosen.id);
 if(target){
  if(!Number.isSafeInteger(target.quantity)||target.quantity<1)throw Error('Neplatný počet kusů');
  if(target.quantity>1){
   if(!newItemId||next.inventory.some(x=>x.id===newItemId))throw Error('Chybí unikátní ID odděleného kusu');
   target.quantity-=1;
   next.inventory.push({...structuredClone(target),id:newItemId,quantity:1,slot,gearStowage:'normal'});
  }else{target.slot=slot;target.gearStowage='normal';}
 }
 validateHandInventory(next.inventory,ownerId);
 return next;
}
