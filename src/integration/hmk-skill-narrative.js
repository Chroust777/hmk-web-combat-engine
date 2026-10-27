/** HMK Keeper's Ledger: Czech GM read-aloud suggestions.
 * No invented numerical modifiers, outcomes, automatic consequences or combat writes.
 * GM's declared objective / scene only provides context, never rule authority.
 */
const INTENTS=Object.freeze({
 'Charm':'pokouší se získat přízeň či sympatie',
 'Command':'snaží se prosadit svou vůli a získat poslušnost',
 'Discourse':'předkládá argumenty a snaží se přesvědčit posluchače',
 'Guile':'vytváří věrohodnou lest a snaží se druhého oklamat',
 'Intrigue':'sleduje skryté motivy a hledá nesrovnalosti v jednání',
 'Theatrics':'hraje roli a snaží se vyvolat zamýšlený dojem',
 'Singing':'předvádí pěvecké umění',
 'Language':'pokouší se dorozumět ve zvoleném jazyce',
 'Awareness':'pozorně sleduje okolí a snaží se zachytit podstatný detail',
 'Stealth':'pokouší se proklouznout nepozorovaně',
 'Legerdemain':'provádí nenápadný obratný úkon rukama',
 'Acrobatics':'zvládá náročný pohyb a udržuje rovnováhu',
 'Climbing':'hledá oporu a pokouší se překonat výškovou překážku',
 'Jumping':'odhaduje vzdálenost a pokouší se ji přeskočit',
 'Swimming':'snaží se bezpečně pohybovat ve vodě',
 'Dancing':'předvádí pohybovou sestavu v daném rytmu',
 'Riding':'ovládá jízdní zvíře v náročné situaci',
 'Survival':'hledá způsob, jak se vyrovnat s podmínkami divočiny',
 'Tracking':'pátrá po stopách a skládá z nich směr pohybu',
 'Animalcraft':'pracuje se zvířetem a snaží se porozumět jeho chování',
 'Herblore':'rozpoznává rostliny a hodnotí jejich možné využití',
 'Agriculture':'posuzuje práci na poli či stav plodiny',
 'Fishing':'vybírá vhodný postup k rybolovu',
 'Piloting':'určuje trasu a bezpečně vede plavbu',
 'Seamanship':'pracuje s plavidlem a jeho vybavením',
 'Timbercraft':'pracuje se dřevem a orientuje se v lesním prostředí',
 'Mineralogy':'posuzuje nerosty a hledá jejich charakteristické znaky',
 'Lockcraft':'zabývá se zámkem a jeho mechanismem',
 'Weaponcraft':'věnuje se výrobě či opravě zbraně',
 'Metalcraft':'zpracovává kov a ověřuje přesnost práce',
 'Woodworking':'opracovává dřevo a kontroluje spoje',
 'Textilecraft':'pracuje s tkaninou a sleduje kvalitu zpracování',
 'Hideworking':'zpracovává kůži a hlídá pevnost švů',
 'Ceramics':'tvaruje a dokončuje keramický výrobek',
 'Masonry':'opracovává kámen nebo buduje pevný spoj',
 'Glassworking':'pracuje se sklem a snaží se předejít vadám',
 'Jewelcraft':'provádí jemnou práci s drahokamem či šperkem',
 'Fletching':'vyrábí či opravuje šípy a kontroluje jejich vyvážení',
 'Drawing':'zachycuje podobu či plán do kresby',
 'Milling':'řídí mletí a vyhodnocuje kvalitu výsledku',
 'Musician':'hraje na hudební nástroj a udržuje přednes',
 'Brewing':'připravuje nápoj a sleduje správný postup',
 'Cookery':'připravuje pokrm a hlídá výsledek práce',
 'Embalming':'provádí náročné ošetření těla',
 'Engineering':'navrhuje nebo posuzuje technické řešení',
 'Folklore':'pátrá v pověstech a tradičních znalostech',
 'Heraldry':'rozpoznává znamení a hledá jejich význam',
 'Law':'vyhledává související zákon a jeho výklad',
 'Mathematics':'počítá a ověřuje postup řešení',
 'Mercantilism':'posuzuje nabídku, cenu a obchodní podmínky',
 'Perfumery':'připravuje nebo posuzuje vůni',
 'Physician':'vyšetřuje zdravotní stav a hledá vhodný postup',
 'Ritual':'provádí stanovený obřad',
 'Script':'čte nebo zapisuje text v příslušném písmu',
 'Shipwright':'plánuje či opravuje konstrukci plavidla',
 'Alchemy':'připravuje alchymický postup a kontroluje jeho průběh',
 'Astrology':'vykládá astrologické souvislosti',
 'Pvârism':'soustředí se na své arkánní umění',
 'Runecraft':'vykládá nebo vytváří runové znaky',
 'Summoning':'pokouší se o vyvolání podle příslušné rutiny',
 'Talent':'soustředí se na vrozený talent',
 'Spirit':'soustředí se na duchovní síly',
 'Tarotry':'vykládá význam rozložených karet',
 'Trance':'pokouší se dosáhnout změněného stavu vědomí',
 'Melee':'poměřuje své schopnosti při střetu nablízko',
 'Dodge':'pokouší se uniknout hrozbě pohybem',
 'Archery':'míří a snaží se přesně vystřelit',
 'Slings':'používá prak či vrhací zařízení',
 'Throwing':'odhaduje dráhu a snaží se přesně vrhnout předmět',
 'Initiative':'reaguje na nečekaný vývoj událostí',
 'Shock':'vzdoruje náhlému otřesu',
 'Strength':'vyvíjí fyzickou sílu k překonání odporu',
 'Endurance':'vydrží fyzickou zátěž',
 'Dexterity':'provádí úkon vyžadující jemnou koordinaci rukou',
 'Agility':'snaží se pohybovat obratně a rychle',
 'Perception':'využívá smysly k rozpoznání detailu',
 'Comeliness':'spoléhá na svůj vzhled při prvním dojmu',
 'Aura':'soustředí svou auru',
 'Will':'odolává nátlaku vlastní vůlí',
 'Reasoning':'usuzuje a skládá informace do souvislostí',
 'Creativity':'hledá nové a neobvyklé řešení',
 'Empathy':'snaží se pochopit pocity a úmysly druhého',
 'Eloquence':'formuluje sdělení co nejsrozumitelněji'
});
const ACTION_INTENTS=Object.freeze({
 'Seduction':'snaží se svést druhého a získat jeho přízeň',
 'Authority':'pokusí se prosadit svou autoritu',
 'Intimidation':'pokouší se druhého zastrašit',
 'Debate':'obhajuje svou pozici v otevřené rozpravě',
 'Bluffing / lying':'vydává lež za pravdu',
 'Acting':'přesvědčivě hraje zvolenou roli',
 'Disguise':'skrývá svou totožnost pomocí převleku',
 'Mimicry':'napodobuje něčí vzhled, hlas nebo chování',
 'Alert observer':'pokouší se pohybovat mimo pozornost hlídkující osoby',
 'Opposed speech':'snaží se prosadit své sdělení proti druhému mluvčímu'
});
const normalize=s=>String(s??'').trim().slice(0,240);
function intent(skill,action){if(ACTION_INTENTS[action])return ACTION_INTENTS[action];if(INTENTS[skill])return INTENTS[skill];const base=Object.keys(INTENTS).find(k=>skill.startsWith(k+' (')||skill.startsWith(k+':')||skill.startsWith(k+' '));return INTENTS[base]||'pokouší se splnit zvolenou činnost ('+skill+')';}
function sceneContext({objective='',scene=''}){
 const parts=[];
 if(normalize(scene))parts.push('Děj se odehrává za okolností, které GM popsal takto: '+normalize(scene)+'.');
 if(normalize(objective))parts.push('Záměrem je '+normalize(objective).replace(/[.!?]+$/,'')+'.');
 return parts.join(' ');
}
function soloOutcome(level,skill){
 if(level==='CS')return 'Výsledek hodu je kritickým úspěchem. Počínání působí mimořádně jistě a zvolený záměr se podařilo naplnit; případné zvláštní účinky však závisejí na pravidlech konkrétní činnosti.';
 if(level==='S')return 'Po vyhodnocení hodu je zřejmé, že se činnost zdařila. Zamýšlený úkol se tak podařilo splnit v rozsahu odpovídajícím použité dovednosti.';
 if(level==='F')return 'Pokus tentokrát nestačil k dosažení cíle. Úsilí nepřineslo zamýšlený výsledek a další vývoj zůstává na rozhodnutí účastníků scény.';
 return 'Pokus končí kritickým neúspěchem. Průběh činnosti se nevydařil; zda vznikne další komplikace, určí výhradně konkrétní pravidlo nebo rozhodnutí GM, nikoliv samotné vyprávění.';
}
const perceptionVersusStealth=(primary,defender)=>
 (primary==='Awareness'&&defender==='Stealth')||(primary==='Stealth'&&defender==='Awareness');
function opposedMeaning(primary,defenderSkill,winnerA,a,b){
 if(perceptionVersusStealth(primary,defenderSkill)){
  const observer=primary==='Awareness'?a:b,hidden=primary==='Stealth'?a:b;
  const observerWon=primary==='Awareness'?winnerA:!winnerA;
  return observerWon?`${observer} si při pozorování povšimne toho, co se ${hidden} snažil skrýt. Ve střetu všímavosti a nenápadnosti tak převážil pozorovatel.`:`${hidden} se dokáže vyhnout pozornosti ${observer}. Pokus odhalit jeho přítomnost se v tomto porovnání dovedností neprosadil.`;
 }
 if(primary==='Guile')return winnerA?`${a} dokázal svou lest prosadit navzdory odporu ${b}. Z hlediska tohoto střetu druhého přesvědčil.`:`${b} se nenechal lstí ${a} přesvědčit. Zamýšlený klam v tomto porovnání neobstál.`;
 if(primary==='Command')return winnerA?`${a} dokázal svůj požadavek ve střetu prosadit.`:`${b} dokázal požadavku ${a} odolat.`;
 if(primary==='Theatrics')return winnerA?`Výkon ${a} ve střetu obstál a zamýšlený dojem se podařilo udržet.`:`${b} předvedenou roli nepřijal v zamýšlené podobě.`;
 return winnerA?`${a} dokázal svůj záměr v tomto střetu prosadit navzdory jednání ${b}.`:`${b} odolal záměru ${a} a v porovnání dovedností získal převahu.`;
}
export function skillNarrativeSolo({actorName,skill,level,mode='success',sv=null,svTier=null,objective='',scene='',assistance=false}={}){
 const a=normalize(actorName)||'Postava';
 const sentences=[`${a} ${intent(String(skill||''),null)}.`];
 if(scene||objective)sentences.push(sceneContext({objective,scene}));
 if(assistance)sentences.push('Na jeho úsilí se podílejí i další pomocníci; jejich vliv je již započten do výsledku testu.');
 if(mode==='value')sentences.push(`Rozhodující test určil hodnotu úspěchu SV ${sv} (${svTier?.label||'výsledek podle příslušné tabulky'}). Tato hodnota popisuje kvalitu či pokrok daného úkonu, ale sama o sobě nemění cenu, čas ani spotřebované zdroje.`);
 else sentences.push(soloOutcome(level,skill));
 sentences.push('Tím se však celý děj nemusí uzavírat. Další kroky budou vycházet z toho, co se skutečně odehrává kolem postavy.');
 return sentences.filter(Boolean).join(' ');
}
export function skillNarrativeOpposed({attackerName,defenderName,primary,defenderSkill,action='',comparison,levelA,levelB,objective='',scene=''}={}){
 const a=normalize(attackerName)||'První postava',b=normalize(defenderName)||'Druhá postava';
 const watchVsHide=perceptionVersusStealth(primary,defenderSkill);
 const lines=watchVsHide?(()=>{
  const observer=primary==='Awareness'?a:b,hidden=primary==='Stealth'?a:b;
  return [`${observer} pozorně sleduje okolí a snaží se zachytit i drobné známky něčí přítomnosti.`,
   `${hidden} se zatím pokouší zůstat nenápadný a nevzbudit pozornost. Z jejich protichůdných snah vzniká tichý střet, v němž rozhoduje všímavost proti opatrnosti.`];
 })():[`${a} ${intent(String(primary||''),action)}.`,
  `${b} na jeho pokus reaguje vlastní dovedností ${String(defenderSkill||'své schopnosti')}. Každý z nich v této chvíli sleduje jiný cíl, a právě na jejich střetu závisí výsledek.`];
 if(scene||objective)lines.push(sceneContext({objective,scene}));
 if(comparison?.tie){
  lines.push('Oba výsledky jsou v tomto střetu vyrovnané; ani jeden účastník nezískal převahu.');
  lines.push(comparison.persuasionTie?'Pravidla příslušného přesvědčování vyžadují rozhodnutí remízy, než bude možné vyhlásit vítěze.':'Pokud je pro další průběh potřeba vítěz, může následovat pravidlově přípustný rozstřel.');
 }else if(comparison?.bothFailed){
  const winner=comparison.winner==='a'?a:comparison.winner==='b'?b:null;
  lines.push('Ani jeden z obou pokusů neskončil úspěchem; zamýšlené cíle proto nebyly dosaženy.');
  lines.push(winner?`V pravidlovém porovnání však ${winner} vychází z neúspěchu lépe a získává převahu; to samo o sobě neznamená naplnění jeho původního záměru.`:'Ani jedna postava nezískává převahu a jejich snahy zatím zůstávají nerozhodnuté.');
 }else if(comparison?.winner==='a'||comparison?.winner==='b'){
  const winnerA=comparison.winner==='a',winner=winnerA?a:b,margin=comparison.stars>=3?'výraznou':comparison.stars===2?'zřetelnou':'těsnou';
  lines.push(`Nakonec ${winner} získává ${margin} převahu. Rozdíl mezi jejich úsilím se tak projevil právě ve chvíli, kdy bylo třeba rozhodnout o výsledku.`);
  lines.push(opposedMeaning(String(primary||''),String(defenderSkill||''),winnerA,a,b));
 }else lines.push('O výsledku zatím nelze prohlásit žádnou ze stran za vítěze.');
 lines.push('Co z této převahy vzejde, se ukáže v dalších okamžicích jejich setkání.');
 return lines.filter(Boolean).join(' ');
}
export function skillNarrativeTiebreak({winnerName,method,attackerName,defenderName,primary}={}){
 const reason=method==='higher-d100'?'vyšší původní hod d100':method==='higher-ml'?'vyšší původní Primary ML':'rozhodující dodatečný d10';
 return 'Protože činnost vyžaduje vítěze, remízu '+attackerName+' a '+defenderName+' v dovednosti '+primary+' rozhodl '+reason+'. '+winnerName+' získává těsné vítězství 1 ★. Tento rozstřel nepřidává žádný další následek.';
}
