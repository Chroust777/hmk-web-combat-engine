/** HMK pp.200–203,251,254: native journal invariants for committed Neutral
 * Spellstart/Spellfire; no second combat or spell history. Original events are
 * append-only, casting grades and GM dice are re-evaluated, and Dispel AS
 * must agree with the original Alchemy strength immediately before the cast.
 */
import {successLevel,indexOf} from '../rules/tests.js';
import {activeAlchemyWard,wardFromSpellfire} from './hmk-neutral-ward-lifecycle.js';
import {classifySpellMisfire} from './hmk-spell-misfire-effects.js';
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
const js=JSON.stringify;
const ok=(v,m)=>{if(!v)throw Error('Neutral history: '+m)};
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

export function validateNeutralAlchemyHistory(document){
 const journal=document?.journal;
 ok(Array.isArray(journal),'chybí původní deník');
 const previous=[],consumed=new Set(),ids=new Set();
 for(const row of journal){
  ok(typeof row.id==='string'&&row.id&&!ids.has(row.id),'duplicitní historické ID');
  ids.add(row.id);
  const c=row.calendarAlchemyNeutralCast;
  if(c){
   ok(['Detect','Reveal','Dispel','Ward'].includes(c.spell)&&c.casterId===row.characterId&&
    typeof c.finishId==='string'&&c.finishId&&typeof c.sourceId==='string'&&c.sourceId&&
    whole(row.campaignMinute,0,1e9)&&typeof row.calendarCampaignId==='string'&&
    typeof c.spellstartId==='string'&&!consumed.has(c.spellstartId),
    'neplatný nebo opakovaný Spellfire');
   const start=previous.find(j=>j.id===c.spellstartId&&
    j.calendarCampaignId===row.calendarCampaignId&&
    j.characterId===row.characterId&&
    j.combatProof?.actionKind==='neutral-spellstart'&&
    j.combatProof.casterId===c.casterId&&
    j.combatProof.spell===c.spell&&
    j.combatProof.finishId===c.finishId&&
    j.combatProof.sourceId===c.sourceId);
   ok(start&&(c.targetKind==='Ward')===(start.combatProof.targetKind==='Ward')&&
    c.spellfireRound===start.combatProof.startRound+
    start.combatProof.castingTimeRounds,
    'chybí původní stejné Spellstart / dokončený čas');
   ok(row.combatProof?.spellstartId===c.spellstartId&&
    row.combatProof?.round===c.spellfireRound&&
    row.combatProof?.timelineId===start.combatProof.timelineId&&
    Array.isArray(row.combatProof.physicalDice)&&
    row.combatProof.physicalDice[0]?.faces===100&&
    row.combatProof.physicalDice[0]?.value===c.castingD100&&
    row.combatProof.physicalDice.every(d=>d.source==='GM-entered-physical-die'),
    'Spellfire hod nemá příslušný bojový důkaz');
   ok(whole(c.castingD100,1,100)&&whole(c.castingEML,-1000,1000),
    'neplatný casting d100/EML');
   const sl=['CF','F','S','CS'][successLevel(c.castingD100,c.castingEML)];
   ok(sl===c.castingSL,'pozměněný Casting Roll nebo Success Level');
   const olderDetect=previous.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&
    j.characterId===row.characterId&&
    j.calendarAlchemyNeutralCast?.spell==='Detect'&&
    ['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL)&&
    j.calendarAlchemyNeutralCast.effect===true&&
    j.calendarAlchemyNeutralCast.detectedSources?.some(s=>s.sourceId===c.sourceId&&
     (c.targetKind==='Ward'?s.spell==='Ward'&&s.kind==='other':
      s.finishId===c.finishId&&s.kind==='alchemy')));
   const bonus=['Detect','Ward'].includes(c.spell)?0:olderDetect.some(j=>j.calendarAlchemyNeutralCast.castingSL==='CS')?20:0;
   ok(c.detectCSBonus===bonus,'neplatný bonus předchozího Detect CS');
   if(['Reveal','Dispel'].includes(c.spell))ok(olderDetect.length>0,'Reveal/Dispel bez historického Detect');
   let expectedFatigue,misfire=null;
   if(sl==='CF'){
    ok(whole(c.misfireD100,1,99)&&row.combatProof.physicalDice.length===2&&
     row.combatProof.physicalDice[1].faces===100&&
     row.combatProof.physicalDice[1].value===c.misfireD100,
     'CF nemá úplný Misfire d100, Total Release nemá zde potvrzenou větev');
    misfire=classifySpellMisfire(c.misfireD100,['Dispel','Ward'].includes(c.spell)?2:1);
    expectedFatigue=10+misfire.extraFatigue;
    ok(c.misfireKind===misfire.kind&&c.misfirePsycheStress===misfire.psycheStress&&
     c.misfireAuralShock===misfire.auralShock&&c.crucial===misfire.crucial,
     'Misfire důkaz neodpovídá fyzickému d100');
   }else{
    expectedFatigue=sl==='CS'?0:5;
    ok(row.combatProof.physicalDice.length===1&&c.misfireD100===undefined,
     'mimo CF není přípustný Misfire d100');
   }
   ok(c.castingFatigue===expectedFatigue&&c.effect===['S','CS'].includes(sl)&&
    row.combatProof.actionKind===(sl==='CF'?'neutral-spellfire-misfire':
     sl==='F'?'neutral-spellfire-failed':'neutral-spellfire-success'),
    'falešný magický efekt nebo Fatigue');
   if(['S','CS'].includes(sl)){
    if(c.spell==='Detect'){
     if(c.targetKind!=='Ward')ok(!activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
      finishId:c.finishId,sourceId:c.sourceId}),
      'Detect nesmí při aktivním Wardu prozradit chráněný elixír');
     ok(Array.isArray(c.detectedSources)&&c.detectedSources.every(src=>{
      if(src.kind==='alchemy'&&src.finishId&&src.sourceId)
       return !activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
        finishId:src.finishId,sourceId:src.sourceId});
      if(src.spell==='Ward'||src.wardLevel!==undefined||src.protectedSourceId!==undefined){
       if(typeof src.protectedSourceId!=='string'||typeof src.wardLevel!=='number')return false;
       const proof=previous.find(x=>x.id===src.sourceId&&x.calendarCampaignId===row.calendarCampaignId&&
        x.calendarAlchemyNeutralCast?.spell==='Ward');
       if(!proof)return false;
       const ward=activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
        finishId:proof.calendarAlchemyNeutralCast.finishId,sourceId:src.protectedSourceId});
       return ward?.wardProofId===src.sourceId&&ward.wardLevel===src.wardLevel&&
        src.category==='Active spell'&&src.kind==='other';
      }
      return true;
     })&&c.allSourcesGMConfirmed===true&&
      c.detectedSources.some(s=>s.sourceId===c.sourceId&&
       (c.targetKind==='Ward'?s.kind==='other'&&s.spell==='Ward':
        s.kind==='alchemy'&&s.finishId===c.finishId))&&
      new Set(c.detectedSources.map(s=>s.sourceId)).size===c.detectedSources.length,
      'Detect neobsahuje úplný GM dosvědčený přehled');
    }else if(c.spell==='Ward'){
     const originalSource=alchemyElixirStrength(previous,row.calendarCampaignId,c.finishId,row.campaignMinute);
     const previousWard=activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
      finishId:c.finishId,sourceId:c.sourceId});
     const ward=wardFromSpellfire({spellSI:indexOf(start.combatProof.spellML),castingSL:sl,
      sourceId:c.sourceId,finishId:c.finishId,spellfireId:row.id,priorWard:previousWard});
     ok(start.combatProof?.touchConfirmed===true&&
      js(c.ward)===js(ward)&&originalSource.currentAS>=1,
      'Ward nemá původní dotyk, vypočtený Ward Level nebo živý magický zdroj');
     ok(previousWard?
      start.combatProof.priorWardProofId===previousWard.wardProofId&&
      start.combatProof.priorWardLevel===previousWard.wardLevel&&
      Math.round(indexOf(start.combatProof.spellML)/2)>previousWard.wardLevel:
      start.combatProof.priorWardProofId===undefined,
      'Ward nemá doložené pravidlové přebití staršího Wardu');
    }else if(c.spell==='Reveal'){
     if(c.targetKind==='Ward'){
      const protecting=previous.find(j=>j.id===c.sourceId&&
       j.calendarAlchemyNeutralCast?.spell==='Ward'&&j.calendarCampaignId===row.calendarCampaignId);
      const current=protecting?activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
       finishId:c.finishId,sourceId:protecting.calendarAlchemyNeutralCast.sourceId}):null;
      ok(current?.wardProofId===c.sourceId&&c.revealed?.spell==='Ward'&&
       c.revealed?.wardProofId===c.sourceId&&c.revealed?.wardLevel===current.wardLevel&&
       c.revealed?.principle==='Neutral'&&
       Array.isArray(c.originalDetectProofIds)&&
       c.originalDetectProofIds.length===olderDetect.length&&
       c.originalDetectProofIds.every(id=>olderDetect.some(j=>j.id===id)),
       'Reveal Wardu nemá originální Detect, identitu či aktuální Ward Level');
     }else ok(c.revealed&&typeof c.revealed.principle==='string'&&
      c.revealed.elixirName&&whole(c.revealed.currentAS,1,100)&&
      Array.isArray(c.originalDetectProofIds)&&
      c.originalDetectProofIds.length===olderDetect.length&&
      c.originalDetectProofIds.every(id=>olderDetect.some(j=>j.id===id)),
      'Reveal nemá správnou magickou identitu nebo původní Detect');
    }else{
     const earlierReveals=previous.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&
      j.characterId===row.characterId&&j.calendarAlchemyNeutralCast?.spell==='Reveal'&&
      ['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL)&&
      j.calendarAlchemyNeutralCast.finishId===c.finishId&&
      j.calendarAlchemyNeutralCast.sourceId===c.sourceId&&
      j.calendarAlchemyNeutralCast.effect===true);
     if(c.targetKind==='Ward'){
      const wardRow=previous.find(j=>j.id===c.sourceId&&
       j.calendarAlchemyNeutralCast?.spell==='Ward'&&j.calendarCampaignId===row.calendarCampaignId);
      const current=wardRow?activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
       finishId:c.finishId,sourceId:wardRow.calendarAlchemyNeutralCast.sourceId}):null;
      ok(current?.wardProofId===c.sourceId&&c.dispel?.wardProofId===c.sourceId&&
       c.dispel.wardLevel===current.wardLevel&&c.dispel.removed===true&&
       c.dispel.originalRevealProofIds?.length===earlierReveals.length&&
       c.dispel.originalRevealProofIds.every(id=>earlierReveals.some(j=>j.id===id)),
       'Dispel Wardu nemá původní Ward Level, Reveal či odstranění');
     }else{
     ok(!activeAlchemyWard({journal:previous,campaignId:row.calendarCampaignId,
      finishId:c.finishId,sourceId:c.sourceId}),
      'Dispel chráněného elixíru bez odstraněného Wardu');
     const historic=alchemyElixirStrength(previous,row.calendarCampaignId,c.finishId,row.campaignMinute);
     ok(c.dispel&&c.dispel.asBefore===historic.currentAS&&
      c.dispel.asAfter===0&&historic.currentAS>0&&
      c.dispel.originalRevealProofIds?.length===earlierReveals.length&&
      c.dispel.originalRevealProofIds.every(id=>earlierReveals.some(j=>j.id===id)),
      'Dispel AS nebo předchozí Reveal je pozměněn');
     }
    }
   }
   consumed.add(c.spellstartId);
  }
  previous.push(row);
 }
 return true;
}
/** For the current combat timeline, every stored Neutral spellfire must have
 * its original persistent fatigue event and actual Initiative action. A
 * journal entry alone is not sufficient evidence of performed combat magic.
 * Older completed timelines retain journal proofs but have no live sequence.
 */
export function validateNeutralAlchemyCombatLinks(document){
 const seq=document?.combatRuntime?.sequence;
 const timeline=document?.combatRuntime?.timelineId;
 const journal=document?.journal??[];
 ok(Array.isArray(journal),'chybí trvalý deník');
 if(!seq||!timeline)return true;
 ok(seq.timelineId===timeline&&Array.isArray(seq.log),
  'nesouhlasí původní Initiative timeline');
 for(const row of journal){
  const c=row.calendarAlchemyNeutralCast;
  if(!c||row.combatProof?.timelineId!==timeline)continue;
  const sourceEventId=row.combatProof?.sourceEventId;
  const actor=document.characters?.find(x=>x.id===c.casterId);
  const events=actor?.hmk?.combatState?.events;
  ok(typeof sourceEventId==='string'&&Array.isArray(events),
   'Spellfire nemá původní Combat State');
  const matching=events.filter(e=>e.id===sourceEventId+':casting-fatigue'&&
   e.type==='hmk-casting-fatigue'&&e.round===c.spellfireRound&&
   e.details?.spell===c.spell&&e.details?.castingRoll===c.castingD100&&
   e.details?.outcome===c.castingSL&&e.details?.fatigue===c.castingFatigue&&
   (e.details?.misfireD100??null)===(c.misfireD100??null));
  ok(matching.length===1,'Spellfire nemá jediný neměnný Combat Fatigue důkaz');
  const starts=seq.log.filter(e=>e.type==='neutral-incant-spellstart'&&
   e.eventId===journal.find(x=>x.id===c.spellstartId)?.combatProof?.sourceEventId&&
   e.actorId===c.casterId&&e.spell===c.spell);
  ok(starts.length===1,'chybí iniciativní Spellstart v původní časové ose');
  const fires=seq.log.filter(e=>e.eventId===sourceEventId&&e.actorId===c.casterId&&
   e.type===(c.castingSL==='CF'?'neutral-incant-spellfire-misfire':
    c.effect?'neutral-incant-spellfire-success':'neutral-incant-spellfire-failed')&&
   e.spell===c.spell&&e.round===c.spellfireRound&&
   e.castingSL===c.castingSL&&e.castingEML===c.castingEML&&
   e.castingFatigue===c.castingFatigue&&e.detectCSBonus===c.detectCSBonus&&
   Array.isArray(e.physicalDice)&&
   js(e.physicalDice)===js(row.combatProof.physicalDice));
  ok(fires.length===1,'chybí jediný původní Initiative Spellfire důkaz');
 }
 return true;
}
export function assertNeutralAlchemyHistoryAppendOnly(before=[],after=[]){
 const newer=new Map(after.map(row=>[row.id,row]));
 for(const row of before)if(row.combatProof?.actionKind==='neutral-spellstart'||row.calendarAlchemyNeutralCast)
  ok(js(newer.get(row.id))===js(row),'dřívější Neutral Spellstart/Spellfire není neměnný');
 return true;
}
