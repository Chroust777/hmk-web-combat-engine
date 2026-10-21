'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createWeaponPoisonResistance:make,pendingWeaponPoisonResistance:pending,
 validateWeaponPoisonResistanceJournal:validate,assertWeaponPoisonResistanceAppendOnly:append,
 requireWeaponPoisonResistanceRoundMayAdvance:roundGuard,requireWeaponPoisonResistanceGMTimeMayAdvance:clockGuard}=require('../src/integration/hmk-herbal-weapon-resistance.js');
const {historicalHMKCalendarEntries:history}=require('../src/integration/hmk-calendar-history.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=a=>{assert.ok(a);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const campaign='camp-A',patient='patient-A';
const hit={id:'hit-proof-001',characterId:patient,calendarCampaignId:campaign,campaignMinute:11,
 calendarHerbWeaponPasteHit:{format:'hmk-herbal-weapon-paste-hit-v1',campaignId:campaign,minute:11,
  pasteId:'paste-0001',completeId:'potion-001',actorId:'attacker',targetId:patient,
  weaponItemId:'weapon-001',hitEventId:'confirmed-hit-001',woundId:'wound-001',
  timelineId:'combat-001',round:10,aspect:'e',location:'ua',injury:'S3',resistanceModifier:20}};
const base=[hit];const args={journal:base,campaignId:campaign,minute:11,hitProofId:hit.id,targetId:patient,
 timelineId:'combat-001',round:10,baseEML:46,basis:'GM Resistance baseline from encounter reference',d100:61,gmConfirmed:true};
const proof=make(args);eq(proof.rawEML,66);eq(proof.eml,66);eq(proof.resistanceModifier,20);
eq(proof.sl,'S');eq(proof.resisted,true);eq(proof.medicalDisposition,'RESISTED_NO_COURSE');
eq(proof.woundId,'wound-001');eq(proof.hitEventId,'confirmed-hit-001');eq(proof.hitProofId,hit.id);
eq(proof.basis,args.basis);eq(proof.d100,61);eq(proof.gmConfirmed,true);
let row={id:'resistance-001',characterId:patient,calendarCampaignId:campaign,campaignMinute:11,calendarHerbWeaponResistance:proof};
eq(pending(base,campaign).length,1);eq(pending([...base,row],campaign).length,0);
bad(()=>roundGuard({journal:base,campaignId:campaign,timelineId:'combat-001',currentRound:10,nextRound:11}),/přeskočit/);
bad(()=>roundGuard({journal:base,campaignId:campaign,timelineId:'combat-001',currentRound:10,nextRound:20}),/přeskočit/);
eq(roundGuard({journal:base,campaignId:campaign,timelineId:'combat-001',currentRound:9,nextRound:10}),true);
eq(roundGuard({journal:[...base,row],campaignId:campaign,timelineId:'combat-001',currentRound:10,nextRound:11}),true);
eq(roundGuard({journal:base,campaignId:campaign,timelineId:'combat-B',currentRound:10,nextRound:11}),true);
bad(()=>clockGuard({journal:base,campaignId:campaign,beforeMinute:11,afterMinute:12}),/GM čas/);
eq(clockGuard({journal:base,campaignId:campaign,beforeMinute:11,afterMinute:11}),true);
eq(clockGuard({journal:[...base,row],campaignId:campaign,beforeMinute:11,afterMinute:12}),true);
eq(clockGuard({journal:base,campaignId:'camp-B',beforeMinute:11,afterMinute:12}),true);
eq(pending(base,'other').length,0);eq(validate([...base,row]),true);eq(append([...base,row],[...base,row,{id:'new'}]),true);
bad(()=>make({...args,journal:[...base,row]}),/již existuje/);
for(const [d,sl,resisted] of [[5,'CS',true],[11,'S',true],[67,'F',false],[70,'CF',false],[99,'F',false],[100,'CF',false]]){
 const p=make({...args,d100:d});eq(p.sl,sl);eq(p.resisted,resisted);eq(p.medicalDisposition,resisted?'RESISTED_NO_COURSE':'FAILED_PENDING_GM_POISON_COURSE');
}
for(const [basisEML,raw,eml] of [[-120,-100,5],[0,20,20],[75,95,95],[100,120,95],[300,320,95]]){
 const p=make({...args,baseEML:basisEML});eq(p.rawEML,raw);eq(p.eml,eml);
}
for(const changes of [{gmConfirmed:false},{campaignId:'camp-B'},{targetId:'patient-B'},{minute:10},
 {hitProofId:'missing'},{timelineId:'other-timeline'},{round:11},{minute:12},{baseEML:301},{baseEML:1.5},{baseEML:-201},{d100:0},{d100:101},
 {d100:NaN},{basis:'GM'},{basis:'x'.repeat(401)}])bad(()=>make({...args,...changes}),/Poison Resistance/);
const mutatedHit=structuredClone(hit);mutatedHit.calendarHerbWeaponPasteHit.resistanceModifier=30;
bad(()=>make({...args,journal:[mutatedHit]}),/Poison Resistance/);
const broken=structuredClone([...base,row]);broken[1].calendarHerbWeaponResistance.eml=95;
bad(()=>validate(broken),/pozměněný/);bad(()=>append([...base,row],broken),/historický/);
for(const changed of [p=>p.d100=50,p=>p.baseEML=99,p=>p.resisted=false,p=>p.sl='CF',p=>p.woundId='wrong',p=>p.medicalDisposition='SOMETHING',p=>p.hitProofId='other']){
 const j=structuredClone([...base,row]);changed(j[1].calendarHerbWeaponResistance);bad(()=>validate(j),/Poison Resistance/);
}
bad(()=>append([...base,row],[...base]),/historický/);
const duplicate={...row,id:'resistance-002'};bad(()=>validate([...base,row,duplicate]),/již existuje/);
const other={...hit,id:'hit-proof-002',calendarCampaignId:'camp-B',calendarHerbWeaponPasteHit:{...hit.calendarHerbWeaponPasteHit,campaignId:'camp-B'}};
const combined=[...base,row,other];eq(pending(combined,'camp-B').length,1);eq(pending(combined,campaign).length,0);
const clock={format:'hmk-campaign-calendar-v1',campaignId:campaign,minute:12,characterIds:[patient],anchors:[],events:[]};
const hist=history(clock,[{id:patient,name:'Patient'}],[...base,row]);
ok(hist.some(x=>x.kind==='herb-weapon-poison-resistance'&&x.note.includes('61')&&x.note.includes('+20')));
const fail=make({...args,d100:88}),failedRow={...row,id:'resistance-003',calendarHerbWeaponResistance:fail};
eq(validate([hit,failedRow]),true);ok(history(clock,[{id:patient,name:'Patient'}],[hit,failedRow]).some(x=>x.note.includes('Neúspěch')));
console.log('PASS',n,'weapon-poison Resistance p75: +20, GM-attested EML, real d100, no invented Poison Course, immutable provenance');
