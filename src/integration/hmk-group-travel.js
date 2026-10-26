/** One four-hour group watch / many individually attested END secondary rolls.
 * This scheduler only creates append-only journal proposals. No actor state,
 * fatigue or campaign minute changes until the explicit GM advance.
 */
import {assessTrekkingReadiness} from './hmk-trekking-readiness.js';
import {expeditionDiceSubmission,expeditionWatchFatigue} from './hmk-calendar-expedition.js';
import {scheduleHMKActivity} from './hmk-calendar-activities.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {totalFatigue} from '../rules/fatigue.js';
import {trekPartyModes} from './hmk-trekking-party-modes.js';
const requireFact=(ok,msg)=>{if(!ok)throw Error(msg);};
export function planHMKGroupWatch({journal=[],characters=[],inventory=[],clock,memberIds=[],guideId,kind,diceByActor={},idFactory}={}){
 requireFact(clock&&Number.isSafeInteger(clock.minute)&&typeof idFactory==='function','Chybí potvrzený čas kampaně nebo generátor ID');
 requireFact(['walk','ride','drive','double-walk','double-drover'].includes(kind),'Nepodporovaná cestovní činnost');
 requireFact(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,
  'Vyberte jedinečné postavy skupiny');
 requireFact(memberIds.includes(guideId),'Průvodce musí cestovat společně se skupinou');
 const roster=new Map(characters.filter(c=>(clock.characterIds??characters.map(x=>x.id)).includes(c.id)).map(c=>[c.id,c]));
 requireFact(memberIds.every(id=>roster.has(id)),'Postava není součástí aktivní kampaně');
 const ready=assessTrekkingReadiness({journal,characters,actorId:guideId,
  campaignId:campaignKey(clock),minute:clock.minute,kind});
 if(ready.source.calendarTrekProof.partyModes){
  const prepared=ready.source.calendarTrekProof.partyModes;
  requireFact(memberIds.length===prepared.memberIds.length&&memberIds.every(id=>prepared.memberIds.includes(id)),
   'Vybraná skupina neodpovídá účastníkům původně připravené Trekking Routine.');
  const current=trekPartyModes({memberIds:prepared.members.map(m=>m.id),guideId,
   characters,inventory,conveyance:prepared.conveyance,loadedByGM:prepared.manualLoaded});
  // The group was snapshot before the (required) weather procedures. A
  // confirmed weather test legitimately changes Fatigue within this same
  // watch; this MUST NOT invalidate the original immutable party snapshot.
  // Reject unrelated fatigue changes instead of simply dropping this guard.
  const weatherDelta=id=>journal.filter(j=>j.characterId===id&&
    j.skillTestProof?.type==='skill-weather-onset'&&
    (j.calendarCampaignId===campaignKey(clock)||j.calendarCampaignId===undefined)&&
    journal.some(src=>src.id===j.skillTestProof.sourceId&&
      src.calendarTrekSkillSource?.sourceId===ready.sourceId&&
      src.calendarTrekSkillSource?.hazard==='weather'&&src.characterId===id))
    .reduce((sum,j)=>sum+(j.skillTestProof.report?.addedWeariness??0)+
      (j.skillTestProof.report?.outcome?.weaknessFatigue??0),0);
  requireFact(current.members.every((x,i)=>{
    const original=prepared.members[i];
    return x.id===original.id&&x.fatigue===original.fatigue+weatherDelta(x.id)&&
      Object.entries(original).every(([k,v])=>k==='fatigue'||JSON.stringify(x[k])===JSON.stringify(v));
  }), 'Stav postav nebo zatížení skupiny se po přípravě hlídky změnily bez doloženého Weather Hazard. Nepoužívejte zastaralé cestovní podklady.');
 }
 const group={format:'hmk-group-watch-v1',id:idFactory(),guideId,memberIds:[...memberIds].sort()};
 const fatigueOf=actor=>{const f=actor.hmk?.combatState?.fatigue??{};
  return totalFatigue({windedness:f.windedness??0,weariness:f.weariness??0,weakness:f.otherWeakness??0});};
 if(kind==='walk'||kind==='double-walk')for(const id of memberIds){
  const fatigue=fatigueOf(roster.get(id));
  requireFact(fatigue<40,roster.get(id).name+': Fatigue '+fatigue+' dosahuje 40. Podle HMK 145 nemůže samostatně cestovat pěšky.');
 }
 // HMK p.145: a single wearied party member imposes one extra Slow Mode.
 // The original weather-induced Slow Mode is a separate penalty.
 if(!ready.source.calendarTrekProof.partyModes&&memberIds.some(id=>fatigueOf(roster.get(id))>=20)){
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
  const snapshot=ready.source.calendarTrekProof.partyModes?.members.find(m=>m.id===id);
  const bypass=ready.source.calendarTrekProof.modes?.ignoreLoaded===true&&snapshot?.loaded===true;
  // Weather-test Weariness is already applied by the original exposure
  // executor. Do NOT add it a second time during completion of the watch.
  const plan={...expeditionWatchFatigue({mode:kind,endurance,rolls:result.rolls,
    modifiedENC:bypass?snapshot.modifiedENC:0,ignoreLoaded:bypass}),kind:'travel',
   trekSourceId:ready.sourceId,orienteeringId:ready.orienteeringId,
   travelledLeagues:ready.movement.leagues,travelledKilometres:ready.movement.kilometres,
   travelGroup:group};
  const proof=scheduleHMKActivity({journal:staged,clock,characterId:id,name:actor.name,
   kind,plan,id:idFactory(),origin:result.origin});
  staged.push(proof);proposed.push(proof);
 }
 return {plans:proposed,groupId:group.id,guideId,sourceId:ready.sourceId};
}
