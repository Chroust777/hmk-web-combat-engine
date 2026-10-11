import { Injury } from '../domain/contracts.js';
import { injurySequenceEvents } from '../rules/injury.js';

/**
 * Commit a completed Injury Sequence into persistent combat-state data.
 * The caller supplies the stable injury id; no random id is generated inside
 * the deterministic rules/state boundary.
 */
export function commitInjuryResolution({result,combatantId,injuryId,currentRound,currentIR}={}){
  if(!result?.complete) return {committed:false,pending:result?.pending??{type:'injury-sequence'},injury:null,events:[]};
  if(result.dead && !result.step3?.injury) return {committed:true,pending:null,injury:null,events:[]};
  if(!result.step3?.injury) return {committed:true,pending:null,injury:null,events:injurySequenceEvents({result,currentRound,currentIR,combatantId,injuryId:null})};
  if(!combatantId) throw new Error('combatantId is required to commit an injury');
  if(!injuryId) throw new Error('stable injuryId is required to commit an injury');
  const src=result.step3.injury;
  const injury=Injury({
    id:injuryId,combatantId,
    location:src.location??result.location?.id??result.location?.location,
    zone:src.zone??result.location?.zone,
    severity:src.severity,level:src.level,aspect:src.aspect,
    bleeding:result.step3.bleeder?1:0,
    impairment:result.effect?.impairment??0,
    amputation:!!result.step3.amputation?.severed,
    meta:{impaled:!!result.impaled,area:!!src.area,shockSL:result.shock?.shockSL??null,morale:result.morale??{required:false,timing:null}}
  });
  const events=injurySequenceEvents({result,currentRound,currentIR,combatantId,injuryId});
  return {committed:true,pending:null,injury,events};
}
