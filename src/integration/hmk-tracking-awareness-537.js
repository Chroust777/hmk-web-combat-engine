/** HMK 1.2, p.147: a certified adjusted Tracking SV 3–4 offers
 * ONE Awareness test by the tracker. Success yields exactly one Spoor star.
 * This proof links the EXISTING skill-workbench roll to its Tracking outcome;
 * it neither creates another roll nor alters the GM calendar minute.
 */
export const TRACKING_AWARENESS_FORMAT='hmk-tracking-awareness-p147-v1';
const valid=(yes,why)=>{if(!yes)throw Error(why)};
const levels=['CF','F','S','CS'];
export function trackingAwarenessFromSkill({trackingRow,skillProof,actorId,campaignId,minute,journal=[]}={}){
 const t=trackingRow?.calendarTrekTrackingProof;
 valid(['hmk-trekking-tracking-outcome-v1','hmk-trekking-tracking-outcome-v2'].includes(t?.format)&&t.score?.awarenessNeeded===true&&
   [3,4].includes(t.score.adjustedSV),'Awareness po Tracking vyžaduje doložené upravené SV 3–4 (HMK 147)');
 valid(trackingRow.calendarCampaignId===campaignId&&actorId===t.trackerId&&
   Number.isSafeInteger(minute)&&minute>=trackingRow.campaignMinute,
   'Následný Awareness musí provést původní tracker ve stejné kampani a ne před Tracking');
 valid(!journal.some(j=>j.calendarTrekTrackingAwarenessProof?.trackingId===trackingRow.id),
   'Awareness pro toto Tracking je již dokončen; další hod se nevytváří');
 const skill=String(skillProof?.skill||skillProof?.skills?.[0]||'');
 const r=skillProof?.a||skillProof?.result;
 valid(['success-test','success-value-test','secondary-mastery-test','secondary-mastery-value-test'].includes(skillProof?.type)&&
  /^Awareness(?:\s*\(|\s*:|$)/i.test(skill)&&levels.includes(r?.level),
  'Následný hod musí být původní nepřikrášlený Awareness Skill Test');
 valid((Number.isSafeInteger(r?.roll)&&r.roll>=1&&r.roll<=100)||
  (r?.forcedCF===true&&r.level==='CF'),
  'Následný Awareness potřebuje skutečný d100 nebo pravidlově doložené automatické CF');
 return {format:TRACKING_AWARENESS_FORMAT,trackingId:trackingRow.id,trekId:t.sourceId,
  trackerId:t.trackerId,skill,level:r.level,roll:r.roll??null,
  resultSpoorStars:['S','CS'].includes(r.level)?1:0,sourcePage:147};
}
export function validateTrackingAwarenessJournal(journal=[]){
 const ids=new Map(journal.map(j=>[j.id,j]));const seen=new Set();
 for(const row of journal){const p=row.calendarTrekTrackingAwarenessProof;if(!p)continue;
  valid(!seen.has(p.trackingId),'Duplicitní následný Awareness po jednom Tracking');seen.add(p.trackingId);
  const trackingRow=ids.get(p.trackingId);
  const expected=trackingAwarenessFromSkill({trackingRow,skillProof:row.skillTestProof,
   actorId:row.characterId,campaignId:row.calendarCampaignId,minute:row.campaignMinute,
   journal:journal.filter(x=>x.id!==row.id)});
  valid(JSON.stringify(expected)===JSON.stringify(p),
   'Poškozený nebo zpětně změněný Awareness důkaz');
 }
 return true;
}
export function pendingTrackingAwareness(journal=[],campaignId){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&
  j.calendarTrekTrackingProof?.score?.awarenessNeeded===true&&
  !journal.some(x=>x.calendarCampaignId===campaignId&&
   x.calendarTrekTrackingAwarenessProof?.trackingId===j.id));
}
