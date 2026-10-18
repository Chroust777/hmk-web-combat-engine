import {covenantClergyPath} from './hmk-covenant-clergy-path.js';
import {isTribalEmhle} from './hmk-creation-special-skill-grants.js';
import {MAJOR_CHANTRIES,NAMED_PVAR_CHANTRIES,UNLISTED_CHANTRY_ID,majorChantryById} from './hmk-creation-chantries.js';
import {STARTING_ANCESTOR_SKILLS,STARTING_TOTEMS,STARTING_ENERGIES,startingSpiritIndex,SHAMAN_SAMPLE_TRADITIONS,KATH_CLAN_TOTEMS} from './hmk-creation-spirit-powers.js';
import {CREATION_DIVINE_ASPECTS} from './hmk-creation-divine-aspects.js';
import {STARTING_ELIXIR_NAMES} from './hmk-creation-starting-elixirs.js';
import {creationSpellCatalog,PVAR_GUILD_RANKS,CREATION_PVAR_CONVOCATIONS} from './hmk-creation-starting-pvar.js';
import {VERIFIED_WEST_DOCTRINES,VERIFIED_COVENANT_DOCTRINES,verifiedDoctrineReligion,doctrineChoices,moralityOrthodoxyPenalty} from './hmk-creation-doctrine.js';
import {creationPsycheCount,psycheIntensity,CREATION_PSYCHE_TRAITS} from './hmk-creation-psyche.js';
import {allowedParentPriestVariants,parentPriestRitual} from './hmk-parent-priest-family.js';
import {verifiedParentShamanVariants,parentShamanRitual} from './hmk-parent-shaman-family.js';
import {withCreationRuleHelp} from './hmk-creation-rule-help.js';
import {gmLanguageBudget} from './hmk-gm-bonus-language.js';
import {veteranRoundCount,sumRound} from './hmk-veteran-rounds.js';
import {SOCIETIES,SOCIETY_TABLES,VERIFIED_REGIONS,realmFromRegionRoll,realmFromRegionSelection,familyOccupationProfile,regionSubDieRequired,regionDialectDieRequired,regionRealmRows,regionNativeLanguageChoices,regionTrierzonDialectChoices,regionAzeriDialectChoices,regionHepekeriaCommunityChoices,regionHarnTribeDieRequired,regionHarnCommunityChoices,OCCUPATIONS,occupationVariantNames,priestReligionOf,ritualFollowerFromML,OCCUPATION_PAGES,availableBackgroundSkills,wealthDiceCounts,standingFromWealth,printedParentWealthDie,occupationWealthDie,REGION_D1000,ELDER_FOLK_REGIONS} from './hmk-creation-tables.js';
import {CHARACTER_STEPS,SKILL_STAGES,FOLKS,AGE_GROUPS,SIGNS,MONTHS,SKILL_DEFINITIONS,ATTRIBUTES,
 SKILL_GROUPS,SIGN_TRAITS,creationOf,legacyTribalRegionNeedsReview,legacyParentInvokerNeedsReview,calculateSheetSkills,perceptionMode,physicalDiceRequirement,voiceDiceRequirement,signFromBirthday,calculateSkill} from './hmk-character-creation.js';
import {eligibleAges,eligibleRealms,eligibleSocietiesForRealm,eligibleParentClasses,eligibleFamilyOccupationNames,eligibleOccupations,eligibleSkills,eligibleBackgrounds} from './hmk-creation-eligibility.js';
import {creationChoicesFromPhysicalDice} from './hmk-creation-roll-choices.js';
import {SCRIPTS,languageChoices,religionChoices,nativeLanguageDP,nativeRitualDP} from './hmk-skill-instances.js';
const E=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const opt=(values,current)=>values.map(v=>`<option value="${E(v)}" ${String(v)===String(current)?'selected':''}>${E(v)}</option>`).join('');
const sel=(name,label,values,current)=>`<label>${E(label)}<select name="${name}" required><option value="">Vyberte…</option>${opt(values,current)}</select></label>`;
const txt=(name,label,value='',required=true)=>`<label>${E(label)}<input name="${name}" value="${E(value)}" ${required?'required':''}></label>`;
const num=(name,label,val='',min=0,max=999)=>`<label>${E(label)}<input type="number" min="${min}" max="${max}" step="1" name="${name}" value="${E(val)}" required></label>`;
const attributesLabels={str:'Strength',end:'Endurance',dex:'Dexterity',agl:'Agility',per:'Perception',cml:'Comeliness',aur:'Aura',wil:'Will',rea:'Reasoning',cre:'Creativity',emp:'Empathy',elo:'Eloquence'};
const CLASS=['Unfree','Free','Guilded','Military','Priestly','Noble'];
const optNum=(name,label,val='',min=0,max=100)=>num(name,label,val,min,max).replace(' required','');
/** Explicit bounded player choices for divisible *printed* DP pools.
 * Each slot is one of the original DP, not an additional skill point.
 * Existing persisted `Language=2; Other=1` evidence remains readable.
 */
function poolChoices(name,label,options,maxSlots,budget,raw=''){
 const tokens=[];
 for(const part of String(raw??'').split(';')){
  const m=/^\s*([^=;]+?)\s*=\s*(\d+)\s*$/.exec(part);
  if(m&&options.includes(m[1].trim()))for(let i=0;i<Math.min(Number(m[2]),maxSlots);i++)tokens.push(m[1].trim());
 }
 const rows=Array.from({length:maxSlots},(_,i)=>`<label data-hmk-rule-field="${E(name)}" data-pool-row ${i>=budget?'hidden style="display:none"':''}>${E(label)} – DP ${i+1}/${budget||'…'}<select data-pool-choice ${i>=budget?'disabled':''}><option value="">Vyberte…</option>${opt(options,tokens[i])}</select></label>`).join('');
 return `<div data-hmk-dp-pool="${E(name)}" data-pool-budget="${budget}" data-pool-max="${maxSlots}"><input type="hidden" name="${E(name)}" value="${E(raw)}">${rows}</div>`;
}
function body(character,editAttribute=null){
 const c=creationOf(character),v=c.values??{},s=c.step,stage=SKILL_STAGES[c.skillStage]??SKILL_STAGES[0],h=character.hmk??{};
 switch(s){
  case 1:return `<p>Vyberte Folk. HMK str. 20: Humans lze zvolit přímo; pro náhodný výběr hází d100 GM. Tabulka d100: 01–90 Human, 91–95 Kúzhai, 96 Ænarin, 97–99 Sinái, 00 Sidhé.</p>${sel('folk','Folk (nechte prázdné při hodu d100)',FOLKS,v.folk||h.folk).replace(' required','')}${optNum('folkRoll','Fyzický d100, pokud jste losovali (nepovinné)',v.folkRoll??'',1,100)}<p class="tiny">Po zadání d100 se určí standardní Folk. Malákta a Nâdi nejsou v této d100 tabulce: vyberte je přímo pouze pokud je GM dovolil (HMK p.20, Appendix I p.423).</p>`;
  case 2:{const folk=v.folk||h.folk;let ages=eligibleAges(folk);return `<p>HMK str.21: Human a Ænarin mohou zvolit nebo fyzicky hodit d100: 01–35 Young, 36–85 Mature, 86–00 Old. Elder Folk mají vlastní věkovou skupinu. Malákta: Young obvykle, výjimečný Mature se souhlasem GM, nikdy Old; bez d100. Nâdi používají běžné skupiny.</p>${sel('ageGroup','Age group (automaticky z d100 nebo Folk)',ages,v.ageGroup||h.ageGroup).replace(' required','')}${optNum('ageRoll','Fyzický d100, pokud jste pro Age losovali',v.ageRoll??'',1,100)}`;}
  case 3:{let evidence='';if(v.birthMonth&&v.birthDay){try{const x=signFromBirthday(v.birthMonth,v.birthDay);evidence=`<p class="notice">Datum ${E(x.day)} ${E(x.month)}: ${E(x.primary)}${x.secondary?' / '+E(x.secondary)+' (cusp)':''}. ${x.modifiers.map(m=>E(m.group)+' '+m.value).join(' · ')}.</p>`}catch{}}
   return `<p>HMK str.22: fyzický d12 určuje měsíc, fyzický d30 den. Znamení, cusp, Skill Group modifikátory a pozdější Sunsign DP jsou vypočtené z těchto dvou hodnot.</p>${num('birthMonth','Fyzický d12 — měsíc',v.birthMonth??'',1,12)}${num('birthDay','Fyzický d30 — den',v.birthDay??'',1,30)}${evidence}`;}
  case 4:{const signs=h.sunsign?.split(' / ')??[];
   const secondary=signs[1]?`${sel('sunsignTraitSecondary','Druhý Sunsign Trait — '+signs[1],SIGN_TRAITS[signs[1]]??[],v.sunsignTraitSecondary).replace(' required','')}${optNum('traitRollSecondary','Fyzický d6 pro druhý Trait, pokud losujete',v.traitRollSecondary??'',1,6)}`:'';
   return `<p>HMK str.23: vyberte nebo fyzicky hoďte d6 pro Trait primárního znamení. U cusp jsou podle pravidel <strong>povinné dva Traits, jeden z každého Sunsign</strong>.</p>${sel('sunsignTraits','První Sunsign Trait — '+(signs[0]||''),SIGN_TRAITS[signs[0]]??[],v.sunsignTraits).replace(' required','')}${optNum('traitRoll','Fyzický d6 pro první Trait, pokud losujete',v.traitRoll??'',1,6)}${secondary}<p class="tiny">Přidělené Sunsign DP se rozdělí v osmém Skill stadiu, nikoli při výběru Traitu.</p>`;}
  case 5:{let reg='';let nativeD2Needed=false;const nativeChoices=regionNativeLanguageChoices(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace});const subD10Needed=regionSubDieRequired(v.birthRegion,v.regionRoll)===10;const dialectD100Needed=regionDialectDieRequired(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace})===100;const trierzonDialects=regionTrierzonDialectChoices(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace,subRoll:v.regionSubRoll});const azeryanDialects=regionAzeriDialectChoices(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace,subRoll:v.regionSubRoll});const hepekeriaCommunities=regionHepekeriaCommunityChoices(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace});const harnCommunities=regionHarnCommunityChoices(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace,tribeRoll:v.regionTribeRoll});const harnTribeNeeded=regionHarnTribeDieRequired(v.birthRegion,{roll:v.regionRoll,realm:v.birthplace||h.birthplace})===100;
   if(v.birthRegion==='Dalkésh')try{
    const r=String(v.regionRoll??'').trim()?realmFromRegionRoll(v.birthRegion,v.regionRoll):
       v.birthplace?realmFromRegionSelection(v.birthRegion,v.birthplace):null;
    nativeD2Needed=!!r?.nativeLanguageOptions;
   }catch{}
   if(VERIFIED_REGIONS[v.birthRegion]&&v.regionRoll){try{const r=realmFromRegionRoll(v.birthRegion,v.regionRoll,v.nativeLanguageRoll,v.regionSubRoll,v.nativeLanguageChoice,v.regionDialectRoll,v.regionDialectChoice,v.regionAzeriDialectChoice,v.regionCommunityChoice,v.regionTribeRoll);reg=`<p class="notice">Ověřený d100 ${E(r.roll)} → ${E(r.realm)} · ${E(r.society)} · ${E(r.nativeLanguage)} · ${E(r.pantheon)}.</p>`}catch{}}
   return `<p>HMK str.24 a Appendix I (str.415–423): výběr regionu určuje Realm, Society, Pantheon a jazyky. Kompletní automatické Realm tabulky: <strong>${E(Object.entries(VERIFIED_REGIONS).map(([name,rows])=>name+" ("+rows.length+")").join(" · "))}</strong>. Ostatní regiony potvrzuje GM.</p>${sel('birthRegion','Region / režim GM',['GM verified (other region)',...REGION_D1000.map(x=>x[1]),...ELDER_FOLK_REGIONS],v.birthRegion||'GM verified (other region)')}${optNum('venariveRoll','Fyzický d1000 pro určení Region (nepovinné)',v.venariveRoll??'',1,1000)}${optNum('regionRoll','Fyzický d100 pro podporovaný Region',v.regionRoll??'',1,100)}${`<div data-native-d2-container ${nativeD2Needed?'':'hidden'}>${optNum('nativeLanguageRoll','Dvě mateřské řeči: fyzický d2 (1–2)',v.nativeLanguageRoll??'',1,2).replace(' name="nativeLanguageRoll"',` name="nativeLanguageRoll" ${nativeD2Needed?'':'disabled'}`)}</div>`}${`<div data-hurisea-language-container ${nativeChoices.length?'':'hidden'}>${sel('nativeLanguageChoice',v.birthRegion==='Palíthanè'?'Palíthanè: vyberte mateřský jazyk pro přímo vybraný Realm (bez region d100)':v.birthRegion==='Áltôr'?'Áltôr: vyberte mateřský jazyk town (bez kostky)':'Huriséa: vyberte mateřský jazyk podle zázemí rodiny (bez kostky)',nativeChoices,v.nativeLanguageChoice).replace(' name="nativeLanguageChoice"',` name="nativeLanguageChoice" ${nativeChoices.length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-palithane-dialect-container ${dialectD100Needed?'':'hidden'}>${optNum('regionDialectRoll','Palíthanè: fyzický d100 pro dialekt Triérzi (jen pokud je potřeba)',v.regionDialectRoll??'',1,100).replace(' name="regionDialectRoll"',` name="regionDialectRoll" ${dialectD100Needed?'':'disabled'}`)}</div>`}${`<div data-trierzon-dialect-container ${trierzonDialects.length>1?'':'hidden'}>${sel('regionDialectChoice','Tríerzòn: vyberte jeden z uvedených dialektů Triérzi (nepovinné; první bývá nejrozšířenější)',trierzonDialects.length>1?trierzonDialects:[],v.regionDialectChoice).replace(' name="regionDialectChoice"',` name="regionDialectChoice" ${trierzonDialects.length>1?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-azeryan-dialect-container ${azeryanDialects.length>1?'':'hidden'}>${sel('regionAzeriDialectChoice','Ázeryàn: vyberte povolený dialekt Nâsik Azéri (bez další kostky)',azeryanDialects.length>1?azeryanDialects:[],v.regionAzeriDialectChoice).replace(' name="regionAzeriDialectChoice"',` name="regionAzeriDialectChoice" ${azeryanDialects.length>1?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-hepekeria-community-container ${hepekeriaCommunities.length||harnCommunities.length?'':'hidden'}>${sel('regionCommunityChoice',v.birthRegion==='Hârn'?'Hârn: doložená rodinná/kmenová komunita (výběr z nabídky bez hodu)':'Hèpekéria: komunita rodiny (podle prostředí, bez kostky)',v.birthRegion==='Hârn'?harnCommunities:hepekeriaCommunities,v.regionCommunityChoice).replace(' name="regionCommunityChoice"',` name="regionCommunityChoice" ${hepekeriaCommunities.length||harnCommunities.length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-harn-tribe-d100-container ${harnTribeNeeded?'':'hidden'}>${optNum('regionTribeRoll',v.birthRegion==='Áltôr'?'Áltôr West/East lands: fyzický d100 pro druh Álti':'Hârn Tribal lands: fyzický d100 pro jeden z 18 kmenů',v.regionTribeRoll??'',1,100).replace(' name="regionTribeRoll"',` name="regionTribeRoll" ${harnTribeNeeded?'':'disabled'}`)}</div>`}${`<div data-region-sub-d10-container ${subD10Needed?'':'hidden'}>${optNum('regionSubRoll',(v.birthRegion==='Tríerzòn'?'Tríerzòn: fyzický d10 pro Realm (d100 = 00)':v.birthRegion==='Ázeryàn'?'Ázeryàn: fyzický d10 pro Realm (d100 = 98, 99 nebo 00)':'Ivínia: fyzický d10 pro Realm (d100 = 80 nebo 97)'),v.regionSubRoll??'',1,10).replace(' name="regionSubRoll"',` name="regionSubRoll" ${subD10Needed?'':'disabled'}`)}</div>`}${VERIFIED_REGIONS[v.birthRegion]?sel('birthplace','Realm / Birthplace (vyberte přímo, nebo zadejte fyzický d100)',eligibleRealms(v.birthRegion,{folk:h.folk}),v.birthplace||h.birthplace).replace(' required',''):txt('birthplace','GM ověřený Realm / Birthplace',v.birthplace||h.birthplace,false)}${VERIFIED_REGIONS[v.birthRegion]?`<p class="tiny">Bez hodu d100 smí GM přímo vybrat Realm z tabulky: ${E([...new Set(regionRealmRows(v.birthRegion).map(r=>r.realm))].join(' · '))}.</p>`:''}${sel('society','Society (u podporovaného Region určeno tabulkou)',eligibleSocietiesForRealm(v.birthRegion,v.birthplace||h.birthplace)||SOCIETIES,v.society||h.society).replace(' required','')}${reg}${v.birthRegion==='Karéjia'?'<p class="tiny">Karéjia (str.419): v kroku 12 vyberte ze seznamu azérského panteonu TŘI různá náboženství, každé má 1 DP. Žádný dodatečný hod není předepsán.</p>':''}${v.birthRegion==='Ázeryàn'?'<p class="tiny">Ázeryàn (str.416): d100 98, 99 a 00 vyžadují fyzický d10; místní dialekt Nâsik Azéri vybírá GM pouze z doložených variant, bez náhodného hodu. Rodilý mluvčí Nâsik Azéri s 5 native DP dostává navíc 4 native DP Zâkimladal (výpočet jazykových Skill DP probíhá automaticky).</p>':''}${v.birthRegion==='Ivínia'?'<p class="tiny">Ivínia: při fyzickém d100 = 80 nebo 97 vyžaduje Appendix I p.419 ještě fyzický d10; jinak není dodatečný hod povolen.</p>':''}${v.birthRegion==='Tríerzòn'?'<p class="tiny">Tríerzòn (str.422): d100 = 00 vyžaduje fyzický d10. Dialekty Triérzi jsou vědomá volba GM pouze ze seznamu daného Realm; další náhodný hod pravidla neurčují. První uvedený dialekt bývá nejrozšířenější.</p>':''}${v.birthRegion==='Palíthanè'?'<p class="tiny">Palíthanè (str.420): d100 určí Realm i mateřskou řeč; při přímé volbě opakovaného Realm vyberte povolenou jazykovou variantu. Dialekt Triérzi se u pevných kombinací určí automaticky, jinde fyzickým d100 pouze pokud GM potřebuje detail.</p>':''}${v.birthRegion==='Huriséa'?'<p class="tiny">Huriséa: u pěti knížectví tabulka p.419 uvádí dvě možné mateřské řeči. Jazyky vládců mluví vládnoucí rody, Huriséan převládá u nešlechticů. Vyberte jednu z povolených možností; fyzický d2 není stanoven.</p>':''}${v.birthRegion==='Áltôr'?'<p class="tiny">Áltôr (str.416): ve West/East Álti lands je povinný druhý fyzický d100 (01–20 Forest, 21–60 Great, 61–80 Valley, 81–00 Water). Výsledek určuje obživu a Valley má Tribal-Settled podle str.29. Ve městech Amlácht a Lýbath určí GM jednu ze dvou mateřských řečí bez nového hodu.</p>':''}${v.birthRegion==='Hârn'?'<p class="tiny">Hârn (str.418): Tribal lands vyžadují samostatný fyzický d100 na 18 kmenů. U Adaénum a Gozýda vyberte podskupinu podle str.29; Elder Realms vyžadují výběr lidské oblasti z nabídky Ázadmêre/Eváel. Na základě samotných procent se nikdy nelosuje.</p>':''}${v.birthRegion==='Hèpekéria'?'<p class="tiny">Hèpekéria (str.418): Dysor/Kôrlúa mají výjimky podle rodinné komunity; nejde o dodatečnou kostku. Númec má místní dialekty (M1), Nâsik Azéri dva určené dialekty. Kmenové větve jsou pastevecké, Azúwirat a Faláni usedlé podle str.29.</p>':''}${ELDER_FOLK_REGIONS.includes(v.birthRegion)?'<p class="tiny">Elder Folk Appendix I str.423: jde o SAMOSTATNOU fyzickou tabulku d100 pro Ælrhin, Kúzhai, Malákta či Nâdi; nepatří do lidského d1000 Venârivè. Society, Pantheon a jazyky přidělí průvodce automaticky. Lze rovněž přímo vybrat jeden z přesně uvedených Realm.</p>':''}${v.birthRegion==='Dalkésh'?'<p class="tiny">Dalkésh: při dvou rodných jazycích rozhoduje fyzický d2; druhý jazyk se stane regionálním (Appendix I str.417).</p>':''}<p class="tiny">U nepřepsaných regionů potvrzuje společnost a místo GM; nevytváříme smyšlené údaje.</p>`;}
  case 6:{const society=h.society||v.society||'Feudal',table=SOCIETY_TABLES[society==='Feudal/Imperial'?'Feudal':society];const choices=eligibleParentClasses(society,Number(v.classDie||100));
   return `<p>HMK str.26–32: společnost <strong>${E(society)}</strong> určuje Social Class. Všech deset společenských tabulek včetně Viking, Chélemby, Kúzhan a Sináin je přepsáno pro fyzický d100 nebo výhodnější d20. Feudal/Imperial má zvláštní pravidlo pro Noble Occupation.</p>${sel('socialClass','Parent Social Class (automaticky z hodu)',choices,v.socialClass||h.socialClass).replace(' required','')}${sel('classDie','Fyzická kostka', ['100','20'],v.classDie||'100')}${optNum('classRoll','Fyzický Class hod (volba bez hodu GM je možná)',v.classRoll??'',1,100)}`;}
  case 7:{const tribal=['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free';
   const choices=eligibleFamilyOccupationNames(h.society,h.socialClass,{subsistence:v.subsistence||'Foraging',classRoll:v.classRoll,classDie:v.classDie});const familyVariants=(name)=>['Priest','Gentry: Priest'].includes(name)?allowedParentPriestVariants(character):name==='Shaman'?verifiedParentShamanVariants(character):occupationVariantNames(name);
   return `<p>HMK str.26–32: Parent Occupation. <strong>Feudal, Imperial, City-State, Tribal, Tribal-Settled, Tributary, Viking, Chélemby, Kúzhan a Sináin</strong> mají ověřené hlavní automatické d100 tabulky. U Slave a Feudal Tenant Officer se vyžaduje další fyzický d20; zvláštní šlechtický titul se určuje až výsledkem Background d100.</p>${tribal?`${sel('subsistence','Převažující obživa',v.regionProof?.subsistence?[v.regionProof.subsistence]:['Farming','Fishing','Foraging','Herding'],v.subsistence||v.regionProof?.subsistence||'Foraging')}`:''}${tribal||['Feudal','Imperial','City-State','Feudal/Imperial','Tribal','Tribal-Settled','Tributary','Viking','Chélemby','Kúzhan','Sináin'].includes(h.society)?`${optNum('parentOccupationRoll','Fyzický Parent Occupation d100 (automaticky)',v.parentOccupationRoll??'',1,100)}${!tribal?optNum('parentOccupationSubRoll','Slave / Tenant Officer: doplňující fyzický d20',v.parentOccupationSubRoll??'',1,20)+optNum('parentOccupationSpecialRoll','Arcanist: fyzický d20 pro profesní podtyp',v.parentOccupationSpecialRoll??'',1,20)+optNum('parentOccupationConvocationRoll','Shèk-Pvâr: fyzický d6 pro Primary Convocation',v.parentOccupationConvocationRoll??'',1,6):''}`:''}${choices.length?sel('familyOccupation','Parent Occupation (zúženo podle Society / Class)',choices,v.familyOccupation||h.familyOccupation).replace(' required',''):txt('familyOccupation','GM ověřené Parent Occupation (tabulka nedostupná)',v.familyOccupation||h.familyOccupation,false)}${`<div data-family-weaponcrafter-container ${(v.familyOccupation||h.familyOccupation)==='Weaponcrafter'?'':'hidden'}>${sel('familyWeaponcrafterType','Parent Weaponcrafter: vyberte specializaci (HMK p.44)',['Armourer','Bowyer'],v.familyWeaponcrafterType).replace(' name="familyWeaponcrafterType"',` name="familyWeaponcrafterType" ${(v.familyOccupation||h.familyOccupation)==='Weaponcrafter'?'':'disabled'}`)}</div>`}${`<div data-family-variant-container ${familyVariants(v.familyOccupation||h.familyOccupation).length?'':'hidden'}>${sel('familyVariantChoice','Rodičovský profesní podtyp (vyberte z nabídky; bez hodu)',familyVariants(v.familyOccupation||h.familyOccupation),v.familyVariantChoice).replace(' name="familyVariantChoice"',` name="familyVariantChoice" ${familyVariants(v.familyOccupation||h.familyOccupation).length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-family-shaman-ritual-container ${(v.familyOccupation||h.familyOccupation)==='Shaman'?'':'hidden'}>${sel('familyRitualChoice','Parent Shaman: konkrétní Ritual podle doloženého Pantheonu (p.44)',religionChoices(character),v.familyRitualChoice).replace(' name="familyRitualChoice"',` name="familyRitualChoice" ${(v.familyOccupation||h.familyOccupation)==='Shaman'?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-family-martial-container ${['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(v.familyOccupation||h.familyOccupation)?'':'hidden'}>${sel('familyMartialChoice',(v.familyOccupation||h.familyOccupation)==='Man-at-arms (Archer)'?'Parent Man-at-arms (Archer): vyberte Archery nebo kulturně přípustné Slings':'Parent Man-at-arms (Cavalry): vyberte Melee nebo konkrétní Missile Skill (Archery / Slings / Throwing)',(v.familyOccupation||h.familyOccupation)==='Man-at-arms (Archer)'?['Archery','Slings']:['Melee','Archery','Slings','Throwing'],v.familyMartialChoice).replace(' name="familyMartialChoice"',` name="familyMartialChoice" ${['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(v.familyOccupation||h.familyOccupation)?'':'disabled'}`)}</div>`}${`<input type="hidden" name="familyAuto" value="${familyOccupationProfile(v.familyOccupation||h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?'yes':'no'}">`}<p class="tiny">Doložené Family DP a jejich limity platí povinně; podtyp se volí konkrétně výše.</p>${(v.familyOccupation||h.familyOccupation)==='Invoker'?'<p class="tiny">HMK str.42: rodičovský Invoker mění Talent Possession na čtyři fyzické d20. Vyhodnotí se nejvyšší až po určení AUR v kroku 10; nepotvrzujte jej jako jednu kostku.</p>':''}${(v.familyOccupation||h.familyOccupation)==='Shaman'?'<p class="tiny">Parent Shaman: Spirit 2 nebo dříve fyzicky získaný Talent 2; Ritual 3 musí být konkrétní víra podle panteonu. Pro Talent se lze po vyhodnocení Arcane Talent vrátit do kroku 7 (HMK p.44).</p>':''}${['Priest','Gentry: Priest'].includes(v.familyOccupation||h.familyOccupation)?'<p class="tiny">Parent Priest: Vyberte pouze náboženství doložené místním panteonem (HMK p.27,43); neznámé panteony ponechte na GM review.</p>':''}${String(v.familyOccupation||h.familyOccupation||'').startsWith('Gentry:')||['Knight Bachelor','Manor Lord, Appointed','Manor Lord, Enfeoffed','Tenant-in-chief','Patrician (Minor)','Patrician (Major)','Clanhead (Minor)','Clanhead (Major)','Clanhead (Royal)'].includes(v.familyOccupation||h.familyOccupation)?'<p class="tiny">HMK p.43: Noble Family Skills mají šest společných možností (Melee, Dancing, Riding, Heraldry, Intrigue, Script), každá max. 1 DP; navíc se započítá pouze první profesní Skill Gentry nebo označené (*) dovednosti jiné šlechty.</p>':''}${String(v.familyOccupation||h.familyOccupation||'').startsWith('Slave (')?'<p class="tiny">HMK p.44: Slave má dvě RŮZNÉ Physical Skills, každou 2 DP; vyberte povolenou dvojici z nabídky. Typ Craft / Domestic / Farming / Fishing / Herding určuje povinný d20 (pokud ho společenská tabulka vyžaduje).</p>':''}<p class="tiny">Jen povolání obsažená v doloženém katalogu mají automaticky kontrolované Family DP.</p>`;}
  case 8:return `<p>HMK str.33: původní Background určuje skupinu rozvojových Skills v pozdějším kroku.</p>${sel('background','Background (automaticky z hodu)',eligibleBackgrounds(character),v.background||h.background).replace(' required','')}${sel('tribalUnsettled','Non-settled Tribal (automaticky Wilderness)', h.society==='Tribal'?['yes']:['no'],h.society==='Tribal'?'yes':'no')}${v.parentOccupationProof?`<p class="notice">Urban chance určena z Parent Occupation: ${E(v.parentOccupationProof.urbanChance)}%. Hodnota se automaticky předá do Background.</p>`:optNum('urbanChance','Urban chance z GM-ověřené tabulky (0–100)',v.urbanChance??'',0,100)}${h.society==='Tribal'||['Malákta','Nâdi'].includes(h.folk)?'':optNum('backgroundRoll','Fyzický d100 pro Background',v.backgroundRoll??'',1,100)}${h.society==='City-State'?optNum('backgroundTensRoll','City-State: druhý fyzický d10 (desítková kostka)',v.backgroundTensRoll??'',1,10):''}<p class="tiny">Malákta/Nâdi: Wilderness je vždy automaticky podle p.423. Jinak se při zadání d100 a Urban chance Urban/City/Rural/Wilderness ověří podle p.33; City-State používá druhý fyzický d10 na desítky (p.28). U non-settled Tribal se neháže.</p>`;
  case 9:return `<p>HMK str.34: fyzický d100: 01–10 Outcast, 11–40 Unpopular, 41–60 Accepted, 61–95 Popular, 96–00 Favourite.</p>${num('estrangementRoll','Fyzický d100 pro Estrangement',v.estrangementRoll??'',1,100)}`;
  case 10:{const next=ATTRIBUTES.find(name=>!c.attributeProof?.[name]);const rows=ATTRIBUTES.map(n=>{const proof=c.attributeProof?.[n];return `<span>${E(attributesLabels[n])}: ${proof?`<strong>${proof.score}</strong> (${proof.rolls.join(', ')}; base ${proof.adultMinimum}; Folk ${proof.folkModifier>=0?'+':''}${proof.folkModifier})`:'nevyhodnoceno'}</span>`;}).join(' · ');
   if(!next&&(!c.voiceProof||editAttribute==='voi')){
    const req=voiceDiceRequirement(h.folk);
    return `<p>HMK str.49: <strong>Voice (VOI)</strong> je zvláštní fyzický Trait pro Singing, nikoli jeden z 12 základních atributů. ${E(h.folk)}: GM hází ${req.count}×d6 a zahodí ${req.drop} nejnižší hody.</p><div class="field-grid">${Array.from({length:req.count},(_,i)=>num('die'+i,`Fyzický Voice d6 č. ${i+1}`,'',1,6)).join('')}</div><button type="submit" name="action" value="voice">${c.voiceProof?'Přehodit Voice (nový fyzický důkaz)':'Zapsat fyzické Voice hody'}</button><p>Voice: ${c.voiceProof?.score??'nezadána'} · ${rows}</p>`;
   }
   if(!next){
    const chosen=ATTRIBUTES.includes(editAttribute)?editAttribute:ATTRIBUTES[0],r=physicalDiceRequirement(h.ageGroup,character.kind||'PC',ATTRIBUTES.indexOf(chosen)>=6);
    return `<p>HMK str.38: všech 12 Attributes má doložené hody. Pro změnu konkrétního atributu vyberte jeho název a zadejte nový soubor fyzických d6.</p><label>Opravit atribut<select id="creation-attr-name">${ATTRIBUTES.map(key=>`<option value="${key}" ${key===chosen?'selected':''}>${E(attributesLabels[key])}</option>`).join('')}</select></label><button type="button" class="secondary" data-creation-select-attr>Připravit opravu tohoto atributu</button><button type="button" class="secondary" data-creation-edit-voice>Opravit Voice</button><div class="field-grid">${Array.from({length:r.count},(_,i)=>num('die'+i,`Nový fyzický d6 č. ${i+1}`,'',1,6).replace(' required','')).join('')}</div><button type="submit" name="action" value="attribute" class="secondary">Přepočítat vybraný atribut</button><p class="tiny">${rows}</p>`;
   }
   const req=physicalDiceRequirement(h.ageGroup,character.kind||'PC',ATTRIBUTES.indexOf(next)>=6);
   return `<p>HMK str.38: další atribut <strong>${E(attributesLabels[next])}</strong>. Fyzicky hoďte ${req.count}× d6 ${req.drop?`a vyřaďte ${req.drop} ${req.dropHighest?'nejvyšší':'nejnižší'} hodnoty`:''}. Min. 5 se uplatní před Folk modifikátorem.</p><div class="field-grid">${Array.from({length:req.count},(_,i)=>num('die'+i,`Fyzický d6 č. ${i+1}`,'',1,6)).join('')}</div><button type="submit" name="action" value="attribute" class="secondary">Zapsat fyzické hody tohoto atributu</button><p class="tiny">${rows}</p>`;}
  case 11:{const jobs=eligibleOccupations(character);const talentPrereq=`<details><summary>Invoker/Shaman: fyzický Arcane Talent před volbou povolání</summary><p class="tiny">HMK str.40,42: pro Invoker jsou povinné dva skutečně získané Talenty. Běžná postava hází fyzický d20. Potomek rodičovského Invokera hází čtyři fyzické d20 a vyhodnotí pouze nejvyšší (str.42). Podle tohoto výsledku a ověřené AUR se pak případně zadá předepsaný počet fyzických d100. GM zapisuje skutečné hody, nic se negeneruje automaticky. Po potvrzení se nové profese objeví ve filtrované nabídce.</p>${h.familyOccupation==='Invoker'?txt('arcaneTalentD20s','Parent Invoker: přesně čtyři fyzické d20 oddělené čárkami (ponechte nejvyšší; HMK p.42)',v.arcaneTalentProof?.d20s?.join(',')??'',false):optNum('arcaneTalentD20','Fyzický Talent Possession d20 (AUR '+(h.attributes?.aur??'?')+')',v.arcaneTalentProof?.d20??'',1,20)}${txt('arcaneTalentD100s','Předepsané fyzické d100 oddělené čárkami',v.arcaneTalentProof?.d100s?.join(',')??'',false)}<button type="submit" class="secondary" name="action" value="talent-prereq">Ověřit fyzické Talenty pro výběr povolání</button></details>`;return `<p>HMK str.41–44: vyberte povolání. Pro <strong>${Object.keys(OCCUPATIONS).length} ověřených profesí</strong> se Occupational DP při výběru automaticky přidělí přesně; ostatní profese zůstávají v režimu GM review. Archer má kulturní variantu Slings; Cavalry Missile vyžaduje výběr skutečného Missile Skill z nabídky (Archery, Slings nebo Throwing), protože Missile není samostatnou dovedností na str.46. Specializace (Ritual, Script, Languages aj.) je nutné dále vyřešit.</p>${h.birthRegion==='Dalkésh'?'<p class="tiny">Dalkésh (Appendix I, str.417): kastovní pravidlo omezuje vlastní Occupation na Parent Occupation. Výjimky adopce/sňatku dosud vyžadují samostatnou GM kontrolu.</p>':''}${talentPrereq}${religionChoices(character).some(r=>Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,r))?`<p class="notice"><strong>Kněžská dráha Covenant – HMK p.343:</strong> v rodičovské tabulce Émhlè neexistuje samostatné povolání Priest. Postava může postupovat k kněžství rozvojem konkrétního Ritualu: 1–29 ML Laity, 30–59 ML Fighting Order, od 60 ML Clergy (kněz). Profesní DP se nevymýšlejí; zde vyberte skutečně dovolené zaměstnání, Ritual rozvíjejte v dalších stadiích.</p>`:''}${jobs.length?sel('occupation','Occupation (povolené podle Parent Class a Society)',jobs,v.occupation||character.occupation).replace(' required',''):txt('occupation','GM ověřené Occupation (tabulka zatím nedostupná)',v.occupation||character.occupation)}${`<input type="hidden" name="occupationAuto" value="${OCCUPATIONS[v.occupation||character.occupation]?'yes':'no'}">`}<p class="tiny">Doložené Occupational DP jsou automatické; při neznámé profesi není možné vydávat neověřený profil za úplný.</p>
   <div data-occupation-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Script?'':'hidden'}>${sel('occupationScriptChoice','Konkrétní Script (p.47, Appendix II)',SCRIPTS,v.occupationScriptChoice).replace(' required','')}</div>
   <div data-occupation-second-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills['2nd Script']?'':'hidden'}>${sel('occupationSecondScriptChoice','2nd Script: jiné písmo (HMK p.47)',SCRIPTS,v.occupationSecondScriptChoice).replace(' required','')}</div>
   <div data-occupation-third-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills['3rd Script']?'':'hidden'}>${sel('occupationThirdScriptChoice','3rd Script: třetí odlišné písmo (HMK p.47)',SCRIPTS,v.occupationThirdScriptChoice).replace(' required','')}</div>
   <div data-occupation-language ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Language?'':'hidden'}>${sel('occupationLanguageChoice','Jazyk pro profesní Language DP (p.47)',languageChoices(character),v.occupationLanguageChoice).replace(' required','')}</div>
   <div data-occupation-language-distribution ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Language?'':'hidden'}>${poolChoices('occupationLanguageDistribution','Occupation Languages',languageChoices(character),6,OCCUPATIONS[v.occupation||character.occupation]?.skills.Language??0,v.occupationLanguageDistribution)}<p class="tiny">Pro rozdělení více jazyky vyberte jeden jazyk u každého DP. Součet se provede automaticky, bez ručně psaných výrazů. Volba jednoho samostatného jazyka musí zůstat prázdná.</p></div>
   <div data-occupation-scripts-distribution ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Scripts?'':'hidden'}>${poolChoices('occupationScriptsDistribution','Occupation Scripts',SCRIPTS,5,OCCUPATIONS[v.occupation||character.occupation]?.skills.Scripts??0,v.occupationScriptsDistribution)}</div>
   <div data-occupation-ritual ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Ritual?'':'hidden'}>${sel('occupationRitualChoice','Ritual podle povoleného Pantheonu',h.folk==='Kúzhai'?[...new Set([...religionChoices(character),'Siém'])]:religionChoices(character),v.occupationRitualChoice).replace(' required','')}</div>
   <p class="tiny">HMK p.47–48: Languages lze rozdělit mezi více jazyků; tištěné Script (jednotné číslo) je vždy jedno konkrétní písmo. Všechna profesní DP pocházejí z téže tabulky, žádné další nevznikají.</p><p class="tiny" data-occupation-preview>${OCCUPATIONS[v.occupation||character.occupation]?E('HMK p.'+(OCCUPATION_PAGES[v.occupation||character.occupation]??42)+' · '+Object.entries(OCCUPATIONS[v.occupation||character.occupation].skills).map(([skill,dp])=>skill+' '+dp+' DP').join(' · ')):'Profese bez dokončené Occupational tabulky: povinné GM review.'}</p>`;}
  case 12:{const selected=c.skillDP?.[stage]??{},used=Object.values(selected).reduce((a,b)=>a+b,0);
   const allowed=stage==='Optional Skills'?5:stage==='Background Skills'?5:stage==='Veteran Skills'?(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0):null;
   const fixed=stage==='Occupation Skills'&&v.occupationAuto==='yes'||stage==='Folk Skills'&&v.folkAuto==='yes'&&['Kúzhai','Sinái','Sidhé'].includes(h.folk);
   const folkDice=stage==='Folk Skills'&&['Kúzhai','Sinái','Sidhé'].includes(h.folk)?`<input type="hidden" name="folkAuto" value="yes"><p class="tiny">Folk d10 jsou povinné fyzické hody.</p>${txt('folkDice','Fyzické Folk d10 hody, oddělené čárkou ('+(h.folk==='Kúzhai'?2:4)+' kostky)',(c.values.folkSkillProof?.rolls||[]).join(','),false)}<button type="submit" name="action" value="folk">Vyhodnotit fyzické Folk d10</button>`:'';
   const arcane=stage==='Arcane Talent Skills'?`<input type="hidden" name="arcaneTalentMode" value="yes"><p class="tiny">HMK str.40,42,47: ${h.familyOccupation==='Invoker'?'rodičovský Invoker vyžaduje 4 fyzické d20 (nejvyšší)':'fyzický d20 podle Aura'}; podle výsledku případných 1–8 fyzických d100. Každý konkrétní Talent je zvláštní dovednost. Bez d100 se neurčí náhodné Talenty.</p>${h.familyOccupation==='Invoker'?txt('arcaneTalentD20s','Parent Invoker: čtyři skutečné d20 (vyhodnotí se nejvyšší, HMK str.42)',v.arcaneTalentProof?.d20s?.join(',')??'',false):optNum('arcaneTalentD20','Fyzický Talent Possession d20',v.arcaneTalentProof?.d20??'',1,20)}${txt('arcaneTalentD100s','Fyzické Talent Generation d100, oddělené čárkou',v.arcaneTalentProof?.d100s?.join(',')??'',false)}<button type="submit" name="action" value="talent">Vyhodnotit fyzické Talent hody</button>${v.arcaneTalentProof?`<p class="tiny">Doloženo: ${E(v.arcaneTalentProof.result)} · ${E(Object.entries(v.arcaneTalentProof.grants).map(([k,n])=>k+' '+n+' DP').join(' · ')||'bez Arcane DP')}</p>`:''}`:'';
   const veteranCount=stage==='Veteran Skills'?veteranRoundCount(h.folk,h.ageGroup):0;
   const veteran=stage==='Veteran Skills'?`<input type="hidden" name="veteranRoundsMode" value="yes">${veteranCount?sel('veteranRound','Zapisovat do Veteran kola',Array.from({length:veteranCount},(_,i)=>String(i+1)),v.veteranRound||'1'):''}<p class="tiny">HMK str.49: ${veteranCount} × 5 DP; každé kolo má vlastní limit (1 DP dříve rozvinutému Skill, nejvýše 2 DP úplně novému).</p>${v.veteranRoundProof?.map((round,i)=>`<p class="tiny">Kolo ${i+1}: ${E(sumRound(round))}/5 DP · ${E(Object.entries(round).filter(([,x])=>x).map(([n,x])=>n+' '+x).join(' · '))}</p>`).join('')||''}`:'';
   const bonusBudget=gmLanguageBudget(h.folk,h.ageGroup);
   const bonusProof=v.gmBonusLanguageProof;
   const gmBonus=`<fieldset><legend>Volitelné GM Bonus Language DP (HMK str.48, mimo 8 povinných stadií)</legend><p class="tiny">GM může bonus výslovně udělit nebo odmítnout; nejde o náhodný hod ani o Script DP. Tištěný budget: ${bonusBudget===null?'GM review (Folk není v tabulce)':bonusBudget+' DP'}.</p>${sel('gmBonusDecision','Rozhodnutí GM',['declined','granted'],bonusProof?.decision||'declined')}${poolChoices('gmBonusDistribution','GM Bonus Languages',languageChoices(character),4,bonusBudget??0,bonusProof?.distribution||'')}<button type="submit" name="action" value="gmbonus" class="secondary">Potvrdit GM Bonus Languages</button>${bonusProof?`<p class="tiny">Uloženo: ${E(bonusProof.decision)} · ${E(Object.entries(bonusProof.allocations).map(([n,dp])=>n+' '+dp+' DP').join(', ')||'bez bonusu')}</p>`:''}</fieldset>`;
   const skills=eligibleSkills(character,stage);
   return `<p>HMK str.45–49 — <strong>stadium ${c.skillStage+1}/8: ${E(stage)}</strong>. ${fixed?'Příděly automaticky odpovídají ověřené Occupational tabulce.':'Každou hodnotu DP lze zkontrolovat v Character Sheet.'} ${stage==='Family Skills'?'Family Skills mají rozpočet 5 DP a při doložené profesi limit poloviny uvedeného Occupational DP.':''}</p><p>${allowed!==null?`Příděl stadia: ${allowed} DP, zadáno ${used}.`:`DP nyní: ${used}.`}</p>${folkDice}${arcane}${veteran}${gmBonus}${stage==='Folk Skills'?`<input type="hidden" name="nativeSkillsMode" value="yes"><p class="tiny">Native DP se přidělí automaticky; skutečné náboženství vyberte z nabídky.</p>
    <p class="tiny">Native Language: ${E(h.nativeLanguage||'nezjištěna')} · ${nativeLanguageDP(character)} DP. Native Religion: ${h.birthRegion==='Karéjia'&&h.folk==='Human'?'3 × 1 DP (Karéjia p.419)':isTribalEmhle(character)?'SM2 jako zvláštní Family Skill (p.343)':nativeRitualDP(character)+' DP'}; hráč vybírá konkrétní víru z místního panteonu, bez nové kostky. Zâkimladal se vypočítá při splnění podmínek.</p>
    ${nativeRitualDP(character)===0?'<p class="tiny">Tento Folk nemá rodné Ritual DP (HMK p.47).</p>':religionChoices(character).length?(h.birthRegion==='Karéjia'&&h.folk==='Human'?['nativeRitualChoice','nativeRitualChoice2','nativeRitualChoice3'].map((field,i)=>sel(field,'Karéjia: rodné náboženství '+(i+1)+'/3 – 1 DP',religionChoices(character),v[field])).join(''):sel('nativeRitualChoice',isTribalEmhle(character)?'Émhlè Family Ritual SM2 – vyberte víru (p.343)':'Native Ritual – jedno náboženství z panteonu',religionChoices(character),v.nativeRitualChoice)):'<p class="tiny">Pantheon nemá v Appendix I / p.314 jednoznačně uvedený výčet: Ritual vyžaduje doložení, nelze jej generovat náhodně.</p>'}`:''}${stage==='Family Skills'&&isTribalEmhle(character)?'<p class="tiny">Émhlè (p.343): počáteční Ritual SM2 je zvláštní pevný Family příděl NAD RÁMEC pěti běžných Parent Occupation Family DP; zvolená víra je uvedena ve Folk Skills. V Background Skills lze též rozvíjet konkrétní Ritual (max 2 DP).</p>':''}${stage==='Family Skills'&&h.familyOccupation==='Shaman'&&parentShamanRitual(character,v.familyRitualChoice)?`<p class="tiny">Family Shaman: jen ${E(parentShamanRitual(character,v.familyRitualChoice).skill)}; Spirit vždy, Talent pouze po fyzickém zisku (p.40,44,47). Chcete-li Talent namísto Spirit, po Arcane Talent se vraťte do kroku 7 a vyberte doložený podtyp.</p>`:''}${stage==='Family Skills'&&['Priest','Gentry: Priest'].includes(h.familyOccupation)&&parentPriestRitual(character,v.familyVariantChoice)?`<p class="tiny">Family Priest · ${E(parentPriestRitual(character,v.familyVariantChoice).religion)}: Family Ritual DP patří konkrétnímu ${E(parentPriestRitual(character,v.familyVariantChoice).skill)}. Rozpočet 5 DP a limit poloviny profese zůstávají stejné (p.43,47).</p>`:''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills.Script?sel('familyScriptChoice','Konkrétní rodičovský Script (p.47)',SCRIPTS,v.familyScriptChoice).replace(' required',''):''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills['2nd Script']?sel('familySecondScriptChoice','Family Skills: konkrétní 2nd Script',SCRIPTS,v.familySecondScriptChoice).replace(' required',''):''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills['3rd Script']?sel('familyThirdScriptChoice','Family Skills: konkrétní 3rd Script',SCRIPTS,v.familyThirdScriptChoice).replace(' required',''):''}${stage==='Background Skills'?'<input type="hidden" name="backgroundAuto" value="yes">'+(h.background==='City'?poolChoices('backgroundCityLanguageDistribution','City Background Languages',languageChoices(character),6,3*(c.skillDP['Background Skills']?.Language??0),v.backgroundCityLanguageDistribution)+'<p class="tiny">HMK p.46,48: z pěti Background DP spotřebujete jen 1 či 2 na Language; výsledné 3× konkrétní jazykové DP se započítají do Character Sheetu zvlášť.</p>':''):''}${fixed?'':skills.length?`<div class="field-grid">${sel('skillName','Dovednost pro vybrané stadium',skills,'').replace(' required','')}${num('skillDP','DP v této fázi',0,0,20).replace(' required','')}</div><button type="submit" name="action" value="skill" class="secondary">Zapsat DP této dovednosti</button>`:'<p class="tiny">V této fázi nejsou podle dosud doložených předpokladů dostupné žádné volitelné Skills. Nepřepsané tabulky vyžadují samostatné doplnění.</p>'}<p class="muted">${Object.keys(selected).length?Object.entries(selected).map(([name,dp])=>`${E(name)}: ${E(dp)} DP`).join(' · '):'Zatím bez alokace v této fázi.'}</p>`;}
  case 13:{const estr=String(h.estrangement??'').split(' ')[0],spec=OCCUPATIONS[character.occupation],parent=familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);let count=null;try{count=wealthDiceCounts(estr,h.ageGroup,h.folk)}catch{}
   const parentDie=printedParentWealthDie(h.familyOccupation,h.parentTitle,h.socialClass);
   const faith=priestReligionOf(character.occupation);
   let priestDie=null;
   if(faith){const r=calculateSheetSkills(character).find(x=>x.name==='Ritual ('+faith+')');if(r?.ml>=20)priestDie=2*ritualFollowerFromML(r.ml,{clergy:true}).circle;}
   const ownDie=faith?priestDie:occupationWealthDie(character.occupation,h.socialClass);const rollLabel=count?`Family: ${parentDie===0?'d0 = žádný hod':count.family+'+1 hodů d'+(parentDie??'GM')}; Occupation: ${ownDie===0?'d0 = žádný hod':count.occupation+'+1 hodů d'+(ownDie??'GM')} (PC výhoda: zahodit nejnižší pouze tam, kde se skutečně hází).`:'Vyplňte předchozí kroky.';
   return `<p>HMK str.51–52: Wealth se určí fyzickými hody <strong>dvou oddělených skupin</strong>. ${E(rollLabel)}${faith?` Priest (${E(faith)}): Wealth kostka d(Circle × 2), vypočtená z doloženého Ritual ML podle str.55; ${ownDie===null?"bez ověřeného Clergy ML20 nelze automaticky určit Wealth":`aktuálně d${ownDie}`}.`:""} U Farmer: svobodný d2, nevolník d1 (str.42). Při nepřepsaném povolání určí velikosti obou kostek GM podle tištěné tabulky.</p>${(character.kind??'PC')==='PC'&&parentDie!==null&&(ownDie!==null||!!faith)?'<input type="hidden" name="wealthMethod" value="dice"><p class="tiny">Obě velikosti kostek jsou ověřené: fyzické hody jsou povinné, ruční GM součet není k dispozici.</p>':sel('wealthMethod','Způsob doložení Wealth',['dice','gm'],v.wealthMethod||'dice')}${optNum('parentWealthDie','Family Wealth die (dN)',v.parentWealthDie??parentDie??'',0,30)}${optNum('occupationWealthDie','Occupation Wealth die (dN)',v.occupationWealthDie??ownDie??'',0,30)}${txt('familyDice',parentDie===0?'d0 – nevyplňovat žádné Family hody':'Výsledky fyzických Family kostek, oddělené čárkou',v.familyDice||'',false)}${txt('occupationDice',ownDie===0?'d0 – nevyplňovat žádné Occupation hody':'Výsledky fyzických Occupation kostek, oddělené čárkou',v.occupationDice||'',false)}${(character.kind??'PC')==='PC'?'<p class="tiny">PC Wealth Advantage se uplatní automaticky podle HMK p.51: +1 fyzická kostka v každé skupině s nenulovou kostkou, nejnižší výsledek se nezapočítá.</p>':sel('wealthAdvantage','NPC: způsob výpočtu Wealth',['yes','no'],v.wealthAdvantage||'yes')}${(character.kind??'PC')==='PC'&&parentDie!==null&&(ownDie!==null||!!faith)?'':optNum('wealth','Případná GM ručně doložená celková hodnota při režimu gm',v.wealth??'',0,999)}<p class="tiny">V režimu dice budou GM hody jednotlivě zachovány v auditní historii. Stálý Standing, počáteční mince a rozpočet possessions se odvodí automaticky.</p>`;}
  case 14:{
   const count=creationPsycheCount(h.folk,h.ageGroup),saved=v.psycheProof,psycheValue=c.values.psycheProof;
   const known=psycheValue?.d20s?.join(',')??'',traitNames=psycheValue?.traits??[];
   const activeRituals=calculateSheetSkills(character).filter(x=>x.name.startsWith('Ritual (')&&x.ml>0);
   const pvarism=calculateSheetSkills(character).find(x=>x.name==='Pvârism');
   const hasPvarism=(pvarism?.totalDP??0)>0;
   const alchemyRow=calculateSheetSkills(character).find(x=>x.name==='Alchemy');
   const alchemyIndex=Math.floor((alchemyRow?.ml??0)/10);
   const elixirCount=(alchemyRow?.totalDP??0)>0&&alchemyRow.ml>=60?Math.floor(alchemyIndex/2):0;
   const alchemyRows=Array.from({length:elixirCount},(_,i)=>sel('startingElixir'+i,`Elixír ${i+1}/${elixirCount} (AS ${alchemyIndex-i}) – HMK p.269`,STARTING_ELIXIR_NAMES,v.startingElixirProof?.elixirs?.[i]?.name??'')).join('');
   const isPvar=String(character.occupation??'').startsWith('Shèk-Pvâr (');
   const pvarPrimary=isPvar?character.occupation.slice('Shèk-Pvâr ('.length,-1):'';
   const priorPvar=v.startingPvarSpellsProof;
   const allSpellOptions=creationSpellCatalog();
   const pvarSelect=(name,label,assisted)=>`<label>${E(label)}<select name="${name}" multiple size="8" aria-label="${E(label)}">${allSpellOptions.map(x=>`<option value="${E(x.id)}" ${priorPvar?.spells?.some(y=>y.id===x.id&&y.assisted===assisted)?'selected':''}>${E(x.convocation)}: ${E(x.name)} (CL ${x.complexity})</option>`).join('')}</select></label>`;
   const pvarArtefacts=Array.from({length:4},(_,i)=>{
    const a=priorPvar?.artefacts?.[i]??{};
    return `<div class="field-grid">${sel('pvarArtifactKind'+i,`Artefakt ${i+1}: druh`,['minor','major'],a.kind).replace(' required','')}${sel('pvarArtifactSpell'+i,'První enchantment (nutný)',allSpellOptions.map(x=>x.id),a.enchantments?.[0]??a.enchantment).replace(' required','')}${sel('pvarArtifactSpellExtra'+i,'Druhý enchantment (povinný jen pro major)',allSpellOptions.map(x=>x.id),a.enchantments?.[1]).replace(' required','')}${sel('pvarArtifactResult'+i,'Casting Result',['S','CS'],a.result).replace(' required','')}${sel('pvarArtifactDuration'+i,'Duration',['Indefinite','Permanent'],a.duration).replace(' required','')}</div>`;
   }).join('');
   const selectedFaith=(v.mysteriesRitualSkill??v.ritualSkill??activeRituals[0]?.name??'').replace(/^Ritual \(/,'').replace(/\)$/,'');
   const covenant=!!VERIFIED_COVENANT_DOCTRINES[selectedFaith];
   const verifiedDoctrine=verifiedDoctrineReligion(selectedFaith);
   const currentMorality=v.moralityChoice??h.morality??'';
   const selectedClergy=v.ritualClergy==='yes',selectedFighting=v.ritualFightingOrder==='yes';
   const activeFaithML=activeRituals.find(r=>r.name===`Ritual (${selectedFaith})`)?.ml??0;
   const currentCeremony=covenant?(activeFaithML>=60?'High':activeFaithML>=30?'Mid':'Low'):(selectedClergy&&activeFaithML>=60?'High':selectedClergy&&activeFaithML>=30||selectedFighting?'Mid':'Low');
   const subjects=verifiedDoctrine?doctrineChoices(selectedFaith,currentCeremony):[];
   const doctrineRows=Array.from({length:5},(_,i)=>sel('doctrineSubject'+i,`Doctrine Subject ${i+1}/max Piety (je-li k dispozici)`,subjects,v.startingDoctrineProof?.subjects?.[i]??'').replace(' required','')).join('');
   const chantryOptions=NAMED_PVAR_CHANTRIES.map(x=>`<option value="${E(x.id)}" ${priorPvar?.chantryId===x.id?'selected':''}>${E(x.convocation)} · ${E(x.realm)} / ${E(x.name)} · ${'★'.repeat(x.stars)}</option>`).join('');
   const chantrySelect=`<label>Domovská konvokační chantry · přesná nabídka HMK p.197<select name="pvarChantryId" required><option value="">Vyberte chantry…</option>${chantryOptions}<option value="${UNLISTED_CHANTRY_ID}" ${priorPvar?.chantryId===UNLISTED_CHANTRY_ID?'selected':''}>Jiná menší / neuvedená chantry · externí doložení nutné</option></select></label>`;
   const spiritRow=calculateSheetSkills(character).find(x=>x.name==='Spirit');
   const shaman=String(character.occupation??'').startsWith('Shaman (');
   const spiritIndex=shaman&&Number.isInteger(spiritRow?.ml)&&spiritRow.ml>=0?startingSpiritIndex(spiritRow.ml):0;
   const spiritSubjects=[...STARTING_ANCESTOR_SKILLS.filter(x=>!['Language','Musician'].includes(x)).map(x=>['Ancestor',x]),
     ...(h.nativeLanguage?[['Ancestor',`Language (${h.nativeLanguage})`]]:[]),
     ...(h.regionalLanguages??[]).filter(x=>x!==h.nativeLanguage).map(x=>['Ancestor',`Language (${x})`]),
     ...STARTING_TOTEMS.map(x=>['Totem',x]),...STARTING_ENERGIES.map(x=>['Energy',x])];
   const spiritChoices=spiritSubjects.flatMap(([family,subject])=>[1,2,3].map(anima=>`${family}::${subject}::${anima}`));
   const priorPowers=c.values.spiritPowerProof?.powers??[];
   const spiritRows=shaman?Array.from({length:spiritIndex},(_,i)=>{
    const old=priorPowers[i],value=old?`${old.family}::${old.subject}::${old.anima}`:'';
    return `<div class="field-grid">${sel('spiritPower'+i,`Spirit Power ${i+1}/${spiritIndex}`,spiritChoices,value).replace(' required','')}${sel('spiritTalisman'+i,'Připravit Talisman (+1 anima; ne pro Energy)',['no','yes'],old?.talisman?'yes':'no')}</div>`;
   }).join(''):'';

   return `<p>HMK str.40 a 53–56: Fate 5 je automatické; <strong>Divine Grace d20 je povinný fyzický hod</strong>, Psyche je součet předepsaných fyzických d20 a konkrétní Trait vznikne fyzickým d10 nebo volbou z tabulky. Náboženské i Pvârism ML se převezmou přímo z Character Sheet, bez volného čísla.</p><p>Aura: <strong>${E(h.attributes?.aur??'nezadána')}</strong>. Fate Points: <strong>5</strong>.</p>
   ${optNum('graceDie','Povinný fyzický d20 Divine Grace · HMK p.40',v.graceDie??h.divineGrace?.roll??'',1,20)}
   <label>Divine Aspect · pouze při Marked (15–16) nebo Grace (17–20), HMK str.53,310–311
     <select name="graceAspect"><option value="">Nevzniká při d20 1–14 / vyberte…</option>${CREATION_DIVINE_ASPECTS.map(a=>`<option value="${E(a.id)}" ${(v.graceAspect??'')===a.id?'selected':''}>${E(a.id)} · ${E(a.role)} / ${E(a.element)} / ${E(a.domain)} / ${E(a.world)} / ${E(a.psyche)} / ${E(a.mode)}</option>`).join('')}</select></label>
   ${count===null?`<p class="notice">HMK p.40 výslovně nestanovuje počet počátečních Psyche d20 pro Folk ${E(h.folk)}. Bez doloženého pravidla jej aplikace nevymyslí; tato část bude označena k ověření.</p>`:`<p><strong>Psyche: ${count}× fyzický d20</strong> (${E(h.folk)}, ${E(h.ageGroup)}). Zapište jednotlivé výsledky oddělené čárkami. HMK p.40: 1–17 = 0, 18 = 1, 19 = 2, 20 = 3. Součet určí intenzitu.</p>${txt('psycheDice','Fyzické Psyche d20 (např. 19,18)',v.psycheDice??known,false)}<p class="tiny">Pro každý získaný Trait vyberte povolený název. Můžete místo výběru uvést konkrétní fyzický d10; výsledek d10 má přednost a musí odpovídat traitu.</p>${[0,1].map((i)=>`<div class="field-grid">${sel('psycheTraitChoice'+(i+1),'Psyche Trait '+(i+1)+' · jen pokud vznikne',CREATION_PSYCHE_TRAITS,v['psycheTraitChoice'+(i+1)]??traitNames[i]?.trait??'').replace(' required','')}${optNum('psycheTraitDie'+(i+1),'Volitelný fyzický Trait d10 '+(i+1),v['psycheTraitDie'+(i+1)]??traitNames[i]?.roll??'',1,10)}</div>`).join('')}`}
   ${activeRituals.length?sel('ritualSkill','Ritual · vyberte skutečnou dovednost (HMK p.55)',activeRituals.map(x=>x.name),v.ritualSkill??v.mysteriesRitualSkill??'').replace(' required',''):`<p class="tiny">Dosud není rozvinut žádný konkrétní Ritual; Follower Circle/Piety nelze přidělit bez této dovednosti.</p>`}
   ${activeRituals.length?`<div data-west-rank ${covenant?'hidden':''}>${sel('ritualClergy','Je postava Clergy?',['no','yes'],v.ritualClergy||'no')}${sel('ritualFightingOrder','Je členem Fighting Order?',['no','yes'],v.ritualFightingOrder||'no')}</div><p class="tiny" data-covenant-status ${covenant?'':'hidden'}>Covenant p.343: postavení se určuje z Ritual ML automaticky: Laity 1–29, Fighting Order 30–59, Clergy 60+.</p>${sel('moralityChoice','Morality (HMK p.39: hráč smí zvolit hodnotu)',Array.from({length:30},(_,i)=>String(i+1)),currentMorality).replace(' required','')}<p class="tiny">Orthodoxy a Piety se z Morality počítají automaticky podle náboženství (HMK p.55). Ověřené intervaly jsou na p.323–341 (West) a p.343 (Covenant); žádné ruční zadání penalizace.</p>${doctrineRows}`:''}
   ${elixirCount?`<fieldset><legend>Alchemy · ${elixirCount} počátečních elixírů (p.269)</legend><p class="tiny">Alchemy ML ${E(alchemyRow.ml)}, Index ${E(alchemyIndex)}; první AS ${E(alchemyIndex)}, každý další −1. Výběr probíhá výhradně mezi 35 tištěnými elixíry.</p>${alchemyRows}</fieldset>`:''}
   ${isPvar?`<fieldset><legend>Shèk-Pvâr · počáteční příprava (HMK p.54)</legend><p class="tiny">Primary ${E(pvarPrimary)} se odvozuje z profese. Pvârism určuje rozpočet ARP, tři Neutral spells jsou při ML40 automatické. Vyberte hvězdnou kvalitu skutečné domovské chantry, kouzla a nejvýše čtyři připravené artefakty. Seznam kouzel je doslovný přepis všech 204 položek z HMK p.211. K jejich výběru podržte Ctrl/⌘; assisted a unassisted se vybírají odděleně. Všechny pojmenované konvokační chantries ze str.197 se vybírají z nabídky; konvokace i kvalita se doplní automaticky. Neuvedenou menší chantry doložte zvlášť.</p>${chantrySelect}${txt('pvarChantryName','Jméno chantry (u uvedené automatické; jinak zdrojově doložte)',priorPvar?.homeChantry??'',false)}${sel('pvarChantryConvocation','Konvokace vlastní chantry (p.205)',CREATION_PVAR_CONVOCATIONS,priorPvar?.chantryConvocation??pvarPrimary)}${sel('pvarChantryStars','Kvalita domovské chantry (star quality)', ['1','2','3','4','5'],priorPvar?.chantryStars??'')}${sel('pvarGuildRank','Guild Rank (p.199, výjimka podle politiky; vyberte)',PVAR_GUILD_RANKS,priorPvar?.guildRank??'')}${txt('pvarAttunedObject','Attuned elemental object (p.201; hráč popíše vlastní předmět)',priorPvar?.attunedObject??'',false)}${pvarSelect('pvarAssistedSpells','Assisted Research (p.205)',true)}${pvarSelect('pvarUnassistedSpells','Unassisted Research (p.205)',false)}${pvarArtefacts}<p class="tiny">ARP náklad = Complexity + Convocation Degree + případný doplatek za chantry; Focus (Neutral III) a Vessel (Neutral IV) se získávají normálním ARP nákupem. Minor artefact S/CS stojí 1/10 ARP, major 2/20 ARP, s povinnými předpoklady. Guild Rank je výběr z tabulky p.199; jeho definitivní uznání podléhá věku, ML a politice. Objekt je volný popis hráče (p.201), nikoli GM výmysl.</p></fieldset>`:''}
   ${shaman?`<fieldset><legend>Shaman · počáteční Spirit Powers (HMK p.53,300–306)</legend>${sel('shamanTradition','Doložená kmenová tradice – p.301',SHAMAN_SAMPLE_TRADITIONS,v.shamanTraditionProof?.tradition??'').replace(' required','')}${sel('shamanKathTotem','Kath: totem vlastní skupiny (povinný pouze pro Kath)',KATH_CLAN_TOTEMS,v.shamanTraditionProof?.clanTotem??'').replace(' required','')}<p class="tiny">Spirit ML ${E(spiritRow?.ml??'—')} → Index ${E(spiritIndex)}. Každá uložená Power spotřebuje Anima I–III, předem připravený Talisman další +1. Povolena je jedna Totem Power. Výběr z tištěných Ancestor Skills, 12 vzorových totemů a čtyř energií. Počáteční vztah s průvodcem Ancestor Spirit je automaticky Popular (p.302); konkrétní kmenová tradice jej může upravit jen podle doložené výjimky. Tradice na p.301 jsou popisné příklady, nikoli zakazující seznam. Hudební nástroje a bojové účinky Powers nejsou bez pravidlové opory automatizovány.</p>${spiritRows||'<p class="tiny">Spirit Index 0: není k dispozici žádná počáteční Power; potvrďte prázdný výběr.</p>'}</fieldset>`:''}
   <p class="tiny">${hasPvarism?`Pvârism ML ${E(pvarism.ml)} → ARP automaticky podle věku / Folk (str.54).`:'Nevyvinuté Pvârism: nevzniká automatický počáteční ARP nárok.'} Pravidlová náboženská příslušnost a Doctrine Subjects mimo tento příděl zůstávají samostatným tématem.</p>`;
  }
 }
 return '';
}
const STEP_INTROS=[
 'V tomto kroku určíte Folk – původ postavy. Volba ovlivní pozdější věková omezení, atributy a vrozené dovednosti.',
 'Věk vymezuje dostupná povolání, způsob hodu vlastností a pozdější Veteran Skills.',
 'Datum narození určí Sunsign a případný cusp. Z obou skutečných hodů aplikace odvodí příslušné bonusy.',
 'Znamení přiděluje povahové Traits. Na cusp je potřeba jeden Trait pro každé znamení.',
 'Rodiště a region určují Realm, společnost, místní panteon i mateřské a regionální jazyky.',
 'Společnost a rodičovská sociální třída vymezí přípustná rodičovská povolání a pozdější profesní možnosti.',
 'Rodičovské povolání ovlivní Family Skills, rodinné Wealth a někdy také výběr specializace.',
 'Prostředí dětství ovlivňuje Background Skills; aplikace zohlední dosud zvolené rodiště a rodinu.',
 'Tento krok stanoví další údaje rodiny a sociálního původu, které mohou měnit navazující výpočty.',
 'Podle Folk a věku se doloženými fyzickými hody vytvoří základní atributy postavy.',
 'Vyberete vlastní přípustné povolání a jeho specializace. Pravidlové profesní DP jsou závazné.',
 'Vývoj dovedností probíhá po oddělených stadiích; jejich DP se promítají do jediného seznamu Skills.',
 'Wealth vychází z Family a Occupation. Standing se dopočítá z doloženého bohatství.',
 'Závěrečná Mysteries určí předepsané hody, Grace a související magické či duchovní volby.'
];
/** Informational only: do not duplicate game state or make a new rule decision. */
export function creationStepIntroduction(character){
 const c=creationOf(character),h=character.hmk??{},v=c.values??{},step=c.step;
 const prior=[];
 const folk=v.folk||h.folk,region=v.birthRegion||h.birthRegion;
 if(step>=2&&folk)prior.push(`Folk ${folk}`);
 if(step>=6&&region)prior.push(`region ${region}`);
 if(step>=7&&h.society)prior.push(`společnost ${h.society}`);
 if(step>=8&&h.familyOccupation)prior.push(`rodičovské povolání ${h.familyOccupation}`);
 if(step>=11&&h.background)prior.push(`Background ${h.background}`);
 if(step>=12&&(v.occupation||character.occupation))prior.push(`vlastní povolání ${v.occupation||character.occupation}`);
 const folkDetail=step===2&&folk?(folk==='Human'?' Protože jste zvolili Human, nyní můžete vybrat Young, Mature nebo Old, případně použít předepsaný fyzický d100.':` Pro Folk ${folk} platí vlastní věková omezení, která průvodce uplatní.`):'';
 const choices=prior.length?`V předchozích krocích již máte: ${prior.join(' · ')}. Podle nich se zobrazují pouze příslušné nabídky a pravidlové výjimky.`:'Příslušné volby se v dalších krocích průběžně upřesňují.';
 return `<div class="notice" data-creation-step-intro="${step}"><strong>Co v tomto kroku vytváříte:</strong> ${E((STEP_INTROS[step-1]||'Tvorba postavy podle HMK.')+folkDetail)} <span>${E(choices)}</span></div>`;
}
export function creationWizardHTML(character,{editAttribute=null}={}){
 const c=creationOf(character),step=c.step,title=CHARACTER_STEPS[step-1],complete=Object.keys(c.completed??{}).length;
 const enrichedBody=withCreationRuleHelp(body(character,editAttribute),step);
 const invokerLegacyNotice=legacyParentInvokerNeedsReview(character)?'<p class="notice">Starší rodičovský Invoker: čtyři fyzické Talent d20 nebyly doloženy. Je nutné přes Edit znovu zadat fyzické hody v kroku 11/12 nebo opravit rodičovské povolání v kroku 7 (HMK str.42). Původní hody jsou v historii.</p>':'';
 const legacyNotice=legacyTribalRegionNeedsReview(character)?'<p class="notice">Pravidla Tribal/Settled byla upřesněna podle HMK str. 29. Historický profil není smazán; před dalšími změnami potvrďte <strong>Birthplace (krok 5)</strong> přes Edit. Původní fyzické hody zůstávají zachované.</p>':'';
 return `<section class="panel wide creation-flow" aria-labelledby="cc-title"><div class="topline"><h2 id="cc-title">Character Creation · ${E(character.name)}</h2><button type="button" class="secondary" data-creation-leave>← Character Sheet</button></div><div class="notice">Průvodce podle HMK v1.2, krok ${step}/14 · ${E(title[0])} · tištěná str. ${title[1]}. ${c.status==='auto-generated'?'Hody provedl software automaticky.':'Ruční průvodce používá fyzické kostky.'} Data ukládá stávající úložiště postav. <strong>Stav: ${c.status==='auto-generated'?'automaticky dokončeno (softwarové hody)':c.status==='review-required'?'GM review required':'rozpracováno'}</strong>.</div>${legacyNotice}${creationStepIntroduction(character)}<progress value="${complete}" max="14" aria-label="Dokončené kroky"></progress><form id="creation-step-form"><div class="field-grid creation-inputs">${enrichedBody}<output data-creation-roll-preview aria-live="polite" class="notice tiny">Zadejte fyzický hod; při známé tabulce se výsledek doplní automaticky.</output></div><div class="actions">${step>1?'<button type="button" class="secondary" data-creation-back>← Předchozí krok</button>':''}<button type="submit" name="action" value="next">${step===14?'Uložit a předat GM kontrole':step===12&&c.skillStage<7?'Další stadium Skillů →':'Uložit a pokračovat →'}</button></div></form><p class="muted">Možnost návratu a pozdějšího Edit zůstává dostupná. Změny základních atributů mohou vyžadovat znovu ověřit navazující Skill DP a bojové parametry.</p>${complete?`<details><summary>Edit: přejít na již vyplněný krok</summary><div class="field-grid"><select id="creation-jump-select">${CHARACTER_STEPS.map(([label,page],i)=>`<option value="${i+1}" ${step===i+1?'selected':''}>${i+1}. ${E(label)} (str. ${page})</option>`).join('')}</select><button type="button" data-creation-jump>Otevřít vybraný krok</button></div></details>`:''}<dialog class="hmk-rule-dialog" id="hmk-rule-dialog" aria-labelledby="hmk-rule-dialog-title"><header><h3 id="hmk-rule-dialog-title">HMK · pravidlová nápověda</h3><p id="hmk-rule-dialog-page" class="tiny"></p></header><p id="hmk-rule-dialog-effect"></p><p id="hmk-rule-dialog-dice" class="tiny"></p><p id="hmk-rule-dialog-original"></p><p id="hmk-rule-dialog-context" class="tiny"></p><p id="hmk-rule-dialog-status" class="tiny"></p><form method="dialog"><button type="submit" class="secondary">Zavřít</button></form></dialog></section>`;
}
/** HMK 1.2 pp.46/57: one calculated source of truth, seven printed
 * groups, with all eight DP stages separated in their own columns. */
const GROUPED_SKILLS=Object.freeze(['Combat','Physical','Nature','Lore','Craft','Social','Esoterica']);
const DP_COLUMNS=Object.freeze([
 ['Folk Skills','Folk'],['Arcane Talent Skills','Talent'],['Family Skills','Family'],
 ['Background Skills','Background'],['Occupation Skills','Occupation'],['Optional Skills','Optional'],
 ['Veteran Skills','Veteran'],['Sunsign Skills','Sunsign'],['Native Language / Religion','Native'],
 ['GM Bonus Languages','GM Bonus']]);
export function groupedSkillTableHTML(character,{editing=false}={}){
 const list=calculateSheetSkills(character),mode=perceptionMode(character);
 const names=new Set(list.map(x=>x.name)),expected=SKILL_DEFINITIONS.map(x=>x.name);
 if(expected.some(n=>!names.has(n)))throw Error('Chybí základní Skill definice');
 const Eattr=x=>x.perceptionParent?'Sdílené SM • Sight / Sound / Odour':`${x.primary?.toUpperCase()??'—'} (${x.primaryValue??'?'}) + ${x.secondary?.toUpperCase()??'—'} (${x.secondaryValue??'?'})`;
 const detailHeaders=['Skill','SB: atributy','SB','Base SM',...DP_COLUMNS.map(x=>x[1]),'DP Σ','SM','ML / Boost'];
 const detailGroups=GROUPED_SKILLS.map(group=>{
  const rows=list.filter(x=>x.group===group).sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const compact=rows.map(x=>`<tr><th scope="row">${E(x.name)}${x.subskillOf?` <span class="tiny muted">↳ ${E(x.subskillOf)}</span>`:''}</th><td>${E(Eattr(x))}</td><td><strong>${x.ml===null?'—':E(x.ml)}</strong></td></tr>`).join('');
  const detailed=rows.map(x=>{
   const dp=DP_COLUMNS.map(([stage])=>{
    const n=x.dp.find(d=>d.stage===stage)?.dp??0;
    const origin=character.hmk?.creation?.skillDP?.[stage]?.[x.name];
    const inherited=x.subskillOf||x.perceptionParent;
    const input=editing&&!inherited?`<input class="sheet-dp-input" type="number" min="0" max="100" step="1" required name="sheet_dp_${encodeURIComponent(x.name)}_${encodeURIComponent(stage)}" data-skill="${E(x.name)}" data-stage="${E(stage)}" aria-label="${E(x.name)} ${E(stage)}" value="${E(n)}" title="${E(x.name)} · ${E(stage)}; aktuální DP${origin!==undefined?' (při tvorbě '+origin+')':''}">`:(n?E(n):'·');
    return `<td class="dp-cell">${input}</td>`;
   }).join('');
   const sourceSummary=x.dp.filter(d=>d.dp).map(d=>d.stage+': +'+d.dp).join(' · ');
   const legacy=(character.hmk?.skills??[]).find(r=>r.name===x.name&&!r.creationDerived);
   const conflict=legacy?`<div class="notice tiny">Legacy ML ${E(legacy.ml??'—')} vyžaduje sjednocení při Edit.</div>`:'';
   const bonus=x.boosts?.length?`<div class="tiny">Boost: ${E(x.boosts.map(b=>'+'+b.boost).join(', '))}</div>`:'';
   return `<tr title="${E(sourceSummary)}"><th scope="row">${E(x.name)}</th><td>${E(Eattr(x))}</td><td>${x.sb===null?'—':E(x.sb)}</td><td>${E(x.baseSM)}</td>${dp}<td>${E(x.totalDP)}${x.subskillOf?'*':''}</td><td>${E(x.sm)}</td><td><strong>${x.ml===null?'—':E(x.ml)}</strong>${bonus}${conflict}</td></tr>`;
  }).join('');
  return {group,compact,detailed,count:rows.length};
 });
 const compact=`<div class="table-scroll hsk-scroll"><table class="hsk-table hsk-compact"><thead><tr><th scope="col">Skill</th><th scope="col">Atributy (Skill Base)</th><th scope="col">ML</th></tr></thead>${detailGroups.map(x=>`<tbody class="hsk-group"><tr class="hsk-group-head"><th scope="rowgroup" colspan="3">${E(x.group)} · ${x.count}${x.group==='Physical'&&mode==='subattributes'?' (smyslové subskills)':''}</th></tr>${x.compact}</tbody>`).join('')}</table></div>`;
 const detailed=`<details class="hsk-dp-edit"><summary>Edit · rozpad DP, SB, SM a Boost (rozšířený pohled)</summary><p class="tiny">DP se přidělují přes Character Creation / Edit podle pravidel. Otevření podrobností nic nepřidává ani nepřepisuje.</p><div class="table-scroll hsk-scroll"><table class="hsk-table"><thead><tr>${detailHeaders.map(v=>`<th scope="col">${E(v)}</th>`).join('')}</tr></thead>${detailGroups.map(x=>`<tbody class="hsk-group"><tr class="hsk-group-head"><th scope="rowgroup" colspan="${detailHeaders.length}">${E(x.group)} · ${x.count}</th></tr>${x.detailed}</tbody>`).join('')}</table></div><p class="tiny muted">* Sdílené DP / SM nejsou další body; různé ML se odvozují podle vlastních SB.</p></details>`;
 return `<div class="hsk-skill-view">${editing?`<p class="muted">Aktuální DP podle jednotlivých zdrojů. Změny se ukládají jako vývoj postavy mimo historii 14 kroků; ML se přepočítá ze SB, SM a Boost. Sdílené poddovednosti jsou odvozené od rodičovské dovednosti.</p><div class="table-scroll hsk-scroll hsk-edit-scroll"><table class="hsk-table hsk-edit-detail"><thead><tr>${detailHeaders.map(v=>`<th scope="col">${E(v)}</th>`).join('')}</tr></thead>${detailGroups.map(x=>`<tbody class="hsk-group"><tr class="hsk-group-head"><th scope="rowgroup" colspan="${detailHeaders.length}">${E(x.group)} · ${x.count}</th></tr>${x.detailed}</tbody>`).join('')}</table></div>`:compact}</div>`;
}
export function perceptionModePanelHTML(character){
 const c=creationOf(character),mode=perceptionMode(character),proof=c.perceptionProof??{};
 const req=physicalDiceRequirement(character.hmk.ageGroup,character.kind||'PC');
 return `<section class="hsk-perception"><h4>Perception · volitelná pravidla HMK str. 57</h4><p class="muted">Lze přepnout i po vytvoření postavy. Původní PER a fyzické hody zůstávají uložené. Volitelný režim používá tři samostatné skutečně hozené atributy EYE, HRG a SML. Mění SB také u příslušných Lore, Nature, Combat, Craft a Esoterica Skills.</p><form id="hmk-perception-mode-form"><div class="field-grid"><label>Pravidlová varianta<select name="mode"><option value="standard" ${mode==='standard'?'selected':''}>Standard · PER</option><option value="subattributes" ${mode==='subattributes'?'selected':''}>Volitelná · EYE / HRG / SML</option></select></label>${[['eye','Eyesight (EYE)'],['hrg','Hearing (HRG)'],['sml','Smell (SML)']].map(([k,label])=>`<label>${label} · d6 (${req.count} hodů${req.drop?' / vyřadit '+req.drop+' nejnižší':''})<input type="text" name="${k}" inputmode="numeric" placeholder="${proof[k]?'Doloženo '+proof[k].score+'; pro použití původních hodů nevyplňovat':'např. 2, 4, 5, 6'}" value=""><span class="tiny">${proof[k]?`Historický hod: ${E(proof[k].rolls.join(', '))}, score ${E(proof[k].score)}. ${proof[k].folk===character.hmk.folk&&proof[k].ageGroup===character.hmk.ageGroup?'Lze znovu použít.':'Folk/Age se změnily – nutné nové fyzické hody.'}`:'Dosud bez samostatného fyzického důkazu.'}</span></label>`).join('')}</div><button type="submit">Ověřit / změnit Perception</button></form><p class="tiny">Pro první aktivaci volitelného režimu jsou nutné tři samostatné fyzické sady d6 od GM. Při návratu na standardní PER se žádné historické hody nemažou.</p></section>`;
}
export function characterCalculationHTML(character,{editing=false,embedded=false}={}){
 const h=character.hmk??{},c=creationOf(character),skills=calculateSheetSkills(character);
 if(!h.creation){
  const rows=h.skills??[];const Erow=x=>E(x??'');
  const tableRows=rows.map((r,i)=>`<tr><td>${Erow(r.group)}</td><td>${Erow(r.name)}</td><td>${Erow(r.sb)}</td><td>${editing?`<input class="sheet-inline-input" type="number" name="sheet_legacy_ml_${i}" aria-label="ML ${Erow(r.name)}" min="0" max="200" step="1" required value="${Erow(r.ml)}">`:Erow(r.ml)}</td></tr>`).join('');
  if(embedded)return `<div class="journal-edit-skills-surface journal-edit-skills-surface--legacy"><p class="muted">Starší ruční profil: ${editing?'lze upravovat aktuální ML. Tento profil nemá doložené jednotlivé vývojové DP.':'přehled dostupných dovedností.'}</p><div class="table-scroll"><table class="catalog-spec"><thead><tr><th>Skupina</th><th>Dovednost</th><th>SB</th><th>ML</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
  return `<section class="panel wide"><h3>Character Sheet · Skills</h3><p class="muted">Starší ruční profil: ${editing?'lze upravovat aktuální ML. Tento profil nemá doložené jednotlivé vývojové DP.':'přehled dostupných dovedností.'}</p><div class="table-scroll"><table class="catalog-spec"><thead><tr><th>Skupina</th><th>Dovednost</th><th>SB</th><th>ML</th></tr></thead><tbody>${tableRows}</tbody></table></div></section>`;
 }
 const invokerLegacyNotice=legacyParentInvokerNeedsReview(character)?'<p class="notice">Starší rodičovský Invoker: čtyři fyzické Talent d20 nebyly doloženy. Je nutné přes Edit znovu zadat fyzické hody v kroku 11/12 nebo opravit rodičovské povolání v kroku 7 (HMK str.42). Původní hody jsou v historii.</p>':'';
 const legacyNotice=legacyTribalRegionNeedsReview(character)?'<p class="notice">Starší profil vyžaduje opětovné potvrzení kroku 5 Birthplace: Tribal/Settled a obživa byly v HMK str. 29 zpřesněny. Závislé Skills nejsou do potvrzení považovány za aktuální.</p>':'';
 const details=skills;const effective=new Map((h.skills??[]).map(s=>[s.name,s]));
 const proof=[];
 if(c.values.venariveProof)proof.push(`Region d1000: ${E(c.values.venariveProof.roll)} → ${E(c.values.venariveProof.region)}`);
 if(c.values.regionProof)proof.push(`Realm ${c.values.regionProof.selectedByGM?'GM volba':'d100: '+E(c.values.regionProof.roll)}${c.values.regionProof.languageRoll?' · jazyk d2: '+E(c.values.regionProof.languageRoll):''}${c.values.regionProof.subRoll?' · Realm d10: '+E(c.values.regionProof.subRoll):''}${c.values.regionProof.tribeRoll?' · Tribe d100: '+E(c.values.regionProof.tribeRoll)+' ('+E(c.values.regionProof.tribe)+')':''}${c.values.regionProof.regionCommunityChoice?' · komunita: '+E(c.values.regionProof.regionCommunityChoice):''}${c.values.regionProof.dialectRoll?' · dialekt d100: '+E(c.values.regionProof.dialectRoll):''}${c.values.regionProof.trierziDialect?' · Triérzi: '+E(c.values.regionProof.trierziDialect):''}${c.values.regionProof.nativeLanguageDialect?' · dialekt '+E(c.values.regionProof.nativeLanguageDialect):''} → ${E(c.values.regionProof.realm)} · ${E(c.values.regionProof.society)} · ${E(c.values.regionProof.nativeLanguage)}`);
 if(c.values.familyWeaponcrafterType)proof.push(`Parent Weaponcrafter: ${E(c.values.familyWeaponcrafterType)} (HMK p.44)`);
 if(c.values.familyMartialChoice)proof.push(`Parent Man-at-arms: ${E(c.values.familyMartialChoice)} (HMK p.43)`);
 if(c.values.parentOccupationProof)proof.push(`Parent Occupation d100: ${E(c.values.parentOccupationProof.roll)} → ${E(c.values.parentOccupationProof.name)} (Urban ${E(c.values.parentOccupationProof.urbanChance)}%, str. ${E(c.values.parentOccupationProof.sourcePage)})${c.values.parentOccupationProof.subRoll?' · Slave d20: '+E(c.values.parentOccupationProof.subRoll):''}`);
 if(c.values.parentTitleProof)proof.push(`Noble title z Background d100 ${E(c.values.parentTitleProof.backgroundRoll)} → ${E(c.values.parentTitleProof.title)}`);
 if(c.values.folkSkillProof)proof.push(`Folk Skills d10: ${E(c.values.folkSkillProof.rolls.join(', '))} → ${E(Object.entries(c.values.folkSkillProof.skills).map(([k,v])=>k+' '+v).join(' · '))}`);
 if(c.values.wealthProof){const w=c.values.wealthProof;proof.push(`Wealth · Family ${E(w.familyRolls.join(','))} (počítáno ${E(w.keptFamily.join(','))}); Occupation ${E(w.occupationRolls.join(','))} (počítáno ${E(w.keptOccupation.join(','))}) → ${E(w.wealth)}; ${E(w.lifestyle)}; mince ${E(w.coinsPence)}d; possessions ${E(w.possessionsPence)}d`);}
 else if(Number.isInteger(h.wealth))proof.push(`Wealth: GM potvrzeno ${E(h.wealth)}; ${E(h.lifestyle)}`);
 if(h.divineGrace)proof.push(`Grace d20: ${E(h.divineGrace.roll)} → ${E(h.divineGrace.grace)} Grace ${h.divineGrace.marked?'(Marked)':''}`);
 if(h.divineAspect)proof.push(`Divine Aspect: ${E(h.divineAspect.id)} — ${E(h.divineAspect.role)}, ${E(h.divineAspect.domain)} (HMK p.310)`);
 if(c.values.psycheProof){const p=c.values.psycheProof;proof.push(`Psyche fyzické d20: ${E(p.d20s.join(', '))} → součet ${E(p.sum)}; ${E(h.psyche??'None')}`);}
 if(c.values.psycheRuleReview)proof.push(`Psyche: ${E(c.values.psycheRuleReview)}`);
 if(h.startingElixirs)proof.push(`Alchemist elixíry: ${E(h.startingElixirs.elixirs.map(x=>x.name+' AS'+x.alchemicalStrength).join('; '))} (p.269)`);
 if(h.startingPvarSpells)proof.push(`Shèk-Pvâr: Primary ${E(h.startingPvarSpells.primary)}, kouzel ${E(h.startingPvarSpells.spells.length)}, artefaktů ${E(h.startingPvarSpells.artefacts.length)}, ARP ${E(h.startingPvarSpells.spentARP)} / ${E(h.startingPvarSpells.startingARP)} (p.54,211)`);
 if(h.startingDoctrine)proof.push(`Doctrine ${E(h.startingDoctrine.religion)}: MOR ${E(h.startingDoctrine.morality)}, orthodoxy −${E(h.startingDoctrine.orthodoxyPenalty)}, Piety ${E(h.startingDoctrine.maxPiety)}, ${E(h.startingDoctrine.subjects.join('; '))} (p.55)`);
 if(h.shamanTradition)proof.push(`Shaman tradition ${E(h.shamanTradition.tradition)}${h.shamanTradition.clanTotem?' / clan '+E(h.shamanTradition.clanTotem):''}; Ancestor guide estrangement ${E(h.shamanTradition.initialAncestorEstrangement??'Popular')} (p.301–302)`);
 if(h.startingSpiritPowers)proof.push(`Shaman Spirit Powers: Spirit Index ${E(h.startingSpiritPowers.index)}, anima ${E(h.startingSpiritPowers.animaBurden)}, ${E(h.startingSpiritPowers.powers.map(p=>p.family+' '+p.subject+' '+p.anima+(p.talisman?' Talisman':'')).join('; ')||'žádné')}`);
 if(h.religiousStatus)proof.push(`Ritual: ML${E(h.religiousStatus.ritualML)}, Circle ${E(h.religiousStatus.circle)}, Blessing +${E(h.religiousStatus.blessingBonus)}, max Piety ${E(h.religiousStatus.maxPiety)}`);
 if(h.startingArcaneResearch)proof.push(`Pvârism ML${E(h.startingArcaneResearch.pvarismML)} × ${E(h.startingArcaneResearch.multiplier)} → ARP ${E(h.startingArcaneResearch.startingARP)}, Neutral: ${E(h.startingArcaneResearch.neutralSpells.join(', ')||'bez výchozích kouzel')}`);
 const cityLanguageNote=h.background==='City'&&Number(c.skillDP?.['Background Skills']?.Language)>0&&c.values.backgroundCityLanguageDistribution?
  `<p class="notice tiny">HMK p.46,48 · City Background: <strong>${E(c.skillDP['Background Skills'].Language)} zaplacený Background DP</strong> do Language → <strong>${E(3*c.skillDP['Background Skills'].Language)} konkrétních Language DP</strong> (${E(c.values.backgroundCityLanguageDistribution)}). Pět základních Background DP se nenavyšuje.</p>`:'';
 const proofHTML=proof.length?`<details><summary>Pravidlové doklady: původ, Folk, Wealth, Mysteries</summary>${proof.map(x=>`<p class="tiny">${x}</p>`).join('')}</details>`:'';
 const intro=`<p class="muted">${c.status==='auto-generated'?'Všech 14 kroků bylo dokončeno automaticky; všechny hody zadal generátor a v historii jsou výslovně označeny jako softwarové. Nevyžaduje se další potvrzení uživatele.':c.status==='review-required'?'Všech 14 hlavních kroků prošlo průvodcem, ale postava stále vyžaduje ověření GM.':'Rozpracováno: krok '+c.step+'/14.'} Všechny ověřené atributy jsou přímo v dosavadním HMK profilu, který čte Combat.</p>`;
 const proofBlock=`<details class="skill-proof-collapsible"><summary>Pravidlové doklady a nastavení Perception (rozbalit)</summary>${editing?'':perceptionModePanelHTML(character)}${proofHTML}<p class="tiny">HMK p.45–49: SB = průměr dvou atributů se zaokrouhlením podle pořadí; ML = SB × SM a případné Mastery Boosts. Perception lze měnit přes samostatný GM formulář; každá změna přepočítá všechny navázané Skill Bases. Ostatní nedokončené specializace vyžadují GM review. Tento přehled nepřepisuje historické ručně zadané Skills.</p></details>`;
 if(embedded)return `<div class="hsk-character-skills journal-edit-skills-surface">${intro}${legacyNotice}${invokerLegacyNotice}${cityLanguageNote}${groupedSkillTableHTML(character,{editing})}${proofBlock}</div>`;
 return `<section class="panel wide hsk-character-skills" aria-labelledby="hmk-sheet-skills-title"><h3 id="hmk-sheet-skills-title">Character Sheet · Dovednosti (Skills)</h3>${intro}${legacyNotice}${invokerLegacyNotice}${cityLanguageNote}${groupedSkillTableHTML(character,{editing})}${proofBlock}</section>`;
}

/** Update only the affected selects, without writing profile data or rolling dice.
 * Invoked on each input/change; physical-die preview remains authoritative.
 */
export function refreshCreationChoiceUI(form,character){
 const c=creationOf(character),h=character.hmk??{},v=Object.fromEntries(new FormData(form));
 const update=(name,values,chosen,disableWhenSingle=false)=>{
  const el=Array.from(form.elements).find(e=>e.name===name&&e.tagName==='SELECT');if(!el)return;
  const old=String(chosen??el.value??'');const allowed=[...new Set(values)];
  const markup='<option value="">Vyberte…</option>'+opt(allowed,old);
  if(el.innerHTML!==markup)el.innerHTML=markup;
  el.value=allowed.includes(old)?old:'';
  // Keep enabled so FormData includes the resolved result in the existing CAS path.
 };
 if(c.step===14){
  const chantry=majorChantryById(v.pvarChantryId);
  const named=chantry?.pvaric===true;
  if(named){
   for(const [field,value] of [['pvarChantryName',chantry.name],['pvarChantryConvocation',chantry.convocation],['pvarChantryStars',String(chantry.stars)]]){
    const el=Array.from(form.elements).find(e=>e.name===field);
    if(el){el.value=value;el.closest('label').hidden=true;}
   }
  }else{
   for(const field of ['pvarChantryName','pvarChantryConvocation','pvarChantryStars']){
    const el=Array.from(form.elements).find(e=>e.name===field);
    if(el)el.closest('label').hidden=false;
   }
  }
  const faith=(v.ritualSkill??c.values.mysteriesRitualSkill??'').replace(/^Ritual \(/,'').replace(/\)$/,'');
  const row=calculateSheetSkills(character).find(x=>x.name===`Ritual (${faith})`);
  const covenant=Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,faith);
  const priest=covenant?row?.ml>=60:v.ritualClergy==='yes',order=covenant?row?.ml>=30&&row?.ml<60:v.ritualFightingOrder==='yes';
  const ceremony=covenant?(row?.ml>=60?'High':row?.ml>=30?'Mid':'Low'):(priest&&row?.ml>=60?'High':priest&&row?.ml>=30||order&&row?.ml>=40?'Mid':'Low');
  const options=verifiedDoctrineReligion(faith)?doctrineChoices(faith,ceremony):[];
  const westRanks=form.querySelector('[data-west-rank]'),covenantNote=form.querySelector('[data-covenant-status]');
  if(westRanks)westRanks.hidden=covenant;
  if(covenantNote)covenantNote.hidden=!covenant;
  let maxPiety=0;
  try{const circle=covenant?row?.ml>=60?3:row?.ml>=30?2:1:priest?row?.ml>=60?3:row?.ml>=30?2:1:order?row?.ml>=40?2:1:0;maxPiety=Math.max(0,circle+1-moralityOrthodoxyPenalty(faith,Number(v.moralityChoice)));}catch{}
  for(let i=0;i<5;i++){
   const name=`doctrineSubject${i}`,el=Array.from(form.elements).find(e=>e.name===name);if(!el)continue;
   const holder=el.closest('label'),active=i<maxPiety&&options.length>0;
   if(holder)holder.hidden=!active;el.disabled=!active;el.required=active;
   if(!active)el.value='';else update(name,options,el.value);
  }
 }
 if(c.step===5){
  const region=v.birthRegion,rows=VERIFIED_REGIONS[region];
  let birthplace=Array.from(form.elements).find(e=>e.name==='birthplace');
  if(birthplace){
   const shouldSelect=!!rows,isSelect=birthplace.tagName==='SELECT';
   if(shouldSelect!==isSelect){
    const label=birthplace.closest('label'),previous=birthplace.value;
    birthplace=shouldSelect?document.createElement('select'):document.createElement('input');
    birthplace.name='birthplace';if(!shouldSelect)birthplace.value=previous;
    label.replaceChild(birthplace,label.querySelector('[name="birthplace"]'));
   }
  }
  if(rows){
   const regionRoll=String(v.regionRoll??'').trim();let chosen=birthplace?.value??'';
   if(regionRoll){try{
    // Realm itself comes from the physical d100 even while native language awaits GM.
    const rollNum=Number(regionRoll),row=Number.isInteger(rollNum)&&rollNum>=1&&rollNum<=100?rows.find(r=>rollNum<=r.max):null;
    chosen=row?.realm??'';
    if(row?.subRollOptions)chosen=realmFromRegionRoll(region,regionRoll,v.nativeLanguageRoll,v.regionSubRoll,v.nativeLanguageChoice).realm;
   }catch{chosen='';}}
   update('birthplace',eligibleRealms(region,{folk:h.folk}),chosen);
   const societies=eligibleSocietiesForRealm(region,chosen)||[];
   const alticDie=Number(v.regionTribeRoll);
   const societyByAltiTribe=region==='Áltôr'&&['West Álti lands','East Álti lands'].includes(chosen)&&Number.isInteger(alticDie)&&alticDie>=61&&alticDie<=80?'Tribal-Settled':societies[0];
   update('society',societies,chosen?societyByAltiTribe:v.society);
  }else update('society',SOCIETIES,v.society);
  const hurLanguage=form.querySelector('[data-hurisea-language-container]');
  if(hurLanguage){
   const choices=regionNativeLanguageChoices(region,{roll:v.regionRoll,realm:chosen});
   hurLanguage.hidden=choices.length===0;
   update('nativeLanguageChoice',choices,v.nativeLanguageChoice);
   const input=hurLanguage.querySelector('[name="nativeLanguageChoice"]');input.disabled=choices.length===0;
  }
  const dialect=form.querySelector('[data-palithane-dialect-container]');
  if(dialect){
   const required=regionDialectDieRequired(region,{roll:v.regionRoll,realm:chosen})===100;
   const el=dialect.querySelector('[name="regionDialectRoll"]');dialect.hidden=!required;el.disabled=!required;
   if(!required)el.value='';
  }
  const trierzon=form.querySelector('[data-trierzon-dialect-container]');
  if(trierzon){
   const choices=regionTrierzonDialectChoices(region,{roll:v.regionRoll,realm:chosen,subRoll:v.regionSubRoll});
   trierzon.hidden=choices.length<=1;update('regionDialectChoice',choices.length>1?choices:[],v.regionDialectChoice);
   trierzon.querySelector('[name="regionDialectChoice"]').disabled=choices.length<=1;
  }
  const azeri=form.querySelector('[data-azeryan-dialect-container]');
  if(azeri){
   const choices=regionAzeriDialectChoices(region,{roll:v.regionRoll,realm:chosen,subRoll:v.regionSubRoll});
   azeri.hidden=choices.length<=1;update('regionAzeriDialectChoice',choices.length>1?choices:[],v.regionAzeriDialectChoice);
   azeri.querySelector('[name="regionAzeriDialectChoice"]').disabled=choices.length<=1;
  }
  const harnTribe=form.querySelector('[data-harn-tribe-d100-container]');
  if(harnTribe){const required=regionHarnTribeDieRequired(region,{roll:v.regionRoll,realm:chosen})===100;
   const input=harnTribe.querySelector('[name="regionTribeRoll"]');harnTribe.hidden=!required;input.disabled=!required;
   if(!required)input.value='';}
  const hepekeria=form.querySelector('[data-hepekeria-community-container]');
  if(hepekeria){
   const choices=region==='Hârn'?regionHarnCommunityChoices(region,{roll:v.regionRoll,realm:chosen,tribeRoll:v.regionTribeRoll}):regionHepekeriaCommunityChoices(region,{roll:v.regionRoll,realm:chosen});
   hepekeria.hidden=choices.length===0;update('regionCommunityChoice',choices,v.regionCommunityChoice);
   hepekeria.querySelector('[name="regionCommunityChoice"]').disabled=choices.length===0;
  }
  const regionSub=form.querySelector('[data-region-sub-d10-container]');
  if(regionSub){
   const required=regionSubDieRequired(region,v.regionRoll)===10;
   const el=regionSub.querySelector('[name="regionSubRoll"]');
   regionSub.hidden=!required;el.disabled=!required;
   if(!required)el.value='';
  }
  const sub=form.querySelector('[data-native-d2-container]');
  if(sub){
   const input=sub.querySelector('[name="nativeLanguageRoll"]');
   let result=null;
   if(rows&&region==='Dalkésh'){
    try{result=String(v.regionRoll??'').trim()
     ?realmFromRegionRoll(region,v.regionRoll)
     :chosen?realmFromRegionSelection(region,chosen):null;}catch{}
   }
   const need=!!result?.nativeLanguageOptions;
   sub.hidden=!need;input.disabled=!need;
   if(!need)input.value='';
  }
 }
 if(c.step===6){
  const sides=Number(v.classDie||100);update('socialClass',eligibleParentClasses(h.society,sides),v.socialClass);
 }
 if(c.step===7){
  const allowed=eligibleFamilyOccupationNames(h.society,h.socialClass,{subsistence:v.subsistence||'Foraging',classRoll:c.values.classRoll,classDie:c.values.classDie});
  // The detailed result of a physical roll (Slave subtype / Arcanist type /
  // Convocation) is valid even though it is not a primary table-row label.
  const roll=String(v.parentOccupationRoll??'').trim();
  if(roll){try{
   const fromDie=creationChoicesFromPhysicalDice(character,7,{...v,parentOccupationRoll:roll});
   if(fromDie.familyOccupation&&!allowed.includes(fromDie.familyOccupation))allowed.push(fromDie.familyOccupation);
  }catch{} }
  update('familyOccupation',allowed,v.familyOccupation);
  const specialty=form.querySelector('[data-family-weaponcrafter-container]');
  if(specialty){const show=form.elements.namedItem('familyOccupation')?.value==='Weaponcrafter';
   specialty.hidden=!show;const chooser=specialty.querySelector('[name="familyWeaponcrafterType"]');
   chooser.disabled=!show;if(!show)chooser.value='';
  }
  const selectedJob=form.elements.namedItem('familyOccupation')?.value??'';
  const selectedType=form.elements.namedItem('familyWeaponcrafterType')?.value??'';
  const martial=form.querySelector('[data-family-martial-container]');
  if(martial){
   const active=['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(selectedJob);
   const choices=selectedJob==='Man-at-arms (Archer)'?['Archery','Slings']:['Melee','Archery','Slings','Throwing'];
   martial.hidden=!active;const choice=martial.querySelector('[name="familyMartialChoice"]');choice.disabled=!active;
   if(active)update('familyMartialChoice',choices,v.familyMartialChoice);
   else choice.value='';
  }
  const variantBox=form.querySelector('[data-family-variant-container]');
  const variants=['Priest','Gentry: Priest'].includes(selectedJob)?allowedParentPriestVariants(character):selectedJob==='Shaman'?verifiedParentShamanVariants(character):occupationVariantNames(selectedJob);
  if(variantBox){variantBox.hidden=!variants.length;const choice=variantBox.querySelector('[name="familyVariantChoice"]');choice.disabled=!variants.length;
   if(variants.length)update('familyVariantChoice',variants,v.familyVariantChoice);else choice.value='';}
  const shamanRitualBox=form.querySelector('[data-family-shaman-ritual-container]');
  if(shamanRitualBox){shamanRitualBox.hidden=selectedJob!=='Shaman';const picker=shamanRitualBox.querySelector('[name="familyRitualChoice"]');picker.disabled=selectedJob!=='Shaman';if(selectedJob==='Shaman')update('familyRitualChoice',religionChoices(character),v.familyRitualChoice);else picker.value='';}
  const variantType=form.elements.namedItem('familyVariantChoice')?.value??'';
  const martialType=form.elements.namedItem('familyMartialChoice')?.value??'';
  const identity=selectedJob+'|'+selectedType+'|'+martialType+'|'+variantType;
  const familyMode=form.elements.namedItem('familyAuto');
  if(familyMode)familyMode.value=familyOccupationProfile(selectedJob,selectedType,martialType,variantType,v.regionProof?.subsistence??v.subsistence)?'yes':'no';
  form.dataset.familyOccupationLast=identity;
 }

 if(c.step===8){
  update('background',eligibleBackgrounds(character,v),v.background);
 }
 if(c.step===11){
  const occupation=form.elements.namedItem('occupation');
  const mode=form.elements.namedItem('occupationAuto');
  const preview=form.querySelector('[data-occupation-preview]');
  const job=occupation?.value??'';
  // A printed occupation has no optional GM-only skill mode.
  if(mode)mode.value=OCCUPATIONS[job]?'yes':'no';
  form.dataset.occupationPreviewLast=job;
  for(const [slot,skill] of [['script','Script'],['second-script','2nd Script'],['third-script','3rd Script'],['language','Language'],['ritual','Ritual']]){
   const wrap=form.querySelector('[data-occupation-'+slot+']');if(!wrap)continue;
   const enabled=!!OCCUPATIONS[job]?.skills[skill];wrap.hidden=!enabled;
   const input=wrap.querySelector('select');if(input){input.disabled=!enabled;input.required=enabled&&mode?.value==='yes';}
  }
  for(const [slot,printed] of [['language-distribution','Language'],['scripts-distribution','Scripts']]){
   const wrap=form.querySelector('[data-occupation-'+slot+']');if(!wrap)continue;
   const enabled=!!OCCUPATIONS[job]?.skills[printed];wrap.hidden=!enabled;
   const input=wrap.querySelector('input');if(input)input.disabled=!enabled;
  }
  const languageSelect=form.elements.namedItem('occupationLanguageChoice');
  const languageSplit=form.elements.namedItem('occupationLanguageDistribution');
  if(languageSelect&&languageSplit?.value?.trim())languageSelect.required=false;
  // After a job switch, old distribution slots are not evidence for the
  // new occupational DP budget. Values are preserved in the prior audit.
  for(const box of form.querySelectorAll('[data-hmk-dp-pool]')){
   const field=box.dataset.hmkDpPool;
   const isOccupation=field.startsWith('occupation');
   const nextBudget=isOccupation?(OCCUPATIONS[job]?.skills[field==='occupationLanguageDistribution'?'Language':'Scripts']??0):Number(box.dataset.poolBudget);
   const oldJob=box.dataset.poolOccupation;
   if(isOccupation&&oldJob!==undefined&&oldJob!==job){
    for(const select of box.querySelectorAll('[data-pool-choice]'))select.value='';
    box.querySelector('input[type="hidden"]').value='';
   }
   if(isOccupation)box.dataset.poolOccupation=job;
   let k=0;
   for(const row of box.querySelectorAll('[data-pool-row]')){
    const active=k<nextBudget,el=row.querySelector('select');
    row.hidden=!active;row.style.display=active?'':'none';el.disabled=!active;
    if(!active)el.value='';
    k++;
   }
   const hidden=box.querySelector('input[type="hidden"]');
   const selected=[...box.querySelectorAll('[data-pool-choice]')].filter(el=>!el.disabled&&el.value).map(el=>el.value);
   const tally=new Map();for(const name of selected)tally.set(name,(tally.get(name)??0)+1);
   hidden.value=[...tally].map(([name,dp])=>name+'='+dp).join('; ');
   if(field==='occupationLanguageDistribution'&&selected.length){
    if(languageSelect)languageSelect.value='';
    if(languageSelect)languageSelect.required=false;
   }
  }
  // Singular Script remains one script even when the chosen profession grants 4 DP.
  if(preview)preview.textContent=OCCUPATIONS[job]
   ?`HMK p.${OCCUPATION_PAGES[job]??42} · `+Object.entries(OCCUPATIONS[job].skills).map(([skill,dp])=>`${skill} ${dp} DP`).join(' · ')
   :'Profese bez dokončené Occupational tabulky: povinné GM review.';
 }
 if(c.step===12){
  for(const box of form.querySelectorAll('[data-hmk-dp-pool]')){
   const field=box.dataset.hmkDpPool;
   const hidden=box.querySelector('input[type="hidden"]');
   const chosen=[...box.querySelectorAll('[data-pool-choice]')].filter(x=>!x.disabled&&x.value).map(x=>x.value);
   const tally=new Map();for(const name of chosen)tally.set(name,(tally.get(name)??0)+1);
   hidden.value=[...tally].map(([name,dp])=>name+'='+dp).join('; ');
  }
  const stage=SKILL_STAGES[c.skillStage];
  if(stage==='Folk Skills'){
   for(const field of ['nativeRitualChoice','nativeRitualChoice2','nativeRitualChoice3']){const picker=form.elements.namedItem(field);if(picker){picker.required=form.elements.namedItem('nativeSkillsMode')?.value!=='no';picker.disabled=!picker.required;}}
  }
  if(stage==='Background Skills'||stage==='Family Skills')update('skillName',eligibleSkills(character,stage),v.skillName);
 }
}
