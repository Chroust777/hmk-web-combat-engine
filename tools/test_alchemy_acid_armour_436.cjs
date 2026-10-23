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



const f=prepared('Acid','av');
const article=PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id==='hmk118-kurbul-cuirass');
const m={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const sourceItemId='hmk:armour:p118:verified:'+article.id;
const protection=Object.fromEntries(article.coveredLocations.map(loc=>[loc,Object.fromEntries(['b','e','p','f'].map(aspect=>[aspect,locationArmourValue({layers:[{material:article.material}],zone:loc,aspect}).av]))]));
const armour={id:'actualCuirass',characterId:'B',quantity:1,slot:'worn',sourceItemId,
 layerOrder:0,acidAVDamageByLocation:{tx:0},
 snapshot:{id:sourceItemId,name:article.name,category:'armor',properties:{coverageVerified:true,material:m[article.material],
  coveredLocations:article.coveredLocations,locationProtection:protection,coverageMarkers:article.coverageMarkers,
  directionRestriction:article.directionRestriction,rigid:article.rigid,layerZoneByLocation:article.layerZoneByLocation,weightLb:article.weightLb}}};
f.inventory.push(armour);
const before=Live.resolveLiveCombatArmour({inventory:f.inventory,targetId:'B',location:'tx',aspect:'b',direction:'front'});
yes(before.ready);yes(before.armourValue>0);eq(AA.acidArmourMaximumAV(armour,'tx'),Math.max(...Object.values(protection.tx)));
const opts={journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,
 targetItemId:armour.id,targetLocation:'tx',armourConfirmed:true,contactConfirmed:true,gmConfirmed:true};
const applied=AA.createAcidArmourApplication(opts);eq(applied.initialDamage,0);eq(applied.noImbibingRoll,true);eq(applied.profusionExempt,true);
no(()=>AA.createAcidArmourApplication({...opts,armourConfirmed:false}),/GM/);
no(()=>AA.createAcidArmourApplication({...opts,targetItemId:'invalid'}),/zbroje/);
no(()=>AA.createAcidArmourApplication({...opts,targetItemId:'vialav'}),/zbroje/);
no(()=>AA.createAcidArmourApplication({...opts,minute:f.minute-1}),/Acid|Decay/);
const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,reason:'Acid applied to armour',confirmedByGM:true});
let j=[...f.journal,{...row('aav',f.minute,'A','calendarAlchemyAcidArmourApply',applied),calendarAlchemyVialEmpty:empty}];
yes(AA.validateAcidArmourJournal(j));yes(AA.validateAcidArmourInventory({journal:j,inventory:f.inventory}));
no(()=>AA.createAcidArmourApplication({...opts,journal:j}),/Acid/);
let st=AA.acidArmourState(j,'C','aav',f.minute);eq(st.damage,0);eq(st.as,f.base);
function round(d10){const proof=AA.createAcidArmourRound({journal:j,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'aav',
 d10,origin:'manual',continuousContactConfirmed:true,gmConfirmed:true});armour.acidAVDamageByLocation={...armour.acidAVDamageByLocation,[proof.targetLocation]:proof.damageAfter};
 j.push(row('ar'+proof.round,f.minute,'A','calendarAlchemyAcidArmourRound',proof));return proof;}
no(()=>AA.createAcidArmourRound({journal:j,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'aav',d10:0,origin:'manual',continuousContactConfirmed:true,gmConfirmed:true}),/d10/);
no(()=>AA.createAcidArmourRound({journal:j,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'aav',d10:1,origin:'manual',continuousContactConfirmed:true}),/GM/);
const r1=round(1);eq(r1.damageAfter,1);eq(r1.asAfter,f.base-1);yes(AA.validateAcidArmourJournal(j));yes(AA.validateAcidArmourInventory({journal:j,inventory:f.inventory}));
const after=Live.resolveLiveCombatArmour({inventory:f.inventory,targetId:'B',location:'tx',aspect:'b',direction:'front'});
yes(after.ready);eq(after.armourValue,before.armourValue-1);eq(after.acidAVReduction,1);eq(after.armourValueBeforeAcid,before.armourValue);
const otherZone=Live.resolveLiveCombatArmour({inventory:f.inventory,targetId:'B',location:'ab',aspect:'b',direction:'front'});yes(otherZone.ready);eq(otherZone.armourValue,before.armourValue);
const uncovered=Live.resolveLiveCombatArmour({inventory:f.inventory,targetId:'B',location:'sk',aspect:'b',direction:'front'});yes(uncovered.ready);eq(uncovered.armourValue,0);
const originalSnapshot=JSON.stringify(armour.snapshot);round(10);eq(armour.acidAVDamageByLocation.tx,1);
const tampered=structuredClone(j);tampered.at(-1).calendarAlchemyAcidArmourRound.d10=1;
no(()=>AA.validateAcidArmourJournal(tampered),/poškozený|neplatné/);
no(()=>AA.assertAcidArmourAppendOnly(j,tampered),/neměnný/);
no(()=>AA.validateAcidArmourInventory({journal:j,inventory:[{...armour,acidAVDamageByLocation:{tx:0}}]}),/nesouhlasí/);
no(()=>AA.createAcidArmourRound({journal:j,inventory:[{...armour,acidAVDamageByLocation:{tx:0}}],campaignId:'C',minute:f.minute,applicationId:'aav',d10:1,origin:'manual',continuousContactConfirmed:true,gmConfirmed:true}),/liší/);
eq(JSON.stringify(armour.snapshot),originalSnapshot);
// Unbacked damage must never be injected directly into inventory: it would
// otherwise lower live combat AV without a genuine alchemy application.
no(()=>AA.validateAcidArmourInventory({journal:f.journal,inventory:[{...armour,acidAVDamageByLocation:{tx:1}}]}),/důkazu/);
no(()=>AA.validateAcidArmourInventory({journal:j,inventory:[{...armour,acidAVDamageByLocation:{tx:1,ab:7}}]}),/nesouhlasí/);
const forged=structuredClone(j);forged[forged.length-1].calendarAlchemyAcidArmourRound.targetLocation='ab';
no(()=>AA.validateAcidArmourJournal(forged),/poškozený|neplatné|změněný/);

const history=History.historicalHMKCalendarEntries({campaignId:'C',minute:f.minute,characterIds:['A','B']},
 [{id:'A',name:'Alchemist'},{id:'B',name:'Recipient'}],j);
const hr=history.filter(x=>x.kind==='alchemy-acid-armour-round');eq(hr.length,2);
yes(hr.some(x=>x.note.includes('tx')&&x.note.includes('d10')));
// GM reference must never suppress damage on an actually worn armour piece.
const ref=Live.resolveLiveCombatArmour({inventory:f.inventory,targetId:'B',location:'tx',aspect:'b',direction:'front',mode:'reference',suitName:'unknown'});
eq(ref.ready,false);
// Armour entry is distinct from the legacy six-inch generic-object workflow.
no(()=>Acid.createAlchemyAcidApplication({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,targetItemId:armour.id,
 material:'metal',sixInchConfirmed:true,objectConfirmed:true,accessConfirmed:true,gmConfirmed:true}),/předmět/);
console.log('PASS Acid armour AV 436:',n,'assertions');
