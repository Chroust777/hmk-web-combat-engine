/** HMK p.145: registered injured mount can leave an active travelling party.
 * Character, injury, weight and journal persist; calendar membership does not. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {createCampaignCalendar,advanceCampaignCalendar,validateCampaignCalendar}=require('../src/integration/hmk-campaign-calendar.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {syncCampaignMembership,validateCampaignPortfolio,assertCampaignActorTimeIsolation}=require('../src/integration/hmk-calendar-multi-campaign.js');
const {recoverCalendarEvidence}=require('../src/integration/hmk-calendar-campaign-lifecycle.js');
const {trekPartyModes}=require('../src/integration/hmk-trekking-party-modes.js');
const {trekRegisteredAnimalHealth}=require('../src/integration/hmk-trekking-animal-health.js');
const {assertGMOnlyCampaignTime}=require('../src/integration/hmk-gm-clock-authority.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=(x)=>{assert.ok(x);n++},fail=(f,re)=>{assert.throws(f,re);n++};
const hero={id:'guide',name:'Ranger',hmk:{attributes:{str:12,end:12},healthState:initialCombatState()}};
const mule={id:'mule',name:'Injured mule',hmk:{attributes:{str:25,end:12},verifiedMountedBreed:'mule',healthState:initialCombatState()}};
mule.hmk.healthState.wounds=[{id:'left-hind-leg',location:'hlg',severity:'G',level:5,aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false}];
const cargo=[{id:'cargo-10',characterId:'mule',quantity:1,slot:'carried',snapshot:{id:'crate',name:'Cargo crate',category:'other',properties:{weightLb:50}}}];
const clock=createCampaignCalendar({day:1,hour:12,minute:0,label:'GM Travel',eventId:'init',campaignId:'camp',characterIds:['guide','mule'],gmConfirmed:true});
const db={characters:[hero,mule],inventory:cargo,journal:[],campaignClock:clock,campaignActorBranches:{}};
const before=structuredClone(db);
eq(validateCampaignPortfolio(db),true);eq(trekRegisteredAnimalHealth(mule).immobile,true);
fail(()=>trekPartyModes({memberIds:['guide'],guideId:'guide',characters:db.characters,conveyance:'foot',drovingAnimals:[{id:'mule',enc:20,droverId:'guide'}]}),/Grievous/);
const revised=recoverCalendarEvidence(db.campaignClock,[],['guide'],{idFactory:()=> 'recovery'});
revised.clock.events.push({id:'leave-mule',type:'membership',minute:clock.minute,reason:'GM confirmed mule left behind, cargo retained'});
const next=syncCampaignMembership(db,revised.clock);
next.journal.push({id:'departure',characterId:'mule',calendarCampaignId:'camp',campaignMinute:clock.minute,calendarTrekAnimalDeparture:{format:'hmk-trek-animal-departure-v1',actorId:'mule',campaignId:'camp',minute:clock.minute,cargoIds:['cargo-10'],disposition:'left-with-animal',gmConfirmed:true}});
eq(validateCampaignCalendar(next.campaignClock),next.campaignClock);
eq(next.campaignClock.characterIds,['guide']);eq(next.campaignClock.minute,clock.minute);
eq(next.characters.find(x=>x.id==='mule').hmk.healthState, mule.hmk.healthState);
eq(next.inventory.find(x=>x.id==='cargo-10').characterId,'mule');
eq(next.inventory.find(x=>x.characterId==='guide'),undefined);
eq(next.journal[0].calendarTrekAnimalDeparture.cargoIds,['cargo-10']);
eq(validateCampaignPortfolio(next),true);eq(assertCampaignActorTimeIsolation(before,next),true);eq(assertGMOnlyCampaignTime(before,next),true);
const withoutAnimal=trekPartyModes({memberIds:['guide'],guideId:'guide',characters:next.characters,conveyance:'foot',drovingAnimals:[]});eq(withoutAnimal.animals.length,0);
const after=advanceCampaignCalendar(next.campaignClock,{deltaMinutes:60,eventId:'advance-1',reason:'GM confirms travel after leaving immobile mule',gmConfirmed:true,characters:next.characters});eq(after.minute,clock.minute+60);
console.log('PASS',n,'animal departure: no movement requirement, membership, retained trauma, retained cargo, independent calendar advance');
