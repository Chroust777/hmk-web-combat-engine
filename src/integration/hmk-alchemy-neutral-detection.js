/** HMK v1.2 pp.251,254: magic-source census and historical Detect lineage.
 * Pure evidence projection; no parallel magic storage. The GM must provide
 * the positions of ALL six magical categories, including hidden sources,
 * not only those tracked automatically by the Alchemy modules.
 */
import {alchemyArcaneTargetRegister} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard} from './hmk-neutral-ward-lifecycle.js';
const check=(v,m)=>{if(!v)throw Error('Neutral Detect: '+m)};
const CATEGORIES=new Set(['Active spell','Active talent','Artefact enchantment',
 'Elixir','Raw principle','Rune object']);
const isDistance=d=>Number.isFinite(d)&&d>=0&&d<=1e6;

/** A complete, GM-attested census cannot omit a single active known vial.
 * Unknown/unverified alchemy proofs make the census unsafe: do not silently
 * pretend they are mundane. Non-alchemical sources are explicitly included.
 */
export function buildNeutralDetectCensus({journal,inventory,campaignId,minute,
 distancesByFinishId,otherSources=[],maxRangeFeet,gmAllSourcesConfirmed=false}={}){
 check(gmAllSourcesConfirmed===true,'GM musí potvrdit všechny magické zdroje včetně skrytých');
 check(distancesByFinishId&&typeof distancesByFinishId==='object'&&
  !Array.isArray(distancesByFinishId)&&Array.isArray(otherSources)&&
  isDistance(maxRangeFeet),'neúplný prostorový průkaz Detect');
 const register=alchemyArcaneTargetRegister({journal,inventory,campaignId,minute});
 check(register.every(x=>!x.error),'některé alchymistické cíle nemají ověřený historický stav');
 const active=register.filter(x=>x.dossier?.targetable);
 check(Object.keys(distancesByFinishId).length===active.length&&
  active.every(x=>Object.hasOwn(distancesByFinishId,x.finishId)&&
   isDistance(distancesByFinishId[x.finishId])),
  'pro každý živý elixír musí být doložená vzdálenost včetně cílů mimo dosah');
 const sources=[];
 for(const x of active){
  const distanceFeet=distancesByFinishId[x.finishId];
  const ward=activeAlchemyWard({journal,campaignId,finishId:x.finishId,sourceId:x.dossier.sourceId});
  if(ward){
   // Ward itself can be detected, but the protected elixir never can.
   sources.push({kind:'other',category:'Active spell',sourceId:ward.detectableSourceId,
    distanceFeet,spell:'Ward',wardLevel:ward.wardLevel,protectedSourceId:ward.sourceId});
  }else sources.push({kind:'alchemy',category:'Elixir',sourceId:x.dossier.sourceId,
   finishId:x.finishId,targetId:x.dossier.targetId,distanceFeet});
 }
 for(const obj of otherSources){
  // A declared Ward hides its protected arcane source (HMK pp.251,255).
  // Until a live Ward writer and Ward-history validator exist, accepting
  // a GM-supplied Ward as an ordinary 'Active spell' would falsely reveal
  // the protected elixir and authorize an impossible Reveal/Dispel chain.
  // Fail closed even if the overall census was GM-attested.
  check(!(obj?.spell==='Ward'||obj?.wardLevel!==undefined||
    obj?.protectsSourceId!==undefined),
   'Ward chrání zdroj před Detect; chybí autoritativní Ward historie');
  check(obj&&typeof obj.sourceId==='string'&&obj.sourceId.length>=3&&
   CATEGORIES.has(obj.category)&&isDistance(obj.distanceFeet)&&
   obj.category!=='Elixir',
   'ostatní magické zdroje vyžadují svou kategorii, ID a vzdálenost (elixír používá původní registr)');
  sources.push({kind:'other',category:obj.category,
   sourceId:obj.sourceId,distanceFeet:obj.distanceFeet});
 }
 check(new Set(sources.map(x=>x.sourceId)).size===sources.length,
  'každá magie musí mít jednoznačnou zdrojovou identitu');
 return Object.freeze(sources.filter(x=>x.distanceFeet<=maxRangeFeet)
  .sort((a,b)=>a.sourceId.localeCompare(b.sourceId)).map(x=>Object.freeze(x)));
}
/** Detect CS confers +20 on later Reveal/Dispel of same source (p.251).
 * Replayed solely from successful ORIGINAL same-caster source receipt;
 * journal titles and spellstart intentions are never proof of a result.
 */
export function getNeutralDetectHistory({journal,campaignId,casterId,finishId,sourceId,targetKind='Elixir'}={}){
 check(Array.isArray(journal)&&typeof sourceId==='string'&&sourceId&&
  typeof casterId==='string'&&casterId,'chybí původní historie sesílání');
 const witnesses=journal.filter(j=>j.calendarCampaignId===campaignId&&
  j.characterId===casterId&&j.calendarAlchemyNeutralCast?.spell==='Detect'&&
  j.calendarAlchemyNeutralCast.casterId===casterId&&
  j.calendarAlchemyNeutralCast.castingSL&&
  ['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL)&&
  j.calendarAlchemyNeutralCast.effect===true&&
  Array.isArray(j.calendarAlchemyNeutralCast.detectedSources)&&
  j.calendarAlchemyNeutralCast.detectedSources.some(s=>s.sourceId===sourceId&&
   (targetKind==='Ward'?s.spell==='Ward'&&s.kind==='other'&&s.category==='Active spell':
    s.finishId===finishId&&s.kind==='alchemy')));
 return Object.freeze({found:witnesses.length>0,
  critical:witnesses.some(j=>j.calendarAlchemyNeutralCast.castingSL==='CS'),
  proofIds:Object.freeze(witnesses.map(j=>j.id))});
}
