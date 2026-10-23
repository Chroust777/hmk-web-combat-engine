/** HMK v1.2 pp.110,163–164,268–269,271–272,274.
 * Whole-encounter, NO-WRITE atomic preparation for a physical Area elixir.
 * The caller MUST persist journal, inventory, characters and Initiative in
 * one existing combatRuntime commit. This is not a save or a second database.
 * No changes escape if a later victim, Morale test or due event rejects.
 */
import {stageAlchemyAreaThrownSource} from './hmk-alchemy-area-thrown-source.js';
import {createAlchemyVialEmpty,validateAlchemyVialJournal} from './hmk-alchemy-vial-ledger.js';
import {validateEncounterSequence,recordScheduledHitCommit,finishEncounterTurn} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
const assert=(v,m)=>{if(!v)throw Error('Alchemy Area Atomic: '+m)};
const copy=structuredClone;
export const ALCHEMY_AREA_ATOMIC_PLAN='hmk-alchemy-area-atomic-plan-v1';
/** Return a fully verified set of proposed changes; NOTHING is mutated.
 * Identity/stale-input revalidation must also run in the committing UI.
 */
export function prepareAlchemyAreaAtomicBattle({sequence,characters,inventory,journal,campaignId,
 minute,actorId,finishId,sourceId,aimPoint,center,throwDice,areaDice={},gmConfirmed=false}={}){
 assert(Array.isArray(characters)&&Array.isArray(inventory)&&Array.isArray(journal)&&
  !journal.some(x=>x.id===sourceId),'chybí autentické podklady nebo kolize historického ID');
 // Store only the independent pre-action Combat/Inventory/Character snapshot.
 // Do NOT recursively copy the existing journal: every previous Area record
 // already contains its own snapshot, which would grow exponentially with
 // subsequent explosions. The immutable journal prefix is reconstructed on
 // replay from the append-only campaign history.
 const immutableInput=JSON.stringify({sequence,characters,inventory});
 const staged=stageAlchemyAreaThrownSource({sequence,characters,inventory,journal,campaignId,
  minute,actorId,finishId,sourceId,aimPoint,center,throwDice,areaDice,gmConfirmed});
 const seq=validateEncounterSequence(copy(staged.blast?.proposedMoraleSequence??sequence));
 const states=Object.fromEntries(characters.map(c=>[c.id,c.hmk?.combatState]));
 assert(seq.order.every(id=>states[id]&&validateCombatState(states[id])),
  'chybí původní Combat State některého bojovníka');
 const nextStates={...states,...(staged.blast?.stagedStates??{})};
 for(const v of Object.values(nextStates))validateCombatState(v);
 // Consume only the ONE canonical scheduled Attack token. The p.159 turn
 // mechanism rejects mandatory events and repeated attacks before any save.
 let next=recordScheduledHitCommit(seq,{actorId,states,gmConfirmed:true});
 if(!seq.interruptActiveId)next=finishEncounterTurn(next,nextStates,{action:'attack',gmConfirmed:true});
 const doses=staged.blast?.stagedCharacters??{};
 for(const id of Object.keys(doses)){
  const old=characters.find(c=>c.id===id),proposed=doses[id];
  assert(old&&proposed?.hmk?.attributes&&Number.isSafeInteger(proposed.hmk.attributes.str),
   'Weakness musí mít přepočtený živý STR každé oběti');
  // Proven weakness is appended as an overlay, not a rewritten creation
  // roll. The creation invariant reconstructs current STR from untouched
  // attribute dice and the audited list of reductions.
  assert(proposed.hmk.attributes.str>=1,'Weakness nesmí vytvořit neřešené STR 0');
 }
 const empty=staged.throw.discharged?createAlchemyVialEmpty({journal,inventory,campaignId,
  minute,actorId,finishId,reason:'Thrown '+staged.kind+' shattered at confirmed battlefield point',
  shattered:true,confirmedByGM:true}):null;
 const nextInventory=empty?inventory.filter(i=>i.id!==empty.vialId):copy(inventory);
 assert(!empty||nextInventory.length===inventory.length-1,
  'spotřeba musí odebrat přesně jednu originální fyzickou lahvičku');
 const row={id:sourceId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,
  title:'Alchemy · '+staged.kind+' · Area '+(staged.throw.discharged?'detonation':'CF no throw'),
  body:'HMK pp.163–164, '+(staged.blast?.sourcePage??'271–274')+': physical Throwing '+staged.throw.d100,
  calendarAlchemyAreaThrown:{format:ALCHEMY_AREA_ATOMIC_PLAN,kind:staged.kind,
   sourceId,campaignId,minute,actorId,finishId,throw:copy(staged.throw),
   throwDice:copy(throwDice),originalWitness:immutableInput,
   areaDice:copy(areaDice),aimPoint:copy(aimPoint),center:copy(staged.center),
   affectedIds:[...(staged.blast?.targetIds??[])],
   threatenedOpponentIds:[...(staged.blast?.threatenedOpponentIds??[])],
   results:copy(staged.blast?.results??{}),
   sourceRound:seq.round,timelineId:seq.timelineId,
   beforeStates:Object.fromEntries(Object.keys(staged.blast?.stagedStates??{}).map(id=>[id,copy(states[id])])),
   afterStates:copy(staged.blast?.stagedStates??{}),
   beforeStrength:Object.fromEntries(Object.keys(doses).map(id=>[id,characters.find(c=>c.id===id).hmk.attributes.str])),
   afterStrength:Object.fromEntries(Object.keys(doses).map(id=>[id,doses[id].hmk.attributes.str])),
   smoke:copy(staged.blast?.smoke??null),gmConfirmed:true},
  ...(empty?{calendarAlchemyVialEmpty:empty}:{})};
 validateAlchemyVialJournal([...journal,row]);
 assert(immutableInput===JSON.stringify({sequence,characters,inventory}),
  'příprava nesmí částečně změnit zdrojová data');
 return {format:ALCHEMY_AREA_ATOMIC_PLAN,status:'prepared-no-write',saved:false,
  stage:staged,nextSequence:next,nextStates,attributesById:Object.fromEntries(
   Object.entries(doses).map(([id,c])=>[id,copy(c.hmk.attributes)])),
  weaknessLossesById:Object.fromEntries(Object.keys(doses).map(id=>{
   const c=characters.find(x=>x.id===id),r=staged.blast.results[id];
   return [id,[...(c.hmk.alchemyWeaknessLosses??[]),{sourceId,round:seq.round,
    strengthBefore:r.strengthBefore,strengthAfter:r.strengthAfter,decrease:r.strengthReduction}]];
  })),
  nextInventory,historyRow:row,originalWitness:immutableInput};
}

/** Historical replay: every recorded grenade and ALL area results must be
 * independently reproduced from the original pre-action snapshot and the
 * chronological immutable alchemy journal. Reject unknown or altered dice.
 */
export function validateAlchemyAreaJournal(journal=[]){
 assert(Array.isArray(journal),'neplatný historický deník');
 const earlier=[];
 for(const row of journal){
  const proof=row.calendarAlchemyAreaThrown;
  if(proof){
   assert(proof.format===ALCHEMY_AREA_ATOMIC_PLAN&&proof.sourceId===row.id&&
    proof.campaignId===row.calendarCampaignId&&proof.minute===row.campaignMinute&&
    proof.actorId===row.characterId&&proof.gmConfirmed===true&&
    typeof proof.originalWitness==='string','neplatný historický Area původ');
   const original=JSON.parse(proof.originalWitness);
   assert(!('journal' in original),
    'historický Area důkaz nesmí cyklicky kopírovat předchozí celý deník');
   const rerun=prepareAlchemyAreaAtomicBattle({...original,journal:earlier,
    campaignId:proof.campaignId,minute:proof.minute,actorId:proof.actorId,
    finishId:proof.finishId,sourceId:proof.sourceId,
    throwDice:proof.throwDice,aimPoint:proof.aimPoint,
    center:proof.center??proof.aimPoint,areaDice:proof.areaDice,gmConfirmed:true});
   assert(JSON.stringify(rerun.historyRow.calendarAlchemyAreaThrown)===JSON.stringify(proof),
    'změněná Area fyzika, iniciativa, hozené kostky nebo zdravotní následky');
   assert(JSON.stringify(rerun.historyRow.calendarAlchemyVialEmpty??null)===
    JSON.stringify(row.calendarAlchemyVialEmpty??null),
    'změněná skutečná spotřeba lahvičky při Area výbuchu');
  }
  earlier.push(row);
 }
 return true;
}
export function assertAlchemyAreaAppendOnly(before=[],after=[]){
 const rows=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarAlchemyAreaThrown)
  assert(JSON.stringify(rows.get(row.id))===JSON.stringify(row),
   'starší Area bojová transakce musí zůstat beze změny');
 return true;
}
export function validateAlchemyAreaCombatLinks(database){
 for(const row of database.journal??[]){
  const p=row.calendarAlchemyAreaThrown;if(!p)continue;
  for(const [id,after] of Object.entries(p.afterStates??{})){
   const c=database.characters.find(x=>x.id===id);
   assert(c?.hmk?.combatState&&Array.isArray(c.hmk.combatState.events),
    'zasažená postava už nemá svůj původní Combat State');
   const first=(p.beforeStates?.[id]?.events??[]).map(e=>e.id);
   for(const e of after.events.filter(x=>!first.includes(x.id)))
    assert(c.hmk.combatState.events.some(x=>JSON.stringify(x)===JSON.stringify(e)),
     'chybí neměnný výsledek Area z původního Combat State: '+id);
  }
  for(const [id,before] of Object.entries(p.beforeStrength??{})){
   const c=database.characters.find(x=>x.id===id);
   const e=c?.hmk?.alchemyWeaknessLosses?.find(x=>x.sourceId===p.sourceId);
   assert(e?.strengthBefore===before&&e.strengthAfter===p.afterStrength[id]&&
    e.decrease===before-e.strengthAfter,
    'Strength ztratila historický Weakness event: '+id);
  }
  if(p.throw.discharged)assert(!database.inventory.some(x=>x.id===p.throw.vialId),
   'rozbitá Area nádoba zůstala v živém inventáři');
 }
 // A newly injected negative STR overlay must never acquire authority simply
 // because the current attribute value happens to match altered dice.
 for(const c of database.characters??[])for(const loss of c.hmk?.alchemyWeaknessLosses??[]){
  const sources=(database.journal??[]).filter(row=>row.id===loss.sourceId&&
   row.calendarAlchemyAreaThrown?.kind==='Weakness');
  assert(sources.length===1&&sources[0].calendarAlchemyAreaThrown.afterStrength?.[c.id]===loss.strengthAfter&&
   sources[0].calendarAlchemyAreaThrown.beforeStrength?.[c.id]===loss.strengthBefore,
   'Weakness STR nemá jednoznačný původní historický Area důkaz: '+c.id);
 }
 return true;
}
