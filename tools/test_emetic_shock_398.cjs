'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {applyConfirmedEmeticShock,pendingEmeticShocks,validateEmeticShockJournal,assertEmeticShockAppendOnly,requireEmeticRoundMayAdvance,requireEmeticGMTimeMayAdvance}=require('../src/integration/hmk-herbal-emetic-shock.js');
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++},ok=x=>{assert.ok(x);checks++},bad=(f,re)=>{assert.throws(f,re);checks++};
const camp='c-A',actor='healer',target='patient',timeline='fight-1',origin=17,due=20;
const complete=(id='made-1',p=3,sv=8)=>({id,characterId:actor,calendarCampaignId:camp,campaignMinute:10,
 calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:camp,minute:10,actorId:actor,
 herbType:'emetic',potency:p,sv,usable:true,expiryMinute:800}});
const originRow=complete(),base={journal:[originRow],campaignId:camp,minute:20,actorId:actor,completeId:'made-1',targetId:target,
 method:'ingested',gmConfirmed:true,memberIds:[actor,target],emeticOnsetD6:3,emeticOnsetOrigin:'manual',combatAnchor:{confirmedByGM:true,round:origin,campaignMinute:20,timelineId:timeline}};
const admin=createHerbPotionAdministration(base);eq(admin.bonus,32);eq(admin.emeticOnsetD6,3);eq(admin.emeticOnsetOrigin,'manual');
const application={id:'admin-1',calendarCampaignId:camp,campaignMinute:20,characterId:actor,calendarHerbPotionAdminister:admin};
const journal=[originRow,application];eq(validateHerbAdministrationJournal(journal),true);
const pending=pendingEmeticShocks(journal,camp,timeline);eq(pending.length,1);eq(pending[0].dueRound,due);
eq(pendingEmeticShocks(journal,'c-B',timeline).length,0);eq(pendingEmeticShocks(journal,camp,'other').length,0);
eq(requireEmeticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:19}),true);
eq(requireEmeticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:18,nextRound:20}),true);
bad(()=>requireEmeticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:18,nextRound:21}),/Shock Roll/);
bad(()=>requireEmeticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:19,nextRound:25}),/Shock Roll/);
bad(()=>requireEmeticRoundMayAdvance({journal,campaignId:camp,timelineId:timeline,currentRound:20}),/Shock Roll/);
bad(()=>requireEmeticGMTimeMayAdvance({journal,campaignId:camp,beforeMinute:20,afterMinute:21}),/Emetic Shock/);
eq(requireEmeticGMTimeMayAdvance({journal,campaignId:'c-B',beforeMinute:20,afterMinute:21}),true);
for(const d of [0,7,1.5,'3',null])bad(()=>createHerbPotionAdministration({...base,emeticOnsetD6:d}),/d6/);
for(const roll of ['manual','cryptographic-software-die'])eq(createHerbPotionAdministration({...base,emeticOnsetOrigin:roll}).emeticOnsetOrigin,roll);
bad(()=>createHerbPotionAdministration({...base,combatAnchor:null}),/bojové kolo/);
bad(()=>createHerbPotionAdministration({...base,combatAnchor:{...base.combatAnchor,confirmedByGM:false}}),/vazba/);
bad(()=>createHerbPotionAdministration({...base,emeticOnsetOrigin:'fake'}),/d6/);
const input={journal,campaignId:camp,applicationId:application.id,minute:20,round:due,timelineId:timeline,targetId:target,
 state:initialCombatState(),shockML:65,d100:40,eventId:'emetic-d100-1',gmConfirmed:true};
const verified=applyConfirmedEmeticShock(input);eq(verified.proof.sl,'CF');eq(verified.proof.shockIndex,9);eq(verified.proof.newShock,'UNC');
eq(verified.proof.rawEML,33);eq(verified.proof.eml,33);eq(verified.proof.penalty,32);eq(verified.proof.d100,40);
eq(verified.state.shock,'UNC');eq(verified.state.posture.prone,true);eq(verified.state.shockFollowup.dueRound,140);
eq(verified.state.shockFollowup.timelineId,timeline);eq(verified.state.lastRound,due);ok(validateCombatState(verified.state));
const result={id:input.eventId,calendarCampaignId:camp,campaignMinute:20,characterId:target,calendarHerbEmeticShock:verified.proof};
const saved=[...journal,result];eq(validateEmeticShockJournal(saved),true);eq(pendingEmeticShocks(saved,camp,timeline).length,0);
eq(requireEmeticRoundMayAdvance({journal:saved,campaignId:camp,timelineId:timeline,currentRound:20}),true);
eq(requireEmeticGMTimeMayAdvance({journal:saved,campaignId:camp,beforeMinute:20,afterMinute:21}),true);
eq(assertEmeticShockAppendOnly(saved,[...saved]),true);
bad(()=>assertEmeticShockAppendOnly(saved,journal),/historický/);
bad(()=>applyConfirmedEmeticShock({...input,journal:saved}),/již má uložený/);
bad(()=>applyConfirmedEmeticShock({...input,round:19}),/přesně/);
bad(()=>applyConfirmedEmeticShock({...input,round:21}),/přesně/);
bad(()=>applyConfirmedEmeticShock({...input,timelineId:'fight-2'}),/původ/);
bad(()=>applyConfirmedEmeticShock({...input,campaignId:'c-B'}),/podání/);
bad(()=>applyConfirmedEmeticShock({...input,targetId:'someone'}),/původ/);
bad(()=>applyConfirmedEmeticShock({...input,minute:22}),/GM minuta/);
bad(()=>applyConfirmedEmeticShock({...input,gmConfirmed:false}),/potvrzení/);
bad(()=>applyConfirmedEmeticShock({...input,d100:0}),/d100/);
bad(()=>applyConfirmedEmeticShock({...input,d100:101}),/d100/);
for(const [d100,index,shock] of [[15,6,'NONE'],[21,7,'STN'],[36,8,'INC'],[40,9,'UNC']]){
 const r=applyConfirmedEmeticShock({...input,d100});eq(r.proof.shockIndex,index);eq(r.state.shock,shock);ok(validateCombatState(r.state));
 if(shock==='STN'||shock==='INC')eq(r.state.shockFollowup.dueRound,21);
}
const fatigued=initialCombatState();fatigued.fatigue.otherWeakness=5;
const rf=applyConfirmedEmeticShock({...input,state:fatigued,d100:28});eq(rf.proof.fatiguePenalty,5);eq(rf.proof.rawEML,28);eq(rf.proof.sl,'S');
const shocked=initialCombatState();shocked.shock='STN';shocked.shockOriginRound=19;shocked.shockFollowup={kind:'STN',originRound:19,dueRound:20,timelineId:timeline,phase:'end-next-turn'};
bad(()=>applyConfirmedEmeticShock({...input,state:shocked}),/již má Shock/);
const edited=structuredClone(saved);edited[2].calendarHerbEmeticShock.d100=5;bad(()=>validateEmeticShockJournal(edited),/odvozen/);
const edited2=structuredClone(saved);edited2[2].calendarHerbEmeticShock.penalty=100;bad(()=>validateEmeticShockJournal(edited2),/odvozen/);
const edited3=structuredClone(saved);edited3[2].calendarHerbEmeticShock.targetId='other';bad(()=>validateEmeticShockJournal(edited3),/neplatný/);
bad(()=>validateEmeticShockJournal([...saved,{...result,id:'duplicate-shock'}]),/opakovaný/);
const oldAdmin=createHerbPotionAdministration({...base,legacyValidation:true,emeticOnsetD6:null,emeticOnsetOrigin:'',combatAnchor:null});
const legacy=[originRow,{...application,calendarHerbPotionAdminister:oldAdmin}];eq(validateHerbAdministrationJournal(legacy),true);eq(pendingEmeticShocks(legacy,camp,timeline).length,0);
console.log('PASS',checks,'Emetic onset d6, Shock Index 7, original Shock states/fatigue, GM time + encounter boundary, immutable provenance');
