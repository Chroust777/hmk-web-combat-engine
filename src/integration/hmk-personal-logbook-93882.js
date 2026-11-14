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
 const sv=numeric(a.sv), stars=numeric(a.svTier?.stars);
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
   effect:`Weariness ${actor.before??'—'} → ${actor.after??'—'}${Number.isFinite(actor.delta)?` (změna ${actor.delta>=0?'+':''}${actor.delta})`:''}`,
   actorId:txt(actor.id),id:`end-${txt(actor.id)}`});
 }
 if(p.survivalHazard&&p.survivalHazard!=='none'){
  tests.push({skill:'Survival Hazard',kind:'Hazard Roll',eml:null,roll:numeric(p.settings?.survivalD10),die:'d10',
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
const activityNames={travel:'Cestování',tracking:'Stopování',forage:'Shánění zásob',watch:'Ostraha',rest:'Odpočinek',sleep:'Spánek',winded:'Klid',other:'Činnost'};
export function personalEpisodeActivities(p){
 const tasks=[];const kind=txt(p?.kind);if(kind!=='travel')return activityNames[kind]||'Činnost';
 const modes=p?.orientation?.modes||{};
 if(Number(modes.foraging)>0||(p.travelForaging||[]).length)tasks.push('sběr zásob');
 if(Number(modes.stalking)>0||Number(p?.settings?.mode_stalking)>0)tasks.push('tichý postup');
 if(Number(modes.vigilance)>0||p?.trekWatchfulness?.effective==='alert')tasks.push('ostraha');
 if(p.trackingMemory)tasks.push('sledování stop');
 if(!tasks.length&&p.trekWatchfulness?.effective==='lax')tasks.push('omezená ostraha');
 if(!tasks.length)tasks.push('postup po trase');
 return 'Cestování – '+tasks.join(', ');
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
const spring=['Na zemi se drží stopy zimní vlhkosti, ale den už patří jaru.','Jaro probouzí krajinu a mění čitelnost cest i stop.','Jarní úsek střídá čerstvý vzduch s proměnlivými podmínkami.','Ve vegetaci je znát začátek nové sezóny.'];
const summer=['Letní den prodlužuje čas využitelný k pohybu.','V létě rozhoduje o tempu i dostupnost stínu a vody.','Letní krajina má svůj vlastní rytmus světla a tepla.','V létě se okolí dá pozorovat za dlouhého dne.'];
const autumn=['Podzimní krajina zakrývá starší stopy vrstvou listí a jehličí.','Podzim mění barvy porostu a zkracuje denní světlo.','Chladnější podzimní vzduch doprovází celou výpravu.','Podzimní úsek staví před družinu jiné podmínky než léto.'];
const winter=['Zimní krajina vyžaduje opatrnější volbu tempa.','V zimě je den kratší a počasí může změnit cestu během chvíle.','Zimní vzduch činí každou zastávku citelnější.','Zimní terén může ztížit čtení stop a nalezení zásob.'];
const terrainVariants={
 forest:['Mezi stromy ubývá dlouhých výhledů; orientace závisí na detailech podrostu.','Koruny stromů tlumí světlo a střídají stíny na cestě.','Lesní půda poskytuje mnoho drobných vodítek, ale žádné není samo o sobě spolehlivé.','Kmeny a hustší porost omezují přímý rozhled.','Pod nohama se mění jehličí, kořeny a pevnější úseky stezky.'],
 urban:['Zástavba mění rytmus úseku; cesta už není jen otázkou otevřeného terénu.','Mezi domy záleží spíše na volbě průchodu než na vzdáleném horizontu.','Okolí nabízí více orientačních bodů, ale také více rozptýlení.'],
 road:['Cesta poskytuje zřetelnou osu postupu a dovoluje sledovat pohyb kolem.','Zpevněná trasa vede dál; pozornost se obrací k okolí a k tempu.','Stopy na cestě se mohou překrývat s pohybem dalších cestujících.'],
 other:['Krajina se před družinou rozvíjí v novém úseku skutečně zaznamenané trasy.','Místní terén určuje, co je vidět a jak snadno lze postupovat.','Podmínky prostředí mění každé rozhodnutí o tempu a pozorování.']};
const verb={travel:['Družina volí krok podle skutečného tempa a průchodnosti úseku.','Průvodce drží směr a ostatní upravují svůj pohyb podle trasy.','Každá část pochodu prověřuje síly cestujících.','Pozornost se přesouvá mezi cestou vpřed a okolním terénem.','Putování vyžaduje průběžně srovnávat směr a skutečný postup.'],
 forage:['Při pátrání po obživě jsou prohledávána dostupná místa v okolí.','Sbírání zásob vyžaduje čas i znalost zdejší krajiny.','Pohled se obrací k půdě, rostlinám a místům, kde lze hledat vodu.','Činnost se soustředí na doložené pokusy nalézt využitelné zdroje.'],
 tracking:['Stopař zkoumá drobné změny povrchu a směr sledovaných znaků.','Důležitá je souvislost mezi jednotlivými stopami, ne jediný otisk.','Sledování postupu vyžaduje zastavovat a znovu porovnávat okolí.','Stopování střídá pečlivé pozorování s rozhodováním o směru.'],
 watch:['Hlídka rozděluje pozornost mezi přístupy a neklid v okolí.','Ostraha se opírá o trpělivost a opakované prohlížení stejných míst.','V průběhu služby se ukazuje, jak náročné je nepřetržitě sledovat krajinu.'],
 rest:['Postava si vyhrazuje čas pro odpočinek v doloženém místě.'],sleep:['Spánek přerušuje ostatní činnost a obnovuje časový rytmus dne.'],other:['Postava se věnuje činnosti zaznamenané v herním kalendáři.']};
function terrainGroup(p){const x=(txt(p?.terrain)+' '+txt(p?.area)).toLowerCase();return /forest|les|wood/.test(x)?'forest':/tashal|město|town|urban|city/.test(x)?'urban':/road|stezk|cest/.test(x)?'road':'other';}
export function personalEpisodeWeather(p){
 const w=p?.weather||{},season=namesSeason[w.season||p?.settings?.season]||'nezjištěné období';
 const precipitation=w.hasPrecipitation===true?'během úseku jsou doložené srážky':w.hasPrecipitation===false?'v této epizodě nebyly doložené srážky':'srážky nejsou doloženy';
 const light=p?.daylight?.lightPeriod||p?.settings?.lightPeriod;
 return `Období: ${season}; ${precipitation}${light==='night'?'; noční úsek':light==='day'?'; denní úsek':''}.`;
}
export function personalEpisodeFlavor(entry,p){
 const season=txt(p?.weather?.season||p?.settings?.season).toLowerCase();const seasonal={spring,summer,autumn,fall:autumn,winter}[season]||['Ráz dne zatím určuje známé prostředí a skutečný herní čas.'];
 const terrain=terrainVariants[terrainGroup(p)];const action=verb[p?.kind]||verb.other;
 const key=`${entry?.id||''}:${p?.startMinute||0}:${p?.kind||''}`;
 const base=[pick(seasonal,key+':season'),pick(terrain,key+':terrain'),pick(action,key+':activity')];
 if(p?.weather?.hasPrecipitation===true)base.push(pick(['Srážky doprovázejí zvolenou činnost a ovlivňují atmosféru celého úseku.','Déšť nebo sněžení podle místních podmínek mění dojem z cesty.','Srážky omezují pohodlí a připomínají, že obloha zůstává součástí výpravy.'],key+':rain'));
 if((p?.travelForaging||[]).length||p?.kind==='forage')base.push(pick(['Při sběru záleží na tom, zda se podaří rozeznat skutečně použitelné zdroje.','Prohledávání porostu střídají krátké chvíle rozhodování, kde má smysl pokračovat.','Okolní vegetace nabízí různé možnosti hledání, ale výsledek určuje doložený hod.'],key+':forage'));
 const herb=txt(p?.settings?.herbName||(p?.travelForaging||[]).find(f=>f.herbName)?.herbName);
 if(herb&&(p?.kind==='forage'||(p?.travelForaging||[]).length))base.push(`Plán hledání se zaměřoval také na bylinu ${herb}; případný skutečný nález vyplývá z doloženého výsledku.`);
 if(p?.kind==='tracking'||p?.trackingMemory)base.push(pick(['Stopy mohou vést dál, nebo se rozplývat mezi podobnými znaky terénu.','Každé nalezené vodítko má smysl teprve ve spojení s ostatními.','Úsilí stopaře se soustředí na udržení souvislé linie sledování.'],key+':tracking'));
 if(p?.kind==='watch'||p?.trekWatchfulness?.effective==='alert')base.push(pick(['Při ostraze se pozornost vrací k okrajům viditelného prostoru.','Hlídka pravidelně sleduje stejná místa, aby zachytila změnu.','Střídání ticha a drobných zvuků udržuje ostrahu v napětí.'],key+':watch'));
 return base.join(' ');
}
export function personalEpisodeEncounter(p){
 const e=p?.encounter;if(!e||typeof e!=='object')return null;
 const chance=typeof e.chance==='number'&&Number.isFinite(e.chance)?(e.chance*100).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' %':null;
 const count=Number.isInteger(e.count)?e.count:e.found?1:0;
 const die=e.format==='hmk-episode-encounter-minute-v1'?'d100':'d10';
 return {chance,die,roll:numeric(e.d100??e.roll),count,detail:count?`${count} setkání evidováno; podrobnosti určuje GM.`:'V tomto úseku nebylo vygenerováno setkání.',format:e.format};
}
export function personalEpisodeHazard(p,displayMinute){
 const hazard=txt(p?.survivalHazard);if(!hazard||hazard==='none')return null;
 const info=p.hazardDetail||p.hazardDetails?.[0]||{},window=info.eventWindow93868||{};
 const absolute=Number.isSafeInteger(window.eventMinute)?window.eventMinute:
  Number.isSafeInteger(info.hazardAtMinute)&&Number.isSafeInteger(p.startMinute)?p.startMinute+info.hazardAtMinute:null;
 const when=Number.isSafeInteger(absolute)?displayMinute(absolute):'čas nehody v intervalu nedoložen';
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
 const outcome=info.result==='irreparable'&&hazard==='equipment'?'Doložený následek: příslušná oprava nebyla úspěšná / předmět nebyl opravitelný.':
  info.complicationSkill&&info.complicationLevel?`Navazující ${info.complicationSkill}: ${info.complicationLevel}.`:
  info.result==='ignored'?'GM ponechal výbavu bez opravy.':
  info.result==='pending-original-skill-combat'?'Následná Agility, pád nebo zranění se dokončuje v samostatné zdravotní sekvenci.':
  info.result?'Evidovaný stav následku: '+info.result+'.':'';
 return {hazard,when,absolute,actual,outcome,example:possibilities[hazard]?pick(possibilities[hazard],`${p.startMinute}:${p.endMinute}:${hazard}:${p.settings?.guideId||''}`):'Příběhové detaily může GM doplnit bez zásahu do pravidlového výsledku.'};
}
export function personalTestConsequence(test,p){
 const skill=txt(test?.skill).toLowerCase(),level=txt(test?.level),failing=level==='CF'||level==='F';
 const existing=txt(test?.effect),generic=/^CF:|^Kritický neúspěch činnosti|^Bez dalšího potvrzeného následku|^Výsledek z dokončené|^Vyhodnotit konkrétní hazard|^Následek viz/.test(existing);
 if(!generic&&existing)return {actual:existing,example:''};
 if(skill.includes('endurance'))return {actual:existing||'Individuální Endurance Roll určuje skutečně uloženou změnu Weariness.',example:''};
 if(skill.includes('hazard'))return {actual:p?.survivalHazard?`Cestovní hazard: ${p.survivalHazard}.`:existing,example:''};
 if(skill.includes('survival'))return {actual:failing?(p?.survivalHazard?`Orientace skončila neúspěchem; navázal cestovní hazard ${p.survivalHazard}.`:'Pokus o orientaci nevyšel; další postup závisí na pravidlovém vyhodnocení pohybu.'):'Výsledek pomohl stanovit přínos orientace pro tento úsek.',example:failing?'GM inspirace: postavy mohly ztratit jistotu ve směru nebo přehlédnout spolehlivý orientační bod.':''};
 if(skill.includes('riding'))return {actual:failing?'Jezdecký pokus nevyšel; ovládání zvířete nebylo tímto testem úspěšně potvrzeno.':'Postava v této situaci úspěšně ovládla jezdecký úkon.',example:failing?'GM inspirace: kůň mohl neochotně zastavit, vyhnout se překážce nebo prudce změnit tempo. Pád není automaticky potvrzen.':''};
 if(skill.includes('tracking')||skill.includes('stopov'))return {actual:failing?'Stopu se nepodařilo bezpečně sledovat.':'Postava zachytila využitelnou souvislost stop; její skutečná hodnota je dána SV.',example:failing?'GM inspirace: otisky mohly splývat, křížit se s jinými nebo mizet na tvrdším povrchu.':''};
 if(skill.includes('animalcraft'))return {actual:failing?'Pokus o práci se zvířetem neuspěl.':'Dovednost Animalcraft byla při této činnosti úspěšná.',example:failing?'GM inspirace: zvíře mohlo nereagovat na známý povel, couvnout nebo přerušit spolupráci. Prodloužení výcviku není automatické.':''};
 if(skill.includes('foraging')||skill.includes('sběr')||skill.includes('potrav'))return {actual:existing||'Výsledek sběru je doložen množstvím ve výpisu zásob.',example:''};
 if(skill.includes('awareness'))return {actual:failing?'Postava nezískala potřebný přehled o okolí.':'Postava úspěšně zaznamenala důležitý znak v okolí.',example:failing?'GM inspirace: drobný pohyb za kmeny mohl zůstat nepovšimnut.':''};
 return {actual:failing?`Test ${test.skill} neuspěl${level==='CF'?' kriticky':''}; samotný výsledek nevytváří neohlášené zranění ani ztrátu vybavení.`:`Test ${test.skill} uspěl; kvalitu určuje případné SV.`,example:failing?'GM inspirace: překážka mohla vyžadovat změnu postupu nebo další čas, pokud to odpovídá konkrétním pravidlům.':''};
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
