/** HMK v1.2 p.276 Fate Routine. Pure decision/validation; no persistence. */
import {successLevel} from '../rules/tests.js';
const LEVELS=['CF','F','S','CS'];
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export function fateEligibility93866(actor,{skillGroup='',usesAura=false,esoterica=false,randomRoll=false,auralShock=false}={}){
 if(actor?.kind!=='PC')return {ok:false,reason:'Fate Points mají pouze PC, nikoli NPC nebo zvířata.'};
 if(!int(actor?.hmk?.fatePoints,1,999))return {ok:false,reason:'Postava nemá žádné vlastní Fate Points.'};
 if(auralShock||Number(actor?.hmk?.arcane?.auralShockLevels||0)>0)return {ok:false,reason:'Aural Shock zakazuje Fate Roll.'};
 if(usesAura||esoterica||skillGroup==='Esoterica')return {ok:false,reason:'Aura/Esoterica testy nelze změnit Fate Rollem.'};
 if(randomRoll)return {ok:false,reason:'Náhodný hod (ZD, LD, Impact, Hazard) nelze změnit Fate Rollem.'};
 return {ok:true};
}
export function fateEML93866(actor,{skillGroup='',attributeTest=false,healingRoll=false,bonus=0,attunement=0}={}){
 if(!int(actor?.hmk?.fateML,1,300))throw Error('Chybí Fate ML odvozená z Aura postavy.');
 if(!int(bonus,-100,100)||!int(attunement,0,100))throw Error('Neověřený Fate bonus.');
 const mods=actor?.hmk?.creation?.values?.sunsignProof?.modifiers||[];
 const match=mods.find(x=>x.group===skillGroup);
 if(!attributeTest&&!healingRoll&&skillGroup&&!match)throw Error('Neznámý Sunsign Modifier skupiny '+skillGroup);
 const sunsign=attributeTest||healingRoll?0:(match?.value??0);
 return {baseML:actor.hmk.fateML,sunsign,bonus,attunement,eml:actor.hmk.fateML+sunsign+bonus+attunement};
}
export function fateRoll93866({originalLevel,eml,roll,csChoice=1}={}){
 if(!LEVELS.includes(originalLevel)||!int(eml,0,400)||!int(roll,1,100)||![1,2].includes(csChoice))throw Error('Neplatný původní SL, EML, hod nebo CS volba.');
 // HMK standard level: doubles at/under EML are CS; 5/0-ending over EML are CF.
 // Use the original HMK p.60 convention in the client rule engine.
 const level=LEVELS[successLevel(roll,eml)];
 const increase=level==='S'?1:level==='CS'?csChoice:0;
 const cost=level==='CF'||level==='S'||(level==='CS'&&csChoice===2)?1:0;
 const baseIndex=LEVELS.indexOf(originalLevel),newIndex=Math.min(3,baseIndex+increase);
 return {format:'hmk-fate-proof-v93.866',originalLevel,roll,eml,level,csChoice:level==='CS'?csChoice:null,
  increase,cost,afterLevel:LEVELS[newIndex],bonusStars:Math.max(0,baseIndex+increase-3),sourcePage:276};
}
export function fateSkillResult93866(original,fate){
 if(!original||!fate||fate.originalLevel!==original.level||!Number.isInteger(original.sl))throw Error('Fate neodpovídá původnímu testu.');
 const victorySL=(Number.isInteger(original.victorySL)?original.victorySL:original.sl)+fate.increase;
 const sl=Math.min(3,Math.max(0,victorySL)),level=LEVELS[sl];
 const sv=Number.isInteger(original.index)?original.index+[-2,-1,0,1][sl]+(original.svExtra||0):original.sv;
 const stars=Number.isInteger(sv)?Math.max(0,Math.min(5,sv-4)):0;
 return {...original,preFateLevel:original.level,preFateSL:original.sl,
  sl,level,victorySL,victoryLevel:victorySL>3?'CS+'+(victorySL-3):level,
  sv,svTier:Number.isInteger(sv)?{label:sv<=0?'Žádná použitelná hodnota':sv<=2?'Omezená hodnota':sv<=4?'Základní hodnota':sv>=9?'Výjimečná hodnota':'Nadstandardní hodnota',stars}:original.svTier,
  unopposedStars:Math.max(0,victorySL-1),splitCF:level==='CF'?original.splitCF:null,
  fateProof:fate,fatedTiebreak:fate.increase>0};
}
