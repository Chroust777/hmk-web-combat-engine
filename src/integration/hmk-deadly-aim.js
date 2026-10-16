/** HMK p191: one complete round concentration permits a called deadly
 * melee strike location without ZD/LD. All facts are from the authoritative
 * Initiative commitment and GM-confirmed chosen target, never a bare checkbox. */
import {validateEncounterSequence,currentEncounterActor,concentrationInterruptionReason} from './encounter-turn-sequence.js';
const must=(x,m)=>{if(!x)throw Error(m)};
const codeSet=new Set(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
const sided=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
export function validDeadlyCalledLocation(location,side){
 return codeSet.has(location) && (sided.has(location)?['left','right'].includes(side):side===null);
}
export function markDeadlyAimStart(sequence,{actorId,targetId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId];
 must(gmConfirmed===true&&s.order.includes(actorId)&&s.order.includes(targetId)&&actorId!==targetId,
  'Deadly aim: GM musí vybrat dva skutečné účastníky');
 must(c?.status==='in-progress'&&c.durationRounds===1&&c.startRound===s.round&&
  s.log.some(e=>e.type==='concentration-start'&&e.actorId===actorId&&e.round===s.round),
  'Deadly aim: začněte doloženou jednokolovou koncentraci v Initiative');
 must(!c.task,'Probíhající koncentrace již má jinou závaznou činnost');
 c.task={kind:'deadly-aim',targetId,actorId,timelineId:s.timelineId,startRound:s.round};
 s.log.push({type:'deadly-aim-registered',actorId,targetId,round:s.round,completionRound:c.completionRound});
 return validateEncounterSequence(s);
}
export function verifiedDeadlyAim(sequence,states,{actorId,targetId,location,side=null}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId],t=c?.task;
 must(validDeadlyCalledLocation(location,side),'HMK 191: vyberte platnou lokalitu a skutečnou stranu končetiny');
 must(s.active===true&&currentEncounterActor(s)===actorId&&!s.interruptActiveId&&
  c?.status==='completed'&&c.durationRounds===1&&c.completionRound===s.round&&
  c.completedRound===s.round&&t?.kind==='deadly-aim'&&t.actorId===actorId&&
  t.targetId===targetId&&t.timelineId===s.timelineId&&t.startRound===s.round-1,
  'HMK 191: cílený Deadly Attack vyžaduje nepřerušenou jednokolovou koncentraci na STEJNÝ cíl v Initiative');
 must(s.log.some(e=>e.type==='deadly-aim-registered'&&e.actorId===actorId&&e.targetId===targetId&&e.round===s.round-1)&&
  s.log.some(e=>e.type==='concentration-complete'&&e.actorId===actorId&&e.round===s.round&&e.durationRounds===1),
  'Chybí autoritativní historie dokončené koncentrace');
 must(!concentrationInterruptionReason(states[actorId]),'Nový stav útočníka zabránil cílenému útoku');
 return {timelineId:s.timelineId,actorId,targetId,startRound:t.startRound,completionRound:s.round,location,side,
  source:'hmk-initiative-one-round-deadly-aim-p191'};
}
