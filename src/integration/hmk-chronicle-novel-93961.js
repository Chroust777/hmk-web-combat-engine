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
const nightTerrain = {
 needles:'Mezi nejbližšími kmeny se od sebe stíny sotva dají rozeznat.',
 wood:'Za tmy se okraj lesa dá spíš tušit než rozeznat.',
 marsh:'Kde končí pevná zem a začíná mokřina, se ve tmě těžko pozná.',
 general:'Ve tmě se kraj ukazuje jen v hrubých obrysech.'
};
const weatherLines = {
 rain:['Kapky dopadají jedna za druhou a z jejich šumu se jen občas vyloupne jiný zvuk.','Déšť stírá vzdálené obrysy. Co je potřeba rozeznat, musí být blízko.','V dešti má zem všude tmavší barvu.','Voda hledá na zemi nejnižší místa a tam se jí po kapkách sbírá čím dál víc.'],
 snow:['Sníh po troškách zakrývá drobná znamení na zemi.','Vločky přicházejí z bílé dálky a bílou dálku za sebou nechávají.','Sníh plní mělké prohlubně dřív než ty hlubší.','Co před chvílí vystupovalo ze země, ztrácí pod sněhem obrys.'],
 sleet:['Mokrý sníh se sotva dotkne země a už se mění ve vodu.','Místy dopadá na zem vločka, místy těžká kapka.','Z nebe padá déšť se sněhem a všechno na dosah vlhne.','Po chvilce zůstane z mokrých vloček na šatu jen chlad a voda.'],
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

export function novelScene(entry,p,ordinal) {
 const pick=(topic,lines)=>novelChoice(entry.id,topic,lines);
 const group=terrainGroups[p.terrain]||'general';
 const ground=terrain[group];
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
 const seasonal=seasonScenes[season];
 const dark=light==='night'||light==='dusk';
 const scenery=dark?(nightTerrain[group]||nightTerrain.general):pick('krajina',ground);
 const time=times[light];
 const rollTime=lines=>Number.isSafeInteger(ordinal)&&ordinal>=0?lines[ordinal%lines.length]:pick('světlo',lines);
 const rain=fall==='rain'&&group==='needles'?forestRain:weatherLines[fall];
 const rainPhrase=rain?pick('srážky',rain):'';
 const condition=p.precipitation?.hazard||
  (stored==='night'?p.weather?.nightHazard:stored==='day'?p.weather?.daylightHazard:null);
 const climateCode=p.weather?.climate||p.settings?.climate;
 const climateBank=climateDetails[climateCode];
 const climate=climateBank&&!(climateCode==='dry-tropical'&&fall&&fall!=='dry')?
  pick('podnebí',climateBank):'';
 const cold=condition==='cold'?pick('chlad',['Chlad zalézá i pod šat.','V chladu tuhne všechno, co zůstane nezakryté.','V tom chladu ani krátké postání nepřináší úlevu.']):'';
 const heat=condition==='heat'?pick('žár',['Žár nedává klid ani při postání.','Vzduch tíží horkem.','Ani zastavení na chvíli nedá od žáru oddechnout.']):'';
 const area=p.area||p.settings?.area;
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
 const order=pick('stavba',[
  [timePhrase,scenery,rainPhrase,place,seasonPhrase,climate,cold,heat],
  [timePhrase,rainPhrase,scenery,climate,cold,heat,place,seasonPhrase],
  [timePhrase,place,seasonPhrase,scenery,rainPhrase,climate,cold,heat]
 ]);
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
