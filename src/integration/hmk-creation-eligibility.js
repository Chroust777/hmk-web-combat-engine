import {parentPriestRitual} from './hmk-parent-priest-family.js';
/** HMK v1.2 pp.20–21,24,26–32,41,45–49. Selection constraints, shared by
 * the creation UI and the domain mutation. Pure: no DOM, storage or dice.
 * Unknown / not-yet-transcribed rule branches NEVER acquire invented choices.
 */
import {SOCIETY_TABLES,VERIFIED_REGIONS,regionRealmRows,OCCUPATIONS,occupationVariantNames,chieftainVariantForSubsistence,CHIEFTAIN_VARIANTS,priestReligionOf,isArcaneOccupationEligible,TRIBAL_INVOKER_VARIANTS,familyOccupationProfile,availableBackgroundSkills} from './hmk-creation-tables.js';
import {PARENT_OCCUPATION_TABLES} from './hmk-parent-occupation-tables.js';
import {SKILL_STAGES,SKILL_DEFINITIONS} from './hmk-character-creation.js';
import {languageChoices,SCRIPTS,religionChoices,instanceKey,parseInstance} from './hmk-skill-instances.js';
const uniq=a=>[...new Set(a)];
const d100Value=n=>/^[1-9]\d{0,2}$/.test(String(n))&&Number(n)<=100;
export function eligibleAges(folk){return folk==='Kúzhai'?['Mature']:['Sinái','Sidhé'].includes(folk)?['Young']:['Young','Mature','Old'];}
export function eligibleRealms(region,{folk=null}={}){return uniq(regionRealmRows(region).filter(x=>!(region==='Hârn'&&x.harnElder&&folk&&!['Human','Ænarin'].includes(folk))).map(x=>x.realm));}
export function eligibleSocietiesForRealm(region,realm){
 const rows=regionRealmRows(region);
 return VERIFIED_REGIONS[region]?uniq(rows.filter(r=>!realm||r.realm===realm).flatMap(r=>region==='Áltôr'&&r.alticTribal?['Tribal','Tribal-Settled']:[r.society])):null;
}
export function eligibleParentClasses(society,die=100){
 const table=SOCIETY_TABLES[society==='Feudal/Imperial'?'Feudal':society];
 return uniq(table?.[`d${die}`]?.map(x=>x[1])??[]);
}
export function parentOccupationSource(society,socialClass,{classRoll=null,classDie=100}={}){
 let s=({'City-State':'Imperial','Viking':'Tributary','Chélemby':'Tributary'})[society]??society;
 if(society==='Tribal-Settled'&&['Free','Priestly','Noble'].includes(socialClass))s='Tribal';
 if(society==='Feudal/Imperial'){
  // Only Noble has a conditional source table. Until its Class roll exists,
  // display both verified sources, not an imaginary default one.
  s=socialClass==='Noble'?(classRoll!==null&&String(classRoll).trim()!==''?(Number(classRoll)%2?'Feudal':'Imperial'):null):'Feudal';
 }
 return s;
}
export function eligibleParentOccupations(society,socialClass,opts={}){
 if(['Tribal','Tribal-Settled'].includes(society)&&socialClass==='Free')return uniq(['Farming','Fishing','Foraging','Herding'].flatMap(x=>Object.keys(TRIBAL_FREE[x]??{})));
 const source=parentOccupationSource(society,socialClass,opts);
 const sources=source===null?['Feudal','Imperial']:[source];
 return uniq(sources.flatMap(s=>(PARENT_OCCUPATION_TABLES[s]?.[socialClass]??[]).map(r=>r.name)));
}
const TRIBAL_FREE={Farming:{Farmer:1,Fisher:1,Herder:1,Hunter:1},Fishing:{Fisher:1,Herder:1,Hunter:1},Foraging:{Fisher:1,Herder:1,Hunter:1},Herding:{Herder:1,Hunter:1}};
export function eligibleFamilyOccupationNames(society,socialClass,{subsistence='Foraging',...opts}={}){
 if(['Tribal','Tribal-Settled'].includes(society)&&socialClass==='Free')return Object.keys(TRIBAL_FREE[subsistence]??{});
 return eligibleParentOccupations(society,socialClass,opts);
}
// PC Occupation is normally limited to occupations in a class no higher than
// the parents' class (HMK p.35 / 41). Untranscribed tables are NOT guessed.
const RANKS={
 Feudal:['Unfree','Free','Guilded','Military','Priestly','Noble'],Imperial:['Unfree','Free','Guilded','Military','Priestly','Noble'],
 'City-State':['Unfree','Free','Guilded','Military','Priestly','Noble'], 'Feudal/Imperial':['Unfree','Free','Guilded','Military','Priestly','Noble'],
 Tributary:['Unfree','Free','Guilded','Military','Priestly','Noble'],Viking:['Unfree','Free','Guilded','Military','Priestly','Noble'],Chélemby:['Unfree','Free','Guilded','Military','Priestly','Noble'],
 Tribal:['Unfree','Free','Priestly','Noble'],'Tribal-Settled':['Unfree','Free','Guilded','Priestly','Noble'],
 Sináin:['Free','Crafter','Military','Valpalen']
};
function toJob(raw){
 if(raw.startsWith('Gentry: ')){
  const job=raw.slice(8);return job==='Arcanist'?['Alchemist','Astrologer','Shèk-Pvâr']:[job==='Cartographer'?'Cartographer/Artist':job];
 }
 if(raw==='Arcanist')return ['Alchemist','Astrologer','Shèk-Pvâr'];
 if(raw==='Slave')return ['Slave (Craft)','Slave (Domestic)','Slave (Farming)','Slave (Fishing)','Slave (Herding)', 'Slave (Gladiator)'];
 if(raw==='Hunter or Trapper')return ['Hunter','Trapper'];
 if(raw==='Chieftain')return [...CHIEFTAIN_VARIANTS];
 if(raw==='Weaponcrafter')return ['Weaponcrafter (Armourer)','Weaponcrafter (Bowyer)'];
 if(occupationVariantNames(raw).length)return occupationVariantNames(raw);
 if(raw==='Man-at-arms (Archer)')return ['Man-at-arms (Archer)','Man-at-arms (Archer, Slings)'];
 if(raw==='Man-at-arms (Cavalry)')return ['Man-at-arms (Cavalry, Melee)']; // missile branch GM review
 if(raw==='Yeoman (Archer)'||raw==='Yeoman (Foot)'||raw==='Yeoman (Horse)')return [raw];
 return [raw];
}
export function eligibleOccupations(character){
 const h=character?.hmk??{},society=h.society,cls=h.socialClass;
 if(!society||!cls)return [];
 // HMK p.417: native Dalkesh castes inherit parental occupation; GM
 // adoption/marriage exceptions require their own explicit approval flow.
 if(h.birthRegion==='Dalkésh'&&h.familyOccupation)
  return toJob(h.familyOccupation);
 let classes;
 if(society==='Kúzhan')classes=[cls]; // seven vocational people, not interchangeable ranks
 else{const order=RANKS[society];if(!order||!order.includes(cls))return [];
 classes=order.slice(0,order.indexOf(cls)+1);}
 const jobs=[];
 for(const group of classes){
  if(['Tribal','Tribal-Settled'].includes(society)&&group==='Free'){
   const livelihood=h.creation?.values?.regionProof?.subsistence??h.creation?.values?.subsistence;
   jobs.push(...(livelihood&&TRIBAL_FREE[livelihood]?Object.keys(TRIBAL_FREE[livelihood]):Object.values(TRIBAL_FREE).flatMap(x=>Object.keys(x))));continue;
  }
  const source=parentOccupationSource(society,group,{classRoll:h.creation?.values?.classRoll,classDie:h.creation?.values?.classDie});
  for(const s of (source===null?['Feudal','Imperial']:[source]))for(const row of PARENT_OCCUPATION_TABLES[s]?.[group]??[])jobs.push(...toJob(row.name));
 }
 const subsistence=h.creation?.values?.regionProof?.subsistence??h.creation?.values?.subsistence;
 const allowedChief=chieftainVariantForSubsistence(subsistence);
 return uniq(jobs).filter(n=>
  (!CHIEFTAIN_VARIANTS.includes(n)||n===allowedChief) &&
  (!priestReligionOf(n)||religionChoices(character).includes(priestReligionOf(n))||(n==='Priest (Siém: Runecraft)'&&h.folk==='Kúzhai')) &&
  isArcaneOccupationEligible(character,n) &&
  (!TRIBAL_INVOKER_VARIANTS.includes(n)||['Tribal','Tribal-Settled'].includes(society)) &&
  (n!=='Priest (Siém: Runecraft)'||h.folk==='Kúzhai') &&
  (n!=='Priest (Siém: Astrology)'||h.folk!=='Kúzhai')
 ).sort((a,b)=>a.localeCompare(b,'en'));
}
export function eligibleSkills(character,stageName=null){
 const h=character?.hmk??{},c=h.creation??{},stage=stageName??SKILL_STAGES[c.skillStage]??'Folk Skills';
 const v=c.values??{},dp=c.skillDP??{},selected=dp[stage]??{};
 let pool=[];
 if(stage==='Family Skills'){
  const parent=familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);
  const priest=h.familyOccupation==='Priest'?parentPriestRitual(character,v.familyVariantChoice):null;
  pool=parent?Object.keys(parent.skills).filter(name=>Math.floor(parent.skills[name]/2)>0).map(name=>name==='Ritual'&&priest?priest.skill:name):[];
  // Family Script is selected by the parent-specific choice, while the
  // printed DP remains one Skill allocation (never a second counter).
 }else if(stage==='Background Skills'){
  try{pool=availableBackgroundSkills(h.background,{folk:h.folk,viking:v.viking==='yes'||h.society==='Viking'});}catch{pool=[];}
  if(pool.includes('Language'))pool.push(...languageChoices(character).map(n=>instanceKey('Language',n)));
  if(pool.includes('Script'))pool.push(...SCRIPTS.map(n=>instanceKey('Script',n)));
 }else if(stage==='Occupation Skills'){
  pool=Object.keys(OCCUPATIONS[character.occupation]?.skills??{});
 }else if(stage==='Optional Skills'||stage==='Veteran Skills'){
  const preceding=stage==='Optional Skills'?SKILL_STAGES.slice(0,5):SKILL_STAGES.slice(0,6);
  pool=SKILL_DEFINITIONS.filter(def=>{
   if(def.group!=='Esoterica')return true;
   return def.baseSM+preceding.reduce((sum,g)=>sum+(dp[g]?.[def.name]??0),0)>=1;
  }).map(x=>x.name);
  pool=pool.filter(n=>!['Language','Script','Ritual'].includes(n));
  pool.push(...languageChoices(character).map(n=>instanceKey('Language',n)),
   ...SCRIPTS.map(n=>instanceKey('Script',n)),
   ...religionChoices(character).map(n=>instanceKey('Ritual',n)),
   ...new Set((c.values?.arcaneTalentProof?.generated??[]).map(n=>instanceKey('Talent',n))));
  if(stage==='Veteran Skills'&&h.ageGroup==='Young'&&!['Kúzhai','Sinái','Sidhé'].includes(h.folk))pool=[];
 }else if(stage==='Sunsign Skills'){
  const sign=v.sunsignProof;
  pool=sign?SKILL_DEFINITIONS.filter(d=>d.group!=='Esoterica'&&sign.dp.some(p=>p.group===d.group&&p.value>0)).map(d=>d.name):[];
  if(sign){pool=pool.filter(name=>{
    const group=SKILL_DEFINITIONS.find(def=>def.name===name).group;
    const budget=sign.dp.find(x=>x.group===group)?.value??0;
    const used=SKILL_DEFINITIONS.filter(x=>x.group===group).reduce((sum,x)=>sum+(selected[x.name]??0),0);
    return used<budget||Object.prototype.hasOwnProperty.call(selected,name);
  });}
 }
 // No other skill can be allocated after the stage's allowance is exhausted.
 const cap=({'Family Skills':5,'Background Skills':5,'Optional Skills':5})[stage]??
  (stage==='Veteran Skills'?(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0):null);
 if(cap!==null&&Object.values(selected).reduce((sum,n)=>sum+n,0)>=cap)pool=pool.filter(name=>Object.prototype.hasOwnProperty.call(selected,name));
 return uniq(pool);
}
export function eligibleBackgrounds(character,overrides={}){
 const h=character?.hmk??{},v={...(h.creation?.values??{}),...overrides};
 if(h.society==='Tribal'&&v.tribalUnsettled!=='no')return ['Wilderness'];
 const proof=v.parentOccupationProof,urban=proof?.urbanChance??v.urbanChance;
 if(urban===undefined||urban===null||urban==='')return ['Urban','City','Rural','Wilderness']; // GM has not supplied the chance yet
 // The physical-die resolver will automatically select the exact result when entered.
 const chance=Number(urban);
 if(!Number.isInteger(chance)||chance<0||chance>100)return [];
 const names=h.folk==='Kúzhai'?[]:['Urban'];if(chance>0&&!['Sinái','Sidhé'].includes(h.folk))names.push('City');
 if(h.folk==='Kúzhai'&&chance>0&&!names.includes('City'))names.push('City');if(chance<100)names.push('Rural');if(chance<=10)names.push('Wilderness');
 return uniq(names);
}
