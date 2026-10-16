/** HMK Kèthîra v1.2 pp.184,191. Durable evidence only; no inferred treatment. */
export const PARALYSIS_LOCATIONS=Object.freeze(['complete','left-arm','right-arm','left-leg','right-leg']);
export function activeParalysis(state){
 return (state?.ailmentSequelae||[]).filter(x=>x?.active===true&&x?.permanent===true&&
  x?.condition==='paralysis'&&PARALYSIS_LOCATIONS.includes(x.affectedLimb));
}
export function completeParalysis(state){return activeParalysis(state).some(x=>x.affectedLimb==='complete');}
export function blockedLimbs(state){
 const blocked=new Set();for(const x of activeParalysis(state))if(x.affectedLimb!=='complete')blocked.add(x.affectedLimb);
 return blocked;
}
export function requireParalysisAction(state,action){
 if(completeParalysis(state))throw Error('HMK str.184: úplná paralýza – žádný pohyb ani vlastní akce; postava je prone a helpless.');
 if(['move','evade','charge'].includes(action)&&
   [...blockedLimbs(state)].some(x=>x.endsWith('-leg')))
  throw Error('HMK str.184: ochrnutá noha – pohyb nelze automaticky vyhodnotit bez konkrétního rozhodnutí GM; postižená končetina se nesmí použít.');
}
export function requireParalysisArms(state,arms){
 requireParalysisAction(state,'melee');
 const blocked=blockedLimbs(state);if(![...blocked].some(x=>x.endsWith('-arm')))return;
 if(!Array.isArray(arms)||!arms.length||arms.some(x=>!['left','right'].includes(x)))
  throw Error('HMK str.184: ochrnutá paže – před hodem doložte skutečně použitou ruku / ruce.');
 if(arms.some(x=>blocked.has(x+'-arm')))
  throw Error('HMK str.184: postiženou ochrnutou paži nelze použít k útoku ani obraně.');
}
