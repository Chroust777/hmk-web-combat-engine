/** v93.268: read-only validated calculation. Unverifiable equipment inputs
 * may be explicitly adjudicated by GM and are preserved in the journal.
 * No combat writes. A missing Combat State means the same clean
 * baseline used by the original Ledger only for characters without legacy
 * injuries. No unknown helmet layers, attack hand or elapsed time are invented.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {resolveSkillConditions,skillConditionAvailability} from './hmk-skill-context.js';
import {resolveSkillTrauma,impairedSkillKind,skillTraumaAvailability} from './hmk-skill-trauma.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
const sides=new Set(['left','right']);
const armSkills=new Set(['Melee','Archery','Slings','Throwing','Dodge','Dexterity','Legerdemain','Climbing','Swimming','Acrobatics','Dancing','Jumping','Stealth','Riding']);
const bothArms=new Set(['Archery','Slings','Climbing','Swimming']);
export function recordedActor(actor){
 if(!actor||!actor.hmk)throw Error('Postava nemá ověřený HMK profil');
 if(actor.hmk.combatState){validateCombatState(actor.hmk.combatState);return {actor,state:actor.hmk.combatState,source:'saved-combat-state'};}
 if((actor.hmk.injuries?.length??0)>0)throw Error('Starší evidovaná zranění nejsou převedena do Combat State; dokončete je v Character Sheet / Combat.');
 const state=initialCombatState();return {actor:{...actor,hmk:{...actor.hmk,combatState:state}},state,source:'ledger-clean-baseline'};
}
export function inferredArms(actor,inventory,name,state){
 const woundedArms=(state?.wounds??[]).some(w=>(!w.healed||(w.healing?.permanentImpairment??0)>0)&&['sh','ua','el','fo','ha','shoulder','upper arm','elbow','forearm','hand'].includes(String(w.location??'').toLowerCase()));
 if(!woundedArms)return {usedArms:['left','right'],source:'no-active-arm-injury'};
 if(!armSkills.has(name))return {usedArms:['none'],source:'skill-does-not-specify-arm-use'};
 if(bothArms.has(name))return {usedArms:['left','right'],source:'two-arm-activity'};
 const dominant=actor?.hmk?.handedness;
 if(!sides.has(dominant))throw Error('Zraněná paže: chybí ověřená dominantní ruka postavy; doplňte Character Sheet.');
 if(name==='Melee'||name==='Throwing'){
  const own=inventory.filter(x=>x.characterId===actor.id&&x.snapshot?.category==='weapon'&&['main_hand','off_hand'].includes(x.slot));
  if(own.length!==1)throw Error('Zraněná paže: u Melee/Throwing není jednoznačně určena použitá zbraň v ruce; změňte vybavení nebo použijte Combat s konkrétní akcí.');
  return {usedArms:[own[0].slot==='main_hand'?dominant:dominant==='left'?'right':'left'],source:'equipped-'+own[0].slot,weaponId:own[0].id};
 }
 throw Error('Zranění paže a činnost '+name+' neumožňují doložit použitou ruku ze samotného názvu skillu. Použijte konkrétní akci v Combat; postih nelze odhadnout.');
}
export function automaticSkillContext({actor,inventory=[],name,combatRound=null,combatTimelineId=null,gearPolicy='strict',manualENC=null,manualBulk=null,manualPerception=null}={}){
 if(!Array.isArray(inventory))throw Error('Chybí potvrzený inventář');
 const base=recordedActor(actor);const state=base.state;
 // Mounted conditions cannot be guessed from equipment alone. The confirmed
 // encounter rider/mount state belongs to Combat, not a standalone skill die.
 if(state.mounted===true||state.mountId)throw Error('Aktivní jízda: vyhodnoťte test v potvrzeném Mounted Combat kontextu.');
 // HMK 112/117/160: an unresolved armour layering is NOT a prohibition on
 // trying a skill. Never silently treat unknown encumbrance/bulk as zero:
 // GM must explicitly confirm an omitted or supplied penalty. Saved inventory
 // and Combat state remain unchanged, and the journal records this decision.
 if(!['strict','gm'].includes(gearPolicy))throw Error('Neznámé rozhodnutí o výbavě');
 const allowedGM=gearPolicy==='gm',issues=[];
 const conditionAvail=skillConditionAvailability({actor:base.actor,inventory,name,mounted:false});
 const traumaAvail=skillTraumaAvailability({actor:base.actor,inventory,name,mounted:false});
 const manual=(value,label)=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<0||n>500||n%5)throw Error(label+' musí být nezáporné celé číslo po 5');
  return n;
 };
 const gmEnc=manual(manualENC,'GM ENC'),gmBulk=manual(manualBulk,'GM Bulk'),gmPer=manual(manualPerception,'GM PER');
 function fallback(preview,label,value){
  if(preview.ready)return {mode:'auto',value:null};
  if(!allowedGM)throw Error(label+': '+preview.reason+' — potvrďte rozhodnutí GM pod rozpisem zbroje.');
  issues.push(label+': '+preview.reason+'; '+(value===null?'GM rozhodl nezahrnout neověřený postih':'GM určil '+value));
  return {mode:value===null?'omit':'manual',value};
 }
 const ec=fallback(conditionAvail.enc,'ENC',gmEnc);
 const bk=fallback(traumaAvail.bulk,'Bulk',gmBulk);
 const pe=fallback(traumaAvail.perception,'Zbroj / PER',gmPer);
 const condition=resolveSkillConditions({actor:base.actor,inventory,name,fatigueMode:'auto',encMode:ec.mode,manualENC:ec.value,mounted:false});
 const impaired=impairedSkillKind(base.actor,name);
 const arm=inferredArms(base.actor,inventory,name,state);
 let trauma;
 if(!state.wounds.length){
  // The old resolver required per-test GM mode decisions even on a clean
  // character. Zero injury and STN check are completely source-proven here.
  trauma=resolveSkillTrauma({actor:base.actor,inventory,name,shockMode:'auto',injuryMode:'auto',bulkMode:bk.mode,manualBulk:bk.value,perceptionMode:pe.mode,manualPerception:pe.value});
 }else {
  if(!impaired)throw Error('Zranění: činnost '+name+' nemá v HMK p.170 doloženou kategorii Impaired Tests. Nepoužijeme vymyšlený postih.');
  const round=Number.isSafeInteger(combatRound)&&combatRound>=1?combatRound:state.lastRound;
  if(!Number.isSafeInteger(round)||round<1)throw Error('Zranění: chybí potvrzené bojové kolo / stáří ran v Combat.');
  const timeline=typeof combatTimelineId==='string'&&combatTimelineId?combatTimelineId:state.encounterTimelineId??null;
  // Require timeline alignment for injuries that use elapsed-round logic.
  if(state.wounds.some(w=>!w.healed&&w.severity==='M'&&
   (!timeline||w.timelineId!==timeline||!Number.isSafeInteger(w.recordedRound)||round<w.recordedRound)))
   throw Error('Minor Injury: není doloženo, zda již uplynulo 10 minut od poranění; aktualizujte časovou osu v Combat/Kalendáři.');
  const projected=projectLiveInjuries({state,round,test:impaired,usedArms:arm.usedArms,timelineId:timeline});
  if(!projected.ready)throw Error('Zranění: '+projected.reason);
  trauma=resolveSkillTrauma({actor:base.actor,inventory,name,shockMode:'auto',injuryMode:'auto',bulkMode:bk.mode,manualBulk:bk.value,perceptionMode:pe.mode,manualPerception:pe.value,currentRound:round,usedArm:arm.usedArms.length===2?'both':arm.usedArms[0]??'none'});
 }
 return {kind:'hmk-auto-skill-context-v1',actorId:actor.id,name,condition,trauma,gmArmourDecision:allowedGM,armourWarnings:issues,
  modifier:condition.modifier+trauma.modifier,source:base.source,hand:arm.source,
  breakdown:[{label:'Fatigue',value:condition.fatigue.modifier,source:condition.fatigue.source},
   {label:'ENC',value:condition.enc.modifier,source:condition.enc.source},
   {label:'Zranění',value:trauma.injury.modifier,source:trauma.injury.source},
   {label:'Bulk',value:trauma.bulk.modifier,source:trauma.bulk.source},
   {label:'Zbroj / PER',value:trauma.perception.modifier,source:trauma.perception.source}],
  sourcePages:[60,61,62,112,117,118,169,170,176],readOnly:true};
}
