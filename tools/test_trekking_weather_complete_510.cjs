'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {evaluateTrekkingWeatherRoll,certifyTrekkingWeatherRoll,validateTrekkingWeatherRollEvidence}=require('../src/integration/hmk-trekking-weather-roll.js');
const {trekkingOutstandingCases}=require('../src/integration/hmk-trekking-followups.js');
const {trekkingSkillLinkForNewProof,hasFinishedLinkedTrekHazard,validateTrekLinkedEvidence}=require('../src/integration/hmk-trekking-handoff.js');
let count=0;const ok=(v,m)=>{assert.ok(v,m);count++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);count++},bad=(fn,regex)=>{assert.throws(fn,regex);count++};
const cold=(o={})=>evaluateTrekkingWeatherRoll({kind:'cold',areaAV:3,roll:4,...o});
const heat=(o={})=>evaluateTrekkingWeatherRoll({kind:'heat',areaAV:2,roll:2,...o});
eq(cold().av,3);eq(cold().sides,6);eq(cold().exposed,true);
eq(cold({roll:3}).exposed,false);eq(cold({areaAV:8,roll:5}).av,4);
eq(cold({areaAV:0,gearAV:2,shelterAV:3,fireFS:1,roll:6}).exposed,false);
eq(cold({areaAV:0,continuousSleet:true,roll:10}).sides,10);
bad(()=>cold({continuousSleet:true,roll:11}),/d10/);
bad(()=>cold({roll:7}),/d6/);bad(()=>cold({areaAV:-1}),/Area AV/);
bad(()=>cold({gearAV:9}),/ochranné/);
eq(heat().exposed,true);eq(heat({roll:3}).exposed,false);eq(heat({areaAV:0,roll:1}).av,1);
eq(heat({resting:true,roll:5}).sides,6);
eq(heat({resting:true,shadedRest:true,roll:7}).sides,10);
eq(heat({nativeHotClimate:true,roll:6}).sides,6);
eq(heat({nativeHotClimate:true,resting:true,roll:8}).sides,8);
eq(heat({nativeHotClimate:true,resting:true,shadedRest:true,roll:12}).sides,12);
bad(()=>heat({roll:5}),/d4/);bad(()=>heat({shadedRest:true}),/Shade/);
const memberIds=['guide','c1','c2'],actors=memberIds.map(id=>({id,name:id}));
const source={id:'watch',characterId:'guide',calendarCampaignId:'camp',campaignMinute:100,
 calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',campaignMinute:100,
 partyModes:{memberIds},weatherWatch:{hazard:'cold',requiresWeatherHazardRoll:true,continuous:false,precipitation:'none'},
 conveyance:'foot',hazards:{direction:null,survival:null},encounter:{encounter:false}}};
let journal=[source],ids=0;
const due=()=>trekkingOutstandingCases(actors,journal,'camp').filter(x=>x.hazard==='weather');
eq(due().length,3,'initial cold hazard for each actor');
function attest(actor,input){const proof=certifyTrekkingWeatherRoll({journal,source,actorId:actor,campaignId:'camp',minute:100,
 input,entryId:'die-'+(++ids),createdAt:'2026-01-01'});journal.push(proof);return proof;}
attest('guide',{kind:'cold',areaAV:5,roll:3});eq(due().length,2,'avoided exposure closes own obligation');
const rollc1=attest('c1',{kind:'cold',areaAV:0,roll:3});eq(due().length,2,'exposed actor still has original obligation');
bad(()=>certifyTrekkingWeatherRoll({journal,source,actorId:'c1',campaignId:'camp',minute:100,input:{kind:'cold',areaAV:0,roll:3},entryId:'dup'}),/již byl doložen/);
bad(()=>certifyTrekkingWeatherRoll({journal,source,actorId:'outsider',campaignId:'camp',minute:100,input:{kind:'cold',areaAV:0,roll:3},entryId:'bad'}),/nepatří/);
const skill={type:'secondary-mastery-test',skills:['Endurance'],a:{level:'S',roll:30}};
const link=trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,actorId:'c1',campaignId:'camp',minute:100,proof:skill,journal});
ok(link?.sourceId==='watch');
eq(trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,actorId:'guide',campaignId:'camp',minute:100,proof:skill,journal}),null,'successful avoidance cannot be rerolled as Endurance');
const rollEntry={id:'skill-c1',characterId:'c1',calendarCampaignId:'camp',campaignMinute:100,skillTestProof:skill,calendarTrekSkillSource:link};
journal.push(rollEntry);eq(due().length,2,'Endurance proof alone cannot bypass actual medical/physiological outcome');
journal.push({id:'onset-c1',characterId:'c1',calendarCampaignId:'camp',campaignMinute:100,skillTestProof:{type:'skill-weather-onset',sourceId:'skill-c1',actorId:'c1',report:{hr:null,addedWeariness:5}}});
eq(due().map(x=>x.characterId),['c2']);ok(hasFinishedLinkedTrekHazard(source,'weather',journal,'guide'));
attest('c2',{kind:'cold',areaAV:0,roll:5});eq(due().map(x=>x.characterId),['c2']);
ok(validateTrekLinkedEvidence(journal));ok(validateTrekkingWeatherRollEvidence(journal));
const tampered=structuredClone(journal);tampered.find(x=>x.id==='die-1').calendarTrekWeatherRoll.av=999;
bad(()=>validateTrekkingWeatherRollEvidence(tampered),/nesouhlasí/);
const duplicate=structuredClone(journal);duplicate.push({...duplicate.find(x=>x.id==='die-1'),id:'clone'});
bad(()=>validateTrekLinkedEvidence(duplicate),/zdvojený/);
const coldSleet=structuredClone(source);coldSleet.id='sleet';coldSleet.calendarTrekProof.weatherWatch.precipitation='sleet';coldSleet.calendarTrekProof.weatherWatch.continuous=true;
bad(()=>certifyTrekkingWeatherRoll({journal:[coldSleet],source:coldSleet,actorId:'guide',campaignId:'camp',minute:100,entryId:'wrong',input:{kind:'cold',areaAV:0,roll:3}}),/Continuous Sleet/);
const coldProof=certifyTrekkingWeatherRoll({journal:[coldSleet],source:coldSleet,actorId:'guide',campaignId:'camp',minute:100,entryId:'okay',input:{kind:'cold',areaAV:0,roll:8,continuousSleet:true}});
eq(coldProof.calendarTrekWeatherRoll.sides,10);
const hotSource=structuredClone(source);hotSource.id='hot';hotSource.calendarTrekProof.weatherWatch.hazard='heat';
const h=certifyTrekkingWeatherRoll({journal:[hotSource],source:hotSource,actorId:'guide',campaignId:'camp',minute:100,entryId:'hotdie',input:{kind:'heat',areaAV:1,roll:12,nativeHotClimate:true,resting:true,shadedRest:true}});
eq(h.calendarTrekWeatherRoll.exposed,false);eq(h.calendarTrekWeatherRoll.sides,12);
// existing v93.509 skill evidence (no physical AV witness) remains legible;
// creating NEW linked Endurance without the AV witness is rejected.
const legacyLink=trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,actorId:'c2',campaignId:'camp',minute:100,proof:skill,journal:[]});
eq(legacyLink,null);ok(trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,actorId:'c2',campaignId:'camp',minute:100,proof:skill,journal:[],legacyLinkedEvidence:true}));
const {prepareTrekkingWeatherTest}=require('../src/integration/hmk-weather-hazard-aftermath.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
function onset(kind,level,id){return prepareTrekkingWeatherTest({state:initialCombatState(),sourceId:id,round:1,
 kind,originalSL:level,weatherHazardConfirmed:true,gmConfirmed:true});}
for(const [kind,level,weak,hr,skin] of [
 ['cold','S',5,null,null],['cold','CS',0,null,null],
 ['cold','F',0,5,null],['cold','CF',0,5,'frostbite'],
 ['heat','S',10,null,null],['heat','CS',5,null,null],
 ['heat','F',0,5,null],['heat','CF',0,4,'sunburn']]){
 const r=onset(kind,level,kind+'-'+level);
 eq(r.report.addedWeariness,weak);
 eq(r.report.hr,hr);
 eq(r.report.skinPending,skin);
 eq(r.state.fatigue.weariness,weak);
 if(skin)ok(r.state.environmentalHazards[0]?.skinPending===skin);
}
const walkingHot=structuredClone(hotSource);
walkingHot.calendarTrekProof.conveyance='foot';walkingHot.calendarTrekProof.movement={leagues:2};
bad(()=>certifyTrekkingWeatherRoll({journal:[walkingHot],source:walkingHot,actorId:'guide',campaignId:'camp',minute:100,entryId:'rest-while-walking',input:{kind:'heat',areaAV:1,roll:5,resting:true}}),/pěší cestě/);
// Production app keeps matching dice buttons beside the manual input.

const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
ok(app.includes('data-trek-weather-auto')&&app.includes('openCalendarWeatherRoll(actor,source)'));
ok(app.includes('certifyTrekkingWeatherRoll('));
console.log('PASS '+count+' assertions: Weather Hazard v93.510 (cold/heat, AV, dice, party, calendar, provenance, duplicates, legacy)');
