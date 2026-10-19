/** Single inventory hand-slot gate for Keeper's Ledger (HMK pp. 97–106, 165).
 * A two-hand mode reserves the second physical hand; it never creates a second
 * inventory entry or an invented off-hand item. No character migration occurs.
 */
const HANDS=['main_hand','off_hand'];
export function isHandheldItem(item){
 const category=item?.snapshot?.category;
 return category==='weapon'||category==='shield'||(category==='other'&&item.snapshot?.properties?.handheld===true);
}
/** HMK p.98/p.165: grips are an inventory INSTANCE choice, not a catalogue edit.
 * An absent grip is the legacy one-hand default, except for an EXPLICIT
 * catalogue restriction. Never infer it from how long a weapon looks. */
export function gripOf(item){
 if(item?.snapshot?.category!=='weapon')return 'one';
 const p=item.snapshot.properties||{},primary=p.verifiedModes?.[0];
 return item.grip==='two'||p.twoHanded===true||primary?.twoHanded===true?'two':'one';
}
export function requiresTwoHands(item){return item?.snapshot?.category==='weapon'&&gripOf(item)==='two';}
/** Generic two-hand Melee use (HMK p.98) is allowed for a verified Melee
 * weapon; for missile weapons or incomplete custom definitions do not guess. */
export function supportsSelectableTwoHandGrip(item){
 if(item?.snapshot?.category!=='weapon')return false;
 const p=item.snapshot.properties||{},m=p.verifiedModes;
 if(!Array.isArray(m)||m.length!==1)return false;
 const mode=m[0],type=String(p.missileType??mode?.missileType??'').toLowerCase();
 if(['bow','crossbow','sling'].includes(type))return false;
 if(!/^d(?:4|6|8|10|12)$/.test(String(mode?.impactDie))||
   !Number.isSafeInteger(mode?.impactModifier)||!['b','e','p'].includes(mode?.aspect))return false;
 const length=mode.length??p.length;
 return typeof length==='number'&&Number.isSafeInteger(length)&&length>=0||
  typeof length==='string'&&/^[0-9](?:t|\|[0-9])?$/.test(length);
}
export function setWeaponGrip(doc,{ownerId,itemId,grip}={}){
 if(!['one','two'].includes(grip)||!doc?.characters?.some(c=>c.id===ownerId))throw Error('Neplatný režim držení nebo postava');
 const old=doc.inventory?.find(x=>x.id===itemId&&x.characterId===ownerId);
 if(!old||!['main_hand','off_hand'].includes(old.slot)||old.snapshot?.category!=='weapon')
  throw Error('Režim držení lze měnit jen u skutečně připravené zbraně');
 if(grip==='two'&&!supportsSelectableTwoHandGrip(old))throw Error('Obouruční použití není pro tento ověřený režim doloženo');
 if(grip==='one'&&requiresTwoHands({...old,grip:'one'}))throw Error('Tato zbraň vyžaduje dvě ruce');
 validateHandInventory(doc.inventory,ownerId);
 const next=structuredClone(doc);
 next.inventory.find(x=>x.id===itemId&&x.characterId===ownerId).grip=grip;
 validateHandInventory(next.inventory,ownerId);
 return next;
}
export function validateHandInventory(inventory,ownerId){
 if(!Array.isArray(inventory)||!ownerId)throw Error('Neplatný inventář nebo vlastník');
 const equipped=inventory.filter(x=>x.characterId===ownerId&&HANDS.includes(x.slot));
 if(equipped.length>2||new Set(equipped.map(x=>x.slot)).size!==equipped.length)
  throw Error('Ruka je již obsazena jiným předmětem');
 for(const x of equipped){
  if(!isHandheldItem(x)||x.destroyed||!Number.isSafeInteger(x.quantity)||x.quantity!==1||
    (x.grip!==undefined&&!['one','two'].includes(x.grip))||
    (x.snapshot?.category==='weapon'&&x.grip==='two'&&!supportsSelectableTwoHandGrip(x)))
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
