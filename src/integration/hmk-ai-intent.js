/** HMK v1.2 AI semantic boundary: advice only, never dice, rules or money. */
import {OCCUPATIONS} from './hmk-creation-tables.js';
import {SKILL_DEFINITIONS} from './hmk-character-creation.js';
import {GENERATOR_TRAITS} from './hmk-generator-traits.js';
const PROFILES=['warrior','scholar','mystic','artisan','explorer','social','covenant','random'];
const FOLKS=['','Human','Kúzhai','Ænarin','Sinái','Sidhé','Malákta','Nâdi'];
const AGES=['','Young','Mature','Old'];
const OCCUPATIONS_SET=new Set(Object.keys(OCCUPATIONS));
const SKILLS_SET=new Set(SKILL_DEFINITIONS.map(s=>s.name));
const TRAITS_SET=new Set(GENERATOR_TRAITS);
const SIGNS=new Set(['patient','confident','calm','energetic','optimistic','hard-working','impulsive','idealistic','perfectionist','aggressive','imaginative','free-spirited','truthful','dedicated','curious','personable','persistent','demanding','restless','ambitious','contemplative','tenacious','obedient','rebellious','blunt','critical','creative','philosophical','lively']);
const text=(x,n=400)=>typeof x==='string'?x.slice(0,n):'';
const clean=(items,allowed,max=12)=>Array.isArray(items)?[...new Set(items.filter(x=>typeof x==='string'&&allowed.has(x)))].slice(0,max):[];
const objects=(arr)=>Array.isArray(arr)?arr:[];
export const HMK_AI_ALLOWED=Object.freeze({profiles:PROFILES,folks:FOLKS.filter(Boolean),ages:AGES.filter(Boolean),occupations:[...OCCUPATIONS_SET],skills:[...SKILLS_SET],traits:[...TRAITS_SET],signTraits:[...SIGNS]});
export function validateAIIntent(input,description='',selectedTraits=[]){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('AI nevrátila strukturovanou interpretaci');
 const plain=text(description,3000),traits=clean(selectedTraits,TRAITS_SET,122);
 const provided=input.evidence;
 if(!Array.isArray(provided))throw Error('AI musí doložit svoje závěry úryvky textu');
 const evidence=objects(provided).slice(0,30).filter(e=>e&&typeof e==='object'&&typeof e.quote==='string'&&e.quote.length>0&&plain.toLocaleLowerCase('cs').includes(e.quote.toLocaleLowerCase('cs'))).map(e=>({source:'ai',category:'meaning',key:text(e.meaning,100),expression:text(e.quote,160),negated:e.polarity==='negative',confidence:['low','medium','high'].includes(e.confidence)?e.confidence:'low'}));
 // Ignore entire AI payload that invents evidence from a nonempty text.
 if(plain.trim()&&provided.length&&!evidence.length)throw Error('AI nedoložila žádné tvrzení skutečným textem');
 const profile=PROFILES.includes(input.primary)?input.primary:'random';
 const occupationCandidates=clean(input.occupationCandidates,OCCUPATIONS_SET,8);
 const skillPreferences=clean(input.skillPreferences,SKILLS_SET,15);
 const sunsignTraitPreferences=clean(input.sunsignTraitPreferences,SIGNS,10);
 const inferredFolk=FOLKS.includes(input.folkPreference)?input.folkPreference:'';
 const age=AGES.includes(input.agePreference)?input.agePreference:'';
 const suggestedTraits=clean(input.narrativeTraits,TRAITS_SET,40);
 const morality=input.moralityPreference===null?null:Number(input.moralityPreference);
 const score=Object.fromEntries(PROFILES.map(x=>[x,x===profile?10:0]));
 return {
  engine:'server-ai-structured-v1',primary:profile,
  ranking:clean([profile,...objects(input.ranking)],new Set(PROFILES),8),score,
  confidence:['low','medium','high','unknown'].includes(input.confidence)?input.confidence:'unknown',
  occupationCandidates,skillPreferences,sunsignTraitPreferences,
  folkPreference:inferredFolk||null,agePreference:age||null,
  narrativeTraits:[...new Set([...traits,...suggestedTraits])].map(name=>({name,source:traits.includes(name)?'checkbox':'ai',group:'AI – narativní rys'})),
  traits,description:plain,attributeAspirations:{},
  moralityPreference:morality!==null&&Number.isInteger(morality)&&morality>=1&&morality<=20?morality:null,
  evidence,contradictions:objects(input.uncertainties).slice(0,12).filter(x=>typeof x==='string').map(x=>x.slice(0,160)),
  summary:text(input.summary,700),
  disclaimer:'Výklad provedl externí jazykový model. Jde o návrh s neověřenou přesností; všechny volby ověřuje původní engine HMK v1.2. Model nikdy neurčuje výsledky hodů.',
 };
}
export async function requestAIInterpretation({description='',traits=[]},{fetchFn=globalThis.fetch,signal}={}){
 const response=await fetchFn('/api/ai/interpret',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({description:String(description).slice(0,3000),traits})});
 let body;try{body=await response.json()}catch{throw Error('AI server nevrátil JSON');}
 if(!response.ok)throw Error(text(body?.error,200)||'AI server odmítl požadavek ('+response.status+')');
 if(body?.engine!=='openai-responses-server-v1')throw Error('Server nevrátil odpověď skutečného AI analyzátoru');
 return validateAIIntent(body.intent,description,traits);
}
