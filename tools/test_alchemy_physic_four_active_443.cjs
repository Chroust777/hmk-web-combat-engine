'use strict';
// HMK 270/273 — one real Physic bottle affects EVERY simultaneously active
// supported Temporary enchantment (including Egosight), with immutable replay.
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)
};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=x=>{assert.ok(x);n++},fails=(f,re)=>{assert.throws(f,re);n++};
const row=(id,minute,actor,key,p)=>({id,characterId:actor,calendarCampaignId:'C',campaignMinute:minute,createdAt:'2026-10-24T00:00:00Z',title:id,body:id,[key]:p});
function make(name,actor,id){
 const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:actor,alchemyML:80,elixirName:name,
  sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],
  secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const j=[row(id+'-start',0,actor,'calendarAlchemyStart',start),row(id+'-skill',start.dueMinute,actor,'skillTestProof',skill)];
 const count=Math.max(0,Math.min(5,r.sv-4));
 const finish=A.createAlchemyFinish({journal:j,campaignId:'C',minute:start.dueMinute,actorId:actor,startId:id+'-start',skillId:id+'-skill',
  gmContinuityConfirmed:true,augmentationD10:Array(count).fill(10),augmentationOrigins:Array(count).fill('manual')});
 j.push(row(id+'-finish',start.dueMinute,actor,'calendarAlchemyFinish',finish));
 const item={id:id+'-vial',characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,
  snapshot:{name:'Vial, 4 oz',category:'other',properties:{weightLb:.25}}};
 const bind=V.createAlchemyVialBinding({journal:j,inventory:[item],campaignId:'C',minute:start.dueMinute,actorId:actor,
  finishId:id+'-finish',vialId:item.id,confirmedByGM:true,storageAtCompletionConfirmed:true,
  liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row(id+'-bind',start.dueMinute,actor,'calendarAlchemyVialBinding',bind));
 return {id,actor,name,j,item,minute:start.dueMinute,finishId:id+'-finish'};
}
const names=['Darkvision','Erudition','Footpad','Egosight','Physic'];
const doses=names.map((name,i)=>make(name,'A'+i,'d'+i));
const minute=doses[0].minute,journal=doses.flatMap(d=>d.j),inventory=doses.map(d=>d.item);
const creators={Darkvision:I.createAlchemyDarkvisionImbibing,Erudition:I.createAlchemyEruditionImbibing,
 Footpad:I.createAlchemyFootpadImbibing,Egosight:I.createAlchemyEgosightImbibing,Physic:I.createAlchemyPhysicImbibing};
function drink(d,die=42){
 const emptyId=d.id+'-empty';const p=creators[d.name]({journal,inventory,campaignId:'C',minute,actorId:d.actor,targetId:'B',
  finishId:d.finishId,testSkill:'Aura',ml:80,d100:die,origin:'manual',emptyId,gmConfirmed:true});
 const empty=V.createAlchemyVialEmpty({journal,inventory,campaignId:'C',minute,actorId:d.actor,
  finishId:d.finishId,reason:'Consumed by B',confirmedByGM:true});
 journal.push(row(emptyId,minute,d.actor,'calendarAlchemyVialEmpty',empty));
 journal.push(row(d.id+'-use',minute,d.actor,'calendarAlchemyImbibing',p));return p;
}
for(const d of doses.slice(0,4))eq(drink(d).sl,'S');
eq(I.activeAlchemyPhysicTargets(journal,'C','B',minute).length,4);
const before=I.activeAlchemyPhysicTargets(journal,'C','B',minute),pre=JSON.stringify(journal),items=JSON.stringify(inventory);
const p=I.createAlchemyPhysicImbibing({journal,inventory,campaignId:'C',minute,actorId:'A4',targetId:'B',finishId:doses[4].finishId,
 testSkill:'Aura',ml:80,d100:42,origin:'manual',emptyId:'d4-empty',gmConfirmed:true});
eq(p.sl,'S');eq(p.otherActiveElixirs,0);eq(p.physicEffects.length,4);
eq(p.physicEffects.map(x=>x.finishId),doses.slice(0,4).map(d=>d.finishId));
for(let i=0;i<4;i++){
 eq(p.physicEffects[i].asBefore,before[i].state.currentAS);
 eq(p.physicEffects[i].asAfter,Math.max(0,before[i].state.currentAS-p.finalAS));
 eq(p.physicEffects[i].sourceUseId,before[i].useId);
}
eq(JSON.stringify(journal),pre);eq(JSON.stringify(inventory),items);
// Commit *once* to the original journal; no parallel AS ledger.
const empty=V.createAlchemyVialEmpty({journal,inventory,campaignId:'C',minute,actorId:'A4',finishId:'d4-finish',reason:'Consumed by B',confirmedByGM:true});
journal.push(row('d4-empty',minute,'A4','calendarAlchemyVialEmpty',empty));
journal.push(row('d4-use',minute,'A4','calendarAlchemyImbibing',p));
eq(I.validateAlchemyImbibingJournal(journal),true);eq(V.validateAlchemyVialJournal(journal),true);
for(let i=0;i<4;i++){
 const after=D.alchemyElixirStrength(journal,'C',doses[i].finishId,minute);
 eq(after.currentAS,p.physicEffects[i].asAfter);
 eq(after.activeTemporary,after.currentAS>0);
}
eq(I.activeAlchemyPhysicTargets(journal,'C','B',minute).filter(x=>x.state.currentAS>0).length,
 p.physicEffects.filter(x=>x.asAfter>0).length);
const bad=structuredClone(journal),physic=bad.find(x=>x.id==='d4-use');physic.calendarAlchemyImbibing.physicEffects.pop();
fails(()=>I.validateAlchemyImbibingJournal(bad),/historický/);
eq(I.assertAlchemyImbibingAppendOnly(journal,structuredClone(journal)),true);
fails(()=>I.assertAlchemyImbibingAppendOnly(journal,bad),/nelze/);
console.log('PASS Alchemy Physic four-live-sources 443:',n,'assertions');
