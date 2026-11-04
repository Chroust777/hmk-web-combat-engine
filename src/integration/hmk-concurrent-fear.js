/**
 * Independent HMK p.187 Fear sources, one immutable origin per physical Fear Roll.
 * A projected effective Fear state preserves compatibility with the existing
 * Combat readiness/action policy without discarding weaker simultaneous fears.
 * Each source must be recovered separately; the next strongest then reappears.
 */
const validStates=new Set(['catatonic','terrified','afraid','steady','brave']);
const strength={steady:0,brave:1,afraid:2,terrified:3,catatonic:4};
const ensure=(truth,msg)=>{if(!truth)throw Error('Fear/Aberrance: '+msg)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function choose(sources){return [...sources].sort((a,b)=>strength[b.state]-strength[a.state]||
 String(a.sourceEventId).localeCompare(String(b.sourceEventId)))[0]??null;}
/** Transparent upgrade of older single-source character states. */
export function activeFearSources(state){
 const sources=state?.fearSources;
 return sources===undefined?(state?.fear?[state.fear]:[]):sources;
}
export function hasBraveFearSource(state){return activeFearSources(state).some(x=>x.state==='brave');}
export function projectFearSources(state){
 const sources=activeFearSources(state);
 const ids=new Set();
 ensure(Array.isArray(sources)&&sources.length<=300,'příliš mnoho Fear zdrojů');
 for(const s of sources){
  ensure(s&&validStates.has(s.state)&&typeof s.sourceId==='string'&&s.sourceId&&
   typeof s.sourceEventId==='string'&&s.sourceEventId&&!ids.has(s.sourceEventId)&&
   ['character','gm-event'].includes(s.sourceKind)&&
   typeof s.timelineId==='string'&&s.timelineId&&
   Number.isSafeInteger(s.sourceABE)&&s.sourceABE>=0&&s.sourceABE<=200&&
   Number.isSafeInteger(s.createdRound)&&s.createdRound>=1&&s.createdRound<=9999,
   'poškozený Fear zdroj');
  ensure(state.events?.some(e=>e.id===s.sourceEventId&&e.type==='hmk-fear-exposure'),
   'Fear zdroj nemá svůj původní Will test');
  ids.add(s.sourceEventId);
 }
 const projected=choose(sources);
 ensure(same(state.fear??null,projected),'zobrazený Fear neodpovídá samostatným zdrojům');
 return projected;
}
export function addFearSource(state,fear){
 const sources=structuredClone(activeFearSources(state));
 ensure(!sources.some(s=>s.sourceEventId===fear.sourceEventId),'duplicitní zdroj strachu');
 sources.push(fear);
 state.fearSources=sources;
 state.fear=structuredClone(choose(sources));
 return state.fear;
}
export function updateFearSource(state,eventId,update){
 const sources=structuredClone(activeFearSources(state));
 const i=sources.findIndex(s=>s.sourceEventId===eventId);
 ensure(i>=0,'neexistuje Fear zdroj pro zotavení');
 sources[i]={...sources[i],...update};
 state.fearSources=sources;
 state.fear=structuredClone(choose(sources));
 return state.fear;
}
