import {finishDalmorvrinRepair,planDalmorvrinRepair} from './hmk-field-craft.js?v=94.041';

export const DALMORVRIN_TEMPLATE='dalmorvrin-lesser-undead-381';

export function dalmorvrinRepairState(journal,campaignId,targetId){
 let injury=null,pending=null;
 for(const row of journal){
  const task=row.calendarFieldCraft;
  if(row.calendarCampaignId!==campaignId||task?.targetId!==targetId)continue;
  if(task.task==='repair-plan'){
   injury=task.result.injury;
   pending=row.id;
  }else if(['repair-finish','repair-cancel'].includes(task.task)){
   injury=task.result.remaining;
   pending=null;
  }
 }
 return {injury,pending};
}

export function validateDalmorvrinRepairLinks(journal){
 const active=new Map(),states=new Map();
 for(const row of journal){
  const creature=row.bestiaryEncounter;
  if(creature?.action==='create'&&creature.templateId===DALMORVRIN_TEMPLATE)active.set(creature.id,creature);
  if(creature?.action==='dismiss')active.delete(creature.id);
  const proof=row.calendarFieldCraft;
  if(!proof?.targetId||!['repair-plan','repair-finish','repair-cancel'].includes(proof.task))continue;
  const target=active.get(proof.targetId);
  const state=states.get(proof.targetId)??{};
  const bad=()=>{throw Error('Oprava Dalmôrvrin neodpovídá účastníkovi encounteru nebo doloženým IL.');};
  if(proof.task!=='repair-cancel'&&(!target||target.campaignId!==row.calendarCampaignId||target.campaignMinute>row.campaignMinute))bad();
  if(proof.task==='repair-plan'){
   if(state.pending||proof.result.subject!==target.name||(state.injury!=null&&proof.result.injury!==state.injury))bad();
   const expected=planDalmorvrinRepair({...proof.result,minute:row.campaignMinute});
   if(JSON.stringify(expected)!==JSON.stringify(proof.result))bad();
   states.set(proof.targetId,{injury:proof.result.injury,pending:row});
  }else{
   const plan=state.pending;
   if(!plan||plan.id!==proof.startId||plan.characterId!==row.characterId||plan.calendarCampaignId!==row.calendarCampaignId||
    row.campaignMinute<plan.campaignMinute)bad();
   const expected=proof.task==='repair-finish'?finishDalmorvrinRepair(plan.calendarFieldCraft.result,row.campaignMinute,proof.result):
    {remaining:state.injury};
   if(JSON.stringify(expected)!==JSON.stringify(proof.result))bad();
   states.set(proof.targetId,{injury:expected.remaining,pending:null});
  }
 }
}
