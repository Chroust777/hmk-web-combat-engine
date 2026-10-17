/** HMK v1.2, pp.20–57 and Appendices I/II: source-linked, descriptive UI only.
 * DOES NOT modify/authorise game state. No random dice and no replacement
 * for unresolved printed exceptions. Every field gets one help affordance.
 */
import {SKILL_STAGES,calculateSheetSkills} from './hmk-character-creation.js';
import {OCCUPATIONS, OCCUPATION_PAGES, familyOccupationProfile, familySkillCap} from './hmk-creation-tables.js';
import {parseInstance} from './hmk-skill-instances.js';
import {OCCUPATION_TABLE_PROSE} from './hmk-creation-occupation-excerpts.js';
import {FIELD_LITERAL_QUOTES,STEP_LITERAL_QUOTES} from './hmk-creation-source-quotes.js';
const ADDITIONAL_FIELD_NOTES=Object.freeze({
 graceAspect:[53,'Dvanáct Divine Aspects připadá v úvahu pouze pro postavu marked nebo s alespoň jedním Grace; vybere se přesně jeden.','Fyzický hod Divine Grace byl proveden samostatně; žádná další kostka pro volbu Aspect není předepsána.'],
 moralityChoice:[55,'Morality se posuzuje podle ortodoxního rozmezí daného náboženství. Výsledný postih je odvozený, nikoli zadávaný ručně.','Vyberte skutečnou Morality, neházejte zde další kostkou.'],
 doctrineSubject:[55,'Počet dostupných Doctrine Subjects se řídí maximální Piety; volí se pouze Subjects přípustné pro Ceremony daného konkrétního náboženství.','Výběr z nabídky, bez dalšího hodu.'],
 psycheDice:[40,'Psyche: počet fyzických d20 vychází z Folk a Age. Výsledky 18, 19 a 20 přidají 1, 2 nebo 3 body intenzity.','Zadejte právě předepsaný počet skutečně hozených d20, nikoli součet.'],
 psycheTraitChoice:[40,'Trait lze zvolit z tabulky pro daný výsledek Psyche, nebo použít skutečný fyzický d10.','Při použití d10 musí volba odpovídat hodu.'],
 psycheTraitDie:[40,'Číslo d10 určuje konkrétní Psyche Trait z tabulky; není doplňkovým bonusem k vybrané možnosti.','Volitelný fyzický d10 namísto přímé volby.'],
 ritualSkill:[55,'Follower status, Blessing Bonus a Piety se odvozují z konkrétního Ritual ML aktuální postavy.','Výběr z již skutečně rozvinutých Ritual Skills; nelze zadat vlastní ML.'],
 startingElixir:[269,'Počáteční počet elixírů se stanoví jen při Alchemy ML alespoň 60; zvolené elixíry mají postupně snižovanou AS.','Výběr z 35 tištěných elixírů; bez dalšího náhodného hodu.'],
 pvarChantryId:[197,'Jmenovitá konvokační chantry určuje jméno, konvokaci a počet hvězd z tištěné tabulky.','Volba z doloženého katalogu; neuvedené místo vyžaduje samostatný zdroj.'],
 pvarChantryName:[197,'Název vybrané jmenovité chantry se přenáší automaticky z položky p.197.','Ručně popisujte jen skutečně doloženou jinou chantry.'],
 pvarChantryConvocation:[205,'Konvokace chantry určuje její dostupné prostředky a cenu asistovaného výzkumu.','U jmenovité chantry je konvokace automatická, nelze ji svévolně přepsat.'],
 pvarChantryStars:[205,'Počet hvězd konvokační chantry ovlivňuje dostupné Resources pro asistovaný výzkum.','U jmenovité chantry se hvězdy doplňují přímo z p.197.'],
 pvarAssistedSpells:[54,'Asistovaná Spell Research Capability určuje, které konvokace lze zkoumat s prostředky chantry; výsledné náklady ARP závisí na dostupných Resources.','Vybírá se z pravidlového seznamu kouzel; bez další kostky.'],
 pvarUnassistedSpells:[54,'Neasistovaná Spell Research Capability je omezená Pvârism ML a příslušnou konvokací; aplikace zohlední skutečný ARP rozpočet.','Vybírá se z pravidlového seznamu kouzel; bez další kostky.'],
 pvarGuildRank:[199,'Guild Rank Shèk-Pvâr souvisí s Age, Pvârism ML i politikou guild; pravidlo nestanoví automatickou jedinou hodnost pro všechny.','Vyberte doloženou hodnost z nabídky; nevytvářejte dodatečnou kostku.'],
 pvarAttunedObject:[201,'Attuned Elemental Object je konkrétní předmět odpovídající konvokaci postavy.','Uživatel jej popisuje vlastními slovy; není to náhodný hod.'],
 pvarArtifactKind:[54,'Minor artefact vyžaduje jedno enchantment, major artefact dvě nebo více; navazují na známá kouzla.','Výběr typu, ne fyzický hod.'],
 pvarArtifactSpell:[54,'Enchantment musí být mezi kouzly, která se postava naučila při počátečním výzkumu.','Výběr známého kouzla.'],
 pvarArtifactSpellExtra:[54,'Další enchantment se vyžaduje jen při major artefact, nikoli při minor.','Výběr známého kouzla.'],
 pvarArtifactResult:[54,'Počáteční artefakt může být vytvořen jako casting Success nebo Critical Success za různé ARP náklady.','Přímý výběr výsledné kvality; nejde o právě provedený hod.'],
 pvarArtifactDuration:[54,'Počáteční artefakty byly vytvořeny v consort; lze zvolit Indefinite či Permanent duration.','Výběr délky trvání, bez hodu.'],
 shamanTradition:[301,'Příklady kmenových tradic jsou popisy herního světa, nikoliv automatický zákaz jiných tradic.','Zvolte konkrétní doloženou tradici, bez náhodného hodu.'],
 shamanKathTotem:[301,'Kath běžně užívají klanový totem, který má být konzistentní se zvoleným klanem.','Výběr totemu; odlišné kmenové výjimky vyžadují doložení.'],
 spiritPower:[53,'Počáteční Spirit Powers mohou mít součet Anima nejvýše Spirit Index; platí zvláštní omezení Totem a Talisman.','Výběr z ověřených Powers, žádná fyzická kostka navíc.'],
 spiritTalisman:[300,'Předem připravený Talisman při výběru Spirit Power zvýší požadovanou Anima o 1.','Volba ano/ne u příslušné Power.'],
 familyRitualChoice:[44,'Parent Shaman musí mít konkrétní Ritual v rámci doloženého panteonu; jde o skutečný Skill s konkrétním náboženstvím.','Volba přípustného Ritual bez nové kostky.'],
 urbanChance:[33,'Podíl Urban/Rural pro Background plyne z doloženého rodičovského povolání, nikoli ze svévolně zadané hodnoty.','Podle pravidlové tabulky Parent Occupation.'],
 tribalUnsettled:[29,'Neusazená kmenová společnost používá odpovídající specifická pravidla Background.','Žádný nový hod mimo tabulku.'],
 veteranRoundsMode:[49,'Young obvykle Veteran Skills vynechá; Mature obdrží 5 DP, Old dvě oddělená kola po 5 DP.','Automaticky podle Folk a Age Group.'],
 arcaneTalentMode:[40,'Arcane Talents vznikají z doložených fyzických hodů, nikoli volnou volbou jejich přídělů.','Fyzický d20 a podmíněné d100; rodičovský Invoker má čtyři d20.'],
 wealth:[51,'Standing je odvozen z doloženého Wealth. GM součet lze použít pouze pro výslovně nedoložené profese.','Fyzické hodové skupiny Family a Occupation zůstávají oddělené.'],
 die:[38,'Každý základní atribut se odvozuje z předepsaných fyzických d6 podle Folk, Age a Attribute.','Zapisujte jednotlivé kostky, ne odhadované výsledné číslo.'],
});
const STEP_PAGES=Object.freeze([20,21,22,23,24,26,27,33,35,38,41,45,51,53]);
const NOTES=Object.freeze({
 folk:[20,'Folk určuje dostupné věkové skupiny, rasové schopnosti a pozdější Folk DP. Humans lze vybrat přímo.','Při náhodném určení fyzický d100; pro Elder Folk je nutné potvrzení GM.'],
 folkRoll:[20,'Výsledek fyzického d100 určuje Folk podle tabulky na str. 20.','Pouze skutečný d100 od GM, 01–00; aplikace nehází.'],
 ageGroup:[21,'Věková skupina ovlivňuje charakteristiky, Veteran DP a dostupná povolání.','U Human/Ænarin GM může použít fyzický d100; Elder Folk mají vlastní pravidla.'],
 ageRoll:[21,'Fyzický d100 určí Young, Mature nebo Old podle tabulky pro příslušný Folk.','Hod GM d100; pokud se nelosuje, nezadávat.'],
 birthMonth:[22,'Měsíc narození určuje astrologické znamení a následné bonusy skupin Skills.','Fyzický d12 GM.'],
 birthDay:[22,'Den narození spolu s měsícem určuje znamení a případný cusp.','Fyzický d30 GM.'],
 sunsignTraits:[23,'Sunsign Trait je konkrétní povahový rys navázaný na první znamení.','Výběr nebo fyzický d6 GM z tabulky daného znamení.'],
 sunsignTraitSecondary:[23,'Při narození na cusp je povinný také rys druhého znamení.','Druhý fyzický d6 jen při losování.'],
 traitRoll:[23,'Při losování musí konkrétní Trait odpovídat tabulce prvního Sunsign.','Fyzický d6; vynechte při přímé volbě.'],
 traitRollSecondary:[23,'Druhý hod platí pro druhý Sunsign při cusp.','Fyzický d6.'],
 birthRegion:[24,'Region je základ pro Realm, Society, Pantheon, Native Language a Regional Languages.','Appendix I, str. 415–423: některé regiony vyžadují následný fyzický podhod.'],
 venariveRoll:[24,'Venárivè Region lze určit z regionálního d1000.','Volitelný fyzický d1000; nic se nelosuje v programu.'],
 regionRoll:[24,'V konkrétním regionu d100 určí Realm a jeho společenské, náboženské a jazykové vazby.','Pouze při náhodném regionálním určení; další kostky výhradně dle tabulky.'],
 regionSubRoll:[416,'Výběr některých Realm v Appendix I výslovně požaduje další podhod.','Doplňující fyzický d10 pouze při odpovídajícím výsledku základního d100.'],
 regionTribeRoll:[418,'Tribal lands Hârnu a Álti lands mají zvláštní kmenovou tabulku; kmen určuje také jazyk a obživu.','Samostatný fyzický d100 pouze v uvedených větvích, p.416 a 418.'],
 nativeLanguageRoll:[417,'Dvě tištěné jazykové varianty v Dalkésh se rozlišují předepsanou kostkou.','Fyzický d2 pouze pro řádek, který jej vyžaduje.'],
 regionDialectRoll:[420,'Některé jazyky mají místní dialekt určený vytištěnou podtabulkou.','Doplňující d100 jen při potřebe uvedené v Appendix I.'],
 regionDialectChoice:[422,'Jeden z povolených Triérzi dialektů podle místní rodiny a Realm.','Volba GM; tabulka nepředepisuje nový náhodný hod.'],
 regionAzeriDialectChoice:[416,'Dialekt Nâsik Azéri musí odpovídat vybranému Realm.','Volba GM ze seznamu místních možností.'],
 nativeLanguageChoice:[419,'Mateřský jazyk se při dvojí možnosti určuje podle rodinného prostředí.','Volba GM pouze z povolené dvojice.'],
 regionCommunityChoice:[418,'Rodinná či kmenová komunita může ovlivnit konkrétní náboženství, jazyk nebo obživu.','GM rozhodnutí; žádná vymyšlená kostka.'],
 birthplace:[24,'Realm je konkrétní domovina uvnitř Region. Ovlivňuje sociální systém a jazykové bonusy.','Přímá volba GM, nebo fyzický d100 z Appendix I.'],
 society:[26,'Society určuje tabulky Parent Class, Parent Occupation a sociální omezení.','Určeno Realm, případně výslovná GM kontrola.'],
 socialClass:[26,'Parent Social Class ovlivňuje rodičovské povolání, Native Language DP a hranice vlastního povolání.','Fyzický d100 nebo přípustný d20 v tabulce společnosti.'],
 classDie:[26,'Výhodnější d20 obchází některé nepříznivé sociální výsledky; musí být povolený pro danou společnost.','GM volí fyzický d100 nebo d20, žádný automatický hod.'],
 classRoll:[26,'Číselný výsledek pro Parent Social Class.','Fyzický hod zvolenou kostkou.'],
 subsistence:[29,'Primární kmenová obživa (Farming/Fishing/Foraging/Herding) určuje základní profesní tabulku a někdy Tribal-Settled.','U doložené obživy se neopravuje libovolnou volbou.'],
 familyOccupation:[27,'Parent Occupation určuje dostupné Family Skills a často velikost Family Wealth kostky.','Fyzický d100 z tabulky společnosti/třídy nebo přímé doložené rozhodnutí GM.'],
 parentOccupationRoll:[27,'Určuje konkrétní rodičovské povolání ze správné společenské podtabulky.','Fyzický d100; při Slave nebo Arcanist jsou možné další hody.'],
 parentOccupationSubRoll:[27,'Druh Slave (HMK p.27–28) nebo Feudal Tenant Officer (p.27) se určuje podle samostatné tištěné podtabulky.','Povinný fyzický d20 pouze při výsledku Slave nebo Feudal Tenant Officer.'],
 parentOccupationSpecialRoll:[27,'U Arcanist se podtyp rozlišuje mezi Alchemist, Astrologer a Shèk-Pvâr.','Fyzický d20 pouze pro Arcanist.'],
 parentOccupationConvocationRoll:[28,'Pro Shèk-Pvâr existuje šest primárních konvokací.','Fyzický d6 pouze pokud jej vyžaduje řádek Parent Occupation.'],
 familyWeaponcrafterType:[44,'Weaponcrafter může být Armourer nebo Bowyer; tyto podtypy mají odlišná DP.','Volba GM bez dodatečné kostky.'],
 familyMartialChoice:[43,'U Man-at-arms záleží na doloženém typu výcviku; alternativu Missile nelze zaměnit s neexistujícím jedním Skill.','Doložená volba GM; kulturní Slings pouze při odpovídajícím prostředí.'],
 familyVariantChoice:[42,'Rodičovský podtyp musí odpovídat jedné z tištěných profesních variant a její konkrétní sadě DP. Parent Priest patří pouze do doloženého místního pantheonu.','Výběr GM, pokud pravidla neuvádějí podhod.'],
 familyAuto:[47,'Family Skills mohou dostat celkem 5 DP; každý Skill má limit poloviny Occupational DP rodičovské profese.','Automatické omezení pouze pro úplně doložený rodičovský balíček.'],
 background:[33,'Background rozlišuje prostředí dětství a tím dostupné tabulky Background Skills.','Urban/Rural, City/Wilderness a případné Elder Folk výjimky.'],
 backgroundRoll:[33,'Výsledek d100 určuje konkrétní životní prostředí podle tabulky.','Fyzický d100; u City-State může být zvláštní způsob hodu.'],
 backgroundTensRoll:[28,'City-State dovoluje zvláštní vyhodnocení dvou desítkových kostek.','Pouze druhá fyzická desítková kostka podle pravidla.'],
 estrangementRoll:[35,'Estrangement ovlivňuje další odvozování finančního a sociálního zázemí.','Hod a modifikátory pouze podle doložené tabulky.'],
 occupation:[41,'Occupation určuje přesný profesní balíček DP a počáteční Wealth die. Výběr je omezen Folk, Society a Class.','Případné specializace (Priest, Shèk-Pvâr, Weaponcrafter) volí GM dle p.42–44.'],
 occupationAuto:[48,'Přesně doložená profesní tabulka přiděluje Occupational Skills automaticky.','Nepřepsané specializace vyžadují GM review.'],
 occupationScriptChoice:[47,'Script je samostatná dovednost konkrétního písma. Jednotné číslo Script = jedno písmo.','Výběr ze známých druhů písma podle Appendix II.'],
 occupationSecondScriptChoice:[47,'2nd Script je další odlišné písmo se samostatnými tištěnými DP.','Druhé písmo musí být jiné než první.'],
 occupationThirdScriptChoice:[47,'3rd Script je třetí odlišné písmo se samostatnými tištěnými DP.','Všechna tři písma musejí být různá.'],
 occupationLanguageChoice:[47,'Příděl Language patří konkrétnímu jazyku, nikoliv anonymnímu seznamu.','Výběr jazyka z Appendix II.'],
 occupationLanguageDistribution:[47,'Tištěný plurál Languages může být rozdělen mezi více konkrétních jazyků.','Součet rozdělení = přesná výše tištěného profesního přídělu.'],
 occupationScriptsDistribution:[47,'Tištěný plurál Scripts může být dělen mezi více druhů písma.','Nepoužívat pro jednotné Script ani 2nd/3rd Script.'],
 occupationRitualChoice:[48,'Ritual je dovednost konkrétního náboženství a může být limitovaná panteonem.','Priest musí používat Ritual stejného náboženství.'],
 skillName:[46,'Vybraná dovednost patří konkrétní Skill Group a může být povolena jen v některé fázi výcviku.','Sedm skupin podle str. 46; některé instance Language/Script/Ritual vyžadují výběr.'],
 skillDP:[47,'Každý DP rozvíjí SM dovednosti do 5; nad SM5 vytváří Mastery Boost dle tabulky.','Limit se liší podle stadia Family/Background/Optional/Veteran/Sunsign.'],
 familyScriptChoice:[47,'Family příděl Script patří konkrétnímu písmu používanému rodičovským povoláním.','Stejný rozpočet Family 5 DP; nevzniká další zdroj.'],
 familySecondScriptChoice:[47,'Druhý rodičovský Script je jiná konkrétní dovednost než první.','Písmo se nesmí duplicitně započítat.'],
 familyThirdScriptChoice:[47,'Třetí rodičovský Script musí být jiné písmo než první dvě.','Písmo se nesmí opakovat.'],
 folkAuto:[45,'Folk Skills závisí na Folk a někdy na předepsaných fyzických hodech.','Kúzhai/Sinái/Sidhé mají zvláštní fyzické d10 tabulky.'],
 folkDice:[45,'Fyzické Folk d10 určují konkrétní rasové DP tam, kde to pravidla požadují.','Počet hodů podle Folk; žádné virtuální kostky.'],
 arcaneTalentD20s:[42,'Potomek Invokera má čtyři fyzické Talent Possession hody d20; použije se nejvyšší.','Čtyři skutečně hozené d20, poté případné d100 podle výsledku a Aura.'],
 arcaneTalentD20:[40,'Talent Possession používá skutečný d20, AUR a tabulku pro počet Talentů nebo Spirit.','Bez fyzického d20 není potvrzen počet Talentů.'],
 arcaneTalentD100s:[40,'Talenty jsou určeny následnými d100; každý vygenerovaný název je samostatná instance Skill.','Přesný počet fyzických hodů d100 podle výsledku Talent Possession.'],
 veteranRound:[49,'Veteran DP u Old/Elder se zapisují ve dvou samostatných kolech po 5.','Dříve rozvinutý Skill může získat nejvýše 1 DP v daném kole.'],
 backgroundCityLanguageDistribution:[48,'V City Background jeden základní DP do Language vytvoří 3 konkrétní jazykové DP.','Za 2 základní DP vznikne pool 6 jazykových DP, nikoliv 6 utracených Background bodů.'],
 gmBonusDecision:[48,'Jazykový bonus uděluje GM dobrovolně mimo osm povinných vývojových stadií.','Young 2, Mature 3, Old/Kúzhai/Sinái 4 DP; bez hodu.'],
 gmBonusDistribution:[48,'Dobrovolný bonus lze rozdělit mezi konkrétní jazyky, nikoliv Script.','Celý schválený rozpočet přesně rozdělit podle věku/Folk.'],
 nativeSkillsMode:[47,'Native Language a Native Ritual mají samostatné příděly závislé na rodině, Folk a místním panteonu.','Doložit rodný jazyk a skutečnou víru.'],
 nativeRitualChoice:[47,'Každý kult má vlastní Ritual. Native Religion poskytuje svůj příděl dle Folk a náboženství.','GM volí pouze dostupné náboženství panteonu.'],
 wealthMethod:[51,'Wealth se počítá z Family a Occupation zdroje. Výjimky mohou mít d0.','Dice = konkrétní hody GM; gm = explicitní doložené rozhodnutí.'],
 parentWealthDie:[51,'Family Wealth vychází z rodičovského povolání a jeho zvláštních pravidel.','Velikost fyzické kostky musí odpovídat tištěné tabulce.'],
 occupationWealthDie:[51,'Occupation Wealth závisí na vlastní profesi a některých specializacích.','d0 nemá fyzický hod; nevyplňujte vymyšlenou jedničku.'],
 familyDice:[51,'Fyzické Family Wealth výsledky se zapisují pro audit a výpočet Standing.','Při d0 prázdný seznam výsledků.'],
 occupationDice:[51,'Fyzické Occupation Wealth výsledky se zapisují pro audit a výpočet Standing.','Při d0 prázdný seznam.'],
 wealthAdvantage:[51,'PC Wealth Advantage přidává další kostku a při výpočtu vyřadí nejnižší dle pravidel.','Pouze reálné fyzické hody GM; d0 zůstává bez hodu.'],
 ritualML:[55,'Ritual ML vypočítává Circle, Blessing Bonus a Piety podle příslušné víry.','GM musí ověřit Morality a náboženskou ortodoxii.'],
 ritualClergy:[55,'Clergy status ovlivňuje náboženské postavení v konkrétním kultu.','Přesná pravidla dle příslušného Pantheon.'],
 ritualFightingOrder:[55,'Fighting Order je zvláštní náboženské členství.','GM ověří podmínky příslušného řádu.'],
 graceDie:[40,'Divine Grace používá doložený fyzický hod.','Fyzický d20; neodvozovat z Ritual bez daného hodu.'],
 pvarismML:[54,'Počáteční Arcane Research Points mohou záviset na ověřeném Pvârism ML.','Nevytvářet ML bez skutečného výcviku.'],
});
/** Literal English excerpts from the user-provided HMK v1.2 (printed pages).
 * Deliberately short paragraphs, not a fabricated English translation. When no
 * precise excerpt has been verified, the help tells the user that explicitly.
 */
const SOURCE_EXCERPTS=Object.freeze({
 familyAuto:[47,'Characters receive 5 DP to develop skills listed on the table corresponding to their Parent Occupation, a reflection of skills learned during childhood.','The maximum DP that can be spent on a Family Skill equals half the number listed next to it in the Occupations table, rounded down.'],
 familyOccupation:[47,'Each Occupation on the Occupations table lists a variety of skills appropriate to its nature (pages 42–44).'],
 occupation:[48,'Characters next receive DP in a specific group of skills based upon their own chosen occupation. These are skills improved during an apprenticeship that lasts into the early Young Age Group.'],
 occupationAuto:[48,'Improve all the skills in the chosen occupation by precisely the amount of DP given in the Occupations table.'],
 background:[48,'Characters have an opportunity to develop certain skills more readily according to the milieu of their childhood.'],
 backgroundAuto:[48,'No more than two DP can be spent on the same Background Skill.'],
 nativeSkillsMode:[47,'Native Religion: each religion has its own Ritual skill. Human folk receive one DP in a Ritual skill selected from their native pantheon.'],
 nativeRitualChoice:[47,'Characters may develop Ritual ML in more than one religion; some scholars do so routinely.'],
 skillDP:[48,'No more than 1 DP can be spent on the same Optional Skill, unless it has received no DP thus far, in which case it may receive up to 2 DP.'],
 occupationLanguageChoice:[47,'An entry of Native Language means the DP apply only to the character’s native language. An entry of Languages allows the DP to apply to either a native or foreign one.'],
 occupationLanguageDistribution:[47,'An entry of Languages allows the DP to apply to either a native or foreign one.'],
 occupationScriptsDistribution:[47,'An entry of Script or 2nd or 3rd Script means the DP should be applied to a single script, while an entry of Scripts means the DP may be distributed among any scripts.'],
 occupationScriptChoice:[47,'An entry of Script or 2nd or 3rd Script means the DP should be applied to a single script, while an entry of Scripts means the DP may be distributed among any scripts.'],
 occupationSecondScriptChoice:[47,'An entry of Script or 2nd or 3rd Script means the DP should be applied to a single script, while an entry of Scripts means the DP may be distributed among any scripts.'],
 occupationThirdScriptChoice:[47,'An entry of Script or 2nd or 3rd Script means the DP should be applied to a single script, while an entry of Scripts means the DP may be distributed among any scripts.'],
 skillName:[48,'No more than 1 DP can be spent on the same Optional Skill, unless it has received no DP thus far, in which case it may receive up to 2 DP.'],
 veteranRound:[49,'Old Group: after spending the Veteran 5 DP, Old characters receive an additional 5 DP to reflect the experience of their Mature age group years.'],
 gmBonusDecision:[48,'Extra PC language proficiency usually enhances the game. Unless the campaign’s setting is especially isolated, the GM can award PCs bonus DP according to Age Group or Folk to spend on languages (but not scripts).'],
 backgroundCityLanguageDistribution:[48,'Urban (City) Language Bonus: each DP spent on Languages in the City table grants a pool of 3 DP to develop languages (see also sidebar).'],
});
const OTHER_SOURCE_EXCERPTS=Object.freeze({
 folk:[20,'Unless otherwise explicitly stated, all character generation rules that pertain to humans also apply to Ænarin. Similarly, all rules pertaining to Sinai include Sidhe.'],
 ageGroup:[21,'Every player character’s age is described according to one of three broadly defined groups: young, mature, or old.'],
 birthMonth:[22,'The Tuzyn Reckoning (tr), the most widely used calendar, divides the year into twelve lunar months, each 30 days long.'],
 birthDay:[22,'The d30 result equals the date within the birth month. The sunsign derives from where this date falls in the given Birthday Ranges:'],
 sunsignTraits:[23,'Players choose or roll d6 in the table below for one Sunsign trait according to their character’s corresponding Sunsign. For characters on a cusp, choose or roll for two traits, one from each Sunsign.'],
 socialClass:[26,'Every society to varying degrees consists of a hierarchy of social classes within which belong a variety of occupations. Players randomly determine both the class and occupation of their character’s parents.'],
 classDie:[26,'A d100 roll on the first subtable generates the Class of the character’s parents based purely on the demographics of the society.'],
 classRoll:[26,'However, players have the option of rolling a more favourable d20 on the adjacent column.'],
 backgroundRoll:[33,'Make a d100 roll against the Urban chance corresponding to the Parent Occupation determined in step 7, unless the character is from a non-Settled Tribal Society.'],
 urbanChance:[33,'If the result is less than or equal to this number, the character has an Urban background; otherwise, the character has a Rural background.'],
 wealth:[51,'A character’s Wealth equals the summed result from rolling a number of polyhedral dice from two different sources (refer to the sidebar tables):'],
 fate:[53,'Characters start with 5 Fate Points (FP). They lose them as a result of Fate Rolls, and gain them back through routine recovery and by participating in various divinatory practices.'],
 graceAspect:[53,'In either case, the player now selects one of twelve aspects (page 310) to be associated with its bestowal or mark.'],
 ritualSkill:[55,'Characters with Ritual ML are called Followers in the corresponding religion, most often as laity (see Church Hierarchy, page 315).'],
 doctrineSubject:[55,'Doctrinal Subjects: the Blessing Bonus modifies the tests of a number of Doctrinal skills or rolls—called Subjects—equal to maximum Piety.'],
 startingElixir:[269,'Characters with at least Alchemy ML60 at the end of character generation receive half Alchemy Index (rounded down) elixirs already prepared and stored.'],
 pvarChantryId:[54,'Home Chantry: determine the mage’s home Shek-Pvar chantry (page 197), noting its Star Quality (1 to 5).'],
 pvarGuildRank:[54,'Guild Rank: determine the mage’s rank in the Shek-Pvar (page 199). This is a function of age, Pvarism ML, and even politics—the GM helps determine the character’s ultimate rank.'],
 pvarArtifactKind:[54,'A minor artefact holds one enchantment; a major artefact holds two or more enchantments—see page 256 and page 257 for a complete explanation of artefact creation.'],
 pvarArtifactDuration:[54,'For character generation purposes, all artefacts have been crafted in consort (page 256, step 1).'],
 spiritPower:[53,'At the start of the game, shamans have just recently completed a successful astral journey—the player may select Spirit Powers whose levels do not exceed their character’s Spirit Index (page 300).'],
});
const SOURCE_STAGE_EXCERPTS=Object.freeze({
 'Family Skills':[47,'Characters receive 5 DP to develop skills listed on the table corresponding to their Parent Occupation, a reflection of skills learned during childhood.','The maximum DP that can be spent on a Family Skill equals half the number listed next to it in the Occupations table, rounded down.'],
 'Background Skills':[48,'Each character receives 5 DP to improve skills from the Background Skills table that corresponds to their Urban or Rural background (page 46).','No more than two DP can be spent on the same Background Skill.'],
 'Occupation Skills':[48,'Improve all the skills in the chosen occupation by precisely the amount of DP given in the Occupations table.'],
 'Optional Skills':[48,'Concurrently with their apprenticeship, characters also receive 5 DP to improve skills of their own choosing.','No more than 1 DP can be spent on the same Optional Skill, unless it has received no DP thus far, in which case it may receive up to 2 DP.'],
 'Veteran Skills':[49,'Mature and Old characters receive 5 DP to reflect the veteran experience of already having lived through their Young age group.','No more than 1 DP can be spent on the same Veteran Skill, unless it has received no DP thus far, in which case it may receive up to 2 DP.'],
 'Sunsign Skills':[49,'No more than 1 DP can be spent on the same Sunsign Skill, unless it has received no DP thus far, in which case it may receive up to 2 DP.'],
});
const OCCUPATION_DESCRIPTIONS=Object.freeze({
 'Scholar':[44,'One learned in history, geography, and languages, to some extent that of foreign lands.'],
 'Scribe':[44,'A person skilled in the reading and production of manuscripts, regardless of their actual expertise in the subject.'],
 'Pilot':[43,'A guildmember trained in seagoing navigation, a position required by law on all vessels more than 30 feet long.'],
 'Man-at-arms (Cavalry, Melee)':[43,'A mounted warrior, as seen in imperial legions and among tribal horse-folk.'],
 'Man-at-arms (Cavalry, Missile: Throwing)':[43,'A mounted warrior, as seen in imperial legions and among tribal horse-folk.'],
 'Man-at-arms (Cavalry, Missile: Archery)':[43,'A mounted warrior, as seen in imperial legions and among tribal horse-folk.'],
 'Man-at-arms (Cavalry, Missile: Slings)':[43,'A mounted warrior, as seen in imperial legions and among tribal horse-folk.'],
 'Hunter':[42,'One who stalks and kills game animals for sustenance.'],
 'Fisher':[42,'An expert in catching fish through a variety of methods according to culture and geography.'],
 'Trapper':[44,'An especially rustic hunting specialist skilled in obtaining animal pelts for wholesaling to fur traders.'],
 'Shaman (Spirit)':[44,'An esotericist who seeks power from spirit guides during astral journeys; also might serve as a religious leader.'],
 'Runemaster':[44,'An arcane divinist of the northern Ivinian and Kuzhai folk, skilled in casting runestones to glean fate.'],
 'Mercantyler':[43,'A guildmember involved in trading, as buyer, seller, or go-between agent; might undertake long trading journeys.'],
 'Lexigrapher':[43,'A guildmember who makes and sells vellum, parchment, inks, and quills.'],
 'Locksmith':[43,'A guildmember able to make, repair, and instal keys and locks, as well as other secret devices and doors.'],
 'Potter':[43,'A guildmember who makes and sells goods made from hardened clay, such as jars, jugs, tiles, beads, and amphorae.'],
 'Man-at-arms (Sapper)':[43,'An expert in conducting siege warfare, including mining and the construction and use of missile siege engines.'],
});
const LANGUAGE_EXCEPTION='However, there is no limit to the number of DP that may be spent from the same source on languages (but not scripts). Thus, a character could spend all 5 DP from Optional Skills on the same language.';
/** The book describes 78 base professions. The engine expands many of them into
 * deterministic mechanical variants (not 342 independent printed definitions).
 * Return only the base *verbatim description*; actual variant DP is separate. */
function printedOccupationProse(name){
 let key=String(name??'').trim().toLocaleLowerCase('en');
 key=key.replace(/^gentry:\s*/, '');
 // Preserve distinct printed Man-at-arms descriptions instead of merging them.
 if(key.startsWith('man-at-arms (cavalry'))key='man-at-arms (cavalry)';
 else if(key.startsWith('man-at-arms (archer'))key='man-at-arms (archer)';
 else if(key.startsWith('man-at-arms (sapper'))key='man-at-arms (sapper)';
 else key=key.replace(/\s*\(.*$/, '');
 key=({'forester':'hunter','harper':'harper/skald','jester':'jester/fool',
        'labourer, farm':'labourer','labourer, semi-skilled':'labourer',
        'labourer, unskilled':'labourer'}[key]??key);
 key=key.replace(/^slave(?:\s*\(.*)?$/, 'slave');
 key=key.replace(/^tenant officer(?:\s*\(.*)?$/, 'tenant officer');
 key=key.replace(/^chieftain(?:\s*\(.*)?$/, 'chieftain');
 key=key.replace(/^shèk-pvâr(?:\s*\(.*)?$/, 'shèk-pvâr');
 key=key.replace(/^shaman(?:\s*\(.*)?$/, 'shaman');
 key=key.replace(/^man-at-arms(?:\s*\(.*)?$/, 'man-at-arms');
 key=key.replace(/^weaponcrafter(?:\s*\(.*)?$/, 'weaponcrafter');
 key=key.replace(/^priest(?:\s*\(.*)?$/, 'priest');
 key=key.replace(/^farmer(?:\s*\(.*)?$/, 'farmer');
 key=key.replace(/^hunter(?:\s*\(.*)?$/, 'hunter');
 key=key.replace(/^gladiator(?:\s*\(.*)?$/, 'gladiator');
 return OCCUPATION_TABLE_PROSE[key]??null;
}
const normalizeField=name=>String(name??'').replace(/\d+$/,'');
function detailsForSkill(character,selected,stage){
 if(!character||!selected||!stage)return null;
 const h=character.hmk??{},c=h.creation??{};
 const selectedName=String(selected).trim();
 let source=SOURCE_STAGE_EXCERPTS[stage];if(!source)return null;
 const spec=parseInstance(selectedName),dp=c.skillDP?.[stage]?.[selectedName]??0;
 let extra=`Dovednost: ${selectedName}. Aktuálně přiděleno v tomto stadiu: ${dp} DP.`;
 if(spec?.type==='Language')extra+=' Jazyk je výslovná výjimka z limitu DP z jednoho zdroje (p.48).';
 if(stage==='Family Skills'){
  const v=c.values??{},profile=familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);
  extra+=` Rodič: ${h.familyOccupation||'dosud neurčen'}.`;
  if(profile)extra+=` Maximum Family DP pro tuto dovednost: ${familySkillCap(profile,selectedName)}.`;
 }
 if(stage==='Occupation Skills')extra+=` Povolání: ${character.occupation||'dosud neurčeno'}.`;
 if(['Optional Skills','Veteran Skills','Sunsign Skills'].includes(stage)){
  const prior=calculateSheetSkills(character).find(x=>x.name===selectedName)?.dp?.filter(x=>x.stage!==stage).reduce((sum,x)=>sum+x.dp,0)??0;
  extra+=` Ostatní dosud evidované příděly: ${prior} DP. Limit z předchozího výcviku platí pro Script/Ritual, jazyk má zvláštní výjimku.`;
 }
 return {page:spec?.type==='Language'?'47–48':source[0],excerpt:spec?.type==='Language'?source.slice(1).concat([LANGUAGE_EXCEPTION]):source.slice(1),context:extra};
}
/** Live context is read only when the player opens the help icon: the UI never
 * claims that a previous occupation or currently hidden option is selected. */
export function fieldRuleNote(step,name,character=null,selected='',stageOverride=null){
 const canonical=normalizeField(name),n=NOTES[name]??NOTES[canonical]??ADDITIONAL_FIELD_NOTES[canonical],v=character?.hmk?.creation?.values??{},h=character?.hmk??{};
 const stage=stageOverride||SKILL_STAGES[character?.hmk?.creation?.skillStage??-1]||null;
 const page=n?.[0]??STEP_PAGES[step-1]??20;
 const context=[];
 if(h.folk&&step<=5)context.push(`Folk: ${h.folk}`);
 if(h.birthRegion&&step>=5&&step<=7)context.push(`Region: ${h.birthRegion}`);
 if(h.society&&step>=6&&step<=11)context.push(`Society: ${h.society}`);
 if(h.socialClass&&step>=6&&step<=11)context.push(`Parent class: ${h.socialClass}`);
 if(h.familyOccupation&&step>=7&&step<=12&&name!=='familyOccupation')context.push(`Parent occupation: ${h.familyOccupation}`);
 if(character?.occupation&&step>=11&&step<=14&&name!=='occupation')context.push(`Occupation: ${character.occupation}`);
 if(h.background&&step===12)context.push(`Background: ${h.background}`);
 if(step===12&&stage)context.push(`Skill stage: ${stage}`);
 if(selected)context.push(`Právě zvolená možnost: ${selected}`);
 let contextText=context.join(' · '),rule=n?.[1]??'Konkrétní pravidlo pro toto pole není dosud ověřeno proti příslušné tištěné tabulce.';
 let dice=n?.[2]??'Bez doložené tabulky nelze přidávat vlastní hody ani výjimky.';
 // All visible fields have an excerpt extracted from the user-supplied PDF.
 // A fallback is explicitly *step-level*, never misrepresented as a field rule.
 const fieldQuote=FIELD_LITERAL_QUOTES[name]??FIELD_LITERAL_QUOTES[canonical]??null;
 const stepQuote=(n||SOURCE_EXCERPTS[canonical]||OTHER_SOURCE_EXCERPTS[canonical])?(STEP_LITERAL_QUOTES[step]??null):null;
 let excerptPage=(fieldQuote??stepQuote)?.[0]??null;
 let excerpt=(fieldQuote??stepQuote)?[(fieldQuote??stepQuote)[1]]:[];
 let quoteScope=fieldQuote?'pole / související tištěné pravidlo':'obecný text kroku (nikoli doslovná definice pole)';
 // Previous citations provide additional, more specific quotation snippets.
 // Never copy an unverified English paraphrase into the source quotation area.
 const oldExact=SOURCE_EXCERPTS[name]??SOURCE_EXCERPTS[canonical]??OTHER_SOURCE_EXCERPTS[canonical];
 if(oldExact?.length){
  // These are editorially checked source passages; the PDF-built quote is the fallback.
  excerptPage=oldExact[0];excerpt=oldExact.slice(1);quoteScope='doslovné pravidlo ke konkrétní volbě';
 }
 const selectedOccupation=(name==='occupation'?(selected||character?.occupation):name==='familyOccupation'?(selected||h.familyOccupation):null);
 if(selectedOccupation){
  const profile=name==='occupation'?OCCUPATIONS[selectedOccupation]:familyOccupationProfile(selectedOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);
  if(profile){
   const skills=Object.entries(profile.skills??{}).map(([skill,dp])=>`${skill} ${dp}`).join(' · ');
   contextText+=` | Doložený profesní profil: ${skills||'bez profilu dovedností'}`;
   const jobPage=OCCUPATION_PAGES[selectedOccupation];if(jobPage&&!excerpt.length)excerptPage=jobPage;
   const original=printedOccupationProse(selectedOccupation)??OCCUPATION_DESCRIPTIONS[selectedOccupation];
   if(original){excerpt=[original[1]];excerptPage=original[0];quoteScope='tištěný popis základní profese; variantní DP uvedeny zvlášť';}
  }else contextText+=' | Profese nemá v aktuálním katalogu přesně doložené DP. Není přípustné ji automaticky doplnit.';
 }
 if(name==='skillName'||name==='skillDP'){
  const fromSkill=detailsForSkill(character,selected,stage);
  if(fromSkill){
   // A dedicated printed stage excerpt is more relevant than an unrelated group.
   excerpt=fromSkill.excerpt;excerptPage=fromSkill.page;
   quoteScope='původní pravidlo právě vybraného stadia Skills';
   contextText+=' | '+fromSkill.context;
  }
 }
 // For unsaved subtype changes, derive *only a preview* from the current selection.
 // It is never committed as dice evidence or a second character authority.
 if(['familyVariantChoice','familyMartialChoice','familyWeaponcrafterType'].includes(name)&&selected){
  const specialization=name==='familyWeaponcrafterType'?selected:v.familyWeaponcrafterType;
  const martial=name==='familyMartialChoice'?selected:v.familyMartialChoice;
  const variant=name==='familyVariantChoice'?selected:v.familyVariantChoice;
  const variantProfile=familyOccupationProfile(h.familyOccupation,specialization,martial,variant,v.regionProof?.subsistence??v.subsistence);
  if(variantProfile){
   contextText+=' | Výsledek právě zvolené rodičovské varianty: '+Object.entries(variantProfile.skills).map(([skill,points])=>skill+' '+points+' profesních DP').join(' · ');
   const original=printedOccupationProse(variant)||printedOccupationProse(h.familyOccupation);
   if(original){excerpt=[original[1]];excerptPage=original[0];quoteScope='tištěný popis základní profese; DP z aktuální specializace zvlášť';}
  }
 }
 if(name==='occupationAuto'&&character?.occupation&&OCCUPATIONS[character.occupation])rule+=' Konkrétní příděly jsou uvedeny v profesním profilu.';
 if(name==='familyAuto'&&h.familyOccupation){const profile=familyOccupationProfile(h.familyOccupation,v.familyWeaponcrafterType,v.familyMartialChoice,v.familyVariantChoice,v.regionProof?.subsistence??v.subsistence);if(profile)contextText+=` | Family maxima: ${Object.entries(profile.skills).map(([skill,dp])=>`${skill} ${Math.floor(dp/2)}`).join(' · ')}`;}
 if(name==='nativeRitualChoice'&&h.birthRegion==='Karéjia')contextText+=' | Karéjia: tři různá náboženství, každé 1 DP (p.419).';
 if(name==='graceAspect'&&v.graceDie)contextText+=` | Divine Grace d20: ${v.graceDie}; Aspect pouze při výsledku 15–20.`;
 if(name==='wealthAdvantage'&&character?.kind==='PC')contextText+=' | PC Wealth Advantage platí povinně.';
 if(name==='startingElixir'||name.startsWith('startingElixir'))contextText+=' | Alchemy: elixír vyberte pouze tehdy, má-li postava odpovídající Alchemy ML.';
 if(name==='shamanTradition'&&!String(character?.occupation??'').startsWith('Shaman'))contextText+=' | Šamanská pravidla se nyní na toto povolání nevztahují.';
 const verified=!!n,hasExcerpt=excerpt.length>0;
 // Quote provenance is separate from the present character's derived statistics.
 return Object.freeze({page:excerptPage??page,effect:rule,dice,verified,excerpt:Object.freeze(excerpt),context:contextText,hasExcerpt,quoteScope});
}
const esc=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
/** Annotates only visible/in-form controls. All actual game state stays in
 * hmk-character-creation.js and the existing CAS history pipeline. */
export function withCreationRuleHelp(markup,step){
 // Labels containing a dynamically generated select are still fields; the DP
 // pool controls do not have individual name= attributes, so use their
 // data-hmk-rule-field on the enclosing label instead.
 return String(markup).replace(/<label\b[^>]*>[\s\S]*?<\/label>/g,labelMarkup=>{
  const opening=/<label\b[^>]*>/.exec(labelMarkup)?.[0]??'';
  const inferred=/\bdata-hmk-rule-field="([^"]+)"/.exec(opening)?.[1];
  const firstControl=/<(?:input|select)\b[^>]*>/.exec(labelMarkup);
  if(!firstControl)return labelMarkup;
  const name=inferred??/\bname="([^"]+)"/.exec(firstControl[0])?.[1];
  if(!name || /\btype="hidden"/.test(firstControl[0]) || labelMarkup.includes('class="hmk-rule-help"'))return labelMarkup;
  const before=labelMarkup.slice(opening.length,firstControl.index);
  const caption=before.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()||name;
  const note=fieldRuleNote(step,name);
  const button=`<button type="button" class="hmk-rule-help" data-hmk-rule-help="${esc(name)}" data-hmk-rule-step="${step}" data-hmk-rule-title="${esc(caption)}" data-hmk-rule-page="${note.page}" data-hmk-rule-effect="${esc(note.effect)}" data-hmk-rule-dice="${esc(note.dice)}" data-hmk-rule-verified="${note.verified?'yes':'no'}" aria-label="Pravidla pro ${esc(caption)}" title="HMK v1.2 · kontextové pravidlo">?</button>`;
  return labelMarkup.slice(0,firstControl.index)+button+labelMarkup.slice(firstControl.index);
 });
}
