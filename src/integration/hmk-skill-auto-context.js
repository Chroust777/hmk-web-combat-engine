/** v93.268: read-only validated calculation. Unverifiable equipment inputs
 * may be explicitly adjudicated by GM and are preserved in the journal.
 * No combat writes. A missing Combat State means the same clean
 * baseline used by the original Ledger only for characters without legacy
 * injuries. No unknown helmet layers, attack hand or elapsed time are invented.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {completeParalysis,blockedLimbs} from './hmk-paralysis-sequela.js';
import {resolveSkillConditions,skillConditionAvailability,encApplicability} from './hmk-skill-context.js';
import {resolveSkillTrauma,impairedSkillKind,skillTraumaAvailability} from './hmk-skill-trauma.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {strengthEncumbranceModifier,modifiedEncumbrance} from '../rules/encumbrance.js';

/** Read-side minimum, independently source-proven ENC.  Printed article ENC and
 * carried Gear ENC do not disappear because the layer ordering is illegal.
 * Any p117 outer D/Q extra ENC remains UNRESOLVED until a valid layer mapping
 * proves it; do not certify this minimum as a complete load. */
export function partialSkillArmourLoad(actor,inventory){
 const checked=resolveCombatantLoad({character:actor,inventory,mounted:false});
 if(checked.encReady&&Number.isSafeInteger(checked.modifiedENC))
  return {ready:true,enc:checked.modifiedENC,per:checked.perceptionPenalty,complete:!(checked.issues||[]).length,source:'audited-load'};
 const worn=inventory.filter(x=>x?.characterId===actor.id&&x.slot==='worn');
 const validated=worn.map(resolveOwnedArmourArticle);
 if(validated.some(x=>!x.ready))return {ready:false,reason:'Některá nasazená zbroj nemá ověřený katalogový záznam.'};
 // The existing load resolver calculates carried gear even when a worn layer
 // prevents armour validation. No guessed carried masses are used.
 if(!Number.isSafeInteger(checked.gearENC))return {ready:false,reason:'Hmotnost nesené výbavy není doložena.'};
 const str=actor?.hmk?.attributes?.str;
 if(!Number.isSafeInteger(str)||str<1||str>200)return {ready:false,reason:'Chybí ověřená Strength pro ENC.'};
 const parts=validated.map(x=>x.article);
 if(parts.some(x=>!Number.isSafeInteger(x.enc)&&!['a','p'].includes(x.enc)))
  return {ready:false,reason:'Některá součást zbroje nemá ověřenou hodnotu ENC.'};
 const base=parts.reduce((n,x)=>n+(Number.isSafeInteger(x.enc)?x.enc:0),0);
 const arms=parts.filter(x=>x.enc==='a').length>=3?5:0;
 // With invalid layering no overFar assignment is certified. Any possible
 // extra D/Q ENC remains unresolved, even if an explicit slot was recorded.
 const extra=0;
 const total=modifiedEncumbrance({armourENC:base+arms+extra,gearENC:checked.gearENC,str,mounted:false});
 const per=parts.reduce((n,x)=>n+(x.enc==='p'?x.perceptionPenalty??0:0),0);
 return {ready:true,enc:total,per:-per,complete:false,base,arms,extra,gearENC:checked.gearENC,strModifier:strengthEncumbranceModifier(str,{mounted:false}),
  source:'p118-known-components-only',reason:'Neověřené vrstvení: tento ENC zahrnuje doložené díly, nikoli neprokázané další příplatky za vrstvy.'};
}
function simplifyArmourReason(message){
 const txt=String(message||'');
 const zones=['head','arms','torso','legs'].filter(z=>new RegExp('\\b'+z+':','i').test(txt));
 const cz={head:'hlava',arms:'paže',torso:'trup',legs:'nohy'};
 const place=zones.length? ' ('+zones.map(z=>cz[z]).join(', ')+')':'';
 if(/forbidden material order|incompatible explicit slot|Unresolved or forbidden armour layers/i.test(txt))
  return 'Kombinace nasazených vrstev zbroje není podle HMK str. 117 pravidlově potvrzena'+place+'. Některé materiály nelze tímto způsobem vrstvit; nejde automaticky jen o Bulk −5.';
 return 'Nelze ověřit zbrojní údaj'+place+'. '+(txt.startsWith('Body-zone')?'Chybí potvrzené vrstvy pro příslušnou část těla.':'Zkontrolujte inventář nebo určete chybějící postih GM.');
}
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
export function automaticSkillContext({actor,inventory=[],name,combatRound=null,combatTimelineId=null,gearPolicy='advisory',manualENC=null,manualBulk=null,manualPerception=null,sensoryBasis=null,blindnessDecision=null,visionBasis=null}={}){
 if(!Array.isArray(inventory))throw Error('Chybí potvrzený inventář');
 const base=recordedActor(actor);const state=base.state;
 if(completeParalysis(state))throw Error('HMK str.184: úplně paralyzovaná postava nemůže provést samostatný Skill Test.');
 const disabled=blockedLimbs(state);
 const armActivity=['Climbing','Swimming','Archery','Slings','Throwing','Melee','Dexterity','Legerdemain','Acrobatics','Dancing','Jumping','Stealth','Riding'];
 const legActivity=['Agility','Climbing','Swimming','Acrobatics','Dancing','Jumping','Stealth','Riding','Dodge'];
 if([...disabled].some(x=>x.endsWith('-arm'))&&armActivity.includes(name))
  throw Error('HMK str.184: ochrnutá paže – samostatný Skill Test neověřuje použitou končetinu. Pro útok použijte Combat s potvrzenou rukou; ostatní činnosti vyžadují rozhodnutí GM.');
 if([...disabled].some(x=>x.endsWith('-leg'))&&legActivity.includes(name))
  throw Error('HMK str.184: ochrnutá noha – tento test může používat postiženou končetinu; bez rozhodnutí GM jej nelze vyhodnotit.');
 const hasDeafness=(state.ailmentSequelae||[]).some(x=>x.active&&x.condition==='deafness');
 const mayHear=['Awareness','Perception'].includes(name);
 const certainHearing=name==='Sound';
 if(hasDeafness&&mayHear&&!['hearing','other'].includes(sensoryBasis))
  throw Error('Trvalá hluchota (p184): GM musí označit, zda PER/Awareness test vyžaduje SLUCH (automatické CF), nebo jiný smysl.');
 const deafnessForcedCF=hasDeafness&&(certainHearing||(mayHear&&sensoryBasis==='hearing'));
 const hasBlindness=(state.ailmentSequelae||[]).some(x=>x.active&&x.condition==='blindness');
 const baseAttrs=encApplicability(base.actor,name);
 if(hasBlindness&&name==='Sight')throw Error('Trvalá slepota (HMK 184): Sight vyžaduje zrak; nelze provést běžný test. GM musí vyřešit nemožnou činnost.');
 if(hasBlindness&&mayHear){
  if(!['sight','other'].includes(visionBasis))throw Error('Trvalá slepota (HMK 184): GM musí u PER/Awareness potvrdit, zda je test založen na ZRAKU, nebo jiném smyslu.');
  if(visionBasis==='sight')throw Error('Trvalá slepota (HMK 184): čistě zrakový PER/Awareness test není možný; nehází se d100.');
 }
 if(hasBlindness&&baseAttrs.kind==='unknown'&&!['Awareness'].includes(name))
  throw Error('Trvalá slepota (HMK 184): chybí ověřená Skill Base; bez ní nelze určit postih −40.');
 const blindnessApplies=hasBlindness&&(name==='Agility'||name==='Dexterity'||
  [baseAttrs.primary,baseAttrs.secondary].some(x=>x==='agl'||x==='dex'));
 if(blindnessApplies&&blindnessDecision!=='possible'){
  if(blindnessDecision==='impossible')throw Error('Trvalá slepota (HMK 184): GM určil činnost za nemožnou; test a hod d100 jsou zakázány.');
  throw Error('Trvalá slepota (HMK 184): GM musí určit, zda je činnost proveditelná s postihem −40, nebo nemožná.');
 }
 // Mounted conditions cannot be guessed from equipment alone. The confirmed
 // encounter rider/mount state belongs to Combat, not a standalone skill die.
 if(state.mounted===true||state.mountId)throw Error('Aktivní jízda: vyhodnoťte test v potvrzeném Mounted Combat kontextu.');
 // HMK 112/117/160: an unresolved armour layering is NOT a prohibition on
 // trying a skill. Never silently treat unknown encumbrance/bulk as zero:
 // Missing data remains visibly provisional until GM adjudication. Saved inventory
 // and Combat state remain unchanged, and the journal records this decision.
 if(!['strict','gm','advisory'].includes(gearPolicy))throw Error('Neznámé rozhodnutí o výbavě');
 const allowedGM=gearPolicy==='gm',advisory=gearPolicy==='advisory',issues=[],provisional=[];
 // The load is independent of the skill and remains useful evidence even when
 // this particular Skill does not use Agility or the outfit is prohibited.
 // Printed ENC, Gear ENC and STR must not be confused with EML penalties.
 let loadEvidence=null;
 try{
  const load=resolveCombatantLoad({character:base.actor,inventory,mounted:false});
  loadEvidence={gearENC:load.gearENC,armourENC:load.armourENC,knownArmourENC:load.knownArmourENC,
   armourUpperBound:load.armourENCUpperBound,modifiedENC:load.modifiedENC,
   knownMinimumENC:load.knownMinimumENC,knownMaximumENC:load.knownMaximumENC,
   strengthModifier:Number.isSafeInteger(load.str)?strengthEncumbranceModifier(load.str,{mounted:false}):null,
   encReady:load.encReady===true&&!(load.issues||[]).length,
   bulkReady:load.bulkReady===true&&!(load.issues||[]).length,
   prohibitedOutfit:load.prohibitedOutfit===true};
 }catch(_){/* Existing rule-evidence checks explain unavailable values. */}
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
  const description=simplifyArmourReason(preview.reason);
  if(!allowedGM&&!advisory)throw Error(label+': '+description);
  if(advisory){
   if(value!==null){issues.push(label+': hodnota '+value+' určená GM');return {mode:'manual',value};}
   // Provisional is ALWAYS conspicuous in the preview, journal, and result.
   // A missing input is not quietly certified as zero.
   provisional.push(label+': '+description);
   return {mode:'omit',value:null};
  }
  issues.push(label+': '+(value===null?'GM potvrdil nezahrnutí neověřeného postihu':'GM určil '+value)+'. '+description);
  return {mode:value===null?'omit':'manual',value};
 }
 let ec=fallback(conditionAvail.enc,'ENC',gmEnc);
 let bk=fallback(traumaAvail.bulk,'Bulk',gmBulk);
 let pe=fallback(traumaAvail.perception,'Zbroj / PER',gmPer);
 // Independently proven p118 article ENC is still a real penalty when layer
 // validation fails. This never pretends that the full load is certified.
 const partial=(advisory&&(!conditionAvail.enc.ready||!traumaAvail.perception.ready))?partialSkillArmourLoad(base.actor,inventory):null;
 if(partial?.ready&&ec.mode==='omit'&&!conditionAvail.enc.ready){
  ec={mode:'manual',value:partial.enc,source:'provisional-verified-enc'};
  provisional.push('ENC: z doložených součástí zbroje a výbavy započteno '+partial.enc+'; další příplatky neověřeny.');
 }
 if(partial?.ready&&pe.mode==='omit'&&!traumaAvail.perception.ready&&traumaAvail.perceptionApplicability==='applies'){
  pe={mode:'manual',value:-partial.per,source:'provisional-verified-per'};
  provisional.push('PER: doložený postih z přilby '+partial.per+' započten; úplnost výbavy nebyla potvrzena.');
 }
 const condition=resolveSkillConditions({actor:base.actor,inventory,name,fatigueMode:'auto',encMode:ec.mode,manualENC:ec.value,mounted:false});
 if(deafnessForcedCF)condition.deafnessForcedCF=true;
 if(blindnessApplies){condition.blindnessModifier=-40;condition.modifier-=40;}
 if(advisory&&partial?.ready&&!conditionAvail.enc.ready&&gmEnc===null){
  condition.enc.source='verified-p118-minimum-enc-not-full-load';
  condition.enc.mode='provisional-known-components';
 }else if(advisory&&ec.mode==='omit'&&!conditionAvail.enc.ready){
  condition.enc.source='unresolved-enc-not-assumed-zero';
  condition.enc.mode='provisional-unresolved';
 }
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
 if(advisory&&bk.mode==='omit'&&!traumaAvail.bulk.ready){
  trauma.bulk.source='unresolved-bulk-not-assumed-zero';trauma.bulk.mode='provisional-unresolved';
 }
 if(advisory&&pe.mode==='omit'&&!traumaAvail.perception.ready){
  trauma.perception.source='unresolved-per-not-assumed-zero';trauma.perception.mode='provisional-unresolved';
 }else if(advisory&&pe.mode==='manual'&&partial?.ready&&gmPer===null){
  trauma.perception.source='verified-p118-minimum-per-not-full-armour';trauma.perception.mode='provisional-known-components';
 }
 return {kind:'hmk-auto-skill-context-v1',actorId:actor.id,name,condition,trauma,gmArmourDecision:allowedGM,armourWarnings:issues,provisionalArmour:provisional,armourIsProvisional:provisional.length>0,
  modifier:condition.modifier+trauma.modifier,deafnessForcedCF,blindnessApplies,blindnessModifier:blindnessApplies?-40:0,blindnessDecision:blindnessApplies?blindnessDecision:null,visionBasis:hasBlindness&&mayHear?visionBasis:null,
  sensoryBasis:hasDeafness?(certainHearing?'hearing':mayHear?sensoryBasis:'not-applicable'):null,source:base.source,hand:arm.source,loadEvidence,
  breakdown:[...(deafnessForcedCF?[{label:'Deafness: forced CF',value:0,source:'p184-no-d100'}]:[]),...(blindnessApplies?[{label:'Blindness: DEX/AGL in Skill Base',value:-40,source:'p184-gm-confirmed-possible'}]:[]),{label:'Fatigue',value:condition.fatigue.modifier,source:condition.fatigue.source},
   {label:'ENC',value:condition.enc.modifier,source:condition.enc.source},
   {label:'Zranění',value:trauma.injury.modifier,source:trauma.injury.source},
   {label:'Bulk',value:trauma.bulk.modifier,source:trauma.bulk.source},
   {label:'Zbroj / PER',value:trauma.perception.modifier,source:trauma.perception.source}],
  sourcePages:[60,61,62,112,117,118,169,170,176,...(hasBlindness||hasDeafness?[184]:[])],readOnly:true};
}
