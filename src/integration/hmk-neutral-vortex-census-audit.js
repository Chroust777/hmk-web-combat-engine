/** HMK v1.2 pp.251,255,269–270: original-campaign evidence bridge for the
 * alchemy/Ward subset of a Neutral Vortex census. Does NOT assert that other
 * magical sources have been enumerated, or permit ANY storage commit.
 */
import {alchemyArcaneTargetRegister} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard} from './hmk-neutral-ward-lifecycle.js';
import {listPelahnBurstSources} from './hmk-pelahn-burst-registry.js';
const check=(v,m)=>{if(!v)throw Error('Neutral Vortex census: '+m)};
const xy=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y);
const samePlace=(a,b)=>Math.abs(a.x-b.x)<1e-7&&Math.abs(a.y-b.y)<1e-7;
/** Every alchemical enchantment in the existing campaign must be accounted
 * for. The original campaign's encounter spatialUnits, NOT newly typed GM
 * coordinates, prove the position of carried vials and active doses. Sources
 * outside the spatial encounter, other arcane categories and moving objects
 * remain unsafe until their original positional history is connected.
 */
export function auditNeutralVortexAlchemyCensus({document,sourceCensus}={}){
 const campaignId=document?.campaignClock?.campaignId??document?.campaignClock?.id;
 const minute=document?.campaignClock?.minute;
 check(typeof campaignId==='string'&&campaignId&&Number.isSafeInteger(minute)&&minute>=0&&
  Array.isArray(document?.journal)&&Array.isArray(document?.inventory)&&
  Array.isArray(sourceCensus),'chybí původní kampaň, GM čas nebo úplný soupis');
 const sources=new Map();
 for(const s of sourceCensus){
  check(typeof s?.id==='string'&&s.id&&!sources.has(s.id)&&xy(s)&&s.verified===true,
   'podvržená, duplicitní nebo neúplná identita magického zdroje');
  sources.set(s.id,s);
 }
 const units=document?.combatRuntime?.sequence?.spatialUnits;
 check(Array.isArray(units),'pro propojení se zdroji chybí originální prostorové jednotky Initiative');
 const register=alchemyArcaneTargetRegister({journal:document.journal,
  inventory:document.inventory,campaignId,minute});
 check(register.every(x=>!x.error),'některý historický elixír má neověřený stav');
 const bound=[],known=new Set();
 for(const entry of register.filter(x=>x.dossier?.targetable)){
  const d=entry.dossier;
  check(!known.has(d.sourceId),'duplicitní elixír v původní historii');
  const s=sources.get(d.sourceId);
  check(s?.category==='Elixir'&&s.currentAS===d.currentAS&&
   typeof d.targetId==='string'&&d.targetId,
   'chybí elixír či přesná originální AS a identita z původního deníku');
  const positions=units.filter(u=>u.id===d.targetId&&xy(u));
  check(positions.length===1&&samePlace(s,positions[0]),
   'původní Initiative neprokazuje fyzickou polohu lahvičky či příjemce');
  const w=activeAlchemyWard({journal:document.journal,campaignId,
   finishId:d.finishId,sourceId:d.sourceId});
  if(w){
   const ws=sources.get(w.wardProofId);
   check(s.protectedByWardId===w.wardProofId&&ws?.category==='Active spell'&&
    ws.spell==='Ward'&&ws.wardLevel===w.wardLevel&&ws.duration==='Indefinite'&&
    ws.protectsSourceId===d.sourceId&&samePlace(ws,s),
    'aktivní Ward v soupisu nemá platnou původní totožnost nebo polohu');
   known.add(w.wardProofId);
  }else check(s.protectedByWardId==null,
   'elixír nesmí deklarovat Ward bez historického důkazu');
  known.add(d.sourceId);
  bound.push(Object.freeze({finishId:d.finishId,sourceId:d.sourceId,
   currentAS:d.currentAS,targetId:d.targetId,phase:d.phase,
   ...(w?{wardProofId:w.wardProofId,wardLevel:w.wardLevel}:{})}));
 }
 // HMK p.204 gives ONE genuine non-alchemical Raw Principle subtype:
 // a Pèleáhn Total Release Hyper Burst recorded by the original Initiative,
 // Combat State and campaign journal. The native registry is authoritative.
 // This does NOT imply that all other Raw Principle manifestations are known.
 const sequence=document.combatRuntime.sequence;
 const originalBursts=listPelahnBurstSources(sequence);
 const rawBound=[];
 for(const burst of originalBursts){
  const active=sequence.round>=burst.startRound&&sequence.round<=burst.endRound;
  const s=sources.get(burst.id);
  if(!active){
   check(!s,'znovu předložený vypršelý Raw Pèleáhn nemůže být aktivním zdrojem');
   continue;
  }
  check(s?.category==='Raw Principle'&&samePlace(s,burst.center)&&
   s.protectedByWardId==null,
   'chybí originální Raw Pèleáhn nebo nesouhlasí poloha Total Release');
  const log=sequence.log?.filter(e=>e.type==='pelahn-total-release-source'&&
   e.eventId===burst.id);
  const journal=document.journal.filter(e=>e.id==='total-release:'+burst.id);
  const caster=document.characters?.filter(c=>c.id===burst.casterId);
  const events=caster?.[0]?.hmk?.combatState?.events?.filter(e=>
   e.id===burst.id+':total-release'&&e.type==='hmk-spell-total-release');
  check(log?.length===1&&journal.length===1&&caster?.length===1&&
   events?.length===1&&log[0].actorId===burst.casterId&&
   log[0].round===burst.startRound&&log[0].spell===burst.spell&&
   log[0].complexity===burst.complexity&&
   log[0].startRound===burst.startRound&&log[0].endRound===burst.endRound&&
   samePlace(log[0].center,burst.center)&&log[0].gmEnteredDice===true&&
   Array.isArray(log[0].physicalDice)&&log[0].physicalDice.length>=3&&
   log[0].physicalDice[1]?.faces===100&&log[0].physicalDice[1]?.value===100&&
   journal[0].characterId===burst.casterId&&
   journal[0].combatProof?.actionKind==='pelahn-total-release'&&
   journal[0].combatProof.sourceEventId===burst.id&&
   journal[0].combatProof.spell===burst.spell&&
   JSON.stringify(journal[0].combatProof.physicalDice)===JSON.stringify(log[0].physicalDice)&&
   events[0].details?.spell===burst.spell&&
   events[0].details?.complexity===burst.complexity&&
   events[0].details?.sourceEventId===burst.id&&
   events[0].details?.castingD100===log[0].physicalDice[0]?.value&&
   events[0].details?.spiritD100===log[0].physicalDice[2]?.value,
   'Raw Pèleáhn nemá původní Total Release, Spirit nebo fyzické hody');
  known.add(burst.id);
  rawBound.push(Object.freeze({sourceId:burst.id,category:'Raw Principle',
   originEventId:burst.id,casterId:burst.casterId,spell:burst.spell,
   startRound:burst.startRound,endRound:burst.endRound,
   x:burst.center.x,y:burst.center.y}));
 }
 for(const s of sourceCensus){
  if(s.category==='Elixir')check(known.has(s.id),
   'neznámý elixír nemůže nahrazovat původní alchymistickou historii');
  if(s.spell==='Ward')check(known.has(s.id),
   'neznámý Ward nesmí obejít původní Neutral Spellfire');
 }
 const external=sourceCensus.filter(s=>!known.has(s.id)).map(s=>s.id);
 return Object.freeze({format:'hmk-neutral-vortex-census-audit-v1',
  campaignId,minute,verifiedAlchemy:Object.freeze(bound),
  verifiedRawPelahn:Object.freeze(rawBound),
  externalArcaneSourceIds:Object.freeze(external),
  allAlchemySourcesAccountedFor:true,
  allNativeRawPelahnSourcesAccountedFor:true,
  allSixCategoriesHistoricallyVerified:false,
  mayCommit:false,
  remainingRequirements:Object.freeze([
   'all other raw principle origins and remaining five magical categories',
   'encounter-proven physical source positions and movement each tick',
   'Neutral Total Release and Spirit linked spellfire writer',
   'atomic Initiative/Combat State/journal proof and suppression lifecycle'])});
}
