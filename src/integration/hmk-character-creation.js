import {parentPriestRitual,allowedParentPriestVariants} from './hmk-parent-priest-family.js';
import {parentShamanRitual,verifiedParentShamanVariants,verifyParentShamanChoice} from './hmk-parent-shaman-family.js';
import {gmLanguageProof} from './hmk-gm-bonus-language.js';
import {veteranRoundCount,veteranRoundsProof} from './hmk-veteran-rounds.js';
import {arcaneTalentFromPhysical,parentInvokerTalentFromPhysical} from './hmk-arcane-talent.js';
import {creationChoicesFromPhysicalDice,mergeCreationChoices} from './hmk-creation-roll-choices.js';
import {eligibleAges,eligibleRealms,eligibleSocietiesForRealm,eligibleParentClasses,eligibleFamilyOccupationNames,eligibleOccupations,eligibleSkills,eligibleBackgrounds} from './hmk-creation-eligibility.js';
import {parentOccupationFromRoll,parentTitleFromBackground} from './hmk-parent-occupation-tables.js';
import {SCRIPTS,canonicalLanguage,languageChoices,religionChoices,validInstance,parseInstance,instanceKey,nativeLanguageDP,nativeRitualDP,foreignLanguageBoost,occupationalSpecializations,parseOccupationDistribution,nativeRitualGrants} from './hmk-skill-instances.js';
import {creationPsycheCount,creationPsycheFromPhysical} from './hmk-creation-psyche.js';
import {divineAspectFromChoice} from './hmk-creation-divine-aspects.js';
import {validateStartingSpiritPowers,validateShamanTradition} from './hmk-creation-spirit-powers.js';
import {validateStartingElixirs} from './hmk-creation-starting-elixirs.js';
import {validateStartingPvarSpells} from './hmk-creation-starting-pvar.js';
import {VERIFIED_WEST_DOCTRINES,VERIFIED_COVENANT_DOCTRINES,moralityOrthodoxyPenalty,validateStartingReligion} from './hmk-creation-doctrine.js';
import {isTribalEmhle,covenantPostOccupationGrants} from './hmk-creation-special-skill-grants.js';
import {SOCIETIES,classFromRoll,VERIFIED_REGIONS,regionAllowedForFolk,realmFromRegionRoll,realmFromRegionSelection,OCCUPATIONS,occupationVariantNames,priestReligionOf,isArcaneOccupationEligible,CHIEFTAIN_VARIANTS,chieftainVariantForSubsistence,familyOccupationProfile,familySkillCap,validateFamilySkillAllocation,OCCUPATION_PAGES,availableBackgroundSkills,tribalFreeOccupation,standingFromWealth,printedParentWealthDie,occupationWealthDie,evaluateWealthDice,wealthDiceCounts,ritualFollowerFromML,folkSkillsFromDice,graceFromDie,arcaneStartingResearch,REGION_D1000,ELDER_FOLK_REGIONS,regionFromD1000} from './hmk-creation-tables.js';
/** HMK v1.2 Character Generation, PDF pp. 19–56, Skill System pp. 45–49.
 * The wizard is a persistent guided draft. Tables not yet transcribed in full
 * are explicitly marked GM-verified rather than silently invented.
 * No random numbers and no storage write in this module.
 */
export const CHARACTER_STEPS=Object.freeze([
 ['Folk',20],['Age',21],['Sunsign',22],['Sunsign Traits',23],['Birthplace',24],
 ['Parent Social Class',26],['Parent Occupation',26],['Background',33],['Estrangement',34],
 ['Characteristics',38],['Occupation',41],['Skills',45],['Standing',51],['The Mysteries',53]
]);
export const SKILL_STAGES=Object.freeze(['Folk Skills','Arcane Talent Skills','Family Skills','Background Skills','Occupation Skills','Optional Skills','Veteran Skills','Sunsign Skills']);
export const FOLKS=Object.freeze(['Human','Kúzhai','Ænarin','Sinái','Sidhé','Malákta','Nâdi']);
export const AGE_GROUPS=Object.freeze(['Young','Mature','Old']);
export const SIGNS=Object.freeze(['Ùlándus','Arálius','Fenéri','Áhnù','Angberélius','Nadái','Hîrin','Táræl','Tai','Skôrus','Masâra','Ládo']);
export const MONTHS=Object.freeze(['Núzyæl','Peónu','Kelén','Nólus','Laránè','Ágrazhâr','Azúra','Halánè','Savôr','Ilvín','Návek','Morgát']);
const SIGN_STARTS=[4,4,3,4,5,7,6,5,4,3,3,2];
const SIGN_MODS=[[15,5,-5,-15,-5,5],[10,10,0,-10,-10,0],[5,15,5,-5,-15,-5],[0,10,10,0,-10,-10],[-5,5,15,5,-5,-15],[-10,0,10,10,0,-10],[-15,-5,5,15,5,-5],[-10,-10,0,10,10,0],[-5,-15,-5,5,15,5],[0,-10,-10,0,10,10],[5,-5,-15,-5,5,15],[10,0,-10,-10,0,10]];
export const SKILL_GROUPS=Object.freeze(['Nature','Craft','Combat','Physical','Lore','Social']);
export const SIGN_DP=Object.freeze([[3,1,0,0,0,1],[2,2,0,0,0,0],[1,3,1,0,0,0],[0,2,2,0,0,0],[0,1,3,1,0,0],[0,0,2,2,0,0],[0,0,1,3,1,0],[0,0,0,2,2,0],[0,0,0,1,3,1],[0,0,0,0,2,2],[1,0,0,0,1,3],[2,0,0,0,0,2]]);
export const SIGN_TRAITS=Object.freeze({
 'Ùlándus':['patient','confident','calm','aloof','inflexible','stubborn'],
 'Arálius':['energetic','optimistic','enthusiastic','impulsive','demanding','volatile'],
 'Fenéri':['hard-working','productive','restless','impatient','argumentative','obsessive'],
 'Áhnù':['ambitious','experimental','idealistic','perfectionist','critical','quick-tempered'],
 'Angberélius':['lively','impassioned','persistent','blunt','aggressive','destructive'],
 'Nadái':['exuberant','imaginative','spontaneous','unfocused','evasive','wasteful'],
 'Hîrin':['free-spirited','instinctive','opportunistic','rebellious','inscrutable','merciless'],
 'Táræl':['dedicated','contemplative','indirect','enigmatic','indecisive','obedient'],
 'Tai':['philosophical','truthful','restrained','unemotional','inconsiderate','naive'],
 'Skôrus':['personable','curious','inspiring','avid','intrusive','dictatorial'],
 'Masâra':['affectionate','tenacious','emotional','temperamental','resentful','overbearing'],
 'Ládo':['composed','tolerant','adaptive','yielding','indulgent','nonchalant']
});
export function feudalParentClass(die,sides=100){
 if(![20,100].includes(sides))throw Error('Feudal table p.26: d100 nebo d20');
 const d=normalizeRoll(die,sides);
 if(sides===100)return d<=65?'Unfree':d<=80?'Free':d<=90?'Guilded':d<=95?'Military':d===96?'Priestly':'Noble';
 return d<=9?'Free':d<=14?'Guilded':d<=17?'Military':d===18?'Priestly':'Noble';
}
/** In a City-State (p.28), GM rolls a second d10 for tens and keeps the lower
 * tens digit. d10 face 10 is zero; 00 remains 100 on the d100 convention. */
export function cityStateBackgroundDie(die,secondTens){
 const original=normalizeRoll(die,100),tens=normalizeRoll(secondTens,10)%10;
 const primary=original===100?0:Math.floor(original/10),units=original%10;
 const result=Math.min(primary,tens)*10+units;
 return {original,secondTens:Number(secondTens),effectiveRoll:result||100};
}
export function backgroundFromRoll(die,urbanChance,{unsettledTribal=false,society=null,cityStateTens=null,folk='Human'}={}){
 if(unsettledTribal||['Malákta','Nâdi'].includes(folk))return 'Wilderness'; // Appendix I p.423: all occupations
 const d=society==='City-State'?cityStateBackgroundDie(die,cityStateTens).effectiveRoll:normalizeRoll(die,100),u=Number(urbanChance);
 if(!Number.isInteger(u)||u<0||u>100)throw Error('Urban chance musí být 0–100 podle Parent Occupation');
 const unusual=d%5===0;
 return d<=u?(['Kúzhai'].includes(folk)?'City':['Sinái','Sidhé'].includes(folk)?'Urban':unusual?'City':'Urban'):(u<=10&&unusual?'Wilderness':'Rural');
}
const PHYSICAL=['str','end','dex','agl','per','cml'],MENTAL=['aur','wil','rea','cre','emp','elo'];
export const ATTRIBUTES=Object.freeze([...PHYSICAL,...MENTAL]);
const PHYS_MOD={Human:[0,0,0,0,0,0], 'Ænarin':[0,0,1,1,2,1],Kúzhai:[2,2,1,0,1,0],Sinái:[0,0,2,2,3,2],Sidhé:[0,0,3,3,5,4],Malákta:[2,3,4,6,2,0],Nâdi:[0,0,2,0,0,-2]};
const MENT_MOD={Human:[0,0,0,0,0,0], 'Ænarin':[2,1,0,1,3,1],Kúzhai:[-2,3,0,0,-2,0],Sinái:[4,2,0,2,2,3],Sidhé:[6,2,0,3,1,4],Malákta:[-2,3,-1,-2,-2,0],Nâdi:[0,0,0,1,0,0]};
export function normalizeRoll(value,sides){const n=Number(value);if(!/^\d+$/.test(String(value))||n<1||n>sides)throw Error(`Fyzický d${sides} musí být celé číslo 1–${sides}`);return n;}
export function physicalDiceRequirement(age,kind='PC',mental=false){
 if(mental)return kind==='NPC'?{count:3,drop:0}:{count:4,drop:1};
 const pc={Young:[5,2],Mature:[4,1],Old:[3,0]}[age];
 const npc={Young:[4,1],Mature:[3,0],Old:[4,1]}[age];
 if(!pc)throw Error('Neznámá Age Group');
 const [count,drop]=kind==='NPC'?npc:pc;return {count,drop,dropHighest:kind==='NPC'&&age==='Old'};
}
export function evaluateAttributeDice({name,ageGroup,folk='Human',kind='PC',dice}){
 const idx=ATTRIBUTES.indexOf(name);if(idx<0)throw Error('Neznámý atribut');
 const req=physicalDiceRequirement(ageGroup,kind,idx>=6);
 if(!Array.isArray(dice)||dice.length!==req.count)throw Error('Nesprávný počet fyzických hodů d6');
 const rolls=dice.map(x=>normalizeRoll(x,6));
 const ranked=rolls.slice().sort((a,b)=>req.dropHighest?b-a:a-b);
 const kept=ranked.slice(req.drop); const subtotal=kept.reduce((a,b)=>a+b,0);
 const adultMinimum=Math.max(5,subtotal),modifier=(idx<6?PHYS_MOD:MENT_MOD)[folk]?.[idx%6];
 if(!Number.isInteger(modifier))throw Error('Nepodporovaný Folk modifier');
 return {attribute:name,rolls,kept,subtotal,adultMinimum,folkModifier:modifier,score:adultMinimum+modifier,sourcePage:38};
}
/** Voice is a separate physical trait for Singing, HMK p.49 (not a 13th core Attribute). */
export function voiceDiceRequirement(folk='Human'){
 return folk==='Sinái'?{count:5,drop:2}:{count:4,drop:1};
}
export function evaluateVoiceDice({folk='Human',dice}){
 const req=voiceDiceRequirement(folk);
 if(!Array.isArray(dice)||dice.length!==req.count)throw Error('Voice: nesprávný počet fyzických hodů d6 (p.49)');
 const rolls=dice.map(x=>normalizeRoll(x,6));
 const kept=rolls.slice().sort((a,b)=>a-b).slice(req.drop);
 return {attribute:'voi',rolls,kept,score:kept.reduce((a,b)=>a+b,0),sourcePage:49};
}
export function signFromBirthday(month,day){
 const m=normalizeRoll(month,12),d=normalizeRoll(day,30);const today=(m-1)*30+d;
 const boundaries=SIGN_STARTS.map((n,i)=>i*30+n);
 let primary=11;for(let i=0;i<12;i++)if(today>=boundaries[i])primary=i;
 let near=null;
 // First and last two days of each sign are cusp days (HMK p.22).
 const start=boundaries[primary],next=primary===11?boundaries[0]+360:boundaries[primary+1];
 const normalizedToday=primary===11&&today<start?today+360:today;
 if(normalizedToday-start<=1)near=(primary+11)%12;
 else if(next-normalizedToday<=2)near=(primary+1)%12;
 return {primary:SIGNS[primary],secondary:near===null?null:SIGNS[near],primaryIndex:primary,secondaryIndex:near,
  month:MONTHS[m-1],day:d,modifiers:SKILL_GROUPS.map((group,i)=>({group,value:near===null?SIGN_MODS[primary][i]:Math.max(SIGN_MODS[primary][i],SIGN_MODS[near][i])})),
  dp:SKILL_GROUPS.map((group,i)=>({group,value:near===null?SIGN_DP[primary][i]:Math.max(SIGN_DP[primary][i],SIGN_DP[near][i])}))};
}
// Exact base Skill List, HMK p.46. Subskills Shock / Dodge are derived from their parents;
// bracketed variants Language/Ritual/Script/Talent must be specialised later.
const DEFINITIONS=[
 ['Lore','Brewing','per','rea',0],['Lore','Cookery','per','rea',2],['Lore','Embalming','rea','per',0],['Lore','Engineering','rea','cre',0],['Lore','Folklore','rea','wil',1],['Lore','Heraldry','rea','wil',0],['Lore','Law','rea','wil',0],['Lore','Mathematics','rea','cre',0],['Lore','Mercantilism','rea','per',0],['Lore','Perfumery','per','rea',0],['Lore','Physician','rea','per',1],['Lore','Ritual','wil','rea',0],['Lore','Script','rea','per',0],['Lore','Shipwright','rea','cre',0],
 ['Social','Charm','cml','emp',3],['Social','Command','wil','elo',2],['Social','Discourse','rea','elo',2],['Social','Guile','emp','cre',3],['Social','Intrigue','emp','rea',3],['Social','Language','elo','rea',0],['Social','Singing','voi','cre',3],['Social','Theatrics','cre','elo',1],
 ['Nature','Agriculture','per','wil',0],['Nature','Animalcraft','emp','wil',0],['Nature','Fishing','per','wil',0],['Nature','Herblore','per','rea',0],['Nature','Mineralogy','per','rea',0],['Nature','Piloting','rea','per',0],['Nature','Seamanship','wil','per',0],['Nature','Survival','wil','rea',1],['Nature','Timbercraft','per','rea',0],['Nature','Tracking','rea','per',0],
 ['Physical','Acrobatics','agl','end',0],['Physical','Awareness','per','wil',3],['Physical','Climbing','agl','dex',3],['Physical','Dancing','agl','cre',2],['Physical','Jumping','agl','str',3],['Physical','Legerdemain','dex','per',0],['Physical','Riding','emp','agl',1],['Physical','Stealth','agl','wil',3],['Physical','Swimming','agl','end',1],
 ['Combat','Archery','per','dex',1],['Combat','Initiative','wil','rea',3],['Combat','Melee','dex','agl',2],['Combat','Slings','dex','per',0],['Combat','Throwing','dex','per',2],
 ['Craft','Ceramics','dex','per',0],['Craft','Drawing','dex','cre',1],['Craft','Fletching','dex','per',0],['Craft','Glassworking','per','dex',0],['Craft','Hideworking','dex','per',0],['Craft','Jewelcraft','per','dex',0],['Craft','Lockcraft','dex','per',0],['Craft','Masonry','dex','str',0],['Craft','Metalcraft','dex','str',0],['Craft','Milling','per','str',0],['Craft','Musician','per','cre',0],['Craft','Textilecraft','dex','per',0],['Craft','Weaponcraft','dex','str',0],['Craft','Woodworking','dex','str',0],
 ['Esoterica','Alchemy','aur','per',0],['Esoterica','Astrology','aur','emp',0],['Esoterica','Pvârism','aur','rea',0],['Esoterica','Runecraft','aur','emp',0],['Esoterica','Summoning','aur','elo',0],['Esoterica','Talent','aur','wil',0],['Esoterica','Spirit','aur','wil',3],['Esoterica','Tarotry','aur','emp',0],['Esoterica','Trance','aur','cre',0]
];
export const SKILL_DEFINITIONS=Object.freeze(DEFINITIONS.map(([group,name,primary,secondary,baseSM])=>Object.freeze({group,name,primary,secondary,baseSM,sourcePage:46})));
/** HMK v1.2 p.57, optional three physical Perception attributes.
 * The original PER roll is never destroyed. These are independent GM dice
 * using the same physical roll method and Folk Perception modifier as PER.
 * The page 57 SB replacement, not a rule invented from similar names.
 */
export const PERCEPTION_MODES=Object.freeze(['standard','subattributes']);
export const PERCEPTION_SENSES=Object.freeze(['eye','hrg','sml']);
const SUBATTRIBUTE_REPLACEMENTS=Object.freeze({
 'Brewing':['sml','rea'],'Cookery':['sml','rea'],'Embalming':['rea','sml'],
 'Mercantilism':['rea','eye'],'Perfumery':['sml','rea'],'Physician':['rea','eye'],'Script':['rea','eye'],
 'Agriculture':['eye','wil'],'Fishing':['eye','wil'],'Herblore':['sml','rea'],
 'Mineralogy':['eye','rea'],'Piloting':['rea','eye'],'Seamanship':['wil','eye'],
 'Timbercraft':['eye','rea'],'Tracking':['rea','eye'],
 'Legerdemain':['dex','eye'],'Archery':['eye','dex'],'Slings':['dex','eye'],
 'Throwing':['dex','eye'],'Dodge':['agl','eye'],
 'Ceramics':['dex','eye'],'Fletching':['dex','eye'],'Glassworking':['eye','dex'],
 'Hideworking':['dex','eye'],'Jewelcraft':['eye','dex'],'Lockcraft':['dex','eye'],
 'Milling':['eye','str'],'Musician':['hrg','cre'],'Textilecraft':['dex','eye'],
 'Alchemy':['aur','sml']
});
export function perceptionMode(character){return character?.hmk?.creation?.values?.perceptionMode==='subattributes'?'subattributes':'standard';}
export function perceptionDefinition(character,definition){
 if(perceptionMode(character)!=='subattributes')return definition;
 if(definition.name==='Awareness')return {...definition,primary:null,secondary:null};
 const key=parseInstance(definition.name)?.type??definition.name;
 const parts=SUBATTRIBUTE_REPLACEMENTS[key];
 return parts?{...definition,primary:parts[0],secondary:parts[1]}:definition;
}
const SENSE_MODIFIERS=Object.freeze({
 Human:[0,0,0], 'Ænarin':[2,1,1], Kúzhai:[0,2,0],
 Malákta:[3,0,2], Nâdi:[-2,-2,2], Sidhé:[6,4,4], Sinái:[4,3,3]
});
export function evaluatePerceptionDice({name,ageGroup,folk,kind,dice}){
 if(!PERCEPTION_SENSES.includes(name))throw Error('Neznámý smyslový atribut HMK p.57');
 const proof=evaluateAttributeDice({name:'per',ageGroup,folk,kind,dice});
 // P.38 explicitly replaces the common PER modifier with distinct EYE, HRG,
 // SML modifiers when p.57 optional separate perception scores are rolled.
 const index=PERCEPTION_SENSES.indexOf(name),folkModifier=SENSE_MODIFIERS[folk]?.[index];
 if(!Number.isInteger(folkModifier))throw Error('Nepodporovaný Elder Folk sense modifier');
 return {...proof,attribute:name,folkModifier,score:proof.adultMinimum+folkModifier};
}
/** One atomic authoritative character mutation. Optional sense rolls are REAL
 * GM physical dice, not copies of PER. Called through the normal CAS writer. */
export function setPerceptionMode(character,{mode,dice={}}={}){
 if(!PERCEPTION_MODES.includes(mode))throw Error('HMK p.57: neplatný Perception režim');
 const out=structuredClone(character),h=out.hmk??{},c=h.creation;
 if(!c||!h.attributes||!c.attributeProof?.per)throw Error('Nejprve dokončete fyzický PER atribut v Character Creation');
 const before=perceptionMode(out);
 if(before===mode&&Object.keys(dice).length===0)return out;
 const active=mode==='subattributes';
 if(!c.perceptionProof)c.perceptionProof={};
 const ageGroup=h.ageGroup,folk=h.folk,kind=out.kind||'PC';
 if(active){
  for(const name of PERCEPTION_SENSES){
   const supplied=dice[name];
   if(supplied!==undefined&&supplied!==null&&supplied!==''){
    const proof=evaluatePerceptionDice({name,ageGroup,folk,kind,dice:supplied});
    c.perceptionProof[name]={...proof,folk,ageGroup,kind};
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'perception-subattribute-dice',name,rolls:[...proof.rolls],score:proof.score,folk,ageGroup,kind});
   }
   const p=c.perceptionProof[name];
   if(!p||p.folk!==folk||p.ageGroup!==ageGroup||p.kind!==kind)
    throw Error('HMK p.57: zadejte vlastní fyzické hody d6 pro '+name.toUpperCase());
   const evaluated=evaluatePerceptionDice({name,folk,ageGroup,kind,dice:p.rolls});
   if(p.score!==evaluated.score)throw Error('Fyzický důkaz '+name.toUpperCase()+' nesouhlasí');
   h.attributes[name]=p.score;
  }
 }else{
  for(const name of PERCEPTION_SENSES)delete h.attributes[name];
 }
 c.values.perceptionMode=mode;
 c.auditEvents.push({sequence:c.auditEvents.length+1,type:'perception-mode-choice',mode,previous:before,sourcePage:57});
 h.creation=c;out.hmk=h;
 return out;
}
export function skillBase(primary,secondary){
 if(!Number.isInteger(primary)||!Number.isInteger(secondary))return null;
 const average=(primary+secondary)/2;
 return primary>secondary?Math.ceil(average):Math.floor(average);
}
export function skillDefinition(character,name){
 const ordinary=SKILL_DEFINITIONS.find(x=>x.name===name);
 if(ordinary)return ordinary;
 if(name==='2nd Script'||name==='3rd Script'||name==='Scripts')return {...SKILL_DEFINITIONS.find(x=>x.name==='Script'),name};
 if(name==='Native Language'||name==='Languages')return {...SKILL_DEFINITIONS.find(x=>x.name==='Language'),name};
 const x=parseInstance(name);
 if(!x||!validInstance(character,name))return null;
 const base=SKILL_DEFINITIONS.find(d=>d.name===x.type);
 return {...base,name,specialization:x.name,sourcePage:x.type==='Ritual'?47:48};
}
export function calculateSkill(definition,attributes,allocations={}){
 const a=attributes?.[definition.primary],b=attributes?.[definition.secondary];
 const sb=skillBase(a,b);const sources=SKILL_STAGES.map(stage=>({stage,dp:allocations[stage]?.[definition.name]??0}));
 const native=allocations['Native Proficiencies']?.[definition.name]??0;
 if(native)sources.push({stage:'Native Language / Religion',dp:native});
 for(const stage of ['Émhlè Family Ritual','Covenant post-Occupation SM']){
  const dp=allocations[stage]?.[definition.name]??0;if(dp)sources.push({stage,dp});
 }
 const gmBonus=allocations['GM Bonus Languages']?.[definition.name]??0;
 if(gmBonus)sources.push({stage:'GM Bonus Languages',dp:gmBonus});
 const totalDP=sources.reduce((n,x)=>n+x.dp,0);
 if(sources.some(x=>!Number.isSafeInteger(x.dp)||x.dp<0||x.dp>100))throw Error('Neplatná alokace Skill DP');
 const bonusSM=definition.foreignBoost??0;const sm=Math.min(5,definition.baseSM+totalDP+bonusSM);let boosts=Math.max(0,definition.baseSM+totalDP+bonusSM-5);
 let ml=sb===null?null:sb*sm;
 const increase=[];while(boosts>0&&ml!==null){const boost=ml<=39?10:ml<=44?9:ml<=49?8:ml<=59?7:ml<=69?6:ml<=79?5:ml<=99?4:3;const applied=Math.min(boost,Math.max(0,sb*7-ml));increase.push({from:ml,boost:applied});ml+=applied;boosts--;}
 return {...definition,sb,sm,ml,bonusSM,primaryValue:a??null,secondaryValue:b??null,baseML:sb===null?null:sb*definition.baseSM,dp:sources,totalDP,boosts:increase,mlCap:sb===null?null:sb*7};
}
export function calculateSheetSkills(character){
 const h=character?.hmk??{},creation=h.creation??{};const attrs=h.attributes??{};
 // Historic unspecialised allocations stay intact and remain GM-review
 // until a real identity is selected. New records use ONE derived projection,
 // not parallel counters or a second write path.
 const original=creation.skillDP??{},v=creation.values??{},allocations={};
 for(const [stage,points] of Object.entries(original)){
  if(!SKILL_STAGES.includes(stage))continue;
  const spec=stage==='Occupation Skills'?occupationalSpecializations(character,v,points):stage==='Family Skills'?occupationalSpecializations(character,v,points,{family:true}):{...points};
  if(stage==='Background Skills'&&h.background==='City'&&points.Language>0&&v.backgroundCityLanguageDistribution){
   const split=parseOccupationDistribution(character,v.backgroundCityLanguageDistribution,'Language',3*points.Language);
   // Only the original 1 or 2 City-background DP are *spent*; the resulting
   // language grants are 3x the paid DP by explicit printed rule p.48.
   delete spec.Language;Object.assign(spec,split);
  }
  // Historical v93.224 instances may store an Appendix I dialect in the
  // language skill name. Reconcile ONLY in the derived projection, never
  // rewrite the original stage ledger or append-only physical-roll history.
  const reconciled={};
  for(const [key,points] of Object.entries(spec)){
   const parsed=parseInstance(key);
   const canonical=parsed?.type==='Language'?instanceKey('Language',canonicalLanguage(parsed.name)):key;
   reconciled[canonical]=(reconciled[canonical]??0)+points;
  }
  allocations[stage]=reconciled;
 }
 if(v.nativeSkillsMode==='yes'){
  const grants={},lang=canonicalLanguage(h.nativeLanguage);
  const count=nativeLanguageDP(character);
  if(lang&&count)grants[instanceKey('Language',lang)]=count;
  const ritual=nativeRitualGrants(character,v);
  // HMK p.343: tribal Émhlè Ritual SM2 is a FAMILY skill, not an
  // additional native Religion grant on top of a family grant. It is
  // independent of the five ordinary Parent Occupation Family DP.
  if(isTribalEmhle(character))allocations['Émhlè Family Ritual']={...ritual};
  else Object.assign(grants,ritual);
  if(lang==='Nâsik Azéri'&&count===5)grants[instanceKey('Language','Zâkimladal')]=4; // Appendix I p.416
  allocations['Native Proficiencies']=grants;
 }
 if(v.gmBonusLanguageProof?.decision==='granted')allocations['GM Bonus Languages']={...v.gmBonusLanguageProof.allocations};
 const doctrinalReligion=v.startingDoctrineProof?.religion;
 if(Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,doctrinalReligion)){
  const minimum=covenantPostOccupationGrants(doctrinalReligion,allocations,SKILL_DEFINITIONS,SKILL_STAGES);
  if(Object.keys(minimum).length)allocations['Covenant post-Occupation SM']=minimum;
 }
 // In-game modifications: effective DP may differ from the immutable 14-step
 // allocation. These overrides do not rewrite creation.skillDP or dice proofs.
 const advancement=h.advancement?.skillDP??{};
 const allowedStages=new Set([...SKILL_STAGES,'Native Language / Religion','Émhlè Family Ritual','Covenant post-Occupation SM','GM Bonus Languages']);
 for(const [name,byStage] of Object.entries(advancement)){
  if(!byStage||typeof byStage!=='object'||Array.isArray(byStage)||!skillDefinition(character,name))throw Error('Neplatná Skill DP úprava: '+name);
  for(const [stage,n] of Object.entries(byStage)){
   if(!allowedStages.has(stage)||!Number.isSafeInteger(n)||n<0||n>100)throw Error('Neplatná GM Skill DP úprava: '+stage);
   (allocations[stage==='Native Language / Religion'?'Native Proficiencies':stage]??={})[name]=n;
  }
 }
 const names=new Set(SKILL_DEFINITIONS.map(x=>x.name));
 for(const points of Object.values(allocations))for(const name of Object.keys(points))if(parseInstance(name))names.add(name);
 const normal=[...names].map(name=>{
  const raw=skillDefinition(character,name);
  if(!raw)return null;
  const base=perceptionDefinition(character,raw);
  const spec=parseInstance(name);
  const all=Object.values(allocations).reduce((n,points)=>n+(points[name]??0),0);
  const foreignBoost=spec?.type==='Language'?foreignLanguageBoost(character,spec.name,all):0;
  if(name==='Awareness'&&perceptionMode(character)==='subattributes'){
   // Awareness is a single shared SM with three independently based subskills.
   return {...calculateSkill({...base,foreignBoost},attrs,allocations),ml:null,sb:null,perceptionParent:true};
  }
  return calculateSkill({...base,foreignBoost},attrs,allocations);
 }).filter(Boolean);
 const inherited=[
  {name:'Shock',parent:'Initiative',primary:'str',secondary:'end'},
  {name:'Dodge',parent:'Melee',primary:'agl',secondary:perceptionMode(character)==='subattributes'?'eye':'per'}
 ];
if(perceptionMode(character)==='subattributes')for(const [name,primary] of [['Sight','eye'],['Sound','hrg'],['Odour','sml']])inherited.push({name,parent:'Awareness',primary,secondary:'wil',group:'Physical'});
 return [...normal,...inherited.map(x=>{
  const source=SKILL_DEFINITIONS.find(d=>d.name===x.parent);
  const sourceAlloc={};for(const [stage,points] of Object.entries(creation.skillDP??{}))sourceAlloc[stage]={[x.name]:points[x.parent]??0};
  return {...calculateSkill({group:x.group??'Combat',name:x.name,primary:x.primary,secondary:x.secondary,baseSM:source.baseSM,sourcePage:x.parent==='Awareness'?57:49},attrs,sourceAlloc),subskillOf:x.parent};
 })];
}
/** HMK pp.48–49: “received DP thus far” refers to the ACTUAL named
 * Skill on the sheet, not the printed generic occupation/family label.
 * Read the one authoritative projection (native, Family, Occupation and
 * covenant minima included); never persist a second skill counter.
 * Earlier Veteran rounds are supplied separately by their proof.
 */
export function priorSkillDevelopment(character,skillName,beforeStage){
 const before=SKILL_STAGES.indexOf(beforeStage);
 if(before<0)throw Error('Unknown Skill stage');
 const row=calculateSheetSkills(character).find(x=>x.name===skillName);
 if(!row)return 0;
 const earlier=new Set(SKILL_STAGES.slice(0,before));
 // Native skills and Émhlè family grants exist before optional/veteran.
 // Covenant floors apply after Occupation and before Optional.
 if(before>=5)for(const extra of ['Native Language / Religion','Émhlè Family Ritual','Covenant post-Occupation SM','GM Bonus Languages'])earlier.add(extra);
 return (row.dp??[]).filter(x=>earlier.has(x.stage)).reduce((sum,x)=>sum+x.dp,0);
}
/** Single physical Arcane Talent entry point; parent Invoker replaces
 * ordinary one-d20 Possession with best of FOUR physical d20, p.42. */
export function arcaneProofForCharacter(character,input){
 const h=character?.hmk??{},a={aura:h.attributes?.aur,folk:h.folk,ageGroup:h.ageGroup,d100s:input.d100s??[]};
 if(h.familyOccupation==='Invoker')return parentInvokerTalentFromPhysical({...a,d20s:input.d20s});
 if(input.d20s!==undefined&&input.d20s!==null&&input.d20s.length)throw Error('Čtyři rodičovské d20 patří pouze Parent Invoker');
 return arcaneTalentFromPhysical({...a,d20:input.d20});
}
export function defaultCreation(){return {version:1,step:1,skillStage:0,values:{},skillDP:{},attributeProof:{},voiceProof:null,auditEvents:[],completed:{},reviewRequired:true};}
export function creationOf(character){return character?.hmk?.creation??defaultCreation()}
export function folkFromDie(n){n=normalizeRoll(n,100);return n<=90?'Human':n<=95?'Kúzhai':n===96?'Ænarin':n<=99?'Sinái':'Sidhé'}
export function ageFromDie(n,folk='Human'){if(folk==='Kúzhai')return 'Mature';if(folk==='Sinái'||folk==='Sidhé')return 'Young';n=normalizeRoll(n,100);return n<=35?'Young':n<=85?'Mature':'Old'}
export function fateML(aura){if(!Number.isInteger(aura)||aura<4)return null;return 35+5*Math.floor((aura-4)/2)}
/** v93.195 compatibility, read-only. Recognises ONLY a byte-for-byte old
 * region resolution that predated the documented Tribal p.29 subsistence and
 * Reksyni Settled subtype. Never accepts hand-edited/forged region evidence.
 * A historical character must re-confirm Step 5 before further mutations;
 * the existing CAS writer is the only persistent write path. */
export function legacyTribalRegionNeedsReview(character){
 const h=character?.hmk??{},v=h.creation?.values??{},proof=v.regionProof;
 if(!proof||!VERIFIED_REGIONS[v.birthRegion]||proof.subsistence!==undefined)return false;
 try{
  const correct=proof.selectedByGM?
   realmFromRegionSelection(v.birthRegion,v.birthplace,v.nativeLanguageRoll,v.regionSubRoll,v.nativeLanguageChoice,v.regionDialectRoll,v.regionDialectChoice,v.regionAzeriDialectChoice,v.regionCommunityChoice,v.regionTribeRoll):
   realmFromRegionRoll(v.birthRegion,v.regionRoll,v.nativeLanguageRoll,v.regionSubRoll,v.nativeLanguageChoice,v.regionDialectRoll,v.regionDialectChoice,v.regionAzeriDialectChoice,v.regionCommunityChoice,v.regionTribeRoll);
  if(!correct.subsistence)return false;
  const historical={...correct};delete historical.subsistence;
  if(v.birthRegion==='Reksýna'&&correct.society==='Tribal-Settled')historical.society='Tribal';
  return JSON.stringify(historical)===JSON.stringify(proof)&&
   v.society===historical.society&&h.society===historical.society&&
   h.birthplace===historical.realm&&h.birthRegion===historical.region&&
   h.nativeLanguage===historical.nativeLanguage&&h.pantheon===historical.pantheon&&
   JSON.stringify(h.regionalLanguages)===JSON.stringify(historical.regionalLanguages);
 }catch{return false;}
}
/** Read-only compatibility for real pre-v93.217 records: a parent Invoker's
 * original single-d20 proof was valid *in the old app* but is insufficient
 * under the explicit four-d20 p.42 rule. Only the exact original physical
 * evidence and stage ledger can qualify, never an arbitrary forged value.
 * GM MUST re-enter four physical dice or change parent through Edit.
 */
export function legacyParentInvokerNeedsReview(character){
 const h=character?.hmk??{},c=h.creation??{},t=c.values?.arcaneTalentProof;
 if(h.familyOccupation!=='Invoker'||!t||t.familyInvoker||t.d20s!==undefined)return false;
 try{
  const verified=arcaneTalentFromPhysical({aura:h.attributes?.aur,folk:h.folk,ageGroup:h.ageGroup,d20:t.d20,d100s:t.d100s});
  const last=c.auditEvents?.filter(e=>e.type==='arcane-talent-physical'||e.type==='arcane-talent-deactivated').at(-1);
  return JSON.stringify(t)===JSON.stringify(verified)&&JSON.stringify(c.skillDP?.['Arcane Talent Skills']??{})===JSON.stringify(verified.grants)&&
   last?.type==='arcane-talent-physical'&&last.d20s===undefined&&last.d20===verified.d20&&
   JSON.stringify(last.d100s)===JSON.stringify(verified.d100s)&&JSON.stringify(last.grants)===JSON.stringify(verified.grants);
 }catch{return false;}
}
/**
 * Read-only end-of-creation revision. It never guesses physical dice or
 * rewrites the append-only audit. Incomplete / invalidated proofs are reported
 * by their original HMK step; the wizard's existing validators remain the
 * authority for every conditional profession, culture and supernatural path.
 * Each field is the closest editable control for focus/highlighting, or null
 * where proof is produced by a multi-control workflow (attributes / skills).
 */
export function creationRevisionIssues(character){
 const c=character?.hmk?.creation;
 if(!c)return [];
 const v=c.values??{},h=character.hmk??{},completed=c.completed??{},issues=[];
 const title={1:'Folk',2:'Age Group',3:'Birthdate',4:'Sunsign Traits',5:'Birthplace / Region',6:'Parent Social Class',7:'Parent Occupation',8:'Background',9:'Estrangement',10:'Attributes / Voice',11:'Occupation',12:'Skills',13:'Wealth',14:'Mysteries / Fate'};
 const filled=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
 const firstMissing=(...names)=>names.find(x=>!filled(v[x]));
 const push=(step,field,message)=>{
  if(!issues.some(i=>i.step===step&&i.field===field))issues.push({step,field:field||null,title:title[step],message});
 };
 for(let step=1;step<=13;step++){
  if(completed[step])continue;
  let field=null,reason='Krok nebyl potvrzen, případně byl jeho výsledek zneplatněn změnou související volby.';
  switch(step){
   case 1:field='folk';if(!filled(v.folk))reason='Vyberte platný Folk.';break;
   case 2:field='ageGroup';if(!filled(v.ageGroup))reason='Vyberte věkovou skupinu odpovídající Folk.';break;
   case 3:field=firstMissing('birthMonth','birthDay')||'birthMonth';if(firstMissing('birthMonth','birthDay'))reason='Doplňte datum narození pro určení Sunsign.';break;
   case 4:field='sunsignTraits';if(!filled(v.sunsignTraits))reason='Vyberte trait platný pro aktuální Sunsign (a druhý trait, pokud je cusp).';break;
   case 5:field=firstMissing('birthRegion','birthplace')||'birthRegion';if(firstMissing('birthRegion','birthplace'))reason='Zvolte znovu Region a příslušný Realm / Birthplace.';break;
   case 6:field='socialClass';if(!filled(v.socialClass))reason='Určete Parent Social Class z odpovídající tabulky.';break;
   case 7:field='familyOccupation';if(!filled(v.familyOccupation))reason='Určete Parent Occupation pro platnou společnost a třídu.';break;
   case 8:field='background';if(!filled(v.background))reason='Doložte platný Background pro Parent Occupation.';break;
   case 9:field='estrangementRoll';if(!filled(v.estrangementRoll))reason='Chybí fyzický d100 pro Estrangement.';break;
   case 10:{const missing=ATTRIBUTES.filter(a=>!c.attributeProof?.[a]);field=missing.length?'creation-attr-name':!c.voiceProof?'die0':null;
    if(missing.length||!c.voiceProof)reason='Chybí fyzický důkaz: '+(missing.length?missing.join(', '):'')+(missing.length&&!c.voiceProof?', ':'')+(!c.voiceProof?'Voice':'')+'.';break;}
   case 11:field='occupation';if(!filled(v.occupation)&&!filled(character.occupation))reason='Vyberte Occupation podle dosud doloženého původu a atributů.';break;
   case 12:field='skillName';reason='Zkontrolujte a znovu potvrďte všechna potřebná stadia Skill DP a jejich pravidlové důkazy.';break;
   case 13:field='wealthMethod';reason='Wealth a počáteční hotovost vyžadují aktuální pravidlové důkazy (HMK str. 51).';break;
  }
  push(step,field,reason);
 }
 // Full evidence audit for profiles produced by the revised unattended
 // generator. Earlier versions did not record every random Sunsign d6; a
 // historical missing roll can NEVER be reconstructed without falsifying
 // the physical/automatic roll history, so only v2 profiles get this strict
 // generated-proof gate. Direct GM/thematic choices remain legitimate without
 // a fabricated random roll.
 if(v.autoGeneration?.version>=2){
  if(v.autoGeneration.version>=3&&(!v.moralityProof||!Number.isInteger(h.morality)))push(10,'moralityChoice','Chybí Morality (MOR) podle HMK p.39: doložené 4d6 nebo přímá volba.');
  const missing=(key)=>!filled(v[key]);
  const required=[[1,'folk','Chybí uložená volba Folk.'],
   [2,'ageGroup','Chybí uložená věková skupina.'],
   [3,'birthMonth','Chybí uložený měsíc narození.'],
   [3,'birthDay','Chybí uložený den narození.'],
   [4,'sunsignTraits','Chybí uložený první Sunsign Trait.'],
   [5,'birthRegion','Chybí doložený region původu.'],
   [6,'socialClass','Chybí doložená sociální třída.'],
   [7,'familyOccupation','Chybí doložené rodičovské povolání.'],
   [8,'background','Chybí doložený Background.'],
   [9,'estrangementRoll','Chybí původní d100 pro Estrangement.'],
   [10,'creation-attr-name','Chybí potvrzený atribut nebo Voice.'],
   [11,'occupation','Chybí potvrzené povolání.'],
   [13,'wealthProof','Chybí uložený výpočet a důkazy Wealth.'],
   [14,'graceDie','Chybí uložený Grace d20.'],
   [14,'psycheDice','Chybí uložený Psyche hod.']];
  for(const [step,field,message] of required){
   // HMK p.40 prescribes no starting Psyche dice count for Ænarin or Sidhé.
   // Do not require a non-existent dice proof or fabricate rolls for them.
   if(field==='psycheDice'&&creationPsycheCount(h.folk,h.ageGroup)===null)continue;
   let absent=field==='creation-attr-name'?ATTRIBUTES.some(a=>!c.attributeProof?.[a])||!c.voiceProof:
    field==='occupation'?!filled(v.occupation)&&!filled(character.occupation):
    field==='graceDie'?!v.graceProof:field==='psycheDice'?!v.psycheProof:missing(field);
   if(absent)push(step,field,message);
  }
  if(h.sunsign?.includes(' / ')&&missing('sunsignTraitSecondary'))push(4,'sunsignTraitSecondary','Chybí druhý trait pro Sunsign cusp.');
  if(v.autoGeneration.mode==='random'){
   if(missing('folkRoll'))push(1,'folkRoll','Chybí uložený náhodný d100 Folk.');
   if(['Human','Ænarin','Nâdi'].includes(h.folk)&&missing('ageRoll'))push(2,'ageRoll','Chybí uložený náhodný d100 Age.');
   if(missing('traitRoll'))push(4,'traitRoll','Chybí uložený náhodný d6 pro první Sunsign Trait.');
   if(h.sunsign?.includes(' / ')&&missing('traitRollSecondary'))push(4,'traitRollSecondary','Chybí uložený d6 pro druhý Sunsign Trait.');
  }
  if(missing('classRoll'))push(6,'classRoll','Chybí doložený hod Parent Social Class.');
 }
 // Do not demand rolls for a step which is not currently being completed.
 // These warnings are visible at step 14, and block its final confirmation.
 if(c.step===14&&!completed[14]&&(character.kind??'PC')==='PC'){
  if(!c.values?.graceProof)push(14,'graceDie','Chybí povinný Grace d20 (HMK str. 40).');
  const requiredPsyche=creationPsycheCount(h.folk,h.ageGroup);
  if(requiredPsyche!==null&&!c.values?.psycheProof)push(14,'psycheDice','Chybí fyzický Psyche hod a případné trait volby (HMK str. 40).');
 }
 return issues;
}
/**
 * Character Journal release gate. The journal must never infer combat, skills or
 * identity data from a partially built (or later invalidated) 14-step profile.
 * "review-required" is a valid terminal state: it denotes completed creation
 * awaiting GM review, NOT an unfinished step. This is distinct from the final
 * character-sheet audit and makes no mutations or new dice rolls.
 */
export function characterJournalReadiness(character){
 const creation=character?.hmk?.creation;
 if(!creation)return {ready:false,missingSteps:Array.from({length:14},(_,i)=>i+1),issues:[],reason:'Chybí uložený 14krokový záznam Character Creation.'};
 const completed=creation.completed??{};
 const missingSteps=Array.from({length:14},(_,i)=>i+1).filter(step=>completed[step]!==true);
 const issues=creationRevisionIssues(character);
 const terminal=['review-required','complete','auto-generated'].includes(creation.status);
 const ready=terminal&&missingSteps.length===0&&issues.length===0;
 return {ready,missingSteps,issues,reason:ready?'':missingSteps.length?'Pravidlová tvorba nemá potvrzeno všech 14 kroků.':issues.length?'Revize tvorby hlásí nevyřešené návaznosti.':'Pravidlová tvorba zatím není dokončena.'};
}

export function applyCreationPatch(character,patch){
 const tribalLegacy=legacyTribalRegionNeedsReview(character);
 const invokerLegacy=legacyParentInvokerNeedsReview(character);
 const clone=structuredClone(character),h=clone.hmk??={},c=structuredClone(h.creation??defaultCreation());
 if(!patch||!Number.isInteger(patch.step)||patch.step<1||patch.step>14)throw Error('Neplatný krok');
 if(patch.step!==c.step)throw Error('Krok průvodce se změnil');
 if(tribalLegacy&&patch.step!==5&&!patch.jump&&!patch.back)throw Error('Starší Tribal Region: nejprve přes Edit znovu potvrďte Birthplace (krok 5); historie hodů se zachová');
 if(invokerLegacy&&!patch.back&&!patch.jump&&patch.step!==7&&!(patch.arcaneTalentDice&&[11,12].includes(patch.step)))throw Error('Starší Parent Invoker: přes Edit (krok 7) změňte povolání rodiče, nebo zadejte čtyři fyzické Talent d20 v kroku 11/12 (HMK p.42)');
 // Back / Edit navigation must never demand answers to a step not yet completed.
 if(patch.back||patch.jump){
  if(patch.jump){if(!Number.isInteger(patch.jump)||patch.jump<1||patch.jump>14)throw Error('Neplatný krok návratu');c.step=patch.jump;if(c.step===12)c.skillStage=0;/* A jump changes only the UI cursor. A completed step is invalidated by a REAL change to its prerequisites below, never by navigation alone. */}
  else if(c.step===12&&c.skillStage>0)c.skillStage--;
  else{c.step=Math.max(1,c.step-1);if(c.step===12)c.skillStage=7;}
  // Reading a historic step is not itself a data edit; preserve the
  // completed/auto-generated status until a real validated update.
  h.creation=c;clone.hmk=h;return clone;
 }
 const previousValues={...c.values};
 // A new realm or region makes the prior dual-language die inapplicable.
 // Remove it from the TEMPORARY resolver context before resolving the new
 // region; later the active value is invalidated with an append-only audit
 // event (never delete the old physical throw from audit history).
 const resolverContext={...previousValues};
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'nativeLanguageRoll')&&
    ['birthRegion','birthplace','regionRoll','venariveRoll'].some(key=>
     Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.nativeLanguageRoll;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionSubRoll')&&
    ['birthRegion','birthplace','regionRoll','venariveRoll'].some(key=>
     Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionSubRoll;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionDialectRoll')&&
    ['birthRegion','birthplace','regionRoll','venariveRoll'].some(key=>
     Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionDialectRoll;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'nativeLanguageChoice')&&
    ['birthRegion','birthplace','regionRoll','venariveRoll'].some(key=>
     Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.nativeLanguageChoice;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionDialectChoice')&&
    ['birthRegion','birthplace','regionRoll','regionSubRoll','venariveRoll'].some(key=>Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionDialectChoice;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionAzeriDialectChoice')&&
    ['birthRegion','birthplace','regionRoll','regionSubRoll','venariveRoll'].some(key=>Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionAzeriDialectChoice;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionCommunityChoice')&&
    ['birthRegion','birthplace','regionRoll','regionTribeRoll','venariveRoll'].some(key=>Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionCommunityChoice;
 if(patch.step===5&&!Object.hasOwn(patch.values??{},'regionTribeRoll')&&
    ['birthRegion','birthplace','regionRoll','venariveRoll'].some(key=>Object.hasOwn(patch.values??{},key)&&patch.values[key]!==previousValues[key]))
  delete resolverContext.regionTribeRoll;
 const resolvedValues=mergeCreationChoices(clone,patch.step,patch.values??{},resolverContext);
 c.values={...c.values,...resolvedValues};
 if(patch.step===5&&!Object.hasOwn(resolvedValues,'nativeLanguageChoice')&&!Object.hasOwn(resolverContext,'nativeLanguageChoice'))delete c.values.nativeLanguageChoice;
 if(patch.step===5&&!Object.hasOwn(resolvedValues,'regionAzeriDialectChoice')&&!Object.hasOwn(resolverContext,'regionAzeriDialectChoice'))delete c.values.regionAzeriDialectChoice;
 if(patch.step===5&&!Object.hasOwn(resolvedValues,'regionDialectChoice')&&!Object.hasOwn(resolverContext,'regionDialectChoice'))delete c.values.regionDialectChoice;
 if(patch.step===5&&!Object.hasOwn(resolvedValues,'regionCommunityChoice')&&!Object.hasOwn(resolverContext,'regionCommunityChoice'))delete c.values.regionCommunityChoice;
 if(patch.step===5&&!Object.hasOwn(resolvedValues,'regionTribeRoll')&&!Object.hasOwn(resolverContext,'regionTribeRoll')){
  if(previousValues.regionTribeRoll!==undefined&&String(previousValues.regionTribeRoll).trim()!=='')c.auditEvents.push({sequence:c.auditEvents.length+1,type:'roll-deactivated',step:5,field:'regionTribeRoll'});
  delete c.values.regionTribeRoll;
 }
 if(patch.step<14&&Object.keys(patch.values??{}).length){c.status='in-progress';}
 const changed=(key)=>Object.prototype.hasOwnProperty.call(resolvedValues,key)&&resolvedValues[key]!==previousValues[key];
 const invalidateGmLanguage=()=>{if(c.values.gmBonusLanguageProof){c.auditEvents.push({sequence:c.auditEvents.length+1,type:'gm-bonus-language-deactivated',reason:'changed Folk/Age/Birthplace'});delete c.values.gmBonusLanguageProof;}};
 // A changed skill stage changes the Character Sheet projection. All finished
 // Mysteries (Ritual/Doctrine, Alchemy, Pvârism/ARP, Spirit) depend on that
 // projection, even when the edit originated in an *earlier* creation step.
 // No physical roll is erased from auditEvents; only its active derived proof.
 const invalidateStage=(name)=>{
  delete c.skillDP?.[name];
  if(name==='Arcane Talent Skills')delete c.values.arcaneTalentProof;
  if(name==='Occupation Skills')delete c.values.occupationProof;
  if(name==='Veteran Skills')delete c.values.veteranRoundProof;
  delete c.completed[12];c.status='in-progress';
  invalidateSkillMysteries();
 };
 const invalidateLaterSkills=(start)=>{
  for(const name of SKILL_STAGES.slice(SKILL_STAGES.indexOf(start)))invalidateStage(name);
  if(c.step===12)c.skillStage=Math.min(c.skillStage,SKILL_STAGES.indexOf(start));
 };
 // Invalidate later Mysteries computations when their rule inputs change.
 const invalidateCreationMysteries=()=>{
  delete c.values.psycheRuleReview;
  for(const key of ['psycheDice','psycheTraitChoice1','psycheTraitChoice2','psycheTraitDie1','psycheTraitDie2'])delete c.values[key];
  if(c.values.psycheProof){c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-psyche-deactivated',reason:'Changed creation prerequisites'});delete c.values.psycheProof;}
  delete h.psyche;
  if(c.values.spiritPowerProof)c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-spirit-powers-deactivated',reason:'Changed creation prerequisites'});
  for(const key of ['arcaneResearchProof','mysteriesProof','mysteriesRitualSkill','spiritPowerProof','startingElixirProof','startingPvarSpellsProof','startingDoctrineProof','shamanTraditionProof','religionNeedsReview'])delete c.values[key];
  delete h.startingElixirs;delete h.startingPvarSpells;delete h.startingDoctrine;delete h.shamanTradition;
  delete h.startingSpiritPowers;
  delete h.religiousStatus;
  if(c.values.moralityProof){c.values.moralityChoice=c.values.moralityProof.score;h.morality=c.values.moralityProof.score;}
  else {delete c.values.moralityChoice;delete h.morality;}
  delete h.startingArcaneResearch;
  delete c.completed[14];c.status='in-progress';
 };
 const invalidateSkillMysteries=()=>{
  if(c.values.mysteriesProof||c.values.arcaneResearchProof){
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-mysteries-derived-deactivated',reason:'Changed Skills / Attributes'});
  }
  if(c.values.spiritPowerProof)c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-spirit-powers-deactivated',reason:'Changed Skills / Attributes'});
  for(const key of ['mysteriesProof','arcaneResearchProof','mysteriesRitualSkill','spiritPowerProof','startingElixirProof','startingPvarSpellsProof','startingDoctrineProof','shamanTraditionProof','religionNeedsReview'])delete c.values[key];
  delete h.startingElixirs;delete h.startingPvarSpells;delete h.startingDoctrine;delete h.shamanTradition;
  delete h.startingSpiritPowers;
  delete h.religiousStatus;
  if(c.values.moralityProof){c.values.moralityChoice=c.values.moralityProof.score;h.morality=c.values.moralityProof.score;}
  else {delete c.values.moralityChoice;delete h.morality;}
  delete h.startingArcaneResearch;
  delete c.completed[14];c.status='in-progress';
 };
 if((patch.step===11&&(Object.keys(patch.values??{}).length||patch.advance))||
    (patch.step===12&&(patch.skillAllocation||patch.arcaneTalentDice||patch.gmBonusLanguageUpdate||patch.advance||Object.keys(patch.values??{}).length))||
    (patch.step===10&&(patch.attribute||patch.voice)))invalidateSkillMysteries();
 const invalidateOccupationIfNotAllowed=()=>{
  if(clone.occupation&&!eligibleOccupations(clone).includes(clone.occupation)){
   clone.occupation='';delete c.values.occupation;delete c.values.occupationProof;
   invalidateLaterSkills('Occupation Skills');
   for(let n=11;n<=14;n++)delete c.completed[n];
   delete c.values.wealthProof;delete c.completed[13];
  }
 };
 const deactivateDependent=(step,fields)=>{for(const field of fields){if(c.values[field]!==undefined&&String(c.values[field]).trim()!=='')c.auditEvents.push({sequence:c.auditEvents.length+1,type:'roll-deactivated',step,field});delete c.values[field];}};
 // A changed Wealth prerequisite must not leave the previous score/rolls active.
 // Physical results remain in append-only auditEvents and can be reviewed there.
 const invalidateWealthInputs=()=>{for(const key of ['wealth','wealthProof','parentWealthDie','occupationWealthDie','familyDice','occupationDice'])delete c.values[key];
  for(const key of ['wealth','standing','lifestyle','coinsPence','possessionsBudgetPence'])delete h[key];delete c.completed[13];};
 // Edit: stale Wealth is never valid after changing a source of dice
 // (Folk/Age/Birthplace/Estrangement) even when later steps are unfinished.
 if(patch.step===1&&changed('folk')||patch.step===2&&changed('ageGroup'))invalidateCreationMysteries();
 if(patch.step===1&&changed('folk')||patch.step===2&&changed('ageGroup')||
    patch.step===5&&['birthRegion','birthplace','society','regionRoll','venariveRoll','nativeLanguageRoll','regionSubRoll','regionTribeRoll','regionCommunityChoice','nativeLanguageChoice','regionDialectRoll','regionDialectChoice','regionAzeriDialectChoice','subsistence'].some(changed)||
    patch.step===9&&changed('estrangementRoll'))invalidateWealthInputs();
 // HMK p.57: an earlier optional perception roll must not silently
 // survive changed Folk/Age roll requirements. Keep historical dice, switch
 // explicitly to standard and require three fresh dice to reactivate.
 if((patch.step===1&&changed('folk')||patch.step===2&&changed('ageGroup'))&&c.values.perceptionMode==='subattributes'){
  c.values.perceptionMode='standard';
  for(const name of PERCEPTION_SENSES)delete (h.attributes??={})[name];
  c.auditEvents.push({sequence:c.auditEvents.length+1,type:'perception-mode-choice',previous:'subattributes',mode:'standard',sourcePage:57});
 }
 if(patch.step===1&&changed('folk')||patch.step===2&&changed('ageGroup')||patch.step===5&&['birthRegion','birthplace','regionRoll','venariveRoll','nativeLanguageRoll','nativeLanguageChoice','regionTribeRoll'].some(changed))invalidateGmLanguage();
 if(patch.step===3&&(changed('birthMonth')||changed('birthDay'))){
  for(const field of ['traitRoll','traitRollSecondary']){
   if(c.values[field]!==undefined&&String(c.values[field]).trim()!=='')c.auditEvents.push({sequence:c.auditEvents.length+1,type:'roll-deactivated',step:4,field});
  }
  delete c.values.sunsignTraits;delete c.values.sunsignTraitSecondary;delete c.values.traitRoll;delete c.values.traitRollSecondary;
  // Do not display a trait of the old Sunsign on the Character Sheet during Edit.
  delete h.sunsignTraits;delete h.sunsignTraitSecondary;
  delete c.completed[4];invalidateStage('Sunsign Skills')}
 if(patch.step===5&&(tribalLegacy||changed('birthplace')||changed('society')||changed('birthRegion')||changed('regionRoll')||changed('venariveRoll')||changed('regionTribeRoll'))){
  if(!Object.hasOwn(patch.values??{},'nativeLanguageRoll'))deactivateDependent(5,['nativeLanguageRoll']);
  if(!Object.hasOwn(patch.values??{},'regionSubRoll'))deactivateDependent(5,['regionSubRoll']);
  if(!Object.hasOwn(patch.values??{},'regionDialectRoll'))deactivateDependent(5,['regionDialectRoll']);
  if(!Object.hasOwn(patch.values??{},'regionTribeRoll'))deactivateDependent(5,['regionTribeRoll']);
  if(!Object.hasOwn(patch.values??{},'regionDialectChoice'))delete c.values.regionDialectChoice;
  if(!Object.hasOwn(patch.values??{},'regionAzeriDialectChoice'))delete c.values.regionAzeriDialectChoice;
  if(!Object.hasOwn(patch.values??{},'regionCommunityChoice'))delete c.values.regionCommunityChoice;
 }
 if(patch.step===5&&(tribalLegacy||changed('birthplace')||changed('society')||changed('birthRegion')||changed('regionRoll')||changed('venariveRoll')||changed('nativeLanguageRoll')||changed('regionSubRoll')||changed('regionDialectRoll')||changed('regionDialectChoice')||changed('regionAzeriDialectChoice')||changed('regionCommunityChoice')||changed('regionTribeRoll')||changed('nativeLanguageChoice'))){deactivateDependent(6,['classRoll']);deactivateDependent(7,['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll']);deactivateDependent(8,['backgroundRoll','backgroundTensRoll']);delete c.values.socialClass;delete c.values.familyOccupation;delete c.values.familyWeaponcrafterType;delete c.values.familyMartialChoice;delete c.values.familyVariantChoice;delete c.values.familyRitualChoice;
  delete c.values.familyScriptChoice;delete c.values.familySecondScriptChoice;delete c.values.familyThirdScriptChoice;delete c.values.familyAuto;
  delete c.values.parentOccupationProof;delete c.values.parentTitleProof;delete c.values.urbanChance;delete c.values.regionProof;delete h.socialClass;delete h.familyOccupation;delete h.background;delete h.parentTitle;for(const k of [6,7,8])delete c.completed[k];invalidateStage('Family Skills');invalidateStage('Background Skills');delete c.values.nativeRitualChoice;delete c.values.nativeRitualChoice2;delete c.values.nativeRitualChoice3;delete c.values.nativeSkillsMode}
 if(patch.step===6&&(changed('socialClass')||changed('classRoll')||changed('classDie'))){invalidateWealthInputs();invalidateStage('Family Skills');invalidateStage('Background Skills');deactivateDependent(7,['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll']);deactivateDependent(8,['backgroundRoll','backgroundTensRoll']);delete c.values.familyOccupation;delete c.values.familyWeaponcrafterType;delete c.values.familyMartialChoice;delete c.values.familyVariantChoice;delete c.values.familyRitualChoice;
  delete c.values.familyScriptChoice;delete c.values.familySecondScriptChoice;delete c.values.familyThirdScriptChoice;delete c.values.familyAuto;
  delete c.values.parentOccupationProof;delete c.values.parentTitleProof;delete c.values.urbanChance;delete h.familyOccupation;delete h.background;delete h.parentTitle;delete c.completed[7];delete c.completed[8];delete c.completed[13];}
 if(patch.step===7&&(changed('familyOccupation')||changed('familyWeaponcrafterType')||changed('familyMartialChoice')||changed('familyVariantChoice')||changed('familyAuto')||changed('subsistence')||changed('parentOccupationRoll')||changed('parentOccupationSubRoll')||changed('parentOccupationSpecialRoll')||changed('parentOccupationConvocationRoll'))){invalidateWealthInputs();invalidateStage('Family Skills');invalidateStage('Background Skills');deactivateDependent(8,['backgroundRoll','backgroundTensRoll']);delete c.values.urbanChance;delete c.values.parentTitleProof;delete h.parentTitle;delete h.background;delete c.completed[8];delete c.values.wealthProof;delete c.completed[13]}
 if(patch.step===11&&(changed('occupation')||changed('occupationAuto'))){invalidateWealthInputs();invalidateStage('Occupation Skills');delete c.values.wealthProof;delete c.completed[13]}
 if(patch.step===8&&['background','backgroundRoll','backgroundTensRoll','urbanChance'].some(changed)){
  // One background d100 can change a Noble title even if Urban/Rural
  // remains identical. Title changes Family d8/d10/d12/d20/d30 (p.27,51).
  invalidateWealthInputs();
  if(changed('background')){
   invalidateLaterSkills('Background Skills');
   delete c.values.backgroundCityLanguageDistribution;
  }
 }
 if(patch.step===11&&changed('occupation'))invalidateStage('Occupation Skills');


 // Revisiting a prerequisite invalidates affected derived evidence rather than
 // silently retaining modifiers or attributes calculated for another Folk/Age.
 if(patch.step===1&&c.values.folk&&c.values.folk!==h.folk ||
    patch.step===2&&c.values.ageGroup&&c.values.ageGroup!==h.ageGroup){
    c.attributeProof={};c.voiceProof=null;for(const a of [...ATTRIBUTES,'voi'])delete (h.attributes??={})[a];
    // Fate ML is derived from Aura at the Mysteries stage (p.53).
    // Never retain the old ML after invalidating that physical attribute.
    delete h.fateML;
    c.skillDP={};c.skillStage=0;delete c.values.folkSkillProof;delete c.values.folkSkillDice;
    for(let k=10;k<=14;k++)delete c.completed[k];
 }

 if(patch.step===1){if(!FOLKS.includes(c.values.folk))throw Error('Vyberte Folk z pravidlového seznamu');
  if(c.values.folkRoll!==undefined&&c.values.folkRoll!==''){
   if(folkFromDie(c.values.folkRoll)!==c.values.folk)throw Error('Folk neodpovídá fyzickému d100 (p.20)');}
  h.folk=c.values.folk;
  if(changed('folk')){
   if(c.values.moralityProof){c.auditEvents.push({sequence:c.auditEvents.length+1,type:'morality-proof-deactivated',reason:'Folk modifier changed'});}
   delete c.values.moralityProof;delete c.values.moralityChoice;delete h.morality;
   delete c.values.ageGroup;deactivateDependent(2,['ageRoll']);delete h.ageGroup;
   // A different Folk can have a different permitted birth region, society,
   // parent class, language, religion and occupational eligibility (pp.20–44,
   // Appendix I). Do not leave the old character's resolved region/parent
   // values active while the new Folk has not yet reached those steps.
   // Independent birthday/Sunsign rolls and ALL historical audit events stay.
   deactivateDependent(5,['regionRoll','venariveRoll','nativeLanguageRoll','regionSubRoll','regionDialectRoll','regionTribeRoll']);
   deactivateDependent(6,['classRoll']);
   deactivateDependent(7,['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll']);
   deactivateDependent(8,['backgroundRoll','backgroundTensRoll']);
   for(const key of [
    'birthRegion','birthplace','society','venariveProof','regionProof','nativeLanguageChoice',
    'regionDialectChoice','regionAzeriDialectChoice','regionCommunityChoice','regionTribeRoll',
    'subsistence','tribalUnsettled','viking','socialClass','classDie',
    'familyOccupation','familyWeaponcrafterType','familyMartialChoice','familyVariantChoice',
    'familyAuto','familyRitualChoice','familyScriptChoice','familySecondScriptChoice','familyThirdScriptChoice',
    'parentOccupationProof','parentTitleProof','urbanChance','background','backgroundAuto',
    'backgroundCityLanguageDistribution','nativeRitualChoice','nativeRitualChoice2',
    'nativeRitualChoice3','nativeSkillsMode','occupation','occupationAuto',
    'occupationProof','occupationScriptChoice','occupationLanguageChoice',
    'occupationRitualChoice','occupationLanguageDistribution','occupationScriptsDistribution',
    'occupationSecondScriptChoice','occupationThirdScriptChoice'
   ])delete c.values[key];
   for(const key of ['birthRegion','birthplace','society','pantheon','nativeLanguage',
    'regionalLanguages','harnTribe','alticTribe','socialClass','familyOccupation',
    'parentTitle','background'])delete h[key];
   clone.occupation='';
   // Independent Birthdate/Sunsign Traits (3–4) and Estrangement (9)
   // survive Folk edits. Only branches whose choices/proofs were cleared
   // above need fresh confirmation; Stage/Wealth/Attributes invalidate
   // 10, 12–14 separately.
   for(const k of [2,5,6,7,8,11])delete c.completed[k];
   delete c.values.wealthProof;delete c.values.occupationProof;
   invalidateLaterSkills('Folk Skills');delete c.values.arcaneTalentProof;
   invalidateOccupationIfNotAllowed();
  }
 }
 if(patch.step===2){if(h.folk==='Malákta'&&String(c.values.ageRoll??'').trim()!=='')throw Error('Malákta: p.21 výchozí Young; výjimečný Mature jen se souhlasem GM, nikoli z d100');let age=c.values.ageGroup;if(!eligibleAges(h.folk).includes(age))throw Error('Age Group není povolená pro zvolený Folk (p.21)');if(c.values.folk==='Kúzhai'&&age!=='Mature'||['Sinái','Sidhé'].includes(c.values.folk)&&age!=='Young')throw Error('Nesprávná věková skupina Elder Folk');
  if(c.values.ageRoll!==undefined&&c.values.ageRoll!==''&&!['Kúzhai','Sinái','Sidhé','Malákta'].includes(c.values.folk)&&ageFromDie(c.values.ageRoll,c.values.folk)!==age)throw Error('Age neodpovídá fyzickému d100 (p.21)');
  h.ageGroup=age;
  if(changed('ageGroup')){
   invalidateLaterSkills('Veteran Skills');delete c.values.veteranRoundProof;delete c.values.arcaneTalentProof;invalidateStage('Arcane Talent Skills');
   delete c.values.wealthProof;delete c.completed[13];
  }
 }
 if(patch.step===3){const sign=signFromBirthday(c.values.birthMonth,c.values.birthDay);h.sunsign=sign.primary+(sign.secondary?' / '+sign.secondary:'');h.birthdate=`${sign.day} ${sign.month}`;c.values.sunsignProof=sign;}
 if(patch.step===4){
  const sources=h.sunsign?.split(' / ')??[];
  if(!sources[0]||!SIGN_TRAITS[sources[0]]?.includes(c.values.sunsignTraits))throw Error('Vyberte první Trait odpovídající primárnímu Sunsign (p.23)');
  if(c.values.traitRoll!==undefined&&c.values.traitRoll!==''){
   const d=normalizeRoll(c.values.traitRoll,6);
   if(SIGN_TRAITS[sources[0]][d-1]!==c.values.sunsignTraits)throw Error('První Trait neodpovídá fyzickému d6');
  }
  if(sources[1]){
   if(!SIGN_TRAITS[sources[1]]?.includes(c.values.sunsignTraitSecondary))throw Error('Cusp: povinný druhý Trait druhého Sunsign (p.23)');
   if(c.values.traitRollSecondary!==undefined&&c.values.traitRollSecondary!==''){
    const d=normalizeRoll(c.values.traitRollSecondary,6);
    if(SIGN_TRAITS[sources[1]][d-1]!==c.values.sunsignTraitSecondary)throw Error('Druhý Trait neodpovídá fyzickému d6');
   }
  }
  h.sunsignTraits=String(c.values.sunsignTraits).trim()+(sources[1]?', '+c.values.sunsignTraitSecondary:'');
  h.sunsignTraitSecondary=sources[1]?c.values.sunsignTraitSecondary:null;
 }
 if(patch.step===5){
  if(!regionAllowedForFolk(c.values.birthRegion,h.folk))throw Error('Appendix I p.423: Elder Folk Region není přípustný pro vybraný Folk');
  if(c.values.venariveRoll!==undefined&&String(c.values.venariveRoll).trim()!==''&&ELDER_FOLK_REGIONS.includes(c.values.birthRegion))throw Error('Elder Folk p.423 se určuje vlastní tabulkou d100, nikoliv Venârivè d1000');
  if(c.values.birthRegion!=='Palíthanè'&&c.values.regionDialectRoll!==undefined&&String(c.values.regionDialectRoll).trim()!=='')throw Error('Fyzický d100 pro dialekt platí jen pro Palíthanè (p.420)');
  if(c.values.birthRegion!=='Ázeryàn'&&c.values.regionAzeriDialectChoice!==undefined&&String(c.values.regionAzeriDialectChoice).trim()!=='')throw Error('GM dialekt Nâsik Azéri lze zadat jen v Ázeryànu (p.416)');
  if(!['Hèpekéria','Hârn'].includes(c.values.birthRegion)&&c.values.regionCommunityChoice!==undefined&&String(c.values.regionCommunityChoice).trim()!=='')throw Error('GM komunita Hèpekéria je povolená jen v daném regionu (p.418)');
  if(!['Hârn','Áltôr'].includes(c.values.birthRegion)&&c.values.regionTribeRoll!==undefined&&String(c.values.regionTribeRoll).trim()!=='')throw Error('Hârn: tribe d100 není povolen mimo Hârn (p.418)');
  if(c.values.birthRegion!=='Tríerzòn'&&c.values.regionDialectChoice!==undefined&&String(c.values.regionDialectChoice).trim()!=='')throw Error('GM dialekt Tríerzòn lze zadat jen ve stejnojmenném regionu (p.422)');
  if(c.values.venariveRoll!==undefined&&String(c.values.venariveRoll).trim()){
   const r=regionFromD1000(c.values.venariveRoll);
   if(c.values.birthRegion&&c.values.birthRegion!=='GM verified (other region)'&&c.values.birthRegion!==r.region)throw Error('Vybraný Region neodpovídá fyzickému d1000');
   c.values.birthRegion=r.region;c.values.venariveProof=r;
  }else delete c.values.venariveProof;
  // HMK p.24 permits selecting a birthplace directly instead of rolling;
  // if the region table is transcribed the selected realm must still belong to it.
  if(VERIFIED_REGIONS[c.values.birthRegion]&&!String(c.values.regionRoll??'').trim()&&!String(c.values.birthplace??'').trim())throw Error('Region bez fyzického d100 vyžaduje vědomou volbu Realm z Appendix I.');
  if(VERIFIED_REGIONS[c.values.birthRegion]&&c.values.regionRoll!==undefined&&String(c.values.regionRoll).trim()){
   const r=realmFromRegionRoll(c.values.birthRegion,c.values.regionRoll,c.values.nativeLanguageRoll,c.values.regionSubRoll,c.values.nativeLanguageChoice,c.values.regionDialectRoll,c.values.regionDialectChoice,c.values.regionAzeriDialectChoice,c.values.regionCommunityChoice,c.values.regionTribeRoll);
   if(r.harnElderEvidence?.humanJarin&&!['Human','Ænarin'].includes(h.folk))throw Error('Hârn Elder Realms p.418 jsou Járin humans; Elder Folk použijí vlastní tabulky p.423');
   if(c.values.birthplace&&c.values.birthplace!==r.realm)throw Error('Birthplace neodpovídá fyzickému Region d100 (p.24)');
   if(c.values.society&&c.values.society!==r.society)throw Error('Society neodpovídá fyzickému Region d100');
   if(r.harnElderEvidence?.humanJarin&&!['Human','Ænarin'].includes(h.folk))throw Error('Hârn Elder Realms p.418 jsou Járin humans; Elder Folk použijí vlastní tabulky p.423');
   if(r.nativeLanguageOptions&&!r.languageRoll&&!r.languageChoice)throw Error('Tento Realm vyžaduje fyzický d2 pro Native Language (Appendix I, p.417)');
   c.values.birthplace=r.realm;c.values.society=r.society;c.values.regionProof=r;
   h.birthRegion=r.region;h.pantheon=r.pantheon;h.nativeLanguage=r.nativeLanguage;h.regionalLanguages=[...r.regionalLanguages];if(r.region==='Hârn'&&r.tribe)h.harnTribe=r.tribe;else delete h.harnTribe;if(r.region==='Áltôr'&&r.tribe)h.alticTribe=r.tribe;else delete h.alticTribe;
   if(r.subsistence)c.values.subsistence=r.subsistence;
   else if(previousValues.regionProof?.subsistence)delete c.values.subsistence;
  }else if(VERIFIED_REGIONS[c.values.birthRegion]){
   const r=realmFromRegionSelection(c.values.birthRegion,c.values.birthplace,c.values.nativeLanguageRoll,c.values.regionSubRoll,c.values.nativeLanguageChoice,c.values.regionDialectRoll,c.values.regionDialectChoice,c.values.regionAzeriDialectChoice,c.values.regionCommunityChoice,c.values.regionTribeRoll);
   if(r.harnElderEvidence?.humanJarin&&!['Human','Ænarin'].includes(h.folk))throw Error('Hârn Elder Realms p.418 jsou Járin humans; Elder Folk použijí vlastní tabulky p.423');
   if(r.nativeLanguageOptions&&!r.languageRoll&&!r.languageChoice)throw Error('Tento Realm vyžaduje fyzický d2 pro Native Language (Appendix I, p.417)');
   c.values.society=r.society;c.values.regionProof=r;
   h.birthRegion=r.region;h.pantheon=r.pantheon;h.nativeLanguage=r.nativeLanguage;h.regionalLanguages=[...r.regionalLanguages];if(r.region==='Hârn'&&r.tribe)h.harnTribe=r.tribe;else delete h.harnTribe;if(r.region==='Áltôr'&&r.tribe)h.alticTribe=r.tribe;else delete h.alticTribe;
   if(r.subsistence)c.values.subsistence=r.subsistence;
   else if(previousValues.regionProof?.subsistence)delete c.values.subsistence;
  }else{delete c.values.regionProof;delete h.birthRegion;delete h.pantheon;delete h.nativeLanguage;delete h.regionalLanguages;delete h.harnTribe;delete h.alticTribe;}
  if(!String(c.values.birthplace??'').trim()||!SOCIETIES.includes(c.values.society))throw Error('Vyberte známou Society a Birthplace Realm nebo doložený Region d100');
  h.birthplace=c.values.birthplace;h.society=c.values.society;
  if(h.society==='Mizúni')c.values.subsistence='Herding'; // p.423 settled, herding tribe; Chieftain p.42
  if(h.society==='Tribal-Settled')c.values.tribalUnsettled='no';
  else if(h.society==='Tribal')c.values.tribalUnsettled='yes';
  else delete c.values.tribalUnsettled;
  if(changed('birthRegion')||changed('birthplace')||changed('society')||changed('nativeLanguageRoll')||changed('regionSubRoll')||changed('regionDialectRoll')||changed('regionDialectChoice')||changed('regionAzeriDialectChoice')||changed('regionCommunityChoice')||changed('regionTribeRoll')||changed('nativeLanguageChoice')){
   invalidateLaterSkills('Family Skills');invalidateOccupationIfNotAllowed();
  }
 }
 if(patch.step===6){if(!eligibleParentClasses(h.society,Number(c.values.classDie||100)).includes(c.values.socialClass))throw Error('Parent Social Class nepatří mezi povolené volby Society a typu kostky (pp.26–32)');
  if(c.values.classRoll!==undefined&&c.values.classRoll!==''&&classFromRoll(h.society,c.values.classRoll,Number(c.values.classDie||100))!==c.values.socialClass)throw Error('Parent Class neodpovídá fyzickému d20/d100 pro Society (pp.26–32)');
  h.socialClass=c.values.socialClass;
  if(changed('socialClass')||changed('classDie')||changed('classRoll')){
   invalidateLaterSkills('Family Skills');invalidateOccupationIfNotAllowed();
  }
 }
 if(patch.step===7){
  if(c.values.parentOccupationSubRoll!==undefined&&String(c.values.parentOccupationSubRoll).trim()!==''&&(!String(c.values.parentOccupationRoll??'').trim()||(h.society==='Tribal'&&h.socialClass==='Free')))throw Error('Doplňkový d20 vyžaduje Parent Slave nebo Tenant Officer z tabulky (p.27–28)');
  if(c.values.parentOccupationRoll!==undefined&&String(c.values.parentOccupationRoll).trim()){
   const o=['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free' ? {...tribalFreeOccupation(c.values.subsistence,c.values.parentOccupationRoll),society:h.society} : parentOccupationFromRoll({society:h.society,socialClass:h.socialClass,roll:c.values.parentOccupationRoll,classRoll:c.values.classRoll,classDie:c.values.classDie??100,subRoll:c.values.parentOccupationSubRoll,specialRoll:c.values.parentOccupationSpecialRoll,convocationRoll:c.values.parentOccupationConvocationRoll});
   if(c.values.familyOccupation&&c.values.familyOccupation!==o.name)throw Error('Parent Occupation neodpovídá fyzickému Tribal Free d100');
   c.values.familyOccupation=o.name;c.values.urbanChance=String(o.urbanChance);c.values.parentOccupationProof=o;
  }else delete c.values.parentOccupationProof;
  if(c.values.regionProof?.subsistence&&c.values.subsistence!==c.values.regionProof.subsistence)throw Error('Parent Occupation: obživa musí odpovídat kmeni z HMK str. 29 a Appendix I');
  if(!String(c.values.familyOccupation??'').trim())throw Error('Určete Parent Occupation');
  if(!c.values.parentOccupationProof){
   const allowed=eligibleFamilyOccupationNames(h.society,h.socialClass,{subsistence:c.values.subsistence||'Foraging',classRoll:c.values.classRoll,classDie:c.values.classDie});
   if(allowed.length&&!allowed.includes(c.values.familyOccupation))throw Error('Parent Occupation nepatří do zvolené Society / Parent Class (pp.27–32)');
  }
  if(c.values.familyOccupation==='Weaponcrafter'){
   // An explicit choice, not a physical die (p.44). Never re-use an old choice
   // when a different parent Occupation just became Weaponcrafter.
   if(changed('familyOccupation')&&!Object.hasOwn(patch.values??{},'familyWeaponcrafterType'))delete c.values.familyWeaponcrafterType;
   if(changed('familyOccupation')&&!Object.hasOwn(patch.values??{},'familyScriptChoice'))delete c.values.familyScriptChoice;
   for(const fld of ['familySecondScriptChoice','familyThirdScriptChoice'])if(changed('familyOccupation')&&!Object.hasOwn(patch.values??{},fld))delete c.values[fld];
   if(!['Armourer','Bowyer'].includes(c.values.familyWeaponcrafterType))throw Error('Weaponcrafter: zvolte Armourer nebo Bowyer (HMK p.44)');
  }else{
   if(Object.hasOwn(patch.values??{},'familyWeaponcrafterType')&&patch.values.familyWeaponcrafterType)throw Error('Weaponcrafter specialization je přípustná pouze pro Weaponcrafter (p.44)');
   delete c.values.familyWeaponcrafterType;
  }
  const parentCombat=c.values.familyOccupation;
  const choices=parentCombat==='Man-at-arms (Archer)'?['Archery','Slings']:
   parentCombat==='Man-at-arms (Cavalry)'?['Melee','Archery','Slings','Throwing']:null;
  if(choices){
   if(changed('familyOccupation')&&!Object.hasOwn(patch.values??{},'familyMartialChoice'))delete c.values.familyMartialChoice;
   if(c.values.familyMartialChoice!==undefined&&c.values.familyMartialChoice!==''&&!choices.includes(c.values.familyMartialChoice))throw Error('Nepřípustná specializace Parent Man-at-arms');
   // The printed Cavalry Missile 3 becomes a real p.46 skill explicitly selected from the bounded UI options.
   if(!choices.includes(c.values.familyMartialChoice))throw Error('Family Man-at-arms: zvolte povolený podtyp z nabídky (p.43)');
  }else{
   if(Object.hasOwn(patch.values??{},'familyMartialChoice')&&patch.values.familyMartialChoice)throw Error('Vojenská podvarianta nepatří k Parent Occupation');
   delete c.values.familyMartialChoice;
  }
  const familyVariants=['Priest','Gentry: Priest'].includes(c.values.familyOccupation)?allowedParentPriestVariants(clone):c.values.familyOccupation==='Shaman'?verifiedParentShamanVariants(clone):occupationVariantNames(c.values.familyOccupation);
  if(familyVariants.length){
   if(changed('familyOccupation')&&!Object.hasOwn(patch.values??{},'familyVariantChoice'))delete c.values.familyVariantChoice;
   if(c.values.familyVariantChoice&&!familyVariants.includes(c.values.familyVariantChoice))throw Error('Nepřípustný rodičovský profesní podtyp (pp.42–44)');
   if(!familyVariants.includes(c.values.familyVariantChoice))throw Error('Parent Occupation vyžaduje konkrétní podtyp z pravidlové nabídky (pp.42–44)');
   if(['Priest','Gentry: Priest'].includes(c.values.familyOccupation)&&c.values.familyAuto==='yes'&&!parentPriestRitual(clone,c.values.familyVariantChoice))throw Error('Parent Priest: náboženství nepatří k doloženému pantheonu (p.27,43)');
  }else{
   if(Object.hasOwn(patch.values??{},'familyVariantChoice')&&patch.values.familyVariantChoice)throw Error('Rodinný podtyp nepatří k Parent Occupation');
   delete c.values.familyVariantChoice;
  }
  h.familyOccupation=c.values.familyOccupation;
  // p.43/47: source-backed Family lists are never an optional GM override.
  // Unknown profiles remain explicitly separate for later source review.
  if(familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence)&&c.values.familyAuto!=='yes')
   throw Error('Doložené Parent Occupation vyžaduje Family Skills podle pravidel; režim volného GM výběru nelze použít');
  // An Invoker parent changes the ORIGINAL Talent Possession roll method.
  // Never silently reuse a normal d20 as one of the required four (or vice versa).
  if((previousValues.familyOccupation==='Invoker')!==(h.familyOccupation==='Invoker')&&c.values.arcaneTalentProof){
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'arcane-talent-deactivated',reason:'Parent Invoker changed',previousD20:c.values.arcaneTalentProof.d20,
    previousD20s:c.values.arcaneTalentProof.d20s? [...c.values.arcaneTalentProof.d20s]:undefined});
   invalidateStage('Arcane Talent Skills');
   delete c.completed[12];
  }
  if((changed('familyOccupation')||changed('familyVariantChoice'))&&!Object.hasOwn(patch.values??{},'familyRitualChoice'))delete c.values.familyRitualChoice;
  if(['Priest','Gentry: Priest'].includes(h.familyOccupation)&&parentPriestRitual(clone,c.values.familyVariantChoice))c.values.familyRitualChoice=parentPriestRitual(clone,c.values.familyVariantChoice).religion;
  if(h.familyOccupation==='Shaman'&&c.values.familyAuto==='yes')verifyParentShamanChoice(clone,c.values.familyVariantChoice,c.values.familyRitualChoice);
  if(changed('familyOccupation'))for(const fld of ['familySecondScriptChoice','familyThirdScriptChoice','familyScriptChoice'])if(!Object.hasOwn(patch.values??{},fld))delete c.values[fld];
  if(changed('familyOccupation')||changed('familyWeaponcrafterType')||changed('familyMartialChoice')||changed('familyVariantChoice')||changed('familyAuto')||changed('subsistence')||changed('parentOccupationRoll')){invalidateLaterSkills('Family Skills');invalidateOccupationIfNotAllowed();}
 }
 if(patch.step===8){
  if(['Malákta','Nâdi'].includes(h.folk)){
   if(String(c.values.backgroundRoll??'').trim()!=='')throw Error('Malákta/Nâdi: p.423 přiděluje Wilderness bez hodu Background d100');
   if(c.values.background!=='Wilderness')throw Error('Malákta/Nâdi: Background je vždy Wilderness (p.423)');
  }
  // HMK p.29,33: a non-settled Tribal household always comes from
  // Wilderness; it has no physical Background roll to interpret.
  if(h.society==='Tribal'&&c.values.tribalUnsettled!=='yes')throw Error('Tribal bez Settled má automaticky Rural (Wilderness) (p.29,33)');
  if(h.society==='Tribal'&&String(c.values.backgroundRoll??'').trim()!=='')throw Error('Non-settled Tribal: fyzický Background d100 se nehází (p.33)');
  if(c.values.tribalUnsettled==='yes'&&h.society!=='Tribal')throw Error('Wilderness bez d100 platí pouze pro non-settled Tribal (p.33)');if(c.values.backgroundTensRoll!==undefined&&String(c.values.backgroundTensRoll).trim()!==''&&!String(c.values.backgroundRoll??'').trim())throw Error('City-State druhý d10 vyžaduje hlavní fyzický Background d100');if(c.values.backgroundTensRoll!==undefined&&String(c.values.backgroundTensRoll).trim()!==''&&h.society!=='City-State')throw Error('Druhý d10 na Background platí jen pro City-State (p.28)');if(!['Urban','City','Rural','Wilderness'].includes(c.values.background))throw Error('Vyberte ověřený Background');
  if(c.values.tribalUnsettled==='yes'&&c.values.background!=='Wilderness')throw Error('Unsettled Tribal Background je Wilderness (p.33)');
  if(!String(c.values.backgroundRoll??'').trim()&&!eligibleBackgrounds(clone,c.values).includes(c.values.background))throw Error('Background nepatří mezi platné výsledky Parent Occupation / Society (p.33)');
  if(c.values.parentOccupationProof&&Number(c.values.urbanChance)!==c.values.parentOccupationProof.urbanChance)throw Error('Urban chance nelze změnit mimo pravidlovou Parent Occupation tabulku');
  if(c.values.backgroundRoll!==undefined&&c.values.backgroundRoll!==''&&backgroundFromRoll(c.values.backgroundRoll,c.values.urbanChance,{unsettledTribal:c.values.tribalUnsettled==='yes',society:h.society,cityStateTens:c.values.backgroundTensRoll,folk:h.folk})!==c.values.background)throw Error('Background neodpovídá fyzickému d100 a Urban chance (p.33)');
  h.background=c.values.background;
  if(changed('background')||changed('backgroundRoll'))invalidateLaterSkills('Background Skills');
  if(c.values.parentOccupationProof?.secondaryRollRequired&&c.values.backgroundRoll){
   const title=parentTitleFromBackground(c.values.parentOccupationProof.name,h.society==='City-State'?cityStateBackgroundDie(c.values.backgroundRoll,c.values.backgroundTensRoll).effectiveRoll:c.values.backgroundRoll,{society:h.society});
   c.values.parentTitleProof={name:c.values.parentOccupationProof.name,backgroundRoll:Number(c.values.backgroundRoll),effectiveBackgroundRoll:h.society==='City-State'?cityStateBackgroundDie(c.values.backgroundRoll,c.values.backgroundTensRoll).effectiveRoll:Number(c.values.backgroundRoll),title};h.parentTitle=title;
  }else {delete c.values.parentTitleProof;delete h.parentTitle;}
 }
 if(patch.step===9){const r=normalizeRoll(c.values.estrangementRoll,100);h.estrangement=(r<=10?'Outcast':r<=40?'Unpopular':r<=60?'Accepted':r<=95?'Popular':'Favourite')+' '+r;}
 if(patch.step===10){if(patch.attribute){const x=patch.attribute,proof=evaluateAttributeDice({name:x.name,ageGroup:h.ageGroup,folk:h.folk,kind:clone.kind||'PC',dice:x.dice});
   c.auditEvents??=[];
   const event={sequence:c.auditEvents.length+1,type:'attribute-dice',name:x.name,rolls:[...proof.rolls],score:proof.score};
   c.auditEvents.push(event);
   if(x.name==='aur'&&c.values.arcaneTalentProof&&h.attributes?.aur!==proof.score){
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'arcane-talent-deactivated',reason:'Aura changed',previousD20:c.values.arcaneTalentProof.d20});
    delete c.values.arcaneTalentProof;invalidateStage('Arcane Talent Skills');
   }
   c.attributeProof[x.name]=proof;h.attributes={...(h.attributes||{}),[x.name]:proof.score};
   if(x.name==='aur'&&h.fateML!==undefined&&h.fateML!==fateML(proof.score)){
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-fate-ml-deactivated',reason:'Aura physical dice changed'});
    delete h.fateML;
   }
   }
   else if(ATTRIBUTES.some(key=>!c.attributeProof[key]))throw Error('Nejprve zadejte všech 12 fyzických souborů hodů d6');
   if(patch.voice){
    const proof=evaluateVoiceDice({folk:h.folk,dice:patch.voice.dice});
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'voice-dice',rolls:[...proof.rolls],score:proof.score});
    c.voiceProof=proof;h.attributes={...(h.attributes||{}),voi:proof.score};
   }
   if(patch.advance){
    if(ATTRIBUTES.some(key=>!c.attributeProof?.[key])||!c.voiceProof)throw Error('Morality vyžaduje nejprve dvanáct atributů a Voice.');
    const rolls=patch.moralityDice??[];
    if(rolls.length){
     if(rolls.length!==4||rolls.some(d=>!/^([1-6])$/.test(String(d))))throw Error('HMK p.39: Morality vyžaduje přesně čtyři d6 v rozsahu 1–6.');
     const dice=rolls.map(Number), kept=[...dice].sort((a,b)=>b-a).slice(0,3);
     const folkMod=h.folk==='Kúzhai'?2:h.folk==='Sinái'?4:0;
     const score=kept.reduce((a,b)=>a+b,0)+folkMod;
     const old=c.values.moralityProof;
     if(!old||old.method!=='dice'||old.rolls.join(',')!==dice.join(',')){
      c.auditEvents.push({sequence:c.auditEvents.length+1,type:'morality-dice',rolls:dice,kept,folkModifier:folkMod,score,sourcePage:39});
     }
     c.values.moralityProof={method:'dice',rolls:dice,kept,folkModifier:folkMod,score,sourcePage:39};
     c.values.moralityChoice=score;h.morality=score;
    }else{
     const score=Number(c.values.moralityChoice??c.values.moralityProof?.score);
     if(!Number.isInteger(score)||score<1||score>30)throw Error('HMK p.39: vyberte Morality 1–30 nebo zadejte skutečný hod 4d6.');
     if(c.values.moralityProof?.score!==score||!c.values.moralityProof){
      c.values.moralityProof={method:'chosen',score,sourcePage:39};
      c.auditEvents.push({sequence:c.auditEvents.length+1,type:'morality-selected',score,sourcePage:39});
     }
     c.values.moralityChoice=score;h.morality=score;
    }
   }
 }
 if(patch.step===11){
  // Step 11 sees a fresh canonical in-flight c; never validate against the old clone.hmk.creation.
  h.creation=c;
  // HMK p.42: Invoker requires two already possessed Arcane Talents.
  // The official Talent development remains stage 2/8, but its REAL d20/d100
  // can be resolved before choosing the occupation, with identical proof.
  if(patch.arcaneTalentDice){
   const input=patch.arcaneTalentDice;
   const proof=arcaneProofForCharacter({...clone,hmk:{...h,creation:c}},input);
   c.values.arcaneTalentMode='yes';c.values.arcaneTalentProof=proof;c.skillDP['Arcane Talent Skills']={...proof.grants};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'arcane-talent-physical',d20:proof.d20,d20s:proof.familyInvoker?[...proof.d20s]:undefined,d100s:[...proof.d100s],aura:proof.aura,folk:proof.folk,ageGroup:proof.ageGroup,result:proof.result,grants:{...proof.grants}});
   delete c.completed[12];
  }
  // HMK p.40/42: acquiring prerequisite Arcane Talents must be possible
  // BEFORE any Occupation is selected. This is a valid, audited, non-advance
  // action; do not demand the later Occupational Skills fields yet.
  if(patch.arcaneTalentDice&&!patch.advance&&!String(c.values.occupation??'').trim()){
   h.creation=c;clone.hmk=h;return clone;
  }

  if(changed('occupation'))for(const key of ['occupationScriptChoice','occupationLanguageChoice','occupationRitualChoice','occupationLanguageDistribution','occupationScriptsDistribution','occupationSecondScriptChoice','occupationThirdScriptChoice'])if(!Object.hasOwn(patch.values??{},key))delete c.values[key];
  const chosenJob=OCCUPATIONS[c.values.occupation];
  // HMK pp.42–44,48: a verified occupational table is compulsory, not
  // a user-selectable GM override. Untranscribed jobs retain review mode.
  if(chosenJob&&c.values.occupationAuto!=='yes')
   throw Error('Doložené Occupation vyžaduje automatické Occupational DP z tištěné tabulky (p.48)');
  const priestReligion=priestReligionOf(c.values.occupation);
  if(priestReligion&&c.values.occupationAuto==='yes'){
   if(c.values.occupationRitualChoice!==priestReligion)throw Error('Priest: Ritual musí odpovídat doloženému náboženství');
   if(!c.values.occupationScriptChoice)throw Error('Priest: vyberte konkrétní Script');
   if(priestReligion==='Môrgath'&&c.values.occupationScriptChoice==='Nùvesârl')throw Error('Môrgath: základní Script se nesmí zaměnit s přídavným Nùvesârl');
  }
  if(c.values.occupationAuto==='yes'&&(c.values.occupation?.startsWith('Shaman (')||c.values.occupation?.startsWith('Invoker (Tribal: '))){
   if(!c.values.occupationRitualChoice||!religionChoices(clone).includes(c.values.occupationRitualChoice))throw Error('Shaman/Tribal Invoker: konkrétní Ritual musí být doložený v Pantheonu');
  }
  if(c.values.occupationAuto==='yes'&&!isArcaneOccupationEligible(clone,c.values.occupation))throw Error('Profese vyžaduje doložené fyzicky získané Arcane Talenty a subsistenci');

  for(const [kind,options,field] of [['Script',SCRIPTS,'occupationScriptChoice'],['Language',languageChoices(clone),'occupationLanguageChoice'],['Ritual',religionChoices(clone),'occupationRitualChoice']]){
   const chosen=c.values[field];
   if(chosen&&(!chosenJob||!Object.keys(chosenJob.skills).some(k=>k===kind||(kind==='Language'&&k==='Native Language'))||!options.includes(chosen)))throw Error('Nepřípustná profesní specializace '+field);
  }
  for(const [printed,field] of [['2nd Script','occupationSecondScriptChoice'],['3rd Script','occupationThirdScriptChoice']]){
   const name=c.values[field];
   if(name&&(!chosenJob?.skills?.[printed]||!SCRIPTS.includes(name)))throw Error('Neplatná specializace '+printed);
   if(c.values.occupationAuto==='yes'&&chosenJob?.skills?.[printed]&&!name)throw Error('Povolání vyžaduje výběr konkrétního '+printed);
  }
  // A printed Language, Script(s), or Ritual is a real named skill,
  // never a literal unassigned generic entry on the Character Sheet.
  // The player chooses one from a bounded catalogue or allocates the
  // original plural DP pool; the engine must not invent a choice.
  if(c.values.occupationAuto==='yes'&&chosenJob){
   const o=chosenJob.skills;
   if(o.Script&&!c.values.occupationScriptChoice)throw Error('Occupation Script: vyberte konkrétní písmo z Appendix II (p.47)');
   if(o.Scripts&&!c.values.occupationScriptChoice&&!c.values.occupationScriptsDistribution)throw Error('Occupation Scripts: vyberte písmo nebo rozdělte tištěný pool (p.47)');
   if(o.Language&&!c.values.occupationLanguageChoice&&!c.values.occupationLanguageDistribution)throw Error('Occupation Languages: vyberte konkrétní jazyk nebo rozdělte tištěné DP (p.47)');
   if(o.Ritual&&!c.values.occupationRitualChoice)throw Error('Occupation Ritual: vyberte konkrétní náboženství z doloženého panteonu (p.47)');
  }
  if(c.values.occupationAuto==='yes'&&chosenJob?.skills?.['2nd Script']&&(!c.values.occupationScriptChoice||c.values.occupationSecondScriptChoice===c.values.occupationScriptChoice))throw Error('Druhé písmo musí být odlišné od prvního Script');
  if(c.values.occupationAuto==='yes'&&chosenJob?.skills?.['3rd Script']&&(!c.values.occupationSecondScriptChoice||[c.values.occupationScriptChoice,c.values.occupationSecondScriptChoice].includes(c.values.occupationThirdScriptChoice)))throw Error('Třetí písmo musí být odlišné od prvního i druhého');
  // Validate complete plural pools when provided; do not invent DP or allow
  // an unprinted "Scripts" pool for a singular printed Script entry.
  for(const [field,printed,type,singularChoice] of [['occupationLanguageDistribution','Language','Language','occupationLanguageChoice'],['occupationScriptsDistribution','Scripts','Script','occupationScriptChoice']]){
   const raw=c.values[field];if(raw===undefined||raw==='')continue;
   if(!chosenJob||!Number.isSafeInteger(chosenJob.skills[printed]))throw Error('Profese nemá tištěný příděl '+printed+' pro vícečetné rozdělení');
   if(c.values[singularChoice])throw Error('Nelze kombinovat jednu specializaci a vícečetné rozdělení');
   parseOccupationDistribution(clone,raw,type,chosenJob.skills[printed]);
  }
  if(changed('occupationScriptChoice')||changed('occupationLanguageChoice')||changed('occupationRitualChoice')||changed('occupationLanguageDistribution')||changed('occupationScriptsDistribution')||changed('occupationSecondScriptChoice')||changed('occupationThirdScriptChoice'))invalidateStage('Occupation Skills');
  if(chosenJob&&c.values.occupationAuto==='yes'){
   const active=occupationalSpecializations(clone,c.values,chosenJob.skills);
   for(const key of Object.keys(active))if(parseInstance(key)&&!validInstance(clone,key))throw Error('Specializace není povolena pro tuto postavu');
  }
  if(!String(c.values.occupation??'').trim())throw Error('Určete Occupation');
  const possible=eligibleOccupations(clone);
  if(possible.length&&!possible.includes(c.values.occupation))throw Error('Occupation není dostupná pro Parent Social Class a Society (HMK pp.35,41)');
  clone.occupation=c.values.occupation;
  if(changed('occupation')||changed('occupationAuto'))invalidateLaterSkills('Occupation Skills');
  if(c.values.occupationAuto==='yes'){
   const o=OCCUPATIONS[clone.occupation];if(!o)throw Error('Toto povolání zatím nemá úplnou ověřenou Occupational Skills tabulku');
   c.skillDP['Occupation Skills']={...o.skills};c.values.occupationProof={name:clone.occupation,die:o.die,skills:{...o.skills},sourcePage:OCCUPATION_PAGES[clone.occupation]??42};
  }else delete c.values.occupationProof;
 }
 if(patch.step===12){
   if(patch.gmBonusLanguageUpdate){
    const {decision,distribution=''}=patch.gmBonusLanguageUpdate;
    const proof=gmLanguageProof(clone,decision,distribution);
    c.values.gmBonusLanguageProof=proof;
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'gm-bonus-language-decision',proof:structuredClone(proof)});
    delete c.completed[12];c.status='in-progress';
   }
   const stage=SKILL_STAGES[c.skillStage];
   // HMK pp.40,45–49: physical evidence and native skills are not
   // optional GM modes. A genuine GM choice (bonus language DP) remains.
   if(stage==='Folk Skills'&&nativeLanguageDP(clone)>0&&c.values.nativeSkillsMode!=='yes')
    throw Error('Native Language DP podle p.47 jsou povinné, nelze je vypnout');
   if(stage==='Folk Skills'&&['Kúzhai','Sinái'].includes(h.folk)&&c.values.folkAuto!=='yes')
    throw Error('Folk Skills vyžadují fyzické d10 (p.45), GM režim není náhradou');
   if(stage==='Arcane Talent Skills'&&c.values.arcaneTalentMode!=='yes')
    throw Error('Arcane Talent Possession vyžaduje fyzický d20 a případné d100 (p.40)');
   if(stage==='Veteran Skills'&&veteranRoundCount(h.folk,h.ageGroup)>0&&c.values.veteranRoundsMode!=='yes')
    throw Error('Veteran Skills vyžadují samostatná kola 5 DP (p.49)');
   if(stage==='Background Skills'&&c.values.backgroundAuto!=='yes')
    throw Error('Background Skills musí použít tištěné tabulky (p.48)');
   if(stage==='Occupation Skills'&&OCCUPATIONS[clone.occupation]&&c.values.occupationAuto!=='yes')
    throw Error('Doložené Occupation Skills nelze přeskočit ani při úpravě starší postavy');
   if((changed('familyScriptChoice')||changed('familySecondScriptChoice')||changed('familyThirdScriptChoice'))&&stage==='Family Skills'){
    delete c.completed[12];c.status='in-progress';
   }
   if(h.birthRegion==='Karéjia'&&h.folk==='Human'&&c.values.nativeSkillsMode==='no')throw Error('Karéjia p.419: tři rodné Ritualy jsou povinné, nelze je vypnout');
   if(c.values.nativeSkillsMode==='yes')nativeRitualGrants(clone,c.values,{strict:patch.advance&&stage==='Folk Skills'});
   // Even when nativeSkillsMode is disabled for a legacy record, never accept
   // fabricated religion keys or a duplicated Karéjian triad.
   if(c.values.nativeRitualChoice||c.values.nativeRitualChoice2||c.values.nativeRitualChoice3)nativeRitualGrants(clone,c.values,{strict:false});
   if(stage==='Arcane Talent Skills'&&patch.arcaneTalentDice){
    const input=patch.arcaneTalentDice;
    const proof=arcaneProofForCharacter({...clone,hmk:{...h,creation:c}},input);
    c.values.arcaneTalentMode='yes';c.values.arcaneTalentProof=proof;
    c.skillDP[stage]={...proof.grants};
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'arcane-talent-physical',d20:proof.d20,d20s:proof.familyInvoker?[...proof.d20s]:undefined,d100s:[...proof.d100s],aura:proof.aura,folk:proof.folk,ageGroup:proof.ageGroup,result:proof.result,grants:{...proof.grants}});
   }
   if(stage==='Folk Skills'&&patch.folkSkillDice){
    const result=folkSkillsFromDice(h.folk,patch.folkSkillDice);
    c.values.folkSkillProof=result;c.skillDP[stage]={...result.skills};
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'folk-skill-dice',folk:result.folk,rolls:[...result.rolls],skills:{...result.skills}});
   }
   if(patch.skillAllocation){const {skillName,dp}=patch.skillAllocation;
    const def=skillDefinition(clone,skillName);
    if(!def||!Number.isSafeInteger(dp)||dp<0||dp>20)throw Error('Neplatná alokace DP');
    if(!eligibleSkills(clone,stage).includes(skillName))throw Error('Dovednost není pro toto stadium a předchozí volby dostupná (HMK pp.45–49)');
    if(stage==='Background Skills'&&h.background==='City'&&parseInstance(skillName)?.type==='Language')throw Error('City Background: použijte pouze základní Language DP a zvláštní Languages 3× pool');
    if(stage==='Optional Skills'&&dp>2&&!(/^Language \(/.test(skillName)))throw Error('Optional Skills: nejvýše 2 DP při první výuce, jinak 1 DP (p.48)');
    if(stage==='Optional Skills'&&dp>1&&parseInstance(skillName)?.type!=='Language'&&priorSkillDevelopment({...clone,hmk:{...h,creation:c}},skillName,stage)>0)throw Error('Optional Skills: již vyvinutý Skill (včetně konkrétního Script/Ritual) má limit 1 DP (p.48)');
    if(stage==='Optional Skills'&&def.group==='Esoterica'&&def.baseSM+SKILL_STAGES.slice(0,5).reduce((total,group)=>total+(c.skillDP[group]?.[skillName]??0),0)<1)throw Error('Esoterica Skill nesmí poprvé vzniknout v Optional Skills (p.48)');
    if(stage==='Folk Skills'&&c.values.folkAuto==='yes'&&['Kúzhai','Sinái'].includes(h.folk))throw Error('Folk Skills jsou určeny fyzickými d10, nelze ručně měnit');
    if(stage==='Family Skills'&&['2nd Script','3rd Script'].includes(skillName)){
     const fld=skillName==='2nd Script'?'familySecondScriptChoice':'familyThirdScriptChoice';
     const choice=c.values[fld],parent=familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence);
     if(dp>0&&(!parent?.skills?.[skillName]||!SCRIPTS.includes(choice)))throw Error('Rodinný druhý/třetí Script vyžaduje konkrétní písmo');
     const selected=[c.values.familyScriptChoice,c.values.familySecondScriptChoice,c.values.familyThirdScriptChoice].filter(Boolean);
     if(new Set(selected).size!==selected.length)throw Error('Rodinná písma musí být navzájem odlišná');
    }
    if(stage==='Family Skills'&&c.values.familyAuto==='yes'){
     const parent=familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence);if(!parent)throw Error('Parent Occupation nemá ověřený profesní podtyp (p.44)');
     if(['Priest','Gentry: Priest','Shaman'].includes(h.familyOccupation)){const ritual=['Priest','Gentry: Priest'].includes(h.familyOccupation)?parentPriestRitual(clone,c.values.familyVariantChoice):parentShamanRitual(clone,c.values.familyRitualChoice);if(ritual&&(skillName==='Ritual'||parseInstance(skillName)?.type==='Ritual'&&skillName!==ritual.skill))throw Error('Parent Priest/Shaman: Family Ritual musí odpovídat vybranému náboženství');}
     const kind=parseInstance(skillName)?.type;const printed=(kind==='Ritual'||kind==='Script'||kind==='Language')?kind:skillName;
     if(dp>familySkillCap(parent,skillName)&&!(skillName===printed&&dp===0))throw Error('Family DP nesmí překročit polovinu Parent Occupation DP (p.47)');
    }
    if(stage==='Background Skills'&&c.values.backgroundAuto==='yes'){
     if(skillName==='Ritual')throw Error('HMK p.343: zvolte konkrétní Ritual náboženství Émhlè');
     if(!availableBackgroundSkills(h.background,{folk:h.folk,viking:c.values.viking==='yes'||h.society==='Viking',emhle:isTribalEmhle(clone)}).includes(parseInstance(skillName)?.type??skillName))throw Error('Tento Skill není v doložené Background tabulce (p.46)');
    }
    if(stage==='Arcane Talent Skills'&&c.values.arcaneTalentMode==='yes')throw Error('Arcane Talent DP určují fyzické d20/d100 (p.40,47), ne ruční rozdělení');
    if(stage==='Occupation Skills'&&c.values.occupationAuto==='yes')throw Error('Occupational Skills se přidělují automaticky podle p.42–44');
    if(stage==='Veteran Skills'&&c.values.veteranRoundsMode==='yes'){
     const count=veteranRoundCount(h.folk,h.ageGroup),which=Number(patch.skillAllocation.veteranRound??c.values.veteranRound??1);
     if(!count)throw Error('Young nemá Veteran DP');
     if(!Number.isSafeInteger(which)||which<1||which>count)throw Error('Veteran: neplatné číslo kola');
     const previous=c.values.veteranRoundProof??Array.from({length:count},()=>({}));
     if(previous.length!==count)throw Error('Veteran: změnila se věková skupina; potvrďte DP znovu');
     const rounds=structuredClone(previous);rounds[which-1][skillName]=dp;
     const combined=veteranRoundsProof({...clone,hmk:{...h,creation:c}},rounds,skillDefinition,SKILL_STAGES,{priorPoints:name=>priorSkillDevelopment({...clone,hmk:{...h,creation:c}},name,'Veteran Skills')});
     c.values.veteranRoundProof=rounds;c.values.veteranRound=String(which);
     c.skillDP[stage]=combined;
     delete c.completed[12];c.status='in-progress';
    }else{
    const nextStage={...(c.skillDP[stage]??{}),[skillName]:dp};
    const total=Object.values(nextStage).reduce((n,x)=>n+x,0);
    if(stage==='Family Skills'&&c.values.familyAuto==='yes'&&total>5)throw Error('Family Skills mají rozpočet 5 DP (p.47)');
    if(stage==='Family Skills'&&c.values.familyAuto==='yes'&&!validateFamilySkillAllocation(familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence),nextStage))throw Error('Family DP překračují sdílenou půlku profesních Languages/Scripts nebo jiný limit (p.47)');
    if(['Background Skills','Optional Skills'].includes(stage)&&total>5)throw Error('Toto stadium má nejvýše 5 DP');
   if(stage==='Background Skills'&&!availableBackgroundSkills(h.background,{folk:h.folk,viking:c.values.viking==='yes'||h.society==='Viking',emhle:isTribalEmhle(clone)}).includes(parseInstance(skillName)?.type??skillName))throw Error('Background DP mimo ověřenou tabulku');
   if(stage==='Background Skills'&&dp>2)throw Error('Background Skill může dostat nejvýše 2 DP (p.48)');
    if(stage==='Veteran Skills'){
      const available=['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
      if(total>available)throw Error(`Veteran Skill přesahuje ${available} DP (p.49)`);
      // HMK p.49: max two DP only when this skill has no previous DP;
      // otherwise one, separately in each five-DP Veteran pool.
      const prior=priorSkillDevelopment({...clone,hmk:{...h,creation:c}},skillName,'Veteran Skills');
      if(dp>1&&prior>0)throw Error('Veteran Skill se staršími DP může dostat nejvýše 1 DP (p.49)');
      if(dp>2)throw Error('Veteran Skill může dostat nejvýše 2 DP (p.49)');
    }
    if(stage==='Sunsign Skills'){
      const prior=priorSkillDevelopment({...clone,hmk:{...h,creation:c}},skillName,'Sunsign Skills');
      if(dp>1&&prior>0&&parseInstance(skillName)?.type!=='Language')throw Error('Sunsign Skill se staršími DP může dostat nejvýše 1 DP (p.49)');
      if(dp>2&&parseInstance(skillName)?.type!=='Language')throw Error('Sunsign Skill může dostat nejvýše 2 DP (p.49)');
      const proof=c.values.sunsignProof;if(!proof)throw Error('Před Sunsign DP je nutný fyzický birthday d12/d30');
      const allowed=proof.dp.find(x=>x.group===def.group)?.value??0;
      const groupTotal=Object.entries(nextStage).reduce((n,[skill,points])=>n+(skillDefinition(clone,skill)?.group===def.group?points:0),0);
      if(groupTotal>allowed)throw Error(`${def.group}: Sunsign dovoluje jen ${allowed} DP (p.23)`);
      if(def.group==='Esoterica')throw Error('Sunsign Skill DP patří do mundane Skill Groups (p.23)');
    }
    c.skillDP[stage]=nextStage;
    }
   }
   if(stage==='Background Skills'&&c.values.backgroundCityLanguageDistribution){
    const paid=c.skillDP['Background Skills']?.Language??0;
    if(h.background!=='City'||paid<1||paid>2)throw Error('City Background Languages vyžaduje 1 nebo 2 základní DP do Language');
    parseOccupationDistribution(clone,c.values.backgroundCityLanguageDistribution,'Language',3*paid);
   }
   if(patch.advance){
      const sum=Object.values(c.skillDP[stage]??{}).reduce((n,x)=>n+x,0);
      if(stage==='Arcane Talent Skills'&&c.values.arcaneTalentMode==='yes'&&!c.values.arcaneTalentProof)throw Error('Arcane Talent: GM musí zadat fyzický d20 a případné d100 (p.40)');
      if(stage==='Folk Skills'&&c.values.folkAuto==='yes'&&['Kúzhai','Sinái'].includes(h.folk)&&!c.values.folkSkillProof)throw Error('Povinné fyzické d10 Folk Skill hody (p.45)');
      if(stage==='Family Skills'&&c.values.familyAuto==='yes'&&sum!==5)throw Error('Family Skills musí přesně rozdělit 5 DP (p.47)');
      if(stage==='Optional Skills'&&sum!==5)throw Error('Optional Skills: přidělte přesně 5 DP (p.48)');
      if(stage==='Background Skills'&&h.background==='City'&&(c.skillDP[stage]?.Language??0)>0&&!c.values.backgroundCityLanguageDistribution)throw Error('City Background: rozdělte 3 DP na každé přidělené Language DP (p.48)');
      if(stage==='Background Skills'&&sum!==5)throw Error('Background Skills: přidělte přesně 5 DP (p.48)');
      if(stage==='Veteran Skills'&&c.values.veteranRoundsMode==='yes'){
       const count=veteranRoundCount(h.folk,h.ageGroup);
       const rounds=c.values.veteranRoundProof??Array.from({length:count},()=>({}));
       const result=veteranRoundsProof({...clone,hmk:{...h,creation:c}},rounds,skillDefinition,SKILL_STAGES,{complete:true,priorPoints:name=>priorSkillDevelopment({...clone,hmk:{...h,creation:c}},name,'Veteran Skills')});
       if(JSON.stringify(result)!==JSON.stringify(c.skillDP['Veteran Skills']??{}))throw Error('Veteran: nesouhlasí souhrn obou kol');
      }
      if(stage==='Veteran Skills'){
       const required=['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
       if(sum!==required)throw Error(`Veteran Skills: přidělte přesně ${required} DP (p.49)`);
      }
      if(stage==='Sunsign Skills'){
       const proof=c.values.sunsignProof;if(!proof)throw Error('Chybí Sunsign DP');
       for(const x of proof.dp){const used=Object.entries(c.skillDP[stage]??{}).reduce((n,[skill,points])=>n+(skillDefinition(clone,skill)?.group===x.group?points:0),0);
        if(used!==x.value)throw Error(`${x.group}: Sunsign DP musí být rozděleny ${x.value}, aktuálně ${used}`);}
      }
   }
 }
 if(patch.step===13){
  // A verified PC has no GM-only Wealth shortcut; p.51 requires physical
  // dice. Manual review remains only when a printed die is unavailable.
  const printedParent=printedParentWealthDie(h.familyOccupation,h.parentTitle,h.socialClass);
  const printedOwn=priestReligionOf(clone.occupation)?null:occupationWealthDie(clone.occupation,h.socialClass);
  if((clone.kind??'PC')==='PC'){
   delete c.values.wealthAdvantage; // prevent legacy opt-out from masquerading as a rule
   if(printedParent!==null&&(printedOwn!==null||priestReligionOf(clone.occupation))&&!patch.wealthDice)
    throw Error('HMK p.51: u doložených PC Wealth kostek zadejte fyzické hody; Priest vyžaduje nejprve doložený Ritual ML (p.55), nikoli GM součet');
  }
  let standing;
  if(patch.wealthDice){
   const r=patch.wealthDice;const estr=String(h.estrangement??'').split(' ')[0];
   // HMK v1.2 p.51: PC Wealth Advantage is a rule, not an arbitrary
   // GM opt-out. Keep the pure dice evaluator configurable for NPC tools.
   if((clone.kind??'PC')==='PC'&&r.advantage===false)throw Error('PC Wealth Advantage je podle HMK p.51 povinná');
   const parentPrintedDie=printedParentWealthDie(h.familyOccupation,h.parentTitle,h.socialClass);
   if(parentPrintedDie!==null&&Number(r.parentDie)!==parentPrintedDie)throw Error('Family Wealth musí mít tištěnou velikost kostky Parent Occupation / Noble title (p.51)');
   if(priestReligionOf(clone.occupation)){
    const rel=priestReligionOf(clone.occupation),row=calculateSheetSkills(clone).find(x=>x.name===instanceKey('Ritual',rel));
    if(!row||row.ml===null||row.ml<20)throw Error('Priest Wealth vyžaduje doložený Ritual ML20 pro Clergy (HMK str.55)');
    const circle=ritualFollowerFromML(row.ml,{clergy:true}).circle;
    if(Number(r.occupationDie)!==2*circle)throw Error('Priest Wealth: velikost d musí odpovídat Circle × 2 (str.51)');
   }
   const result=evaluateWealthDice({estrangement:estr,ageGroup:h.ageGroup,folk:h.folk,occupation:clone.occupation,
    occupationDie:r.occupationDie,parentDie:r.parentDie,familyRolls:r.familyRolls,occupationRolls:r.occupationRolls,advantage:r.advantage!==false,socialClass:h.socialClass});
   c.values.wealth=String(result.wealth);c.values.wealthProof=result;
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'wealth-dice',familyRolls:[...result.familyRolls],occupationRolls:[...result.occupationRolls],parentDie:result.parentDie,occupationDie:result.occupationDie,advantage:result.advantage,wealth:result.wealth});
   standing=result;
  }else{
   const wealth=Number(c.values.wealth);if(!Number.isInteger(wealth)||wealth<0||wealth>999)throw Error('Neplatný GM potvrzený Wealth');
   delete c.values.wealthProof;standing=standingFromWealth(wealth);
  }
  h.standing=String(standing.wealth);h.lifestyle=standing.lifestyle;h.wealth=standing.wealth;h.coinsPence=standing.coinsPence;h.possessionsBudgetPence=standing.possessionsPence;
 }
 if(patch.step===14){
  // HMK p.53: Fate Points are a PC-only mechanic.
  if((clone.kind??'PC')==='PC'){h.fatePoints=5;h.fateML=fateML(h.attributes?.aur);if(h.fateML===null)throw Error('Fate vyžaduje ověřený Aura atribut');}
  else {delete h.fatePoints;delete h.fateML;}
  const m=patch.mysteries??{};
  // HMK p.40: every generated PC receives a Grace d20. A prior physical
  // proof can be reused, but an absent result must not be silently skipped.
  if(m.graceDie!==undefined){
   const proof=graceFromDie(m.graceDie);
   h.divineGrace={...proof};c.values.graceProof={...proof};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'grace-d20',roll:proof.roll,result:proof.grace,marked:proof.marked});
  }
  if(c.values.graceProof){
   const choice=m.graceAspect??(m.graceDie!==undefined&&c.values.graceProof.roll<15?'':c.values.graceAspect??'');
   const aspect=divineAspectFromChoice(c.values.graceProof,choice);
   if(aspect){
    if(c.values.graceAspect!==choice || c.auditEvents.filter(e=>e.type==='grace-aspect-choice'||e.type==='grace-aspect-deactivated').at(-1)?.aspect!==choice || c.auditEvents.filter(e=>e.type==='grace-aspect-choice'||e.type==='grace-aspect-deactivated').at(-1)?.type!=='grace-aspect-choice'){c.auditEvents.push({sequence:c.auditEvents.length+1,type:'grace-aspect-choice',aspect:choice,sourcePage:310});}
    c.values.graceAspect=choice;h.divineAspect=aspect;
   }else{if(c.values.graceAspect){c.auditEvents.push({sequence:c.auditEvents.length+1,type:'grace-aspect-deactivated',aspect:c.values.graceAspect,reason:'Grace changed'});}delete c.values.graceAspect;delete h.divineAspect;}
  }
  if(patch.advance&&(clone.kind??'PC')==='PC'&&!c.values.graceProof)throw Error('HMK p.40: před dokončením je povinný fyzický Grace d20');
  // Starting Psyche is deliberately separate from spell/morale Psyche Stress.
  if(m.psyche){
   const proof=creationPsycheFromPhysical({folk:h.folk,ageGroup:h.ageGroup,...m.psyche});
   c.values.psycheProof=proof;h.psyche=proof.traits.length?proof.traits.map(x=>x.intensity+': '+x.trait).join('; '):'None';
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-psyche',proof:structuredClone(proof)});
  }
  const count=creationPsycheCount(h.folk,h.ageGroup);
  if(patch.advance&&(clone.kind??'PC')==='PC'&&count!==null&&!c.values.psycheProof)throw Error('HMK p.40: chybí povinné fyzické Psyche d20 a případné konkrétní Traity');
  if(patch.advance&&(clone.kind??'PC')==='PC'&&count===null)c.values.psycheRuleReview='HMK p.40: počet hodů pro tento Folk není explicitní';
  else delete c.values.psycheRuleReview;
  // Ritual and Pvârism ML are DERIVED from the same Character Sheet skills;
  // no independent user-typed number can become a second authority.
  const skills=calculateSheetSkills(clone);
  const selectedRitual=m.ritualSkill??c.values.mysteriesRitualSkill;
  if(selectedRitual){
   const row=skills.find(x=>x.name===selectedRitual&&x.name.startsWith('Ritual ('));
   if(!row||!Number.isInteger(row.ml)||row.ml<1)throw Error('Vybraný Ritual nemá ověřený ML v Character Sheet');
   if(m.ritualML!==undefined&&Number(m.ritualML)!==row.ml)throw Error('Ritual ML nesouhlasí s autoritativní Skill hodnotou');
   const religion=selectedRitual.slice('Ritual ('.length,-1);
   const provenWestern=Object.hasOwn(VERIFIED_WEST_DOCTRINES,religion);
   const covenant=Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,religion);
   const provenDoctrine=provenWestern||covenant;
   const isClergy=covenant?row.ml>=60:!!m.clergy;
   const isFighting=covenant?row.ml>=30&&row.ml<60:!!m.fightingOrder;
   const morality=m.morality!==undefined&&m.morality!==''?Number(m.morality):c.values.moralityChoice!==undefined?Number(c.values.moralityChoice):null;
   let orthodoxyPenalty=Number(m.orthodoxyPenalty??0);
   if(provenDoctrine&&morality!==null){
    orthodoxyPenalty=moralityOrthodoxyPenalty(religion,morality);
    if(m.orthodoxyPenalty!==undefined&&Number(m.orthodoxyPenalty)!==orthodoxyPenalty)throw Error('Morality a Orthodoxy musí být vypočtené z náboženského intervalu, ne ruční penalty');
    if(c.values.moralityProof?.score!==morality){
     c.values.moralityProof={method:'chosen',score:morality,sourcePage:39};
     c.auditEvents.push({sequence:c.auditEvents.length+1,type:'morality-selected',score:morality,sourcePage:39});
    }
    c.values.moralityChoice=morality;h.morality=morality;
   }
   if(patch.advance&&provenDoctrine&&morality===null&&(clone.kind??'PC')==='PC')throw Error('HMK p.39,55: vyberte skutečnou Morality; Orthodoxy a Piety se vypočítají');
   const result=ritualFollowerFromML(row.ml,{clergy:isClergy,fightingOrder:isFighting,orthodoxyPenalty});
   h.religiousStatus={...result,ritualML:row.ml,clergy:isClergy,fightingOrder:isFighting,orthodoxyPenalty,ritualSkill:selectedRitual};
   if(m.doctrineSubjects!==undefined||m.morality!==undefined){
    if(!provenDoctrine){
     if(m.doctrineSubjects?.length)throw Error('Pro dané místní náboženství neexistuje přepsaná tabulka Doctrine; nevymýšlejte Subjects');
     c.values.religionNeedsReview=true;
    }else{
     const meleeml=skills.find(x=>x.name==='Melee')?.ml??0,initiativeml=skills.find(x=>x.name==='Initiative')?.ml??0;
     const proof=validateStartingReligion({religion,morality,ritualML:row.ml,occupation:clone.occupation,clergy:isClergy,fightingOrder:isFighting,meleeML:meleeml,initiativeML:initiativeml,subjects:m.doctrineSubjects??[]});
     if(covenant)h.religiousStatus={...h.religiousStatus,circle:proof.circle,ceremony:proof.ceremony,maxPiety:proof.maxPiety,blessingBonus:proof.blessingBonus};
     c.values.startingDoctrineProof=proof;h.startingDoctrine={...proof};delete c.values.religionNeedsReview;
     c.auditEvents.push({sequence:c.auditEvents.length+1,type:'starting-doctrine-choice',proof:structuredClone(proof)});
    }
   }
   if(patch.advance&&provenDoctrine&&(clone.kind??'PC')==='PC'&&!c.values.startingDoctrineProof)throw Error('HMK p.55: vyberte všechny povolené Doctrine Subjects; max Piety určuje jejich počet');
   c.values.mysteriesProof={...h.religiousStatus};c.values.mysteriesRitualSkill=selectedRitual;
  }else if(m.ritualML!==undefined)throw Error('Ritual ML vyžaduje konkrétní Ritual Skill z nabídky');
  else {delete h.religiousStatus;delete c.values.mysteriesProof;delete c.values.mysteriesRitualSkill;delete h.startingDoctrine;delete c.values.startingDoctrineProof;delete c.values.religionNeedsReview;}
  const pvarism=skills.find(x=>x.name==='Pvârism');
  const actualPvarism=(pvarism?.totalDP??0)>0?pvarism.ml:null;
  if(m.pvarismML!==undefined&&m.pvarismML!==''&&Number(m.pvarismML)!==actualPvarism)throw Error('Pvârism ML nesouhlasí s vypočtenou Pvârism Skill');
  if(Number.isInteger(actualPvarism)&&actualPvarism>=0){
   const proof=arcaneStartingResearch(actualPvarism,h.ageGroup,h.folk);
   c.values.arcaneResearchProof=proof;h.startingArcaneResearch={...proof};
  }else{delete c.values.arcaneResearchProof;delete h.startingArcaneResearch;}
  // p.269: physical preparation took place before play; only choose printed 35 names.
  const alchemy=skills.find(x=>x.name==='Alchemy');
  const alchemyML=(alchemy?.totalDP??0)>0?alchemy.ml:0;
  if(m.elixirs!==undefined){
   const proof=validateStartingElixirs({alchemyML,choices:m.elixirs});
   c.values.startingElixirProof=proof;h.startingElixirs={...proof};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'starting-elixirs-choice',proof:structuredClone(proof)});
  }
  if(patch.advance&&(clone.kind??'PC')==='PC'&&alchemyML>=60&&!c.values.startingElixirProof)throw Error('HMK p.269: vyberte počáteční elixíry podle aktuálního Alchemy ML');
  if(alchemyML<60){delete c.values.startingElixirProof;delete h.startingElixirs;}
  // p.54 eight steps; the 204 entries are the exact list on p.211.
  if(m.pvarSpells!==undefined){
   if(!c.values.arcaneResearchProof)throw Error('Shèk-Pvâr: chybí Pvârism ARP');
   const input={occupation:clone.occupation,pvarismML:actualPvarism,primary:m.pvarPrimary,chantryStars:Number(m.chantryStars),choices:m.pvarSpells,artefacts:m.pvarArtefacts??[],naturalAttunement:!!c.values.arcaneTalentProof?.generated?.includes('Natural Attunement'),chantryConvocation:m.pvarChantryConvocation??m.pvarPrimary,homeChantry:m.pvarChantryName??'',chantryId:m.pvarChantryId,guildRank:m.pvarGuildRank??'',attunedObject:m.pvarAttunedObject??'',startingARP:c.values.arcaneResearchProof.startingARP};
   if(patch.advance&&(clone.kind??'PC')==='PC'&&(!input.homeChantry?.trim()||!input.guildRank||!input.attunedObject?.trim()))throw Error('HMK p.54: zvolte domovskou chantry, Guild Rank z nabídky a vlastní attuned elemental object');
   const proof=validateStartingPvarSpells(input);
   c.values.startingPvarSpellsProof=proof;h.startingPvarSpells={...proof};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'starting-pvar-spells-choice',proof:structuredClone(proof)});
  }
  if(patch.advance&&(clone.kind??'PC')==='PC'&&String(clone.occupation??'').startsWith('Shèk-Pvâr (')&&!c.values.startingPvarSpellsProof)throw Error('HMK p.54: chybí explicitní výběr kouzel a ARP nákladů Shèk-Pvâr');
  if(!String(clone.occupation??'').startsWith('Shèk-Pvâr (')){delete c.values.startingPvarSpellsProof;delete h.startingPvarSpells;}
  // A Shaman may choose stored Spirit Powers after a successful starting
  // astral journey (p.53). The burden may not exceed the printed Spirit
  // Index (p.300). This records choices, not their runtime bonuses.
  if(m.spiritPowers!==undefined){
   const spirit=skills.find(x=>x.name==='Spirit');
   const proof=validateStartingSpiritPowers({occupation:clone.occupation,spiritML:spirit?.ml,powers:m.spiritPowers,languages:(h.regionalLanguages??[]).concat(h.nativeLanguage?[h.nativeLanguage]:[])});
   c.values.spiritPowerProof=proof;h.startingSpiritPowers={...proof};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'creation-spirit-powers-choice',proof:structuredClone(proof)});
  }
  if(patch.advance&&clone.occupation?.startsWith('Shaman (')&&!c.values.spiritPowerProof){
   throw Error('Shaman: vyberte počáteční Spirit Powers nebo výslovně potvrďte prázdný seznam podle Spirit Index');
  }
  if(m.shamanTradition!==undefined){
   const proof=validateShamanTradition({occupation:clone.occupation,tradition:m.shamanTradition,clanTotem:m.shamanKathTotem??'',powers:c.values.spiritPowerProof?.powers??[]});
   c.values.shamanTraditionProof=proof;h.shamanTradition={...proof};
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'shaman-tradition-choice',proof:structuredClone(proof),powers:structuredClone(c.values.spiritPowerProof?.powers??[])});
  }
  if(patch.advance&&(clone.kind??'PC')==='PC'&&String(clone.occupation??'').startsWith('Shaman (')&&!c.values.shamanTraditionProof)throw Error('HMK p.301: vyberte doloženou shaman tradition / Other');
  if(patch.advance)c.values.mysteriesCreationVersion=2;
 }
 // Switching a previously rolled choice back to a deliberate manual choice
 // does not erase the earlier physical roll. A separate audit event revokes
 // its authority for this field; future dice create a new later event.
 const rolledFields={1:['folkRoll'],2:['ageRoll'],4:['traitRoll','traitRollSecondary'],5:['venariveRoll','regionRoll','nativeLanguageRoll','regionSubRoll','regionDialectRoll','regionTribeRoll'],6:['classRoll'],7:['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll'],8:['backgroundRoll','backgroundTensRoll']}[patch.step]??[];
 for(const field of rolledFields){
  if(changed(field)&&previousValues[field]!==undefined&&String(previousValues[field]).trim()!==''&&
    (c.values[field]===undefined||String(c.values[field]).trim()==='')){
   c.auditEvents.push({sequence:c.auditEvents.length+1,type:'roll-deactivated',step:patch.step,field});
  }
 }
 // Persist every *physical* roll from the current rule-backed step, not only
 // attribute d6. Previous entries are immutable even if the GM later edits a
 // choice and enters a fresh roll in the same field.
 const physicalFields={1:{folkRoll:100},2:{ageRoll:100},3:{birthMonth:12,birthDay:30},
   4:{traitRoll:6,traitRollSecondary:6},6:{classRoll:Number(c.values.classDie||100)},
   8:{backgroundRoll:100,backgroundTensRoll:10},9:{estrangementRoll:100},5:{regionRoll:100,venariveRoll:1000,nativeLanguageRoll:2,regionSubRoll:10,regionDialectRoll:100,regionTribeRoll:100},7:{parentOccupationRoll:100,parentOccupationSubRoll:20,parentOccupationSpecialRoll:20,parentOccupationConvocationRoll:6}}[patch.step]??{};
 for(const [field,sides] of Object.entries(physicalFields)){
  // When the primary Region die changes, an explicitly re-entered subdie
  // represents a NEW physical throw even if its numeral matches the old one.
  // This prevents a reused stale result from appearing to have fresh evidence.
  const renewedRegionalSubdie=patch.step===5&&['regionSubRoll','regionDialectRoll','regionTribeRoll'].includes(field)&&
   Object.hasOwn(patch.values??{},field)&&
   (changed('regionRoll')||changed('birthRegion')||changed('venariveRoll'));
  if((!changed(field)&&!renewedRegionalSubdie)||c.values[field]===''||c.values[field]===undefined)continue;
  const result=normalizeRoll(c.values[field],sides);
  c.auditEvents.push({sequence:c.auditEvents.length+1,type:'step-dice',step:patch.step,field,die:`d${sides}`,roll:result});
 }
 if(patch.advance){
  if(patch.step===14){
   const pending=creationRevisionIssues({...clone,hmk:{...h,creation:c}}).filter(i=>i.step<14);
   if(pending.length)throw Error('Závěrečná revize: nejprve opravte kroky '+[...new Set(pending.map(i=>i.step))].join(', ')+'. Použijte odkazy v panelu Revize tvorby.');
  }
  if(patch.step===10&&(ATTRIBUTES.some(key=>!c.attributeProof[key])||!c.voiceProof))throw Error('Chybí 12 fyzických atributů nebo Voice pro Singing (p.49)');
  if(patch.step===12&&c.skillStage<7)c.skillStage++;
  else {c.completed[patch.step]=true;c.step=Math.min(15,patch.step+1)}
 }
 if(c.step===15){c.step=14;c.completed[14]=true;c.status='review-required';}
 h.creation=c;clone.hmk=h;return clone;
}
/** Update only creation-owned skill records; never alter manually entered skills. */
export function syncCreationSkills(h,idFactory){
 const prior=Array.isArray(h.skills)?h.skills:[],rows=calculateSheetSkills({hmk:h});
 const wanted=rows.filter(x=>x.sb!==null&&x.sm>0);
 const keep=prior.filter(s=>!s.creationDerived);
 const keyed=new Map(prior.filter(s=>s.creationDerived).map(s=>[s.name,s]));
 const manualNames=new Set(keep.map(s=>s.name));
 h.skills=[...keep,...wanted.filter(x=>!manualNames.has(x.name)).map(x=>({
  id:keyed.get(x.name)?.id??idFactory(),name:x.name,group:x.group,sb:x.sb,ml:x.ml,
  creationDerived:true,creationProof:{primary:x.primary,secondary:x.secondary,
   primaryValue:x.primaryValue,secondaryValue:x.secondaryValue,baseSM:x.baseSM,
   sources:x.dp,boosts:x.boosts,subskillOf:x.subskillOf??null,calculation:'HMK v1.2 pp.45–49; speciality exclusions subject to GM review'}
 }))];
 return h;
}
/** Audit a completed/draft profile before trusting it for any downstream use. */
export function assertCreationInvariants(character){
 const h=character?.hmk,c=h?.creation;
 if(!c)return true;
 // Character Creation proofs must remain tied to ORIGINAL dice and DP,
 // not the current in-game trained/injured values. Both projections are
 // validated independently; this one is only for historical proof checks.
 const startingAttributes={...h.attributes};
 for(const [name,proof] of Object.entries(c.attributeProof??{}))if(Number.isSafeInteger(proof?.score))startingAttributes[name]=proof.score;
 const creationSource={...character,hmk:{...h,attributes:startingAttributes,advancement:undefined}};
 const parentInvokerLegacy=legacyParentInvokerNeedsReview(character);
 if(c.version!==1||!Number.isInteger(c.step)||c.step<1||c.step>14||
  !Number.isInteger(c.skillStage)||c.skillStage<0||c.skillStage>7||
  !c.values||typeof c.values!=='object'||Array.isArray(c.values)||
  !c.attributeProof||typeof c.attributeProof!=='object'||Array.isArray(c.attributeProof)||
  !c.skillDP||typeof c.skillDP!=='object'||Array.isArray(c.skillDP)||
  !Array.isArray(c.auditEvents))throw Error('Poškozený stav Character Creation');
 for(let i=0;i<c.auditEvents.length;i++){
  const e=c.auditEvents[i];
  if(e?.sequence!==i+1)throw Error('Poškozené pořadí fyzických hodů');
  if(e.type==='attribute-dice'){
   if(!ATTRIBUTES.includes(e.name)||!Array.isArray(e.rolls)||!Number.isInteger(e.score))throw Error('Poškozený hod atributu');
  }else if(e.type==='perception-subattribute-dice'){
   if(!PERCEPTION_SENSES.includes(e.name)||!['PC','NPC'].includes(e.kind)||!FOLKS.includes(e.folk)||!AGE_GROUPS.includes(e.ageGroup)||!Array.isArray(e.rolls)||
    evaluatePerceptionDice({name:e.name,folk:e.folk,ageGroup:e.ageGroup,kind:e.kind,dice:e.rolls}).score!==e.score)
    throw Error('Poškozený fyzický smyslový hod HMK p.57');
  }else if(e.type==='perception-mode-choice'){
   if(!PERCEPTION_MODES.includes(e.mode)||!PERCEPTION_MODES.includes(e.previous)||e.sourcePage!==57)
    throw Error('Poškozený audit volby Perception');
  }else if(e.type==='voice-dice'){
   if(!Array.isArray(e.rolls)||!Number.isInteger(e.score))throw Error('Poškozený důkaz Voice');
  }else if(e.type==='morality-dice'){
   if(e.sourcePage!==39||!Array.isArray(e.rolls)||e.rolls.length!==4||e.rolls.some(d=>!Number.isInteger(d)||d<1||d>6)||
      ![0,2,4].includes(e.folkModifier)||JSON.stringify([...e.rolls].sort((a,b)=>b-a).slice(0,3))!==JSON.stringify(e.kept)||
      e.score!==e.kept.reduce((a,b)=>a+b,0)+e.folkModifier)throw Error('Poškozený hod Morality 4d6');
  }else if(e.type==='morality-selected'){
   if(e.sourcePage!==39||!Number.isInteger(e.score)||e.score<1||e.score>30)throw Error('Poškozená volba Morality');
  }else if(e.type==='morality-proof-deactivated'){
   if(e.reason!=='Folk modifier changed')throw Error('Poškozené zneplatnění Morality');
  }else if(e.type==='grace-aspect-choice'){
   if(e.sourcePage!==310||!divineAspectFromChoice({roll:15,grace:0,marked:true},e.aspect))throw Error('Poškozená volba Divine Aspect');
  }else if(e.type==='grace-aspect-deactivated'){
   if(e.reason!=='Grace changed'||!divineAspectFromChoice({roll:15,grace:0,marked:true},e.aspect))throw Error('Neplatné zneplatnění Grace aspektu');
  }else if(e.type==='creation-spirit-powers-deactivated'){
   if(!['Changed creation prerequisites','Changed Skills / Attributes'].includes(e.reason))throw Error('Neplatné zneplatnění Spirit Powers');
  }else if(e.type==='creation-spirit-powers-choice'){
   const q=e.proof;if(!q||JSON.stringify(validateStartingSpiritPowers({occupation:'Shaman (Spirit)',spiritML:q.spiritML,powers:q.powers,languages:q.powers.filter(x=>x.family==='Ancestor'&&x.subject.startsWith('Language (')).map(x=>x.subject.slice(10,-1))}))!==JSON.stringify(q))throw Error('Poškozený Spirit Powers audit');
  }else if(e.type==='creation-psyche'){
   if(!e.proof||JSON.stringify(creationPsycheFromPhysical({folk:e.proof.folk,ageGroup:e.proof.ageGroup,d20s:e.proof.d20s,d10s:e.proof.traits.map(t=>t.roll),choices:e.proof.traits.map(t=>t.trait)}))!==JSON.stringify(e.proof))throw Error('Poškozený audit počáteční Psyche');
  }else if(e.type==='creation-psyche-deactivated'){
   if(e.reason!=='Changed creation prerequisites')throw Error('Neplatné zneplatnění Psyche');
  }else if(e.type==='creation-mysteries-derived-deactivated'){
   if(e.reason!=='Changed Skills / Attributes')throw Error('Neplatné zneplatnění Mysteries výpočtů');
  }else if(e.type==='starting-elixirs-choice'){
   const p=e.proof;if(!p||JSON.stringify(validateStartingElixirs({alchemyML:p.alchemyML,choices:p.elixirs?.map(x=>x.name)}))!==JSON.stringify(p))throw Error('Poškozená historie Starting Elixirs');
  }else if(e.type==='starting-pvar-spells-choice'){
   const p=e.proof;if(!p||JSON.stringify(validateStartingPvarSpells({occupation:p.occupation,pvarismML:p.pvarismML,primary:p.primary,chantryStars:p.chantryStars,choices:p.spells?.map(x=>({id:x.id,assisted:x.assisted})),artefacts:p.artefacts,naturalAttunement:p.naturalAttunement,chantryConvocation:p.chantryConvocation,homeChantry:p.homeChantry,chantryId:p.chantryId,guildRank:p.guildRank,attunedObject:p.attunedObject,startingARP:p.startingARP}))!==JSON.stringify(p))throw Error('Poškozená historie Shèk-Pvâr ARP');
  }else if(e.type==='shaman-tradition-choice'){
   const p=e.proof;if(!p||JSON.stringify(validateShamanTradition({occupation:'Shaman (Spirit)',tradition:p.tradition,clanTotem:p.clanTotem,powers:e.powers??[]}))!==JSON.stringify(p))throw Error('Poškozený audit Shaman Tradition');
  }else if(e.type==='starting-doctrine-choice'){
   const p=e.proof;if(!p||!Number.isInteger(p.morality)||!Array.isArray(p.subjects))throw Error('Poškozená historie Doctrine');
  }else if(e.type==='grace-d20'){
    const r=graceFromDie(e.roll);
    if(r.grace!==e.result||r.marked!==e.marked)throw Error('Poškozený důkaz fyzického d20 Grace');
  }else if(e.type==='arcane-talent-deactivated'){
    if(!['Aura changed','Parent Invoker changed'].includes(e.reason)||!Number.isSafeInteger(e.previousD20)||e.previousD20<1||e.previousD20>20)throw Error('Poškozené zneplatnění Arcane Talent');
    if(e.previousD20s!==undefined&&(!Array.isArray(e.previousD20s)||e.previousD20s.length!==4||e.previousD20s.some(n=>!Number.isInteger(n)||n<1||n>20)||Math.max(...e.previousD20s)!==e.previousD20))throw Error('Poškozený audit zneplatněných čtyř d20');
  }else if(e.type==='arcane-talent-physical'){
    const p=e.d20s!==undefined?parentInvokerTalentFromPhysical({aura:e.aura,folk:e.folk,ageGroup:e.ageGroup,d20s:e.d20s,d100s:e.d100s}):arcaneTalentFromPhysical({aura:e.aura,folk:e.folk,ageGroup:e.ageGroup,d20:e.d20,d100s:e.d100s});
    if(e.d20!==p.d20||e.result!==p.result||JSON.stringify(e.grants)!==JSON.stringify(p.grants))throw Error('Poškozený fyzický Arcane Talent audit');
  }else if(e.type==='folk-skill-dice'){
    const r=folkSkillsFromDice(e.folk,e.rolls);
    if(JSON.stringify(r.skills)!==JSON.stringify(e.skills))throw Error('Poškozené d10 Folk Skills');
  }else if(e.type==='wealth-dice'){
    if(!Array.isArray(e.familyRolls)||!Array.isArray(e.occupationRolls)||![true,false].includes(e.advantage)||!Number.isInteger(e.wealth))throw Error('Neplatný důkaz fyzických Wealth kostek');
  }else if(e.type==='roll-deactivated'){
   const allowed={1:['folkRoll'],2:['ageRoll'],4:['traitRoll','traitRollSecondary'],5:['venariveRoll','regionRoll','nativeLanguageRoll','regionSubRoll','regionDialectRoll','regionTribeRoll'],6:['classRoll'],7:['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll'],8:['backgroundRoll','backgroundTensRoll']}[e.step];
   if(!allowed?.includes(e.field))throw Error('Neplatný důkaz návratu k ruční volbě');
  }else if(e.type==='gm-bonus-language-decision'){
   if(!e.proof||!['granted','declined'].includes(e.proof.decision)||!e.proof.allocations||e.proof.sourcePage!==48)throw Error('Poškozená auditní GM Bonus Language volba');
  }else if(e.type==='gm-bonus-language-deactivated'){
   if(e.reason!=='changed Folk/Age/Birthplace')throw Error('Neplatné zneplatnění GM Bonus Language');
  }else if(e.type==='automatic-generation'){
   if(!['random','traits','warrior','scholar','mystic','artisan','explorer','social','covenant'].includes(e.mode)||e.diceSource!=='browser PRNG/Web Crypto'||!Number.isInteger(e.attempt)||e.attempt<1|| (e.mode==='traits'&&!['random','warrior','scholar','mystic','artisan','explorer','social','covenant'].includes(e.profile)))throw Error('Neplatný automatický generační důkaz');
  }else if(e.type==='step-dice'){
   const expected={1:{folkRoll:100},2:{ageRoll:100},3:{birthMonth:12,birthDay:30},4:{traitRoll:6,traitRollSecondary:6},5:{regionRoll:100,venariveRoll:1000,nativeLanguageRoll:2,regionSubRoll:10,regionDialectRoll:100,regionTribeRoll:100},6:{classRoll:100},7:{parentOccupationRoll:100,parentOccupationSubRoll:20,parentOccupationSpecialRoll:20,parentOccupationConvocationRoll:6},8:{backgroundRoll:100,backgroundTensRoll:10},9:{estrangementRoll:100}}[e.step];
   if(!expected||!Object.hasOwn(expected,e.field)||![`d${expected[e.field]}`,'d20'].includes(e.die)||
      (e.die==='d20'&&!['classRoll','parentOccupationSubRoll','parentOccupationSpecialRoll'].includes(e.field))||normalizeRoll(e.roll,Number(e.die.slice(1)))!==e.roll)
    throw Error('Poškozený doložený hod průvodce');
  }else throw Error('Neznámý typ fyzického důkazu');
 }
 // The most recently recorded dice for each field must match the active
 // step evidence; earlier rolls are retained as an append-only audit trail.
 for(const [step,fields] of Object.entries({1:['folkRoll'],2:['ageRoll'],3:['birthMonth','birthDay'],4:['traitRoll','traitRollSecondary'],5:['regionRoll','venariveRoll','nativeLanguageRoll','regionSubRoll','regionDialectRoll','regionTribeRoll'],6:['classRoll'],7:['parentOccupationRoll','parentOccupationSubRoll','parentOccupationSpecialRoll','parentOccupationConvocationRoll'],8:['backgroundRoll','backgroundTensRoll'],9:['estrangementRoll']})){
  for(const field of fields){
   const records=c.auditEvents.filter(e=>(e.type==='step-dice'||e.type==='roll-deactivated')&&e.step===Number(step)&&e.field===field);
   if(!records.length)continue;
   const latest=records.at(-1),current=c.values[field];
   if(latest.type==='roll-deactivated'){
    if(current!==undefined&&String(current).trim()!=='')throw Error('Ruční volba má stále aktivní starý hod '+field);
    continue;
   }
   if(current===undefined||current==='')throw Error('Chybějící fyzický důkaz pro '+field);
   if(normalizeRoll(current,Number(latest.die.slice(1)))!==latest.roll)
    throw Error('Změněný fyzický důkaz pro '+field);
  }
 }
 if(c.values.nativeSkillsMode!==undefined&&!['yes','no'].includes(c.values.nativeSkillsMode))throw Error('Neplatný režim Native Language/Ritual');
 if(h.birthRegion==='Karéjia'&&h.folk==='Human'&&c.completed[12]&&c.values.nativeSkillsMode!=='yes')throw Error('Karéjia p.419: rodné Ritualy nesmějí být vypnuté');
 if(c.values.nativeSkillsMode==='yes')nativeRitualGrants(character,c.values,{strict:!!c.completed[12]});
 if([c.values.nativeRitualChoice,c.values.nativeRitualChoice2,c.values.nativeRitualChoice3].filter(Boolean).some(n=>!religionChoices(character).includes(n)))throw Error('Nedoložený Ritual pro tento Pantheon');
 if(new Set([c.values.nativeRitualChoice,c.values.nativeRitualChoice2,c.values.nativeRitualChoice3].filter(Boolean)).size!==[c.values.nativeRitualChoice,c.values.nativeRitualChoice2,c.values.nativeRitualChoice3].filter(Boolean).length)throw Error('Karéjia: tři Ritualy musejí být různé');
 const bonusLast=c.auditEvents.filter(e=>e.type==='gm-bonus-language-decision'||e.type==='gm-bonus-language-deactivated').at(-1);
 if(!c.values.gmBonusLanguageProof&&bonusLast?.type==='gm-bonus-language-decision')throw Error('GM Bonus Language: rozhodnutí z historie nemůže zmizet bez zneplatnění');
 if(c.values.gmBonusLanguageProof){
  const p=c.values.gmBonusLanguageProof;
  const expected=gmLanguageProof(character,p.decision,p.distribution);
  if(JSON.stringify(expected)!==JSON.stringify(p))throw Error('Poškozené GM Bonus Language DP');
  const last=c.auditEvents.filter(e=>e.type==='gm-bonus-language-decision'||e.type==='gm-bonus-language-deactivated').at(-1);
  if(last?.type!=='gm-bonus-language-decision'||JSON.stringify(last.proof)!==JSON.stringify(p))throw Error('GM Bonus Language DP bez platného rozhodnutí GM');
 }
 if(c.values.backgroundCityLanguageDistribution){
  const paid=c.skillDP['Background Skills']?.Language??0;
  if(h.background!=='City'||!Number.isInteger(paid)||paid<1||paid>2)throw Error('Neplatný uložený City Background Languages pool');
  parseOccupationDistribution(character,c.values.backgroundCityLanguageDistribution,'Language',3*paid);
 }
 if(c.values.familyScriptChoice!==undefined&&(h.familyOccupation===undefined||!familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence)?.skills?.Script||!SCRIPTS.includes(c.values.familyScriptChoice)))throw Error('Neplatná rodičovská Script specializace');
 for(const [printed,fld] of [['2nd Script','familySecondScriptChoice'],['3rd Script','familyThirdScriptChoice']]){
  const choice=c.values[fld],parent=familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence);
  if(choice&&(!parent?.skills?.[printed]||!SCRIPTS.includes(choice)))throw Error('Neplatná uložená rodinná specializace '+printed);
  if((c.skillDP['Family Skills']?.[printed]??0)>0&&!SCRIPTS.includes(choice))throw Error('Chybí konkrétní rodičovský '+printed);
 }
 const famNames=[c.values.familyScriptChoice,c.values.familySecondScriptChoice,c.values.familyThirdScriptChoice].filter(Boolean);
 if(new Set(famNames).size!==famNames.length)throw Error('Duplicitní rodinná písma');

 for(const [field,printed,type,choice] of [['occupationLanguageDistribution','Language','Language','occupationLanguageChoice'],['occupationScriptsDistribution','Scripts','Script','occupationScriptChoice']]){
  const raw=c.values[field];if(raw===undefined||raw==='')continue;
  const budget=OCCUPATIONS[character.occupation]?.skills?.[printed];
  if(!Number.isSafeInteger(budget)||c.values[choice])throw Error('Neplatné uložené rozdělení '+field);
  parseOccupationDistribution(character,raw,type,budget);
 }

 const currentJob=OCCUPATIONS[character.occupation];
 for(const [printed,field] of [['2nd Script','occupationSecondScriptChoice'],['3rd Script','occupationThirdScriptChoice']]){
  const name=c.values[field];
  if(name&&(!currentJob?.skills?.[printed]||!SCRIPTS.includes(name)))throw Error('Neplatná uložená specializace '+printed);
  if(c.values.occupationAuto==='yes'&&currentJob?.skills?.[printed]&&!name)throw Error('Chybějící '+printed+' v uloženém profilu');
 }
 if(c.values.occupationAuto==='yes'&&currentJob?.skills?.['2nd Script']&&(!c.values.occupationScriptChoice||c.values.occupationSecondScriptChoice===c.values.occupationScriptChoice))throw Error('Nesouhlasí druhý Script');
 if(c.values.occupationAuto==='yes'&&currentJob?.skills?.['3rd Script']&&(!c.values.occupationSecondScriptChoice||[c.values.occupationScriptChoice,c.values.occupationSecondScriptChoice].includes(c.values.occupationThirdScriptChoice)))throw Error('Nesouhlasí třetí Script');
 if(c.values.occupationAuto==='yes'){
  const religion=priestReligionOf(character.occupation);
  if(religion&&(c.values.occupationRitualChoice!==religion||!c.values.occupationScriptChoice||(religion==='Môrgath'&&c.values.occupationScriptChoice==='Nùvesârl')))throw Error('Uložený Priest neodpovídá náboženství nebo písmu');
  if(!isArcaneOccupationEligible(character,character.occupation))throw Error('Uložené magické povolání bez doložených Talentů');
 }
 if(c.values.wealthProof&&priestReligionOf(character.occupation)){
  const religion=priestReligionOf(character.occupation),row=calculateSheetSkills(creationSource).find(r=>r.name===instanceKey('Ritual',religion));
  if(!row||row.ml===null||row.ml<20)throw Error('Priest Wealth: chybí Ritual ML20 pro Clergy');
  const circle=ritualFollowerFromML(row.ml,{clergy:true}).circle;
  if(c.values.wealthProof.occupationDie!==circle*2)throw Error('Priest Wealth musí být d(Circle × 2), HMK str.51');
 }

 const selectedProfession=OCCUPATIONS[character.occupation];
 for(const [field,baseName] of [['occupationScriptChoice','Script'],['occupationLanguageChoice','Language'],['occupationRitualChoice','Ritual']]){
  if(c.values[field]&&!Object.hasOwn(selectedProfession?.skills??{},baseName))throw Error('Specializace již nepatří k vybranému povolání');
 }
 for(const [type,field] of [['Script','occupationScriptChoice'],['Language','occupationLanguageChoice'],['Ritual','occupationRitualChoice']]){
  const name=c.values[field];if(name&&!validInstance(character,instanceKey(type,name)))throw Error('Neplatná konkrétní Skill specializace');
 }
 // Independently derive every *active* physical roll again while reading a
 // stored Character Sheet. Preserving the die audit is not sufficient if an
 // attacker or a stale editor has changed its selected text afterwards.
 for(const step of [1,2,4,5,6,7,8]){
  if(!c.completed[step]||(step===2&&c.values.folk!==h.folk))continue;
  const expected=creationChoicesFromPhysicalDice(character,step,c.values);
  for(const [field,value] of Object.entries(expected)){
   if(c.values[field]!==value&&!(step===5&&field==='society'&&legacyTribalRegionNeedsReview(character)))throw Error('Doložený fyzický hod neodpovídá uložené volbě: '+field);
  }
 }
 if(c.completed[1]&&c.values.folkRoll&&c.values.folk!==h.folk)throw Error('Uložený Folk neodpovídá Character Sheet');
 if(c.completed[2]&&c.values.ageRoll&&c.values.ageGroup!==h.ageGroup)throw Error('Uložený Age neodpovídá Character Sheet');
 if(c.completed[6]&&c.values.classRoll&&c.values.socialClass!==h.socialClass)throw Error('Uložená Parent Class neodpovídá Character Sheet');
 if(c.completed[7]&&c.values.parentOccupationRoll&&c.values.familyOccupation!==h.familyOccupation)throw Error('Uložená Parent Occupation neodpovídá Character Sheet');
 if(c.completed[8]&&c.values.backgroundRoll&&c.values.background!==h.background)throw Error('Uložený Background neodpovídá Character Sheet');
 if(c.completed[8]&&c.values.backgroundRoll!==undefined&&String(c.values.backgroundRoll).trim()){
  const calc=backgroundFromRoll(c.values.backgroundRoll,c.values.urbanChance,{unsettledTribal:c.values.tribalUnsettled==='yes',society:h.society,cityStateTens:c.values.backgroundTensRoll,folk:h.folk});
  if(calc!==h.background)throw Error('Background neodpovídá fyzickému d100');
 }
 if(c.values.parentTitleProof){
  const x=c.values.parentOccupationProof;const effective=h.society==='City-State'?cityStateBackgroundDie(c.values.backgroundRoll,c.values.backgroundTensRoll).effectiveRoll:Number(c.values.backgroundRoll);const title=parentTitleFromBackground(x?.name,effective,{society:h.society});
  if(!title||c.values.parentTitleProof.title!==title||c.values.parentTitleProof.name!==x.name||h.parentTitle!==title||Number(c.values.backgroundRoll)!==c.values.parentTitleProof.backgroundRoll||c.values.parentTitleProof.effectiveBackgroundRoll!==effective)throw Error('Nesoulad Noble Title s fyzickým Background hodem');
 }
 if(c.completed[13]&&c.values.wealth!==undefined&&Number(c.values.wealth)!==h.wealth)throw Error('Změněný GM Wealth');
 if(c.completed[12]&&c.values.folkAuto==='yes'&&['Kúzhai','Sinái'].includes(h.folk)&&!c.values.folkSkillProof)throw Error('Chybí fyzické Folk d10');
 if(c.values.arcaneTalentProof){
  const t=c.values.arcaneTalentProof,startingAura=c.attributeProof?.aur?.score??h.attributes?.aur,
   startingCharacter={...character,hmk:{...h,attributes:{...h.attributes,aur:startingAura}}},
   p=parentInvokerLegacy?arcaneTalentFromPhysical({aura:startingAura,folk:h.folk,ageGroup:h.ageGroup,d20:t.d20,d100s:t.d100s}):arcaneProofForCharacter(startingCharacter,{d20:t.d20,d20s:t.d20s,d100s:t.d100s});
  const last=c.auditEvents.filter(e=>e.type==='arcane-talent-physical').at(-1);
  if(JSON.stringify(t)!==JSON.stringify(p)||JSON.stringify(c.skillDP['Arcane Talent Skills']??{})!==JSON.stringify(p.grants)||!last||last.d20!==p.d20||JSON.stringify(last.d20s)!==JSON.stringify(p.d20s)||JSON.stringify(last.d100s)!==JSON.stringify(p.d100s)||JSON.stringify(last.grants)!==JSON.stringify(p.grants))throw Error('Poškozený fyzický Arcane Talent důkaz');
 }
 if(c.values.arcaneTalentProof&&!parentInvokerLegacy&&Boolean(c.values.arcaneTalentProof.familyInvoker)!==(h.familyOccupation==='Invoker'))throw Error('Arcane Talent Possession neodpovídá rodičovskému Invoker');
 if(c.completed[12]&&c.values.arcaneTalentMode==='yes'&&!c.values.arcaneTalentProof)throw Error('Chybí fyzické Arcane Talent hody');
 if(c.values.psycheProof){
  const q=c.values.psycheProof;const expected=creationPsycheFromPhysical({folk:h.folk,ageGroup:h.ageGroup,d20s:q.d20s,d10s:q.traits.map(x=>x.roll),choices:q.traits.map(x=>x.trait)});
  const event=c.auditEvents.filter(e=>e.type==='creation-psyche').at(-1);
  if(JSON.stringify(q)!==JSON.stringify(expected)||!event||JSON.stringify(event.proof)!==JSON.stringify(q)||h.psyche!==(q.traits.length?q.traits.map(x=>x.intensity+': '+x.trait).join('; '):'None'))throw Error('Změněný počáteční Psyche důkaz HMK p.40');
 }
 if(c.completed[14]&&c.values.mysteriesCreationVersion===2){
  if((character.kind??'PC')==='PC'&&!c.values.graceProof)throw Error('Dokončená postava nemá Grace d20');
  if((character.kind??'PC')==='PC'&&creationPsycheCount(h.folk,h.ageGroup)!==null&&!c.values.psycheProof)throw Error('Dokončená hráčská postava nemá Psyche d20');
 }
 if(h.divineGrace&&!c.values.graceProof)throw Error('Grace bez fyzického d20 důkazu');
 if(c.values.graceProof){
  const r=graceFromDie(c.values.graceProof.roll),e=c.auditEvents.filter(x=>x.type==='grace-d20').at(-1);
  if(JSON.stringify(r)!==JSON.stringify(c.values.graceProof)||JSON.stringify(h.divineGrace)!==JSON.stringify(r)||!e||e.roll!==r.roll||e.result!==r.grace)throw Error('Změněný fyzický Grace důkaz');
 }
 const currentPsycheEvent=c.auditEvents.filter(e=>e.type==='creation-psyche'||e.type==='creation-psyche-deactivated').at(-1);
 if(!c.values.psycheProof&&currentPsycheEvent?.type==='creation-psyche')throw Error('Aktivní Psyche důkaz zmizel bez zneplatnění historie');
 const currentAspectEvent=c.auditEvents.filter(e=>e.type==='grace-aspect-choice'||e.type==='grace-aspect-deactivated').at(-1);
 if(!c.values.graceAspect&&currentAspectEvent?.type==='grace-aspect-choice')throw Error('Divine Aspect zmizel bez zneplatnění historie');
 if(c.values.graceProof&&(c.values.graceAspect||c.values.mysteriesCreationVersion===2)){
  const expected=divineAspectFromChoice(c.values.graceProof,c.values.graceAspect??'');
  if(JSON.stringify(h.divineAspect??null)!==JSON.stringify(expected))throw Error('Divine Aspect neodpovídá fyzickému Grace výsledku');
  if(expected&&c.values.mysteriesCreationVersion===2&&c.completed[14]){
   const last=c.auditEvents.filter(x=>x.type==='grace-aspect-choice').at(-1);
   if(!last||last.aspect!==expected.id)throw Error('Divine Aspect není doložen výběrem z tabulky');
  }
 }
 if(c.values.spiritPowerProof){
  const q=c.values.spiritPowerProof,spirit=calculateSheetSkills(creationSource).find(x=>x.name==='Spirit');
  const check=validateStartingSpiritPowers({occupation:character.occupation,spiritML:spirit?.ml,powers:q.powers,languages:(h.regionalLanguages??[]).concat(h.nativeLanguage?[h.nativeLanguage]:[])});
  const last=c.auditEvents.filter(e=>e.type==='creation-spirit-powers-choice').at(-1);
  if(JSON.stringify(q)!==JSON.stringify(check)||JSON.stringify(h.startingSpiritPowers)!==JSON.stringify(q)||!last||JSON.stringify(last.proof)!==JSON.stringify(q))throw Error('Změněné počáteční Spirit Powers nebo Spirit Index');
 }
 const currentSpiritEvent=c.auditEvents.filter(e=>e.type==='creation-spirit-powers-choice'||e.type==='creation-spirit-powers-deactivated').at(-1);
 if(!c.values.spiritPowerProof&&currentSpiritEvent?.type==='creation-spirit-powers-choice')throw Error('Spirit Powers chybí zneplatnění dřívějšího důkazu');
 if(c.values.arcaneResearchProof){
  const r=arcaneStartingResearch(c.values.arcaneResearchProof.pvarismML,h.ageGroup,h.folk);
  if(JSON.stringify(r)!==JSON.stringify(c.values.arcaneResearchProof)||JSON.stringify(h.startingArcaneResearch)!==JSON.stringify(r))throw Error('Změněný výpočet počátečních Arcane Research Points');
 }
 if(c.values.folkSkillProof){
  const r=folkSkillsFromDice(h.folk,c.values.folkSkillProof.rolls);
  const e=c.auditEvents.filter(x=>x.type==='folk-skill-dice').at(-1);
  if(JSON.stringify(r)!==JSON.stringify(c.values.folkSkillProof)||JSON.stringify(c.skillDP['Folk Skills']??{})!==JSON.stringify(r.skills)||!e||JSON.stringify(e.rolls)!==JSON.stringify(r.rolls))throw Error('Změněné fyzické Folk d10 důkazy');
 }
 if(c.values.venariveProof){
  const r=regionFromD1000(c.values.venariveRoll);
  if(JSON.stringify(r)!==JSON.stringify(c.values.venariveProof)||c.values.birthRegion!==r.region)throw Error('Změněný zdrojový Region d1000');
 }
 if(!regionAllowedForFolk(c.values.birthRegion,h.folk))throw Error('Elder Folk p.423: nepřípustný Folk pro regionální tabulku');
 if(c.values.regionProof){
  const r=c.values.regionProof.selectedByGM?(()=>{
   if(String(c.values.regionRoll??'').trim())throw Error('Neplatná vědomá volba Realm bez fyzického hodu');
   return realmFromRegionSelection(c.values.birthRegion,c.values.birthplace,c.values.nativeLanguageRoll,c.values.regionSubRoll,c.values.nativeLanguageChoice,c.values.regionDialectRoll,c.values.regionDialectChoice,c.values.regionAzeriDialectChoice,c.values.regionCommunityChoice,c.values.regionTribeRoll);
  })():realmFromRegionRoll(c.values.birthRegion,c.values.regionRoll,c.values.nativeLanguageRoll,c.values.regionSubRoll,c.values.nativeLanguageChoice,c.values.regionDialectRoll,c.values.regionDialectChoice,c.values.regionAzeriDialectChoice,c.values.regionCommunityChoice,c.values.regionTribeRoll);
  if(!legacyTribalRegionNeedsReview(character)&&(JSON.stringify(r)!==JSON.stringify(c.values.regionProof)||h.birthplace!==r.realm||h.society!==r.society||h.nativeLanguage!==r.nativeLanguage||JSON.stringify(h.regionalLanguages)!==JSON.stringify(r.regionalLanguages)||h.pantheon!==r.pantheon||h.harnTribe!==(r.region==='Hârn'?r.tribe:undefined)||h.alticTribe!==(r.region==='Áltôr'?r.tribe:undefined)))throw Error('Nesoulad doložené Region tabulky');
 }
 if(c.values.regionProof?.subsistence&&c.values.subsistence!==c.values.regionProof.subsistence)throw Error('Nesoulad kmenové obživy s HMK str. 29 / Appendix I');
 if(c.values.regionProof?.region==='Dalkésh'&&c.completed[11]&&h.familyOccupation&&character.occupation!==h.familyOccupation&&!(h.familyOccupation==='Weaponcrafter'&&['Weaponcrafter (Armourer)','Weaponcrafter (Bowyer)'].includes(character.occupation))&&!(h.familyOccupation==='Man-at-arms (Archer)'&&['Man-at-arms (Archer)','Man-at-arms (Archer, Slings)'].includes(character.occupation))&&!(h.familyOccupation==='Man-at-arms (Cavalry)'&&(character.occupation==='Man-at-arms (Cavalry, Melee)'||/^Man-at-arms \(Cavalry, Missile: (?:Archery|Slings|Throwing)\)$/.test(character.occupation))))throw Error('Dalkésh: Occupation musí odpovídat Parent Occupation (p.417)');
 if(c.values.classRoll!==undefined&&String(c.values.classRoll).trim()&&c.completed[6]&&classFromRoll(h.society,c.values.classRoll,Number(c.values.classDie||100))!==h.socialClass)throw Error('Nesoulad Parent Class fyzického hodu');
 if(c.values.parentOccupationProof){
  const x=['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free' ? {...tribalFreeOccupation(c.values.subsistence,c.values.parentOccupationRoll),society:h.society} : parentOccupationFromRoll({society:h.society,socialClass:h.socialClass,roll:c.values.parentOccupationRoll,classRoll:c.values.classRoll,classDie:c.values.classDie??100,subRoll:c.values.parentOccupationSubRoll,specialRoll:c.values.parentOccupationSpecialRoll,convocationRoll:c.values.parentOccupationConvocationRoll,allowLegacyIncomplete:!Object.hasOwn(c.values.parentOccupationProof,"specialRoll")&&!Object.hasOwn(c.values.parentOccupationProof,"convocationRoll")});
  if(JSON.stringify(x)!==JSON.stringify(c.values.parentOccupationProof)||h.familyOccupation!==x.name||Number(c.values.urbanChance)!==x.urbanChance)throw Error('Nesoulad rodičovského povolání s fyzickým hodem');
 }
 if(c.values.familyWeaponcrafterType!==undefined&&h.familyOccupation!=='Weaponcrafter')throw Error('Neplatná specializace Parent Weaponcrafter');
 if(c.values.familyRitualChoice!==undefined){const expected=['Priest','Gentry: Priest'].includes(h.familyOccupation)?parentPriestRitual(character,c.values.familyVariantChoice):h.familyOccupation==='Shaman'?parentShamanRitual(character,c.values.familyRitualChoice):null;if(!expected||expected.religion!==c.values.familyRitualChoice)throw Error('Rodinný Priest/Shaman Ritual je v rozporu s pantheonem (p.43–44)');}
 if(['Priest','Gentry: Priest'].includes(h.familyOccupation)&&c.values.familyAuto==='yes'&&c.completed[7]&&c.values.familyRitualChoice&&!parentPriestRitual(character,c.values.familyVariantChoice))throw Error('Neplatný doložený Parent Priest podtyp');
 const familyVariants=['Priest','Gentry: Priest'].includes(h.familyOccupation)&&c.values.familyRitualChoice?allowedParentPriestVariants(character):h.familyOccupation==='Shaman'?verifiedParentShamanVariants(character):occupationVariantNames(h.familyOccupation);
 if(c.values.familyVariantChoice!==undefined&&!familyVariants.includes(c.values.familyVariantChoice))throw Error('Uložený rodičovský podtyp neodpovídá tištěnému povolání');
 if(c.values.familyAuto==='yes'&&c.completed[7]&&familyVariants.length&&!familyVariants.includes(c.values.familyVariantChoice))throw Error('Family DP vyžadují konkrétní profesní podtyp');
 if(h.familyOccupation==='Shaman'&&c.values.familyAuto==='yes'&&c.completed[7])verifyParentShamanChoice(character,c.values.familyVariantChoice,c.values.familyRitualChoice);
 if(c.values.familyMartialChoice!==undefined){
  const allowed=h.familyOccupation==='Man-at-arms (Archer)'?['Archery','Slings']:h.familyOccupation==='Man-at-arms (Cavalry)'?['Melee','Archery','Slings','Throwing']:[];
  if(!allowed.includes(c.values.familyMartialChoice))throw Error('Poškozený rodičovský vojenský podtyp');
 }
 if(c.values.familyAuto==='yes'&&c.skillDP['Family Skills']&&['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(h.familyOccupation)&&!familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence))throw Error('Parent Man-at-arms nemá doloženou variantu');
 if(h.familyOccupation==='Weaponcrafter'&&c.completed[7]&&c.values.familyAuto==='yes'&&c.skillDP['Family Skills']&&
    !familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence))throw Error('Family Weaponcrafter DP vyžadují podtyp z HMK p.44');
 if(c.values.familyAuto==='yes'&&c.skillDP['Family Skills']){
  const spec=familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence);
  if(spec){const family=c.skillDP['Family Skills'];
   if(!validateFamilySkillAllocation(spec,family))throw Error('Family Skills překračují profesní sdílenou skupinu (p.47)');
   const expectedRitual=['Priest','Gentry: Priest'].includes(h.familyOccupation)&&c.values.familyRitualChoice?parentPriestRitual(character,c.values.familyVariantChoice):h.familyOccupation==='Shaman'&&c.values.familyRitualChoice?parentShamanRitual(character,c.values.familyRitualChoice):null;
   if(Object.values(family).reduce((a,b)=>a+Number(b),0)>5||Object.entries(family).some(([skill,dp])=>{
    const printed=expectedRitual&&skill===expectedRitual.skill?'Ritual':skill;
    return !Number.isInteger(dp)||dp<0||(expectedRitual&&(skill==='Ritual'||parseInstance(skill)?.type==='Ritual'&&skill!==expectedRitual.skill))||dp>familySkillCap(spec,printed==='Ritual'?printed:skill);
   }))throw Error('Nesoulad Family Skills se zvolenou profesní tabulkou (p.47)');
  }
 }
 if(CHIEFTAIN_VARIANTS.includes(character.occupation)&&c.completed[11]){
  const subsistence=c.values.regionProof?.subsistence??c.values.subsistence;
  if(character.occupation!==chieftainVariantForSubsistence(subsistence))throw Error('Chieftain nesouhlasí s primární kmenovou obživou (p.42)');
 }
 if(c.values.familyAuto==='yes'&&h.familyOccupation==='Chieftain'&&c.skillDP['Family Skills']&&!familyOccupationProfile(h.familyOccupation,null,null,null,c.values.regionProof?.subsistence??c.values.subsistence))throw Error('Chieftain Family Skills vyžadují ověřenou kmenovou obživu');
 if(c.values.occupationProof){
  const spec=OCCUPATIONS[character.occupation];
  if(!spec||JSON.stringify(c.values.occupationProof)!==JSON.stringify({name:character.occupation,die:spec.die,skills:{...spec.skills},sourcePage:OCCUPATION_PAGES[character.occupation]??42})||
   JSON.stringify(c.skillDP['Occupation Skills']??{})!==JSON.stringify(spec.skills))throw Error('Nesoulad Occupational DP se zdrojovou tabulkou');
 }
 if(c.values.wealthProof){
  const v=c.values.wealthProof,estr=String(h.estrangement??'').split(' ')[0];
  const test=evaluateWealthDice({estrangement:estr,ageGroup:h.ageGroup,folk:h.folk,occupation:character.occupation,
   parentDie:v.parentDie,occupationDie:v.occupationDie,familyRolls:v.familyRolls,occupationRolls:v.occupationRolls,advantage:v.advantage,socialClass:h.socialClass});
  const e=c.auditEvents.filter(x=>x.type==='wealth-dice').at(-1);
  if(JSON.stringify(test)!==JSON.stringify(v)||test.wealth!==h.wealth||h.coinsPence!==test.coinsPence||h.possessionsBudgetPence!==test.possessionsPence||h.lifestyle!==test.lifestyle||!e||JSON.stringify(e.familyRolls)!==JSON.stringify(v.familyRolls)||JSON.stringify(e.occupationRolls)!==JSON.stringify(v.occupationRolls)||e.wealth!==v.wealth)throw Error('Změněný fyzický Wealth důkaz');
 }
 if(c.values.mysteriesCreationVersion===2&&c.completed[14]){
  const sheet=calculateSheetSkills(creationSource);
  const p=sheet.find(x=>x.name==='Pvârism');
  const expected=((p?.totalDP??0)>0)?arcaneStartingResearch(p.ml,h.ageGroup,h.folk):null;
  if(JSON.stringify(expected)!==JSON.stringify(c.values.arcaneResearchProof??null)||JSON.stringify(expected)!==JSON.stringify(h.startingArcaneResearch??null))throw Error('Při Edit se změnilo Pvârism ML bez zneplatnění počátečních ARP');
  if(c.values.mysteriesProof){
   const r=sheet.find(x=>x.name===c.values.mysteriesProof.ritualSkill);
   if(!r||r.ml!==c.values.mysteriesProof.ritualML)throw Error('Při Edit se změnilo Ritual ML bez zneplatnění Blessing/Circle');
  }
 }
 if(c.values.mysteriesProof){
  const m=c.values.mysteriesProof,r=ritualFollowerFromML(m.ritualML,m);
  const covenant=Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,String(m.ritualSkill??'').slice(8,-1));
  const verified=c.values.startingDoctrineProof;
  const expected={...r,ritualML:m.ritualML,clergy:m.clergy,fightingOrder:m.fightingOrder,orthodoxyPenalty:m.orthodoxyPenalty,...(m.ritualSkill?{ritualSkill:m.ritualSkill}:{})};
  if(covenant&&verified){expected.circle=verified.circle;expected.ceremony=verified.ceremony;expected.maxPiety=verified.maxPiety;expected.blessingBonus=verified.blessingBonus;}
  if(JSON.stringify(expected)!==JSON.stringify(m)||JSON.stringify(h.religiousStatus)!==JSON.stringify(m))throw Error('Nesoulad Ritual/Piety pravidlového výpočtu');
 }
 // New starting Mysteries proofs must still match the single authoritative skill projection.
 const sheetCreation=calculateSheetSkills(creationSource);
 if(c.values.startingElixirProof){
  const ml=sheetCreation.find(x=>x.name==='Alchemy'&&x.totalDP>0)?.ml??0;
  const p=c.values.startingElixirProof,recalc=validateStartingElixirs({alchemyML:ml,choices:p.elixirs.map(x=>x.name)});
  if(JSON.stringify(p)!==JSON.stringify(recalc)||JSON.stringify(h.startingElixirs)!==JSON.stringify(p))throw Error('Alchemy Starting Elixirs: chybný / zastaralý důkaz');
 }
 if(c.values.startingPvarSpellsProof){
  const p=c.values.startingPvarSpellsProof,ml=sheetCreation.find(x=>x.name==='Pvârism'&&x.totalDP>0)?.ml;
  const arp=c.values.arcaneResearchProof?.startingARP;
  const recalc=validateStartingPvarSpells({occupation:character.occupation,pvarismML:ml,primary:p.primary,chantryStars:p.chantryStars,choices:p.spells.map(x=>({id:x.id,assisted:x.assisted})),artefacts:p.artefacts,naturalAttunement:p.naturalAttunement,chantryConvocation:p.chantryConvocation,homeChantry:p.homeChantry,chantryId:p.chantryId,guildRank:p.guildRank,attunedObject:p.attunedObject,startingARP:arp});
  if(JSON.stringify(p)!==JSON.stringify(recalc)||JSON.stringify(h.startingPvarSpells)!==JSON.stringify(p))throw Error('Shèk-Pvâr: neplatný nebo zastaralý ARP důkaz');
 }
 if(c.values.shamanTraditionProof){
  const p=c.values.shamanTraditionProof,q=validateShamanTradition({occupation:character.occupation,tradition:p.tradition,clanTotem:p.clanTotem,powers:c.values.spiritPowerProof?.powers??[]});
  if(JSON.stringify(p)!==JSON.stringify(q)||JSON.stringify(h.shamanTradition)!==JSON.stringify(p))throw Error('Zastaralý / neplatný shaman tradition proof');
 }
 if(c.values.startingDoctrineProof){
  const p=c.values.startingDoctrineProof,r=sheetCreation.find(x=>x.name===`Ritual (${p.religion})`);
  if(h.morality!==p.morality||c.values.moralityChoice!==p.morality||c.values.mysteriesRitualSkill!==`Ritual (${p.religion})`)throw Error('Doctrine/Morality je odpojena od zvoleného Ritual');
  const recalc=validateStartingReligion({religion:p.religion,morality:p.morality,ritualML:r?.ml,occupation:character.occupation,clergy:p.clergy,fightingOrder:p.fightingOrder,meleeML:sheetCreation.find(x=>x.name==='Melee')?.ml??0,initiativeML:sheetCreation.find(x=>x.name==='Initiative')?.ml??0,subjects:p.subjects});
  if(JSON.stringify(p)!==JSON.stringify(recalc)||JSON.stringify(h.startingDoctrine)!==JSON.stringify(p))throw Error('Doctrine: chybné / zastaralé piety nebo Morality');
 }
 const mode=perceptionMode(character);
 if(c.values.perceptionMode!==undefined&&!PERCEPTION_MODES.includes(c.values.perceptionMode))throw Error('Neplatný Perception režim');
 const modes=c.auditEvents.filter(e=>e.type==='perception-mode-choice');
 if(modes.length){
  if(modes.at(-1).mode!==mode)throw Error('Nesoulad Perception režimu s historií');
  for(let i=1;i<modes.length;i++)if(modes[i].previous!==modes[i-1].mode)throw Error('Poškozený řetězec voleb Perception');
 }
 if(c.perceptionProof!==undefined){
  if(!c.perceptionProof||typeof c.perceptionProof!=='object'||Array.isArray(c.perceptionProof))throw Error('Poškozený Perception důkaz');
  for(const [name,p] of Object.entries(c.perceptionProof)){
   if(!PERCEPTION_SENSES.includes(name)||!p||p.folk!==h.folk&&mode==='subattributes'||p.ageGroup!==h.ageGroup&&mode==='subattributes'||p.kind!==(character.kind||'PC')&&mode==='subattributes')throw Error('Zastaralý smyslový důkaz');
   const x=evaluatePerceptionDice({name,folk:p.folk,ageGroup:p.ageGroup,kind:p.kind,dice:p.rolls});
   const last=c.auditEvents.filter(e=>e.type==='perception-subattribute-dice'&&e.name===name).at(-1);
   if(!last||last.score!==x.score||p.score!==x.score||JSON.stringify(last.rolls)!==JSON.stringify(p.rolls))throw Error('Neplatný smyslový důkaz '+name);
   if(mode==='subattributes'&&h.attributes?.[name]!==x.score)throw Error('Nesoulad aktivního '+name);
  }
 }
 if(mode==='subattributes'&&PERCEPTION_SENSES.some(n=>!c.perceptionProof?.[n]))throw Error('Chybí tři smyslové atributy HMK p.57');
 if(mode==='standard'&&PERCEPTION_SENSES.some(n=>h.attributes?.[n]!==undefined))throw Error('Neaktivní smyslový atribut vstupuje do profilu');
 for(const [name,value] of Object.entries(h.advancement?.attributes??{})){
  if(!ATTRIBUTES.includes(name)||!Number.isSafeInteger(value)||value<0||value>99||!c.attributeProof[name])throw Error('Neplatná pozdější změna atributu '+name);
 }
 for(const [name,proof] of Object.entries(c.attributeProof)){
  if(!ATTRIBUTES.includes(name))throw Error('Neznámý důkaz fyzického atributu');
  const actual=evaluateAttributeDice({name,ageGroup:h.ageGroup,folk:h.folk,kind:character.kind||'PC',dice:proof.rolls});
  const last=c.auditEvents.filter(e=>e.type==='attribute-dice'&&e.name===name).at(-1);
  if(!last||JSON.stringify(last.rolls)!==JSON.stringify(proof.rolls)||last.score!==proof.score||
     JSON.stringify(actual)!==JSON.stringify(proof)||h.attributes?.[name]!==(h.advancement?.attributes?.[name]??actual.score))
   throw Error('Nesoulad uložených kostek a atributu '+name);
 }
 if(c.voiceProof){
  const proof=evaluateVoiceDice({folk:h.folk,dice:c.voiceProof.rolls});
  const last=c.auditEvents.filter(e=>e.type==='voice-dice').at(-1);
  if(!last||JSON.stringify(last.rolls)!==JSON.stringify(proof.rolls)||
    JSON.stringify(c.voiceProof)!==JSON.stringify(proof)||last.score!==proof.score||h.attributes?.voi!==proof.score)
   throw Error('Nesoulad fyzických hodů Voice se Singing');
 }
 if(c.completed[10]&&(ATTRIBUTES.some(n=>!c.attributeProof[n])||!c.voiceProof))
  throw Error('Dokončené Characteristics vyžadují fyzické důkazy 12 atributů a Voice');
 if(c.values.sunsignProof){
  const calculated=signFromBirthday(c.values.birthMonth,c.values.birthDay);
  if(JSON.stringify(calculated)!==JSON.stringify(c.values.sunsignProof))throw Error('Změněný vypočtený Sunsign důkaz');
  if(c.completed[3]&&h.sunsign!==calculated.primary+(calculated.secondary?' / '+calculated.secondary:''))
   throw Error('Změněný Sunsign postavy');
 }
 if(c.values.veteranRoundProof!==undefined&&c.values.veteranRoundsMode!=='yes')throw Error('Veteran: neplatný režim již doložených kol');
 if(c.values.veteranRoundProof!==undefined){
  const result=veteranRoundsProof(character,c.values.veteranRoundProof,skillDefinition,SKILL_STAGES,{complete:!!c.completed[12],priorPoints:name=>priorSkillDevelopment(character,name,'Veteran Skills')});
  if(JSON.stringify(result)!==JSON.stringify(c.skillDP['Veteran Skills']??{}))throw Error('Veteran: změněný zdroj DP ve dvou kolech');
 }
 if(c.completed[12]&&c.values.veteranRoundsMode==='yes'&&veteranRoundCount(h.folk,h.ageGroup)>0&&!c.values.veteranRoundProof)throw Error('Veteran: chybí doklad samostatných kol');
 for(const [stage,allocations] of Object.entries(c.skillDP)){
  if(!SKILL_STAGES.includes(stage)||!allocations||typeof allocations!=='object'||Array.isArray(allocations))throw Error('Neplatná etapa Skill DP');
  const sum=Object.values(allocations).reduce((n,x)=>n+Number(x),0);
  for(const [name,dp] of Object.entries(allocations)){
   const def=skillDefinition(character,name);
   if(!def||!Number.isSafeInteger(dp)||dp<0||dp>20)throw Error('Poškozené rozdělení Skill DP');
   const earlier=(until)=>priorSkillDevelopment(character,name,SKILL_STAGES[until]??'Sunsign Skills');
   if(stage==='Family Skills'&&c.values.familyAuto==='yes'){
    const priest=['Priest','Gentry: Priest'].includes(h.familyOccupation)&&c.values.familyRitualChoice?parentPriestRitual(character,c.values.familyVariantChoice):h.familyOccupation==='Shaman'&&c.values.familyRitualChoice?parentShamanRitual(character,c.values.familyRitualChoice):null;
    const printed=priest&&name===priest.skill?'Ritual':name;
    if(priest&&(name==='Ritual'||parseInstance(name)?.type==='Ritual'&&name!==priest.skill))throw Error('Family Ritual není z vlastního náboženství rodičů');
    if(dp>familySkillCap(familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence),printed==='Ritual'?printed:name))throw Error('Family DP mimo půlku Parent Occupation');
   }
   if(stage==='Background Skills'&&name==='Ritual')throw Error('HMK p.343: Background Ritual musí mít konkrétní náboženství');
   if(stage==='Background Skills'&&c.values.backgroundAuto==='yes'&&!availableBackgroundSkills(h.background,{folk:h.folk,viking:c.values.viking==='yes'||h.society==='Viking',emhle:isTribalEmhle(character)}).includes(parseInstance(name)?.type??name))throw Error('Background DP mimo ověřenou tabulku');
   if(stage==='Background Skills'&&dp>2)throw Error('Background Skill: nejvýše 2 DP');
   if(['Optional Skills','Veteran Skills','Sunsign Skills'].includes(stage)&&!(stage==='Veteran Skills'&&c.values.veteranRoundProof)&&!name.startsWith('Language (')&&dp>(earlier(SKILL_STAGES.indexOf(stage))>0?1:2))
    throw Error('Neplatný počet DP pro dříve rozvinutou Skill');
   if(['Optional Skills','Veteran Skills'].includes(stage)&&def.group==='Esoterica'&&def.baseSM+earlier(5)<1)
    throw Error('Esoterica Skill bez dřívějšího výcviku');
   if(stage==='Sunsign Skills'&&def.group==='Esoterica')throw Error('Neplatná Sunsign Esoterica DP');
  }
  if(stage==='Family Skills'&&c.values.familyAuto==='yes'&&!validateFamilySkillAllocation(familyOccupationProfile(h.familyOccupation,c.values.familyWeaponcrafterType,c.values.familyMartialChoice,c.values.familyVariantChoice,c.values.regionProof?.subsistence??c.values.subsistence),allocations))throw Error('Family DP přesahují sdílený profesní limit');
  if(['Background Skills','Optional Skills'].includes(stage)&&sum>5)throw Error('Neplatný součet pěti DP');
  if(stage==='Veteran Skills'){
   const budget=['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
   if(sum>budget)throw Error('Neplatný Veteran DP rozpočet');
  }
  if(stage==='Sunsign Skills'){
   if(!c.values.sunsignProof)throw Error('Sunsign DP bez fyzického d12/d30');
   for(const {group,value} of c.values.sunsignProof.dp){
    const assigned=Object.entries(allocations).reduce((n,[skill,points])=>n+(skillDefinition(character,skill)?.group===group?points:0),0);
    if(assigned>value)throw Error('Sunsign DP přesahují pravidlový příděl '+group);
   }
  }
 }
 if(c.completed[12]){
  if(c.values.familyAuto==='yes'&&Object.values(c.skillDP['Family Skills']??{}).reduce((n,x)=>n+x,0)!==5)throw Error('Chybí 5 Family DP');
  if(['Background Skills','Optional Skills'].some(g=>Object.values(c.skillDP[g]??{}).reduce((n,x)=>n+x,0)!==5))throw Error('Chybějících 5 Background/Optional DP');
  const available=['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
  if(Object.values(c.skillDP['Veteran Skills']??{}).reduce((n,x)=>n+x,0)!==available)throw Error('Neúplné Veteran DP');
  for(const {group,value} of c.values.sunsignProof.dp){
   const allocated=SKILL_DEFINITIONS.filter(d=>d.group===group).reduce((n,d)=>n+(c.skillDP['Sunsign Skills']?.[d.name]??0),0);
   if(allocated!==value)throw Error('Neúplné Sunsign DP '+group);
  }
 }
 const projected=new Map(calculateSheetSkills(character).map(x=>[x.name,x]));
 const existing=new Map((h.skills??[]).map(x=>[x.name,x]));
 for(const expected of projected.values()){
  if(expected.sb===null||expected.sm===0)continue;
  if(!existing.has(expected.name))throw Error('Chybí Skill v propojeném Character Sheet: '+expected.name);
 }
 for(const skill of h.skills??[]){
  if(!skill.creationDerived)continue;
  const check=projected.get(skill.name);
  if(!check||check.sb!==skill.sb||check.ml!==skill.ml||check.sm<=0)throw Error('Neplatný propojený Skill výpočet: '+skill.name);
 }
 return true;
}

/** Existing physical dice evidence may be appended to, never rewritten or removed. */
export function assertCreationHistoryAppendOnly(before,after){
 const old=new Map([...(before?.characters??[]),...(before?.trash??[])].map(c=>[c.id,c.hmk?.creation?.auditEvents??[]]));
 for(const row of [...(after?.characters??[]),...(after?.trash??[])]){
  if(!old.has(row.id))continue;
  const previous=old.get(row.id),latest=row.hmk?.creation?.auditEvents??[];
  if(latest.length<previous.length||JSON.stringify(previous)!==JSON.stringify(latest.slice(0,previous.length)))
   throw Error('Character Creation: fyzické GM hody nelze zpětně přepsat ani odstranit');
 }
 return true;
}
