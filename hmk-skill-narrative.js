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
function detail({objective='',scene=''}){return (normalize(objective)?' Záměr GM: '+normalize(objective)+'.':'')+(normalize(scene)?' Okolnosti: '+normalize(scene)+'.':'');}
function soloLevel(level,skill){
 if(level==='CS')return skill==='Lockcraft'?'Mechanismus se podařilo zvládnout mimořádně jistě; jakékoli další výhody určuje situace.':'Pokus se vydařil mimořádně dobře; GM může zdůraznit jistotu, přesnost či dobrý dojem.';
 if(level==='S')return skill==='Guile'?'Protistrana přijala podanou lest, pokud nemá nárok na samostatný odpor.':'Pokus uspěl v zamýšleném rozsahu.';
 if(level==='F')return skill==='Lockcraft'?'Zvolený postup nestačil; zámek zatím nepovolil.':'Pokus nedosáhl zamýšleného cíle; situace zůstává otevřená.';
 return skill==='Lockcraft'?'Práce se zámkem výrazně selhala. Zda přitom došlo k hluku či poškození, určí konkrétní pravidlo nebo GM.':'Pokus selhal kriticky. Konkrétní komplikaci určí pravidlo činnosti nebo GM; žádný postih navíc se automaticky nepřidává.';
}
export function skillNarrativeSolo({actorName,skill,level,mode='success',sv=null,svTier=null,objective='',scene='',assistance=false}={}){
 const subject=normalize(actorName)||'Postava';
 const opener=subject+' '+intent(String(skill||''),null)+'.';
 let outcome=soloLevel(level,skill);
 if(mode==='value')outcome='Dlouhodobá činnost dosáhla SV '+sv+' ('+(svTier?.label||'výsledek dle tabulky')+'). '+(level==='CF'?'Kritické selhání může mít zvláštní následek pouze podle příslušného pravidla.':'Kvalitu hotové práce popiš podle této hodnoty; délku, cenu či materiální následky tím samotný hod neurčuje.');
 if(assistance)outcome='Při pokusu pomáhali další účastníci. '+outcome;
 return opener+detail({objective,scene})+' '+outcome;
}
export function skillNarrativeOpposed({attackerName,defenderName,primary,defenderSkill,action='',comparison,levelA,levelB,objective='',scene='' }={}){
 const a=normalize(attackerName)||'Aktivní postava',b=normalize(defenderName)||'Protistrana';
 const opening=a+' '+intent(String(primary||''),action)+'; '+b+' reaguje pomocí '+String(defenderSkill||'své dovednosti')+'.';
 const extra=detail({objective,scene});
 if(comparison.bothFailed)return opening+extra+' Ani jeden nezvládl svůj test. Žádná strana svůj záměr neprosadila; GM vyloží, co ve scéně znamenají dva neúspěchy.';
 if(comparison.tie)return opening+extra+' Obě strany dosáhly '+levelA+', ale žádná nezískala převahu (0 ★). Původní stav trvá; pokud konkrétní činnost potřebuje vítěze, může GM použít rozstřel.';
 const margin=comparison.stars>=3?'výrazně':comparison.stars===2?'zřetelně':'těsně';
 if(comparison.winner==='a'){
  const special=primary==='Guile'?'Lest přesvědčila protistranu.':primary==='Stealth'?'Pohyb unikl pozornosti protistrany.':primary==='Command'?'Aktivní postava prosadila svou výzvu.':primary==='Theatrics'?'Předstíraná role obstála před prověřením.':'Aktivní strana dosáhla převahy ve sledované činnosti.';
  return opening+extra+' '+a+' vítězí '+margin+' ('+comparison.stars+' ★). '+special+' Konkrétní důsledky určuje GM podle scény.';
 }
 const special=primary==='Guile'?'Protistrana lsti neuvěřila nebo ji rozpoznala.':primary==='Stealth'?'Pozorovatel si všiml toho, co mělo zůstat skryté.':primary==='Command'?'Protistrana odolala nátlaku.':primary==='Theatrics'?'Předstírání protistranu nepřesvědčilo.':'Protistrana zmařila nebo překonala aktivní záměr.';
 return opening+extra+' '+b+' vítězí '+margin+' ('+comparison.stars+' ★). '+special+' Konkrétní důsledky určuje GM podle scény.';
}
export function skillNarrativeTiebreak({winnerName,method,attackerName,defenderName,primary}={}){
 const reason=method==='higher-d100'?'vyšší původní hod d100':method==='higher-ml'?'vyšší původní Primary ML':'rozhodující dodatečný d10';
 return 'Protože činnost vyžaduje vítěze, remízu '+attackerName+' a '+defenderName+' v dovednosti '+primary+' rozhodl '+reason+'. '+winnerName+' získává těsné vítězství 1 ★. Tento rozstřel nepřidává žádný další následek.';
}
