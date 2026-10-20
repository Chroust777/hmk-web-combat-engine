/** One four-hour group watch / many individually attested END secondary rolls.
 * This scheduler only creates append-only journal proposals. No actor state,
 * fatigue or campaign minute changes until the explicit GM advance.
 */
import {assessTrekkingReadiness} from './hmk-trekking-readiness.js';
import {expeditionDiceSubmission,expeditionWatchFatigue} from './hmk-calendar-expedition.js';
import {scheduleHMKActivity} from './hmk-calendar-activities.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {totalFatigue} from '../rules/fatigue.js';
const requireFact=(ok,msg)=>{if(!ok)throw Error(msg);};
export function planHMKGroupWatch({journal=[],characters=[],clock,memberIds=[],guideId,kind,diceByActor={},idFactory}={}){
 requireFact(clock&&Number.isSafeInteger(clock.minute)&&typeof idFactory==='function','Chybí potvrzený čas kampaně nebo generátor ID');
 requireFact(['walk','ride','drive','double-walk','double-drover'].includes(kind),'Nepodporovaná cestovní činnost');
 requireFact(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,
  'Vyberte jedinečné postavy skupiny');
 requireFact(memberIds.includes(guideId),'Průvodce musí cestovat společně se skupinou');
 const roster=new Map(characters.filter(c=>(clock.characterIds??characters.map(x=>x.id)).includes(c.id)).map(c=>[c.id,c]));
 requireFact(memberIds.every(id=>roster.has(id)),'Postava není součástí aktivní kampaně');
 const ready=assessTrekkingReadiness({journal,characters,actorId:guideId,
  campaignId:campaignKey(clock),minute:clock.minute,kind});
 const group={format:'hmk-group-watch-v1',id:idFactory(),guideId,memberIds:[...memberIds].sort()};
 const fatigueOf=actor=>{const f=actor.hmk?.combatState?.fatigue??{};
  return totalFatigue({windedness:f.windedness??0,weariness:f.weariness??0,weakness:f.otherWeakness??0});};
 if(kind==='walk'||kind==='double-walk')for(const id of memberIds){
  const fatigue=fatigueOf(roster.get(id));
  requireFact(fatigue<40,roster.get(id).name+': Fatigue '+fatigue+' dosahuje 40. Podle HMK 145 nemůže samostatně cestovat pěšky.');
 }
 // HMK p.145: a single wearied party member imposes one extra Slow Mode.
 // The original weather-induced Slow Mode is a separate penalty.
 if(memberIds.some(id=>fatigueOf(roster.get(id))>=20)){
  const p=ready.source.calendarTrekProof;
  requireFact(p.modes.slow>=(p.weatherWatch?.slowMode?2:1),
   'Skupina má postavu s Fatigue ≥ 20: Trekking Routine musí zahrnovat Wearied Slow Mode (HMK 145).');
 }
 const proposed=[],staged=[...journal];
 for(const id of memberIds){
  const actor=roster.get(id),endurance=actor.hmk?.attributes?.end;
  requireFact(Number.isSafeInteger(endurance),'Postava '+actor.name+' nemá doložené END');
  // HMK p.145: a folk member at 40+ total Fatigue cannot trek on foot.
  // This check uses the ORIGINAL authoritative fatigue state, not the future
  // END result; a wagon passenger is deliberately not presumed to be walking.
  const fatigue=fatigueOf(actor);

  const input=diceByActor[id];
  const result=expeditionDiceSubmission({kind,rawValues:input?.rawValues,generated:input?.generated});
  const plan={...expeditionWatchFatigue({mode:kind,endurance,rolls:result.rolls}),kind:'travel',
   trekSourceId:ready.sourceId,orienteeringId:ready.orienteeringId,
   travelledLeagues:ready.movement.leagues,travelledKilometres:ready.movement.kilometres,
   travelGroup:group};
  const proof=scheduleHMKActivity({journal:staged,clock,characterId:id,name:actor.name,
   kind,plan,id:idFactory(),origin:result.origin});
  staged.push(proof);proposed.push(proof);
 }
 return {plans:proposed,groupId:group.id,guideId,sourceId:ready.sourceId};
}
