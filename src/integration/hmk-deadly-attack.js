/** HârnMaster Kèthîra v1.2, printed p.191: verified helpless targets.
 * Deadly melee forces Ignore and four-star CS; no Attack/Defence d100 exists.
 * This module deliberately does not guess sleeping, binding, or weapon-point
 * conditions from arbitrary descriptive text. GM-authored context needs its
 * own durable evidence before these additional cases can be automated.
 */
import {completeParalysis} from './hmk-paralysis-sequela.js';
export function verifiedDeadlyHelplessReason(state){
 if(!state||typeof state!=='object'||state.shock==='KIA')return null;
 if(completeParalysis(state))return 'complete-paralysis';
 if(state.shock==='UNC')return 'unconscious';
 if(state.coma?.active===true)return 'coma-unconscious';
 if((state.ailmentSequelae||[]).some(s=>s?.active===true&&s?.permanent===true&&s?.condition==='blindness'))return 'permanent-blindness';
 return null;
}
export function verifiedDeadlyMeleeOutcome(state,deadlyAim=null){
 const reason=verifiedDeadlyHelplessReason(state);
 if(!reason)throw Error('HMK str.191: bezbrannost cíle není v jeho autoritativním stavu doložená. GM popis sám nestačí.');
 return {ok:true,deadlyAttack:true,deadlyReason:reason,deadlyAim:deadlyAim?structuredClone(deadlyAim):null,defence:'ignore',
  attackerStrike:true,counterStrike:false,strikeOwner:'attacker',striker:'attacker',winner:'attacker',
  stars:4,extraTA:3,taTypes:['impact','precision'],
  attackerSL:3,defenderSL:null,attackerNaturalSL:null,defenderNaturalSL:null,
  attackerMishap:null,defenderMishap:null,weaponDamageCheck:false,weaponDamageResolved:true,
  impactTA:0,ignore:true,summary:'Deadly Melee: Ignore + automatický čtyřhvězdičkový CS; bez Melee d100 (HMK str.191).'};
}
export function assertDeadlyEvidence(outcome,state,physicalDice){
 const result=verifiedDeadlyMeleeOutcome(state);
 if(outcome?.deadlyAttack!==true||outcome.deadlyReason!==result.deadlyReason||
  (outcome.deadlyAim!=null&&(!(outcome.deadlyAim.location)||outcome.deadlyAim.source!=='hmk-initiative-one-round-deadly-aim-p191'))||
  outcome.defence!=='ignore'||outcome.stars!==4||outcome.extraTA!==3||
  outcome.attackerStrike!==true||outcome.counterStrike===true||
  outcome.attackerSL!==3||outcome.attackerNaturalSL!==null||outcome.striker!=='attacker'||
  !Array.isArray(outcome.taTypes)||outcome.taTypes.length!==2||
  outcome.taTypes[0]!=='impact'||outcome.taTypes[1]!=='precision'||outcome.ignore!==true||
  outcome.attackerMishap||outcome.defenderMishap||outcome.weaponDamageCheck||
  !Array.isArray(physicalDice)||physicalDice.some(d=>d?.id==='attackerRoll'||d?.id==='defenderRoll'))
  throw Error('Deadly Attack: chybí nebo nesouhlasí důkaz Ignore / four-star CS bez fyzického Melee d100');
 return result;
}
