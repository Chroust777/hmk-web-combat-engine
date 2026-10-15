import {isTribalEmhle} from './hmk-creation-special-skill-grants.js';
import {parentPriestRitual} from './hmk-parent-priest-family.js';
/** HMK v1.2 pp.20–21,24,26–32,41,45–49. Selection constraints, shared by
 * the creation UI and the domain mutation. Pure: no DOM, storage or dice.
 * Unknown / not-yet-transcribed rule branches NEVER acquire invented choices.
 */
import {SOCIETY_TABLES,VERIFIED_REGIONS,regionRealmRows,regionAllowedForFolk,OCCUPATIONS,occupationVariantNames,SLAVE_VARIANTS,chieftainVariantForSubsistence,CHIEFTAIN_VARIANTS,priestReligionOf,isArcaneOccupationEligible,TRIBAL_INVOKER_VARIANTS,familyOccupationProfile,availableBackgroundSkills} from './hmk-creation-tables.js';
import {PARENT_OCCUPATION_TABLES} from './hmk-parent-occupation-tables.js';
import {parentShamanRitual,verifiedParentShamanVariants} from './hmk-parent-shaman-family.js';
import {SKILL_STAGES,SKILL_DEFINITIONS} from './hmk-character-creation.js';
import {languageChoices,SCRIPTS,religionChoices,instanceKey,parseInstance} from './hmk-skill-instances.js';
const uniq=a=>[...new Set(a)];
const d100Value=n=>/^[1-9]\d{0,2}$/.test(String(n))&&Number(n)<=100;
export function eligibleAges(folk){return folk==='Kúzhai'?['Mature']:['Sinái','Sidhé'].includes(folk)?['Young']:folk==='Malákta'?['Young','Mature']:['Young','Mature','Old'];}
export function eligibleRealms(region,{folk=null}={}){if(folk&&!regionAllowedForFolk(region,folk))return [];return uniq(regionRealmRows(region).filter(x=>!(region==='Hârn'&&x.harnElder&&folk&&!['Human','Ænarin'].includes(folk))).map(x=>x.realm));}
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
 Sináin:['Free','Crafter','Military','Valpalen'],Malák:['Military'],Mizúni:['Free','Crafter','Noble']
};
function toJob(raw){
 if(raw.startsWith('Gentry: ')){
  const job=raw.slice(8);return job==='Arcanist'?['Alchemist','Astrologer','Shèk-Pvâr']:[job==='Cartographer'?'Cartographer/Artist':job];
 }
 if(raw==='Arcanist')return ['Alchemist','Astrologer','Shèk-Pvâr'];
 if(raw==='Tenant Officer')return ['Tenant Officer (Beadle)','Tenant Officer (Herder)','Tenant Officer (Reeve)','Tenant Officer (Woodward)'];
 if(raw==='Slave')return [...SLAVE_VARIANTS, 'Slave (Gladiator)'];
 if(raw.startsWith('Slave (')&&!raw.includes(':'))return raw==='Slave (Gladiator)'?[raw]:occupationVariantNames(raw);
 if(raw==='Hunter or Trapper')return ['Hunter','Trapper'];
 if(raw==='Farmer (Thrall)')return ['Farmer'];
 if(raw==='Priest (Siém)')return ['Priest (Siém: Astrology)'];
 if(raw==='Servant')return ['Servant, Domestic'];
 if(raw==='Artist')return ['Cartographer/Artist'];
 if(raw==='Chieftain')return [...CHIEFTAIN_VARIANTS];
 if(raw==='Weaponcrafter')return ['Weaponcrafter (Armourer)','Weaponcrafter (Bowyer)'];
 if(occupationVariantNames(raw).length)return occupationVariantNames(raw);
 if(raw==='Man-at-arms (Archer)')return ['Man-at-arms (Archer)','Man-at-arms (Archer, Slings)'];
 if(raw==='Man-at-arms (Cavalry)')return ['Man-at-arms (Cavalry, Melee)',...['Archery','Slings','Throwing'].map(n=>`Man-at-arms (Cavalry, Missile: ${n})`)]; // printed Missile 3: concrete GM projectile choice, p.43
 if(raw==='Yeoman (Archer)'||raw==='Yeoman (Foot)'||raw==='Yeoman (Horse)')return [raw];
 return [raw];
}
export function eligibleOccupations(character){
 const h=character?.hmk??{},society=h.society,cls=h.socialClass;
 if(!society||!cls)return [];
 // In Dalkésh the occupational candidate is inherited (HMK App. I p.417),
 // but inheritance never waives Religion, Folk or Arcane Talent prerequisites.
 // All candidates go through the SAME rule predicate below.
 const dalkeshInherited=h.birthRegion==='Dalkésh'&&h.familyOccupation;
 let jobs=[];
 if(dalkeshInherited){
  jobs=toJob(h.familyOccupation);
 }else{
  let classes;
  if(society==='Kúzhan')classes=[cls];
  else{const order=RANKS[society];if(!order||!order.includes(cls))return [];
   classes=order.slice(0,order.indexOf(cls)+1);}
  for(const group of classes){
   if(['Tribal','Tribal-Settled'].includes(society)&&group==='Free'){
    const livelihood=h.creation?.values?.regionProof?.subsistence??h.creation?.values?.subsistence;
    jobs.push(...(livelihood&&TRIBAL_FREE[livelihood]?Object.keys(TRIBAL_FREE[livelihood]):Object.values(TRIBAL_FREE).flatMap(x=>Object.keys(x))));continue;
   }
   const source=parentOccupationSource(society,group,{classRoll:h.creation?.values?.classRoll,classDie:h.creation?.values?.classDie});
   for(const s of (source===null?['Feudal','Imperial']:[source]))for(const row of PARENT_OCCUPATION_TABLES[s]?.[group]??[])jobs.push(...toJob(row.name));
  }
 }
 const subsistence=h.society==='Mizúni'?'Herding':h.creation?.values?.regionProof?.subsistence??h.creation?.values?.subsistence;
 const allowedChief=chieftainVariantForSubsistence(subsistence);
 return uniq(jobs).filter(n=>
  // A published GM title is not automatically an implemented PC profile.
  // Never expose such titles as fully automatic or silently invent DP/Wealth.
  Object.hasOwn(OCCUPATIONS,n) &&
  (!CHIEFTAIN_VARIANTS.includes(n)||n===allowedChief) &&
  (!priestReligionOf(n)||religionChoices(character).includes(priestReligionOf(n))||(n==='Priest (Siém: Runecraft)'&&h.folk==='Kúzhai')) &&
  // Some Shaman/Invoker entries require a named Ritual. A society with no
  // verified local pantheon cannot complete such a profile unattended.
  (!OCCUPATIONS[n].skills.Ritual||religionChoices(character).length>0) &&
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
  const priest=['Priest','Gentry: Priest'].includes(h.familyOccupation)?parentPriestRitual(character,v.familyVariantChoice):null;
  const shaman=h.familyOccupation==='Shaman'&&verifiedParentShamanVariants(character).includes(v.familyVariantChoice)?parentShamanRitual(character,v.familyRitualChoice):null;
  pool=parent?Object.keys(parent.skills).filter(name=>Math.floor(parent.skills[name]/2)>0).flatMap(name=>
   name==='Ritual'&&(priest||shaman)?[(priest||shaman).skill]:
   name==='Scripts'?SCRIPTS.map(script=>instanceKey('Script',script)):
   name==='Language'?languageChoices(character).map(lang=>instanceKey('Language',lang)):[name]):[];
  // Family Script is selected by the parent-specific choice, while the
  // printed DP remains one Skill allocation (never a second counter).
 }else if(stage==='Background Skills'){
  try{pool=availableBackgroundSkills(h.background,{folk:h.folk,viking:v.viking==='yes'||h.society==='Viking',emhle:isTribalEmhle(character)});}catch{pool=[];}
  if(pool.includes('Language'))pool.push(...languageChoices(character).map(n=>instanceKey('Language',n)));
  if(pool.includes('Script'))pool.push(...SCRIPTS.map(n=>instanceKey('Script',n)));
  if(pool.includes('Ritual')){pool=pool.filter(n=>n!=='Ritual');pool.push(...religionChoices(character).map(n=>instanceKey('Ritual',n)));}
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
  // HMK pp.47–49: Sunsign may improve Language, Script and Ritual, but
  // never an unbound generic skill. Each named skill spends from the SAME
  // printed Sunsign-group pool, with no extra group allowance per variant.
  pool=sign?SKILL_DEFINITIONS.filter(d=>d.group!=='Esoterica'&&sign.dp.some(p=>p.group===d.group&&p.value>0)).flatMap(d=>
    d.name==='Language'?languageChoices(character).map(x=>instanceKey('Language',x)):
    d.name==='Script'?SCRIPTS.map(x=>instanceKey('Script',x)):
    d.name==='Ritual'?religionChoices(character).map(x=>instanceKey('Ritual',x)):[d.name]):[];
  if(sign){pool=pool.filter(name=>{
    const printed=parseInstance(name)?.type??name;
    const group=SKILL_DEFINITIONS.find(def=>def.name===printed)?.group;
    const budget=sign.dp.find(x=>x.group===group)?.value??0;
    const used=Object.entries(selected).reduce((sum,[key,points])=>{
      const base=parseInstance(key)?.type??key;
      return sum+(SKILL_DEFINITIONS.find(def=>def.name===base)?.group===group?points:0);
    },0);
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
 if(['Malákta','Nâdi'].includes(h.folk))return ['Wilderness'];
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
