import {allowedParentPriestVariants,parentPriestRitual} from './hmk-parent-priest-family.js';
import {withCreationRuleHelp} from './hmk-creation-rule-help.js';
import {gmLanguageBudget} from './hmk-gm-bonus-language.js';
import {veteranRoundCount,sumRound} from './hmk-veteran-rounds.js';
import {SOCIETIES,SOCIETY_TABLES,VERIFIED_REGIONS,realmFromRegionRoll,realmFromRegionSelection,familyOccupationProfile,regionSubDieRequired,regionDialectDieRequired,regionRealmRows,regionNativeLanguageChoices,regionTrierzonDialectChoices,regionAzeriDialectChoices,regionHepekeriaCommunityChoices,regionHarnTribeDieRequired,regionHarnCommunityChoices,OCCUPATIONS,occupationVariantNames,priestReligionOf,ritualFollowerFromML,OCCUPATION_PAGES,availableBackgroundSkills,wealthDiceCounts,standingFromWealth,printedParentWealthDie,occupationWealthDie,REGION_D1000,ELDER_FOLK_REGIONS} from './hmk-creation-tables.js';
import {CHARACTER_STEPS,SKILL_STAGES,FOLKS,AGE_GROUPS,SIGNS,MONTHS,SKILL_DEFINITIONS,ATTRIBUTES,
 SKILL_GROUPS,SIGN_TRAITS,creationOf,legacyTribalRegionNeedsReview,calculateSheetSkills,perceptionMode,physicalDiceRequirement,voiceDiceRequirement,signFromBirthday,calculateSkill} from './hmk-character-creation.js';
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
function body(character,editAttribute=null){
 const c=creationOf(character),v=c.values??{},s=c.step,stage=SKILL_STAGES[c.skillStage]??SKILL_STAGES[0],h=character.hmk??{};
 switch(s){
  case 1:return `<p>Vyberte Folk. HMK str. 20: Humans lze zvolit přímo; pro náhodný výběr hází d100 GM. Tabulka d100: 01–90 Human, 91–95 Kúzhai, 96 Ænarin, 97–99 Sinái, 00 Sidhé.</p>${sel('folk','Folk (nechte prázdné při hodu d100)',FOLKS,v.folk||h.folk).replace(' required','')}${optNum('folkRoll','Fyzický d100, pokud jste losovali (nepovinné)',v.folkRoll??'',1,100)}<p class="tiny">Po zadání d100 se Folk vybere automaticky. Bez hodu můžete zvolit Human; další Folk vyžadují souhlas GM.</p>`;
  case 2:{const folk=v.folk||h.folk;let ages=eligibleAges(folk);return `<p>HMK str.21: Human a Ænarin mohou zvolit nebo fyzicky hodit d100: 01–35 Young, 36–85 Mature, 86–00 Old. Elder Folk mají vlastní věkovou skupinu.</p>${sel('ageGroup','Age group (automaticky z d100 nebo Folk)',ages,v.ageGroup||h.ageGroup).replace(' required','')}${optNum('ageRoll','Fyzický d100, pokud jste pro Age losovali',v.ageRoll??'',1,100)}`;}
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
   return `<p>HMK str.24 a Appendix I (str.415–423): výběr regionu určuje Realm, Society, Pantheon a jazyky. Kompletní automatické Realm tabulky: <strong>${E(Object.entries(VERIFIED_REGIONS).map(([name,rows])=>name+" ("+rows.length+")").join(" · "))}</strong>. Ostatní regiony potvrzuje GM.</p>${sel('birthRegion','Region / režim GM',['GM verified (other region)',...REGION_D1000.map(x=>x[1]),...ELDER_FOLK_REGIONS],v.birthRegion||'GM verified (other region)')}${optNum('venariveRoll','Fyzický d1000 pro určení Region (nepovinné)',v.venariveRoll??'',1,1000)}${optNum('regionRoll','Fyzický d100 pro podporovaný Region',v.regionRoll??'',1,100)}${`<div data-native-d2-container ${nativeD2Needed?'':'hidden'}>${optNum('nativeLanguageRoll','Dvě mateřské řeči: fyzický d2 (1–2)',v.nativeLanguageRoll??'',1,2).replace(' name="nativeLanguageRoll"',` name="nativeLanguageRoll" ${nativeD2Needed?'':'disabled'}`)}</div>`}${`<div data-hurisea-language-container ${nativeChoices.length?'':'hidden'}>${sel('nativeLanguageChoice',v.birthRegion==='Palíthanè'?'Palíthanè: GM zvolí mateřský jazyk pro přímo vybraný Realm (bez region d100)':v.birthRegion==='Áltôr'?'Áltôr: GM určí mateřský jazyk town (bez kostky)':'Huriséa: GM určí mateřský jazyk podle zázemí rodiny (bez kostky)',nativeChoices,v.nativeLanguageChoice).replace(' name="nativeLanguageChoice"',` name="nativeLanguageChoice" ${nativeChoices.length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-palithane-dialect-container ${dialectD100Needed?'':'hidden'}>${optNum('regionDialectRoll','Palíthanè: fyzický d100 pro dialekt Triérzi (jen pokud je potřeba)',v.regionDialectRoll??'',1,100).replace(' name="regionDialectRoll"',` name="regionDialectRoll" ${dialectD100Needed?'':'disabled'}`)}</div>`}${`<div data-trierzon-dialect-container ${trierzonDialects.length>1?'':'hidden'}>${sel('regionDialectChoice','Tríerzòn: GM určí jeden z uvedených dialektů Triérzi (nepovinné; první bývá nejrozšířenější)',trierzonDialects.length>1?trierzonDialects:[],v.regionDialectChoice).replace(' name="regionDialectChoice"',` name="regionDialectChoice" ${trierzonDialects.length>1?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-azeryan-dialect-container ${azeryanDialects.length>1?'':'hidden'}>${sel('regionAzeriDialectChoice','Ázeryàn: GM zvolí povolený dialekt Nâsik Azéri (bez další kostky)',azeryanDialects.length>1?azeryanDialects:[],v.regionAzeriDialectChoice).replace(' name="regionAzeriDialectChoice"',` name="regionAzeriDialectChoice" ${azeryanDialects.length>1?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-hepekeria-community-container ${hepekeriaCommunities.length||harnCommunities.length?'':'hidden'}>${sel('regionCommunityChoice',v.birthRegion==='Hârn'?'Hârn: doložená rodinná/kmenová komunita (GM volba bez hodu)':'Hèpekéria: komunita rodiny (podle prostředí, bez kostky)',v.birthRegion==='Hârn'?harnCommunities:hepekeriaCommunities,v.regionCommunityChoice).replace(' name="regionCommunityChoice"',` name="regionCommunityChoice" ${hepekeriaCommunities.length||harnCommunities.length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-harn-tribe-d100-container ${harnTribeNeeded?'':'hidden'}>${optNum('regionTribeRoll',v.birthRegion==='Áltôr'?'Áltôr West/East lands: fyzický d100 pro druh Álti':'Hârn Tribal lands: fyzický d100 pro jeden z 18 kmenů',v.regionTribeRoll??'',1,100).replace(' name="regionTribeRoll"',` name="regionTribeRoll" ${harnTribeNeeded?'':'disabled'}`)}</div>`}${`<div data-region-sub-d10-container ${subD10Needed?'':'hidden'}>${optNum('regionSubRoll',(v.birthRegion==='Tríerzòn'?'Tríerzòn: fyzický d10 pro Realm (d100 = 00)':v.birthRegion==='Ázeryàn'?'Ázeryàn: fyzický d10 pro Realm (d100 = 98, 99 nebo 00)':'Ivínia: fyzický d10 pro Realm (d100 = 80 nebo 97)'),v.regionSubRoll??'',1,10).replace(' name="regionSubRoll"',` name="regionSubRoll" ${subD10Needed?'':'disabled'}`)}</div>`}${VERIFIED_REGIONS[v.birthRegion]?sel('birthplace','Realm / Birthplace (vyberte přímo, nebo zadejte fyzický d100)',eligibleRealms(v.birthRegion,{folk:h.folk}),v.birthplace||h.birthplace).replace(' required',''):txt('birthplace','GM ověřený Realm / Birthplace',v.birthplace||h.birthplace,false)}${VERIFIED_REGIONS[v.birthRegion]?`<p class="tiny">Bez hodu d100 smí GM přímo vybrat Realm z tabulky: ${E([...new Set(regionRealmRows(v.birthRegion).map(r=>r.realm))].join(' · '))}.</p>`:''}${sel('society','Society (u podporovaného Region určeno tabulkou)',eligibleSocietiesForRealm(v.birthRegion,v.birthplace||h.birthplace)||SOCIETIES,v.society||h.society).replace(' required','')}${reg}${v.birthRegion==='Ázeryàn'?'<p class="tiny">Ázeryàn (str.416): d100 98, 99 a 00 vyžadují fyzický d10; místní dialekt Nâsik Azéri vybírá GM pouze z doložených variant, bez náhodného hodu. Rodilý mluvčí Nâsik Azéri s 5 native DP dostává navíc 4 native DP Zâkimladal (výpočet jazykových Skill DP bude doplněn samostatně).</p>':''}${v.birthRegion==='Ivínia'?'<p class="tiny">Ivínia: při fyzickém d100 = 80 nebo 97 vyžaduje Appendix I p.419 ještě fyzický d10; jinak není dodatečný hod povolen.</p>':''}${v.birthRegion==='Tríerzòn'?'<p class="tiny">Tríerzòn (str.422): d100 = 00 vyžaduje fyzický d10. Dialekty Triérzi jsou vědomá volba GM pouze ze seznamu daného Realm; další náhodný hod pravidla neurčují. První uvedený dialekt bývá nejrozšířenější.</p>':''}${v.birthRegion==='Palíthanè'?'<p class="tiny">Palíthanè (str.420): d100 určí Realm i mateřskou řeč; při přímé volbě opakovaného Realm vyberte povolenou jazykovou variantu. Dialekt Triérzi se u pevných kombinací určí automaticky, jinde fyzickým d100 pouze pokud GM potřebuje detail.</p>':''}${v.birthRegion==='Huriséa'?'<p class="tiny">Huriséa: u pěti knížectví tabulka p.419 uvádí dvě možné mateřské řeči. Jazyky vládců mluví vládnoucí rody, Huriséan převládá u nešlechticů. GM vybere jednu z povolených možností; fyzický d2 není stanoven.</p>':''}${v.birthRegion==='Áltôr'?'<p class="tiny">Áltôr (str.416): ve West/East Álti lands je povinný druhý fyzický d100 (01–20 Forest, 21–60 Great, 61–80 Valley, 81–00 Water). Výsledek určuje obživu a Valley má Tribal-Settled podle str.29. Ve městech Amlácht a Lýbath určí GM jednu ze dvou mateřských řečí bez nového hodu.</p>':''}${v.birthRegion==='Hârn'?'<p class="tiny">Hârn (str.418): Tribal lands vyžadují samostatný fyzický d100 na 18 kmenů. U Adaénum a Gozýda GM určí podskupinu podle str.29; Elder Realms vyžadují GM volbu lidské oblasti Ázadmêre/Eváel. Na základě samotných procent se nikdy nelosuje.</p>':''}${v.birthRegion==='Hèpekéria'?'<p class="tiny">Hèpekéria (str.418): Dysor/Kôrlúa mají výjimky podle rodinné komunity; nejde o dodatečnou kostku. Númec má místní dialekty (M1), Nâsik Azéri dva určené dialekty. Kmenové větve jsou pastevecké, Azúwirat a Faláni usedlé podle str.29.</p>':''}${v.birthRegion==='Dalkésh'?'<p class="tiny">Dalkésh: při dvou rodných jazycích rozhoduje fyzický d2; druhý jazyk se stane regionálním (Appendix I str.417).</p>':''}<p class="tiny">U nepřepsaných regionů potvrzuje společnost a místo GM; nevytváříme smyšlené údaje.</p>`;}
  case 6:{const society=h.society||v.society||'Feudal',table=SOCIETY_TABLES[society==='Feudal/Imperial'?'Feudal':society];const choices=eligibleParentClasses(society,Number(v.classDie||100));
   return `<p>HMK str.26–32: společnost <strong>${E(society)}</strong> určuje Social Class. Všech deset společenských tabulek včetně Viking, Chélemby, Kúzhan a Sináin je přepsáno pro fyzický d100 nebo výhodnější d20. Feudal/Imperial má zvláštní pravidlo pro Noble Occupation.</p>${sel('socialClass','Parent Social Class (automaticky z hodu)',choices,v.socialClass||h.socialClass).replace(' required','')}${sel('classDie','Fyzická kostka', ['100','20'],v.classDie||'100')}${optNum('classRoll','Fyzický Class hod (volba bez hodu GM je možná)',v.classRoll??'',1,100)}`;}
  case 7:{const tribal=['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free';
   const choices=eligibleFamilyOccupationNames(h.society,h.socialClass,{subsistence:v.subsistence||'Foraging',classRoll:v.classRoll,classDie:v.classDie});const familyVariants=(name)=>name==='Priest'?allowedParentPriestVariants(character):occupationVariantNames(name);
   return `<p>HMK str.26–32: Parent Occupation. <strong>Feudal, Imperial, City-State, Tribal, Tribal-Settled, Tributary, Viking, Chélemby, Kúzhan a Sináin</strong> mají ověřené hlavní automatické d100 tabulky. U Slave se vyžaduje další fyzický d20; zvláštní šlechtický titul se určuje až výsledkem Background d100.</p>${tribal?`${sel('subsistence','Převažující obživa',v.regionProof?.subsistence?[v.regionProof.subsistence]:['Farming','Fishing','Foraging','Herding'],v.subsistence||v.regionProof?.subsistence||'Foraging')}`:''}${tribal||['Feudal','Imperial','City-State','Feudal/Imperial','Tribal','Tribal-Settled','Tributary','Viking','Chélemby','Kúzhan','Sináin'].includes(h.society)?`${optNum('parentOccupationRoll','Fyzický Parent Occupation d100 (automaticky)',v.parentOccupationRoll??'',1,100)}${!tribal?optNum('parentOccupationSubRoll','Pouze Slave: doplňující fyzický d20',v.parentOccupationSubRoll??'',1,20)+optNum('parentOccupationSpecialRoll','Arcanist: fyzický d20 pro profesní podtyp',v.parentOccupationSpecialRoll??'',1,20)+optNum('parentOccupationConvocationRoll','Shèk-Pvâr: fyzický d6 pro Primary Convocation',v.parentOccupationConvocationRoll??'',1,6):''}`:''}${choices.length?sel('familyOccupation','Parent Occupation (zúženo podle Society / Class)',choices,v.familyOccupation||h.familyOccupation).replace(' required',''):txt('familyOccupation','GM ověřené Parent Occupation (tabulka nedostupná)',v.familyOccupation||h.familyOccupation,false)}${`<div data-family-weaponcrafter-container ${(v.familyOccupation||h.familyOccupation)==='Weaponcrafter'?'':'hidden'}>${sel('familyWeaponcrafterType','Parent Weaponcrafter: zvolte specializaci (HMK p.44)',['Armourer','Bowyer'],v.familyWeaponcrafterType).replace(' name="familyWeaponcrafterType"',` name="familyWeaponcrafterType" ${(v.familyOccupation||h.familyOccupation)==='Weaponcrafter'?'':'disabled'}`)}</div>`}${`<div data-family-variant-container ${familyVariants(v.familyOccupation||h.familyOccupation).length?'':'hidden'}>${sel('familyVariantChoice','Rodičovský profesní podtyp (GM volba, bez hodu)',familyVariants(v.familyOccupation||h.familyOccupation),v.familyVariantChoice).replace(' name="familyVariantChoice"',` name="familyVariantChoice" ${familyVariants(v.familyOccupation||h.familyOccupation).length?'':'disabled'}`).replace(' required','')}</div>`}${`<div data-family-martial-container ${['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(v.familyOccupation||h.familyOccupation)?'':'hidden'}>${sel('familyMartialChoice','Parent Man-at-arms: doložený výcvik (Archer: Slings dle kultury; Cavalry: Missile je prozatím GM review)',(v.familyOccupation||h.familyOccupation)==='Man-at-arms (Archer)'?['Archery','Slings']:['Melee'],v.familyMartialChoice).replace(' name="familyMartialChoice"',` name="familyMartialChoice" ${['Man-at-arms (Archer)','Man-at-arms (Cavalry)'].includes(v.familyOccupation||h.familyOccupation)?'':'disabled'}`)}</div>`}${sel('familyAuto','Omezovat Family DP na ½ přídělů Parent Occupation',['yes','no'],v.familyAuto??(familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?'yes':'no'))}${(v.familyOccupation||h.familyOccupation)==='Priest'?'<p class="tiny">Parent Priest: GM vybírá pouze náboženství doložené místním panteonem (HMK p.27,43); neznámé panteony ponechte na GM review.</p>':''}<p class="tiny">Jen povolání obsažená v doloženém katalogu mají automaticky kontrolované Family DP.</p>`;}
  case 8:return `<p>HMK str.33: původní Background určuje skupinu rozvojových Skills v pozdějším kroku.</p>${sel('background','Background (automaticky z hodu)',eligibleBackgrounds(character),v.background||h.background).replace(' required','')}${sel('tribalUnsettled','Non-settled Tribal (automaticky Wilderness)', h.society==='Tribal'?['yes']:['no'],h.society==='Tribal'?'yes':'no')}${v.parentOccupationProof?`<p class="notice">Urban chance určena z Parent Occupation: ${E(v.parentOccupationProof.urbanChance)}%. Hodnota se automaticky předá do Background.</p>`:optNum('urbanChance','Urban chance z GM-ověřené tabulky (0–100)',v.urbanChance??'',0,100)}${h.society==='Tribal'?'':optNum('backgroundRoll','Fyzický d100 pro Background',v.backgroundRoll??'',1,100)}${h.society==='City-State'?optNum('backgroundTensRoll','City-State: druhý fyzický d10 (desítková kostka)',v.backgroundTensRoll??'',1,10):''}<p class="tiny">Při zadání d100 a Urban chance se Urban/City/Rural/Wilderness ověří podle p.33; City-State používá druhý fyzický d10 na desítky (p.28). U non-settled Tribal se neháže.</p>`;
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
  case 11:{const jobs=eligibleOccupations(character);const talentPrereq=`<details><summary>Invoker/Shaman: fyzický Arcane Talent před volbou povolání</summary><p class="tiny">HMK str.40,42: pro Invoker jsou povinné dva skutečně získané Talenty. Nejprve fyzický Talent Possession d20 podle ověřené AUR, poté přesný počet d100 předepsaný výsledkem. GM zapisuje skutečné hody, nic se negeneruje automaticky. Po potvrzení se nové profese objeví ve filtrované nabídce.</p>${optNum('arcaneTalentD20','Fyzický Talent Possession d20 (AUR '+(h.attributes?.aur??'?')+')',v.arcaneTalentProof?.d20??'',1,20)}${txt('arcaneTalentD100s','Předepsané fyzické d100 oddělené čárkami',v.arcaneTalentProof?.d100s?.join(',')??'',false)}<button type="submit" class="secondary" name="action" value="talent-prereq">Ověřit fyzické Talenty pro výběr povolání</button></details>`;return `<p>HMK str.41–44: vyberte povolání. Pro <strong>${Object.keys(OCCUPATIONS).length} ověřených profesí</strong> se Occupational DP při výběru automaticky přidělí přesně; ostatní profese zůstávají v režimu GM review. Archer má kulturní variantu Slings; Cavalry Missile zůstává GM review, protože Missile není konkrétní Skill podle str.46. Specializace (Ritual, Script, Languages aj.) je nutné dále vyřešit.</p>${h.birthRegion==='Dalkésh'?'<p class="tiny">Dalkésh (Appendix I, str.417): kastovní pravidlo omezuje vlastní Occupation na Parent Occupation. Výjimky adopce/sňatku dosud vyžadují samostatnou GM kontrolu.</p>':''}${talentPrereq}${jobs.length?sel('occupation','Occupation (povolené podle Parent Class a Society)',jobs,v.occupation||character.occupation):txt('occupation','GM ověřené Occupation (tabulka zatím nedostupná)',v.occupation||character.occupation)}${sel('occupationAuto','Occupational DP: přesná automatická tabulka / GM review',['yes','no'],v.occupationAuto??(OCCUPATIONS[v.occupation||character.occupation]?'yes':'no'))}
   <div data-occupation-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Script?'':'hidden'}>${sel('occupationScriptChoice','Konkrétní Script (p.47, Appendix II)',SCRIPTS,v.occupationScriptChoice).replace(' required','')}</div>
   <div data-occupation-second-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills['2nd Script']?'':'hidden'}>${sel('occupationSecondScriptChoice','2nd Script: jiné písmo (HMK p.47)',SCRIPTS,v.occupationSecondScriptChoice).replace(' required','')}</div>
   <div data-occupation-third-script ${OCCUPATIONS[v.occupation||character.occupation]?.skills['3rd Script']?'':'hidden'}>${sel('occupationThirdScriptChoice','3rd Script: třetí odlišné písmo (HMK p.47)',SCRIPTS,v.occupationThirdScriptChoice).replace(' required','')}</div>
   <div data-occupation-language ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Language?'':'hidden'}>${sel('occupationLanguageChoice','Jazyk pro profesní Language DP (p.47)',languageChoices(character),v.occupationLanguageChoice).replace(' required','')}</div>
   <div data-occupation-language-distribution ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Language?'':'hidden'}>${txt('occupationLanguageDistribution','Languages: volitelné rozdělení všech profesních DP mezi jazyky (např. Járin=2; Shôrka=1)',v.occupationLanguageDistribution??'',false)}<p class="tiny">Pokud toto pole vyplníte, ponechte výběr jednoho jazyka prázdný. Součet musí přesně odpovídat profesní tabulce. Jazyková jména z Appendix II.</p></div>
   <div data-occupation-scripts-distribution ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Scripts?'':'hidden'}>${txt('occupationScriptsDistribution','Pouze při tištěném plurálu Scripts: např. Lakíse=2; Runic=1',v.occupationScriptsDistribution??'',false)}</div>
   <div data-occupation-ritual ${OCCUPATIONS[v.occupation||character.occupation]?.skills.Ritual?'':'hidden'}>${sel('occupationRitualChoice','Ritual podle povoleného Pantheonu',religionChoices(character),v.occupationRitualChoice).replace(' required','')}</div>
   <p class="tiny">HMK p.47–48: Languages lze rozdělit mezi více jazyků; tištěné Script (jednotné číslo) je vždy jedno konkrétní písmo. Všechna profesní DP pocházejí z téže tabulky, žádné další nevznikají.</p><p class="tiny" data-occupation-preview>${OCCUPATIONS[v.occupation||character.occupation]?E('HMK p.'+(OCCUPATION_PAGES[v.occupation||character.occupation]??42)+' · '+Object.entries(OCCUPATIONS[v.occupation||character.occupation].skills).map(([skill,dp])=>skill+' '+dp+' DP').join(' · ')):'Profese bez dokončené Occupational tabulky: povinné GM review.'}</p>`;}
  case 12:{const selected=c.skillDP?.[stage]??{},used=Object.values(selected).reduce((a,b)=>a+b,0);
   const allowed=stage==='Optional Skills'?5:stage==='Background Skills'?5:stage==='Veteran Skills'?(['Kúzhai','Sinái','Sidhé'].includes(h.folk)||h.ageGroup==='Old'?10:h.ageGroup==='Mature'?5:0):null;
   const fixed=stage==='Occupation Skills'&&v.occupationAuto==='yes'||stage==='Folk Skills'&&v.folkAuto==='yes'&&['Kúzhai','Sinái','Sidhé'].includes(h.folk);
   const folkDice=stage==='Folk Skills'&&['Kúzhai','Sinái','Sidhé'].includes(h.folk)?`${sel('folkAuto','Folk Skills podle fyzických kostek',['yes','no'],v.folkAuto||'yes')}${txt('folkDice','Fyzické Folk d10 hody, oddělené čárkou ('+(h.folk==='Kúzhai'?2:4)+' kostky)',(c.values.folkSkillProof?.rolls||[]).join(','),false)}<button type="submit" name="action" value="folk">Vyhodnotit fyzické Folk d10</button>`:'';
   const arcane=stage==='Arcane Talent Skills'?`${sel('arcaneTalentMode','Arcane Talent: fyzické hody / dosud GM review',['yes','review'],v.arcaneTalentMode||'yes')}<p class="tiny">HMK str.40,47: fyzický d20 podle Aura; podle výsledku případných 1–8 fyzických d100. Každý konkrétní Talent je zvláštní dovednost. Bez d100 se neurčí náhodné Talenty.</p>${optNum('arcaneTalentD20','Fyzický Talent Possession d20',v.arcaneTalentProof?.d20??'',1,20)}${txt('arcaneTalentD100s','Fyzické Talent Generation d100, oddělené čárkou',v.arcaneTalentProof?.d100s?.join(',')??'',false)}<button type="submit" name="action" value="talent">Vyhodnotit fyzické Talent hody</button>${v.arcaneTalentProof?`<p class="tiny">Doloženo: ${E(v.arcaneTalentProof.result)} · ${E(Object.entries(v.arcaneTalentProof.grants).map(([k,n])=>k+' '+n+' DP').join(' · ')||'bez Arcane DP')}</p>`:''}`:'';
   const veteranCount=stage==='Veteran Skills'?veteranRoundCount(h.folk,h.ageGroup):0;
   const veteran=stage==='Veteran Skills'?`${sel('veteranRoundsMode','Veteran DP: dvě oddělená kola / historický GM review',['yes','review'],v.veteranRoundsMode||'yes')}${veteranCount?sel('veteranRound','Zapisovat do Veteran kola',Array.from({length:veteranCount},(_,i)=>String(i+1)),v.veteranRound||'1'):''}<p class="tiny">HMK str.49: ${veteranCount} × 5 DP; každé kolo má vlastní limit (1 DP dříve rozvinutému Skill, nejvýše 2 DP úplně novému).</p>${v.veteranRoundProof?.map((round,i)=>`<p class="tiny">Kolo ${i+1}: ${E(sumRound(round))}/5 DP · ${E(Object.entries(round).filter(([,x])=>x).map(([n,x])=>n+' '+x).join(' · '))}</p>`).join('')||''}`:'';
   const bonusBudget=gmLanguageBudget(h.folk,h.ageGroup);
   const bonusProof=v.gmBonusLanguageProof;
   const gmBonus=`<fieldset><legend>Volitelné GM Bonus Language DP (HMK str.48, mimo 8 povinných stadií)</legend><p class="tiny">GM může bonus výslovně udělit nebo odmítnout; nejde o náhodný hod ani o Script DP. Tištěný budget: ${bonusBudget===null?'GM review (Folk není v tabulce)':bonusBudget+' DP'}.</p>${sel('gmBonusDecision','Rozhodnutí GM',['declined','granted'],bonusProof?.decision||'declined')}${txt('gmBonusDistribution','Při udělení rozdělit přesně mezi konkrétní jazyky (např. Járin=2; Shôrka=1)',bonusProof?.distribution||'',false)}<button type="submit" name="action" value="gmbonus" class="secondary">Potvrdit GM Bonus Languages</button>${bonusProof?`<p class="tiny">Uloženo: ${E(bonusProof.decision)} · ${E(Object.entries(bonusProof.allocations).map(([n,dp])=>n+' '+dp+' DP').join(', ')||'bez bonusu')}</p>`:''}</fieldset>`;
   const skills=eligibleSkills(character,stage);
   return `<p>HMK str.45–49 — <strong>stadium ${c.skillStage+1}/8: ${E(stage)}</strong>. ${fixed?'Příděly automaticky odpovídají ověřené Occupational tabulce.':'Každou hodnotu DP lze zkontrolovat v Character Sheet.'} ${stage==='Family Skills'?'Family Skills mají rozpočet 5 DP a při doložené profesi limit poloviny uvedeného Occupational DP.':''}</p><p>${allowed!==null?`Příděl stadia: ${allowed} DP, zadáno ${used}.`:`DP nyní: ${used}.`}</p>${folkDice}${arcane}${veteran}${gmBonus}${stage==='Folk Skills'?`${sel('nativeSkillsMode','Převést Native Language / Native Religion do skutečných Skills (p.47)',['yes','no'],v.nativeSkillsMode||'yes')}
    <p class="tiny">Native Language: ${E(h.nativeLanguage||'nezjištěna')} · ${nativeLanguageDP(character)} DP. Native Religion: ${nativeRitualDP(character)} DP; GM určuje náboženství, ne kostka. Speciální bonus Zâkimladal z Appendix I se dopočítá pouze při splnění podmínek.</p>
    ${religionChoices(character).length?sel('nativeRitualChoice','Native Ritual – jedno náboženství dostupné v Pantheonu',religionChoices(character),v.nativeRitualChoice).replace(' required',v.nativeSkillsMode==='no'?'':' required'):'<p class="tiny">Tento pantheon nemá ještě ověřený výčet náboženství. Ritual DP čekají na GM review.</p>'}`:''}${stage==='Family Skills'&&h.familyOccupation==='Priest'&&parentPriestRitual(character,v.familyVariantChoice)?`<p class="tiny">Family Priest · ${E(parentPriestRitual(character,v.familyVariantChoice).religion)}: Family Ritual DP patří konkrétnímu ${E(parentPriestRitual(character,v.familyVariantChoice).skill)}. Rozpočet 5 DP a limit poloviny profese zůstávají stejné (p.43,47).</p>`:''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills.Script?sel('familyScriptChoice','Konkrétní rodičovský Script (p.47)',SCRIPTS,v.familyScriptChoice).replace(' required',''):''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills['2nd Script']?sel('familySecondScriptChoice','Family Skills: konkrétní 2nd Script',SCRIPTS,v.familySecondScriptChoice).replace(' required',''):''}${stage==='Family Skills'&&familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence)?.skills['3rd Script']?sel('familyThirdScriptChoice','Family Skills: konkrétní 3rd Script',SCRIPTS,v.familyThirdScriptChoice).replace(' required',''):''}${stage==='Background Skills'?sel('backgroundAuto','Kontrolovat dovednosti podle Background tabulky p.46',['yes','no'],v.backgroundAuto||'no')+(h.background==='City'?txt('backgroundCityLanguageDistribution','City Languages: při 1 Language DP rozdělit 3 jazykové DP; při 2 rozdělit 6 (např. Járin=2; Shôrka=1)',v.backgroundCityLanguageDistribution??'',false)+'<p class="tiny">HMK p.46,48: z pěti Background DP spotřebujete jen 1 či 2 na Language; výsledné 3× konkrétní jazykové DP se započítají do Character Sheetu zvlášť.</p>':''):''}${fixed?'':skills.length?`<div class="field-grid">${sel('skillName','Dovednost pro vybrané stadium',skills,'').replace(' required','')}${num('skillDP','DP v této fázi',0,0,20).replace(' required','')}</div><button type="submit" name="action" value="skill" class="secondary">Zapsat DP této dovednosti</button>`:'<p class="tiny">V této fázi nejsou podle dosud doložených předpokladů dostupné žádné volitelné Skills. Nepřepsané tabulky vyžadují samostatné doplnění.</p>'}<p class="muted">${Object.keys(selected).length?Object.entries(selected).map(([name,dp])=>`${E(name)}: ${E(dp)} DP`).join(' · '):'Zatím bez alokace v této fázi.'}</p>`;}
  case 13:{const estr=String(h.estrangement??'').split(' ')[0],spec=OCCUPATIONS[character.occupation],parent=familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);let count=null;try{count=wealthDiceCounts(estr,h.ageGroup,h.folk)}catch{}
   const parentDie=printedParentWealthDie(h.familyOccupation,h.parentTitle,h.socialClass);
   const faith=priestReligionOf(character.occupation);
   let priestDie=null;
   if(faith){const r=calculateSheetSkills(character).find(x=>x.name==='Ritual ('+faith+')');if(r?.ml>=20)priestDie=2*ritualFollowerFromML(r.ml,{clergy:true}).circle;}
   const ownDie=faith?priestDie:occupationWealthDie(character.occupation,h.socialClass);const rollLabel=count?`Family: ${parentDie===0?'d0 = žádný hod':count.family+'+1 hodů d'+(parentDie??'GM')}; Occupation: ${ownDie===0?'d0 = žádný hod':count.occupation+'+1 hodů d'+(ownDie??'GM')} (PC výhoda: zahodit nejnižší pouze tam, kde se skutečně hází).`:'Vyplňte předchozí kroky.';
   return `<p>HMK str.51–52: Wealth se určí fyzickými hody <strong>dvou oddělených skupin</strong>. ${E(rollLabel)}${faith?` Priest (${E(faith)}): Wealth kostka d(Circle × 2), vypočtená z doloženého Ritual ML podle str.55; ${ownDie===null?"bez ověřeného Clergy ML20 nelze automaticky určit Wealth":`aktuálně d${ownDie}`}.`:""} U Farmer: svobodný d2, nevolník d1 (str.42). Při nepřepsaném povolání určí velikosti obou kostek GM podle tištěné tabulky.</p>${sel('wealthMethod','Způsob doložení Wealth',['dice','gm'],v.wealthMethod||'dice')}${optNum('parentWealthDie','Family Wealth die (dN)',v.parentWealthDie??parentDie??'',0,30)}${optNum('occupationWealthDie','Occupation Wealth die (dN)',v.occupationWealthDie??ownDie??'',0,30)}${txt('familyDice',parentDie===0?'d0 – nevyplňovat žádné Family hody':'Výsledky fyzických Family kostek, oddělené čárkou',v.familyDice||'',false)}${txt('occupationDice',ownDie===0?'d0 – nevyplňovat žádné Occupation hody':'Výsledky fyzických Occupation kostek, oddělené čárkou',v.occupationDice||'',false)}${sel('wealthAdvantage','PC Wealth Advantage (+1 kostka a vyřadit nejnižší z každé skupiny)',['yes','no'],v.wealthAdvantage||'yes')}${optNum('wealth','Případná GM ručně doložená celková hodnota při režimu gm',v.wealth??'',0,999)}<p class="tiny">V režimu dice budou GM hody jednotlivě zachovány v auditní historii. Stálý Standing, počáteční mince a rozpočet possessions se odvodí automaticky.</p>`;}
  case 14:return `<p>HMK str.53–56: každý PC začíná s 5 Fate Points; Fate Roll ML se vypočítává z Aura. Pro Followers lze nyní odvodit Blessing Bonus, Circle a základní Piety dle Ritual ML (str.55). Omezení Morality a příslušné Doctrine Subjects musí následně potvrdit GM. Samostatné větve Shèk-Pvâr, Arcane Talent, Spirit i Divine Grace ještě nejsou úplné.</p><p>Aura: <strong>${E(h.attributes?.aur??'nezadána')}</strong>. Fate Points: <strong>5</strong>.</p>${optNum('ritualML','Ritual ML pro zvolenou víru (nepovinné)',v.ritualML??'',0,150)}${sel('ritualClergy','Typ postavy ve vybrané víře',['no','yes'],v.ritualClergy||'no')}${sel('ritualFightingOrder','Člen Fighting Order',['no','yes'],v.ritualFightingOrder||'no')}${optNum('orthodoxyPenalty','GM doložená odchylka Morality od ortodoxního rozmezí',v.orthodoxyPenalty??0,0,30)}${optNum('graceDie','Fyzický d20 Divine Grace (str.40, nepovinné pokud byl již zaznamenán)',v.graceDie??h.divineGrace?.roll??'',1,20)}${optNum('pvarismML','GM ověřený Pvârism ML pro počáteční ARP (str.54, nepovinné)',v.pvarismML??h.startingArcaneResearch?.pvarismML??'',0,200)}<p class="tiny">Ritual specifikujte v dovednostech a pantheonu. Bez ověřené ortodoxie se výpočet považuje za dílčí.</p>`;
 }
 return '';
}
export function creationWizardHTML(character,{editAttribute=null}={}){
 const c=creationOf(character),step=c.step,title=CHARACTER_STEPS[step-1],complete=Object.keys(c.completed??{}).length;
 const enrichedBody=withCreationRuleHelp(body(character,editAttribute),step);
 const legacyNotice=legacyTribalRegionNeedsReview(character)?'<p class="notice">Pravidla Tribal/Settled byla upřesněna podle HMK str. 29. Historický profil není smazán; před dalšími změnami potvrďte <strong>Birthplace (krok 5)</strong> přes Edit. Původní fyzické hody zůstávají zachované.</p>':'';
 return `<section class="panel wide creation-flow" aria-labelledby="cc-title"><div class="topline"><h2 id="cc-title">Character Creation · ${E(character.name)}</h2><button type="button" class="secondary" data-creation-leave>← Character Sheet</button></div><div class="notice">Průvodce podle HMK v1.2, krok ${step}/14 · ${E(title[0])} · tištěná str. ${title[1]}. Všechny hody jsou fyzické; data ukládá stávající úložiště postav. <strong>Stav: ${c.status==='review-required'?'GM review required':'rozpracováno'}</strong>.</div>${legacyNotice}<progress value="${complete}" max="14" aria-label="Dokončené kroky"></progress><form id="creation-step-form"><div class="field-grid creation-inputs">${enrichedBody}<output data-creation-roll-preview aria-live="polite" class="notice tiny">Zadejte fyzický hod; při známé tabulce se výsledek doplní automaticky.</output></div><div class="actions">${step>1?'<button type="button" class="secondary" data-creation-back>← Předchozí krok</button>':''}<button type="submit" name="action" value="next">${step===14?'Uložit a předat GM kontrole':step===12&&c.skillStage<7?'Další stadium Skillů →':'Uložit a pokračovat →'}</button></div></form><p class="muted">Možnost návratu a pozdějšího Edit zůstává dostupná. Změny základních atributů mohou vyžadovat znovu ověřit navazující Skill DP a bojové parametry.</p>${complete?`<details><summary>Edit: přejít na již vyplněný krok</summary><div class="field-grid"><select id="creation-jump-select">${CHARACTER_STEPS.map(([label,page],i)=>`<option value="${i+1}" ${step===i+1?'selected':''}>${i+1}. ${E(label)} (str. ${page})</option>`).join('')}</select><button type="button" data-creation-jump>Otevřít vybraný krok</button></div></details>`:''}<dialog class="hmk-rule-dialog" id="hmk-rule-dialog" aria-labelledby="hmk-rule-dialog-title"><header><h3 id="hmk-rule-dialog-title">HMK · pravidlová nápověda</h3><p id="hmk-rule-dialog-page" class="tiny"></p></header><p id="hmk-rule-dialog-effect"></p><p id="hmk-rule-dialog-dice" class="tiny"></p><p id="hmk-rule-dialog-status" class="tiny"></p><form method="dialog"><button type="submit" class="secondary">Zavřít</button></form></dialog></section>`;
}
/** HMK 1.2 pp.46/57: one calculated source of truth, seven printed
 * groups, with all eight DP stages separated in their own columns. */
const GROUPED_SKILLS=Object.freeze(['Combat','Physical','Nature','Lore','Craft','Social','Esoterica']);
const DP_COLUMNS=Object.freeze([
 ['Folk Skills','Folk'],['Arcane Talent Skills','Talent'],['Family Skills','Family'],
 ['Background Skills','Background'],['Occupation Skills','Occupation'],['Optional Skills','Optional'],
 ['Veteran Skills','Veteran'],['Sunsign Skills','Sunsign'],['Native Language / Religion','Native'],
 ['GM Bonus Languages','GM Bonus']]);
export function groupedSkillTableHTML(character){
 const list=calculateSheetSkills(character),mode=perceptionMode(character);
 const names=new Set(list.map(x=>x.name)),expected=SKILL_DEFINITIONS.map(x=>x.name);
 if(expected.some(n=>!names.has(n)))throw Error('Chybí základní Skill definice');
 const headers=['Skill','SB: atributy','SB','Base SM',...DP_COLUMNS.map(x=>x[1]),'DP Σ','SM','ML / Boost'];
 const th=headers.map(t=>`<th scope="col">${E(t)}</th>`).join('');
 const cellValue=(x,stage)=>{const n=x.dp.find(d=>d.stage===stage)?.dp??0;return n?E(n):'·';};
 const groups=GROUPED_SKILLS.map(group=>{
  const rows=list.filter(x=>x.group===group).sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const body=rows.map(x=>{
   const shared=!!x.subskillOf,master=!!x.perceptionParent;
   const dp=DP_COLUMNS.map(([stage])=>`<td class="dp-cell">${cellValue(x,stage)}</td>`).join('');
   const attr=master?'Sdílené SM • Sight / Sound / Odour':`${x.primary?.toUpperCase()??'—'} (${x.primaryValue??'?'}) + ${x.secondary?.toUpperCase()??'—'} (${x.secondaryValue??'?'})`;
   const sourceSummary=x.dp.filter(d=>d.dp).map(d=>d.stage+': +'+d.dp).join(' · ');
   const desc=x.name+(shared?' ↳ '+x.subskillOf:master?' (sdílené SM)':'');
   const bonus=x.boosts?.length?`<div class="tiny">Boost: ${E(x.boosts.map(b=>'+'+b.boost).join(', '))}</div>`:'';
   const legacy=(character.hmk?.skills??[]).find(r=>r.name===x.name&&!r.creationDerived);
   const conflict=legacy?`<div class="notice tiny">Legacy ruční záznam ML ${E(legacy.ml??'—')} se může lišit. GM musí sjednotit s Character Creation.</div>`:'';
   const extra=x.bonusSM?`<div class="tiny">Language +${E(x.bonusSM)} SM</div>`:'';
   return `<tr title="${E(sourceSummary)}" class="${shared?'hsk-shared':''}"><th scope="row">${E(desc)}</th><td>${E(attr)}</td><td>${x.sb===null?'—':E(x.sb)}</td><td>${E(x.baseSM)}</td>${dp}<td>${E(x.totalDP)}${shared?'<span title="Sdílené, NE další DP">*</span>':''}</td><td><strong>${E(x.sm)}</strong>${extra}</td><td><strong>${x.ml===null?'—':E(x.ml)}</strong>${bonus}${conflict}</td></tr>`;
  }).join('');
  return `<tbody class="hsk-group"><tr class="hsk-group-head"><th scope="rowgroup" colspan="${headers.length}">${E(group)} · ${rows.length} ${group==='Physical'&&mode==='subattributes'?'(včetně 3 smyslových subskills)':''}</th></tr>${body}</tbody>`;
 }).join('');
 return `<div class="table-scroll hsk-scroll"><table class="hsk-table"><thead><tr>${th}</tr></thead>${groups}</table></div><p class="tiny muted">* Odvozené Shock, Dodge a volitelné Sight/Sound/Odour sdílejí přidělené DP a Skill Multiple s mateřskou Skill; zobrazené DP se nesčítají znovu. ML se počítá samostatně podle jejich SB. Background City Languages může přidělit 3 jazykové DP za jediný zaplacený Background DP.</p>`;
}
export function perceptionModePanelHTML(character){
 const c=creationOf(character),mode=perceptionMode(character),proof=c.perceptionProof??{};
 const req=physicalDiceRequirement(character.hmk.ageGroup,character.kind||'PC');
 return `<section class="hsk-perception"><h4>Perception · volitelná pravidla HMK str. 57</h4><p class="muted">Lze přepnout i po vytvoření postavy. Původní PER a fyzické hody zůstávají uložené. Volitelný režim používá tři samostatné skutečně hozené atributy EYE, HRG a SML. Mění SB také u příslušných Lore, Nature, Combat, Craft a Esoterica Skills.</p><form id="hmk-perception-mode-form"><div class="field-grid"><label>Pravidlová varianta<select name="mode"><option value="standard" ${mode==='standard'?'selected':''}>Standard · PER</option><option value="subattributes" ${mode==='subattributes'?'selected':''}>Volitelná · EYE / HRG / SML</option></select></label>${[['eye','Eyesight (EYE)'],['hrg','Hearing (HRG)'],['sml','Smell (SML)']].map(([k,label])=>`<label>${label} · d6 (${req.count} hodů${req.drop?' / vyřadit '+req.drop+' nejnižší':''})<input type="text" name="${k}" inputmode="numeric" placeholder="${proof[k]?'Doloženo '+proof[k].score+'; pro použití původních hodů nevyplňovat':'např. 2, 4, 5, 6'}" value=""><span class="tiny">${proof[k]?`Historický hod: ${E(proof[k].rolls.join(', '))}, score ${E(proof[k].score)}. ${proof[k].folk===character.hmk.folk&&proof[k].ageGroup===character.hmk.ageGroup?'Lze znovu použít.':'Folk/Age se změnily – nutné nové fyzické hody.'}`:'Dosud bez samostatného fyzického důkazu.'}</span></label>`).join('')}</div><button type="submit">Ověřit / změnit Perception</button></form><p class="tiny">Pro první aktivaci volitelného režimu jsou nutné tři samostatné fyzické sady d6 od GM. Při návratu na standardní PER se žádné historické hody nemažou.</p></section>`;
}
export function characterCalculationHTML(character){
 const h=character.hmk??{},c=creationOf(character),skills=calculateSheetSkills(character);
 if(!h.creation)return `<section class="panel wide"><h3>Character Creation</h3><p class="muted">Tato postava vznikla před průvodcem. Lze ji doplnit bez změny dosavadního bojového stavu.</p><button type="button" data-creation-open>Otevřít průvodce tvorbou / Edit</button></section>`;
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
 if(h.religiousStatus)proof.push(`Ritual: ML${E(h.religiousStatus.ritualML)}, Circle ${E(h.religiousStatus.circle)}, Blessing +${E(h.religiousStatus.blessingBonus)}, max Piety ${E(h.religiousStatus.maxPiety)}`);
 if(h.startingArcaneResearch)proof.push(`Pvârism ML${E(h.startingArcaneResearch.pvarismML)} × ${E(h.startingArcaneResearch.multiplier)} → ARP ${E(h.startingArcaneResearch.startingARP)}, Neutral: ${E(h.startingArcaneResearch.neutralSpells.join(', ')||'bez výchozích kouzel')}`);
 const cityLanguageNote=h.background==='City'&&Number(c.skillDP?.['Background Skills']?.Language)>0&&c.values.backgroundCityLanguageDistribution?
  `<p class="notice tiny">HMK p.46,48 · City Background: <strong>${E(c.skillDP['Background Skills'].Language)} zaplacený Background DP</strong> do Language → <strong>${E(3*c.skillDP['Background Skills'].Language)} konkrétních Language DP</strong> (${E(c.values.backgroundCityLanguageDistribution)}). Pět základních Background DP se nenavyšuje.</p>`:'';
 const proofHTML=proof.length?`<details><summary>Pravidlové doklady: původ, Folk, Wealth, Mysteries</summary>${proof.map(x=>`<p class="tiny">${x}</p>`).join('')}</details>`:'';
 return `<section class="panel wide"><div class="topline"><h3>HMK Character Sheet · průkazný výpočet Skills</h3><button type="button" data-creation-open>Edit / Pokračovat v tvorbě</button></div><p class="muted">${c.status==='review-required'?'Všech 14 hlavních kroků prošlo průvodcem, ale postava stále vyžaduje ověření GM.':'Rozpracováno: krok '+c.step+'/14.'} Všechny ověřené atributy jsou přímo v dosavadním HMK profilu, který čte Combat.</p>${legacyNotice}${cityLanguageNote}${perceptionModePanelHTML(character)}${groupedSkillTableHTML(character)}${proofHTML}<p class="tiny">HMK p.45–49: SB = průměr dvou atributů se zaokrouhlením podle pořadí; ML = SB × SM a případné Mastery Boosts. Perception lze měnit přes samostatný GM formulář; každá změna přepočítá všechny navázané Skill Bases. Ostatní nedokončené specializace vyžadují GM review. Tento přehled nepřepisuje historické ručně zadané Skills.</p></section>`;
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
   const choices=selectedJob==='Man-at-arms (Archer)'?['Archery','Slings']:['Melee'];
   martial.hidden=!active;const choice=martial.querySelector('[name="familyMartialChoice"]');choice.disabled=!active;
   if(active)update('familyMartialChoice',choices,v.familyMartialChoice);
   else choice.value='';
  }
  const variantBox=form.querySelector('[data-family-variant-container]');
  const variants=selectedJob==='Priest'?allowedParentPriestVariants(character):occupationVariantNames(selectedJob);
  if(variantBox){variantBox.hidden=!variants.length;const choice=variantBox.querySelector('[name="familyVariantChoice"]');choice.disabled=!variants.length;
   if(variants.length)update('familyVariantChoice',variants,v.familyVariantChoice);else choice.value='';}
  const variantType=form.elements.namedItem('familyVariantChoice')?.value??'';
  const martialType=form.elements.namedItem('familyMartialChoice')?.value??'';
  const identity=selectedJob+'|'+selectedType+'|'+martialType+'|'+variantType;
  const familyMode=form.elements.namedItem('familyAuto');
  if(form.dataset.familyOccupationLast!==identity){
   // Only reset the mode when the profession/specialty actually changed;
   // do not undo a deliberate GM-review selection for an unchanged parent.
   if((form.dataset.familyOccupationLast!==undefined||selectedJob!==(h.familyOccupation??'')||
      (selectedJob==='Weaponcrafter'&&selectedType!==(c.values.familyWeaponcrafterType??'')))&&familyMode)
    familyMode.value=(selectedJob==='Priest'&&!parentPriestRitual(character,variantType)?false:familyOccupationProfile(selectedJob,selectedType,martialType,variantType))?'yes':'no';
   form.dataset.familyOccupationLast=identity;
  }
 }

 if(c.step===8){
  update('background',eligibleBackgrounds(character,v),v.background);
 }
 if(c.step===11){
  const occupation=form.elements.namedItem('occupation');
  const mode=form.elements.namedItem('occupationAuto');
  const preview=form.querySelector('[data-occupation-preview]');
  const job=occupation?.value??'';
  // A new verified profession defaults to the precise printed table. If a
  // player explicitly changes the mode for the same job, do not override it.
  if(form.dataset.occupationPreviewLast!==undefined&&form.dataset.occupationPreviewLast!==job&&mode)
   mode.value=OCCUPATIONS[job]?'yes':'no';
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
  // Singular Script remains one script even when the chosen profession grants 4 DP.
  if(preview)preview.textContent=OCCUPATIONS[job]
   ?`HMK p.${OCCUPATION_PAGES[job]??42} · `+Object.entries(OCCUPATIONS[job].skills).map(([skill,dp])=>`${skill} ${dp} DP`).join(' · ')
   :'Profese bez dokončené Occupational tabulky: povinné GM review.';
 }
 if(c.step===12){
  const stage=SKILL_STAGES[c.skillStage];
  if(stage==='Folk Skills'){
   const sel=form.elements.namedItem('nativeRitualChoice');if(sel){sel.required=form.elements.namedItem('nativeSkillsMode')?.value!=='no';sel.disabled=!sel.required;}
  }
  if(stage==='Background Skills'||stage==='Family Skills')update('skillName',eligibleSkills(character,stage),v.skillName);
 }
}
