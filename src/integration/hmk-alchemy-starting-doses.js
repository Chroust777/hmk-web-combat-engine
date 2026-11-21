import {validateStartingElixirs} from './hmk-creation-starting-elixirs.js';

const FORMAT='hmk-alchemy-starting-dose-v1';
const minuteOK=minute=>Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9;
const exact=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

export function alchemyDoseProof(row){
 return row?.calendarAlchemyStartingDose??row?.calendarAlchemyFinish;
}

export function alchemyStartingDoseProof({campaignId,actorId,minute,selection,doseIndex,vialId}){
 if(typeof campaignId!=='string'||!campaignId||typeof actorId!=='string'||!actorId||
  !minuteOK(minute)||typeof vialId!=='string'||!vialId)
  throw Error('Počáteční elixíry vyžadují postavu, kampaň, čas a vlastní nádobu.');
 const source=validateStartingElixirs({alchemyML:selection?.alchemyML,choices:selection?.elixirs?.map(dose=>dose.name)});
 if(!exact(source,selection)||!Number.isInteger(doseIndex)||doseIndex<0||doseIndex>=source.count)
  throw Error('Počáteční elixír neodpovídá doloženému výběru z tvorby postavy.');
 const dose=source.elixirs[doseIndex];
 return {format:FORMAT,campaignId,actorId,minute,selection:source,doseIndex,vialId,
  elixirName:dose.name,baseAS:dose.alchemicalStrength,result:'completed',sourcePage:269};
}

export function startingDoseProofFromCharacter(character,context){
 const selection=character?.hmk?.startingElixirs;
 if(!selection||!exact(selection,character.hmk.creation?.values?.startingElixirProof))
  throw Error('V tvorbě postavy chybí doložený výběr počátečních elixírů.');
 return alchemyStartingDoseProof({...context,actorId:character.id,selection});
}

export function assertAlchemyStartingDoses(database){
 const grants=new Map(),bindings=new Map(),vials=new Set();
 for(const row of database.journal??[]){
  const binding=row.calendarAlchemyVialBinding;
  if(binding)bindings.set(binding.finishId,binding);
  const proof=row.calendarAlchemyStartingDose;
  if(!proof)continue;
  if(row.calendarAlchemyFinish||row.characterId!==proof.actorId||row.calendarCampaignId!==proof.campaignId||
   row.campaignMinute!==proof.minute||!exact(alchemyStartingDoseProof(proof),proof)||vials.has(proof.vialId))
   throw Error('Poškozený záznam počátečního elixíru.');
  vials.add(proof.vialId);
  const key=JSON.stringify([proof.campaignId,proof.actorId]);
  const group=grants.get(key)??[];
  group.push(row);
  grants.set(key,group);
 }
 for(const group of grants.values()){
  const first=group[0].calendarAlchemyStartingDose;
  if(group.length!==first.selection.count||new Set(group.map(row=>row.calendarAlchemyStartingDose.doseIndex)).size!==group.length)
   throw Error('Počáteční elixíry postavy se přidělují jako jediná úplná sada pro danou kampaň.');
  for(const row of group){
   const proof=row.calendarAlchemyStartingDose,binding=bindings.get(row.id);
   if(proof.minute!==first.minute||!exact(proof.selection,first.selection)||binding?.vialId!==proof.vialId||
    binding.actorId!==proof.actorId||binding.campaignId!==proof.campaignId||binding.minute!==proof.minute)
    throw Error('Počáteční elixír musí být od přidělení uložen ve své původní lahvičce.');
  }
 }
}

export function assertAlchemyStartingDosesAppendOnly(before,after){
 const next=new Map(after.map(row=>[row.id,row]));
 for(const row of before){
  if(row.calendarAlchemyStartingDose&&!exact(next.get(row.id),row))
   throw Error('Historické přidělení počátečního elixíru nelze přepsat ani odebrat.');
 }
}
