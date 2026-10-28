/** Additional bestiary encounter entries; v563 animal proofs remain unchanged.
 * Works without inventing generated dice, live Combat State, medical conditions or attributes.
 */
import {BESTIARY_ANIMALS_563,newEncounterBeastProof,validateBestiaryJournal} from './hmk-bestiary-563.js';
import {BESTIARY_SPECIAL_ENTRIES_564} from './hmk-bestiary-pages-564.js';
export const BESTIARY_ENTRIES_564=Object.freeze([
 ...BESTIARY_ANIMALS_563.map(p=>Object.freeze({...p,group:p.group==='domestic'?'Animals – Domestic':'Animals – Wild',generation:'printed-animal',sourcePages:[p.page]})),
 ...BESTIARY_SPECIAL_ENTRIES_564
]);
export const bestiaryEntry564=id=>BESTIARY_ENTRIES_564.find(p=>p.id===id)||null;
const LEGACY_GRYPHON_568={"id":"gryphon-griffin-marenu-390","group":"Mythic Creatures","name":"Gryphon / Griffin (Mârenu)","page":390,"sourcePages":[385,390],"generation":"fixed","attributes":{"str":17,"end":13,"agl":14,"per":19,"snt":3,"aur":7,"wil":13,"rea":8,"cre":7},"skills":{"awareness":80,"initiative":62,"shock":66,"spirit":40,"stealth":80},"move":70};
const expect=(condition,msg)=>{if(!condition)throw Error(msg)};
const validText=(text,max)=>typeof text==='string'&&text.trim().length>=2&&text.trim().length<=max;
// Deterministic corruption witness. Runtime append-only checks remain the primary protection.
function evidenceWitness({id,templateId,name,campaignId,campaignMinute,gmNotes}){
 const text=JSON.stringify([id,templateId,name,campaignId,campaignMinute,gmNotes]);
 let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}
 return hash.toString(16).padStart(8,'0');
}

export function createBespokeEncounterProof564({id,templateId,name,campaignId,campaignMinute,gmNotes=''}={}){
 const base=BESTIARY_ANIMALS_563.find(p=>p.id===templateId);
 if(base)return newEncounterBeastProof({id,templateId,name,campaignId,campaignMinute});
 const source=BESTIARY_SPECIAL_ENTRIES_564.find(p=>p.id===templateId);
 expect(source,'Nepodložený druh nebo varianta bestiáře.');
 expect(validText(id,128)&&validText(name,90),'Zadejte jednoznačnou identitu a jméno tvora.');
 expect(typeof campaignId==='string'&&campaignId.length>0&&Number.isSafeInteger(campaignMinute)&&campaignMinute>=0,'Chybí přesný herní čas.');
 expect(typeof gmNotes==='string'&&gmNotes.length<=600,'Příliš dlouhá poznámka GM.');
 // This is explicitly an encounter reference, NEVER a randomised PC or certified combatant.
 const profile={id:source.id,name:source.name,group:source.group,page:source.page,
  sourcePages:[...source.sourcePages],generation:source.generation,
  attributes:{...(source.attributes||{})},skills:{...(source.skills||{})},
  move:source.move??null,fly:source.fly??null,combat:source.combat?structuredClone(source.combat):null,
  statPage:source.statPage??source.page,statsComplete:false,
  sourceVerification:'Printed HMK pages; some rules and anatomy require checking the facsimiles'};
 return {format:'hmk-bestiary-encounter-564-v2',id,templateId,name:name.trim(),campaignId,campaignMinute,
  ownerAnimalId:null,ownerId:null,profile,kind:'encounter-creature',combatStateCreated:false,
  healthCreated:false,trainingAssumed:false,automaticDice:false,gmNotes:gmNotes.trim(),
  evidenceWitness:evidenceWitness({id,templateId,name:name.trim(),campaignId,campaignMinute,gmNotes:gmNotes.trim()})};
}
/** Validates v563 as-is; then verifies v564 additions and a single global timeline. */
export function validateFullBestiaryJournal564(data){
 const journal=data?.journal||[];
 // Existing animal evidence is independent of the new v2 source records.
 validateBestiaryJournal({...data,journal:journal.filter(row=>row.bestiaryEncounter?.format!=='hmk-bestiary-encounter-564-v2')});
 const creates=new Map();const ended=new Set();
 for(const row of journal){const p=row.bestiaryEncounter;if(!p)continue;
  expect(typeof p.id==='string'&&p.id,'Neplatné ID tvora bestiáře.');
  if(p.action==='create'){
   expect(!creates.has(p.id),'Duplicitní jedinečná identita tvora.');
   creates.set(p.id,p);
   if(p.format!=='hmk-bestiary-encounter-564-v2')continue;
   const source=BESTIARY_SPECIAL_ENTRIES_564.find(x=>x.id===p.templateId);
   expect(!!source,'Chybí tištěný zdroj z bestiáře.');
   const expected=createBespokeEncounterProof564({id:p.id,templateId:p.templateId,name:p.name,campaignId:p.campaignId,campaignMinute:p.campaignMinute,gmNotes:p.gmNotes});
   const normal=JSON.stringify(p)===JSON.stringify({...expected,action:'create'});
   // Old records created by the 93.568 profile correction remain legal and
   // immutable. Only the exact formerly published snapshot is accepted.
   let legacy=false;
   if(!normal&&p.templateId==='gryphon-griffin-marenu-390'){
    const oldProfile={id:LEGACY_GRYPHON_568.id,name:LEGACY_GRYPHON_568.name,group:LEGACY_GRYPHON_568.group,page:LEGACY_GRYPHON_568.page,
     sourcePages:[...LEGACY_GRYPHON_568.sourcePages],generation:LEGACY_GRYPHON_568.generation,
     attributes:{...(LEGACY_GRYPHON_568.attributes||{})},skills:{...(LEGACY_GRYPHON_568.skills||{})},
     move:LEGACY_GRYPHON_568.move??null,fly:LEGACY_GRYPHON_568.fly??null,combat:LEGACY_GRYPHON_568.combat?structuredClone(LEGACY_GRYPHON_568.combat):null,
     statPage:LEGACY_GRYPHON_568.statPage??LEGACY_GRYPHON_568.page,statsComplete:false,
     sourceVerification:'Printed HMK pages; some rules and anatomy require checking the facsimiles'};
    legacy=JSON.stringify(p)===JSON.stringify({...expected,profile:oldProfile,action:'create'});
   }
   expect(normal||legacy,'Pozměněný zdroj, variantní doklad nebo profil tvora.');
   expect(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.campaignMinute&&
      row.title==='Bestiář · příchod do encounteru: '+p.name,'Chybí herní čas nebo titul události tvora.');
  }else if(p.action==='dismiss'){
   expect(creates.has(p.id)&&!ended.has(p.id),'Nekonzistentní odchod tvora.');
   ended.add(p.id);
  }
 }
 return true;
}
/** May show a stable animal on the encounter card without pretending it already has a live injury ledger. */
export function bestiaryEncounterStatus564(row){
 const profile=row?.profile;
 if(!profile)return {ready:false,reason:'Chybí profil'};
 const numeric=profile.attributes&&Object.keys(profile.attributes).length>0;
 return {ready:false,profiled:!!numeric,reason:numeric?
  'Referenční číselný profil; živý Combat State, Injury Sequence a zvláštní schopnosti nebyly ověřeně napojeny.':
  'Proměnlivý nebo ukázkový profil; vyžaduje pravidlovou generaci či rozhodnutí GM.'};
}
