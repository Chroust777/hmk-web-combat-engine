import assert from 'node:assert/strict';
import {characterLogbookSkillChecks,summarizeLogbookSkillChecks} from '../src/integration/hmk-logbook-skill-stats.js';

const test=(id,characterId,name,level,sv)=>({
 id,characterId,skillTestProof:{
  type:sv===undefined?'secondary-mastery-test':'secondary-mastery-value-test',
  skills:[name],a:{roll:41,eml:55,level,sv:sv??9}
 }
});
const orientation=test('orienteering','guide','Survival','S',5);
const opposed={id:'opposed',characterId:'guide',skillTestProof:{
 type:'opposed-success-test',actorId:'guide',opponentId:'rider',skills:['Stealth','Awareness'],
 a:{roll:20,level:'CS',sv:7},b:{roll:87,level:'F',sv:3}
}};
const episode={id:'episode',characterId:'guide',campaignMinute:100,calendarTimeEpisode:{
 endMinute:220,orientation:{skillId:orientation.id},skillLinks:[{id:orientation.id}],
 actors:[
  {id:'guide',roll:9,sr:{roll:9,success:false,tn:6}},
  {id:'rider',roll:2,sr:{roll:2,success:true,tn:6},hourlyEndSR:[{roll:2,success:true,tn:6},{roll:9,success:false,tn:6}]},
  {id:'passenger',roll:null,sr:null,endNotRequired:{reason:'transported'}}
 ],
 direction:{rolls:[5]},travelForaging:[{roll:1,actorId:'rider'}]
}};
const journal=[
 orientation,opposed,...Array.from({length:4},(_,i)=>test('tracking-'+i,'guide','Tracking','CS',6)),
 test('failed','guide','Tracking','CF',3),
 {...test('tail','guide','Tracking','F',6),skillTestProof:{type:'skill-value-result',primarySkill:'Tracking',result:{d100:98,level:'F',sv:4}}},
 {id:'tiebreak',characterId:'guide',skillTestProof:{type:'opposed-tiebreak',actorId:'guide',opponentId:'rider'}},
 {id:'old-travel',characterId:'rider',calendarExpeditionProof:{kind:'travel',endSR:[{roll:3,success:true,tn:6}]}},
 episode,{id:'reuse',characterId:'guide',calendarTimeEpisode:{orientation:{skillId:orientation.id},skillLinks:[{id:orientation.id}],actors:[]}}
];
const rider=characterLogbookSkillChecks(journal,'rider');
assert.deepEqual(rider.map(x=>[x.name,x.result.level]),[['Awareness','F'],['Endurance','S'],['Endurance','S'],['Endurance','F']]);
assert.equal(rider.at(-1).entry.campaignMinute,220);
assert.deepEqual(characterLogbookSkillChecks(journal,'passenger'),[]);
const guide=characterLogbookSkillChecks(journal,'guide');
assert.equal(guide.filter(x=>x.entry.id===orientation.id).length,1);
assert.equal(guide.find(x=>x.entry.id===orientation.id).travel,true);
assert.equal(guide.find(x=>x.entry.id===opposed.id).stars,null);
const summary=summarizeLogbookSkillChecks(guide);
assert.deepEqual(summary.find(x=>x.name==='Tracking'),{
 name:'Tracking',S:0,CS:4,F:1,CF:1,starsTotal:8,starsByCount:new Map([[2,4],[0,2]])
});
assert.deepEqual(summary.find(x=>x.name==='Survival'),{
 name:'Survival',S:1,CS:0,F:0,CF:0,starsTotal:1,starsByCount:new Map([[1,1]])
});
console.log('PASS skill statistics: travel and hourly END, opposed owner, repeated references, legacy SV, zero-star buckets');
