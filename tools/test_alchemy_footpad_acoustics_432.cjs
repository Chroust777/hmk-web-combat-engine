'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),F=require('../src/integration/hmk-alchemy-footpad-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++},yes=x=>{assert.ok(x);tests++},no=(f,r)=>{assert.throws(f,r);tests++};
function row(id,minute,actor,key,value,campaign='C'){return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,title:id,body:id,[key]:value}}
function fixture(name='Footpad',actor='A',vial='vial1',campaign='C'){
 const start=A.createAlchemyStart({campaignId:campaign,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 let journal=[row('start'+vial,0,actor,'calendarAlchemyStart',start,campaign),row('skill'+vial,start.dueMinute,actor,'skillTestProof',skill,campaign)];
 const n=Math.max(0,Math.min(5,result.sv-4));
 const finish=A.createAlchemyFinish({journal,campaignId:campaign,minute:start.dueMinute,actorId:actor,startId:'start'+vial,skillId:'skill'+vial,gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 const finishId='finish'+vial;journal.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finish,campaign));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const bind=V.createAlchemyVialBinding({journal,inventory,campaignId:campaign,minute:start.dueMinute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 journal.push(row('bind'+vial,start.dueMinute,actor,'calendarAlchemyVialBinding',bind,campaign));
 return {journal,inventory,minute:start.dueMinute,campaign,finishId,actor,base:finish.baseAS};
}
function drink(a,roll=42,target='B'){
 const opts={journal:a.journal,inventory:a.inventory,campaignId:a.campaign,minute:a.minute,actorId:a.actor,targetId:target,finishId:a.finishId,testSkill:'Aura',ml:80,d100:roll,origin:'manual',emptyId:'empty'+a.finishId,gmConfirmed:true};
 const proof=I.createAlchemyFootpadImbibing(opts);
 const empty=V.createAlchemyVialEmpty({journal:a.journal,inventory:a.inventory,campaignId:a.campaign,minute:a.minute,actorId:a.actor,finishId:a.finishId,reason:'Footpad swallowed',confirmedByGM:true});
 const journal=[...a.journal,row(opts.emptyId,a.minute,a.actor,'calendarAlchemyVialEmpty',empty,a.campaign),row('use'+a.finishId,a.minute,a.actor,'calendarAlchemyImbibing',proof,a.campaign)];
 return {journal,proof,opts,useId:'use'+a.finishId};
}

const ACO=require('../src/integration/hmk-alchemy-footpad-acoustics.js');
const a=fixture();const used=drink(a,42,'B');let j=used.journal;
const common={journal:j,campaignId:'C',minute:a.minute,actorId:'B',auralShockLevels:0};
const current=ACO.footpadAcousticState(common);
eq(current.present,true);eq(current.beneficial,true);eq(current.sourceUseIds,[used.useId]);
let speech=ACO.createFootpadAcousticObservation({...common,kind:'ordinary-speech',gmConfirmed:true});
eq(speech.perceived,'whisper');eq(speech.hearingEMLModifier,null);eq(speech.activeAS,a.base);
let loud=ACO.createFootpadAcousticObservation({...common,kind:'shouting',gmConfirmed:true});eq(loud.perceived,'ordinary-speech');eq(loud.affected,true);
const item=(id,weight,actor='B',slot='carried',quantity=1)=>({id,characterId:actor,slot,quantity,snapshot:{name:'Test '+id,properties:{weightLb:weight}}});
const inventory=[item('blade',10),item('shield',15),item('extra',0.5),item('chest',2,'B','chest'),item('other',1,'X'),item('unknown',undefined)];
let near=ACO.createFootpadAcousticObservation({...common,inventory,kind:'wielded-objects',spiritML:50,itemIds:['blade','shield'],note:'iron collision',gmConfirmed:true});
eq(near.limitLb,25);eq(near.weightLb,25);eq(near.affected,true);eq(near.perceived,'muffled');eq(near.items.map(x=>x.id),['blade','shield']);
let over=ACO.createFootpadAcousticObservation({...common,inventory,kind:'wielded-objects',spiritML:50,itemIds:['blade','shield','extra'],gmConfirmed:true});
eq(over.affected,false);eq(over.perceived,'unmodified');eq(over.weightLb,25.5);
const equipped=ACO.createFootpadAcousticObservation({...common,inventory:[item('sword-in-hand',8,'B','main_hand'),item('shield-in-hand',7,'B','off_hand')],
 kind:'wielded-objects',spiritML:50,itemIds:['sword-in-hand','shield-in-hand'],gmConfirmed:true});
eq(equipped.affected,true);eq(equipped.weightLb,15);eq(equipped.items.map(x=>x.slot),['main_hand','off_hand']);
for(const [args,re] of [
 [{gmConfirmed:false},/GM/],[{kind:'unknown'},/akce/],[{auralShockLevels:1},/pozastaven/],
 [{campaignId:'OTHER'},/nemá doložený/],[{minute:-1},/čas/],
 [{kind:'ordinary-speech',itemIds:['blade']},/řeč/],
 [{kind:'wielded-objects',inventory,itemIds:['blade'],spiritML:null},/Spirit ML/],
 [{kind:'wielded-objects',inventory,itemIds:['blade','blade'],spiritML:50},/odlišné/],
 [{kind:'wielded-objects',inventory,itemIds:['chest'],spiritML:50},/nesený/],
 [{kind:'wielded-objects',inventory,itemIds:['other'],spiritML:50},/nesený/],
 [{kind:'wielded-objects',inventory,itemIds:['unknown'],spiritML:50},/hmotnost/],
 [{kind:'wielded-objects',inventory,itemIds:['nonexistent'],spiritML:50},/nesený/]
])no(()=>ACO.createFootpadAcousticObservation({...common,kind:'ordinary-speech',gmConfirmed:true,...args}),re);
function rowAcoustic(id,proof){return row(id,a.minute,'B','calendarAlchemyFootpadAcoustic',proof)}
let audited=[...j,rowAcoustic('sound1',speech),rowAcoustic('sound2',loud),rowAcoustic('sound3',near)];
eq(ACO.validateFootpadAcousticJournal(audited),true);eq(ACO.assertFootpadAcousticAppendOnly(audited,structuredClone(audited)),true);
const history=require('../src/integration/hmk-calendar-history.js').historicalHMKCalendarEntries(
 {format:'hmk-campaign-calendar-v1',campaignId:'C',minute:a.minute,characterIds:['A','B'],events:[]},
 [{id:'A',name:'Alchemist'},{id:'B',name:'Recipient'}],audited);
const acousticHistory=history.filter(x=>x.kind==='alchemy-footpad-acoustic');
eq(acousticHistory.length,3);yes(acousticHistory.some(x=>x.note.includes('25/25 lb')));
no(()=>ACO.assertFootpadAcousticAppendOnly(audited,audited.slice(0,-1)),/nelze/);
no(()=>ACO.assertFootpadAcousticAppendOnly(audited,[...audited.slice(0,-1),{...audited.at(-1),calendarAlchemyFootpadAcoustic:{...near,weightLb:99}}]),/nelze/);
no(()=>ACO.validateFootpadAcousticJournal([...j,rowAcoustic('tamper',{...near,weightLb:50})]),/přepsaný/);
no(()=>ACO.validateFootpadAcousticJournal([...j,{...rowAcoustic('tamper',speech),calendarCampaignId:'X'}]),/kontext/);
const delayed=a.minute+30*1440;
const dec=D.createAlchemyDecay({journal:j,campaignId:'C',minute:delayed,actorId:'A',finishId:a.finishId,d10:1,origin:'manual',gmConfirmed:true});
const aged=[...j,row('decay',delayed,'A','calendarAlchemyDecay',dec)];
const agedSound=ACO.createFootpadAcousticObservation({...common,journal:aged,minute:delayed,kind:'ordinary-speech',gmConfirmed:true});
eq(agedSound.activeAS,a.base-1);eq(agedSound.perceived,'whisper');
no(()=>ACO.createFootpadAcousticObservation({...common,minute:delayed,journal:j,kind:'ordinary-speech',gmConfirmed:true}),/nemá doložený|Decay/);
const second=fixture('Footpad','X','x1');
const switched=ACO.footpadAcousticState({...common,journal:[...second.journal],campaignId:'C',actorId:'B'});eq(switched.present,false);
console.log('PASS Footpad acoustics 432:',tests,'assertions');
