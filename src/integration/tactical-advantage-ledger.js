/** HMK p.171: conservative, auditable Action/Setup TA ledger.
 * Impact and Precision TA are immediate outcome choices, not persistent credits.
 * The caller must supply an independently validated award.
 */
export function validateTALedger(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.credits)||!Array.isArray(value.actionUses))throw new TypeError('Invalid TA ledger');
 for(const c of value.credits){
  if(!c||typeof c.id!=='string'||!c.id||typeof c.ownerId!=='string'||!c.ownerId||!['action','setup'].includes(c.type)||!Number.isSafeInteger(c.round)||c.round<1||!Number.isSafeInteger(c.ir)||c.ir<0||c.ir>100||typeof c.used!=='boolean'||(c.weaponSlot!==null&&!['main_hand','off_hand'].includes(c.weaponSlot)))throw new TypeError('Invalid TA credit');
 }
 if(new Set(value.credits.map(c=>c.id)).size!==value.credits.length)throw new TypeError('Duplicate TA credit');
 for(const u of value.actionUses)if(!u||typeof u.ownerId!=='string'||!Number.isSafeInteger(u.round)||u.round<1||typeof u.turnKey!=='string'||!u.turnKey||!['main_hand','off_hand'].includes(u.weaponSlot))throw new TypeError('Invalid action use');
 return value;
}
export function emptyTALedger(){return {credits:[],actionUses:[]};}
export function awardTACredit(ledger,{id,ownerId,type,round,ir,weaponSlot=null,verified=false}){
 validateTALedger(ledger);
 if(verified!==true)throw new Error('TA award requires verified outcome');
 const next={credits:[...ledger.credits,{id,ownerId,type,round,ir,weaponSlot,used:false}],actionUses:[...ledger.actionUses]};validateTALedger(next);return next;
}
export function spendTACredit(ledger,{id,ownerId,round,ir,turnKey,weaponSlot='main_hand',twoWeaponException=false}){
 validateTALedger(ledger);
 if(!Number.isSafeInteger(round)||round<1||!Number.isSafeInteger(ir)||ir<0||ir>100||!turnKey)throw new RangeError('Invalid combat clock');
 const c=ledger.credits.find(c=>c.id===id&&c.ownerId===ownerId);
 if(!c||c.used)throw new Error('TA unavailable or already used');
 if(round<c.round)throw new Error('TA not yet earned');
 if(c.type==='setup'&&(round>c.round+1||(round===c.round+1&&ir<c.ir)))throw new Error('Setup TA expired');
 if(c.type==='action'){
  if(round!==c.round)throw new Error('Action TA must be used in its round');
  const used=ledger.actionUses.filter(u=>u.ownerId===ownerId&&u.round===round);
  if(used.some(u=>u.turnKey===turnKey))throw new Error('Only one Action TA per character turn');
  if(used.length && !(twoWeaponException&&used.length===1&&used[0].weaponSlot!==weaponSlot&&c.weaponSlot===weaponSlot))throw new Error('Action TA round limit');
 }
 const next={credits:ledger.credits.map(x=>x.id===id?{...x,used:true}:x),actionUses:c.type==='action'?[...ledger.actionUses,{ownerId,round,turnKey,weaponSlot}]:[...ledger.actionUses]};validateTALedger(next);return next;
}
export function availableTACredits(ledger,{ownerId,round,ir,type}){
 validateTALedger(ledger);
 return ledger.credits.filter(c=>c.ownerId===ownerId&&c.type===type&&!c.used&&round>=c.round&&(type==='action'?round===c.round:round<c.round+1||(round===c.round+1&&ir>=c.ir)));
}

/** Prepare a Setup TA spend without mutating the ledger; commit only after test resolution. */
export function prepareSetupSpend(ledger,{ids=[],ownerId,round,ir}={}){
 validateTALedger(ledger);
 if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length)throw new Error('Invalid Setup TA selection');
 if(!Number.isSafeInteger(round)||round<1||!Number.isSafeInteger(ir)||ir<0||ir>100)throw new Error('Invalid combat clock');
 let next=ledger;
 for(const id of ids){
  const c=next.credits.find(c=>c.id===id&&c.ownerId===ownerId);
  if(!c||c.type!=='setup')throw new Error('Setup TA belongs to another character or is not Setup');
  next=spendTACredit(next,{id,ownerId,round,ir,turnKey:'setup:'+id});
 }
 return {count:ids.length,next};
}
