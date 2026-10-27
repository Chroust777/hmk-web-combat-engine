'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const A=require('../src/integration/hmk-calendar-activities.js'),R=require('../src/integration/hmk-trekking-animal-rest.js');
let tests=0,id=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);tests++},bad=(f,re)=>{assert.throws(f,re);tests++};
const beast=(name='mule',weariness=25)=>{const a={id:name,name,hmk:{verifiedMountedBreed:name==='horse'?'palfrey':'mule',combatState:initialCombatState()}};a.hmk.combatState.fatigue.weariness=weariness;return a};
const now=()=>({campaignId:'camp-517',minute:0,characterIds:['guide','mule','horse']});
const opts=()=>({idFactory:()=>`generated-${++id}`,stamp:()=> '2026-10-27T09:00:00.000Z'});
const db=()=>({characters:[beast('mule'),beast('horse',15)],journal:[{id:'T517',characterId:'guide',calendarCampaignId:'camp-517',campaignMinute:0,calendarTrekProof:{partyModes:{animals:[{id:'mule',health:{}},{id:'horse',health:{}}]}}}],campaignClock:now()});
function schedule(d,animalId,kind='rest',gmConfirmed=true){const actor=d.characters.find(x=>x.id===animalId),p=R.planAnimalRest({actor,kind,minute:d.campaignClock.minute,claims:actor.hmk.expedition?.claims,gmConfirmed});const row=A.scheduleHMKActivity({journal:d.journal,clock:d.campaignClock,characterId:animalId,name:actor.name,kind,plan:p,id:'activity-'+(++id),origin:'gm-confirmed-animal-analogy'});d.journal.push(row);return row}
function advance(d,n){d.campaignClock.minute=n;return A.finishDueHMKActivities(d,opts())}
const original=db();eq(R.eligibleRestingAnimals({characters:original.characters,journal:original.journal,clock:original.campaignClock}).length,2);
const disjoint=db();eq(R.eligibleRestingAnimals({characters:disjoint.characters,journal:disjoint.journal,clock:{campaignId:'different',minute:0,characterIds:['guide']}}).length,0);
const excluded=db();excluded.campaignClock.characterIds=['guide'];eq(R.eligibleRestingAnimals({characters:excluded.characters,journal:excluded.journal,clock:excluded.campaignClock}).length,0);
bad(()=>schedule(excluded,'mule'),/autoritativním seznamu/);
bad(()=>R.planAnimalRest({actor:beast(),kind:'sleep',minute:0,gmConfirmed:false}),/GM/);
bad(()=>R.planAnimalRest({actor:beast(),kind:'winded',minute:0,gmConfirmed:true}),/4h|8h/);
let d=db(),r=schedule(d,'mule');eq(r.calendarActivityProof.plan.animalRestPolicy.kind,'rest');eq(d.characters[0].hmk.combatState.fatigue.weariness,25);eq(A.validateHMKActivityEvidence(d.journal),true);
bad(()=>schedule(d,'mule'),/zároveň|činnost/);eq(schedule(d,'horse','sleep').calendarActivityProof.endMinute,480);
eq(advance(d,239).length,0);eq(d.characters[0].hmk.combatState.fatigue.weariness,25);
eq(advance(d,240).length,1);eq(d.characters[0].hmk.combatState.fatigue.weariness,20);
eq(d.journal.filter(x=>x.calendarExpeditionProof?.animalRestProof).length,1);
eq(advance(d,240).length,0);eq(d.characters[0].hmk.combatState.fatigue.weariness,20);
eq(advance(d,480).length,1);eq(d.characters[1].hmk.combatState.fatigue.weariness,0);
eq(d.journal.filter(x=>x.calendarExpeditionProof?.animalRestProof).length,2);
eq(A.validateHMKActivityEvidence(JSON.parse(JSON.stringify(d.journal))),true);
bad(()=>schedule(d,'mule','rest'),/24|období/);
const k=schedule(d,'mule','sleep');eq(k.calendarActivityProof.durationMinutes,480);eq(advance(d,960).length,1);eq(d.characters[0].hmk.combatState.fatigue.weariness,5);
eq((d.characters[0].hmk.combatState.fatigue.weakness??0),0);
bad(()=>schedule(d,'mule','sleep'),/24|období/);
// Actual time difference, not reset of calendar at midnight.
advance(d,1680);eq(schedule(d,'mule','rest').calendarActivityProof.startMinute,1680);
// Interrupted animal rest never heals or consumes a claim.
let d2=db(),i=schedule(d2,'mule');d2.campaignClock.minute=90;
const stop=A.interruptHMKActivity({journal:d2.journal,clock:d2.campaignClock,activityId:i.id,reason:'Animal startled by combat',id:'stop517',createdAt:'now'});
d2.journal.push(stop);eq(A.validateHMKActivityEvidence(d2.journal),true);
eq(advance(d2,400).length,0);eq(d2.characters[0].hmk.combatState.fatigue.weariness,25);
eq(schedule(d2,'mule').calendarActivityProof.startMinute,400);
// Weather/injury mid-rest invalidates the 4h automatic credit BEFORE writing.
let d3=db();schedule(d3,'mule');d3.characters[0].hmk.combatState.fatigue.weariness=30;
bad(()=>advance(d3,240),/změnily|zdraví/i);eq(d3.journal.some(x=>x.calendarExpeditionProof?.animalRestProof),false);
// Invalid status at planning time.
const sick=beast();sick.hmk.combatState.shock='UNC';bad(()=>R.planAnimalRest({actor:sick,kind:'rest',minute:0,gmConfirmed:true}),/Shock/);
const hot=beast();hot.hmk.combatState.environmentalHazards=[{id:'wx',active:true}];bad(()=>R.planAnimalRest({actor:hot,kind:'rest',minute:0,gmConfirmed:true}),/Exposure|Poškozená/);
// Atomic group boundary: one changed animal cannot make a second rested
// animal receive recovery before the transaction is rejected.
const combined=db();schedule(combined,'mule');schedule(combined,'horse');
combined.characters[1].hmk.combatState.fatigue.weariness+=5;
bad(()=>advance(combined,240),/změnily|zdraví/i);
eq(combined.characters[0].hmk.combatState.fatigue.weariness,25);
eq(combined.journal.filter(x=>x.calendarExpeditionProof?.animalRestProof).length,0);
// Other character activities do not block this animal.
let d4=db();schedule(d4,'mule');const p=R.planAnimalRest({actor:d4.characters[1],kind:'rest',minute:0,gmConfirmed:true});eq(p.recovered,5);
// Tampering with a stored schedule or result is rejected, legacy remains untouched.
let altered=structuredClone(d.journal);const animalPlan=altered.find(x=>x.calendarActivityProof?.plan?.animalRestPolicy);animalPlan.calendarActivityProof.plan.animalRestPolicy.confirmedByGM=false;
bad(()=>A.validateHMKActivityEvidence(altered),/doklad|Poškozený/i);
altered=structuredClone(d.journal);const result=altered.find(x=>x.calendarExpeditionProof?.animalRestProof);result.calendarExpeditionProof.animalRestProof.recovered+=5;
bad(()=>A.validateHMKActivityEvidence(altered),/obnova|doklad/i);
eq(A.assertHMKActivitiesAppendOnly(d.journal,structuredClone(d.journal)),true);
bad(()=>A.assertHMKActivitiesAppendOnly(d.journal,d.journal.filter(x=>!x.calendarExpeditionProof?.animalRestProof)),/přepsat|odstranit/);
// Existing old travel records don't gain new animal-rest data.
const legacy={id:'old517',characterId:'guide',calendarCampaignId:'camp-517',campaignMinute:0,title:'Legacy'};
eq(A.validateHMKActivityEvidence([legacy]),true);
// An animal booked as a mount cannot simultaneously recover its Weariness.
for(const order of ['travel-first','rest-first']){
 const x=db(),clock=x.campaignClock;
 const tPlan={kind:'travel',durationMinutes:240,trekSourceId:'T517',travelGroup:{id:'trip-517',animalWeariness:[{actorId:'mule'}]}};
 const travel=()=>{const j=A.scheduleHMKActivity({journal:x.journal,clock,characterId:'guide',name:'guide',kind:'walk',plan:tPlan,id:'trip-'+(++id)});x.journal.push(j)};
 const rest=()=>schedule(x,'mule');
 if(order==='travel-first'){travel();bad(rest,/zároveň/)}else{rest();bad(travel,/zároveň/)}
}
// Calendar timeline can display the beast's restored interval without adding
// the beast to the human party list or creating a second Fatigue database.
const timeline=A.calendarActorActivities(d.campaignClock,[{id:'mule',name:'mule'}],d.journal);
eq(timeline.some(x=>x.title?.startsWith('Zvíře · Odpočinek')),true);
console.log('PASS Trekking animal rest v93.517:',tests,'checks');
