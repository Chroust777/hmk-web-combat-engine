/** HMK economy: printed Wealth remains creation evidence, never spendable twice.
 * v93.391: legacy unassigned cash is an immutable opening basis for each
 * campaign account. Later receipts/adjustments are scoped to one time axis.
 * Existing historical receipts are NOT silently assigned a campaign.
 */
const fail=(reason)=>({ok:false,reason,initial:null,balance:null,spent:null});
const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=999999999;
const isObject=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function calculate(character,initial,ledger,adjustments,{campaignId=null,openingMinute=null}={}){
 if(!integer(initial))return fail('Počáteční hotovost není doložená.');
 if(!Array.isArray(ledger)||!Array.isArray(adjustments))return fail('Poškozená historie hotovosti.');
 let spent=0,gained=0,previousMinute=openingMinute??0;const ids=new Set();
 for(const entry of ledger){
  if(!entry||entry.kind!=='library-purchase'||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||
   !integer(entry.amountPence)||!Array.isArray(entry.inventoryIds)||!entry.inventoryIds.length||
   entry.inventoryIds.some(id=>typeof id!=='string'||!id))return fail('Neplatná nebo duplicitní transakce.');
  if(campaignId!==null){
   if(entry.campaignId!==campaignId||!Number.isSafeInteger(entry.campaignMinute)||entry.campaignMinute<previousMinute||
    typeof entry.at!=='string'||!entry.at)return fail('Nákup neodpovídá časové větvi nebo pořadí transakcí.');
   if(!Array.isArray(entry.purchasedItems)||entry.purchasedItems.length!==entry.inventoryIds.length||
    entry.purchasedItems.some((x,i)=>!isObject(x)||x.inventoryId!==entry.inventoryIds[i]||
     typeof x.sourceItemId!=='string'||!x.sourceItemId||!integer(x.quantity)||x.quantity<1||
     !isObject(x.snapshot)||typeof x.snapshot.name!=='string'||!x.snapshot.name))return fail('Katalogový původ nakoupených předmětů není doložen.');
   previousMinute=entry.campaignMinute;
  }
  ids.add(entry.id);spent+=entry.amountPence;
 }
 // GM changes and purchases may interleave: check each ledger's timestamps
 // against its own append-only sequence, not the other ledger.
 previousMinute=openingMinute??0;
 for(const entry of adjustments){
  if(!entry||entry.kind!=='gm-coin-adjustment'||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||
   !Number.isSafeInteger(entry.deltaPence)||entry.deltaPence===0||typeof entry.at!=='string')return fail('Neplatná nebo duplicitní GM změna mincí.');
  if(campaignId!==null){
   if(entry.campaignId!==campaignId||!Number.isSafeInteger(entry.campaignMinute)||entry.campaignMinute<previousMinute||
    !entry.at||typeof entry.reason!=='string'||entry.reason.trim().length<5)return fail('GM změna mincí nemá časový původ a doložený důvod.');
   previousMinute=entry.campaignMinute;
  }
  ids.add(entry.id);gained+=entry.deltaPence;
 }
 const balance=initial+gained-spent;
 if(!integer(balance)||!Number.isSafeInteger(spent)||!Number.isSafeInteger(gained))return fail('Nesoulad hotovosti s historií příjmů a výdajů.');
 return {ok:true,initial,spent,gained,balance,transactions:ledger.length,adjustments:adjustments.length,
  campaignId,legacy:campaignId===null};
}
/** All historical pre-v93.391 entries are treated as unassigned legacy facts. */
export function legacyCoinBalance(character){
 const h=character?.hmk||{},initial=h.coinsPence;
 if(!integer(initial))return fail('Postava nemá doloženou počáteční hotovost (coinsPence).');
 if(h.wealth!==undefined&&(!integer(h.wealth)||h.wealth*10!==initial))return fail('Nesoulad počáteční hotovosti a Wealth.');
 return calculate(character,initial,h.cashLedger??[],h.coinAdjustments??[]);
}
/** Read-only projection. An absent campaign account uses the legacy balance,
 * without mutating or relocating any old transaction or creating fake wealth. */
export function coinBalance(character,campaignId=null){
 const base=legacyCoinBalance(character);if(!base.ok||campaignId===null||campaignId===undefined)return base;
 if(typeof campaignId!=='string'||!campaignId)return fail('Chybí identifikátor kampaně.');
 const accounts=character?.hmk?.campaignCashAccounts;
 if(accounts!==undefined&&!isObject(accounts))return fail('Neplatné účty kampaní.');
 const account=accounts&&Object.hasOwn(accounts,campaignId)?accounts[campaignId]:undefined;
 if(account===undefined)return {...base,campaignId,inheritedLegacy:true,legacy:false};
 if(!isObject(account)||account.format!=='hmk-campaign-cash-v1'||account.campaignId!==campaignId||
  !integer(account.openingPence)||!Number.isSafeInteger(account.openedAtMinute)||account.openedAtMinute<0||
  (account.forkedFromCampaignId!==null&&typeof account.forkedFromCampaignId!=='string')||
  !Array.isArray(account.purchases)||!Array.isArray(account.adjustments))return fail('Poškozený účet kampaně.');
 return {...calculate(character,account.openingPence,account.purchases,account.adjustments,
  {campaignId,openingMinute:account.openedAtMinute}),campaignId,inheritedLegacy:false,legacy:false};
}
export function validateCampaignCashAccounts(character){
 const map=character?.hmk?.campaignCashAccounts;if(map===undefined)return true;
 if(!isObject(map)||Object.keys(map).length>100)throw Error('Poškozený registr peněz kampaní.');
 const ids=new Set([...(character?.hmk?.cashLedger??[]),...(character?.hmk?.coinAdjustments??[])].map(t=>t.id));const base=legacyCoinBalance(character);
 if(!base.ok)throw Error(base.reason);
 for(const key of Object.keys(map)){
  const account=map[key],result=coinBalance(character,key);
  if(!result.ok)throw Error(result.reason);
  for(const t of [...account.purchases,...account.adjustments]){
   if(ids.has(t.id))throw Error('Duplicitní ID finanční události mezi kampaněmi.');ids.add(t.id);
  }
 }
 return true;
}
/** Explicit campaign fork. Opening cash equals the known balance at that
 * instant; the source account is never reduced and history is not rewritten. */
export function ensureCampaignCashAccount(character,campaignId,minute,{forkFrom=null,openingPence=null}={}){
 if(typeof campaignId!=='string'||!campaignId||!Number.isSafeInteger(minute)||minute<0)throw Error('Chybí časový původ kampaně.');
 character.hmk??={};const accounts=character.hmk.campaignCashAccounts??={};
 if(!isObject(accounts))throw Error('Poškozené účty kampaní.');
 if(Object.hasOwn(accounts,campaignId)){
  const balance=coinBalance(character,campaignId);if(!balance.ok)throw Error(balance.reason);
  return accounts[campaignId];
 }
 const initial=openingPence===null?legacyCoinBalance(character).balance:openingPence;
 if(!integer(initial))throw Error('Nelze doložit počáteční hotovost této kampaně.');
 accounts[campaignId]={format:'hmk-campaign-cash-v1',campaignId,openingPence:initial,
  openedAtMinute:minute,forkedFromCampaignId:forkFrom,purchases:[],adjustments:[]};
 return accounts[campaignId];
}
export function recordCampaignCashPurchase(character,{campaignId,minute,id,at,amountPence,inventoryIds,label,purchasedItems}){
 if(!integer(amountPence)||!Array.isArray(inventoryIds)||!inventoryIds.length||
  typeof id!=='string'||!id||typeof at!=='string'||!at||!Array.isArray(purchasedItems)||
  purchasedItems.length!==inventoryIds.length)throw Error('Nákup nemá úplný katalogový doklad.');
 const current=coinBalance(character,campaignId);if(!current.ok)throw Error(current.reason);
 if(amountPence>current.balance)throw Error('Nedostatek hotovosti v této kampani.');
 const account=ensureCampaignCashAccount(character,campaignId,minute);
 if(minute<account.openedAtMinute)throw Error('Nákup předchází otevření finanční větve.');
 account.purchases.push({kind:'library-purchase',id,at,campaignId,campaignMinute:minute,
  amountPence,inventoryIds,label,purchasedItems:structuredClone(purchasedItems)});
 const check=coinBalance(character,campaignId);if(!check.ok)throw Error(check.reason);
 return check;
}
export function recordCampaignCoinAdjustment(character,{campaignId,minute,id,at,deltaPence,reason}){
 if(!Number.isSafeInteger(deltaPence)||!deltaPence||typeof id!=='string'||!id||typeof at!=='string'||!at||
  typeof reason!=='string'||reason.trim().length<5)
  throw Error('Neplatná finanční úprava GM.');
 const account=ensureCampaignCashAccount(character,campaignId,minute);
 account.adjustments.push({kind:'gm-coin-adjustment',id,at,deltaPence,reason:reason.trim(),campaignId,campaignMinute:minute});
 const check=coinBalance(character,campaignId);if(!check.ok)throw Error(check.reason);
 return check;
}
export function libraryPurchasePrice(definition){
 const price=definition?.properties?.pricePence;
 return Number.isSafeInteger(price)&&price>=0?price:null;
}
export function libraryPurchaseOffer(definition){
 const single=libraryPurchasePrice(definition);
 if(single!==null)return {pricePence:single,quantity:1};
 const dozen=definition?.properties?.pricePerDozenPence;
 return Number.isSafeInteger(dozen)&&dozen>=0?{pricePence:dozen,quantity:12}:null;
}
export function suitPurchasePrice(suit){const price=suit?.price;return Number.isSafeInteger(price)&&price>=0?price:null;}
export function prepareLibraryPurchase(character,price,campaignId=null){
 if(campaignId===null&&Object.keys(character?.hmk?.campaignCashAccounts??{}).length)throw Error('Zvolte konkrétní kampaň.');
 const cash=coinBalance(character,campaignId);if(!cash.ok)throw Error(cash.reason);
 if(!Number.isSafeInteger(price)||price<0)throw Error('Chybí ověřená cena v d; nákup nelze provést.');
 if(price>cash.balance)throw Error(`Nedostatek peněz: cena ${price}d, hotovost ${cash.balance}d.`);
 return {cost:price,balanceBefore:cash.balance,balanceAfter:cash.balance-price};
}
function appendOnly(was,now,message){
 if(!Array.isArray(was)||!Array.isArray(now)||now.length<was.length||
  JSON.stringify(was)!==JSON.stringify(now.slice(0,was.length)))throw Error(message);
}
export function assertCashLedgerAppendOnly(before,after){
 const current=new Map((after?.characters||[]).map(c=>[c.id,c]));
 for(const old of before?.characters||[]){
  const next=current.get(old.id);if(!next)continue;
  appendOnly(old?.hmk?.cashLedger??[],next?.hmk?.cashLedger??[],'Historie nákupů nesmí být změněna.');
  appendOnly(old?.hmk?.coinAdjustments??[],next?.hmk?.coinAdjustments??[],'Historie mincí nesmí být změněna.');
  if(Object.keys(old.hmk?.campaignCashAccounts??{}).length||Object.keys(next.hmk?.campaignCashAccounts??{}).length){
   if((old.hmk?.cashLedger??[]).length!==(next.hmk?.cashLedger??[]).length||
    (old.hmk?.coinAdjustments??[]).length!==(next.hmk?.coinAdjustments??[]).length)
    throw Error('Po založení účtu kampaně nelze přidávat další neznačené historické finanční zápisy.');
  }
  if(old.hmk?.coinsPence!==next.hmk?.coinsPence&&old.hmk?.coinsPence!==undefined)throw Error('Počáteční hotovost nelze editací změnit.');
  const past=old.hmk?.campaignCashAccounts??{},present=next.hmk?.campaignCashAccounts??{};
  for(const [key,original] of Object.entries(past)){
   const updated=present[key];if(!updated)throw Error('Účet staré kampaně nelze odstranit.');
   for(const immutable of ['format','campaignId','openingPence','openedAtMinute','forkedFromCampaignId'])
    if(JSON.stringify(original[immutable])!==JSON.stringify(updated[immutable]))throw Error('Počáteční zůstatek kampaně nelze změnit.');
   appendOnly(original.purchases,updated.purchases,'Nákupy jiné kampaně či historické účtenky nelze změnit.');
   appendOnly(original.adjustments,updated.adjustments,'GM úpravy jiné kampaně nelze změnit.');
  }
 }
 for(const c of [...(after?.characters??[]),...(after?.trash??[])]){
  if(c.hmk?.campaignCashAccounts!==undefined)validateCampaignCashAccounts(c);
 }
 return true;
}
