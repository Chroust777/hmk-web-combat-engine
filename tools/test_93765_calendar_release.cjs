'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {releaseCalendarMembers93765}=require('../src/integration/hmk-calendar-member-release-93765.js');
const {assertCampaignActorTimeIsolation,captureCampaignActor}=require('../src/integration/hmk-calendar-multi-campaign.js');
let n=0;const eq=(a,b)=>{n++;assert.deepEqual(a,b)};const bad=(a,re)=>{n++;assert.throws(a,re)};
function dataset(){
 const a=initialCombatState();a.shock='UNC';a.fatigue.weariness=30;
 a.wounds.push({id:'w1',location:'Arm',severity:'G',level:4,bleeding:false}); // bypass detailed validation below
 const p=initialCombatState();p.shock='KIA';p.fatigue.weariness=15;
 const c=initialCombatState();
 const characters=[{id:'npc',name:'NPC',hmk:{healthState:a,injuries:[{id:'w1'}],expedition:{claims:{lastFourHour:12}}}},
  {id:'dead',name:'Dead',hmk:{healthState:p,injuries:[]}},
  {id:'pc',name:'PC',hmk:{healthState:c,injuries:[]}}];
 return {schemaVersion:1,characters,inventory:[],journal:[],campaignClock:{campaignId:'camp',minute:100,characterIds:['npc','dead','pc']}};
}
const data=dataset();
// Replace artificially incomplete wound with real baseline without changing the point of the release test.
data.characters[0].hmk.healthState.wounds=[];data.characters[0].hmk.injuries=[];
validateCombatState(data.characters[0].hmk.healthState);validateCombatState(data.characters[1].hmk.healthState);
const before=structuredClone(data);
let id=0;const ids=()=>`release-${++id}`;
const out=releaseCalendarMembers93765(data,['npc','dead'],{campaignId:'camp',minute:100,idFactory:ids,stamp:()=> 'now',gmConfirmed:true});
eq(out.length,2);eq(data.characters[0].hmk.healthState.shock,'NONE');eq(data.characters[1].hmk.healthState.shock,'KIA');
eq(data.characters[0].hmk.healthState.fatigue.weariness,0);eq(data.characters[1].hmk.healthState.fatigue.weariness,0);
eq(data.characters[0].hmk.healthState.wounds.length,0);eq(data.characters[0].hmk.expedition.claims,{});
eq(data.journal.length,2);eq(data.journal[0].calendarMemberReleaseArchive.healthState.shock,'UNC');eq(data.journal[1].calendarMemberReleaseArchive.healthState.shock,'KIA');
eq(data.campaignClock.minute,100);eq(data.characters[2],before.characters[2]);
const after=structuredClone(data);after.campaignClock.characterIds=['pc'];
eq(assertCampaignActorTimeIsolation(before,after),true);
bad(()=>releaseCalendarMembers93765(dataset(),['npc'],{campaignId:'camp',minute:100,idFactory:ids,stamp:()=> 'now',gmConfirmed:false}),/GM/);
bad(()=>releaseCalendarMembers93765(dataset(),['npc','npc'],{campaignId:'camp',minute:100,idFactory:ids,stamp:()=> 'now',gmConfirmed:true}),/duplicitní/);
const tampered=structuredClone(after);tampered.characters[0].hmk.healthState.shock='STN';bad(()=>assertCampaignActorTimeIsolation(before,tampered),/není v právě/);
console.log('PASS '+n+' calendar GM offboarding isolation / medical reset / death preserved');
