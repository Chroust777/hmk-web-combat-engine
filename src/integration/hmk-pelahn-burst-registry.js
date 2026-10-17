/** HMK v1.2 p.204 — independent persisted Raw Pèleáhn sources.
 * Legacy single-source combat documents keep `pelahnBurst`; new documents
 * additionally retain all sources in `pelahnBursts`. The last source is the
 * compatibility pointer; no earlier source may be overwritten or discarded.
 * No stacking mechanic is invented for a character inside two bursts.
 */
import {pelahnBurstDuration} from './hmk-pelahn-hyperburst-proof.js';
const safe=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const fail=m=>{throw Error('Raw Pèleáhn registry: '+m)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function listPelahnBurstSources(sequence){
 const s=sequence;
 if(!s||typeof s!=='object'||Array.isArray(s))fail('chybí časová osa');
 if(s.pelahnBursts===undefined){
  if(s.pelahnBurst===undefined||s.pelahnBurst===null)return [];
  // Legacy source, validate below as well.
  return verified([s.pelahnBurst],s.round);
 }
 if(!Array.isArray(s.pelahnBursts)||s.pelahnBursts.length>100)fail('neplatný seznam zdrojů');
 if(s.pelahnBursts.length===0){
  if(s.pelahnBurst!==undefined&&s.pelahnBurst!==null)fail('nesouhlasí starší ukazatel zdroje');
  return [];
 }
 if(!same(s.pelahnBurst,s.pelahnBursts.at(-1)))fail('nesouhlasí poslední zdroj s kompatibilním ukazatelem');
 return verified(s.pelahnBursts,s.round);
}
function verified(sources,currentRound){
 const seen=new Set();
 for(let i=0;i<sources.length;i++){
  const b=sources[i];
  if(!b||b.format!=='hmk-pelahn-burst-source-v1'||
     typeof b.id!=='string'||b.id.length<1||b.id.length>160||seen.has(b.id)||
     typeof b.casterId!=='string'||!b.casterId||
     !safe(b.startRound,1,9999)||!safe(b.endRound,b.startRound,9999)||
     (safe(currentRound,1,9999)&&b.startRound>currentRound)||
     !b.center||!Number.isFinite(b.center.x)||!Number.isFinite(b.center.y)||
     Math.abs(b.center.x)>10000000||Math.abs(b.center.y)>10000000)fail('neplatný nebo duplicitní zdroj');
  try{pelahnBurstDuration(b)}catch{fail('zdroj nemá doloženou tištěnou dobu trvání')}
  if(i&&b.startRound<sources[i-1].startRound)fail('zdroje nejsou časově seřazeny');
  seen.add(b.id);
 }
 return sources;
}
export function activePelahnBurstSources(sequence){
 return listPelahnBurstSources(sequence).filter(b=>sequence.round>=b.startRound&&sequence.round<=b.endRound);
}
export function appendPelahnBurstSource(sequence,source){
 const older=listPelahnBurstSources(sequence);
 if(older.length>=100)fail('dosažena kapacita zdrojů; GM musí dokončit archivaci');
 const updated=[...older,structuredClone(source)];
 const out=structuredClone(sequence);
 out.pelahnBursts=updated;
 out.pelahnBurst=structuredClone(source);
 listPelahnBurstSources(out);
 return out;
}
/** Exactly one source is required for an authoritative second action.
 * A character within multiple concurrent radii is intentionally blocked:
 * p.204 does not prescribe bonus stacking or multiple compulsory END tests.
 */
export function pelahnSourcesForActor(sequence,actorId){
 const pos=sequence.spatialUnits?.find(x=>x.id===actorId);
 const active=activePelahnBurstSources(sequence);
 if(!active.length)return [];
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))fail('neověřená aktuální poloha postavy');
 return active.filter(b=>Math.hypot(pos.x-b.center.x,pos.y-b.center.y)<=15+1e-7);
}
