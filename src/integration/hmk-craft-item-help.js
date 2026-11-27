// Player-facing reference for the printed alchemy catalogue (HMK pp. 268–274).
import {canonicalProfusionProfile} from './hmk-alchemy-profusion.js';
import {canonicalAlchemyIllEffect} from './hmk-alchemy-ill-effects.js';

export const elixirHelp=Object.freeze({
 Acid:"Nalijte na materiál nebo rozbijte lahvičku o cíl. Každé kolo kontaktu hoďte d10 proti aktuální AS. Úspěch způsobí 1 poškození, AS klesne o 1 při každém hodu. Na zbrani klesá WQ, na oděvu či zbroji AV a na těle přibývá f Burn Injury Level s následným Shock Roll. Rozstřik má průměr 6 palců a zasáhne jednu lidskou lokaci. U předmětu velkého 6 palců stačí k jeho zničení orientačně 5 úspěchů na dřevo, 7 na kov a 9 na kámen.",
 Airtap:"Vypij před potápěním nebo dlouhým přesunem. Dech vydrží dvakrát déle a únava z pohybu přibývá poloviční rychlostí. Únava ze sesílání kouzel, invokace a návratu duše do těla se počítá běžně.",
 Aqua:"Vypij před cestou s omezenou zásobou vody. Po dobu účinku ti stačí čtvrtina obvyklé vody. Elixír žádnou vodu nevytvoří a zbývající potřebu musíš pokrýt.",
 Darkvision:"Vypij, když chceš vidět uvnitř jeskyně, neosvětlené chodby nebo jiné úplné tmy. Vidíš normálně do vzdálenosti aktuální AS × 5 stop. Okolí zůstává tmavé, takže tě před ostatními stále může skrýt.",
 Dreamwalk:"Vypij, pokud chceš vstoupit do světa duchů. Tvá aktivní duše se může pohybovat a jednat v duchovním světě po AS kol, zatímco tělo zůstává v kómatu. Potom následuje Reembodiment Roll, tedy hod na návrat do těla.",
 Egosight:"Vypij před zkoumáním artefaktu a pak se ho dotkni. U velkého artefaktu zjistíš jeho Ego a zda podléhá Ego Subversion, případně poznáš přítomnost vlastní vůle bez její přesné hodnoty. U malého artefaktu rozeznáš jeho druh, jeho schopnosti však zůstávají skryté.",
 Equipoise:"Vypij, chceš-li posílit přínos hodů na Fate. K Fate Rollu se přidá d10 proti aktuální AS. Pokud Fate uspěje, úspěch d10 zvýší jeho přínos o jeden stupeň bez horní hranice hvězd a sníží AS o 2, neúspěch d10 sníží AS o 1. Neúspěšný Fate Roll AS neovlivní.",
 Erudition:"Vypij před zkoumáním znalostí, řešením problému nebo tvůrčí prací. Úspěšný test ze skupiny Lore nebo test Reasoning či Creativity se změní na kritický úspěch, pokud d100 končí číslicí 3, 5, 8 nebo 0.",
 Eruption:"Výbušný elixír se aktivuje prudkým rozbitím nádoby. V kruhu o průměru 10 stop způsobí v okamžiku výbuchu plošné popáleniny s Fire Impact d4 + AS. Ohrožení protivníci v okolí házejí Morale Roll, i když nebyli přímo zasaženi.",
 Exsiccation:"Po vypití můžeš akcí na jeden tah vydechnout oblast magického sucha o poloměru 5 stop. Po dobu AS minut tě následuje a mění vodu v okolí na éterickou. Na vodu uvnitř těl nepůsobí a každý výdech sníží AS o 1.",
 Fireshield:"Vypij před vystavením ohni nebo silnému horku. Proti ohni přidává polovinu aktuální AS k AV ve všech lokacích i k plošnému AV. Pro Heat Hazard Roll se naopak plošné AV o polovinu AS sníží až na 0. K hodům Heat Exposure Advance získáš bonus ve výši poloviny AS × 5.",
 Footpad:"Vypij, když potřebuješ projít nebo pracovat potichu. Pohyb získá k Stealth ML bonus aktuální AS × 5 a stejný bonus může pomoci při Legerdemain, když záleží na tichu. Řeč zní jako šepot a výkřik jako běžná řeč. Účinek tlumí i držené předměty do celkové hmotnosti poloviny Spirit ML v librách.",
 Formfix:"Vypij před sesíláním kouzel nebo invokací Talentu. Při neúspěchu F či CF přidej d10 proti AS. Jeho úspěch zlepší původní výsledek o jeden stupeň a spotřebuje 1 AS. Úspěšné seslání ani invokaci elixír nemění.",
 Fumebomb:"Aktivuje se prudkým rozbitím nádoby. Na jedno kolo zakryje výhled hustým kouřem o průměru 10 stop. Tvorové uvnitř při rozbití házejí Shock s postihem AS × 5. CF způsobí UNC, F způsobí INC, S způsobí STN a CS nezpůsobí Shock.",
 Ghostsight:"Vypij, chceš-li použít Spirit Sensing, zatímco duše zůstává v těle. Volně přepínáš mezi vnímáním fyzického a duchovního světa. Duchovní pohled udržíš nejvýše polovinu AS kol, minimálně jedno kolo. Návrat k fyzickému pohledu spotřebuje 1 AS.",
 Healing:"Vypij nebo podej zraněnému. Okamžitě odstraní Windedness a Weariness, zastaví krvácení, odstraní STN, INC a UNC a vyvolá příslušný hod u každého stávajícího tělesného traumatu. Každý den se hází d10 proti aktuální AS. Úspěch vyvolá další sadu hodů a při každém denním hodu klesne AS o 1. Denní kontroly končí při AS 0 nebo po zhojení všech původních traumat. Běžné hojení pokračuje a nové trauma tato dávka nepokrývá.",
 Iceshield:"Vypij před vystavením mrazu. Přidává polovinu AS k AV proti Frost, včetně plošného AV, a pomáhá proti Cold Hazard. K hodům Cold Shock a Exposure Advance přidává polovinu AS × 5.",
 Mending:"Nalij na poškozené nebo rozbité vybavení, které chceš úplně opravit. Jedna dávka může opravit i několik předmětů, pokud jejich souhrnná hmotnost nepřesáhne AS × 2 libry.",
 Might:"Po vypití můžeš i reflexivně vyvolat vzepětí síly o +4 STR na AS kol. Projeví se v Strength ML, síle zásahu, Heft, nátahu luku a zatížení. Po odeznění každého vzepětí se AS sníží o 1. Zvýšená citlivost k bolesti vyrovná případnou výhodu v Shock Rollu.",
 Mindsalve:"Vypij při duševním traumatu. Odstraní Withdrawing, Routed, Afraid, Terrified a Catatonic a dá okamžitý Recovery Roll za každý stávající PSY stres. Každý den se hází d10 proti aktuální AS. Úspěch zopakuje Recovery Rolls pro původní stres. AS každý den klesne o 1 a kontroly končí při AS 0 nebo po odeznění původního stresu. Samotný Shadow ani jeho Resistance Roll elixír neovlivní.",
 "Object Aegis":"Nalij na předmět o hmotnosti nejvýše AS × 5 liber. Při pokusu o Attunement nebo Psychometry přidej d10 proti AS elixíru. Úspěch tohoto obranného hodu zhorší výsledek pokusu o jeden stupeň a spotřebuje 1 AS.",
 Passion:"Po vypití získáš Disorder spojený s povahovým rysem nebo znamením. Konkrétní rys určuje alchymista už při výrobě.",
 Physic:"Vypij, chceš-li zeslabit účinky dříve vypitých elixírů. Od AS všech, které na tebe právě působí, odečti AS Physicu. Účinky při AS 0 skončí. Oslabit lze i trvající otravu z elixíru Poison.",
 Poison:"Po požití vyvolá herní otravu s nástupem za jedno kolo a Healing Rate 10 − výsledná AS. Po nástupu se v každém dalším kole hází Poison Course. Při vypití CS sníží AS o 1, F ji zvýší o 1 a CF o 2.",
 Quiescence:"Po vypití duše upadne do nečinnosti a tělo se přestane hýbat. Při vypití CS sníží AS o 1, F ji zvýší o 1 a CF o 2. Duše zůstane v nečinnosti, dokud účinek trvá.",
 Shadowbreath:"Po vypití můžeš akcí na jeden tah vydechnout oblak tmy o poloměru 5 stop. Po dobu AS minut tě následuje, blokuje výhled a uvnitř zlepšuje o jeden stupeň Stealth testy pro ukrývání. Každý výdech spotřebuje 1 AS.",
 Shout:"Po vypití můžeš akcí na jeden tah vydat výkřik, který ohluší tvory do 30 stop a vyžádá Shock Roll proti SHK 6. Hluchota má HR 5 a Healing Period 10 minut. Každý výkřik spotřebuje 1 AS.",
 Soulbuffer:"Vypij, pokud potřebuješ pohltit Aural Shock ve vlastním těle. Elixír pohltí i již přítomný Aural Shock a za každý pohlcený stupeň ztratí 1 AS. Tím může chránit spící duši před rozpadem. Při aktivním pobytu v duši elixír nepůsobí.",
 Soulcloak:"Vypij, pokud se potřebuješ ukrýt před True Sight. Při každém zacílení hoď d10 proti aktuální AS. Úspěch automaticky zmaří pokus o True Sight a sníží AS o 1.",
 Sustenance:"Vypij před cestou či prací bez zásob jídla. Výživa vydrží AS dnů běžné námahy, třeba pochodu nebo práce. Den strávený v klidu spotřebuje jen polovinu denní zásoby elixíru.",
 Traumashield:"Vypij, pokud čekáš situaci, která by mohla vyvolat Shock Roll. Ke každému takovému hodu přidej d10 proti AS. Úspěch sníží Shock Index o 1 a spotřebuje 1 AS.",
 Verity:"Vypij při podezření na klam. Elixír ti odhalí iluzi, která působí přímo na tebe, i viditelnou iluzi do 60 stop. Účinkem je odhalení iluze příjemci. Iluze po odhalení dál trvá.",
 Wakefulness:"Vypij před dlouhou hlídkou nebo jinou činností bez možnosti spát. Umožňuje zůstat vzhůru po AS dní. Weariness se zotavuje v obvyklých intervalech.",
 Warmth:"Vypij, chceš-li chránit před mrazem sebe i blízké spojence. Získáš +2 Frost AV a +10 k příslušným hodům jako u Iceshield. Ostatní tvorové do 5 stop získají +1 Frost AV a +5 k těmto hodům, dokud jsou v dosahu.",
 Weakness:"Aktivuje se prudkým rozbitím nádoby, které uvolní neviditelné výpary v kruhu o průměru 20 stop. Tvorům uvnitř při rozbití sníží STR o polovinu AS. Změna se projeví v Strength ML, síle zásahu, Heft, nátahu i zatížení. Snížená citlivost k bolesti vyrovná případný postih k Shock Roll."
});

const appliedUse={
 Acid:'Nalít nebo vrhnout na cíl.',
 Eruption:'Prudce rozbít lahvičku.',
 Fumebomb:'Prudce rozbít lahvičku.',
 Mending:'Nalít na předměty určené k opravě.',
 'Object Aegis':'Nalít na jeden předmět.',
 Weakness:'Prudce rozbít lahvičku.'
};
const lastingInstant={
 Acid:'Po aplikaci každé kolo kontaktu, dokud trvá kontakt a zbývá AS.',
 Dreamwalk:'Okamžitý přechod. Pobyt ve světě duchů trvá AS kol.',
 Eruption:'Jednorázový plošný zásah.',
 Fumebomb:'Kouř trvá 1 kolo.',
 Healing:'Okamžité zotavení; původní traumata mohou dostávat denní hody.',
 Mending:'Okamžitá a trvalá oprava.',
 Mindsalve:'Okamžité zotavení; původní stres může dostávat denní hody.',
 'Object Aegis':'Okamžitá aplikace. Ochrana předmětu trvá až do vyčerpání AS v obranných hodech.',
 Physic:'Jednorázové snížení AS ostatních účinných elixírů.',
 Poison:'Nástup po 1 kole; Course po každém dalším kole do konce otravy.',
 Sustenance:'AS dní aktivní výživy. Jeden den v klidu spotřebuje ½ dávky na den.',
 Wakefulness:'AS dní bez potřeby spánku.',
 Weakness:'Pravidla označují účinek jako okamžitý a neudávají vlastní dobu odeznívání.'
};
const appliedRisk={
 Acid:'Požití je smrtelné, jakmile Injury Level dosáhne pětiny počtu zón tvora.',
 Eruption:'Požití automaticky vyvolá Crucial Alchemical Dissolution (HMK 267).',
 Fumebomb:'Požití automaticky vyvolá Crucial Alchemical Dissolution (HMK 267).',
 Mending:'Požití vyvolá Alchemical Dissolution. Crucial nastane při d100 končícím na 2, 3, 5, 7, 8 nebo 0 (HMK 267).',
 'Object Aegis':'Požití vyvolá Alchemical Dissolution. Crucial nastane při d100 končícím na 2, 3, 5, 7, 8 nebo 0 (HMK 267).',
 Weakness:'Požití vyvolá Alchemical Dissolution. Crucial nastane při d100 končícím na 2, 3, 4, 5, 7, 8, 9 nebo 0 (HMK 267).'
};
const penaltyTargets={
 vision:'testy využívající zrak mimo stín či pološero',
 'shock-roll':'Shock Rolls',
 'hearing-per-awareness':'Perception a Awareness při naslouchání'
};
const supportedUse=new Set(['Acid','Darkvision','Egosight','Erudition','Eruption','Fireshield','Footpad','Fumebomb',
 'Healing','Iceshield','Mending','Mindsalve','Object Aegis','Physic','Poison','Quiescence','Verity','Warmth','Weakness']);
function adverseEffect(name,profile){
 switch(profile.kind){
  case 'not-imbibed':return appliedRisk[name];
  case 'none':return 'Bez vlastního vedlejšího účinku při CF.';
  case 'weariness':return 'Weariness + základní AS × '+profile.multiplier+'.';
  case 'weakness':return 'Weakness + základní AS × 5. Úspěšný denní d10 odebere 5 Weakness a zbytek zmizí po zotavení z posledního původního traumatu.';
  case 'aural-shock':return 'Aural Shock '+profile.levels+(profile.trigger?' až po hodu na návrat do těla.':'.');
  case 'exposure-penalty':return 'Postih (½ základní AS) × 5 na '+penaltyTargets[profile.attribute]+
   '. Po každých d6 dnech (HP) se hází zotavení s výchozí HR 5.';
  case 'psyche-impulse':return 'Náhodný rys typu Impulse s PSY rovnou polovině základní AS.';
 }
}

export function elixirReference(name){
 if(!Object.hasOwn(elixirHelp,name))return null;
 const profile=canonicalProfusionProfile(name),ill=canonicalAlchemyIllEffect(name);
 return {
  effect:elixirHelp[name],
  use:appliedUse[name]??'Vypít nebo podat příjemci.',
  duration:lastingInstant[name]??(name==='Quiescence'?
   'Do AS 0 nebo zrušení účinku. Při Decay úspěch ubere 2 AS, neúspěch 1 AS.':
   'Do AS 0 nebo zrušení účinku. U dočasných dávek pokračuje 30denní Decay i po vypití.'),
  adverse:adverseEffect(name,ill),
  adverseLabel:profile.use==='Applied'?'Riziko požití':'Vedlejší účinek při CF',
  exempt:profile.exempt&&profile.use==='Imbibed',
  supported:supportedUse.has(name),
  sourcePage:ill.sourcePage
 };
}

export const herbalPotionHelp=Object.freeze({
 antivenin:'Pije se při otravě po jedovatém kousnutí nebo bodnutí. Po nástupu účinku pomáhá při hodech na průběh otravy.',
 aphrodisiac:'Pije se. Zvyšuje sexuální touhu a dočasně ztěžuje odolávání svádění.',
 aromatic:'Používá se jako parfém. Charakteristická vůně dočasně pomáhá při Charm.',
 coagulant:'Přikládá se jako obklad na jednu krvácející ránu. Pomáhá při Bleeding Rolls.',
 curative:'Přikládá se jako obklad. Pomáhá při hojení a odolávání infekci; plošné zranění vyžaduje pět dávek.',
 emetic:'Pije se. Vyvolává zvracení a po krátké době vyžaduje Shock Roll.',
 hallucinogenic:'Užívá se kouřením nebo požitím. Mění vnímání a může ovlivnit lucidní snění nebo Trance.',
 narcotic:'Pije se. Tlumí bolest a pomáhá při Shock Rolls za cenu horší pohyblivosti a obratnosti.',
 paralytic:'Působí po požití nebo při poranění zbraní s nanesenou pastou. Může způsobit ochrnutí.',
 poison:'Působí po požití nebo při poranění zbraní s nanesenou pastou. Potence ovlivňuje průběh otravy.',
 soporific:'Pije se. Podle potence a výsledku Endurance způsobí únavu, vyřazení nebo bezvědomí.',
 stimulant:'Pije se. Dočasně zvyšuje Initiative a Awareness.'
});
