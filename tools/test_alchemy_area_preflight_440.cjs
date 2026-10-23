'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const P=require('../src/integration/hmk-alchemy-area-preflight.js');
const C=require('../src/integration/encounter-turn-sequence.js');
const CS=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++;},ok=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const row=(id,t,who,key,value)=>({id,characterId:who,calendarCampaignId:'C',campaignMinute:t,[key]:value});
function prepare(name){
 const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:'A',alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const sp={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const t=start.dueMinute,j=[row('start',0,'A','calendarAlchemyStart',start),row('skill',t,'A','skillTestProof',sp)];
 const number=Math.max(0,Math.min(5,r.sv-4));
 const finish=A.createAlchemyFinish({journal:j,campaignId:'C',minute:t,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:Array(number).fill(10),augmentationOrigins:Array(number).fill('manual')});
 j.push(row('finish',t,'A','calendarAlchemyFinish',finish));
 const inv=[{id:'vial',characterId:'A',sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,
 snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const b=V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute:t,actorId:'A',finishId:'finish',vialId:'vial',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:name!=='Fumebomb',gasConfirmed:name==='Fumebomb',material:'glass',corkConfirmed:true});
 j.push(row('bind',t,'A','calendarAlchemyVialBinding',b));
 const chars=['A','B','C'].map((id,k)=>({id,hmk:{attributes:{str:12+k},skills:[{name:'Shock',ml:75-k*10},{name:'Initiative',ml:80}],combatState:CS.initialCombatState()}}));
 const states=Object.fromEntries(chars.map(x=>[x.id,x.hmk.combatState]));
 let seq=C.createEncounterSequence({timelineId:'battle',roster:chars.map((c,k)=>({id:c.id,initiativeML:100-k*10,awarenessEML:60}))});
 seq.spatialUnits=[{id:'A',x:0,y:0},{id:'B',x:4,y:0},{id:'C',x:15,y:0}];
 seq=C.startEncounterTurn(seq,states);
 return {sequence:seq,characters:chars,inventory:inv,journal:j,campaignId:'C',minute:t,actorId:'A',finishId:'finish',sourceId:'test-blast',center:{x:0,y:0},gmConfirmed:true};
}
const gas=prepare('Fumebomb');ok(V.validateAlchemyVialJournal(gas.journal));eq(gas.journal.at(-1).calendarAlchemyVialBinding.gasConfirmed,true);
eq(V.projectAlchemyVialInventory(gas.inventory,gas.journal,'C',gas.minute)[0].snapshot.properties.weightLb,0.5);
const frozen=JSON.stringify(gas),g=P.previewAlchemyAreaBlast({...gas,rollsByTarget:{A:{shockD100:95,origin:'manual'},B:{shockD100:11,origin:'manual'}}});
eq(JSON.stringify(gas),frozen);eq(g.readyForCommit,false);eq(g.targetIds,['A','B']);eq(g.smoke.radiusFt,5);
eq(g.results.A.sl,'CF');eq(g.results.A.incoming,'UNC');ok(g.results.B.eml===65-5*g.as);
eq(g.stagedStates.A.shock,'UNC');ok(g.stagedStates.A.shockFollowup?.dueRound===g.round+120);
eq(gas.characters[0].hmk.combatState.shock,'NONE');
// Same native Combat State across all four HMK Fumebomb Shock outcomes.
for(const [d100,sl,status] of [[95,'CF','UNC'],[46,'F','INC'],[11,'S','STN'],[10,'CS','NONE']]){
 const x=CS.applyConfirmedAlchemyFumebombShock({state:CS.initialCombatState(),round:1,
  eventId:'smoke-'+d100,sourceId:'blast-440',timelineId:'battle',shockML:75,
  as:6,d100,origin:'manual',gmConfirmed:true});
 eq(x.result.sl,sl);eq(x.state.shock,status);ok(CS.validateCombatState(x.state));
}
const retain=CS.applyConfirmedAlchemyFumebombShock({state:g.stagedStates.A,round:g.round,
 eventId:'smoke-mild-again',sourceId:'blast-440',timelineId:'battle',shockML:75,
 as:6,d100:10,origin:'manual',gmConfirmed:true});
eq(retain.state.shock,'UNC');eq(retain.state.shockFollowup.dueRound,g.round+120);

bad(()=>P.previewAlchemyAreaBlast({...gas,rollsByTarget:{A:{shockD100:60,origin:'manual'}}}),/přesně všem/);
bad(()=>P.previewAlchemyAreaBlast({...gas,rollsByTarget:{A:{shockD100:60,origin:'manual'},B:{shockD100:60,origin:'manual'},C:{}}}),/přesně všem/);
bad(()=>P.previewAlchemyAreaBlast({...gas,rollsByTarget:{A:{shockD100:null,origin:'manual'},B:{shockD100:60,origin:'manual'}}}),/skutečný Shock/);
bad(()=>P.previewAlchemyAreaBlast({...gas,rollsByTarget:{A:{shockD100:60,origin:'manual'},B:{shockD100:60,origin:'manual'}},impactD4:2}),/pouze pro Eruption/);
const wrong=structuredClone(gas);wrong.journal.at(-1).calendarAlchemyVialBinding.gasConfirmed=false;
bad(()=>P.previewAlchemyAreaBlast({...wrong,rollsByTarget:{A:{shockD100:60,origin:'manual'},B:{shockD100:60,origin:'manual'}}}),/plynem/);
eq(P.fumebombSmokeActive({originRound:4,nowRound:4}),true);eq(P.fumebombSmokeActive({originRound:4,nowRound:5}),false);
eq(P.fumebombSegmentObscured({x:-10,y:0},{x:10,y:0},{x:0,y:0}),true);
eq(P.fumebombSegmentObscured({x:-10,y:5},{x:10,y:5},{x:0,y:0}),false);
eq(P.fumebombSegmentObscured({x:10,y:10},{x:15,y:15},{x:0,y:0}),false);
const weak=prepare('Weakness'),wp=P.previewAlchemyAreaBlast({...weak,rollsByTarget:{A:{},B:{}}});
eq(wp.kind,'Weakness');eq(wp.targetIds,['A','B']);eq(wp.results.A.strengthBefore,12);
eq(wp.results.A.strengthAfter,12-Math.round(wp.as/2));eq(wp.results.A.strengthMLAfter,wp.results.A.strengthAfter*5);
eq(weak.characters[0].hmk.attributes.str,12);eq(wp.stagedCharacters.A.hmk.attributes.str,wp.results.A.strengthAfter);
const outside=structuredClone(weak);outside.center={x:20,y:0};
bad(()=>P.previewAlchemyAreaBlast({...outside,rollsByTarget:{A:{}}}),/přesně všem/);
const fire=prepare('Eruption'),ep=P.previewAlchemyAreaBlast({...fire,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:2,impactOrigin:'manual',threatenedOpponentIds:['C'],threatGeometryConfirmed:true,moraleByOpponent:{C:{initiativeD100:37,origin:'manual',aberrance:0}}});
eq(ep.kind,'Eruption');eq(ep.strikeImpact,ep.as+2);eq(ep.targetIds,['A','B']);eq(ep.moraleRollsRequired,['C']);ok(ep.stagedStates.A.events.length>0);
eq(ep.moraleResults.C.physicalDice.initiativeD100,37);eq(ep.stagedStates.C.events.at(-1).type,'special-morale-resolution');
eq(ep.proposedMoraleSequence.log.at(-1).type,'special-morale-resolution');
eq(fire.characters[2].hmk.combatState.events.length,0);
bad(()=>P.previewAlchemyAreaBlast({...fire,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:2,impactOrigin:'manual'}),/Morale/);
bad(()=>P.previewAlchemyAreaBlast({...fire,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:2,impactOrigin:'manual',threatenedOpponentIds:['C'],threatGeometryConfirmed:true}),/Morale Roll/);
bad(()=>P.previewAlchemyAreaBlast({...fire,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:2,impactOrigin:'manual',threatenedOpponentIds:['C'],threatGeometryConfirmed:true,moraleByOpponent:{C:{initiativeD100:37,origin:'manual'}}}),/Aberrance/);
bad(()=>P.previewAlchemyAreaBlast({...fire,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:null,impactOrigin:'manual',threatenedOpponentIds:[],threatGeometryConfirmed:true}),/d4/);
const mapless=structuredClone(fire);delete mapless.sequence.spatialUnits;
bad(()=>P.previewAlchemyAreaBlast({...mapless,rollsByTarget:{A:{shockD100:27},B:{shockD100:24}},impactD4:2,impactOrigin:'manual',threatenedOpponentIds:[],threatGeometryConfirmed:true}),/úplné mapy/);
console.log('PASS Alchemy Area preview 440:',n,'assertions (NON-WRITING)');

// Walls and doors are physical, map-proven barriers. An unrelated barrier
// must not block a valid explosion, while a closed wall actually separating
// the impact from a participant must NOT be silently passed through.
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=prepare(name);f.sequence.spatialBarriers=[{id:'far-wall',kind:'wall',from:{x:50,y:-10},to:{x:50,y:10}}];
 const areaDice=name==='Fumebomb'?{rollsByTarget:{A:{shockD100:10,origin:'manual'},B:{shockD100:10,origin:'manual'}}}:
  name==='Weakness'?{rollsByTarget:{A:{},B:{}}}:
  {rollsByTarget:{A:{shockD100:10},B:{shockD100:10}},impactD4:1,impactOrigin:'manual',threatenedOpponentIds:[],threatGeometryConfirmed:true};
 ok(P.previewAlchemyAreaBlast({...f,...areaDice}).targetIds.includes('B'));
 f.sequence.spatialBarriers=[{id:'wall-between',kind:'wall',from:{x:2,y:-10},to:{x:2,y:10}}];
 bad(()=>P.previewAlchemyAreaBlast({...f,...areaDice}),/výbuch za fyzickou stěnou/);
}
console.log('PASS alchemy actual wall separation versus unrelated obstacle: 6 assertions');
