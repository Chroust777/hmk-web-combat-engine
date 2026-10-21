/** HMK v1.2 p.75, p.61: Soporific is an END Success VALUE test, not
 * Paralytic's success/failure resistance test. Time must not be invented.
 * Explicit END SV witness -> separately GM-confirmed scheduled consequences.
 * Herbal INC/UNC is kept distinct from injury Shock and its recovery rules.
 */
import {successLevel,successValue,SL} from '../rules/tests.js';
import {initialCombatState,validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
const need=(v,m)=>{if(!v)throw Error('Soporific: '+m)};
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export const SOPORIFIC_END_FORMAT='hmk-herb-soporific-end-sv-v1';
export const SOPORIFIC_EFFECT_FORMAT='hmk-herb-soporific-effect-v1';
const applications=(journal,camp)=>journal.filter(j=>j.calendarCampaignId===camp&&j.calendarHerbPotionAdminister?.herbType==='soporific'&&j.calendarHerbPotionAdminister.soporificTracked===true);
const tests=(journal,camp)=>journal.filter(j=>j.calendarCampaignId===camp&&j.calendarHerbSoporificEnd).map(j=>({id:j.id,...j.calendarHerbSoporificEnd}));
export function pendingSoporificTests(journal=[],campaignId=''){
 const done=new Set(tests(journal,campaignId).map(t=>t.applicationId));
 return applications(journal,campaignId).filter(j=>!done.has(j.id)).map(j=>({applicationId:j.id,targetId:j.calendarHerbPotionAdminister.targetId,potency:j.calendarHerbPotionAdminister.potency,minute:j.campaignMinute,source:j}));
}
export function pendingSoporificEffects(journal=[],campaignId=''){
 const outcomes=new Set(journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbSoporificEffect).map(j=>j.calendarHerbSoporificEffect.testId+':'+j.calendarHerbSoporificEffect.phase));
 return tests(journal,campaignId).flatMap(t=>{
  if(t.endSV<=0)return []; // HMK p61: no usable SV; never invent an onset.
  const source=applications(journal,campaignId).find(j=>j.id===t.applicationId);
  if(!source)return [];
  const p=source.calendarHerbPotionAdminister,minute=t.minute+t.endSV;
  const candidates=[{testId:t.id,applicationId:t.applicationId,targetId:t.targetId,
   phase:'weariness',potency:p.potency,dueMinute:minute,dueRound:null,timelineId:null,
   wearinessAmount:p.sv*2,addIncapacitation:p.potency>=2,source}];
  if(p.potency===3&&p.combatAnchor)candidates.push({testId:t.id,applicationId:t.applicationId,targetId:t.targetId,
   phase:'unconsciousness',potency:3,dueMinute:t.minute,dueRound:p.combatAnchor.round+t.endSV,
   timelineId:p.combatAnchor.timelineId,wearinessAmount:0,addIncapacitation:false,source});
  return candidates.filter(o=>!outcomes.has(o.testId+':'+o.phase));
 });
}
function application(journal,campaignId,applicationId,targetId){
 const source=applications(journal,campaignId).find(j=>j.id===applicationId);
 need(source&&source.calendarHerbPotionAdminister.targetId===targetId,'chybí nové doložené podání stejné postavě a kampani');return source;
}
function endCalc(endurance,fatiguePenalty,d100){
 need(int(endurance,1,50)&&int(fatiguePenalty,0,99999)&&int(d100,1,100),'vyžaduje doložený END, Fatigue a d100');
 const baseML=endurance*5,rawEML=baseML-fatiguePenalty,eml=Math.max(5,Math.min(95,rawEML));
 const sl=successLevel(d100,rawEML),endSV=successValue({ml:baseML,sl});
 return {endurance,baseML,fatiguePenalty,rawEML,eml,d100,sl:Object.keys(SL).find(k=>SL[k]===sl),endSV};
}
export function applyConfirmedSoporificEnd({journal=[],campaignId,applicationId,targetId,minute,state=null,endurance,d100,eventId,gmConfirmed=false,round=null,timelineId=null}={}){
 need(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3,'potvrzení GM a událost');
 const a=application(journal,campaignId,applicationId,targetId),p=a.calendarHerbPotionAdminister;
 need(minute===a.campaignMinute,'END SV musí být doloženo v minutě podání; nesmí se zpětně domýšlet');
 need(!tests(journal,campaignId).some(t=>t.applicationId===applicationId),'END SV už existuje');
 if(p.potency===3){need(p.combatAnchor?.confirmedByGM===true&&p.combatAnchor.timelineId===timelineId&&p.combatAnchor.round===round,'Great END vyžaduje původní bojové kolo');}
 else need(round===null&&timelineId===null,'Mild/Strong END nevyžaduje bojovou osu');
 const s=structuredClone(state??initialCombatState());validateCombatState(s);
 need(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId)&&!activeHerbalSoporific(s),'mrtvá postava, aktivní bylinná INC/UNC nebo duplicitní událost');
 const calc=endCalc(endurance,combatFatigueTotals(s).total,d100);
 const proof={format:SOPORIFIC_END_FORMAT,campaignId,minute,applicationId,targetId,round,timelineId,
  ...calc,gmConfirmed:true,sourcePage:75,nonpositiveSVRequiresGM:calc.endSV<=0};
 // No status or fatigue applies at test time; onset is a separate GM-confirmed action.
 s.events.push({id:eventId,type:'herb-soporific-end',round:round??Math.max(1,s.lastRound),details:structuredClone(proof)});
 if(round!==null)s.lastRound=Math.max(s.lastRound,round);
 validateCombatState(s);return {state:s,proof};
}
function effectProof({candidate,test,minute,round,timelineId}={}){
 const isRound=candidate.phase==='unconsciousness';
 if(isRound)need(round===candidate.dueRound&&timelineId===candidate.timelineId&&
  int(minute,candidate.dueMinute,candidate.dueMinute+Math.ceil(test.endSV/12)),
  'UNC vyžaduje přesně doložené bojové kolo a odpovídající minutu GM');
 else need(minute===candidate.dueMinute&&round===null&&timelineId===null,'Weariness/INC musí být potvrzeny v přesné minutě');
 return {format:SOPORIFIC_EFFECT_FORMAT,campaignId:test.campaignId,minute,testId:candidate.testId,
  applicationId:candidate.applicationId,targetId:candidate.targetId,phase:candidate.phase,
  round:round??null,timelineId:timelineId??null,dueMinute:candidate.dueMinute,dueRound:candidate.dueRound,
  wearinessAmount:candidate.wearinessAmount,inducedState:isRound?'UNC':candidate.addIncapacitation?'INC':'NONE',gmConfirmed:true,sourcePage:75};
}
export function applyConfirmedSoporificEffect({journal=[],campaignId,testId,phase,targetId,minute,round=null,timelineId=null,state=null,eventId,gmConfirmed=false}={}){
 need(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3,'potvrzení GM a událost');
 const t=tests(journal,campaignId).find(x=>x.id===testId&&x.targetId===targetId);
 const c=pendingSoporificEffects(journal,campaignId).find(x=>x.testId===testId&&x.phase===phase&&x.targetId===targetId);
 need(t&&c,'není splatný nezpracovaný účinek');
 const proof=effectProof({candidate:c,test:t,minute,round,timelineId});
 const s=structuredClone(state??initialCombatState());validateCombatState(s);
 need(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),'mrtvá postava nebo duplicitní událost');
 if(phase==='weariness')s.fatigue.weariness+=proof.wearinessAmount;
 if(proof.inducedState!=='NONE'){
  // Separate drug-induced state; never replace trauma Shock, reroll timing or Coma.
  const old=s.herbalSoporific;
  need(!old||old.applicationId===proof.applicationId,'souběh Soporific od různých dávek musí řešit GM');
  const severity=old?.status==='UNC'||proof.inducedState==='UNC'?'UNC':'INC';
  s.herbalSoporific={applicationId:proof.applicationId,campaignId,status:severity,
   onsetMinute:Math.min(old?.onsetMinute??minute,minute),resultEventId:severity===proof.inducedState?eventId:old.resultEventId};
  s.posture.prone=true;
 }
 s.events.push({id:eventId,type:'herb-soporific-effect',round:round??Math.max(1,s.lastRound),details:structuredClone(proof)});
 if(round!==null)s.lastRound=Math.max(s.lastRound,round);
 validateCombatState(s);return {state:s,proof};
}
export function activeHerbalSoporific(state){return state?.herbalSoporific?.status==='INC'||state?.herbalSoporific?.status==='UNC'?state.herbalSoporific.status:null;}
export function requireSoporificGMTimeMayAdvance({journal,campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const untaken=pendingSoporificTests(journal,campaignId).find(t=>t.minute<afterMinute);
 need(!untaken,'nelze přeskočit Soporific END SV test v minutě '+untaken?.minute);
 const owed=pendingSoporificEffects(journal,campaignId).find(t=>t.phase==='weariness'?t.dueMinute<afterMinute:
  // Great round may be within the minute; never skip its whole plausible time window.
  t.dueMinute+Math.ceil((t.dueRound-(t.source.calendarHerbPotionAdminister.combatAnchor?.round??t.dueRound))/12)<afterMinute);
 need(!owed,'nelze přeskočit Soporific '+owed?.phase+' v časové ose GM');return true;
}
export function requireSoporificRoundMayAdvance({journal,campaignId,timelineId,currentRound,nextRound=currentRound+1}={}){
 need(int(currentRound,1,9999)&&int(nextRound,currentRound+1,9999),'neplatná bojová kola');
 const untested=pendingSoporificTests(journal,campaignId).find(t=>t.potency===3&&t.source.calendarHerbPotionAdminister.combatAnchor?.timelineId===timelineId&&nextRound>t.source.calendarHerbPotionAdminister.combatAnchor.round);
 need(!untested,'nelze přeskočit Soporific END SV ve výchozím bojovém kole');
 const owed=pendingSoporificEffects(journal,campaignId).find(t=>t.phase==='unconsciousness'&&t.timelineId===timelineId&&nextRound>t.dueRound);
 need(!owed,'nelze přeskočit splatné Soporific UNC bojové kolo '+owed?.dueRound);return true;
}
export function validateSoporificJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  if(row.calendarHerbSoporificEnd){
   const p=row.calendarHerbSoporificEnd;need(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&row.characterId===p.targetId&&p.gmConfirmed===true,'nesoulad END SV původu');
   const a=application(prior,p.campaignId,p.applicationId,p.targetId);
   need(p.minute===a.campaignMinute&&!tests(prior,p.campaignId).some(t=>t.applicationId===p.applicationId),'opakovaný/zpětný END SV');
   const expected={format:SOPORIFIC_END_FORMAT,campaignId:p.campaignId,minute:p.minute,applicationId:p.applicationId,targetId:p.targetId,round:p.round,timelineId:p.timelineId,
    ...endCalc(p.endurance,p.fatiguePenalty,p.d100),gmConfirmed:true,sourcePage:75,nonpositiveSVRequiresGM:p.endSV<=0};
   need(JSON.stringify(p)===JSON.stringify(expected),'historický END SV neodpovídá d100');
   if(a.calendarHerbPotionAdminister.potency===3)need(p.round===a.calendarHerbPotionAdminister.combatAnchor?.round&&p.timelineId===a.calendarHerbPotionAdminister.combatAnchor.timelineId,'neplatná Great bojová osa');
   else need(p.round===null&&p.timelineId===null,'neplatný Mild/Strong bojový původ');
  }
  if(row.calendarHerbSoporificEffect){
   const p=row.calendarHerbSoporificEffect;
   need(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&row.characterId===p.targetId&&p.gmConfirmed===true,'nesoulad účinku');
   const t=tests(prior,p.campaignId).find(x=>x.id===p.testId&&x.targetId===p.targetId);
   const candidate=pendingSoporificEffects(prior,p.campaignId).find(x=>x.testId===p.testId&&x.phase===p.phase);
   need(t&&candidate&&JSON.stringify(p)===JSON.stringify(effectProof({candidate,test:t,minute:p.minute,round:p.round,timelineId:p.timelineId})),'historický Soporific účinek neodpovídá termínu a dávce');
  }
  prior.push(row);
 }
 return true;
}
export function assertSoporificAppendOnly(before=[],after=[]){
 const m=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarHerbSoporificEnd||j.calendarHerbSoporificEffect)
  need(m.has(j.id)&&JSON.stringify(m.get(j.id))===JSON.stringify(j),'historický Soporific důkaz nelze měnit');return true;
}
