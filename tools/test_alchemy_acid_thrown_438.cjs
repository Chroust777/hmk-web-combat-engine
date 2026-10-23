'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const native=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return native(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js');
const S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const T=require('../src/integration/hmk-alchemy-acid-thrown.js');
const F=require('../src/integration/hmk-alchemy-acid-flesh.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=a=>{assert.ok(a);n++},no=(f,r)=>{assert.throws(f,r);n++};
function row(id,minute,actor,key,value,campaign='C'){return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,[key]:value};}
function prepared(tag){
 const actor='A',vial='vial-'+tag;
 const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:actor,alchemyML:80,elixirName:'Acid',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 const j=[row('start'+tag,0,actor,'calendarAlchemyStart',start),row('skill'+tag,start.dueMinute,actor,'skillTestProof',skill)];
 const rolls=Math.max(0,Math.min(5,result.sv-4));
 const finish=A.createAlchemyFinish({journal:j,campaignId:'C',minute:start.dueMinute,actorId:actor,startId:'start'+tag,skillId:'skill'+tag,gmContinuityConfirmed:true,augmentationD10:Array(rolls).fill(10),augmentationOrigins:Array(rolls).fill('manual')});
 const finishId='finish'+tag;j.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finish));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const bind=V.createAlchemyVialBinding({journal:j,inventory,campaignId:'C',minute:start.dueMinute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row('bind'+tag,start.dueMinute,actor,'calendarAlchemyVialBinding',bind));
 return {journal:j,inventory,finishId,minute:start.dueMinute,actor};
}
const base=(f,more={})=>({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,
 aimType:'direct',distanceFt:20,throwingML:85,str:15,d100:43,rollOrigin:'manual',targetMovement:'still',targetKind:'flesh',targetId:'B',
 targetLocation:'sk',targetSide:null,zoneAim:1,zoneD:1,zoneOrigin:'manual',locationD10:1,locationOrigin:'manual',
 humanConfirmed:true,impactSurfaceFirmConfirmed:true,geometryConfirmed:true,gmConfirmed:true,...more});
const f=prepared('hit');const hit=T.createAcidThrownVial(base(f));
eq(hit.sl,'S');yes(hit.hit);yes(hit.discharged);eq(hit.targetLocation,'sk');eq(hit.splashDiameterInches,6);
const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,reason:'Acid glass vial thrown and shattered on firm surface',shattered:true,confirmedByGM:true});
eq(empty.emptyVialRetained,false);eq(empty.vialShattered,true);
const app=F.createAcidFleshApplication({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,targetId:'B',targetLocation:'sk',skinContactConfirmed:true,humanConfirmed:true,gmConfirmed:true});
let j=[...f.journal,{...row('thrownHit',f.minute,'A','calendarAlchemyAcidThrown',hit),calendarAlchemyVialEmpty:empty,calendarAlchemyAcidFleshApply:app}];
no(()=>T.validateAcidThrownJournal(j),/kontaktní/);
yes(F.validateAcidFleshJournal(j));
const actor={id:'B',hmk:{skills:[{name:'Shock',ml:90}]}};
const first=F.prepareAcidFleshRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'thrownHit',d10:1,origin:'manual',actor,state:initialCombatState(),round:1,shockD100:41,shockOrigin:'manual',eventId:'hitEvent1',continuousContactConfirmed:true,gmConfirmed:true});
eq(first.proof.burnILAfter,1);eq(first.state.wounds.length,1);
j.push(row('firstContact',f.minute,'B','calendarAlchemyAcidFleshRound',first.proof));yes(F.validateAcidFleshJournal(j));yes(T.validateAcidThrownJournal(j));
const corrupt=structuredClone(j);corrupt.at(-2).calendarAlchemyAcidThrown.d100=95;
no(()=>T.validateAcidThrownJournal(corrupt),/Acid Thrown:/);
no(()=>T.assertAcidThrownAppendOnly(j,corrupt),/nesmí/);
yes(T.validateAcidThrownInventory({journal:j,inventory:[]}));
no(()=>T.validateAcidThrownInventory({journal:j,inventory:f.inventory}),/rozbitá/);
no(()=>T.createAcidThrownVial(base(f,{str:null})),/povinné/);
no(()=>T.createAcidThrownVial(base(f,{zoneD:2,targetLocation:'sk'})),/lokace/);
const fmiss=prepared('miss');
const miss=T.createAcidThrownVial(base(fmiss,{d100:97,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null,targetLocation:null,targetId:null}));
eq(miss.sl,'F');eq(miss.hit,false);eq(miss.discharged,true);
const cf=T.createAcidThrownVial(base(fmiss,{d100:100,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null,targetLocation:null,targetId:null}));
eq(cf.sl,'CF');eq(cf.discharged,false);eq(cf.glassVialBroken,false);
const fc=prepared('grenade');
const grenade=T.createAcidThrownVial(base(fc,{aimType:'grenade',distanceFt:40,d100:42,targetKind:'flesh',targetId:'B',targetLocation:'tx',targetSide:null,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null,
 grenadeD:1,grenadeOrigin:'manual',deviationD8:7,deviationOrigin:'manual',splashDistanceInches:2.99}));
eq(grenade.sl,'S');eq(grenade.deviation.distanceFeet,5);eq(grenade.deviation.directionD8,7);eq(grenade.hit,true);
no(()=>T.createAcidThrownVial(base(fc,{aimType:'grenade',distanceFt:40,d100:42,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null,
 grenadeD:1,grenadeOrigin:'manual',deviationD8:null,splashDistanceInches:2.99})),/d8/);
const far=T.createAcidThrownVial(base(fc,{aimType:'grenade',distanceFt:40,d100:42,targetKind:'flesh',targetId:'B',targetLocation:'tx',targetSide:null,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null,
 grenadeD:1,grenadeOrigin:'manual',deviationD8:7,deviationOrigin:'manual',splashDistanceInches:3.01}));
eq(far.hit,false);
// A failed direct throw can strike a real nearby TAR; it does not become an automatic miss.
const fn=prepared('nearby');
const nh=T.createAcidThrownVial(base(fn,{d100:97,nearbyTargetCount:2,nearbyD20:1,nearbyImpactD10:5,nearbyTargetConfirmed:true}));
eq(nh.sl,'F');yes(nh.hit);eq(nh.nearbyD20,1);
const nm=T.createAcidThrownVial(base(fn,{d100:97,nearbyTargetCount:2,nearbyD20:15,nearbyImpactD10:null,nearbyTargetConfirmed:false,targetKind:'ground',targetId:null,targetLocation:null,zoneD:null,zoneOrigin:null,locationD10:null,locationOrigin:null}));
eq(nm.hit,false);eq(nm.nearbyD20,15);
no(()=>T.createAcidThrownVial(base(fn,{d100:97,nearbyTargetCount:2,nearbyD20:1,nearbyImpactD10:null,nearbyTargetConfirmed:false})),/vyžaduje|povinný|Near/);
console.log('PASS thrown acid',n,'assertions');
