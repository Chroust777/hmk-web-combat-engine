'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const W=require('../src/integration/hmk-trekking-animal-weather.js'),H=require('../src/integration/hmk-trekking-animal-health.js');
const B=require('../src/integration/hmk-group-travel.js');
let tests=0;
const eq=(a,b)=>{assert.deepStrictEqual(a,b);tests++};
const bad=(f,re)=>{assert.throws(f,re);tests++};
const beast=(breed,id=breed)=>({id,name:id,hmk:{verifiedMountedBreed:breed,attributes:{end:12},combatState:initialCombatState()}});
const sourceOf=(a,kind='cold',rain=false)=>({id:'watch-'+a.id+'-'+kind,characterId:'guide',calendarCampaignId:'camp518',campaignMinute:0,
 calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',weatherWatch:{requiresWeatherHazardRoll:true,hazard:kind,precipitation:rain?'sleet':'rain',continuous:rain},
  animalWeatherPolicy:'hmk-trek-animal-weather-analogy-v1',partyModes:{memberIds:['guide'],animals:[{id:a.id,health:H.trekRegisteredAnimalHealth(a)}]}}});
const risk=(kind,breed,roll,bonus={})=>({kind,areaAV:W.ANIMAL_AREA_AV[breed],roll,origin:'manual',
 ...(kind==='cold'?{gearAV:0,shelterAV:0,fireFS:0,continuousSleet:false,...bonus}:
 {resting:false,shadedRest:false,nativeHotClimate:false,...bonus})});
let serial=0;
function run(a,s,input,journal=[s]){return W.prepareAnimalTrekkingWeather({journal,source:s,actor:a,campaignId:'camp518',minute:0,
 entryId:'wx-'+(++serial),createdAt:'2026-10-27',gmConfirmed:true,round:1,...input});}
for(const [breed,av] of Object.entries({donkey:3,pony:3,mule:3,palfrey:4,courser:4,charger:4,destrier:5})){
 const a=beast(breed),s=sourceOf(a);
 eq(W.ANIMAL_AREA_AV[breed],av);
 const sheltered=run(a,s,{risk:risk('cold',breed,6,{shelterAV:3})});eq(sheltered.proof.sl,null);eq(sheltered.proof.risk.exposed,false);
 const exposed=run(a,s,{risk:risk('cold',breed,6),endEML:50,endD100:71});eq(exposed.proof.sl,'F');eq(exposed.proof.report.hr,5);
 eq(exposed.state.environmentalHazards[0].active,true);
 eq(W.validateAnimalWeatherJournal([s,exposed.entry]),true);
 bad(()=>run(a,s,{risk:risk('cold',breed,6),endEML:50,endD100:71},[s,exposed.entry]),/jednou/);
}
let a=beast('mule'),src=sourceOf(a,'heat');
const heatFail=run(a,src,{risk:risk('heat','mule',2),endEML:60,endD100:81});
eq(heatFail.proof.sl,'F');eq(heatFail.proof.report.hr,5);eq(heatFail.proof.report.addedWeariness,0);
const heatSuc=run(a,src,{risk:risk('heat','mule',1),endEML:60,endD100:31});
eq(heatSuc.proof.sl,'S');eq(heatSuc.state.fatigue.weariness,10);
const heatCrit=run(a,src,{risk:risk('heat','mule',1),endEML:60,endD100:40});
eq(heatCrit.proof.sl,'CS');eq(heatCrit.state.fatigue.weariness,5);
const heatCF=run(a,src,{risk:risk('heat','mule',1),endEML:60,endD100:85});
eq(heatCF.proof.sl,'CF');eq(heatCF.proof.report.skinPending,'sunburn');
const coldCF=run(a,sourceOf(a),{risk:risk('cold','mule',6),endEML:60,endD100:85});
eq(coldCF.proof.report.skinPending,'frostbite');
// Cold wet = HR4. Cold S adds 5. Cold CS none.
let rain=sourceOf(a);const wet=run(a,rain,{risk:risk('cold','mule',6),endEML:50,endD100:71,coldCondition:'damp'});
eq(wet.proof.report.hr,4);
const cs=run(a,rain,{risk:risk('cold','mule',6),endEML:50,endD100:30});eq(cs.state.fatigue.weariness,0);
const coldS=run(a,rain,{risk:risk('cold','mule',6),endEML:50,endD100:31});eq(coldS.state.fatigue.weariness,5);
// Special sleet d10 and invalid dice.
const sleet=sourceOf(a,'cold',true);
bad(()=>run(a,sleet,{risk:risk('cold','mule',6),endEML:50,endD100:31}),/sleet|die/i);
eq(run(a,sleet,{risk:risk('cold','mule',10,{continuousSleet:true}),endEML:50,endD100:31}).hazard.sides,10);
// Heat climate improves die size but not AV; no resting while moving.
eq(run(a,src,{risk:risk('heat','mule',6,{nativeHotClimate:true})}).hazard.sides,6);
bad(()=>run(a,src,{risk:risk('heat','mule',1,{shadedRest:true,resting:true}),endEML:50,endD100:31}),/zároveň|chladit/);
// No exposure does not demand or consume Endurance.
const cool=run(a,src,{risk:risk('heat','mule',4)});eq(cool.proof.sl,null);
bad(()=>run(a,src,{risk:risk('heat','mule',4),endEML:50,endD100:31}),/Bez expozice/);
bad(()=>run(a,src,{risk:risk('heat','mule',2)}),/EML/);
bad(()=>run(a,src,{risk:risk('heat','mule',2),endEML:50,endD100:0}),/d100/);
bad(()=>run(a,src,{risk:risk('heat','mule',5)}),/kostku/);
bad(()=>run(a,src,{risk:risk('cold','mule',3)}),/Cold\/Heat/);
bad(()=>run(a,src,{risk:risk('heat','mule',2, {areaAV:9}),endEML:50,endD100:31}),/Area AV/);
// Check all forged and duplicate journal variants / restore.
let j=[src,heatSuc.entry];eq(W.validateAnimalWeatherJournal(JSON.parse(JSON.stringify(j))),true);
const tamper=(modify,re)=>{const copy=structuredClone(j);modify(copy[1].calendarTrekAnimalWeatherProof);bad(()=>W.validateAnimalWeatherJournal(copy),re);};
tamper(p=>p.risk.roll=6,/kostku|hod/);tamper(p=>p.risk.av=12,/změněný|hod/);
tamper(p=>p.endD100=80,/změněný|hod/);tamper(p=>p.sourceId='another',/původ/);
tamper(p=>p.breed='destrier',/původ/);tamper(p=>p.report.addedWeariness=5,/změněný|závěr/);
bad(()=>W.validateAnimalWeatherJournal([src,heatSuc.entry,heatSuc.entry]),/Duplicitní/);
// Registry and campaign isolation.
const clock={campaignId:'camp518',minute:0,characterIds:['guide','mule']};
eq(W.weatherAnimalCandidates({journal:[src],characters:[a],clock}).length,1);
eq(W.weatherAnimalCandidates({journal:j,characters:[a],clock}).length,0);
eq(W.weatherAnimalCandidates({journal:[src],characters:[a],clock:{campaignId:'other',minute:0,characterIds:['mule']}}).length,0);
bad(()=>W.prepareAnimalTrekkingWeather({journal:[src],source:src,actor:a,campaignId:'other',minute:0,entryId:'f',gmConfirmed:true}),/současnou hlídku/);
a.hmk.combatState.fatigue.weariness=10;
bad(()=>run(a,src,{risk:risk('heat','mule',2),endEML:50,endD100:31}),/změnilo/);
console.log('PASS Trekking animal weather 518:',tests,'checks');
// Watch planning must accept certified Weather (and only certified Weather),
// including import/restore, while blocking load changes, stolen proof and
// missing hazard decisions for new v93.518 watches.
const mule=beast('mule','mule'),watch=sourceOf(mule,'heat');
const oldAnimal={id:'mule',droverId:'guide',enc:10,loaded:false,health:H.trekRegisteredAnimalHealth(mule)};
const updated=run(mule,watch,{risk:risk('heat','mule',1),endEML:60,endD100:31});
const newAnimal={...oldAnimal,health:updated.proof.healthAfter};
eq(W.assertCertifiedAnimalWeatherTransition({journal:[watch,updated.entry],sourceId:watch.id,campaignId:'camp518',prepared:[oldAnimal],current:[newAnimal],mandatory:true}),true);
bad(()=>W.assertCertifiedAnimalWeatherTransition({journal:[watch],sourceId:watch.id,campaignId:'camp518',prepared:[oldAnimal],current:[oldAnimal],mandatory:true}),/Chybí/);
bad(()=>W.assertCertifiedAnimalWeatherTransition({journal:[watch,updated.entry],sourceId:watch.id,campaignId:'another',prepared:[oldAnimal],current:[newAnimal],mandatory:true}),/Chybí/);
bad(()=>W.assertCertifiedAnimalWeatherTransition({journal:[watch,updated.entry],sourceId:watch.id,campaignId:'camp518',prepared:[oldAnimal],current:[{...newAnimal,enc:30}],mandatory:true}),/náklad/);
bad(()=>W.assertCertifiedAnimalWeatherTransition({journal:[watch,updated.entry],sourceId:watch.id,campaignId:'camp518',prepared:[oldAnimal],current:[{...newAnimal,health:{...newAnimal.health,fatigue:25}}],mandatory:true}),/Zdravotní/);
bad(()=>W.assertCertifiedAnimalWeatherTransition({journal:[watch,updated.entry],sourceId:watch.id,campaignId:'camp518',prepared:[oldAnimal],current:[],mandatory:true}),/složení/);
console.log('PASS animal/weather watch transition checks');
// Critical Heat/Cold retain Exposure weakness and a pending species-specific
// skin decision; old human body-zone executor MUST NOT be auto-used.
eq(W.validateAnimalWeatherJournal([src,heatCF.entry]),true);
eq(W.validateAnimalWeatherJournal([sourceOf(beast('mule')),coldCF.entry]),true);
// A previously scheduled animal rest/travel at the same time blocks a new
// weather completion instead of retrospectively invalidating its recovery.
const occupied=beast('mule'),occupySrc=sourceOf(occupied,'heat');
const activity={id:'booked',characterId:occupied.id,calendarCampaignId:'camp518',calendarActivityProof:{
 characterId:occupied.id,startMinute:0,endMinute:240,plan:{kind:'rest'}}};
bad(()=>run(occupied,occupySrc,{risk:risk('heat','mule',1),endEML:50,endD100:31},[occupySrc,activity]),/aktivní cestu/);
const interrupted={id:'interrupt',characterId:occupied.id,calendarCampaignId:'camp518',campaignMinute:0,
 calendarActivityInterruptProof:{activityId:'booked'}};
eq(run(occupied,occupySrc,{risk:risk('heat','mule',1),endEML:50,endD100:31},[occupySrc,activity,interrupted]).proof.sl,'S');
console.log('PASS additional critical/provenance/overlap checks');
