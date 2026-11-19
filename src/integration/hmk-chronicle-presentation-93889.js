/**
 * Character + GM chronicle presentation edits. They never mutate witnessed
 * travel episodes, dice, health receipts, or the campaign clock.
 * This is an append-only editorial ledger, independent of game-rule proof.
 */
export const CHRONICLE_PRESENTATION_FORMAT_93889='hmk-chronicle-presentation-v1';
const ACTIONS=new Set(['edit','hide','restore','edit-campaign-episode','edit-campaign-event']);
const maxText=1800;
export const CHRONICLE_TRAVEL_LAYOUT='travel-prose-v1';
export const CHRONICLE_NOVEL_LAYOUT='travel-prose-v2';
const travelLayouts=new Set([CHRONICLE_TRAVEL_LAYOUT,CHRONICLE_NOVEL_LAYOUT]);
const must=(ok,why)=>{if(!ok)throw Error('Kronika: '+why)};
const validParagraphs=parts=>Array.isArray(parts)&&parts.length<=40&&parts.every(part=>{
 if(!part||typeof part!=='object'||Array.isArray(part))return false;
 const keys=Object.keys(part);
 return keys.length>0&&keys.every(k=>['text','before','after'].includes(k))&&
  keys.every(k=>typeof part[k]==='string'&&part[k].length<=maxText);
});
export function chroniclePresentationSnapshot(database,actorId,episodeId,campaignId){
 const events=database?.chroniclePresentation?.events||[];
 const state={hidden:false,paragraphs:null,revision:0};
 const scope=campaignId??database?.journal?.find(row=>row.id===episodeId)?.calendarCampaignId;
 for(const event of events){
  if(event.actorId!==actorId||event.episodeId!==episodeId||(scope&&event.campaignId!==scope))continue;
  state.revision++;
  if(event.action==='edit'){
   state.paragraphs=event.paragraphs;
   if(event.layout===undefined)delete state.layout;
   else state.layout=event.layout;
  }
  if(event.action==='hide')state.hidden=true;
  if(event.action==='restore')state.hidden=false;
 }
 const shared=events.findLast(event=>event.shared===true&&event.action==='edit-campaign-episode'&&
  event.episodeId===episodeId&&event.campaignId===scope);
 return shared?{...state,paragraphs:shared.paragraphs,layout:shared.layout,shared:true}:state;
}
export function validateChroniclePresentation93889(database){
 const ledger=database?.chroniclePresentation;
 if(ledger===undefined)return true;
 must(ledger&&typeof ledger==='object'&&!Array.isArray(ledger)&&
  ledger.format===CHRONICLE_PRESENTATION_FORMAT_93889&&Array.isArray(ledger.events)&&ledger.events.length<=20000,
  'neplatný formát edičního záznamníku');
 const eventIds=new Set();
 for(const ev of ledger.events){
  must(ev&&typeof ev==='object'&&!Array.isArray(ev)&&typeof ev.id==='string'&&ev.id.length>0&&!eventIds.has(ev.id),
   'neplatná nebo duplicitní identita úpravy');
  eventIds.add(ev.id);
  must(typeof ev.campaignId==='string'&&ev.campaignId.length>0&&ACTIONS.has(ev.action)&&typeof ev.createdAt==='string',
   'neplatná identita či akce');
  if(ev.action==='edit-campaign-event'){
   must(typeof ev.planId==='string'&&ev.planId.length>0&&validEventText(ev.eventText),'neplatný text události');
   continue;
  }
  must(typeof ev.episodeId==='string'&&ev.episodeId.length>0,'neplatná identita epizody');
  if(ev.action==='edit-campaign-episode'){
   must(ev.shared===undefined||ev.shared===true,'neplatná volba sdílení vyprávění');
   must(validParagraphs(ev.paragraphs)&&(travelLayouts.has(ev.layout)||(ev.shared===true&&ev.layout===null)),
    'neplatný přepis společné kroniky');
   continue;
  }
  must(typeof ev.actorId==='string'&&ev.actorId.length>0,'neplatná identita postavy');
  if(ev.action==='edit'){
   must(validParagraphs(ev.paragraphs),'neplatný přepis odstavců');
   must(ev.layout===undefined||travelLayouts.has(ev.layout),'neplatná podoba vyprávění');
  }else must(!('paragraphs' in ev)&&!('layout' in ev),'skrytí nesmí upravit příběh');
 }
 return true;
}
export function assertChroniclePresentationAppendOnly93889(before,after){
 validateChroniclePresentation93889(before);
 validateChroniclePresentation93889(after);
 const old=before?.chroniclePresentation?.events||[];
 const current=after?.chroniclePresentation?.events||[];
 must(current.length>=old.length,'historii úprav nelze mazat');
 for(let i=0;i<old.length;i++)must(JSON.stringify(old[i])===JSON.stringify(current[i]),'historii úprav nelze přepisovat');
 return true;
}
export function recordChroniclePresentation93889(database,action,{id,actorId,episodeId,campaignId,createdAt,paragraphs,layout}={}){
 must(['edit','hide','restore'].includes(action),'neplatná osobní úprava');
 const source=(database?.journal||[]).find(j=>j.id===episodeId&&j.calendarCampaignId===campaignId&&j.calendarTimeEpisode?.memberIds?.includes(actorId));
 must(!!source,'zápis nenavazuje na potvrzenou epizodu postavy');
 const latest=chroniclePresentationSnapshot(database,actorId,episodeId,campaignId);
 if(action==='hide'&&latest.hidden)return false;
 if(action==='restore'&&!latest.hidden)return false;
 const ev={id,actorId,episodeId,campaignId,createdAt,action};
 if(action==='edit'){
  ev.paragraphs=paragraphs;
  if(layout!==undefined)ev.layout=layout;
 }
 return appendChronicleRevision(database,ev);
}
function appendChronicleRevision(database,ev){
 const copy=structuredClone(database?.chroniclePresentation||{format:CHRONICLE_PRESENTATION_FORMAT_93889,events:[]});
 copy.events.push(ev);
 validateChroniclePresentation93889({...database,chroniclePresentation:copy});
 database.chroniclePresentation=copy;
 return true;
}


function validEventText(text){
 return typeof text?.title==='string'&&text.title.trim().length>0&&text.title.length<=160&&
  typeof text.place==='string'&&text.place.length<=160&&
  typeof text.note==='string'&&text.note.trim().length>0&&text.note.length<=2000;
}

export function campaignChronicleEpisodeEdit(database,campaignId,episodeId){
 return database?.chroniclePresentation?.events?.findLast(ev=>
  ev.action==='edit-campaign-episode'&&ev.campaignId===campaignId&&ev.episodeId===episodeId)||{};
}

export function campaignChronicleEventText(database,campaignId,plan){
 return database?.chroniclePresentation?.events?.findLast(ev=>
  ev.action==='edit-campaign-event'&&ev.campaignId===campaignId&&ev.planId===plan.id)?.eventText||
  {title:plan.title,place:plan.place,note:plan.resolution?.note||plan.note};
}

export function recordCampaignChronicleEdit(database,{id,campaignId,createdAt,episodeId,paragraphs,planId,eventText,layout=CHRONICLE_TRAVEL_LAYOUT,shared=false,actorId}){
 const clock=database.campaignClock;
 must(clock&&(clock.campaignId||`legacy:${clock.events?.[0]?.id||""}`)===campaignId,'kampaň právě není otevřená');
 if(planId){
  must(clock.plans?.some(plan=>plan.id===planId)&&clock.planResolutions?.some(row=>row.planId===planId&&row.kind==='resolved'),
   'událost ještě není v kronice');
  return appendChronicleRevision(database,{id,campaignId,createdAt,action:'edit-campaign-event',planId,eventText});
 }
 must(database.journal?.some(row=>row.id===episodeId&&row.calendarCampaignId===campaignId&&row.calendarTimeEpisode&&
  (!actorId||row.calendarTimeEpisode.memberIds?.includes(actorId))),
  'epizoda není v otevřené kampani');
 return appendChronicleRevision(database,{id,campaignId,createdAt,action:'edit-campaign-episode',episodeId,paragraphs,layout,...(shared?{shared:true}:{})});
}
