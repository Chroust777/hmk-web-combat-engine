/* Regression of HMK v1.2 pp.269–271 Darkvision Skill Workbench read-side.
 * Rebuilds real journal evidence; no duplicate clock/combat/inventory changes.
 */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js');
const S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const H=require('../src/integration/hmk-alchemy-darkvision-healing.js');
const K=require('../src/integration/hmk-alchemy-darkvision-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
let count=0;
const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const ok=(x)=>{assert.ok(x);count++};
const fail=(f,re)=>{assert.throws(f,re);count++};
const row=(id,minute,actor,key,p,c='C')=>({id,characterId:actor,calendarCampaignId:c,campaignMinute:minute,title:id,body:id,[key]:p});
function make(c='C'){
 const start=A.createAlchemyStart({campaignId:c,minute:0,actorId:'A',alchemyML:80,elixirName:'Darkvision',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const p={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const j=[row('start',0,'A','calendarAlchemyStart',start,c),row('skill',start.dueMinute,'A','skillTestProof',p,c)];
 const n=Math.max(0,Math.min(5,r.sv-4));const finished=A.createAlchemyFinish({journal:j,campaignId:c,minute:start.dueMinute,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 j.push(row('finish',start.dueMinute,'A','calendarAlchemyFinish',finished,c));
 const inventory=[{id:'vial1',characterId:'A',sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}}];
 const b=V.createAlchemyVialBinding({journal:j,inventory,campaignId:c,minute:start.dueMinute,actorId:'A',finishId:'finish',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row('binding',start.dueMinute,'A','calendarAlchemyVialBinding',b,c));
 const empty=V.createAlchemyVialEmpty({journal:j,inventory,campaignId:c,minute:start.dueMinute,actorId:'A',finishId:'finish',reason:'Darkvision drunk',confirmedByGM:true});
 const use=I.createAlchemyDarkvisionImbibing({journal:j,inventory,campaignId:c,minute:start.dueMinute,actorId:'A',targetId:'B',finishId:'finish',testSkill:'Aura',ml:60,d100:85,origin:'manual',emptyId:'empty',gmConfirmed:true});
 j.push(row('empty',start.dueMinute,'A','calendarAlchemyVialEmpty',empty,c));
 j.push(row('use',start.dueMinute,'A','calendarAlchemyImbibing',use,c));
 return {j,minute:start.dueMinute,use,inventory};
}
const testStart=count;
const baseline=make(),input={journal:baseline.j,campaignId:'C',minute:baseline.minute,actorId:'B'};
const view=(levels,visionUse='sight',light='bright',more={})=>K.darkvisionSkillContext({
 ...input,auralShockLevels:levels,visionUse,light,...more
});
const live=view(0);eq(live.rangeFeet,baseline.use.finalAS*5);eq(live.activeUseId,'use');
eq(live.modifier,-baseline.use.illEffect.penalty);eq(live.activeUseIds,['use']);
for(const levels of [1,2,8,99]){
 const blocked=view(levels);
 eq(blocked.applies,true);eq(blocked.rangeFeet,0);eq(blocked.activeUseId,null);
 eq(blocked.activeUseIds,[]);eq(blocked.suspendedByAuralShock,true);
 eq(blocked.auralShockLevels,levels);eq(blocked.suspendedUseIds,['use']);
 eq(blocked.sourceIds,['use']);eq(blocked.illEffectIds,['use']);
 eq(blocked.lightPenalty,baseline.use.illEffect.penalty);
 eq(blocked.modifier,-baseline.use.illEffect.penalty);
 fail(()=>view(levels,'sight','pitch-black',{distanceFeet:0}),/Aural Shock/);
 const nonSight=view(levels,'non-sight');eq(nonSight.modifier,0);
 eq(nonSight.suspendedByAuralShock,true);eq(nonSight.rangeFeet,0);
}
const zero=view(0,'sight','pitch-black',{distanceFeet:baseline.use.finalAS*5});
eq(zero.checkedFeet,baseline.use.finalAS*5);eq(zero.modifier,0);
// Suspension must not rewrite immutable historical sources, base AS, or Decay.
const snapshot=JSON.stringify(baseline.j);
view(1);eq(JSON.stringify(baseline.j),snapshot);
const during=I.activeDarkvision(baseline.j,'C','B',baseline.minute);
eq(during.length,1);eq(during[0].state.currentAS,baseline.use.finalAS);
// During suspension, adverse CF light sensitivity remains active.
const hp=H.createDarkvisionHealingStart({journal:baseline.j,campaignId:'C',minute:baseline.minute,
 useId:'use',targetId:'B',hpD6:1,origin:'manual',gmConfirmed:true});
const healedRow={id:'hp',characterId:'B',calendarCampaignId:'C',campaignMinute:baseline.minute,calendarAlchemyDarkvisionHealingStart:hp};
const healing=H.createDarkvisionHealingRoll({journal:[...baseline.j,healedRow],campaignId:'C',minute:hp.dueMinute,
 useId:'use',targetId:'B',endurance:12,will:14,d100:40,origin:'manual',gmConfirmed:true});
const fullyHealed=[...baseline.j,healedRow,{id:'hr6',characterId:'B',calendarCampaignId:'C',campaignMinute:hp.dueMinute,
 calendarAlchemyDarkvisionHealingRoll:healing}];
const healedButShocked=K.darkvisionSkillContext({journal:fullyHealed,campaignId:'C',minute:hp.dueMinute,
 actorId:'B',auralShockLevels:1,visionUse:'sight',light:'bright'});
eq(healedButShocked.modifier,0);eq(healedButShocked.rangeFeet,0);
eq(healedButShocked.suspendedByAuralShock,true);
const recovered=K.darkvisionSkillContext({journal:fullyHealed,campaignId:'C',minute:hp.dueMinute,
 actorId:'B',auralShockLevels:0,visionUse:'sight',light:'bright'});
eq(recovered.modifier,0);eq(recovered.rangeFeet,baseline.use.finalAS*5);
eq(recovered.suspendedByAuralShock,undefined);
// No carryover between campaigns or characters.
eq(K.darkvisionSkillContext({...input,campaignId:'X',auralShockLevels:1}).applies,false);
eq(K.darkvisionSkillContext({...input,actorId:'A',auralShockLevels:1}).applies,false);
for(const invalid of [-1,0.5,100,NaN,'1',null])fail(()=>view(invalid),/Aural Shock/);
// A source with AS zero cannot reappear upon recovery; real Decay remains authoritative.
let j=[...baseline.j];let now=baseline.minute;let elixir=D.alchemyElixirStrength(j,'C','finish',now);
for(let step=0;step<12&&elixir.currentAS>0;step++){
 now=elixir.nextDueMinute;
 const d=D.createAlchemyDecay({journal:j,campaignId:'C',minute:now,actorId:'A',finishId:'finish',d10:10,origin:'manual',gmConfirmed:true});
 j.push({id:'decay'+step,characterId:'A',calendarCampaignId:'C',campaignMinute:now,calendarAlchemyDecay:d});
 elixir=D.alchemyElixirStrength(j,'C','finish',now);
}
eq(elixir.currentAS,0);
const expired=K.darkvisionSkillContext({journal:j,campaignId:'C',minute:now,actorId:'B',auralShockLevels:0,
 visionUse:'sight',light:'bright'});
eq(expired.rangeFeet,0);eq(expired.activeUseId,null);eq(expired.modifier,-baseline.use.illEffect.penalty);
console.log('PASS Aural Shock Darkvision benefit 427:',count-testStart,'targeted assertions');
