'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {trackingOutcome,trackingModifiers,createTrackingProof,validateTrackingJournal}=await import('../src/integration/hmk-trekking-wilderness-tasks.js');
 const {trackingAwarenessFromSkill,validateTrackingAwarenessJournal,pendingTrackingAwareness}=await import('../src/integration/hmk-tracking-awareness-537.js');
 const {automaticHMKFollowups}=await import('../src/integration/hmk-calendar-automatic-followups.js');
 const fs=require('node:fs');const path=require('node:path');
 let n=0;const ok=(b,why)=>{assert.ok(b,why);n++},eq=(a,b,why)=>{assert.deepEqual(a,b,why);n++};
 for(let sv=3;sv<=12;sv++){
  const p=trackingOutcome(sv);eq(p.awarenessNeeded,[3,4].includes(sv),'Tracking SV '+sv+' awareness');
  eq(p.spoorStars,sv>=5?sv-4:0,'Tracking SV '+sv+' spoil star table and beyond9');
 }
 eq(trackingModifiers({partyTracked:11,continuousSnow:true,night:true,road:'paved'}).delta,-1,'modifiers explicit p.147');
 const watch={id:'watch-legacy',characterId:'tracker',calendarCampaignId:'c',campaignMinute:100,calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',modes:{stalking:1},partyModes:{memberIds:['tracker']}}};
 const firstSkill={id:'skill-legacy',characterId:'tracker',calendarCampaignId:'c',campaignMinute:100,
  calendarTrekSkillSource:{hazard:'tracking',sourceId:'watch-legacy'},skillTestProof:{a:{sv:10,level:'S',roll:31}}};
 const newT=createTrackingProof({source:watch,journal:[watch,firstSkill],campaignId:'c',skillId:'skill-legacy',conditions:{}});
 eq(newT.format,'hmk-trekking-tracking-outcome-v2','new receipts use corrected format');
 eq(newT.score.spoorStars,6,'SV10 yields 6 spoor stars after printed p.147');
 const next={id:'result-v2',characterId:'tracker',calendarCampaignId:'c',campaignMinute:100,calendarTrekTrackingProof:newT};
 eq(validateTrackingJournal([watch,firstSkill,next]),true,'new v2 certified');
 const legacy={...next,id:'result-v1',calendarTrekTrackingProof:{...newT,format:'hmk-trekking-tracking-outcome-v1',score:{...newT.score,spoorStars:5}}};
 eq(validateTrackingJournal([watch,firstSkill,legacy]),true,'legacy v1 capped receipts remain readable');

 const chars=[{id:'tracker',name:'Tracker',hmk:{}},{id:'wrong',name:'Someone',hmk:{}}];
 const clock={campaignId:'c',minute:200,characterIds:['tracker','wrong'],events:[],anchors:[]};
 const tracking={id:'tracking-1',characterId:'tracker',calendarCampaignId:'c',campaignMinute:100,calendarTrekTrackingProof:{format:'hmk-trekking-tracking-outcome-v1',sourceId:'watch-1',trackerId:'tracker',score:trackingOutcome(4)}};
 const skill={type:'secondary-mastery-test',actorId:'tracker',skills:['Awareness (Vision)'],a:{level:'S',roll:31,eml:60},result:{level:'S',roll:31}};
 eq(pendingTrackingAwareness([tracking],'c').length,1,'pending after restore');
 eq(automaticHMKFollowups(clock,chars,[tracking]).all.filter(x=>x.kind==='tracking-awareness').length,1,'automatic calendar pending');
 const proof=trackingAwarenessFromSkill({trackingRow:tracking,skillProof:skill,actorId:'tracker',campaignId:'c',minute:180,journal:[tracking]});
 eq(proof.resultSpoorStars,1,'success adds exactly 1 Spoor');
 const row={id:'awareness-1',characterId:'tracker',calendarCampaignId:'c',campaignMinute:180,skillTestProof:skill,calendarTrekTrackingAwarenessProof:proof};
 ok(validateTrackingAwarenessJournal([tracking,row]),'replay succeeds');
 eq(pendingTrackingAwareness([tracking,row],'c').length,0,'completed follow-up disappears');
 eq(automaticHMKFollowups(clock,chars,[tracking,row]).all.filter(x=>x.kind==='tracking-awareness').length,0,'calendar no duplicate');
 eq(validateTrackingAwarenessJournal(JSON.parse(JSON.stringify([tracking,row]))),true,'restore survives');
 const fail={...skill,a:{level:'F',roll:85,eml:60}};
 const failProof=trackingAwarenessFromSkill({trackingRow:tracking,skillProof:fail,actorId:'tracker',campaignId:'c',minute:180,journal:[tracking]});
 eq(failProof.resultSpoorStars,0,'failed Awareness never awards spoor');
 assert.throws(()=>trackingAwarenessFromSkill({trackingRow:tracking,skillProof:skill,actorId:'wrong',campaignId:'c',minute:180}),/tracker/);n++;
 assert.throws(()=>trackingAwarenessFromSkill({trackingRow:tracking,skillProof:skill,actorId:'tracker',campaignId:'other',minute:180}),/kampani/);n++;
 assert.throws(()=>trackingAwarenessFromSkill({trackingRow:tracking,skillProof:skill,actorId:'tracker',campaignId:'c',minute:99}),/ne před/);n++;
 assert.throws(()=>trackingAwarenessFromSkill({trackingRow:tracking,skillProof:skill,actorId:'tracker',campaignId:'c',minute:190,journal:[tracking,row]}),/již dokončen/);n++;
 assert.throws(()=>validateTrackingAwarenessJournal([tracking,row,{...row,id:'other'}]),/Duplicitní|již dokončen/);n++;
 assert.throws(()=>validateTrackingAwarenessJournal([tracking,{...row,calendarTrekTrackingAwarenessProof:{...proof,resultSpoorStars:0}}]),/Poškozený/);n++;
 const code=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 for(const phrase of ['data-tracking-awareness-source','trackingAwarenessFromSkill({trackingRow','calendarTrekTrackingAwarenessProof:trackingAwareness','validateTrackingAwarenessJournal(d.journal)'])ok(code.includes(phrase),'app link '+phrase);
 console.log('PASS v93.537 Tracking p.147:',n,'isolated / persisted / calendar / app checks');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
