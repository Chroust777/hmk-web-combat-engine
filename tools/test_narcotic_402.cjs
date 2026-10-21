'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration}=require('../src/integration/hmk-herbal-administration.js');
const {narcoticEvidence,narcoticMovement,narcoticShockEML}=require('../src/integration/hmk-herbal-narcotic.js');
const {initialCombatState,validateCombatState,applyConfirmedShockRecovery}=require('../src/integration/persistent-combat-state.js');
const {createGuidedMandatory,submitGuidedMandatoryDie,commitGuidedMandatory}=require('../src/integration/hmk-guided-mandatory.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const campaign='camp-A',actor='herbalist',patient='patient';
function dose(potency=3,sv=8,id='a1',when=10){
 const source={id:'manufactured-'+id,characterId:actor,calendarCampaignId:campaign,campaignMinute:1,calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:campaign,minute:1,actorId:actor,herbType:'narcotic',potency,sv,usable:true,expiryMinute:99999}};
 const p=createHerbPotionAdministration({journal:[source],campaignId:campaign,minute:when,actorId:actor,completeId:source.id,targetId:patient,method:'ingested',gmConfirmed:true,memberIds:[actor,patient]});
 const admin={id:'admin-'+id,characterId:actor,calendarCampaignId:campaign,campaignMinute:when,calendarHerbPotionAdminister:p};
 return [source,admin];
}
const journal=dose(),e=(minute=10,extras={})=>narcoticEvidence({journal,campaignId:campaign,minute,targetId:patient,...extras});
for(const [minute,stage,bonus] of [[9,0,0],[10,3,32],[249,3,32],[250,2,16],[489,2,16],[490,1,8],[729,1,8],[730,0,0],[20000,0,0]]){
 const r=e(minute);eq(r.stage,stage);eq(r.bonus,bonus);eq(r.movePenalty,bonus/2);eq(r.agilityPenalty,bonus/2);
 eq(r.sourceIds,bonus?['admin-a1']:[]);
}
eq(e(400,{targetId:'other'}).bonus,0);eq(e(400,{campaignId:'other'}).bonus,0);eq(e(10,{journal:[]}).bonus,0);
for(const [minute,penalty,move] of [[10,16,29],[250,8,37],[490,4,41],[730,0,45]]){
 const med=narcoticMovement({baseMove:45,evidence:e(minute)});eq(med.movePenalty,penalty);eq(med.effectiveMove,move);
}
for(const p of [1,2,3]){
 const j=dose(p,7,'pot-'+p),v=narcoticEvidence({journal:j,campaignId:campaign,minute:10,targetId:patient});
 eq(v.bonus,[0,7,14,28][p]);eq(v.agilityPenalty,v.bonus/2);
 eq(narcoticMovement({baseMove:25,evidence:v}).effectiveMove,Math.floor(Math.max(0,25-v.bonus/2)));
}
eq(narcoticMovement({baseMove:4,evidence:e()}).effectiveMove,0);
const raw=narcoticShockEML({shockML:50,fatigue:5,evidence:e()});eq(raw.rawEML,77);eq(raw.effectiveEML,77);eq(raw.sourceIds,['admin-a1']);
eq(narcoticShockEML({shockML:150,fatigue:0,evidence:e()}).effectiveEML,95);
eq(narcoticShockEML({shockML:0,fatigue:99,rerollPenalty:20,evidence:e()}).effectiveEML,5);
bad(()=>narcoticShockEML({shockML:50,fatigue:0,rerollPenalty:10,evidence:e()}),/Shock/);
bad(()=>narcoticMovement({baseMove:-1,evidence:e()}),/Move/);
const changed=structuredClone(journal);changed[1].calendarHerbPotionAdminister.bonus=777;
bad(()=>narcoticEvidence({journal:changed,campaignId:campaign,minute:10,targetId:patient}),/neodpovídá/);
const simultaneous=[...journal,...dose(2,5,'a2')];bad(()=>narcoticEvidence({journal:simultaneous,campaignId:campaign,minute:100,targetId:patient}),/více současně/);
eq(narcoticEvidence({journal:simultaneous,campaignId:campaign,minute:730,targetId:patient}).bonus,0);
const state=()=>{const s=initialCombatState();s.shock='STN';s.shockOriginRound=1;s.shockFollowup={kind:'STN',originRound:1,timelineId:'fight',dueRound:2,phase:'end-next-turn'};s.lastRound=1;return s};
const args={state:state(),round:2,eventId:'shock-test-1',sl:'S',timingConfirmed:true,characterId:patient,actorId:patient,turnEnded:true,timelineId:'fight',shockML:50,roll:68,herbalBonus:32,herbalProof:e()};
const resolved=applyConfirmedShockRecovery(args);
eq(resolved.state.shock,'NONE');eq(resolved.state.events.at(-1).details.verifiedRoll.rawEML,82);
eq(resolved.state.events.at(-1).details.verifiedRoll.narcotic.bonus,32);ok(validateCombatState(resolved.state));
bad(()=>applyConfirmedShockRecovery({...args,herbalBonus:0,herbalProof:null}),/d100|nesouhlasí/);
bad(()=>applyConfirmedShockRecovery({...args,herbalBonus:32,herbalProof:null}),/Narcotic|doklad/);
bad(()=>applyConfirmedShockRecovery({...args,roll:99}),/nesouhlasí/);
const person={id:patient,hmk:{attributes:{str:12},skills:[{name:'shock',ml:50}]}};
const hc={journal,campaignId:campaign,minute:10};
const start=()=>createGuidedMandatory({state:state(),character:person,round:2,eventId:'guided-shock-1',actorId:patient,turnEnded:true,timelineId:'fight',herbalContext:hc});
let session=start();eq(session.context.narcotic.bonus,32);eq(session.context.ml,50);
session=submitGuidedMandatoryDie(session,68);
const result=commitGuidedMandatory({session,state:state(),character:person,round:2,actorId:patient,turnEnded:true,timelineId:'fight',herbalContext:hc});
eq(result.state.shock,'NONE');eq(result.state.events.at(-1).details.verifiedRoll.narcotic.sourceIds,['admin-a1']);
eq(result.state.events.at(-1).details.guidedResolution.derivedSL,'S');
bad(()=>commitGuidedMandatory({session,state:state(),character:person,round:2,actorId:patient,turnEnded:true,timelineId:'fight',herbalContext:{...hc,minute:251}}),/Narcotic.*změnil/);
bad(()=>commitGuidedMandatory({session,state:state(),character:person,round:2,actorId:patient,turnEnded:true,timelineId:'fight'}),/Narcotic.*změnil/);
let unmedicated=createGuidedMandatory({state:state(),character:person,round:2,eventId:'guided-shock-2',actorId:patient,turnEnded:true,timelineId:'fight'});
unmedicated=submitGuidedMandatoryDie(unmedicated,68);eq(commitGuidedMandatory({session:unmedicated,state:state(),character:person,round:2,actorId:patient,turnEnded:true,timelineId:'fight'}).state.shock,'STN');
console.log('PASS',n,'Narcotic p75: staged time, half Move/Agility, strict identity, real Shock reroll, proof, no silent stacking');
