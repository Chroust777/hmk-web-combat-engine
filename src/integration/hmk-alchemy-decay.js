import {alchemyDoseProof} from './hmk-alchemy-starting-doses.js';

/** HMK v1.2 p.268 — canonical elixir decay on the existing GM campaign clock.
 * Every 30 days after completion, d10 against current base AS; success -1,
 * failure -2. These are journal proofs, NOT inventory or autonomous clocks.
 * Historical rows are reconstructed in append order, never overwritten.
 */
export const ALCHEMY_DECAY_FORMAT='hmk-alchemy-elixir-decay-v1';
export const ALCHEMY_DECAY_PERIOD_MINUTES=30*1440;
const requireTrue=(x,message)=>{if(!x)throw Error(message)};
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const originOK=o=>o==='manual'||o==='cryptographic-software-die';
const relevant=(row,campaignId)=>row.calendarCampaignId===campaignId;
const decayLoss=(success,inverted)=>success===inverted?2:1;

/** Conservatively reject retrospective adjudication after any use or later
 * evidence referencing this dose. An independent event may remain in place;
 * an already consumed elixir cannot be silently made stronger or weaker.
 * Journal rows are immutable; the repair itself is always recorded NOW.
 */
function requireSafeRetrospectiveDecay(journal,campaignId,finishId,dueMinute,recordedMinute,state){
 requireTrue(!state.imbibingId&&!state.dispersed&&!state.activeTemporary,
  'Alchemy Decay: zpětně lze doložit pouze dosud nepoužitý uložený elixír');
 for(const row of journal){
  if(!relevant(row,campaignId)||row.campaignMinute<dueMinute||row.campaignMinute>recordedMinute)continue;
  // Previously reconstructed Decay proofs are allowed; they have already
  // passed the same checks and have their own distinct, immutable due dates.
  if(row.calendarAlchemyDecay?.finishId===finishId)continue;
  if(Object.keys(row).some(key=>key.startsWith('calendarAlchemy')&&
    JSON.stringify(row[key]).includes(JSON.stringify(finishId))))
   throw Error('Alchemy Decay: zmeškaný termín má pozdější závislý důkaz; bezpečná rekonstrukce není možná');
 }
}

function initialElixir(journal,campaignId,finishId){
 const finish=journal.find(r=>r.id===finishId&&relevant(r,campaignId)&&alchemyDoseProof(r));
 const p=alchemyDoseProof(finish);
 const validAS=finish?.calendarAlchemyStartingDose?integer(p.baseAS,1,p.selection?.index):integer(p?.baseAS,6,11);
 requireTrue(p&&p.result==='completed'&&validAS&&p.campaignId===campaignId&&
  p.minute===finish.campaignMinute,'Alchemy Decay: chybí doložený dokončený nebo počáteční elixír s platnou AS');
 return {finish,proof:p};
}
/** Authoritative strength as established by immutable completed + decay proofs.
 * minute is a display boundary; only rolls already documented by that minute
 * may affect AS. Absence of a roll is not an assumed successful roll.
 */
export function alchemyElixirStrength(journal=[],campaignId,finishId,minute=1e9){
 requireTrue(integer(minute,0,1e9),'Alchemy Decay: neplatná minuta kampaně');
 const {finish,proof}=initialElixir(journal,campaignId,finishId);
 let as=proof.baseAS,period=0,lastDecayId=null,imbibingId=null,activeTemporary=false;
 let dueMinute=proof.minute+ALCHEMY_DECAY_PERIOD_MINUTES;
 requireTrue(integer(dueMinute,0,1e9),'Alchemy Decay: termín mimo kalendář');
 let emptied=false;
 for(const row of journal){
  if(!relevant(row,campaignId)||row.campaignMinute>minute)continue;
  const use=row.calendarAlchemyImbibing;
  if(use?.finishId===finishId){
   requireTrue(!imbibingId&&emptied&&as>0&&use.asBefore===as&&
    use.finalAS===Math.max(0,as+use.modifier)&&
    use.temporary===(use.finalAS>0&&!['Physic','Healing','Mindsalve','Poison'].includes(use.elixirName)),
    'Alchemy Decay: neplatná změna AS po vypití');
   as=use.finalAS;imbibingId=row.id;activeTemporary=use.temporary;
  }
  // Instantaneous Physic (HMK p.273) reduces AS of each already active
  // temporary imbibed dose (including Footpad). The receipt is replayed in append order;
  // earlier Decay and Imbibing proofs are never edited or replaced.
  if(use?.elixirName==='Physic'&&use.finishId!==finishId&&!['Healing','Mindsalve','Poison'].includes(proof.elixirName)){
   const effects=use.physicEffects??[];
   const e=effects.find(x=>x.finishId===finishId);
   if(e){
    requireTrue(imbibingId===e.sourceUseId&&activeTemporary&&as>0&&
     e.asBefore===as&&e.asAfter===Math.max(0,as-use.finalAS),
     'Alchemy Physic: neplatné odčerpání AS cílové dávky');
    as=e.asAfter;
   }
  }
  if(row.calendarAlchemyVialEmpty?.finishId===finishId){
   requireTrue(!emptied,'Alchemy Decay: elixír lze vyprázdnit jen jednou');
   emptied=true;
  }
  // HMK pp.251,270: a completed Neutral Dispel ends the ACTUAL magic
  // without destroying the physical glass vial or rewriting prior AS rolls.
  // The immutable success receipt must carry the old live AS exactly.
  const cast=row.calendarAlchemyNeutralCast;
  if(cast?.finishId===finishId&&cast.spell==='Dispel'&&
   cast.targetKind!=='Ward'&&cast.effect===true){
   const e=cast.dispel;
   requireTrue(row.combatProof?.actionKind==='neutral-spellfire-success'&&
    row.combatProof.spellstartId===cast.spellstartId&&
    row.combatProof.round===cast.spellfireRound&&
    ['S','CS'].includes(cast.castingSL)&&e?.asBefore===as&&
    e.asAfter===0&&as>0&&['stored','active'].includes(e.phaseBefore)&&
    Array.isArray(e.originalRevealProofIds)&&e.originalRevealProofIds.length>0&&
    e.originalRevealProofIds.every(id=>journal.some(j=>j.id===id&&
     j.calendarAlchemyNeutralCast?.spell==='Reveal'&&
     ['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL)&&
     j.calendarAlchemyNeutralCast.effect===true&&
     j.calendarAlchemyNeutralCast.casterId===cast.casterId&&
     j.calendarAlchemyNeutralCast.finishId===finishId)),
    'Alchemy Dispel: neplatný historický důkaz ukončení enchantmentu');
   as=0;activeTemporary=false;
  }
  const defence=row.calendarAlchemySoulcloakDefence;
  if(defence?.finishId===finishId){
   requireTrue(proof.elixirName==='Soulcloak'&&activeTemporary&&as>0&&
    defence.useId===imbibingId&&defence.asBefore===as&&row.campaignMinute<dueMinute&&
    integer(defence.d10,1,10)&&defence.blocked===(defence.d10<=as)&&
    defence.asAfter===as-Number(defence.blocked),'Soulcloak: nesouhlasí doložený úbytek AS.');
   as=defence.asAfter;
  }
  const breath=row.calendarAlchemyExsiccationBreath;
  if(breath?.finishId===finishId){
   requireTrue(proof.elixirName==='Exsiccation'&&activeTemporary&&as>0&&breath.useId===imbibingId&&
    breath.asBefore===as&&breath.asAfter===as-1&&row.campaignMinute<dueMinute,
    'Exsiccation: nesouhlasí doložený úbytek AS.');
   as=breath.asAfter;
  }
  const d=row.calendarAlchemyDecay;
  if(!d||d.finishId!==finishId)continue;
  requireTrue(as>0&&(!emptied||activeTemporary),'Alchemy Decay: prázdný nebo zaniklý elixír nelze degradovat');
  requireTrue(row.campaignMinute===(d.reconstructed?d.recordedMinute:d.minute)&&d.minute===dueMinute,
    'Alchemy Decay: hody musí zachovat původní splatnost a skutečný čas zápisu');
  requireTrue(d.period===period+1&&d.asBefore===as&&integer(d.d10,1,10)&&originOK(d.origin),
    'Alchemy Decay: nesouhlasí pořadí nebo původ hodu');
  const success=d.d10<=as,inverted=d.quiescenceInverted===true;
  requireTrue(!inverted||proof.elixirName==='Quiescence','Alchemy Decay: obrácený pokles patří pouze k Quiescence');
  const next=Math.max(0,as-decayLoss(success,inverted));
  requireTrue(d.success===success&&d.asAfter===next&&d.dueMinute===dueMinute,
    'Alchemy Decay: důkaz AS neodpovídá d10');
  as=next;period++;lastDecayId=row.id;
  dueMinute+=ALCHEMY_DECAY_PERIOD_MINUTES;
  requireTrue(integer(dueMinute,0,1e9),'Alchemy Decay: termín mimo kalendář');
 }
 // Legacy empty proofs denote disposal. A new Imbibing receipt turns the same
 // physical emptying into a continuing Temporary enchantment (pp.269-270).
 const dispersed=emptied&&!activeTemporary;
 return {finishId,actorId:finish.characterId,elixirName:proof.elixirName,campaignId,
  completedMinute:proof.minute,initialAS:proof.baseAS,currentAS:as,period,
  lastDecayId,imbibingId,activeTemporary:activeTemporary&&as>0,dispersed,
  expires:as===0||dispersed,nextDueMinute:as>0&&!dispersed?dueMinute:null};
}
/** For every campaign elixir, list unresolved aging milestones; ignoring an
 * unbound elixir cannot silently suspend its mandatory natural decay.
 */
export function pendingAlchemyDecay(journal=[],campaignId,minute=1e9){
 return journal.filter(r=>relevant(r,campaignId)&&alchemyDoseProof(r)?.result==='completed')
  .map(r=>alchemyElixirStrength(journal,campaignId,r.id,Math.max(minute,r.campaignMinute)))
  .filter(s=>!s.expires&&s.nextDueMinute<=minute);
}
export function alchemyElixirStates(journal=[],campaignId){
 return journal.filter(r=>relevant(r,campaignId)&&alchemyDoseProof(r)?.result==='completed')
  .map(r=>alchemyElixirStrength(journal,campaignId,r.id));
}
export function createAlchemyDecay({journal=[],campaignId,minute,recordedMinute=minute,actorId,finishId,d10,origin,gmConfirmed=false,gmMissedConfirmed=false,replayLegacyQuiescence=false}={}){
 requireTrue(typeof campaignId==='string'&&campaignId&&typeof finishId==='string'&&finishId&&
  integer(minute,0,1e9)&&integer(recordedMinute,minute,1e9)&&integer(d10,1,10)&&originOK(origin),
  'Alchemy Decay: nutná kampaň, splatný termín a doložený hod d10 s původem');
 requireTrue(gmConfirmed===true,'Alchemy Decay: skutečný hod a termín musí potvrdit GM');
 const state=alchemyElixirStrength(journal,campaignId,finishId);
 requireTrue(actorId===state.actorId&&minute===state.nextDueMinute,
  'Alchemy Decay: hod je možný jen pro původní dokončení přesně v termínu GM');
 const reconstructed=recordedMinute>minute;
 if(reconstructed){
  requireTrue(gmMissedConfirmed===true,'Alchemy Decay: zmeškaný termín musí výslovně potvrdit GM');
  requireSafeRetrospectiveDecay(journal,campaignId,finishId,minute,recordedMinute,state);
 }
 const success=d10<=state.currentAS,inverted=state.elixirName==='Quiescence'&&!replayLegacyQuiescence;
 const after=Math.max(0,state.currentAS-decayLoss(success,inverted));
 return {format:ALCHEMY_DECAY_FORMAT,campaignId,minute,
  ...(reconstructed?{recordedMinute,reconstructed:true,gmMissedConfirmed:true}:{}),
  actorId,finishId,period:state.period+1,
  dueMinute:minute,asBefore:state.currentAS,d10,origin,success,asAfter:after,
  ...(inverted?{quiescenceInverted:true}:{}),
  enchantmentLost:after===0,gmConfirmed:true,sourcePage:268};
}
export function requireAlchemyDecayGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 requireTrue(integer(beforeMinute,0,1e9)&&integer(afterMinute,beforeMinute,1e9),
  'Alchemy Decay: nepřípustný posun kampaně');
 const outstanding=pendingAlchemyDecay(journal,campaignId,afterMinute)
  .sort((a,b)=>a.nextDueMinute-b.nextDueMinute)[0];
 if(outstanding&&outstanding.nextDueMinute<afterMinute)
  throw Error('Alchemy Decay: GM nesmí přeskočit d10 proti AS elixíru '+outstanding.elixirName+
   ' (termín '+outstanding.nextDueMinute+'). Zastavte hodiny přesně v termínu.');
 return true;
}
export function validateAlchemyDecayJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const d=row.calendarAlchemyDecay;
  if(d){
   requireTrue(d.campaignId===row.calendarCampaignId&&d.actorId===row.characterId&&
    (d.reconstructed===true?d.recordedMinute===row.campaignMinute&&d.minute<row.campaignMinute:
     d.minute===row.campaignMinute&&!Object.hasOwn(d,'recordedMinute')&&!Object.hasOwn(d,'gmMissedConfirmed')), 
    'Alchemy Decay: neplatný kontext historického důkazu');
   const reproduced=createAlchemyDecay({journal:prior,campaignId:d.campaignId,minute:d.minute,
    actorId:d.actorId,finishId:d.finishId,d10:d.d10,origin:d.origin,gmConfirmed:d.gmConfirmed,
    recordedMinute:row.campaignMinute,gmMissedConfirmed:d.gmMissedConfirmed===true,
    replayLegacyQuiescence:!Object.hasOwn(d,'quiescenceInverted')});
   requireTrue(JSON.stringify(reproduced)===JSON.stringify(d),
    'Alchemy Decay: historický důkaz změněn nebo nekoherentní');
  }
  prior.push(row);
 }
 return true;
}
export function assertAlchemyDecayAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarAlchemyDecay)
  requireTrue(JSON.stringify(byId.get(r.id))===JSON.stringify(r),
   'Alchemy Decay: historický důkaz nelze změnit ani odstranit');
 return true;
}
