/** Multiple campaign clocks with isolated time-varying character branches.
 * A character ID may occur in more than one campaign. Each timeline keeps its
 * own injury/trauma/arcane effects and equipped possessions; identity and base
 * character-creation information remain shared. Creating a new membership is
 * an explicit branch of the CURRENT state, never time-travel or auto-healing.
 * A calendar timestamp identifies the event within that campaign ONLY.
 */
import {validateCampaignCalendar,assertCampaignCalendarAppendOnly} from './hmk-campaign-calendar.js';
import {coinBalance,ensureCampaignCashAccount} from './hmk-library-economy.js';
const fail=(msg)=>{throw Error(msg)};
const clone=v=>structuredClone(v);
const TIME_KEYS=['combatState','injuries','arcane','liveEffects','expedition'];
export function campaignKey(clock){return clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;}
export function allCampaignClocks(database){return [...(database.campaignClock?[database.campaignClock]:[]),...(database.campaignClocks||[])];}
export function captureCampaignActor(actor,inventory){
 const hmk={};for(const key of TIME_KEYS)if(actor?.hmk&&Object.hasOwn(actor.hmk,key))hmk[key]=clone(actor.hmk[key]);
 return {hmk,inventory:clone((inventory||[]).filter(i=>i.characterId===actor.id))};
}
function validateSnapshots(database){
 const snapshots=database.campaignActorBranches??{};
 if(!snapshots||typeof snapshots!=='object'||Array.isArray(snapshots))fail('Neplatné časové větve postav');
 const keys=new Set(allCampaignClocks(database).map(c=>campaignKey(c)));
 if(Object.keys(snapshots).length>50)fail('Příliš mnoho archivů časových větví');
 const people=new Set([...(database.characters||[]),...(database.trash||[])].map(c=>c.id));
 for(const [campaignId,branches] of Object.entries(snapshots)){
  if(!keys.has(campaignId)||!branches||typeof branches!=='object'||Array.isArray(branches))fail('Osiřelá časová větev');
  for(const [id,snap] of Object.entries(branches)){
   if(!people.has(id)||!snap||typeof snap.hmk!=='object'||Array.isArray(snap.hmk)||!Array.isArray(snap.inventory))fail('Poškozená časová větev postavy');
   if(snap.inventory.some(i=>i.characterId!==id))fail('Inventář časové větve patří jiné postavě');
   const ids=snap.inventory.map(i=>i.id);
   if(new Set(ids).size!==ids.length)fail('Duplicitní inventář časové větve');
  }
 }
}
export function validateCampaignPortfolio(database){
 const inactive=database.campaignClocks??[];
 if(!Array.isArray(inactive)||inactive.length>49)fail('Příliš mnoho kalendářů kampaní (nejvýše 50)');
 const used=new Set();
 for(const clock of allCampaignClocks(database)){
  validateCampaignCalendar(clock);
  const key=campaignKey(clock);
  if(!key||used.has(key))fail('Duplicitní identifikátor kalendáře');used.add(key);
 }
 validateSnapshots(database);return true;
}
/** Every registered character can be included in a second timeline. */
export function availableCampaignCharacters(database){return [...(database.characters||[])];}
function captureActive(next){
 const clock=next.campaignClock;if(!clock)return;
 const key=campaignKey(clock),branches=next.campaignActorBranches??={};
 const bucket=branches[key]??={};
 const ids=new Set(clock.characterIds??next.characters.map(c=>c.id));
 for(const c of next.characters)if(ids.has(c.id))bucket[c.id]=captureCampaignActor(c,next.inventory);
}
/** On first inclusion, snapshot the current character as an explicit FORK.
 * No old timestamp is rebased and no original actor or journal row is deleted.
 */
function hasProvenTimedMagic(actor){
 const e=actor?.hmk?.liveEffects;if(!e)return false;
 return [e.festival,e.blessing,...(e.rites??[]),...(e.talismans??[]),...(e.talismanLockouts??[])]
  .some(x=>x&&Number.isSafeInteger(x.from)&&Number.isSafeInteger(x.until));
}
function activate(next,clock){
 const key=campaignKey(clock),branches=next.campaignActorBranches??={};
 const bucket=branches[key]??={};
 const ids=new Set(clock.characterIds??next.characters.map(c=>c.id));
 for(const c of next.characters){if(!ids.has(c.id))continue;
  if(!bucket[c.id]&&next.campaignClocks?.length&&hasProvenTimedMagic(c)){
   const source=next.campaignClocks.find(old=>
    old.characterIds?.includes(c.id)&&next.campaignActorBranches?.[campaignKey(old)]?.[c.id])
    ??next.campaignClocks.at(-1);
   const sameTr=JSON.stringify(source?.trOrigin??null)===JSON.stringify(clock.trOrigin??null);
   if(!source||source.minute!==clock.minute||!sameTr)
    fail(`Postava ${c.name} má doložené časované magické účinky. Jejich absolutní lhůty nelze automaticky přenést na odlišnou časovou osu bez rozporu s původním pravidlovým důkazem. Časová větev nebyla vytvořena.`);
  }
  const snap=bucket[c.id]??(bucket[c.id]={...captureCampaignActor(c,next.inventory),
    forkedFrom:campaignKey((next.campaignClocks||[]).at(-1)),
    forkedFromMinute:(next.campaignClocks||[]).at(-1)?.minute??null,
    forkedAtMinute:clock.minute});
  c.hmk??={};for(const field of TIME_KEYS){if(Object.hasOwn(snap.hmk,field))c.hmk[field]=clone(snap.hmk[field]);else delete c.hmk[field];}
  next.inventory=next.inventory.filter(i=>i.characterId!==c.id).concat(clone(snap.inventory));
 }
}
export function switchCampaign(database,key){
 validateCampaignPortfolio(database);
 const next=clone(database);
 if(campaignKey(next.campaignClock)===key)return next;
 const i=(next.campaignClocks||[]).findIndex(c=>campaignKey(c)===key);
 if(i<0)fail('Kalendář nebyl nalezen');
 captureActive(next);
 const chosen=next.campaignClocks.splice(i,1)[0];
 if(next.campaignClock)next.campaignClocks.push(next.campaignClock);
 next.campaignClock=chosen;activate(next,chosen);
 validateCampaignPortfolio(next);return next;
}
export function beginAdditionalCalendar(database,clock){
 validateCampaignCalendar(clock);const next=clone(database);
 // The new campaign forks the *visible* cash at the GM-confirmed creation
 // instant; existing legacy purchase proofs remain untouched and unassigned.
 const source=next.campaignClock,origin=source?campaignKey(source):null;
 for(const actor of next.characters||[]){
  if(!((clock.characterIds??next.characters.map(c=>c.id)).includes(actor.id)))continue;
  const balance=coinBalance(actor,origin);
  if(balance.ok)ensureCampaignCashAccount(actor,campaignKey(clock),clock.minute,{forkFrom:origin,openingPence:balance.balance});
 }
 captureActive(next);next.campaignClocks??=[];
 if(next.campaignClock)next.campaignClocks.push(next.campaignClock);
 next.campaignClock=clock;activate(next,clock);
 validateCampaignPortfolio(next);return next;
}
/** Refresh stored branches during participant changes (including additions). */
export function syncCampaignMembership(database,clock){
 const next=clone(database);captureActive(next);next.campaignClock=clone(clock);activate(next,clock);
 validateCampaignPortfolio(next);return next;
}
/** Character deletion and calendar deletion must not leave orphan branches. */
export function dropCampaignActorBranch(database,id){
 const next=clone(database);for(const branches of Object.values(next.campaignActorBranches??{}))delete branches[id];return next;
}
export function dropCampaignBranch(database,clock){
 const next=clone(database);delete next.campaignActorBranches?.[campaignKey(clock)];return next;
}
export function assertCampaignPortfolioAppendOnly(before,after){
 validateCampaignPortfolio(after);
 const previous=allCampaignClocks(before),present=new Map(allCampaignClocks(after).map(c=>[campaignKey(c),c]));
 for(const clock of previous){
  const current=present.get(campaignKey(clock));
  if(current){assertCampaignCalendarAppendOnly({campaignClock:clock},{campaignClock:current});continue;}
  assertCampaignCalendarAppendOnly({campaignClock:clock,calendarEvidenceArchives:before.calendarEvidenceArchives},
   {calendarEvidenceArchives:after.calendarEvidenceArchives});
 }
 return true;
}
/** A time-sensitive mutation belongs to the selected campaign only. */
export function assertCampaignActorTimeIsolation(before,after){
 if(!after.campaignClock)return true;
 const ids=new Set(after.campaignClock.characterIds??(after.characters||[]).map(c=>c.id));
 const oldPeople=new Map((before.characters||[]).map(c=>[c.id,c]));
 const signature=c=>JSON.stringify({combat:c?.hmk?.combatState??null,
  magic:c?.hmk?.liveEffects??null,arcane:c?.hmk?.arcane??null,
  injuries:c?.hmk?.injuries??null,expedition:c?.hmk?.expedition??null});
 const inventoryOf=(db,id)=>JSON.stringify((db.inventory??[]).filter(i=>i.characterId===id));
 for(const c of after.characters||[]){const old=oldPeople.get(c.id);
  if(!old||ids.has(c.id))continue;
  if(signature(old)!==signature(c)||inventoryOf(before,c.id)!==inventoryOf(after,c.id))
   fail(`Postava ${c.name} není v právě otevřené kampani. Před změnou časově citlivého stavu či inventáře otevřete její kalendář.`);
 }
 return true;
}
