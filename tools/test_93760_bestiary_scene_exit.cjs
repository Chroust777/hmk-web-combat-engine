'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),original=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):original(m,f);
const {prepareBestiaryDeparture93760:depart,validateBestiaryDepartureJournal93760:validate}=require('../src/integration/hmk-bestiary-departure-93760.js');
const {newEncounterBeastProof,encounterBeastHistory,validateBestiaryJournal}=require('../src/integration/hmk-bestiary-563.js');
const {animalHealthProjection567,prepareAnimalFrostInjury571,validateAnimalTraumaJournal567,requireAnimalMedicalGMTimeMayAdvance567:mayAdvance}=require('../src/integration/hmk-bestiary-trauma-567.js');
const deep=x=>structuredClone(x),cid='camp-760',minute=100;
let checks=0;
function ok(condition,label){assert.ok(condition,label);checks++}
function equal(a,b,label){assert.deepEqual(a,b,label);checks++}
function rejects(fn,regex){assert.throws(fn,regex);checks++}
const clock={campaignId:cid,minute};
const create=newEncounterBeastProof({id:'wolf-760',templateId:'wolf',name:'Zraněný vlk',campaignId:cid,campaignMinute:minute});
const data={campaignClock:clock,characters:[],journal:[{id:'beast-create-760',calendarCampaignId:cid,campaignMinute:minute,characterId:null,title:'Bestiář · příchod do encounteru: Zraněný vlk',body:'GM created a temporary scene creature',bestiaryEncounter:{...create,action:'create'}}]};
validateBestiaryJournal(data);ok(encounterBeastHistory(data,cid)[0].active,'initial temporary creature must be active');
let state=animalHealthProjection567(data.journal,cid,create.id);
const injury=prepareAnimalFrostInjury571({profile:{...create.profile,id:create.id},previous:state,minute,eventId:'frost-injury-760',zoneNumber:1,locationD10:1,level:4,source:'other',sourceDetails:'GM certified G4 frost wound from a previously resolved effect',shockRoll:31,shockFatigue:0,gmConfirmed:true});
const wound={...injury,campaignId:cid};
data.journal.push({id:'frost-injury-760',characterId:null,calendarCampaignId:cid,campaignMinute:minute,title:'Bestiář · zranění: Zraněný vlk',body:'GM confirmed injury',bestiaryTrauma:wound});
validateAnimalTraumaJournal567(data);state=animalHealthProjection567(data.journal,cid,create.id);
equal(state.wounds.length,1,'one authentic injury');equal(state.wounds[0].level,4,'original G4 preserved');
// A beast injury must not block progress of the PC/NPC campaign calendar.
ok(mayAdvance({journal:data.journal,campaignId:cid,beforeMinute:minute,afterMinute:minute+2000}),'Bestiary 4-hour and daily medical schedule does not gate calendar');
for(const outcome of ['dead','incapacitated','surrendered','fled','removed']){
 const p=depart({data,campaignId:cid,minute,targetId:create.id,outcome,gmConfirmed:true});
 equal(p.proof.outcome,outcome,'each GM narrative outcome accepted');
 equal(p.proof.medicalSnapshot.wounds[0].level,4,'injury frozen at original level');
 equal(p.proof.medicalSnapshot.evidenceIds,['frost-injury-760'],'provenance preserved');
}
rejects(()=>depart({data,campaignId:cid,minute,targetId:create.id,outcome:'dead'}),/GM musí/);
rejects(()=>depart({data,campaignId:cid,minute,targetId:create.id,outcome:'resurrected',gmConfirmed:true}),/Zvolte výsledek/);
rejects(()=>depart({data,campaignId:cid,minute:101,targetId:create.id,outcome:'fled',gmConfirmed:true}),/Kalendář/);
const prepared=depart({data,campaignId:cid,minute,targetId:create.id,outcome:'fled',gmConfirmed:true}).proof;
const departure={id:'departure-row-760',characterId:null,calendarCampaignId:cid,campaignMinute:minute,title:'Bestiář · odchod z encounteru: Zraněný vlk',body:'GM confirms beast has fled',bestiaryEncounter:{format:'hmk-bestiary-encounter-563-v1',id:create.id,action:'dismiss',campaignId:cid},bestiaryDeparture93760:prepared};
data.journal.push(departure);
validate(data);validateBestiaryJournal(data);validateAnimalTraumaJournal567(data);
equal(encounterBeastHistory(data,cid)[0].active,false,'no longer in encounter');
equal(data.campaignClock.minute,minute,'no automatic calendar advancement');
equal(animalHealthProjection567(data.journal,cid,create.id).wounds[0].level,4,'historic injury unchanged');
rejects(()=>depart({data,campaignId:cid,minute,targetId:create.id,outcome:'fled',gmConfirmed:true}),/již opustil/);
const tamper=deep(data);tamper.journal.at(-1).bestiaryDeparture93760.medicalSnapshot.wounds[0].level=0;
rejects(()=>validate(tamper),/snapshot/);
const duplicate=deep(data);duplicate.journal.push(deep(departure));rejects(()=>validate(duplicate),/již opustil/);
const later=deep(data);later.journal.push({...data.journal[1],id:'illegal-post-departure',campaignMinute:minute+5,bestiaryTrauma:{...wound,minute:minute+5}});rejects(()=>validate(later),/nelze zpětně/);
const mismatch=deep(data);mismatch.journal.at(-1).bestiaryEncounter.id='other';rejects(()=>validate(mismatch),/totožný/);
// Calendar ownership boundary: only canonical PC/NPC Health State has mandated
// future Healing. The temporary Bestiary trauma is still in the journal.
const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda,advanceCampaignCalendar}=require('../src/integration/hmk-campaign-calendar.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const patientHealth=initialCombatState();
patientHealth.wounds.push({id:'pcw760',location:'ua',severity:'S',level:2,aspect:'e',bleeding:false,nextAdvanceRound:null,
 healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
const patient={id:'npc-760',name:'Zraněné NPC',kind:'NPC',hmk:{attributes:{end:12,wil:12},healthState:patientHealth}};
let medicalClock=createCampaignCalendar({day:1,hour:8,minute:0,label:'PC/NPC mandatory calendar',eventId:'init-760',gmConfirmed:true,campaignId:cid,characterIds:[patient.id]});
medicalClock=anchorCampaignOrigin(medicalClock,{kind:'wound',characterId:patient.id,woundId:'pcw760',eventId:'anchor760',gmConfirmed:true});
const agenda=campaignCalendarAgenda(medicalClock,[patient],data.journal);
equal(agenda.future.filter(x=>x.kind==='healing').map(x=>x.characterId),['npc-760'],'only NPC healing obligation scheduled');
rejects(()=>advanceCampaignCalendar(medicalClock,{deltaMinutes:7201,eventId:'illegal-760',reason:'attempt to miss NPC healing',gmConfirmed:true,characters:[patient],journal:data.journal}),/termín|splatn|přeskoč/i);
medicalClock=advanceCampaignCalendar(medicalClock,{deltaMinutes:7200,eventId:'exact-760',reason:'GM confirms independent time to nearest NPC duty',gmConfirmed:true,characters:[patient],journal:data.journal});
equal(medicalClock.minute,7680,'PC/NPC deadline not skipped');
rejects(()=>advanceCampaignCalendar(medicalClock,{deltaMinutes:1,eventId:'illegal-again-760',reason:'attempt to pass unresolved NPC healing',gmConfirmed:true,characters:[patient],journal:data.journal}),/termín|splatn|přeskoč/i);
console.log('PASS',checks,'v93.760 temporary beast with genuine G4 injury, all five outcomes, GM lock, immutable snapshot, no clock blocker, historic consistency and late medical write rejected');
