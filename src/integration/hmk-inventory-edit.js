/** A direct, owner-bound, atomic inventory item edit. No navigation changes,
 * no RNG and no alternate storage path. UI calls within existing mutate/CAS. */
const SLOTS=['none','main_hand','off_hand','worn','carried'];
function fail(reason){throw Error(reason)}
export function applyInventoryItemEdit(doc,{ownerId,itemId,slot,quantity,currentWQ,condition,gearStowage='normal',layerOrder=null,layerSlot=null,bulkExceptionZones=[]}={}){
 if(!doc||!Array.isArray(doc.inventory)||typeof ownerId!=='string'||!ownerId||typeof itemId!=='string'||!itemId)fail('Neplatný vlastník nebo předmět');
 const item=doc.inventory.find(x=>x.id===itemId&&x.characterId===ownerId);
 if(!item||!doc.characters?.some(x=>x.id===ownerId))fail('Předmět nepatří otevřené postavě');
 if(!SLOTS.includes(slot)||(['main_hand','off_hand'].includes(slot)&&!['weapon','shield','other'].includes(item.snapshot?.category))||(slot==='worn'&&item.snapshot?.category!=='armor'))fail('Nepřípustný slot pro tento předmět');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999999||(['main_hand','off_hand','worn'].includes(slot)&&quantity!==1))fail('Neplatný počet kusů pro vybavený předmět');
 if(currentWQ!==null&&(!Number.isSafeInteger(currentWQ)||currentWQ<0||currentWQ>999))fail('Neplatná WQ');
 if(typeof condition!=='string')fail('Neplatný stav předmětu');
 if(['main_hand','off_hand'].includes(slot)&&doc.inventory.some(x=>x.characterId===ownerId&&x.id!==itemId&&x.slot===slot))fail('Ruka je již obsazena');
 if(!['normal','awkward','backpack'].includes(gearStowage)||gearStowage==='backpack'&&(slot!=='carried'||/\bbackpack\b/i.test(item.snapshot.name)))fail('Neplatné umístění v batohu');
 if(layerOrder!==null&&(!Number.isSafeInteger(layerOrder)||layerOrder<0||layerOrder>99||item.snapshot.category!=='armor'))fail('Neplatné pořadí vrstvy');
 if(layerSlot!==null&&(!['underFar','underNear','base','overNear','overFar'].includes(layerSlot)||item.snapshot.category!=='armor'))fail('Neplatný sloupec vrstvy');
 if(!Array.isArray(bulkExceptionZones)||new Set(bulkExceptionZones).size!==bulkExceptionZones.length||bulkExceptionZones.some(x=>!['head','arms','torso','legs'].includes(x)))fail('Neplatné Bulk zóny');
 const next=structuredClone(doc);const target=next.inventory.find(x=>x.id===itemId&&x.characterId===ownerId);
 target.slot=slot;target.quantity=quantity;target.currentWQ=currentWQ;target.condition=condition;target.gearStowage=gearStowage;
 if(target.snapshot.category==='armor'){target.layerOrder=layerOrder;target.layerSlot=layerSlot;target.bulkExceptionZones=bulkExceptionZones;}
 return next;
}

/** Non-combat hand-off: retain one inventory instance/ID and its catalogue
 * provenance. The recipient receives the item as carried, not pre-equipped.
 * UI invokes this only outside an active Initiative and persists via CAS.
 */
export function transferInventoryItem(doc,{ownerId,itemId,recipientId}={}){
 if(!doc||!Array.isArray(doc.inventory)||!Array.isArray(doc.characters)||typeof ownerId!=='string'||typeof itemId!=='string'||typeof recipientId!=='string'||!ownerId||!itemId||!recipientId||ownerId===recipientId)
  fail('Neplatné předání: vlastník, předmět nebo příjemce');
 if(!doc.characters.some(c=>c.id===ownerId)||!doc.characters.some(c=>c.id===recipientId))fail('Předání vyžaduje dvě existující postavy');
 const owned=doc.inventory.find(x=>x.id===itemId&&x.characterId===ownerId);
 if(!owned||!owned.snapshot)fail('Předmět nepatří předávající postavě');
 const next=structuredClone(doc);
 const target=next.inventory.find(x=>x.id===itemId&&x.characterId===ownerId);
 target.characterId=recipientId;target.slot='carried';target.gearStowage='normal';
 if(target.snapshot.category==='armor'){target.layerOrder=null;target.layerSlot=null;target.bulkExceptionZones=[];}
 return next;
}
