'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'), S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),K=require('../src/integration/hmk-alchemy-darkvision-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
const row=(id,minute,actor,key,p,c='C')=>({id,characterId:actor,calendarCampaignId:c,campaignMinute:minute,title:id,body:id,createdAt:'2026-10-22T12:00:00.000Z',[key]:p});
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++},ok=x=>{assert.ok(x);tests++},fail=(f,re)=>{assert.throws(f,re);tests++};
function setup(c='C', names=['Darkvision','Physic']){
 let j=[],inventory=[],t=0;
 names.forEach((name,i)=>{
  const startMinute=t;const s=A.createAlchemyStart({journal:j,campaignId:c,minute:startMinute,actorId:'A'+i,alchemyML:80,elixirName:name,
   sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
  j.push(row('start'+i,startMinute,'A'+i,'calendarAlchemyStart',s,c));
  const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:s.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
  const p={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],
   secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},
   a:r,gmModifiers:[s.sunsignModifier],helpers:[]};
  j.push(row('skill'+i,s.dueMinute,'A'+i,'skillTestProof',p,c));
  const n=Math.max(0,Math.min(5,r.sv-4));
  const end=A.createAlchemyFinish({journal:j,campaignId:c,minute:s.dueMinute,actorId:'A'+i,startId:'start'+i,skillId:'skill'+i,
   gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
  j.push(row('finish'+i,s.dueMinute,'A'+i,'calendarAlchemyFinish',end,c));
  const item={id:'vial'+i,characterId:'A'+i,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,
   snapshot:{name:'Vial, 4 oz',category:'other',properties:{weightLb:.25}}};inventory.push(item);
  const bind=V.createAlchemyVialBinding({journal:j,inventory,campaignId:c,minute:s.dueMinute,actorId:'A'+i,
   finishId:'finish'+i,vialId:'vial'+i,confirmedByGM:true,storageAtCompletionConfirmed:true,
   liquidConfirmed:true,material:'glass',corkConfirmed:true});
  j.push(row('bind'+i,s.dueMinute,'A'+i,'calendarAlchemyVialBinding',bind,c));t=s.dueMinute;
 });
 return {j,inventory,t};
}
function drinkDark(src,finishId='finish0',id='dark',targetId='B',roll=41){
 const {j,inventory,t}=src;
 const b=V.createAlchemyVialEmpty({journal:j,inventory,campaignId:'C',minute:t,actorId:'A0',finishId,reason:'Darkvision consumed by B',confirmedByGM:true});
 const p=I.createAlchemyDarkvisionImbibing({journal:j,inventory,campaignId:'C',minute:t,actorId:'A0',targetId,finishId,
  testSkill:'Aura',ml:65,d100:roll,origin:'manual',emptyId:'empty'+id,gmConfirmed:true});
 j.push(row('empty'+id,t,'A0','calendarAlchemyVialEmpty',b));
 j.push(row(id,t,'A0','calendarAlchemyImbibing',p));return p;
}
function drinkPhysic(src,die=42,id='physic',targetId='B'){
 const {j,inventory,t}=src;
 const q={journal:j,inventory,campaignId:'C',minute:t,actorId:'A1',targetId,finishId:'finish1',testSkill:'Aura',ml:65,
  d100:die,origin:'manual',emptyId:'empty'+id,gmConfirmed:true};
 const proof=I.createAlchemyPhysicImbibing(q);
 const empty=V.createAlchemyVialEmpty({journal:j,inventory,campaignId:'C',minute:t,actorId:'A1',finishId:'finish1',
  reason:'Physic consumed by B',confirmedByGM:true});
 j.push(row('empty'+id,t,'A1','calendarAlchemyVialEmpty',empty));j.push(row(id,t,'A1','calendarAlchemyImbibing',proof));
 return proof;
}
const a=setup();eq(D.alchemyElixirStrength(a.j,'C','finish0',a.t).elixirName,'Darkvision');
const dark=drinkDark(a),firstAS=dark.finalAS;eq(I.activeDarkvision(a.j,'C','B',a.t).length,1);
eq(K.darkvisionSkillContext({journal:a.j,campaignId:'C',minute:a.t,actorId:'B',visionUse:'sight',light:'pitch-black',distanceFeet:10}).rangeFeet,firstAS*5);
const physical=drinkPhysic(a,42);eq(physical.elixirName,'Physic');eq(physical.sl,'S');eq(physical.otherActiveElixirs,0);
eq(physical.profusionCF,false);
eq(physical.physicEffects.length,1);eq(physical.physicEffects[0].sourceUseId,'dark');
eq(physical.physicEffects[0].asBefore,firstAS);
eq(physical.physicEffects[0].asAfter,Math.max(0,firstAS-physical.finalAS));
eq(I.activeDarkvision(a.j,'C','B',a.t).length,0);
eq(D.alchemyElixirStrength(a.j,'C','finish0',a.t).currentAS,0);
eq(D.alchemyElixirStrength(a.j,'C','finish1',a.t).dispersed,true);
eq(D.pendingAlchemyDecay(a.j,'C',a.t+45*1440).length,0);
eq(I.validateAlchemyImbibingJournal(a.j),true);
eq(V.validateAlchemyVialJournal(a.j),true);
eq(D.validateAlchemyDecayJournal(a.j),true);
const history=historicalHMKCalendarEntries({campaignId:'C',minute:a.t,characterIds:['A0','A1','B']},
 [{id:'A0',name:'A0'},{id:'A1',name:'A1'},{id:'B',name:'B'}],a.j);
ok(history.some(x=>x.kind==='alchemy-imbibing'&&x.note.includes('Physic')&&x.note.includes('dark AS')));
ok(history.every(x=>!x.note.includes('undefined ft')));
eq(I.assertAlchemyImbibingAppendOnly(a.j,structuredClone(a.j)),true);
const bad=structuredClone(a.j),ix=bad.findIndex(x=>x.id==='physic');bad[ix].calendarAlchemyImbibing.physicEffects[0].asAfter=99;
fail(()=>I.validateAlchemyImbibingJournal(bad),/historický|změněn|Physic/);
fail(()=>D.alchemyElixirStrength(bad,'C','finish0',a.t),/Physic/);
fail(()=>I.assertAlchemyImbibingAppendOnly(a.j,bad),/nelze/);
const b=setup();drinkDark(b);
if(process.env.HMK_PHYSIC_FIXTURE==='1'){console.log(JSON.stringify({journal:b.j,inventory:b.inventory,minute:b.t}));process.exit(0)}
const opts={journal:b.j,inventory:b.inventory,campaignId:'C',minute:b.t,actorId:'A1',targetId:'B',finishId:'finish1',
 testSkill:'Aura',ml:65,d100:85,origin:'manual',emptyId:'bad',gmConfirmed:true};
fail(()=>I.createAlchemyPhysicImbibing(opts),/CF|Aural/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:0}),/d100/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:101}),/d100/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:42,actorId:'B'}),/lahvička/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:42,campaignId:'OTHER'}),/dokončen|elixír|chybí/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:42,gmConfirmed:false}),/GM/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:42,minute:b.t+15*1440}),/Decay/);
fail(()=>I.createAlchemyPhysicImbibing({...opts,d100:42,testSkill:'Skill'}),/Aura|Alchemy/);
// CF must leave both inventory and history unmodified because app performs
// all checks before its existing atomic mutate transaction.
eq(b.j.length,10);eq(b.inventory.length,2);
const independent=I.createAlchemyPhysicImbibing({...opts,d100:42,targetId:'X'});
eq(independent.physicEffects.length,0);
const targetF=I.createAlchemyPhysicImbibing({...opts,d100:84});
eq(targetF.sl,'F');eq(targetF.finalAS,D.alchemyElixirStrength(b.j,'C','finish1',b.t).currentAS-1);
const targetCS=I.createAlchemyPhysicImbibing({...opts,d100:40});eq(targetCS.sl,'CS');
eq(targetCS.finalAS,D.alchemyElixirStrength(b.j,'C','finish1',b.t).currentAS+1);
// A weaker Physic only partially reduces the active AS; remaining
// Darkvision keeps its usual monthly Decay schedule and range.
const partial=setup();const d2=drinkDark(partial,'finish0','dark','B',40);
const beforePhysic=d2.finalAS;
const fPhysic=drinkPhysic(partial,84);
eq(fPhysic.sl,'F');eq(fPhysic.physicEffects[0].asAfter,Math.max(0,beforePhysic-fPhysic.finalAS));
const remaining=D.alchemyElixirStrength(partial.j,'C','finish0',partial.t);
eq(remaining.currentAS,Math.max(0,beforePhysic-fPhysic.finalAS));
ok(remaining.currentAS>0);ok(remaining.activeTemporary);
eq(I.activeDarkvision(partial.j,'C','B',partial.t).length,1);
eq(I.validateAlchemyImbibingJournal(partial.j),true);
const due=remaining.nextDueMinute;
const dd=D.createAlchemyDecay({journal:partial.j,campaignId:'C',minute:due,actorId:'A0',finishId:'finish0',d10:1,origin:'manual',gmConfirmed:true});
eq(dd.asBefore,remaining.currentAS);ok(dd.asAfter<remaining.currentAS);
partial.j.push(row('dpartial',due,'A0','calendarAlchemyDecay',dd));
eq(D.validateAlchemyDecayJournal(partial.j),true);
console.log('PASS Alchemy Physic 425:',tests,'assertions');
