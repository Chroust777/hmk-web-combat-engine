/**
 * Global immutable application receipts (v93.719).
 * Unlike a unique clock-minute key, a receipt ID is unique for every commit;
 * independent same-minute transactions are separate rows in append-only order.
 * Evidence lives in the confirmed Health and Journal events, referenced here.
 * This journal is an audit layer, NOT a second rules engine or dice store.
 */
const assert=(v,m)=>{if(!v)throw Error(m)};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const minute=v=>v===null||(Number.isSafeInteger(v)&&v>=0&&v<=1e9);
const ints=v=>v===null||(Number.isSafeInteger(v)&&v>=0&&v<=999999);
const list=(x,n=10000)=>Array.isArray(x)&&x.length<=n&&x.every(id)&&new Set(x).size===x.length;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateGlobalActionLedger(data){
 const rows=data?.globalActionLedger??[];
 assert(Array.isArray(rows)&&rows.length<=250000,'Neplatná trvalá evidence akcí');
 const seen=new Set();let sequence=0;
 for(const r of rows){
  assert(r&&r.format==='hmk-global-action-receipt-v1'&&id(r.id)&&!seen.has(r.id)&&
   r.seq===++sequence&&minute(r.minute)&&ints(r.combatRound)&&
   (r.campaignId===null||id(r.campaignId))&&
   list(r.actorIds)&&list(r.healthEventIds)&&list(r.journalEventIds)&&
   (r.mode==='normal'||r.mode==='episode-commit')&&
   (r.createdAt===null||typeof r.createdAt==='string'),
   'Poškozený nebo přepsaný záznam globální operace');
  seen.add(r.id);
 }
 return true;
}
export function assertGlobalActionLedgerAppendOnly(before,after){
 validateGlobalActionLedger(before);validateGlobalActionLedger(after);
 const old=before?.globalActionLedger??[],now=after?.globalActionLedger??[];
 assert(now.length>=old.length&&old.every((r,i)=>eq(r,now[i])),
  'Potvrzené operace nelze smazat, přepsat nebo přečíslovat');
 return true;
}
/** Call only after original verified transition, before the same atomic save.
 * For a multi-step episode, base must be the original episode checkpoint.
 */
export function recordGlobalActionReceipt(after,{before,id:receiptId,createdAt=null,
 mode='normal'}={}){
 assert(after&&before&&id(receiptId),'Záznam operace vyžaduje platné ID a oba stavy');
 assertGlobalActionLedgerAppendOnly(before,after);
 const previous=new Map((before.characters??[]).map(c=>[c.id,c]));
 const actorIds=(after.characters??[]).filter(c=>!eq(previous.get(c.id),c)).map(c=>c.id);
 const healthEventIds=[];
 for(const c of after.characters??[]){
  const former=new Set((previous.get(c.id)?.hmk?.healthState?.events??[]).map(e=>e.id));
  for(const e of c.hmk?.healthState?.events??[]){if(!former.has(e.id)){
   assert(id(e.id),'Každý nový zdravotní důkaz musí mít ID');healthEventIds.push(e.id);
  }}
 }
 const known=new Set((before.journal??[]).map(x=>x.id));
 const journalEventIds=(after.journal??[]).filter(x=>!known.has(x.id)).map(x=>x.id);
 const evidence={actorIds:[...new Set(actorIds)],healthEventIds:[...new Set(healthEventIds)],
  journalEventIds:[...new Set(journalEventIds)]};
 // A transaction without generated proofs (e.g. inventory edit) still gets
 // its own receipt, protecting the ordering and timestamp of that mutation.
 after.globalActionLedger??=[];
 const r={format:'hmk-global-action-receipt-v1',id:receiptId,
  seq:after.globalActionLedger.length+1,
  minute:after.campaignClock?.minute??null,
  combatRound:after.combatRuntime?.clock?.round??null,
  campaignId:after.campaignClock?.campaignId??null,
  mode,createdAt,...evidence};
 after.globalActionLedger.push(r);
 validateGlobalActionLedger(after);
 assertGlobalActionLedgerAppendOnly(before,after);
 return r;
}
