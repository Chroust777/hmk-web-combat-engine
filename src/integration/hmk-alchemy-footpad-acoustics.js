/** HMK v1.2 p.272 — Footpad's non-skill acoustic consequences.
 * No fabricated Perception/Hearing EML: the text provides sound descriptions,
 * and an aggregate wielded-object weight limit, not a numerical listener test.
 * Reads the existing alchemy/Decay/Physic ledger and physical inventory only.
 */
import {activeFootpad} from './hmk-alchemy-imbibing.js';
export const FOOTPAD_ACOUSTIC_FORMAT='hmk-alchemy-footpad-acoustic-v1';
const check=(x,m)=>{if(!x)throw Error(m);};
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=256;
const validWeight=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100000;
const kinds=['ordinary-speech','shouting','wielded-objects'];

export function footpadAcousticState({journal=[],campaignId,minute,actorId,auralShockLevels=0}={}){
 check(validId(campaignId)&&validId(actorId)&&integer(minute,0,1e9)&&integer(auralShockLevels,0,100),
  'Footpad acoustics: neplatná kampaň, postava, čas nebo Aural Shock');
 const doses=activeFootpad(journal,campaignId,actorId,minute);
 const sourceUseIds=doses.map(d=>d.useId),sourceAS=doses.map(d=>d.state.currentAS);
 const overdue=doses.some(d=>d.state.nextDueMinute<=minute);
 return {sourceUseIds,sourceAS,activeAS:sourceAS.length?Math.max(...sourceAS):0,
  present:sourceAS.length>0,suspended:auralShockLevels>0,overdue,
  beneficial:sourceAS.length>0&&auralShockLevels===0,auralShockLevels};
}

export function createFootpadAcousticObservation({journal=[],inventory=[],campaignId,minute,actorId,
 auralShockLevels=0,kind,itemIds=[],spiritML=null,note='',gmConfirmed=false}={}){
 check(gmConfirmed===true,'Footpad acoustics: vyžaduje potvrzení GM');
 check(kinds.includes(kind)&&Array.isArray(itemIds)&&itemIds.length<=50&&typeof note==='string'&&note.length<=160,
  'Footpad acoustics: neplatná akce, předměty nebo poznámka');
 const status=footpadAcousticState({journal,campaignId,minute,actorId,auralShockLevels});
 check(status.present,'Footpad acoustics: postava nemá doložený účinný Footpad');
 check(!status.suspended,'Footpad acoustics: prospěšný účinek je během Aural Shock pozastaven');
 check(!status.overdue,'Footpad acoustics: nejprve vyřešte splatný Decay Roll');
 let items=[],weightLb=0,limitLb=null,affected=false,perceived='';
 if(kind==='ordinary-speech'){
  check(itemIds.length===0,'Footpad acoustics: řeč nevyžaduje předměty');
  perceived='whisper';affected=true;
 }else if(kind==='shouting'){
  check(itemIds.length===0,'Footpad acoustics: křik nevyžaduje předměty');
  perceived='ordinary-speech';affected=true;
 }else{
  check(integer(spiritML,1,1000),'Footpad acoustics: ověřené Spirit ML je povinné');
  check(itemIds.length>0&&new Set(itemIds).size===itemIds.length&&itemIds.every(validId),
   'Footpad acoustics: vyberte odlišné skutečně držené předměty');
  limitLb=spiritML/2;
  items=itemIds.map(id=>{
   const item=inventory.find(x=>x.id===id);
   check(item&&item.characterId===actorId&&['carried','none','main_hand','off_hand'].includes(item.slot)&&item.quantity===1,
    'Footpad acoustics: předmět musí být samostatný skutečně nesený inventární kus');
   const weight=item.snapshot?.properties?.weightLb;
   check(validWeight(weight),'Footpad acoustics: chybí ověřená inventární hmotnost');
   const name=String(item.snapshot?.name||item.name||'').trim();
   check(name.length>0,'Footpad acoustics: chybí název fyzického předmětu');
   return {id,name,weightLb:weight,slot:item.slot,quantity:1};
  });
  weightLb=Number(items.reduce((s,x)=>s+x.weightLb,0).toFixed(4));
  affected=weightLb<=limitLb;
  perceived=affected?'muffled':'unmodified';
 }
 return {format:FOOTPAD_ACOUSTIC_FORMAT,campaignId,minute,actorId,kind,
  sourceUseIds:status.sourceUseIds,sourceAS:status.sourceAS,
  activeAS:status.activeAS,auralShockLevels,spiritML:kind==='wielded-objects'?spiritML:null,
  items,weightLb,limitLb,affected,perceived,note:note.trim(),
  gmWieldedConfirmed:kind==='wielded-objects',gmConfirmed:true,sourcePage:272,
  hearingEMLModifier:null,timeAdvanced:false};
}

/** Reconstruct past observations from the preceding append-only campaign history.
 * Inventory snapshots are stored in each observation because live ownership may
 * change after the event. Its old values are guarded by the append-only check.
 */
export function validateFootpadAcousticJournal(journal=[]){
 const preceding=[];
 for(const row of journal){
  const proof=row.calendarAlchemyFootpadAcoustic;
  if(proof){
   check(row.calendarCampaignId===proof.campaignId&&row.characterId===proof.actorId&&row.campaignMinute===proof.minute,
    'Footpad acoustics: historický kontext nesouhlasí');
   const fakeInventory=proof.items?.map(x=>({id:x.id,characterId:proof.actorId,slot:x.slot,
    quantity:x.quantity,snapshot:{name:x.name,properties:{weightLb:x.weightLb}}}))||[];
   const reproduced=createFootpadAcousticObservation({journal:preceding,inventory:fakeInventory,
    campaignId:proof.campaignId,minute:proof.minute,actorId:proof.actorId,
    auralShockLevels:proof.auralShockLevels,kind:proof.kind,itemIds:fakeInventory.map(x=>x.id),
    spiritML:proof.spiritML,note:proof.note,gmConfirmed:proof.gmConfirmed});
   check(JSON.stringify(reproduced)===JSON.stringify(proof),
    'Footpad acoustics: přepsaný či neověřený historický důkaz');
  }
  preceding.push(row);
 }
 return true;
}
export function assertFootpadAcousticAppendOnly(previous=[],next=[]){
 const byId=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarAlchemyFootpadAcoustic)
  check(JSON.stringify(byId.get(row.id))===JSON.stringify(row),
   'Footpad acoustics: historický důkaz nelze smazat ani změnit');
 return true;
}
