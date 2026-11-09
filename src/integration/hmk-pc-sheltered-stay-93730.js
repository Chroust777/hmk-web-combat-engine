/** HMK campaign convenience: GM attests that a PLAYER character is in
 * sufficiently sheltered/provisioned surroundings, not outdoors travelling.
 * This suppresses NEW generic environment and scarcity obligations only;
 * existing trauma, ailments, bleeding, poison, sleep and healing keep their
 * independent, original Calendar deadlines and dice. No fake inventory.
 */
export const PC_SHELTERED_STAY_FORMAT='hmk-pc-sheltered-stay-v1';
const check=(v,msg)=>{if(!v)throw Error(msg)};
const at=(n)=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
export function createPCShelteredStay({campaignId,actorId,minute,enabled,reason='Zajištěný pobyt (GM)'}={}){
 check(typeof campaignId==='string'&&campaignId.length>0&&typeof actorId==='string'&&actorId.length>0&&at(minute)&&typeof enabled==='boolean','Zajištěný pobyt vyžaduje kampaň, postavu, doloženou minutu a potvrzení GM.');
 check(typeof reason==='string'&&reason.trim().length>0&&reason.length<=250,'Zadejte skutečné místo nebo důvod zajištění.');
 return {format:PC_SHELTERED_STAY_FORMAT,campaignId,actorId,minute,enabled,reason:reason.trim(),scope:'ordinary-environment-and-provisions-only'};
}
function receipts(journal=[],campaignId,actorId,end=Infinity){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===actorId&&j.calendarPCShelteredStay?.format===PC_SHELTERED_STAY_FORMAT&&j.campaignMinute<=end);
}
export function pcShelteredStayAt(journal=[],campaignId,actorId,minute){
 const relevant=receipts(journal,campaignId,actorId,minute);return relevant.length?relevant.at(-1).calendarPCShelteredStay.enabled:false;
}
export function pcShelteredMinutes(journal=[],campaignId,actorId,start,end){
 check(at(start)&&at(end)&&end>=start,'Neplatný interval zabezpečeného pobytu');
 let cursor=start,covered=0,enabled=pcShelteredStayAt(journal,campaignId,actorId,start);
 for(const entry of receipts(journal,campaignId,actorId,end)){
  if(entry.campaignMinute<=start)continue;
  if(enabled)covered+=entry.campaignMinute-cursor;
  cursor=entry.campaignMinute;enabled=entry.calendarPCShelteredStay.enabled;
 }
 if(enabled)covered+=end-cursor;
 return covered;
}
/** Merge overlapping witnessed GM provisioned and indoor periods without double
 * counting a single minute. `gmProvisionedAtMinute` is supplied by Nutrition,
 * so this module has no circular imports or coupling to wounds/healing.
 */
export function shelteredOrProvisionedMinutes(journal=[],campaignId,actorId,start,end,gmProvisionedAtMinute){
 check(at(start)&&at(end)&&end>start&&typeof gmProvisionedAtMinute==='function','Neplatný výpočet GM zajištění');
 const times=new Set([start,end]);
 for(const j of journal)if(j.calendarCampaignId===campaignId&&j.characterId===actorId&&j.campaignMinute>start&&j.campaignMinute<end&&
  (j.calendarPCShelteredStay?.format===PC_SHELTERED_STAY_FORMAT||j.calendarNutritionProvisionSwitch))times.add(j.campaignMinute);
 const points=[...times].sort((a,b)=>a-b);let covered=0;
 for(let i=0;i<points.length-1;i++)if(pcShelteredStayAt(journal,campaignId,actorId,points[i])||gmProvisionedAtMinute(points[i]))covered+=points[i+1]-points[i];
 return covered;
}
export function validatePCShelteredStayJournal(journal=[],characters=[]){
 const byId=new Map(characters.map(x=>[x.id,x]));
 const last=new Map();
 for(const row of journal){const p=row.calendarPCShelteredStay;if(!p)continue;
  const actor=byId.get(row.characterId);
  check(actor&&['PC','NPC'].includes(String(actor.kind||'PC').toUpperCase())&&!actor.hmk?.verifiedMountedBreed,'Zajištěný pobyt vyžaduje skutečnou PC nebo NPC, nikoli zvíře.');
  check(row.calendarCampaignId===p.campaignId&&row.characterId===p.actorId&&row.campaignMinute===p.minute&&
   JSON.stringify(p)===JSON.stringify(createPCShelteredStay(p)), 'Poškozený doklad zajištěného pobytu.');
  const key=p.campaignId+'\u0000'+p.actorId,previous=last.get(key);
  check(previous===undefined||p.minute>=previous,'Nelze vkládat zajištění zpětně do historie.');last.set(key,p.minute);
 }
 return true;
}
export function assertPCShelteredStayAppendOnly(before=[],after=[]){
 const later=new Map(after.filter(j=>j.calendarPCShelteredStay).map(j=>[j.id,j]));
 for(const row of before){if(!row.calendarPCShelteredStay)continue;
  check(later.has(row.id)&&JSON.stringify(row)===JSON.stringify(later.get(row.id)),'Potvrzené zajištění PC nelze zpětně přepsat ani smazat.');
 }
 return true;
}
/** PC and NPC stay distinct. Each NPC's default is an actual minute-stamped
 * receipt created on campaign inclusion/first post-upgrade write; never a
 * visual-only checked box and never a retroactive rewrite of old evidence.
 */
export function calendarPCShelteredControlsHTML({clock,characters=[],journal=[],escapeHTML}={}){
 if(!clock)return '';
 const esc=escapeHTML||String,cid=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const people=characters.filter(c=>['PC','NPC'].includes(String(c.kind||'PC').toUpperCase())&&!c.hmk?.verifiedMountedBreed);
 const groups=['PC','NPC'].map(kind=>{
  const members=people.filter(c=>String(c.kind||'PC').toUpperCase()===kind);
  const rows=members.map(c=>{const active=pcShelteredStayAt(journal,cid,c.id,clock.minute);
   return `<label class="hc-pc-shelter-item"><input type="checkbox" data-calendar-pc-shelter="${esc(c.id)}" ${active?'checked':''} aria-label="${esc(c.name)} – zajištěné prostředí"><span class="hc-pc-shelter-name">${esc(c.name)} <span class="hc-pc-shelter-status">(${active?'Zajištěno':'Nezajištěno'})</span></span></label>`;
  }).join('')||`<p>${kind==='PC'?'V této kampani není žádná PC.':'V této kampani není žádná NPC.'}</p>`;
  return `<div class="hc-pc-shelter-group" data-shelter-actor-kind="${kind}"><h5>${kind} · ${members.length}</h5><div class="hc-pc-shelter-list">${rows}</div></div>`;
 }).join('');
 return `<section class="hc-pc-shelter" aria-label="Zajištěné prostředí PC a NPC"><h4>Postavy v zajištěném prostředí</h4>${groups}</section>`;
}
