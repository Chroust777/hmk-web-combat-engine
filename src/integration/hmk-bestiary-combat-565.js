/** Exact recorded physical dice and printed MLs only. This is a *preflight*
 * comparison using shared HMK Skill Test mathematics, NOT a combat outcome
 * (the latter must use the Melee/Missile/Impact/Injury sequences). */
import {SL,successLevel,effectiveMasteryLevel} from '../rules/tests.js';
const labels=['CF','F','S','CS'];
const number=(n,low,high,field)=>{if(!Number.isSafeInteger(n)||n<low||n>high)throw Error(`${field}: neplatná celočíselná hodnota`);return n;};
export function creatureCombatSheet565(proof){
 const p=proof?.profile;if(!p)return null;
 const attacks=(p.weapons||[]).filter(w=>Number.isInteger(w.attack)).map(w=>({name:w.name,attack:w.attack,defence:w.defence??null,impact:w.impact??null,special:w.special??''}));
 return {encounterId:proof.id,ownerAnimalId:proof.ownerAnimalId??null,name:proof.name,templateId:proof.templateId,
  attributes:structuredClone(p.attributes||{}),skills:structuredClone(p.skills||{}),
  move:p.move??null,fly:p.fly??null,bodyTable:p.combat?.bodyTable??null,
  armour:p.combat?.av?structuredClone(p.combat.av):null,dodge:p.combat?.dodge??null,
  initiative:p.skills?.initiative??null,shock:p.combat?.shock??p.skills?.shock??null,
  attacks,combatReady:false};
}
export function previewCreatureSkillRoll565({actor,kind='attack',attackIndex=0,roll,gmModifier=0}={}){
 const sheet=actor?.attacks?actor:creatureCombatSheet565(actor);
 if(!sheet)throw Error('Chybí konkrétní tvor encounteru.');
 let ml=null,ability='';
 if(kind==='attack'){
  number(attackIndex,0,Math.max(0,sheet.attacks.length-1),'Útok');
  const a=sheet.attacks[attackIndex];if(!a)throw Error('Tvor nemá doložený ML přirozeného útoku.');
  ml=a.attack;ability=a.name;
 }else if(kind==='dodge'){ml=sheet.dodge;ability='Dodge';}
 else if(kind==='initiative'){ml=sheet.initiative;ability='Initiative';}
 else if(kind==='shock'){ml=sheet.shock;ability='Shock';}
 else throw Error('Nepodporovaná schopnost.');
 number(ml,1,1000,'ML');number(roll,1,100,'d100');number(gmModifier,-200,200,'GM modifier');
 const eml=effectiveMasteryLevel(ml+gmModifier),sl=successLevel(roll,eml);
 return {format:'hmk-bestiary-skill-preview-565',creatureId:sheet.encounterId,name:sheet.name,
  ability,ml,gmModifier,eml,roll,sl:labels[sl],success:sl>=SL.S,
  attackImpact:kind==='attack'?sheet.attacks[attackIndex].impact:null,
  special:kind==='attack'?sheet.attacks[attackIndex].special:null,
  persists:false,injuryApplied:false,
  limitation:'Pouze fyzický d100 proti tištěnému ML; bojový výsledek vyžaduje odpovídající Combat sequence, obranu, Impact, zásahovou tabulku a následné hody.'};
}

import {resolveMeleeOutcome,DEFENCE} from '../rules/melee.js';
/** Read-only genuine Melee outcome core on verified creature weapon/dodge ML.
 * This does NOT perform contact gating, all special traits, impact, injury,
 * combat chronology or persistent actor mutation. */
export function previewCreatureMelee565({attacker,defender,attackD100,defenceD100=null,
 defence='dodge',attackerModifier=0,defenderModifier=0,attackIndex=0,
 finalD10Attacker=null,finalD10Defender=null}={}){
 const a=attacker?.attacks?attacker:creatureCombatSheet565(attacker);
 const b=defender?.attacks?defender:creatureCombatSheet565(defender);
 if(!a||!b||a.encounterId===b.encounterId)throw Error('Vyber dva různé doložené účastníky.');
 const strike=previewCreatureSkillRoll565({actor:a,kind:'attack',attackIndex,roll:attackD100,gmModifier:attackerModifier});
 const options=['dodge','ignore','block','counterstrike'];if(!options.includes(defence))throw Error('Neznámá obrana.');
 let def=null,defML=null,defResult=null;
 if(defence!=='ignore'){
  defML=defence==='dodge'?b.dodge:b.attacks[0]?.defence;
  if(!Number.isSafeInteger(defML))throw Error('Oponent nemá doložené ML vybrané obrany.');
  number(defenceD100,1,100,'d100 obrany');number(defenderModifier,-200,200,'Modifikátor obrany');
  const eml=effectiveMasteryLevel(defML+defenderModifier);
  const sl=successLevel(defenceD100,eml);
  defResult={sl,roll:defenceD100,ml:defML,eml,level:labels[sl]};
  def=defResult;
 }
 const outcome=resolveMeleeOutcome({attacker:{sl:SL[strike.sl],roll:attackD100,ml:strike.ml},defender:def,defence,
  finalD10Attacker,finalD10Defender});
 return {format:'hmk-bestiary-melee-preview-565',attacker:a.name,defender:b.name,
  attackerProof:strike,defenderProof:defResult,outcome,
  weaponImpact:strike.attackImpact,weaponSpecial:strike.special,
  pending:outcome.needsFinalD10?'Rozstřel · skutečné d10 obou účastníků':null,
  readOnly:true,combatStateWritten:false,injuryWritten:false,
  requires:['Kontrola dosahu, zvoleného způsobu útoku, dalších modifikátorů a přirozených zvláštních schopností','Impact a ochrana na konkrétní lokalitě','Anatomie těla a Injury Sequence','Návaznost na perzistentní Shock/Trauma a kalendář']};
}
