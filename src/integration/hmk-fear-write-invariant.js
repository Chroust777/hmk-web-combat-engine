/** Fail closed even if a client bypasses the Fear UI or calls the CAS directly.
 * No new writers; this function only checks proposed full-document diffs. */
import {successLevel} from '../rules/tests.js';
import {fearResult} from '../rules/fear.js';
import {activeFearSources,hasBraveFearSource,projectFearSources} from './hmk-concurrent-fear.js';
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
  if(!oldC?.hmk?.healthState||!newC?.hmk?.healthState)continue;
  const oldS=oldC.hmk.healthState,newS=newC.hmk.healthState;
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
  // Each previously committed, source-linked Fear PSY debt is durable.
  // It may leave the pending queue only through the original GM Trait writer.
  const oldDebts=[oldC.hmk.arcane?.pendingPsycheTraitChoice,
    ...(oldC.hmk.arcane?.pendingPsycheTraitChoices??[])].filter(Boolean);
  const newDebts=[newC.hmk.arcane?.pendingPsycheTraitChoice,
    ...(newC.hmk.arcane?.pendingPsycheTraitChoices??[])].filter(Boolean);
  for(const debt of oldDebts){
   if(!(oldS.events??[]).some(e=>e.id===debt.sourceEventId&&e.type==='hmk-fear-exposure'))continue;
   if(newDebts.some(x=>same(x,debt)))continue;
   need(after.journal?.some(j=>j.id==='psyche-choice:'+debt.sourceEventId&&
    j.combatProof?.actionKind==='spell-psyche-trait-choice'&&
    j.combatProof.sourceEventId===debt.sourceEventId&&j.combatProof.psycheLevels===debt.levels&&
    j.combatProof.gmConfirmed===true)&&
    newC.hmk.arcane?.psycheTraumas?.some(t=>t.sourceEventIds?.includes(debt.sourceEventId)),
    'dříve potvrzený Fear Psyche dluh nelze odstranit ani přepsat');
  }
  const changes=(newS.events??[]).filter(e=>!oldIds.has(e.id)&&
   ['hmk-fear-exposure','hmk-fear-safe-recovery','hmk-fear-end-turn-reaction'].includes(e.type));
  const changed=!same(oldS.fear,newS.fear);
  const originsChanged=!same(activeFearSources(oldS),activeFearSources(newS));
  if(!changes.length){need(!changed&&!originsChanged,'změna Fear bez autoritativní události');continue;}
  need(changes.length===1&&originsChanged,'jeden nový Fear důkaz na jeden checkpoint');
  if(newS.fearSources!==undefined)projectFearSources(newS);
  const event=changes[0],d=event.details??{},f=newS.fear;
  // A new physical test may append exactly one new Fear origin.  An
  // unrelated event may never mutate or drop an already confirmed origin.
  const oldOrigins=activeFearSources(oldS),newOrigins=activeFearSources(newS);
  need(newOrigins.length===oldOrigins.length+(event.type==='hmk-fear-exposure'?1:0),
   'potvrzené Fear zdroje nelze přidat/smazat bez jejich vlastní události');
  for(const origin of oldOrigins){
   const nowOrigin=newOrigins.find(x=>x.sourceEventId===origin.sourceEventId);
   need(!!nowOrigin,'potvrzený zdroj strachu nelze odstranit');
   if(origin.sourceEventId!==d.sourceEventId||event.type==='hmk-fear-exposure'){
    need(same(origin,nowOrigin),'jiná událost nesmí změnit potvrzený zdroj strachu');
   }else if(event.type==='hmk-fear-safe-recovery'){
    need(same(nowOrigin,{...origin,state:'steady',lastSafeRecoveryEventId:event.id}),
     'zotavení smí změnit pouze stav doloženého zdroje');
   }else if(event.type==='hmk-fear-end-turn-reaction'){
    need(same(nowOrigin,{...origin,state:nowOrigin.state,lastReactionRound:after.combatRuntime?.sequence?.round}),
     'reakce smí změnit pouze výsledek a kolo příslušného zdroje');
   }
  }
  need(f&&typeof event.id==='string'&&
   after.journal?.some(j=>j.id==='fear:'+event.id&&j.characterId===newC.id&&
    j.combatProof?.sourceEventId===event.id),
   'chybí stav nebo originální deníkový důkaz');
  if(event.type==='hmk-fear-exposure'){
   const oldFear=oldS.fear??null;
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
   const eml=wil*5-5*abe+(hasBraveFearSource(oldS)?20:0),
    sl=successLevel(d.physicalD100,eml),r=fearResult({sl,roll:d.physicalD100,aberrance:abe});
   need(d.finalEML===eml&&d.successLevel===names[sl]&&
    d.resultState===r.state&&d.psycheStress===r.psycheStress&&
    activeFearSources(newS).some(x=>x.sourceEventId===event.id&&
     x.state===r.state&&x.sourceId===d.sourceId&&x.sourceABE===abe&&x.timelineId===d.timelineId)&&
    d.projectedState===f.state,
    'úroveň Fear nebo PSY neodpovídá fyzickému hodu');
   need((newS.morale?.psycheStress??0)===(oldS.morale?.psycheStress??0)+r.psycheStress,
    'PSY se musí uložit ve stejném checkpointu');
   if(r.psycheStress)need([newC.hmk?.arcane?.pendingPsycheTraitChoice,
    ...(newC.hmk?.arcane?.pendingPsycheTraitChoices??[])].some(x=>
     x?.sourceEventId===event.id&&x.levels===r.psycheStress),
    'chybí samostatný dluh Psyche Traitu včetně fronty');
   need(after.combatRuntime?.sequence?.log?.some(e=>e.type==='fear-exposure'&&
    e.eventId===event.id&&e.actorId===newC.id&&e.sourceId===d.sourceId),
    'chybí Initiative důkaz zdroje');
   need(after.journal.find(j=>j.id==='fear:'+event.id)?.combatProof?.physicalDice?.[0]?.value===d.physicalD100&&
    after.journal.find(j=>j.id==='fear:'+event.id)?.combatProof?.physicalDice?.[0]?.faces===100,
    'chybí fyzická kostka v důkazu');
  }else if(event.type==='hmk-fear-end-turn-reaction'){
   need(oldS.fear&&['afraid','catatonic'].includes(oldS.fear.state)&&
    oldS.fear.sourceEventId===d.sourceEventId&&
    activeFearSources(newS).some(x=>x.sourceEventId===d.sourceEventId&&x.lastReactionRound===after.combatRuntime?.sequence?.round)&&
    d.gmConfirmed===true,'Fear end-turn nemá doloženou původní událost');
   const wil=oldC.hmk?.attributes?.wil,eml=wil*5-5*oldS.fear.sourceABE;
   need(valid(wil,1,40)&&valid(d.physicalD100,1,100)&&d.willAttribute===wil&&
    d.aberrance===oldS.fear.sourceABE&&d.finalEML===eml,
    'neodpovídá Will/ABE při opakovaném testu');
   const sl=successLevel(d.physicalD100,eml),afterFear=(sl===2||sl===3)?
    (oldS.fear.state==='catatonic'?'terrified':'steady'):oldS.fear.state;
   need(d.successLevel===names[sl]&&d.beforeState===oldS.fear.state&&
    d.afterState===afterFear&&d.projectedState===f.state&&
    activeFearSources(newS).some(x=>x.sourceEventId===d.sourceEventId&&x.state===afterFear)&&
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
   need(oldS.fear&&activeFearSources(oldS).some(x=>x.sourceEventId===d.sourceEventId&&x.state===d.beforeState)&&
    d.projectedState===f.state&&
    activeFearSources(newS).some(x=>x.sourceEventId===d.sourceEventId&&x.state==='steady')&&
    (d.beforeState==='afraid'||d.beforeState==='terrified'||d.beforeState==='brave'),
    'zotavení nemá autoritativní původ');
   const required=d.beforeState==='afraid'?1:d.beforeState==='terrified'?10:5;
   need(after.combatRuntime?.sequence?.log?.some(e=>e.type==='fear-safe-recovery'&&
    e.actorId===newC.id&&e.eventId===event.id&&e.afterState==='steady'),
    'chybí časová evidence potvrzeného zotavení');
   need(d.gmConfirmed===true&&(d.beforeState==='brave'||d.safeFromSource===true)&&
    valid(d.elapsedMinutes,required,999999)&&
    (d.beforeState!=='afraid'||d.outOfLOS===true)&&
    newS.morale?.psycheStress===oldS.morale?.psycheStress,
    'předčasné zotavení nebo vymazání PSY');
  }
 }
}
