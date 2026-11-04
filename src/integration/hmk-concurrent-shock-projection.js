/**
 * Cross-origin ailment Shock projection. This is a loss-prevention layer, not
 * a replacement for HMK rolls: every Weather/Poison/Disease episode retains its
 * individual HR, timeline, weakness, actual dice and immutable event evidence.
 *
 * The persistent character has only one display Shock slot. Previously each
 * course overwrote that slot or refused to run when an unrelated source was
 * active. This projection retains an independently changing baseline and
 * computes the severest active source, without cancelling another source's
 * Extended Shock, Coma, blood loss or future Course. A non-ailment action may
 * still change the baseline; it is detected before the next projection.
 */
const rank=Object.freeze({NONE:0,STN:1,INC:2,UNC:3,KIA:4});
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const valid=s=>Object.hasOwn(rank,s);
const strongest=(states)=>states.reduce((best,s)=>rank[s]>rank[best]?s:best,'NONE');
export function concurrentShockSources(state){
 return [
  ...(state.environmentalHazards??[]).filter(x=>x.active).map(x=>({id:x.id,kind:'weather',shock:x.shockApplied??'NONE'})),
  ...(state.toxinCourses??[]).filter(x=>x.status==='active'||x.status==='dead').map(x=>({id:x.id,kind:'poison',shock:x.shockApplied??'NONE'})),
  ...(state.diseaseCourses??[]).filter(x=>x.status==='active'||x.status==='dead').map(x=>({id:x.id,kind:'disease',shock:x.shockApplied??'NONE'})),
  ...(state.malnutritionEpisodes??[]).filter(x=>x.status==='active'||x.status==='dead').map(x=>({id:x.id,kind:'malnutrition',shock:x.shockApplied??'NONE'})),
  ...(state.parallelColdShocks??[]).filter(x=>x.shock!=='NONE').map(x=>({id:'parallel-cold:'+x.sourceId,kind:'cold-water',shock:x.shock}))
 ];
}
export function initializeConcurrentShock(state){
 check(state&&valid(state.shock),'Neplatný zdravotní Shock pro souběžné vyhodnocení');
 const prior=state.concurrentShockProjection;
 if(prior){
  check(prior.format==='hmk-concurrent-shock-v1'&&valid(prior.baseShock)&&valid(prior.projectedShock),
   'Poškozená evidence původů souběžného Shocku');
  if(state.shock!==prior.projectedShock){prior.baseShock=state.shock;prior.projectedShock=state.shock;}
  return prior;
 }
 const sources=concurrentShockSources(state);
 check(sources.every(x=>valid(x.shock)),'Neplatný souběžný Shock zdroje');
 const sourceShock=strongest(sources.map(x=>x.shock));
 // Upgrade legacy campaigns without taking ownership of an ongoing Coma /
 // Extended Shock. Such an independent course must remain represented by the
 // baseline even when an ailment of the same severity exists.
 const independent=!!(state.extendedShock||state.coma?.active||state.shockFollowup||state.bloodShockPending);
 const baseShock=independent||state.shock!==sourceShock?state.shock:'NONE';
 state.concurrentShockProjection={format:'hmk-concurrent-shock-v1',baseShock,projectedShock:state.shock};
 return state.concurrentShockProjection;
}
export function projectConcurrentShock(state,{round=null}={}){
 const projection=initializeConcurrentShock(state);
 const sources=concurrentShockSources(state);
 check(sources.every(x=>valid(x.shock)),'Neplatný souběžný Shock zdroje');
 const next=strongest([projection.baseShock,...sources.map(x=>x.shock)]);
 const previous=state.shock;
 state.shock=next;
 projection.projectedShock=next;
 if(['INC','UNC','KIA'].includes(next))state.posture.prone=true;
 if(next==='KIA'){
  state.shockFollowup=null;state.extendedShock=null;state.coma=null;state.bloodShockPending=false;
  for(const w of state.wounds??[])w.nextAdvanceRound=null;
 }
 if(round!==null&&previous!==next)state.shockOriginRound=round;
 return {shock:next,baseShock:projection.baseShock,
  sources:sources.filter(x=>x.shock!=='NONE').map(x=>({...x})),changed:previous!==next};
}
export function validateConcurrentShockProjection(state){
 const p=state?.concurrentShockProjection;
 if(!p)return true;
 check(p.format==='hmk-concurrent-shock-v1'&&valid(p.baseShock)&&valid(p.projectedShock),
  'Neplatná trvalá projekce souběžného Shocku');
 check(concurrentShockSources(state).every(x=>valid(x.shock)),'Neplatný původ souběžného Shocku');
 // The projection may be stale between two unrelated confirmed Combat actions;
 // that is intentionally NOT a global block. On the next ailment action the
 // external Shock is captured as the new baseline.
 return true;
}
