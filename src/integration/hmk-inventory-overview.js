/** Read-only character inventory projection for Keeper's Ledger (HMK pp. 99–122).
 * No item definitions, prices, weights or rule mechanics are invented.
 * Gear ENC is computed over the WHOLE load, not added per line.
 */
const isFiniteNonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const knownPrice=(item)=>{
 const p=item?.snapshot?.properties||{};
 if(Number.isSafeInteger(p.pricePence)&&p.pricePence>=0)return {unit:p.pricePence,label:`${p.pricePence} d / ks`};
 if(Number.isSafeInteger(p.pricePerDozenPence)&&p.pricePerDozenPence>=0)
  return {unit:null,label:`${p.pricePerDozenPence} d / 12 ks`};
 return {unit:null,label:'Cena nedoložena'};
};
export function projectInventoryRows(inventory=[]){
 return inventory.map(item=>{
  const p=item.snapshot?.properties||{},isPrintedRation=['hmk:gear:hmk-p120-026','hmk:gear:hmk-p120-027'].includes(item.sourceItemId),
   qty=(Number.isSafeInteger(item.quantity)||isPrintedRation&&Number.isSafeInteger(item.quantity*2))&&item.quantity>0?item.quantity:null;
  const price=knownPrice(item),weight=isFiniteNonnegative(p.weightLb)&&isFiniteNonnegative(item.waterContentsLb??0)?p.weightLb+(item.waterContentsLb??0)/(item.quantity||1):null;
  const totalPrice=qty!==null&&price.unit!==null?qty*price.unit:
   qty!==null&&Number.isSafeInteger(p.pricePerDozenPence)&&qty%12===0?qty/12*p.pricePerDozenPence:null;
  const totalWeight=qty!==null&&weight!==null?qty*weight:null;
  const isArmour=item.snapshot?.category==='armor';
  const isWeapon=item.snapshot?.category==='weapon';
  const isShield=item.snapshot?.category==='shield';
  const wq=Number.isFinite(item.currentWQ)?item.currentWQ:Number.isFinite(p.quality)?p.quality:null;
  const codes=Array.isArray(p.coveredLocations)?p.coveredLocations:[];
  const modes=Array.isArray(p.verifiedModes)?p.verifiedModes:[];
  const keyFields=[];
  if(isWeapon){
   if(p.length!==undefined)keyFields.push(`Dosah ${p.length}`);
   if(Number.isFinite(p.attackModifier))keyFields.push(`ATK ${p.attackModifier>=0?'+':''}${p.attackModifier}`);
   if(Number.isFinite(p.baseRangeFt))keyFields.push(`Dostřel ${p.baseRangeFt} ft`);
   if(p.weaponClass)keyFields.push(`Třída ${p.weaponClass}`);
   if(Number.isFinite(p.defenceModifier))keyFields.push(`DEF ${p.defenceModifier>=0?'+':''}${p.defenceModifier}`);
   if(Number.isFinite(p.heft))keyFields.push(`Heft ${p.heft}`);
   if(Number.isFinite(p.impactTAModifier))keyFields.push(`TA ${p.impactTAModifier>=0?'+':''}${p.impactTAModifier}`);
   for(const m of modes){let imp=String(m.impactDie||'?');if(Number.isFinite(m.impactModifier))imp+=(m.impactModifier>=0?'+':'')+m.impactModifier;
    keyFields.push(`${m.name||'Útok'}: ${imp} ${m.aspect||''}`.trim());}
  }
  if(isShield){if(Number.isFinite(p.defenceModifier))keyFields.push(`DEF ${p.defenceModifier>=0?'+':''}${p.defenceModifier}`);if(Number.isFinite(p.shieldMod))keyFields.push(`Shield ${p.shieldMod}`);if(Number.isFinite(p.deflect))keyFields.push(`Deflect ${p.deflect}`);}
  if(isArmour){
   if(p.material)keyFields.push(`Materiál ${p.material}`);
   if(codes.length)keyFields.push(`Lokace ${codes.join(', ')}`);
   if(item.slot==='worn')keyFields.push(Number.isSafeInteger(item.layerOrder)?`Vrstva ${item.layerOrder}`:'Vrstva neurčena');
  }
  if(!isArmour&&!isWeapon&&!isShield){
   if(typeof p.craftSkill==='string'&&p.craftSkill)keyFields.push(`Řemeslo ${p.craftSkill}`);
   if(typeof p.effect==='string'&&p.effect)keyFields.push(`Účinek: ${p.effect}`);
   if(Number.isFinite(p.capacityLb))keyFields.push(`Kapacita ${p.capacityLb} lb`);
   if(typeof item.snapshot?.description==='string'&&item.snapshot.description&&!/^Tištěná položka vybavení HMK, str\. \d+; výběr do počáteční výbavy je orientační, nikoli povinný\.$/i.test(item.snapshot.description.trim()))keyFields.push(item.snapshot.description);
  }
  // This is the item's own catalogue value, not the body's combined ENC.
  const printedEnc=p.printedEncCode??p.encumbrance;
  const armourENC=isArmour&&item.slot==='worn'?
   Number.isFinite(printedEnc)?String(printedEnc):typeof printedEnc==='string'?`podm. ${printedEnc}`:'nedoloženo':'—';
  const protection=isArmour&&p.locationProtection&&typeof p.locationProtection==='object'?
   Object.entries(p.locationProtection).filter(([,v])=>v&&typeof v==='object').map(([loc,v])=>({loc,b:v.b,e:v.e,p:v.p,f:v.f})):[];
  const kind=item.slot==='chest'?'chest':item.slot==='worn'||item.slot==='main_hand'||item.slot==='off_hand'?'equipped':'carried';
  return {item,qty,priceLabel:price.label,totalPrice,weight,totalWeight,wq,keyFields,armourENC,protection,kind};
 });
}
export function inventoryTotals(rows=[]){
 let value=0,weight=0,unknownValue=0,unknownWeight=0;
 for(const row of rows){if(row.totalPrice===null)unknownValue++;else value+=row.totalPrice;
  if(row.totalWeight===null)unknownWeight++;else weight+=row.totalWeight;}
 return {knownValue:value,knownWeightLb:weight,unknownValue,unknownWeight,count:rows.length,
  fullyValued:unknownValue===0,fullyWeighed:unknownWeight===0};
}

/** Presentation-only stacking of identical items. Never merge source inventory
 * IDs or receipt-backed custody rows: each item remains independently editable.
 * Damaged pieces, different WQ, contents, location or carrying mode stay apart.
 */
export function groupInventoryDisplayRows(rows=[]){
 const grouped=new Map(),out=[];
 const fingerprint=item=>{
  // The underlying id and count describe custody, not physical properties.
  const {id,quantity,characterId,...physical}=item;
  const canonical=value=>Array.isArray(value)?value.map(canonical):
   value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
  return JSON.stringify(canonical({...physical,slot:physical.slot==='none'?'carried':physical.slot}));
 };
 for(const row of rows){
  const key=fingerprint(row.item)+JSON.stringify([row.weight,row.wq,row.priceLabel]);
  let group=grouped.get(key);
  if(!group){
   group={...row,itemIds:[],members:[],qty:0,totalPrice:0,totalWeight:0};
   grouped.set(key,group);out.push(group);
  }
  group.itemIds.push(row.item.id);group.members.push(row);
  group.qty=row.qty===null||group.qty===null?null:group.qty+row.qty;
  group.totalPrice=row.totalPrice===null||group.totalPrice===null?null:group.totalPrice+row.totalPrice;
  group.totalWeight=row.totalWeight===null||group.totalWeight===null?null:group.totalWeight+row.totalWeight;
 }
 return out;
}
