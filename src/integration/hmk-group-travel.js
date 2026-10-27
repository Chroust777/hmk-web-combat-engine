/** One four-hour group watch / many individually attested END secondary rolls.
 * This scheduler only creates append-only journal proposals. No actor state,
 * fatigue or campaign minute changes until the explicit GM advance.
 */
import {assessTrekkingReadiness} from './hmk-trekking-readiness.js';
import {expeditionDiceSubmission,expeditionWatchFatigue} from './hmk-calendar-expedition.js';
import {scheduleHMKActivity} from './hmk-calendar-activities.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {totalFatigue} from '../rules/fatigue.js';
import {prepareAnimalWeariness} from './hmk-trekking-animal-fatigue.js';
import {trekPartyModes} from './hmk-trekking-party-modes.js';
import {animalTrekInputFromSnapshot} from './hmk-trekking-animal-load.js';
import {animalDoubleTimeTimeline} from './hmk-trekking-animal-timeline.js';
const requireFact=(ok,msg)=>{if(!ok)throw Error(msg);};
export function planHMKGroupWatch({journal=[],characters=[],inventory=[],clock,memberIds=[],guideId,kind,diceByActor={},animalWeariness=[],idFactory}={}){
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
   characters,inventory,conveyance:prepared.conveyance,loadedByGM:prepared.manualLoaded,drovingAnimals:(prepared.animals??[]).map(animalTrekInputFromSnapshot),
   allowCertifiedWeatherAccrual:true});
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
  // Detect changes in verified animal health between preparation and advance.
  // Unlike human Weather Hazard, no automatic animal trekking exposure or
  // healing transition is asserted by HMK 150. GM must reprepare the watch.
  requireFact(JSON.stringify(current.animals??[])===JSON.stringify(prepared.animals??[]),
   'Stav registrovaného zvířete nebo jeho zatížení se od přípravy hlídky změnil. Připravte aktuální hlídku bez přepisu historie.');
  requireFact(current.members.every((x,i)=>{
    const original=prepared.members[i];
    return x.id===original.id&&x.fatigue===original.fatigue+weatherDelta(x.id)&&
      Object.entries(original).every(([k,v])=>k==='fatigue'||JSON.stringify(x[k])===JSON.stringify(v));
  }), 'Stav postav nebo zatížení skupiny se po přípravě hlídky změnily bez doloženého Weather Hazard. Nepoužívejte zastaralé cestovní podklady.');
 }
 const animalPolicies=prepareAnimalWeariness(ready.source.calendarTrekProof.partyModes?.animals??[],animalWeariness,kind);
 requireFact(animalPolicies.every(p=>!clock.characterIds||clock.characterIds.includes(p.actorId)),
  'Zdravotní stav zvířete lze měnit pouze tehdy, je-li zvíře členem aktivní kampaně. Přidejte je do kalendáře.');
 // A beast may not be committed to two concurrent travel groups. The
 // existing human per-actor scheduling guard cannot enforce this on its own.
 const ownAnimals=new Set((ready.source.calendarTrekProof.partyModes?.animals??[]).map(a=>a.id));
 for(const pending of journal.filter(j=>j.calendarActivityProof?.plan?.travelGroup)){
  const activity=pending.calendarActivityProof,g=activity.plan.travelGroup;
  if(pending.calendarCampaignId!==campaignKey(clock)||g.id===ready.sourceId||
   activity.endMinute<=clock.minute||activity.startMinute>=clock.minute+240)continue;
  // A beast is a real physical travel participant even when the GM selects
  // the 'no optional animal fatigue' policy. It cannot be in two simultaneous
  // parties. Do not limit this guard to parties with animal fatigue policies.
  const otherAnimals=journal.find(x=>x.id===activity.plan.trekSourceId)?.calendarTrekProof?.partyModes?.animals??[];
  if(otherAnimals.some(a=>ownAnimals.has(a.id)))
   requireFact(false,'Zvíře je již rezervováno v jiné souběžné cestovní hlídce.');
 }
 // Per-hour threshold checks must not reject a legal SHORTER trek. A full
 // four-hour schedule can be interrupted at the exact hour when a beast
 // reaches 40; the GM clock is guarded from skipping that decision below.
 // Fatigue 20 supplies a Slow Mode only if the party chooses to travel in
 // the NEXT watch (HMK p.149), never retroactively in this chosen watch.
 for(const policy of animalPolicies){
  if(policy.period!=='hour')continue;
  const initial=ready.source.calendarTrekProof.partyModes.animals.find(a=>a.id===policy.actorId)?.health?.fatigue;
  const timeline=animalDoubleTimeTimeline(initial,policy);
  requireFact(timeline.firstImmobileHour!==0,'Zvíře '+policy.actorId+' nemůže zahájit Double Time s Fatigue 40.');
 }

 const group={format:'hmk-group-watch-v1',id:idFactory(),guideId,memberIds:[...memberIds].sort(),planningKind:kind,...(animalPolicies.length?{animalWeariness:animalPolicies}:{})};
 // Combat State also includes blood-loss Weakness. A partial fatigue sum can
 // silently allow a prohibited trek when the true total already reaches 40.
 const fatigueOf=actor=>{
  const s=actor.hmk?.combatState, f=s?.fatigue??{};
  const bloodWeakness=s?.bloodLoss?.weaknessFatigue??0;
  return totalFatigue({windedness:f.windedness??0,weariness:f.weariness??0,
   weakness:(f.otherWeakness??0)+bloodWeakness});
 };
 const atDepartureFatigue=id=>ready.source.calendarTrekProof.partyModes?.members
   .find(member=>member.id===id)?.fatigue??fatigueOf(roster.get(id));
 if(kind==='walk'||kind==='double-walk')for(const id of memberIds){
  const fatigue=atDepartureFatigue(id);
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
  const fatigue=atDepartureFatigue(id);

  // A drover leading pack animals on foot incurs 5/hour rather than
  // a walking traveller's 10/hour under Double Time (printed p.150).
  const hasPackAnimals=(ready.source.calendarTrekProof.partyModes?.animals??[])
   .some(a=>a.droverId===id);
  const actorMode=kind==='double-walk'&&hasPackAnimals?'double-drover':kind;
  const input=diceByActor[id];
  const result=expeditionDiceSubmission({kind,rawValues:input?.rawValues,generated:input?.generated});
  const snapshot=ready.source.calendarTrekProof.partyModes?.members.find(m=>m.id===id);
  const bypass=ready.source.calendarTrekProof.modes?.ignoreLoaded===true;
  const animals=ready.source.calendarTrekProof.partyModes?.animals??[];
  const animalExtraLoad=bypass?animals.filter(a=>a.loaded&&a.droverId===id)
   .reduce((sum,a)=>sum+Math.floor(a.enc/20)*10,0):0;
  // Weather-test Weariness is already applied by the original exposure
  // executor. Do NOT add it a second time during completion of the watch.
  const plan={...expeditionWatchFatigue({mode:actorMode,endurance,rolls:result.rolls,
    modifiedENC:bypass&&snapshot?.loaded?snapshot.modifiedENC:0,ignoreLoaded:bypass&&snapshot?.loaded,animalExtraLoad}),kind:'travel',
   trekSourceId:ready.sourceId,orienteeringId:ready.orienteeringId,
   travelledLeagues:ready.movement.leagues,travelledKilometres:ready.movement.kilometres,
   travelGroup:group};
  const proof=scheduleHMKActivity({journal:staged,clock,characterId:id,name:actor.name,
   kind,plan,id:idFactory(),origin:result.origin});
  staged.push(proof);proposed.push(proof);
 }
 return {plans:proposed,groupId:group.id,guideId,sourceId:ready.sourceId};
}
