'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const H=require('../src/integration/hmk-trekking-animal-fatigue.js');
const P=require('../src/integration/hmk-trekking-party-modes.js');
const E=require('../src/integration/hmk-calendar-expedition.js');
const A=require('../src/integration/hmk-calendar-activities.js');
let n=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const member=id=>({id,name:id,hmk:{attributes:{str:12,end:10},combatState:initialCombatState()}});
const beast=(id,breed)=>({id,name:id,hmk:{verifiedMountedBreed:breed,attributes:{str:25,end:12},combatState:initialCombatState()}});
const make=(kind='walk',nAnimals=2,policy=true)=>{
 const chars=[member('guide'),member('drover'),beast('mule','mule'),beast('pony','pony')].slice(0,2+nAnimals);
 const drovingAnimals=chars.slice(2).map((x,i)=>({id:x.id,enc:10,droverId:i?'drover':'guide'}));
 const party=P.trekPartyModes({memberIds:['guide','drover'],guideId:'guide',characters:chars,conveyance:'mount',drovingAnimals});
 const camp='camp-514',groupId='G1',trekId='T1';
 const journal=[{id:trekId,characterId:'guide',calendarCampaignId:camp,campaignMinute:0,calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',partyModes:party}} ,
 {id:'S1',characterId:'guide',calendarCampaignId:camp,campaignMinute:0,calendarTrekSkillSource:{sourceId:trekId,hazard:'survival'}}];
 const decisions=policy?chars.slice(2).map((c,i)=>({actorId:c.id,rate:i?10:5,reason:'Rozhodnutí GM k námaze zvířete',gmConfirmed:true})):[];
 const policies=H.prepareAnimalWeariness(party.animals,decisions,kind);
 const group={format:'hmk-group-watch-v1',id:groupId,guideId:'guide',memberIds:['drover','guide'],planningKind:kind,...(policies.length?{animalWeariness:policies}:{})};
 const clock={campaignId:camp,minute:0,characterIds:chars.map(c=>c.id)};
 for(const id of ['guide','drover']){
  const isDouble=kind.startsWith('double-'),mode=kind==='double-walk'&&drovingAnimals.some(x=>x.droverId===id)?'double-drover':kind;
  const plan={...E.expeditionWatchFatigue({mode,endurance:10,rolls:isDouble?[5,5,5,5]:[5]}),
   kind:'travel',trekSourceId:trekId,orienteeringId:'S1',travelGroup:group,travelledLeagues:4,travelledKilometres:16};
  journal.push(A.scheduleHMKActivity({journal,clock,characterId:id,name:id,kind,plan,id:'A-'+id,origin:'manual'}));
 }
 return {characters:chars,journal,campaignClock:{...clock,minute:240},group,policy:policies};
};
const opts=(prefix='R')=>({idFactory:(()=>{let i=0;return ()=>prefix+(++i)})(),stamp:()=> '2026-10-27T06:30:00.000Z'});
const totals=d=>d.characters.slice(2).map(c=>c.hmk.combatState.fatigue.weariness);
for(const kind of ['walk','double-walk']){
 let db=make(kind);const saved=JSON.parse(JSON.stringify(db));
 eq(totals(db),[0,0]);eq(A.finishDueHMKActivities(db,opts()).length,4);
 eq(totals(db),kind==='walk'?[5,10]:[20,40]);
 eq(db.journal.filter(j=>j.calendarTrekAnimalFatigueProof).length,2);
 eq(A.validateHMKActivityEvidence(db.journal),true);
 eq(A.finishDueHMKActivities(db,opts('Q')).length,0);
 eq(totals(db),kind==='walk'?[5,10]:[20,40]);
 eq(JSON.parse(JSON.stringify(db)).characters[3].hmk.combatState.fatigue.weariness,kind==='walk'?10:40);
 db=JSON.parse(JSON.stringify(saved));eq(A.finishDueHMKActivities(db,opts('V')).length,4);
 const tampered=structuredClone(db);tampered.journal.find(j=>j.calendarTrekAnimalFatigueProof).calendarTrekAnimalFatigueProof.delta+=5;
 bad(()=>A.validateHMKActivityEvidence(tampered.journal),/zvířecí|Zvířecí|Fatigue/);
}
// Non-opted-in animals never receive invented rate.
let db=make('walk',2,false);eq(A.finishDueHMKActivities(db,opts()).length,2);eq(totals(db),[0,0]);
const decision={actorId:'mule',rate:5,reason:'Převzatý režim GM',gmConfirmed:true};
const animalSnapshot=make('walk').journal[0].calendarTrekProof.partyModes.animals;
for(const wrong of [{...decision,actorId:'person'},{...decision,rate:-5},{...decision,rate:6},{...decision,gmConfirmed:false},{...decision,reason:''}])bad(()=>H.prepareAnimalWeariness(animalSnapshot,[wrong],'walk'),/GM|zvířete/);
bad(()=>H.prepareAnimalWeariness(animalSnapshot,[decision,decision]),/GM|zvířete/);
const [walk]=H.prepareAnimalWeariness(animalSnapshot,[decision]);
eq(H.actualAnimalWeariness(walk,240),5);eq(H.actualAnimalWeariness(walk,0),0);
bad(()=>H.actualAnimalWeariness(walk,120),/GM/);eq(H.actualAnimalWeariness(walk,120,5),5);eq(H.actualAnimalWeariness(walk,120,0),0);bad(()=>H.actualAnimalWeariness(walk,120,10),/GM/);
const [hour]=H.prepareAnimalWeariness(animalSnapshot,[decision],'double-walk');
for(let i=0;i<=4;i++)eq(H.actualAnimalWeariness(hour,i*60),i*5);
bad(()=>H.actualAnimalWeariness(hour,90),/GM/);eq(H.actualAnimalWeariness(hour,90,5),5);eq(H.actualAnimalWeariness(hour,90,10),10);bad(()=>H.actualAnimalWeariness(hour,90,0),/GM/);
// A full interrupted pair: both members finish at minute 120, animals only completed hours.
db=make('double-walk');db.campaignClock.minute=120;
for(const id of ['guide','drover']){
 const stop=A.interruptHMKActivity({journal:db.journal,clock:db.campaignClock,activityId:'A-'+id,
 reason:'Přerušená cesta',id:'I-'+id,createdAt:'2026-10-27',animalPartialWeariness:{mule:10,pony:20}});
 db.journal.push(stop);
}
eq(A.finishInterruptedHMKTravel(db,opts('X')).length,4);eq(totals(db),[10,20]);
eq(A.finishInterruptedHMKTravel(db,opts('Y')).length,0);eq(totals(db),[10,20]);
eq(A.validateHMKActivityEvidence(db.journal),true);
const corruptPartial=structuredClone(db);corruptPartial.journal.find(r=>r.calendarExpeditionProof?.activityId==='A-drover').calendarExpeditionProof.animalPartialWeariness.mule=20;
bad(()=>A.validateHMKActivityEvidence(corruptPartial.journal),/GM|zvířecí|přerušen/);
// Partial hour requires explicit GM ruling, but completed hour may never be discarded.
let part=make('double-walk',1);part.campaignClock.minute=90;
bad(()=>A.interruptHMKActivity({journal:part.journal,clock:part.campaignClock,activityId:'A-guide',reason:'Reálné přerušení',id:'I',animalPartialWeariness:{mule:0},partialWeariness:0}),/Zvířecí|Weariness|Únava/);
const validStops=[];
for(const id of ['guide','drover'])validStops.push(A.interruptHMKActivity({journal:part.journal,clock:part.campaignClock,activityId:'A-'+id,reason:'Reálné přerušení',id:'I-'+id,partialWeariness:id==='drover'?5:0,animalPartialWeariness:{mule:10}}));
part.journal.push(...validStops);eq(A.finishInterruptedHMKTravel(part,opts('J')).length,3);eq(totals(part),[10]);
// Unknown / unregistered animal cannot be fabricated into a recorded medical result.
bad(()=>H.prepareAnimalWeariness([{id:'stray'}],[{...decision,actorId:'stray'}],'walk'),/GM|zvířete/);
console.log(`PASS ${n} optional animal fatigue: GM-only rates, 2 animals, 4-hour/Double Time, 90/120min, Combat State, archive, idempotency, forged proof`);
