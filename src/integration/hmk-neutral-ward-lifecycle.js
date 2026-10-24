/** HMK v1.2 p.255. A Ward protects an independently verified magic source.
 * Never create a shadow inventory/health state. The spellfire proof lives in
 * the original campaign journal and Initiative timeline.
 *
 * This bounded writer supports original Ward, Ward-source Detect/Reveal/Dispel,
 * and historically verified replacement by a higher-WL Ward on one alchemical
 * source. Other categories and the CS-only replacement edge remain blocked.
 */
import {neutralWardProfile} from './hmk-neutral-arcane-exceptions.js';
const guard=(v,m)=>{if(!v)throw Error('Neutral Ward: '+m)};
export function activeAlchemyWard({journal=[],campaignId,finishId,sourceId}={}){
 guard(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&
  typeof finishId==='string'&&finishId&&typeof sourceId==='string'&&sourceId,
  'chybí autentický původ zdroje');
 let current=null;
 for(const entry of journal){
  if(entry.calendarCampaignId!==campaignId)continue;
  const c=entry.calendarAlchemyNeutralCast;
  if(c?.spell==='Ward'&&c.finishId===finishId&&
   c.sourceId===sourceId&&c.effect===true){
   if(current){
    guard(c.ward?.supersedesWardProofId===current.id&&
     Number.isSafeInteger(c.ward.level)&&
     c.ward.level>current.calendarAlchemyNeutralCast.ward.level,
     'nový Ward nemá autentické přebití silnější WL');
   }else guard(c.ward?.supersedesWardProofId===undefined,
    'Ward odkazuje na neexistující starší ochranu');
   current=entry;
  }
  if(c?.spell==='Dispel'&&c.effect===true&&c.dispel?.removed===true&&
   current&&c.dispel.wardProofId===current.id){
   guard(c.finishId===finishId&&c.sourceId===current.id,
    'Dispel Wardu míří na cizí původní zdroj');
   current=null;
  }
 }
 if(!current)return null;
 const row=current,cast=row.calendarAlchemyNeutralCast;
 guard(row.combatProof?.actionKind==='neutral-spellfire-success'&&
  row.id==='neutral-spellfire:'+row.combatProof?.sourceEventId&&
  Number.isSafeInteger(cast.ward?.level)&&cast.ward.level>=0&&
  cast.ward.protectedSourceId===sourceId&&cast.ward.finishId===finishId&&
  cast.ward.spellfireId===row.id&&cast.ward.touchConfirmed===true&&
  cast.ward.indefinite===true,
  'chybí autentický potvrzený Ward Spellfire');
 return Object.freeze({wardProofId:row.id,wardLevel:cast.ward.level,
  sourceId,finishId,detectableSourceId:row.id,
  category:'Active spell',protecting:true});
}
/** A successful original Ward cast may only be constructed at Spellfire. */
export function wardFromSpellfire({spellSI,castingSL,sourceId,finishId,spellfireId,
 priorWard=null}={}){
 guard(typeof sourceId==='string'&&sourceId&&typeof finishId==='string'&&finishId&&
  typeof spellfireId==='string'&&spellfireId,'chybí zdroj a originální Spellfire');
 const profile=neutralWardProfile({spellSI,castingSL,sourceCategory:'Elixir',
  priorWardLevel:priorWard?.wardLevel??0,sourceStillActive:true});
 guard(profile.protecting,'zdroj není způsobilý pro nový Ward');
 return Object.freeze({level:profile.wardLevel,protectedSourceId:sourceId,
  finishId,spellfireId,touchConfirmed:true,indefinite:true,
  ...(priorWard?{supersedesWardProofId:priorWard.wardProofId}:{})});
}
