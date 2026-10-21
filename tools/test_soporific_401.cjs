'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {pendingSoporificTests,pendingSoporificEffects,applyConfirmedSoporificEnd,applyConfirmedSoporificEffect,activeHerbalSoporific,requireSoporificGMTimeMayAdvance,requireSoporificRoundMayAdvance,validateSoporificJournal,assertSoporificAppendOnly}=require('../src/integration/hmk-herbal-soporific.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const camp='A',actor='herbalist',target='patient',timeline='battle';
function setup(potency=1){
 const made={id:'made-'+potency,calendarCampaignId:camp,campaignMinute:1,characterId:actor,calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:camp,minute:1,actorId:actor,herbType:'soporific',potency,sv:8,usable:true,expiryMinute:1000}};
 const args={journal:[made],campaignId:camp,minute:10,actorId:actor,completeId:made.id,targetId:target,method:'ingested',gmConfirmed:true,memberIds:[actor,target],
 ...(potency===3?{combatAnchor:{confirmedByGM:true,round:10,timelineId:timeline,campaignMinute:10}}:{})};
 const admin=createHerbPotionAdministration(args);
 const applied={id:'given-'+potency,calendarCampaignId:camp,campaignMinute:10,characterId:actor,calendarHerbPotionAdminister:admin};
 return {journal:[made,applied],appId:applied.id,args};
}
for(const potency of [1,2,3]){
 const {journal,appId,args}=setup(potency);
 yes(validateHerbAdministrationJournal(journal));eq(pendingSoporificTests(journal,camp).length,1);eq(pendingSoporificTests(journal,'B').length,0);
 bad(()=>requireSoporificGMTimeMayAdvance({journal,campaignId:camp,beforeMinute:10,afterMinute:11}),/END SV/);
 eq(requireSoporificGMTimeMayAdvance({journal,campaignId:'B',beforeMinute:10,afterMinute:11}),true);
 const origin=initialCombatState();origin.fatigue.weariness=3;
 const input={journal,campaignId:camp,applicationId:appId,targetId:target,minute:10,round:potency===3?10:null,timelineId:potency===3?timeline:null,state:origin,endurance:12,d100:33,eventId:'end-'+potency,gmConfirmed:true};
 const out=applyConfirmedSoporificEnd(input);
 eq(out.proof.baseML,60);eq(out.proof.fatiguePenalty,3);eq(out.proof.rawEML,57);eq(out.proof.sl,'S');eq(out.proof.endSV,6);
 eq(out.state.fatigue.weariness,3);yes(validateCombatState(out.state));
 const row={id:input.eventId,calendarCampaignId:camp,campaignMinute:10,characterId:target,calendarHerbSoporificEnd:out.proof};
 const withTest=[...journal,row];yes(validateSoporificJournal(withTest));eq(pendingSoporificTests(withTest,camp).length,0);
 bad(()=>applyConfirmedSoporificEnd({...input,journal:withTest}),/už existuje/);
 bad(()=>applyConfirmedSoporificEnd({...input,minute:11}),/minutě podání/);
 bad(()=>applyConfirmedSoporificEnd({...input,targetId:'other'}),/stejné postavě/);
 bad(()=>applyConfirmedSoporificEnd({...input,campaignId:'B'}),/stejné postavě/);
 bad(()=>applyConfirmedSoporificEnd({...input,d100:0}),/d100/);
 bad(()=>applyConfirmedSoporificEnd({...input,gmConfirmed:false}),/potvrzení/);
 if(potency===3){bad(()=>requireSoporificRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:10,nextRound:11}),/END SV/);bad(()=>createHerbPotionAdministration({...args,combatAnchor:null}),/Great Paralytic/);bad(()=>applyConfirmedSoporificEnd({...input,round:11}),/bojové kolo/);}
 const owed=pendingSoporificEffects(withTest,camp);eq(owed.length,potency===3?2:1);
 const weary=owed.find(x=>x.phase==='weariness');eq(weary.dueMinute,16);eq(weary.wearinessAmount,16);eq(weary.addIncapacitation,potency>=2);
 if(potency<3)eq(requireSoporificGMTimeMayAdvance({journal:withTest,campaignId:camp,beforeMinute:10,afterMinute:16}),true);
 else bad(()=>requireSoporificGMTimeMayAdvance({journal:withTest,campaignId:camp,beforeMinute:10,afterMinute:16}),/Soporific/);
 bad(()=>requireSoporificGMTimeMayAdvance({journal:withTest,campaignId:camp,beforeMinute:10,afterMinute:17}),/Soporific/);
 const effectArgs={journal:withTest,campaignId:camp,testId:row.id,phase:'weariness',targetId:target,minute:16,state:out.state,eventId:'weariness-'+potency,gmConfirmed:true};
 const effect=applyConfirmedSoporificEffect(effectArgs);eq(effect.state.fatigue.weariness,19);
 eq(effect.proof.inducedState,potency===1?'NONE':'INC');eq(activeHerbalSoporific(effect.state),potency===1?null:'INC');yes(validateCombatState(effect.state));
 const effectRow={id:effectArgs.eventId,calendarCampaignId:camp,campaignMinute:16,characterId:target,calendarHerbSoporificEffect:effect.proof};
 const saved=[...withTest,effectRow];yes(validateSoporificJournal(saved));eq(pendingSoporificEffects(saved,camp).length,potency===3?1:0);
 yes(assertSoporificAppendOnly(saved,[...saved]));bad(()=>assertSoporificAppendOnly(saved,withTest),/historický/);
 bad(()=>applyConfirmedSoporificEffect({...effectArgs,journal:saved}),/není splatný/);
 bad(()=>applyConfirmedSoporificEffect({...effectArgs,minute:17}),/přesné minutě/);
 bad(()=>applyConfirmedSoporificEffect({...effectArgs,gmConfirmed:false}),/potvrzení/);
 const corrupt=structuredClone(saved);corrupt.at(-1).calendarHerbSoporificEffect.wearinessAmount=99;bad(()=>validateSoporificJournal(corrupt),/historický/);
 if(potency===3){
  const unc=owed.find(x=>x.phase==='unconsciousness');eq(unc.dueRound,16);eq(unc.timelineId,timeline);
  bad(()=>requireSoporificRoundMayAdvance({journal:withTest,campaignId:camp,timelineId:timeline,currentRound:10,nextRound:17}),/UNC/);
  eq(requireSoporificRoundMayAdvance({journal:withTest,campaignId:camp,timelineId:timeline,currentRound:10,nextRound:16}),true);
  const prior=applyConfirmedSoporificEffect({...effectArgs,journal:withTest,phase:'unconsciousness',minute:10,round:16,timelineId:timeline,eventId:'unc-3'});
  eq(activeHerbalSoporific(prior.state),'UNC');eq(prior.state.posture.prone,true);eq(prior.state.shock,'NONE');yes(validateCombatState(prior.state));
  const uncRow={id:'unc-3',calendarCampaignId:camp,campaignMinute:10,characterId:target,calendarHerbSoporificEffect:prior.proof};
  yes(validateSoporificJournal([...withTest,uncRow]));
  const following=applyConfirmedSoporificEffect({...effectArgs,journal:[...withTest,uncRow],state:prior.state});
  eq(following.state.herbalSoporific.status,'UNC');eq(following.state.fatigue.weariness,19);yes(validateCombatState(following.state));
  bad(()=>applyConfirmedSoporificEffect({...effectArgs,journal:withTest,phase:'unconsciousness',round:17,timelineId:timeline,minute:10}),/bojové kolo/);
  bad(()=>applyConfirmedSoporificEffect({...effectArgs,journal:withTest,phase:'unconsciousness',round:16,timelineId:'other',minute:10}),/bojové kolo/);
 }
}
const {journal,appId}=setup(1);const none=applyConfirmedSoporificEnd({journal,campaignId:camp,applicationId:appId,targetId:target,minute:10,endurance:1,d100:100,eventId:'no-value',gmConfirmed:true});
yes(none.proof.endSV<=0);eq(none.proof.nonpositiveSVRequiresGM,true);
const noRow={id:'no-value',calendarCampaignId:camp,campaignMinute:10,characterId:target,calendarHerbSoporificEnd:none.proof};
eq(pendingSoporificEffects([...journal,noRow],camp).length,0);eq(requireSoporificGMTimeMayAdvance({journal:[...journal,noRow],campaignId:camp,beforeMinute:10,afterMinute:999}),true);
// Historic doses without a scheduled witness remain unaltered and never block the new timetable.
const legacy=setup(2).journal.map(r=>structuredClone(r));delete legacy[1].calendarHerbPotionAdminister.soporificTracked;
eq(pendingSoporificTests(legacy,camp).length,0);
// Source proof cannot be mutated after initial commit.
const badRoll=structuredClone([...journal,noRow]);badRoll.at(-1).calendarHerbSoporificEnd.d100=1;bad(()=>validateSoporificJournal(badRoll),/historický/);
console.log('PASS',n,'Soporific END SV, timed weariness/INC/UNC, original trauma Shock intact, proof replay, calendar/round guards');
