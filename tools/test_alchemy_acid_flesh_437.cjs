'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),E=require('../src/integration/hmk-alchemy-egosight.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const Acid=require('../src/integration/hmk-alchemy-acid-applied.js');
const AW=require('../src/integration/hmk-alchemy-acid-weapon.js');
const AA=require('../src/integration/hmk-alchemy-acid-armour.js');
const AF=require('../src/integration/hmk-alchemy-acid-flesh.js');
const Live=require('../src/integration/live-combat-armour.js');
const History=require('../src/integration/hmk-calendar-history.js');
const {PRINTED_ARMOUR_ARTICLES_P118}=require('../src/rules/armour-articles-printed.js');
const {locationArmourValue}=require('../src/rules/armour-options.js');
const {qualityImpactPenalty}=require('../src/rules/weapon-damage.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},yes=x=>{assert.ok(x);n++},no=(fn,re)=>{assert.throws(fn,re);n++};
function row(id,minute,actor,key,value,campaign='C'){return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,[key]:value};}
function prepared(name='Egosight',tag='e',campaign='C'){
 const actor='A',vial='vial'+tag;
 const start=A.createAlchemyStart({campaignId:campaign,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 const j=[row('start'+tag,0,actor,'calendarAlchemyStart',start,campaign),row('skill'+tag,start.dueMinute,actor,'skillTestProof',skill,campaign)];
 const rolls=Math.max(0,Math.min(5,result.sv-4));
 const finish=A.createAlchemyFinish({journal:j,campaignId:campaign,minute:start.dueMinute,actorId:actor,startId:'start'+tag,skillId:'skill'+tag,gmContinuityConfirmed:true,augmentationD10:Array(rolls).fill(10),augmentationOrigins:Array(rolls).fill('manual')});
 const finishId='finish'+tag;j.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finish,campaign));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const bind=V.createAlchemyVialBinding({journal:j,inventory,campaignId:campaign,minute:start.dueMinute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row('bind'+tag,start.dueMinute,actor,'calendarAlchemyVialBinding',bind,campaign));
 return {journal:j,inventory,finishId,minute:start.dueMinute,campaign,actor,base:finish.baseAS,tag};
}
function imbibe(fix,d100=41,targetId='B',initial=null){
 const journal=initial??fix.journal,opts={journal,inventory:fix.inventory,campaignId:fix.campaign,minute:fix.minute,actorId:fix.actor,targetId,finishId:fix.finishId,testSkill:'Aura',ml:80,d100,origin:'manual',emptyId:'empty'+fix.tag,gmConfirmed:true};
 const proof=I.createAlchemyEgosightImbibing(opts),empty=V.createAlchemyVialEmpty({journal,inventory:fix.inventory,campaignId:fix.campaign,minute:fix.minute,actorId:fix.actor,finishId:fix.finishId,reason:'Egosight imbibed',confirmedByGM:true});
 const useId='use'+fix.tag;
 return {proof,useId,journal:[...journal,row(opts.emptyId,fix.minute,fix.actor,'calendarAlchemyVialEmpty',empty,fix.campaign),row(useId,fix.minute,fix.actor,'calendarAlchemyImbibing',proof,fix.campaign)]};
}




const f=prepared('Acid','flesh');
const actor={id:'B',hmk:{skills:[{name:'Shock',ml:90}]}};
const state=initialCombatState();
const args={journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,targetId:'B',targetLocation:'tx',targetSide:null,skinContactConfirmed:true,humanConfirmed:true,gmConfirmed:true};
const a=AF.createAcidFleshApplication(args);
yes(a.noImbibingRoll);eq(a.targetLocation,'tx');
const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,reason:'Acid flesh direct',confirmedByGM:true});
let j=[...f.journal,{...row('acF',f.minute,'A','calendarAlchemyAcidFleshApply',a),calendarAlchemyVialEmpty:empty}];
yes(AF.validateAcidFleshJournal(j));
let r=AF.prepareAcidFleshRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'acF',d10:1,origin:'manual',actor,state,round:1,shockD100:21,shockOrigin:'manual',eventId:'acidFlesh:1',continuousContactConfirmed:true,gmConfirmed:true});
yes(r.proof.success);eq(r.proof.burnILAfter,1);eq(r.state.wounds.length,1);eq(r.state.wounds[0].aspect,'fire');
j.push(row('afR1',f.minute,'B','calendarAlchemyAcidFleshRound',r.proof));
yes(AF.validateAcidFleshJournal(j));
yes(AF.validateAcidFleshCombatLinks({journal:j,characters:[{id:'B',hmk:{combatState:r.state}}]}));
console.log('PASS Acid flesh',n,'assertions');
// Second Burn IL + required Compound test; with the exact same existing
// combat reducer, no parallel HP or Shock reservoir.
let r2=AF.prepareAcidFleshRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'acF',d10:1,origin:'manual',actor,state:r.state,round:2,
 shockD100:22,shockOrigin:'manual',compoundD10:null,compoundOrigin:null,eventId:'acidFlesh:2',continuousContactConfirmed:true,gmConfirmed:true});
eq(r2.proof.burnILAfter,2);eq(r2.state.wounds.length,1);eq(r2.state.wounds[0].level,2);eq(r2.state.wounds[0].severity,'S');
j.push(row('afR2',f.minute,'B','calendarAlchemyAcidFleshRound',r2.proof));
yes(AF.validateAcidFleshJournal(j));yes(AF.validateAcidFleshCombatLinks({journal:j,characters:[{id:'B',hmk:{combatState:r2.state}}]}));
const bad=structuredClone(j);bad.at(-1).calendarAlchemyAcidFleshRound.d10=10;
no(()=>AF.validateAcidFleshJournal(bad),/změněný/);
no(()=>AF.assertAcidFleshAppendOnly(j,bad),/nelze upravit/);
no(()=>AF.prepareAcidFleshRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'acF',d10:1,origin:'manual',actor,state:r2.state,round:3,eventId:'acidFlesh:3',continuousContactConfirmed:true,gmConfirmed:true}),/Shock/);
// Ingestion: HMK p271 one fifth of ten human body zones = IL2,
// still every IL is a genuine burn and a separate Shock roll.
const ingestion=AF.createAcidFleshApplication({...args,mode:'ingested',targetLocation:'ab',
 targetSide:null,skinContactConfirmed:false,ingestedConfirmed:true});
eq(ingestion.lethalIL,2);
let ji=[...f.journal,{...row('ingest',f.minute,'A','calendarAlchemyAcidFleshApply',ingestion),calendarAlchemyVialEmpty:empty}];
let s=initialCombatState();
for(let i=1;i<=2;i++){
 const proof=AF.prepareAcidFleshRound({journal:ji,campaignId:'C',minute:f.minute,applicationId:'ingest',d10:1,origin:'manual',actor,state:s,round:i,
  shockD100:21,shockOrigin:'manual',compoundD10:null,compoundOrigin:null,
  eventId:'ingested:'+i,continuousContactConfirmed:true,gmConfirmed:true});
 s=proof.state;ji.push(row('ir'+i,f.minute,'B','calendarAlchemyAcidFleshRound',proof.proof));
}
eq(s.shock,'KIA');eq(AF.acidFleshState(ji,'C','ingest',f.minute).spent,true);
yes(AF.validateAcidFleshJournal(ji));yes(AF.validateAcidFleshCombatLinks({journal:ji,characters:[{id:'B',hmk:{combatState:s}}]}));
// HMK p167 has only IL1–IL5. Further Acid contact after a G5 wound
// still consumes AS, but must NOT invent an IL6, fresh Shock, or extra wound.
const limitApply=AF.createAcidFleshApplication({...args,targetLocation:'fo',targetSide:'left'});
let jl=[...f.journal,{...row('limitAcid',f.minute,'A','calendarAlchemyAcidFleshApply',limitApply),calendarAlchemyVialEmpty:empty}];
let slimit=initialCombatState();
for(let i=1;i<=6;i++){
 const step=AF.prepareAcidFleshRound({journal:jl,campaignId:'C',minute:f.minute,applicationId:'limitAcid',d10:1,
  origin:'manual',actor,state:slimit,round:i,eventId:'limitAcid:'+i,
  ...(i<=5?{shockD100:43,shockOrigin:'manual'}:{}),continuousContactConfirmed:true,gmConfirmed:true});
 slimit=step.state;
 eq(step.proof.burnILAfter,Math.min(i,5));
 eq(slimit.wounds.length,1);
 eq(slimit.wounds[0].level,Math.min(i,5));
 if(i===6)eq(step.proof.health,null);
 jl.push(row('limitRound:'+i,f.minute,'B','calendarAlchemyAcidFleshRound',step.proof));
}
yes(AF.validateAcidFleshJournal(jl));yes(AF.validateAcidFleshCombatLinks({journal:jl,characters:[{id:'B',hmk:{combatState:slimit}}]}));
console.log('PASS Acid flesh including G5 cap',n,'assertions');
// Compound on the FIRST Acid burn, then progress the actual incoming wound.
// A prior Fire M1 makes initial Acid M1 become S2 when Compound d10=1.
const compApply=AF.createAcidFleshApplication({...args,targetLocation:'fo',targetSide:'left'});
let jc=[...f.journal,{...row('compoundAcid',f.minute,'A','calendarAlchemyAcidFleshApply',compApply),calendarAlchemyVialEmpty:empty}];
let sc=initialCombatState();
sc.wounds.push({id:'priorFire',location:'fo',side:'left',severity:'M',level:1,aspect:'fire',bleeding:false,nextAdvanceRound:null,originEventId:'priorFireEvent'});
sc.events.push({id:'priorFireEvent',type:'confirmed-hit',round:1,details:{targetId:'B'}});
sc.lastRound=1;
let step1=AF.prepareAcidFleshRound({journal:jc,campaignId:'C',minute:f.minute,applicationId:'compoundAcid',d10:1,
 origin:'manual',actor,state:sc,round:2,eventId:'compoundAcid:1',shockD100:43,shockOrigin:'manual',
 compoundD10:1,compoundOrigin:'manual',continuousContactConfirmed:true,gmConfirmed:true});
eq(step1.proof.health.woundIL,2);eq(step1.state.wounds.length,2);
jc.push(row('compoundRound:1',f.minute,'B','calendarAlchemyAcidFleshRound',step1.proof));sc=step1.state;
for(let i=2;i<=4;i++){
 const step=AF.prepareAcidFleshRound({journal:jc,campaignId:'C',minute:f.minute,applicationId:'compoundAcid',d10:1,
  origin:'manual',actor,state:sc,round:i+1,eventId:'compoundAcid:'+i,shockD100:43,shockOrigin:'manual',
  continuousContactConfirmed:true,gmConfirmed:true});
 eq(step.proof.health.woundIL,Math.min(i+1,5));eq(step.state.wounds.length,2);
 jc.push(row('compoundRound:'+i,f.minute,'B','calendarAlchemyAcidFleshRound',step.proof));sc=step.state;
}
yes(AF.validateAcidFleshJournal(jc));yes(AF.validateAcidFleshCombatLinks({journal:jc,characters:[{id:'B',hmk:{combatState:sc}}]}));
console.log('PASS Acid flesh including existing Fire Compound',n,'assertions');
