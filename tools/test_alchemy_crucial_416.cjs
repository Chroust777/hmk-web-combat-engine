'use strict';
/** HMK Kethira v1.2 pp.267–268 + canonical Shock p.169. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),P=require('../src/integration/persistent-combat-state.js'),T=require('../src/integration/hmk-skill-test-engine.js');
let checks=0;function eq(a,b){assert.deepEqual(a,b);checks++};function ok(a){assert.ok(a);checks++};function fail(f,pattern){assert.throws(f,pattern);checks++}
const row=(id,minute,key,p,campaignId='C',actorId='A')=>({id,calendarCampaignId:campaignId,characterId:actorId,campaignMinute:minute,[key]:p});
const start=A.createAlchemyStart({journal:[],campaignId:'C',minute:50,actorId:'A',alchemyML:80,elixirName:'Healing',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[3,3,3],timeOrigins:['manual','manual','manual']});
const result=T.resolveSkillTest({ml:80,roll:100,gmModifier:15,secondaryMLs:[70,65],svExtra:0});
result.secondarySVBonus=0;
const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:9,tn:5,success:false,sourcePage:268},gmModifiers:[15],helpers:[],a:result};
const journal=[row('start',50,'calendarAlchemyStart',start),row('skill',start.dueMinute,'skillTestProof',skill)];
const base={journal,campaignId:'C',minute:start.dueMinute,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,cfWillML:70,cfWillD10:10,cfWillOrigin:'manual'};
const make=(diss,shockDie,shockML=65,fatigue=5)=>A.createAlchemyFinish({...base,dissolutionD100:diss,dissolutionOrigin:'manual',crucialShockML:shockML,crucialShockFatigue:fatigue,crucialShockD100:shockDie,crucialShockOrigin:'cryptographic-software-die'});
// p.169 from SHK8: CF=10 KIA, F=9 UNC, S=8 INC, CS=7 STN.
const cases=[{die:95,sl:'CF',index:10,state:'KIA'},{die:98,sl:'F',index:9,state:'UNC'}, {die:42,sl:'S',index:8,state:'INC'}, {die:40,sl:'CS',index:7,state:'STN'}];
for(const c of cases){
 const proof=make(5,c.die),cf=proof.criticalFailure,sh=cf.shockRoll;
 eq(proof.result,'ruined-by-dissolution');eq(proof.baseAS,null);ok(cf.crucialDissolution);
 eq(cf.auralShockAdded,1);eq(cf.weaknessAdded,5);eq(sh.ml,65);eq(sh.fatigue,5);eq(sh.rawEML,60);
 eq(sh.d100,c.die);eq(sh.sl,c.sl);eq(sh.baseSHK,8);eq(sh.index,c.index);eq(sh.state,c.state);eq(sh.origin,'cryptographic-software-die');
 const prior=P.initialCombatState();const out=A.applyAlchemyDissolution({state:prior,arcane:{},proof,eventId:'evt-'+c.state});
 eq(out.state.shock,c.state);eq(out.arcane.auralShockLevels,1);eq(out.state.fatigue.otherWeakness,5);
 eq(out.state.lastRound,0);eq(out.state.events[0].details.calendarMinute,start.dueMinute);
 eq(out.state.events[0].details.crucialShock,sh);eq(out.state.events[0].details.nonCombat,true);
 if(c.state==='KIA'){eq(out.state.shockFollowup,null);eq(out.state.posture.prone,true);}
 else{eq(out.state.shockFollowup.kind,c.state);eq(out.state.shockFollowup.timelineId,null);
  eq(out.state.shockFollowup.dueRound,c.state==='UNC'?121:2);
  ok(P.validateCombatState(out.state));
  const tooSoon=P.shockFollowupReadiness({state:out.state,round:1,characterId:'A',actorId:'A',turnEnded:true});
  eq(tooSoon.due,false);
  if(c.state==='UNC'){
   eq(P.shockFollowupReadiness({state:out.state,round:1,elapsedMinutesSinceOriginal:9}).due,false);
   eq(P.shockFollowupReadiness({state:out.state,round:1,elapsedMinutesSinceOriginal:10}).due,true);
  }else{
   eq(P.shockFollowupReadiness({state:out.state,round:2,characterId:'A',actorId:'wrong',turnEnded:true}).due,false);
   eq(P.shockFollowupReadiness({state:out.state,round:2,characterId:'A',actorId:'A',turnEnded:true}).due,true);
  }}
 eq(prior.shock,'NONE');eq(prior.fatigue.otherWeakness,0);
 const j=[...journal,row('finish-'+c.state,start.dueMinute,'calendarAlchemyFinish',proof)];
 ok(A.validateAlchemyJournal(j));ok(A.assertAlchemyAppendOnly(j,structuredClone(j)));
 const edited=structuredClone(j);edited.at(-1).calendarAlchemyFinish.criticalFailure.shockRoll.index=c.index===9?8:9;
 fail(()=>A.validateAlchemyJournal(edited),/změněn/);
 fail(()=>A.applyAlchemyDissolution({state:out.state,arcane:out.arcane,proof,eventId:'evt-'+c.state}),/duplicitní|zemřela/);
}
// Serious (75) and Grievous (100) crucial events: weakness 15/25 changes Shock EML.
for(const [d,levels] of [[75,3],[100,5]]){
 const s=P.initialCombatState();s.fatigue.weariness=10;
 const p=make(d,50,60,10+levels*5);eq(p.criticalFailure.auralShockAdded,levels);
 const out=A.applyAlchemyDissolution({state:s,proof:p,eventId:'serious-'+d});
 eq(out.state.fatigue.otherWeakness,levels*5);eq(out.state.shock,'KIA');
 eq(out.state.events[0].details.crucialShock.fatigue,10+levels*5);
}
fail(()=>make(5,null),/Shock d100/);
fail(()=>make(5,0),/Shock d100/);
fail(()=>make(5,101),/Shock d100/);
fail(()=>A.createAlchemyFinish({...base,dissolutionD100:65,dissolutionOrigin:'manual',crucialShockML:65,crucialShockFatigue:5,crucialShockD100:42,crucialShockOrigin:'untrusted'}),/Shock d100/);
fail(()=>make(62,42),/Běžná Dissolution/);
fail(()=>A.createAlchemyFinish({...base,dissolutionD100:5,dissolutionOrigin:'manual',crucialShockML:65,crucialShockFatigue:5,crucialShockD100:40,crucialShockOrigin:'manual',augmentationD10:[1]}),/počet a původ/);
const p=make(35,42,75,6),s=P.initialCombatState();
fail(()=>A.applyAlchemyDissolution({state:s,proof:p,eventId:'event1'}),/Fatigue/);
s.shock='STN';s.shockOriginRound=1;s.shockFollowup={kind:'STN',originRound:1,dueRound:2,timelineId:null,phase:'end-next-turn'};
fail(()=>A.applyAlchemyDissolution({state:s,proof:make(35,42,75,5),eventId:'event2'}),/nekolizního/);
const Rec=require('../src/integration/hmk-spell-aural-recovery.js');
const dead=A.applyAlchemyDissolution({state:P.initialCombatState(),proof:make(5,95),eventId:'death-alchemy'});
const witness={characters:[{id:'A',name:'Dead Alchemist',hmk:{attributes:{wil:14},combatState:dead.state,arcane:dead.arcane}}]};
eq(Rec.availableSpellAuralRecoveries(witness).length,0);
const other=journal.map(r=>({...r,calendarCampaignId:'X'}));
fail(()=>A.createAlchemyFinish({...base,journal:other,dissolutionD100:5,dissolutionOrigin:'manual',crucialShockML:65,crucialShockFatigue:5,crucialShockD100:42,crucialShockOrigin:'manual'}),/pouze přesně/);
console.log('PASS',checks,'Alchemy Crucial Dissolution d100 5/0, Shock p169, Aural integration, mandatory followups, replay, tampering, campaigns');
