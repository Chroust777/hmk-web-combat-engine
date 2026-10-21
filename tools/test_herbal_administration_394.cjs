'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration,validateHerbAdministrationJournal,assertHerbAdministrationAppendOnly,availableHerbalPotions,herbPotionStageBonus,herbPotionEffectAt,herbPotionRuleConsequence}=require('../src/integration/hmk-herbal-administration.js');
const {EXOTIC_POTIONS}=require('../src/integration/hmk-herbal-concoctions.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
const {assertGMOnlyCampaignTime}=require('../src/integration/hmk-gm-clock-authority.js');
let n=0;const ok=x=>{assert.ok(x);n++},eq=(a,b)=>{assert.deepEqual(a,b);n++},no=(f,re)=>{assert.throws(f,re);n++};
const c='A',actor='healer',target='patient',minute=10,at=20;
const row=(id,person,m,kind,proof)=>({id,characterId:person,calendarCampaignId:c,campaignMinute:m,[kind]:proof});
const make=(type,potency=3,sv=6,usable=true)=>row('complete-'+type,actor,minute,'calendarHerbPotionComplete',
 {format:'hmk-herb-potion-complete-v1',campaignId:c,minute,actorId:actor,herbType:type,potency,sv,usable,expiryMinute:14400});
for(const type of EXOTIC_POTIONS){
 const source=make(type),j=[source],w=['curative','coagulant'].includes(type)?'wound1':'';
 const method=type==='aromatic'?'perfume':w?'poultice':'ingested';
 const options={journal:j,campaignId:c,minute:at,actorId:actor,completeId:source.id,targetId:target,method,woundId:w,memberIds:[actor,target],gmConfirmed:true,
  ...(type==='emetic'?{emeticOnsetD6:3,emeticOnsetOrigin:'manual',combatAnchor:{confirmedByGM:true,round:17,campaignMinute:at,timelineId:'combat-A'}}:{})};
 const p=createHerbPotionAdministration(options);eq(p.bonus,24);eq(p.herbType,type);eq(p.applicationStatus,'APPLIED_NO_AUTOMATIC_HEALTH_ROLL');
 const admin=row('admin-'+type,actor,at,'calendarHerbPotionAdminister',p);
 const together=[...j,admin];eq(validateHerbAdministrationJournal(together),true);
 eq(availableHerbalPotions(together,c,at).length,0);
 no(()=>createHerbPotionAdministration({...options,journal:together}),/již byl podán/);
 const altered=structuredClone(together);altered[1].calendarHerbPotionAdminister.bonus=55;
 no(()=>validateHerbAdministrationJournal(altered),/neodpovídá/);
 no(()=>assertHerbAdministrationAppendOnly(together,j),/nelze změnit/);
 no(()=>createHerbPotionAdministration({...options,minute:14400}),/prošlý/);
 no(()=>createHerbPotionAdministration({...options,gmConfirmed:false}),/GM/);
 no(()=>createHerbPotionAdministration({...options,memberIds:[actor]}),/členem/);
 no(()=>createHerbPotionAdministration({...options,campaignId:'B'}),/kampaň|Lektvar/);
 no(()=>createHerbPotionAdministration({...options,actorId:target}),/nepatří/);
 no(()=>createHerbPotionAdministration({...options,method:'weapon-paste'}),/metoda/);
 no(()=>createHerbPotionAdministration({...options,minute:9}),/nebyl vyroben/);
 if(w)no(()=>createHerbPotionAdministration({...options,woundId:''}),/ránu/);
 const clock={format:'hmk-campaign-calendar-v1',campaignId:c,minute:at,characterIds:[actor,target]};
 const history=historicalHMKCalendarEntries(clock,[{id:actor,name:'Herbalist'},{id:target,name:'Victim'}],together);
 ok(history.some(e=>e.kind==='herb-potion-administer'));
 const past={campaignClock:{format:'hmk-campaign-calendar-v1',campaignId:c,minute:at}};
 eq(assertGMOnlyCampaignTime(structuredClone(past),past),true);
}
for(const potency of [1,2,3]){
 eq(herbPotionStageBonus(7,potency),[0,7,14,28][potency]);
 for(const type of ['aphrodisiac','aromatic','coagulant','narcotic','stimulant']){
  const schedule=herbPotionRuleConsequence({type,potency,sv:7,minute:20});
  const app={format:'hmk-herb-potion-application-v1',minute:20,herbType:type,potency,sv:7,bonus:schedule.bonus};
  const period=schedule.schedule.longevityMinutesPerStage;
  eq(herbPotionEffectAt(app,20).bonus,schedule.bonus);
  eq(herbPotionEffectAt(app,20+period).stage,potency-1);
  eq(herbPotionEffectAt(app,20+period*potency).bonus,0);
 }
}
for(const type of ['antivenin','emetic','hallucinogenic','paralytic','poison','soporific']){
 const rule=herbPotionRuleConsequence({type,potency:3,sv:7,minute:20});eq(rule.externalRollResolved,false);ok(rule.rule.kind);
}
const ingest=make('stimulant');
no(()=>createHerbPotionAdministration({journal:[ingest],campaignId:c,minute:at,actorId:actor,completeId:ingest.id,targetId:target,method:'ingested',memberIds:[actor,target],gmConfirmed:false}),/GM/);
const broken=[make('stimulant'),row('bad',actor,at,'calendarHerbPotionAdminister',{format:'hmk-herb-potion-application-v1'})];
no(()=>validateHerbAdministrationJournal(broken),/původu/);
console.log('PASS',n,'herbal application, all 12 categories, campaigns, replay, expiry, stage down, GM clock');
