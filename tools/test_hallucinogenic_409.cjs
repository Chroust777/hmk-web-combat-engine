const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const orig=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return orig(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {hallucinogenicLucidTable,pendingHallucinogenicDreams,pendingHallucinogenicTrances,createHallucinogenicLucidDream,createHallucinogenicTranceStart,createHallucinogenicVeil,createHallucinogenicTranceAbort,requireHallucinogenicGMTimeMayAdvance,validateHallucinogenicJournal,assertHallucinogenicAppendOnly}=require('../src/integration/hmk-herbal-hallucinogenic.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const C='camp-A',A='herbalist',B='dreamer';const entry=(id,minute,key,proof,actor=B,campaignId=C)=>({id,calendarCampaignId:campaignId,campaignMinute:minute,characterId:actor,createdAt:'2026-10-21T09:00:00Z',title:'Rule evidence',body:'GM witnessed', [key]:proof});
const made=entry('made',2,'calendarHerbPotionComplete',{format:'hmk-herb-potion-complete-v1',campaignId:C,minute:2,actorId:A,herbType:'hallucinogenic',potency:3,sv:8,usable:true,expiryMinute:1000},A);
const application=createHerbPotionAdministration({journal:[made],campaignId:C,minute:10,actorId:A,completeId:'made',targetId:B,method:'smoked',gmConfirmed:true,memberIds:[A,B]});
const applied=entry('dose',10,'calendarHerbPotionAdminister',application,A);let base=[made,applied];
ok(application.hallucinogenicTracked);ok(validateHerbAdministrationJournal(base));
// Verbatim table pp.291-292: all ten Aura columns, representative d20 rows.
const aura=[9,10,13,15,16,17,18,19,20,21];
const expected20=[1,2,3,4,5,6,7,8,9,10];
const expected19=[0,1,2,3,4,5,6,7,8,9];
const expected18=[0,0,1,2,3,4,5,6,7,8];
const expected17=[0,0,0,1,2,3,4,5,6,7];
const expected15=[0,0,0,0,0,1,2,3,4,5];
for(const [roll,ans] of [[20,expected20],[19,expected19],[18,expected18],[17,expected17],[15,expected15]]){
 for(let i=0;i<aura.length;i++)eq(hallucinogenicLucidTable({aura:aura[i],d20:roll,willIndex:20}).tableRounds,ans[i]);
}
for(const [a,roll,rounds] of [[15,18,2],[21,2,1],[20,10,1],[9,20,1],[10,18,0],[20,1,0],[21,20,10]]){
 eq(hallucinogenicLucidTable({aura:a,d20:roll,willIndex:20}).dreamRounds,rounds);
}
eq(hallucinogenicLucidTable({aura:21,d20:20,willIndex:3}).dreamRounds,3);
eq(hallucinogenicLucidTable({aura:15,d20:18,willIndex:0}).lucid,false);
for(const v of [-1,0,101,1.5,NaN])bad(()=>hallucinogenicLucidTable({aura:v,d20:20,willIndex:3}),/Aura/);
for(const v of [0,21,-1,3.2])bad(()=>hallucinogenicLucidTable({aura:15,d20:v,willIndex:3}),/Aura/);
eq(pendingHallucinogenicDreams(base,C)[0].dueMinute,20);eq(pendingHallucinogenicDreams(base,'else').length,0);
eq(pendingHallucinogenicTrances(base,C).length,0);
ok(requireHallucinogenicGMTimeMayAdvance({journal:base,campaignId:C,beforeMinute:10,afterMinute:20}));
bad(()=>requireHallucinogenicGMTimeMayAdvance({journal:base,campaignId:C,beforeMinute:10,afterMinute:21}),/Lucid Dream/);
const d=createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:1,d20:18,gmConfirmed:true});
eq(d.tableRounds,2);eq(d.dreamRounds,1);ok(d.savirisD20Required);ok(d.reembodimentRollRequired);
let journal=[...base,entry('dream',20,'calendarHerbLucidDream',d)];ok(validateHallucinogenicJournal(journal));
eq(pendingHallucinogenicDreams(journal,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal,campaignId:C,beforeMinute:10,afterMinute:100}));
bad(()=>createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:19,targetId:B,aura:15,willIndex:1,d20:18,gmConfirmed:true}),/přesně/);
bad(()=>createHallucinogenicLucidDream({journal,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:1,d20:18,gmConfirmed:true}),/již|už/);
bad(()=>createHallucinogenicLucidDream({journal:base,campaignId:'other',applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:1,d20:18,gmConfirmed:true}),/doložené/);
bad(()=>createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:A,aura:15,willIndex:1,d20:18,gmConfirmed:true}),/přesně/);
bad(()=>createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:1,d20:18,gmConfirmed:false}),/GM/);
const corrupted=structuredClone(journal);corrupted[2].calendarHerbLucidDream.dreamRounds=50;
bad(()=>validateHallucinogenicJournal(corrupted),/nesouhlasí|neodpovídá/);
const noDream=structuredClone(journal);noDream.splice(2,1);bad(()=>assertHallucinogenicAppendOnly(journal,noDream),/nelze/);
bad(()=>assertHallucinogenicAppendOnly(journal,corrupted),/nelze/);
const altered=structuredClone(journal);altered[2].campaignMinute=21;bad(()=>validateHallucinogenicJournal(altered),/čas/);
// Trance route is a separate, GM-attested process, not an astral success.
const t=createHallucinogenicTranceStart({journal:base,campaignId:C,applicationId:'dose',minute:10,targetId:B,
 tranceSkillML:65,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true});
eq(t.dueMinute,17);eq(t.transcendenceBonus,32);
let trance=[...base,entry('start',10,'calendarHerbHallucinogenicTranceStart',t)];
ok(validateHallucinogenicJournal(trance));eq(pendingHallucinogenicTrances(trance,C)[0].dueMinute,17);
ok(requireHallucinogenicGMTimeMayAdvance({journal:trance,campaignId:C,beforeMinute:10,afterMinute:17}));
bad(()=>requireHallucinogenicGMTimeMayAdvance({journal:trance,campaignId:C,beforeMinute:10,afterMinute:18}),/Trance/);
bad(()=>createHallucinogenicVeil({journal:trance,campaignId:C,startId:'start',minute:16,targetId:B,gmConfirmed:true,concentrationUninterrupted:true}),/termín/);
const veil=createHallucinogenicVeil({journal:trance,campaignId:C,startId:'start',minute:17,targetId:B,gmConfirmed:true,concentrationUninterrupted:true});
eq(veil.transcendenceRollResolved,false);eq(veil.astralJourneyResolved,false);
trance.push(entry('veil',17,'calendarHerbHallucinogenicVeil',veil));ok(validateHallucinogenicJournal(trance));eq(pendingHallucinogenicTrances(trance,C).length,0);
bad(()=>createHallucinogenicVeil({journal:trance,campaignId:C,startId:'start',minute:17,targetId:B,gmConfirmed:true,concentrationUninterrupted:true}),/již|už/);
const interrupt=createHallucinogenicTranceAbort({journal:trance.slice(0,3),campaignId:C,startId:'start',minute:12,targetId:B,reason:'Vážné vyrušení úderem',gmConfirmed:true});
let abort=[...trance.slice(0,3),entry('interrupt',12,'calendarHerbHallucinogenicTranceAbort',interrupt)];
ok(validateHallucinogenicJournal(abort));eq(pendingHallucinogenicTrances(abort,C).length,0);
bad(()=>createHallucinogenicVeil({journal:abort,campaignId:C,startId:'start',minute:17,targetId:B,gmConfirmed:true,concentrationUninterrupted:true}),/již|přerušena/);
bad(()=>createHallucinogenicTranceAbort({journal:trance,campaignId:C,startId:'start',minute:17,targetId:B,reason:'Late',gmConfirmed:true}),/již|už/);
bad(()=>createHallucinogenicTranceAbort({journal:trance.slice(0,3),campaignId:C,startId:'start',minute:18,targetId:B,reason:'Late',gmConfirmed:true}),/před/);
const changed=structuredClone(abort);changed[3].calendarHerbHallucinogenicTranceAbort.reason='Falešně přepsaný důvod';bad(()=>assertHallucinogenicAppendOnly(abort,changed),/nelze/);
// Legacy doses predate tracked scheduling and must never retroactively lock the GM clock.
const old=structuredClone(base);delete old[1].calendarHerbPotionAdminister.hallucinogenicTracked;
eq(pendingHallucinogenicDreams(old,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal:old,campaignId:C,beforeMinute:10,afterMinute:150}));
// Nonpositive 15-SV is a GM decision, never an invented negative due minute.
const strong=entry('high-made',2,'calendarHerbPotionComplete',{...made.calendarHerbPotionComplete,sv:16},A);
const strongAdmin=createHerbPotionAdministration({journal:[strong],campaignId:C,minute:10,actorId:A,completeId:'high-made',targetId:B,method:'ingested',gmConfirmed:true,memberIds:[A,B]});
const high=[strong,entry('high-dose',10,'calendarHerbPotionAdminister',strongAdmin,A)];
bad(()=>createHallucinogenicTranceStart({journal:high,campaignId:C,applicationId:'high-dose',minute:10,targetId:B,
 tranceSkillML:50,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true}),/kladný/);
console.log('PASS',n,'Hallucinogenic: printed Aura d20 table, Will cap, ten-minute check, trance 15-SV, interrup­tion, audit/campaign and GM time');
