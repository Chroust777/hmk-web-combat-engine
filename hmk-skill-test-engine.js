/** HMK v1.2 pp.60–62. Pure read-side skill tests; Character Creation and Combat are NEVER mutated.
 * Existing src/rules/tests.js is the only numerical rule engine.
 */
import {SL,indexOf,effectiveMasteryLevel,successLevel,successValue,secondaryModifier,secondaryRoll,opposed} from '../rules/tests.js';
import {calculateSheetSkills} from './hmk-character-creation.js';
const ATTRIBUTE_LABELS={str:'Strength',end:'Endurance',dex:'Dexterity',agl:'Agility',per:'Perception',cml:'Comeliness',aur:'Aura',wil:'Will',rea:'Reasoning',cre:'Creativity',emp:'Empathy',elo:'Eloquence'};
export const SUCCESS_LEVEL_NAMES=Object.freeze(['CF','F','S','CS']);
const integer=(n,min,max,label)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' musí být celé číslo '+min+' až '+max);return n;};
export function availableMasteries(character){
 const h=character?.hmk??{};const result=[],seen=new Set();
 function add(kind,name,ml){if(!name||!Number.isSafeInteger(ml)||ml<1||ml>1000||seen.has(name))return;seen.add(name);result.push({kind,name,ml,index:indexOf(ml)});}
 if(h.creation){for(const s of calculateSheetSkills(character))if(s.ml!==null&&s.sm>0)add('skill',s.name,s.ml);}
 else for(const s of h.skills??[])add('skill',s.name,s.ml);
 for(const [key,label] of Object.entries(ATTRIBUTE_LABELS)){const x=h.attributes?.[key];if(Number.isSafeInteger(x)&&x>0)add('attribute',label,x*5);}
 return result.sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name,'cs'));
}
export function secondaryMastery(ml,{kind='modifier',roll=null,tnAdjust=0}={}){
 integer(ml,1,1000,'Sekundární ML');
 if(kind==='modifier')return {kind,index:indexOf(ml),modifier:secondaryModifier(ml)};
 if(kind!=='roll')throw Error('Neznámý typ sekundárního testu');
 integer(tnAdjust,-100,100,'Úprava TN');
 const tn=indexOf(ml)+tnAdjust;
 return {kind,index:indexOf(ml),tn,success:roll===null?null:secondaryRoll(integer(roll,1,10,'d10'),tn)};
}
/** Primary ML and Index are never replaced by EML (HMK p.62). */
export function resolveSkillTest({ml,roll,gmModifier=0,secondaryMLs=[],assistants=[],svExtra=0,exceptional=false}={}){
 integer(ml,1,1000,'Primární ML');integer(roll,1,100,'d100');integer(gmModifier,-1000,1000,'GM modifier');integer(svExtra,-50,50,'SV modifier');
 if(!Array.isArray(secondaryMLs)||secondaryMLs.length>6)throw Error('Nejvýše 6 sekundárních modifikátorů');
 if(!Array.isArray(assistants)||assistants.length>4)throw Error('Nejvýše 4 pomocníci v panelu');
 const secondary=secondaryMLs.map(m=>secondaryMastery(m));
 const assistantChecks=assistants.map(value=>{integer(value,1,1000,'Assistance ML');return {ml:value,index:indexOf(value),eligible:value*2>=ml};});
 const assistance=Math.min(10,assistantChecks.filter(x=>x.eligible).reduce((s,x)=>s+x.index,0));
 const rawEML=ml+gmModifier+secondary.reduce((s,x)=>s+x.modifier,0)+assistance;
 const eml=effectiveMasteryLevel(rawEML,{clamp:!exceptional});const sl=successLevel(roll,rawEML,{clamp:!exceptional});
 const sv=successValue({ml,sl,extra:svExtra});
 return {kind:'hmk-skill-test-v1',sourcePages:[60,61,62],ml,index:indexOf(ml),roll,gmModifier,secondary,assistantChecks,assistance,rawEML,eml,exceptional,sl,level:SUCCESS_LEVEL_NAMES[sl],sv,svExtra,svTier:successValueTier(sv),unopposedStars:sl===SL.S?1:sl===SL.CS?2:0,splitCF:sl===SL.CF?(roll%10===0?'CF0':'CF5'):null};
}
export function successValueTier(sv){if(!Number.isSafeInteger(sv))throw Error('SV není celé číslo');return sv<=0?{label:'Žádná použitelná hodnota',stars:0}:sv<=2?{label:'Omezená hodnota',stars:0}:sv<=4?{label:'Základní hodnota',stars:0}:sv>=9?{label:'Výjimečná hodnota',stars:5}:{label:'Nadstandardní hodnota',stars:sv-4};}
export function resolveOpposedTests(a,b,{breakTie=false,finalD10A=null,finalD10B=null}={}){
 if(!a||!b||!Number.isInteger(a.sl)||!Number.isInteger(b.sl))throw Error('Chybějí dva vyhodnocené Success Tests');
 if(a.sl<SL.S&&b.sl<SL.S)return {winner:null,stars:0,bothFailed:true}; // HMK p.61: no tiebreak of two failures.
 // Base engine uses actual primary ML for its final tie check; p.61.
 return opposed({a:{sl:a.sl,roll:a.roll,ml:a.ml},b:{sl:b.sl,roll:b.roll,ml:b.ml},tie:breakTie?'break':'none',finalD10A,finalD10B});
}
export function testSecondaryRoll({ml,roll,tnAdjust=0}={}){
 if(ml===null||ml===undefined||ml===0)return {kind:'secondary-roll',tn:0,success:false,reason:'Není osvojeno – sekundární hod neuspěl.'};
 const q=secondaryMastery(ml,{kind:'roll',roll,tnAdjust});return {...q,roll};
}

/** HMK p.169–170: a stunned Impaired Test loses one SL AFTER its d100 result.
 * Success Value uses the modified final SL but still uses PRIMARY ML (p.61–62). */
export function adjustSkillResultForTrauma(result,{slPenalty=0}={}){
 integer(slPenalty,0,1,'Shock SL penalty');
 if(!slPenalty)return result;
 if(!result||!Number.isSafeInteger(result.sl)||!Number.isSafeInteger(result.ml))throw Error('Chybí primární Success Test');
 const sl=Math.max(SL.CF,result.sl-slPenalty),sv=successValue({ml:result.ml,sl,extra:result.svExtra??0});
 return {...result,preTraumaSL:result.sl,preTraumaLevel:result.level,sl,level:SUCCESS_LEVEL_NAMES[sl],sv,svTier:successValueTier(sv),
  unopposedStars:sl===SL.S?1:sl===SL.CS?2:0,traumaSLPenalty:slPenalty};
}
