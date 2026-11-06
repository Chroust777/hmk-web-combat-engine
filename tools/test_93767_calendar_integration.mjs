import assert from 'node:assert/strict';
import {createCampaignCalendar,advanceCampaignCalendar,validateCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {openSharedTravelWindow93767,addSharedTravelGroup93767,
 addSharedTravelActivity93767,setSharedTravelActivityProof93767,
 stageSharedTravelAtomicCopy93767} from '../src/integration/hmk-shared-travel-window-93767.js';
const clock=createCampaignCalendar({day:1,hour:8,minute:0,label:'Proof-of-concept',eventId:'start',gmConfirmed:true,campaignId:'camp',characterIds:['a','b']});
let w=openSharedTravelWindow93767({campaignId:'camp',windowId:'unique-window',startMinute:clock.minute,
 requestedMinutes:60,maxAllowedMinutes:40,limitMinute:520});
w=addSharedTravelGroup93767(w,{groupId:'group-a',memberIds:['a']});
w=addSharedTravelGroup93767(w,{groupId:'group-b',memberIds:['b']});
w=addSharedTravelActivity93767(w,{groupId:'group-a',activityId:'a-20',kind:'travel',minutes:20});
w=addSharedTravelActivity93767(w,{groupId:'group-a',activityId:'a-10',kind:'forage',minutes:10});
w=addSharedTravelActivity93767(w,{groupId:'group-b',activityId:'b-30',kind:'travel',minutes:30});
let documents=[{proofId:'pa20',kind:'travel',memberIds:['a'],startMinute:480,endMinute:500},
 {proofId:'pa10',kind:'forage',memberIds:['a'],startMinute:500,endMinute:510},
 {proofId:'pb30',kind:'travel',memberIds:['b'],startMinute:480,endMinute:510}];
for(const [a,d] of [['a-20',documents[0]],['a-10',documents[1]],['b-30',documents[2]]]){
 w=setSharedTravelActivityProof93767(w,{activityId:a,proofId:d.proofId,sourceStartMinute:d.startMinute,
  sourceEndMinute:d.endMinute,participantIds:d.memberIds});
}
const source={campaignClock:clock,journal:[],characters:[{id:'a',name:'A'},{id:'b',name:'B'}],inventory:[]};
let transitions=0;
const composed=stageSharedTravelAtomicCopy93767({window:w,snapshot:source,gmConfirmed:true,
 proofDocuments:documents,applyActivity:(copy,doc)=>copy.journal.push({...doc}),
 advanceCalendar:(copy,{deltaMinutes})=>{transitions++;copy.campaignClock=advanceCampaignCalendar(copy.campaignClock,
  {deltaMinutes,eventId:'one-final-time-event',reason:'GM potvrdil společný cestovní interval',gmConfirmed:true,
   characters:[],journal:copy.journal,inventory:[]});},
 validateCopy:(copy)=>{validateCampaignCalendar(copy.campaignClock);assert.equal(copy.journal.length,3)}});
assert.equal(composed.campaignClock.minute,520);assert.equal(source.campaignClock.minute,480);
assert.equal(composed.campaignClock.events.filter(e=>e.type==='advance').length,1);
assert.equal(source.campaignClock.events.filter(e=>e.type==='advance').length,0);
assert.equal(transitions,1);
assert.throws(()=>stageSharedTravelAtomicCopy93767({window:w,snapshot:source,gmConfirmed:true,
 proofDocuments:documents,applyActivity:()=>{},advanceCalendar:(copy,{deltaMinutes})=>{
 copy.campaignClock=advanceCampaignCalendar(copy.campaignClock,{deltaMinutes:deltaMinutes+1,eventId:'bad',
  reason:'Chybný posun',gmConfirmed:true,characters:[],journal:[],inventory:[]});},validateCopy:()=>{}}),/přesně jednou/);
console.log('PASS 7 real HMK calendar API single advancement on an isolated verified copy');
