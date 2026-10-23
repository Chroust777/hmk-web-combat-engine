/** HMK v1.2 p.272 Fumebomb. One-round geometric LOS occlusion derived
 * ONLY from already saved Area combat proofs and live Initiative positions.
 * The original journal and battle map remain authoritative; no smoke store.
 */
import {fumebombSegmentObscured,fumebombSmokeActive} from './hmk-alchemy-area-preflight.js';
const requireValid=(yes,msg)=>{if(!yes)throw Error('Fumebomb LOS: '+msg)};
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function activeFumebombCircles({journal=[],sequence,campaignId}={}){
 requireValid(Array.isArray(journal)&&typeof campaignId==='string','chybí skutečný kalendář');
 // A gap between consecutive participants is still the SAME combat round.
 // Do not clear the persisted smoke just because no turn is active.
 if(!sequence)return [];
 requireValid(typeof sequence.timelineId==='string'&&Number.isSafeInteger(sequence.round),
  'chybí živá Initiative');
 return journal.filter(row=>row.calendarCampaignId===campaignId&&
  row.calendarAlchemyAreaThrown?.kind==='Fumebomb'&&
  row.calendarAlchemyAreaThrown.timelineId===sequence.timelineId&&
  fumebombSmokeActive({originRound:row.calendarAlchemyAreaThrown.sourceRound,
   nowRound:sequence.round})&&row.calendarAlchemyAreaThrown.throw?.discharged===true)
 .map(row=>{
  const p=row.calendarAlchemyAreaThrown;
  requireValid(p.smoke?.blocksLOS===true&&validPoint(p.smoke.center)&&
   p.smoke.radiusFt===5&&p.smoke.originRound===p.sourceRound&&
   p.smoke.throughRound===p.sourceRound,'neplatný trvalý důkaz kouře');
  return {sourceId:p.sourceId,center:p.smoke.center,radiusFt:p.smoke.radiusFt,
   originRound:p.sourceRound};
 });
}
/** Fail closed if visibility is required but actual map has no coordinates.
 * Tangential contact alone is not LOS occlusion (a mathematical zero-width
 * intersection); entering or traversing the smoke IS occluded.
 */
export function assertFumebombLineOfSight({journal=[],sequence,campaignId,
 fromId,toId=null,toPoint=null}={}){
 const circles=activeFumebombCircles({journal,sequence,campaignId});
 if(!circles.length)return {clear:true,smokeSources:[]};
 const units=sequence.spatialUnits;
 requireValid(Array.isArray(units)&&sequence.order?.every(id=>
  units.filter(p=>p.id===id&&validPoint(p)).length===1),
 'kouř vyžaduje kompletní skutečné souřadnice účastníků');
 const from=units.find(p=>p.id===fromId),to=toId?units.find(p=>p.id===toId):toPoint;
 requireValid(validPoint(from)&&validPoint(to)&&!!(toId||toPoint)&&
  !(toId&&toPoint),'chybí známé body vyhodnocované LOS');
 const blocked=circles.filter(x=>fumebombSegmentObscured(from,to,x.center,x.radiusFt));
 requireValid(!blocked.length,'blokovaná LOS v kole '+sequence.round+
  ' (Fumebomb '+blocked.map(x=>x.sourceId).join(', ')+')');
 return {clear:true,smokeSources:circles.map(x=>x.sourceId)};
}
