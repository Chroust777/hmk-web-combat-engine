'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return prev(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),{PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const U=require('../src/integration/hmk-alchemy-area-thrown-source.js'),T=require('../src/integration/hmk-alchemy-acid-thrown.js');
const C=require('../src/integration/encounter-turn-sequence.js'),CS=require('../src/integration/persistent-combat-state.js');
let n=0;const ok=x=>{assert.ok(x);n++},eq=(a,b)=>{assert.deepStrictEqual(a,b);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const row=(id,t,who,key,value)=>({id,characterId:who,calendarCampaignId:'C',campaignMinute:t,[key]:value});
function fixture(name){
 const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:'A',alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const sp={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const t=start.dueMinute,j=[row('start',0,'A','calendarAlchemyStart',start),row('skill',t,'A','skillTestProof',sp)];
 const finish=A.createAlchemyFinish({journal:j,campaignId:'C',minute:t,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:Array(Math.max(0,Math.min(5,r.sv-4))).fill(10),augmentationOrigins:Array(Math.max(0,Math.min(5,r.sv-4))).fill('manual')});
 j.push(row('finish',t,'A','calendarAlchemyFinish',finish));
 const inv=[{id:'vial',characterId:'A',sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}}];
 const b=V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute:t,actorId:'A',finishId:'finish',vialId:'vial',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:name!=='Fumebomb',gasConfirmed:name==='Fumebomb',material:'glass',corkConfirmed:true});
 j.push(row('bind',t,'A','calendarAlchemyVialBinding',b));
 const chars=['A','B','C'].map((id,k)=>({id,hmk:{attributes:{str:12+k},skills:[{name:'Shock',ml:75-k*10},{name:'Initiative',ml:80},{name:'Throwing',ml:80}],combatState:CS.initialCombatState()}}));
 let seq=C.createEncounterSequence({timelineId:'battle',roster:chars.map((c,k)=>({id:c.id,initiativeML:100-k*10,awarenessEML:60}))});
 seq.spatialUnits=[{id:'A',x:0,y:0},{id:'B',x:4,y:0},{id:'C',x:15,y:0}];
 seq=C.startEncounterTurn(seq,Object.fromEntries(chars.map(x=>[x.id,x.hmk.combatState])));
 const base={sequence:seq,characters:chars,inventory:inv,journal:j,campaignId:'C',minute:t,actorId:'A',finishId:'finish',sourceId:'blast-event',aimPoint:{x:15,y:0},center:{x:15,y:0},gmConfirmed:true};
 return base;
}
const thrown={aimType:'grenade',distanceFt:15,throwingML:80,str:12,d100:44,rollOrigin:'manual',targetMovement:'still'};
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=fixture(name),snapshot=JSON.stringify(f);
 const areaDice=name==='Fumebomb'?{rollsByTarget:{C:{shockD100:70,origin:'manual'}}}:
  name==='Weakness'?{rollsByTarget:{C:{}}}:
  {rollsByTarget:{C:{shockD100:29}},impactD4:3,impactOrigin:'manual',threatenedOpponentIds:['B'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0}}};
 const b=U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,areaDice});
 eq(b.kind,name);eq(b.throw.format,T.ALCHEMY_AREA_THROW_FORMAT);eq(b.throw.discharged,true);
 eq(b.throw.elixirName,name);eq(b.throw.glassVialBroken,true);
 eq(b.blast.targetIds,['C']);eq(b.blast.readyForCommit,false);
 eq(b.readyForCommit,false);eq(JSON.stringify(f),snapshot);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,center:{x:14,y:0},areaDice}),/odchylky/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,distanceFt:16},areaDice}),/vzdálenost/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,throwingML:79},areaDice}),/Throwing ML/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,str:13},areaDice}),/Throwing ML/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,areaDice:{...areaDice,actorId:'C'}}),/neznámá položka/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,aimType:'direct'},areaDice}),/Direct/);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,areaDice:{rollsByTarget:{}}}),/přesně všem/);
 const cf=U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,d100:95},areaDice:{}});
 eq(cf.blast,null);eq(cf.throw.discharged,false);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,d100:95},areaDice}),/CF/);
}
console.log('PASS alchemy shared thrown source:',n,'assertions, READ-ONLY');
// A genuine CF does not throw, explode, demand Fire Impact or Morale. Blank
// UI placeholders are not themselves rolls; any supplied dice are forbidden.
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=fixture(name);
 const blanks=name==='Eruption'?{rollsByTarget:{},impactD4:null,impactOrigin:null,
  threatenedOpponentIds:[],threatGeometryConfirmed:false,moraleByOpponent:{}}:{rollsByTarget:{}};
 const cf=U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,d100:95},areaDice:blanks});
 eq(cf.throw.discharged,false);eq(cf.blast,null);
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:{...thrown,d100:95},areaDice:{...blanks,impactD4:3}}),/CF/);
}
console.log('PASS alchemy CF blank-form fields: 9 assertions');

// A real thrown bottle cannot be silently routed through a closed wall.
// A barrier elsewhere in the scene has no bearing on its physical path.
for(const name of ['Eruption','Fumebomb','Weakness']){
 const f=fixture(name),areaDice=name==='Eruption'?{rollsByTarget:{C:{shockD100:29}},impactD4:3,impactOrigin:'manual',threatenedOpponentIds:['B'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0}}}:
  name==='Fumebomb'?{rollsByTarget:{C:{shockD100:70,origin:'manual'}}}:{rollsByTarget:{C:{}}};
 f.sequence.spatialBarriers=[{id:'far-wall',kind:'wall',from:{x:50,y:-10},to:{x:50,y:10}}];
 ok(U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,areaDice}).throw.discharged);
 f.sequence.spatialBarriers=[{id:'wall-between',kind:'wall',from:{x:7,y:-10},to:{x:7,y:10}}];
 bad(()=>U.stageAlchemyAreaThrownSource({...f,throwDice:thrown,areaDice}),/trajektorie lahvičky/);
}
console.log('PASS alchemy grenade barrier trajectory: 6 assertions');
