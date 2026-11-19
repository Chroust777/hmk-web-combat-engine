// Original Czech prose. Jirásek's travel chapters suggested keeping landscape
// concrete and showing its bearing on the travellers' next action.
const terrainGroups = {
 'needleleaf-forest':'needles','coniferous-forest':'needles','cold-woodland':'needles',
 'mixed-forest':'wood','mixed-woodland':'wood','broadleaf-forest':'wood','wilderness-trail':'trail',
 'paved-road':'paved','unpaved-road':'road','rural-track':'road','cropland-grassland':'fields','cropland-pasture':'fields',grassland:'fields',
 'heath-moor':'moor',wetlands:'marsh',swamp:'marsh',hills:'hills',mountains:'mountains',
 'alpine-vegetation':'mountains','ice-snow-rockfield':'stone',dunes:'sand','desert-flats':'stone'
};
const terrain = {
 needles:['Stezka mizí mezi kmeny vždycky jen o kus napřed.','Pod jehličím vystupují kořeny jako příčky žebříku.','Pod korunami jehličnanů leží zem v stínu i tam, kde se les rozestupuje.','Mezi kořeny a kamením se vine úzký pruh udusané země.'],
 wood:['Pod stromy zbývá z širého kraje sotva to, co se vejde mezi dva kmeny.','Lesní půda mění barvu podle toho, kde na ni dolehne světlo.','Podél stezky se střídá vysoký les s mlázím.','V houští by se cesta ztratila docela, kdyby ji neprozrazovala udusaná zem.'],
 trail:['Stezka je v zemi zapsána tak mělce, že ji místy přebíjí porost.','Po stranách stezky sahá porost až do cesty.','Stezka se před očima ztrácí a o něco dál zase vystupuje.','Kraj se tu ukazuje po útržcích, jak se stezka stáčí dál.'],
 paved:['Kameny v cestě jsou uprostřed ohlazené. Po stranách si v jejich spárách dělá místo tráva.','Podél kamenů na kraji cesty se táhne pruh měkké země.','Cestu prozrazuje pravidelný pás kamene, i když okolní kraj mění tvář.','Některé kameny sedí v cestě zpola pohřbené a jiné vystupují nad zem.'],
 road:['V koleji po vozech se drží všechno, co cesta nepustí do stran.','Tam, kde se koleje sbíhají, je zřetelně vidět, kolik vozů tudy už projelo.','Za každým ohybem se vynoří další kus uježděné cesty.','Na okraji kolejí zbývá jen úzký pruh pro pěší.'],
 fields:['V otevřeném kraji je vidět daleko. Co však leží těsně při zemi, skrývá tráva.','Porost je nízký a oko má před sebou víc země, než kolik jí lze brzy přejít.','Nad zemí je otevřené nebe a každý hrb krajiny je dobře znát.','Tráva přikrývá mělčí nerovnosti a větší se rýsují už z dálky.'],
 moor:['Nízký porost leží při zemi a pod ním se místy černá hlína.','Obzor je prostý a bez mnoha znamení, jichž by se dalo držet.','Mezi nízkými keříky vystupují místa, kde země zůstala holá.','Na vřesovišti se každé vyvýšené místo ukazuje dlouho předem.'],
 marsh:['Mezi trsy trávy se lesknou místa, kam by nebylo radno stoupnout bez rozmyslu.','Pod nízkou zelení místy prosvítá voda.','Z mokřadní půdy vystupují ostrůvky pevnější země.','Co se zdálky tváří jako souvislý drn, dělí zblízka úzké proužky vody.'],
 hills:['Kraj se zvedá v záhybech a dálka se ukazuje vždy až nad tím nejbližším.','Vrchy se kryjí jeden za druhým. Kolik jich je, pořád odtud není poznat.','Pod svahy se kraj na krátkou chvíli otevírá a pak se zase svírá.','Zlom svahu odděluje to, co se dá pozorovat odtud, od toho, co dosud zůstává stranou.'],
 mountains:['Úbočí se zdvíhá vysoko a každá prohlubeň v něm má vlastní stín.','Kde se svah láme, ukazuje se mezi půdou živý kámen.','Nahoře vystupují obrysy hor a pod nimi se kraj tísní v záhybech.','Zpod kamenů vystupuje jen řídká zeleň. Na svahu je jí po troškách.'],
 sand:['Na hřbetech dun je písek světlý. V jejich úpatí má barvu stínu.','Písek srovnává drobné nerovnosti a ty velké nechává zřetelně před očima.','Za nejbližším písečným hřbetem se obzor skládá nanovo.','V sypké zemi mají i dobře viditelné stopy měkký okraj.'],
 stone:['Po holé zemi vystupují hrany kamene.','Mezi kameny leží mělké prohlubně, sotva postřehnutelné z dálky.','Tady i nízký balvan na holé pláni vystupuje zdaleka.','V otevřené krajině prozrazují nerovnosti především úzké pruhy stínu.'],
 general:['Nejbližší kus kraje se dá přehlédnout jediným pohledem. Dál už je třeba hledět pozorněji.','Přímo před výpravou se dají číst i drobnosti, které z dálky splývají.','Co leží dál, ukazuje se po částech, jak to dovoluje kraj.','Obrysy okolí postupně odkrývají, co z dálky zůstávalo skryto.']
};
const terrainDetails = {
 needles:[
  'Kmen od kmene se mění dálka, do níž je odtud vidět.',
  'Zem pod jehličnany je samý kořen. Jeden se skrývá pod jehličím, druhý trčí napříč.',
  'Cesta si mezi kmeny podržela sotva tolik místa, kolik potřebuje.',
  'Ke stranám se zem zvedá ke kořenům. Uprostřed zůstává pruh, po němž se dá projít.'
 ],
 wood:[
  'Nejnižší větve sahají skoro k zemi. Za nimi už je vidět jen další porost.',
  'Mezi místy, kde stromy rostou nahusto, jsou i volná místa, ale z dálky je není znát.',
  'Podél cesty bývá vidět hlavně zem a nejbližší řadu kmenů.',
  'Nad mezerami v porostu se znovu zavírají koruny stromů.'
 ],
 marsh:[
  'Z vody vyčnívají stébla a mezi nimi se ukazuje tmavá zem.',
  'Pevná zem je tu vzácná a i ta se ukazuje po kouscích.',
  'Někde je vidět holá voda, jinde její hladinu prozrazuje sotva několik stébel.',
  'Za nejbližším pruhem pevné země už začíná měkký kraj mokřin.'
 ],
 trail:[
  'Na místech, kde stezka mizí pod porostem, se dá poznat podle udusané hlíny.',
  'Podél pěšiny se zem mění jen o málo. Právě v tom málu je třeba hledat pokračování.',
  'Pěšina je místy tak mělká, že se ukazuje až těsně pod nohama.',
  'Stezka má sotva patrné okraje. Zem po obou stranách už náleží porostu.'
 ],
 paved:[
  'Spáry mezi kameny se táhnou šikmo přes cestu.',
  'Dlažba je tu složená z kamenů nestejné výšky.',
  'Po krajích dlažby už kameny vykukují z měkké půdy jen zpola.',
  'Nejhladší místa v kameni ukazují, kudy se chodívá.'
 ],
 road:[
  'Koleje se při okraji ztrácejí v měkké zemi.',
  'Vysoký prostředek cesty dělí jednu kolej od druhé.',
  'Uježděná zem sahá až k okraji cesty.',
  'Místy vystupují z hlíny kameny, které kola zatlačila jen napůl.'
 ],
 fields:[
  'Vysoké stéblo se v otevřeném kraji ukazuje zdaleka.',
  'V trávě se prozrazují mělká místa, kde je porost o něco řidší.',
  'Z nízkého porostu vystupují hrboly země.',
  'V otevřeném kraji je sotva kde schovat pohled před dálkou.'
 ],
 moor:[
  'Pod nízkými keříky je znát holá zem.',
  'Nízký porost mění barvu od jednoho návrší ke druhému.',
  'Místy se na vřesovišti ukáže světlý kámen.',
  'Vřes se drží při zemi i tam, kde se kraj zvedá.'
 ],
 hills:[
  'Jeden svah zakrývá druhý a mezi nimi se kraj na chvíli ztrácí.',
  'Přes rameno nejbližšího vrchu vystupují další obrysy.',
  'Pod návrším se obzor přibližuje, nad ním se znovu otevírá.',
  'Na zlomu svahu má zem jiný sklon, než se zdálo z dálky.'
 ],
 mountains:[
  'Pod svahy zůstává nebe vidět jen tam, kde se hory rozestoupí.',
  'Na úbočí leží kamení nepravidelně, drobné mezi velkým.',
  'Hřeben hor je zřetelný. To, co leží pod ním, se ztrácí v záhybech.',
  'Po úbočí se zdálky dají sledovat dlouhé, nepravidelné pruhy kamene.'
 ],
 sand:[
  'Písek se pod dunami sype z prudších ploch na mírnější.',
  'Pod hřbetem duny je vidět, jak jemně se rozlévá písek.',
  'Čáry v písku mizí na strmější straně duny.',
  'Některé hřbety dun jsou hladké, jiné se na kraji drolí.'
 ],
 stone:[
  'V nízkých kamenných hranách se povrch láme na každém kroku.',
  'Mezi balvany bývají prohlubně, z dálky takřka neviditelné.',
  'Kamenitá zem má zblízka mnohem hrubší tvář.',
  'Největší kameny prozrazují ráz půdy, menší ukáže teprve blízkost.'
 ],
 general:[
  'V dálce se drobné rozdíly ztrácejí. Zblízka jich má zem na rozdávání.',
  'Co leží při zemi, ukazuje teprve bližší pohled.',
  'Tvar kraje určují drobné nerovnosti. Některé jsou znát teprve zblízka.',
  'Nejbližší kus země se zdá docela prostý, dokud si ho člověk neprohlédne pozorněji.'
 ]
};
const nightTerrain = {
 needles:'Mezi nejbližšími kmeny se od sebe stíny sotva dají rozeznat.',
 wood:'Za tmy se okraj lesa dá spíš tušit než rozeznat.',
 marsh:'Kde končí pevná zem a začíná mokřina, se ve tmě těžko pozná.',
 general:'Ve tmě se kraj ukazuje jen v hrubých obrysech.'
};
const nightDetails = [
 'V šeru už drobné nerovnosti splývají s okolím.',
 'Co leží dál po stranách, je vidět čím dál hůř.',
 'Za nejbližšími obrysy zůstává kraj skrytý.',
 'Tady se ve tmě nedá spoléhat na první pohled.',
 'Nejvíc je znát vždycky to, co leží nejblíž.',
 'Dálka se ztrácí ve tmě a blízké věci vystupují jen po částech.',
 'Blízká znamení se ještě dají rozeznat. Ta vzdálenější už mizí.'
];
const travelFocus = [
 'Výprava má před sebou vždycky jen ten kus cesty, který se jí právě ukazuje.',
 'Jaký bude další kus cesty, ukáže vždy až pohled zblízka.',
 'Než se výprava dostane dál, musí se nejdřív vyznat v tom, co má před sebou.',
 'Záleží na malých znameních. Těch velkých má tenhle kus cesty poskrovnu.'
];
const trackingFocus = [
 'Při hledání stopy je nutné číst zem pomalu.',
 'Jediné znamení mnoho nepoví. Teprve druhé ukáže, zda spolu souvisejí.',
 'Co člověk v chůzi mine, může při stopování rozhodnout o směru.',
 'Nejvíce pozornosti si žádají místa, kde stopa slábne.'
];
const forageFocus = [
 'Kdo tu hledá něco k užitku, musí se dívat i tam, kam cesta sama nevede.',
 'Každý kus země je třeba při hledání prohlédnout zvlášť.',
 'Pozornost teď patří tomu, co může krajina výpravě poskytnout.',
 'Pátrání se řídí tím, co nabízí nejbližší okolí.'
];
const watchFocus = [
 'Při hlídce lze dojít k jistotě jen po malých znameních.',
 'Ostraha patří hlavně tomu, co se může přiblížit od kraje.',
 'Při hlídání stojí za pozornost i ten nejmenší jiný zvuk.',
 'Hlídka má čas rozeznat, které zvuky patří k okolí.'
];
const sleepFocus = [
 'V čase spánku se síly vracejí pomalu.',
 'Na chvíli zůstává vše, co ještě čeká, stranou.',
 'Po tu dobu má přednost spánek.',
 'Cesta a práce musí prozatím počkat.'
];
const restFocus = [
 'Při oddechu zbývá na okolí víc pozornosti.',
 'Zastavení dává čas všimnout si věcí, které v chůzi snadno unikají.',
 'Pro tu chvíli je dost času vnímat, co se děje blízko.',
 'Spěch v těchto chvílích ustupuje klidu.'
];
const weatherLines = {
 rain:['Kapky dopadají jedna za druhou a z jejich šumu se jen občas vyloupne jiný zvuk.','Déšť stírá vzdálené obrysy. Co je potřeba rozeznat, musí být blízko.','V dešti má zem všude tmavší barvu.','Voda hledá na zemi nejnižší místa a tam se jí po kapkách sbírá čím dál víc.'],
 snow:['Sníh po troškách zakrývá drobná znamení na zemi.','Vločky přicházejí z bílé dálky a bílou dálku za sebou nechávají.','Sníh plní mělké prohlubně dřív než ty hlubší.','Co před chvílí vystupovalo ze země, ztrácí pod sněhem obrys.'],
 sleet:['Mokrý sníh se sotva dotkne země a už se mění ve vodu.','Místy dopadá na zem vločka, místy těžká kapka.','Z nebe padá déšť se sněhem a všechno na dosah vlhne.','Po chvilce zůstane z mokrých vloček na šatu jen chlad a voda.'],
 unknown:[
  'Daleko odtud už nelze drobné věci rozeznat.',
  'Co je nablízku, má své barvy a zvuky. Dál všechno splývá.',
  'Dálka zatím dává poznat jen to nejvýraznější.',
  'O blízkých věcech lze soudit lépe. V dálce se jejich obrysy ztrácejí.'
 ],
 dry:['Z nebe teď nic nepadá a zvuky z okolí dostávají prostor.','Bez srážek je snáz slyšet, co se děje nablízku.','Kraj zůstává bez deště.','Počasí alespoň nepřidává vodu tam, kde už jí může být dost.']
};
const climateDetails = {
 'wet-tropical':['V tom vlhkém kraji výstroj pomalu osychá.','Zdejší vláha se dlouho drží i tam, kde zrovna neprší.'],
 'dry-tropical':['V kraji, kde je vláhy poskrovnu, má voda cenu i po krátké cestě.','V tom suchém kraji si putující musí vláhu hlídat.'],
 subpolar:['V tom severním podnebí bývá tepla poskrovnu.','Zdejší kraj je skoupý na teplo i za příznivého počasí.']
};
const forestRain = [
 'Voda sbíhá po jehličí na konce větví. Odtud padá na zem v těžkých kapkách, po jedné a po druhé.',
 'Z větví kape do mělkých prohlubní a stará znamení na zemi se pomalu ztrácejí pod vodou.',
 'Nad stezkou šumí déšť a z jehličí padají těžší kapky než z nebe.',
 'Pod korunami dopadá voda po jednotlivých úderech. Mezi stromy je slyšet každý zvlášť.'
];
const times = {
 dawn:['Pomalu svítá.','Za úsvitu už se nejbližší tvary od sebe dají rozeznat.','Jitro se teprve rozednívá.','Rozednívá se jen zvolna.'],
 morning:['Je dopoledne.','Dopolední světlo už stačí na to, aby se v okolí dalo číst.','Den je ještě před polednem.','Dopoledne je v plném běhu.'],
 noon:['Je kolem poledne.','Čas se přehoupl k poledni.','Den je kolem své poloviny.','Poledne zastihuje výpravu právě tady.'],
 afternoon:['Je odpoledne.','Poledne už je za nimi.','Den se přehoupl do odpoledne.','Je čas po poledni.'],
 dusk:['Soumrak bere věcem jejich obrysy.','Přichází soumrak.','Světla pomalu ubývá.','V kraji se smráká.'],
 night:['Je noc.','Den už ustoupil noci.','Noc leží všude kolem.','Za tmy se okolí ozývá zřetelněji, než se ukazuje.'],
 mixed:['Světlo se v té době mění.','V tomto čase mají blízké i vzdálené věci pokaždé jiný obrys.','Světlo během té chvíle mění tvář kraje.','Výpravu zastihuje proměna denního světla.'],
 unknown:['Tady zastihuje výpravu další díl jejího putování.','Okolí je teď výpravě na dosah.','Výprava má na tu chvíli kolem sebe tento kus kraje.','V té chvíli je kraj nejlépe znát zblízka.']
};
const seasonalAdjective={
 spring:'jarní',summer:'letní',autumn:'podzimní',winter:'zimní'
};
const seasonScenes={
 spring:['Jarní čas je znát na zemi i ve vzduchu.','Jaro má v kraji už své místo.','Je jarní čas.'],
 summer:['Je letní čas.','Kraj kolem prochází létem.','Je léto.'],
 autumn:['Je podzimní čas.','V kraji už nastal podzim.','Je podzim.'],
 winter:['Je zimní čas.','V kraji vládne zima.','Je zima.']
};

export function novelChoice(seed, topic, lines) {
 let h=2166136261;
 for(const letter of `${seed}:${topic}`) h=Math.imul(h^letter.charCodeAt(0),16777619);
 h=Math.imul(h^(h>>>16),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return lines[((h^(h>>>16))>>>0)%lines.length];
}

function sceneContext(p){
 const weather=p.precipitation?.precipitation||p.weather?.precipitation;
 const fall=weatherLines[weather] ? weather : weather==='none'||p.weather?.hasPrecipitation===false?'dry':'';
 const periods=Object.keys(p.daylight?.minutesByPeriod||{}).filter(key=>p.daylight.minutesByPeriod[key]>0);
 const stored=periods.length>1?'mixed':periods[0]||p.settings?.lightPeriod;
 const twilight=p.daylight?.segments?.find(segment=>segment.period==='twilight')?.start??p.startMinute;
 const hour=Number.isFinite(p.startMinute)?(p.startMinute%1440)/60:null;
 const light=stored==='day'?(hour===null?'unknown':hour<11?'morning':hour<13?'noon':'afternoon'):
  stored==='twilight'?(twilight%1440<720?'dawn':'dusk'):times[stored]?stored:'unknown';
 const seasonCode=p.weather?.season||p.settings?.season;
 const season=seasonCode==='fall'?'autumn':seasonCode;
 return {fall,stored,light,season,area:p.area||p.settings?.area};
}

export function novelEpisodeOrdinals(journal,campaignId){
 const counts=new Map(), ordinals=new Map();
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||!row.calendarTimeEpisode)continue;
  const p=row.calendarTimeEpisode;
  const {fall,light,season,area}=sceneContext(p);
  const key=JSON.stringify([p.kind,terrainGroups[p.terrain]||'general',fall,light,season,area]);
  const ordinal=counts.get(key)||0;
  counts.set(key,ordinal+1);
  ordinals.set(row.id,ordinal);
 }
 return ordinals;
}

export function novelScene(entry,p,ordinal) {
 const pick=(topic,lines)=>novelChoice(entry.id,topic,lines);
 const numbered=Number.isSafeInteger(ordinal)&&ordinal>=0;
 // Four time phrases, eight descriptions, four weather phrases, two orders
 // and four focuses. The offsets vary neighbours but are reversible.
 const step=numbered?ordinal%1024:0;
 const opening=step%4;
 const groundIndex=(Math.floor(step/4)+opening)%8;
 const weatherIndex=(Math.floor(step/32)+groundIndex)%4;
 const frame=(Math.floor(step/128)+weatherIndex)%2;
 const focusIndex=(Math.floor(step/256)+groundIndex)%4;
 const choose=(topic,lines,index)=>numbered?lines[index]:pick(topic,lines);
 const group=terrainGroups[p.terrain]||'general';
 const ground=[...terrain[group],...(terrainDetails[group]||terrainDetails.general)];
 const {fall,stored,light,season,area}=sceneContext(p);
 const seasonal=seasonScenes[season];
 const dark=light==='night'||light==='dusk';
 const scenery=choose('krajina',dark?[nightTerrain[group]||nightTerrain.general,...nightDetails]:ground,groundIndex);
 const time=times[light];
 const rollTime=lines=>choose('světlo',lines,opening);
 const rain=fall==='rain'&&group==='needles'?forestRain:weatherLines[fall||'unknown'];
 const rainPhrase=choose('srážky',rain,weatherIndex);
 const condition=p.precipitation?.hazard||
  (stored==='night'?p.weather?.nightHazard:stored==='day'?p.weather?.daylightHazard:null);
 const climateCode=p.weather?.climate||p.settings?.climate;
 const climateBank=climateDetails[climateCode];
 const climate=climateBank&&!(climateCode==='dry-tropical'&&fall&&fall!=='dry')?
  pick('podnebí',climateBank):'';
 const cold=condition==='cold'?pick('chlad',['Chlad zalézá i pod šat.','V chladu tuhne všechno, co zůstane nezakryté.','V tom chladu ani krátké postání nepřináší úlevu.']):'';
 const heat=condition==='heat'?pick('žár',['Žár nedává klid ani při postání.','Vzduch tíží horkem.','Ani zastavení na chvíli nedá od žáru oddechnout.']):'';
 const where=area?` v kraji zvaném „${area}“`:'';
 const weatherAdj=seasonalAdjective[season];
 const period=({morning:'dopoledne',afternoon:'odpoledne',night:'noc',dusk:'soumrak',dawn:'jitro'})[light];
 const phrase=weatherAdj&&period?`${weatherAdj} ${period}`:'';
 const timePhrase=phrase?rollTime([
  `Je ${phrase}${where}.`,
  `Výpravu zastihuje ${phrase}${where}.`,
  area?`V kraji, jemuž říkají „${area}“, je ${phrase}.`:`Tady nastává ${phrase}.`,
  `${phrase[0].toLocaleUpperCase('cs')+phrase.slice(1)} zastihuje výpravu${where||' právě tady'}.`
 ]):rollTime(time);
 const place=area&&!phrase?`Výprava je${where}.`:'';
 const seasonPhrase=seasonal&&!phrase?pick('období',seasonal):'';
 const focusBank=({rest:restFocus,sleep:sleepFocus,winded:restFocus,tracking:trackingFocus,forage:forageFocus,watch:watchFocus})[p.kind]||travelFocus;
 const focus=choose('pozornost',focusBank,focusIndex);
 const order=choose('stavba',[
  [timePhrase,scenery,rainPhrase,place,seasonPhrase,climate,cold,heat,focus],
  [timePhrase,rainPhrase,scenery,climate,cold,heat,place,seasonPhrase,focus]
 ],frame);
 return order.filter(Boolean).join(' ');
}

const knownNames={
 hatatitla:{accusative:'Hatatitlu',genitive:'Hatatitly',dative:'Hatatitlovi',instrumental:'Hatatitlou'},
 michal:{accusative:'Michala',genitive:'Michala',dative:'Michalovi',instrumental:'Michalem'},
 pepa:{accusative:'Pepu',genitive:'Pepy',dative:'Pepovi',instrumental:'Pepou'},
 anna:{accusative:'Annu',genitive:'Anny',dative:'Anně',instrumental:'Annou'},
 jana:{accusative:'Janu',genitive:'Jany',dative:'Janě',instrumental:'Janou'}
};
export const chronicleCases=['accusative','genitive','dative','instrumental'];
export function chronicleLanguage(form) {
 const sex=['male','female'].includes(form?.sex)?form.sex:'';
 const cases=Object.fromEntries(chronicleCases.flatMap(key=>{
  const value=String(form?.[key]??'').trim().slice(0,120);
  return value?[[key,value]]:[];
 }));
 return {...(sex?{sex}:{}),...cases};
}
export function knownChronicleCase(label,key,profile={}) {
 const value=profile?.[key]||knownNames[label?.toLocaleLowerCase('cs')]?.[key];
 return typeof value==='string'&&value.trim()?value.trim():null;
}
export function novelActor(id,name,profile,male,female,neutral) {
 const sex=profile(id)?.sex;
 return name(id)+' '+(sex==='male'?male:sex==='female'?female:neutral);
}

export function novelDistance(entry,p) {
 const metres=p.distanceMeters;
 if(p.kind!=='travel'||!(metres>0))return '';
 const n=new Intl.NumberFormat('cs',{maximumFractionDigits:3});
 const km=Number((metres/1000).toFixed(3));
 const quantity=metres<1000?`${n.format(metres)} ${metres===1?'metr':!Number.isInteger(metres)?'metru':metres<5?'metry':'metrů'}`:
  `${n.format(km)} ${km===1?'kilometr':!Number.isInteger(km)?'kilometru':km<5?'kilometry':'kilometrů'}`;
 const minutes=Number.isSafeInteger(p.minutes)?p.minutes:p.endMinute-p.startMinute;
 const time=minutes===30?'Za půl hodiny':minutes===60?'Za hodinu':minutes===1?'Za tu minutu':
  minutes>1&&minutes<60?`Za ${minutes} ${minutes<5?'minuty':'minut'}`:
  minutes>60&&minutes%60===0?`Za ${minutes/60} ${minutes<300?'hodiny':'hodin'}`:'Za ten čas';
 return novelChoice(entry.id,'délka',[
  `${time} urazila družina ${quantity}.`,
  `${time} zůstalo za družinou ${quantity} cesty.`,
  `${time} výprava postoupila o ${quantity}.`
 ].filter((_,i)=>i!==1||metres>=5));
}
