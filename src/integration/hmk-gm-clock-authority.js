/** Central persistence boundary: only an explicit GM time-control action may
 * advance the shared clock. A character procedure can journal its own timestamp
 * or append same-minute anchors, but never change clock.minute.
 * Calendar creation and switching are not advances within the same timeline.
 */
import {campaignKey,allCampaignClocks} from './hmk-calendar-multi-campaign.js';
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
export function assertGMOnlyCampaignTime(before,after,{gmClockAdvance=false}={}){
 const previous=new Map(allCampaignClocks(before).map(c=>[campaignKey(c),c]));
 const following=new Map(allCampaignClocks(after).map(c=>[campaignKey(c),c]));
 const activeKey=campaignKey(after?.campaignClock);
 for(const [key,old] of previous){
  const current=following.get(key);if(!current)continue; // authorized deletion handled by lifecycle validator
  if(current.minute===old.minute)continue;
  ensure(key===activeKey&&gmClockAdvance===true,
   'Čas kampaně smí posunout pouze GM tlačítkem Posunout/Nastavit čas. Činnosti, léčení, zranění ani magie jej nemění.');
  ensure(current.minute>old.minute,'Čas kampaně nelze vracet');
  ensure(Array.isArray(current.events)&&Array.isArray(old.events)&&
   current.events.slice(0,old.events.length).every((e,i)=>JSON.stringify(e)===JSON.stringify(old.events[i])),
   'Předchozí časové potvrzení se nesmí přepsat');
  const added=current.events.slice(old.events.length);
  ensure(added.length>0&&added[0]?.type==='advance'&&added[0].minute===current.minute&&
   typeof added[0].reason==='string'&&added[0].reason.length>=3,
   'Posun času vyžaduje nové doložené GM potvrzení času');
 }
 return true;
}
