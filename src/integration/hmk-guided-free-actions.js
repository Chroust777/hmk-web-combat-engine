/** HMK World of Kèthîra p.161 – inventory/free-step before the main action.
 * All inputs are confirmed physical battlefield/inventory facts, never inferred.
 * This is a proposed state transition: the caller persists inventory, initiative,
 * positions and a journal entry in one transaction. No dice are generated. */
import {validateEncounterSequence,currentEncounterActor,encounterFreeActionAvailable,
 recordEncounterFreeAction,dueEncounterEvents} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
import {pathCrossesClosedBarrier,effectiveSpatialBarriers,validateSpatialBarriers} from './hmk-guided-spatial-barriers.js';
const check=(value,message)=>{if(!value)throw Error(message)};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const copy=value=>structuredClone(value);
function currentTurn(sequence,states,actorId){
 const s=validateEncounterSequence(sequence);
 check(currentEncounterActor(s)===actorId&&s.active&&!s.interruptActiveId,'Volnou akci smí provést jen účastník na vlastním aktivním IR');
 check(encounterFreeActionAvailable(s,actorId),'Volná akce musí být první a pouze jedna v tomto tahu');
 check(dueEncounterEvents(s,states).length===0,'Dříve musí být dokončeny povinné bojové události');
 const state=states?.[actorId];validateCombatState(state);
 check(!['INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&
   state.morale?.state!=='catatonic','Bezvládná postava nesmí jednat');
 const available=guidedTurnChoices(s,states);
 check(available.kind==='player-choice'&&available.choices?.length>0,
  'Povinný Pass, nepozornost nebo jiné omezení zakazuje volnou akci');
 check(!s.entryForcedPass&&!state.posture?.passNextTurn,'Povinný Pass po Mishap nelze obejít');
 return s;
}
export function prepareGuidedFreeAction({id,sequence,states,inventory,actorId,
 kind,itemId=null,hand=null,accessibleConfirmed=false,sourceConfirmed=false,
 destination=null,effectiveMove=null,objectId=null,objectKind=null,
 objectClosedConfirmed=false,objectUnlockedConfirmed=false,objectInReachConfirmed=false,doorSegment=null,
 recipientIds=null,spokenWords=null,recipientsHearConfirmed=false,recipientsAlliesConfirmed=false}={}){
 const s=currentTurn(sequence,states,actorId),state=states[actorId];
 check(typeof id==='string'&&id.length>0&&id.length<=120,'Volná akce vyžaduje platné ID');
 check(Array.isArray(inventory),'Chybí ověřený inventář');
 check(['draw-weapon','ready-pocket-item','five-foot-step','open-unlocked-object','command-allies'].includes(kind),'Nepodporovaná volná akce');
 let item=null,position=null,environmentAction=null,spokenCommand=null;
 if(kind==='open-unlocked-object'){
  // HMK p.161: opening an UNLOCKED door or trunk costs a free action.
  // A physical fixture/lock/reach check is GM evidence, not invented map data.
  check(typeof objectId==='string'&&objectId.trim()===objectId&&objectId.length>0&&objectId.length<=120,
   'Otevření vyžaduje stabilní ID skutečných dveří nebo truhly');
  check(['door','trunk'].includes(objectKind),'Zadejte skutečný druh objektu (door/trunk)');
  check(objectClosedConfirmed===true&&objectUnlockedConfirmed===true&&objectInReachConfirmed===true,
   'GM musí doložit zavřený a odemčený objekt v bezprostředním dosahu');
  const registry=s.interactionObjects??[];
  check(Array.isArray(registry)&&registry.every(x=>x&&typeof x.id==='string'&&
    ['door','trunk'].includes(x.kind)&&typeof x.open==='boolean'),
   'Uložená evidence objektů je neplatná');
  check(new Set(registry.map(x=>x.id)).size===registry.length,'Duplicitní identita objektu');
  const recorded=registry.find(x=>x.id===objectId);
  check(!recorded||(recorded.kind===objectKind&&recorded.open===false),
   'Objekt je již otevřený nebo jeho totožnost nesouhlasí s uloženou evidencí');
  if(objectKind==='door'){
   if(doorSegment)validateSpatialBarriers([{id:objectId,kind:'door',...doorSegment}]);
   check((s.spatialBarriers??[]).some(b=>b.id===objectId&&b.kind==='door')||doorSegment,
    'K otevření dveří musí být doložena geometrie průchodu, aby navazující pohyb skutečně respektoval jejich stav');
  }
  environmentAction={objectId,objectKind,previousOpen:false,newOpen:true,
   gmConfirmedClosed:true,gmConfirmedUnlocked:true,gmConfirmedInReach:true};
 }else if(kind==='command-allies'){
  // A verbal instruction has NO automatic Command, Intimidation or Morale
  // consequence. This event only records confirmed speech + turn cost.
  check(Array.isArray(recipientIds)&&recipientIds.length>0&&recipientIds.length<=s.order.length&&
   new Set(recipientIds).size===recipientIds.length&&recipientIds.every(a=>typeof a==='string'&&a!==actorId&&s.order.includes(a)),
   'Určete konkrétní jiné účastníky, kterým je příkaz adresován');
  check(typeof spokenWords==='string'&&spokenWords.trim().length>0&&spokenWords.length<=500,
   'Příkaz musí obsahovat skutečně vyslovená slova');
  check(recipientsAlliesConfirmed===true,'GM musí doložit skutečné spojenectví všech příjemců');
  check(recipientsHearConfirmed===true,'GM musí potvrdit, že zadaní spojenci příkaz slyšeli');
  spokenCommand={recipientIds:[...recipientIds],spokenWords:spokenWords.trim(),recipientsHearConfirmed:true,recipientsAlliesConfirmed:true,
   automaticRuleEffects:false};
 }else if(kind==='five-foot-step'){
  check(itemId===null&&hand===null,'Pětistopý krok nepřipravuje předmět');
  check(state.shock!=='STN'&&!state.posture?.prone,'STN Difficult Movement nebo Prone vyžadují zvláštní rozhodnutí o pohybu');
  check(Number.isSafeInteger(effectiveMove)&&effectiveMove>=5,'Krok vyžaduje doložený Effective Move alespoň 5 stop');
  const units=s.spatialUnits;
  check(Array.isArray(units)&&units.length===s.order.length&&
   s.order.every(a=>units.filter(u=>u.id===a&&finite(u.x)&&finite(u.y)).length===1),
   'Pětistopý krok vyžaduje uloženou úplnou mapu všech účastníků');
  const from=units.find(u=>u.id===actorId);
  check(destination&&finite(destination.x)&&finite(destination.y),'Zadejte skutečnou cílovou polohu');
  const distance=Math.hypot(destination.x-from.x,destination.y-from.y);
  check(distance>0&&distance<=5+1e-7,'Volná akce dovoluje pouze skutečný pohyb nejvýše 5 stop');
  const collision=pathCrossesClosedBarrier([from,destination],effectiveSpatialBarriers(s));
  check(!collision,'Pětistopý krok nesmí procházet zavřenými dveřmi ani stěnou: '+(collision?.id??''));
  position={from:copy(from),to:copy(destination),distanceFt:distance};
 }else{
  check(typeof itemId==='string'&&itemId&&['main_hand','off_hand'].includes(hand),
   'Je nutné vybrat konkrétní předmět a skutečně volnou ruku');
  const found=inventory.filter(x=>x.id===itemId&&x.characterId===actorId&&x.slot==='carried'&&!x.destroyed);
  check(found.length===1&&found[0].quantity===1,'Předmět není jediným dostupným neseným kusem');
  item=found[0];
  check(kind==='draw-weapon'?item.snapshot?.category==='weapon':item.snapshot?.category==='other',
   'Vybraný druh předmětu neodpovídá volné akci');
  check(item.gearStowage!=='backpack'&&accessibleConfirmed===true&&sourceConfirmed===true,
   'GM musí doložit dostupnost a pochvu/pás nebo kapsu (nikoli batoh)');
  check(!inventory.some(x=>x.characterId===actorId&&x.slot===hand),
   'Vybraná ruka je obsazená');
 }
 const next=recordEncounterFreeAction(s,{actorId,kind});
 if(environmentAction){
  const registry=copy(next.interactionObjects??[]);
  const recorded=registry.find(x=>x.id===objectId);
  if(recorded)recorded.open=true;
  else registry.push({id:objectId,kind:objectKind,open:true});
  next.interactionObjects=registry;
  if(objectKind==='door'&&doorSegment&&!(next.spatialBarriers??[]).some(b=>b.id===objectId)){
   next.spatialBarriers=[...(next.spatialBarriers??[]),{id:objectId,kind:'door',...copy(doorSegment)}];
  }
  next.log.push({round:s.round,type:'object-opened',actorId,objectId,objectKind});
 }
 if(spokenCommand){
  next.log.push({round:s.round,type:'command-spoken',actorId,recipientIds:[...spokenCommand.recipientIds]});
 }
 if(position){
  next.spatialUnits=next.spatialUnits.map(u=>u.id===actorId?{...u,x:position.to.x,y:position.to.y}:u);
  next.log.push({round:s.round,type:'free-step',actorId,from:position.from,to:position.to});
 }
 const nextInventory=copy(inventory);
 if(item)nextInventory.find(x=>x.id===itemId).slot=hand;
 const proof={sourceEventId:id,timelineId:s.timelineId,round:s.round,actorId,
  actionKind:'guided-free-action',freeActionKind:kind,itemId:item?.id??null,
  destinationHand:hand??null,position,environmentAction,spokenCommand,sourceConfirmed:sourceConfirmed===true,
  accessibleConfirmed:accessibleConfirmed===true,physicalDice:{rolls:[]}};
 return {sequence:next,inventory:nextInventory,proof};
}
