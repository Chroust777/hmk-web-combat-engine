/** Audit-only time evidence for HMK p.65 Animalcraft Training and p.132 Writing.
 * We preserve true d3/month factors but do not guess dates without a
 * certified campaign start and the correct calendar month boundaries.
 */
const check=(ok,message)=>{if(!ok)throw Error(message)};
export function validateSkillActivityTimeProofs(journal=[]){
 const byId=new Map(journal.map(j=>[j.id,j]));
 for(const row of journal){
  const p=row?.skillTestProof,t=p?.trainingExtension,w=p?.writingExtension;
  if(!t&&!w)continue;
  check(p.type==='critical-followup'&&typeof p.originId==='string',
   'Přídavný čas činnosti vyžaduje původní Skill Test');
  const source=byId.get(p.originId),origin=source?.skillTestProof;
  const side=p.side==='B'?'B':'A',originalSkill=side==='B'?origin?.skills?.[1]:origin?.skills?.[0]||origin?.skill;
  const originalResult=side==='B'?origin?.b:origin?.a||origin?.result;
  check(source&&row.characterId===p.actorId&&
    source.calendarCampaignId===row.calendarCampaignId&&
    Number.isSafeInteger(row.campaignMinute)&&row.campaignMinute>=source.campaignMinute&&
    originalResult?.level==='CF',
    'Časový následek nesmí patřit cizímu aktérovi, kampani ani neúspěchu jiného typu');
  if(t){
   check(p.activity==='animal-training'&&originalSkill==='Animalcraft'&&
    t.format==='hmk-animal-training-cf-delay-p65-v1'&&t.sourcePage===65&&
    typeof t.animalName==='string'&&t.animalName.length>=2&&t.animalName.length<=120&&
    [1,2,3].includes(t.dieD3)&&[0,1].includes(t.timeReductionMonths)&&
    (t.timeReductionMonths===0||Number.isSafeInteger(originalResult?.sv)&&originalResult.sv>=7)&&
    t.baseMonths===6-t.timeReductionMonths&&t.additionalMonths===t.dieD3&&
    t.totalMonths===6-t.timeReductionMonths+t.dieD3&&t.requiresCalendarDate===true&&
    ['manual','cryptographic-software-die'].includes(t.dieOrigin)&&!w,
    'Poškozený Animal Training d3 nebo cizí Skill Test (HMK 65)');
  }
  if(w){
   const isLanguage=/^Language(?:\s|\(|:|$)/.test(originalSkill||'')||/\(Language\)$/.test(originalSkill||'');
   const factor=p.result?.level==='CF'?2:p.result?.level==='F'?1.5:1;
   check(p.activity==='writing-routine'&&isLanguage&&w.format==='hmk-writing-cf-delay-p132-v1'&&
    w.sourcePage===132&&['missive','tract','treatise','disquisition'].includes(w.scope)&&
    w.completionTimeMultiplier===factor&&w.requiresOriginalCalendarPlan===true&&
    p.technique==='Will'&&!t,
    'Poškozený Writing Routine time multiplier nebo cizí Language CF (HMK 132)');
  }
 }
 return true;
}
