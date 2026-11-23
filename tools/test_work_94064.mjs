// Headless integration test of actual app controllers. No DOM rendering or network.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=new URL('../',import.meta.url),file=new URL('.audit-'+randomUUID()+'.mjs',base);
const source=await fs.readFile(new URL('app.js',base),'utf8');
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
globalThis.window=globalThis;globalThis.document={addEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},documentElement:{},body:{}};
globalThis.MutationObserver=class{observe(){} disconnect(){}};
globalThis.addEventListener=()=>{};globalThis.setInterval=()=>0;globalThis.location={reload(){}};globalThis.requestAnimationFrame=()=>0;
const expose=`
export function seed(){
 data=clean();data.characters=[{id:'a',name:'Pepa',kind:'PC'}];data.campaignClock=createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'test',eventId:'start',gmConfirmed:true,characterIds:['a']});storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);
}
export function draft(){
 view='calendar';calendarLanding=false;activeCalendarSection='travel';
 sharedTimeWindowDraft=startSharedTimeWindow93767({campaignId:'test',windowId:'window',startMinute:480,minutes:30});
 timeEpisodeDraft={kind:'travel',survivalD10:'4',hazardAtMinute:'15',minutes:'30'};episodeDraftEpoch='isolated-epoch';
 episodeEvaluationRequested=true;episodeEvaluationCheckpoint=storageBaseline;episodeCurrentGuidedStep={field:'directionD10'};checkpointWork();
}
export function examine(){return {route:view,draft:timeEpisodeDraft,step:episodeCurrentGuidedStep,window:sharedTimeWindowDraft,minute:data.campaignClock.minute,journal:data.journal,work:observedWork,notice,storageReadOnly}}
export function medical(){
 seed();const c=character('a');c.hmk={isFolk:true,attributes:{str:12},skills:[{id:'sk',name:'Physician',ml:50}]};
 const h=initialCombatState();h.wounds=[{id:'wound',location:'ua',severity:'S',level:3,aspect:'b',bleeding:true,nextAdvanceRound:1,recordedRound:1}];c.hmk.injuries=[{id:'wound',location:'ua',severity:'S',bleeding:true,combatRecord:true}];writeCharacterHealth(c,h);
 storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);
 const st=persistentStateOf(c);view='encounter';guidedBloodSession=createGuidedBloodStoppage({id:'medical-test',round:1,timelineId:combatInjuryTimelineId,healer:c,patient:c,healerState:st,patientState:st,woundId:'wound',method:'sta',hasBandage:true,hasWater:true,plannedBleeders:1});
 guidedBloodSession=submitGuidedBloodStoppageDie(guidedBloodSession,93);writeGuidedDraft();checkpointWork();
}
export function finishMedical(){
 const c=character('a'),st=persistentStateOf(c),s=submitGuidedBloodStoppageDie(guidedBloodSession,42);
 return commitGuidedBloodStoppage({session:s,round:1,timelineId:combatInjuryTimelineId,healer:c,patient:c,healerState:st,patientState:st});
}
export {cloudSync};
`;
let remote=null;
globalThis.fetch=async(url,options)=>{
 const result=(status,data)=>new Response(JSON.stringify(data),{status});
 if(!url.includes('/contents/'))return result(200,{private:true});
 if(options.method==='GET')return result(remote?200:404,remote||{});
 const body=JSON.parse(options.body);if(body.sha!==remote?.sha)return result(409,{});
 remote={content:body.content,sha:randomUUID(),encoding:'base64'};return result(200,{content:{sha:remote.sha}});
};
const auth={owner:'Tester',repo:'isolated',accessToken:'test'};
try{
 await fs.writeFile(file,source.replace('function render(){','function render(){return;')+expose);
 globalThis.localStorage=store();globalThis.sessionStorage=store();const a=await import(file+'?A');a.seed();await a.cloudSync.connect({...auth,createIfMissing:true});
 a.draft();await a.cloudSync.flush();assert.equal(a.cloudSync.status,'ready');const left=a.examine();
 globalThis.localStorage=store();globalThis.sessionStorage=store();const b=await import(file+'?B');await b.cloudSync.connect(auth);
 const restored=await import(file+'?B-after-load');const right=restored.examine();
 assert.deepEqual(right.window,left.window);assert.deepEqual(right.draft,left.draft);assert.deepEqual(right.step,left.step);
 assert.equal(right.minute,480);assert.deepEqual(right.journal,[]);assert.equal(right.route,'calendar');assert.equal(right.storageReadOnly,false);
 console.log('PASS new JS module instances + separate device stores, real adapter/codec and episode restore, 30-minute window, incident at offset 15, next step, unchanged ledger and clock. Seeded checkpoint, no browser or final commit.');
remote=null;globalThis.localStorage=store();globalThis.sessionStorage=store();
 const medA=await import(file+'?medA');medA.medical();await medA.cloudSync.connect({...auth,createIfMissing:true});const uninterrupted=medA.finishMedical();
 globalThis.localStorage=store();globalThis.sessionStorage=store();const medB=await import(file+'?medB');await medB.cloudSync.connect(auth);
 const loaded=await import(file+'?medReload');assert.deepEqual(loaded.finishMedical(),uninterrupted);
 assert.equal(uninterrupted.proof.rolls.length,2);assert.deepEqual(uninterrupted.proof.rolls.map(x=>x.value),[93,42]);
 console.log('PASS Blood Stoppage after Physician 93, new device resumes at Strength d100, applies 42; full resulting patient state and two-die proof equal uninterrupted procedure.');
}finally{await fs.unlink(file)}
