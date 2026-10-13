/** HMK v1.2, pp.20–57 and Appendices I/II: source-linked, descriptive UI only.
 * DOES NOT modify/authorise game state. No random dice and no replacement
 * for unresolved printed exceptions. Every field gets one help affordance.
 */
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
 parentOccupationSubRoll:[28,'Povolání Slave obsahuje druhy činnosti dle tištěné podtabulky.','Doplňující fyzický d20 jen při Slave.'],
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
export function fieldRuleNote(step,name){
 const n=NOTES[name];if(n)return Object.freeze({page:n[0],effect:n[1],dice:n[2],verified:true});
 const page=STEP_PAGES[step-1]??20;
 return Object.freeze({page,effect:'Toto pole patří ke kroku '+step+' Character Creation. Konkrétní výklad nebo místní výjimka ještě nebyly samostatně přepsány a ověřeny; rozhodnutí musí potvrdit GM.',dice:'Nevytvářejte žádný hod, který konkrétní tabulka nepředepisuje.',verified:false});
}
const esc=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
/** Annotates real label elements, never changes form names/values/required. */
export function withCreationRuleHelp(markup,step){
 return String(markup).replace(/<label>([^<]*)<(input|select)\b([^>]*\bname="([^"]+)"[^>]*)>/g,(whole,label,kind,attrs,name)=>{
  const note=fieldRuleNote(step,name);
  const button=`<button type="button" class="hmk-rule-help" data-hmk-rule-help="${esc(name)}" data-hmk-rule-title="${esc(label.trim())}" data-hmk-rule-page="${note.page}" data-hmk-rule-effect="${esc(note.effect)}" data-hmk-rule-dice="${esc(note.dice)}" data-hmk-rule-verified="${note.verified?'yes':'no'}" aria-label="Pravidla pro ${esc(label.trim())}" title="Pravidla HMK v1.2 · str. ${note.page}">?</button>`;
  return `<label>${label}${button}<${kind}${attrs}>`;
 });
}
