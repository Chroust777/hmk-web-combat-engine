'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {trekPartyModes}=require('../src/integration/hmk-trekking-party-modes.js');
const H=require('../src/integration/hmk-trekking-animal-fatigue.js');
const E=require('../src/integration/hmk-calendar-expedition.js');
const A=require('../src/integration/hmk-calendar-activities.js');
let n=0;
const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++};
const bad=(fn,re)=>{assert.throws(fn,re);n++};
const member=id=>({id,name:id,hmk:{attributes:{str:12,end:10},combatState:initialCombatState()}});
const beast=(id,breed)=>({id,name:id,hmk:{verifiedMountedBreed:breed,attributes:{str:25,end:12},combatState:initialCombatState()}});
const opts=()=>({idFactory:(()=>{let i=0;return ()=>'proof-'+(++i)})(),stamp:()=> '2026-10-27T07:40:00Z'});
function prepare(kind='walk',args={}){
 const chars=[member('guide'),member('drover'),beast('mule','mule'),beast('pony','pony')].slice(0,args.singleAnimal?3:4);
 const drovingAnimals=chars.slice(2).map((x,i)=>({id:x.id,enc:args.enc??10,droverId:i?'drover':'guide'}));
 const party=trekPartyModes({memberIds:['guide','drover'],guideId:'guide',characters:chars,conveyance:'mount',drovingAnimals});
 const policies=H.prepareAnimalWeariness(party.animals,chars.slice(2).map((c,i)=>args.mixed&&i===1?{
  actorId:c.id,rate:5,reason:'Původní potvrzená úvaha GM',gmConfirmed:true}:{actorId:c.id,mode:'walking-analogy'}),kind);
 const clock={campaignId:'camp-515',minute:0,characterIds:chars.map(c=>c.id)};
 const group={format:'hmk-group-watch-v1',id:'G515',guideId:'guide',memberIds:['drover','guide'],planningKind:kind,animalWeariness:policies};
 const journal=[{id:'trek',characterId:'guide',calendarCampaignId:clock.campaignId,campaignMinute:0,
  calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',partyModes:party,modes:{ignoreLoaded:false}}},
 {id:'survival',characterId:'guide',calendarCampaignId:clock.campaignId,campaignMinute:0,calendarTrekSkillSource:{sourceId:'trek',hazard:'survival'}}];
 for(const id of ['guide','drover']){
  const mode=kind==='double-walk'&&drovingAnimals.some(x=>x.droverId===id)?'double-drover':kind;
  const plan={...E.expeditionWatchFatigue({mode,endurance:10,rolls:kind.startsWith('double-')?[5,5,5,5]:[5]}),
   kind:'travel',trekSourceId:'trek',orienteeringId:'survival',travelGroup:group,travelledLeagues:4,travelledKilometres:16};
  journal.push(A.scheduleHMKActivity({journal,clock,characterId:id,name:id,kind,plan,id:'ACT-'+id}));
 }
 return {characters:chars,journal,campaignClock:clock,policies,party};
}
const animalTotals=db=>db.characters.slice(2).map(x=>x.hmk.combatState.fatigue.weariness);
// Auto formula at each exact/partial time: no GM-required fields, no uncompleted period.
for(const kind of ['walk','ride','drive','double-walk','double-drover']){
 const db=prepare(kind),p=db.policies[0];
 eq(p.format,H.ANIMAL_TREK_ANALOGY);eq(p.gmConfirmed,false);
 eq(p.rate,kind.startsWith('double-')?10:5);
 eq(H.validateAnimalWeariness(db.party.animals,db.policies,kind),true);
 for(const minutes of [0,1,15,59,60,61,89,90,119,120,180,239,240]){
  const expected=kind.startsWith('double-')?Math.floor(minutes/60)*10:(minutes===240?5:0);
  eq(H.actualAnimalWeariness(p,minutes),expected);
  eq(H.actualAnimalWeariness(p,minutes,expected),expected);
  bad(()=>H.actualAnimalWeariness(p,minutes,expected+5),/Změněný|přepsaný/);
 }
 db.campaignClock.minute=240;
 eq(A.finishDueHMKActivities(db,opts()).length,4);
 eq(animalTotals(db),[p.period==='hour'?40:5,p.period==='hour'?40:5]);
 eq(A.finishDueHMKActivities(db,opts()).length,0);
 eq(A.validateHMKActivityEvidence(db.journal),true);
 const saved=JSON.parse(JSON.stringify(db));eq(A.validateHMKActivityEvidence(saved.journal),true);
 eq(animalTotals(saved),animalTotals(db));
 const forged=structuredClone(db);forged.journal.find(j=>j.calendarTrekAnimalFatigueProof).calendarTrekAnimalFatigueProof.delta+=5;
 bad(()=>A.validateHMKActivityEvidence(forged.journal),/Zvířecí|únav|Fatigue/);
}
// Auto interrupted regular watch: no fractionally invented animal fatigue.
for(const [kind,mins,expected] of [['walk',1,0],['walk',120,0],['walk',239,0],['double-walk',30,0],['double-walk',90,10],['double-walk',120,20],['double-walk',239,30]]){
 const db=prepare(kind,{singleAnimal:true});db.campaignClock.minute=mins;
 const pending=[];
 for(const id of ['guide','drover'])pending.push(A.interruptHMKActivity({journal:db.journal,clock:db.campaignClock,
  activityId:'ACT-'+id,reason:'Skutečné přerušení',id:'INT-'+id,createdAt:'2026-10-27',
  partialWeariness:kind==='walk'?0:db.journal.find(j=>j.id==='ACT-'+id).calendarActivityProof.plan.rolls.slice(0,Math.floor(mins/60)).reduce((v,r)=>v+Math.max(0,db.journal.find(j=>j.id==='ACT-'+id).calendarActivityProof.plan.base-(r.success?5:0)),0)}));
 db.journal.push(...pending);
 eq(pending[0].calendarActivityInterruptProof.animalPartialWeariness.mule,expected);
 eq(A.finishInterruptedHMKTravel(db,opts()).length,3);
 eq(animalTotals(db),[expected]);
 eq(A.finishInterruptedHMKTravel(db,opts()).length,0);
 eq(A.validateHMKActivityEvidence(db.journal),true);
}
// Mixed historic GM + new default requires partial GM decision only for GM animal.
for(const mins of [90,120]){
 const db=prepare('double-walk',{mixed:true});db.campaignClock.minute=mins;
 bad(()=>A.interruptHMKActivity({journal:db.journal,clock:db.campaignClock,
   activityId:'ACT-guide',reason:'Zastavení',id:'STOP',partialWeariness:0}),/GM|dílčí|Weariness/);
 const decisions={pony:mins===120?10:5};
 const stops=['guide','drover'].map(id=>A.interruptHMKActivity({journal:db.journal,clock:db.campaignClock,
  activityId:'ACT-'+id,reason:'Zastavení cesty',id:'STOP-'+id,partialWeariness:
   db.journal.find(j=>j.id==='ACT-'+id).calendarActivityProof.plan.rolls.slice(0,Math.floor(mins/60)).reduce((v,r)=>v+Math.max(0,db.journal.find(j=>j.id==='ACT-'+id).calendarActivityProof.plan.base-(r.success?5:0)),0),animalPartialWeariness:decisions}));
 db.journal.push(...stops);
 eq(stops[0].calendarActivityInterruptProof.animalPartialWeariness.mule,Math.floor(mins/60)*10);
 eq(A.finishInterruptedHMKTravel(db,opts()).length,4);
 eq(animalTotals(db),[Math.floor(mins/60)*10,decisions.pony]);
 eq(A.validateHMKActivityEvidence(db.journal),true);
}
// Malicious imported auto policies must not replace rate/period/reason/format.
const db=prepare('walk'),src=db.policies[0];
for(const key of ['rate','period','reason','gmConfirmed','sourcePages']){
 const altered=structuredClone(src);
 altered[key]= key==='rate'?40:key==='period'?'hour':key==='reason'?'Fraud':key==='gmConfirmed'?true:[999];
 bad(()=>H.validateAnimalWeariness(db.party.animals,[altered,db.policies[1]],'walk'),/Změněný|přepsaný/);
}
bad(()=>H.prepareAnimalWeariness(db.party.animals,[{actorId:'mule',mode:'walking-analogy',rate:90}],'walk'),/Odvozená/);
bad(()=>H.prepareAnimalWeariness(db.party.animals,[{actorId:'unknown',mode:'walking-analogy'}],'walk'),/registrovanou/);
bad(()=>H.prepareAnimalWeariness(db.party.animals,[{actorId:'mule',mode:'walking-analogy'},{actorId:'mule',mode:'walking-analogy'}],'walk'),/registrovanou/);
console.log('PASS '+n+' animal automatic *analogy*, legacy GM coexistence, actor Combat State, time/interruptions, signatures, serialization, tamper prevention');
