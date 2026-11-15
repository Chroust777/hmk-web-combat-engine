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
const terrainWords=Object.freeze({
 'paved-road':'Zpevněná cesta','unpaved-road':'Nezpevněná cesta',
 'rural-track':'Venkovská cesta','wilderness-trail':'Lesní stezka',
 'cropland-grassland':'Louky a pole','mixed-woodland':'Řídký les',
 'cold-woodland':'Chladný les','mixed-forest':'Smíšený les',
 'needleleaf-forest':'Jehličnatý les','broadleaf-forest':'Listnatý les',
 'heath-moor':'Vřesoviště','dunes':'Duny','desert-flats':'Pouštní skalnaté pláně',
 'wetlands':'Mokřady','alpine-vegetation':'Alpský terén','ice-snow-rockfield':'Sníh / skály',
 'grassland':'Travnatá krajina','hills':'Kopcovitá krajina','mountains':'Hory','swamp':'Mokřiny'
});
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
 const ids=Array.isArray(p?.memberIds)?p.memberIds:[], stable=Array.isArray(p?.stableAnimalLoad)?p.stableAnimalLoad:[];
 const settings=p?.settings||{}, drover=txt(settings.droverActorId),guide=txt(settings.guideId||p?.orientation?.guideId);
 const handlers=new Set(p?.walkingHandlerIds||[]),transported=new Set(p?.transportedMemberIds||[]);
 const riders=new Map(stable.filter(x=>x.rider).map(x=>[x.rider,x.name||'jezdecké zvíře']));
 const unmounted=stable.filter(x=>!x.rider),placed=new Set(),roles=[];
 for(const id of ids){
  const tags=[];if(id===guide)tags.push('průvodce');
  if(transported.has(id))tags.push('přepravovaný člen družiny');
  else{
   if(riders.has(id))tags.push(`jel na koni (${riders.get(id)})`);
   const individuallyAssigned=unmounted.filter(a=>txt(settings[`packHandler_${a.id}`])===id);
   // A drover leading a single accompanying, unmounted horse is direct evidence
   // for the user's description; in a multi-animal group do not invent handlers.
   const horses=individuallyAssigned.length?individuallyAssigned:unmounted.length===1&&drover===id?unmounted:[];
   if(drover===id&&!horses.length)tags.push('honák');
   if(horses.length){tags.push(`honák – vede za uzdu ${horses.length===1?'koně jménem':'koně'} ${horses.map(x=>x.name).join(', ')}`);horses.forEach(x=>placed.add(x.id));}
   if(!riders.has(id)&&!horses.length){
    if(handlers.has(id))tags.push('pěší doprovod');
    else if(p?.kind==='travel')tags.push('jde pěšky');
    else tags.push('účastní se činnosti');
   }
  }
  roles.push(`${name(id)} — ${[...new Set(tags)].join('; ')||'účastník'}`);
 }
 for(const horse of stable){
  if(horse.rider)roles.push(`${horse.name} — jezdecké zvíře; jezdec ${name(horse.rider)}`);
  else if(placed.has(horse.id))roles.push(`${horse.name} — vedené zvíře (na uzdě)`);
  else roles.push(`${horse.name} — doprovázející zvíře`);
 }
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
 return /forest|les|wood/.test(x)?'forest':/road|stezk|cest|track|trail/.test(x)?'road':/urban|town|city/.test(x)?'urban': 'other';
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
 const injuryDetails=matched.map(e=>{
  const d=e.details||{}, code=txt(d.injury),site=formatBodyPart[txt(d.location).toLowerCase()]||txt(d.location)||'neurčené místo';
  return {who:linkedEvidence?.name?.(d.targetId)||'Postava',targetId:d.targetId,code,site,
   aspect:txt(d.aspect),shock:txt(d.shock),woundId:txt(d.woundId),originMinute:d.originMinute};
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
 return {hazard,when,absolute,actual,outcome,injuries,injuryDetails,
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
 if(skill.includes('hazard'))return {actual:txt(p?.survivalHazard)==='accident'?'Během úseku nastala doložená nehoda; její zdravotní následky náleží ke stejné události.':txt(p?.survivalHazard)==='equipment'?'Výbava byla vystavena hazardu; stav opravy uvádí sekvence nehody.':txt(p?.survivalHazard)==='complication'?'Při cestě vznikla komplikace, viz její doložené vyhodnocení.':'Doložený hazard je rozepsán v části Následky.',example:''};
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

/** v93.886: Story beats are a read-only literary projection of committed tests.
 * A beat is assembled in the order of the action, the hazard, its direction
 * consequence, and finally the travel endurance/encounter result. No new dice,
 * actors, wounds, encounters, or clock changes are generated here. */
function chronicleName(name,id){return id?name(id):'Výprava';}
function chronicleLocale(p){
 const group=terrainGroup(p);
 return group==='forest'?'lesní porost':group==='road'?'cesta':group==='urban'?'okolní zástavba':'okolní krajina';
}
function chronicleMoment(p){
 const hour=Math.floor((Number(p?.startMinute)||0)%1440/60);
 return hour>=20||hour<4?'Noc':hour<8?'Ráno':hour<12?'Dopoledne':hour<17?'Odpoledne':'Podvečer';
}
const LITERARY_SCENES={
 forest:[
  'Mezi vysokými kmeny se dálka tříštila do úzkých průhledů. Na zemi ležely jehlice a vystouplé kořeny, které si žádaly pozornost při každém kroku.',
  'Les neodhaloval směr snadno. Stromy stály v nepravidelných řadách a mezi jejich kmeny se střídala měkká půda s pevnějšími místy.',
  'Pod korunami stromů se světlo rozbíjelo o větve. Stezka se tu dala sledovat po jednotlivých znacích, nikoli po vzdáleném horizontu.',
  'Mezi jehličím a tmavšími pruhy země mizely drobné orientační body. I známý tvar cesty se z jiného úhlu mohl jevit cizí.',
  'Lesní porost tlumil pohled do dálky. Kdo chtěl pokračovat jistě, musel číst nejen stezku, ale i její okraje.',
  'Trasa se proplétala mezi kmeny, jejichž stíny zvolna přecházely přes zem. Krajina nabízela mnoho drobných znaků, ale jen málo jistých výhledů.',
  'Kmeny a větve vytvářely téměř souvislou stěnu, v níž se daly rozeznat jen krátké průchody. Tady stačilo přehlédnout jediný bod a směr začal být nejistý.'
 ],
 road:[
  'Cesta se táhla mezi proměnlivými okraji krajiny. Na jejím povrchu se dal držet směr, zatímco stopy mizely v tvrdších úsecích.',
  'Pevnější povrch cesty určoval postup, ale každá odbočka žádala nové rozhodnutí. Směr byl čitelnější než to, kdo tudy prošel předtím.',
  'Trasa se nabízela jako tenká jistota mezi okolními změnami terénu. I na cestě však bylo nutné vnímat její rozcestí.'
 ],
 urban:[
  'Mezi stavbami se dohled zkracoval a zvuky se vracely od stěn. Směr se tu četl spíše z průchodů než z krajiny.',
  'Pohyb určovaly uličky a rohy domů. Každá změna směru odkryla jiný kus okolí.'
 ],
 other:[
  'Krajina se otevírala po krátkých úsecích a průchodnost terénu nebyla všude stejná. Pokračovat znamenalo neustále znovu číst cestu před sebou.',
  'Podoba země se měnila s každým dalším úsekem. Některá místa nabízela jasnou cestu, jiná vyžadovala pomalejší pozorování.',
  'Okolní terén určoval rytmus cesty. Vzdálenost na mapě nebyla totéž co jistota každého kroku.'
 ]
};
const SEASON_MOOD={
 spring:['Jaro se zatím projevovalo spíš ve svěžesti porostu než v jistotě počasí.','Jarní krajina ještě neodložila všechny stopy chladnějších dnů.','Nový porost měnil barvy krajiny a některé dříve patrné znaky zakrýval.'],
 summer:['V letní vegetaci se stezka místy ztrácela pod zelení.','Letní světlo sahalo daleko, i když pohled zůstával omezený terénem.','Dlouhý letní den dával cestě prostor, ne však záruku bezpečného postupu.'],
 autumn:['Podzimní listí měnilo barvu země i obrysů cest.','Podzim přinášel kratší světlo a zcela jiné stopy na povrchu.','Vzduch a porost už nesly znaky ustupujícího léta.'],
 winter:['Zimní stíny působily delší než jindy.','Chladnější období měnilo tvrdost povrchu i délku viditelného dne.','Zimní porost odhaloval jiné části krajiny než v době růstu.'],
 unknown:['Světlo a terén proměňovaly vzhled každého dalšího úseku.','Krajina nabízela jen takové vodítko, jaké se dalo skutečně rozeznat.']
};
const RAIN_MOOD=[
 'Déšť šel s výpravou a jemně měnil zvuk kroků; na zemi se ztrácely některé starší stopy.',
 'Déšť se zachytával na větvích a smýval drobné znaky z povrchu cesty.',
 'Vlhkost měnila pevnost podkladu. Co před chvílí vypadalo jako obyčejný krok, vyžadovalo nyní větší opatrnost.',
 'Déšť tlumil vzdálenější zvuky. Zůstávalo šustění oděvu, dopadání kapek a zvuk země pod nohama.',
 'Voda stékala po porostu a na některých místech se držela ve stopách mezi kořeny.',
 'Ve vzduchu se nesla vlhkost, která měnila nejen povrch stezky, ale i způsob, jakým bylo slyšet okolí.'
];
const SNOW_MOOD=[
 'Sníh proměňoval obrysy stezky a ponechával v nich nové stopy.',
 'Sněžení ubíralo dálce ostrost a měnilo povrch pod nohama.',
 'Sněhové vločky pomalu překrývaly některá starší vodítka cesty.'
];
const DAY_MOOD={
 day:['Světla bylo ještě dost, ale les neukazoval více, než dovolily jeho průhledy.','Den nabízel možnost zkoumat cestu očima, nikoliv však bez omylu.'],
 twilight:['Soumrak prodlužoval stíny a rozmazával vzdálenější tvary.','S ubývajícím světlem získávaly zřetelnější obrysy jiné věci než za dne.'],
 night:['Noc nechávala nejbližší okolí vystoupit z temnoty, zatímco dálka mizela.','Za tmy byly jednotlivé zvuky čitelnější než vzdálené obrysy.']
};
const CHRONICLE_VISTAS={
 forest:[
  'Pod korunami se ztrácela měřítka vzdálenosti a každý průchod mezi kmeny sliboval jinou cestu, než jakou ve skutečnosti nabízel.',
  'Ve stínech mezi stromy se dalo číst mnohé, ale máloco bez pochyb: nalomenou větev, stopu v hlíně, nenápadný sklon země.',
  'Když se vítr opřel do větví, šumění lesa dokázalo na chvíli přehlušit i zvuk vlastních kroků.',
  'Hustší podrost skrýval povrch země, zatímco volnější místa poskytovala jen krátký pohled na další úsek.',
  'Cesta se mezi kmeny neodvíjela jako přímá čára. Bylo nutné stále znovu hledat, kudy je vůbec možné pokračovat.',
  'Jehličí a půda zachycovaly otisky pokaždé jinak; co bylo zřejmé před několika kroky, zde mohlo zcela zmizet.'
 ],
 road:[
  'Stezka dovolovala pohlédnout dále, ale její okraje ukrývaly drobné změny, kterých by si uspěchaný cestující nevšiml.',
  'Mezi vyježděnými pruhy země zůstávaly staré otisky i stopy nedávného deště; jejich význam nebyl vždy jednoznačný.',
  'Při každé odbočce bylo třeba znovu zvážit, zda známý směr znamená také správnou cestu.',
  'Pevný povrch pomáhal kroku, ne však vždy úsudku: správná volba se často skrývala až za následující zatáčkou.'
 ],
 urban:[
  'Od zídek a staveb se vracely zvuky jinak než z otevřené krajiny a každá cesta měla vlastní rytmus.',
  'Přímá ulice nenabízela jistotu dalšího průchodu; za rohem se mohly měnit podmínky i směr.',
  'Dlážděná i hlinitá místa uchovávala odlišné stopy a pohyb výpravy se jim musel přizpůsobit.'
 ],
 other:[
  'V takové krajině nebyla cesta dána jedinou stopou. Přirozené překážky nutily zvažovat směr i tempo.',
  'Šířka výhledu se měnila a spolu s ní i jistota, že další úsek bude stejně průchodný jako předešlý.',
  'Země nabízela jiné opory pro chůzi i orientaci, než jaké sliboval pohled z dálky.'
 ]
};
export function personalChronicleIntro(entry,p){
 const key=txt(entry?.id)||`${p?.startMinute}:${p?.terrain}`,mood=SEASON_MOOD[txt(p?.weather?.season||p?.settings?.season).toLowerCase()]||SEASON_MOOD.unknown;
 const terrainKey=terrainGroup(p),terrain=pick(LITERARY_SCENES[terrainKey]||LITERARY_SCENES.other,key+':land');
 const weather=p?.weather?.hasPrecipitation===true?
  pick(txt(p?.precipitation?.precipitation)==='rain'?RAIN_MOOD:SNOW_MOOD,key+':rain'):
  p?.weather?.hasPrecipitation===false&&hash(key+'dry')%4===0?'Srážky tentokrát do cesty nezasahovaly.':'';
 const light=pick(DAY_MOOD[daylightPeriod(p)]||DAY_MOOD.day,key+':light');
 const vista=pick(CHRONICLE_VISTAS[terrainKey]||CHRONICLE_VISTAS.other,key+':vista');
 const detail=pick([
  'Rozvaha měla v takovém místě cenu právě proto, že cesta nedávala všechna vodítka najednou.',
  'Teprve druhý pohled odhaloval drobné rozdíly, které první snadno přehlédl.',
  'Za každým úsekem se podoba země proměnila natolik, že nebylo radno spoléhat na pouhou paměť.',
  'Kdo chtěl odhadnout další cestu, musel pozorovat i to, co zůstávalo po stranách.',
  'Jistotu pohybu zde neurčovala délka kroku, ale schopnost včas zpozorovat změnu.',
  'Dálka nabízela příslib snadné cesty, avšak rozhodovalo vždy nejbližší místo pod nohama.',
  'Jednotlivé znaky krajiny vystupovaly z okolí jen na krátký okamžik.',
  'Cesta vyžadovala trpělivost i tam, kde se na první pohled nezdála obtížná.',
  'Zprvu se vše zdálo podobné, ale zkušené oko mohlo rozpoznat odlišnosti podkladu.',
  'Krajina neponechávala mnoho místa unáhleným závěrům.',
  'Stejná zem se z různých míst ukazovala pokaždé trochu jinak.',
  'Všímat si podrobností znamenalo zpomalit úsudek, nikoli nutně krok.',
  'Bylo třeba pečlivě rozlišovat mezi tím, co cesta skutečně ukazovala, a tím, co si o ní cestující pouze mysleli.',
  'Teprve když se člověk ohlédl, dokázal si spojit drobné znaky s celkem putování.'
 ],key+':manuscript-detail');
 // Long and short cadence alternate by actual episode identifier; text never
 // claims an encounter, injury or item the journal did not confirm.
 if(hash(key+':rhythm')%2===0)return [pick(mood,key+':mood')+' '+terrain,(weather?weather+' ':'')+light+' '+vista+' '+detail];
 return [terrain+' '+pick(mood,key+':mood'),vista+' '+(weather?weather+' ':'')+light+' '+detail];
}

function chronicleActivity(entry,p,name){
 const key=txt(entry?.id)||`${p?.startMinute}:${p?.kind}`;
 const kind=txt(p?.kind),modes=p?.orientation?.modes||{},w=p?.trekWatchfulness||{};
 const herb=txt((p?.travelForaging||[]).find(x=>x.herbName)?.herbName||p?.settings?.herbName);
 const targets=txt((p?.travelForaging||[])[0]?.target||p?.settings?.forageTarget);
 if(kind==='forage'||(p?.travelForaging||[]).length||Number(modes.foraging)>0){
  const herbMode=targets==='herbs',target=herbMode?(herb?`byliny ${herb}`:'léčivých bylin'):'potravy a vody';
  return pick([
   `Po část zaznamenaného času se pozornost přesunula k hledání ${target}. Mezi porostem a zemí bylo třeba rozeznat skutečně užitečné znaky od pouhého příslibu.`,
   `Krajina mohla dát víc než cestu: tentokrát se v ní pátralo po ${target}. Výsledek nehovořil za samotné hledání, nýbrž až za potvrzený nález.`,
   `Činnost vedla k hledání ${target}. Každé slibné místo bylo nutné prohlédnout, než z něho mohlo být skutečné zásobování.`,
   `Při pátrání po ${target} se ukázalo, jak snadno může nadějný porost klamat. Teprve zapsaný hod měl rozhodnout, zda se něco skutečně podařilo získat.`
  ],key+':activity-forage');
 }
 if(kind==='tracking'||p?.trackingMemory)return pick([
  'Stopy se nedaly číst jediným pohledem. Bylo nutné hledat jejich pokračování i v místech, kde povrch vypadal neporušený.',
  'Část úseku patřila stopování: porovnávaly se otisky, narušená hlína i drobné znaky na okraji cesty.',
  'Stopování vyžadovalo trpělivost; směr stopy se neukazoval vždy tam, kde jej oko očekávalo.',
  'Hledání pokračování stopy odvádělo pozornost od samotné vzdálenosti, která měla ubýt.'
 ],key+':activity-tracking');
 if(kind==='watch'||Number(modes.vigilance)>0||w.effective==='alert')return pick([
  'Ostraha sledovala průchody před výpravou i prostor, který zůstával za jejími zády. Každý nezvyklý zvuk bylo třeba oddělit od obyčejného šumu krajiny.',
  'Pozornost byla věnována okolí a možným přístupům. Bdělost neznamenala, že je nebezpečí skutečně nablízku.',
  'Hlídání postupovalo stejně vytrvale jako cesta; oko se vracelo k místům, kde se mohl někdo objevit.',
  'Zvolená ostraha nedávala prostoru pro dlouhé rozptýlení. Okraje trasy se musely průběžně kontrolovat.'
 ],key+':activity-watch');
 if(w.effective==='lax'||Number(modes.lax)>0)return pick([
  'Ostraha zůstala v tomto úseku omezená. Pozornost musela mezi cestou a okolím přecházet bez opory v soustavném hlídání.',
  'Skupina pokračovala jen s omezenou ostrahou, a tak část okolí zůstávala mimo pravidelné sledování.',
  'Zvolený způsob postupu neponechal mnoho prostoru pro důkladné hlídání. Pohledy se vracely především k cestě.',
  'Výprava se soustředila na přesun více než na soustavné prohlížení okolí; ostraha byla podle záznamu omezená.'
 ],key+':activity-lax');
 if(Number(modes.stalking)>0||Number(p?.settings?.mode_stalking)>0)return pick([
  'Pohyb se podřídil snaze postupovat nenápadně. Každý krok se plánoval s ohledem na podklad a průhledy mezi překážkami.',
  'V tomto úseku se družina pokoušela o plíživý postup. Ticho samo ještě nezaručovalo, že si jí nikdo nevšiml.',
  'Kroky se zkrátily a pozornost přecházela od cesty k místům, odkud bylo možné někoho zahlédnout.'
 ],key+':activity-stalking');
 if(kind==='rest'||kind==='winded')return pick([
  'Během odpočinku utichl pravidelný rytmus cesty. Skutečné zotavení určovaly až doložené změny únavy.',
  'Čas patřil klidu; místo ubývání mil bylo podstatné obnovit síly pro další rozhodnutí.',
  'Přesun ustoupil odpočinku. Pro tuto chvíli byla důležitější výdrž než vzdálenost.'
 ],key+':activity-rest');
 if(kind==='sleep')return pick([
  'Část času patřila spánku. Vnější krajina zůstávala stejná, ale rytmus dne se na chvíli zastavil.',
  'Pohyb ustoupil spánku a potřeba pokračovat musela počkat na konec zaznamenaného intervalu.',
  'Doba spánku ubíhala bez dalších předpokládaných cestovních činů.'
 ],key+':activity-sleep');
 return '';
}
function chronicleHorseLead(p,name){
 const drover=txt(p?.settings?.droverActorId),horses=(p?.stableAnimalLoad||[]).filter(a=>!a.rider);
 if(drover&&horses.length===1)return `${chronicleName(name,drover)} vedl za uzdu koně jménem ${horses[0].name}.`;
 if(drover&&horses.length>1)return `${chronicleName(name,drover)} se jako honák staral o vedená zvířata.`;
 const ridden=(p?.stableAnimalLoad||[]).filter(a=>a.rider);
 if(ridden.length){return `${chronicleName(name,ridden[0].rider)} pokračoval v sedle zvířete jménem ${ridden[0].name}; ostatní drželi doložené tempo přesunu.`;}
 if(p?.kind==='travel'&&p?.memberIds?.length)return `${chronicleName(name,p.memberIds[0])} pokračoval zaznamenanou trasou.`;
 return '';
}
const CHRONICLE_CONNECTORS=[
 'Cesta ale brzy vyžadovala víc než pouhou vytrvalost.',
 'Další rozhodnutí přišlo ve chvíli, kdy bylo třeba znovu číst okolí.',
 'V takovém terénu rozhodovala i drobná každodenní dovednost.',
 'Zvolený postup musel obstát před skutečným výsledkem hodu.',
 'V té chvíli dostalo obyčejné cestovní rozhodnutí větší váhu.',
 'Ani krátký úsek nebyl prostý rozhodování.',
 'Stačila další chvíle a bylo potřeba přizpůsobit se cestě.'
];
function chronicleTextForTest(test,p,name,key){
 const who=chronicleName(name,test.actorId),skill=txt(test.skill).toLowerCase(),sl=txt(test.level),failed=sl==='F'||sl==='CF';
 const partial=p?.orientation?.skillId===test.id,nav=txt(p?.navigationState),result=test.result;
 if(skill.includes('animalcraft'))return {
  pre:pick([`${who} se snažil sladit krok s vedeným zvířetem a udržet jeho pozornost.`,`${who} věnoval část cesty vedení zvířete; klidný postup vyžadoval cit i zkušenost.`,`${who} se pokusil usměrnit zvíře, jehož pohyb ovlivňoval společné tempo.`,`${who} soustředil pozornost na to, aby zvíře reagovalo na vedení.`],key+'pre'),
  post:failed?pick(['Práce se zvířetem nevyšla; potřebná jistota v jeho vedení tentokrát chyběla.','Honákovi se tentokrát nepodařilo získat potřebnou souhru a cesta si vyžádala obezřetnost.','Zvíře nevyslyšelo vedení tak, jak bylo třeba, a napětí okamžiku muselo odeznít bez pomoci jistého povelu.'],key+'fail'):
    pick(['Zvíře se podařilo vést podle zvoleného postupu.','Vedení zvířete v této chvíli obstálo.'],key+'pass')};
 if(skill.includes('survival')||skill.includes('orient'))return {
  pre:pick([`${who} hledal mezi podobnými průchody bod, podle něhož by mohl udržet směr.`,`${who} porovnával terén se směrem, kterým měla výprava pokračovat.`,`${who} se zastavil pohledem u vzdálenějších obrysů a pokusil se určit správnou cestu.`,`${who} zkoušel rozlišit, která z nenápadných odboček odpovídá zamýšlené trase.`],key+'pre'),
  post:partial?(failed?(nav==='misdirection'?'Směr se však ukázal jako mylný; v zápisu cesty zůstala chybná orientace.':'Pokus nepřinesl jistotu správného směru.'):p?.navigationRecovered?'Orientace obstála a návrat na správnou trasu byl potvrzen.':'Orientace obstála, takže výprava mohla vycházet z její skutečně dosažené hodnoty.'):failed?'Pokus o zhodnocení podmínek selhal; další změna trasy není sama o sobě doložena.':'Jeho úsudek se pro tuto chvíli ukázal spolehlivý; z dalších nebezpečí to ovšem nečinilo jistotu.'};
 if(skill.includes('tracking')||skill.includes('stopov'))return {
  pre:pick([`${who} se sklonil k podkladu a pokusil se sestavit jednotlivé znaky v souvislou stopu.`,`${who} prohlížel okraje cesty, kde se otisky často zachovají jinak než uprostřed.`,`${who} hledal v nepravidelnostech země pokračování sledované stopy.`],key+'pre'),
  post:failed?'Otisky a narušená hlína neposkytly spolehlivý směr; stopa jako by se rozplynula právě tam, kde ji hledal.':'Drobné znaky se mu podařilo spojit v použitelnou stopu; jejich další osud však teprve ukáže příští úsek.'};
 if(skill.includes('riding'))return {
  pre:pick([`${who} se soustředil na jistotu pohybu v sedle.`,`${who} musel přizpůsobit ovládání zvířete terénu před sebou.`,`${who} se pokusil udržet správný rytmus jízdy.`],key+'pre'),
  post:failed?'Rytmus jízdy se mu v této chvíli nepodařilo ovládnout. O skutečném pádu však záznam nic neříká.':'Jezdecký úkon se podařil.'};
 if(skill.includes('awareness'))return {
  pre:pick([`${who} pročesával zrakem prostor před výpravou a naslouchal změnám okolních zvuků.`,`${who} se soustředil na nenápadné podněty podél trasy.`,`${who} vyhodnocoval, zda se v okolí objevilo něco neobvyklého.`],key+'pre'),
  post:failed?'Zamýšlený podnět se nepodařilo včas rozpoznat. Není tím však doloženo nové setkání.':'Jeho pozornost obstála a okolí mu poskytlo tolik vodítek, kolik bylo možné skutečně rozeznat.'};
 if(skill.includes('foraging')||skill.includes('sběr')||skill.includes('potrav')||skill.includes('zásob')){
  const target=txt(test.skill).toLowerCase().includes('bylin')?'bylin':'potravy a vody';
  return {pre:pick([`${who} prohledával okolní porost při hledání ${target}.`,`${who} obrátil pozornost od stezky k místům, kde bylo možné pátrat po zásobách.`,`${who} zkoumal nadějné části krajiny, zda něco skutečně poskytnou.`],key+'pre'),
   post:txt(test.result).includes('neuzavřen')?'Hod zůstal zadaný, ale nález zatím nebyl potvrzen.':txt(test.result).includes('nalezeno')?`Výsledek pátrání: ${test.effect}`:txt(test.effect).startsWith('Potrava')?`Doložený výtěžek: ${test.effect}`:'Pátrání nepřineslo potvrzený nález.'};
 }
 if(skill.includes('climbing')||skill.includes('agility'))return {
  pre:`${who} se pokusil překonat pohybovou obtíž, kterou tato část postupu přinesla.`,
  post:failed?'Pokus selhal; další tělesný následek by vyžadoval vlastní potvrzené vyhodnocení.':'Pohybový úkon se podařil.'};
 return {pre:`${who} se při své činnosti spolehl na dovednost ${test.skill}.`,post:failed?'Tentokrát mu okolnosti nepřály a zamýšlený postup se nezdařil.':'Jeho záměr se podařil v rozsahu, který zachycuje původní hod.'};
}
export function personalInjuryHelp(injury){
 const code=txt(injury?.code||injury?.injury).toUpperCase(),s=code[0],n=Number(code.slice(1));
 const severity=({M:'drobné (Minor)',S:'vážné (Serious)',G:'těžké (Grievous)'})[s]||'zranění';
 const impact=({1:'1–4',2:'5–9',3:'10–14',4:'15–19',5:'20 a více'})[n]||'podle výsledku';
 const grade=s==='S'?'Vážné zranění způsobuje zasažené tělesné zóně postih 10 k odpovídajícím Impaired testům, dokud se nezhojí na drobné (M).':s==='G'?'Těžce zraněná zóna je do zlepšení na vážné zranění nepoužitelná.':s==='M'?'Drobné zranění může způsobovat postih 5 při Healing Rate nejvýše 5.':'';
 const aspect=({b:'tupý (blunt)',e:'sečný (edge)',p:'bodný (point)',f:'oheň',c:'chlad'})[txt(injury?.aspect).toLowerCase()]||txt(injury?.aspect)||'neurčen';
 const shock=txt(injury?.shock).toUpperCase();
 return `${code}: ${severity} zranění, Injury Level ${n}. Základní účinný Impact zranění této úrovně: ${impact}; skutečná procedura má přednost. Místo: ${injury?.site||'neurčeno'}; typ zásahu ${aspect}. ${grade} Šok, krvácení, amputační a další následky se posuzují samostatně (HMK str. 168–170, 182).${shock&&shock!=='NONE'?` V tomto konkrétním dokladu byl zaznamenán Shock State ${shock}.`:''}`;
}
/** Returns paragraphs, with exact test and injury refs to be rendered inline by the UI. */
/** Optional GM scene continuations. These are prompts, NOT obligations or already
 * rolled tests, and never change success, wounds, calendar or journal. */
export function personalGMFollowups(entry,p,tests,{name,hazard,encounter}={}){
 const key=txt(entry?.id)||`${p?.startMinute}:${p?.terrain}`,getName=name||((id)=>id||'postava');
 const failed=(tests||[]).filter(t=>t.level==='CF'||t.level==='F');
 const has=part=>(tests||[]).some(t=>txt(t.skill).toLowerCase().includes(part));
 const candidates=[];
 const add=(title,question,skill,success,failure)=>candidates.push({title,question,skill,success,failure});
 if((p?.navigationState&&p.navigationState!=='clear')||failed.some(t=>/survival|orient/i.test(t.skill))){
  add('Znovu nalézt směr',pick([
   'Nabídne se nad vršky stromů alespoň vzdálený orientační bod, nebo bude lepší sledovat okraj stezky?',
   'Dokáže někdo porovnat staré stopy s okolní krajinou a odhalit okamžik, kdy se družina odchýlila?',
   'Stojí za to vrátit se k poslednímu jistému místu, nebo je rozumnější vyčkat na jasnější výhled?'
  ],key+':nav'), 'Survival; podle skutečné situace případně Awareness',
   'GM může potvrdit nový orientační bod či vodítko; původní chybná orientace se tím sama nezruší.',
   'Družina může ztratit další čas nebo zvolit opatrnější postup, pouze pokud to GM následně potvrdí.');
 }
 if(hazard?.injuryDetails?.length){
  const one=hazard.injuryDetails[0];
  add('Zastavení u zraněného',pick([
    `Je po nehodě bezpečné ${getName(p?.memberIds?.[0])} dále vést družinu, nebo je třeba nejprve ošetřit zranění?`,
    'Lze v této krajině najít chráněné místo pro ošetření, aniž by se ztratilo spojení se zbytkem skupiny?',
    'Co bude mít přednost: prohlídka rány, zajištění raněného před dalším pohybem, nebo nalezení bezpečného úkrytu?'
   ],key+':injury'), 'Physician / Treatment podle konkrétního zranění a zdravotního postupu',
   `Ošetření může přispět k dalšímu vývoji poranění ${one.code}, pouze pokud je provedeno pravidlovým postupem.`,
   'Nedostatečné ošetření nezakládá automaticky nové zranění; případné zhoršení vyžaduje odpovídající skutečný test či časovaný následek.');
 }
 if(has('animalcraft')||p?.stableAnimalLoad?.length){
  add('Klid koní na další cestě',pick([
   'Bude vedený kůň ochoten pokračovat stejným tempem, nebo si honák raději vybere schůdnější místo?',
   'Jak se změnil rytmus zvířete po náročném úseku a co si honák všiml na jeho chování?',
   'Pomůže opatrnější vedení za uzdu projít úzkým místem, aniž by družina ztratila další čas?'
  ],key+':horse'),'Animalcraft pouze při nové skutečné situaci, kterou GM určí',
   'Zvíře může spolupracovat a držet tempo; bez potvrzení nevzniká mechanická změna.',
   'Váhání může vést k rozhodnutí změnit trasu, nikoli automaticky k pádu či novému úrazu.');
 }
 if(has('tracking')||p?.trackingMemory){
  add('Stopy za hranou dohlednosti',pick([
   'Pokračují otisky za kamenitým nebo tvrdším místem, či je nutné hledat je podél měkčích okrajů?',
   'Dá se z narušené hlíny ještě vyčíst směr pohybu, aniž by si stopař domýšlel nepřítomné znaky?',
   'Je sledovaná stopa stále táž, nebo už mohou její znaky patřit jiné cestě?'
  ],key+':track'),'Tracking (nový test, jen je-li opravdu potřeba)',
   'GM může odhalit další vodítko ke stopě, nikoli zpětně změnit původní hod.',
   'Pokračování stopy může zůstat nejisté a postavy zvolí jiný postup.');
 }
 if(has('foraging')||has('sběr')||p?.kind==='forage'||(p?.travelForaging||[]).length){
  add('Krajina a zásoby',pick([
   'Co nabízí další porost: skutečně užitečné rostliny, nebo jen jejich zdánlivé napodobeniny?',
   'Má smysl hledat další vodu v nižších místech, či pokračovat s již potvrzenými zásobami?',
   'Neztratí se při podrobném sběru tolik času, že bude třeba změnit plán cesty?'
  ],key+':forage'),'Foraging / příslušná dovednost podle GM rozhodnutí',
   'Nový nález by vyžadoval vlastní úspěšné vyhodnocení a skutečné zaevidování zásob.',
   'Bez potvrzeného výsledku se žádné jídlo, voda ani bylina automaticky nepřidávají.');
 }
 if(has('awareness')||p?.trekWatchfulness?.effective==='lax'||p?.kind==='watch'){
  add('Ostraha příštího úseku',pick([
   'Jakými průchody může někdo přijít, aniž by jej družina zahlédla předem?',
   'Která místa kolem dalšího odpočinku lze skutečně hlídat a kde zůstávají slepá místa?',
   'Má někdo převzít bdělou ostrahu, než se výprava vydá dál?'
  ],key+':watch'),'Awareness či volba režimu ostrahy, jen podle pravidlové situace',
   'Úspěšný test může přinést konkrétní poznatek, pokud je ve scéně co odhalit.',
   'Neúspěch neznamená automatické přepadení ani vznik Encounteru.');
 }
 if(p?.kind==='rest'||p?.kind==='sleep'){
  add('Klid před dalším úsekem',pick([
   'Je místo dost chráněné pro přestávku a jaké stopy po odpočinku zůstanou na zemi?',
   'Co je potřeba připravit, aby mohl další přesun začít bez zmatku?',
   'Kdo bude bdít, pokud se družina rozhodne pokračovat v odpočinku?'
  ],key+':rest'),'Bez automatického testu; případně Awareness nebo Survival podle nové situace',
   'GM může potvrdit připravené stanoviště a další plán.',
   'Narušení odpočinku vyžaduje skutečně doloženou událost.');
 }
 if(!candidates.length){
  add('Kam se cesta stočí',pick([
   'Co upoutá pozornost na příštím úseku: změna cesty, vzdálený orientační bod, nebo nové stopy?',
   'Jak bude družina reagovat na měnící se terén, aniž by předčasně předpokládala novou překážku?',
   'Přijde vhod změnit tempo či rozdělit úlohy, než začne další úsek?'
  ],key+':default'),'Podle nově zvolené činnosti může GM zvážit Survival nebo Awareness',
   'Výsledek může objasnit okolí, je-li vůbec relevantní nový test.',
   'Bez potvrzeného hodu se nepřidává další pravidlová komplikace.');
 }
 // Rotate suggestions by the episode's stable identity; avoid one universal
 // checklist repeated in every character's chronicle.
 const start=hash(key+':gm')%candidates.length;
 const rotated=[...candidates.slice(start),...candidates.slice(0,start)];
 return rotated.slice(0,Math.min(3,rotated.length));
}

export function personalChronicleBeats(entry,p,tests,{name,encounter,hazard}={}){
 const key=txt(entry?.id)||`${p?.startMinute}:${p?.kind}`,all=Array.isArray(tests)?tests:[],getName=name||((id)=>id||'Výprava');
 const beats=[],intro=personalChronicleIntro(entry,p);
 intro.forEach((text,i)=>beats.push({kind:'intro',text,group:i}));
 const activityText=chronicleActivity(entry,p,getName);if(activityText)beats.push({kind:'activity',text:activityText});
 const riding=chronicleHorseLead(p,getName);
 if(riding)beats.push({kind:'travel',text:riding+' '+pick([
  'Zvolená činnost vyžadovala držet společné tempo, aniž by ztratil přehled o cestě.',
  'Kroky člověka a zvířete se musely přizpůsobit průchodnosti terénu.',
  'Přesun tak nebyl jen otázkou vzdálenosti, ale také souhry se zvířetem.'
 ],key+':horse')});
 const generic=all.filter(t=>!t.skill?.includes('Survival Hazard')&&!t.skill?.includes('Direction Hazard')&&!t.skill?.startsWith('Endurance ·'));
 for(let i=0;i<generic.length;i++){
  const t=generic[i],part=chronicleTextForTest(t,p,getName,key+':skill:'+t.id+':'+i);
  beats.push({kind:'skill',before:part.pre,test:t,after:part.post});
 }
 const accidentTest=all.find(t=>t.skill==='Survival Hazard');
 if(hazard){
  const accident=hazard.hazard==='accident',time=hazard.when||'';
  const clockTime=/\b(\d{1,2}:\d{2})$/.exec(time)?.[1];
  const at=clockTime?`Ve ${clockTime}`:`V čase ${time||'této epizody'}`;
  const before=accident?pick([
   `${at} se postup náhle přerušil: došlo k cestovní nehodě.`,
   `${at} se rytmus cesty náhle přetrhl. Výpravu zastavila nehoda.`,
   `${at} výpravu zastavila cestovní nehoda. Rytmus přesunu se v tu chvíli změnil.`
  ],key+':hazard-lead'):`${at} nastal ${hazard.hazard==='equipment'?'problém s výbavou':'zaznamenaný cestovní hazard'}.`;
  const injuryCount=hazard.injuryDetails?.length||0;
  const after=accident?injuryCount?
   pick(['Následné vyhodnocení potvrdilo skutečné poranění:', 'Následná zdravotní sekvence zanechala konkrétní výsledek:', 'Herní doklad k této nehodě zachytil zranění:'],key+':hazard-result'):
   'Další poranění se v navázaných dokladech této události nepodařilo potvrdit.':
   hazard.outcome||'Konkrétní pokračování závisí na uloženém vyhodnocení hazardu.';
  const suggestion=accident?pick(hazard.injuries?.length?[
    'Příčinou mohla být zrádná půda, kterou déšť změkčil; přesný průběh pádu však zápis nepopisuje.',
    'Stačil by uklouznutý krok mezi kořeny. Je to možné vysvětlení pro GM, nikoli další potvrzená událost.',
    'Mohla za tím být krátká ztráta rovnováhy na nerovném místě; jistý je až doložený zdravotní výsledek.',
    'Nehoda mohla začít jediným špatně došlápnutým krokem, ale příčinu ponechává záznam otevřenou.'
   ]:[
    'Mohlo jít o přehlédnutou překážku; zápis neobsahuje příčinu ani další tělesný výsledek.',
    'Nerovnost nebo nečekaný pohyb by takovou situaci vysvětlovaly, nejsou však doloženy.'
   ],key+':hazard-why') : '';
  beats.push({kind:'hazard',before,test:accidentTest,after,injuries:hazard.injuryDetails||[],suggestion});
 }else if(accidentTest){
  beats.push({kind:'hazard',before:'Do průběhu cesty vstoupil zaznamenaný Survival Hazard.',test:accidentTest,after:'Navazující následek není v této epizodě doložen samostatným výsledkem.'});
 }
 const directions=all.filter(t=>t.skill?.includes('Direction Hazard'));
 for(const t of directions){
  const lost=txt(p?.direction?.direction)==='lost-time';
  beats.push({kind:'direction',before:pick([
   'Do pokračování cesty promluvil také hod na další vývoj směru.',
   'Ani po tomto okamžiku se otázka směru nevyřešila sama; rozhodl navazující hod.',
   'Další průběh trasy určil samostatný směrový hazard.'
  ],key+':direction-pre'),test:t,after:lost?
  'Nejistý postup si vyžádal další čas a ubraná vzdálenost tak neodpovídala původnímu plánu.':
  `Vyhodnocený směr: ${txt(p?.direction?.direction)||'není určen'}.`});
 }
 const endurance=all.filter(t=>t.skill?.startsWith('Endurance ·'));
 for(const t of endurance){
  const who=chronicleName(getName,t.actorId),actor=(p?.actors||[]).find(a=>a.id===t.actorId),fat=Number(actor?.delta)||0;
  beats.push({kind:'endurance',before:pick([
    `Na konci úseku se ukázalo, kolik sil si ${who} uchoval.`,
    `Teprve závěrečný hod ukázal, jakou únavu cesta přinesla. Na řadě byl ${who}.`,
    `${who} po přesunu posuzoval svou zbývající výdrž.`
   ],key+':endurance:'+t.actorId),test:t,after:fat===0?
    `Další únava nepřibyla; Weariness zůstala na ${actor?.after??actor?.before??'—'}.`:
    `Weariness se změnila z ${actor?.before??'—'} na ${actor?.after??'—'} podle doloženého výsledku.`});
 }
 const ignored=new Set([...generic,...directions,...endurance,accidentTest].filter(Boolean));
 for(const t of all.filter(t=>!ignored.has(t))){
  beats.push({kind:'other',before:`Do této epizody patří i doložený ${t.skill}.`,test:t,after:txt(t.effect)});
 }
 if(encounter){
  beats.push({kind:'encounter',before:pick([
   'Během přesunu zůstávala otevřená i možnost někoho potkat.',
   'Krajina mohla přivést do cesty další postavy, ale o tom rozhodl samostatný hod.',
   'Stezka nabízela možnost setkání, nikoli jeho jistotu.',
   'Někde za dalšími kmeny mohl být kdokoli; skutečnost ale určil až hod na setkání.'
  ],key+':encounter'),encounter,after:encounter.count?
   `Zaznamenáno ${encounter.count} setkání; jejich konkrétní podoba vychází z rozhodnutí GM.`:
   'Žádné setkání se do tohoto úseku cesty nezapsalo.'});
 }
 return beats;
}
