import {assertGMOnlyCampaignTime} from './hmk-gm-clock-authority.js';
import {assertCommittedMoralePsycheDebts} from './hmk-morale-psyche-bridge.js';
import {assertCommittedFearTransitions} from './hmk-fear-write-invariant.js';
import {assertCommittedShadeTransitions} from './hmk-shade-write-invariant.js';
import {assertCommittedPelahnBurstSources} from './hmk-pelahn-burst-write-invariant.js';
/**
 * HMK Keeper's Ledger — verified single-record localStorage checkpoint.
 * Combat state, wounds, inventory, journal and Initiative are serialized
 * together.  A failed/ambiguous write must not permit a blind retry that
 * duplicates a real attack or a physical die result.
 *
 * This adapter makes NO game-rule decisions and rolls NO dice.
 */
const result=(ok,readOnly,code)=>({ok,readOnly,code});
export function persistVerifiedCombatSnapshot({storage,key,baseline,serialized,gmClockAdvance=false,restoreBackup=false}={}){
 if(!storage||typeof key!=='string'||!key||
    !(baseline===null||typeof baseline==='string')||typeof serialized!=='string')
  throw Error('Neplatný požadavek na trvalý kontrolní bod');
 let before;
 try{before=storage.getItem(key)}
 catch{return result(false,true,'read-failed')}
 if(before!==baseline)return result(false,true,'concurrent-change');
 // Fail closed even for direct module invocations that bypass the UI save().
 // Full-document checkpoints are checked; small-string storage adapter unit
 // fixtures do not represent game documents.
 try{
  if(before!==null){
   const old=JSON.parse(before),next=JSON.parse(serialized);
   if(old&&next&&Array.isArray(old.characters)&&Array.isArray(next.characters)&&!restoreBackup)
    assertGMOnlyCampaignTime(old,next,{gmClockAdvance});
   assertCommittedMoralePsycheDebts(old,next);
   assertCommittedFearTransitions(old,next);
   assertCommittedShadeTransitions(old,next);
   assertCommittedPelahnBurstSources(old,next);
  }
 }catch(e){
  if(e?.message?.startsWith('Čas kampaně')||e?.message?.startsWith('Předchozí časové')||e?.message?.startsWith('Posun času'))return result(false,false,'gm-only-clock');
  if(e?.message?.startsWith('Morale → Psyche:'))return result(false,true,'unresolved-morale-psyche');
  if(e?.message?.startsWith('Fear/Aberrance:'))return result(false,true,'unresolved-fear-aberrance');
  if(e?.message?.startsWith('Total Release Shade:'))return result(false,true,'invalid-shade-transition');
  if(e?.message?.startsWith('Raw Pèleáhn'))return result(false,true,'invalid-pelahn-source-transition');
  // A claimed structured checkpoint must never be accepted with invalid JSON.
  // Literal-string fixtures are used only by the storage adapter tests.
  if(before?.trimStart().startsWith('{')||serialized.trimStart().startsWith('{'))
   return result(false,true,'invalid-combat-snapshot');
 }
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
