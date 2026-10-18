/** HMK v1.2 printed pp.20–55. Presentation only; no state or dice changes.
 * Each description is derived from the saved character and active step.
 */
import {CHARACTER_STEPS,SKILL_STAGES,creationOf} from './hmk-character-creation.js';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=(v,fallback='dosud neurčeno')=>v?String(v):fallback;
export function creationStepGuidance(character){
 const h=character?.hmk??{},c=creationOf(character),v=c.values??{},s=c.step;
 const folk=val(h.folk||v.folk),age=val(h.ageGroup||v.ageGroup),region=val(h.birthRegion||v.birthRegion);
 const society=val(h.society||v.society),parent=val(h.familyOccupation||v.familyOccupation);
 const occupation=val(character?.occupation||v.occupation),sign=val(h.sunsign),stage=SKILL_STAGES[c.skillStage]??'dosud neurčeno';
 const explanations={
  1:`Určíte Folk, tedy původ a druh postavy. Tato volba ovlivní pozdější věk, vlastnosti, regiony, dostupná povolání a Folk Skills. Human lze zvolit přímo; při náhodném určení se zadává skutečný d100. Zvláštní Elder Folk lze zvolit jen tam, kde je pro ně podpora a souhlas s kampaní.`,
  2:`Předchozí Folk: ${folk}. Nyní určíte věkovou skupinu, nikoli nutně přesný počet let. Dostupnost Young, Mature a Old se odvíjí od Folk; věk ovlivní hodové sady vlastností, povolání a Veteran Skills. Případný d100 se používá pouze tam, kde jej pravidla připouštějí.`,
  3:`Postava je ${folk}, věková skupina ${age}. Zadejte dva skutečné hody d12 a d30 pro měsíc a den narození. Aplikace z data vypočítá Sunsign a případné hraniční cusp; znamení později určí modifikátory Skill skupin a Sunsign DP.`,
  4:`Dosud vypočtené znamení: ${sign}. Nyní vybíráte povahový Sunsign Trait z odpovídající tabulky, případně ho určíte fyzickým d6. Při narození na cusp vyberete dva traity, jeden z každého znamení. Tento krok není přidělování Sunsign DP.`,
  5:`Folk ${folk} a věk ${age} jsou již stanoveny. Region narození určí místo původu, Society, mateřský jazyk, náboženský pantheon a regionální řeči; podle konkrétního regionu může být předepsaný další fyzický hod nebo omezená nabídka. Neslučujte region, společnost a říši do jedné volby.`,
  6:`Zvolené rodiště: ${region}, společnost: ${society}. Tento krok určuje společenskou třídu rodičů, nikoli osobní postavení postavy podle jejího pozdějšího bohatství. Příslušná tabulka společnosti nabízí fyzický hod a navazující profesní skupiny.`,
  7:`Rodičovská společenská třída: ${val(h.socialClass||v.socialClass)}; Society: ${society}. Zde určíte povolání rodiče a případnou předepsanou specializaci nebo podhod. Rodičovské povolání určuje Family Skills, dostupnost některých budoucích povolání a rodinnou složku Wealth.`,
  8:`Povolání rodiče: ${parent}, společnost: ${society}. V tomto kroku určíte prostředí dětství (Urban/Rural nebo zvláštní kmenové prostředí). U doložené rodičovské profese se Urban chance vyhodnotí z tabulky a skutečného d100. Prostředí poté ovlivní nabídku Background Skills.`,
  9:`Předchozí prostředí: ${val(h.background||v.background)}; rodič: ${parent}. Estrangement popisuje vztah postavy k původní rodině; určuje mimo jiné použitelnou rodinnou složku počátečního Wealth. Následující výpočty musí odrážet právě zvolenou variantu a skutečný hod.`,
 10:`Folk ${folk} a Age ${age} určují sady fyzických kostek a případné modifikátory. Vygenerujete Physical a Mental Attributes, podle pravidel vyhodnotíte Perception a Voice a dokončíte další charakteristiky. Každý předepsaný hod zadáte fyzicky; atributy se pak projeví v Skill Base.`,
 11:`Z rodiny ${parent}, třídy ${val(h.socialClass)} a prostředí ${val(h.background)} přecházíte k vlastnímu povolání. Nabídka závisí na předchozích volbách; u profesí s podtypem volíte právě povolenou specializaci. Profese určuje povinné Occupational DP i složku počátečního bohatství.`,
 12:`Zvolené povolání: ${occupation}; rodič: ${parent}; dětství: ${val(h.background)}. Nyní probíhá osm stadií Skill Development. Právě zobrazené stadium je ${stage}. Každý zdroj DP má vlastní rozpočet a limity; Family, Background a Occupation se nikdy nesmějí vzájemně nahrazovat. Jazyk, písmo a Ritual vybíráte jako konkrétní dovednosti.`,
 13:`Folk ${folk}, původ ${region}, rodičovské povolání ${parent} a vlastní povolání ${occupation} určují podklady pro Wealth. Zadejte oddělené skutečné hody pro příslušné kostky; aplikace vyhodnotí Standing, počáteční prostředky a další odvozené údaje. d0 nevyžaduje hod; PC používá předepsanou výhodu.`,
 14:`Vlastní povolání: ${occupation}; Folk: ${folk}. Závěrečný krok propojuje Divine Grace, Psyche, náboženské Ritual/Doctrine, počáteční elixíry, Spirit Powers a Shèk-Pvâr možnosti jen tam, kde pro ně postava splňuje podmínky. Zobrazené nabídky a povinné hody se mění podle skutečných dovedností, věku a povolání.`
 };
 const [label,page]=CHARACTER_STEPS[s-1]??['?',null];
 return `<div class="notice" data-hmk-step-guidance="${s}"><h3>Co znamená krok ${s}: ${E(label)}</h3><p>${E(explanations[s]??'')}</p><p class="tiny">HMK v1.2 · tištěná str. ${E(page)} · popis je průvodce pro aktuální postavu, nikoli doslovná citace z příručky.</p></div>`;
}
