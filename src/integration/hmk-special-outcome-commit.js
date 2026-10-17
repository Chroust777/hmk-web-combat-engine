/** HMK v1.2 pp.176,300,316–317: an SR is evidence, NOT a character-state
 * mutation. This module is the sole GM-confirmed one-shot bridge from an
 * immutable journal proof to persistent Fatigue / time-bound live effects.
 * Creation-derived hmk.religiousStatus and hmk.mysteries are never modified.
 */
import {initialCombatState,applyConfirmedFatigue} from './persistent-combat-state.js';
import {DAY_MINUTES} from './hmk-campaign-calendar.js';
import {doctrineChoices} from './hmk-creation-doctrine.js';

const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
const W=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const astralName=(power)=>[power?.family,power?.subject].filter(Boolean).join(' · ');
export const YEAR=360*DAY_MINUTES;
export const MONTH=30*DAY_MINUTES;
const auralEvents=c=>(c?.hmk?.combatState?.events||[]).filter(e=>['hmk-spell-misfire','hmk-spell-total-release','hmk-shaman-talisman-aural'].includes(e.type)&&Number(e.details?.auralShock)>0).length;

function religionOf(c){
 const h=c?.hmk||{};
 const from=h.startingDoctrine?.religion;
 const skill=h.religiousStatus?.ritualSkill||'';
 return from||(skill.startsWith('Ritual (')?skill.slice(8,-1):'');
}
export function activeSpecialEffects(actor,minute){
 const h=actor?.hmk?.liveEffects||{}, t=W(minute,0,1e9)?minute:null;
 const max0=actor?.hmk?.religiousStatus?.maxPiety;
 const maxPiety=W(max0,0,100)?max0+(t!==null&&h.festival?.until>t?1:0):null;
 return {
  festival:t===null?null:(h.festival?.until>t?h.festival:null),
  blessing:t===null?null:(h.blessing?.until>t?h.blessing:null),
  rites:(h.rites||[]).filter(r=>t!==null&&r.until>t&&r.active!==false&&auralEvents(actor)<=r.auralEventCount),
  talismans:(h.talismans||[]).filter(r=>t!==null&&r.until>t&&r.active!==false),
  lostSpiritPowers:h.lostSpiritPowers||[],
  maxPiety,
  currentPiety:h.currentPiety==null?null:(maxPiety===null?h.currentPiety:Math.min(maxPiety,h.currentPiety))
 };
}
/** Blessing applies ONLY to attested subjects, while the 30-day effect lasts. */
export function activeDoctrineModifier(actor,skill,minute){
 const b=activeSpecialEffects(actor,minute).blessing;
 return b&&b.subjects.includes(skill)?b.bonus:0;
}
/** A one-time proof receipt prevents reroll re-application and supports replay audit. */
export function applyRecordedSpecialOutcome({document,sourceId,commitId,gmConfirmed=false,
  ceremonyName='',ceremonyLevel='',subjects=[],spiritPowerIndex=null,talismanItemId='',
  basePeriodDays=null,recipientId='',powerIndex=null,attestedPeriod=false}={}){
 ensure(gmConfirmed===true&&attestedPeriod===true,'GM musí potvrdit odehrání celého období / obřadu / příslušného následku.');
 ensure(document?.campaignClock&&W(document.campaignClock.minute,0,1e9),'Pro časované následky je nutný potvrzený kalendář kampaně.');
 ensure(typeof sourceId==='string'&&sourceId&&typeof commitId==='string'&&commitId&&sourceId!==commitId,'Chybí ID zdrojového SR či zápisu následku');
 const source=document.journal.find(j=>j.id===sourceId);
 const proof=source?.skillTestProof;
 ensure(proof?.type==='special-secondary-roll'&&proof.outcome&&source.characterId===proof.actorId,'Zdroj musí být uložený původní zvláštní Secondary Roll');
 ensure(!document.journal.some(j=>j.id===commitId||j.specialOutcomeProof?.sourceId===sourceId),'Následek tohoto Secondary Roll už byl zapsán');
 ensure(proof.campaignMinute==null||proof.campaignMinute===document.campaignClock.minute,
  'Od původního hodu se změnil čas kampaně. Starý SR nelze použít na nové období.');
 const next=structuredClone(document),actor=next.characters.find(c=>c.id===proof.actorId);
 ensure(actor,'Postava původního SR už není aktivní');
 actor.hmk??={};const h=actor.hmk;
 h.liveEffects??={};const active=h.liveEffects, minute=next.campaignClock.minute;
 const outcome=proof.outcome,id=proof.routineId;let detail='',effect={};
 if(outcome.kind==='fatigue'||outcome.kind==='recovery'){
  ensure(!actor.hmk.injuries?.length||actor.hmk.combatState,'Starší rány nejsou převedeny do Combat State');
  const state=h.combatState??initialCombatState();
  const winded=['fatigue-climbing','fatigue-digging','fatigue-melee','fatigue-full-run','fatigue-sprint','fatigue-swimming'].includes(id);
  const kind=winded?'windedness':'weariness';
  const max=outcome.kind==='recovery'?Math.min(state.fatigue.weariness,outcome.wearinessRecovered):outcome.accrual;
  ensure(W(max,0,500)&&max%5===0,'Neověřený přírůstek/obnova Fatigue');
  const delta=outcome.kind==='recovery'?-max:max;
  // A single period cannot be charged repeatedly against re-rolled d10 on the same campaign minute.
  ensure(!next.journal.some(j=>j.specialOutcomeProof?.actorId===actor.id&&
   j.specialOutcomeProof?.minute===minute&&['fatigue','recovery'].includes(j.specialOutcomeProof?.family)),
   'Ve stejném okamžiku kampaně již byla zapsána Fatigue/Recovery. Posuňte potvrzený čas, nikoli další d10.');
  const updated=applyConfirmedFatigue({state,round:Math.max(1,state.lastRound||1),eventId:'special:'+sourceId,kind,delta});
  h.combatState=updated.state;
  detail=`${kind} ${delta>=0?'+':''}${delta}; celkem ${Object.values(updated.state.fatigue).reduce((a,b)=>a+b,0)+updated.state.bloodLoss.weaknessFatigue}`;
  effect={family:outcome.kind,kind,delta};
 }else if(id==='festival-style'){
  const faith=religionOf(actor),priest=next.characters.find(c=>c.id===proof.priestId);
  ensure(faith&&faith===religionOf(priest),'Festival vyžaduje doložené shodné náboženství účastníka i vedoucího.');
  if(outcome.renewedFaith){
   active.festival={sourceId,faith,from:minute,until:minute+YEAR};
   detail=`Renewed Faith: +1 maximální Piety do ${active.festival.until} (360 dní); bonus se nikdy nesčítá.`;
  }else detail='Festival neudělil Renewed Faith; trvalé hodnoty zůstávají beze změny.';
  effect={family:'divine',kind:'festival',faith,renewedFaith:!!outcome.renewedFaith,until:active.festival?.until??null};
 }else if(id==='ceremony-style'){
  const faith=religionOf(actor),priest=next.characters.find(c=>c.id===proof.priestId);
  ensure(faith&&faith===religionOf(priest),'Ceremony: kněz i účastník musí mít doložené shodné náboženství.');
  ensure(typeof ceremonyName==='string'&&ceremonyName.trim().length>=3&&ceremonyName.length<=100,'Uveďte konkrétní název uskutečněné Ceremony.');
  ensure(['Low','Mid','High'].includes(ceremonyLevel),'Potvrďte skutečnou úroveň obřadu Low/Mid/High.');
  ensure(Array.isArray(subjects)&&new Set(subjects).size===subjects.length,'Duplicitní Doctrine Subjects');
  const permitted=doctrineChoices(faith,ceremonyLevel),status=h.religiousStatus||{},rml=status.ritualML;
  ensure(permitted.length&&W(rml,1,1000),'Chybí ověřený Ritual ML nebo Doctrine náboženství.');
  const priestML=proof.primaryResult?.ml;
  ensure(W(priestML,1,1000),'V původním důkazu chybí Ritual ML kněze.');
  const rIndex=Math.floor(rml/10),pIndex=Math.floor(priestML/10);
  const maxPiety=Math.max(0,Number.isInteger(status.maxPiety)?status.maxPiety:Math.max(1,status.circle||0)-(status.orthodoxyPenalty||0))+
   (active.festival?.until>minute?1:0);
  ensure(subjects.length===Math.min(maxPiety,permitted.length)&&subjects.every(x=>permitted.includes(x)),'Vybrané Doctrine Subjects neodpovídají úrovni obřadu a maximum Piety.');
  const key=faith+'|'+ceremonyName.trim().toLowerCase();
  ensure(!(active.blessing?.key===key&&active.blessing.until>minute),'Tentýž obřad nelze během 30 dní opakovaně využít.');
  const bonus=Math.max(0,Math.min(pIndex+1,rIndex+outcome.benedictionModifier));
  active.blessing={sourceId,key,faith,from:minute,until:minute+MONTH,bonus,subjects:[...subjects],maxPiety};
  active.currentPiety=maxPiety;
  detail=`Blessing +${bonus} na ${subjects.join(', ')||'žádné Doctrine Subjects'}; Piety obnoveno na ${maxPiety}, do ${active.blessing.until} (30 dní).`;
  effect={family:'divine',kind:'ceremony',faith,bonus,maxPiety,subjects:[...subjects],until:active.blessing.until};
 }else if(id==='astral-recovery'){
  const powers=h.startingSpiritPowers?.powers??[];
  ensure(W(spiritPowerIndex,0,powers.length-1),'Vyberte konkrétní uloženou Spirit Power ze seznamu postavy.');
  ensure(Array.isArray(powers)&&powers.length,'Postava nemá doložené uložené Spirit Powers');
  active.spiritChecks??=[];active.lostSpiritPowers??=[];
  ensure(!active.spiritChecks.some(x=>x.powerIndex===spiritPowerIndex),
   'Pro tuto Spirit Power už byl zotavovací SR zapsán; nové úložiště vyžaduje novou doloženou astrální cestu.');
  active.spiritChecks.push({sourceId,powerIndex:spiritPowerIndex,minute,success:!!outcome.success});
  if(!outcome.success)active.lostSpiritPowers.push(spiritPowerIndex);
  detail=`${astralName(powers[spiritPowerIndex])}: ${outcome.success?'uložená síla zachována':'uložená síla ztracena; nové získání vyžaduje astrální cestu'}.`;
  effect={family:'astral',kind:'spirit-recovery',powerIndex:spiritPowerIndex,success:!!outcome.success};
 }else if(id==='astral-rite-member'){
  const shaman=next.characters.find(c=>c.id===proof.priestId);
  ensure(shaman&&shaman.id!==actor.id,'Shamanic Rite: účastník nesmí být sám vedoucí šaman.');
  const powers=shaman.hmk?.startingSpiritPowers?.powers??[];
  ensure(W(powerIndex,0,powers.length-1),'Vyberte konkrétní uloženou Anima III Power vedoucího šamana.');
  const pow=powers[powerIndex];
  ensure(pow.anima===3&&['Ancestor','Totem'].includes(pow.family),
   'Tento Rite vyžaduje uloženou Anima III Ancestor/Totem sílu. Energy Rite má vlastní Success Value a samostatnou proceduru.');
  ensure(!(shaman.hmk?.liveEffects?.lostSpiritPowers||[]).includes(powerIndex)&&
   !(shaman.hmk?.arcane?.auralShockLevels>0),'Shaman nesmí použít ztracenou sílu ani vykonávat Trance během Aural Shock.');
  ensure(proof.primaryResult?.level==='S'||proof.primaryResult?.level==='CS',
   'Úspěšná shamanic Rite musí mít skutečný potvrzený Trance S/CS. Trance CF vyžaduje nejprve Will a Aural Shock.');
  active.rites??=[];
  if(outcome.success){
   ensure(!(active.rites||[]).some(r=>r.until>minute&&r.family===pow.family&&
    (pow.family==='Totem'||r.subject===pow.subject)),
    'Stejný Ancestor Rite pro tuto dovednost nebo další Totem Rite již působí.');
   const rite={sourceId,from:minute,until:minute+MONTH,shamanId:shaman.id,powerIndex,
    family:pow.family,subject:pow.subject,anima:3,active:true,auralEventCount:auralEvents(actor)};
   active.rites.push(rite);
   detail=`${pow.family} Rite ${pow.subject}: 30 dní, do ${rite.until}. ${pow.family==='Ancestor'?'Mastery Boost, pokud již má účastník ML této dovednosti.':'Mírný totemový instinkt podle HMK str.304.'}`;
   effect={family:'astral',kind:'rite',success:true,shamanId:shaman.id,powerIndex,until:rite.until};
  }else{
   detail='Spirit SR při Rite neuspěl: časovaný účinek nevznikl.';
   effect={family:'astral',kind:'rite',success:false,shamanId:shaman.id,powerIndex};
  }
 }else if(id==='astral-talisman'){
  // An extension SR cannot establish a talisman out of thin air: a valid Trance bestowal is prerequisite.
  const current=(active.talismans||[]).find(t=>t.itemId===talismanItemId&&t.recipientId===actor.id&&t.until===minute&&t.active!==false);
  ensure(current,'Nenalezen aktivní talisman přesně na konci doloženého období. Nejdřív je nutný samostatný úspěšný Trance Bestowal.');
  ensure(next.inventory.some(x=>x.id===talismanItemId&&x.characterId===actor.id&&x.quantity===1),
   'Předmět není v držení příjemce talismanu.');
  if(outcome.success){current.until+=current.periodDays*DAY_MINUTES;detail=`Talisman prodloužen o ${current.periodDays} dní.`;}
  else{current.active=false;detail='Spirit SR neúspěšný; talisman pozbyl účinku.';}
  effect={family:'astral',kind:'talisman-extension',itemId:talismanItemId,grantSourceId:current.sourceId,success:!!outcome.success,until:current.until};
 }else{
  throw Error('Pro tuto činnost zatím nelze bezpečně vytvořit automatický trvalý účinek: '+id+'. Původní hod zůstává v deníku.');
 }
 next.journal.push({id:commitId,characterId:actor.id,title:`HMK · potvrzený následek ${source.title}`,body:detail,
  createdAt:new Date().toISOString(),specialOutcomeProof:{sourceId,actorId:actor.id,routineId:id,
   family:effect.family,minute,gmConfirmed:true,details:effect}});
 return {document:next,detail,effect};
}

/** Import and save gate: do not accept fabricated, unattested time-bound bonuses. */
export function validateSpecialEffectEvidence(document){
 const past=new Map((document.journal||[]).map(x=>[x.id,x]));
 for(const c of [...(document.characters||[]),...(document.trash||[])]){
  const h=c?.hmk?.liveEffects;if(!h)continue;
  ensure(h&&typeof h==='object'&&!Array.isArray(h),'Neplatné trvalé SR účinky');
  const verify=(o,routine,duration)=>{
   if(!o)return;
   ensure(typeof o.sourceId==='string'&&W(o.from,0,1e9)&&W(o.until,0,1e9)&&o.until-o.from===duration,
    'Časovaný účinek nemá pravidlovou dobu trvání');
   const src=past.get(o.sourceId),confirmation=(document.journal||[]).find(x=>x.specialOutcomeProof?.sourceId===o.sourceId);
   ensure(src?.skillTestProof?.routineId===routine&&confirmation?.specialOutcomeProof?.actorId===c.id,
    'Časovaný účinek neodkazuje na potvrzený původní Secondary Roll');
  };
  verify(h.festival,'festival-style',YEAR);
  verify(h.blessing,'ceremony-style',MONTH);
  if(h.blessing)ensure(W(h.blessing.bonus,0,200)&&Array.isArray(h.blessing.subjects)&&
   h.blessing.subjects.every(x=>typeof x==='string'&&x.length<100),'Chybné parametry Benediction');
  if(h.currentPiety!==undefined)ensure(W(h.currentPiety,0,200),'Neplatný Piety stav');
  for(const rite of h.rites||[]){
   const src=past.get(rite.sourceId)?.skillTestProof;
   const applied=(document.journal||[]).some(j=>j.specialOutcomeProof?.sourceId===rite.sourceId&&j.specialOutcomeProof?.actorId===c.id);
   const powers=document.characters.find(x=>x.id===rite.shamanId)?.hmk?.startingSpiritPowers?.powers??[];
   ensure(src?.routineId==='astral-rite-member'&&src.actorId===c.id&&src.priestId===rite.shamanId&&
    src.outcome?.success===true&&applied&&powers[rite.powerIndex]?.anima===3&&
    powers[rite.powerIndex]?.family===rite.family&&powers[rite.powerIndex]?.subject===rite.subject&&
    W(rite.from,0,1e9)&&W(rite.auralEventCount,0,999999)&&rite.until-rite.from===MONTH,
    'Časovaný Rite musí mít prokazatelný Trance + Spirit SR a správnou uloženou Anima III sílu.');
  }

  if(h.spiritChecks!==undefined){
   const checked=new Set(),powers=c.hmk?.startingSpiritPowers?.powers||[];
   ensure(Array.isArray(h.spiritChecks)&&Array.isArray(h.lostSpiritPowers||[]),'Neplatný seznam uložených Spirit Powers');
   for(const x of h.spiritChecks){
    ensure(W(x.powerIndex,0,powers.length-1)&&!checked.has(x.powerIndex)&&
     typeof x.success==='boolean'&&past.get(x.sourceId)?.skillTestProof?.routineId==='astral-recovery',
     'Zotavovací Spirit SR neodpovídá uložené síle');
    checked.add(x.powerIndex);
   }
   ensure((h.lostSpiritPowers||[]).every(index=>h.spiritChecks.some(x=>x.powerIndex===index&&x.success===false)),
    'Ztracené síly musí vycházet z neúspěšného Spirit SR');
  }
 }
 return true;
}
