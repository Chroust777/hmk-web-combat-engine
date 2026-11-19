/** Czech travel prose built from the committed episode, with stable variation. */
const list = values => new Intl.ListFormat('cs').format(values);
const unique = values => [...new Set(values.filter(Boolean))];
const number = new Intl.NumberFormat('cs', {maximumFractionDigits:2});
const road = ['paved-road','unpaved-road','rural-track','wilderness-trail'];

function passage(seed, topic, variants) {
 let hash = 2166136261;
 for (const ch of `${seed}:${topic}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
 hash = Math.imul(hash ^ hash >>> 16, 0x7feb352d);
 hash = Math.imul(hash ^ hash >>> 15, 0x846ca68b);
 return variants[((hash ^ hash >>> 16) >>> 0) % variants.length];
}

export function chronicleTravelParty(p, name) {
 const s = p.settings || {}, proof = p.transportProof || {}, vehicle = proof.vehicle, mount = proof.mount;
 const mixed = p.mixedTransport93859 || p.mountRiding93823?.mixedRoles93859;
 const conveyance = vehicle?.conveyance || proof.conveyance || p.conveyance || s.conveyance;
 const people = unique(p.memberIds || []);
 const guide = s.guideId || p.orientation?.guideId;
 const drover = p.orientation?.droverActorId || s.droverActorId || mixed?.primaryDroverId;
 const patients = unique([...(p.transportedMemberIds || proof.memberIds || []), mount?.patientId]);
 const severe = new Set((proof.originalHealth || []).filter(h =>
  h.immobile || h.comaActive || h.extendedShockActive || ['INC','UNC'].includes(h.shock)).map(h => h.id));
 const animals = unique([...(p.stableAnimalLoad || []).map(a=>a.id), ...(p.animals || []).map(a=>a.id),
  ...(vehicle?.teamIds || s.transportTeamIds || []), ...(vehicle?.carriedAnimals || []).map(a=>a.animalId),
  mount?.mountId, p.mountRiding93823?.animalId, mixed?.mountAnimalId]).map(id => {
  const archived = (p.stableAnimalLoad || []).find(a=>a.id===id);
  const animalName = archived?.name || (id===mount?.mountId ? mount.animalName : null) || name(id);
  const ridden = p.mountRiding93823?.animalId===id ? p.mountRiding93823.riderId : mixed?.mountAnimalId===id ? mixed.riderId : null;
  const rider = id===mount?.mountId ? mount.riderId : ridden || archived?.rider;
  const carried = vehicle?.carriedAnimals?.some(a=>a.animalId===id);
  const team = (vehicle?.teamIds || s.transportTeamIds || []).includes(id);
  const handler = carried || team || rider ? null : id===mount?.mountId && mount.handlerPosition==='leading' ? mount.handlerId :
   mixed?.handlers?.find(a=>a.animalId===id)?.handlerId || s['packHandler_'+id];
  return {id, name:animalName, rider, handler, carried, team, passenger:id===mount?.mountId ? mount.patientId : null};
 });
 // The sole loose animal in a walking party can be attributed to its Drover.
 // In a larger herd, only an individual recorded assignment is authoritative.
 const loose = animals.filter(a=>!a.team && !a.carried && !a.rider && !a.passenger);
 if (conveyance==='foot' && people.includes(drover) && loose.length===1 && !loose[0].handler) loose[0].handler=drover;
 return {people, guide, drover, patients, severe, animals, conveyance};
}

function scene(p, say, calendar) {
 const time = Object.entries(p.daylight?.minutesByPeriod || {}).filter(([,minutes])=>minutes>0).sort((a,b)=>b[1]-a[1])[0]?.[0] ||
  p.settings?.lightPeriod;
 const light = {day:'Za denního světla', twilight:'Za šera', night:'Za tmy'}[time];
 const season = {spring:'jaro',summer:'léto',autumn:'podzim',fall:'podzim',winter:'zima'}[p.weather?.season || p.settings?.season] ||
  (calendar?.month>=1 && calendar.month<=12 ? ['jaro','léto','podzim','zima'][Math.floor((calendar.month-1)/3)] : '');
 const place = p.terrain || p.settings?.terrain;
 const ground = road.includes(place)?'path':/forest|wood/.test(place)?'wood':/wetland|swamp/.test(place)?'marsh':
  /hill|mountain|alpine|rock/.test(place)?'hill':/grass|cropland|moor|heath/.test(place)?'open':null;
 const locale = {
  path:['Cesta se vine krajinou a dálka se po ní měří krok za krokem.','Podél cesty má zem dvě tváře: tu blízkou a tu, která za obzorem ještě čeká.','Cesta vpředu mizí z dohledu; dál už oko nedosáhne.'],
  wood:['V lese se dálka měří od kmene ke kmeni.','Mezi kmeny má i blízký kus země svou skrytou stranu.','Les ukazuje z krajiny vždycky jen úzký díl.','Tady končí rozhled tam, kde se mezi sebou zavřou stromy.'],
  marsh:['Mokřina pouští člověka dál jen tam, kde mu zem dá oporu.','V mokřinách má pevný kus země větší cenu než krátká cesta.','V měkké zemi zůstává každý krok déle než v lidské paměti.'],
  hill:['Za jedním svahem se zvedá další.','Zem se tu vzpíná do výšin a zase klesá.','Co odspodu vypadá blízko, má ve svahu docela jinou míru.'],
  open:['V otevřené krajině spočine zrak až na obzoru.','Zem se rozevírá do dálky.','V otevřeném kraji je daleko vidět i daleko jít.']
 }[ground];
 const opening = [];
 if (p.area) {
  opening.push(say('place', [
   `Téhož času dlí družina v kraji zvaném „${p.area}“.`,
   `${light || 'Toho času'} se družina nachází v kraji, jemuž říkají „${p.area}“.`,
   `Kraj, v němž se družina toho času nachází, má jméno „${p.area}“.`,
   `Poutníci jsou toho času v kraji jménem „${p.area}“.`
  ]));
 }
 if (locale && (p.kind==='travel' || ['wood','open'].includes(ground))) opening.push(say('ground', locale));
 else if (light && !p.area) opening.push(say('light', [`${light} se odvíjí tato část příběhu.`,`${light} plyne družině čas.`]));
 const seasonalText={
  jaro:['Zem patří jaru, i když to nebývá na všech místech hned znát.','Toho času je jaro.'],
  léto:['Kalendář už náleží létu.','Je léto a rok je v rozkvětu.'],
  podzim:['Rok se sklání k podzimu.','Do kroniky se tyto chvíle zapisují v podzimním čase.'],
  zima:['V zemi toho času vládne zima.','Tyto řádky patří zimě.']
 }[season];
 if (seasonalText) opening.push(say('season',seasonalText));
 const wet = p.precipitation?.precipitation || p.weather?.precipitation;
 const weather = {
  rain:['Déšť se opírá o zem a všechno zní tlumeněji.','Déšť odměřuje čas po kapkách.','V dešti splývají vzdálené obrysy.','Zvuk deště chvílemi přehluší všechno kolem.'],
  snow:['Sníh padá tiše a bere zemi její ostré obrysy.','Vločky zas a znovu zakrývají to, co před chvílí ještě bylo vidět.','Sněžení přikrývá zemi svým tichým dílem.'],
  sleet:['Z nebe padá déšť se sněhem.','Sníh se mísí s deštěm, jako by se obloha nemohla rozhodnout.','V plískanici má vzduch ostří zimního nože.']
 }[wet] || (p.weather?.hasPrecipitation===true ? ['Obloha je toho času skoupá na suché chvíle.','Z nebe přichází vláha.'] : null);
 if (weather) opening.push(say('weather',weather));
 if (p.precipitation?.continuous===true&&weather) opening.push(say('steady',[
  'Po celý ten čas si obloha nedává oddechu.','Srážky nepolevují od počátku té chvíle až do jejího konce.'
 ]));
 const hazard = p.precipitation?.hazard || (time==='night'?p.weather?.nightHazard:time?p.weather?.daylightHazard:null);
 if (hazard==='cold'||p.weatherHazards?.includes('cold')) opening.push(say('cold',['Silný chlad zalézá pod šat.','Mráz připomíná cenu tepla.','Chlad se hlásí o slovo s každým dechem.']));
 if (hazard==='heat'||p.weatherHazards?.includes('heat')) opening.push(say('heat',['Horko doléhá na člověka jako další náklad.','Ani čas neubíhá v tom horku lehce.','Žár nepovoluje.']));
 return opening.join(' ');
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
 if (!sameGuide && p.movementMinutes!==0 && people.includes(guide) && !patients.includes(guide)) {
  lines.push(say('guide',[
   `Směr udává ${name(guide)}.`,`O tom, kudy dál, rozhoduje ${name(guide)}.`,
   `Průvodcem družiny je toho času ${name(guide)}.`,`Cestu družině ukazuje ${name(guide)}.`
  ]));
 }
 for (const handler of unique(leads.map(a=>a.handler))) {
  const group = leads.filter(a=>a.handler===handler);
  const who = name(handler), beasts=passageName(group);
  lines.push(say('lead:'+handler,[
   `${who} jde pěšky a vede za uzdu ${beasts}.`,
   `Uzdu drží ${who}; ${beasts} ${group.length===1?'kráčí':'kráčejí'} při pěším doprovodu.`,
   `${who} má uzdu v ruce a ${beasts} ${group.length===1?'kráčí':'kráčejí'} po boku.`,
   `${who} zůstává na vlastních nohou, s uzdou v ruce. Tak vede ${beasts}.`,
   `${beasts} ${group.length===1?'kráčí':'kráčejí'} na uzdě, kterou třímá ${who}.`
  ]));
 }
 for (const a of riders) lines.push(say('ride:'+a.id,[
  `${name(a.rider)} jede na zvířeti jménem „${a.name}“.`,
  `Zatímco výprava putuje dál, ${name(a.rider)} zůstává v sedle zvířete jménem „${a.name}“.`,
  `„${a.name}“ nese svého jezdce. V sedle je ${name(a.rider)}.`,
  `V sedle zvířete jménem „${a.name}“ jede ${name(a.rider)}.`
 ]));
 if (['cart','wagon'].includes(conveyance)) {
  const cart = conveyance==='cart', title=cart?'Káru':'Vůz', aboard=cart?'na káře':'na voze';
  lines.push(team.length && p.movementMinutes===0?
   `V zápřahu ${cart?'káry':'vozu'} ${team.length===1?'je':'jsou'} ${passageName(team)}.`:
   team.length?say('team',[
   `${title} ${team.length===1?'táhne':'táhnou'} ${passageName(team)}.`,
   `V zápřahu ${cart?'káry':'vozu'} ${team.length===1?'jde':'jdou'} ${passageName(team)}.`,
   `V zápřahu je ${cart?'kára':'vůz'}; tu práci ${team.length===1?'zastává':'zastávají'} ${passageName(team)}.`,
   `Zapřaženo je na cestu a ${cart?'káru':'vůz'} ${team.length===1?'táhne':'táhnou'} ${passageName(team)}.`
  ]):`Družinu na této cestě provází ${cart?'kára':'vůz'}.`);
  if (team.length && people.includes(drover) && !patients.includes(drover)) lines.push(sameGuide?say('guide-and-drover',[
   `${name(drover)} má na starosti zápřah i směr cesty.`,
   `Kudy se pojede dál a jak se povede spřežení, o tom rozhoduje ${name(drover)}.`,
   `Směr družině udává ${name(drover)} a zároveň dohlíží na zápřah.`
  ]):say('drover',[
   `O spřežení se stará ${name(drover)}.`,`Spřežení má na starosti ${name(drover)}.`,`Dohled nad zápřahem připadá na ${name(drover)}.`
  ]));
  if (patients.length) {
   const many = patients.length>1, who = named(patients);
   const cannotWalk = patients.every(id=>severe.has(id));
   lines.push(p.movementMinutes===0?`Místo ${aboard} má ${who}.`:say('wagon-passenger',[
    `${aboard[0].toUpperCase()+aboard.slice(1)} ${many?'jedou':'jede'} ${who}.`,
    `${who} ${many?'jedou':'jede'} ${aboard}.`,
    `Místo ${aboard} tentokrát připadá na ${who}.`,
    `Družina počítá i s převozem. ${who} ${many?'mají':'má'} místo ${aboard}.`
   ]));
   const injured=patients.filter(id=>severe.has(id)&&priorInjuries.has(id));
   if (cannotWalk&&injured.length===patients.length) lines.push(say('injured-passenger',[
    many?'Po dřívějších zraněních vlastními silami tu cestu neujdou.':'Po dřívějším zranění vlastními silami tu cestu neujde.',
    many?'Už před tímto přesunem utrpěli zranění a nyní sami jít nemohou.':'Zranění přišlo už dříve. Teď bez převozu dál nemůže.',
    many?'Utrpěli zranění už dříve; na vlastní nohy se teď spolehnout nemohou.':'Dřívější zranění patří k příběhu té cesty. Na vlastní nohy se teď spolehnout nemůže.'
   ]));
   else if (cannotWalk) lines.push(say('immobile',[
    `${many?'Vlastními silami tuto cestu ujít nedokážou.':'Vlastními silami tuto cestu ujít nedokáže.'}`,
    `${many?'Na vlastní nohy se teď spolehnout nemohou.':'Na vlastní nohy se teď spolehnout nemůže.'}`,
    `${many?'Bez převozu by se na cestu vydat nemohli.':'Bez převozu by se na cestu vydat nedalo.'}`
   ]));
   else if(injured.length) lines.push(`${named(injured)} ${injured.length===1?'nemůže':'nemohou'} po dřívějším zranění pokračovat pěšky.`);
  }
  if (carried.length) lines.push(`${aboard[0].toUpperCase()+aboard.slice(1)} ${carried.length===1?'vezou také zvíře':'vezou také zvířata'} ${passageName(carried)}.`);
 }
 for (const a of animals.filter(a=>a.passenger)) lines.push(say('mount-passenger:'+a.id,[
  `V sedle zvířete jménem „${a.name}“ je ${name(a.passenger)}${a.rider?'; o doprovod v sedle se stará '+name(a.rider):''}.`,
  `${name(a.passenger)} cestuje v sedle zvířete jménem „${a.name}“${a.rider?'; v sedle jede i '+name(a.rider):''}.`,
  `Zvíře jménem „${a.name}“ slouží k převozu. V sedle ${a.rider?'jedou '+named([a.passenger,a.rider]):'je '+name(a.passenger)}.`
 ]));
 if (!['cart','wagon'].includes(conveyance)) for (const id of patients.filter(id=>severe.has(id))){
  lines.push(priorInjuries.has(id)?`${name(id)} po dřívějším zranění nemůže jít vlastními silami.`:
   `${name(id)} vlastními silami tu cestu ujít nedokáže.`);
 }
 const free = animals.filter(a=>!a.carried && !a.team && !a.rider && !a.passenger && !a.handler);
 if (free.length) lines.push(`S družinou ${free.length===1?'jde i zvíře':'jdou i zvířata'} ${passageName(free)}.`);
 if (p.movementMinutes!==0 && (!conveyance || conveyance==='foot') && !animals.length)
  lines.push(say('foot',['Družina se vydává pěšky.','Poutníci měří cestu vlastními kroky.','Dál se jde po vlastních nohou.']));
 if (patients.length && !['cart','wagon'].includes(conveyance) && !animals.some(a=>a.passenger))
  lines.push(`${named(patients)} ${patients.length===1?'je převáženou osobou':'jsou převáženi'}.`);
 if (p.kind==='travel' && Number(p.movementMinutes)===0 && p.minutes>0)
  lines.push(say('halt',['V tu chvíli cesta stojí. Vzdálenost neubývá.','Družina zůstává na místě, ač čas běží dál.','Ubíhá čas; z cesty však neubude ani krok.']));
 return lines.join(' ');
}

function pursuits(p, name, say) {
 const lines=[], s=p.settings||{}, modes=p.orientation?.modes||{}, watch=p.trekWatchfulness?.effective;
 const forage = p.standaloneForaging?.length ? p.standaloneForaging : p.travelForaging?.length ? p.travelForaging : p.foraging?[p.foraging]:[];
 const trackingLevel = p.trackingMemory?.level;
 const stationary = {
  rest:['Družina si dopřává oddech. Cesta může chvíli počkat.','Teď je čas spočinout a šetřit silami.','Na chvíli se odkládá starost o další kroky.'],
  sleep:['Teď přichází čas spánku.','Družina se ukládá k spánku. Další starosti mohou počkat.','Čas v tomto úseku patří spánku.'],
  winded:['Po námaze přichází chvíle vydechnutí.','Družina zvolňuje a dává tělu čas popadnout dech.','V těchto chvílích jde především o to nabrat dech.']
 }[p.kind];
 if (stationary) lines.push(say('rest',stationary));
 if (p.kind==='tracking' || p.trackingMemory) lines.push(say('tracking',[
  'Teď se nehledí do dálky. O dalším směru může rozhodnout i nepatrná stopa.',
  'Stopa má svou vlastní řeč. Družina se ji snaží číst znak po znaku.',
  'Pozornost se upírá k zemi, kde se hledá pokračování stopy.'
 ]));
 if (['F','CF'].includes(trackingLevel)) lines.push(say('trail-missing',[
  'Ze stopy se tentokrát nepodaří vyčíst, kudy dál.','Pátrání nepřináší jistotu, kudy stopa vede.'
 ]));
 if (['S','CS'].includes(trackingLevel)) lines.push(say('trail-found',[
  'Jednotlivé známky se spojují v čitelnou stopu.','Ze stop v okolí se podaří vyčíst další směr.'
 ]));
 if (p.kind==='watch'||watch==='alert'||modes.vigilance>0||s.mode_vigilance>0) lines.push(say('watch',[
  'Na okolí se dává bedlivý pozor. Každý nezvyklý zvuk stojí za chvíli naslouchání.',
  'Část pozornosti patří tomu, co může přijít zvenčí. Družina drží ostrahu.',
  'Oči a uši zůstávají na stráži.'
 ]));
 else if (watch==='lax'||modes.lax===true) lines.push(say('lax',['Ostraha není soustavná.','Na okolí se dohlíží jen zběžně.','Na stráž v té chvíli zbývá méně pozornosti.']));
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
  const found=forage.flatMap(f=>f.results||[]);
  if(found.length){
   const earned=found.reduce((n,r)=>[n[0]+(r.foodDays||0),n[1]+(r.waterDays||0),n[2]+(r.herbDoses||0)],[0,0,0]);
   const amount=earned.flatMap((quantity,i)=>{
    if(quantity<=0)return [];
    const value=number.format(quantity);
    if(i===2)return [`${value} ${quantity===1?'dávka':!Number.isInteger(quantity)||quantity>=5?'dávek':'dávky'} bylin`];
    const days=quantity===1?'den':!Number.isInteger(quantity)?'dne':quantity<5?'dny':'dní';
    return [`${i===0?'potrava':'voda'} na ${value} ${days}`];
   });
   lines.push(amount.length?`Pátrání něco vynáší. Do zásob přibývá ${list(amount)}.`:say('empty',['Hledání nakonec nic nepřináší.','Družina končí pátrání s prázdnýma rukama.','Tentokrát země žádnou zásobu nevydává.']));
  }
 }
 if(p.kind==='other') lines.push(say('other',['Tato část dne patří jiné společné práci.','Na chvíli se družina věnuje svým záležitostem.']));
 return lines.join(' ');
}

function aftermath(p, name, hazard, say) {
 const lines=[];
 const details=p.hazardDetails?.length?p.hazardDetails:(p.hazardDetail?[p.hazardDetail]:[]);
 for (const h of details.filter(d=>d.hazard==='equipment'||(!d.hazard&&p.survivalHazard==='equipment'))) {
  const item=h.itemName&&h.itemName!==h.itemId?`Výstroj jménem „${h.itemName}“`:'Část výstroje';
  lines.push(say('broken:'+h.itemId,[`${item} vypovídá službu.`,`${item} si žádá pozornost; na cestě už neslouží tak, jak má.`]));
  if(['no-delay','short-delay'].includes(h.result)) lines.push(h.repairProofId&&h.workerId?
   say('repair:'+h.itemId,[`O opravu se úspěšně postará ${name(h.workerId)}.`,`Výstroj dává znovu do pořádku ${name(h.workerId)}.`]):
   'Oprava se daří.');
  if(['long-delay','irreparable'].includes(h.result)) lines.push(say('repair-fail',['Oprava se v tu chvíli nedaří.','Přes vynaloženou práci závada zůstává.']));
  if(h.result==='ignored') lines.push('Výstroj prozatím zůstává bez opravy.');
  if(h.result==='abandoned') lines.push('Poškozená výstroj zůstává za družinou.');
 }
 if(hazard?.hazard==='accident') lines.push(say('accident',[
  'Při té činnosti dojde k nehodě.','Družinu potká nehoda.','Do toho, co má družina v úmyslu, nečekaně zasáhne nehoda.'
 ]));
 if(hazard?.hazard==='complication') lines.push(say('difficulty',[
  'Družině se do cesty postaví překážka.','Věci nejdou tak hladce, jak by si družina přála.','Přijde obtíž, se kterou je třeba se vypořádat.'
 ]));
 const obstacle=details.find(h=>h.hazard==='complication');
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
 for (const [i,wound] of (hazard?.injuryDetails||[]).entries()) {
  const grade={S:'vážné',G:'těžké',M:'lehké'}[wound.code?.[0]?.toUpperCase()];
  const injury=grade?`${grade} poranění`:'poranění';
  const location=wound.site&&wound.site!=='neurčené místo'?` (${wound.site})`:'';
  lines.push(say('injury:'+i,[
   `${wound.who} si z nehody odnáší ${injury}${location}.`,
   `Nehoda zanechá ránu. ${wound.who} utrpí ${injury}${location}.`,
   `${wound.who} utrží ${injury}${location}.`
  ]));
 }
 if(p.navigationRecovered||p.navigationReorientedInWatch) lines.push(say('return',[
  'Družina se vrací na správnou cestu.','Bloudění končí a správný směr je znovu nalezen.','Poutníci znovu nacházejí cestu, kterou hledali.'
 ]));
 else if(p.navigationState==='lost'||p.direction?.direction==='lost') lines.push(say('lost',[
  'Družina ztrácí cestu a správný směr zůstává neznámý.','Družina bloudí; známá cesta je prozatím pryč.','Kudy se vydat dál, není jisté. Poutníci zůstávají ztraceni.'
 ]));
 else if(p.navigationState==='misdirection'||p.direction?.direction==='misdirection') lines.push(say('wrong',[
  'Družina se odchyluje od zamýšlené cesty.','Další kroky vedou jinam, než družina zamýšlela.','Poutníci nabírají mylný směr.'
 ]));
 else if(p.direction?.direction==='lost-time') lines.push(say('lost-time',[
  'Hledání správného směru stojí družinu čas.','Nejistota o směru ukrajuje z času na cestu.','Část času padne na hledání cesty.'
 ]));
 if(p.kind==='travel'&&p.distanceMeters>=1){
  const metres=p.distanceMeters, value=number.format(metres<1000?metres:metres/1000);
  const magnitude=metres<1000?(metres===1?'metr':metres<5?'metry':'metrů'):
   metres===1000?'kilometr':metres%1000?'kilometru':metres<5000?'kilometry':'kilometrů';
  lines.push(say('distance',[
   `Do konce té chvíle urazí družina ${value} ${magnitude}.`,`Z celé cesty jí za tu dobu ubude ${value} ${magnitude}.`,
   `Po té době má družina za sebou ${value} ${magnitude}.`
  ]));
 }
 const tired=(p.actors||[]).filter(a=>a.delta>0).map(a=>a.id);
 if(tired.length) lines.push(say('weariness',[
  `Únava doléhá na tyto účastníky výpravy: ${list(tired.map(name))}.`,
  `Na konci úseku ubude sil. Únavu cítí ${list(tired.map(name))}.`,
  `Cesta si vybírá daň; ${list(tired.map(name))} ${tired.length===1?'pociťuje':'pociťují'} větší únavu.`
 ]));
 return lines.join(' ');
}

export function composeTravelChronicle(entry, p, {name, hazard, calendar, priorInjuries=new Set()}={}) {
 const seed=entry?.id || `${p.startMinute}:${p.endMinute}:${p.kind}`;
 const say=(topic, variants)=>passage(seed,topic,variants);
 const getName=name || (()=>'Nejmenovaný účastník');
 const party=chronicleTravelParty(p,getName);
 const story=[
  ['intro',scene(p,say,calendar)],
  ['travel',p.kind==='travel'?company(p,party,getName,say,priorInjuries):''],
  ['activity',pursuits(p,getName,say)],
  ['aftermath',aftermath(p,getName,hazard,say)]
 ].filter(([,text])=>text);
 return story.length?story.map(([kind,text])=>({kind,text})):[{kind:'intro',text:'Družina tráví tento čas společně.'}];
}
