/** Fail closed even if a client bypasses the Fear UI or calls the CAS directly.
 * No new writers; this function only checks proposed full-document diffs. */
import {successLevel} from '../rules/tests.js';
import {fearResult} from '../rules/fear.js';
const valid=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const need=(b,m)=>{if(!b)throw Error('Fear/Aberrance: '+m)};
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const names=['CF','F','S','CS'];
export function assertCommittedFearTransitions(before,after){
 if(!Array.isArray(before?.characters)||!Array.isArray(after?.characters))return;
 const priorLog=(before.combatRuntime?.sequence?.log??[]).filter(e=>
  ['fear-exposure','fear-end-turn-reaction','fear-safe-recovery'].includes(e.type));
 const nextLog=(after.combatRuntime?.sequence?.log??[]).filter(e=>
  ['fear-exposure','fear-end-turn-reaction','fear-safe-recovery'].includes(e.type));
 need(nextLog.length>=priorLog.length&&priorLog.every((e,i)=>same(e,nextLog[i])),
  'původní Fear časovou osu nelze podvrhnout ani odstranit');
 for(const newC of after.characters){
  const oldC=before.characters.find(x=>x.id===newC.id);
  if(!oldC?.hmk?.combatState||!newC?.hmk?.combatState)continue;
  const oldS=oldC.hmk.combatState,newS=newC.hmk.combatState;
  const oldIds=new Set((oldS.events??[]).map(e=>e.id));
  const originalFearEvents=(oldS.events??[]).filter(e=>e.type.startsWith('hmk-fear-'));
  need(originalFearEvents.every(e=>
   (newS.events??[]).some(candidate=>candidate.id===e.id&&same(candidate,e))),
   'nelze změnit ani odstranit již potvrzený Fear/Fear Reaction důkaz');
  const pending=oldC.hmk.arcane?.pendingPsycheTraitChoice;
  if(pending&&(oldS.events??[]).some(e=>e.id===pending.sourceEventId&&e.type==='hmk-fear-exposure')&&
     !same(pending,newC.hmk?.arcane?.pendingPsycheTraitChoice)){
   need((newC.hmk?.arcane?.psycheTraumas??[]).some(t=>
     t.sourceEventIds?.includes(pending.sourceEventId))&&
    after.journal?.some(j=>j.id==='psyche-choice:'+pending.sourceEventId&&
     j.combatProof?.sourceEventId===pending.sourceEventId&&
     j.combatProof?.actionKind==='spell-psyche-trait-choice'&&
     j.combatProof?.psycheLevels===pending.levels&&j.combatProof?.gmConfirmed===true),
    'Fear PSY volba nesmí zmizet bez skutečné autoritativní volby Psyche Traitu');
  }
  const changes=(newS.events??[]).filter(e=>!oldIds.has(e.id)&&
   ['hmk-fear-exposure','hmk-fear-safe-recovery','hmk-fear-end-turn-reaction'].includes(e.type));
  const changed=!same(oldS.fear,newS.fear);
  if(!changes.length){need(!changed,'změna Fear bez autoritativní události');continue;}
  need(changes.length===1&&changed,'jediný zdroj a jeden checkpoint na jednu událost');
  const event=changes[0],d=event.details??{},f=newS.fear;
  need(f&&typeof event.id==='string'&&
   after.journal?.some(j=>j.id==='fear:'+event.id&&j.characterId===newC.id&&
    j.combatProof?.sourceEventId===event.id),
   'chybí stav nebo originální deníkový důkaz');
  if(event.type==='hmk-fear-exposure'){
   const oldFear=oldS.fear??null;
   need(!oldFear||['steady','brave'].includes(oldFear.state),'další současný strach je nepovolený');
   const wil=oldC.hmk?.attributes?.wil,abe=d.aberrance;
   need(valid(wil,1,40)&&valid(d.physicalD100,1,100)&&valid(abe,0,200)&&
    d.willAttribute===wil&&d.willEML===wil*5&&d.gmConfirmed===true&&
    d.gmConfirmedSource===true,'neodpovídá fyzický Will d100');
   if(d.sourceKind==='character'){
    const source=before.characters.filter(x=>x.id===d.sourceId);
    need(source.length===1&&
     (source[0].hmk?.attributes?.aberrance??source[0].hmk?.attributes?.abe)===abe,
     'podvržená zdrojová Aberrance');
   }else need(d.sourceKind==='gm-event'&&d.sourceDescription?.length>=10,
    'chybí doložená GM událost');
   const eml=wil*5-5*abe+(oldFear?.state==='brave'?20:0),
    sl=successLevel(d.physicalD100,eml),r=fearResult({sl,roll:d.physicalD100,aberrance:abe});
   need(d.finalEML===eml&&d.successLevel===names[sl]&&
    d.resultState===r.state&&d.psycheStress===r.psycheStress&&
    f.state===r.state&&f.sourceId===d.sourceId&&f.sourceABE===abe&&
    f.sourceEventId===event.id&&f.timelineId===d.timelineId,
    'úroveň Fear nebo PSY neodpovídá fyzickému hodu');
   need((newS.morale?.psycheStress??0)===(oldS.morale?.psycheStress??0)+r.psycheStress,
    'PSY se musí uložit ve stejném checkpointu');
   if(r.psycheStress)need(newC.hmk?.arcane?.pendingPsycheTraitChoice?.sourceEventId===event.id&&
    newC.hmk.arcane.pendingPsycheTraitChoice.levels===r.psycheStress,
    'chybí povinný výběr Psyche Traitu');
   need(after.combatRuntime?.sequence?.log?.some(e=>e.type==='fear-exposure'&&
    e.eventId===event.id&&e.actorId===newC.id&&e.sourceId===d.sourceId),
    'chybí Initiative důkaz zdroje');
   need(after.journal.find(j=>j.id==='fear:'+event.id)?.combatProof?.physicalDice?.[0]?.value===d.physicalD100&&
    after.journal.find(j=>j.id==='fear:'+event.id)?.combatProof?.physicalDice?.[0]?.faces===100,
    'chybí fyzická kostka v důkazu');
  }else if(event.type==='hmk-fear-end-turn-reaction'){
   need(oldS.fear&&['afraid','catatonic'].includes(oldS.fear.state)&&
    oldS.fear.sourceEventId===d.sourceEventId&&f.sourceEventId===d.sourceEventId&&
    f.lastReactionRound===after.combatRuntime?.sequence?.round&&
    d.gmConfirmed===true,'Fear end-turn nemá doloženou původní událost');
   const wil=oldC.hmk?.attributes?.wil,eml=wil*5-5*oldS.fear.sourceABE;
   need(valid(wil,1,40)&&valid(d.physicalD100,1,100)&&d.willAttribute===wil&&
    d.aberrance===oldS.fear.sourceABE&&d.finalEML===eml,
    'neodpovídá Will/ABE při opakovaném testu');
   const sl=successLevel(d.physicalD100,eml),afterFear=(sl===2||sl===3)?
    (oldS.fear.state==='catatonic'?'terrified':'steady'):oldS.fear.state;
   need(d.successLevel===names[sl]&&d.beforeState===oldS.fear.state&&
    d.afterState===afterFear&&f.state===afterFear&&
    newS.morale?.psycheStress===oldS.morale?.psycheStress,
    'podvržený výsledek Fear Reaction');
   const seq=before.combatRuntime?.sequence;
   need(seq?.pendingEndTurnAction?.actorId===newC.id&&
    seq.pendingEndTurnAction.pendingEffects?.includes('fear-end-turn-reaction')&&
    after.combatRuntime?.sequence?.log?.some(e=>e.type==='fear-end-turn-reaction'&&
     e.eventId===event.id&&e.actorId===newC.id&&e.physicalD100===d.physicalD100&&
     e.afterState===afterFear),
    'reakce musí navazovat na skutečnou odloženou akci');
  }else{
   need(oldS.fear&&oldS.fear.sourceEventId===d.sourceEventId&&
    oldS.fear.state===d.beforeState&&f.state==='steady'&&
    f.sourceEventId===oldS.fear.sourceEventId&&
    (oldS.fear.state==='afraid'||oldS.fear.state==='terrified'||oldS.fear.state==='brave'),
    'zotavení nemá autoritativní původ');
   const required=oldS.fear.state==='afraid'?1:oldS.fear.state==='terrified'?10:5;
   need(after.combatRuntime?.sequence?.log?.some(e=>e.type==='fear-safe-recovery'&&
    e.actorId===newC.id&&e.eventId===event.id&&e.afterState==='steady'),
    'chybí časová evidence potvrzeného zotavení');
   need(d.gmConfirmed===true&&(oldS.fear.state==='brave'||d.safeFromSource===true)&&
    valid(d.elapsedMinutes,required,999999)&&
    (oldS.fear.state!=='afraid'||d.outOfLOS===true)&&
    newS.morale?.psycheStress===oldS.morale?.psycheStress,
    'předčasné zotavení nebo vymazání PSY');
  }
 }
}
