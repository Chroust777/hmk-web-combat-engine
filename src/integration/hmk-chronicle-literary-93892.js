/** v93.892 – Literary Czech chronicle composer.
 * Pure read-only projection of existing travel evidence. No calls to RNG and
 * no invented successes, injuries, weather, encounters or inventory changes.
 * Stable combinatorial variation is keyed by the original episode identity.
 */
const str=value=>String(value??'').trim();
const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;};
const choose=(lines,key)=>lines[hash(key)%lines.length];
const variants=(lines,key)=>choose(lines,key);
const SEASONS={
 spring:[
  'Jaro dosud nepřikrylo zemi všemi barvami, které mu jednou budou náležet.',
  'Krajina na počátku růstu ukazovala pod zelení i paměť předešlého chladu.',
  'Jarní porost se teprve učil zakrývat holé tvary země.',
  'V jarním světle mělo každé místo dvojí tvář: novou, svěží, a druhou, dosud poznamenanou zimou.',
  'Na prahu teplejší části roku bylo snadné přehlédnout, jak mnoho ještě zůstalo po minulé zimě.'
 ],
 summer:[
  'Léto dávalo krajině plnost barev, ale v hustším porostu ubíralo z rozhledu.',
  'Dlouhé letní světlo nabízelo čas k cestě, ne však jistotu, že bude snadná.',
  'V čase letního růstu se okraje stezek ztrácely pod bujnější zelení.',
  'Teplá část roku prodloužila den; práce nohou i očí však zůstávala stejně potřebná.',
  'Léto nechávalo zemi ukazovat její nejbohatší tvář, za níž se mohly skrývat nerovnosti.'
 ],
 autumn:[
  'Podzim pomalu stíral rozdíl mezi cestou a opadaným listím.',
  'Kratší podzimní světlo činilo z dálky věc méně jistou než ještě před několika týdny.',
  'Země už přijímala barvy končícího roku a staré otisky ztrácely ostrost.',
  'Podzimní porost nebyl tak hustý jako v létě, zato se měnila každá hranice stínu.',
  'Listí a uvadající trávy tvořily na cestě znamení, kterým nebylo vždy radno věřit.'
 ],
 winter:[
  'Zima ubrala krajině barev a ponechala jí ostřejší obrysy.',
  'Nízké zimní světlo prodlužovalo stíny i zdánlivé vzdálenosti.',
  'V zimním období se průchodnost země měnila s každým chladnějším úsekem.',
  'To, co v jiných měsících kryl porost, zimní krajina odhalovala pod strohým nebem.',
  'Chladné období dávalo každé cestě váhu, kterou na mapě nebylo vidět.'
 ],
 unknown:[
  'Krajina se odhalovala pozvolna, nikoli všechna najednou.',
  'Okolí nabízelo více drobných vodítek než velkých jistot.',
  'Podoba cesty se měnila s každým novým pohledem.'
 ]
};
const MONTHS={
 1:['Měsíc Núzyæl ještě zanechával v krajině stopy odcházející zimy.','V čase Núzyælu bylo jaro teprve na počátku své cesty.'],
 2:['Peónu přinášel krajině novou zeleň, ještě ne všude stejně silnou.','V měsíci Peónu se v porostu střídaly měkké barvy a staré stíny.'],
 3:['Kelén dával novému růstu stále více prostoru.','V měsíci Kelén se krajina pozvolna převlékala do svěžejší podoby.'],
 4:['Nólus přinášel delší dny a zemi přikrytou zelení.','S měsícem Nólus se den natahoval nad cestou jako dlouhý příslib.'],
 5:['Laránè ponechával krajině čas bujného růstu.','V měsíci Laránè byla země plná letních barev.'],
 6:['Ágrazhâr dál prodlužoval cestovní dny.','V měsíci Ágrazhâr se letní porost tlačil k okrajům cest.'],
 7:['Azúra začínala měnit ráz zeleně, která ještě nedávno patřila létu.','S Azúrou se krajina pozvolna obracela k podzimu.'],
 8:['Halánè přidával ke krajině barvy dozrávajícího podzimu.','V měsíci Halánè se v porostu střídaly poslední odstíny zeleně s podzimem.'],
 9:['Savôr měnil zelené okraje cest v tlumenější odstíny.','S měsícem Savôr se podzim hlásil o své místo v každém dalším dni.'],
 10:['Ilvín vtiskoval krajině strožejší, zimní podobu.','V čase Ilvínu země už náležela chladnému období.'],
 11:['Návek ponechával stezkám jen úsporné světlo.','V měsíci Návek ubývalo barvy a přibývalo dlouhých stínů.'],
 12:['Morgát patřil chladné části roku a zdrženlivému světlu.','V měsíci Morgát už krajina mnoho neslibovala.' ]
};
// Calendar month and weather season may be independently set by GM. We never
// invent month-specific temperature or snow from the TR month alone.
const PLACES={
 forest:[
  'Mezi kmeny se otevíraly jen úzké průhledy a každá vzdálenost měla klamavou míru.',
  'Kořeny a nízké větve rozdělovaly cestu na krátké úseky, které nebylo možné posoudit jediným pohledem.',
  'Les přijímal kroky do svého ticha a vracel cestujícím jen útržky světla.',
  'Pod korunami stromů byla dálka skrytá; směr bylo třeba hledat mezi drobnými znaky země.',
  'Stíny kmenů kreslily na podkladu nepravidelnou síť, v níž se skutečná stezka snadno ztrácela.',
  'Když se les sevřel kolem trasy, staly se i nepatrné změny povrchu důležitějšími než daleký obzor.'
 ],
 road:[
  'Cesta dávala krokům zřetelnější řád, a přece každá její odbočka otevírala novou otázku.',
  'Vyšlapaný či vyježděný pruh země sliboval snazší postup, nikoliv však jistotu správného směru.',
  'Okraje cesty uchovávaly drobné znaky, které tvrdší střed dávno ztratil.',
  'Na cestě bylo možné pokračovat rázněji; právě proto bylo snadné minout nenápadné rozcestí.',
  'Trasa se vinula krajinou jako úzká čára, kterou bylo nutné stále znovu potvrzovat.'
 ],
 wet:[
  'Vlhká zem střídala pevnější místa s podkladem, který si žádal obezřetnost.',
  'V mokřinách se cesta nepoznávala podle dálky, ale podle každého bezpečného kusu půdy.',
  'Měkký terén ponechával otiskům více prostoru, zato ubíral jistotu kroku.',
  'Země tu měla vlastní, neochotný rytmus a každá změna povrchu si vyžádala pozornost.'
 ],
 hill:[
  'Sklon země otevíral střídavě široký výhled a úzká místa, za nimiž cesta mizela.',
  'Každá vyvýšenina slibovala rozhled, její druhá strana však zůstávala skrytá.',
  'Cesta se podřizovala svahu a na pohled krátká vzdálenost se rozkládala do mnoha kroků.',
  'Kamenitější místa a proměnlivý sklon země nutily pozorovat, kam se klade noha.'
 ],
 open:[
  'Otevřená krajina nabízela širší rozhled, ale drobné vodicí znaky byly od sebe daleko.',
  'Krajina neměla mnoho míst, kde by se dalo ukrýt před pohledem; směr však neurčoval samotný obzor.',
  'Země se rozvíjela do dálky a každý výstupek v ní nabýval nečekané důležitosti.',
  'Přímá linie krajiny se zdála prostá; teprve při chůzi se ukazovaly její nenápadné proměny.'
 ],
 harsh:[
  'Skalnatá nebo chudá půda dávala cestě tvrdší ráz a nepřála ukvapenému kroku.',
  'V nehostinném terénu musela rozhodnutí předcházet pozornost vůči samotnému podkladu.',
  'Dálka se otevírala, ale cesta k ní nebyla tak přímočará, jak se mohlo zdát.',
  'Země tu nabízela málo opory pro pohodlný postup; každý průchod bylo třeba posoudit zvlášť.'
 ]
};
const CLIMATES={
 cool:[
  'Chladnější podnebí přidávalo vzduchu ostrost, kterou nešlo přehlédnout.',
  'Vzduch měl chladnější ráz a bránil zapomenout na únavu cesty.',
  'V chladném podnebí působila i krátká přestávka jinak než v závětří teplých krajin.',
  'Chlad se připomínal v každém místě, kam nedosáhlo přímé slunce.'
 ],
 cold:['Studené podnebí nedovolovalo považovat cestovní pohodlí za samozřejmost.','V ostrém chladu se každá zastávka i každý krok počítaly jinak.','Chlad vtiskoval celé krajině zdrženlivý, neústupný ráz.'],
 warm:['Teplejší podnebí měnilo vzduch i rytmus odpočinku.','V teplejší krajině mělo světlo měkčí, přesto vytrvalou moc.','Teplejší vzduch obestíral každý další úsek cesty.'],
 hot:['Horké podnebí dávalo i krátkému putování zvláštní tíhu.','V horkém vzduchu se dálka zdála nehybná a vzdálenější.','Horko se drželo nad zemí, ať už cesta vedla kamkoli.'],
 temperate:['Mírné podnebí krajiny samo o sobě neslibovalo, že cesta proběhne bez obtíží.','Vzduch nesl obvyklý ráz této krajiny a podmínky určovalo především aktuální počasí.']
};
const WEATHER={
 rain:[
  'Déšť probíral jehličí a listí jemným šuměním; co bylo před chvílí zřetelné, mohlo pod vodou ztratit obrys.',
  'Kapky se srážely na porostu, stékaly po okrajích cesty a tlumily zvuky, na něž se poutníci běžně spoléhali.',
  'Déšť setřel ostrost některých stop a změnil pevnost země tam, kde se držela voda.',
  'Vlhkost přilnula k půdě a k rostlinám; cesta voněla deštěm a dálka působila vzdáleněji.',
  'Šum deště zakryl část hlasů krajiny a z běžných zvuků udělal nejasné znamení.',
  'Pod deštěm se krajina zdála temnější a každé suché místo mělo najednou cenu.'
 ],
 snow:[
  'Sníh měnil obrysy země tak tiše, že se známé znaky mohly ztratit téměř před očima.',
  'Bílé vločky zahlazovaly drobné stopy a ubíraly vzdáleným tvarům ostrost.',
  'Sněžení zjemňovalo svět a na každé větvi zanechávalo nový obrys.',
  'Sníh měnil pevnost i vzhled cesty; to, co působilo bezpečně, muselo být znovu přečteno.'
 ],
 precipitation:['Srážky měnily zvuk i povrch země a zvyšovaly význam opatrného kroku.','Pod srážkami se okraje stezky stávaly méně zřetelnými.','Vlhkost prostupovala okolím a měnila jeho čitelnost.'],
 dry:['Obloha v tomto úseku nepřidala déšť ani sněžení, a přece zůstávalo dost důvodů sledovat zem.','Bez srážek bylo možné číst krajinu jinak, nikoli však s neomylnou jistotou.','Povrch nepřekrýval nový déšť ani sníh a starší znaky se v něm daly hledat pečlivěji.']
};
const LIGHT={
 day:['Denní světlo zachovávalo obrysům jejich podobu, ale neodhalovalo všechno.','Světlá část dne nechávala krajinu dobře viditelnou jen tam, kde jí to dovoloval terén.','Za dne získávaly drobné znaky země ostřejší podobu.'],
 twilight:['Soumrak prodlužoval stíny a ubíral okrajům cesty jejich dřívější jistotu.','Světlo sláblo, obrysy se měnily a vzdálenější znaky splývaly.','Na pomezí světla a tmy se krajina zdála jiná než o chvíli dříve.'],
 night:['Za noci dostávaly obyčejné zvuky jinou váhu než ve dne.','Tma skrývala dálku a ponechávala cestujícím jen tolik okolí, kolik dokázali rozeznat.','Noc ubrala světu tvarů; o to pozorněji bylo nutné naslouchat.']
};
const PACING=[
 'Země si však žádala jinou pozornost, než jakou slibovala vzdálenost na mapě.',
 'Tady se dal snadno ztratit směr i ve chvíli, kdy krok působil jistě.',
 'Každý nový kus krajiny se musel nejprve pochopit, teprve potom překonat.',
 'Ani dobrá znalost cest nedokázala proměnit všechna znamení v jistotu.',
 'Dálka neměla slitování s netrpělivými, avšak přála těm, kdo uměli pozorovat.',
 'Nejmenší podrobnost mohla rozhodnout o tom, zda se cesta ukáže taková, jakou ji poutníci čekali.',
 'Teprve na konci úseku se mělo ukázat, nakolik odhad obstál před skutečností.',
 'Zbytku dne bylo ještě dost, přesto se nic nemělo považovat za samozřejmé.',
 'Na takových místech bývalo lépe důvěřovat pozorování než prvnímu dojmu.',
 'Krajina neměla důvod vysvětlovat svoje znamení těm, kdo kolem ní jen spěchali.',
 'Stezka neodpovídala na otázky předem; její znamení musel člověk hledat za pochodu.',
 'Cesta byla tichým zápasem mezi tím, co oko vidělo, a tím, co rozum předpokládal.'
];
const terrainGroup=p=>{
 const t=str(p?.terrain||p?.settings?.terrain).toLowerCase();
 if(/forest|wood|les/.test(t))return 'forest';
 if(/road|track|trail|stezk|cest/.test(t))return 'road';
 if(/wetland|swamp|marsh|moor/.test(t))return 'wet';
 if(/hill|mountain|alpine/.test(t))return 'hill';
 if(/desert|dune|ice|snow|rock/.test(t))return 'harsh';
 return 'open';
};
const weatherGroup=p=>{
 if(p?.weather?.hasPrecipitation===true){const t=str(p?.precipitation?.precipitation).toLowerCase();return t==='rain'?'rain':t==='snow'?'snow':'precipitation';}
 return p?.weather?.hasPrecipitation===false?'dry':null;
};
const daylight=p=>{
 const periods=p?.daylight?.minutesByPeriod;
 if(periods){const eligible=Object.entries(periods).sort((a,b)=>Number(b[1])-Number(a[1]));if(eligible.length&&Number(eligible[0][1])>0)return eligible[0][0];}
 return str(p?.settings?.lightPeriod)||'day';
};
export function literaryChronicleIntro(entry,p,{month=null,monthName=null}={}){
 const key=`${entry?.id||'none'}|${p?.startMinute}|${p?.endMinute}|${p?.terrain||''}|${p?.kind||''}`;
 const season=({fall:'autumn'})[p?.weather?.season||p?.settings?.season]||p?.weather?.season||p?.settings?.season||'unknown';
 const ground=PLACES[terrainGroup(p)]||PLACES.open;
 const seasonFromMonth=Number.isInteger(month)?['spring','summer','autumn','winter'][Math.floor((month-1)/3)]:null;
 const first=Number.isInteger(month)&&MONTHS[month]
  ?(season==='unknown'||season===seasonFromMonth?choose(MONTHS[month],key+':month'):
   `Měsíc ${monthName||month} zastihl krajinu v podmínkách, které určoval zdejší čas a počasí.`)
  :choose(SEASONS[season]||SEASONS.unknown,key+':season');
 const climate=str(p?.weather?.climate||p?.settings?.climate).toLowerCase();
 const climateText=CLIMATES[climate]&&hash(key+':climate-include')%3!==0?choose(CLIMATES[climate],key+':climate'):'';
 const terrainText=choose(ground,key+':terrain');
 const weather=weatherGroup(p);
 const weatherText=weather?choose(WEATHER[weather],key+':weather'):'';
 const lightText=choose(LIGHT[daylight(p)]||LIGHT.day,key+':light');
 const pace=choose(PACING,key+':pace');
 // A month only names the recorded TR month. We do not use it to infer weather.
 const firstParagraph=[first,terrainText,climateText].filter(Boolean).join(' ');
 const secondParagraph=[weatherText,lightText,pace].filter(Boolean).join(' ');
 return [firstParagraph,secondParagraph];
}

const SKILLS={
 animalcraft:{
  before:[
   '{actor} obrací pozornost k vedenému zvířeti. Cesta žádá, aby lidský úmysl a zvířecí krok nalezly společný rytmus.',
   'Vedení zvířete na chvíli vystupuje do popředí. {actor} hledá míru mezi pevným pokynem a trpělivostí, kterou nelze uspěchat.',
   '{actor} sleduje pohyb zvířete a pokouší se držet jeho pozornost; za každým dalším krokem je kus vzájemné důvěry.',
   'Nyní rozhoduje cit pro zvíře, ne rychlost cesty. {actor} hledá způsob, jak bezpečně pokračovat bez zbytečného zápasu.',
   'Cesta se na okamžik řídí krokem doprovázejícího zvířete. {actor} se soustředí na vedení, které má udržet oba v souladu.'
  ],
  fail:[
   'Souhra se však nepodařila. Pokus, od něhož si družina slibovala jistější vedení, zanechal místo odpovědi nejistotu.',
   'Zamýšlená poslušnost se nedostavila; další postup musel počítat s neúspěchem tohoto pokusu.',
   'V této chvíli se vůle člověka a zvířete nepotkaly. Příčina zůstala nejasná, výsledek pokusu nikoli.',
   'Klidná souhra se nepodařila; před cestujícími zůstal problém, který se nedal vyřešit pouhým přáním.',
   'Ani zkušenost tentokrát nepřinesla kýžený výsledek. Zvíře se nepodařilo vést tak, jak bylo zamýšleno.'
  ],
  pass:[
   'Vedení obstálo. Zvířecí krok se podřídil zamýšlenému postupu a v té chvíli bylo možné pokračovat s větší jistotou.',
   'Tentokrát se trpělivost vyplatila: zamýšlený úkon se podařil.',
   'Zvíře odpovědělo tak, jak vedení potřebovalo. Úspěch však nečinil další cestu bezstarostnou.',
   'Pokus dopadl dobře; společný rytmus cesty se podařilo udržet.'
  ]
 },
 survival:{
  before:[
   '{actor} hledá mezi podobnými průchody vodítko, které by oddělilo pravou cestu od pouhého zdání.',
   'Směr se nedá vyčíst jediným pohledem. {actor} porovnává tvary země, světlo a polohu okolních překážek.',
   '{actor} zkoumá krajinu s trpělivostí, kterou vyžaduje každé nejasné rozcestí.',
   'Ani zřetelná stezka nemusí vést správně. {actor} se snaží poznat, zda cesta odpovídá zamýšlenému směru.',
   '{actor} hledá v krajině pevný bod, podle něhož by bylo možné udržet kurz, aniž by se družina nechala svést prvním dojmem.'
  ],
  fail:[
   'Úsudek tentokrát selhává. Krajina neposkytuje spolehlivý závěr a cesta zůstává nejistá.',
   'Vodítka nebyla vyložena správně; jistota, s níž se mělo pokračovat, se ukázala klamnou.',
   'Pokus nedal potřebnou odpověď. Stezka se před družinou otevřela, ne však její správný směr.',
   'Odhad neobstál. To, co se zdálo samozřejmé, v rozhodující chvíli oporu neposkytlo.',
   'V té chvíli zvítězilo zdání nad správným úsudkem a směr cesty se stal pochybným.'
  ],
  pass:[
   'Srovnání krajiny a směru obstálo; výprava získala užitečnou oporu pro pokračování.',
   'Tentokrát se drobné znaky spojily v čitelný celek a zamýšlený směr mohl být potvrzen.',
   'Úsudek se ukázal spolehlivým. Cesta tím neztratila všechna nebezpečí, ale získala pevnější směr.',
   'Pozorné čtení země přineslo kýženou jistotu v daném okamžiku.'
  ]
 },
 tracking:{
  before:[
   '{actor} pátrá po stopách v místech, kde se otisky ztrácejí pod jinými znameními země.',
   'Drobné poruchy půdy se mohou spojit v příběh cizího pohybu. {actor} je zkoumá jednu po druhé.',
   '{actor} hledá pokračování stopy na okrajích průchodu, kde může zůstat zachováno víc než uprostřed.',
   'Stopování vyžaduje více trpělivosti než spěchu. {actor} se sklání k nepatrným změnám podkladu.'
  ],
  fail:['Sledovaná znamení se nepodařilo spojit v důvěryhodnou stopu. Země ponechala své tajemství nedořečené.','Pátrání zatím nepřineslo spolehlivý směr; jednotlivé znaky odporovaly očekávání.','Stopa v rozhodující chvíli neposkytla odpověď, o niž bylo usilováno.'],
  pass:['Stopy poskytly použitelná vodítka; jejich další průběh však teprve čeká na potvrzení.','Drobné znaky země se podařilo číst jako souvislost, nikoli jako náhodné otisky.','Pátrání přineslo výsledek, o který se stopař opíral.']
 },
 riding:{
  before:['{actor} sleduje rytmus pohybu v sedle; úsek vyžaduje jistotu, kterou nelze předstírat.','Sedlo a cesta si žádají souhru. {actor} přizpůsobuje vedení zvířete povrchu pod kopyty.','Jízda se na chvíli stává úkolem sama o sobě. {actor} hledá rovnováhu mezi tempem a bezpečím.'],
  fail:['Jezdecký úkon tentokrát nevyšel; případný pád by však vyžadoval vlastní doložený následek.','Zamýšlené ovládání jízdy se nepodařilo. Cesta přitom nezaznamenala další úraz, pokud jej nepotvrzuje samostatný doklad.'],
  pass:['Jezdecký úkon obstál a rytmus pohybu se podařilo udržet.','Jízda se v této chvíli podřídila zkušenému vedení.','Zamýšlený manévr dopadl dobře.']
 },
 awareness:{
  before:['{actor} věnuje pozornost zvukům a nenápadným změnám kolem cesty.','Ostraha není jen věcí ostrého zraku. {actor} zkoumá, co se ukrývá na okraji vnímání.','{actor} pátrá po známce pohybu tam, kde krajina neposkytuje snadný výhled.'],
  fail:['Pozornost v této chvíli potřebný podnět nezachytila; sama o sobě tím nevznikla žádná nová hrozba.','Pokus o postřeh neuspěl. Okolí si ponechalo to, co nedokázalo včas prozradit.'],
  pass:['Pozornost obstála a poskytla tolik vodítek, kolik bylo v dané situaci možné zachytit.','Zvolené pozorování se podařilo; o povaze okolí rozhodují až skutečně doložené podněty.']
 },
 forage:{
  before:['{actor} prohlíží místa, kde by půda a porost mohly vydat něco k obživě nebo léčení.','Pátrání po zásobách odvádí pozornost od cesty. {actor} zkoumá, co krajina skutečně poskytuje.','Země může skrývat užitečný nález, avšak pouhý příslib nestačí. {actor} věnuje čas hledání.'],
  fail:['Pátrání nepřineslo potvrzený nález; slibné místo zůstalo jen slibem.','Hledání skončilo bez doloženého užitku. Cesta se bude muset obejít bez tohoto přírůstku zásob.'],
  pass:['Hledání přineslo doložený výsledek, jehož skutečné množství je zapsáno v pravidlovém dokladu.','Úsilí nalezlo odměnu; co bylo skutečně získáno, ukazuje potvrzený výsledek sběru.']
 },
 other:{
  before:['{actor} věnuje pozornost právě té dovednosti, na níž nyní stojí další postup.','Před pokračováním je třeba prověřit další úkon. {actor} se soustředí na jeho provedení.','Krajina sama nerozhoduje o všem; přišel čas na schopnosti {actorLabel}.'],
  fail:['Pokus se nezdařil; cokoli dalšího by z něho mělo plynout, musí mít vlastní potvrzený doklad.','Záměr nevyšel a další děj zůstává otevřený.'],
  pass:['Pokus obstál. Dál už bude záležet na tom, co přinese další skutečný úsek.','Záměr se podařilo uskutečnit v rozsahu doloženém hodem.']
 }
};
function skillKind(test){const t=str(test?.skill).toLowerCase();return /animalcraft|zvíř/.test(t)?'animalcraft':/survival|orient/.test(t)?'survival':/tracking|stopov/.test(t)?'tracking':/riding|jezd/.test(t)?'riding':/awareness|ostraha/.test(t)?'awareness':/forag|sběr|potrav|zásob|bylin/.test(t)?'forage':'other';}
export function literaryChronicleTest(test,p,name,key,{legacy=null}={}){
 const kind=skillKind(test);
 if(kind==='other')return null;
 const t=SKILLS[kind],who=str(test?.actorId?name(test.actorId):'')||'Výprava';
 const before=choose(t.before,`${key}:opening`)
  .replaceAll('{actor}',who).replaceAll('{actorLabel}',`postavy jménem ${who}`);
 const level=str(test?.level),failure=level==='CF'||level==='F'||str(test?.result).includes('bez nálezu');
 let after=choose(failure?t.fail:t.pass,`${key}:closing`);
 // Recover *specific* outcomes from authoritative structured data instead of
 // replacing them with a generic literary success/failure claim.
 if(kind==='survival'&&p?.orientation?.skillId===test.id){
  if(failure&&p.navigationState==='misdirection')after+=' Výprava si odnáší chybný směr a před dalším úsekem bude třeba znovu hledat jistotu.';
  if(p.navigationRecovered)after+=' Následný návrat na správnou trasu přinesl cestě potřebné ujištění.';
 }
 if(kind==='forage'&&/neuzavřen/.test(str(test?.result)))after='Hod byl pouze zaznamenán; zda hledání přineslo skutečný nález, dosud nebylo potvrzeno.';
 if(kind==='forage'&&test?.effect&&/Potrava|dávk|dne/.test(test.effect)&&!str(test?.result).includes('neuzavřen'))after+=` Zápis výtěžku: ${test.effect}`;
 if(kind==='other'&&legacy&&str(test?.skill).toLowerCase().includes('climbing'))return legacy;
 return {pre:before,post:after};
}

export function literaryVariationCapacity(){
 // Conservative lower bound from independent intro fragment choices only:
 // 5 season × 6 forest × 3 climate × 6 rain × 3 light × 12 pacing.
 return 5*6*3*6*3*12;
}
