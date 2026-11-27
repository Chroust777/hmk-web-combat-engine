import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {applyConfirmedTreatment,applyConfirmedInjuryHealing,applyConfirmedInfectionAmputation} from '../src/integration/hmk-healing-persistence.js';
import {trekPartyModes,trekPersonHealthSnapshot,trekTravelOperatorEligibility,validateTrekPartySnapshot} from '../src/integration/hmk-trekking-party-modes.js';
import {calculateTimeEpisode} from '../src/integration/hmk-time-episodes.js';
import {certifiedTransportMass93816,validateTransportMassEvidence93816} from '../src/integration/hmk-transport-passengers-93816.js';

function patient({alreadyHealed}){
 let state=initialCombatState();
 state.wounds=[{id:'left',location:'ca',side:'left',bodyKind:'human',severity:'S',level:3,aspect:'e',bleeding:false,nextAdvanceRound:null}];
 const setup=(woundId,eventId,daySinceInjury)=>({state,woundId,eventId,daySinceInjury,round:1,gmConfirmed:true});
 const heal=(id,day,roll)=>applyConfirmedInjuryHealing({...setup(id,'heal-'+id+'-'+day,day),endurance:12,will:12,roll}).state;
 for(const [side,day] of [['left',0],['right',15]]){
  if(side==='right')state.wounds.push({...state.wounds[0],id:side,side,healing:undefined,healed:false});
  state=applyConfirmedTreatment({...setup(side,'treat-'+side,0),untreated:true}).state;
  state=heal(side,5,95);
  const event='amp-'+side, start=(day+6)*1440;
  const surgery=applyConfirmedInfectionAmputation({...setup(side,event,6),physicianML:100,physicianIndex:10,
   physicianRoll:20,locationShock:1,shockML:90,shockRoll:5,amputationStrengthML:90,amputationRoll:20,
   procedureTime:{startMinute:start,endMinute:start+1,gmConfirmed:true}});
  state=surgery.state;
  if(side==='left'||alreadyHealed){
   const id=surgery.edgeWound.id;
   state=applyConfirmedTreatment({...setup(id,'treat-'+event,0),untreated:true}).state;
   state=heal(id,5,5);
   assert.equal(state.wounds.find(w=>w.id===id).healed,true);
  }
 }
 state=JSON.parse(JSON.stringify(state));
 validateCombatState(state);
 return state;
}
const characters=[
 {id:'driver',name:'QA Driver',hmk:{healthState:initialCombatState()}},
 {id:'recovery',name:'QA Recovering',hmk:{healthState:patient({alreadyHealed:false})}},
 {id:'healed',name:'QA Healed',hmk:{healthState:patient({alreadyHealed:true})}},
];
const [driver,...patients]=characters;
for(const {id,name,hmk:{healthState}} of patients){
 assert.equal(healthState.shock,'NONE');
 assert.equal(healthState.wounds.filter(w=>w.amputation?.severed).length,2);
 assert.equal(trekPersonHealthSnapshot({id,name,healthState}).cannotSelfMove,true,id);
 assert.equal(trekTravelOperatorEligibility({id,name,healthState}).eligible,false,id);
}
const memberIds=characters.map(c=>c.id),transportedMemberIds=patients.map(c=>c.id);
const options={memberIds,guideId:driver.id,characters};
assert.throws(()=>trekPartyModes({...options,conveyance:'foot'}),/vlastní silou/);
assert.throws(()=>trekPartyModes({...options,conveyance:'wagon',transportedMemberIds:['recovery']}),/každého pacienta/);
assert.throws(()=>trekPartyModes({...options,guideId:'healed',conveyance:'wagon',transportedMemberIds}),/Průvodce/);
const wagon=trekPartyModes({...options,conveyance:'wagon',transportedMemberIds});
assert.equal(validateTrekPartySnapshot(JSON.parse(JSON.stringify(wagon))),true);
const altered=structuredClone(wagon);
altered.members.find(m=>m.id==='healed').bilateralLegAmputation[1].side='left';
assert.throws(()=>validateTrekPartySnapshot(altered),/Změněné/);
const wt={driver:150,recovery:120,healed:130};
const mass=certifiedTransportMass93816({memberIds,transportedMemberIds,readWeight:id=>({ready:true,bodyLb:wt[id],gearLb:0,totalLb:wt[id],items:[]})});
assert.deepEqual(mass.patientLoadLb,{recovery:120,healed:130});
assert.equal(mass.totalPeopleLb,400);
assert.equal(validateTransportMassEvidence93816(mass,memberIds,transportedMemberIds,mass.patientLoadLb,150),true);
assert.equal(trekPersonHealthSnapshot({id:driver.id,healthState:driver.hmk.healthState}).cannotSelfMove,false);
const episode=calculateTimeEpisode({minute:480,minutes:60,kind:'travel',topography:'flat',
 terrain:'paved-road',conveyance:'wagon',progress:0,bearing:5,extraSlow:wagon.forcedSlow,
 wearied:false,injured:wagon.injured,loaded:false,progressD10:[],directionD10:[],
 memberIds,enduranceByActor:{driver:12,recovery:12,healed:12},endRollByActor:{driver:5},
 encByActor:{driver:0,recovery:0,healed:0},encounterEnviron:'highway',transportedMemberIds});
assert.equal(episode.endMinute,540);
for(const id of transportedMemberIds){
 const entry=episode.actors.find(x=>x.id===id);
 assert.equal(entry.endNotRequired.reason,'transported');
 assert.equal(entry.delta,0);
}
console.log('PASS bilateral documented amputations, healed/active stumps, required wagon passengers, and persisted mass');
