/** HMK pp.203–204,255. Immutable Neutral Total Release provenance at the
 * existing single-document storage boundary and at campaign restoration.
 * No second caster/source registry; only Initiative + Combat State + Journal.
 */
import {neutralVortexSourceSelection} from './hmk-neutral-vortex-sequence.js';
import {neutralVortexRoundPreflight} from './hmk-neutral-vortex-round-preflight.js';
const js=JSON.stringify;
const insist=(yes,why)=>{if(!yes)throw Error('Neutral Total Release persistence: '+why)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const kind='hmk-neutral-total-release-native-cl1-v1';
const receipts=d=>(d?.journal??[]).filter(j=>j?.calendarNeutralTotalRelease);
export function validateNeutralTotalReleaseHistory(document){
 insist(Array.isArray(document?.journal),'chybí Journal');
 const seen=new Set(),seq=document.combatRuntime?.sequence;
 for(const j of receipts(document)){
  const c=j.calendarNeutralTotalRelease,proof=j.combatProof;
  insist(c?.format===kind&&c.spell==='Detect'&&c.castingSL==='CF'&&
   typeof c.casterId==='string'&&c.casterId===j.characterId&&
   typeof c.spellstartId==='string'&&c.spellstartId&&
   typeof c.sourceId==='string'&&c.sourceId&&
   typeof c.finishId==='string'&&c.finishId&&
   typeof proof?.sourceEventId==='string'&&proof.sourceEventId&&
   j.id==='neutral-total-release:'+proof.sourceEventId&&
   proof.actionKind==='neutral-total-release'&&
   proof.spellstartId===c.spellstartId&&
   !seen.has(j.id)&&!seen.has('start:'+c.spellstartId),
   'duplicitní nebo neplatný Total Release důkaz');
  seen.add(j.id);seen.add('start:'+c.spellstartId);
  const starts=document.journal.filter(s=>s.id===c.spellstartId&&
   s.combatProof?.actionKind==='neutral-spellstart'&&
   s.characterId===c.casterId&&s.combatProof.spell==='Detect'&&
   s.combatProof.finishId===c.finishId&&s.combatProof.sourceId===c.sourceId&&
   s.combatProof.timelineId===proof.timelineId&&
   s.combatProof.startRound+s.combatProof.castingTimeRounds===proof.round);
  insist(starts.length===1,'neexistuje jediný původní Neutral Spellstart');
  const dice=proof.physicalDice;
  insist(Array.isArray(dice)&&dice.length>=3&&
   dice.every(d=>int(d.faces,1,100)&&int(d.value,1,d.faces)&&
    d.source==='GM-entered-physical-die')&&
   dice[0].faces===100&&dice[1].faces===100&&dice[1].value===100&&
   dice[2].faces===100&&
   c.spirit?.spiritD100===dice[2].value&&
   c.spirit?.spellCL===1&&c.spirit?.shade===false&&
   c.spirit?.psycheStress===3&&
   dice.length===3+c.spirit.lossD6.length&&
   c.spirit.lossD6.every((d,i)=>dice[i+3].faces===6&&dice[i+3].value===d),
   'chybí úplné fyzické Casting/Misfire/Spirit kostky');
  const vortex=c.vortex;
  insist(vortex?.ended===true&&vortex.roundOffset===0&&
   vortex.radiusBeforeFeet===2.5&&
   Array.isArray(vortex.continuingSuppressions)&&vortex.continuingSuppressions.length===0&&
   Array.isArray(vortex.outcomes)&&vortex.outcomes.every(o=>o.successLevel==='S'&&o.suppressed===false)&&
   Array.isArray(vortex.physicalRolls)&&Array.isArray(vortex.sourceIds)&&
   Array.isArray(vortex.wardBlockedSourceIds)&&
   vortex.outcomes.every(o=>vortex.physicalRolls.filter(r=>r.sourceId===o.sourceId&&
    r.d100===o.physicalD100).length===1),
   'Vortex není skutečně uzavřen nebo má nedoložené potlačení');
  insist(vortex.gmNoOtherArcaneSourcesConfirmed===true&&
   Array.isArray(vortex.sourceCensus)&&Array.isArray(vortex.tickSources)&&
   js(vortex.sourceCensus)===js(vortex.tickSources)&&
   js(vortex.sourceIds)===js(vortex.sourceCensus.map(s=>s.id).sort()),
   'chybí původní úplný soupis zdrojů Vortexu');
  const sourceSelection=neutralVortexSourceSelection({sources:vortex.sourceCensus,
   origin:vortex.originalCenter,radiusFeet:2.5,spellCL:1,
   physicalSelectionDie:vortex.selectionDie});
  insist(sourceSelection.selectedSourceId===vortex.selectedSourceId,
   'náhodný fyzický dN Vortexu nesouhlasí');
  const originalRound=neutralVortexRoundPreflight({spellCL:1,roundOffset:0,
   origin:vortex.originalCenter,radiusFeet:2.5,sources:vortex.tickSources,
   gmCompleteCensusConfirmed:true,selectedSourceId:vortex.selectedSourceId,
   gmRandomSelectionConfirmed:sourceSelection.selectionDie!==null,
   selectionProof:sourceSelection.selectionDie===null?null:
    `GM-physical-d${sourceSelection.selectionDie.faces}:${sourceSelection.selectionDie.value}`,
   rolls:vortex.physicalRolls});
  insist(js(originalRound.centre)===js(vortex.resolvedCenter)&&
   originalRound.radiusNextFeet===vortex.radiusNextFeet&&
   js(originalRound.outcomes)===js(vortex.outcomes)&&
   js(originalRound.wardBlockedSourceIds)===js(vortex.wardBlockedSourceIds),
   'uložený Vortex neodpovídá originálním fyzickým hodům');
  // Combat timeline can have ended after the spellfire. When it remains
  // available, the ORIGINAL immutable event must still be present.
  if(seq?.timelineId===proof.timelineId){
   const logs=seq.log?.filter(e=>e.type==='neutral-incant-spellfire-total-release'&&
    e.eventId===proof.sourceEventId&&e.actorId===c.casterId&&
    e.round===proof.round&&e.spellstartId===c.spellstartId&&
    js(e.physicalDice)===js(dice)&&js(e.vortex)===js(vortex));
   const actor=document.characters?.find(a=>a.id===c.casterId);
   const events=actor?.hmk?.combatState?.events?.filter(e=>
    e.id===proof.sourceEventId+':total-release'&&e.type==='hmk-spell-total-release'&&
    e.round===proof.round&&e.details?.sourceEventId===proof.sourceEventId&&
    e.details?.spiritD100===c.spirit.spiritD100&&
    e.details?.spiritMLLoss===c.spirit.spiritMLLoss);
   insist(logs?.length===1&&events?.length===1,
    'Initiative nebo Combat State ztratil originální Total Release');
  }
 }
 return true;
}
export function assertCommittedNeutralTotalRelease(before,after){
 if(!Array.isArray(before?.journal)||!Array.isArray(after?.journal))return;
 const old=receipts(before),next=receipts(after);
 insist(next.length>=old.length&&next.length<=old.length+1&&
  old.every(j=>next.filter(n=>n.id===j.id&&js(j)===js(n)).length===1),
  'nelze odstranit, přepsat nebo přidat více Total Release důkazů');
 validateNeutralTotalReleaseHistory(after);
 if(next.length===old.length)return;
 const j=next.find(n=>!old.some(x=>x.id===n.id)),c=j.calendarNeutralTotalRelease,
  p=j.combatProof,id=p.sourceEventId;
 const oldSeq=before.combatRuntime?.sequence,newSeq=after.combatRuntime?.sequence;
 insist(oldSeq?.timelineId===p.timelineId&&newSeq?.timelineId===p.timelineId&&
  oldSeq.round===p.round&&oldSeq.active===false&&
  oldSeq.order[oldSeq.cursor]===c.casterId&&
  newSeq.log.filter(e=>e.type==='neutral-incant-spellfire-total-release'&&e.eventId===id).length===1&&
  newSeq.log.some(e=>e.type==='turn-complete'&&e.actorId===c.casterId&&
   e.round===p.round&&e.action==='incant'),
  'není platná původní Initiative transakce');
 const original=before.characters?.find(x=>x.id===c.casterId),actor=after.characters?.find(x=>x.id===c.casterId),
  oldSpirit=original?.hmk?.skills?.filter(s=>String(s.name).trim().toLowerCase()==='spirit'),
  newSpirit=actor?.hmk?.skills?.filter(s=>String(s.name).trim().toLowerCase()==='spirit'),
  oldState=original?.hmk?.combatState,state=actor?.hmk?.combatState;
 insist(oldSpirit?.length===1&&newSpirit?.length===1&&
  oldSpirit[0].ml===c.spirit.spiritML&&
  newSpirit[0].ml===Math.max(0,oldSpirit[0].ml-c.spirit.spiritMLLoss)&&
  c.spiritMLAfter===newSpirit[0].ml&&
  (actor.hmk.arcane.auralShockLevels??0)===(original.hmk.arcane.auralShockLevels??0)+c.spirit.auralShock&&
  state.fatigue.windedness===oldState.fatigue.windedness+c.castingFatigue&&
  state.fatigue.otherWeakness===oldState.fatigue.otherWeakness+5*c.spirit.auralShock&&
  state.morale.psycheStress===oldState.morale.psycheStress+3&&
  actor.hmk.arcane.pendingPsycheTraitChoice?.sourceEventId===id&&
  actor.hmk.arcane.pendingPsycheTraitChoice.levels===3&&
  !(original.hmk.arcane.misfireLostSpells??[]).includes('Neutral::Detect')&&
  actor.hmk.arcane.misfireLostSpells?.includes('Neutral::Detect')&&
  p.physicalDice[0].value>=1,
  'Spirit ML, Psyche, Aural Shock, Fatigue nebo Crucial ztráta kouzla nesouhlasí');
}
