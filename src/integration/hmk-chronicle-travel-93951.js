import {knownChronicleCase,novelActor,novelDistance,novelScene} from './hmk-chronicle-novel-93961.js?v=93.962';
import {literaryChronicleIntro} from './hmk-chronicle-literary-93892.js?v=93.961';
/** Czech travel prose built from the committed episode, with stable variation. */
const list = values => new Intl.ListFormat('cs').format(values);
const unique = values => [...new Set(values.filter(Boolean))];
const number = new Intl.NumberFormat('cs', {maximumFractionDigits:2});

function passage(seed, topic, variants) {
 let hash = 2166136261;
 for (const ch of `${seed}:${topic}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
 hash = Math.imul(hash ^ hash >>> 16, 0x7feb352d);
 hash = Math.imul(hash ^ hash >>> 15, 0x846ca68b);
 return variants[((hash ^ hash >>> 16) >>> 0) % variants.length];
}

export function chronicleTravelParty(p, name) {
 const s=p.settings||{}, proof=p.transportProof||{}, vehicle=proof.vehicle, mount=proof.mount;
 const occupancy=p.travelOccupancy93956;
 const mixed=occupancy||p.mixedTransport93859||p.mountRiding93823?.mixedRoles93859;
 const conveyance=vehicle?.conveyance||proof.conveyance||p.conveyance||s.conveyance;
 const wheeled=['cart','wagon'].includes(conveyance);
 const people=unique(p.memberIds||[]);
 const member=id=>people.includes(id)?id:null;
 const guide=member(s.guideId||p.orientation?.guideId);
 const drover=member(mixed?.primaryDroverId||p.orientation?.droverActorId||s.droverActorId);
 const patients=unique([...(p.transportedMemberIds||[]),...(proof.memberIds||[]),mount?.patientId,
  ...(p.actors||[]).filter(a=>a.endNotRequired?.reason==='transported').map(a=>a.id)]).filter(member);
 const severe=new Set((proof.originalHealth||[]).filter(h=>
  h.immobile||h.comaActive||h.extendedShockActive||h.fatigue>=40||['INC','UNC','KIA'].includes(h.shock)).map(h=>h.id));
 const stopped=new Map((p.actors||[]).flatMap(a=>{
  const stop=a.earlyIncapacity||a.endNotRequired;
  return member(a.id)&&['INC','UNC','KIA'].includes(stop?.shock)?[[a.id,stop]]:[];
 }));
 const departed=id=>!stopped.has(id)||(stopped.get(id).activeMovementMinutes??(stopped.get(id).minute-p.startMinute))>0;
 const teamIds=vehicle?.teamIds||s.transportTeamIds||[];
 const animals=unique([...(p.stableAnimalLoad||[]).map(a=>a.id),...(p.animals||[]).map(a=>a.id),p.trackingScent?.animalId,
  ...teamIds,...(vehicle?.carriedAnimals||[]).map(a=>a.animalId),mount?.mountId,p.mountRiding93823?.animalId,mixed?.mountAnimalId,
  ...(mixed?.riders||[]).map(a=>a.animalId),...(mixed?.handlers||[]).map(a=>a.animalId)]).map(id=>{
  const archived=(p.stableAnimalLoad||[]).find(a=>a.id===id);
  const secured=id===mount?.mountId;
  const carried=!!vehicle?.carriedAnimals?.some(a=>a.animalId===id);
  const team=teamIds.includes(id)&&!carried;
  const assignment=String(s['packHandler_'+id]||'');
  const riderEvidence=mixed?.riders?.find(r=>r.animalId===id)?.riderId||
   (mixed?.mountAnimalId===id?mixed.riderId:null)||(p.mountRiding93823?.animalId===id?p.mountRiding93823.riderId:null);
  const rider=carried||team?null:member(secured?(mount.handlerPosition==='leading'?null:mount.riderId||mount.handlerId):
   riderEvidence||(!occupancy&&(assignment.startsWith('ride:')?assignment.slice(5):archived?.rider)));
  const handler=carried||team||rider?null:member(secured&&mount.handlerPosition==='leading'?mount.handlerId:
   mixed?.handlers?.find(a=>a.animalId===id)?.handlerId||(!occupancy&&!assignment.startsWith('ride:')?assignment:''));
  return {id,name:archived?.name||(secured?mount.animalName:null)||(id===p.trackingScent?.animalId?p.trackingScent.name:null)||name(id),
   rider:patients.includes(rider)?null:rider,handler:patients.includes(handler)?null:handler,
   carried,team,passenger:secured?member(mount.patientId):null};
 });
 // A historical walking Drover can only be attributed to one unassigned animal.
 const loose=animals.filter(a=>!a.team&&!a.carried&&!a.rider&&!a.passenger);
 if(!occupancy&&conveyance==='foot'&&drover&&departed(drover)&&!patients.includes(drover)&&loose.length===1&&!loose[0].handler)
  loose[0].handler=drover;
 const walkers=new Set(), aboard=new Set();
 if(p.kind==='travel'){
  const riders=new Set(animals.map(a=>a.rider).filter(Boolean));
  const handlers=new Set(animals.map(a=>a.handler).filter(Boolean));
  for(const id of people){
   if(riders.has(id)||patients.includes(id)||!departed(id))continue;
   if(handlers.has(id)||mixed?.walkingMemberIds?.includes(id)||
    (!occupancy&&(!conveyance||conveyance==='foot'||(conveyance==='mount'&&riders.size>0))))walkers.add(id);
   else if(wheeled&&(occupancy?.vehicleMemberIds?.includes(id)||!occupancy))aboard.add(id);
  }
 }
 return {people,guide,drover,patients,severe,animals,conveyance,walking:walkers,aboard,stopped};
}

export function ledAnimalDescription(animal,animalKind=()=>'',{reins=true,language}={}){
 const kind=animalKind(animal.id);
 const object={
  'tažný kůň':'tažného koně','jezdecký kůň':'jezdeckého koně','kůň':'koně',
  'lehký válečný kůň':'lehkého válečného koně','válečný kůň':'válečného koně','těžký válečný kůň':'těžkého válečného koně',
  'válečný poník':'válečného poníka','vůl':'vola','mezek':'mezka','osel':'osla','velbloud':'velblouda','slon':'slona',
  'strážní pes':'strážního psa','lovecký pes':'loveckého psa','pes krysař':'psa krysaře','dravý pták':'dravého ptáka'
 }[kind]||'zvíře';
 const lead=reins?(kind.includes('kůň')||['válečný poník','mezek','osel'].includes(kind)?'za uzdu ':
  /pes|pták/.test(kind)?'':'za uzdu '):'';
 if(language){
  const declined=knownChronicleCase(animal.name,'accusative',language(animal.id));
  const bridle=reins&&(!kind||/kůň|poník|mezek|osel/.test(kind));
  return (declined||object+' jménem '+animal.name)+(bridle?' za uzdu':'');
 }
 return lead+object+' jménem '+animal.name;
}

function company(p,party,name,say,priorInjuries,animalKind,language){
 const {people,guide,drover,patients,severe,animals,conveyance,walking,aboard}=party;
 const lines=[];
 const team=animals.filter(a=>a.team);
 const wheeled=['cart','wagon'].includes(conveyance);
 const ground=conveyance==='cart'?'na káře':'na voze';
 const halted=p.movementMinutes===0;
 const named=ids=>list(ids.map(name));
 const beasts=rows=>list(rows.map(a=>'„'+a.name+'“'));
 const guides=guide&&!patients.includes(guide)&&!halted&&
  (walking.has(guide)||aboard.has(guide)||animals.some(a=>a.rider===guide));
 if(guides&&(!wheeled||guide!==drover)&&(!language||!animals.some(a=>a.handler===guide))){
  const dative=language&&knownChronicleCase(name(guide),'dative',language(guide));
  lines.push(say('guide',[
   'Cestu výpravě ukazuje '+name(guide)+'.',
   dative?'Volba cesty připadá '+dative+'.':'O dalším směru rozhoduje '+name(guide)+'.'
  ]));
 }
 if(wheeled){
  const vehicle=conveyance==='cart'?'káru':'vůz';
  if(team.length){
   const animal=team[0];
   const instrumental=language&&team.length===1&&knownChronicleCase(animal.name,'instrumental',language(animal.id));
   const plain='V zápřahu '+(conveyance==='cart'?'káry':'vozu')+' '+(team.length===1?'je ':'jsou ')+beasts(team)+'.';
   lines.push(instrumental&&drover&&!halted&&aboard.has(drover)?say('zápřah',[
    plain,'Se zápřahem, v němž je '+animal.name+', zachází '+name(drover)+'.',
    name(drover)+' má na starosti '+vehicle+' s '+instrumental+' v zápřahu.'
   ]):plain);
  }
  if(drover&&!halted&&!patients.includes(drover)&&aboard.has(drover))lines.push(name(drover)+' řídí '+vehicle+
   (guides&&drover===guide?' a zároveň udává směr výpravy.':'.'));
  const passengers=[...aboard].filter(id=>id!==drover);
  if(passengers.length)lines.push('Místo '+ground+' '+(passengers.length===1?'má ':'mají ')+named(passengers)+'.');
  const cartPatients=patients.filter(id=>!animals.some(a=>a.passenger===id));
  if(cartPatients.length)lines.push((cartPatients.length===1?'Převáženou osobou je ':'Převáženými osobami jsou ')+named(cartPatients)+
   '. Výprava pro převoz používá '+(conveyance==='cart'?'káru.':'vůz.'));
  const carried=animals.filter(a=>a.carried);
  if(carried.length)lines.push('Mezi přepravovanými '+(carried.length===1?'je také zvíře ':'jsou také zvířata ')+beasts(carried)+'.');
 }
 if(!halted){
  for(const id of walking){
   const led=animals.filter(a=>a.handler===id);
   const lead=led.length?list(led.map(a=>ledAnimalDescription(a,animalKind,{language}))):'';
   if(lead&&language)lines.push(say('novel-led:'+id,[
    name(id)+' vede '+lead+(id===guide?' a ukazuje, kudy dál.':'.'),
    (id===guide?'Cestu udává ':'Pěšky jde také ')+name(id)+'. Vede '+lead+'.',
    name(id)+(id===guide?' ukazuje cestu a vede ':' jde pěšky a vede ')+lead+'.'
   ]));
   else if(lead)lines.push(say('lead:'+id,[
    name(id)+' jde pěšky a vede '+lead+'.',
    'Pěšky postupuje '+name(id)+'. Při tom vede '+lead+'.'
   ]));
  }
  const otherWalkers=people.filter(id=>walking.has(id)&&!animals.some(a=>a.handler===id));
  if(otherWalkers.length)lines.push(named(otherWalkers)+(otherWalkers.length===1?' jde':' jdou')+' pěšky.');
 }
 for(const animal of animals){
  if(animal.passenger){
   lines.push('V sedle zvířete jménem '+animal.name+' má místo '+name(animal.passenger)+
    (animal.rider?' a v sedle je také '+name(animal.rider):'')+'.');
  }else if(animal.rider){
   const genitive=language&&knownChronicleCase(animal.name,'genitive',language(animal.id));
   const saddle=genitive||'zvířete jménem '+animal.name;
   lines.push(name(animal.rider)+(halted?' zůstává':' jede')+' v sedle '+saddle+'.');
  }
 }
 for(const id of patients.filter(id=>severe.has(id)))lines.push(name(id)+
  (priorInjuries.has(id)?' kvůli dřívějšímu zranění nemůže pokračovat pěšky.':' nemůže tuto cestu ujít vlastními silami.'));
 const free=animals.filter(a=>!a.carried&&!a.team&&!a.rider&&!a.passenger&&!a.handler);
 if(free.length)lines.push('K výpravě patří také '+(free.length===1?'zvíře ':'zvířata ')+beasts(free)+'.');
 if(halted&&p.minutes>0&&!party.stopped.size)lines.push('V tomto úseku výprava zůstává na místě.');
 return lines.join(' ');
}

function forageReceipts(p){
 return p.standaloneForaging?.length?p.standaloneForaging:p.travelForaging?.length?p.travelForaging:p.foraging?[p.foraging]:[];
}
function forageOutcome(p){
 const receipts=forageReceipts(p);
 if(!receipts.length||!receipts.every(r=>Array.isArray(r.results)))return '';
 const totals=receipts.flatMap(r=>r.results).reduce((sum,r)=>
  [sum[0]+(r.foodDays||0),sum[1]+(r.waterDays||0),sum[2]+(r.herbDoses||0)],[0,0,0]);
 const amounts=totals.flatMap((count,i)=>{
  if(count<=0)return [];
  const unit=i===2?(count===1?'dávka':count<5?'dávky':'dávek'):
   count===1?'den':!Number.isInteger(count)?'dne':count<5?'dny':'dní';
  return [i===2?number.format(count)+' '+unit+' bylin':(i===0?'potrava':'voda')+' na '+number.format(count)+' '+unit];
 });
 if(amounts.length)return 'Hledání se nakonec vyplatilo. Do zásob přibylo to, co kraj vydal: '+list(amounts)+'.';
 return receipts.every(r=>r.found===false)?'Pátrání nakonec skončilo bez nálezu.':'';
}

function pursuits(p, name, say, {narratedTracking=false}={},language) {
 const lines=[], s=p.settings||{}, modes=p.orientation?.modes||{}, watch=p.trekWatchfulness?.effective;
 const forage=forageReceipts(p);
 const trackingLevel = p.trackingMemory?.level;
 const stationary = {
  rest:['Poutníci si dopřávají oddech. Co jim ještě zbývá ujít, nezmizí, a tak je lépe chvíli nic nenutit. Přestávka má cenu právě v tom, že si ji na cestě nelze vzít nazpět.','Na nějaký čas odkládá družina starost o další kroky. Po všem, co člověk musí při cestě sledovat, je úlevou mít chvíli jediný úkol: nabrat síly.','Cesta pro tu chvíli ustupuje odpočinku. O tom, co bude dál, se dá přemýšlet později. Únava má svůj čas a uspěchat jej nedovede ani dobrý průvodce.'],
  sleep:['Tento díl dne patří spánku. Všechno, co si ještě výprava předsevzala, může počkat do procitnutí.','Družina se ukládá ke spánku. I naléhavé věci na chvíli ustupují tomu, co si tělo nedá odříci.','Cesta zůstává na čas stranou. Výprava dává přednost spánku a další kroky přijdou na řadu, až spánek pomine.'],
  winded:['Po námaze přichází chvíle vydechnutí.','Družina zvolňuje a dává tělu čas popadnout dech.','V těchto chvílích jde především o to nabrat dech.']
 }[p.kind];
 if (stationary) lines.push(say('rest',language?{
  rest:['Družina hledá chvíli oddechu. Všechna práce teď spočívá v tom, vydržet chvíli v klidu.',
   'Poutníci nechají cestu na chvíli být. Je čas šetřit tím, co ze sil zbývá.',
   'Družina si dopřává klid. Na další kus cesty bude třeba nabrat síly.'],
  sleep:['Na ten čas družina přenechává cestu krajině a ukládá se ke spánku.',
   'Slova i námaha pro tu chvíli ustupují spánku.'],
  winded:['Družina zvolňuje, dokud se dech nevrátí do pravidelného běhu.',
   'Stačí chvíle klidu, aby bylo zase možno nadechnout se bez spěchu.']
 }[p.kind]:stationary));
 if (p.kind==='tracking' || p.trackingMemory) lines.push(say('tracking',[
  'Teď se nehledí do dálky. O dalším směru může rozhodnout i nepatrná stopa.',
  'Stopa má svou vlastní řeč. Družina se ji snaží číst znak po znaku.',
  'Pozornost se upírá k zemi, kde se hledá pokračování stopy.'
 ]));
 if (!narratedTracking&&['F','CF'].includes(trackingLevel)) lines.push(say('trail-missing',[
  'Ze stopy se tentokrát nepodaří vyčíst, kudy dál.','Pátrání nepřináší jistotu, kudy stopa vede.'
 ]));
 if (!narratedTracking&&['S','CS'].includes(trackingLevel)) lines.push(say('trail-found',[
  'Jednotlivé známky se spojují v čitelnou stopu.','Ze stop v okolí se podaří vyčíst další směr.'
 ]));
 if (p.kind==='watch'||watch==='alert'||modes.vigilance>0||s.mode_vigilance>0) lines.push(say('watch',[
  'Na okolí se dává bedlivý pozor. Každý nezvyklý zvuk stojí za chvíli naslouchání.',
  'Část pozornosti patří tomu, co může přijít zvenčí. Družina drží ostrahu.',
  'Oči a uši zůstávají na stráži.'
 ]));
 else if (watch==='lax'||modes.lax===true) lines.push(say('lax',['Víc očí mířilo k zemi před nohama než do stran. Co se dělo mimo cestu, mohlo snadno uniknout pozornosti.','Cesta zabrala většinu pozornosti. Na důkladnou ostrahu zbývalo poskrovnu.','Cesta si žádá tolik pozornosti, že okolí musí na čas zůstat stranou.']));
 if (modes.stalking>0||s.mode_stalking>0) lines.push(say('quiet',[
  'Družina se snaží projít tiše, aby o sobě nedala vědět.','Teď se postupuje potichu a s rozvahou.','Kroky se krotí a spěch musí počkat.'
 ]));
 if (p.kind==='forage'||forage.length||modes.foraging>0||s.mode_foraging>0) {
  const herb=forage.find(f=>f.herbName)?.herbName||s.herbName;
  const goal=herb?`bylina zvaná „${herb}“`:(forage[0]?.target||s.forageTarget)==='herbs'?'léčivé byliny':'potrava či voda';
  lines.push(say('forage',[
   `Také se pátrá po zásobách. Hledá se ${goal}.`,`Má-li krajina něco vydat, stojí za to hledat. Družinu zajímá, zda se najde ${goal}.`,
   `Tentokrát se hledá ${goal}.`
  ]));

 }
 if(p.kind==='other') lines.push(say('other',['Tato část dne patří jiné společné práci.','Na chvíli se družina věnuje svým záležitostem.']));
 if(!language&&lines.length&&p.kind==='tracking')lines.push(say('trail-reading',[
  'Je to pomalá práce: číst z věcí, které tu nezůstaly proto, aby je kdokoli našel.',
  'Kdo hledá stopu, musí se spokojit s málem a dobře vážit, co k sobě patří.'
 ]));
 if(!language&&lines.length&&['watch','forage'].includes(p.kind))lines.push(say('patience',[
  'Čas při takové práci ubíhá jinak. Trpělivost tu má stejnou cenu jako bystré oči.',
  'Spěch by z té práce sňal jen to, oč při ní běží: pozornost k maličkostem.'
 ]));
 return lines.join(' ');
}

function aftermath(p, name, hazard, say, {narratedHazard=false,narratedDirection=false,narratedEndurance=false}={}) {
 const lines=[];
 const details=p.hazardDetails?.length?p.hazardDetails:(p.hazardDetail?[p.hazardDetail]:[]);
 for (const h of narratedHazard?[]:details.filter(d=>d.hazard==='equipment'||(!d.hazard&&p.survivalHazard==='equipment'))) {
  const item=h.itemName&&h.itemName!==h.itemId?`Kus výstroje („${h.itemName}“)`:'Část výstroje';
  lines.push(say('broken:'+h.itemId,[`${item} vypovídá službu.`,`${item} si žádá pozornost; na cestě už neslouží tak, jak má.`]));
  if(['no-delay','short-delay'].includes(h.result)) lines.push(h.repairProofId&&h.workerId?
   say('repair:'+h.itemId,[`O opravu se úspěšně postará ${name(h.workerId)}.`,`Výstroj dává znovu do pořádku ${name(h.workerId)}.`]):
   'Oprava se daří.');
  if(['long-delay','irreparable'].includes(h.result)) lines.push(say('repair-fail',['Oprava se v tu chvíli nedaří.','Přes vynaloženou práci závada zůstává.']));
  if(h.result==='ignored') lines.push('Výstroj prozatím zůstává bez opravy.');
  if(h.result==='abandoned') lines.push('Poškozená výstroj zůstává za družinou.');
 }
 if(hazard?.hazard==='accident'&&!narratedHazard) lines.push(say('accident',[
  'Při té činnosti dojde k nehodě.','Družinu potká nehoda.','Do toho, co má družina v úmyslu, nečekaně zasáhne nehoda.'
 ]));
 if(!narratedHazard&&hazard?.hazard==='complication') lines.push(say('difficulty',[
  'Družině se do cesty postaví překážka.','Věci nejdou tak hladce, jak by si družina přála.','Přijde obtíž, se kterou je třeba se vypořádat.'
 ]));
 const obstacle=narratedHazard?null:details.find(h=>h.hazard==='complication');
 if(obstacle?.result==='reroute') lines.push('Překážka si žádá jinou cestu.');
 if(obstacle?.result==='irreparable') lines.push('Překážku se tentokrát nepodaří překonat.');
 if(['no-delay','short-delay'].includes(obstacle?.result)) lines.push('Překážku se nakonec podaří překonat.');
 if(p.weatherSafeShelter||p.weatherShelteredPCs?.length) lines.push(say('shelter',[
  'Před nepohodou skýtá ochranu přístřeší.','Pod přístřeškem si lze od nepohody ulevit.'
 ]));
 if(p.weatherExposure?.some(x=>x.exposed&&['heat','cold'].includes(x.kind))){
  for(const kind of ['heat','cold']){
   const exposed=p.weatherExposure.filter(x=>x.exposed&&x.kind===kind);
   if(exposed.length)lines.push(`${kind==='heat'?'Horku':'Chladu'} čelí ${list(unique(exposed.map(x=>x.id)).map(name))}.`);
  }
 }
 for (const [i,wound] of (narratedHazard?[]:hazard?.injuryDetails||[]).entries()) {
  const grade={S:'vážné',G:'těžké',M:'lehké'}[wound.code?.[0]?.toUpperCase()];
  const injury=grade?`${grade} poranění`:'poranění';
  const location=wound.site&&wound.site!=='neurčené místo'?` · ${wound.site}`:'';
  lines.push(say('injury:'+i,[
   `${wound.who} si z nehody odnáší ${injury}${location}.`,
   `Nehoda zanechá ránu. ${wound.who} utrpí ${injury}${location}.`,
   `${wound.who} utrží ${injury}${location}.`
  ]));
 }
 if(!narratedDirection&&(p.navigationRecovered||p.navigationReorientedInWatch)) lines.push(say('return',[
  'Družina se vrací na správnou cestu.','Bloudění končí a správný směr je znovu nalezen.','Poutníci znovu nacházejí cestu, kterou hledali.'
 ]));
 else if(!narratedDirection&&(p.navigationState==='lost'||p.direction?.direction==='lost')) lines.push(say('lost',[
  'Družina ztrácí cestu a správný směr zůstává neznámý.','Družina bloudí; známá cesta je prozatím pryč.','Kudy se vydat dál, není jisté. Poutníci zůstávají ztraceni.'
 ]));
 else if(!narratedDirection&&(p.navigationState==='misdirection'||p.direction?.direction==='misdirection')) lines.push(say('wrong',[
  'Družina se odchyluje od zamýšlené cesty.','Další kroky vedou jinam, než družina zamýšlela.','Další kroky vedou jinam, než si výprava předsevzala. O tom, kam tato odchylka zavede, rozhodne až další cesta.'
 ]));
 else if(!narratedDirection&&p.direction?.direction==='lost-time') lines.push(say('lost-time',[
  'Hledání správného směru stojí družinu čas.','Nejistota o směru ukrajuje z času na cestu.','Část času padne na hledání cesty.'
 ]));
 if(p.kind==='travel'&&p.distanceMeters>=1){
  const metres=p.distanceMeters, value=number.format(metres<1000?metres:metres/1000);
  const magnitude=metres<1000?(metres===1?'metr':metres<5?'metry':'metrů'):
   metres===1000?'kilometr':metres%1000?'kilometru':metres<5000?'kilometry':'kilometrů';
  lines.push(say('distance',[
   `Za ten čas výprava urazila ${value} ${magnitude}.`,
   `Když si poutníci sečetli, oč pokročili, napočítali ${value} ${magnitude}.`,
   `O ${value} ${magnitude} byla družina dál.`
  ]));
 }
 const tired=(p.actors||[]).filter(a=>a.delta>0).map(a=>a.id);
 if(tired.length&&!narratedEndurance) lines.push(say('weariness',[
  `${list(tired.map(name))} ${tired.length===1?'si z cesty odnáší':'si z cesty odnášejí'} tíhu, kterou půjde složit teprve s odpočinkem.`,
  `Cesta si bere svou daň. ${list(tired.map(name))} už ${tired.length===1?'má':'mají'} citelně méně sil.`,
  `${list(tired.map(name))} ${tired.length===1?'poznává':'poznávají'}, kolik sil stála tahle cesta.`
 ]));
 return lines.join(' ');
}

export function composeTravelChronicle(entry, p, {name, hazard, calendar, priorInjuries=new Set(),flow,animalKind,language,ordinal}={}) {
 const seed=entry?.id || `${p.startMinute}:${p.endMinute}:${p.kind}`;
 const say=(topic, variants)=>passage(seed,topic,variants);
 const getName=name || (()=>'Nejmenovaný účastník');
 const party=chronicleTravelParty(p,getName);
 const prose=language?novelScene(entry,p,ordinal):literaryChronicleIntro(entry,p,calendar).join('\n\n');
 const tail=language?[aftermath({...p,distanceMeters:0},getName,hazard,say,flow),novelDistance(entry,p)]
  .filter(Boolean).join(' '):aftermath(p,getName,hazard,say,flow);
 const story=[
  ['intro',prose],
  ['travel',p.kind==='travel'?company(p,party,getName,say,priorInjuries,animalKind,language):''],
  ['activity',pursuits(p,getName,say,flow,language)],
  ['aftermath',tail]
 ].filter(([,text])=>text);
 return story.length?story.map(([kind,text])=>({kind,text})):[{kind:'intro',text:'Družina tráví tento čas společně.'}];
}

const actionPhrases={
 survival:[
  'hledá v kraji pevný bod, od něhož by se dalo odměřit, kudy dál.',
  'zkoumá, kam ve skutečnosti vede průchod před výpravou. Z dálky každá cesta slibovala víc, než bylo možné zjistit zblízka.',
  'musí poskládat několik nepatrných znamení, dřív než se výprava rozhodne, kudy dál.'
 ],
 tracking:[
  'se sklání k zemi. Jediný otisk mnoho nepověděl, ale ten správný může promluvit spolu s dalšími.',
  'hledá pokračování stopy tam, kde v kraji zůstávaly jen útržky cizího pohybu.'
 ],
 awareness:['se zaposlouchává do okolí a hledá v jeho známých zvucích cokoli nezvyklého.',
  'prohledává pohledem místa, která se dala při zběžném pohledu snadno minout.'],
 foraging:['se pouští do hledání zásob. Při té práci má i nejmenší kout krajiny cenu.',
  'hledá, kde by se dalo přilepšit zásobám výpravy.'],
 agility:['se snaží zvládnout nesnadný pohyb, při němž záleželo na jistotě těla.'],
 climbing:['se pokouší překonat místo, kde pouhý krok nestačil a pohyb musí vést i ruce.'],
 timbercraft:['hledá způsob, jak si poradit s dřevem nebo porostem, který bránil v postupu.'],
 swimming:['se pokouší zdolat vodu vlastními silami.'],
 hideworking:['se pokouší dát koženou výstroj do pořádku.','se ujímá práce. Záleží na tom, zda se podaří vrátit poškozené kůži pevnost.','se pouští do opravy kůže. Teprve při práci mělo vyjít najevo, zda lze závadu napravit.'],
 woodworking:['se ujímá opravy dřevěné výstroje.','se pokouší dát dřevěnou součást do pořádku.'],
 textilecraft:['se pokouší napravit poškozenou látku.','se ujímá opravy tkané výstroje.'],
 metalcraft:['se ujímá práce na kovové součásti.','se pokouší napravit závadu na kovové výstroji.'],
 stealth:['se pokouší projít tiše a ponechat okolí co nejméně znamení o svém pohybu.'],
 endurance:['musí obstát v námaze, kterou si ta chvíle vyžádala.']
};
const outcomes={
 general:{CS:'Úkon se podařil i v tom, co na něm bylo nejtěžší.',S:'Tentokrát to stačilo.',
  F:'Úsilí tentokrát nestačilo.',CF:'Pokus selhal právě tam, kde na něm nejvíc záleželo.'},
 survival:{CS:'Z několika drobných znamení si výprava odnesla zvlášť jisté vodítko.',
  S:'Znamení poskytla oporu, o niž se dalo při volbě směru opřít.',F:'Odhad neposkytl jistotu, kterou družina hledala.',
  CF:'Znamení se v rozhodující chvíli nepodařilo vyložit. Výprava neměla v odhadu oporu.'},
 tracking:{CS:'I pomíjivé známky se spojily v dobře čitelnou stopu.',S:'Stopa poskytla použitelné vodítko.',
  F:'Jednotlivé otisky tentokrát nedaly spolehlivý směr.',CF:'Pátrání se ocitlo bez jisté stopy.'},
 animal:{CS:'Vedení bylo jisté a souhra tentokrát výborná.',S:'Potřebné souhry se podařilo dosáhnout.',
  F:'Potřebná souhra se tentokrát nedostavila.',CF:'V rozhodující chvíli se potřebnou souhru nepodařilo najít.'}
};
const hazardResolution={
 equipment:{
  'no-delay':'Oprava zabrala a výstroj bylo možné dál používat.',
  'short-delay':'Oprava zabrala, ale cestu na čas zdržela.',
  'long-delay':'Závada zůstala a výpravu čekalo další zdržení.',
  irreparable:'V té chvíli se závadu odstranit nepodařilo. Výstroj zůstala poškozená.',
  ignored:'Výprava ponechala závadu prozatím bez opravy.',
  abandoned:'Poškozený kus výstroje zůstal za výpravou.'
 },
 complication:{
  'no-delay':'Překážka nakonec další postup nezdržela.',
  'short-delay':'Překážku se podařilo překonat, ale stála výpravu čas.',
  'long-delay':'Překážka stála výpravu víc času, než doufala.',
  irreparable:'Překážku se tehdy překonat nepodařilo.',
  reroute:'Výprava proto zvolila jinou cestu.'
 }
};
const directions={
 'lost-time':'Hledání směru ukrojilo z času, který měl patřit cestě.',
 misdirection:'Družina se odchýlila od zamýšlené cesty.',
 lost:'Dosavadní směr se ztratil. Družina zatím nevěděla, kudy se vrátit na správnou cestu.'
};
const travelerName=(test,name)=>(test.actorId&&name(test.actorId))||'Poutník';
const skillFamily=skill=>/survival|orienteer/.test(skill)?'survival':
 /forag|sběr|potrav|zásob/.test(skill)?'foraging':Object.keys(actionPhrases).find(key=>skill.includes(key));

function travelSkillBeat(entry,p,test,name,party,context='',language){
 const skill=String(test.skill||'').toLowerCase();
 const who=travelerName(test,name);
 const say=(topic,choices)=>passage(entry.id,topic+':'+test.id,choices);
 const verdict=outcomes.general[test.level];
 if(context==='weather'){
  const exposure=p.weatherExposure.filter(x=>x.exposed&&(x.proofId?x.proofId===test.id:x.id===test.actorId));
  const heat=exposure.some(x=>x.kind==='heat'),cold=exposure.some(x=>x.kind==='cold');
  const before=who+(heat&&!cold?' čelí žáru, který putování provází.':
   cold&&!heat?' se musí vypořádat s chladem, který si hledal cestu pod šat.':' musí obstát v námaze, kterou přineslo počasí.');
  return {kind:'weather',test,before,after:verdict};
 }
 if(/^endurance · cestovní sr/.test(skill)){
  const actor=p.actors?.find(a=>a.id===test.actorId);
  const delta=Number(actor?.delta);
  if(language){
   if(!Number.isFinite(delta))return {kind:'endurance',test,before:who+' ke konci cesty potřebuje vědět, kolik sil ještě zbývá.'};
   const walking=party.walking.has(test.actorId);
   const before=delta>0?say('román-únava',[
    who+(walking?' už zvedá nohy s větší námahou.':' už cítí, jak se únava hlásí.'),
    who+' má po té námaze méně sil než na začátku.',
    novelActor(test.actorId,name,language,'už pocítil, co ho cesta stála.','už pocítila, co ji cesta stála.','už cítí, kolik sil si cesta vzala.')
   ]):delta<0?who+' má v závěru o něco více sil.':say('román-výdrž',[
    who+(walking?' ještě drží krok jako na začátku.':' má v závěru stejně sil jako na začátku.'),'Síly v té chvíli stačí. '+who+' vydrží dál.'
   ]);
   return {kind:'endurance',test,before};
  }
  return {kind:'endurance',test,before:say('výdrž',[
   who+' ke konci úseku poznává, kolik sil si ta cesta vyžádala.',
   'Když se úsek chýlil ke konci, přišla na řadu výdrž. '+who+' se musí spolehnout na síly, které ještě zbývají.'
  ]),after:Number.isFinite(actor?.after)?'Cestovní únava '+(delta>0?'stoupla na':delta<0?'klesla na':'zůstala na')+' '+actor.after+'.':verdict};
 }
 if(!context&&(p.orientation?.droverSkillId===test.id||/animalcraft|riding/.test(skill))){
  const riding=/riding/.test(skill);
  const beasts=party.animals.filter(a=>riding?a.rider===test.actorId:a.handler===test.actorId||(a.team&&party.drover===test.actorId));
  const names=list(beasts.map(a=>'„'+a.name+'“'));
  if(language){
   const damp=['rain','sleet'].includes(p.precipitation?.precipitation||p.weather?.precipitation);
   const team=beasts.filter(a=>a.team);
   const before=team.length?who+say('román-spřežení',[
    ' vede zápřah a dává pozor, aby náhlá pobídka nezmařila klidný tah.',
    ' hledá pro zápřah stejnoměrný krok. S otěžemi zachází podle toho, jak zvířata táhnou.'
   ]):riding?who+say('román-sedlo',[
    ' se v sedle snaží přizpůsobit kroku zvířete.',' hledá v sedle míru mezi vlastním pohybem a krokem zvířete.'
   ]):who+say('román-vedení',[
    ' při vedení zvířete dává pozor, aby mu nepřekážel každý tah.',damp?
    ' při vedení na mokré cestě nechává zvířeti čas najít pevný krok.':
    ' při vedení střídá pevný pokyn s chvílí, kdy může zvířeti povolit.',
    ' musí při vedení vycítit, kdy pobídnout a kdy chvíli počkat.'
   ]);
   const after=say('román-zvíře-'+test.level,({
    CS:['Souhra je tak jistá, že na pokyn stačí sotva naznačený pohyb.','Na každý pokyn přichází včasná odpověď.'],
    S:['Zvíře se vedení poddává a drží krok.','Tentokrát se daří držet společný krok.'],
    F:['Společný krok se jim v té chvíli najít nedaří.','Té chvíle se vedení nedaří podle úmyslu.'],
    CF:['V rozhodující chvíli se společný krok docela rozpadá.','Pokyny a krok zvířete se v tu chvíli úplně míjejí.']
   })[test.level]||['']);
   return {kind:p.kind==='travel'?'travel':'activity',test,before,after};
  }
  const before=riding?who+' se v sedle '+(names?'zvířete jménem '+names+' ':'')+'spoléhá na souhru se zvířetem.':
   names?who+say('otěže',[
    ' při vedení '+names+' hledá míru mezi pevným pokynem a trpělivostí, kterou nešlo uspěchat.',
    ' vede '+names+' a musí vycítit, kdy přitáhnout a kdy povolit.'
   ]):who+' se soustředí na vedení zvířat, od něhož se odvíjel další postup.';
  return {kind:p.kind==='travel'?'travel':'activity',test,before,after:outcomes.animal[test.level]};
 }
 const family=skillFamily(skill);
 if(language&&family==='survival'&&p.kind==='travel'){
  const landscape=p.terrain?.includes('forest')?'mezi stromy':p.terrain==='wetlands'?'mezi pruhy pevné země':'v okolí';
  const before=who+say('román-směr',[
   ' hledá '+landscape+' znamení, podle něhož se dá držet správný směr.',
   ' se rozhlíží po kraji. Odtud je třeba rozsoudit, kudy dál.',
   ' čte z krajiny, kudy by se měla výprava dát.'
  ]);
  const after=({CS:'Znamení se složí v tak jistou odpověď, že je oč se opřít.',
   S:'Tentokrát má výprava v krajině čeho se držet.',F:'Ze znamení se nedaří vyčíst, kudy dál.',
   CF:'Znamení se pletou jedno přes druhé. Jistý směr z nich výprava nevyčte.'})[test.level]||'';
  return {kind:'travel',test,before,after};
 }

 const before=family?who+' '+say(family,actionPhrases[family]):context==='complication'&&skill.includes('animalcraft')?
  who+' se pokouší provést zvířata nesnadným místem.':'';
 return {kind:family==='survival'&&p.kind==='travel'?'travel':'activity',test,before,
  after:before?(outcomes[family]?.[test.level]||verdict):''};
}

/** Attach each roll to its cause by receipt ID, independently of storage order. */
export function chronicleRollStories(entry,p,tests,name,hazard,formatMinute,{language}={}){
 const party=chronicleTravelParty(p,name);
 const sections=[];
 const remaining=new Set(tests);
 const take=predicate=>tests.filter(test=>remaining.has(test)&&predicate(test)).map(test=>{remaining.delete(test);return test;});
 const byIds=ids=>take(test=>test.id&&ids.includes(test.id));
 const details=p.hazardDetails?.length?p.hazardDetails:(p.hazardDetail?[p.hazardDetail]:[]);
 const hazardKinds=['equipment','complication','accident'];
 const incidents=details.filter(h=>hazardKinds.includes(h.hazard||p.survivalHazard));
 const directionIds=unique([...details.filter(h=>h.hazard==='misdirection').map(h=>h.directionProofId),p.navigationRecoveryAwarenessProofId]);
 const trackingAwareness=p.trackingFollowup?.awarenessSkillId;
 const followups=h=>h.hazard==='equipment'||(!h.hazard&&p.survivalHazard==='equipment')?
  [h.repairProofId||h.evidenceId]:[h.complicationProofId,...(h.complicationProofIds||[]),h.evidenceId];
 const incidentIds=new Set(incidents.flatMap(followups).filter(Boolean));
 const isEnd=test=>/^endurance · cestovní sr/i.test(test.skill);
 const isHazard=test=>/^survival hazard/i.test(test.skill);
 const isDirection=test=>/^direction hazard/i.test(test.skill);
 const isWeather=test=>p.weatherExposure?.some(x=>x.exposed&&(x.proofId?x.proofId===test.id:
  /^endurance$/i.test(test.skill)&&x.id===test.actorId));
 const main=take(test=>!isEnd(test)&&!isHazard(test)&&!isDirection(test)&&!isWeather(test)&&!incidentIds.has(test.id)&&!directionIds.includes(test.id)&&(!trackingAwareness||test.id!==trackingAwareness));
 const opening=main.map(test=>travelSkillBeat(entry,p,test,name,party,'',language));
 sections.push(...opening.filter(beat=>beat.kind==='travel'));
 for(const beat of opening.filter(beat=>beat.kind==='activity')){
  sections.push(beat);
  if(beat.test?.id===p.trackingMemory?.skillId&&trackingAwareness)
   sections.push(...byIds([trackingAwareness]).map(test=>travelSkillBeat(entry,p,test,name,party,'',language)));
 }
 const [hazardRoll]=take(isHazard);
 const primary=p.survivalHazard||hazard?.hazard;
 const recordedIncidents=incidents.length?incidents:hazardKinds.includes(primary)?[{hazard:primary}]:[];
 const rolledIncident=Math.max(0,recordedIncidents.findIndex(h=>(h.hazard||primary)===primary));
 for(const [index,detail] of recordedIncidents.entries()){
  const kind=detail.hazard||primary;
  const clock=kind===hazard?.hazard&&Number.isSafeInteger(hazard.absolute)?/\b(\d{1,2}:\d{2})$/.exec(hazard.when||'')?.[1]:null;
  const printed=detail.itemName!==detail.itemId?String(detail.itemName||'').trim():'';
  const pouch=/^belt pouch(?:,.*)?$/i.test(printed);
  const item=pouch?'brašně u opasku':printed?'předmětu „'+printed+'“':'výstroji';
  const repairItem=pouch?'brašnu u opasku':printed?'výstroj označenou „'+printed+'“':'poškozenou výstroj';
  const injuries=kind==='accident'?hazard?.injuryDetails:undefined;
  const before={
   equipment:detail.equipmentDisposition==='no-equipment'||detail.result==='no-equipment'?
    (language?'Tentokrát se žádná výstroj nepoškodila.':'Nesnáz s výstrojí se nakonec žádného konkrétního kusu nedotkla.'):
    language?passage(entry.id,'román-závada:'+index,[
     (pouch?'Brašna u opasku vypovídá službu.':'Na cestě vypovídá službu '+(printed?'výstroj označená „'+printed+'“':'kus výstroje')+'.'),
     'Teď přichází starost s výstrojí. Závada se ukáže na '+item+'.',
     'Při cestě na sebe upozorní potíž na '+item+'.'
    ]):passage(entry.id,'závada:'+index,[
     'Do cesty zasáhla závada na '+item+'.',
     'První nesnáz na sebe nenechala čekat. Závada se ukázala na '+item+'.',
     'Pozornost výpravy si vyžádala závada na '+item+'.'
    ]),
   complication:'Dál to nešlo tak hladce jako dosud. Výprava narazila na překážku.',
   accident:clock?'V '+clock+' se rytmus cesty náhle přetrhl. Výpravu zastavila nehoda.':
    'V průběhu cesty se cosi náhle změnilo. Výpravu postihla nehoda.'
  }[kind];
  const outcome=language&&kind==='equipment'?({
   'no-delay':'Oprava drží a výstroj může dál sloužit.',
   'short-delay':'Výstroj se podaří spravit. Stojí to kus času, který měl patřit cestě.',
   'long-delay':'Pod rukama zůstává táž závada. Výprava se u ní zdrží.',
   irreparable:'Tuhle závadu se tu spravit nepodaří.',
   ignored:'Výprava tu závadu prozatím nechává být.',
   abandoned:'Poškozená výstroj zůstává za výpravou.'
  })[detail.result]:hazardResolution[kind]?.[detail.result];
  const linked=byIds(followups(detail));
  const suggestion=injuries?.length&&(p.precipitation?.precipitation||p.weather?.precipitation)==='rain'?
   'Déšť mohl přispět k nehodě, její přesný průběh však zůstal nedoložený.':'';
  sections.push({kind:'hazard',test:index===rolledIncident?hazardRoll:undefined,before,
   after:linked.length?'':injuries?.length?'Nehoda po sobě zanechala zranění:':outcome,
   injuries:linked.length?undefined:injuries,suggestion:linked.length?undefined:suggestion});
  for(const [position,test] of linked.entries()){
   const beat=travelSkillBeat(entry,p,test,name,party,'complication',language);
   const who=travelerName(test,name);
   const repair=language?passage(entry.id,'román-oprava:'+test.id,[
    who+' bere do rukou '+repairItem+' a zkouší ji spravit.',
    who+' se pouští do práce. Je třeba spravit '+repairItem+'.',
    novelActor(test.actorId,name,language,
     'se ujal opravy a zkouší dát výstroj do pořádku.',
     'se ujala opravy a zkouší dát výstroj do pořádku.',
     'se ujímá opravy a bere do rukou '+repairItem+'.')
   ]):beat.before||who+' se ujímá opravy.';
   sections.push({...beat,kind:'hazard',before:kind==='equipment'?repair:beat.before,
    after:position===linked.length-1?(injuries?.length?'Nehoda po sobě zanechala zranění:':outcome||beat.after):beat.after,
    injuries:position===linked.length-1?injuries:undefined,suggestion:position===linked.length-1?suggestion:undefined});
  }
 }
 if(hazardRoll&&!recordedIncidents.length)sections.push({kind:'hazard',test:hazardRoll,before:'V té části cesty došlo na zkoušku nenadálých nesnází.'});
 const forageResult=forageOutcome(p);
 if(forageResult)sections.push({kind:'activity',text:forageResult});
 const bearing=take(isDirection);
 const awareness=byIds(directionIds);
 const direction=p.direction?.direction||p.navigationState;
 const directionEnd=p.navigationRecovered||p.navigationReorientedInWatch?
  'Výpravě se nakonec podařilo nalézt správný směr.':language&&direction==='lost-time'?
   passage(entry.id,'román-hledání',[
    'Hledání směru stálo výpravu chvíli, kterou už cestě nikdo nevrátí.',
    'Část času, který měl patřit cestě, padla na hledání směru.',
    'O kus času je cesta delší. Výprava jej strávila hledáním směru.'
   ]):directions[direction];
 for(const [i,test] of bearing.entries())sections.push({kind:'direction',test,before:i===0?
  (language?'Zbývá rozsoudit, kudy dál povede cesta.':'Nad dosavadním směrem zůstala pochybnost. Teprve další postup měl ukázat, co bude znamenat.'):
  (language?'Výprava znovu hledá v kraji pevné vodítko.':'Přišlo na další zkoušku směru.'),
  after:i===bearing.length-1&&!awareness.length?directionEnd:''});
 if(!bearing.length&&!awareness.length&&directionEnd)sections.push({kind:'direction',text:directionEnd});
 for(const [i,test] of awareness.entries()){
  const beat=travelSkillBeat(entry,p,test,name,party,'',language);
  sections.push({...beat,kind:'direction',after:[beat.after,i===awareness.length-1?directionEnd:''].filter(Boolean).join(' ')});
 }
 sections.push(...take(isWeather).map(test=>travelSkillBeat(entry,p,test,name,party,'weather',language)));
 for(const [id,stop] of party.stopped){
  const time=formatMinute&&Number.isSafeInteger(stop.minute)?' V zápisu je uveden čas '+formatMinute(stop.minute)+'.':'';
  const consequence=stop.shock==='KIA'?'Při tomto úseku umírá '+name(id)+'.':
   stop.activeMovementMinutes===0||stop.minute===p.startMinute?
    name(id)+' v tomto úseku od počátku nemůže pokračovat vlastními silami.':
    name(id)+' během úseku ztrácí schopnost pokračovat vlastními silami.';
  const exact=language&&time?/\b(\d{1,2}:\d{2})\b/.exec(time)?.[1]:'';
  const novelStop=stop.shock==='KIA'?name(id)+' při cestě umírá.':
   stop.activeMovementMinutes===0||stop.minute===p.startMinute?name(id)+' od počátku nemůže jít vlastními silami.':
    name(id)+' už nemůže dál vlastními silami.';
  sections.push({kind:'hazard',text:language?(exact?'V '+exact+' se cesta pro jednoho z výpravy mění. ':'')+novelStop:consequence+time});
 }
 sections.push(...take(isEnd).map(test=>travelSkillBeat(entry,p,test,name,party,'',language)));
 // Older records can link an extra proof to an incident without a usable role.
 sections.push(...take(()=>true).map(test=>travelSkillBeat(entry,p,test,name,party,'',language)));
 return sections;
}

// Use immutable receipts and GM decisions. A resolved plan appears on its
// actual scheduled date, even when the GM confirms it later.
export function campaignBookChapters953(episodes,plans,observations,legacy=[]){
 const encounters=new Map();
 for(const row of observations){
  const receipt=row.calendarEpisodeEncounterGM93902;
  if(!receipt)continue;
  const key=receipt.sourceId;
  const known=encounters.get(key)||new Map();
  known.set(receipt.index,receipt);encounters.set(key,known);
 }
 const all=episodes.map(row=>({type:'episode',minute:row.calendarTimeEpisode.startMinute,row}));
 for(const item of all.slice()){
  const episode=item.row.calendarTimeEpisode,confirmed=encounters.get(item.row.id);
  const sourceDetails=episode.encounterDetails||[];
  const count=episode.encounter?.count??(episode.encounter?.found?1:0);
  const seen=new Set();
  for(const details of sourceDetails){
   seen.add(details.i);
   const receipt=confirmed?.get(details.i),record=receipt||details;
   const eventMinute=receipt?.eventMinute??record.eventMinute;
   all.push({type:'encounter',minute:eventMinute??episode.endMinute,timeKnown:Number.isSafeInteger(eventMinute),
    episode,record,note:receipt?.input?.note||details.note||'',number:details.i+1});
  }
  for(let i=0;i<count;i++)if(!seen.has(i))
   all.push({type:'encounter',minute:episode.endMinute,timeKnown:false,episode,record:{},note:'',number:i+1});
 }
 for(const plan of plans)if(plan.status==='resolved')all.push({type:'event',minute:plan.dueMinute,plan});
 for(const row of legacy)all.push({type:'legacy',minute:row.campaignMinute,row});
 const days=new Map();
 for(const item of all.filter(it=>Number.isSafeInteger(it.minute)&&it.minute>=0).sort((a,b)=>a.minute-b.minute)){
  const day=Math.floor(item.minute/1440);
  if(!days.has(day))days.set(day,[]);
  days.get(day).push(item);
 }
 return [...days.values()];
}
