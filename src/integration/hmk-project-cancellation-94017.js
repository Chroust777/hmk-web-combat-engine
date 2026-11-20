const startKeys={
 'special-alchemy':'calendarAlchemyStart','special-herblore':'calendarHerbPotionStart',
 fishing:'calendarFishingStart590',trapping:'calendarTrappingStart93908',animal:'calendarAnimalTrainingStart590',
 construction:'calendarConstructionStart',shipwright:'calendarShipwrightStart',faeriecraft:'calendarFaeriecraft',
 'script-copy':'calendarScriptCopy','script-reading':'calendarScriptReading'
};

export function projectKind(row){
 if(row.calendarSkillProjectStart591)return row.calendarSkillProjectStart591.kind;
 return Object.entries(startKeys).find(([,key])=>row[key]&&(row[key].stage===undefined||row[key].stage==='start'))?.[0];
}

function projectOrigins(row){
 return [
  ...Object.entries(row).flatMap(([key,value])=>
   /^(calendar(?:Skill(Project|Brew|Fletching)|Writing|EngineeringDesign|Construction|Shipwright|Script|Faeriecraft|Fishing|Trapping|AnimalTraining|Alchemy|HerbPotion|CharacterCraftSkill|Training))/.test(key)&&value?
    [value.startId,value.projectId,value.input?.workshopId]:[]),
  row.skillTestProof?.animalTrainingSV590?.startId,
  row.skillTestProof?.originId
 ].filter(Boolean);
}

function cancelledProjects(journal){
 const roots=new Set(journal.flatMap(row=>row.calendarProjectCancellation?.startId?[row.calendarProjectCancellation.startId]:[]));
 if(!roots.size)return roots;
 let previousSize;
 do{
  previousSize=roots.size;
  for(const row of journal)if(!roots.has(row.id)&&projectOrigins(row).some(id=>roots.has(id)))roots.add(row.id);
 }while(roots.size!==previousSize);
 return roots;
}

export function operationalProjectJournal(journal){
 const cancelled=cancelledProjects(journal);
 return cancelled.size?journal.filter(row=>!cancelled.has(row.id)):journal;
}

export function projectEnded(start,journal){
 const kind=projectKind(start),id=start.id;
 return journal.some(row=>{
  if(row.calendarProjectCancellation?.startId===id)return true;
  if(kind==='faeriecraft')return row.calendarFaeriecraft?.projectId===id&&['finish','expire','workshop'].includes(row.calendarFaeriecraft.stage);
  if(kind==='script-copy'||kind==='script-reading'){
   const entry=row[startKeys[kind]];
   return entry?.startId===id&&entry.stage==='done';
  }
  const ends={
   'special-alchemy':['calendarAlchemyFinish','calendarAlchemyAbort'],
   'special-herblore':['calendarHerbPotionComplete'],construction:['calendarConstructionComplete'],
   shipwright:['calendarShipwrightComplete'],fishing:['calendarFishingSVStart590','calendarFishingCancel93910'],
   trapping:['calendarTrappingSV93908','calendarTrappingCancel93909'],animal:['calendarAnimalTraining590']
  }[kind]||['calendarSkillProjectComplete591','calendarSkillBrewReady600','calendarSkillFletching996'];
  return ends.some(key=>row[key]?.startId===id);
 });
}

export function validateProjectCancellations(journal,isOpen){
 if(!journal.some(row=>row.calendarProjectCancellation))return;
 const prefix=[];
 let cancelled=new Set();
 for(const row of journal){
  if(projectOrigins(row).some(id=>cancelled.has(id)))
   throw Error('Zrušený projekt už nelze vyhodnotit.');
  const cancellation=row.calendarProjectCancellation;
  if(cancellation){
   const start=operationalProjectJournal(prefix).find(entry=>entry.id===cancellation.startId);
   if(!start||start.characterId!==row.characterId||start.calendarCampaignId!==row.calendarCampaignId||
    !Number.isSafeInteger(row.campaignMinute)||row.campaignMinute<start.campaignMinute||!projectKind(start)||!isOpen(start,prefix))
    throw Error('Zrušení projektu musí odkazovat na rozpracovaný projekt stejné postavy a kampaně.');
  }
  prefix.push(row);
  if(cancellation)cancelled=cancelledProjects(prefix);
 }
}

export function assertProjectCancellationsAppendOnly(before,after){
 const next=new Map(after.filter(row=>row.calendarProjectCancellation).map(row=>[row.id,row]));
 for(const old of before)if(old.calendarProjectCancellation&&JSON.stringify(next.get(old.id))!==JSON.stringify(old))
  throw Error('Uložené zrušení projektu nelze změnit ani odstranit.');
}
