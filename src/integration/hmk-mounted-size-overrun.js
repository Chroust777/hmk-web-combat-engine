/** HMK Kethira p353: deliberately narrow verified Overrun without Trample.
 * Source: live combatants + complete GM witnessed map + ACTUAL entire route.
 * No automatic damage. Trample, prone contacts and missing anatomy block.
 */
import {mountedOverrunEligibility} from '../rules/mounted.js';
const ensure=(v,m)=>{if(!v)throw Error(m)};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const EPS=1e-7;
function nearSegment(point,a,b,range){
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den>EPS?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/den)):0;
 return dist(point,{x:a.x+t*dx,y:a.y+t*dy})<=range+EPS;
}
/** All opponents whose occupied space OR active Engagement Zone intersects
 * any route segment are included. A conservative sum across the entire path
 * can reject some legal sequential overruns, but cannot invent eligibility. */
export function deriveVerifiedMountedOverrun({mountId,participants,states,battlefield,path}={}){
 ensure(Array.isArray(participants)&&Array.isArray(battlefield?.units)&&
  Array.isArray(path)&&path.length>=2&&states,'Overrun vyžaduje úplnou skutečnou mapu, stavy a trasu');
 const mount=participants.filter(x=>x.id===mountId);
 ensure(mount.length===1&&Number.isSafeInteger(mount[0].hmk?.verifiedZoneNumbers)&&
  mount[0].hmk.verifiedZoneNumbers>0,'Neověřený počet tělesných Zone Numbers zvířete');
 const contacts=[];
 for(const enemy of battlefield.units.filter(x=>x.foe)){
  if(!path.slice(1).some((end,i)=>nearSegment(enemy,path[i],end,enemy.threatens?Math.max(5,enemy.reachFt):0)))continue;
  const found=participants.filter(c=>c.id===enemy.id);
  ensure(found.length===1&&Number.isSafeInteger(found[0].hmk?.verifiedZoneNumbers)&&
   found[0].hmk.verifiedZoneNumbers>0,`Overrun ${enemy.id}: chybí ověřené ZN`);
  ensure(states[enemy.id]?.posture?.prone!==true,
   `Overrun ${enemy.id}: prone cíl vyžaduje samostatné vyhodnocení Trample nebo rozhodnutí GM`);
  contacts.push({id:enemy.id,zoneNumbers:found[0].hmk.verifiedZoneNumbers});
 }
 ensure(contacts.length>0,'Pro Overrun není na skutečné trase žádný protivník');
 const result=mountedOverrunEligibility({mountZoneNumbers:mount[0].hmk.verifiedZoneNumbers,
  opponentsAtThisMoment:contacts});
 ensure(result.eligible,'HMK p353: ZN zvířete musí být větší než současný součet protivníků');
 return {format:'hmk-size-overrun-v1',mountZN:result.mountZoneNumbers,opponents:contacts};
}
