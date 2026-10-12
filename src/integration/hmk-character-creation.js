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
export const FOLKS=Object.freeze(['Human','Kúzhai','Ænarin','Sinái','Sidhé']);
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
export function backgroundFromRoll(die,urbanChance,{unsettledTribal=false}={}){
 if(unsettledTribal)return 'Wilderness';
 const d=normalizeRoll(die,100),u=Number(urbanChance);
 if(!Number.isInteger(u)||u<0||u>100)throw Error('Urban chance musí být 0–100 podle Parent Occupation');
 const unusual=d%5===0;
 return d<=u?(unusual?'City':'Urban'):(u<=10&&unusual?'Wilderness':'Rural');
}
const PHYSICAL=['str','end','dex','agl','per','cml'],MENTAL=['aur','wil','rea','cre','emp','elo'];
export const ATTRIBUTES=Object.freeze([...PHYSICAL,...MENTAL]);
const PHYS_MOD={Human:[0,0,0,0,0,0], 'Ænarin':[0,0,1,1,2,1],Kúzhai:[2,2,1,0,1,0],Sinái:[0,0,2,2,3,2],Sidhé:[0,0,3,3,5,4]};
const MENT_MOD={Human:[0,0,0,0,0,0], 'Ænarin':[2,1,0,1,3,1],Kúzhai:[-2,3,0,0,-2,0],Sinái:[4,2,0,2,2,3],Sidhé:[6,2,0,3,1,4]};
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
 return ['Sinái','Sidhé'].includes(folk)?{count:5,drop:2}:{count:4,drop:1};
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
export function skillBase(primary,secondary){
 if(!Number.isInteger(primary)||!Number.isInteger(secondary))return null;
 const average=(primary+secondary)/2;
 return primary>secondary?Math.ceil(average):Math.floor(average);
}
export function calculateSkill(definition,attributes,allocations={}){
 const a=attributes?.[definition.primary],b=attributes?.[definition.secondary];
 const sb=skillBase(a,b);const sources=SKILL_STAGES.map(stage=>({stage,dp:allocations[stage]?.[definition.name]??0}));
 const totalDP=sources.reduce((n,x)=>n+x.dp,0);
 if(sources.some(x=>!Number.isSafeInteger(x.dp)||x.dp<0||x.dp>100))throw Error('Neplatná alokace Skill DP');
 const sm=Math.min(5,definition.baseSM+totalDP);let boosts=Math.max(0,definition.baseSM+totalDP-5);
 let ml=sb===null?null:sb*sm;
 const increase=[];while(boosts>0&&ml!==null){const boost=ml<=39?10:ml<=44?9:ml<=49?8:ml<=59?7:ml<=69?6:ml<=79?5:ml<=99?4:3;const applied=Math.min(boost,Math.max(0,sb*7-ml));increase.push({from:ml,boost:applied});ml+=applied;boosts--;}
 return {...definition,sb,sm,ml,primaryValue:a??null,secondaryValue:b??null,baseML:sb===null?null:sb*definition.baseSM,dp:sources,totalDP,boosts:increase,mlCap:sb===null?null:sb*7};
}
export function calculateSheetSkills(character){
 const h=character?.hmk??{},creation=h.creation??{};const attrs=h.attributes??{};
 const normal=SKILL_DEFINITIONS.map(def=>calculateSkill(def,attrs,creation.skillDP??{}));
 const inherited=[
  {name:'Shock',parent:'Initiative',primary:'str',secondary:'end'},
  {name:'Dodge',parent:'Melee',primary:'agl',secondary:'per'}
 ];
 return [...normal,...inherited.map(x=>{
  const source=SKILL_DEFINITIONS.find(d=>d.name===x.parent);
  const sourceAlloc={};for(const [stage,points] of Object.entries(creation.skillDP??{}))sourceAlloc[stage]={[x.name]:points[x.parent]??0};
  return {...calculateSkill({group:'Combat',name:x.name,primary:x.primary,secondary:x.secondary,baseSM:source.baseSM,sourcePage:49},attrs,sourceAlloc),subskillOf:x.parent};
 })];
}
export function defaultCreation(){return {version:1,step:1,skillStage:0,values:{},skillDP:{},attributeProof:{},voiceProof:null,auditEvents:[],completed:{},reviewRequired:true};}
export function creationOf(character){return character?.hmk?.creation??defaultCreation()}
export function folkFromDie(n){n=normalizeRoll(n,100);return n<=90?'Human':n<=95?'Kúzhai':n===96?'Ænarin':n<=99?'Sinái':'Sidhé'}
export function ageFromDie(n,folk='Human'){if(folk==='Kúzhai')return 'Mature';if(folk==='Sinái'||folk==='Sidhé')return 'Young';n=normalizeRoll(n,100);return n<=35?'Young':n<=85?'Mature':'Old'}
export function fateML(aura){if(!Number.isInteger(aura)||aura<4)return null;return 35+5*Math.floor((aura-4)/2)}
export function applyCreationPatch(character,patch){
 const clone=structuredClone(character),h=clone.hmk??={},c=structuredClone(h.creation??defaultCreation());
 if(!patch||!Number.isInteger(patch.step)||patch.step<1||patch.step>14)throw Error('Neplatný krok');
 if(patch.step!==c.step)throw Error('Krok průvodce se změnil');
 // Back / Edit navigation must never demand answers to a step not yet completed.
 if(patch.back||patch.jump){
  if(patch.jump){if(!Number.isInteger(patch.jump)||patch.jump<1||patch.jump>14)throw Error('Neplatný krok návratu');c.step=patch.jump;if(c.step===12)c.skillStage=0;for(let k=patch.jump;k<=14;k++)delete c.completed[k];}
  else if(c.step===12&&c.skillStage>0)c.skillStage--;
  else{c.step=Math.max(1,c.step-1);if(c.step===12)c.skillStage=7;}
  c.status='in-progress';h.creation=c;clone.hmk=h;return clone;
 }
 const previousValues={...c.values};
 c.values={...c.values,...(patch.values??{})};
 if(patch.step<14&&Object.keys(patch.values??{}).length){c.status='in-progress';}
 const changed=(key)=>patch.values&&Object.prototype.hasOwnProperty.call(patch.values,key)&&patch.values[key]!==previousValues[key];
 const invalidateStage=(name)=>{delete c.skillDP?.[name];delete c.completed[12];c.status='in-progress'};
 if(patch.step===3&&(changed('birthMonth')||changed('birthDay'))){delete c.values.sunsignTraits;delete c.values.sunsignTraitSecondary;delete c.values.traitRoll;delete c.values.traitRollSecondary;delete c.completed[4];invalidateStage('Sunsign Skills')}
 if(patch.step===6&&changed('socialClass'))invalidateStage('Family Skills');
 if(patch.step===7&&changed('familyOccupation'))invalidateStage('Family Skills');
 if(patch.step===8&&changed('background'))invalidateStage('Background Skills');
 if(patch.step===11&&changed('occupation'))invalidateStage('Occupation Skills');
 if(patch.step===9&&changed('estrangementRoll')){delete c.values.wealth;delete c.completed[13];}

 // Revisiting a prerequisite invalidates affected derived evidence rather than
 // silently retaining modifiers or attributes calculated for another Folk/Age.
 if(patch.step===1&&patch.values?.folk&&patch.values.folk!==h.folk ||
    patch.step===2&&patch.values?.ageGroup&&patch.values.ageGroup!==h.ageGroup){
    c.attributeProof={};c.voiceProof=null;for(const a of [...ATTRIBUTES,'voi'])delete (h.attributes??={})[a];
    c.skillDP={};c.skillStage=0;
    for(let k=10;k<=14;k++)delete c.completed[k];
 }

 if(patch.step===1){if(!FOLKS.includes(c.values.folk))throw Error('Vyberte Folk z pravidlového seznamu');
  if(c.values.folkRoll!==undefined&&c.values.folkRoll!==''){
   if(folkFromDie(c.values.folkRoll)!==c.values.folk)throw Error('Folk neodpovídá fyzickému d100 (p.20)');}
  h.folk=c.values.folk;}
 if(patch.step===2){let age=c.values.ageGroup;if(!AGE_GROUPS.includes(age))throw Error('Vyberte Age Group');if(c.values.folk==='Kúzhai'&&age!=='Mature'||['Sinái','Sidhé'].includes(c.values.folk)&&age!=='Young')throw Error('Nesprávná věková skupina Elder Folk');
  if(c.values.ageRoll!==undefined&&c.values.ageRoll!==''&&!['Kúzhai','Sinái','Sidhé'].includes(c.values.folk)&&ageFromDie(c.values.ageRoll,c.values.folk)!==age)throw Error('Age neodpovídá fyzickému d100 (p.21)');
  h.ageGroup=age;}
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
 if(patch.step===5){if(!String(c.values.birthplace??'').trim()||!String(c.values.society??'').trim())throw Error('Uveďte Birthplace Region/Realm a Society');h.birthplace=c.values.birthplace;h.society=c.values.society;}
 if(patch.step===6){if(!String(c.values.socialClass??'').trim())throw Error('Vyberte Parent Social Class');
  if(c.values.classRoll!==undefined&&c.values.classRoll!==''&&String(h.society).toLowerCase()==='feudal'&&feudalParentClass(c.values.classRoll,Number(c.values.classDie||100))!==c.values.socialClass)throw Error('Feudal Parent Class neodpovídá fyzickému d20/d100 (p.26)');
  h.socialClass=c.values.socialClass;}
 if(patch.step===7){if(!String(c.values.familyOccupation??'').trim())throw Error('Určete Parent Occupation');h.familyOccupation=c.values.familyOccupation;}
 if(patch.step===8){if(!['Urban','City','Rural','Wilderness'].includes(c.values.background))throw Error('Vyberte ověřený Background');
  if(c.values.tribalUnsettled==='yes'&&c.values.background!=='Wilderness')throw Error('Unsettled Tribal Background je Wilderness (p.33)');
  if(c.values.backgroundRoll!==undefined&&c.values.backgroundRoll!==''&&backgroundFromRoll(c.values.backgroundRoll,c.values.urbanChance)!==c.values.background)throw Error('Background neodpovídá fyzickému d100 a Urban chance (p.33)');
  h.background=c.values.background;}
 if(patch.step===9){const r=normalizeRoll(c.values.estrangementRoll,100);h.estrangement=(r<=10?'Outcast':r<=40?'Unpopular':r<=60?'Accepted':r<=95?'Popular':'Favourite')+' '+r;}
 if(patch.step===10){if(patch.attribute){const x=patch.attribute,proof=evaluateAttributeDice({name:x.name,ageGroup:h.ageGroup,folk:h.folk,kind:clone.kind||'PC',dice:x.dice});
   c.auditEvents??=[];
   const event={sequence:c.auditEvents.length+1,type:'attribute-dice',name:x.name,rolls:[...proof.rolls],score:proof.score};
   c.auditEvents.push(event);
   c.attributeProof[x.name]=proof;h.attributes={...(h.attributes||{}),[x.name]:proof.score};}
   else if(ATTRIBUTES.some(key=>!c.attributeProof[key]))throw Error('Nejprve zadejte všech 12 fyzických souborů hodů d6');
   if(patch.voice){
    const proof=evaluateVoiceDice({folk:h.folk,dice:patch.voice.dice});
    c.auditEvents.push({sequence:c.auditEvents.length+1,type:'voice-dice',rolls:[...proof.rolls],score:proof.score});
    c.voiceProof=proof;h.attributes={...(h.attributes||{}),voi:proof.score};
   }
 }
 if(patch.step===11){if(!String(c.values.occupation??'').trim())throw Error('Určete Occupation');clone.occupation=c.values.occupation;}
 if(patch.step===12){
   const stage=SKILL_STAGES[c.skillStage];
   if(patch.skillAllocation){const {skillName,dp}=patch.skillAllocation;
    const def=SKILL_DEFINITIONS.find(x=>x.name===skillName);
    if(!def||!Number.isSafeInteger(dp)||dp<0||dp>20)throw Error('Neplatná alokace DP');
    if(stage==='Optional Skills'&&dp>2)throw Error('Optional Skills: nejvýše 2 DP při první výuce, jinak 1 DP (p.48)');
    if(stage==='Optional Skills'&&dp>1&&SKILL_STAGES.slice(0,5).some(group=>(c.skillDP[group]?.[skillName]??0)>0))throw Error('Optional Skills: již vyvinutý Skill má limit 1 DP (p.48)');
    if(stage==='Optional Skills'&&def.group==='Esoterica'&&def.baseSM+SKILL_STAGES.slice(0,5).reduce((total,group)=>total+(c.skillDP[group]?.[skillName]??0),0)<1)throw Error('Esoterica Skill nesmí poprvé vzniknout v Optional Skills (p.48)');
    const nextStage={...(c.skillDP[stage]??{}),[skillName]:dp};
    const total=Object.values(nextStage).reduce((n,x)=>n+x,0);
    if(['Background Skills','Optional Skills'].includes(stage)&&total>5)throw Error('Toto stadium má nejvýše 5 DP');
    if(stage==='Background Skills'&&dp>2)throw Error('Background Skill může dostat nejvýše 2 DP (p.48)');
    if(stage==='Veteran Skills'){
      const available=['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
      if(total>available)throw Error(`Veteran Skill přesahuje ${available} DP (p.49)`);
      // HMK p.49: max two DP only when this skill has no previous DP;
      // otherwise one, separately in each five-DP Veteran pool.
      const prior=SKILL_STAGES.slice(0,6).reduce((n,g)=>n+(c.skillDP[g]?.[skillName]??0),0);
      if(dp>1&&prior>0)throw Error('Veteran Skill se staršími DP může dostat nejvýše 1 DP (p.49)');
      if(dp>2)throw Error('Veteran Skill může dostat nejvýše 2 DP (p.49)');
    }
    if(stage==='Sunsign Skills'){
      const prior=SKILL_STAGES.slice(0,7).reduce((n,g)=>n+(c.skillDP[g]?.[skillName]??0),0);
      if(dp>1&&prior>0)throw Error('Sunsign Skill se staršími DP může dostat nejvýše 1 DP (p.49)');
      if(dp>2)throw Error('Sunsign Skill může dostat nejvýše 2 DP (p.49)');
      const proof=c.values.sunsignProof;if(!proof)throw Error('Před Sunsign DP je nutný fyzický birthday d12/d30');
      const allowed=proof.dp.find(x=>x.group===def.group)?.value??0;
      const groupTotal=SKILL_DEFINITIONS.filter(x=>x.group===def.group).reduce((n,x)=>n+(nextStage[x.name]??0),0);
      if(groupTotal>allowed)throw Error(`${def.group}: Sunsign dovoluje jen ${allowed} DP (p.23)`);
      if(def.group==='Esoterica')throw Error('Sunsign Skill DP patří do mundane Skill Groups (p.23)');
    }
    c.skillDP[stage]=nextStage;
   }
   if(patch.advance){
      const sum=Object.values(c.skillDP[stage]??{}).reduce((n,x)=>n+x,0);
      if(stage==='Optional Skills'&&sum!==5)throw Error('Optional Skills: přidělte přesně 5 DP (p.48)');
      if(stage==='Background Skills'&&sum!==5)throw Error('Background Skills: přidělte přesně 5 DP (p.48)');
      if(stage==='Veteran Skills'){
       const required=['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
       if(sum!==required)throw Error(`Veteran Skills: přidělte přesně ${required} DP (p.49)`);
      }
      if(stage==='Sunsign Skills'){
       const proof=c.values.sunsignProof;if(!proof)throw Error('Chybí Sunsign DP');
       for(const x of proof.dp){const used=SKILL_DEFINITIONS.filter(def=>def.group===x.group).reduce((n,def)=>n+(c.skillDP[stage]?.[def.name]??0),0);
        if(used!==x.value)throw Error(`${x.group}: Sunsign DP musí být rozděleny ${x.value}, aktuálně ${used}`);}
      }
   }
 }
 if(patch.step===13){const wealth=Number(c.values.wealth);if(!Number.isInteger(wealth)||wealth<0||wealth>999)throw Error('Neplatný GM potvrzený Wealth');h.standing=String(wealth);h.wealth=wealth;}
 if(patch.step===14){h.fatePoints=5;h.fateML=fateML(h.attributes?.aur);if(h.fateML===null)throw Error('Fate vyžaduje ověřený Aura atribut');}
 // Persist every *physical* roll from the current rule-backed step, not only
 // attribute d6. Previous entries are immutable even if the GM later edits a
 // choice and enters a fresh roll in the same field.
 const physicalFields={1:{folkRoll:100},2:{ageRoll:100},3:{birthMonth:12,birthDay:30},
   4:{traitRoll:6,traitRollSecondary:6},6:{classRoll:Number(c.values.classDie||100)},
   8:{backgroundRoll:100},9:{estrangementRoll:100}}[patch.step]??{};
 for(const [field,sides] of Object.entries(physicalFields)){
  if(!changed(field)||c.values[field]===''||c.values[field]===undefined)continue;
  const result=normalizeRoll(c.values[field],sides);
  c.auditEvents.push({sequence:c.auditEvents.length+1,type:'step-dice',step:patch.step,field,die:`d${sides}`,roll:result});
 }
 if(patch.advance){
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
  }else if(e.type==='voice-dice'){
   if(!Array.isArray(e.rolls)||!Number.isInteger(e.score))throw Error('Poškozený důkaz Voice');
  }else if(e.type==='step-dice'){
   const expected={1:{folkRoll:100},2:{ageRoll:100},3:{birthMonth:12,birthDay:30},4:{traitRoll:6,traitRollSecondary:6},6:{classRoll:100},8:{backgroundRoll:100},9:{estrangementRoll:100}}[e.step];
   if(!expected||!Object.hasOwn(expected,e.field)||![`d${expected[e.field]}`,'d20'].includes(e.die)||
      (e.die==='d20'&&e.field!=='classRoll')||normalizeRoll(e.roll,Number(e.die.slice(1)))!==e.roll)
    throw Error('Poškozený doložený hod průvodce');
  }else throw Error('Neznámý typ fyzického důkazu');
 }
 // The most recently recorded dice for each field must match the active
 // step evidence; earlier rolls are retained as an append-only audit trail.
 for(const [step,fields] of Object.entries({1:['folkRoll'],2:['ageRoll'],3:['birthMonth','birthDay'],4:['traitRoll','traitRollSecondary'],6:['classRoll'],8:['backgroundRoll'],9:['estrangementRoll']})){
  for(const field of fields){
   const records=c.auditEvents.filter(e=>e.type==='step-dice'&&e.step===Number(step)&&e.field===field);
   if(!records.length)continue;
   const current=c.values[field];
   if(current===undefined||current===''){if(c.completed[Number(step)])throw Error('Chybějící fyzický důkaz pro '+field);continue;}
   if(normalizeRoll(current,Number(records.at(-1).die.slice(1)))!==records.at(-1).roll)
    throw Error('Změněný fyzický důkaz pro '+field);
  }
 }
 for(const [name,proof] of Object.entries(c.attributeProof)){
  if(!ATTRIBUTES.includes(name))throw Error('Neznámý důkaz fyzického atributu');
  const actual=evaluateAttributeDice({name,ageGroup:h.ageGroup,folk:h.folk,kind:character.kind||'PC',dice:proof.rolls});
  const last=c.auditEvents.filter(e=>e.type==='attribute-dice'&&e.name===name).at(-1);
  if(!last||JSON.stringify(last.rolls)!==JSON.stringify(proof.rolls)||last.score!==proof.score||
     JSON.stringify(actual)!==JSON.stringify(proof)||h.attributes?.[name]!==actual.score)
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
 for(const [stage,allocations] of Object.entries(c.skillDP)){
  if(!SKILL_STAGES.includes(stage)||!allocations||typeof allocations!=='object'||Array.isArray(allocations))throw Error('Neplatná etapa Skill DP');
  const sum=Object.values(allocations).reduce((n,x)=>n+Number(x),0);
  for(const [name,dp] of Object.entries(allocations)){
   const def=SKILL_DEFINITIONS.find(d=>d.name===name);
   if(!def||!Number.isSafeInteger(dp)||dp<0||dp>20)throw Error('Poškozené rozdělení Skill DP');
   const earlier=(until)=>SKILL_STAGES.slice(0,until).reduce((n,g)=>n+(c.skillDP[g]?.[name]??0),0);
   if(stage==='Background Skills'&&dp>2)throw Error('Background Skill: nejvýše 2 DP');
   if(['Optional Skills','Veteran Skills','Sunsign Skills'].includes(stage)&&dp>(earlier(SKILL_STAGES.indexOf(stage))>0?1:2))
    throw Error('Neplatný počet DP pro dříve rozvinutou Skill');
   if(['Optional Skills','Veteran Skills'].includes(stage)&&def.group==='Esoterica'&&def.baseSM+earlier(5)<1)
    throw Error('Esoterica Skill bez dřívějšího výcviku');
   if(stage==='Sunsign Skills'&&def.group==='Esoterica')throw Error('Neplatná Sunsign Esoterica DP');
  }
  if(['Background Skills','Optional Skills'].includes(stage)&&sum>5)throw Error('Neplatný součet pěti DP');
  if(stage==='Veteran Skills'){
   const budget=['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
   if(sum>budget)throw Error('Neplatný Veteran DP rozpočet');
  }
  if(stage==='Sunsign Skills'){
   if(!c.values.sunsignProof)throw Error('Sunsign DP bez fyzického d12/d30');
   for(const {group,value} of c.values.sunsignProof.dp){
    const assigned=SKILL_DEFINITIONS.filter(d=>d.group===group).reduce((n,d)=>n+(allocations[d.name]??0),0);
    if(assigned>value)throw Error('Sunsign DP přesahují pravidlový příděl '+group);
   }
  }
 }
 if(c.completed[12]){
  if(['Background Skills','Optional Skills'].some(g=>Object.values(c.skillDP[g]??{}).reduce((n,x)=>n+x,0)!==5))throw Error('Chybějících 5 Background/Optional DP');
  const available=['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0;
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
