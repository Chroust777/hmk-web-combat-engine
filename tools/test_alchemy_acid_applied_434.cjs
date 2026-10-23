'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),E=require('../src/integration/hmk-alchemy-egosight.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const Acid=require('../src/integration/hmk-alchemy-acid-applied.js');
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

const f=prepared('Acid','acid');
const object={id:'object1',characterId:'A',slot:'carried',quantity:1,sourceItemId:'wooden-dowel',snapshot:{name:'Wooden target, 6 inches'}};
f.inventory.push(object);
const o={journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,
 targetItemId:'object1',material:'wood',sixInchConfirmed:true,objectConfirmed:true,accessConfirmed:true,gmConfirmed:true};
const app=Acid.createAlchemyAcidApplication(o);
eq(app.asAtApplication,f.base);eq(app.noImbibingRoll,true);eq(app.profusionExempt,true);
eq(app.destroyAtSuccesses,5);eq(app.targetName,object.snapshot.name);
const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,reason:'Acid applied directly to object object1',confirmedByGM:true});
let j=[...f.journal,{...row('apply',f.minute,'A','calendarAlchemyAcidApply',app),calendarAlchemyVialEmpty:empty}];
yes(Acid.validateAlchemyAcidJournal(j));yes(V.validateAlchemyVialJournal(j));
let stat=Acid.alchemyAcidContactState(j,'C','apply',f.minute);eq(stat.as,f.base);eq(stat.rounds,0);eq(stat.successes,0);
let damaged=0;
for(let i=1;i<=f.base;i++){
 if(Acid.alchemyAcidContactState(j,'C','apply',f.minute).spent)break;
 const before=Acid.alchemyAcidContactState(j,'C','apply',f.minute);
 const d=i===2?10:1;
 const proof=Acid.createAlchemyAcidRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'apply',d10:d,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true});
 eq(proof.asBefore,before.as);eq(proof.asAfter,before.as-1);eq(proof.success,d<=before.as);
 eq(proof.damage,+(d<=before.as));
 damaged+=+(d<=before.as);eq(proof.successesAfter,damaged);eq(proof.round,i);
 j.push(row('round'+i,f.minute,'A','calendarAlchemyAcidRound',proof));
 yes(Acid.validateAlchemyAcidJournal(j));
}
stat=Acid.alchemyAcidContactState(j,'C','apply',f.minute);eq(stat.successes,damaged);yes(stat.spent);
no(()=>Acid.createAlchemyAcidRound({journal:j,campaignId:'C',minute:f.minute,applicationId:'apply',d10:1,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true}),/AS 0|hranice/);
yes(Acid.assertAlchemyAcidAppendOnly(j,structuredClone(j)));
no(()=>Acid.assertAlchemyAcidAppendOnly(j,j.filter(x=>x.id!=='apply')),/důkaz/);
let tampered=structuredClone(j);tampered.find(x=>x.id==='round1').calendarAlchemyAcidRound.d10=10;
no(()=>Acid.validateAlchemyAcidJournal(tampered),/neplatný|přepsaný/);
no(()=>Acid.assertAlchemyAcidAppendOnly(j,tampered),/důkaz/);
let withoutEmpty=structuredClone(j);delete withoutEmpty.find(x=>x.id==='apply').calendarAlchemyVialEmpty;
no(()=>Acid.validateAlchemyAcidJournal(withoutEmpty),/atomickém/);
for(const [change,re] of [
 [{gmConfirmed:false},/GM/],[{objectConfirmed:false},/GM/],[{sixInchConfirmed:false},/GM/],
 [{accessConfirmed:false},/GM/],[{material:'clay'},/podporován/],
 [{targetItemId:'no-item'},/inventární/],[{targetItemId:'vialacid'},/inventární/],
 [{actorId:'wrong'},/vlastníka/],[{campaignId:'WRONG'},/dokončený/],
 [{minute:-1},/čas/]
])no(()=>Acid.createAlchemyAcidApplication({...o,...change}),re);
for(const [change,re] of [
 [{d10:0},/d10/],[{d10:11},/d10/],[{d10:5.4},/d10/],
 [{origin:'invented'},/původ/],[{gmConfirmed:false},/GM/],
 [{continuousContactConfirmed:false},/GM/],[{applicationId:'not-there'},/aplikace/],
 [{campaignId:'wrong'},/aplikace/]
])no(()=>Acid.createAlchemyAcidRound({journal:[...f.journal,j.find(x=>x.id==='apply')],campaignId:'C',minute:f.minute,
 applicationId:'apply',d10:1,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true,...change}),re);
for(const [material,count] of Object.entries({wood:5,metal:7,stone:9})){
 const a=Acid.createAlchemyAcidApplication({...o,material});eq(a.destroyAtSuccesses,count);
}
// The original 30-day stored decay is never touched; applied Acid is immediately dispersed.
const old=D.alchemyElixirStrength(f.journal,'C',f.finishId,f.minute);eq(old.currentAS,f.base);
const applied=D.alchemyElixirStrength(j,'C',f.finishId,f.minute);eq(applied.dispersed,true);eq(applied.nextDueMinute,null);
// Do not accept pending Decay as fresh Acid regardless of a valid original bottle.
no(()=>Acid.createAlchemyAcidApplication({...o,minute:f.minute+30*1440}),/Decay/);
const chest=structuredClone(f);chest.inventory[1].slot='chest';
no(()=>Acid.createAlchemyAcidApplication({...o,inventory:chest.inventory}),/truhlici/);
const split=structuredClone(f);split.inventory[1].quantity=2;
no(()=>Acid.createAlchemyAcidApplication({...o,inventory:split.inventory}),/inventární/);
const H=require('../src/integration/hmk-calendar-history.js');
const history=H.historicalHMKCalendarEntries({campaignId:'C',minute:f.minute,characterIds:['A'],events:[]},[{id:'A',name:'Alchemist'}],j);
const arow=history.find(x=>x.kind==='alchemy-acid-application');yes(!!arow);yes(arow.note.includes('object1'));
const hround=history.filter(x=>x.kind==='alchemy-acid-round');eq(hround.length,stat.rounds);yes(hround[0].note.includes('d10'));
console.log('Alchemy applied Acid 434:',n,'assertions passed');
