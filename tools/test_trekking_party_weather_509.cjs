'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {trekkingOutstandingCases}=require('../src/integration/hmk-trekking-followups.js');
const {trekkingSkillLinkForNewProof,validateTrekLinkedEvidence}=require('../src/integration/hmk-trekking-handoff.js');
const roster=[{id:'guide',name:'Průvodce'},{id:'companion',name:'Cestovatel'}];
const minute=480,campaign='c-v509';
const source={id:'watch',characterId:'guide',calendarCampaignId:campaign,campaignMinute:minute,
 calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',campaignMinute:minute,
 partyModes:{memberIds:['companion','guide']},weatherWatch:{requiresWeatherHazardRoll:true,hazard:'cold'},
 conveyance:'foot',hazards:{direction:null,survival:null},encounter:{encounter:false}}};
let n=0;const yes=(v,msg)=>{assert.ok(v,msg);n++},eq=(x,y,msg)=>{assert.deepEqual(x,y,msg);n++};
let rows=[source];
let due=()=>trekkingOutstandingCases(roster,rows,campaign);
const weather=()=>due().filter(x=>x.hazard==='weather');
eq(weather().map(x=>x.characterId),['companion','guide'],'a cold hazard is due for every exposed member');
eq(new Set(weather().map(x=>x.id)).size,2,'one calendar case per actor');
const makeRoll=(actor,id)=>{
 const roll={type:'secondary-mastery-test',skills:['Endurance'],a:{level:'S',roll:15}};
 const link=trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,
  actorId:actor,campaignId:campaign,minute:minute,proof:roll});
 yes(link?.actorId===actor,'weather roll must carry actor-linked source proof');
 const journal={id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,
  calendarTrekSkillSource:link,skillTestProof:roll};
 rows.push(journal);
 return journal;
};
const c=makeRoll('companion','roll-c');
// Saving a d100 is NOT enough; the original exposure executor must commit.
eq(weather().length,2,'source-bound weather test alone does not certify effects');
rows.push({id:'onset-c',characterId:'companion',calendarCampaignId:campaign,campaignMinute:minute,
 skillTestProof:{type:'skill-weather-onset',sourceId:c.id,actorId:'companion',report:{addedWeariness:5}}});
eq(weather().map(x=>x.characterId),['guide'],'one character finishing cannot clear the guide');
const g=makeRoll('guide','roll-g');
rows.push({id:'onset-g',characterId:'guide',calendarCampaignId:campaign,campaignMinute:minute,
 skillTestProof:{type:'skill-weather-onset',sourceId:g.id,actorId:'guide',report:{addedWeariness:5}}});
eq(weather().length,0,'all finished weather cases no longer block calendar');
yes(validateTrekLinkedEvidence(rows),'two actors can legally roll for one source watch');
const invalid=trekkingSkillLinkForNewProof({pending:{sourceId:'watch',hazard:'weather'},source,
 actorId:'stranger',campaignId:campaign,minute,proof:c.skillTestProof});
eq(invalid,null,'outsider cannot claim group weather roll');
eq(trekkingOutstandingCases(roster,rows,'other').length,0,'separate campaign isolation');
// Static browser routing guard: companion must resolve the guide-owned original watch.
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
yes(app.includes("hazard==='weather'&&(j.calendarTrekProof?.partyModes?.memberIds"),'calendar route resolves companion to original watch');
yes(app.includes('calendarCampaignId:src.calendarCampaignId,campaignMinute:data.campaignClock.minute'),'weather onset stores authoritative campaign time and identity');
console.log('PASS '+n+' trekking party weather, actor evidence and calendar resolution assertions v93.509');
