/**
 * HMK Keeper's Ledger — verified single-record localStorage checkpoint.
 * Combat state, wounds, inventory, journal and Initiative are serialized
 * together.  A failed/ambiguous write must not permit a blind retry that
 * duplicates a real attack or a physical die result.
 *
 * This adapter makes NO game-rule decisions and rolls NO dice.
 */
const result=(ok,readOnly,code)=>({ok,readOnly,code});
export function persistVerifiedCombatSnapshot({storage,key,baseline,serialized}={}){
 if(!storage||typeof key!=='string'||!key||
    !(baseline===null||typeof baseline==='string')||typeof serialized!=='string')
  throw Error('Neplatný požadavek na trvalý kontrolní bod');
 let before;
 try{before=storage.getItem(key)}
 catch{return result(false,true,'read-failed')}
 if(before!==baseline)return result(false,true,'concurrent-change');
 // A host may report a write error after the bytes were changed. A blind
 // in-memory rollback in that case would allow the same action to be replayed.
 try{storage.setItem(key,serialized)}catch{/* decide by readback */}
 let after;
 try{after=storage.getItem(key)}
 catch{return result(false,true,'verification-failed')}
 if(after===serialized)return result(true,false,'verified');
 if(after===baseline)return result(false,false,'not-saved');
 return result(false,true,'ambiguous-or-concurrent-change');
}
