'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=function(m,file){if(!file.startsWith(path.join(root,'src')+path.sep))return old(m,file);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)};
const A=require('../src/integration/hmk-nutrition-activity.js'),N=require('../src/integration/hmk-nutrition-days.js'),T=require('../src/integration/hmk-gm-clock-authority.js'),C=require('../src/integration/hmk-campaign-calendar.js');
const day=1440;let count=0,seq=0;const id=()=>`d-${++seq}`;
const eq=(x,y,name)=>{assert.deepEqual(x,y,name);count++},ok=(x,name)=>{assert.ok(x,name);count++},bad=(f,rx)=>{assert.throws(f,rx);count++};
const row=(payload,name,actor='hero',camp='A',minute=0)=>({id:name,characterId:actor,calendarCampaignId:camp,campaignMinute:minute,...payload});
function make(camp='A',actor='hero'){
 const policy=N.createNutritionPolicy({campaignId:camp,minute:0,actorId:actor,foragingOnly:true,autoNeeds:true});
 const proof=row({calendarNutritionPolicy:policy},'policy-'+camp+'-'+actor,actor,camp);
 const db={journal:[proof],characters:[{id:actor,name:actor}],inventory:[],campaignClock:{campaignId:camp,minute:0,characterIds:[actor]}};
 return {db,policy:proof};
}
const sample=make();
eq(sample.policy.calendarNutritionPolicy.autoNeeds,true);
bad(()=>N.createNutritionPolicy({campaignId:'A',minute:0,actorId:'hero',foragingOnly:true,autoNeeds:true,foodNeed:0.5}),/výchozí/);
eq(N.createNutritionPolicy({campaignId:'A',minute:0,actorId:'hero',foragingOnly:true}).autoNeeds,undefined);
const def=A.dailyNutritionNeeds({journal:sample.db.journal,campaignId:'A',actorId:'hero',policyId:sample.policy.id,startMinute:0,endMinute:day});
eq([def.foodNeed,def.waterNeed,def.hot,def.completeRest,def.conditionsId],[1,1,false,false,null]);
eq(A.validateNutritionActivityJournal(sample.db.journal),true);
let plan=A.createNutritionDayConditions({journal:sample.db.journal,policyRow:sample.policy,campaignId:'A',actorId:'hero',minute:0,kind:'rest-inactive'});
let planned=row({calendarNutritionConditions:plan},'rest', 'hero','A');sample.db.journal.push(planned);
let need=A.dailyNutritionNeeds({journal:sample.db.journal,campaignId:'A',actorId:'hero',policyId:sample.policy.id,startMinute:0,endMinute:day});
eq([need.foodNeed,need.waterNeed,need.conditionsId,need.completeInactivity],[0.5,0.5,'rest',true]);
bad(()=>A.createNutritionDayConditions({journal:sample.db.journal,policyRow:sample.policy,campaignId:'A',actorId:'hero',minute:0,kind:'hot'}),/již/);
bad(()=>A.createNutritionDayConditions({journal:sample.db.journal,policyRow:sample.policy,campaignId:'B',actorId:'hero',minute:0,kind:'hot'}),/kampani/);
bad(()=>A.createNutritionDayConditions({journal:sample.db.journal,policyRow:sample.policy,campaignId:'A',actorId:'hero',minute:30,kind:'hot'}),/počáteční/);
bad(()=>A.createNutritionDayConditions({journal:sample.db.journal,policyRow:sample.policy,campaignId:'A',actorId:'hero',minute:0,kind:'spare'}),/již|Neznámé/);
// The plan is only prospective – neither creating it nor consuming it moves the clock.
eq(sample.db.campaignClock.minute,0);
let travel=row({calendarActivityProof:{plan:{kind:'travel'},startMinute:120,endMinute:360}},'walk','hero','A',120);
bad(()=>A.dailyNutritionNeeds({journal:[...sample.db.journal,travel],campaignId:'A',actorId:'hero',policyId:sample.policy.id,startMinute:0,endMinute:day}),/rozporu/);
bad(()=>A.validateNutritionActivityJournal([...sample.db.journal,travel]),/odpočinku/);
let cancel=A.createNutritionConditionsCancel({journal:sample.db.journal,planRow:planned,campaignId:'A',actorId:'hero',minute:60,reason:'Změna plánu na výpravu'});
const cancellation=row({calendarNutritionConditionsCancel:cancel},'cancel','hero','A',60);
sample.db.journal.push(cancellation,travel);
eq(A.validateNutritionActivityJournal(sample.db.journal),true);
need=A.dailyNutritionNeeds({journal:sample.db.journal,campaignId:'A',actorId:'hero',policyId:sample.policy.id,startMinute:0,endMinute:day});
eq([need.foodNeed,need.waterNeed,need.conditionsId],[1,1,null]);
bad(()=>A.createNutritionConditionsCancel({journal:sample.db.journal,planRow:planned,campaignId:'A',actorId:'hero',minute:61,reason:'Repeated cancel'}),/již zrušen/);
bad(()=>A.createNutritionConditionsCancel({journal:sample.db.journal,planRow:planned,campaignId:'B',actorId:'hero',minute:60,reason:'Fake cancel'}),/cizí/);
bad(()=>A.createNutritionConditionsCancel({journal:sample.db.journal,planRow:planned,campaignId:'A',actorId:'hero',minute:day,reason:'Too late'}),/koncem/);
bad(()=>A.assertNutritionActivityAppendOnly(sample.db.journal,sample.db.journal.filter(x=>x.id!=='rest')),/nelze/);
const two=make('B');
eq(A.dailyNutritionNeeds({journal:[...sample.db.journal,...two.db.journal],campaignId:'B',actorId:'hero',policyId:two.policy.id,startMinute:0,endMinute:day}).foodNeed,1);
// Real printed Weather Hazard generated from a watch, not from a guessed climate.
const trek=row({calendarTrekProof:{weatherWatch:{hazard:'heat'},partyModes:{memberIds:['hero','companion']}}},'heatwatch','guide','A',0);
const hotNeeds=A.dailyNutritionNeeds({journal:[...two.db.journal,trek],campaignId:'A',actorId:'hero',policyId:'unused',startMinute:0,endMinute:day});
eq([hotNeeds.waterNeed,hotNeeds.heatWatchIds],[2,['heatwatch']]);
eq(A.dailyNutritionNeeds({journal:[...two.db.journal,trek],campaignId:'B',actorId:'hero',policyId:two.policy.id,startMinute:0,endMinute:day}).waterNeed,1);
eq(A.dailyNutritionNeeds({journal:[trek],campaignId:'A',actorId:'outsider',policyId:'unused',startMinute:0,endMinute:day}).waterNeed,1);
const restHot=make('C');
let restProof=A.createNutritionDayConditions({journal:restHot.db.journal,policyRow:restHot.policy,campaignId:'C',actorId:'hero',minute:0,kind:'rest-hot'});
restHot.db.journal.push(row({calendarNutritionConditions:restProof},'restHot','hero','C'));
let rh=A.dailyNutritionNeeds({journal:restHot.db.journal,campaignId:'C',actorId:'hero',policyId:restHot.policy.id,startMinute:0,endMinute:day});
eq([rh.foodNeed,rh.waterNeed],[0.5,2]);
let conflict=make('D');let inc=A.createNutritionDayConditions({journal:conflict.db.journal,policyRow:conflict.policy,campaignId:'D',actorId:'hero',minute:0,kind:'inactive'});
conflict.db.journal.push(row({calendarNutritionConditions:inc},'inact','hero','D'));
bad(()=>A.dailyNutritionNeeds({journal:[...conflict.db.journal,{...trek,calendarCampaignId:'D',calendarTrekProof:{weatherWatch:{hazard:'heat'},partyModes:{memberIds:['hero']}}}],campaignId:'D',actorId:'hero',policyId:conflict.policy.id,startMinute:0,endMinute:day}),/rozporu|rozhodnutí/);
// Iterate verified GM clock advances and deterministic day receipts.
const test=make('Z');const app=test.db;app.campaignClock=C.createCampaignCalendar({day:1,hour:0,minute:0,label:'Test',eventId:'initial',gmConfirmed:true,campaignId:'Z',characterIds:['hero']});const create=kind=>{
 const p=A.createNutritionDayConditions({journal:app.journal,policyRow:test.policy,campaignId:'Z',actorId:'hero',minute:app.campaignClock.minute,kind});
 app.journal.push(row({calendarNutritionConditions:p},id(),'hero','Z',app.campaignClock.minute));
};
const tick=()=>{const before=structuredClone(app.campaignClock);app.campaignClock=C.advanceCampaignCalendar(app.campaignClock,{deltaMinutes:day,eventId:'gm-'+(app.campaignClock.events.length),reason:'GM confirmed elapsed day',gmConfirmed:true});ok(T.assertGMOnlyCampaignTime({campaignClock:before},{campaignClock:app.campaignClock},{gmClockAdvance:true}));
 const r=N.finishDueNutritionDays(app,{idFactory:id,stamp:()=>''});eq(r.length,1);ok(N.validateNutritionJournal(app.journal));ok(A.validateNutritionActivityJournal(app.journal));return r[0].calendarNutritionDay;};
create('rest-inactive');let d=tick();eq([d.foodNeed,d.waterNeed,d.foodReceived,d.activityNeeds.completeRest],[0.5,0.5,0,true]);
eq(N.finishDueNutritionDays(app,{idFactory:id,stamp:()=>''}).length,0);
d=tick();eq([d.foodNeed,d.waterNeed,d.activityNeeds.conditionsId],[1,1,null]);
create('hot');d=tick();eq([d.foodNeed,d.waterNeed,d.activityNeeds.hot],[1,2,true]);
create('rest-hot');d=tick();eq([d.foodNeed,d.waterNeed,d.activityNeeds.completeRest],[0.5,2,true]);
eq(app.campaignClock.minute,4*day);
// Completion replay cannot be falsified by changing the scheduled need.
const altered=app.journal.map(x=>structuredClone(x));altered.find(x=>x.calendarNutritionDay).calendarNutritionDay.waterNeed=1;
bad(()=>N.validateNutritionJournal(altered),/Neplatná|neodpovídá/);
// Complete inactivity must not survive real combat during the attested day.
const clash=make('fight');const cp=A.createNutritionDayConditions({journal:clash.db.journal,policyRow:clash.policy,campaignId:'fight',actorId:'hero',minute:0,kind:'rest-inactive'});
clash.db.journal.push(row({calendarNutritionConditions:cp},'fullrest','hero','fight'));
const battle=row({combatProof:{actionKind:'melee'}},'battle','hero','fight',90);
bad(()=>A.validateNutritionActivityJournal([...clash.db.journal,battle]),/odpočinku/);
// No retroactive rewriting of an already closed interval via backdated plans.
const oldClosed=make('closed');
oldClosed.db.journal.push(row({calendarNutritionDay:{format:'hmk-nutrition-day-v1',policyId:oldClosed.policy.id,startMinute:0,endMinute:day}},'closedDay','hero','closed',day));
const backdated=A.createNutritionDayConditions({journal:oldClosed.db.journal.filter(x=>x.id!=='closedDay'),policyRow:oldClosed.policy,campaignId:'closed',actorId:'hero',minute:0,kind:'rest'});
bad(()=>A.validateNutritionActivityJournal([...oldClosed.db.journal,row({calendarNutritionConditions:backdated},'late','hero','closed')]),/uzavřený/);
console.log('PASS:',count,'daily activity / heat / campaign / GM-time checks');
