/** HMK Keeper's Ledger — unattended creation driver.
 * This is a user-approved AUTOMATIC dice mode, never a claimed physical roll.
 * It walks the same 14-stage validated UI/CAS handler as manual creation.
 * No game-state copy or independent skill engine is maintained here.
 */
import {arcaneTalentFromPhysical} from './hmk-arcane-talent.js';
import {matchingPreliminaryClassRoll,chooseMatchingTrial} from './hmk-occupation-target-planner.js';
import {parentOccupationFromRoll as verifyParentSelection} from './hmk-parent-occupation-tables.js';
import {creationPsycheCount,psycheIntensity,CREATION_PSYCHE_TRAITS} from './hmk-creation-psyche.js';
import {SKILL_DEFINITIONS,folkFromDie,ageFromDie} from './hmk-character-creation.js';
import {OCCUPATIONS,priestReligionOf,familyOccupationProfile} from './hmk-creation-tables.js';
import {SCRIPTS} from './hmk-skill-instances.js';
import {regionHarnTribeDieRequired,regionSubDieRequired,regionDialectDieRequired,regionFromD1000,classFromRoll,tribalFreeOccupation} from './hmk-creation-tables.js';
import {PARENT_OCCUPATION_TABLES,parentOccupationFromRoll} from './hmk-parent-occupation-tables.js';
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
function weightedChoice(items,profile,die,preferences={}){
 const desired=String(preferences.occupation||'').trim().toLowerCase();
 if(desired){const exact=items.find(x=>x.toLowerCase()===desired);if(exact)return exact;const matching=items.filter(x=>x.toLowerCase().startsWith(desired+' (')||x.toLowerCase().startsWith(desired+':'));if(matching.length)return pick(matching,die);throw Error('Požadované povolání není pro tuto postavu pravidlově dostupné: '+preferences.occupation);}const cfg=AUTO_TRAIT_PROFILES[profile]||AUTO_TRAIT_PROFILES.random;
 if(profile==='random'&&!preferences.semantic)return pick(items,die);
 // Free text implies a soft preference, never permission to bypass HMK eligibility.
 const inferred=preferences.semantic?.occupationCandidates||[];
 for(const desiredJob of inferred){const job=desiredJob.toLowerCase();const matches=items.filter(x=>x.toLowerCase()===job||x.toLowerCase().startsWith(job+' (')||x.toLowerCase().startsWith(job+':'));if(matches.length)return pick(matches,die);}
 const targets=items.filter(item=>cfg.jobs.some(t=>item.toLowerCase().includes(t.toLowerCase())));
 if(targets.length)return pick(targets,die);
 const acceptable=items.filter(item=>!item.startsWith('Slave (')&&!item.startsWith('Tenant Officer'));
 if(acceptable.length)return pick(acceptable,die);
 const weights=items.map(item=>{const n=item.toLowerCase();return 1+(cfg.jobs.some(t=>n.includes(t.toLowerCase()))?12:0)});
 const total=weights.reduce((a,b)=>a+b,0);let d=die(total);
 for(let i=0;i<items.length;i++){d-=weights[i];if(d<=0)return items[i]}
 return items.at(-1);
}
/** One Arcane Talent proof is shared between occupation prerequisites (step 11)
 * and stage 2 of Skills. It is never rerolled or replaced during generation.
 * HMK p.40 / p.42: parent Invoker gets 4d20 and uses the highest.
 */
function prepareArcaneTalentRoll(form,h,die,plan=null){
 const invokerParent=h.familyOccupation==='Invoker';
 const target=plan?.occupation||'';
 const desiredTalent=target.match(/^Shaman \(Talent: (.+)\)$/)?.[1];
 const seekTwo=target==='Invoker'||target.startsWith('Invoker (Tribal: ');
 const needsTarget=Boolean(desiredTalent||seekTwo);
 let chosen=null;
 // Targeted mode means rejected *candidate characters* are evaluated before
 // they are committed. These are genuine software rolls; every rejected
 // preliminary Talent trial is counted, never passed off as the PC's roll.
 const limit=needsTarget?3200:1;
 for(let trial=0;trial<limit;trial++){
  const rolls=invokerParent?Array.from({length:4},()=>die(20)):[die(20)];
  const d20=Math.max(...rolls);
  let required=0;
  try{arcaneTalentFromPhysical({aura:h.attributes.aur,folk:h.folk,ageGroup:h.ageGroup,d20,d100s:[]});}
  catch(err){const match=/právě (\d+)/.exec(String(err.message));if(!match)throw err;required=Number(match[1]);}
  if(required>8)throw Error('Arcane Talent vyžaduje více než osm hodů');
  const d100s=Array.from({length:required},()=>die(100));
  const proof=arcaneTalentFromPhysical({aura:h.attributes.aur,folk:h.folk,ageGroup:h.ageGroup,d20,d100s});
  if((!desiredTalent||proof.generated.includes(desiredTalent))&&(!seekTwo||new Set(proof.generated).size>=2)){
   chosen={rolls,d20,d100s};break;
  }
  if(plan)plan.rejectedTalentTrials++;
 }
 if(!chosen)throw Error('Arcane Talent: pro tuto AUR nebylo možné doložený talent získat (přípravné zkoušky)');
 if(invokerParent){if(!put(form,'arcaneTalentD20s',chosen.rolls.join(',')))throw Error('Chybí Parent Invoker 4d20 formulář');}
 else if(!put(form,'arcaneTalentD20',chosen.d20))throw Error('Chybí formulář Arcane Talent d20');
 if(!put(form,'arcaneTalentD100s',chosen.d100s.join(',')))throw Error('Chybí formulář Arcane Talent d100');
 return 'talent-prereq';
}
/** One automatic tick, executed on the actual active wizard form. */
export function prepareAutomaticStep(form,character,{profile='random',die=secureAutoDie,rejected=[],preferences={}}={}){
 const plan=preferences.targetPlan||null;
 const c=character.hmk.creation,h=character.hmk,step=c.step,stage=c.skillStage;
 const current=()=>Object.fromEntries(new FormData(form));
 if(step===1){const preferredFolk=plan?.folk||preferences.folk||preferences.semantic?.folkPreference||'';const roll=profile==='random'&&!preferredFolk?die(100):null;const chosen=roll!==null?folkFromDie(roll):(preferredFolk||'Human');if(!put(form,'folk',chosen))throw Error('Požadovaný Folk nemá v průvodci platnou možnost: '+chosen);if(roll!==null)put(form,'folkRoll',roll);return 'next'}
 if(step===2){
  // HMK p.21: for humans, half-elves and Nâdi record the actual age d100.
  // The remaining Elder Folk have prescribed age groups, not a d100 choice.
  if(['Human','Ænarin','Nâdi'].includes(h.folk)){
   const agePref=preferences.semantic?.agePreference;if(agePref&&opts(form,'ageGroup').includes(agePref))put(form,'ageGroup',agePref);else{const roll=die(100);put(form,'ageRoll',roll);put(form,'ageGroup',ageFromDie(roll,h.folk));}
  }else choice(form,'ageGroup',die,h.folk==='Kúzhai'?'Mature':'Young');
  return 'next';
 }
 if(step===3){put(form,'birthMonth',die(12));put(form,'birthDay',die(30));return 'next'}
 if(step===4){
  const cfg=AUTO_TRAIT_PROFILES[profile]||AUTO_TRAIT_PROFILES.random;
  for(const [key,rollField] of [['sunsignTraits','traitRoll'],['sunsignTraitSecondary','traitRollSecondary']]){
   const o=opts(form,key);if(!o.length)continue;
   if(profile==='random'&&!preferences.semantic){
    // An actual software d6, NOT an anonymous dropdown choice. The original
    // CAS stores both the rolled face and the resulting printed Sunsign Trait.
    const rolled=die(6);
    if(o.length!==6||!put(form,key,o[rolled-1])||!put(form,rollField,rolled))
     throw Error('Chybí původní d6 Sunsign Trait pole nebo šest tištěných možností');
   }else{
    // A themed choice is a selection, NOT a fictitious dice roll.
    const meaning=o.filter(x=>(preferences.semantic?.sunsignTraitPreferences||[]).includes(x));
    const preferred=o.filter(x=>(cfg.traits||[]).includes(x));
    if(!put(form,key,pick(meaning.length?meaning:preferred.length?preferred:o,die)))
     throw Error('Nelze uložit vybraný Sunsign Trait');
   }
  }
  return 'next';
 }
 if(step===5){
  if(plan){
   // HMK p.24: explicit choice of birthplace is lawful and requires no
   // fictitious regional dice. Tribal subgroup, when compulsory, still uses
   // actual software d100 and stores preselection trials separately.
   if(!put(form,'birthRegion',plan.region)||!put(form,'birthplace',plan.realm))
    throw Error('Plánované regionální místo není ve skutečném průvodci');
   if(plan.regionRolls?.length){
    // Hârn Orbáal: the printed d100 disambiguates ruling Ivínian vs Jarin.
    // A legitimate software d100 is used; rejected candidate rolls are
    // NOT attributed to the final character.
    const regionRoll=chooseMatchingTrial(die,100,plan.regionRolls,plan.rejectedRegionRolls);
    if(!put(form,'regionRoll',regionRoll))throw Error('Povinný Hârn d100 není dostupný');
   }
   if(plan.tribeRolls?.length){
    // The region-specific numeric field is disabled until the manual wizard
    // recalculates visibility after the initial region selection. Activate
    // only the verified obligatory Altic/Harn tribe die; the normal CAS
    // still checks both realm and the resulting tribe/subsistence.
    const tribe=form.elements.namedItem('regionTribeRoll');
    if(tribe?.disabled&&['Áltôr','Hârn'].includes(plan.region))tribe.disabled=false;
    const r=chooseMatchingTrial(die,100,plan.tribeRolls,plan.rejectedTribeRolls??=[]);
    if(!put(form,'regionTribeRoll',r))throw Error('Plán: nelze zaznamenat povinný Áltôr tribe d100');
   }
   if(plan.regionCommunityChoice&&!plan.regionRolls?.length)put(form,'regionCommunityChoice',plan.regionCommunityChoice);
   for(const name of ['nativeLanguageChoice','regionDialectChoice','regionAzeriDialectChoice','regionCommunityChoice']){
    if(name==='regionCommunityChoice'&&plan.regionCommunityChoice)continue;
    choice(form,name,die);
   }
   if(form.elements.namedItem('nativeLanguageRoll'))put(form,'nativeLanguageRoll',die(2));
   return 'next';
  }

  // Use verified regional tables; avoid unsupported, non-transcribed places.
  // HMK Appendix I p.415: use the printed human regional d1000 distribution.
  // Elder Folk use their own independent Appendix I p.423 tables.
  // The Covenant-specific focus is a declared preference, not the random mode.
  const elderRegion={Kúzhai:'Kúzhai (Elder Folk)',Sinái:'Ælrhin (Elder Folk)',Sidhé:'Ælrhin (Elder Folk)',Malákta:'Malákta (Elder Folk)',Nâdi:'Nâdi (Elder Folk)'}[h.folk];
  const humanRegionalRoll=elderRegion||profile==='covenant'?null:die(1000);
  const region=elderRegion||(profile==='covenant'?'Emélrenè':regionFromD1000(humanRegionalRoll).region);
  put(form,'birthRegion',region);
  if(humanRegionalRoll!==null)put(form,'venariveRoll',humanRegionalRoll);
  put(form,'regionRoll',profile==='covenant'?95:die(100));
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
  // True d100 demographic table, with the original roll kept in Creation.
  // A themed character may have preferences later; it does not rewrite a d100.
  // HMK p.26 explicitly offers a favourable d20 as an alternative
  // to demographic d100. Focused generation uses this lawful choice;
  // truly random generation continues to use demographic frequencies.
  const dieSides=plan||preferences.occupation||preferences.semantic?.occupationCandidates?.length||profile!=='random'?20:100;
  const roll=plan?matchingPreliminaryClassRoll(plan,die):die(dieSides);put(form,'classDie',String(dieSides));put(form,'classRoll',roll);
  const selected=classFromRoll(h.society,roll,dieSides);
  if(!put(form,'socialClass',selected))throw Error('Parent Class z hodu není v pravidlové nabídce: '+selected);
  if(plan&&selected!==plan.socialClass)throw Error('Plánovaná Parent Class není dosažena');
  return 'next';
 }
 if(step===7){
  const supported=form.elements.namedItem('parentOccupationRoll');
  let selection;
  if(supported){
   const roll=plan?.region==='Dalkésh'&&plan.family
    ?chooseMatchingTrial(die,100,Array.from({length:100},(_,i)=>i+1).filter(r=>{
      try{return verifyParentSelection({society:h.society,socialClass:h.socialClass,roll:r}).name===plan.family;}catch{return false;}}),plan.rejectedParentRolls)
    :die(100);
   const subsistence=c.values.regionProof?.subsistence||val(form,'subsistence')||'Foraging';
   if(['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free'){
    if(form.elements.namedItem('subsistence'))put(form,'subsistence',subsistence);
    put(form,'parentOccupationRoll',roll);
    selection=tribalFreeOccupation(subsistence,roll).name;
   }else{
    const tableSociety=h.society==='Feudal/Imperial'&&h.socialClass==='Noble'
      ?(Number(c.values.classRoll)%2?'Feudal':'Imperial')
      :({'City-State':'Imperial',Viking:'Tributary',Chélemby:'Tributary','Tribal-Settled':h.socialClass==='Free'||h.socialClass==='Priestly'||h.socialClass==='Noble'?'Tribal':'Tribal-Settled','Feudal/Imperial':'Feudal'})[h.society]||h.society;
    const row=PARENT_OCCUPATION_TABLES[tableSociety]?.[h.socialClass]?.find(x=>roll<=x.max);
    if(!row)throw Error('Chybí tabulka Parent Occupation pro '+tableSociety+'/'+h.socialClass);
    let subRoll,specialRoll,convocationRoll;
    if(['Slave','Tenant Officer'].includes(row.name))subRoll=die(20);
    if(['Gentry: Arcanist','Arcanist'].includes(row.name)){
     specialRoll=die(20);
    }
    const arcanistShek=Number.isInteger(specialRoll)&&(tableSociety==='Sináin'?specialRoll>=8:specialRoll>=15);
    if(row.name==='Shèk-Pvâr'||arcanistShek)convocationRoll=die(6);
    put(form,'parentOccupationRoll',roll);
    if(subRoll!==undefined)put(form,'parentOccupationSubRoll',subRoll);
    if(specialRoll!==undefined)put(form,'parentOccupationSpecialRoll',specialRoll);
    if(convocationRoll!==undefined)put(form,'parentOccupationConvocationRoll',convocationRoll);
    selection=parentOccupationFromRoll({society:h.society,socialClass:h.socialClass,roll,
      classRoll:c.values.classRoll,classDie:c.values.classDie??100,subRoll,specialRoll,convocationRoll}).name;
   }
   if(!put(form,'familyOccupation',selection))throw Error('Rodičovské povolání z d100 není v průvodci: '+selection);
  }else{
   // Elder societies without a visible printed-roll UI remain GM selections;
   // never fabricate a recorded d100 for them.
   const candidates=opts(form,'familyOccupation');selection=weightedChoice(candidates,profile,die);
   if(!selection||!put(form,'familyOccupation',selection))throw Error('Chybí doložené rodičovské povolání');
  }
  if(selection==='Shaman')choice(form,'familyVariantChoice',die,'Shaman (Spirit)');
  else choice(form,'familyVariantChoice',die);
  choice(form,'familyRitualChoice',die);
  choice(form,'familyMartialChoice',die);choice(form,'familyWeaponcrafterType',die);
  const familyProof=familyOccupationProfile(selection,val(form,'familyWeaponcrafterType'),val(form,'familyMartialChoice'),val(form,'familyVariantChoice'),c.values.regionProof?.subsistence||val(form,'subsistence')||null);
  const familyAuto=form.elements.namedItem('familyAuto');
  // Partial unit-test forms can omit this derived hidden validation field.
  // The actual wizard always provides it and its CAS verifies the result.
  // Derived hidden validation flag, NOT user-selectable: a synthetic change
  // event would incorrectly reset it from previously committed step-7 data.
  if(familyAuto)familyAuto.value=familyProof?'yes':'no';
  return 'next';
 }
 if(step===8){
  if(form.elements.namedItem('backgroundTensRoll'))put(form,'backgroundTensRoll',die(10));
  if(form.elements.namedItem('backgroundRoll'))put(form,'backgroundRoll',die(100));
  else choice(form,'background',die);
  return 'next';
 }
 if(step===9){put(form,'estrangementRoll',die(100));return 'next'}
 if(step===10){
  const names=['str','end','dex','agl','per','cml','aur','wil','rea','cre','emp','elo'];
  if(names.every(n=>c.attributeProof?.[n])&&c.voiceProof){
   // HMK p.39: Morality is a required Characteristic, rolled 4d6 with any
   // three kept (this generator uses the top three), not an arbitrary d20.
   if(!c.values.moralityProof){
    if(!put(form,'moralityDice',Array.from({length:4},()=>die(6)).join(',')))throw Error('Krok 10: chybí povinné Morality 4d6');
   }
   return 'next';
  }
  const count=form.querySelectorAll('input[name^="die"]').length;
  if(count){for(let i=0;i<count;i++)put(form,'die'+i,die(6));return names.every(n=>c.attributeProof?.[n])?'voice':'attribute'}
  return 'next';
 }
 if(step===11){
  // Mandatory prerequisite before filtering Invoker/Shaman variants.
  // The validator decides which of those are actually possible after the roll.
  if(!c.values.arcaneTalentProof)return prepareArcaneTalentRoll(form,h,die,plan);
  const occupations=opts(form,'occupation');
  const usable=occupations; 
  const job=weightedChoice(usable.length?usable:occupations,profile,die,plan?{...preferences,occupation:plan.occupation}:preferences);
  if(!job)throw Error('Pro vzniklou společnost nejsou dostupná doložená povolání');
  if(!Object.hasOwn(OCCUPATIONS,job))throw Error('Profese nemá doložená Occupational DP: '+job);
  if(!put(form,'occupation',job))throw Error('Nelze vybrat profesi '+job);
  const printed=OCCUPATIONS[job].skills;
  // Singular Script / 2nd Script / 3rd Script are independent fixed grants;
  // plural Scripts is ONE divisible pool (HMK p.47). Never combine both.
  if(printed.Script||printed['2nd Script']||printed['3rd Script']){
   const chosen=[];
   for(const field of ['occupationScriptChoice','occupationSecondScriptChoice','occupationThirdScriptChoice']){
    if(field==='occupationScriptChoice'&&!('Script' in printed)&&!('2nd Script' in printed))continue;
    if(field==='occupationSecondScriptChoice'&&!('2nd Script' in printed))continue;
    if(field==='occupationThirdScriptChoice'&&!('3rd Script' in printed))continue;
    const allowed=opts(form,field).filter(x=>!chosen.includes(x)&&!(job==='Priest (Môrgath)'&&field==='occupationScriptChoice'&&x==='Nùvesârl')); 
    if(!allowed.length||!put(form,field,pick(allowed,die)))throw Error('Chybí unikátní Script specializace pro '+job);
    chosen.push(val(form,field));
   }
  }
  if(printed.Scripts){
   const options=SCRIPTS.filter(x=>opts(form,'occupationScriptsDistribution').length===0||SCRIPTS.includes(x));
   if(!options.length)throw Error('Chybí katalog konkrétních Scripts');
   const selected=pick(options,die),budget=printed.Scripts;
   if(!Number.isSafeInteger(budget)||budget<1||budget>5)throw Error('Nepodporovaný tištěný Scripts pool '+job);
   const box=form.querySelector?.('[data-hmk-dp-pool="occupationScriptsDistribution"]');
   const slots=box?.querySelectorAll?.('[data-pool-choice]')??[];
   if(slots.length){
    for(let i=0;i<budget;i++){
     const slot=slots[i];if(!slot||slot.disabled)throw Error('Nedostupný Scripts DP slot '+i);
     slot.value=selected;slot.dispatchEvent(new Event('change',{bubbles:true}));
    }
   }
   if(!put(form,'occupationScriptsDistribution',selected+'='+budget))throw Error('Nelze uložit konkrétní Scripts pool');
  }
  // A printed Language (plural skill designation) may be allocated to one
  // concrete language. This is a legal full-pool allocation, not a new DP.
  if(printed.Language&&!choice(form,'occupationLanguageChoice',die))throw Error('Chybí výběr profesního jazyka pro '+job);
  if(printed.Ritual&&!choice(form,'occupationRitualChoice',die,priestReligionOf(job)))throw Error('Chybí ověřený Ritual pro '+job);
  return 'next';
 }
 if(step===12){
  if(stage===0){
   // Folk dice and native religion may both be required in the same form.
   // Select the religion BEFORE clicking Folk dice; otherwise native HTML
   // validation blocks the click despite a valid folkDice roll.
   for(const field of ['nativeRitualChoice','nativeRitualChoice2','nativeRitualChoice3']){
    const picker=form.elements.namedItem(field);
    if(picker&&picker.disabled){picker.disabled=false;picker.required=true;}
   }
   if(form.elements.namedItem('nativeRitualChoice')&&!choice(form,'nativeRitualChoice',die,profile==='covenant'?'Beóna':null))throw Error('Chybí ověřená nabídka rodného náboženství');
   choice(form,'nativeRitualChoice2',die);choice(form,'nativeRitualChoice3',die);
   if(['Kúzhai','Sinái'].includes(h.folk)&&!c.values.folkSkillProof){
    put(form,'folkDice',Array.from({length:h.folk==='Kúzhai'?2:4},()=>die(10)).join(','));return 'folk';
   }
   return 'next';
  }
  if(stage===1){
    if(c.values.arcaneTalentProof)return 'next';
    // Compatibility for imported drafts which skipped the prerequisite.
    const action=prepareArcaneTalentRoll(form,h,die);
    return action==='talent-prereq'?'talent':action;
  }
  if(stage===2){
   const used=[];for(const name of ['familyScriptChoice','familySecondScriptChoice','familyThirdScriptChoice']){const choices=opts(form,name).filter(x=>!used.includes(x));if(choices.length){const v=pick(choices,die);put(form,name,v);used.push(v)}}
  }
  const skills=opts(form,'skillName');
  const stageName=['Folk Skills','Arcane Talent Skills','Family Skills','Background Skills','Occupation Skills','Optional Skills','Veteran Skills','Sunsign Skills'][stage];
  const allocation=c.skillDP?.[stageName]||{};
  const used=Object.values(allocation).reduce((a,b)=>a+Number(b||0),0);
  const budget=stage===2||stage===3||stage===5?5:stage===6?(['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0):stage===7?5:0;
  if(stage===6){
   const count=['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?2:h.ageGroup==='Mature'?1:0;
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
  const affinities=[profile,...(preferences.semanticRanking||[])].filter((id,i,list)=>id!=='random'&&list.indexOf(id)===i);
  const semanticSkills=preferences.semantic?.skillPreferences||[];const weighted=entries.map(n=>({n,w:1+affinities.reduce((bonus,id,i)=>bonus+(AUTO_TRAIT_PROFILES[id]?.skills.some(s=>n.includes(s))?Math.max(2,7-i*2):0),0)+(semanticSkills.some(s=>n===s||n.startsWith(s+' ('))?24:0)}));
  let total=weighted.reduce((a,b)=>a+b.w,0),r=die(Math.max(1,total));
  let picked=weighted.at(-1)?.n;
  for(const e of weighted){r-=e.w;if(r<=0){picked=e.n;break}}
  if(!picked)return 'next';
  put(form,'skillName',picked);put(form,'skillDP',Number(allocation[picked]||0)+1);return 'skill';
 }
 if(step===13){
  const method=val(form,'wealthMethod');
  if(method==='dice'){
   const a=Number(val(form,'parentWealthDie')),b=Number(val(form,'occupationWealthDie'));
   const estr=String(h.estrangement||'').split(' ')[0];
   const counts={Outcast:1,Unpopular:2,Accepted:3,Popular:4,Favourite:5};
   const n=(counts[estr]||3)+1;
   const m=(['Kúzhai','Sinái'].includes(h.folk)||h.ageGroup==='Old'?3:h.ageGroup==='Mature'?2:1)+1;
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
  choice(form,'ritualSkill',die);if(form.elements.namedItem('moralityChoice'))put(form,'moralityChoice',h.morality??c.values.moralityChoice??preferences.semantic?.moralityPreference??die(20));
  for(let i=0;i<10;i++)choice(form,'startingElixir'+i,die);
  for(let i=0;i<5;i++)choice(form,'doctrineSubject'+i,die);
  return 'next';
 }
 throw Error('Neznámý krok automatické tvorby');
}
/** UI-independent audit marker: generated dice are not falsely described as physical. */
export function labelAutoGeneratedProof(character,{profile,mode='random',attempt}){
 const c=character.hmk.creation;
 c.auditEvents.push({sequence:c.auditEvents.length+1,type:'automatic-generation',mode,profile,attempt,diceSource:'browser PRNG/Web Crypto',note:'Hody vytvořil automatický generátor; nejde o fyzické kostky.'});
 c.values.autoGeneration={mode,profile,attempt,diceSource:'software',version:3};
}
