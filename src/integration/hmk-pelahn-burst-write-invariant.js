/** HMK p.204: monotone Raw Principle source history across the single
 * verified full-document CAS. No direct mutation/removal of an old source.
 * A new source must be causally linked to a physically entered Total Release.
 */
import {listPelahnBurstSources} from './hmk-pelahn-burst-registry.js';
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valid=(x)=>{if(!x)throw Error('Raw Pèleáhn persistence: nepovolený přechod zdrojů');};
export function assertCommittedPelahnBurstSources(before,after){
 const a=before?.combatRuntime?.sequence,b=after?.combatRuntime?.sequence;
 if(!a||!b)return;
 const prev=listPelahnBurstSources(a),next=listPelahnBurstSources(b);
 // Source/END proof is historical evidence. An old turn cannot be made
 // payable again by deleting or rewriting its original log or journal entry.
 const recorded=seq=>(seq.log??[]).filter(e=>typeof e.type==='string'&&
  (e.type.startsWith('pelahn-')||e.type==='spell-pyre-total-release'));
 const oldLog=recorded(a),newLog=recorded(b);
 valid(newLog.length>=oldLog.length&&oldLog.every((event,i)=>eq(event,newLog[i])));
 const oldJ=(before.journal??[]).filter(e=>typeof e.id==='string'&&
  (e.id.startsWith('total-release:')||e.id.startsWith('pelahn:')||e.id.startsWith('pelahn-spellstart:')));
 const newJ=(after.journal??[]);
 valid(oldJ.every(j=>newJ.filter(n=>n.id===j.id&&eq(n,j)).length===1));
 valid(next.length>=prev.length&&next.length<=prev.length+1&&
  prev.every((source,i)=>eq(source,next[i])));
 if(next.length===prev.length)return;
 const source=next.at(-1),id=source.id;
 valid(b.timelineId===a.timelineId&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id).length===1&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].round===source.startRound&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].actorId===source.casterId&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].spell===source.spell&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].complexity===source.complexity&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].startRound===source.startRound&&
  b.log.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id)[0].endRound===source.endRound&&
  eq(b.log.find(e=>e.type==='pelahn-total-release-source'&&e.eventId===id).center,source.center));
 const record=b.log.find(e=>e.type==='pelahn-total-release-source'&&e.eventId===id);
 const dice=record.physicalDice;
 valid(record.gmEnteredDice===true&&Array.isArray(dice)&&dice.length>=3&&
  dice.every(d=>d.source==='GM-entered-physical-die'&&Number.isSafeInteger(d.value)&&
   d.value>=1&&d.value<=d.faces&&[6,100].includes(d.faces))&&
  dice.slice(0,3).every(d=>d.faces===100)&&dice[1].value===100);
 const caster=after.characters?.find(c=>c.id===source.casterId);
 const event=caster?.hmk?.combatState?.events?.find(e=>e.id===id+':total-release');
 const journal=after.journal?.find(x=>x.id==='total-release:'+id);
 valid(event?.type==='hmk-spell-total-release'&&
  event.details?.sourceEventId===id&&event.details?.spell===source.spell&&
  event.details?.castingD100===dice[0].value&&event.details?.spiritD100===dice[2].value&&
  event.details?.complexity===source.complexity&&
  journal?.combatProof?.actionKind==='pelahn-total-release'&&
  journal?.combatProof?.sourceEventId===id&&journal?.combatProof?.spell===source.spell&&
  eq(journal.combatProof.physicalDice,dice));
 // A source may be committed only in its causal Incant turn, never by a
 // later forged source inserted between turns.
 valid(source.startRound===a.round&&a.active===true&&
  a.order[a.cursor]===source.casterId&&b.log.some(e=>e.type==='turn-complete'&&
   e.actorId===source.casterId&&e.round===source.startRound&&e.action==='incant'));
}
