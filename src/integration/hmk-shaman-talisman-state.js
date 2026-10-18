/** HMK Kèthîra v1.2 pp.300,302–303: GM-witnessed Talisman Bestowal.
 * Append-only physical Trance/Will dice; one atomic document mutation.
 * Does NOT invent crafting, astral petition, recipient consent, or elapsed time.
 */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {successLevel} from '../rules/tests.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {DAY_MINUTES} from './hmk-campaign-calendar.js';
const ok=(x,m)=>{if(!x)throw Error(m);};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const levels=['CF','F','S','CS'];
function mastery(c,name){return availableMasteries(c).find(x=>x.name===name);}
const auralEvents=c=>(c?.hmk?.combatState?.events||[]).filter(e=>
 ['hmk-spell-misfire','hmk-spell-total-release','hmk-shaman-talisman-aural'].includes(e.type)&&Number(e.details?.auralShock)>0).length;
const talismanOwned=(item,recipientId)=>item&&item.characterId===recipientId&&item.quantity===1&&
 ['carried','main_hand','off_hand'].includes(item.slot||'none');
export function reconcileTalismanPossession(before,next){
 const minute=next?.campaignClock?.minute;
 if(!whole(minute,0,1e9))return next;
 for(const recipient of next.characters||[]){
  for(const t of recipient.hmk?.liveEffects?.talismans||[]){
   if(t.active===false)continue;
   const owned=talismanOwned((next.inventory||[]).find(i=>i.id===t.itemId),recipient.id);
   if(!owned){
    if(t.missingSince==null)t.missingSince=minute;
    if(minute-t.missingSince>=DAY_MINUTES)t.active=false;
   }else if(t.missingSince!=null){
    if(minute-t.missingSince>=DAY_MINUTES)t.active=false;
    else t.missingSince=null;
   }
   if(auralEvents(recipient)>t.auralEventCount)t.active=false;
  }
  for(const r of recipient.hmk?.liveEffects?.rites||[]){
   if(r.active!==false&&auralEvents(recipient)>r.auralEventCount)r.active=false;
  }
 }
 return next;
}
export function projectTalismanStatus({recipient,inventory=[],minute}={}){
 const all=recipient?.hmk?.liveEffects?.talismans||[];
 return all.map(t=>{
  const owned=inventory.some(x=>x.id===t.itemId&&talismanOwned(x,recipient.id));
  const elapsed=whole(minute,0,1e9)?minute:null;
  return {...t,owned,effective:owned&&elapsed!==null&&elapsed<t.until&&t.active!==false&&auralEvents(recipient)<=t.auralEventCount&&!(t.missingSince!=null&&elapsed-t.missingSince>=DAY_MINUTES),
   reason:!owned?'Předmět není v držení příjemce':elapsed===null?'Chybí potvrzený kalendář':elapsed>=t.until?'Vypršelo období; vyžaduje Spirit SR':t.active===false||auralEvents(recipient)>t.auralEventCount?'Účinek ukončen Aural Shock / ztrátou držení':'Aktivní'};
 });
}
export function applyTalismanBestowal({document,shamanId,recipientId,itemId,powerIndex,eventId,
 tranceRoll,tranceEML,willRoll=null,willEML=null,gmConfirmed=false,ritualElapsed=false,recipientWilling=false}={}){
 ok(gmConfirmed===true&&ritualElapsed===true&&recipientWilling===true,
  'GM musí potvrdit ochotu příjemce, skutečný obřad a uplynutí předepsaného času.');
 const minute=document?.campaignClock?.minute;
 ok(whole(minute,0,1e9),'Talisman vyžaduje potvrzený kalendář.');
 ok(typeof eventId==='string'&&eventId.length>=3&&eventId.length<=120&&!document.journal.some(x=>x.id===eventId),
  'Chybějící nebo duplicitní ID bestowalu');
 ok(shamanId!==recipientId,'Šaman nesmí obdarovat sám sebe.');
 const shaman=document.characters.find(c=>c.id===shamanId),recipient=document.characters.find(c=>c.id===recipientId);
 ok(shaman&&recipient&&shamanId&&recipientId,'Chybí šaman nebo jiný živý příjemce.');
 const spirit=shaman.hmk?.startingSpiritPowers,powers=spirit?.powers??[];
 ok(whole(powerIndex,0,powers.length-1),'Vyberte jednu doloženou uloženou Spirit Power.');
 const power=powers[powerIndex];
 ok(power.talisman===true&&['Ancestor','Totem'].includes(power.family),
  'Bestowal je dovolen jen u Ancestor/Totem síly s již zaplacenou dodatečnou Anima.');
 ok(!(shaman.hmk?.liveEffects?.lostSpiritPowers||[]).includes(powerIndex),
  'Spirit Power byla po Aural Shock ztracena a nebyla znovu získána astrální cestou.');
 ok(!shaman.hmk?.arcane?.auralShockLevels,'Trance nelze provádět během Aural Shock (HMK str. 300).');
 ok(document.inventory.some(x=>x.id===itemId&&x.characterId===recipientId&&x.quantity===1&&x.snapshot?.category==='other'&&
  ['carried','main_hand','off_hand'].includes(x.slot||'none')),
  'Příjemce musí mít konkrétní jednotlivý předmět talismanu ze svého inventáře.');
 const old=recipient.hmk?.liveEffects||{};
 ok(!(old.talismanLockouts||[]).some(x=>x.until>minute),
  'Příjemce musí po neúspěšném bestowalu počkat 30 dní.');
 const concurrent=projectTalismanStatus({recipient,inventory:document.inventory,minute}).filter(t=>t.effective);
 ok(!concurrent.some(t=>t.itemId===itemId),'Předmět již obsahuje aktivní talisman.');
 ok(!(power.family==='Totem'&&concurrent.some(t=>t.family==='Totem')),
  'Na jednoho příjemce lze současně bestowovat jen jeden Totem Talisman.');
 ok(!(power.family==='Ancestor'&&concurrent.some(t=>t.family==='Ancestor'&&t.subject===power.subject)),
  'Příjemce již má aktivní Ancestor Talisman pro totožnou dovednost.');
 const trance=mastery(shaman,'Trance');
 ok(trance&&whole(trance.ml,1,1000)&&whole(tranceRoll,1,100)&&whole(tranceEML,0,100),
  'Chybí ověřené Trance ML/EML či skutečný d100.');
 const tranceLevel=levels[successLevel(tranceRoll,tranceEML)];
 const required=Math.max(0,15-Math.floor(trance.ml/10));
 let willLevel=null,willML=null,shock=0;
 if(tranceLevel==='CF'){
  const will=mastery(shaman,'Will');
  ok(will&&whole(will.ml,1,1000)&&whole(willEML,0,100)&&whole(willRoll,1,100),
   'Trance CF vyžaduje povinný následný Will test se skutečným d100.');
  willML=will.ml;willLevel=levels[successLevel(willRoll,willEML)];
  if(willLevel==='F')shock=power.anima;
  if(willLevel==='CF')shock=power.anima+1;
 }else ok(willRoll===null&&willEML===null,'Will test je dovolen pouze při Trance CF.');
 const next=structuredClone(document),nextRecipient=next.characters.find(c=>c.id===recipientId),nextShaman=next.characters.find(c=>c.id===shamanId);
 nextRecipient.hmk??={};nextRecipient.hmk.liveEffects??={};
 const state=nextRecipient.hmk.liveEffects;
 let note='',effect;
 if(tranceLevel==='S'||tranceLevel==='CS'){
  const periodDays=spirit.index+(tranceLevel==='CS'?2:0);
  ok(whole(periodDays,1,50),'Nelze doložit Spirit Index a dobu bestowalu.');
  state.talismans??=[];
  effect={sourceId:eventId,from:minute,until:minute+periodDays*DAY_MINUTES,periodDays,
   recipientId,shamanId,itemId,powerIndex,family:power.family,subject:power.subject,anima:power.anima,auralEventCount:auralEvents(nextRecipient),missingSince:null,active:true};
  state.talismans.push(effect);
  note=`Talisman ${power.family} / ${power.subject} předán ${nextRecipient.name}; ${periodDays} dní, do ${effect.until}.`;
 }else if(tranceLevel==='F'){
  state.talismanLockouts??=[];
  state.talismanLockouts.push({sourceId:eventId,from:minute,until:minute+30*DAY_MINUTES,shamanId,recipientId});
  note='Trance F: talisman nebyl předán; příjemce nesmí dalších 30 dní podstoupit další bestowal.';
 }else{
  note=`Trance CF: bez účinku. Povinný Will ${willLevel}${shock?`; Aural Shock +${shock}`:''}.`;
  if(shock){
   nextShaman.hmk??={};nextShaman.hmk.arcane??={};
   const arc=nextShaman.hmk.arcane, oldLevel=arc.auralShockLevels??0;
   ok(whole(oldLevel,0,99)&&oldLevel+shock<=99,'Aural Shock by překročil povolenou úroveň.');
   const combat=nextShaman.hmk.combatState??initialCombatState();validateCombatState(combat);
   ok(combat.fatigue.otherWeakness+5*shock<=99999,'Aural Weakness mimo rozsah.');
   arc.auralShockLevels=oldLevel+shock;
   combat.fatigue.otherWeakness+=shock*5;
   combat.events.push({id:'shaman-aural:'+eventId,type:'hmk-shaman-talisman-aural',round:Math.max(1,combat.lastRound||1),
    details:{auralShock:shock,tranceLevel,willLevel,sourceEventId:eventId}});
   nextShaman.hmk.combatState=combat;validateCombatState(combat);
  }
 }
 next.journal.push({id:eventId,characterId:shamanId,createdAt:new Date().toISOString(),
  title:'Shaman · Talisman Bestowal '+tranceLevel,body:note,
  talismanBestowalProof:{sourcePage:300,shamanId,recipientId,itemId,powerIndex,minute,
   gmConfirmed:true,recipientWilling:true,ritualElapsed:true,requiredMinutes:required,
   tranceML:trance.ml,tranceEML,tranceRoll,tranceLevel,
   willML,willEML,willRoll,willLevel,auralShock:shock,
   granted:!!effect,until:effect?.until??null,lockoutUntil:tranceLevel==='F'?minute+30*DAY_MINUTES:null}});
 return {document:next,note,proof:next.journal.at(-1).talismanBestowalProof,effect};
}
export function validateTalismanEvidence(document){
 const journal=new Map((document.journal||[]).map(x=>[x.id,x]));
 for(const entry of document.journal||[]){
  const p=entry.talismanBestowalProof;if(!p)continue;
  const shaman=document.characters.find(c=>c.id===p.shamanId),recipient=document.characters.find(c=>c.id===p.recipientId);
  const power=shaman?.hmk?.startingSpiritPowers?.powers?.[p.powerIndex];
  ok(shaman&&recipient&&entry.characterId===shaman.id&&p.recipientId!==p.shamanId&&p.gmConfirmed===true&&
   p.recipientWilling===true&&p.ritualElapsed===true&&power?.talisman===true&&['Ancestor','Totem'].includes(power.family)&&
   whole(p.tranceRoll,1,100)&&whole(p.tranceEML,0,100)&&
   levels[successLevel(p.tranceRoll,p.tranceEML)]===p.tranceLevel&&
   whole(p.minute,0,1e9),
   'Talisman Bestowal Journal musí mít skutečný Trance, Spirit Power a potvrzení GM.');
  if(p.tranceLevel==='CF'){
   ok(whole(p.willRoll,1,100)&&whole(p.willEML,0,100)&&
    levels[successLevel(p.willRoll,p.willEML)]===p.willLevel&&
    p.auralShock===(p.willLevel==='CF'?power.anima+1:p.willLevel==='F'?power.anima:0),
    'Trance CF musí obsahovat správný Will a Aural Shock.');
   if(p.auralShock)ok(shaman.hmk?.combatState?.events?.some(e=>e.id==='shaman-aural:'+entry.id&&
    e.type==='hmk-shaman-talisman-aural'&&e.details?.auralShock===p.auralShock),
    'Šamanský Aural Shock musí být skutečně uložen v Combat State.');
  }
 }

 const okProof=(c,sourceId,kind)=>{
  const p=journal.get(sourceId)?.talismanBestowalProof;
  ok(p&&p.recipientId===c.id&&p.gmConfirmed===true,
   'Talisman '+kind+' nemá ověřený původní Trance a souhlas GM.');return p;
 };
 for(const c of document.characters||[]){
  const h=c.hmk?.liveEffects;if(!h)continue;
  for(const t of h.talismans||[]){
   const p=okProof(c,t.sourceId,'bestowal');
   ok(p.granted&&p.itemId===t.itemId&&p.shamanId===t.shamanId&&p.powerIndex===t.powerIndex&&
    t.periodDays===Math.floor((document.characters.find(x=>x.id===t.shamanId)?.hmk?.startingSpiritPowers?.index??-100))+(p.tranceLevel==='CS'?2:0)&&
    t.from===p.minute&&
    whole(t.auralEventCount,0,999999)&&(!t.missingSince||whole(t.missingSince,0,1e9))&&
    whole(t.from,0,1e9)&&whole(t.until,0,1e9)&&t.until>=t.from+t.periodDays*DAY_MINUTES,
    'Talisman neodpovídá uložené síle, původnímu Trance ani době trvání.');
   const exts=(document.journal||[]).filter(j=>j.specialOutcomeProof?.details?.kind==='talisman-extension'&&
    j.specialOutcomeProof?.details?.itemId===t.itemId&&j.specialOutcomeProof?.details?.grantSourceId===t.sourceId&&j.specialOutcomeProof?.actorId===c.id&&
    j.specialOutcomeProof?.details?.success===true);
   let expected=p.until;
   for(const entry of exts){
    const sr=journal.get(entry.specialOutcomeProof.sourceId)?.skillTestProof;
    ok(sr?.routineId==='astral-talisman'&&sr.actorId===c.id&&sr.outcome?.success===true&&
     sr.campaignMinute===expected,'Talisman Spirit SR musí připadnout přesně na konec předchozího období.');
    expected+=t.periodDays*DAY_MINUTES;
   }
   ok(t.until===expected,'Doba talismanu nesouhlasí s původním Trance a potvrzenými Spirit SR.');

  }
  for(const l of h.talismanLockouts||[]){
   const p=okProof(c,l.sourceId,'lockout');
   ok(p.tranceLevel==='F'&&l.until-l.from===30*DAY_MINUTES&&l.from===p.minute,
    'Talisman F lockout musí trvat 30 dní od původního Trance.');
  }
 }
 return true;
}
/** HMK p.57 and pp.302–303: Ancestor Rite grants one MB, Talisman
 * grants Anima MBs to a recipient who already has an ML. Their boosts
 * OVERLAP rather than stack. No invented SB is used for an untrained skill.
 */
export function masteryBoostAmount(ml){
 if(!whole(ml,1,1000))throw Error('Mastery Boost vyžaduje ověřené existující ML');
 return ml<=39?10:ml<=44?9:ml<=49?8:ml<=59?7:ml<=69?6:ml<=79?5:ml<=99?4:3;
}
export function activeShamanSkillModifier({actor,skill,minute,inventory=[]}={}){
 const base=availableMasteries(actor).find(x=>x.name===skill)?.ml??0;
 if(!base||!whole(minute,0,1e9)||actor.hmk?.arcane?.auralShockLevels>0)return 0;
 const active=actor.hmk?.liveEffects||{};
 const rites=(active.rites||[]).filter(r=>r.family==='Ancestor'&&r.subject===skill&&r.until>minute&&r.anima===3&&r.active!==false&&auralEvents(actor)<=r.auralEventCount);
 const tals=projectTalismanStatus({recipient:actor,inventory,minute}).filter(t=>t.effective&&t.family==='Ancestor'&&t.subject===skill);
 const boosts=Math.max(rites.length?1:0,...tals.map(t=>t.anima),0);
 if(!boosts)return 0;
 let ml=base;
 for(let k=0;k<boosts;k++)ml+=masteryBoostAmount(ml);
 return ml-base;
}
