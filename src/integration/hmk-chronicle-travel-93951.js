import {literaryChronicleIntro} from './hmk-chronicle-literary-93892.js?v=93.959';
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
 const s = p.settings || {}, proof = p.transportProof || {}, vehicle = proof.vehicle, mount = proof.mount;
 const mixed = p.travelOccupancy93956 || p.mixedTransport93859 || p.mountRiding93823?.mixedRoles93859;
 const conveyance = vehicle?.conveyance || proof.conveyance || p.conveyance || s.conveyance;
 const people = unique(p.memberIds || []);
 const guide = s.guideId || p.orientation?.guideId;
 const drover = p.orientation?.droverActorId || s.droverActorId || mixed?.primaryDroverId;
 const patients = unique([...(p.transportedMemberIds || proof.memberIds || []), mount?.patientId]);
 const severe = new Set((proof.originalHealth || []).filter(h =>
  h.immobile || h.comaActive || h.extendedShockActive || ['INC','UNC'].includes(h.shock)).map(h => h.id));
 const animals = unique([...(p.stableAnimalLoad || []).map(a=>a.id), ...(p.animals || []).map(a=>a.id), p.trackingScent?.animalId,
  ...(vehicle?.teamIds || s.transportTeamIds || []), ...(vehicle?.carriedAnimals || []).map(a=>a.animalId),
  mount?.mountId, p.mountRiding93823?.animalId, mixed?.mountAnimalId]).map(id => {
  const archived = (p.stableAnimalLoad || []).find(a=>a.id===id);
  const animalName = archived?.name || (id===mount?.mountId ? mount.animalName : null) ||
   (id===p.trackingScent?.animalId ? p.trackingScent.name : null) || name(id);
  const ridden = mixed?.riders?.find(r=>r.animalId===id)?.riderId || (p.mountRiding93823?.animalId===id ? p.mountRiding93823.riderId : mixed?.mountAnimalId===id ? mixed.riderId : null);
  const rider = id===mount?.mountId ? mount.riderId : ridden || archived?.rider;
  const carried = vehicle?.carriedAnimals?.some(a=>a.animalId===id);
  const team = (vehicle?.teamIds || s.transportTeamIds || []).includes(id);
  const handler = carried || team || rider ? null : id===mount?.mountId && mount.handlerPosition==='leading' ? mount.handlerId :
   mixed?.handlers?.find(a=>a.animalId===id)?.handlerId || (s['packHandler_'+id]?.startsWith('ride:')?null:s['packHandler_'+id]);
  return {id, name:animalName, rider, handler, carried, team, passenger:id===mount?.mountId ? mount.patientId : null};
 });
 // The sole loose animal in a walking party can be attributed to its Drover.
 // In a larger herd, only an individual recorded assignment is authoritative.
 const loose = animals.filter(a=>!a.team && !a.carried && !a.rider && !a.passenger);
 if (conveyance==='foot' && people.includes(drover) && loose.length===1 && !loose[0].handler) loose[0].handler=drover;
 return {people, guide, drover, patients, severe, animals, conveyance};
}

function company(p, party, name, say, priorInjuries) {
 const {people, guide, drover, patients, severe, animals, conveyance} = party;
 const lines = [];
 const team = animals.filter(a=>a.team), carried = animals.filter(a=>a.carried);
 const riders = animals.filter(a=>a.rider && !a.passenger);
 const leads = animals.filter(a=>a.handler);
 const named = ids => list(ids.map(name));
 const passageName = beasts => list(beasts.map(x=>`„${x.name}“`));
 const sameGuide=team.length>0 && guide===drover && p.movementMinutes!==0;
 if (!sameGuide && p.movementMinutes!==0 && people.includes(guide) && !patients.includes(guide) && !leads.some(a=>a.handler===guide)) {
  lines.push(say('guide',[
   `Směr udával ${name(guide)}.`,`O tom, kudy dál, rozhodoval ${name(guide)}.`,
   `Průvodcem družiny byl ${name(guide)}.`,`Cestu družině ukazoval ${name(guide)}.`
  ]));
 }
 for (const handler of unique(leads.map(a=>a.handler))) {
  const group = leads.filter(a=>a.handler===handler);
  const who = name(handler), beasts=passageName(group);
  const guides=handler===guide&&p.movementMinutes!==0;
  lines.push(guides?say('guide-on-reins:'+handler,[
   `${who} měl dvojí starost. Výpravě ukazoval směr a za uzdu vedl ${beasts}.`,
   `Směr určoval ${who}, a přitom pěšky vedl za uzdu ${beasts}.`,
   `${who} vedl pěšky za uzdu ${beasts}. Když přišlo na volbu směru, ostatní se řídili tím, kam ukázal.`
  ]):say('lead:'+handler,[
   `${who} šel pěšky a vedl za uzdu ${beasts}.`,
   `Uzdu držel ${who}. ${beasts} ${group.length===1?'kráčel':'kráčeli'} po boku.`,
   `${who} zůstal na vlastních nohou. Za uzdu vedl ${beasts} a držel se tempa výpravy.`
  ]));
 }
 for (const a of riders) lines.push(say('ride:'+a.id,[
  `${name(a.rider)} jel na zvířeti jménem „${a.name}“.`,
  `Zatímco výprava putovala dál, ${name(a.rider)} zůstával v sedle zvířete jménem „${a.name}“.`,
  `„${a.name}“ nesl svého jezdce. V sedle byl ${name(a.rider)}.`,
  `V sedle zvířete jménem „${a.name}“ jel ${name(a.rider)}.`
 ]));
 if (['cart','wagon'].includes(conveyance)) {
  const cart = conveyance==='cart', title=cart?'Káru':'Vůz', aboard=cart?'na káře':'na voze';
  lines.push(team.length && p.movementMinutes===0?
   `V zápřahu ${cart?'káry':'vozu'} ${team.length===1?'je':'jsou'} ${passageName(team)}.`:
   team.length?say('team',[
   `${title} ${team.length===1?'táhl':'táhli'} ${passageName(team)}.`,
   `V zápřahu ${cart?'káry':'vozu'} ${team.length===1?'šel':'šli'} ${passageName(team)}.`,
   `Do zápřahu ${cart?'káry':'vozu'} ${team.length===1?'patřil':'patřili'} ${passageName(team)}.`,
   `Zapřaženo je na cestu a ${cart?'káru':'vůz'} ${team.length===1?'táhl':'táhli'} ${passageName(team)}.`
  ]):`Družinu na této cestě provází ${cart?'kára':'vůz'}.`);
  if (team.length && people.includes(drover) && !patients.includes(drover)) lines.push(sameGuide?say('guide-and-drover',[
   `${name(drover)} držel dohromady zápřah i směr cesty. Na každém z nich závisel postup druhých.`,
   `Kudy se mělo jet dál a jak vést spřežení, o tom rozhodoval ${name(drover)}.`,
   `Směr družině udával ${name(drover)} a zároveň dohlížel na zápřah.`
  ]):say('drover',[
   `O spřežení se staral ${name(drover)}.`,`Spřežení měl na starosti ${name(drover)}.`,`Dohled nad zápřahem připadl na ${name(drover)}.`
  ]));
  if (patients.length) {
   const many = patients.length>1, who = named(patients);
   const cannotWalk = patients.every(id=>severe.has(id));
   lines.push(p.movementMinutes===0?`Místo ${aboard} má ${who}.`:say('wagon-passenger',[
    `${aboard[0].toUpperCase()+aboard.slice(1)} ${many?'jeli':'jel'} ${who}.`,
    `${who} ${many?'jeli':'jel'} ${aboard}.`,
    `Místo ${aboard} tentokrát připadlo na ${who}.`,
    `Družina počítá i s převozem. ${who} ${many?'mají':'má'} místo ${aboard}.`
   ]));
   const injured=patients.filter(id=>severe.has(id)&&priorInjuries.has(id));
   if (cannotWalk&&injured.length===patients.length) lines.push(say('injured-passenger',[
    many?'Po dřívějších zraněních tu cestu vlastními silami ujít nemohli.':'Stará rána mu nedovolovala ujít tu cestu vlastními silami.',
    many?'Už před tímto přesunem utrpěli zranění a nyní sami jít nemohou.':'Kvůli staré ráně už vlastní nohy na cestu nestačily. Díky povozu však mohla družina putovat pospolu.',
    many?'Utrpěli zranění už dříve; na vlastní nohy se už spolehnout nemohli.':'Zranění je starší než tahle cesta, ale teprve tady je znát, jakou váhu má kousek místa na povoze. Družina může pokračovat společně.'
   ]));
   else if (cannotWalk) lines.push(say('immobile',[
    `${many?'Vlastními silami tuto cestu ujít nedokážou.':'Vlastními silami tuto cestu ujít nedokáže.'}`,
    `${many?'Na vlastní nohy se teď spolehnout nemohou.':'Na vlastní nohy se teď spolehnout nemůže.'}`,
    `${many?'Bez převozu by se na cestu vydat nemohli.':'Bez převozu by se na cestu vydat nedalo.'}`
   ]));
   else if(patients.some(id=>severe.has(id))){
    const immobile=patients.filter(id=>severe.has(id));
    lines.push(`${named(immobile)} ${immobile.length===1?'nemůže':'nemohou'} pokračovat pěšky.`);
   }
  }
  if (carried.length) lines.push(`${aboard[0].toUpperCase()+aboard.slice(1)} ${carried.length===1?'vezou také zvíře':'vezou také zvířata'} ${passageName(carried)}.`);
 }
 for (const a of animals.filter(a=>a.passenger)) lines.push(say('mount-passenger:'+a.id,[
  `V sedle zvířete jménem „${a.name}“ je ${name(a.passenger)}${a.rider?'; o doprovod v sedle se stará '+name(a.rider):''}.`,
  `${name(a.passenger)} cestuje v sedle zvířete jménem „${a.name}“${a.rider?'; v sedle jel i '+name(a.rider):''}.`,
  `Zvíře jménem „${a.name}“ slouží k převozu. V sedle ${a.rider?'jedou '+named([a.passenger,a.rider]):'je '+name(a.passenger)}.`
 ]));
 if (!['cart','wagon'].includes(conveyance)) for (const id of patients.filter(id=>severe.has(id))){
  lines.push(priorInjuries.has(id)?`${name(id)} po dřívějším zranění nemůže jít vlastními silami.`:
   `${name(id)} vlastními silami tu cestu ujít nedokáže.`);
 }
 const free = animals.filter(a=>!a.carried && !a.team && !a.rider && !a.passenger && !a.handler);
 if (free.length) lines.push(`S družinou ${free.length===1?'jde i zvíře':'jdou i zvířata'} ${passageName(free)}.`);
 if (p.movementMinutes!==0 && (!conveyance || conveyance==='foot') && !animals.length)
  lines.push(say('foot',['Družina se vydala pěšky.','Poutníci měří cestu vlastními kroky.','Dál se jde po vlastních nohou.']));
 if (patients.length && !['cart','wagon'].includes(conveyance) && !animals.some(a=>a.passenger))
  lines.push(`${named(patients)} ${patients.length===1?'je převáženou osobou':'jsou převáženi'}.`);
 if (p.kind==='travel' && Number(p.movementMinutes)===0 && p.minutes>0)
  lines.push(say('halt',['V tu chvíli cesta stojí. Vzdálenost neubývá.','Družina zůstává na místě, ač čas běží dál.','Ubíhá čas; z cesty však neubude ani krok.']));
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

function pursuits(p, name, say, {narratedTracking=false}={}) {
 const lines=[], s=p.settings||{}, modes=p.orientation?.modes||{}, watch=p.trekWatchfulness?.effective;
 const forage=forageReceipts(p);
 const trackingLevel = p.trackingMemory?.level;
 const stationary = {
  rest:['Poutníci si dopřávají oddech. Co jim ještě zbývá ujít, nezmizí, a tak je lépe chvíli nic nenutit. Přestávka má cenu právě v tom, že si ji na cestě nelze vzít nazpět.','Na nějaký čas odkládá družina starost o další kroky. Po všem, co člověk musí při cestě sledovat, je úlevou mít chvíli jediný úkol: nabrat síly.','Cesta pro tu chvíli ustupuje odpočinku. O tom, co bude dál, se dá přemýšlet později. Únava má svůj čas a uspěchat jej nedovede ani dobrý průvodce.'],
  sleep:['Tento díl dne patří spánku. Všechno, co si ještě výprava předsevzala, může počkat do procitnutí.','Družina se ukládá ke spánku. I naléhavé věci na chvíli ustupují tomu, co si tělo nedá odříci.','Cesta zůstává na čas stranou. Výprava dává přednost spánku a další kroky přijdou na řadu, až spánek pomine.'],
  winded:['Po námaze přichází chvíle vydechnutí.','Družina zvolňuje a dává tělu čas popadnout dech.','V těchto chvílích jde především o to nabrat dech.']
 }[p.kind];
 if (stationary) lines.push(say('rest',stationary));
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
 if(lines.length&&p.kind==='tracking')lines.push(say('trail-reading',[
  'Je to pomalá práce: číst z věcí, které tu nezůstaly proto, aby je kdokoli našel.',
  'Kdo hledá stopu, musí se spokojit s málem a dobře vážit, co k sobě patří.'
 ]));
 if(lines.length&&['watch','forage'].includes(p.kind))lines.push(say('patience',[
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

export function composeTravelChronicle(entry, p, {name, hazard, calendar, priorInjuries=new Set(),flow}={}) {
 const seed=entry?.id || `${p.startMinute}:${p.endMinute}:${p.kind}`;
 const say=(topic, variants)=>passage(seed,topic,variants);
 const getName=name || (()=>'Nejmenovaný účastník');
 const party=chronicleTravelParty(p,getName);
 const story=[
  ['intro',literaryChronicleIntro(entry,p,calendar).join('\n\n')],
  ['travel',p.kind==='travel'?company(p,party,getName,say,priorInjuries):''],
  ['activity',pursuits(p,getName,say,flow)],
  ['aftermath',aftermath(p,getName,hazard,say,flow)]
 ].filter(([,text])=>text);
 return story.length?story.map(([kind,text])=>({kind,text})):[{kind:'intro',text:'Družina tráví tento čas společně.'}];
}

const actionPhrases={
 survival:[
  'hledal v kraji pevný bod, od něhož by se dalo odměřit, kudy dál.',
  'zkoumal, kam ve skutečnosti vedl průchod před výpravou. Z dálky každá cesta slibovala víc, než bylo možné zjistit zblízka.',
  'musel poskládat několik nepatrných znamení, dřív než se výprava rozhodla, kudy dál.'
 ],
 tracking:[
  'se skláněl k zemi. Jediný otisk mnoho nepověděl, ale ten správný mohl promluvit spolu s dalšími.',
  'hledal pokračování stopy tam, kde v kraji zůstávaly jen útržky cizího pohybu.'
 ],
 awareness:['se zaposlouchal do okolí a hledal v jeho známých zvucích cokoli nezvyklého.',
  'propátrával pohledem místa, která se dala při zběžném pohledu snadno minout.'],
 foraging:['se pustil do hledání zásob. Při té práci měl nejmenší kout krajiny často větší cenu než širý rozhled.',
  'hledal, kde by se dalo přilepšit zásobám výpravy.'],
 agility:['se snažil zvládnout nesnadný pohyb, při němž záleželo na jistotě těla.'],
 climbing:['se pokusil překonat místo, kde pouhý krok nestačil a pohyb musely vést i ruce.'],
 timbercraft:['hledal způsob, jak si poradit s dřevem nebo porostem, který bránil v postupu.'],
 swimming:['se pokusil zdolat vodu vlastními silami.'],
 hideworking:['se pokusil dát koženou výstroj do pořádku.','se té práce ujal. Záleželo na tom, zda se mu podaří vrátit poškozené kůži pevnost.','se pustil do opravy kůže. Teprve při práci mělo vyjít najevo, zda lze závadu napravit.'],
 woodworking:['se ujal opravy dřevěné výstroje.','se pokusil dát dřevěnou součást do pořádku.'],
 textilecraft:['se pokusil napravit poškozenou látku.','se ujal opravy tkané výstroje.'],
 metalcraft:['se ujal práce na kovové součásti.','se pokusil napravit závadu na kovové výstroji.'],
 stealth:['se pokusil projít tiše a ponechat okolí co nejméně znamení o svém pohybu.'],
 endurance:['musel obstát v námaze, kterou si ta chvíle vyžádala.']
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

function travelSkillBeat(entry,p,test,name,party,context=''){
 const skill=String(test.skill||'').toLowerCase();
 const who=travelerName(test,name);
 const say=(topic,choices)=>passage(entry.id,topic+':'+test.id,choices);
 const verdict=outcomes.general[test.level];
 if(context==='weather'){
  const exposure=p.weatherExposure.filter(x=>x.id===test.actorId&&x.exposed);
  const heat=exposure.some(x=>x.kind==='heat'),cold=exposure.some(x=>x.kind==='cold');
  const before=who+(heat&&!cold?' musel snášet žár, který nepolevoval ani s ubývajícími silami.':
   cold&&!heat?' se musel vypořádat s chladem, který si hledal cestu pod šat.':' musel obstát v námaze, kterou přineslo počasí.');
  return {kind:'weather',test,before,after:verdict};
 }
 if(/^endurance · cestovní sr/.test(skill)){
  const actor=p.actors?.find(a=>a.id===test.actorId);
  const delta=Number(actor?.delta);
  return {kind:'endurance',test,before:say('výdrž',[
   who+' ke konci úseku poznal, kolik sil si ta cesta vyžádala.',
   'Když se úsek chýlil ke konci, přišla na řadu výdrž. '+who+' se musel spolehnout na síly, které mu ještě zbývaly.'
  ]),after:Number.isFinite(actor?.after)?'Cestovní únava '+(delta>0?'stoupla na':delta<0?'klesla na':'zůstala na')+' '+actor.after+'.':verdict};
 }
 if(!context&&(p.orientation?.droverSkillId===test.id||/animalcraft|riding/.test(skill))){
  const riding=/riding/.test(skill);
  const beasts=party.animals.filter(a=>riding?a.rider===test.actorId:a.handler===test.actorId||(a.team&&party.drover===test.actorId));
  const names=list(beasts.map(a=>'„'+a.name+'“'));
  const before=riding?who+' se v sedle '+(names?'zvířete jménem '+names+' ':'')+'spoléhal na souhru se zvířetem.':
   names?who+say('otěže',[
    ' při vedení '+names+' hledal míru mezi pevným pokynem a trpělivostí, kterou nešlo uspěchat.',
    ' vedl '+names+' a musel vycítit, kdy přitáhnout a kdy povolit.'
   ]):who+' se soustředil na vedení zvířat, od něhož se odvíjel další postup.';
  return {kind:p.kind==='travel'?'travel':'activity',test,before,after:outcomes.animal[test.level]};
 }
 const family=skillFamily(skill);
 const before=family?who+' '+say(family,actionPhrases[family]):context==='complication'&&skill.includes('animalcraft')?
  who+' se pokusil provést zvířata nesnadným místem.':'';
 return {kind:family==='survival'&&p.kind==='travel'?'travel':'activity',test,before,
  after:before?(outcomes[family]?.[test.level]||verdict):''};
}

/** Attach each roll to its cause by receipt ID, independently of storage order. */
export function chronicleRollStories(entry,p,tests,name,hazard){
 const party=chronicleTravelParty(p,name);
 const sections=[];
 const remaining=new Set(tests);
 const take=predicate=>tests.filter(test=>remaining.has(test)&&predicate(test)).map(test=>{remaining.delete(test);return test;});
 const byIds=ids=>take(test=>test.id&&ids.includes(test.id));
 const details=p.hazardDetails?.length?p.hazardDetails:(p.hazardDetail?[p.hazardDetail]:[]);
 const hazardKinds=['equipment','complication','accident'];
 const incidents=details.filter(h=>hazardKinds.includes(h.hazard||p.survivalHazard));
 const directionIds=details.filter(h=>h.hazard==='misdirection').map(h=>h.directionProofId).filter(Boolean);
 const followups=h=>h.hazard==='equipment'||(!h.hazard&&p.survivalHazard==='equipment')?
  [h.repairProofId||h.evidenceId]:[h.complicationProofId,...(h.complicationProofIds||[]),h.evidenceId];
 const incidentIds=new Set(incidents.flatMap(followups).filter(Boolean));
 const isEnd=test=>/^endurance · cestovní sr/i.test(test.skill);
 const isHazard=test=>/^survival hazard/i.test(test.skill);
 const isDirection=test=>/^direction hazard/i.test(test.skill);
 const isWeather=test=>/^endurance$/i.test(test.skill)&&p.weatherExposure?.some(x=>x.exposed&&x.id===test.actorId);
 const main=take(test=>!isEnd(test)&&!isHazard(test)&&!isDirection(test)&&!isWeather(test)&&!incidentIds.has(test.id)&&!directionIds.includes(test.id));
 const opening=main.map(test=>travelSkillBeat(entry,p,test,name,party));
 sections.push(...opening.filter(beat=>beat.kind==='travel'),...opening.filter(beat=>beat.kind==='activity'));
 const [hazardRoll]=take(isHazard);
 const primary=p.survivalHazard||hazard?.hazard;
 const recordedIncidents=incidents.length?incidents:hazardKinds.includes(primary)?[{hazard:primary}]:[];
 const rolledIncident=Math.max(0,recordedIncidents.findIndex(h=>(h.hazard||primary)===primary));
 for(const [index,detail] of recordedIncidents.entries()){
  const kind=detail.hazard||primary;
  const clock=kind===hazard?.hazard&&Number.isSafeInteger(hazard.absolute)?/\b(\d{1,2}:\d{2})$/.exec(hazard.when||'')?.[1]:null;
  const printed=detail.itemName!==detail.itemId?String(detail.itemName||'').trim():'';
  const item=/^belt pouch(?:,.*)?$/i.test(printed)?'brašně u opasku':printed?'předmětu „'+printed+'“':'výstroji';
  const injuries=kind==='accident'?hazard?.injuryDetails:undefined;
  const before={
   equipment:detail.equipmentDisposition==='no-equipment'||detail.result==='no-equipment'?
    'Nesnáz s výstrojí se nakonec žádného konkrétního kusu nedotkla.':
    passage(entry.id,'závada:'+index,[
     'Do cesty zasáhla závada na '+item+'.',
     'První nesnáz na sebe nenechala čekat. Závada se ukázala na '+item+'.',
     'Pozornost výpravy si vyžádala závada na '+item+'.'
    ]),
   complication:'Dál to nešlo tak hladce jako dosud. Výprava narazila na překážku.',
   accident:clock?'V '+clock+' se rytmus cesty náhle přetrhl. Výpravu zastavila nehoda.':
    'V průběhu cesty se cosi náhle změnilo. Výpravu postihla nehoda.'
  }[kind];
  const outcome=hazardResolution[kind]?.[detail.result];
  const linked=byIds(followups(detail));
  const suggestion=injuries?.length&&(p.precipitation?.precipitation||p.weather?.precipitation)==='rain'?
   'Déšť mohl přispět k nehodě, její přesný průběh však zůstal nedoložený.':'';
  sections.push({kind:'hazard',test:index===rolledIncident?hazardRoll:undefined,before,
   after:linked.length?'':injuries?.length?'Nehoda po sobě zanechala zranění:':outcome,
   injuries:linked.length?undefined:injuries,suggestion:linked.length?undefined:suggestion});
  for(const [position,test] of linked.entries()){
   const beat=travelSkillBeat(entry,p,test,name,party,'complication');
   const who=travelerName(test,name);
   const repair=beat.before||who+' se ujal opravy.';
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
  'Výpravě se nakonec podařilo nalézt správný směr.':directions[direction];
 for(const [i,test] of bearing.entries())sections.push({kind:'direction',test,before:i===0?
  'Nad dosavadním směrem zůstala pochybnost. Teprve další postup měl ukázat, co bude znamenat.':'Přišlo na další zkoušku směru.',
  after:i===bearing.length-1&&!awareness.length?directionEnd:''});
 if(!bearing.length&&!awareness.length&&directionEnd)sections.push({kind:'direction',text:directionEnd});
 for(const [i,test] of awareness.entries()){
  const beat=travelSkillBeat(entry,p,test,name,party);
  sections.push({...beat,kind:'direction',after:[beat.after,i===awareness.length-1?directionEnd:''].filter(Boolean).join(' ')});
 }
 sections.push(...take(isWeather).map(test=>travelSkillBeat(entry,p,test,name,party,'weather')));
 sections.push(...take(isEnd).map(test=>travelSkillBeat(entry,p,test,name,party)));
 // Older records can link an extra proof to an incident without a usable role.
 sections.push(...take(()=>true).map(test=>travelSkillBeat(entry,p,test,name,party)));
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
