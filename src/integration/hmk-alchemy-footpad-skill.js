/** HMK v1.2 p.272 Footpad: changes Stealth PRIMARY ML, not GM EML.
 * Legerdemain gains the same ML only where GM confirms noise is essential.
 * No stacking of repeated doses: use the strongest active AS as the observable
 * effect until a specific stacking rule is documented.
 */
import {activeFootpad} from './hmk-alchemy-imbibing.js';
export function footpadSkillEvidence({journal=[],campaignId,minute,actorId,skill,
 auralShockLevels=0,silenceConfirmed=false}={}){
 if(!campaignId||!actorId||!Number.isSafeInteger(minute)||minute<0||
  !Number.isSafeInteger(auralShockLevels)||auralShockLevels<0)
  throw Error('Footpad: neplatná kampaň, čas nebo Aural Shock');
 const doses=activeFootpad(journal,campaignId,actorId,minute);
 const eligible=skill==='Stealth'||skill==='Legerdemain'&&silenceConfirmed===true;
 const suspended=auralShockLevels>0,activeAS=doses.length?Math.max(...doses.map(x=>x.state.currentAS)):0;
 return {sourceIds:doses.map(x=>x.useId),sourceAS:doses.map(x=>x.state.currentAS),
  activeAS,eligible,suspended,silenceConfirmed:silenceConfirmed===true,
  modifier:eligible&&!suspended?activeAS*5:0,kind:'primary-ml',sourcePage:272};
}
export function footpadMastery(mastery,evidence){
 if(!mastery||!Number.isSafeInteger(mastery.ml)||mastery.ml<1||mastery.ml>1000)
  throw Error('Footpad: neplatné původní Primary ML');
 if(!evidence?.modifier)return mastery;
 const next=mastery.ml+evidence.modifier;
 if(next>1000)throw Error('Footpad: efektivní ML přesahuje rozsah Skill Workbench');
 return {...mastery,ml:next,index:Math.floor(next/10),footpadBaseML:mastery.ml,
  footpadBonusML:evidence.modifier,footpadSourceIds:[...evidence.sourceIds]};
}
