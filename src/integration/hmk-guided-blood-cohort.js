/** HMK Kèthîra p.178: a healer tests EACH bleeding wound in one
 * five-minute treatment group, with a fixed modifier derived from the
 * complete, explicitly identified group. No inferred wounds or dice. */
const insist=(ok,msg)=>{if(!ok)throw Error(msg)};
const validId=x=>typeof x==='string'&&x.length>0;
export const bloodCohortRef=(patientId,woundId)=>{
 insist(validId(patientId)&&validId(woundId)&&!patientId.includes('::')&&!woundId.includes('::'),
  'Neplatná jednoznačná identita rány');
 return `${patientId}::${woundId}`;
};
export function validateGuidedBloodCohort({healerId,timelineId,round,memberRefs,currentRef,
 wounds,priorTreatments=[],plannedBleeders=null}={}){
 insist(validId(healerId)&&validId(timelineId)&&Number.isSafeInteger(round)&&round>=1,
  'Chybí identita léčitele, časová osa nebo dokončený interval');
 insist(Array.isArray(memberRefs)&&memberRefs.length>=1&&memberRefs.length<=100,
  'Vyberte konkrétní krvácivé rány pětiminutové skupiny');
 const unique=[...new Set(memberRefs)];
 insist(unique.length===memberRefs.length&&memberRefs.every(validId),
  'V léčebné skupině jsou neplatné nebo opakované rány');
 const members=unique.sort();
 insist(members.includes(currentRef),'Ošetřovaná rána musí patřit do doložené skupiny');
 insist(plannedBleeders===null||plannedBleeders===members.length,
  'Deklarovaný počet Bleederů musí odpovídat skutečně vybraným ranám');
 const lookup=new Map();
 for(const w of wounds??[]){
  const ref=bloodCohortRef(w.patientId,w.woundId);
  insist(!lookup.has(ref),'Nejednoznačná identita krvácivé rány');
  lookup.set(ref,w);
 }
 const previous=new Map();
 for(const p of priorTreatments){
  if(p.healerId!==healerId||p.timelineId!==timelineId||p.round!==round)continue;
  insist(validId(p.eventId)&&validId(p.woundRef)&&!previous.has(p.eventId),
   'Dřívější ošetření nemá jednoznačný zdroj události');
  insist(Array.isArray(p.memberRefs)&&p.memberRefs.length>0,
   'Starší ošetření neobsahuje ověřenou skupinu – nelze ji změnit uprostřed intervalu');
  const a=[...p.memberRefs].sort();
  insist(a.length===members.length&&a.every((ref,i)=>ref===members[i]),
   'Léčitel má již ve stejném období jinou skupinu Bleederů');
  previous.set(p.eventId,p.woundRef);
 }
 const already=new Set([...previous.values()]);
 insist(!already.has(currentRef),'Stejná rána již byla v tomto pětiminutovém intervalu ošetřena');
 insist(already.size===previous.size,'Jeden Bleeder byl ve stejné léčebné skupině ošetřen vícekrát');
 insist(already.size<members.length,'Všechny rány skupiny již byly vyřízeny');
 for(const ref of members){
  const w=lookup.get(ref);
  insist(!!w,'Zvolená rána neexistuje v současném střetnutí');
  if(already.has(ref))continue; // previously stopped wounds remain cohort members
  insist(w.bleeding===true&&Number.isSafeInteger(w.nextAdvanceRound)&&w.nextAdvanceRound<=round,
   'Rána ve skupině není aktivní Bleeder se skutečně splatným intervalem');
 }
 return {members,plannedBleeders:members.length,completed:already.size,
  cohortId:JSON.stringify([timelineId,round,healerId,members])};
}
