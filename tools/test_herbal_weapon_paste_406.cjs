'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbWeaponPaste,createHerbWeaponPasteHit,createHerbWeaponPasteDiscard,pendingWeaponPoisonPastes,
 validateHerbWeaponPasteJournal,assertHerbWeaponPasteAppendOnly,assertActiveHerbWeaponPastes}=require('../src/integration/hmk-herbal-weapon-paste.js');
const {availableHerbalPotions,createHerbPotionAdministration}=require('../src/integration/hmk-herbal-administration.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},yes=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const camp='camp-P',maker='maker-A',target='target-B',weaponId='blade-0001',completeId='potion-0001',timeline='combat-00001',minute=3;
const made={id:completeId,characterId:maker,calendarCampaignId:camp,campaignMinute:1,
 calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:camp,minute:1,actorId:maker,
 herbType:'poison',potency:2,sv:8,usable:true,expiryMinute:10000}};
const weapon={id:weaponId,characterId:maker,quantity:1,slot:'main_hand',sourceItemId:'hmk:blade',snapshot:{category:'weapon',name:'Sword'}};
let base=[made];const paste=createHerbWeaponPaste({journal:base,inventory:[weapon],campaignId:camp,minute,actorId:maker,completeId,
 weaponItemId:weaponId,timelineId:timeline,round:10,gmConfirmed:true});
eq(paste.sv,8);eq(paste.resistanceModifier,20);eq(paste.outcome,'COATED_AWAITING_VERIFIED_INJURING_HIT');
let applied={id:'paste-event-01',characterId:maker,calendarCampaignId:camp,campaignMinute:minute,calendarHerbWeaponPaste:paste};
const coated=[made,applied];eq(validateHerbWeaponPasteJournal(coated),true);
eq(availableHerbalPotions(coated,camp,minute).length,0);
bad(()=>createHerbPotionAdministration({journal:coated,campaignId:camp,minute,actorId:maker,completeId,
 targetId:target,method:'ingested',gmConfirmed:true,memberIds:[maker,target]}),/nanesena/);
eq(pendingWeaponPoisonPastes(coated,camp).length,1);
eq(pendingWeaponPoisonPastes(coated,'other').length,0);
eq(assertActiveHerbWeaponPastes({campaignClock:{campaignId:camp},inventory:[weapon],journal:coated}),true);
for(const changed of [[],[{...weapon,slot:'chest'}],[{...weapon,characterId:target}],[{...weapon,quantity:2}],[{...weapon,sourceItemId:'different-weapon'}],[{...weapon,snapshot:{category:'weapon',name:'Other'}}]])
 bad(()=>assertActiveHerbWeaponPastes({campaignClock:{campaignId:camp},inventory:changed,journal:coated}),/Natřenou zbraň/);
for(const badInput of [{weaponItemId:'fake'}, {round:0},{gmConfirmed:false},{timelineId:''},{actorId:target}])
 bad(()=>createHerbWeaponPaste({journal:base,inventory:[weapon],campaignId:camp,minute,actorId:maker,completeId,
 weaponItemId:weaponId,timelineId:timeline,round:10,gmConfirmed:true,...badInput}),/Poison paste/);
bad(()=>createHerbWeaponPaste({journal:coated,inventory:[weapon],campaignId:camp,minute,actorId:maker,completeId,
 weaponItemId:weaponId,timelineId:timeline,round:10,gmConfirmed:true}),/dvakrát/);
const state=initialCombatState();state.lastRound=12;state.events.push({id:'real-hit-001',type:'confirmed-hit',round:12,details:{targetId:target,
 location:'ua',aspect:'e',kind:'injury',injury:'S3',woundId:'wound:real-hit-001'}});
state.wounds.push({id:'wound:real-hit-001',originEventId:'real-hit-001',recordedRound:12,
 timelineId:timeline,aspect:'e',location:'ua',severity:'S',level:3,bleeding:false,healed:false,
 nextAdvanceRound:null,compoundReviewed:false,shockSL:'S',side:'left',bodyKind:'human'});
yes(validateCombatState(state));
const hitOptions={journal:coated,campaignId:camp,pasteId:applied.id,minute,actorId:maker,targetId:target,
 weaponItemId:weaponId,targetState:state,timelineId:timeline,round:12,hitEventId:'real-hit-001',
 gmConfirmed:true,weaponWitnessConfirmed:true};
const hit=createHerbWeaponPasteHit(hitOptions);
eq(hit.resistanceModifier,20);eq(hit.woundId,'wound:real-hit-001');
eq(hit.medicalDisposition,'PENDING_GM_RESISTANCE_ROLL_AND_POISON_COURSE');
const hitRow={id:'paste-hit-0001',characterId:target,calendarCampaignId:camp,campaignMinute:minute,calendarHerbWeaponPasteHit:hit};
const used=[...coated,hitRow];eq(validateHerbWeaponPasteJournal(used),true);
eq(pendingWeaponPoisonPastes(used,camp).length,0);
eq(assertActiveHerbWeaponPastes({campaignClock:{campaignId:camp},inventory:[],journal:used}),true);
bad(()=>createHerbWeaponPasteHit({...hitOptions,journal:used}),/použita/);
bad(()=>createHerbWeaponPasteHit({...hitOptions,weaponWitnessConfirmed:false}),/potvrzený/);
 const beforeHit=createHerbWeaponPaste({journal:base,inventory:[weapon],campaignId:camp,minute,actorId:maker,completeId,weaponItemId:weaponId,timelineId:timeline,round:10,witnessedHitIds:['real-hit-001'],gmConfirmed:true});
 bad(()=>createHerbWeaponPasteHit({...hitOptions,journal:[made,{...applied,calendarHerbWeaponPaste:beforeHit}]}),/před nanesením/);
bad(()=>createHerbWeaponPasteHit({...hitOptions,timelineId:'other-combat'}),/bojové/);
bad(()=>createHerbWeaponPasteHit({...hitOptions,round:13}),/confirmed-hit|zraňující/);
bad(()=>createHerbWeaponPasteHit({...hitOptions,targetId:maker}),/confirmed-hit|zraňující/);
for(const [prop,value] of [['kind','glancing'],['aspect','b'],['woundId',null]]){
 const s=structuredClone(state);s.events[0].details[prop]=value;
 bad(()=>createHerbWeaponPasteHit({...hitOptions,targetState:s}),/Poison paste/);
}
for(const [prop,value] of [['timelineId','another'],['aspect','b'],['recordedRound',11],['location','tx']]){
 const s=structuredClone(state);s.wounds[0][prop]=value;
 bad(()=>createHerbWeaponPasteHit({...hitOptions,targetState:s}),/Poison paste/);
}
const dis=createHerbWeaponPasteDiscard({journal:coated,campaignId:camp,pasteId:applied.id,minute:minute+1,actorId:maker,
 reason:'washed off',gmConfirmed:true});
const discarded=[...coated,{id:'paste-discard-01',characterId:maker,calendarCampaignId:camp,campaignMinute:minute+1,
 calendarHerbWeaponPasteDiscard:dis}];
eq(validateHerbWeaponPasteJournal(discarded),true);eq(pendingWeaponPoisonPastes(discarded,camp).length,0);
bad(()=>createHerbWeaponPasteDiscard({journal:used,campaignId:camp,pasteId:applied.id,minute,actorId:maker,
 reason:'washed off',gmConfirmed:true}),/vyhodnocena/);
bad(()=>createHerbWeaponPasteHit({...hitOptions,journal:discarded}),/vyřazena/);
for(const mutate of [x=>x[1].calendarHerbWeaponPaste.sv=9,x=>x[1].calendarHerbWeaponPaste.weaponItemId='other',
 x=>x[2].calendarHerbWeaponPasteHit.resistanceModifier=40,
 x=>x[2].calendarHerbWeaponPasteHit.hitEventId='fabricated']){
 const changed=structuredClone(used);mutate(changed);
 if(changed[2].calendarHerbWeaponPasteHit.hitEventId!=='fabricated')bad(()=>validateHerbWeaponPasteJournal(changed),/Poison paste/);
 // Event ID belongs to the originating Combat State; committed journals additionally have append-only CAS guards.
 bad(()=>assertHerbWeaponPasteAppendOnly(used,changed),/historický/);
}
bad(()=>assertHerbWeaponPasteAppendOnly(used,coated),/historický/);
eq(assertHerbWeaponPasteAppendOnly(used,[...used,{id:'new-other'}]),true);
const clock={format:'hmk-campaign-calendar-v1',campaignId:camp,minute:4,characterIds:[maker,target],anchors:[],events:[]};
const history=historicalHMKCalendarEntries(clock,[{id:maker,name:'Maker'},{id:target,name:'Target'}],used);
yes(history.some(x=>x.kind==='herb-weapon-poison-paste'));
yes(history.some(x=>x.kind==='herb-weapon-poison-hit'&&x.note.includes('+20')));
for(const potency of [1,2,3]){
 const p={...made,id:'poison-'+potency,calendarHerbPotionComplete:{...made.calendarHerbPotionComplete,potency}};
 const got=createHerbWeaponPaste({journal:[p],inventory:[weapon],campaignId:camp,minute,
  actorId:maker,completeId:p.id,weaponItemId:weaponId,timelineId:timeline,round:10,gmConfirmed:true});
 eq(got.potency,potency);eq(got.resistanceModifier,20);
}
console.log('PASS',n,'HMK p75 paste: genuine equipped weapon, one dose, confirmed injuring hit, +20 pending resistance, immutable provenance, original UI accounting');
