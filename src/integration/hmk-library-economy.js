/** v93.265 – ledger of *actual* purchases, distinct from initial Wealth.
 * Legacy profiles remain readable. This is an acquisition-accounting contract,
 * not a conversion of unused starting possessions allowance into cash. */
export function coinBalance(character){
 const h=character?.hmk||{};const initial=h.coinsPence;
 if(!Number.isSafeInteger(initial)||initial<0) return {ok:false,reason:'Postava nemá doloženou počáteční hotovost (coinsPence).',initial:null,balance:null,spent:null};
 if(h.wealth!==undefined&&(!Number.isSafeInteger(h.wealth)||h.wealth<0||h.wealth*10!==initial))return {ok:false,reason:'Nesoulad počáteční hotovosti a Wealth.',initial,balance:null,spent:null};
 const ledger=h.cashLedger??[];
 if(!Array.isArray(ledger))return {ok:false,reason:'Poškozená historie nákupů.',initial,balance:null,spent:null};
 let spent=0;const ids=new Set();
 for(const entry of ledger){
  if(!entry||entry.kind!=='library-purchase'||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||!Number.isSafeInteger(entry.amountPence)||entry.amountPence<0||!Array.isArray(entry.inventoryIds)||!entry.inventoryIds.length){return {ok:false,reason:'Neplatná nebo duplicitní transakce.',initial,balance:null,spent:null};}
  ids.add(entry.id);spent+=entry.amountPence;
  if(!Number.isSafeInteger(spent)||spent>initial)return {ok:false,reason:'Historie výdajů překračuje počáteční hotovost.',initial,balance:null,spent:null};
 }
 return {ok:true,initial,spent,balance:initial-spent,transactions:ledger.length};
}
export function libraryPurchasePrice(definition){
 const price=definition?.properties?.pricePence;
 return Number.isSafeInteger(price)&&price>=0?price:null;
}
/** Catalogue may price ammunition by the dozen, never treat it as unit price. */
export function libraryPurchaseOffer(definition){
 const single=libraryPurchasePrice(definition);
 if(single!==null)return {pricePence:single,quantity:1};
 const dozen=definition?.properties?.pricePerDozenPence;
 return Number.isSafeInteger(dozen)&&dozen>=0?{pricePence:dozen,quantity:12}:null;
}
export function suitPurchasePrice(suit){
 const price=suit?.price;
 return Number.isSafeInteger(price)&&price>=0?price:null;
}
export function prepareLibraryPurchase(character,price){
 const cash=coinBalance(character);
 if(!cash.ok)throw Error(cash.reason);
 if(!Number.isSafeInteger(price)||price<0)throw Error('Chybí ověřená cena v d; nákup nelze provést.');
 if(price>cash.balance)throw Error(`Nedostatek peněz: cena ${price}d, hotovost ${cash.balance}d.`);
 return {cost:price,balanceBefore:cash.balance,balanceAfter:cash.balance-price};
}
export function assertCashLedgerAppendOnly(before,after){
 const current=new Map((after?.characters||[]).map(c=>[c.id,c]));
 for(const old of before?.characters||[]){
  const next=current.get(old.id);if(!next)continue;
  const was=old?.hmk?.cashLedger??[],now=next?.hmk?.cashLedger??[];
  if(was.length&&!Array.isArray(now))throw Error('Historie nákupů musí být zachována.');
  if(!Array.isArray(was)||!Array.isArray(now)||now.length<was.length)throw Error('Historie nákupů nesmí být zkrácena.');
  for(let i=0;i<was.length;i++)if(JSON.stringify(was[i])!==JSON.stringify(now[i]))throw Error('Starší transakci nelze změnit.');
  if(was.length&&old.hmk?.coinsPence!==next.hmk?.coinsPence)throw Error('Po nákupu nelze bez účetní migrace přepsat počáteční hotovost.');
 }
}
