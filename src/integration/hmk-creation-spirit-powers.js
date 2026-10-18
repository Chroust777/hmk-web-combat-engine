/** HMK v1.2 pp.53,300,302–306: starting stored Shaman Spirit Powers.
 * This only validates selected powers and anima burden; NOT their in-play
 * effects, Spirit Communion, trance, totem Psyche recovery or tribal access. */
export const STARTING_ANCESTOR_SKILLS=Object.freeze([
 'Agriculture','Animalcraft','Archery','Brewing','Command','Cookery','Discourse',
 'Fishing','Fletching','Folklore','Herblore','Hideworking','Language','Melee',
 'Musician','Physician','Piloting','Riding','Seamanship','Shipwright',
 'Sling','Survival','Throwing','Timbercraft','Tracking','Weaponcraft','Woodworking'
]);
export const STARTING_TOTEMS=Object.freeze(['Bear','Boar','Bull','Crow','Eagle','Fox','Horse','Lion','Snake','Stag','Whale','Wolf']);
export const STARTING_ENERGIES=Object.freeze(['Air','Earth','Fire','Water']);
const isWhole=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function startingSpiritIndex(ml){
 if(!isWhole(ml,0,200))throw Error('Spirit Index musí vycházet z ověřeného Spirit ML');
 return Math.floor(ml/10);
}
export function validateStartingSpiritPowers({occupation,spiritML,powers=[],languages=[]}={}){
 const index=startingSpiritIndex(spiritML);
 if(!Array.isArray(powers)||powers.length>index||powers.length>20)throw Error('Počet Spirit Powers překračuje Spirit Index');
 if(!String(occupation).startsWith('Shaman (')&&powers.length)throw Error('Počáteční Spirit Powers vyžadují doloženého Shamanské povolání');
 const unique=new Set();let totems=0;let burden=0;
 const normalized=powers.map((item,i)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Neplatný záznam Spirit Power');
  const family=String(item.family??''),subject=String(item.subject??''),anima=Number(item.anima),talisman=item.talisman===true;
  if(!isWhole(anima,1,3))throw Error('Anima Spirit Power může být jen I, II nebo III');
  if(family==='Ancestor'){
   const root=subject.startsWith('Language (')&&subject.endsWith(')')?'Language':subject;
   if(!STARTING_ANCESTOR_SKILLS.includes(root))throw Error('Ancestor Power mimo tabulku HMK p.302');
   if(root==='Language'&&!languages.includes(subject.slice(10,-1)))throw Error('Ancestor Language musí být konkrétní známý jazyk tradice');
   if(root==='Musician')throw Error('Ancestor Musician vyžaduje konkrétní nástroj tradice, který katalog neobsahuje');
  }else if(family==='Totem'){
   if(!STARTING_TOTEMS.includes(subject))throw Error('Nedoložený Totem Spirit');
   totems++;
  }else if(family==='Energy'){
   if(!STARTING_ENERGIES.includes(subject))throw Error('Nedoložená energie Spirit Power');
   if(talisman)throw Error('Energy Spirit Talismans nejsou přípustné (HMK p.305)');
  }else throw Error('Neznámá rodina Spirit Powers');
  const key=`${family}:${subject}`;
  if(unique.has(key))throw Error('Nelze uložit dvě úrovně stejné Spirit Power současně');
  unique.add(key);
  burden+=anima+(talisman?1:0);
  return {family,subject,anima,talisman};
 });
 if(totems>1)throw Error('Shaman může mít právě jeden typ Totem Spirit Power současně (p.303)');
 if(burden>index)throw Error('Součet anima a talismanů překračuje Spirit Index (p.300)');
 return {spiritML,index,animaBurden:burden,powers:normalized,sourcePage:300};
}

/** Sample traditions pp.300-301 are examples, not an exhaustive legal taxonomy.
 * Kath's six clan animals are explicit; do not fabricate prohibitions for others. */
export const SHAMAN_SAMPLE_TRADITIONS=Object.freeze(['Kath','Kùbôra','Quârph','Alts','Neshái','Tuvâran','Other']);
export const KATH_CLAN_TOTEMS=Object.freeze(['Bear','Boar','Lion','Stag','Wolf','Eagle']);
export function validateShamanTradition({occupation,tradition,clanTotem='',powers=[]}={}){
 if(!String(occupation).startsWith('Shaman ('))throw Error('Tribal Tradition vyžaduje Shaman occupation');
 if(!SHAMAN_SAMPLE_TRADITIONS.includes(tradition))throw Error('Vyberte doloženou vzorovou tradici nebo Other');
 if(tradition==='Kath'&&!KATH_CLAN_TOTEMS.includes(clanTotem))throw Error('Kath vyžaduje konkrétní clan Totem z šesti povolených (p.301)');
 if(tradition!=='Kath'&&clanTotem)throw Error('Clan Totem Kath nesmí přejít na jinou tradici');
 if(!Array.isArray(powers))throw Error('Neplatné šamanské Powers');
 const alternativeTotem=tradition==='Kath'&&powers.some(p=>p.family==='Totem'&&p.subject!==clanTotem); // p.301 says 'mostly', not 'only'

 return {tradition,clanTotem:tradition==='Kath'?clanTotem:'',verifiedRestrictions:tradition==='Kath'?['clanTotem']:[],initialAncestorEstrangement:'Popular',reviewNeeded:tradition==='Other'||alternativeTotem,sourcePage:301,ancestorSourcePage:302};
}
