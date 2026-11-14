/** Character Notes & Logbook: read-only, concise projections of already committed
 * HMK evidence. Never infer a roll, apply a rule, or mutate the authoritative log. */
const txt = value => String(value ?? '').trim();
const numeric = value => Number.isFinite(value) ? value : null;
export const personalTestLevel = Object.freeze({CS:'kritický úspěch',S:'úspěch',F:'neúspěch',CF:'kritický neúspěch'});
const levelLabel = level => personalTestLevel[level] ? `${level} · ${personalTestLevel[level]}` : txt(level) || 'neurčeno';

export function personalSkillReceipt(row, fallback={}) {
 const p=row?.skillTestProof||{}, a=p.a||p.result||p.will||{}, b=p.b||null;
 const original=txt(row?.body||fallback.body);
 const skill=txt(p.skills?.[0]||p.skill||fallback.skill||fallback.title?.replace(/^(?:Success (?:Value|Test)|Opposed)\s*·\s*/,'')||row?.title?.replace(/^(?:Success (?:Value|Test)|Opposed)\s*·\s*/,'')||p.kind||'Test');
 const eml=numeric(a.eml??a.rawEML), roll=numeric(a.roll), level=txt(a.level||a.victoryLevel||p.originalLevel||p.report?.level);
 const isValue=/value/i.test(txt(p.type||fallback.title||row?.title));
 const sv=isValue?numeric(a.sv):null, stars=isValue?numeric(a.svTier?.stars):null;
 const consequence=p.consequence||{};
 let effect='Bez dalšího potvrzeného následku';
 if(consequence.type==='context-specific-critical-failure')effect='Kritický neúspěch činnosti; konkrétní dopad se řídí příslušnou dovedností.';
 else if(consequence.type&&consequence.type!=='none')effect=txt(consequence.label||consequence.description||consequence.effect)||'Následek evidován u původního testu';
 else if(p.effect)effect=txt(p.effect).split('\n')[0];
 else if(p.type==='skill-physical-consequence')effect=original.split('\n')[0]||'Zdravotní následek zaznamenán';
 if(!row?.skillTestProof) {
  const em=original.match(/\bEML\s*(-?\d+)/i), die=original.match(/(?:Primární\s+)?d100\s*\((\d{1,3})\)/i),
   sl=original.match(/d100\s*\(\d{1,3}\)\s*→\s*(CS|CF|S|F)\b/i), val=original.match(/\bSV\s*(-?\d+)\b/i);
  return {skill,kind:val?'Success Value':'Skill Test',eml:em?Number(em[1]):null,roll:die?Number(die[1]):null,
   level:sl?sl[1]:'',result:sl?levelLabel(sl[1]):'výsledek bez strukturovaného dokladu',sv:val?Number(val[1]):null,
   effect:'Výsledek převzat ze staršího dokladu; podrobnosti lze ověřit v historii GM',actorId:txt(fallback.actorId),id:txt(fallback.id)};
 }
 const parts=[levelLabel(level)];
 if(isValue&&sv!==null)parts.push(`SV ${sv}${stars!==null?` · ${stars} ★`:''}`);
 if(p.comparison?.winner)parts.push(p.comparison.tie?'remíza':`převaha ${p.comparison.winner==='a'?'aktéra':'protistrany'}`);
 const other=b?{eml:numeric(b.eml),roll:numeric(b.roll),level:txt(b.level)}:null;
 return {skill,kind:isValue?'Success Value':'Skill Test',eml,roll,level,result:parts.join(' · '),sv,effect,other,
  actorId:txt(p.actorId||fallback.actorId),id:txt(row?.id||fallback.id)};
}

const HAZARDS={equipment:'problém s výbavou',accident:'nehoda',complication:'komplikace',direction:'ztráta směru',none:'bez nebezpečí'};
export function personalEpisodeTests(episode,journalById){
 const p=episode||{},tests=[],seen=new Set();
 const add=(row,fallback)=>{
  const id=txt(row?.id||fallback?.id);if(id&&seen.has(id))return;if(id)seen.add(id);
  tests.push(personalSkillReceipt(row,fallback));
 };
 for(const link of p.skillLinks||[])add(journalById.get(link.id),link);
 for(const [name,memory] of [['Survival / Orienteering',p.orientation],['Tracking',p.trackingMemory]]){
  if(!memory||seen.has(txt(memory.skillId)))continue;
  if(memory.skillId&&journalById.has(memory.skillId)){add(journalById.get(memory.skillId),{id:memory.skillId,title:name});continue;}
  tests.push({skill:name,kind:'Success Value',eml:null,roll:numeric(memory.roll),level:txt(memory.level),
   result:`${levelLabel(memory.level)} · SV ${memory.adjustment?.adjustedSV??memory.score?.adjustedSV??memory.sv??'—'}`,
   effect:'Výsledek z dokončené cestovní epizody',id:txt(memory.skillId),actorId:txt(memory.guideId||memory.trackerId)});
 }
 for(const actor of p.actors||[]){
  if(!actor.sr)continue;
  tests.push({skill:'Endurance · cestovní SR',kind:'Success Roll',eml:null,tn:numeric(actor.sr.tn),roll:numeric(actor.roll),
   die:'d10',level:actor.sr.success?'S':'F',result:actor.sr.success?'S · úspěch':'F · neúspěch',
   effect:Number(actor.delta)===0?`Bez další únavy · Weariness ${actor.after??actor.before??'—'}`:`Weariness ${actor.before??'—'} → ${actor.after??'—'}${Number.isFinite(actor.delta)?` (změna ${actor.delta>0?'+':''}${actor.delta})`:''}`,
   actorId:txt(actor.id),id:`end-${txt(actor.id)}`});
 }
 if(p.survivalHazard&&p.survivalHazard!=='none'){
  tests.push({skill:'Survival Hazard',kind:'Hazard Roll',eml:null,roll:numeric(p.hazardDetail?.hazardD10??p.hazardDetails?.[0]?.hazardD10??p.settings?.survivalD10),die:'d10',
   level:'',result:HAZARDS[p.survivalHazard]||txt(p.survivalHazard),effect:'Vyhodnotit konkrétní hazard a jeho doložený navazující postup',actorId:'',id:'survival-hazard'});
 }
 for(const [i,roll] of (p.direction?.rolls||[]).entries()){
  tests.push({skill:`Direction Hazard${(p.direction.rolls||[]).length>1?` ${i+1}`:''}`,
   kind:'Hazard Roll',eml:null,roll:numeric(roll),die:'d10',level:'',
   result:txt(p.direction?.direction)||'viz pravidlový výsledek',effect:'Změna směru dle doloženého výsledku',actorId:'',id:`direction-${i}`});
 }
 for(const [i,receipt] of (Array.isArray(p.travelForaging)?p.travelForaging:[]).entries()) {
  if(!Number.isInteger(receipt?.roll))continue;
  const found=(receipt.results||[]).reduce((sum,r)=>({food:sum.food+(Number(r.foodDays)||0),water:sum.water+(Number(r.waterDays)||0),herbs:sum.herbs+(Number(r.herbDoses)||0)}),{food:0,water:0,herbs:0});
  const target=receipt.target==='herbs'?'Sběr bylin':receipt.target==='food-water'?'Hledání potravy a vody':'Shánění zásob';
  tests.push({skill:target,kind:'Foraging',eml:null,roll:receipt.roll,die:'d10',level:'',result:receipt.found?'nalezeno':'bez nálezu',effect:`Potrava ${found.food} dne, voda ${found.water} dne, byliny ${found.herbs} dávek.`,id:`travel-foraging-${i}`,actorId:txt(receipt.actorId||receipt.workerId)});
 }
 if(p.kind==='forage'&&!p.foraging&&!(p.standaloneForaging||[]).length){
  const raw=txt(p.settings?.forageD10),number=Number(raw);
  if(/^([1-9]|10)$/.test(raw))tests.push({skill:p.settings?.forageTarget==='herbs'?`Sběr bylin${p.settings?.herbName?' · '+p.settings.herbName:''}`:'Hledání zásob',kind:'Foraging – jen vstup',eml:null,roll:number,die:'d10',level:'',result:'následek neuzavřen',effect:'Hod je zaznamenán ve vstupu epizody, ale samostatné potvrzení nálezu v dokladu chybí.',id:'unconfirmed-forage-input',actorId:txt(p.settings?.guideId)});
 }
 if(p.foraging&&Number.isInteger(p.foraging.roll))tests.push({skill:'Foraging',kind:'Hazard Roll',eml:null,roll:p.foraging.roll,die:'d10',
  level:'',result:'hledání zásob',effect:'Nalezené množství je uvedeno v Zásobách',actorId:'',id:'foraging'});
 return tests;
}

function hash(text){let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0;}
function pick(values,key){return values[hash(key)%values.length];}
const namesSeason={spring:'jaro',summer:'léto',autumn:'podzim',fall:'podzim',winter:'zima'};
const terrainWords={'needleleaf-forest':'jehličnatý les','broadleaf-forest':'listnatý les','paved-road':'zpevněná cesta','grassland':'travnatá krajina','hills':'kopcovitá krajina','mountains':'hory','swamp':'mokřiny'};
export function personalTerrainLabel(terrain){return terrainWords[txt(terrain)]||txt(terrain).replace(/[-_]/g,' ')||'';}
const activityNames={travel:'Cestování',tracking:'Stopování',forage:'Shánění zásob',watch:'Ostraha',rest:'Odpočinek',sleep:'Spánek',winded:'Klid',other:'Činnost'};
export function personalEpisodeActivities(p){
 const kind=txt(p?.kind),tasks=[];
 const forages=Array.isArray(p?.travelForaging)?p.travelForaging:[];
 const target=txt(forages[0]?.target||p?.settings?.forageTarget);
 const herb=txt(forages.find(f=>f.herbName)?.herbName||p?.settings?.herbName);
 const harvesting=target==='herbs'?`sběr bylin${herb?' ('+herb+')':''}`:target==='food-water'?'hledání potravy a vody':'shánění zásob';
 if(kind==='forage')return harvesting.charAt(0).toUpperCase()+harvesting.slice(1);
 if(kind==='tracking')return 'Stopování – sledování stopy';
 if(kind==='watch')return 'Ostraha – sledování okolí';
 if(kind==='rest')return 'Odpočinek';
 if(kind==='sleep')return 'Spánek';
 if(kind==='winded')return 'Klid a zotavení';
 if(kind!=='travel')return activityNames[kind]||'Činnost';
 const modes=p?.orientation?.modes||{},settings=p?.settings||{};
 if(forages.length||Number(modes.foraging)>0||Number(settings.mode_foraging)>0)tasks.push(harvesting);
 if(p?.trackingMemory)tasks.push('sledování stop');
 if(Number(modes.stalking)>0||Number(settings.mode_stalking)>0)tasks.push('plíživý postup');
 if(Number(modes.vigilance)>0||Number(settings.mode_vigilance)>0||p?.trekWatchfulness?.effective==='alert')tasks.push('ostraha');
 if(!tasks.length&&p?.trekWatchfulness?.effective==='lax')tasks.push('omezená ostraha');
 if(!tasks.length)tasks.push('přesun po trase');
 return 'Cestování – '+[...new Set(tasks)].join(' · ');
}
export function personalEpisodeRoles(p,name){
 const ids=Array.isArray(p?.memberIds)?p.memberIds:[];const roles=[];
 const stable=Array.isArray(p?.stableAnimalLoad)?p.stableAnimalLoad:[];
 const riders=new Map(stable.filter(x=>x.rider).map(x=>[x.rider,x.name||'jezdecké zvíře']));
 const drover=p?.settings?.droverActorId;
 const handlers=new Set(p?.walkingHandlerIds||[]);
 const guide=p?.settings?.guideId||p?.orientation?.guideId;
 for(const id of ids){
  const tags=[];
  if(id===guide)tags.push('průvodce');
  if((p?.transportedMemberIds||[]).includes(id))tags.push('přepravovaný člen družiny');
  else {
   if(id===drover)tags.push('honák (drover)');
   if(riders.has(id))tags.push(`jel na ${riders.get(id)}`);
   else if(handlers.has(id))tags.push('pěší doprovod / vodič');
   else if(p?.kind==='travel'&&id!==drover)tags.push('šel pěšky');
   else if(p?.kind!=='travel')tags.push('účastník činnosti');
  }
  roles.push(`${name(id)}: ${tags.join(', ')}`);
 }
 for(const animal of stable){if(!animal?.rider&&animal?.name)roles.push(`${animal.name}: zvíře bez doloženého jezdce`);}
 return roles;
}
// Descriptive manuscript prose, not a new game event. Every adjective comes from
// the episode's environment; anything merely illustrative stays in the flavor layer.
const ACTIVITY_PASSAGES={
 travel:[
  'Vzdálenost ubývá podle skutečně zvoleného tempa; mezi jednotlivými kroky je čas posoudit další úsek.',
  'Pohyb výpravy střídá pozorování terénu s krátkými rozhodnutími o směru.',
  'Přesun postupuje od jednoho orientačního bodu k druhému, zatímco pozornost zůstává na okolní krajině.',
  'Trasa vede dál v rytmu doloženého pochodu, nikoli ve spěchu vyprávění.',
  'Každý úsek přináší jiný pohled na okolí, přestože cesta drží stejný směr.',
  'Členové výpravy vyrovnávají tempo tak, aby navázali na skutečně dosaženou vzdálenost.',
  'Okraje stezky a průchodnost terénu jsou stejně důležité jako vzdálenost před nimi.',
  'Skupina pokračuje v předepsaném úseku; jistota pohybu závisí na cestě a úsudku průvodce.',
  'Postup prověřuje pozornost k podkladu i schopnost držet společné tempo.',
  'Družina se posouvá po zaznamenané trase a upravuje rozestupy podle jejího průběhu.'
 ],
 forage:[
  'Pozornost se přesouvá od cesty k tomu, co může okolní krajina poskytnout.',
  'Hledání využitelných zdrojů se mění ve sled drobných rozhodnutí o tom, kde pátrat.',
  'Zkušenost pomáhá rozlišit slibná místa od těch, která jen vypadají nadějně.',
  'Na zemi i v porostu se hledají známky toho, kde lze získat zásoby.',
  'Čas plyne při pečlivém zkoumání okolí; skutečný výtěžek závisí až na doloženém nálezu.',
  'Průzkum vegetace střídá klidné porovnávání jednotlivých nalezených znaků.'
 ],
 tracking:[
  'Stopař skládá jednotlivé znaky do možné linie pohybu.',
  'Nejasné otisky vyžadují srovnání s tvarem cesty a okolní půdou.',
  'Pozornost se vrací k hranám stop a drobným změnám podkladu.',
  'Sledování stopy je pomalejší, než se zdá: důležitá je návaznost vodítek.',
  'Každý úsek přináší nové srovnání toho, co zůstalo zachováno v povrchu.',
  'Stopa se hledá v souvislostech, ne v jediném snadno přehlédnutelném otisku.'
 ],
 watch:[
  'Ostraha vyžaduje zachovat pozornost i v místech, která vypadají klidně.',
  'Hlídka střídavě sleduje vzdálenější přístupy a bezprostřední okolí.',
  'Každý šelest nabízí podnět k pozornosti, nikoli automatický důkaz nebezpečí.',
  'Zorné pole se vrací k průchodům, které je třeba mít pod kontrolou.',
  'Bdělost se opírá o trpělivost a o schopnost nepodlehnout rutinnímu tichu.'
 ],
 rest:[
  'Čas této epizody je věnován skutečně zaznamenanému odpočinku.',
  'Pohyb ustupuje a důležitější je najít klid pro následující úsek.',
  'V odpočinkovém úseku převažuje uklidnění tempa nad cestovním úsilím.'
 ],
 sleep:[
  'Cestovní ruch ustupuje spánku; mění se rytmus celého intervalu.',
  'Čas věnovaný spánku plyne bez dalších předpokládaných výprav.',
  'Epizoda patří spánku a jeho skutečně doloženému průběhu.'
 ],
 other:[
  'Postava se věnuje zvolené činnosti v zaznamenaných podmínkách.',
  'Průběh je svázán s reálným časovým úsekem, nikoli s domýšlenými výsledky.',
  'Konkrétní výsledek této činnosti se odvíjí od uložených testů.'
 ]
};
const TERRAIN_SCENES={
 forest:[
  'Mezi kmeny se pohled rozpadá do kratších průhledů a je potřeba vyhledávat další vodítka.',
  'Lesní podklad střídá měkká místa s kořeny a pevnější stezkou.',
  'Stromy mění světlo v nepravidelné pásy a zakrývají vzdálený horizont.',
  'V podrostu jsou viditelné drobné rozdíly povrchu, důležité pro orientaci i stopy.',
  'Mezi jehličím a zbytky listí se pod nohama mění povrch téměř s každým úsekem.',
  'Rozestupy mezi stromy nabízejí jen omezené výhledy na další postup.',
  'Stín korun přechází přes cestu a ztěžuje odhad vzdálenějšího směru.',
  'Podrost a větve určují, jak daleko lze dohlédnout před sebe.'
 ],
 road:[
  'Povrch cesty vytváří čitelnou osu, ale drobné otisky na něm nemusejí dlouho vydržet.',
  'Zpevněná cesta pomáhá držet směr, zatímco okolí se mění podél jejích okrajů.',
  'Na otevřenější trase se lépe sleduje směr než jemné stopy v tvrdém povrchu.',
  'Okraje cesty nabízejí jiné vodítko než samotný její pevný povrch.',
  'Stezka vede jasně, avšak z jejího okolí je třeba číst změny terénu.',
  'Větší část cesty je přehledná; pozornost se proto přesouvá k odbočkám a okolí.'
 ],
 urban:[
  'Průchody a stavby dávají jiná vodítka než otevřená krajina.',
  'Podél zástavby se mění zvuky a možnosti přímého rozhledu.',
  'Cestu tu vymezují spíše okolní stavby než vzdálené orientační body.',
  'Mezi budovami je důležitá volba průchodu a včasné rozpoznání odbočky.'
 ],
 other:[
  'Terén v zaznamenané oblasti určuje průchodnost i délku výhledu.',
  'Povrch krajiny se mění pod nohama a vyžaduje vnímat směr postupu.',
  'Okolní krajina připomíná, že délka cesty není jediným měřítkem námahy.',
  'Každý další úsek otevírá odlišná místa pro orientaci a pozorování.',
  'Krajina poskytuje jen tolik vodítek, kolik je skutečně možné zachytit.'
 ]
};
const SEASON_SCENES={
 spring:[
  'Jarní porost se teprve probouzí a barvy krajiny nejsou všude stejně výrazné.',
  'Příchod jara zanechává v podkladu měkčí místa a proměnlivý vzhled vegetace.',
  'Jarní světlo se v porostu mění rychleji, než by naznačoval klidný den.',
  'Začátek vegetační sezóny dává krajině čerstvější vzhled.',
  'Na přelomu chladu a jarního dne je cítit proměnlivost ročního období.'
 ],
 summer:[
  'Letní porost je hustší a světlo se déle drží nad obzorem.',
  'Dlouhý letní den nabízí více světla, nikoli však záruku snadné cesty.',
  'Letní vegetace zakrývá některé nižší body terénu.',
  'Slunce v létě vytváří výraznější kontrasty mezi otevřenými místy a stínem.'
 ],
 autumn:[
  'Podzimní podklad nese vrstvu opadaného listí a starších jehlic.',
  'Podzimní barvy ukazují, že období růstu už ustupuje.',
  'Kratší podzimní dny mění význam světla v cestovních úsecích.',
  'Větrem přemístěné listí může změnit vzhled známých stop.'
 ],
 winter:[
  'Zimní krajina se vyznačuje delšími stíny a úspornější vegetací.',
  'Nízké zimní světlo mění tvar stínů na cestě.',
  'Chladnější zimní část roku vyžaduje pozornější vnímání terénu.',
  'Zimní ticho může zvýraznit běžné zvuky z bezprostředního okolí.'
 ],
 unknown:['Krajina se mění se světlem a s postupem zaznamenané hodiny.','Podmínky úseku jsou popsány jen v rozsahu, který skutečně uchoval kalendář.']
};
const WEATHER_SCENES={
 precipitation:[
  'Srážky proměňují povrch cesty a zhoršují čitelnost některých drobných stop.',
  'Dopadající srážky mění zvukovou kulisu i charakter podkladu.',
  'V průběhu úseku ovlivňují srážky přehlednost okolí a pohodlí výpravy.',
  'Srážky přicházejí do zaznamenané činnosti a mohou měnit jistotu kroku.'
 ],
 snow:[
  'Sníh mění obrysy stezky a překrývá starší drobné stopy.',
  'Sněžení zkracuje dohlednost a zjemňuje siluety okolí.',
  'Sněhové srážky proměňují podklad a přinášejí nové stopy.'
 ],
 rain:[
  'Déšť tlumí ostré obrysy vzdálenějších míst a zanechává na povrchu vlhké stopy.',
  'Srážky dopadají na cestu a dělají z jejího povrchu méně předvídatelné místo.',
  'Déšť proměňuje zvuky kolem družiny a zhoršuje čitelnost některých stop.',
  'Vlhkost se drží na oděvu i na porostu, kterým epizoda prochází.',
  'Srážky splachují část drobných stop a mění charakter podkladu.'
 ],
 dry:[
  'Nejsou zaznamenány srážky, takže výhled neomezuje déšť ani sněžení.',
  'Během úseku nejsou zaznamenané srážky; pozornost se může soustředit na terén.',
  'Obloha pro tento interval nepřináší doložené srážky.',
  'Cestu tentokrát přímo nekomplikuje déšť ani sněžení.'
 ]
};
function terrainGroup(p){
 // Physical terrain takes precedence over the area label (which may be a town).
 const x=txt(p?.terrain).toLowerCase();
 return /forest|les|wood/.test(x)?'forest':/road|stezk|cest/.test(x)?'road':/urban|town|city/.test(x)?'urban': 'other';
}
const daylightPeriod=p=>{
 const periods=p?.daylight?.minutesByPeriod;
 if(periods&&typeof periods==='object'){
  const valid=Object.entries(periods).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]);
  if(valid.length)return valid[0][0];
 }
 return txt(p?.settings?.lightPeriod||'');
};
export function personalEpisodeWeather(p){
 const w=p?.weather||{},season=namesSeason[w.season||p?.settings?.season]||'období neuvedeno';
 const precipitation=w.hasPrecipitation===true?(p?.precipitation?.precipitation==='rain'?'déšť':p?.precipitation?.precipitation==='snow'?'sněžení':'srážky'):
   w.hasPrecipitation===false?'bez srážek':'srážky neuvedeny';
 const day=daylightPeriod(p),light=({day:'den',night:'noc',twilight:'soumrak'})[day]||'světlo neuvedeno';
 return `${season} · ${precipitation} · ${light}`;
}
export function personalEpisodeFlavor(entry,p){
 const season=txt(p?.weather?.season||p?.settings?.season).toLowerCase();
 const kind=txt(p?.kind),key=`${entry?.id||''}|${p?.startMinute??''}|${p?.endMinute??''}|${p?.terrain??''}|${kind}`;
 const terrain=TERRAIN_SCENES[terrainGroup(p)]||TERRAIN_SCENES.other;
 const action=ACTIVITY_PASSAGES[kind]||ACTIVITY_PASSAGES.other;
 const seasonScene=SEASON_SCENES[season==='fall'?'autumn':season]||SEASON_SCENES.unknown;
 const intro=[pick(seasonScene,key+':season'),pick(terrain,key+':ground')];
 const middle=[pick(action,key+':action')];
 if(p?.weather?.hasPrecipitation===true){
  const precip=txt(p?.precipitation?.precipitation).toLowerCase();
  const type=precip==='rain'?'rain':precip==='snow'?'snow':'precipitation';
  middle.push(pick(WEATHER_SCENES[type],key+':weather'));
 }
 else if(p?.weather?.hasPrecipitation===false&&hash(key+'dry')%3===0)middle.push(pick(WEATHER_SCENES.dry,key+':dry'));
 const light=daylightPeriod(p);
 if(light==='night')middle.push(pick(['Noční tma omezuje výhled mimo bezprostřední okolí.','Za tmy získávají i malé zvuky větší váhu.','Osvětlená místa a tmavé úseky se vnímají velmi odlišně.'],key+':night'));
 if(light==='twilight')middle.push(pick(['Soumrak mění tvar stínů a hranice přehledných míst.','Světlo ubývá a vzdálenější obrysy ztrácejí přesnost.','Přechod mezi denním světlem a tmou mění jistotu pohybu.'],key+':twilight'));
 const modes=p?.orientation?.modes||{},forage=(p?.travelForaging||[]),target=txt(forage[0]?.target||p?.settings?.forageTarget),herb=txt(forage.find(f=>f?.herbName)?.herbName||p?.settings?.herbName);
 if(kind==='forage'||forage.length||Number(modes.foraging)>0){
  const themed=target==='herbs'?[
   'Ruce se obracejí k nízké vegetaci a k rozpoznávání léčivých druhů.',
   'Každou nalezenou rostlinu je třeba rozeznat dříve, než může být užitečná.',
   'Sběr bylin vyžaduje pozorovat listy, stonky a místo, kde vyrůstají.',
   'Hledání bylin střídá prohlížení porostu s porovnáváním známých znaků.'
  ]:[
   'Pátrání po obživě vede pozornost k rostlinám a možným zdrojům vody.',
   'Zásoby nelze odhadnout z pohledu na krajinu; rozhoduje až skutečně potvrzený nález.',
   'Prohledávání půdy a porostu přináší příležitosti, ale také slepé uličky.',
   'K získání zásob nestačí najít nadějné místo, je nutné ověřit, co poskytlo.'
  ];
  middle.push(pick(themed,key+':forage'));
  if(target==='herbs'&&herb)middle.push(`Pátrání se zaměřuje na bylinu ${herb}.`);
 }
 if(kind==='tracking'||p?.trackingMemory)middle.push(pick([
  'Směr stopy se ověřuje podle více znaků najednou, ne podle jediného otisku.',
  'Stopař čte změny povrchu a hledá souvislosti, které by ostatní mohli přehlédnout.',
  'Zkoumání stop vyžaduje dávat pozor i na místa, kde zdánlivě žádné nejsou.',
  'Pátrání se soustředí na pokračování téže stopy, aniž by předem zaručovalo její nalezení.'
 ],key+':tracking'));
 if(kind==='watch'||p?.trekWatchfulness?.effective==='alert'||Number(modes.vigilance)>0)middle.push(pick([
  'Pozornost se vrací k místům, odkud by bylo možné výpravu pozorovat.',
  'Hlídání zůstává vědomou součástí činnosti a ubírá prostor pro rozptýlení.',
  'Ostraha se snaží udržet přehled i tam, kde výhled přerušují překážky.',
  'Sledování okolí pomáhá rozlišovat běžný pohyb přírody od skutečných podnětů.'
 ],key+':watch'));
 if(Number(modes.stalking)>0||Number(p?.settings?.mode_stalking)>0)middle.push(pick([
  'Kroky se ztišují a tempo podřizuje snaze neupozornit na sebe.',
  'Plíživý postup vede k opatrnému rozvržení každého dalšího kroku.',
  'Důležitá je nenápadnost pohybu; tichý postup neznamená automaticky úspěšné ukrytí.'
 ],key+':stalking'));
 if(p?.stableAnimalLoad?.length){
  if(p.stableAnimalLoad.some(a=>a.rider))middle.push(pick([
   'Jezdci a pěší musí sladit rychlost, aby spolu drželi zaznamenanou trasu.',
   'Rytmus kopyt doplňuje kroky pěších; cesta jim neklade vždy stejné nároky.',
   'Pohyb jízdních zvířat se musí přizpůsobit členům výpravy na zemi.'
  ],key+':mount'));
  else if(kind==='travel')middle.push(pick([
   'Součástí přesunu je také vedené či nákladní zvíře; práce s ním ovlivňuje rytmus družiny.',
   'Pěší doprovod musí při přesunu brát ohled na přítomná zvířata.',
   'Vedle kroků cestujících se ozývá i pravidelný pohyb doprovázejícího zvířete.'
  ],key+':animal'));
 }
 // The text is deliberately descriptive: injury, encounter and loot appear only
 // in the dedicated proven-facts boxes, not as imagined facts in this prose.
 const chosen=middle.slice(0,4);
 return `${intro.join(' ')}\n\n${chosen.join(' ')}`;
}
export function personalEpisodeEncounter(p){
 const e=p?.encounter;if(!e||typeof e!=='object')return null;
 const chance=typeof e.chance==='number'&&Number.isFinite(e.chance)?(e.chance*100).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' %':null;
 const count=Number.isInteger(e.count)?e.count:e.found?1:0;
 const die=e.format==='hmk-episode-encounter-minute-v1'?'d100':'d10';
 return {chance,die,roll:numeric(e.d100??e.roll),count,detail:count?`${count} setkání evidováno; podrobnosti určuje GM.`:'V tomto úseku nebylo vygenerováno setkání.',format:e.format};
}
export function personalEpisodeHazard(p,displayMinute,linkedEvidence={}){
 const hazard=txt(p?.survivalHazard);if(!hazard||hazard==='none')return null;
 const info=p.hazardDetail||p.hazardDetails?.[0]||{},window=info.eventWindow93868||{};
 const absolute=Number.isSafeInteger(window.eventMinute)?window.eventMinute:
  Number.isSafeInteger(info.hazardAtMinute)&&Number.isSafeInteger(p.startMinute)?p.startMinute+info.hazardAtMinute:null;
 const when=Number.isSafeInteger(absolute)?displayMinute(absolute):'čas nehody v intervalu nedoložen';
 const ids=new Set((p.skillLinks||[]).map(l=>txt(l.id)).filter(Boolean));
 if(p.orientation?.skillId)ids.add(txt(p.orientation.skillId));
 if(p.trackingMemory?.skillId)ids.add(txt(p.trackingMemory.skillId));
 const matched=(linkedEvidence?.healthEvents||[]).filter(e=>{
  const d=e?.details||{};
  return e?.type==='travel-accident-injury'&&ids.has(txt(d.sourceId))&&
   Number.isSafeInteger(d.originMinute)&&d.originMinute>=p.startMinute&&d.originMinute<=p.endMinute;
 });
 const formatBodyPart={tx:'hrudník',th:'stehno',sk:'lebka',fa:'obličej',nk:'krk',sh:'rameno',ua:'nadloktí',el:'loket',fo:'předloktí',ha:'ruka',ab:'břicho',pv:'pánev',kn:'koleno',ca:'lýtko',ft:'chodidlo'};
 const injuries=matched.map(e=>{
  const d=e.details,kind=txt(d.injury),site=formatBodyPart[txt(d.location).toLowerCase()]||txt(d.location)||'neurčené místo';
  const who=linkedEvidence?.name?.(d.targetId)||'Postava';
  return `${who}: ${kind} (${site}${txt(d.aspect)?', zásah '+d.aspect:''})`;
 });
 const possibilities={
  accident:[
   'GM inspirace: na nerovném úseku mohl někomu uklouznout krok; případné poranění musí doložit zvláštní hod.',
   'GM inspirace: zvíře mohlo ucuknout před neočekávaným pohybem; samotný popis nepotvrzuje pád.',
   'GM inspirace: pod nohama se mohla uvolnit hlína nebo kamení; další následek určuje pravidlový test.',
   'GM inspirace: chvilkové zaváhání na úzkém průchodu mohlo přerušit jistý postup.',
   'GM inspirace: přehlédnutý kořen či příkop mohl způsobit nepříjemnou ztrátu rovnováhy.',
   'GM inspirace: náhlé vybočení z trasy mohlo přinutit účastníka rychle reagovat.',
   'GM inspirace: člen výpravy mohl na okamžik ztratit jistotu v sedle nebo na svahu.',
   'GM inspirace: prudké přenesení váhy mohlo zkomplikovat překonání překážky.'],
  equipment:[
   'GM inspirace: mohl povolit úvazek, prasknout řemen nebo se uvolnit část nákladu.',
   'GM inspirace: přezka či šev mohly podlehnout namáhání během přesunu.',
   'GM inspirace: opakované otřesy mohly poškodit součást nesené výstroje.',
   'GM inspirace: špatně uložený předmět mohl vyžadovat kontrolu a opětovné upevnění.',
   'GM inspirace: odřený spoj na výstroji mohl ukázat potřebu opravy.',
   'GM inspirace: při průchodu stísněným místem mohl o něco zachytit kus nákladu.'],
  complication:[
   'GM inspirace: průchod mohl být obtížnější, než se zpočátku zdálo.',
   'GM inspirace: družina mohla narazit na místo, kde bylo nutné přehodnotit postup.',
   'GM inspirace: cesta mohla být na krátkém úseku přerušena překážkou.',
   'GM inspirace: udržet tempo nebo směr mohlo být těžší kvůli terénu.',
   'GM inspirace: mohlo být nutné zastavit a znovu zhodnotit bezpečnost pohybu.',
   'GM inspirace: okolnosti mohly donutit skupinu změnit pořadí pohybu.']};
 const actual={accident:'V tomto úseku vznikla doložená cestovní nehoda.',equipment:'V tomto úseku byl potvrzen hazard výbavy.',complication:'V tomto úseku byla zaznamenána cestovní komplikace.'}[hazard]||'V úseku nastal potvrzený cestovní hazard.';
 const outcome=info.result==='irreparable'&&hazard==='equipment'?'Oprava výbavy v tomto pokusu neuspěla; zapsaný stav zůstává nevyřešený.':
  info.result==='irreparable'&&hazard==='complication'?'Komplikaci se při navazujícím pokusu nepodařilo překonat.':
  info.complicationSkill&&info.complicationLevel?`Navazující ${info.complicationSkill}: ${info.complicationLevel}.`:
  info.result==='ignored'?'GM rozhodl, že se výbava nebude nyní opravovat.':
  info.result==='pending-original-skill-combat'?(injuries.length?'Návazná zdravotní sekvence je doložena níže konkrétním zraněním.':'Navazující pohybový či zdravotní test zatím není v tomto zápisu potvrzen.'):
  info.result?'Doložený stav následku: '+info.result+'.':'';
 // Do not describe a riding mishap if no animal participated in the interval.
 const hasAnimal=(p.stableAnimalLoad||[]).length>0;
 const pool=hazard==='accident'&& !hasAnimal?possibilities.accident.filter(x=>!/(zvíře|sedle|kůň)/i.test(x)):(possibilities[hazard]||[]);
 const weatherHint=p?.weather?.hasPrecipitation===true&&hazard==='accident'?'GM inspirace: srážky mohly zvýšit nejistotu pohybu na změněném povrchu.':null;
 const scene=pool.length?pick(pool,`${p.startMinute}:${p.endMinute}:${hazard}:${p.settings?.guideId||''}`):'';
 const example=weatherHint&&hash(String(p.startMinute)+':weather-hazard')%2===0?weatherHint:scene;
 return {hazard,when,absolute,actual,outcome,injuries,
  example};
}
export function personalTestConsequence(test,p){
 const skill=txt(test?.skill).toLowerCase(),level=txt(test?.level),failing=level==='CF'||level==='F';
 const old=txt(test?.effect);
 const generic=/^CF:|^Kritický neúspěch činnosti|^Bez dalšího potvrzeného následku|^Výsledek z dokončené|^Vyhodnotit konkrétní hazard|^Následek viz|^Následek evidován|^Změna směru dle|^Nalezené množství je uvedeno/.test(old);
 if(skill.includes('endurance'))return {actual:old||'Endurance SR byl vyhodnocen, příslušná Weariness se čte z výsledku.',example:''};
 if(skill.includes('foraging')||skill.includes('sběr')||skill.includes('potrav')||skill.includes('zásob'))return {
  actual:old&& !generic?old:'Hod je doložen, ale skutečný nález musí pocházet z potvrzeného vyhodnocení zásob.',
  example:old.includes('neuzavřen')?'GM může popsat hledání, ale zatím nesmí postavě připsat nalezené dávky.':''};
 if(skill.includes('direction hazard'))return {actual:p?.direction?.direction?`Určený směr: ${p.direction.direction}.`: 'Hazard směru byl zaznamenán.',example:''};
 if(skill.includes('hazard'))return {actual:txt(p?.survivalHazard)==='accident'?'Zaznamenána nehoda; potvrzená zranění jsou níže v části Nehoda.':txt(p?.survivalHazard)==='equipment'?'Výbava byla vystavena hazardu; stav opravy uvádí sekvence nehody.':txt(p?.survivalHazard)==='complication'?'Při cestě vznikla komplikace, viz její doložené vyhodnocení.':'Doložený hazard je rozepsán v části Následky.',example:''};
 if(skill.includes('survival')||skill.includes('orient')){
  if(p?.orientation?.skillId===test?.id){
   const nav=txt(p?.navigationState);
   const situation=nav&&nav!=='clear'?` V epizodě zůstává stav orientace „${nav}“.`:p?.navigationRecovered?' GM potvrdil návrat na správnou trasu.':'';
   return {actual:failing?`Orientace nevyšla; výprava nezískala spolehlivé potvrzení směru.${situation}`:`Orientace uspěla a její hodnota vstoupila do vyhodnocení postupu.${situation}`,
    example:failing?'GM inspirace: mezi podobnými průchody mohl chybět výrazný orientační bod; směr není možné považovat za bezpečně ověřený.':''};
  }
  return {actual:failing?'Pokus využít Survival selhal. Při cestě je nutné držet se skutečně zaznamenané orientace a následků.':'Test Survival uspěl; nebyl však doložen nový samostatný nález ani zranění.',example:failing?'GM inspirace: v opakujícím se terénu se mohl jevit správný směr méně jednoznačný.':''};
 }
 if(skill.includes('riding'))return {actual:failing?'Jezdecký manévr se nepodařil; žádný pád není samotným tímto testem doložen.':'Jezdecký úkon byl úspěšně zvládnut.',
  example:failing?'GM inspirace: kůň mohl vybočit nebo ztratit rytmus; případný pád by vyžadoval samostatný skutečný následek.':''};
 if(skill.includes('animalcraft'))return {actual:failing?'Práce se zvířetem skončila neúspěchem. Bez doloženého šestiměsíčního výcviku se nepřičítají další měsíce.':'Pokus o ovládnutí či práci se zvířetem uspěl.',
  example:failing?'GM inspirace: zvíře mohlo odmítnout povel, znejistět při vedení nebo vyžadovat další uklidnění.':''};
 if(skill.includes('tracking')||skill.includes('stopov'))return {actual:failing?'Stopu se v tomto pokusu nepodařilo spolehlivě sledovat.':'Pokus o sledování stopy uspěl; pokračování vyplývá z doložené hodnoty SV.',
  example:failing?'GM inspirace: otisky se mohly ztratit na tvrdé zemi, rozcházet se nebo se překrývat s jinými.':''};
 if(skill.includes('awareness'))return {actual:failing?'V tomto pokusu se nepodařilo včas rozpoznat sledovaný podnět.':'Postava uspěla při sledování okolí; druh podnětu určuje daná situace.',
  example:failing?'GM inspirace: zvuk za stromy mohl zaniknout v šumu okolí, aniž by tím vzniklo setkání.':''};
 if(skill.includes('agility')||skill.includes('climbing'))return {actual:failing?'Pokus o pohybové zvládnutí situace selhal. Poranění nastává jen tehdy, když jej potvrdila navazující sekvence.':'Pohybový úkon byl úspěšný.',
  example:failing?'GM inspirace: podklouznutí, špatný odraz nebo ztráta rovnováhy – nikoli automatická rána.':''};
 if(!generic&&old&&!/Žádný zvláštní následek/.test(old))return {actual:old,example:''};
 const label=txt(test?.skill)||'Dovednost';
 return {actual:failing?`${label}: pokus ${level==='CF'?'kriticky ':''}selhal. Další účinek tohoto konkrétního úkonu není doložen.`:`${label}: úkon uspěl. Samotný hod nepotvrzuje další zdroj ani zranění.`,
  example:failing?'GM inspirace: činnost mohla vyžadovat změnu přístupu nebo opakování, pokud to dovoluje pravidlo daného úkonu.':''};
}
export function personalTestHelp(which,test){
 const tn=Number(test?.tn),eml=Number(test?.eml);
 if(which==='TN')return `Target Number (TN), HMK str. 62. Pro d10 je úspěch každý hod 1 až TN (včetně), jinak neúspěch. TN ≤ 0 znamená vždy neúspěch, TN ≥ 10 vždy úspěch. Přehled: TN 1 = 1 (10 %), TN 2 = 1–2 (20 %), TN 3 = 1–3 (30 %), TN 4 = 1–4 (40 %), TN 5 = 1–5 (50 %), TN 6 = 1–6 (60 %), TN 7 = 1–7 (70 %), TN 8 = 1–8 (80 %), TN 9 = 1–9 (90 %), TN 10 = 1–10 (100 %). Aktuální TN ${Number.isFinite(tn)?tn:'—'}: ${Number.isFinite(tn)?tn<1?'úspěch není možný':tn>=10?'úspěch na všech 1–10':`úspěch d10 (1–${tn}), neúspěch d10 (${tn+1}–10)`:'bez čísla'}. U cestovního Endurance SR úspěch může podle pravidel snížit přírůstek únavy; skutečný dopad je uveden v následku.`;
 if(which==='EML')return `Effective Mastery Level, HMK str. 60: výsledná šance Success Testu po modifikátorech ML. Při d100 ≤ EML nastává úspěch, při vyšším hodu neúspěch. Jednotky 0 nebo 5 znamenají kritický stupeň. Většina testů má EML od 5 do 95 (výjimky určuje pravidlo). Zde EML ${Number.isFinite(eml)?eml:'—'}.`;
 if(which==='SV')return 'Success Value, HMK str. 61: Index primárního ML (dolní celá část ML/10) + modifikátor dle SL (CF −2, F −1, S 0, CS +1) a příp. zvláštní úpravy. SV ≤0 bez použitelné hodnoty; 1–2 malá hodnota; 3–4 běžná; SV 5 = 1 bonusová hvězda, 6 = 2, 7 = 3, 8 = 4, 9+ = 5. Konkrétní dovednost může tabulku měnit.';
 if(which==='STARS')return 'Hvězdy, HMK str. 61: u běžného SV 5–9+ jde o bonusovou kvalitu 1–5 ★. U Opposed Test vyjadřují rozdíl úrovní úspěchu obou stran (CF < F < S < CS); při shodě bývá bez vítěze, pokud pravidlo nestanoví rozstřel. Nejde o obecné zvýšení EML ani univerzální bonus pro další hod.';
 if(which==='DIE')return 'Skutečný fyzický nebo elektronicky doložený hod kostkou: d100 (1–100), d10 (1–10), d6 (1–6). Zobrazené číslo se přebírá z původního dokladu, nevymýšlí se znovu.';
 return 'Úroveň výsledku Success Testu: CF kritický neúspěch, F neúspěch, S úspěch, CS kritický úspěch (HMK str. 60). Kritický hod nastává při jednotkách 0 nebo 5.';
}
