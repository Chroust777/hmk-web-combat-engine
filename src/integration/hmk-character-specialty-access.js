/**
 * Character-only journal navigation. HMK v1.2 pp.40,45–49,53–54,
 * 200–205,259–264,265–274,282–284,300–306,315,343.
 *
 * This is a READ-ONLY projection of existing Character Creation / advancement.
 * Never treat an occupation label, an untrained skill's base SM, a dormant
 * Talent or an owned item as proof that a character can execute a procedure.
 * Action eligibility remains owned by the original rule-specific writer.
 */
import {calculateSheetSkills,characterJournalReadiness} from './hmk-character-creation.js';

const DEFINITIONS=Object.freeze([
 {id:'special-alchemy',label:'Alchemy',title:'Alchemy · elixíry',page:'HMK 265–274'},
 {id:'special-spellbook',label:'Spellbook',title:'Shèk-Pvâr · naučená kouzla',page:'HMK 200–205, 211'},
 {id:'special-talents',label:'Arcane Talents',title:'Arcane Talents',page:'HMK 40, 47, 259–264'},
 {id:'special-runes',label:'Runecraft',title:'Runecraft',page:'HMK 282–284'},
 {id:'special-rituals',label:'Rituals',title:'Ritual · konkrétní víry',page:'HMK 315, 343'},
 {id:'special-spirits',label:'Spirit Powers',title:'Shaman · Spirit Powers',page:'HMK 300–306'},
 {id:'special-herblore',label:'Herblore',title:'Herblore · byliny',page:'HMK 45–49'}
]);
const active=(r)=>Number.isFinite(r?.ml)&&r.ml>0&&Number.isFinite(r?.totalDP)&&r.totalDP>0;
const rowFor=(rows,name)=>rows.find(r=>r.name===name&&active(r));
const detail=(name,value)=>({name,value:String(value)});

/** Returns ONLY proven, character-specific menu chapters. No persistence. */
export function characterSpecialtyChapters(character){
 if(!character?.hmk?.creation||!characterJournalReadiness(character).ready)return [];
 const h=character.hmk,creation=h.creation,proofs=creation.values||{},skills=calculateSheetSkills(character);
 const chapters=[];
 const add=(id,reason,details=[],note='')=>{
  const {label,title,page}=DEFINITIONS.find(x=>x.id===id);
  chapters.push({id,label,title,page,reason,details,note});
 };
 const alchemy=rowFor(skills,'Alchemy');
 if(alchemy){
  const known=h.startingElixirs?.elixirs;
  add('special-alchemy','Osvojená Alchemy; nestačí samo povolání ani teoretické SB.',
   [detail('Alchemy ML',alchemy.ml),detail('Vývoj dovednosti',alchemy.totalDP+' DP'),
    ...(Array.isArray(known)?[detail('Doložené počáteční elixíry',known.length)]:[])],
   'Výroba, AS, dávky a Decay zůstávají v původních alchymistických procedurách Kalendáře. Tato kapitola nedává automaticky právo vytvořit neznámý elixír.');
 }
 const pvar=rowFor(skills,'Pvârism'),spells=proofs.startingPvarSpellsProof;
 // The starting spell proof identifies known spells. Occupation/Pvârism alone do not.
 if(pvar&&spells&&Array.isArray(spells.spells)&&Array.isArray(spells.freeSpells)&&
    JSON.stringify(h.startingPvarSpells)===JSON.stringify(spells)){
  const known=[...spells.freeSpells,...spells.spells.map(s=>s.id)];
  add('special-spellbook','Osvojený Pvârism a potvrzená konkrétní kouzla z Character Creation.',
   [detail('Pvârism ML',pvar.ml),detail('Primary Convocation',spells.primary),
    ...known.map(name=>detail('Známé kouzlo',name))],
   'Seznam je počáteční důkaz znalosti, nikoli automatické seslání. Úspěch seslání, trvání a následky vyhodnocují existující Spellfire/Initiative procedury.');
 }
 const talentProof=proofs.arcaneTalentProof;
 if(talentProof&&Array.isArray(talentProof.generated)&&talentProof.generated.length){
  const talents=talentProof.generated.map(name=>({name,row:rowFor(skills,`Talent (${name})`)}));
  const proven=talents.filter(t=>t.row);
  if(proven.length)add('special-talents','Vrozený Talent doložený fyzickým hodem a vyvinutou konkrétní dovedností.',
   proven.map(t=>detail(`Talent · ${t.name}`,`ML ${t.row.ml}${t.row.ml<20?' · latentní (nelze vědomě invokovat)':''}`)),
   'Latentní Talent (ML pod 20) není dostupnou vědomou akcí. Zobrazení znalosti neobchází vlastní pravidla invokace ani Negation.');
 }
 const runes=rowFor(skills,'Runecraft');
 if(runes)add('special-runes','Osvojená Runecraft, nikoli samotné vlastnictví runového předmětu.',
  [detail('Runecraft ML',runes.ml)],
  'Runecraft ML neprokazuje vlastnictví konkrétní runy, znalost vzoru ani právo provést neimplementovanou výrobu.');
 const rituals=skills.filter(r=>/^Ritual \(.+\)$/.test(r.name)&&active(r));
 if(rituals.length)add('special-rituals','Doložené specializované Ritual skilly; žádné plošné odemčení obřadů.',
  rituals.map(r=>detail(r.name,`ML ${r.ml}`)),
  'Přístup k vyšším obřadům může navíc vyžadovat Circle of Command, postavení a konkrétní vyznání. Samotné Ritual ML nezakládá duchovní hodnost.');
 const spirit=rowFor(skills,'Spirit'),spiritProof=proofs.spiritPowerProof;
 if(spirit&&String(character.occupation??'').startsWith('Shaman (')&&spiritProof&&Array.isArray(spiritProof.powers)&&
    JSON.stringify(h.startingSpiritPowers)===JSON.stringify(spiritProof)){
  add('special-spirits','Osvojený Spirit a individuální potvrzení počátečních Spirit Powers.',
   [detail('Spirit ML',spirit.ml),detail('Spirit Index',spiritProof.index),
    ...spiritProof.powers.map(p=>detail(`${p.family} · ${p.subject}`,`Anima ${p.anima}${p.talisman?' · Talisman':''}`))],
   'Výčet je důkaz dostupných počátečních schopností, nikoli samostatný writer Spirit Communion nebo šamanských účinků.');
 }
 const herblore=rowFor(skills,'Herblore');
 if(herblore)add('special-herblore','Osvojená Herblore bez ohledu na zapsané povolání.',
  [detail('Herblore ML',herblore.ml)],
  'Získání a příprava konkrétních rostlin stále vyžaduje dostupné suroviny a příslušné GM procedury.');
 return chapters;
}
export const characterSpecialtyById=(character,id)=>characterSpecialtyChapters(character).find(ch=>ch.id===id)||null;
export const isCharacterSpecialtySection=id=>DEFINITIONS.some(ch=>ch.id===id);
