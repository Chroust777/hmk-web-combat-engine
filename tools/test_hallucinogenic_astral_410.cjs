const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const orig=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return orig(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration}=require('../src/integration/hmk-herbal-administration.js');
const {createHallucinogenicLucidDream,createHallucinogenicTranceStart,createHallucinogenicVeil,createHallucinogenicSaviris,createHallucinogenicTranscendence,pendingHallucinogenicSaviris,pendingHallucinogenicTranscendence,requireHallucinogenicGMTimeMayAdvance,validateHallucinogenicJournal,assertHallucinogenicAppendOnly}=require('../src/integration/hmk-herbal-hallucinogenic.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const C='camp-A',A='herbalist',B='dreamer';const e=(id,minute,key,proof,actor=B,campaignId=C)=>({id,calendarCampaignId:campaignId,campaignMinute:minute,characterId:actor,createdAt:'2026-10-21T09:00:00Z',title:'witness',body:'test',[key]:proof});
const made=e('made',2,'calendarHerbPotionComplete',{format:'hmk-herb-potion-complete-v1',campaignId:C,minute:2,actorId:A,herbType:'hallucinogenic',potency:3,sv:8,usable:true,expiryMinute:1000},A);
const a=createHerbPotionAdministration({journal:[made],campaignId:C,minute:10,actorId:A,completeId:'made',targetId:B,method:'smoked',gmConfirmed:true,memberIds:[A,B]});
const base=[made,e('dose',10,'calendarHerbPotionAdminister',a,A)];
const dream=createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:2,d20:18,savirisTracked:true,gmConfirmed:true});
let j=[...base,e('dream',20,'calendarHerbLucidDream',dream)];
eq(dream.savirisTracked,true);eq(dream.dreamRounds,2);eq(pendingHallucinogenicSaviris(j,C).length,1);eq(pendingHallucinogenicSaviris(j,'else').length,0);ok(validateHallucinogenicJournal(j));
bad(()=>requireHallucinogenicGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:20,afterMinute:21}),/Sâvirìs/);
for(const [die,binding] of [[1,true],[2,true],[3,false],[20,false]]){const proof=createHallucinogenicSaviris({journal:j,campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:die,gmConfirmed:true});eq(proof.bound,binding);eq(proof.bindingRequiresSeparateResolution,binding);}
const sv=createHallucinogenicSaviris({journal:j,campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:2,gmConfirmed:true});j.push(e('saviris',20,'calendarHerbSaviris',sv));ok(validateHallucinogenicJournal(j));eq(pendingHallucinogenicSaviris(j,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:20,afterMinute:200}));
bad(()=>createHallucinogenicSaviris({journal:j,campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:1,gmConfirmed:true}),/již/);
bad(()=>createHallucinogenicSaviris({journal:j.slice(0,-1),campaignId:C,dreamId:'dream',targetId:B,minute:21,d20:1,gmConfirmed:true}),/prvním/);
bad(()=>createHallucinogenicSaviris({journal:j.slice(0,-1),campaignId:'other',dreamId:'dream',targetId:B,minute:20,d20:1,gmConfirmed:true}),/chybí/);
bad(()=>createHallucinogenicSaviris({journal:j.slice(0,-1),campaignId:C,dreamId:'dream',targetId:A,minute:20,d20:1,gmConfirmed:true}),/chybí/);
bad(()=>createHallucinogenicSaviris({journal:j.slice(0,-1),campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:21,gmConfirmed:true}),/d20/);
bad(()=>createHallucinogenicSaviris({journal:j.slice(0,-1),campaignId:C,dreamId:'dream',targetId:B,minute:20,d20:1,gmConfirmed:false}),/GM/);
const t=createHallucinogenicTranceStart({journal:base,campaignId:C,applicationId:'dose',minute:10,targetId:B,tranceSkillML:60,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true});
const b=[...base,e('start',10,'calendarHerbHallucinogenicTranceStart',t)];
const veil=createHallucinogenicVeil({journal:b,campaignId:C,startId:'start',minute:17,targetId:B,concentrationUninterrupted:true,gmConfirmed:true,transcendenceTracked:true});
let x=[...b,e('veil',17,'calendarHerbHallucinogenicVeil',veil)];ok(validateHallucinogenicJournal(x));eq(pendingHallucinogenicTranscendence(x,C).length,1);eq(pendingHallucinogenicTranscendence(x,C)[0].bonus,32);
bad(()=>requireHallucinogenicGMTimeMayAdvance({journal:x,campaignId:C,beforeMinute:17,afterMinute:18}),/Transcendence/);
const params={journal:x,campaignId:C,veilId:'veil',minute:17,targetId:B,tranceML:60,fatiguePenalty:5,gmConfirmed:true};
const success=createHallucinogenicTranscendence({...params,d100:68});eq(success.rawEML,87);eq(success.sl,'S');eq(success.astralJourneyEligible,true);eq(success.bonusSpiritRounds,0);
const failure=createHallucinogenicTranscendence({...params,d100:99});eq(failure.sl,'F');eq(failure.repeatTranceGMDecision,true);eq(failure.astralJourneyEligible,false);
const critical=createHallucinogenicTranscendence({...params,d100:5,bonusD3:2,bonusDieOrigin:'manual'});eq(critical.sl,'CS');eq(critical.bonusSpiritRounds,2);eq(critical.astralJourneyEligible,true);
const criticalFailure=createHallucinogenicTranscendence({...params,fatiguePenalty:120,d100:100});eq(criticalFailure.sl,'CF');eq(criticalFailure.requiresWillTest,true);eq(criticalFailure.astralJourneyEligible,false);
for(const die of [1,2,3]){const c=createHallucinogenicTranscendence({...params,d100:5,bonusD3:die,bonusDieOrigin:'manual'});eq(c.bonusSpiritRounds,die)}
for(const m of [0,1,10,16,18])if(m!==17)bad(()=>createHallucinogenicTranscendence({...params,minute:m,d100:68}),/přesné/);
bad(()=>createHallucinogenicTranscendence({...params,veilId:'invalid',d100:68}),/chybí/);
bad(()=>createHallucinogenicTranscendence({...params,campaignId:'different',d100:68}),/chybí/);
bad(()=>createHallucinogenicTranscendence({...params,targetId:A,d100:68}),/chybí/);
bad(()=>createHallucinogenicTranscendence({...params,tranceML:61,d100:68}),/nesouhlasí/);
bad(()=>createHallucinogenicTranscendence({...params,fatiguePenalty:-1,d100:68}),/Fatigue/);
bad(()=>createHallucinogenicTranscendence({...params,d100:0}),/d100/);
bad(()=>createHallucinogenicTranscendence({...params,d100:68,bonusD3:2,bonusDieOrigin:'manual'}),/jen/);
bad(()=>createHallucinogenicTranscendence({...params,d100:5}),/d3/);
bad(()=>createHallucinogenicTranscendence({...params,d100:5,bonusD3:4,bonusDieOrigin:'manual'}),/d3/);
x.push(e('transcendence',17,'calendarHerbTranscendence',critical));ok(validateHallucinogenicJournal(x));eq(pendingHallucinogenicTranscendence(x,C).length,0);ok(requireHallucinogenicGMTimeMayAdvance({journal:x,campaignId:C,beforeMinute:17,afterMinute:19}));
bad(()=>createHallucinogenicTranscendence({...params,journal:x,d100:68}),/již/);
for(const [at,k,property,value] of [[j,3,'calendarHerbSaviris','d20',19],[x,4,'calendarHerbTranscendence','rawEML',300],[x,3,'calendarHerbHallucinogenicVeil','transcendenceTracked',false],[j,2,'calendarHerbLucidDream','savirisTracked',false]]){
 const corrupt=structuredClone(at);corrupt[k][property][value===false?'savirisTracked'===value?'savirisTracked':property==='calendarHerbHallucinogenicVeil'?'transcendenceTracked':'savirisTracked':property==='calendarHerbSaviris'?'d20':'rawEML']=value;
 if(k===2)corrupt[k][property][property==='calendarHerbHallucinogenicVeil'?'transcendenceTracked':'savirisTracked']=false;
 bad(()=>validateHallucinogenicJournal(corrupt),/nesouhlasí|chybí|čas|GM|důkaz/);
 bad(()=>assertHallucinogenicAppendOnly(at,corrupt),/nelze/);
}
for(const at of [j,x]){const copy=structuredClone(at).slice(0,-1);bad(()=>assertHallucinogenicAppendOnly(at,copy),/nelze/);}
// Existing v93.409 journal must not unexpectedly block later GM time.
const legacyDream=createHallucinogenicLucidDream({journal:base,campaignId:C,applicationId:'dose',minute:20,targetId:B,aura:15,willIndex:2,d20:18,gmConfirmed:true});
const legacy=[...base,e('legacy-dream',20,'calendarHerbLucidDream',legacyDream)];ok(validateHallucinogenicJournal(legacy));eq(pendingHallucinogenicSaviris(legacy,C).length,0);
const legacyVeil=createHallucinogenicVeil({journal:b,campaignId:C,startId:'start',minute:17,targetId:B,concentrationUninterrupted:true,gmConfirmed:true});
const old=[...b,e('legacy-veil',17,'calendarHerbHallucinogenicVeil',legacyVeil)];ok(validateHallucinogenicJournal(old));eq(pendingHallucinogenicTranscendence(old,C).length,0);
console.log('PASS',n,'astral: Saviris, Transcendence, CF Will pending, real CS d3, GM clock guard, append-only & v93.409 compatibility');
