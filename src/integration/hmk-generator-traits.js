import {OCCUPATIONS} from './hmk-creation-tables.js';
/** Narrative authoring preferences, not attributes/skills/wealth rolls.
 * The HMK creation engine remains the sole rule validator. This offline
 * lexicon intentionally returns 'uncertain' instead of inventing semantics.
 */
const groups={
 'Tělesná stavba':['Štíhlý','Hubený','Podsaditý','Mohutný','Svalnatý','Obézní','Vysoký','Nízký','Drobné postavy','Zavalitý','Mrštný','Nemotorný','Vytrvalý','Křehký'],
 'Vzhled':['Jizva na tváři','Pihovatý','Ošlehaný větrem','Upravený','Zanedbaný','Výrazné oči','Bledý','Opálený','Husté vousy','Dlouhé vlasy','Krátké vlasy','Neobvyklé oblečení'],
 'Vystupování a energie':['Tichý','Výřečný','Společenský','Samotářský','Sebevědomý','Plachý','Dominantní','Nenápadný','Energický','Klidný','Impulzivní','Rozvážný'],
 'Svědomitost a návyky':['Pracovitý','Líný','Pečlivý','Pořádný','Chaotický','Trpělivý','Netrpělivý','Disciplinovaný','Spolehlivý','Tvrdohlavý','Přizpůsobivý','Perfekcionista'],
 'Vztah k ostatním':['Soucitný','Empatický','Obětavý','Laskavý','Nedůvěřivý','Podezíravý','Manipulativní','Diplomatický','Přátelský','Konfliktní','Čestný','Lstivý'],
 'Zvídavost a myšlení':['Zvídavý','Učenlivý','Analytický','Vynalézavý','Kreativní','Pragmatický','Snílek','Skeptický','Tradiční','Dobrodružný','Zbožný','Pověrčivý'],
 'Emoce a morálka':['Odvážný','Bojácný','Optimistický','Pesimistický','Úzkostný','Vznětlivý','Pomstychtivý','Milosrdný','Ctižádostivý','Pokorný','Věrný','Vzpurný'],
 'Schopnosti a vlohy':['Šikovné ruce','Dobrá paměť','Pozorný','Zručný řemeslník','Talent na jazyky','Hudební nadání','Dobrý vypravěč','Výborný stopař','Přirozený vůdce','Zdatný jezdec','Zkušený vyjednavač','Znalý přírody'],
 'Životní styl':['Skromný','Marnotratný','Poutník','Usazený','Městský člověk','Venkovan','Asketický','Požitkářský','Zámožný','Chudý','Prostě oblečený','Náročný na pohodlí'],
 'Motivace a zkušenosti':['Hledá vědění','Touží po moci','Chrání slabé','Touží po bohatství','Hledá pomstu','Touží cestovat','Oddán víře','Miluje přírodu','Žije pro řemeslo','Touží po slávě','Vyhledává samotu','Dává přednost rodině']
};
export const GENERATOR_TRAIT_GROUPS=Object.freeze(Object.entries(groups).map(([name,traits])=>({name,traits:Object.freeze(traits)})));
export const GENERATOR_TRAITS=Object.freeze(Object.values(groups).flat());
export const GENERATOR_FOLKS=Object.freeze(['Náhodně podle HMK','Human','Kúzhai','Ænarin','Sinái','Sidhé','Malákta','Nâdi']);
export const GENERATOR_OCCUPATION_PREFERENCES=Object.freeze(['Bez preference',...Object.keys(OCCUPATIONS).sort((a,b)=>a.localeCompare(b,'cs'))]);
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/g,'ae').toLowerCase();
const boundary=expr=>new RegExp('(?:^|[^a-z])(?:'+expr+')(?=$|[^a-z])','gu');
/** Czech inflection stems, precise enough to avoid accidental partial words. */
const concepts=[
 {category:'occupation',key:'Mercenary',profile:'warrior',re:'zoldner(?:\\w*)|mercenar(?:\\w*)'},
 {category:'occupation',key:'Man-at-arms',profile:'warrior',re:'vojak(?:\\w*)|ozbrojen(?:\\w*)|bojovnik(?:\\w*)|valecnik(?:\\w*)'},
 {category:'occupation',key:'Swordmaster',profile:'warrior',re:'sermir(?:\\w*)|mistr mec(?:\\w*)'},
 {category:'occupation',key:'Man-at-arms (Archer)',profile:'warrior',re:'lucist(?:\\w*)|lukostrel(?:\\w*)'},
 {category:'occupation',key:'Knight Bachelor',profile:'warrior',re:'rytir(?:\\w*)'},
 {category:'occupation',key:'Hunter',profile:'explorer',re:'lovec(?:\\w*)|mysliv(?:\\w*)'},
 {category:'occupation',key:'Forester',profile:'explorer',re:'hajny(?:\\w*)|lesnik(?:\\w*)'},
 {category:'occupation',key:'Trapper',profile:'explorer',re:'traper(?:\\w*)|lovec kozesin(?:\\w*)'},
 {category:'occupation',key:'Pilot',profile:'explorer',re:'kormidelnik(?:\\w*)|lodivod(?:\\w*)'},
 {category:'occupation',key:'Seaman',profile:'explorer',re:'namornik(?:\\w*)|moreplavec(?:\\w*)'},
 {category:'occupation',key:'Herder',profile:'explorer',re:'pastyr(?:\\w*)'},
 {category:'occupation',key:'Farmer',profile:'artisan',re:'rolnik(?:\\w*)|zemedel(?:\\w*)|sedlak(?:\\w*)'},
 {category:'occupation',key:'Metalsmith',profile:'artisan',re:'kovar(?:\\w*)|kovarstv(?:\\w*)'},
 {category:'occupation',key:'Weaponcrafter',profile:'artisan',re:'zbrojir(?:\\w*)|vyrobce zbran(?:\\w*)|mecir(?:\\w*)'},
 {category:'occupation',key:'Timberwright',profile:'artisan',re:'tesar(?:\\w*)'},
 {category:'occupation',key:'Woodcrafter',profile:'artisan',re:'truhlar(?:\\w*)|rezbar(?:\\w*)'},
 {category:'occupation',key:'Potter',profile:'artisan',re:'hrncir(?:\\w*)'},
 {category:'occupation',key:'Physician',profile:'scholar',re:'lekar(?:\\w*)|lecitel(?:\\w*)'},
 {category:'occupation',key:'Apothecary',profile:'scholar',re:'lekarnik(?:\\w*)'},
 {category:'occupation',key:'Scholar',profile:'scholar',re:'ucenec(?:\\w*)|badatel(?:\\w*)|historik(?:\\w*)|vedec(?:\\w*)'},
 {category:'occupation',key:'Scribe',profile:'scholar',re:'pisar(?:\\w*)'},
 {category:'occupation',key:'Astrologer',profile:'mystic',re:'astrolog(?:\\w*)|hvezdopravec(?:\\w*)'},
 {category:'occupation',key:'Shèk-Pvâr',profile:'mystic',re:'mag(?:\\w*)|carodej(?:\\w*)|kouzelnik(?:\\w*)|s(e|h)ek[ -]?pvar(?:\\w*)'},
 {category:'occupation',key:'Shaman',profile:'mystic',re:'saman(?:\\w*)'},
 {category:'occupation',key:'Priest',profile:'mystic',re:'knez(?:\\w*)|knezk(?:\\w*)|duchovni(?:\\w*)'},
 {category:'occupation',key:'Alchemist',profile:'mystic',re:'alchymist(?:\\w*)'},
 {category:'occupation',key:'Herald',profile:'social',re:'herold(?:\\w*)'},
 {category:'occupation',key:'Mercantyler',profile:'social',re:'obchodnik(?:\\w*)|kupec(?:\\w*)'},
 {category:'occupation',key:'Harper',profile:'social',re:'bard(?:\\w*)|hudebnik(?:\\w*)|harfist(?:\\w*)'},
 {category:'occupation',key:'Innkeeper',profile:'social',re:'hostinsk(?:\\w*)|hospodsk(?:\\w*)'},
 {category:'occupation',key:'Thespian',profile:'social',re:'herec(?:\\w*)'},
 {category:'occupation',key:'Jester',profile:'social',re:'sasek(?:\\w*)|komediant(?:\\w*)'},
 {category:'profile',key:'warrior',re:'odvazn(?:\\w*)|statecn(?:\\w*)|bojov(?:\\w*)|valecn(?:\\w*)|souboj(?:\\w*)|chran(?:\\w*) slab(?:\\w*)'},
 {category:'profile',key:'scholar',re:'ucen(?:\\w*)|zvidav(?:\\w*)|vzdelan(?:\\w*)|stud(?:\\w*)|knih(?:\\w*)|rukopis(?:\\w*)|vedomost(?:\\w*)|filosof(?:\\w*)|filozof(?:\\w*)'},
 {category:'profile',key:'mystic',re:'magick(?:\\w*)|magick(?:\\w*)|kouzl(?:\\w*)|mystic(?:\\w*)|ritual(?:\\w*)|viz(e|i)(?:\\w*)|duchov(?:\\w*)|vir(?:\\w*)|zbozn(?:\\w*)'},
 {category:'profile',key:'artisan',re:'remesl(?:\\w*)|vyrab(?:\\w*)|tvor(?:\\w*)|kovar(?:\\w*)|kreativn(?:\\w*)|vynalez(?:\\w*)|pracovit(?:\\w*)'},
 {category:'profile',key:'explorer',re:'cestov(?:\\w*)|putov(?:\\w*)|dobrodruz(?:\\w*)|pruzkum(?:\\w*)|stopov(?:\\w*)|toulav(?:\\w*)|les(?:\\w*)|prirod(?:\\w*)|divocin(?:\\w*)'},
 {category:'profile',key:'social',re:'vyrecn(?:\\w*)|spolecensk(?:\\w*)|diplomat(?:\\w*)|vyjednav(?:\\w*)|obchod(?:\\w*)|politick(?:\\w*)'},
 {category:'profile',key:'covenant',re:'covenant|kult smlouvy|emhl(?:\\w*)'},
 {category:'skill',key:'Melee',re:'mec(?:\\w*)|serm(?:\\w*)|souboj(?:\\w*)|boj zblizka'},
 {category:'skill',key:'Archery',re:'luk(?:\\w*)|strelb(?:\\w*)|sip(?:\\w*)'},
 {category:'skill',key:'Riding',re:'jezdec(?:\\w*)|jezdit na koni|jizd(?:\\w*) na koni'},
 {category:'skill',key:'Tracking',re:'stopar(?:\\w*)|stopov(?:\\w*)'},
 {category:'skill',key:'Survival',re:'prezit(?:\\w*)|preziv(?:\\w*)|divocin(?:\\w*)'},
 {category:'skill',key:'Folklore',re:'povest(?:\\w*)|dejepis(?:\\w*)|legenda(?:\\w*)|histor(?:\\w*)'},
 {category:'skill',key:'Script',re:'pis(?:\\w*)|rukopis(?:\\w*)|cist(?:\\w*)|cteni|knih(?:\\w*)'},
 {category:'skill',key:'Language',re:'jazyk(?:\\w*)|rec(?:\\w*)|preklad(?:\\w*)'},
 {category:'skill',key:'Herblore',re:'bylink(?:\\w*)|leciv(?:\\w*) rostlin(?:\\w*)'},
 {category:'skill',key:'Physician',re:'lecit(?:\\w*)|zranen(?:\\w*)|lekarsk(?:\\w*)'},
 {category:'skill',key:'Intrigue',re:'intrik(?:\\w*)|spikn(?:\\w*)|tajne jednan(?:\\w*)'},
 {category:'skill',key:'Discourse',re:'vyjednav(?:\\w*)|recnik(?:\\w*)'},
 {category:'skill',key:'Charm',re:'okouzlov(?:\\w*)|presvedc(?:\\w*)'},
 {category:'skill',key:'Spirit',re:'duch(?:\\w*)|saman(?:\\w*)'},
 {category:'skill',key:'Pvârism',re:'magick(?:\\w*)|kouzl(?:\\w*)|carodej(?:\\w*)|mag(?:\\w*)'},
 {category:'skill',key:'Drawing',re:'mal(?:\\w*)|kresl(?:\\w*)'},
 {category:'skill',key:'Singing',re:'zpiv(?:\\w*)|hudeb(?:\\w*)'},
 {category:'skill',key:'Seamanship',re:'plavb(?:\\w*)|lodi(?:\\w*)|namorn(?:\\w*)'},
 {category:'skill',key:'Awareness',re:'pozorn(?:\\w*)|ostražit(?:\\w*)|vsimav(?:\\w*)'},
 {category:'trait',key:'patient',re:'trpeliv(?:\\w*)'},
 {category:'trait',key:'confident',re:'sebevedom(?:\\w*)'},
 {category:'trait',key:'calm',re:'klidn(?:\\w*)|rozvazn(?:\\w*)'},
 {category:'trait',key:'energetic',re:'energick(?:\\w*)'},
 {category:'trait',key:'optimistic',re:'optimist(?:\\w*)'},
 {category:'trait',key:'hard-working',re:'pracovit(?:\\w*)'},
 {category:'trait',key:'impulsive',re:'impulzivn(?:\\w*)'},
 {category:'trait',key:'idealistic',re:'idealist(?:\\w*)'},
 {category:'trait',key:'perfectionist',re:'perfekcionist(?:\\w*)'},
 {category:'trait',key:'aggressive',re:'agresivn(?:\\w*)|utocn(?:\\w*)'},
 {category:'trait',key:'imaginative',re:'predstaviv(?:\\w*)|snilek(?:\\w*)'},
 {category:'trait',key:'free-spirited',re:'svobodomysln(?:\\w*)|nespoutan(?:\\w*)'},
 {category:'trait',key:'truthful',re:'pravdomluvn(?:\\w*)|pravdiv(?:\\w*)'},
 {category:'trait',key:'dedicated',re:'oddann(?:\\w*)|verna?(?:\\w*)'},
 {category:'trait',key:'curious',re:'zvidav(?:\\w*)'},
 {category:'trait',key:'personable',re:'pratelsk(?:\\w*)|spolecensk(?:\\w*)'},
 {category:'folk',key:'Kúzhai',re:'kuzhai|trpaslik(?:\\w*)'},
 {category:'folk',key:'Sinái',re:'sinai|elf(?:\\w*)'},
 {category:'folk',key:'Sidhé',re:'sidhe'},
 {category:'folk',key:'Ænarin',re:'aenarin|poloelf(?:\\w*)|pul[ -]?elf(?:\\w*)'},
 {category:'folk',key:'Human',re:'clovek(?:\\w*)|lidsk(?:\\w*)'},
 {category:'age',key:'Old',re:'starec|starena|stary|stara|stari|staric(?:\\w*)|letit(?:\\w*)'},
 {category:'age',key:'Young',re:'mladik(?:\\w*)|mlad(?:\\w*)|jinoch(?:\\w*)'},
 {category:'age',key:'Mature',re:'zral(?:\\w*)|ve strednim veku'}
].map((e,i)=>({...e,re:boundary(e.re),priority:i}));

// Descriptive tags are kept distinct from rule-generated numerical attributes.
// Every checkbox is recognized, even when it is not evidence for a profession.
const checkboxGroups=new Map(Object.entries(groups).flatMap(([group,values])=>values.map(value=>[value,group])));
const groupFocus={
 warrior:['Odvážný','Konfliktní','Pomstychtivý','Vznětlivý','Chrání slabé','Touží po slávě'],
 scholar:['Hledá vědění','Dobrá paměť','Analytický','Učenlivý','Zvídavý'],
 mystic:['Oddán víře','Zbožný','Pověrčivý','Asketický'],
 artisan:['Zručný řemeslník','Šikovné ruce','Žije pro řemeslo','Pečlivý','Vynalézavý'],
 explorer:['Poutník','Touží cestovat','Miluje přírodu','Vyhledává samotu','Vytrvalý','Mrštný'],
 social:['Dobrý vypravěč','Zkušený vyjednavač','Společenský','Přirozený vůdce','Touží po moci']
};
const aspirations={
 STR:{high:['Svalnatý','Mohutný'],low:['Křehký']},
 END:{high:['Vytrvalý'],low:['Křehký']},
 DEX:{high:['Šikovné ruce','Zručný řemeslník'],low:['Nemotorný']},
 AGL:{high:['Mrštný'],low:['Nemotorný']},
 PER:{high:['Pozorný','Výborný stopař'],low:[]},
 REA:{high:['Analytický','Dobrá paměť'],low:[]},
 CRE:{high:['Kreativní','Vynalézavý'],low:[]},
 EMP:{high:['Empatický','Soucitný'],low:['Manipulativní']},
 ELO:{high:['Výřečný','Dobrý vypravěč'],low:['Tichý']},
 WIL:{high:['Disciplinovaný','Vytrvalý'],low:['Impulzivní']}
};
function traitExpression(value){
 const w=fold(value).split(/\s+/);if(w.length>1)return boundary(w.map(x=>x.replace(/[yea]$/,'')+'[a-z]*').join('\s+'));
 const stem=w[0].replace(/(?:nymi|ny|ova|ove|ost|y|a|e|i)$/,'');
 return boundary(stem.length>=4?stem+'[a-z]*':w[0]);
}
const checkboxExpressions=GENERATOR_TRAITS.map(key=>({key,group:checkboxGroups.get(key),rx:traitExpression(key)}));
const negation=/(?:^|\s)(?:ne|neni|nejsem|nenavid[iy]|nesnasi|nechce|nechtel|neumi|nema|odmita|vyhyba se|boji se|bez|nikdy|zadn\\w*|nerad|nechci|nesnasim)(?:\s|$)/g;
function isNegated(clause,start){
 const before=clause.slice(Math.max(0,start-75),start).trim();
 // Only an immediately adjacent negation scope is interpreted; remote negation
 // should not cancel an unrelated profession later in the clause.
 const nearest=before.split(/\s+/).slice(-5).join(' ');
 return [...nearest.matchAll(negation)].some(m=>m.index+m[0].length>=nearest.length-31);
}
function splitClauses(description){return fold(description).replace(/[—–]/g,',').split(/(?:[.!?;\n]+|,|\b(?:ale|avsak|presto|zatimco|nicmene)\b)/g).map(s=>s.trim()).filter(Boolean).slice(0,100);}
function addScore(map,key,points){map[key]=(map[key]||0)+points}
export function interpretCharacterDescription(text='',selectedTraits=[]){
 const description=String(text??'').slice(0,3000);
 const chosen=[...new Set((Array.isArray(selectedTraits)?selectedTraits:[]).filter(v=>GENERATOR_TRAITS.includes(v)))];
 const evidence=[],score={warrior:0,scholar:0,mystic:0,artisan:0,explorer:0,social:0,covenant:0};
 const occupation={},skill={},trait={},folk={},age={};
 const map={occupation,skill,trait,folk,age};
 const traitTags=new Map();
 const addTag=(key,source,expression,negative=false)=>{if(negative)return;let tag=traitTags.get(key);if(!tag){tag={name:key,group:checkboxGroups.get(key),source,expression};traitTags.set(key,tag);}};
 const read=(clause,source)=>{
  const seen=new Set();
  for(const concept of concepts){concept.re.lastIndex=0;
   for(const hit of clause.matchAll(concept.re)){
    const matched=hit[0].trim(),negative=source==='text'&&isNegated(clause,hit.index);
    const unique=`${concept.category}:${concept.key}:${negative}`;
    if(seen.has(unique))continue;seen.add(unique);
    const weight=source==='checkbox'?3:concept.category==='occupation'?6:concept.category==='profile'?2:concept.category==='skill'?3:4;
    evidence.push({source,category:concept.category,key:concept.key,expression:matched,negated:negative});
    if(concept.category==='profile')addScore(score,concept.key,negative?-weight:weight);
    else {addScore(map[concept.category],concept.key,negative?-weight:weight);
     if(concept.profile)addScore(score,concept.profile,negative?-weight:weight);
    }
   }
  }
  if(source==='text')for(const entry of checkboxExpressions){
   entry.rx.lastIndex=0;const hit=entry.rx.exec(clause);if(!hit)continue;
   const negative=isNegated(clause,hit.index);if(!negative)addTag(entry.key,'text',hit[0].trim());
  }
 };
 for(const selected of chosen){read(fold(selected),'checkbox');addTag(selected,'checkbox',selected);}
 for(const clause of splitClauses(description))read(clause,'text');
 for(const t of traitTags.values())for(const [profile,keys] of Object.entries(groupFocus))if(keys.includes(t.name))addScore(score,profile,t.source==='checkbox'?2:1);
 const attributeAspirations=Object.fromEntries(Object.entries(aspirations).flatMap(([name,targets])=>{
  const positive=targets.high.filter(x=>traitTags.has(x)),negative=targets.low.filter(x=>traitTags.has(x));
  return positive.length||negative.length?[[name,{higher:positive,lower:negative}]]:[];
 }));
 const moralityTraits=[...traitTags.keys()];
 const moralityPreference=moralityTraits.some(x=>['Milosrdný','Obětavý','Soucitný','Laskavý'].includes(x))?17:
 moralityTraits.some(x=>['Manipulativní','Lstivý','Pomstychtivý'].includes(x))?7:
 moralityTraits.some(x=>['Čestný','Věrný'].includes(x))?15:null;
 const rank=(o)=>Object.entries(o).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'cs'));
 const ranks=rank(score), occupations=rank(occupation),skills=rank(skill),traits=rank(trait),folks=rank(folk),ages=rank(age);
 const primary=ranks[0]?.[0]||'random';
 const gap=(ranks[0]?.[1]||0)-(ranks[1]?.[1]||0);
 const confidence=ranks.length===0?'unknown':ranks[0][1]<5||gap<=1?'low':gap<5?'medium':'high';
 const contradictions=Object.entries(map).flatMap(([category,m])=>Object.entries(m).filter(([,v])=>v===0&&evidence.some(e=>e.category===category&&e.negated)).map(([key])=>`${category}:${key}`));
 return {traits:chosen,description,score,primary,ranking:ranks.map(x=>x[0]),confidence,
  occupationCandidates:occupations.map(x=>x[0]),skillPreferences:skills.map(x=>x[0]),
  sunsignTraitPreferences:traits.map(x=>x[0]),folkPreference:folks.length>1&&folks[0][1]===folks[1][1]?null:folks[0]?.[0]||null,
  agePreference:ages.length>1&&ages[0][1]===ages[1][1]?null:ages[0]?.[0]||null,
  narrativeTraits:[...traitTags.values()],attributeAspirations,moralityPreference,evidence:evidence.slice(0,150),contradictions,
  disclaimer:'Lokální interpretace v češtině: žádné AI porozumění ani záruka správného výkladu. HMK hody nejsou měněny, vlastnosti mohou být pouze narativní.'};
}
