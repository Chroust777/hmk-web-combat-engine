/** HMK v1.2 p.148: a Direction Hazard is a route problem, not an injury or
 * a new Survival roll. An immutable GM result is needed because the app has
 * no authoritative hex-map path and cannot invent Awareness outcomes.
 */
export const TREK_DIRECTION_GM_FORMAT='hmk-trek-direction-gm-v1';
const validMinute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const assert=(v,message)=>{if(!v)throw Error(message);};
const kinds={
 misdirection:['course-restored','course-displaced'],
 lost:['new-bearing','still-lost']
};
export function directionGMResolution(journal=[],sourceId,campaignId){
 return journal.find(j=>j.calendarCampaignId===campaignId&&j.calendarTrekDirectionGM?.sourceId===sourceId)??null;
}
function confirmedAwareness(journal,source,proofId){
 const row=journal.find(j=>j.id===proofId&&j.calendarCampaignId===source.calendarCampaignId&&
  j.characterId===source.characterId&&validMinute(j.campaignMinute)&&j.campaignMinute>=source.campaignMinute&&
  j.calendarTrekSkillSource?.sourceId===source.id&&j.calendarTrekSkillSource?.hazard==='direction'&&
  (j.skillTestProof?.skills?.[0]||j.skillTestProof?.skill)==='Awareness');
 return row&&['S','CS'].includes((row.skillTestProof.a||row.skillTestProof.result)?.level)?row:null;
}
export function createDirectionGMResolution({journal=[],sourceId,campaignId,minute,outcome,note='',awarenessProofId=null,id,createdAt}={}){
 const source=journal.find(j=>j.id===sourceId&&j.calendarCampaignId===campaignId);
 const direction=source?.calendarTrekProof?.hazards?.direction;
 assert(source&&kinds[direction]&&source.characterId&&validMinute(source.campaignMinute),'Neexistuje doložený Direction Hazard této hlídky.');
 assert(!directionGMResolution(journal,sourceId,campaignId),'Direction Hazard má již uložené rozhodnutí GM.');
 assert(validMinute(minute)&&minute>=source.campaignMinute,'Výsledek směru nelze doložit před vznikem hazardu.');
 assert(kinds[direction].includes(outcome),'Rozhodnutí neodpovídá skutečnému typu zabloudění.');
 assert(typeof note==='string'&&note.trim().length>=12&&note.trim().length<=600,
  'GM popíše skutečně vyhodnocenou trasu, ztracené hexové kroky a případné testy (12–600 znaků).');
 assert(outcome==='course-restored'?typeof awarenessProofId==='string'&&!!confirmedAwareness(journal,source,awarenessProofId):awarenessProofId===null,
  'Napravení Misdirection musí doložit úspěšný Awareness téže hlídky; žádný nový hod se nevymýšlí.');
 assert(typeof id==='string'&&id&&typeof createdAt==='string'&&createdAt,'Doklad vyžaduje identitu a datum zápisu.');
 const proof={format:TREK_DIRECTION_GM_FORMAT,sourceId,sourceMinute:source.campaignMinute,
  minute,original:direction,outcome,note:note.trim(),...(awarenessProofId?{awarenessProofId}:{}),sourcePage:148};
 return {id,createdAt,characterId:source.characterId,calendarCampaignId:campaignId,campaignMinute:minute,
  title:'HMK Trekking · Direction Hazard · '+direction,
  body:direction+' · '+outcome+' · GM: '+note.trim()+'; bez změny času a bez domyšlené trasy',
  calendarTrekDirectionGM:proof};
}
export function validateDirectionGMJournal(journal=[]){
 const prior=[],used=new Set();
 for(const row of journal){
  const proof=row?.calendarTrekDirectionGM;
  if(proof){
   const source=prior.find(j=>j.id===proof.sourceId&&j.calendarCampaignId===row.calendarCampaignId);
   assert(source?.calendarTrekProof?.hazards?.direction===proof.original&&
    kinds[proof.original]?.includes(proof.outcome)&&proof.format===TREK_DIRECTION_GM_FORMAT&&
    proof.sourceMinute===source.campaignMinute&&proof.minute===row.campaignMinute&&
    row.characterId===source.characterId&&row.campaignMinute>=source.campaignMinute&&validMinute(row.campaignMinute)&&
    typeof proof.note==='string'&&proof.note.trim()===proof.note&&proof.note.length>=12&&proof.note.length<=600&&
    proof.sourcePage===148&&
    (proof.outcome==='course-restored'?typeof proof.awarenessProofId==='string'&&!!confirmedAwareness(prior,source,proof.awarenessProofId):!Object.hasOwn(proof,'awarenessProofId')),
    'Neplatné nebo nedoložené uzavření Direction Hazard.');
   const key=row.calendarCampaignId+'|'+proof.sourceId;
   assert(!used.has(key),'Duplicitní uzavření Direction Hazard.');used.add(key);
  }
  prior.push(row);
 }
 return true;
}
export function assertDirectionGMAppendOnly(before=[],after=[]){
 const keep=new Map(after.filter(x=>x.calendarTrekDirectionGM).map(x=>[x.id,x]));
 for(const old of before)if(old.calendarTrekDirectionGM){
  assert(keep.has(old.id)&&JSON.stringify(keep.get(old.id))===JSON.stringify(old),
   'Doložený Direction Hazard je neměnný historický záznam.');
 }
 return true;
}
/** Best available route status: factual warning, never auto-corrects hexes. */
export function lastDocumentedDirectionStatus(journal=[],campaignId){
 return [...journal].reverse().find(x=>x.calendarCampaignId===campaignId&&x.calendarTrekDirectionGM)?.calendarTrekDirectionGM??null;
}
