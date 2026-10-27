'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {trekPartyModes,validateTrekPartySnapshot}=require('../src/integration/hmk-trekking-party-modes.js');
const {animalTrekLoad,animalTrekInputFromSnapshot,validateAnimalTrekLoadProof}=require('../src/integration/hmk-trekking-animal-load.js');
const {animalDoubleTimeTimeline,animalDoubleTimeCutoff}=require('../src/integration/hmk-trekking-animal-timeline.js');
const {prepareAnimalWeariness}=require('../src/integration/hmk-trekking-animal-fatigue.js');
const A=require('../src/integration/hmk-calendar-activities.js'),E=require('../src/integration/hmk-calendar-expedition.js');
let n=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const member=id=>({id,name:id,hmk:{attributes:{str:12,end:10},combatState:initialCombatState()}});
const beast=(id,breed='mule',str=25,fatigue=0)=>{const x={id,name:id,hmk:{verifiedMountedBreed:breed,attributes:{str,end:12},combatState:initialCombatState()}};x.hmk.combatState.fatigue.weariness=fatigue;return x;};
const base=(animal,actor)=>animalTrekLoad({animal,actor});
const inputs={id:'mule',droverId:'guide'};
for(const [lb,expected] of [[0,0],[19,0],[20,0],[239,0],[240,5],[279,10],[280,15],[299,15],[300,20],[380,40]]){
 const r=base({...inputs,loadLb:lb},beast('mule'));
 eq(r.enc,expected);eq(validateAnimalTrekLoadProof(r.encCalculation,r.enc,'mule'),true);
 eq(base({id:'mule',enc:lb,droverId:'guide'},beast('mule')).enc,lb); // NEVER reapply bonus
}
for(const [breed,str,loadLb,expect] of [['pony',24,300,40],['mule',25,300,20],['palfrey',26,240,20],['donkey',24,200,15]]){
 const r=base({...inputs,loadLb},beast('mule',breed,str));eq(r.enc,expect);eq(r.encCalculation.breedMod,breed==='mule'?-20:0);
}
const awkward=base({...inputs,loadLb:140,awkwardLb:80},beast('mule'));
eq(awkward.enc,0);eq(awkward.encCalculation.baseENC,55);
bad(()=>base({...inputs,enc:20,loadLb:300},beast('mule')),/buď|obojí/);
bad(()=>base({...inputs,loadLb:40},null),/registrované/);
bad(()=>base({...inputs,loadLb:40,awkwardLb:41},beast('mule')),/hmotnost|hmotnost|Hmotnost/);
bad(()=>base({...inputs,enc:20,awkwardLb:0},beast('mule')),/zároveň/);
function party(animals,roster,conveyance='mount'){
 return trekPartyModes({memberIds:['guide'],guideId:'guide',characters:roster,
  conveyance,drovingAnimals:animals});
}
const roster=[member('guide'),beast('mule'),beast('pony','pony',24)];
const data=[{id:'mule',loadLb:300,droverId:'guide'},{id:'pony',loadLb:200,droverId:'guide'}];
const snapshot=party(data,roster);eq(snapshot.animals[0].enc,20);eq(snapshot.animals[0].loaded,true);
eq(snapshot.animals[1].enc,15);eq(snapshot.animals[1].loaded,false);
eq(snapshot.loaded,true);eq(validateTrekPartySnapshot(snapshot),true);
const saved=JSON.parse(JSON.stringify(snapshot));eq(validateTrekPartySnapshot(saved),true);
const inputsRebuilt=snapshot.animals.map(animalTrekInputFromSnapshot);
eq(party(inputsRebuilt,roster),snapshot);
const forged=structuredClone(snapshot);forged.animals[0].encCalculation.breedMod=0;
bad(()=>validateTrekPartySnapshot(forged),/ENC|zatížení|Zvířecí/);
const forgedStr=structuredClone(snapshot);forgedStr.animals[0].encCalculation.str=15;
bad(()=>validateTrekPartySnapshot(forgedStr),/ENC|zatížení|Zvířecí/);
const forgedEnc=structuredClone(snapshot);forgedEnc.animals[0].enc+=5;
bad(()=>validateTrekPartySnapshot(forgedEnc),/ENC|zatížení|Zvířecí/);
const legacy=party([{id:'mule',enc:25,droverId:'guide'}],roster);eq(legacy.animals[0].enc,25);
eq(legacy.animals[0].encCalculation,undefined);eq(validateTrekPartySnapshot(legacy),true);
// Loaded is derived from FINAL ENC; skipping it awards drover a WATCH surcharge.
for(const lb of [299,300,379,380,459,460]){
 const p=party([{id:'mule',loadLb:lb,droverId:'guide'}],roster);
 const e=p.animals[0].enc, surcharge=Math.floor(e/20)*10;
 eq(p.animals[0].loaded,e>=20);
 eq(surcharge,Math.floor(e/20)*10);
}
// Fatigue ≥20 becomes a Slow Mode on the NEXT watch, not in the current one.
for(const fatigue of [0,5,10,15,19,20,21,39]){
 const ch=[member('guide'),beast('mule','mule',25,fatigue)];
 const current=party([{id:'mule',enc:0,droverId:'guide'}],ch);
 eq(current.wearied,fatigue>=20);eq(current.forcedSlow,Number(fatigue>=20));
 const pol=prepareAnimalWeariness(current.animals,[{actorId:'mule',mode:'walking-analogy'}],'double-walk')[0];
 const timeline=animalDoubleTimeTimeline(fatigue,pol);
 eq(timeline.firstWeariedHour,fatigue>=20?0:Math.ceil((20-fatigue)/10));
 eq(timeline.firstImmobileHour,Math.ceil((40-fatigue)/10));
 const cutoff=animalDoubleTimeCutoff(0,fatigue,pol);
 eq(cutoff,timeline.firstImmobileHour<4?timeline.firstImmobileHour*60:null);
}
bad(()=>party([{id:'mule',enc:0,droverId:'guide'}],[member('guide'),beast('mule','mule',25,40)]),/40/);
// A shorter group travel MUST be schedulable even if a full watch would
// cross the 40-point line. The time gate prevents silently crossing cutoff.
function dbWithFatigue(initial=20){
 const chars=[member('guide'),beast('mule','mule',25,initial)];
 const modes=party([{id:'mule',enc:0,droverId:'guide'}],chars);
 const policy=prepareAnimalWeariness(modes.animals,[{actorId:'mule',mode:'walking-analogy'}],'double-walk');
 const group={format:'hmk-group-watch-v1',id:'G516',guideId:'guide',memberIds:['guide'],planningKind:'double-walk',animalWeariness:policy};
 const clock={campaignId:'camp-516',minute:0,characterIds:chars.map(x=>x.id)};
 const journal=[{id:'T516',characterId:'guide',calendarCampaignId:clock.campaignId,campaignMinute:0,
  calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',partyModes:modes,modes:{ignoreLoaded:false}}},
  {id:'O516',characterId:'guide',calendarCampaignId:clock.campaignId,campaignMinute:0,
   calendarTrekSkillSource:{sourceId:'T516',hazard:'survival'}}];
 const plan={...E.expeditionWatchFatigue({mode:'double-drover',endurance:10,rolls:[5,5,5,5]}),kind:'travel',
  trekSourceId:'T516',orienteeringId:'O516',travelGroup:group,travelledLeagues:4,travelledKilometres:16};
 journal.push(A.scheduleHMKActivity({journal,clock,characterId:'guide',name:'guide',kind:'double-walk',plan,id:'ACT516'}));
 return {journal,characters:chars,campaignClock:clock};
}
const opts=()=>({idFactory:(()=>{let i=0;return ()=>'next-'+(++i)})(),stamp:()=> '2026-10-27'});
const db=dbWithFatigue(20);
db.campaignClock.minute=120;eq(A.finishDueHMKActivities(db,opts()).length,0);
db.campaignClock.minute=121;bad(()=>A.finishDueHMKActivities(db,opts()),/120|40/);
db.campaignClock.minute=120;
const stop=A.interruptHMKActivity({journal:db.journal,clock:db.campaignClock,activityId:'ACT516',
 reason:'Zvíře dosáhlo Fatigue 40',id:'STOP516',createdAt:'2026-10-27',partialWeariness:0});
db.journal.push(stop);
eq(A.finishInterruptedHMKTravel(db,opts()).length,2);
eq(db.characters[1].hmk.combatState.fatigue.weariness,40);
eq(A.finishInterruptedHMKTravel(db,opts()).length,0);
eq(A.validateHMKActivityEvidence(db.journal),true);
bad(()=>party([{id:'mule',enc:0,droverId:'guide'}],db.characters),/40/);
console.log('PASS '+n+' checks: HMK verified animal lb/STR/mule ENC, legacy final ENC, 20/40 thresholds, hourly stop, partial completion, canonical fatigue, archive, anti-forgery');
