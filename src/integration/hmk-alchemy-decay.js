/** HMK v1.2 p.268 — canonical elixir decay on the existing GM campaign clock.
 * Every 30 days after completion, d10 against current base AS; success -1,
 * failure -2. These are journal proofs, NOT inventory or autonomous clocks.
 * Historical rows are reconstructed in append order, never overwritten.
 */
export const ALCHEMY_DECAY_FORMAT='hmk-alchemy-elixir-decay-v1';
export const ALCHEMY_DECAY_PERIOD_MINUTES=30*1440;
const requireTrue=(x,message)=>{if(!x)throw Error(message)};
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const originOK=o=>o==='manual'||o==='cryptographic-software-die';
const relevant=(row,campaignId)=>row.calendarCampaignId===campaignId;
function initialElixir(journal,campaignId,finishId){
 const finish=journal.find(r=>r.id===finishId&&relevant(r,campaignId)&&r.calendarAlchemyFinish);
 const p=finish?.calendarAlchemyFinish;
 requireTrue(p&&p.result==='completed'&&integer(p.baseAS,6,11)&&p.campaignId===campaignId&&
  p.minute===finish.campaignMinute,'Alchemy Decay: chybí skutečně dokončený elixír s base AS6–11');
 return {finish,proof:p};
}
/** Authoritative strength as established by immutable completed + decay proofs.
 * minute is a display boundary; only rolls already documented by that minute
 * may affect AS. Absence of a roll is not an assumed successful roll.
 */
export function alchemyElixirStrength(journal=[],campaignId,finishId,minute=1e9){
 requireTrue(integer(minute,0,1e9),'Alchemy Decay: neplatná minuta kampaně');
 const {finish,proof}=initialElixir(journal,campaignId,finishId);
 let as=proof.baseAS,period=0,lastDecayId=null,imbibingId=null,activeTemporary=false;
 let dueMinute=proof.minute+ALCHEMY_DECAY_PERIOD_MINUTES;
 requireTrue(integer(dueMinute,0,1e9),'Alchemy Decay: termín mimo kalendář');
 let emptied=false;
 for(const row of journal){
  if(!relevant(row,campaignId)||row.campaignMinute>minute)continue;
  const use=row.calendarAlchemyImbibing;
  if(use?.finishId===finishId){
   requireTrue(!imbibingId&&emptied&&as>0&&use.asBefore===as&&
    use.finalAS===Math.max(0,as+use.modifier)&&use.temporary===(use.finalAS>0),
    'Alchemy Decay: neplatná změna AS po vypití');
   as=use.finalAS;imbibingId=row.id;activeTemporary=use.temporary;
  }
  if(row.calendarAlchemyVialEmpty?.finishId===finishId){
   requireTrue(!emptied,'Alchemy Decay: elixír lze vyprázdnit jen jednou');
   emptied=true;
  }
  const d=row.calendarAlchemyDecay;
  if(!d||d.finishId!==finishId)continue;
  requireTrue(as>0&&(!emptied||activeTemporary),'Alchemy Decay: prázdný nebo zaniklý elixír nelze degradovat');
  requireTrue(row.campaignMinute===d.minute&&row.campaignMinute===dueMinute,
    'Alchemy Decay: hody musí být na přesné splatnosti');
  requireTrue(d.period===period+1&&d.asBefore===as&&integer(d.d10,1,10)&&originOK(d.origin),
    'Alchemy Decay: nesouhlasí pořadí nebo původ hodu');
  const success=d.d10<=as,next=Math.max(0,as-(success?1:2));
  requireTrue(d.success===success&&d.asAfter===next&&d.dueMinute===dueMinute,
    'Alchemy Decay: důkaz AS neodpovídá d10');
  as=next;period++;lastDecayId=row.id;
  dueMinute+=ALCHEMY_DECAY_PERIOD_MINUTES;
  requireTrue(integer(dueMinute,0,1e9),'Alchemy Decay: termín mimo kalendář');
 }
 // Legacy empty proofs denote disposal. A new Imbibing receipt turns the same
 // physical emptying into a continuing Temporary enchantment (pp.269-270).
 const dispersed=emptied&&!activeTemporary;
 return {finishId,actorId:finish.characterId,elixirName:proof.elixirName,campaignId,
  completedMinute:proof.minute,initialAS:proof.baseAS,currentAS:as,period,
  lastDecayId,imbibingId,activeTemporary:activeTemporary&&as>0,dispersed,
  expires:as===0||dispersed,nextDueMinute:as>0&&!dispersed?dueMinute:null};
}
/** For every campaign elixir, list unresolved aging milestones; ignoring an
 * unbound elixir cannot silently suspend its mandatory natural decay.
 */
export function pendingAlchemyDecay(journal=[],campaignId,minute=1e9){
 return journal.filter(r=>relevant(r,campaignId)&&r.calendarAlchemyFinish?.result==='completed')
  .map(r=>alchemyElixirStrength(journal,campaignId,r.id,Math.max(minute,r.campaignMinute)))
  .filter(s=>!s.expires&&s.nextDueMinute<=minute);
}
export function alchemyElixirStates(journal=[],campaignId){
 return journal.filter(r=>relevant(r,campaignId)&&r.calendarAlchemyFinish?.result==='completed')
  .map(r=>alchemyElixirStrength(journal,campaignId,r.id));
}
export function createAlchemyDecay({journal=[],campaignId,minute,actorId,finishId,d10,origin,gmConfirmed=false}={}){
 requireTrue(typeof campaignId==='string'&&campaignId&&typeof finishId==='string'&&finishId&&
  integer(minute,0,1e9)&&integer(d10,1,10)&&originOK(origin),
  'Alchemy Decay: nutná kampaň, splatný termín a doložený hod d10 s původem');
 requireTrue(gmConfirmed===true,'Alchemy Decay: skutečný hod a termín musí potvrdit GM');
 const state=alchemyElixirStrength(journal,campaignId,finishId);
 requireTrue(actorId===state.actorId&&minute===state.nextDueMinute,
  'Alchemy Decay: hod je možný jen pro původní dokončení přesně v termínu GM');
 const success=d10<=state.currentAS,after=Math.max(0,state.currentAS-(success?1:2));
 return {format:ALCHEMY_DECAY_FORMAT,campaignId,minute,actorId,finishId,period:state.period+1,
  dueMinute:minute,asBefore:state.currentAS,d10,origin,success,asAfter:after,
  enchantmentLost:after===0,gmConfirmed:true,sourcePage:268};
}
export function requireAlchemyDecayGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 requireTrue(integer(beforeMinute,0,1e9)&&integer(afterMinute,beforeMinute,1e9),
  'Alchemy Decay: nepřípustný posun kampaně');
 const outstanding=pendingAlchemyDecay(journal,campaignId,afterMinute)
  .sort((a,b)=>a.nextDueMinute-b.nextDueMinute)[0];
 if(outstanding&&outstanding.nextDueMinute<afterMinute)
  throw Error('Alchemy Decay: GM nesmí přeskočit d10 proti AS elixíru '+outstanding.elixirName+
   ' (termín '+outstanding.nextDueMinute+'). Zastavte hodiny přesně v termínu.');
 return true;
}
export function validateAlchemyDecayJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const d=row.calendarAlchemyDecay;
  if(d){
   requireTrue(d.campaignId===row.calendarCampaignId&&d.actorId===row.characterId&&d.minute===row.campaignMinute,
    'Alchemy Decay: neplatný kontext historického důkazu');
   const reproduced=createAlchemyDecay({journal:prior,campaignId:d.campaignId,minute:d.minute,
    actorId:d.actorId,finishId:d.finishId,d10:d.d10,origin:d.origin,gmConfirmed:d.gmConfirmed});
   requireTrue(JSON.stringify(reproduced)===JSON.stringify(d),
    'Alchemy Decay: historický důkaz změněn nebo nekoherentní');
  }
  prior.push(row);
 }
 return true;
}
export function assertAlchemyDecayAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarAlchemyDecay)
  requireTrue(JSON.stringify(byId.get(r.id))===JSON.stringify(r),
   'Alchemy Decay: historický důkaz nelze změnit ani odstranit');
 return true;
}
