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




const m={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
function itemFromArticle(a,id,layerOrder,layerSlot){const sid='hmk:armour:p118:verified:'+a.id;return{id,characterId:'B',quantity:1,slot:'worn',layerOrder,layerSlot,sourceItemId:sid,
 snapshot:{id:sid,name:a.name,category:'armor',properties:{coverageVerified:true,material:m[a.material],weightLb:a.weightLb,coveredLocations:a.coveredLocations,
 locationProtection:Object.fromEntries(a.coveredLocations.map(loc=>[loc,Object.fromEntries(['b','e','p','f'].map(k=>[k,locationArmourValue({layers:[{material:a.material}],zone:loc,aspect:k}).av]))])),
 coverageMarkers:a.coverageMarkers,directionRestriction:a.directionRestriction,rigid:a.rigid,layerZoneByLocation:a.layerZoneByLocation}}};}
const shirt=PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id==='hmk118-cloth-shirt');
const cuirass=PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id==='hmk118-kurbul-cuirass');
const cloth=itemFromArticle(shirt,'shirt',0,undefined),rigid=itemFromArticle(cuirass,'plate',1,'base');

for(let aspect of ['b','e','p','f']){
 const before=Live.resolveLiveCombatArmour({inventory:[cloth,rigid],targetId:'B',location:'tx',aspect,direction:'front',mode:'custom'});
 yes(before.ready);
 const clone=structuredClone(cloth);clone.acidAVDamageByLocation={tx:1};
 const after=Live.resolveLiveCombatArmour({inventory:[clone,rigid],targetId:'B',location:'tx',aspect,direction:'front',mode:'custom'});
 yes(after.ready);eq(after.armourValue,before.armourValue-(aspect==='e'||aspect==='f'?1:0));
}
const initial=Live.resolveLiveCombatArmour({inventory:[cloth,rigid],targetId:'B',location:'ab',aspect:'f',direction:'front',mode:'custom'});
const damaged=structuredClone(cloth);damaged.acidAVDamageByLocation={tx:1};
const unaffected=Live.resolveLiveCombatArmour({inventory:[damaged,rigid],targetId:'B',location:'ab',aspect:'f',direction:'front',mode:'custom'});
yes(initial.ready&&unaffected.ready);eq(initial.armourValue,unaffected.armourValue);
const article=PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id==='hmk118-cloth-cloak');
const cloak=itemFromArticle(article,'cloak',0,undefined);
const front=Live.resolveLiveCombatArmour({inventory:[cloak],targetId:'B',location:'tx',aspect:'f',direction:'front',directionalContext:{opponents:1,d10:5}});
const rear=Live.resolveLiveCombatArmour({inventory:[cloak],targetId:'B',location:'tx',aspect:'f',direction:'rear',directionalContext:{opponents:1,d10:5}});
yes(front.ready&&rear.ready);eq(front.armourValue,0);yes(rear.armourValue>0);
const old=structuredClone(cloak);old.acidAVDamageByLocation={tx:1};
const rear2=Live.resolveLiveCombatArmour({inventory:[old],targetId:'B',location:'tx',aspect:'f',direction:'rear',directionalContext:{opponents:1,d10:5}});
yes(rear2.ready);eq(rear2.armourValue,rear.armourValue-1);
console.log('PASS Acid layered clothing',n,'assertions');
