import {listPelahnBurstSources} from './hmk-pelahn-burst-registry.js';
/** HMK Kèthîra v1.2 pp.203–204,396. A physical Total Release Spirit CF
 * is irreversible. This gate checks the saved, causally linked Shade record
 * even when the caller bypasses the UI and writes a full snapshot directly.
 * It does NOT implement astralscape Spirit Actions or roll dice.
 */
const json=JSON.stringify;
const insist=(ok)=>{if(!ok)throw Error('Total Release Shade: neplatná nebo ztracená proměna');};
export function assertCommittedShadeTransitions(previous,next){
 if(!Array.isArray(previous?.characters)||!Array.isArray(next?.characters))return;
 for(const old of previous.characters){
  const before=old?.hmk?.arcane?.shade??null;
  const fresh=next.characters.find(c=>c.id===old.id);
  insist(fresh);
  const after=fresh.hmk?.arcane?.shade??null;
  if(before){
   const id=before.sourceEventId;
   insist(json(before)===json(after)&&fresh.hmk.combatState?.shock==='KIA'&&
    next.combatRuntime?.sequence?.log?.some(e=>e.type==='pelahn-total-release-shade'&&e.eventId===id)&&
    next.journal?.some(j=>j.id==='total-release:'+id&&j.combatProof?.shadeTransformation===true)&&
    fresh.hmk.combatState?.events?.some(e=>e.id===id+':shade'));
   continue;
  }
  if(!after)continue;
  insist(after.format==='hmk-spirit-shade-v1'&&after.spiritWorld===true&&
   after.astralActionsEnabled===false&&after.gmDispositionRequired===true&&
   after.convocation==='Pèleáhn'&&after.physicalBody==='puff-of-smoke'&&
   typeof after.sourceEventId==='string'&&after.sourceEventId&&
   typeof after.originTimelineId==='string'&&after.originTimelineId&&
   Number.isSafeInteger(after.originRound)&&after.originRound>=1&&
   !old.hmk.arcane?.shade&&old.hmk.combatState?.shock!=='KIA'&&
   fresh.hmk.combatState?.shock==='KIA');
  const seq=next.combatRuntime?.sequence,id=after.sourceEventId;
  const source=seq?listPelahnBurstSources(seq).find(b=>b.id===id):null;
  insist(seq?.timelineId===after.originTimelineId&&source?.id===id&&
   source.casterId===old.id&&source.startRound===after.originRound&&
   source.spell&&['Doom Flame','Pyre'].includes(source.spell)&&
   source.endRound===source.startRound+(source.spell==='Pyre'?2:5));
  const records=seq.log?.filter(e=>e.type==='pelahn-total-release-source'&&e.eventId===id),
   shadeEvents=seq.log?.filter(e=>e.type==='pelahn-total-release-shade'&&e.eventId===id),
   stateEvents=fresh.hmk.combatState.events?.filter(e=>e.id===id+':shade'),
   journals=next.journal?.filter(x=>x.id==='total-release:'+id);
  insist(records?.length===1&&shadeEvents?.length===1&&stateEvents?.length===1&&journals?.length===1&&
   journals[0].combatProof?.shadeTransformation===true&&
   stateEvents[0].type==='hmk-total-release-shade');
  const physical=records[0].physicalDice;
  insist(Array.isArray(physical)&&physical.length===3&&
   physical.every(x=>x.faces===100&&Number.isSafeInteger(x.value)&&x.value>=1&&x.value<=100&&
    x.source==='GM-entered-physical-die')&&physical[1].value===100&&
   shadeEvents[0].spiritD100===physical[2].value&&
   stateEvents[0].details?.sourceEventId===id&&
   fresh.hmk.arcane?.pendingPsycheTraitChoice?.sourceEventId===id&&
   fresh.hmk.combatState.morale.psycheStress===old.hmk.combatState.morale.psycheStress+3);
 }
}
