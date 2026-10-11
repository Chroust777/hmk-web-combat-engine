import { SCHEMA_VERSION } from '../domain/contracts.js';

function stable(v){
 if(Array.isArray(v)) return v.map(stable);
 if(v&&typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
 return v;
}
export function exportCombatState(state){return JSON.stringify(stable(state));}
export function validateCombatState(state){
 const errors=[];
 if(!state||state.schemaVersion!==SCHEMA_VERSION) errors.push('schema-version');
 const combatants=state?.combatants??[]; const ids=combatants.map(x=>x.id); const idSet=new Set(ids);
 if(idSet.size!==ids.length) errors.push('duplicate-combatant-id');
 for(const e of state?.events??[]){
   if(e.combatantId!=null&&!idSet.has(e.combatantId)){ errors.push(`dangling-event:${e.id??e.type}`); continue; }
   if(e.data?.injuryId!=null && e.combatantId!=null){
     const owner=combatants.find(c=>c.id===e.combatantId);
     const injuryIds=new Set((owner?.injuries??[]).map(i=>i.id));
     if(!injuryIds.has(e.data.injuryId)) errors.push(`dangling-injury-event:${e.id??e.type}:${e.data.injuryId}`);
   }
 }
 for(const key of Object.keys(state?.relations??{})){
   const parts=key.split('::'); if(parts.length===2&&(!idSet.has(parts[0])||!idSet.has(parts[1]))) errors.push(`dangling-relation:${key}`);
 }
 return {valid:errors.length===0,errors};
}
export function importCombatState(json){
 let state; try{state=typeof json==='string'?JSON.parse(json):structuredClone(json);}catch{throw new Error('Invalid combat JSON');}
 const check=validateCombatState(state); if(!check.valid) throw new Error(`Invalid combat state: ${check.errors.join(', ')}`);
 return state;
}
