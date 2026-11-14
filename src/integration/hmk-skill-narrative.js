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
 if(normalize(scene))parts.push('Okolnosti: '+normalize(scene).replace(/[.!?]+$/,'')+'.');
 if(normalize(objective))parts.push('Záměr: '+normalize(objective).replace(/[.!?]+$/,'')+'.');
 return parts.join(' ');
}
/** Stable variation by original receipt ID. No fictitious scene events or mechanics. */
function variantHash(input){let h=2166136261;for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
function variant(items,key){return items[variantHash(key)%items.length];}
const SKILL_SCENES=Object.freeze({
 Survival:[
  'čte krajinu jako soubor možností a překážek',
  'porovnává terén s tím, co bude družina potřebovat v dalším úseku',
  'hledá ve známkách okolního prostředí oporu pro bezpečné rozhodnutí',
  'opatrně váží směr postupu a nároky zdejších podmínek',
  'sleduje, kde může krajina cestu usnadnit a kde naopak ztížit'],
 Tracking:[
  'zvažuje drobné známky na zemi a jejich možnou souvislost',
  'hledá ve stopách posloupnost, která dává smysl',
  'pátrá po přerušené stopě a ověřuje její směr',
  'porovnává jednotlivá vodítka a snaží se zachytit změnu pohybu',
  'soustředí pozornost na sotva patrné stopy v terénu'],
 Animalcraft:[
  'sleduje reakce zvířete a přizpůsobuje jim své vedení',
  'zkouší rozpoznat, co zvíře uklidňuje a co rozptyluje',
  'pracuje trpělivě se zvířetem a hodnotí jeho odpovědi',
  'věnuje pozornost signálům zvířete, aby nepřecenil jeho ochotu',
  'hledá při práci se zvířetem správnou míru důslednosti a klidu'],
 Riding:[
  'hledá rovnováhu mezi vedením zvířete a vlastním pohybem',
  'snaží se sladit své reakce s pohybem pod sedlem',
  'udržuje pozornost na ovládání a rytmu jízdy',
  'přizpůsobuje vedení zvířete skutečné situaci',
  'soustředí se na jistotu sedu a přesné vedení'],
 Awareness:[
  'soustředí smysly na nenápadné podrobnosti okolí',
  'pozorně odděluje podstatné signály od běžného ruchu',
  'zkoumá okolí a hledá drobné nesrovnalosti',
  'věnuje pozornost detailům, které mohou snadno uniknout',
  'zvažuje, co lze ze skutečně pozorovaných znaků vyčíst'],
 Climbing:[
  'zvažuje pevnost úchytů a postup dalšího pohybu',
  'hledá bezpečnou posloupnost opor při výstupu',
  'soustředí se na přesné přenášení váhy a rovnováhu',
  'pečlivě ověřuje další možnost postupu vzhůru',
  'hodnotí, zda zvolená cesta nabízí dostatečnou oporu'],
 Physician:[
  'porovnává příznaky a volí odpovídající postup',
  'pečlivě zkoumá stav pacienta před rozhodnutím',
  'snaží se odlišit důležité známky zdravotního stavu od vedlejších',
  'připravuje péči s důrazem na přesnost úkonu',
  'zvažuje známé postupy ošetření podle doloženého stavu'],
});
const SUPPLEMENTARY_SCENES=Object.freeze({
 Acrobatics:['soustředí se na plynulost pohybu i udržení rovnováhy','odhaduje prostor pro každý další pohyb','přizpůsobuje těžiště a načasování zvolenému úkonu','zkouší přesně sladit krok a otočku'],
 Jumping:['odměřuje odraz a přistání','hledá správné načasování skoku','srovnává vzdálenost s vlastními možnostmi','soustředí se na jistý odraz'],
 Swimming:['odhaduje proud a vlastní síly','snaží se udržet rytmus a směr plavání','přizpůsobuje tempo pohybu vodě','hledá ve vodě nejjistější postup'],
 Stealth:['pečlivě volí okamžik nenápadného pohybu','snaží se neupoutat pozornost okolí','odhadne, kde může svůj postup skrýt','hlídá rytmus kroků i případný hluk'],
 Fishing:['sleduje vhodnost místa a zvoleného postupu','trpělivě odhaduje správnou chvíli k záběru','zkouší přizpůsobit svůj způsob lovu podmínkám','věnuje pozornost drobným znakům ve vodě'],
 Herblore:['porovnává znaky nalezených rostlin se svou znalostí','opatrně rozlišuje rostliny podle podstatných znaků','soustředí se na určení a možné použití bylin','ověřuje detaily, které mohou odlišovat podobné druhy'],
 Guile:['pečlivě volí slova, aby působila věrohodně','zkouší najít přesvědčivou podobu své lsti','sleduje, zda jeho vysvětlení drží pohromadě','odhadne, které detaily by mohly jeho záměr prozradit'],
 Charm:['hledá vhodný tón k získání přízně','pozorně reaguje na dojem, který vyvolává','snaží se vystihnout společenskou náladu','volí slova s ohledem na svůj záměr'],
 Discourse:['vytváří argument a hledá jeho oporu','snaží se jasně uspořádat své důvody','zvažuje možné protiargumenty','hledá správný způsob, jak sdělit svůj názor'],
 Command:['formuluje příkaz s důrazem na srozumitelnost','snaží se prosadit svou autoritu','volí pevný tón a jasný požadavek','odhaduje, jak dát svému rozhodnutí váhu'],
 Mathematics:['ověřuje jednotlivé kroky výpočtu','zkouší najít chybu v postupu','porovnává možné početní postupy','sleduje souvislost čísel a vztahů'],
 Metalcraft:['ověřuje přesnost práce s kovem','hlídá správné vedení nástroje','soustředí se na pevnost a tvar opracovávaného kovu','vyhodnocuje kvalitu provedeného úkonu'],
 Woodworking:['kontroluje vlákna a pevnost dřeva','snaží se o přesné vedení řezu či spoje','volí pořadí jednotlivých kroků opracování','posuzuje, zda zvolený spoj dobře sedí'],
 Cookery:['hlídá jednotlivé fáze přípravy jídla','sleduje čas a stav pokrmu','odhaduje správnou míru zpracování','věnuje pozornost chuti a postupu přípravy'],
 Brewing:['prověřuje poměr surovin a správný postup','sleduje, jak se příprava nápoje vyvíjí','pečlivě hlídá jednotlivé fáze vaření','soustředí se na kvalitu zvolené receptury'],
 Melee:['hledá výhodný okamžik při střetu zblízka','soustředí se na načasování útoku či obrany','odhaduje pohyb protistrany a odpovídající reakci','snaží se udržet přesný rytmus boje'],
});
const GENERAL_SCENES=[
 'se soustředí na provedení zvolené činnosti',
 'volí postup, kterým se pokouší dosáhnout svého záměru',
 'prověřuje své schopnosti při konkrétním úkolu',
 'sleduje rozhodující podrobnosti svého úkonu',
 'postupuje krok za krokem a vyhodnocuje překážky',
 'vkládá do úkonu zkušenost i opatrnost'];
const OUTCOMES=Object.freeze({
 CS:['Pokus se mimořádně vydařil.','Výsledek ukazuje výjimečně povedené provedení.','Zvolený postup skončil kritickým úspěchem.','Schopnost se projevila v mimořádně příznivém hodu.','Úkon dopadl lépe než běžný úspěch.'],
 S:['Úkon se podařil.','Výsledek potvrzuje dosažení zamýšleného cíle.','Zvolený postup obstál.','Hod přinesl úspěch.','Snahu završil zdařilý výsledek.'],
 F:['Pokus pro tentokrát nevyšel.','Cíl se nepodařilo splnit.','Výsledek na zamýšlený úspěch nestačil.','Postup tentokrát neobstál.','Hod nedopadl příznivě a úkol zůstává nesplněný.'],
 CF:['Pokus skončil kritickým neúspěchem.','Zvolená činnost dopadla mimořádně špatně.','Hod znamená kritické selhání pokusu.','Při tomto úkonu došlo ke kritickému neúspěchu.','Výsledek ukazuje závažné selhání zamýšleného postupu.']});
function soloOutcome(level,key){return variant(OUTCOMES[level]||OUTCOMES.F,key+':outcome');}
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
export function skillNarrativeSolo({actorName,skill,level,mode='success',sv=null,svTier=null,objective='',scene='',assistance=false,narrativeKey='',roll=null}={}){
 const a=normalize(actorName)||'Postava',k=String(skill||''),base=k.split(/\s*\(/)[0];
 const key=narrativeKey||`${a}:${k}:${level}:${roll??''}:${sv??''}:${objective}:${scene}`;
 const actions=SKILL_SCENES[k]||SKILL_SCENES[base]||SUPPLEMENTARY_SCENES[k]||SUPPLEMENTARY_SCENES[base];
 const action=actions?variant(actions,key+':skill'):variant([intent(k),...GENERAL_SCENES.map(t=>`${t} (${k||'zvolená činnost'})`)],key+':generic');
 const sentences=[`${a} ${action}.`];
 if(scene||objective)sentences.push(sceneContext({objective,scene}));
 if(assistance)sentences.push('Na výsledku se podíleli také doložení pomocníci.');
 sentences.push(soloOutcome(level,key));
 if(mode==='value'&&Number.isFinite(sv))sentences.push(`Výsledná hodnota úspěchu SV ${sv}${svTier?.label?` (${svTier.label})`:''}.`);
 return sentences.filter(Boolean).join(' ');
}
export function skillNarrativeOpposed({attackerName,defenderName,primary,defenderSkill,action='',comparison,objective='',scene='',narrativeKey='',levelA='',levelB=''}={}){
 const a=normalize(attackerName)||'První postava',b=normalize(defenderName)||'Druhá postava';
 const k=narrativeKey||`${a}:${b}:${primary}:${defenderSkill}:${levelA}:${levelB}:${objective}:${scene}`;
 const watchVsHide=perceptionVersusStealth(primary,defenderSkill);
 const introduction=watchVsHide?variant([
  `${a} a ${b} poměřují všímavost a nenápadnost.`,
  `Jeden účastník se snaží zachytit známky přítomnosti druhého, druhý se jim vyhýbá.`,
  `Pozornost a skrytý pohyb se v tomto okamžiku dostávají do přímého střetu.`,
  `Záměr pozorovatele naráží na snahu zůstat neodhalený.`],k+':watch'):
  variant([`${a} ${intent(String(primary||''),action)}; ${b} odpovídá vlastní dovedností ${defenderSkill}.`,
   `Ve střetu ${primary} a ${defenderSkill} oba účastníci sledují vlastní cíl.`,
   `${a} se pokouší prosadit svůj záměr, zatímco ${b} se mu staví na odpor.`,
   `Výsledek rozhodne o tom, čí zvolený postup v této situaci převáží.`],k+':opposed');
 const lines=[introduction];
 if(scene||objective)lines.push(sceneContext({objective,scene}));
 if(comparison?.tie)lines.push(comparison.persuasionTie?
  'Výsledky jsou vyrovnané; pro tuto situaci je nutné rozhodnout remízu.':'Výsledky jsou vyrovnané, převahu nezískává nikdo.');
 else if(comparison?.bothFailed){
  const winner=comparison.winner==='a'?a:comparison.winner==='b'?b:null;
  lines.push(winner?`Oba pokusy selhaly; ${winner} získává pouze pravidlovou převahu, nikoli splnění záměru.`:
   'Oba pokusy selhaly. Žádný z původních záměrů se nenaplnil.');
 }else if(comparison?.winner==='a'||comparison?.winner==='b'){
  const winA=comparison.winner==='a',winner=winA?a:b;
  const strength=comparison.stars>=3?'výrazně':comparison.stars===2?'zřetelně':'těsně';
  lines.push(`${winner} získává ${strength} převahu.`);
  lines.push(opposedMeaning(String(primary||''),String(defenderSkill||''),winA,a,b));
 }else lines.push('Výsledky zatím nedovolují určit vítěze.');
 return lines.filter(Boolean).join(' ');
}
export function skillNarrativeTiebreak({winnerName,method,attackerName,defenderName,primary}={}){
 const reason=method==='higher-d100'?'vyšší původní hod d100':method==='higher-ml'?'vyšší původní Primary ML':'rozhodující dodatečný d10';
 return 'Protože činnost vyžaduje vítěze, remízu '+attackerName+' a '+defenderName+' v dovednosti '+primary+' rozhodl '+reason+'. '+winnerName+' získává těsné vítězství 1 ★. Tento rozstřel nepřidává žádný další následek.';
}
