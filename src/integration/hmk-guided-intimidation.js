/** HârnMaster: Roleplaying in the World of Kèthîra pp.67,137–138,161.
 * An immediate, resisted threat is Command vs Initiative as an opposed
 * Persuasion task. Its result informs GM roleplay, NOT an automatic Morale
 * transition (the two routines are distinct). All dice come from the table.
 */
import {successLevel,effectiveMasteryLevel} from '../rules/tests.js';
import {combatFatigueTotals} from './persistent-combat-state.js';
import {validateEncounterSequence,currentEncounterActor,dueEncounterEvents,encounterFreeActionAvailable,recordEncounterFreeAction} from './encounter-turn-sequence.js';
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
const check=(condition,message)=>{if(!condition)throw Error(message)};
const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
/** Read-only assessment. Returns pending d10 only for a true unbroken tie. */
export function resolveGuidedIntimidationOpposition({commandML,initiativeML,commandFatigue=0,initiativeFatigue=0,
 commandModifier=0,initiativeModifier=0,commandRoll,initiativeRoll,tieD10=[]}={}){
 check(int(commandML,0,200)&&int(initiativeML,0,200),'Intimidation potřebuje ověřené Command a Initiative ML');
 check(int(commandFatigue,0,9999)&&int(initiativeFatigue,0,9999),'Neplatná potvrzená Fatigue');
 check(int(commandModifier,-100,100)&&int(initiativeModifier,-100,100),'Neplatné GM modifikátory EML');
 check(int(commandRoll,1,100)&&int(initiativeRoll,1,100),'Oba skutečné d100 jsou povinné');
 check(Array.isArray(tieD10)&&tieD10.length<=30&&tieD10.every(x=>int(x.command,1,10)&&int(x.initiative,1,10)),'Neplatné skutečné rozhodovací d10');
 const rawCommand=commandML-commandFatigue+commandModifier,rawInitiative=initiativeML-initiativeFatigue+initiativeModifier;
 const emlCommand=effectiveMasteryLevel(rawCommand),emlInitiative=effectiveMasteryLevel(rawInitiative);
 const slCommand=successLevel(commandRoll,rawCommand),slInitiative=successLevel(initiativeRoll,rawInitiative);
 let winner=null,stars=0,rule='sl',needsTieD10=false;
 if(slCommand!==slInitiative){winner=slCommand>slInitiative?'command':'initiative';stars=Math.abs(slCommand-slInitiative);}
 else{
  rule='opposed-tiebreak';stars=1;
  if(commandRoll!==initiativeRoll)winner=commandRoll>initiativeRoll?'command':'initiative';
  else if(emlCommand!==emlInitiative)winner=emlCommand>emlInitiative?'command':'initiative';
  else{
   for(const pair of tieD10){if(pair.command!==pair.initiative){winner=pair.command>pair.initiative?'command':'initiative';break;}}
   needsTieD10=!winner;
  }
 }
 return {winner,stars:needsTieD10?null:stars,rule,needsTieD10,
  command:{ml:commandML,fatigue:commandFatigue,modifier:commandModifier,rawEML:rawCommand,eml:emlCommand,roll:commandRoll,sl:slCommand},
  initiative:{ml:initiativeML,fatigue:initiativeFatigue,modifier:initiativeModifier,rawEML:rawInitiative,eml:emlInitiative,roll:initiativeRoll,sl:slInitiative}};
}
export function prepareGuidedIntimidation({id,sequence,states,actorId,targetId,spokenThreat,
 commandML,initiativeML,commandModifier=0,initiativeModifier=0,
 commandRoll,initiativeRoll,tieD10=[],foeConfirmed=false,heardOrSawConfirmed=false,immediateConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 check(typeof id==='string'&&id.length>0&&id.length<=120,'Intimidation vyžaduje jednoznačné ID události');
 check(s.active&&!s.interruptActiveId&&currentEncounterActor(s)===actorId,'Intimidation patří právě jednající postavě');
 check(s.order.includes(targetId)&&actorId!==targetId,'Cíl musí být jiný skutečný účastník střetnutí');
 check(encounterFreeActionAvailable(s,actorId),'Intimidation vyžaduje dosud volnou akci na začátku tahu');
 check(dueEncounterEvents(s,states).length===0,'Nejdříve musí být vyřešeny povinné události');
 const permitted=guidedTurnChoices(s,states);
 check(permitted.kind==='player-choice'&&permitted.choices.includes('attack'),
  'Intimidation nemůže obejít povinnou akci, bezvládný stav ani zákaz agresivního jednání');
 check(foeConfirmed===true&&heardOrSawConfirmed===true&&immediateConfirmed===true,
  'GM musí potvrdit protivníka, skutečnou hrozbu a její přímé vnímání');
 check(typeof spokenThreat==='string'&&spokenThreat.trim().length>0&&spokenThreat.length<=500,
  'Je nutný konkrétní obsah vyslovené nebo bezprostředně předvedené hrozby');
 const before=states?.[actorId],target=states?.[targetId];
 check(before&&target,'Chybí potvrzený stav obou účastníků');
 check(!['KIA','INC','UNC'].includes(target.shock)&&target.morale?.state!=='catatonic',
  'Cíl není schopen vnímat běžnou hrozbu');
 const result=resolveGuidedIntimidationOpposition({commandML,initiativeML,
  commandFatigue:combatFatigueTotals(before).total,initiativeFatigue:combatFatigueTotals(target).total,
  commandModifier,initiativeModifier,commandRoll,initiativeRoll,tieD10});
 check(!result.needsTieD10,'Úplná remíza vyžaduje další skutečný rozhodovací d10 od obou účastníků');
 const next=recordEncounterFreeAction(s,{actorId,kind:'intimidate-foe'});
 next.log.push({round:s.round,type:'intimidation-resolved',actorId,targetId,eventId:id,winner:result.winner,stars:result.stars});
 const physicalDice={rolls:[{actorId,faces:100,value:commandRoll,purpose:'Command intimidation'},
  {actorId:targetId,faces:100,value:initiativeRoll,purpose:'Initiative resistance'},
  ...tieD10.flatMap(pair=>[{actorId,faces:10,value:pair.command,purpose:'opposed tiebreak'},
   {actorId:targetId,faces:10,value:pair.initiative,purpose:'opposed tiebreak'}])]};
 const proof={sourceEventId:id,timelineId:s.timelineId,round:s.round,actorId,targetId,
  actionKind:'guided-free-action',freeActionKind:'intimidate-foe',spokenThreat:spokenThreat.trim(),
  opposedTest:'Command vs Initiative (Opposed Persuasion)',result,
  gmFacts:{foeConfirmed:true,heardOrSawConfirmed:true,immediateConfirmed:true},
  automaticMoraleEffect:false,automaticCompliance:false,physicalDice};
 return {sequence:next,proof};
}
