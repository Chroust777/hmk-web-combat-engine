/** HMK Keeper's Ledger — unattended creation driver.
 * This is a user-approved AUTOMATIC dice mode, never a claimed physical roll.
 * It walks the same 14-stage validated UI/CAS handler as manual creation.
 * No game-state copy or independent skill engine is maintained here.
 */
import {arcaneTalentFromPhysical} from './hmk-arcane-talent.js';
import {creationPsycheCount,psycheIntensity,CREATION_PSYCHE_TRAITS} from './hmk-creation-psyche.js';
import {SKILL_DEFINITIONS} from './hmk-character-creation.js';
import {regionHarnTribeDieRequired,regionSubDieRequired,regionDialectDieRequired} from './hmk-creation-tables.js';
export const AUTO_TRAIT_PROFILES=Object.freeze({
 random:{label:'Čistě náhodná postava',skills:[],jobs:[],traits:[]},
 warrior:{label:'Odvážný a bojovný',skills:['Melee','Initiative','Riding','Archery','Throwing'],jobs:['Man-at-arms','Yeoman','Mercenary','Swordmaster','Huscarl','Gladiator','Legionnaire'],traits:['confident', 'energetic', 'persistent', 'aggressive', 'tenacious', 'rebellious']},
 scholar:{label:'Zvídavý a učený',skills:['Folklore','Mathematics','Script','Language','Astrology'],jobs:['Scholar','Scribe','Lexigrapher','Astrologer','Bureaucrat'],traits:['experimental', 'critical', 'contemplative', 'philosophical', 'curious', 'truthful']},
 mystic:{label:'Tajemný a duchovní',skills:['Spirit','Ritual','Pvârism','Alchemy','Trance','Herblore'],jobs:['Shaman','Shèk-Pvâr','Alchemist','Astrologer','Priest'],traits:['imaginative', 'enigmatic', 'inscrutable', 'contemplative', 'idealistic']},
 artisan:{label:'Tvořivý a řemeslný',skills:['Woodworking','Drawing','Metalcraft','Textilecraft','Weaponcraft'],jobs:['Weaponcrafter','Carpenter','Potter','Metalsmith','Craft','Timberwright'],traits:['patient', 'hard-working', 'productive', 'persistent', 'perfectionist']},
 explorer:{label:'Samostatný cestovatel',skills:['Survival','Tracking','Piloting','Riding','Seamanship'],jobs:['Pilot','Hunter','Forester','Seaman','Trapper','Herder','Fisher'],traits:['restless', 'energetic', 'free-spirited', 'instinctive', 'spontaneous']},
 social:{label:'Výřečný a společenský',skills:['Charm','Intrigue','Discourse','Guile','Singing'],jobs:['Harper','Herald','Courtesan','Innkeeper','Thespian','Jester'],traits:['personable', 'inspiring', 'lively', 'affectionate', 'optimistic']},
 covenant:{label:'Oddaný Covenant – kněžská dráha',skills:['Ritual','Spirit','Folklore','Awareness'],jobs:['Shaman','Priest','Scholar','Herbalist','Herder'],traits:['patient','dedicated','obedient','truthful','tolerant','idealistic']}
});
export function secureAutoDie(sides){
 if(!Number.isInteger(sides)||sides<1||sides>1000)throw Error('Neplatná velikost automatické kostky');
 const crypto=globalThis.crypto;
 if(crypto?.getRandomValues){const a=new Uint32Array(1),span=0x100000000,limit=span-(span%sides);do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%sides+1;}
 // Not cryptographic; still fair browser PRNG when Web Crypto unavailable.
 return Math.floor(Math.random()*sides)+1;
}
const pick=(arr,die)=>arr.length?arr[die(arr.length)-1]:null;
const opts=(form,name)=>Array.from(form.querySelectorAll(`select[name="${name}"] option`)).map(e=>e.value).filter(Boolean);
const val=(form,name)=>form.elements.namedItem(name)?.value??'';
function put(form,name,value){const el=form.elements.namedItem(name);if(!el||Array.isArray(el)||el.disabled)return false;
 const valueString=String(value??'');if(el.tagName==='SELECT'&&!opts(form,name).includes(valueString))return false;
 el.value=valueString;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function choice(form,name,die,pref=null){const options=opts(form,name);if(!options.length)return null;
 const selected=pref&&options.includes(pref)?pref:pick(options,die);
 put(form,name,selected);return selected;
}
function weightedChoice(items,profile,die){const cfg=AUTO_TRAIT_PROFILES[profile]||AUTO_TRAIT_PROFILES.random;
 if(profile==='random')return pick(items,die);
 const targets=items.filter(item=>cfg.jobs.some(t=>item.toLowerCase().includes(t.toLowerCase())));
 if(targets.length)return pick(targets,die);
 const acceptable=items.filter(item=>!item.startsWith('Slave (')&&!item.startsWith('Tenant Officer'));
 if(acceptable.length)return pick(acceptable,die);
 const weights=items.map(item=>{const n=item.toLowerCase();return 1+(cfg.jobs.some(t=>n.includes(t.toLowerCase()))?12:0)});
 const total=weights.reduce((a,b)=>a+b,0);let d=die(total);
 for(let i=0;i<items.length;i++){d-=weights[i];if(d<=0)return items[i]}
 return items.at(-1);
}
/** One automatic tick, executed on the actual active wizard form. */
export function prepareAutomaticStep(form,character,{profile='random',die=secureAutoDie,rejected=[]}={}){
 const c=character.hmk.creation,h=character.hmk,step=c.step,stage=c.skillStage;
 const current=()=>Object.fromEntries(new FormData(form));
 if(step===1){choice(form,'folk',die,'Human');return 'next'}
 if(step===2){choice(form,'ageGroup',die,profile==='covenant'?'Young':null);return 'next'}
 if(step===3){put(form,'birthMonth',die(12));put(form,'birthDay',die(30));return 'next'}
 if(step===4){const cfg=AUTO_TRAIT_PROFILES[profile]||AUTO_TRAIT_PROFILES.random;for(const key of ['sunsignTraits','sunsignTraitSecondary']){const o=opts(form,key);if(o.length){const preferred=o.filter(x=>(cfg.traits||[]).includes(x));put(form,key,pick(preferred.length?preferred:o,die));}}return 'next'}
 if(step===5){
  // Use verified regional tables; avoid unsupported, non-transcribed places.
  const region=profile==='covenant'?'Emélrenè':'Hârn';
  put(form,'birthRegion',region);
  put(form,'regionRoll',profile==='covenant'?95:50);
  // Secondary tables are only used when visible/available.
  const r=Number(val(form,'regionRoll'));
  if(regionHarnTribeDieRequired(region,{roll:r})===100)put(form,'regionTribeRoll',die(100));
  if(regionSubDieRequired(region,r)===10)put(form,'regionSubRoll',die(10));
  if(regionDialectDieRequired(region,{roll:r})===100)put(form,'regionDialectRoll',die(100));
  if(form.elements.namedItem('nativeLanguageRoll'))put(form,'nativeLanguageRoll',die(2));
  for(const name of ['nativeLanguageChoice','regionDialectChoice','regionAzeriDialectChoice','regionCommunityChoice'])choice(form,name,die);
  return 'next';
 }
 if(step===6){
  // Direct class choice follows the existing permitted table; no fictional modifier.
  const candidates=opts(form,'socialClass');const preset=({warrior:'Military',scholar:'Noble',mystic:'Priestly',artisan:'Guilded',explorer:'Free',social:'Noble',covenant:'Priestly'})[profile]||null;
  const selected=preset&&candidates.includes(preset)?preset:pick(candidates,die);
  put(form,'socialClass',selected);
  return 'next';
 }
 if(step===7){
  const candidates=opts(form,'familyOccupation');
  const selection=weightedChoice(candidates,profile,die);
  if(!selection)throw Error('Chybí doložené rodičovské povolání');
  put(form,'familyOccupation',selection);
  // Parent Occupation may be chosen directly from the verified table;
  // without a recorded parent d100, no dependent d20/d6 is falsely claimed.
  // The selected specialisation is still resolved by the ordinary validator.
  if(selection==='Shaman')choice(form,'familyVariantChoice',die,'Shaman (Spirit)');
  else choice(form,'familyVariantChoice',die);
  choice(form,'familyRitualChoice',die);
  choice(form,'familyMartialChoice',die);choice(form,'familyWeaponcrafterType',die);
  return 'next';
 }
 if(step===8){choice(form,'background',die);return 'next'}
 if(step===9){put(form,'estrangementRoll',die(100));return 'next'}
 if(step===10){
  const names=['str','end','dex','agl','per','cml','aur','wil','rea','cre','emp','elo'];
  if(names.every(n=>c.attributeProof?.[n])&&c.voiceProof)return 'next';
  const count=form.querySelectorAll('input[name^="die"]').length;
  if(count){for(let i=0;i<count;i++)put(form,'die'+i,die(6));return names.every(n=>c.attributeProof?.[n])?'voice':'attribute'}
  return 'next';
 }
 if(step===11){
  const occupations=opts(form,'occupation');
  const usable=occupations.filter(x=>!x.startsWith('Invoker')&&!x.includes('Talent:')); 
  const job=weightedChoice(usable.length?usable:occupations,profile,die);
  if(!job)throw Error('Pro vzniklou společnost nejsou dostupná doložená povolání');
  put(form,'occupation',job);
  for(const name of ['occupationScriptChoice','occupationSecondScriptChoice','occupationThirdScriptChoice','occupationLanguageChoice','occupationRitualChoice']){
   const choices=opts(form,name);if(!choices.length)continue;
   let filtered=choices;
   if(name==='occupationSecondScriptChoice')filtered=choices.filter(x=>x!==val(form,'occupationScriptChoice'));
   if(name==='occupationThirdScriptChoice')filtered=choices.filter(x=>![val(form,'occupationScriptChoice'),val(form,'occupationSecondScriptChoice')].includes(x));
   if(filtered.length)put(form,name,pick(filtered,die));
  }
  return 'next';
 }
 if(step===12){
  if(stage===0){
   if(['Kúzhai','Sinái','Sidhé'].includes(h.folk)&&!c.values.folkSkillProof){
    put(form,'folkDice',Array.from({length:h.folk==='Kúzhai'?2:4},()=>die(10)).join(','));return 'folk';
   }
   if(form.elements.namedItem('nativeRitualChoice')&&!choice(form,'nativeRitualChoice',die,profile==='covenant'?'Beóna':null))throw Error('Chybí ověřená nabídka rodného náboženství');choice(form,'nativeRitualChoice2',die);choice(form,'nativeRitualChoice3',die);return 'next';
  }
  if(stage===1){
    if(c.values.arcaneTalentProof)return 'next';
    const d20=die(20),d20s=h.familyOccupation==='Invoker'?Array.from({length:4},()=>die(20)):null;
    const actual=d20s?Math.max(...d20s):d20;let required=0;
    try{arcaneTalentFromPhysical({aura:h.attributes.aur,folk:h.folk,ageGroup:h.ageGroup,d20:actual,d100s:[]})}
    catch(err){const m=/právě (\d+)/.exec(String(err.message));if(!m)throw err;required=Number(m[1]);}
    if(d20s)put(form,'arcaneTalentD20s',d20s.join(','));else put(form,'arcaneTalentD20',d20);
    put(form,'arcaneTalentD100s',Array.from({length:required},()=>die(100)).join(','));
    return 'talent';
  }
  if(stage===2){
   const used=[];for(const name of ['familyScriptChoice','familySecondScriptChoice','familyThirdScriptChoice']){const choices=opts(form,name).filter(x=>!used.includes(x));if(choices.length){const v=pick(choices,die);put(form,name,v);used.push(v)}}
  }
  const skills=opts(form,'skillName');
  const stageName=['Folk Skills','Arcane Talent Skills','Family Skills','Background Skills','Occupation Skills','Optional Skills','Veteran Skills','Sunsign Skills'][stage];
  const allocation=c.skillDP?.[stageName]||{};
  const used=Object.values(allocation).reduce((a,b)=>a+Number(b||0),0);
  const budget=stage===2||stage===3||stage===5?5:stage===6?(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0):stage===7?5:0;
  if(stage===6){
   const count=['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?2:h.ageGroup==='Mature'?1:0;
   const rounds=c.values.veteranRoundProof||[];
   let pending=0;while(pending<count&&Object.values(rounds[pending]||{}).reduce((a,b)=>a+Number(b||0),0)>=5)pending++;
   if(pending>=count)return 'next';
   put(form,'veteranRound',String(pending+1));
  }
  if(stage===4||!skills.length||used>=budget)return 'next';
  // Try a single DP, validated by the existing per-stage allocation handler.
  const cfg=AUTO_TRAIT_PROFILES[profile]||AUTO_TRAIT_PROFILES.random;
  const signGroups=stage===7?(c.values.sunsignProof?.dp||[]).filter(entry=>{const groupUsed=Object.entries(allocation).reduce((a,[n,points])=>a+(SKILL_DEFINITIONS.find(d=>d.name===n)?.group===entry.group?Number(points):0),0);return groupUsed<entry.value}).map(entry=>entry.group):null;
  const entries=skills.filter(n=>n&&!['Language','Script','Ritual'].includes(n)&&!rejected.includes(n)&&(!signGroups||signGroups.includes(SKILL_DEFINITIONS.find(d=>d.name===n)?.group)));
  if(!entries.length)return 'next';
  const weighted=entries.map(n=>({n,w:cfg.skills.some(s=>n.includes(s))?8:1}));
  let total=weighted.reduce((a,b)=>a+b.w,0),r=die(Math.max(1,total));
  let picked=weighted.at(-1)?.n;
  for(const e of weighted){r-=e.w;if(r<=0){picked=e.n;break}}
  if(!picked)return 'next';
  put(form,'skillName',picked);put(form,'skillDP',1);return 'skill';
 }
 if(step===13){
  const method=val(form,'wealthMethod');
  if(method==='dice'){
   const a=Number(val(form,'parentWealthDie')),b=Number(val(form,'occupationWealthDie'));
   const estr=String(h.estrangement||'').split(' ')[0];
   const counts={Outcast:1,Unpopular:2,Accepted:3,Popular:4,Favourite:5};
   const n=(counts[estr]||3)+1;
   const m=(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?3:h.ageGroup==='Mature'?2:1)+1;
   put(form,'familyDice',a>0?Array.from({length:n},()=>die(a)).join(','):'');
   put(form,'occupationDice',b>0?Array.from({length:m},()=>die(b)).join(','):'');
  }
  return 'next';
 }
 if(step===14){
  const grace=die(20);put(form,'graceDie',grace);if(grace>=15)choice(form,'graceAspect',die);
  const psy=form.elements.namedItem('psycheDice');
  if(psy){const count=creationPsycheCount(h.folk,h.ageGroup);
   if(count===null)throw Error('HMK p.40 tento Folk nemá definovaný počet Psyche d20');
   const rolls=Array.from({length:count},()=>die(20));put(form,'psycheDice',rolls.join(','));
   const intensity=psycheIntensity(rolls.reduce((a,d)=>a+(d>=18?d-17:0),0));
   for(let i=0;i<intensity.length;i++){const rolled=die(10);put(form,'psycheTraitDie'+(i+1),rolled);put(form,'psycheTraitChoice'+(i+1),CREATION_PSYCHE_TRAITS[rolled-1]);}
  }
  const shamanTradition=choice(form,'shamanTradition',die);if(shamanTradition==='Kath')choice(form,'shamanKathTotem',die);
  choice(form,'pvarChantryId',die);choice(form,'pvarGuildRank',die);put(form,'pvarAttunedObject','Generated focus');
  choice(form,'ritualSkill',die);put(form,'moralityChoice',die(20));
  for(let i=0;i<10;i++)choice(form,'startingElixir'+i,die);
  for(let i=0;i<5;i++)choice(form,'doctrineSubject'+i,die);
  return 'next';
 }
 throw Error('Neznámý krok automatické tvorby');
}
/** UI-independent audit marker: generated dice are not falsely described as physical. */
export function labelAutoGeneratedProof(character,{profile,attempt}){
 const c=character.hmk.creation;
 c.auditEvents.push({sequence:c.auditEvents.length+1,type:'automatic-generation',mode:profile,attempt,diceSource:'browser PRNG/Web Crypto',note:'Hody vytvořil automatický generátor; nejde o fyzické kostky.'});
 c.values.autoGeneration={mode:profile,attempt,diceSource:'software',version:1};
}
