import {applyShockState,SHOCK_STATE} from '../rules/shock.js';

const states=Object.freeze({NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA});
const reverse=Object.fromEntries(Object.entries(states).map(([key,value])=>[value,key]));

/** Advisory replay projection only. No persistence, no implicit recovery or bleeding. */
export function projectCombatState({participants=[],entries=[],validateDraft=()=>({ok:true})}={}){
 const issues=[];
 const byId=new Map();
 for(const p of participants){
  if(typeof p?.id!=='string'||!p.id||byId.has(p.id)){
   issues.push({index:0,message:'Neplatné nebo duplicitní ID účastníka.'});
   continue;
  }
  byId.set(p.id,{id:p.id,name:p.name||p.id,shockState:'NONE',eventCount:0,confidence:'bez potvrzeného stavu'});
 }
 let applied=0;
 let previousRound=null;
 const seenIds=new Set();
 const blocked=new Set();
 for(let i=0;i<entries.length;i++){
  const entry=entries[i];
  const draft=entry?.draft;
  const id=draft?.target?.id;
  const combatant=byId.get(id);
  const reject=message=>issues.push({index:i+1,message});
  if(!combatant){reject('Událost nemá účastníka v aktuálním střetnutí.');continue;}
  if(blocked.has(id)){reject('Stav účastníka je zablokován předchozí chybou návaznosti.');continue;}
  if(typeof entry?.id==='string'&&entry.id){
   if(seenIds.has(entry.id)){reject('Duplicitní ID události; návrh nebyl aplikován.');blocked.add(id);combatant.confidence='zablokováno';continue;}
   seenIds.add(entry.id);
  }
  const round=entry?.chronology?.round;
  if(entry?.chronology!==undefined&&(!Number.isInteger(round)||round<1||round>9999)){
   reject('Neplatné číslo kola; návrh nebyl aplikován.');blocked.add(id);combatant.confidence='zablokováno';continue;
  }
  if(Number.isInteger(round)&&previousRound!==null&&round<previousRound){
   reject('Historie jde zpět v čase; návrh nebyl aplikován.');blocked.add(id);combatant.confidence='zablokováno';continue;
  }
  if(Number.isInteger(round))previousRound=round;
  let valid;
  try{valid=validateDraft(draft);}catch{valid={ok:false};}
  if(!valid?.ok){reject('Kontrolní přepočet návrhu selhal; návrh nebyl aplikován.');blocked.add(id);combatant.confidence='zablokováno';continue;}
  const incoming=states[draft?.shockResult?.state];
  const previous=states[draft?.inputs?.previousState];
  if(!incoming||!previous){reject('Neznámý Shock State.');blocked.add(id);combatant.confidence='zablokováno';continue;}
  if(combatant.eventCount&&previous!==states[combatant.shockState]){
   reject('Předchozí stav neodpovídá poslední projekci. Může chybět zotavení či událost; další stav nelze bezpečně určit.');
   blocked.add(id);combatant.confidence='zablokováno';continue;
  }
  if(!combatant.eventCount&&previous!==SHOCK_STATE.NONE){
   reject('Počáteční stav není NONE a nemá doloženou výchozí událost; projekce nemá ověřený počátek.');
   blocked.add(id);combatant.confidence='zablokováno';continue;
  }
  const next=reverse[applyShockState(previous,incoming)];
  if(next!==draft?.carryover?.state){reject('Uložený carryover nesouhlasí s pravidlovým jádrem; návrh nebyl aplikován.');blocked.add(id);combatant.confidence='zablokováno';continue;}
  combatant.shockState=next;
  combatant.eventCount++;
  combatant.confidence='pouze pracovní projekce';
  applied++;
 }
 return {format:'hmk-combat-state-projection-v2',status:'preview-only',mutatesCharacter:false,source:'src/rules/shock.js',events:entries.length,applied,combatants:[...byId.values()],issues,limitations:['Not an authoritative combat resolver','Projection stops for a combatant on first continuity failure','No automatic recovery or bleeding','No character persistence','Uses existing preview draft inputs']};
}
