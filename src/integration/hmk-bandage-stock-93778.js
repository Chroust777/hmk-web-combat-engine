import {treatmentContract} from '../rules/healing.js';
/** Keeper's Ledger v93.778: physical individual bandages, one printed packet
 * = 32 pieces, 24d, 3 lb (HMK p120). No fractional bandage count. */
export const BANDAGE_CATALOG_ID='hmk:gear:hmk-p120-004';
export const BANDAGE_PACKET_SIZE=32;
export const BANDAGE_UNITS='pieces-v93.778';
export const BANDAGE_PACKET_PRICE_D=24;
export const BANDAGE_PACKET_WEIGHT_LB=3;
const valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=999999;
export const isBandageDefinition=def=>def?.id===BANDAGE_CATALOG_ID;
export const isBandageInventoryItem=item=>item?.sourceItemId===BANDAGE_CATALOG_ID && item?.snapshot?.id===BANDAGE_CATALOG_ID;
/** Earlier HMK builds stored 'Bandages, 32' quantity as packets rather than
 * individual pieces. Convert them exactly once; do not silently downgrade old
 * campaigns to a single physical bandage. A no-op on newly created stock. */
export function migrateLegacyBandageQuantities(doc){
 if(!doc||!Array.isArray(doc.inventory))return doc;
 for(const item of doc.inventory){
  if(!isBandageInventoryItem(item)||item.hmkBandageUnits===BANDAGE_UNITS)continue;
  if(!valid(item.quantity)||item.quantity<1||item.quantity>31249)throw Error('Starší balíčky obvazů nelze bezpečně převést; zachovejte zálohu.');
  item.quantity*=BANDAGE_PACKET_SIZE;
  item.hmkBandageUnits=BANDAGE_UNITS;
 }
 return doc;
}

export function bandageWeightLb(count){
 if(!valid(count))throw Error('Neplatný počet obvazů');
 const full=Math.floor(count/32),rest=count%32;
 return full*3+(rest===0?0:rest<=10?1:rest<=20?2:3);
}
export function physicalInventoryWeightLb(item){
 if(isBandageInventoryItem(item))return bandageWeightLb(item.quantity);
 const p=item?.snapshot?.properties||{};
 if(!Number.isFinite(p.weightLb)||p.weightLb<0||!Number.isFinite(item?.quantity)||item.quantity<0)return null;
 return p.weightLb*item.quantity+(item.waterContentsLb||0);
}
export function bandageLinePriceD(count){
 if(!valid(count))throw Error('Neplatný počet obvazů');
 return count*24/32; // read-only proportional inventory valuation, not new purchase cost
}
export function planBandageConsumption(inventory,healerId,amount){
 if(typeof healerId!=='string'||!healerId||!valid(amount)||amount<1)throw Error('Chybí léčitel nebo potřebný počet obvazů');
 let remaining=amount;const rows=[];
 for(const item of inventory||[]){
  if(item.characterId!==healerId||!isBandageInventoryItem(item)||!['carried','none'].includes(item.slot)||!valid(item.quantity)||item.quantity<1)continue;
  const taken=Math.min(remaining,item.quantity);
  if(taken)rows.push({itemId:item.id,before:item.quantity,used:taken});
  remaining-=taken;
  if(!remaining)break;
 }
 if(remaining)throw Error(`Léčitel nemá ${amount} obvazů; chybí ${remaining}. Přesuňte mu je do inventáře před ošetřením.`);
 return {healerId,amount,rows};
}
/** Apply inside the same authoritative mutate() that commits Treatment/Blood Stoppage. */
export function commitBandageConsumption(document,plan,{eventId,patientId,woundId,kind,minute=null,campaignId=null,createdAt=null}={}){
 if(!document||!Array.isArray(document.inventory)||!Array.isArray(document.journal)||!plan?.rows?.length||
  !valid(plan.amount)||plan.amount<1||typeof eventId!=='string'||!eventId)throw Error('Neplatný doklad použití obvazů');
 if(document.journal.some(j=>j.hmkBandageUse?.eventId===eventId))throw Error('Spotřeba obvazů již byla zapsána');
 if(plan.rows.reduce((sum,r)=>sum+r.used,0)!==plan.amount)throw Error('Nesouhlasí plánované množství obvazů');
 for(const row of plan.rows){
  const item=document.inventory.find(i=>i.id===row.itemId&&i.characterId===plan.healerId&&isBandageInventoryItem(i));
  if(!item||!['carried','none'].includes(item.slot)||item.quantity!==row.before||row.used>item.quantity)throw Error('Inventář léčitele se změnil; opakujte potvrzení obvazů.');
 }
 for(const row of plan.rows){
  const item=document.inventory.find(i=>i.id===row.itemId);
  item.quantity-=row.used;
 }
 document.inventory=document.inventory.filter(i=>!isBandageInventoryItem(i)||i.quantity>0);
 document.journal.push({id:`bandage-use-${eventId}`,characterId:plan.healerId,calendarCampaignId:campaignId,campaignMinute:minute,
  createdAt:createdAt||new Date(0).toISOString(),title:'HMK · spotřeba obvazů',
  body:`Léčitel použil ${plan.amount} obvazů při ${kind} u pacienta ${patientId}.`,
  hmkBandageUse:{format:'hmk-bandage-use-v1',eventId,healerId:plan.healerId,patientId,woundId,kind,
   quantity:plan.amount,rows:structuredClone(plan.rows),minute,campaignId}});
 return plan.amount;
}

/** A real Clean & Dress is 1 bandage for each injury level; Surgery
 * includes Clean & Dress according to HMK's treatment contract. */
export function bandagesNeededForTreatment(wound,{untreated=false}={}){
 if(untreated)return 0;
 if(!wound||!Number.isSafeInteger(wound.level)||wound.level<1)throw Error('Chybí zranění pro spotřebu obvazů');
 const aspect={b:'blunt',e:'edge',p:'point',f:'fire'}[wound.aspect]||String(wound.aspect||'').toLowerCase();
 const method=treatmentContract({aspect,injuryLevel:wound.level}).treatment;
 return ['cln','sur','sta'].includes(method)?wound.level:0;
}
/** Staunch uses one real d6 per pre-existing Bloodloss Point (HMK p178).
 * A zero-BP bleeder still needs one physical bandage to staunch. */
export function bandagesNeededForStaunch(bp,rolls=[]){
 if(!valid(bp)||bp>4||!Array.isArray(rolls)||rolls.length!==bp||rolls.some(r=>!Number.isSafeInteger(r)||r<1||r>6))
  throw Error('Staunch: jeden skutečný d6 za každý Bloodloss Point.');
 return Math.max(1,rolls.reduce((a,b)=>a+b,0));
}
