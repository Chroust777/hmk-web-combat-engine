/** HMK v1.2 p.271 Erudition. Success-to-CS applies only to Lore skills
 * and REA/CRE tests with d100 units 3,5,8,0. No alteration to EML/die.
 */
import {activeErudition} from './hmk-alchemy-imbibing.js';
import {SKILL_DEFINITIONS} from './hmk-character-creation.js';
import {successValueTier} from './hmk-skill-test-engine.js';
const LORE=new Set(SKILL_DEFINITIONS.filter(x=>x.group==='Lore').map(x=>x.name));
export function eruditionSkillEvidence({journal=[],campaignId,minute,actorId,skill,auralShockLevels=0}={}){
 if(!campaignId||!actorId||!Number.isSafeInteger(minute)||minute<0||!Number.isSafeInteger(auralShockLevels)||auralShockLevels<0)
  throw Error('Erudition: neplatná kampaň, čas nebo Aural Shock');
 const effects=activeErudition(journal,campaignId,actorId,minute);
 const eligible=LORE.has(skill)||skill==='Reasoning'||skill==='Creativity';
 return {sourceIds:effects.map(x=>x.useId),activeAS:effects.map(x=>x.state.currentAS),eligible,
  suspended:auralShockLevels>0,canPromote:eligible&&auralShockLevels===0&&effects.length>0,sourcePage:271};
}
export function applyEruditionSkillResult(result,evidence){
 if(!evidence?.canPromote||!result||result.forcedCF||result.sl!==2||
  !Number.isSafeInteger(result.roll)||![3,5,8,0].includes(result.roll%10))return result;
 const sv=result.index+1+(result.svExtra||0);
 return {...result,preEruditionSL:result.sl,preEruditionLevel:result.level,
  sl:3,level:'CS',sv,svTier:successValueTier(sv),unopposedStars:2,
  eruditionSourceIds:[...evidence.sourceIds],eruditionSourcePage:271};
}
