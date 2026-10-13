import {TALENT_NAMES} from './hmk-arcane-talent.js';
/** HMK v1.2 pp.47-48, Appendix II pp.424-425 and pantheons pp.321,343.
 * Pure definitions only. No storage and NO virtual dice. Source list is
 * deliberately finite: unknown languages/religions remain GM review. */
const FAMILIES={
 Anzélan:['Búqdin','Chogôri','Elánasi','Hérei','Neshái','Pèchalâri','Thónian','Tuvâran'],
 Azéri:['Býrian','Elbýthian','Karéjian','Nâsik Azéri','Ûrméch','Zâkimladal'],
 Járind:['Áltic','Emélan','Émhlèn','Járin','Uméni','Yaríli','Yârla'],
 Ketâric:['Anil Ketâri','Bésha','Dálken','Hácherian','Ketâri','Namârdi','Reksýni'],
 Mafáni:['Mafáni','Shénti'],Númec:['Dálani','Faláni','Kôrlic','Númer'],
 Phâric:['Chéler','Hârbáaler','Hârnic','Huriséan','Ivínian','Kántâl','Orbáaler','Pálithàner','Quârphic','Shôrka','Târkáiner','Tríerzi'],
 Reshénic:['Mengólan'],Elder:['Sináin','Kúzhan']
};
export const LANGUAGE_FAMILIES=Object.freeze(Object.fromEntries(Object.entries(FAMILIES).map(([k,v])=>[k,Object.freeze(v)])));
export const LANGUAGES=Object.freeze([...new Set(Object.values(FAMILIES).flat())].sort((a,b)=>a.localeCompare(b,'cs')));
export const SCRIPTS=Object.freeze(['Ánneri','Ayâran','Hekôri','Khrúni','Lakíse','Nerámic','Nùvesârl','Períka','Runic','Selénian','Shénya','Tankóno','Tiánta','Zérin'].sort((a,b)=>a.localeCompare(b,'cs')));
const WEST=['Ágrik','Haléa','Ilvîr','Laráni','Môrgath','Navéh','Peóni','Sárajìn','Sávè-K’nôr','Siém'];
const COVENANT=['Beóna','Edâryr','Elarána','Gáranik','Môrdar','Úlana','Vanáer','Ylvýr','Zârenor','Ziém'];
export const RITUAL_PANTHEONS=Object.freeze({'W. Venârian':Object.freeze(WEST),'Covenant':Object.freeze(COVENANT),'Sináin':Object.freeze(['Siém']),'Kúzhan':Object.freeze(['Sereniel'])});
export function religionChoices(character){
 const h=character?.hmk??{},folk=h.folk,p=String(h.pantheon??'');
 if(['Sinái','Sidhé'].includes(folk))return ['Siém'];
 if(folk==='Kúzhai'){
  // HMK p.43 explicitly allows a Kúzhai Siém priest's Runecraft training.
  // This is occupation-specific; ordinary Kúzhan native religion remains Sereniel.
  const priest=String(h.creation?.values?.occupation??character?.occupation??'');
  return priest==='Priest (Siém: Runecraft)'?['Sereniel','Siém']:['Sereniel'];
 }
 if(/Covenant/i.test(p))return [...COVENANT];
 if(/Venârian|Venarian/i.test(p))return [...WEST];
 return []; // Untranscribed pantheon: do not silently pick a deity.
}
export function languageChoices(character){
 const h=character?.hmk??{},v=h.creation?.values??{},jobs=[character?.occupation,v.occupation,v.familyVariantChoice,h.familyOccupation];
 const liturgical=[];
 if(jobs.some(n=>String(n??'').startsWith('Priest (Ágrik)')))liturgical.push('Surikal');
 if(jobs.some(n=>String(n??'').startsWith('Priest (Ilvîr:')))liturgical.push('Ivashi');
 if(jobs.some(n=>String(n??'').startsWith('Priest (Môrgath)')))liturgical.push('Ormauk');
 return [...new Set([h.nativeLanguage,...(h.regionalLanguages??[]),...LANGUAGES,...liturgical].filter(Boolean))];
}
export function instanceKey(group,name){return `${group} (${name})`;}
export function parseInstance(key){const match=/^(Language|Script|Ritual|Talent) \((.+)\)$/.exec(String(key));return match?{type:match[1],name:match[2]}:null;}
export function validInstance(character,key){const x=parseInstance(key);return !!x&&(x.type==='Language'?languageChoices(character).includes(x.name):x.type==='Script'?SCRIPTS.includes(x.name):x.type==='Talent'?TALENT_NAMES.includes(x.name)&&!!character?.hmk?.creation?.values?.arcaneTalentProof?.generated?.includes(x.name):religionChoices(character).includes(x.name));}
export function nativeLanguageDP(character){
 const h=character?.hmk??{};if(!h.nativeLanguage||!h.socialClass)return 0;
 if(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||['Priestly','Noble','Valpalen'].includes(h.socialClass)||['Scholar','Scribe'].includes(h.familyOccupation))return 5;
 if(h.socialClass==='Guilded'&&['Alchemist','Astrologer','Herald','Lexigrapher','Litigant','Mercantyler','Physician','Runemaster','Shèk-Pvâr'].includes(h.familyOccupation))return 5;
 return 4;
}
export function nativeRitualDP(character){
 const h=character?.hmk??{};
 if(['Malákta','Nâdi'].includes(h.folk))return 0;
 if(h.folk==='Kúzhai')return 2;
 if(['Sinái','Sidhé'].includes(h.folk))return 3;
 if(h.nativeLanguage==='Émhlèn')return 2;
 return 1;
}
export function foreignLanguageBoost(character,lang,totalDP){
 const h=character?.hmk??{};
 if(!totalDP||lang===h.nativeLanguage)return 0;
 const family=name=>Object.entries(FAMILIES).find(([,names])=>names.includes(name))?.[0];
 let same=family(lang)&&family(lang)===family(h.nativeLanguage)&&lang!=='Uméni'&&h.nativeLanguage!=='Uméni';
 if(lang==='Hârnic'&&family(h.nativeLanguage)==='Járind'&&h.nativeLanguage!=='Uméni'||h.nativeLanguage==='Hârnic'&&family(lang)==='Járind'&&lang!=='Uméni')same=true;
 if(lang==='Dálani'&&family(h.nativeLanguage)==='Númec'||h.nativeLanguage==='Dálani'&&family(lang)==='Númec')same=true;
 return Number(!!same)+Number((h.regionalLanguages??[]).includes(lang))+(lang==='Kántâl'?1:0);
}
/** HMK v1.2 pp.47-48: plural Languages/Scripts are divisible DP pools.
 * Printed singular Script (including 2nd/3rd Script) is NOT divisible.
 * This is a pure projection of the original stage grant, not a new DP budget.
 * GM syntax: "Járin=2; Shôrka=1"; names must exactly match Appendix II.
 */
export function parseOccupationDistribution(character,raw,type,printedDP){
 if(typeof raw!=='string'||!raw.trim())throw Error('Rozdělení '+type+': vyplňte alespoň jeden konkrétní Skill');
 if(!['Language','Script'].includes(type)||!Number.isSafeInteger(printedDP)||printedDP<1)throw Error('Rozdělení mimo tištěný Languages/Scripts příděl');
 const available=type==='Language'?languageChoices(character):SCRIPTS;
 const allocations={};let sum=0;
 for(const part of raw.split(';')){
  const match=/^\s*([^=;]+?)\s*=\s*(\d+)\s*$/.exec(part);
  if(!match)throw Error('Rozdělení '+type+': použijte přesný zápis Járin=2; Shôrka=1');
  const name=match[1].trim(),dp=Number(match[2]);
  if(!available.includes(name))throw Error('Neznámá konkrétní '+type+' Skill: '+name);
  if(Object.hasOwn(allocations,name))throw Error('Rozdělení '+type+': jazyk/písmo se nesmí opakovat');
  if(!Number.isSafeInteger(dp)||dp<1||dp>printedDP)throw Error('Rozdělení '+type+': DP musejí být kladná celá čísla');
  allocations[name]=dp;sum+=dp;
  if(sum>printedDP)throw Error('Rozdělení '+type+': překročen tištěný DP rozpočet');
 }
 if(sum!==printedDP)throw Error('Rozdělení '+type+': je nutné rozdělit přesně '+printedDP+' DP (aktuálně '+sum+')');
 return Object.fromEntries(Object.entries(allocations).map(([name,dp])=>[instanceKey(type,name),dp]));
}
export function occupationalSpecializations(character,values,occupationSkills,{family=false}={}){
 const suffix=family?'family':'occupation',script=values?.[suffix+'ScriptChoice'],language=values?.[suffix+'LanguageChoice'],ritual=values?.[suffix+'RitualChoice'];
 const multiLanguage=family?null:values?.occupationLanguageDistribution;
 const secondScript=family?values?.familySecondScriptChoice:values?.occupationSecondScriptChoice;
 const thirdScript=family?values?.familyThirdScriptChoice:values?.occupationThirdScriptChoice;
 const multiScript=family?null:values?.occupationScriptsDistribution;
 const output={};
 for(const [name,dp] of Object.entries(occupationSkills??{})){
  if(!family&&name==='Language'&&multiLanguage){
   if(language)throw Error('Vyberte buď jedno Language, nebo jeho vícečetné rozdělení (p.47)');
   Object.assign(output,parseOccupationDistribution(character,multiLanguage,'Language',dp));continue;
  }
  if(!family&&name==='Scripts'&&multiScript){
   if(script)throw Error('Zvolte jeden způsob přidělení Scripts DP');
   Object.assign(output,parseOccupationDistribution(character,multiScript,'Script',dp));continue;
  }
  // HMK p.47: each printed 2nd/3rd Script is one distinct writing system.
  if(name==='2nd Script'||name==='3rd Script'){
   const chosen=name==='2nd Script'?secondScript:thirdScript;
   const key=chosen?instanceKey('Script',chosen):name;
   output[key]=(output[key]??0)+dp;continue;
  }
  // Unlike plural Scripts, singular Script must remain one distinct script.
  const key=name==='Script'&&script?instanceKey('Script',script):name==='Scripts'&&script?instanceKey('Script',script):name==='Language'&&language?instanceKey('Language',language):name==='Native Language'&&character?.hmk?.nativeLanguage?instanceKey('Language',character.hmk.nativeLanguage):name==='Ritual'&&ritual?instanceKey('Ritual',ritual):name;
  output[key]=(output[key]??0)+dp;
 }
 return output;
}
