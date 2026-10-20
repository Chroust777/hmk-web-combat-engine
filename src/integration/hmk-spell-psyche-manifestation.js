/** HMK Kethira v1.2 p.188–189: first manifestation of an already chosen
 * spell/aural-induced Psyche Trait, after the GM verifies ~10 game minutes.
 * This module never advances game time, rolls dice, or recovers PSY.
 * It reuses the same verified full-document CAS checkpoint as combat actions.
 */
import {validateCombatState} from './persistent-combat-state.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const cp=structuredClone,js=JSON.stringify;
const check=(x,m)=>{if(!x)throw Error(m)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
function eligible(document,characterId,trait){
 const p=document?.characters?.find(c=>c.id===characterId);
 check(p&&document.characters.filter(c=>c.id===characterId).length===1,
  'Psyche Manifestation: chybí jednoznačná postava');
 const arc=p.hmk?.arcane,state=validateCombatState(p.hmk?.combatState);
 check(arc&&!arc.pendingPsycheTraitChoice&&typeof trait==='string',
  'Psyche Manifestation: nejdříve dokončete všechny volby traitů');
 const cases=arc.psycheTraumas??[];
 check(Array.isArray(cases)&&cases.filter(z=>z.trait===trait&&z.recovered!==true).length===1,
  'Psyche Manifestation: jedinečný dřívější trait nenalezen');
 const t=cases.find(z=>z.trait===trait&&z.recovered!==true);
 check(t.recovered===false&&t.manifested===false&&t.manifestationPending===true&&
  whole(t.psycheLevels,1,99999)&&Array.isArray(t.sourceEventIds)&&t.sourceEventIds.length>0&&
  t.sourceEventIds.every(id=>typeof id==='string'&&
   document.journal?.some(j=>j.combatProof?.sourceEventId===id&&
    j.combatProof?.actionKind==='spell-psyche-trait-choice')),
  'Psyche Manifestation: neúplná kauzální evidence nebo již projevený trait');
 check(state.morale.psycheStress>=t.psycheLevels&&
  state.fatigue.otherWeakness+t.psycheLevels*5<=99999,
  'Psyche Manifestation: chybí PSY nebo kapacita Weakness');
 const seq=document?.combatRuntime?.sequence;
 check(seq&&seq.active!==true&&!seq.pendingEndTurnAction&&!seq.interruptActiveId,
  'Psyche Manifestation: mezidobí nesmí obejít živý tah Initiative');
 return {p,t,state,round:seq.round};
}
export function pendingSpellPsycheManifestations(document){
 return (document?.characters??[]).flatMap(p=>(p?.hmk?.arcane?.psycheTraumas??[]).flatMap(t=>{
  try{if(t.recovered===true)return [];eligible(document,p.id,t.trait);return [{characterId:p.id,name:p.name||p.id,
   trait:t.trait,levels:t.psycheLevels}]}catch{return []}
 }));
}
export function persistSpellPsycheManifestation({document,characterId,trait,eventId,
 gmConfirmed=false,gmConfirmedTenMinutesElapsed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&gmConfirmedTenMinutesElapsed===true&&
  typeof eventId==='string'&&eventId.length>=3&&eventId.length<=140,
  'Psyche Manifestation vyžaduje výslovné potvrzení uplynutí cca 10 herních minut');
 const witness=eligible(document,characterId,trait);
 check(!witness.state.events.some(e=>e.id===eventId)&&
  !(document.journal??[]).some(e=>e.id==='psyche-manifestation:'+eventId),
  'Psyche Manifestation: duplicitní potvrzení');
 const out=cp(document),c=out.characters.find(x=>x.id===characterId);
 const t=c.hmk.arcane.psycheTraumas.find(z=>z.trait===trait&&z.recovered!==true),s=c.hmk.combatState;
 t.manifestationPending=false;t.manifested=true;
 const add=t.psycheLevels*5;s.fatigue.otherWeakness+=add;
 s.events.push({id:eventId,round:witness.round,type:'hmk-psyche-manifestation',
  details:{trait,psycheLevels:t.psycheLevels,weaknessAdded:add,
   sourceEventIds:cp(t.sourceEventIds),gmConfirmedTenMinutesElapsed:true}});
 s.lastRound=Math.max(s.lastRound,witness.round);
 validateCombatState(s);
 out.journal.push({id:'psyche-manifestation:'+eventId,characterId,createdAt:new Date().toISOString(),
  campaignMinute:document.campaignClock?.minute??null,
  title:`HMK Psyche Trait · nástup ${trait}`,
  body:`GM potvrdil ~10 herních minut od traumatu. ${trait}: PSY ${t.psycheLevels}, Weakness +${add}. D6-denní Psyche Recovery nadále není vyřízena.`,
  combatProof:{actionKind:'psyche-trait-manifestation',sourceEventId:eventId,
   trait,psycheLevels:t.psycheLevels,weaknessAdded:add,gmConfirmedTenMinutesElapsed:true,
   causedBy:cp(t.sourceEventIds),physicalDice:[]}});
 const serialized=js(out),result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,document:result.ok?out:null,serialized:result.ok?serialized:null};
}
