'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)?mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):old(mod,file);
const C=require('../src/integration/hmk-campaign-calendar.js');
const O=require('../src/integration/hmk-calendar-automatic-onsets.js');
const G=require('../src/integration/hmk-calendar-planner.js');
const P=require('../src/integration/hmk-poison-course.js');
const D=require('../src/integration/hmk-disease-course.js');
const S=require('../src/integration/persistent-combat-state.js');
const A=require('../src/integration/hmk-calendar-activities.js');
const R=require('../src/integration/hmk-calendar-expedition.js');
const UI=require('../src/integration/hmk-calendar-event-controls.js');
let n=0,seq=0;const id=()=>`audit508-${++seq}`;
function ok(v,msg){assert.ok(v,msg);n++}function eq(a,b,msg){assert.deepEqual(a,b,msg);n++}
function throws(fn,re,msg){assert.throws(fn,re,msg);n++}
function actor(id0='p'){return {id:id0,name:'Pacient',hmk:{attributes:{end:12,wil:12},combatState:S.initialCombatState(),expedition:{claims:{}}}}}
function clock(person){return C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Audit',eventId:id(),gmConfirmed:true,campaignId:id(),characterIds:[person.id]})}
function next(c,a,j,minutes){return C.advanceCampaignCalendar(c,{deltaMinutes:minutes,eventId:id(),reason:'Doložené plynutí času',gmConfirmed:true,characters:[a],journal:j})}
function poisonScene(){const a=actor(),c=clock(a);let p=P.preparePoisonStart({actor:a,state:a.hmk.combatState,sourceId:id(),round:1,transmission:'contact',onsetMinutes:20,periodMinutes:20,initialHR:5,symptomD10s:[1,2,3,4],gmConfirmed:true,actualExposureConfirmed:true});a.hmk.combatState=p.state;const anchored=C.anchorCampaignOrigin(c,{kind:'poison',characterId:a.id,episodeId:p.course.id,eventId:id(),gmConfirmed:true});return {a,c:anchored,p:p.course};}
{
 const {a,c,p}=poisonScene(),agenda=C.campaignCalendarAgenda(c,[a],[]);
 const item=agenda.all.find(x=>x.kind==='poison');ok(item&&item.minute===c.minute+20,'Poison onset is scheduled');
 eq(O.automaticAilmentOnset(item,[a]).nextCourseMinute,c.minute+40,'future d100 Course preserved');
 eq(next(c,a,[],25).minute,c.minute+25,'automatic onset must be passable');
 eq(next(c,a,[],40).minute,c.minute+40,'GM can arrive at course deadline');
 throws(()=>next(c,a,[],41),/Course d100/,'but cannot jump beyond first Course');
 const result=P.preparePoisonOnset({actor:a,state:a.hmk.combatState,sourceId:p.sourceId,round:1,elapsedMinutes:20,gmConfirmed:true});
 eq(result.course.status,'active','automatic poison onset uses original rules');eq(result.course.elapsedMinutes,20,'onset age exact');
 a.hmk.combatState=result.state;
 // Persisted onset removes the formerly pending onset and reveals the next Course.
 throws(()=>next(c,a,[],41),/Poison Course/,'persisted active Course remains blocking');
}
{
 const a=actor(),c=clock(a),exposure=D.prepareDiseaseExposure({actor:a,state:a.hmk.combatState,sourceId:id(),diseaseKey:'generic-virus',transmission:'airborne',contagionIndex:5,contagionD100:95,round:1,confirmedStandardLethal:true,gmConfirmed:true});
 // Choose an actual contracted roll (above must fail END*CI): 95 vs 60 = F.
 eq(exposure.episode.status,'pending-profile','confirmed contagion requires profile');
 a.hmk.combatState=exposure.state;
 const profile=D.prepareDiseaseProfile({actor:a,state:a.hmk.combatState,sourceId:exposure.episode.sourceId,round:1,onsetD6:1,symptomD10s:[1,2,3,4],initialHR:5,gmConfirmed:true});a.hmk.combatState=profile.state;
 const anchor=C.anchorCampaignOrigin(c,{kind:'disease',characterId:a.id,episodeId:profile.episode.id,eventId:id(),gmConfirmed:true});
 const start=anchor.minute, onset=profile.episode.onsetMinutes;
 eq(next(anchor,a,[],onset+120).minute,start+onset+120,'Disease onset may pass without manual checkbox');
 throws(()=>next(anchor,a,[],onset+1441),/Course d100/,'but daily course cannot be passed');
 const evolved=D.prepareDiseaseOnset({actor:a,state:a.hmk.combatState,sourceId:profile.episode.sourceId,round:1,elapsedMinutes:onset,gmConfirmed:true});eq(evolved.episode.status,'active','original Disease engine handles onset');
}
// Exhaustive event-kind classification: NONE of these may be silently resolved by
// the poison/disease exception. They retain their original validation/GM rules.
const mandatory=[
'healing','infection','grim','coma','extended-shock','blood-loss','poison-course','disease-course',
'bleeding','shock-followup','blood-shock','asphyxia','treatment','malnutrition-course',
'weather-course','weather-skin','sleep-deprivation','aural-recovery','talisman-period',
'psyche-choice','psyche-interval','psyche-recovery','psyche-manifestation',
'herbal-potion','skill-critical','skill-fall','skill-injury','travel-hazard',
'alchemy-preparation','alchemy-decay','herbal-resistance','herbal-soporific'];
for(const kind of mandatory){eq(O.automaticAilmentOnset({kind,characterId:'p',minute:30,anchorMinute:20,sourceId:'x'},[actor()]),null,kind+' cannot be auto-skipped');}
// An incorrectly grounded or partially imported Poison/Disease remains blocked.
for(const kind of ['poison','disease']){
 const a=actor();const c=clock(a);const event={kind,characterId:'p',sourceId:'missing',minute:c.minute+10,anchorMinute:c.minute};
 eq(O.automaticAilmentOnset(event,[a]),null,kind+' has no invented profile');
}
{
 const a=actor();let c=clock(a);c=G.addGMCalendarPlan(c,{id:id(),eventId:id(),title:'Poznámka',minute:c.minute+3,endMinute:c.minute+3,requiresAction:false,confirmed:true});
 eq(next(c,a,[],6).minute,c.minute+6,'informational GM event never blocks');
 c=G.addGMCalendarPlan(c,{id:id(),eventId:id(),title:'Povinný GM test',minute:c.minute+5,endMinute:c.minute+5,requiresAction:true,destination:'skills',confirmed:true});
 throws(()=>next(c,a,[],6),/nevyřízenou GM událost/,'mandatory GM test blocks');
}
{
 const a=actor();a.hmk.combatState.fatigue.weariness=10;const c=clock(a),plan=R.expeditionRestRecovery({minute:c.minute,kind:'rest',current:10,claims:{}});
 const row=A.scheduleHMKActivity({journal:[],clock:c,characterId:a.id,name:a.name,kind:'rest',plan,id:id()});const j=[row];
 const note=UI.makeCalendarUIReceipt({journal:j,campaignId:c.campaignId,eventId:'activity:'+row.id,action:'acknowledge',minute:c.minute});j.push({id:id(),characterId:a.id,calendarCampaignId:c.campaignId,campaignMinute:c.minute,calendarUIReceipt:note});
 const end=next(c,a,j,241);const db={campaignClock:end,characters:[a],journal:j};
 eq(A.finishDueHMKActivities(db,{idFactory:id,stamp:()=>''}).length,1,'rest gets its automatic effect on time jump');
 eq(a.hmk.combatState.fatigue.weariness,5,'weariness minus five');
 eq(A.finishDueHMKActivities(db,{idFactory:id,stamp:()=>''}).length,0,'no double award');
 eq(next(end,a,j,1).minute,end.minute+1,'rest does not block later time');
}
{
 const s=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 ok(s.includes("const APP_VERSION='93.509'")&&html.includes('v93.509'),'aligned version');
 ok((s.match(/applyDeterministicCalendarOnsets\(\)/g)||[]).length===4,'all three GM clock handlers call one onset executor');
 ok(s.includes('campaignMinute:event.minute')&&s.includes('displayCampaignMinute(event.minute)'),'automatic onset is time-stamped at exact event, not later GM time');
}
console.log(`PASS ${n} cross-category calendar event barriers, auto onsets, clock, rest, skill safety v93.509`);
