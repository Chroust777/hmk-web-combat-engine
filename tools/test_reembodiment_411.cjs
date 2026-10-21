const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHallucinogenicReembodiment,pendingHallucinogenicReembodiments,createHallucinogenicSaviris,createHallucinogenicLucidDream,createHallucinogenicTranscendence,createHallucinogenicVeil,createHallucinogenicTranceStart,requireHallucinogenicGMTimeMayAdvance,validateHallucinogenicJournal,assertHallucinogenicAppendOnly}=require('../src/integration/hmk-herbal-hallucinogenic.js');
const {applyConfirmedAstralReembodiment,initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},ok=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const C='A',A='herbalist',B='dreamer',e=(id,minute,type,p,who=B,camp=C)=>({id,calendarCampaignId:camp,campaignMinute:minute,characterId:who,createdAt:'2026-10-21T14:00:00Z',title:'test',body:'test',[type]:p});
const made=e('made',1,'calendarHerbPotionComplete',{format:'hmk-herb-potion-complete-v1',campaignId:C,minute:1,actorId:A,herbType:'hallucinogenic',potency:3,sv:8,usable:true,expiryMinute:1000},A);
const admin=e('dose',10,'calendarHerbPotionAdminister',{herbType:'hallucinogenic',targetId:B,sv:8,bonus:32,hallucinogenicTracked:true},A);
// There must be a complete journal (legacy admin metadata accepted for source validation of the independent astral proof).
const base=[made,admin];
const trance=createHallucinogenicTranceStart({journal:base,campaignId:C,applicationId:'dose',minute:10,targetId:B,tranceSkillML:60,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true});
const j1=[...base,e('start',10,'calendarHerbHallucinogenicTranceStart',trance)];
const veil=createHallucinogenicVeil({journal:j1,campaignId:C,startId:'start',minute:17,targetId:B,concentrationUninterrupted:true,gmConfirmed:true,transcendenceTracked:true});
const j2=[...j1,e('veil',17,'calendarHerbHallucinogenicVeil',veil)];
const transc=createHallucinogenicTranscendence({journal:j2,campaignId:C,veilId:'veil',targetId:B,minute:17,tranceML:60,fatiguePenalty:5,d100:5,bonusD3:2,bonusDieOrigin:'manual',gmConfirmed:true,reembodimentTracked:true,willIndex:7});
let j=[...j2,e('transc',17,'calendarHerbTranscendence',transc)];
eq(transc.reembodimentTracked,true);eq(pendingHallucinogenicReembodiments(j,C).length,1);eq(pendingHallucinogenicReembodiments(j,C)[0].maxSpiritRounds,9);
const args={journal:j,campaignId:C,sourceId:'transc',targetId:B,minute:17,spiritRoundsSpent:2,spiritML:60,d100:76,tranceML:60,tranceD10:4,tranceDieOrigin:'manual',physicalStateClear:true,spiritActionsAdjudicated:true,gmConfirmed:true};
const p=createHallucinogenicReembodiment(args);eq(p.baseSL,'F');eq(p.secondarySuccess,true);eq(p.adjustedSL,'S');eq(p.weariness,5);eq(p.stunned,false);
const r=applyConfirmedAstralReembodiment({state:initialCombatState(),round:1,eventId:'return',proof:p});eq(r.state.fatigue.weariness,5);eq(r.state.shock,'NONE');eq(r.state.events[0].type,'astral-reembodiment');ok(validateCombatState(r.state));
const noSecondary=createHallucinogenicReembodiment({...args,tranceD10:10});eq(noSecondary.baseSL,'F');eq(noSecondary.adjustedSL,'F');eq(noSecondary.weariness,10);eq(noSecondary.stunned,true);
const stunned=applyConfirmedAstralReembodiment({state:initialCombatState(),round:1,eventId:'return-stunned',proof:noSecondary});eq(stunned.state.shock,'STN');eq(stunned.state.shockFollowup.dueRound,2);eq(stunned.state.fatigue.weariness,10);ok(validateCombatState(stunned.state));
const alreadyTraumatic=initialCombatState();alreadyTraumatic.shock='INC';bad(()=>applyConfirmedAstralReembodiment({state:alreadyTraumatic,round:1,eventId:'bad',proof:noSecondary}),/traumatický|Stunned/);
for(const [value,re] of [[{spiritRoundsSpent:10},/kol/],[{minute:16},/kol|čas/],[{minute:19},/kol|čas/],[{spiritML:0},/Spirit/],[{d100:101},/Spirit/],[{tranceD10:0},/Trance/],[{sourceId:'unknown'},/chybí/],[{targetId:'other'},/příjemce/],[{gmConfirmed:false},/GM/],[{physicalStateClear:false},/GM/],[{spiritActionsAdjudicated:false},/GM/]]) bad(()=>createHallucinogenicReembodiment({...args,...value}),re);
bad(()=>requireHallucinogenicGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:17,afterMinute:19}),/astrální/);
j.push(e('return',17,'calendarHerbReembodiment',p));ok(validateHallucinogenicJournal(j));eq(pendingHallucinogenicReembodiments(j,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:17,afterMinute:19}));
bad(()=>createHallucinogenicReembodiment({...args,journal:j}),/dokončena|příjemce/);
for(const prop of ['weariness','adjustedSL','d100','spiritRoundsSpent']){const corrupt=structuredClone(j);corrupt.at(-1).calendarHerbReembodiment[prop]=prop==='adjustedSL'?'CS':999;bad(()=>validateHallucinogenicJournal(corrupt),/důkaz|nesouhlasí|kol|Spirit/);bad(()=>assertHallucinogenicAppendOnly(j,corrupt),/nelze/);}
// Lucid dream and Sâvirìs are required before return; no invented Trance SR for a dream.
const dream=createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:3,d20:18,savirisTracked:true,reembodimentTracked:true,gmConfirmed:true});
let d=[...base,e('dream',20,'calendarHerbLucidDream',dream)];eq(dream.dreamRounds,2);eq(pendingHallucinogenicReembodiments(d,C).length,1);
const dargs={journal:d,campaignId:C,sourceId:'dream',targetId:B,minute:20,spiritRoundsSpent:2,spiritML:50,d100:20,physicalStateClear:true,spiritActionsAdjudicated:true,gmConfirmed:true};
bad(()=>createHallucinogenicReembodiment(dargs),/Sâvirìs/);
const saviris=createHallucinogenicSaviris({journal:d,campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:12,gmConfirmed:true});d.push(e('saviris',20,'calendarHerbSaviris',saviris));
const dreamReturn=createHallucinogenicReembodiment(dargs);eq(dreamReturn.baseSL,'CS');eq(dreamReturn.adjustedSL,'CS');eq(dreamReturn.weariness,0);eq(dreamReturn.tranceML,null);
bad(()=>createHallucinogenicReembodiment({...dargs,tranceML:60,tranceD10:2,tranceDieOrigin:'manual'}),/Lucid Dream/);
d.push(e('dream-return',20,'calendarHerbReembodiment',dreamReturn));ok(validateHallucinogenicJournal(d));
// Legacy v93.410 proofs deliberately remain untracked and never lock GM clock.
const prior={...transc};delete prior.reembodimentTracked;delete prior.willIndex;const legacy=[...j2,e('legacy',17,'calendarHerbTranscendence',prior)];eq(pendingHallucinogenicReembodiments(legacy,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal:legacy,campaignId:C,beforeMinute:17,afterMinute:19}));
console.log('PASS',n,'Reembodiment: Spirit d100, true Trance SR d10, fatigue/shock state, dream Saviris, timer, append-only, campaigns & legacy');
