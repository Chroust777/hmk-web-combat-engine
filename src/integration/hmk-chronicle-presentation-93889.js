/**
 * Character + GM chronicle presentation edits. They never mutate witnessed
 * travel episodes, dice, health receipts, or the campaign clock.
 * This is an append-only editorial ledger, independent of game-rule proof.
 */
export const CHRONICLE_PRESENTATION_FORMAT_93889='hmk-chronicle-presentation-v1';
const ACTIONS=new Set(['edit','hide','restore']);
const maxText=1800;
const must=(ok,why)=>{if(!ok)throw Error('Kronika: '+why)};
const validParagraphs=parts=>Array.isArray(parts)&&parts.length<=40&&parts.every(part=>{
 if(!part||typeof part!=='object'||Array.isArray(part))return false;
 const keys=Object.keys(part);
 return keys.length>0&&keys.every(k=>['text','before','after'].includes(k))&&
  keys.every(k=>typeof part[k]==='string'&&part[k].length<=maxText);
});
export function chroniclePresentationSnapshot(database,actorId,episodeId){
 const events=database?.chroniclePresentation?.events||[];
 const state={hidden:false,paragraphs:null,revision:0};
 for(const event of events){
  if(event.actorId!==actorId||event.episodeId!==episodeId)continue;
  state.revision++;
  if(event.action==='edit')state.paragraphs=event.paragraphs;
  if(event.action==='hide')state.hidden=true;
  if(event.action==='restore')state.hidden=false;
 }
 return state;
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
  must(typeof ev.actorId==='string'&&ev.actorId.length>0&&typeof ev.episodeId==='string'&&ev.episodeId.length>0&&
   typeof ev.campaignId==='string'&&ev.campaignId.length>0&&ACTIONS.has(ev.action)&&typeof ev.createdAt==='string',
   'neplatná identita či akce');
  if(ev.action==='edit')must(validParagraphs(ev.paragraphs),'neplatný přepis odstavců');
  else must(!('paragraphs' in ev),'skrytí nesmí upravit příběh');
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
export function recordChroniclePresentation93889(database,action,{id,actorId,episodeId,campaignId,createdAt,paragraphs}={}){
 must(ACTIONS.has(action),'neznámá akce');
 const source=(database?.journal||[]).find(j=>j.id===episodeId&&j.calendarCampaignId===campaignId&&j.calendarTimeEpisode?.memberIds?.includes(actorId));
 must(!!source,'zápis nenavazuje na potvrzenou epizodu postavy');
 const latest=chroniclePresentationSnapshot(database,actorId,episodeId);
 if(action==='hide'&&latest.hidden)return false;
 if(action==='restore'&&!latest.hidden)return false;
 const ev={id,actorId,episodeId,campaignId,createdAt,action};
 if(action==='edit')ev.paragraphs=paragraphs;
 const copy=structuredClone(database?.chroniclePresentation||{format:CHRONICLE_PRESENTATION_FORMAT_93889,events:[]});
 copy.events.push(ev);
 validateChroniclePresentation93889({...database,chroniclePresentation:copy});
 database.chroniclePresentation=copy;
 return true;
}
