/** HMK v1.2 p.48: optional, *GM-awarded* additional Language DP.
 * Not an extra official Skill Development stage, and never scripts.
 * Awarding is a conscious GM choice, with no physical dice/random selection.
 */
import {parseOccupationDistribution} from './hmk-skill-instances.js';
export function gmLanguageBudget(folk,ageGroup){
 if(folk==='Kúzhai'||folk==='Sinái')return 4;
 // Printed table names Old/Kúzhai/Sinái. Sidhé is not named: requires GM review.
 if(folk==='Sidhé')return null;
 return ageGroup==='Young'?2:ageGroup==='Mature'?3:ageGroup==='Old'?4:null;
}
export function gmLanguageProof(character,decision,distribution=''){
 const {folk,ageGroup}=character?.hmk??{};
 if(!['granted','declined'].includes(decision))throw Error('GM musí potvrdit udělení či neudělení Bonus Language DP');
 const budget=gmLanguageBudget(folk,ageGroup);
 if(decision==='declined'){
  if(distribution.trim())throw Error('Bez rozhodnutí udělit bonus nesmí být přidělena žádná Language DP');
  return {decision,folk,ageGroup,budget,distribution:'',allocations:{},sourcePage:48};
 }
 if(budget===null)throw Error('GM Bonus Language DP: tato Folk/Age kombinace není výslovně určena na p.48; vyžaduje GM review');
 const allocations=parseOccupationDistribution(character,distribution,'Language',budget);
 return {decision,folk,ageGroup,budget,distribution,allocations,sourcePage:48};
}
