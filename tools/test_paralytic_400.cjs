'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {applyConfirmedParalyticEndurance,pendingParalyticChecks,validateParalyticEnduranceJournal,assertParalyticEnduranceAppendOnly,activeHerbalParalysis,requireParalyticRoundMayAdvance,requireParalyticGMTimeMayAdvance}=require('../src/integration/hmk-herbal-paralytic.js');
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++},yes=x=>{assert.ok(x);count++},bad=(fn,re)=>{assert.throws(fn,re);count++};
const camp='A',actor='herbalist',target='patient',timeline='fight-paralytic-400';
function source(p=1,id='made-'+p){return {id,characterId:actor,calendarCampaignId:camp,campaignMinute:1,
 calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:camp,minute:1,actorId:actor,herbType:'paralytic',potency:p,sv:8,usable:true,expiryMinute:300}};}
function setup(p=1){const s=source(p),args={journal:[s],campaignId:camp,minute:10,actorId:actor,completeId:s.id,targetId:target,method:'ingested',gmConfirmed:true,memberIds:[actor,target],
 ...(p===3?{combatAnchor:{confirmedByGM:true,round:10,timelineId:timeline,campaignMinute:10}}:{})};
 const proof=createHerbPotionAdministration(args);return {source:s,app:{id:'applied-'+p,calendarCampaignId:camp,campaignMinute:10,characterId:actor,calendarHerbPotionAdminister:proof},args};}
for(const potency of [1,2,3]){
 const {source:s,app,args}=setup(potency),journal=[s,app],due=potency===1?20:potency===2?11:10,round=potency===3?11:null,tl=potency===3?timeline:null;
 eq(app.calendarHerbPotionAdminister.bonus,[0,8,16,32][potency]);yes(validateHerbAdministrationJournal(journal));
 const pending=pendingParalyticChecks(journal,camp);eq(pending.length,1);eq(pending[0].dueMinute,due);eq(pending[0].dueRound,round);
 eq(pendingParalyticChecks(journal,'B').length,0);
 eq(requireParalyticGMTimeMayAdvance({journal,campaignId:camp,beforeMinute:10,afterMinute:due}),true);
 bad(()=>requireParalyticGMTimeMayAdvance({journal,campaignId:camp,beforeMinute:10,afterMinute:due+1}),/Paralytic END/);
 eq(requireParalyticGMTimeMayAdvance({journal,campaignId:'B',beforeMinute:10,afterMinute:due+1}),true);
 const input={journal,campaignId:camp,applicationId:app.id,minute:due,round,timelineId:tl,targetId:target,state:initialCombatState(),endurance:12,d100:90,eventId:'end-test-'+potency,gmConfirmed:true};
 const r=applyConfirmedParalyticEndurance(input);eq(r.proof.paralyzed,true);eq(r.proof.rawEML,60-r.proof.penalty);eq(r.proof.untilMinute,due+60);
 eq(r.state.herbalParalysis.applicationId,app.id);eq(r.state.posture.prone,true);yes(validateCombatState(r.state));
 eq(activeHerbalParalysis(r.state,due),true);eq(activeHerbalParalysis(r.state,due+59),true);eq(activeHerbalParalysis(r.state,due+60),false);
 // After a later, separately attested Stand action the original paralysis proof remains valid.
 const stood=structuredClone(r.state);stood.posture.prone=false;yes(validateCombatState(stood));
 const result={id:input.eventId,calendarCampaignId:camp,campaignMinute:due,characterId:target,calendarHerbParalyticEndurance:r.proof},saved=[...journal,result];
 yes(validateParalyticEnduranceJournal(saved));eq(pendingParalyticChecks(saved,camp).length,0);
 yes(assertParalyticEnduranceAppendOnly(saved,[...saved]));
 bad(()=>assertParalyticEnduranceAppendOnly(saved,journal),/historický/);
 bad(()=>applyConfirmedParalyticEndurance({...input,journal:saved}),/má END/);
 bad(()=>applyConfirmedParalyticEndurance({...input,minute:due-1}),/splatný|Great|podání/);
 bad(()=>applyConfirmedParalyticEndurance({...input,minute:due+(potency===3?2:1)}),/splatný|Great|podání/);
 bad(()=>applyConfirmedParalyticEndurance({...input,targetId:'other'}),/příjemce/);
 bad(()=>applyConfirmedParalyticEndurance({...input,campaignId:'B'}),/podání/);
 bad(()=>applyConfirmedParalyticEndurance({...input,d100:0}),/d100/);
 bad(()=>applyConfirmedParalyticEndurance({...input,gmConfirmed:false}),/potvrzení/);
 const amended=structuredClone(saved);amended.at(-1).calendarHerbParalyticEndurance.d100=1;bad(()=>validateParalyticEnduranceJournal(amended),/historický/);
 const duplicated=structuredClone(result);duplicated.id+='-dup';bad(()=>validateParalyticEnduranceJournal([...saved,duplicated]),/END výsledek/);
 const pass=applyConfirmedParalyticEndurance({...input,d100:15});eq(pass.proof.paralyzed,false);eq(pass.proof.sl,'CS');yes(!pass.state.herbalParalysis);yes(validateCombatState(pass.state));
 if(potency===3){
  eq(requireParalyticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:10,nextRound:11}),true);
  bad(()=>requireParalyticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:10,nextRound:12}),/Paralytic END/);
  eq(requireParalyticRoundMayAdvance({journal:saved,campaignId:camp,timelineId:timeline,currentRound:11,nextRound:12}),true);
  bad(()=>createHerbPotionAdministration({...args,combatAnchor:null}),/Great Paralytic/);
  bad(()=>applyConfirmedParalyticEndurance({...input,round:12}),/následujícího/);
  bad(()=>applyConfirmedParalyticEndurance({...input,timelineId:'wrong'}),/následujícího/);
 }else{
  bad(()=>applyConfirmedParalyticEndurance({...input,round:11}),/přesně/);
 }
}
const {source:s,app}=setup(2),journal=[s,app],fatigue=initialCombatState();fatigue.fatigue.weariness=10;
const base={journal,campaignId:camp,applicationId:app.id,minute:11,round:null,timelineId:null,targetId:target,state:fatigue,endurance:12,d100:38,eventId:'end-fatigue',gmConfirmed:true};
const modified=applyConfirmedParalyticEndurance(base);eq(modified.proof.baseML,60);eq(modified.proof.fatiguePenalty,10);eq(modified.proof.rawEML,34);eq(modified.proof.sl,'F');
const shocked=initialCombatState();shocked.shock='KIA';bad(()=>applyConfirmedParalyticEndurance({...base,state:shocked}),/zemřela/);
const oldSource=source(3,'legacy-make');
const oldProof=createHerbPotionAdministration({journal:[oldSource],campaignId:camp,minute:10,
 actorId:actor,completeId:oldSource.id,targetId:target,method:'ingested',gmConfirmed:true,
 memberIds:[actor,target],legacyValidation:true});
const oldJournal=[oldSource,{id:'old-paralytic',calendarCampaignId:camp,campaignMinute:10,characterId:actor,
 calendarHerbPotionAdminister:oldProof}];
eq(oldProof.paralyticTracked,undefined);yes(validateHerbAdministrationJournal(oldJournal));
eq(pendingParalyticChecks(oldJournal,camp).length,0);
eq(requireParalyticGMTimeMayAdvance({journal:oldJournal,campaignId:camp,beforeMinute:10,afterMinute:200}),true);
bad(()=>applyConfirmedParalyticEndurance({...base,journal:oldJournal,applicationId:'old-paralytic',minute:10,
 round:11,timelineId:timeline}),/staré podání/);
console.log('PASS',count,'Paralytic p75/61/184: onset minute/round, END d100, 60-minute paralysis, proof integrity, time/campaign isolation');
