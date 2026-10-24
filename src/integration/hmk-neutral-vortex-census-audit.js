/** HMK v1.2 pp.251,255,269–270: original-campaign evidence bridge for the
 * alchemy/Ward subset of a Neutral Vortex census. Does NOT assert that other
 * magical sources have been enumerated, or permit ANY storage commit.
 */
import {alchemyArcaneTargetRegister} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard} from './hmk-neutral-ward-lifecycle.js';
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
 for(const s of sourceCensus){
  if(s.category==='Elixir')check(known.has(s.id),
   'neznámý elixír nemůže nahrazovat původní alchymistickou historii');
  if(s.spell==='Ward')check(known.has(s.id),
   'neznámý Ward nesmí obejít původní Neutral Spellfire');
 }
 const external=sourceCensus.filter(s=>!known.has(s.id)).map(s=>s.id);
 return Object.freeze({format:'hmk-neutral-vortex-census-audit-v1',
  campaignId,minute,verifiedAlchemy:Object.freeze(bound),
  externalArcaneSourceIds:Object.freeze(external),
  allAlchemySourcesAccountedFor:true,
  allSixCategoriesHistoricallyVerified:false,
  mayCommit:false,
  remainingRequirements:Object.freeze([
   'full six-category original source registry',
   'encounter-proven physical source positions and movement each tick',
   'Neutral Total Release and Spirit linked spellfire writer',
   'atomic Initiative/Combat State/journal proof and suppression lifecycle'])});
}
