'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-trekking-party-modes.js');
const E=require('../src/integration/hmk-calendar-expedition.js');
const A=require('../src/integration/hmk-calendar-activities.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const human=id=>({id,name:id,hmk:{attributes:{str:12,end:10},combatState:initialCombatState()}});
const makeDb=()=>{
 const characters=[human('guide'),human('drover'),{id:'horse1',name:'horse1',hmk:{verifiedMountedBreed:'charger',attributes:{str:22,end:13},combatState:initialCombatState()}}];
 const party=P.trekPartyModes({memberIds:['guide','drover'],guideId:'guide',characters,conveyance:'mount',drovingAnimals:[{id:'horse1',enc:10,droverId:'guide'}]});
 const trek={id:'trek',characterId:'guide',calendarCampaignId:'X',campaignMinute:0,calendarTrekProof:{partyModes:party}};
 const clock={campaignId:'X',minute:0,characterIds:['guide','drover']},journal=[trek];
 const group={format:'hmk-group-watch-v1',id:'group1',guideId:'guide',memberIds:['drover','guide'],planningKind:'ride'};
 for(const id of ['guide','drover']){
  const plan={...E.expeditionWatchFatigue({mode:'ride',endurance:10,rolls:[10]}),kind:'travel',trekSourceId:'trek',travelGroup:group};
  journal.push(A.scheduleHMKActivity({journal,clock,characterId:id,name:id,kind:'ride',plan,id:'schedule-'+id,origin:'manual'}));
 }
 return {characters,journal,campaignClock:{...clock,minute:240}};
};
let db=makeDb();const original=JSON.parse(JSON.stringify(db));
const first=A.finishDueHMKActivities(db,{idFactory:(()=>{let i=0;return ()=>`done-${++i}`})(),stamp:()=> '2026-10-26T20:00:00.000Z'});
eq(first.length,2);eq(db.characters[0].hmk.combatState.fatigue.weariness,5);eq(db.characters[1].hmk.combatState.fatigue.weariness,5);eq(db.characters[2].hmk.combatState.fatigue.weariness,0);
eq(A.finishDueHMKActivities(db,{idFactory:()=> 'never',stamp:()=>''}).length,0);
// RESTORE old campaign/serialized scheduled watch: consistent animal state completes without duplicate or mutation to the beast.
let restored=JSON.parse(JSON.stringify(original));eq(restored.journal.length,3);
eq(A.finishDueHMKActivities(restored,{idFactory:()=> 'saved1',stamp:()=> '2026-10-26T20:00:00.000Z'}).length,2);
// Injury between scheduling and completion: block BEFORE any human commit, even with 2 due travelers.
for(const mutation of ['fatigue','injury','shock','removed']){
 db=makeDb();const animal=db.characters[2];
 if(mutation==='fatigue')animal.hmk.combatState.fatigue.weariness=20;
 else if(mutation==='injury')animal.hmk.combatState.wounds.push({id:'w1',location:'hlg',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false});
 else if(mutation==='shock'){animal.hmk.combatState.shock='STN';animal.hmk.combatState.shockOriginRound=1;animal.hmk.combatState.shockFollowup={kind:'STN',originRound:1,dueRound:2,phase:'end-next-turn',timelineId:null}}
 else db.characters.pop();
 bad(()=>A.finishDueHMKActivities(db,{idFactory:()=> 'should-not',stamp:()=>''}),/Zdravotní stav|zvíře/);
 eq(db.journal.length,3);eq(db.characters[0].hmk.combatState.fatigue.weariness,0);eq(db.characters[1].hmk.combatState.fatigue.weariness,0);
}
// Tail (p355) is not a leg (p145); injury remains on authoritative animal, but does not force slow/immobility.
db=makeDb();db.characters[2].hmk.combatState.wounds.push({id:'tail',location:'tl',severity:'G',level:5,aspect:'e',bleeding:false,nextAdvanceRound:null,healed:false});
const party=P.trekPartyModes({memberIds:['guide','drover'],guideId:'guide',characters:db.characters,conveyance:'mount',drovingAnimals:[{id:'horse1',enc:10,droverId:'guide'}]});
eq(party.injured,false);eq(party.animals[0].health.immobile,false);eq(party.animals[0].health.seriousWounds.length,1);
console.log(`PASS ${n} animal completion: 2-actor atomic guard, changed fatigue/wound/shock/deleted animal, replay idempotence, archive roundtrip, p355 tail vs p145 leg`);
