'use strict';
const assert=require('node:assert/strict');
let n=0;const check=(cond,msg)=>{assert.ok(cond,msg);n++};
(async()=>{
 const {assertCampaignActorTimeIsolation}=await import('../src/integration/hmk-calendar-multi-campaign.js');
 const {removeCharacterWithEvidence,assertOnlyCharacterWasDeleted}=await import('../src/integration/hmk-character-removal.js');
 const {validateCalendarEvidenceArchives}=await import('../src/integration/hmk-calendar-campaign-lifecycle.js');
 const person=(id,creation)=>({id,name:id,kind:'PC',hmk:{creation,skills:[],injuries:[]}});
 const start={status:'review-required'},finish={status:'auto-generated',values:{autoStartingKit:{source:'HMK p.51'},autoGeneration:{preferences:{}}}};
 const earlier={characters:[person('new',start),person('old',null)],inventory:[],campaignClock:{characterIds:['old']}};
 const completed=structuredClone(earlier);completed.characters[0].hmk.creation=finish;completed.inventory.push({id:'starter',characterId:'new'});
 check(assertCampaignActorTimeIsolation(earlier,completed),'initial completed kit outside calendar allowed');
 const later=structuredClone(completed);later.inventory.push({id:'weapon',characterId:'new'});
 assert.throws(()=>assertCampaignActorTimeIsolation(completed,later),/není v právě otevřené kampani/);n++;
 const combat=structuredClone(earlier);combat.characters[0].hmk.combatState={wounds:[{id:'hurt'}]};
 assert.throws(()=>assertCampaignActorTimeIsolation(earlier,combat),/není v právě otevřené kampani/);n++;
 const bogus=structuredClone(completed);bogus.characters[0].hmk.creation={status:'auto-generated',values:{autoGeneration:{preferences:{}}}};
 assert.throws(()=>assertCampaignActorTimeIsolation(earlier,bogus),/není v právě otevřené kampani/);n++;
 const archive={format:'hmk-calendar-character-time-evidence-v1',id:'archive1',sourceCampaignId:'oldcampaign',characterIds:['old','new'],anchors:[{characterId:'new',kind:'wound',minute:100},{characterId:'old',kind:'wound',minute:110}],journalTimes:[{id:'receipt-new',characterId:'new',minute:100},{id:'receipt-old',characterId:'old',minute:110}],medicalBranches:[{actorId:'new',state:{malnutritionEpisodes:[],events:[]}},{actorId:'old',state:{malnutritionEpisodes:[],events:[]}}],waterInventoryBackings:[{id:'skin-new',characterId:'new',snapshot:{}},{id:'skin-old',characterId:'old',snapshot:{}}],rationInventoryBackings:[{id:'ration-new',characterId:'new',snapshot:{}},{id:'ration-old',characterId:'old',snapshot:{}}],trOrigin:null};
 check(validateCalendarEvidenceArchives([archive]),'original archive valid');
 const clock={format:'hmk-campaign-calendar-v1',campaignId:'live',minute:150,characterIds:['old','new'],anchors:[{characterId:'new',id:'anchor-n'},{characterId:'old',id:'anchor-o'}],journalMinuteEvidence:[{id:'receipt-new',characterId:'new'},{id:'receipt-old',characterId:'old'}],events:[{id:'event-new',actorId:'new',type:'note'},{id:'event-old',actorId:'old',type:'note'}],plans:[{id:'plan-new',characterId:'new'},{id:'plan-old',characterId:'old'}],planResolutions:[{id:'resolved-new',planId:'plan-new'},{id:'resolved-old',planId:'plan-old'}]};
 const doc={characters:[person('old',null),person('new',null)],trash:[],inventory:[{id:'item-n',characterId:'new'},{id:'item-o',characterId:'old'}],journal:[{id:'receipt-new',characterId:'new'},{id:'receipt-old',characterId:'old'}],calendarEvidenceArchives:[archive],campaignClock:clock,campaignClocks:[structuredClone(clock)],campaignActorBranches:{live:{new:{},old:{}}}};
 const previous=structuredClone(doc),result=removeCharacterWithEvidence(doc,'new');
 check(assertOnlyCharacterWasDeleted(doc,result,'new'),'only targeted actor removed');
 check(result.characters.length===1&&result.characters[0].id==='old','survivor untouched');
 check(result.calendarEvidenceArchives.length===1,'shared archive survives');
 check(validateCalendarEvidenceArchives(result.calendarEvidenceArchives),'pruned archive valid');
 const a=result.calendarEvidenceArchives[0];
 for(const key of ['characterIds','anchors','journalTimes','medicalBranches','waterInventoryBackings','rationInventoryBackings']){
  check(a[key].length===1,`archive ${key} cleaned`);
  check(JSON.stringify(a[key]).includes('old')&&!JSON.stringify(a[key]).includes('new'),`archive ${key} keeps only survivor`);
 }
 for(const active of [result.campaignClock,...result.campaignClocks]){
  for(const key of ['characterIds','anchors','journalMinuteEvidence','events','plans','planResolutions'])check(active[key].length===1,`calendar ${key} cleaned`);
 }
 check(result.inventory.length===1&&result.journal.length===1,'subject receipts removed');
 check(!result.campaignActorBranches.live.new&&result.campaignActorBranches.live.old,'branch removed');
 check(JSON.stringify(previous)===JSON.stringify(doc),'delete is pure');
 const without=structuredClone(doc);without.calendarEvidenceArchives=[{...archive,characterIds:['new'],anchors:archive.anchors.slice(0,1),journalTimes:archive.journalTimes.slice(0,1),medicalBranches:archive.medicalBranches.slice(0,1),waterInventoryBackings:archive.waterInventoryBackings.slice(0,1),rationInventoryBackings:archive.rationInventoryBackings.slice(0,1)}];
 check(removeCharacterWithEvidence(without,'new').calendarEvidenceArchives.length===0,'orphan archive removed');
 console.log('PASS',n,'v93.490 generation with existing calendar, later inventory gate, archived evidence and full character deletion');
})().catch(e=>{console.error(e);process.exitCode=1});
