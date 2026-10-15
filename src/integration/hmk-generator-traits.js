import {OCCUPATIONS} from './hmk-creation-tables.js';
import {EXTENDED_CZECH_CONCEPTS,CZECH_TRAIT_PARAPHRASES} from './hmk-generator-lexicon-cs.js';
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
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe');
const boundary=expr=>new RegExp('(?:^|[^a-z])(?:'+expr+')(?=$|[^a-z])','gu');
/** Czech inflection stems, precise enough to avoid accidental partial words. */
const concepts=[
 {category:'occupation',key:'Mercenary',profile:'warrior',re:'zoldner(?:\\w*)|mercenar(?:\\w*)'},
 {category:'occupation',key:'Man-at-arms',profile:'warrior',re:'vojak(?:\\w*)|ozbrojen(?:\\w*)|bojovnik(?:\\w*)|valecnik(?:\\w*)'},
 {category:'occupation',key:'Swordmaster',profile:'warrior',re:'sermir(?:\\w*)|mistr mec(?:\\w*)'},
 {category:'occupation',key:'Man-at-arms (Archer)',profile:'warrior',re:'lucist(?:\\w*)|lukostrel(?:\\w*)'},
 {category:'occupation',key:'Knight Bachelor',profile:'warrior',re:'rytir(?:\\w*)|knight bachelor'},
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
 {category:'occupation',key:'Shèk-Pvâr',profile:'mystic',re:'mag(?:a|em|ovi|ove|u|um|ovu|oveho|icky|icka|icka)?|carodej(?:\\w*)|kouzelnik(?:\\w*)|s(e|h)ek[ -]?pvar(?:\\w*)'},
 {category:'occupation',key:'Shaman',profile:'mystic',re:'saman(?:\\w*)'},
 {category:'occupation',key:'Priest',profile:'mystic',re:'knez(?:\\w*)|knezk(?:\\w*)|duchovni(?:\\w*)'},
 {category:'occupation',key:'Alchemist',profile:'mystic',re:'alchymist(?:\\w*)'},
 {category:'occupation',key:'Herald',profile:'social',re:'herold(?:\\w*)'},
 {category:'occupation',key:'Mercantyler',profile:'social',re:'obchodnik(?:\\w*)|kupec(?:\\w*)'},
 {category:'occupation',key:'Harper',profile:'social',re:'bard(?:\\w*)|hudebnik(?:\\w*)|harfist(?:\\w*)'},
 {category:'occupation',key:'Innkeeper',profile:'social',re:'hostinsk(?:\\w*)|hospodsk(?:\\w*)'},
 {category:'occupation',key:'Thespian',profile:'social',re:'herec(?:\\w*)'},
 {category:'occupation',key:'Jester',profile:'social',re:'sasek(?:\\w*)|komediant(?:\\w*)'},
 {category:'occupation',key:'Apothecary',profile:'scholar',re:'bylinkar(?:\\w*)|michac lektvar(?:\\w*)'},
 {category:'skill',key:'Weaponcraft',re:'opravuj(?:\\w*) zbran(?:\\w*)|vyrob(?:\\w*) zbran(?:\\w*)'},
 {category:'occupation',key:'Fisher',profile:'explorer',re:'rybar(?:\\w*)'},
 {category:'occupation',key:'Cook',profile:'artisan',re:'kuchar(?:\\w*)'},
 {category:'occupation',key:'Mason',profile:'artisan',re:'zednik(?:\\w*)|kamenik(?:\\w*)'},
 {category:'occupation',key:'Miller',profile:'artisan',re:'mlynar(?:\\w*)'},
 {category:'occupation',key:'Miner',profile:'artisan',re:'hornik(?:\\w*)'},
 {category:'occupation',key:'Clothier',profile:'artisan',re:'krejci(?:\\w*)|soukenik(?:\\w*)'},
 {category:'occupation',key:'Jeweller',profile:'artisan',re:'zlatnik(?:\\w*)|sperkar(?:\\w*)'},
 {category:'occupation',key:'Locksmith',profile:'artisan',re:'zamecnik(?:\\w*)'},
 {category:'occupation',key:'Shipwright',profile:'artisan',re:'lodar(?:\\w*)|stavitel lodi'},
 {category:'occupation',key:'Animal Trainer',profile:'explorer',re:'cvicitel zvirat|krotitel(?:\\w*)'},
 {category:'occupation',key:'Cartographer/Artist',profile:'scholar',re:'kartograf(?:\\w*)|mapar(?:\\w*)'},
 {category:'occupation',key:'Runemaster',profile:'mystic',re:'runopisec(?:\\w*)|mistr run'},
 {category:'occupation',key:'Invoker',profile:'mystic',re:'vyvolavac(?:\\w*)|invoker'},
 {category:'occupation',key:'Bureaucrat',profile:'social',re:'urednik(?:\\w*)|byrokrat(?:\\w*)'},
 {category:'occupation',key:'Gladiator',profile:'warrior',re:'gladiator(?:\\w*)'},
 {category:'occupation',key:'Huscarl',profile:'warrior',re:'huskarl(?:\\w*)'},
 {category:'occupation',key:'Legionnaire',profile:'warrior',re:'legionar(?:\\w*)'},
 {category:'occupation',key:'Woodcutter',profile:'artisan',re:'drvorubec|drevorubec'},
 {category:'occupation',key:'Teamster',profile:'explorer',re:'forman(?:\\w*)|povoznik(?:\\w*)'},
 {category:'occupation',key:'Ostler',profile:'explorer',re:'podkon(?:\\w*)'},
 {category:'occupation',key:'Salter',profile:'artisan',re:'solinar(?:\\w*)'},
 {category:'occupation',key:'Perfumer',profile:'artisan',re:'vo[nn]avkar(?:\\w*)|parfumer(?:\\w*)'},
 {category:'occupation',key:'Beggar',profile:'social',re:'zebrak(?:\\w*)'},
 {category:'skill',key:'Cookery',re:'vareni|vari(?:\\w*)|kuchar(?:\\w*)'},
 {category:'skill',key:'Masonry',re:'zednic(?:\\w*)|kamenic(?:\\w*)'},
 {category:'skill',key:'Metalcraft',re:'kovan(?:\\w*)|kovarst(?:\\w*)'},
 {category:'skill',key:'Physician',re:'ošetrov(?:\\w*)|obvazov(?:\\w*)'},
 {category:'skill',key:'Guile',re:'lstiv(?:\\w*)|klam(?:\\w*)|podvod(?:\\w*)'},
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
 {category:'skill',key:'Tracking',re:'stopar(?:\\w*)|stopov(?:\\w*)|stopuj(?:\\w*)'},
 {category:'skill',key:'Survival',re:'prezit(?:\\w*)|preziv(?:\\w*)|divocin(?:\\w*)'},
 {category:'skill',key:'Folklore',re:'povest(?:\\w*)|dejepis(?:\\w*)|legenda(?:\\w*)|histor(?:\\w*)'},
 {category:'skill',key:'Script',re:'pis(?:\\w*)|rukopis(?:\\w*)|cist(?:\\w*)|cteni|knih(?:\\w*)'},
 {category:'skill',key:'Language',re:'jazyk(?:\\w*)|rec(?:i|mi|ech)?|preklad(?:\\w*)'},
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
 {category:'folk',key:'Malákta',re:'malakta|malak(?:\\w*)'},
 {category:'folk',key:'Nâdi',re:'nadi(?:\\w*)'},
 {category:'age',key:'Old',re:'starec|starena|stary|stara|stari|staric(?:\\w*)|letit(?:\\w*)'},
 {category:'age',key:'Young',re:'mladik(?:\\w*)|mlad(?:\\w*)|jinoch(?:\\w*)'},
 {category:'age',key:'Mature',re:'zral(?:\\w*)|ve strednim veku'}
].concat(EXTENDED_CZECH_CONCEPTS).map((e,i)=>({...e,re:boundary(e.re),priority:i}));

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
 const w=fold(value).split(/\s+/);if(w.length>1)return boundary(w.map(x=>x.replace(/[yea]$/,'')+'[a-z]*').join('\\s+'));
 const stem=w[0].replace(/[aeiy]$/,'');
 return boundary(stem.length>=4?stem+'[a-z]*':w[0]);
}
const checkboxExpressions=GENERATOR_TRAITS.map(key=>({key,group:checkboxGroups.get(key),rx:traitExpression(key)}));
const paraphraseExpressions=CZECH_TRAIT_PARAPHRASES.map(({key,re})=>({key,rx:boundary(re)}));
// Only three words of negation scope within a single proposition; no whole-paragraph negation.
const negation=/\b(?:ne|neni|nejsem|nebyl|nebyla|nejsou|nenarodil\w*|nenavid\w*|nesnas\w*|nechc\w*|nechtel\w*|neumela|neumim|neumi|nema|odmita\w*|vyhyba\s+se|boji\s+se|bez|nikdy|zadn\w*|nerad|nerada|nikoli|nikoliv|odmit\w*|nesmi|nemi\w*)\b/g;
function isNegated(clause,start){
 const nearest=clause.slice(0,start).trim().split(/\s+/).slice(-5).join(' ');
 negation.lastIndex=0;
 return [...nearest.matchAll(negation)].some(m=>nearest.slice(m.index+m[0].length).trim().split(/\s+/).filter(Boolean).length<=3);
}
// Find the nearest explicit subject: first-person/player OR a family member.
// The owner of a preceding family clause must not leak into occupation, Folk,
// age, personal attributes or any numeric HMK rule proof.
const familySubject=/\b(?:otec|otce|otcuv|otcova|matka|matku|matciny|muj tata|muj tatinek|maminka|rodic\w*|prarodic\w*|ded(?:a|ecek)?|babick\w*|bratr\w*|sestr\w*|syn\w*|dcer\w*|manzel\w*|manzelk\w*|stryc\w*|teta|pribuzn\w*|predk\w*|rodin\w*|ditetem|ditem|pritel\w*|spolecnik\w*|soused\w*|ucitel\w*)\b/g;
const selfSubject=/\b(?:ja|jsem|sam|sama|moje|muj|postava|hrdina|hrdinka|nyni|ted|dnes|aktualne|osobne)\b/g;
function nearestSubject(words){
 familySubject.lastIndex=0;selfSubject.lastIndex=0;
 let lastFamily=-1,lastSelf=-1;
 for(const m of words.matchAll(familySubject))lastFamily=m.index;
 for(const m of words.matchAll(selfSubject))lastSelf=m.index;
 // Possessives 'můj otec' or 'moje matka' are NOT first-person subjects.
 return lastFamily>=0&&lastFamily>lastSelf?'family':'current';
}
function contextFor(clause,start,category){
 const preceding=clause.slice(0,start).trim(),words=preceding.split(/\s+/).slice(-16).join(' ');
 const family=nearestSubject(words)==='family'||/\b(?:syn|dcera|potomek|dit[e]?)\s+(?:kovare|lekare|pisare|rytire|kneze)\b/.test(words);
 const recentPivot=/\b(?:nyni|ted|dnes|aktualne|ale ted|ale nyni|stal\w* se)\b/.test(words);
 const former=category==='occupation'&&!recentPivot&&/\b(?:byval\w*|(?:drive|kdysi|predtim|pred lety|v minulosti)\s+(?:(?:jsem|uz|jeste|drive|nejdrive)\s+){0,3}(?:byl|byla|pracoval\w*|slouzil\w*|zivil\w* se)?|jako mladik|jako mlada)\b/.test(words);
 // A wish, rumor, prediction, conditional or impersonation is not a
 // proven CURRENT occupation. Expose it in the evidence as uncertain.
 const hypothetical=category==='occupation'&&/\b(?:mohl\s+by|chtel\w*\s+by|preje\s+si|prej\w*\s+si|snil\w*\s+o|rad\s+by|touzi\s+(?:se\s+stat|byt)|chce\s+(?:se\s+stat|byt)|chci\s+(?:se\s+stat|byt)|chtel\w*\s+(?:se\s+stat|byt)|uvazuj\w*\s+o|kdyby\s+(?:byl|byla)|mohl\s+se\s+stat|udajne|pry|mozna|snad|predstir\w*|vydava\w*\s+se\s+za|hraje\s+si\s+na|tvrd\w*\s*,?\s*ze|ric\w*\s*,?\s*ze|rikal\w*\s*,?\s*ze|(?:jednou\s+)?bude)\b/.test(words);
 return {family,former,hypothetical};
}
function implausibleFolk(clause,hit,folkKey){
 const matched=hit[0].trim();
 // Describing elven objects or talking about groups of elves is not evidence
 // that the PERSON being generated belongs to that Folk.
 if(folkKey==='Sinái'&&/^(?:elfsk\w*|elfov\w*|elfu|elfum|elfy|elfech|elfove)$/.test(matched))return true;
 if(folkKey==='Kúzhai'&&/^(?:trpaslici|trpaslicich|trpasliku|trpaslikum|trpaslicim)$/.test(matched))return true;
 const before=clause.slice(0,hit.index).trim().split(/\s+/).slice(-4).join(' ');
 if(/\b(?:proti|mezi|od|mezi nimi|setkal se s|pratele jsou|bojuje s)\s*$/.test(before))return true;
 return false;
}
function isDepictionOfAnotherPerson(clause,hit,category){
 if(category!=='occupation'&&category!=='folk')return false;
 const after=clause.slice(hit.index+hit[0].length).trim();
 // Illustration, chronicle or statue describes ANOTHER subject, not the PC.
 return /^(?:(?:stal|byl|byla|je|stoji|vyobrazen\w*|zobrazen\w*|nakreslen\w*|namalovan\w*)\s+){0,3}(?:na\s+(?:obrazu|obraze|fresce|tapiserii|sose)|v\s+(?:pribehu|povidce|knize|kronice))\b/.test(after);
}
function isThirdPartyReference(clause,start,category){
 if(!['occupation','folk'].includes(category))return false;
 const words=clause.slice(0,start).trim().split(/\s+/).slice(-6).join(' ');
 return /\b(?:mel\w* rad|ma\w* rad|obdivuj\w*|zabil\w*|zavrazdil\w*|potkal\w*|setkal\w* se s|bojoval\w* proti|bojuje proti|pise o|vypravi o)\b/.test(words);
}
function implausibleAge(clause,hit,ageKey){
 // 'starý rukopis', 'mladý les', 'stará budova' describe the world, not the PC.
 const tail=clause.slice(hit.index+hit[0].length).trim();
 const before=clause.slice(0,hit.index);
 if(!tail&&/\b(?:knih\w*|map\w*|zbran\w*|listin\w*|vesnic\w*|hrad\w*|zricenin\w*|pribeh\w*|pisen\w*)\b/.test(before)&&!/\b(?:postava|hrdina|hrdinka|ona|on|ja|jsem|je to)\b/.test(before))return true;
 if(!/^(?:stary|stara|mlady|mlada)$/.test(hit[0].trim()))return false;
 return /^(?:(?:elfsk\w*|kuzhansk\w*|stredovek\w*|zlat\w*)\s+)?(?:rukopis\w*|knih\w*|me[cč]\w*|dum|hrad\w*|les\w*|strom\w*|otec|matk\w*|pribuzn\w*|mesto|map\w*|zbr[ao]n\w*|budov\w*|klaster\w*|listin\w*|legenda|pribeh\w*|prastary)\b/.test(tail);
}
function implausibleTrait(clause,hit,key){
 const tail=clause.slice(hit.index+hit[0].length).trim();
 if(['Vysoký','Nízký','Mohutný','Skromný','Zanedbaný','Upravený'].includes(key)&&
    /^(?:hrad\w*|vez\w*|dum|dom\w*|strom\w*|hor\w*|budov\w*|knih\w*|mec\w*|most\w*|panstv\w*|svatyn\w*|predmet\w*)\b/.test(tail))return true;
 return false;
}
function splitClauses(description){return fold(description).replace(/[—–]/g,',').split(/(?:[.!?;\n]+|,(?!\s*(?:ze|aby|kdyz|pokud)\b)|\b(?:ale|avsak|presto|zatimco|nicmene|nybrz|ovsem)\b|\ba\s+(?=(?:ja|nyni|ted|dnes)\b))/g).map(s=>s.trim()).filter(Boolean).slice(0,100);}
function addScore(map,key,points){map[key]=(map[key]||0)+points}
export function interpretCharacterDescription(text='',selectedTraits=[]){
 const description=String(text??'').slice(0,3000);
 const chosen=[...new Set((Array.isArray(selectedTraits)?selectedTraits:[]).filter(v=>GENERATOR_TRAITS.includes(v)))];
 const evidence=[],uncertainties=[],score={warrior:0,scholar:0,mystic:0,artisan:0,explorer:0,social:0,covenant:0};
 const polarity=new Map(),frequency=new Map();
 const occupation={},skill={},trait={},folk={},age={};
 const map={occupation,skill,trait,folk,age};
 const traitTags=new Map();
 const addTag=(key,source,expression,negative=false)=>{if(negative)return;let tag=traitTags.get(key);if(!tag){tag={name:key,group:checkboxGroups.get(key),source,expression};traitTags.set(key,tag);}};
 const read=(clause,source)=>{
  const seen=new Set();
  for(const concept of concepts){concept.re.lastIndex=0;
   for(const hit of clause.matchAll(concept.re)){
    const matched=hit[0].trim(),context=source==='text'?contextFor(clause,hit.index,concept.category):{family:false,former:false,hypothetical:false};
    if(concept.category==='age'&&source==='text'&&implausibleAge(clause,hit,concept.key))continue;
    if(concept.category==='folk'&&source==='text'&&implausibleFolk(clause,hit,concept.key))continue;
    const negative=source==='text'&&isNegated(clause,hit.index);
    if(source==='text'&&(isThirdPartyReference(clause,hit.index,concept.category)||isDepictionOfAnotherPerson(clause,hit,concept.category)))continue;
    const unique=`${concept.category}:${concept.key}:${negative}:${context.family}:${context.former}:${context.hypothetical}`;
    if(seen.has(unique))continue;seen.add(unique);
    const fkey=`${source}:${concept.category}:${concept.key}:${negative}`;
    const count=frequency.get(fkey)||0;if(count>=3)continue;frequency.set(fkey,count+1);
    let weight=source==='checkbox'?3:concept.category==='occupation'?9:concept.category==='profile'?2:concept.category==='skill'?3:4;
    const contextKind=context.family?'family':context.former?'former':context.hypothetical?'hypothetical':'current';
    if(context.family||(concept.category==='occupation'&&(context.former||context.hypothetical))){
      weight=0;
      if(uncertainties.length<20&&concept.category==='occupation')uncertainties.push(`${matched}: ${contextKind==='family'?'povolání jiné osoby':contextKind==='former'?'dřívější povolání':'přání, domněnka či neověřená role — nikoli doložené současné povolání'}`);
    }
    evidence.push({source,category:concept.category,key:concept.key,expression:matched,negated:negative,context:contextKind});
    const polkey=`${concept.category}:${concept.key}`;
    if(weight>0){const signs=polarity.get(polkey)||new Set();signs.add(negative?'-':'+');polarity.set(polkey,signs);}
    if(!weight)continue;
    if(concept.category==='profile')addScore(score,concept.key,negative?-weight:weight);
    else {addScore(map[concept.category],concept.key,negative?-weight:weight);
     if(concept.profile)addScore(score,concept.profile,negative?-weight:weight);
    }
   }
  }
  if(source==='text')for(const entry of [...checkboxExpressions,...paraphraseExpressions]){
   entry.rx.lastIndex=0;const hit=entry.rx.exec(clause);if(!hit)continue;
   const negative=isNegated(clause,hit.index),context=contextFor(clause,hit.index,'trait');
   if(!negative&&!context.family&&!implausibleTrait(clause,hit,entry.key))addTag(entry.key,'text',hit[0].trim());
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
 const contradictions=[...polarity.entries()].filter(([,signs])=>signs.size>1).map(([key])=>key);
 if(contradictions.length)uncertainties.push('Protikladné indicie: '+contradictions.join(', '));
 const traitOppositions=[['Odvážný','Bojácný'],['Pracovitý','Líný'],['Tichý','Výřečný'],['Trpělivý','Netrpělivý'],['Vysoký','Nízký'],['Společenský','Samotářský'],['Skromný','Marnotratný'],['Klidný','Vznětlivý']];
 for(const [a,b] of traitOppositions)if(traitTags.has(a)&&traitTags.has(b))uncertainties.push(`Protikladné osobnostní indicie: ${a} × ${b} (mohou být záměrné, vyžadují výklad)`);
 if(occupations.length>1&&occupations[0][1]===occupations[1][1])uncertainties.push('Více stejně podpořených povolání, není jednoznačná volba');
 for(const [job] of occupations){if(!Object.keys(OCCUPATIONS).some(x=>x===job||x.startsWith(job+' (')||x.startsWith(job+':')))uncertainties.push('Povolání '+job+' je rozpoznáno v textu, ale nemá přímý profil v dostupném katalogu HMK; nelze je automaticky vynutit.');}
 if(folks.length>1&&folks[0][1]===folks[1][1])uncertainties.push('Nejednoznačný Folk');
 if(ages.length>1&&ages[0][1]===ages[1][1])uncertainties.push('Nejednoznačná věková skupina');
 return {engine:'deterministic-czech-offline-v5',traits:chosen,description,score,primary,ranking:ranks.map(x=>x[0]),confidence,
  occupationCandidates:occupations.map(x=>x[0]),skillPreferences:skills.map(x=>x[0]),
  sunsignTraitPreferences:traits.map(x=>x[0]),folkPreference:folks.length>1&&folks[0][1]===folks[1][1]?null:folks[0]?.[0]||null,
  agePreference:ages.length>1&&ages[0][1]===ages[1][1]?null:ages[0]?.[0]||null,
  narrativeTraits:[...traitTags.values()],attributeAspirations,moralityPreference,evidence:evidence.slice(0,150),contradictions,uncertainties,
  disclaimer:'Čistě lokální pravidlový rozbor českého textu, bez síťové komunikace. Nezaručuje porozumění libovolným větám. HMK hody a numerické atributy nejsou přepisovány.'};
}
