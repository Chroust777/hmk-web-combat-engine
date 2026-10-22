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
const x=make();let query={journal:x.j,campaignId:'C',minute:x.minute,actorId:'B'};
const at=(more={})=>K.darkvisionSkillContext({...query,...more});
const noEffect=K.darkvisionSkillContext({...query,actorId:'A'});
eq(noEffect,{applies:false,modifier:0,sourceIds:[],rangeFeet:0});
eq(K.darkvisionSkillContext({...query,campaignId:'OTHER'}).applies,false);
eq(K.darkvisionSkillContext({...query,actorId:'NOT-B'}).modifier,0);
eq(K.darkvisionSkillContext({...query,minute:0}).modifier,0);
fail(()=>at(),/GM.*zrak/);
fail(()=>at({visionUse:'sight'}),/osvětlení|jasné|šero|tmu/i);
fail(()=>at({visionUse:'unk',light:'bright'}),/GM/);
const passive=at({visionUse:'non-sight'});
eq(passive.modifier,0);eq(passive.light,null);eq(passive.visionUse,'non-sight');eq(passive.sourceIds,['use']);
const bright=at({visionUse:'sight',light:'bright'});
eq(bright.modifier,-x.use.illEffect.penalty);eq(bright.lightPenalty,x.use.illEffect.penalty);
eq(bright.rangeFeet,x.use.finalAS*5);eq(bright.activeUseId,'use');eq(bright.sourceIds,['use']);
ok(bright.sourcePages.includes(271));ok(bright.illEffectIds.includes('use'));
const shadow=at({visionUse:'sight',light:'dim-shadow'});eq(shadow.modifier,0);eq(shadow.rangeFeet,bright.rangeFeet);
const dark=at({visionUse:'sight',light:'pitch-black',distanceFeet:bright.rangeFeet});
eq(dark.modifier,0);eq(dark.checkedFeet,bright.rangeFeet);
eq(at({visionUse:'sight',light:'pitch-black',distanceFeet:0}).modifier,0);
fail(()=>at({visionUse:'sight',light:'pitch-black'}),/vzdálenost/);
fail(()=>at({visionUse:'sight',light:'pitch-black',distanceFeet:bright.rangeFeet+1}),/mimo účinný dosah/);
for(const invalid of [-1,1.5,100001,NaN])fail(()=>at({visionUse:'sight',light:'pitch-black',distanceFeet:invalid}),/vzdálenost/);
fail(()=>at({visionUse:'sight',light:'solar'}),/osvětlení|jasné|šero|tmu/i);
fail(()=>K.darkvisionSkillContext({...query,minute:-1,visionUse:'sight',light:'bright'}),/kontext/);
fail(()=>K.darkvisionSkillContext({...query,actorId:'',visionUse:'sight',light:'bright'}),/kontext/);
// A genuine recovery means no more light penalty, yet enchanted vision persists.
const start=H.createDarkvisionHealingStart({journal:x.j,campaignId:'C',minute:x.minute,useId:'use',targetId:'B',hpD6:1,origin:'manual',gmConfirmed:true});
const withHP=[...x.j,row('hp',x.minute,'B','calendarAlchemyDarkvisionHealingStart',start)];
query={...query,journal:withHP};eq(at({visionUse:'sight',light:'bright'}).modifier,bright.modifier);
const healed=H.createDarkvisionHealingRoll({journal:withHP,campaignId:'C',minute:start.dueMinute,useId:'use',targetId:'B',endurance:12,will:14,d100:40,origin:'manual',gmConfirmed:true});
eq(healed.recovered,true);
const after=[...withHP,row('healed',start.dueMinute,'B','calendarAlchemyDarkvisionHealingRoll',healed)];
query={...query,journal:after,minute:start.dueMinute};
const recovered=at({visionUse:'sight',light:'bright'});
eq(recovered.modifier,0);eq(recovered.lightPenalty,0);eq(recovered.rangeFeet,bright.rangeFeet);eq(recovered.illEffectIds,[]);
ok(recovered.activeUseId==='use');
// An unchanged historical test does not know anything about future recovery.
query={...query,minute:x.minute};eq(at({visionUse:'sight',light:'bright'}).modifier,bright.modifier);
// Actual decay reduces visual range without touching Workbench skills or ML.
const dd=D.createAlchemyDecay({journal:after,campaignId:'C',minute:x.minute+30*1440,actorId:'A',finishId:'finish',d10:10,origin:'manual',gmConfirmed:true});
const aged=[...after,row('decay1',dd.minute,'A','calendarAlchemyDecay',dd)];
query={...query,journal:aged,minute:dd.minute};
const afterDecay=at({visionUse:'sight',light:'dim-shadow'});
eq(afterDecay.rangeFeet,dd.asAfter*5);eq(afterDecay.rangeFeet,bright.rangeFeet-10);
eq(afterDecay.modifier,0);
fail(()=>at({visionUse:'sight',light:'pitch-black',distanceFeet:bright.rangeFeet}),/mimo účinný dosah/);
// No mutation of journal or character state is allowed by read-side modifier.
const original=JSON.stringify(aged);at({visionUse:'sight',light:'bright'});eq(JSON.stringify(aged),original);
// Existing skill test uses EML, not the source ML/Index (HMK pp.60–62).
const result=S.resolveSkillTest({ml:60,roll:42,gmModifier:bright.modifier});
eq(result.ml,60);eq(result.rawEML,60-bright.lightPenalty);eq(result.index,6);
console.log(`PASS Darkvision Skill Workbench 423: ${count} assertions`);
