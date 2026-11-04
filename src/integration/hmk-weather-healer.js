/** HMK v1.2 pp.177–180. Read-only candidates for real Physician Treatment.
 * No guessed ML, no substitute patient skill, no Combat session or clock write.
 */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {secondaryModifier} from '../rules/tests.js';
export function weatherPhysicianCandidates({patient,wound,party=[]}={}){
 if(!patient||!wound||!Array.isArray(party))return [];
 const prior=(wound.healing?.treatments??[]).map(x=>x.physicianIndex).filter(Number.isFinite);
 const minimum=prior.length?Math.max(...prior):-1;
 return party.flatMap(actor=>{
  if(!actor?.id||!actor?.hmk)return [];
  const state=actor.hmk.healthState??{};
  // A self-treatment is permitted only for Minor/Serious wounds and only
  // when the actual circumstances allow it (GM chooses the option).
  const self=actor.id===patient.id;
  if(self&&!['M','S'].includes(wound.severity))return [];
  if(['KIA','UNC','INC','STN'].includes(String(state.shock).toUpperCase())||state.coma?.active||
     !!state.extendedShock||['catatonic','unconscious'].includes(String(state.morale?.state||'').toLowerCase())||
     (state.malnutritionEpisodes??[]).some(x=>x.status==='dead'||(x.status==='active'&&x.hr===0)))return [];
  const mastery=availableMasteries(actor).find(x=>x.name.toLowerCase()==='physician');
  if(!mastery||!Number.isSafeInteger(mastery.ml)||mastery.ml<1||mastery.ml>200)return [];
  const index=Math.floor(mastery.ml/10);
  if(index<=minimum)return [];
  const dex=actor.hmk.attributes?.dex;
  const dexSecondary=Number.isSafeInteger(dex)&&dex>0?secondaryModifier(dex*5):null;
  return [{id:actor.id,name:actor.name,ml:mastery.ml,index,dexSecondary,self}];
 });
}
