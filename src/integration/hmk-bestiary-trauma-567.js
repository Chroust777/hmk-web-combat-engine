/** HMK 1.2 pp. 167–169, 178–182: species-specific, evidence-first trauma.
 * This is separate from the human Combat State. All actual dice must be supplied.
 * For untranscribed anatomy marks, compound injuries, or complex procedures the
 * transition is deliberately blocked rather than producing an invented outcome.
 */
import {previewAnimalContact566} from './hmk-bestiary-anatomy-566.js';
import {SL,successLevel} from '../rules/tests.js';
import {calculateShockState,applyShockState,shockRecoverySchedule,resolveShockReroll} from '../rules/shock.js';
import {injuryFromEffectiveImpact} from '../rules/injury.js';
import {bloodStoppageResult,applyBloodLoss} from '../rules/bleeding.js';
import {healingBase,treatmentContract,treatmentRollEMLFromInjury,resolveTreatmentTable,
 resolveInjuryHealingRoll,healingFailureIsCritical,treatmentDurationMinutes,infectionInitialHR,resolveInfectionCourse,resolveBloodLossHealing} from '../rules/healing.js';

const valid=(x,msg)=>{if(!x)throw Error(msg)};
const int=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const names=Object.fromEntries(Object.entries(SL).map(([k,v])=>[v,k]));
const clone=x=>structuredClone(x);
const byId=(list,id)=>list.find(x=>x.id===id);
const injuryLabel=l=>l<=0?'Healed':l===1?'M1':l<=3?'S'+l:'G'+l;
export const ANIMAL_TRAUMA_FORMAT_567='hmk-bestiary-trauma-567-v1';
export function animalHealthProjection567(journal,campaignId,encounterId){
 const records=(journal||[]).filter(j=>j.bestiaryTrauma?.format===ANIMAL_TRAUMA_FORMAT_567&&
  j.bestiaryTrauma.campaignId===campaignId&&j.bestiaryTrauma.targetId===encounterId);
 const wounds=[];let shock='none',lastMinute=-1,shockOriginMinute=null,extendedShock=null,coma=null,shockDueMinute=null,extendedShockDueMinute=null,bloodLoss={bp:0,weaknessFatigue:0},bloodHealingDueMinute=null,infectionDueMinute=null;
 for(const row of records){const p=row.bestiaryTrauma;
  valid(p.minute>=lastMinute,'Zdravotní události tvora jdou proti času kampaně.');lastMinute=p.minute;
  if(p.kind==='hit'){
   const oldShock=shock;shock=applyShockState(shock,p.shock.incoming);
   if(shock!==oldShock){shockOriginMinute=p.minute;shockDueMinute=shock==='unconscious'?p.minute+10:null;}
   if(p.injury){valid(!byId(wounds,p.woundId),'Duplicitní rána tvora.');
    wounds.push({id:p.woundId,sourceId:row.id,location:p.location.id,locationName:p.location.name,
     level:p.injury.level,aspect:p.aspect,bleeding:p.bleeding,minute:p.minute,
     treatment:null,infected:false,healed:false,staunchBonus:0,nextDueMinute:p.bleeding?p.minute+5:null});}
  }else if(p.kind==='blood'){
   const wound=byId(wounds,p.woundId);valid(wound&&wound.bleeding&&!wound.healed,'Blood Stoppage / Loss bez aktivního Bleeder.');
   wound.bleeding=!p.stopped;wound.staunchBonus=p.nextStaunchBonus;
   wound.nextDueMinute=p.stopped?null:p.minute+5;
   if(p.bp>bloodLoss.bp&&bloodLoss.bp===0)bloodHealingDueMinute=p.minute+14400;
   bloodLoss={bp:p.bp,weaknessFatigue:p.bp*5};
   if(p.after!==shock){shockOriginMinute=p.minute;shockDueMinute=p.after==='unconscious'?p.minute+10:null;}
   shock=p.after;
   if(shock==='killed')shockDueMinute=null;
}else if(p.kind==='shock-recovery'){
   shock=p.after;extendedShock=p.extendedShock??null;coma=p.coma??null;
   if(shock==='none')shockDueMinute=null;else if(shock==='unconscious')shockDueMinute=shockOriginMinute+10;
   extendedShockDueMinute=extendedShock?.active?p.minute+240:null;
  }else if(p.kind==='extended-course'){
   shock=p.after;extendedShock=p.extendedShock;
   if(shock==='none')shockDueMinute=null;extendedShockDueMinute=extendedShock?.active?p.minute+240:null;
  }else if(p.kind==='treatment'){
   const w=byId(wounds,p.woundId);valid(w&&!w.healed&&!w.treatment,'Neplatné opakované ošetření.');
   valid(!w.bleeding,'Krvácející rána musí být nejprve pravidlově zastavena.');
   w.treatment={hr:p.healingRate,method:p.method,treatedAt:p.minute,possibleInfection:p.possibleInfection};
   if(p.healed){w.healed=true;w.level=0;w.nextDueMinute=null;}
   else w.nextDueMinute=w.minute+7200; // 5 days after original injury (HMK p181)
  }else if(p.kind==='healing'){
   const w=byId(wounds,p.woundId);valid(w&&!w.healed&&w.treatment&&!w.infected,'Healing Roll bez aktivní ošetřené rány.');
   w.level=p.afterLevel;w.healed=w.level===0;w.infected=p.infected;
   if(p.infected){w.infectionHR=infectionInitialHR(w.treatment.hr);w.infectionDueMinute=p.minute+1440;}
   w.nextDueMinute=w.healed||w.infected?null:p.minute+7200;
  }else if(p.kind==='infection-course'){
   const wound=byId(wounds,p.woundId);valid(wound&&wound.infected,'Chybí aktivní Infection Course.');
   wound.infectionHR=p.afterHR;wound.infectionDueMinute=p.active?p.minute+1440:null;
   if(p.dead)shock='killed';
   if(p.defeated){wound.infected=false;for(const other of wounds)
    if(!other.healed&&other.treatment&&!other.infected)other.nextDueMinute=p.minute+7200;}
  }else if(p.kind==='blood-healing'){
   bloodLoss={bp:p.afterBP,weaknessFatigue:p.afterBP*5};
   bloodHealingDueMinute=p.afterBP===0?null:p.minute+(p.skipNextPeriod?28800:14400);
  }
 }
 infectionDueMinute=wounds.reduce((due,w)=>w.infected&&w.infectionDueMinute!==null?Math.min(due,w.infectionDueMinute):due,Infinity);
 if(infectionDueMinute===Infinity)infectionDueMinute=null;
 return {wounds,shock,bloodLoss,bloodHealingDueMinute,infectionDueMinute,records,lastMinute,shockOriginMinute,shockDueMinute,extendedShockDueMinute,extendedShock,coma};
}
/** Requires a fully confirmed physical hit; automatically derives only the parts
 * that are valid without untranscribed Bleeding/Amputation symbols. */
export function prepareAnimalHit567({attacker,defender,inputs,previous,minute,eventId}={}){
 valid(attacker?.profile&&defender?.profile&&attacker.id!==defender.id,'Vyber dva různé platné tvory encounteru.');
 valid(int(minute,0,1e10)&&typeof eventId==='string'&&eventId,'Chybí herní čas/ID.');
 valid(inputs?.aimConfirmed===true&&inputs?.specialsReviewed===true&&inputs?.bleedingReviewed===true,
  'GM musí doložit zásah i kontrolu krvácení a druhových zvláštních následků.');
 valid(int(inputs.shockRoll,1,100)&&int(inputs.shockFatigue,0,300)&&inputs.shockFatigue%5===0, 'Vyžaduje skutečné Shock d100 a ověřenou Fatigue.');
 valid(['yes','no'].includes(inputs.rigidArmour),'Potvrď Rigid Armour na konkrétní lokaci.');
 valid(typeof inputs.bleeding==='boolean','Potvrď možnost krvácení pro danou lokalitu, aspekt a IL.');
 valid(!previous||!['incapacitated','unconscious','killed'].includes(previous.shock),
  'Před dalším zraněním nejdříve vyřeš původní INC/UNC/KIA a související časový postup.');
 const contact=previewAnimalContact566({attackerProfile:attacker.profile,defenderProfile:defender.profile,
  weaponIndex:inputs.weaponIndex,aimZN:inputs.aimZN,zdRoll:inputs.zdRoll,
  locationD10:inputs.locationD10,impactDieRoll:inputs.impactDieRoll,
  extraImpact:inputs.extraImpact,aimConfirmed:true});
 valid(!contact.miss&&contact.effectiveImpact>0,'Tento hod nevyvolal účinné zranění.');
 valid(!(previous?.wounds||[]).some(w=>!w.healed&&w.location===contact.location.id),
  'Compound Injury vyžaduje skutečný d10 a vyřešení původní rány; obyčejný zápis je blokován.');
 const medical=injuryFromEffectiveImpact({effectiveImpact:contact.effectiveImpact,aspect:contact.aspect,
  rigidArmour:inputs.rigidArmour==='yes'});
 if(!medical.injury&& !medical.glancing)throw Error('Není zdravotní účinek.');
 // Exotic anatomical symbols need validated GM rulings; do not infer amputation.
 if(medical.injury?.level===5&&contact.aspect==='e')throw Error('G5e: Amputation Sequence se zatím nesmí nahradit čestným potvrzením. Zdravotní zápis je blokován.');
 const printedShock=defender.profile.combat?.shock;
 valid(int(printedShock,1,300),'Cíl nemá ověřený Shock ML.');
 const eml=printedShock-inputs.shockFatigue+(medical.shockTestModifier||0),sl=successLevel(inputs.shockRoll,eml);
 const shk=calculateShockState({locationShock:contact.location.locationShock,injuryShock:medical.injuryShock,shockSL:sl});
 const total=applyShockState(previous?.shock||'none',shk.state);
 const due=total==='unconscious'?minute+10:inputs.bleeding?minute+5:null;
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'hit',campaignId:inputs.campaignId,targetId:defender.id,
  sourceId:attacker.id,woundId:medical.injury?eventId:null,minute,
  contactInputs:{weaponIndex:inputs.weaponIndex,aimZN:inputs.aimZN,zdRoll:inputs.zdRoll,
   locationD10:inputs.locationD10,impactDieRoll:inputs.impactDieRoll,extraImpact:inputs.extraImpact},
  location:contact.location,aspect:contact.aspect,strikeImpact:contact.strikeImpact,
  effectiveImpact:contact.effectiveImpact,armourValue:contact.armourValue,
  injury:medical.injury?clone(medical.injury):null,glancing:medical.glancing,bleeding:inputs.bleeding,
  rigidArmour:inputs.rigidArmour==='yes',specialsReviewed:true,amputationResolved:inputs.amputationResolved===true,
  shock:{ml:printedShock,fatigue:inputs.shockFatigue,eml,roll:inputs.shockRoll,
   level:names[sl],location:contact.location.locationShock,injury:medical.injuryShock,
   index:shk.index,incoming:shk.state,after:total,followup:shockRecoverySchedule(total)},
  nextDueMinute:due,unresolved:['Mishap/Morale a potvrzené druhové efekty mimo tuto proceduru',
   'Krvácení: při BLD je nutná samostatná Blood Stoppage a Blood Loss Sequence',
   'Shock Reroll/Extended Shock/Coma musí být vyřešen samostatně před léčbou']};
}
/** HMK p178: one five-minute Bleeder slot. Blood Loss and physician's
 * attempt are an inseparable medical event, avoiding a duplicate Advance. */
export function prepareAnimalBlood567({profile,previous,wound,minute,method='none',physicianML=null,stoppageRoll=null,lossRoll=null,gmConfirmed=false}={}){
 valid(!!previous&&!!wound&&wound.bleeding&&!wound.healed&&previous.shock!=='killed','Tvor nemá aktivní krvácivou ránu nebo již zemřel.');
 valid(gmConfirmed===true&&int(minute,0,1e10)&&minute===wound.nextDueMinute,
  'Blood Loss / Stoppage lze zapsat jen přesně v pětiminutovém termínu.');
 valid(['none','staunch','cauterisation'].includes(method),'Neplatná metoda zastavení krvácení.');
 let stopSL=null,stop={stopped:false,advanceRoll:true,nextStaunchBonus:0},stopEML=null;
 if(method!=='none'){
  valid(int(physicianML,1,300)&&int(stoppageRoll,1,100),'Blood Stoppage vyžaduje skutečné Physician ML a d100.');
  stopEML=physicianML+(method==='cauterisation'?30:wound.staunchBonus||0);
  stopSL=successLevel(stoppageRoll,stopEML);stop=bloodStoppageResult(stopSL);
 }else valid(physicianML===null&&stoppageRoll===null,'Bez ošetření nesmějí být zadány smyšlené hody.');
 if(stop.advanceRoll)valid(int(lossRoll,1,100),'Vyžaduje skutečný Blood Loss d100.');
 else valid(lossRoll===null,'Při CS Stoppage se již Blood Loss Roll neprovádí.');
 const lossSL=stop.advanceRoll?successLevel(lossRoll,50):null;
 const resolved=stop.advanceRoll?applyBloodLoss({currentBP:previous.bloodLoss?.bp??0,sl:lossSL,currentShockState:previous.shock}):
  {bp:previous.bloodLoss?.bp??0,weaknessFatigue:(previous.bloodLoss?.bp??0)*5,shockState:previous.shock};
 valid(int(profile?.attributes?.str,1,150),'Tvor nemá doložené STR (non-Folk Blood Loss ML50).');
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'blood',targetId:profile.id,woundId:wound.id,
  minute,method,physicianML,stoppageRoll,stopEML,stoppageSL:stopSL===null?null:names[stopSL],
  lossRoll,lossEML:lossSL===null?null:50,lossSL:lossSL===null?null:names[lossSL],
  stopped:stop.stopped,nextStaunchBonus:stop.stopped?0:stop.nextStaunchBonus,
  bp:resolved.bp,weaknessFatigue:resolved.weaknessFatigue,after:resolved.shockState,sourcePage:178};
}
/** HMK p181: infected wounds suspend all other Injury Healing Rolls.
 * A daily Course d100 changes infection HR; no missing physician aid is added. */
export function prepareAnimalInfectionCourse567({profile,previous,wound,minute,roll,fatigue=0,gmConfirmed=false}={}){
 valid(previous&&wound?.infected&&!wound.healed&&previous.shock!=='killed','Není aktivní Infection Course.');
 valid(gmConfirmed===true&&int(roll,1,100)&&int(fatigue,0,300)&&minute===wound.infectionDueMinute,
  'Infekce: skutečný d100 přesně v jednodenním termínu.');
 const a=profile?.attributes||{};valid(int(a.end,1,100)&&int(a.wil,1,100),'Chybí ověřená END/WIL.');
 const hb=healingBase({endurance:a.end,will:a.wil}),eml=hb*wound.infectionHR-fatigue;
 const sl=successLevel(roll,eml),res=resolveInfectionCourse({hr:wound.infectionHR,sl});
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'infection-course',targetId:profile.id,woundId:wound.id,minute,
  hb,beforeHR:wound.infectionHR,afterHR:res.hr,eml,fatigue,roll,sl:names[sl],
  active:res.active,defeated:res.defeated,dead:res.dead,weaknessFatigue:res.weaknessFatigue,sourcePage:181};
}
/** HMK p181: blood regeneration, once every ten days, END test. The anemia
 * itself is NOT a test modifier; only other documented Weakness is. */
export function prepareAnimalBloodHealing567({profile,previous,minute,roll,otherWeakness=0,gmConfirmed=false}={}){
 valid(previous?.bloodLoss?.bp>0&&previous.shock!=='killed','Tvor již nemá Blood Loss nebo zemřel.');
 valid(gmConfirmed===true&&int(roll,1,100)&&int(otherWeakness,0,300)&&otherWeakness%5===0&&
  minute===previous.bloodHealingDueMinute,'Regenerace krve vyžaduje skutečné d100 v desetidenním termínu.');
 const end=profile?.attributes?.end;valid(int(end,1,100),'Chybí doložená END.');
 const eml=end*5-otherWeakness,sl=successLevel(roll,eml);
 const res=resolveBloodLossHealing({bp:previous.bloodLoss.bp,sl});
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'blood-healing',targetId:profile.id,minute,
  beforeBP:previous.bloodLoss.bp,afterBP:res.bp,endurance:end,otherWeakness,eml,roll,sl:names[sl],
  skipNextPeriod:res.skipNextPeriod,sourcePage:181};
}
/** Shock reroll is a separate mandatory test. Never treats a single event as
 * already recovered merely because the character's calendar moved forward. */
export function prepareAnimalShockRecovery567({profile,previous,minute,roll,fatigue=0,nextTurnConfirmed=false}={}){
 const state=previous?.shock;
 valid(!(previous?.wounds||[]).some(w=>w.bleeding),'Shock Reroll po Blood Loss až po zastavení všech krvácivých ran.');
 valid(['stunned','incapacitated','unconscious'].includes(state)&&!previous.extendedShock,
  'Neexistuje běžný Shock Recovery; Extended Shock/Coma mají vlastní průběh.');
 valid(int(roll,1,100)&&int(fatigue,0,300)&&int(minute,0,1e10),'Chybí skutečný Shock d100, Fatigue či herní čas.');
 const ml=profile?.combat?.shock;valid(int(ml,1,300),'Druh nemá ověřené Shock ML.');
 if(state==='unconscious')valid(int(previous.shockDueMinute,0,1e10)&&minute>=previous.shockDueMinute,
  'UNC Shock Reroll až deset minut po původním Shock.');
 else valid(nextTurnConfirmed===true,'GM musí potvrdit konec příslušného tahu/kola.');
 const eml=ml-fatigue-(state==='stunned'?0:20),sl=successLevel(roll,eml);
 let after,extendedShock=null,coma=null;
 if(state==='stunned')after=sl>=SL.S?'none':'stunned';
 else{const origin=previous.records.filter(x=>x.bestiaryTrauma?.kind==='hit').at(-1)?.bestiaryTrauma;
  const r=resolveShockReroll({state,sl,locationShock:origin?.shock?.location??null,injuryLevel:origin?.shock?.injury??null});
  after=r.state;extendedShock=r.extendedShock??null;coma=r.coma??null;
 }
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'shock-recovery',targetId:profile.id,minute,
  before:state,after,ml,fatigue,eml,roll,sl:names[sl],extendedShock,coma,
  followup:extendedShock?'Extended Shock: Course Roll every 4 hours'+(coma?' + Coma Course each d10 days':''):
   after==='stunned'?'STN: test at end of next turn':null,sourcePage:169};
}
export function prepareAnimalExtendedCourse567({profile,previous,minute,roll,fatigue=0,gmConfirmed=false}={}){
 const ext=previous?.extendedShock;
 valid(!!ext?.active&&!previous?.coma?.active,'Extended Shock Course nelze bez aktivní nematoucí epizody; koma má samostatný Course.');
 valid(gmConfirmed===true&&int(roll,1,100)&&int(fatigue,0,300)&&int(minute,0,1e10),
  'GM potvrdí čtyřhodinovou kontrolu a skutečné d100.');
 valid(previous.extendedShockDueMinute!==null&&minute>=previous.extendedShockDueMinute,
  'Neuplynuly čtyři hodiny od posledního Extended Shock Course.');
 const last=previous.records.filter(x=>['shock-recovery','extended-course'].includes(x.bestiaryTrauma.kind)).at(-1)?.bestiaryTrauma;
 valid(last&&minute>=last.minute+240,'Extended Shock Course lze provést až po čtyřech hodinách.');
 const a=profile.attributes||{},hb=healingBase({endurance:a.end,will:a.wil}),eml=hb*ext.hr-fatigue;
 const sl=successLevel(roll,eml),delta=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?1:2;
 const hr=ext.hr+delta,after=hr<=0?'killed':hr>=6?'none':previous.shock;
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'extended-course',targetId:profile.id,minute,
  beforeHR:ext.hr,afterHR:hr,hb,fatigue,eml,roll,sl:names[sl],after,
  extendedShock:hr<=0||hr>=6?null:{...ext,hr},sourcePage:179};
}
/** Treatment table is identical across human and animal wounds, but exotic
 * interventions (frost G, amputation, new bleeder, infection) are blocked. */
export function prepareAnimalTreatment567({wound,profile,previous,minute,physicianML,physicianIndex,roll,gmConfirmed}={}){
 valid(wound&&!wound.healed&&!wound.bleeding&&!wound.treatment,'Rána není připravena k prvnímu ošetření.');
 if(previous)valid(previous.shock==='none'&&!previous.extendedShock?.active&&!previous.coma?.active,'Nejdříve vyřeš Shock/Extended Shock/Coma.');
 valid(gmConfirmed===true,'GM musí potvrdit skutečného léčitele, vybavení a zákrok podle HMK str.178–180.');
 valid(int(minute,wound.minute,1e10)&&int(physicianML,1,300)&&int(physicianIndex,1,30)&&int(roll,1,100),'Neplatný čas, Physician nebo d100.');
 const days=Math.floor((minute-wound.minute)/1440),aspect=({b:'blunt',e:'edge',p:'point',f:'fire'}[wound.aspect]||wound.aspect);
 const c=treatmentContract({aspect,injuryLevel:wound.level});
 valid(!['amp','sur','ext'].includes(c.treatment),'Chirurgický zákrok vyžaduje vlastní navazující proceduru.');
 valid(minute-wound.minute>=treatmentDurationMinutes({treatment:c.treatment,injuryLevel:wound.level}),
  'Neuplynula doložená minimální doba zákroku podle HMK str.178.');
 const eml=treatmentRollEMLFromInjury({physicianML,aspect,injuryLevel:wound.level,daysSinceInjury:days});
 const sl=successLevel(roll,eml),result=resolveTreatmentTable({aspect,injuryLevel:wound.level,sl,physicianIndex});
 valid(result.available&&['hr','heal'].includes(result.result.kind)&&!result.result.bleeding&&!result.grimWound,
  'Tato kombinace ošetření má zvláštní zdravotní efekt nebo Grim Wound a potřebuje zvláštní proceduru.');
 const rate=result.result.healingRate??0;
 valid(result.result.immediateHeal||int(rate,1,6),'Nelze bezpečně určit Healing Rate.');
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'treatment',targetId:profile.id,woundId:wound.id,
  minute,method:c.treatment,physicianML,physicianIndex,roll,sl:names[sl],eml,
  healingRate:rate,possibleInfection:!!result.result.infectionPossible,
  healed:!!result.result.immediateHeal,sourcePage:180};
}
export function prepareAnimalHealing567({wound,profile,previous,minute,roll,gmConfirmed}={}){
 valid(wound&&!wound.healed&&!wound.infected&&wound.treatment&&!wound.bleeding,'Healing Roll vyžaduje aktivní ošetřenou neinfikovanou ránu.');
 if(previous)valid(previous.shock==='none'&&!previous.extendedShock?.active&&!previous.coma?.active&&!previous.wounds.some(w=>!w.healed&&w.infected),
  'Healing Rolls všech ran se pozastavují při infekci nebo nevyřešeném Shock/Coma.');
 valid(gmConfirmed===true&&int(minute,0,1e10)&&minute===wound.nextDueMinute&&int(roll,1,100),
  'Healing Roll musí proběhnout v doloženém pětidením termínu se skutečným d100.');
 const a=profile?.attributes||{};valid(int(a.end,1,100)&&int(a.wil,1,100),'Cíl nemá ověřené END a WIL pro Healing Base.');
 const hb=healingBase({endurance:a.end,will:a.wil});let sl=successLevel(roll,hb*wound.treatment.hr);
 if(sl===SL.F&&healingFailureIsCritical({roll}))sl=SL.CF;
 const result=resolveInjuryHealingRoll({injuryLevel:wound.level,sl,infectionPossible:wound.treatment.possibleInfection});
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'healing',targetId:profile.id,woundId:wound.id,
  minute,roll,hb,hr:wound.treatment.hr,eml:hb*wound.treatment.hr,sl:names[sl],
  beforeLevel:wound.level,afterLevel:result.injuryLevel,infected:result.infected,sourcePage:181};
}
export function validateAnimalTraumaJournal567(data){
 const journal=data?.journal||[];
 const encounters=new Map();const past=[];
 for(const row of journal){const p=row.bestiaryEncounter;
  if(p?.action==='create')encounters.set(p.id,p);
  const t=row.bestiaryTrauma;if(!t){past.push(row);continue;}
  valid(t.format===ANIMAL_TRAUMA_FORMAT_567&&
   ['hit','blood','shock-recovery','extended-course','treatment','healing','infection-course','blood-healing'].includes(t.kind),'Neplatný zdravotní doklad tvora.');
  const target=encounters.get(t.targetId),prior=animalHealthProjection567(past,t.campaignId,t.targetId);
  valid(target&&target.campaignId===t.campaignId&&row.calendarCampaignId===t.campaignId&&
   row.campaignMinute===t.minute&&row.characterId===null,'Zdravotní doklad neodpovídá původnímu tvorovi/času.');
  const profile={...target.profile,id:target.id};let expected=null;
  if(t.kind==='hit'){
   const source=encounters.get(t.sourceId);
   valid(source&&source.campaignId===t.campaignId&&t.woundId===(t.injury?row.id:null),'Zranění nemá původní identitu.');
   expected=prepareAnimalHit567({attacker:{id:source.id,profile:source.profile},
    defender:{id:target.id,profile:target.profile},minute:t.minute,eventId:row.id,previous:prior,
    inputs:{...t.contactInputs,aimConfirmed:true,specialsReviewed:true,bleedingReviewed:true,
     bleeding:t.bleeding,rigidArmour:t.rigidArmour?'yes':'no',shockRoll:t.shock.roll,
     shockFatigue:t.shock.fatigue,amputationResolved:t.amputationResolved,campaignId:t.campaignId}});
  }else if(t.kind==='blood'){
   const wound=byId(prior.wounds,t.woundId);
   expected=prepareAnimalBlood567({profile,previous:prior,wound,minute:t.minute,
    method:t.method,physicianML:t.physicianML,stoppageRoll:t.stoppageRoll,
    lossRoll:t.lossRoll,gmConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='infection-course'){
   expected=prepareAnimalInfectionCourse567({profile,previous:prior,wound:byId(prior.wounds,t.woundId),minute:t.minute,
    roll:t.roll,fatigue:t.fatigue,gmConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='blood-healing'){
   expected=prepareAnimalBloodHealing567({profile,previous:prior,minute:t.minute,
    roll:t.roll,otherWeakness:t.otherWeakness,gmConfirmed:true});expected.campaignId=t.campaignId;
}else if(t.kind==='shock-recovery'){
   expected=prepareAnimalShockRecovery567({profile,previous:prior,minute:t.minute,roll:t.roll,
    fatigue:t.fatigue,nextTurnConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='extended-course'){
   expected=prepareAnimalExtendedCourse567({profile,previous:prior,minute:t.minute,roll:t.roll,
    fatigue:t.fatigue,gmConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='treatment'){
   const wound=byId(prior.wounds,t.woundId);
   expected=prepareAnimalTreatment567({wound,profile,previous:prior,minute:t.minute,physicianML:t.physicianML,
    physicianIndex:t.physicianIndex,roll:t.roll,gmConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='healing'){
   const wound=byId(prior.wounds,t.woundId);
   expected=prepareAnimalHealing567({wound,profile,previous:prior,minute:t.minute,roll:t.roll,gmConfirmed:true});
   expected.campaignId=t.campaignId;
  }
  valid(JSON.stringify(t)===JSON.stringify(expected),'Pozměněná pravidlová hodnota/efekt zdravotního dokladu tvora.');
  past.push(row);
 }
 return true;
}
/** No retroactive rewriting of original medical evidence. */
export function assertAnimalTraumaAppendOnly567(before,after){
 const prev=(before||[]).filter(r=>r.bestiaryTrauma).map(r=>JSON.stringify(r));
 const now=(after||[]).filter(r=>r.bestiaryTrauma).map(r=>JSON.stringify(r));
 valid(prev.length<=now.length&&prev.every((v,i)=>v===now[i]),'Zdravotní doklady tvorů nelze měnit ani mazat.');
 return true;
}

/** Called before GM advances the campaign clock. Active medical episodes cannot
 * be silently advanced beyond a mandatory scheduled test. The GM may advance
 * precisely to the deadline and resolve the actual roll there. */
export function requireAnimalMedicalGMTimeMayAdvance567({journal,campaignId,beforeMinute,afterMinute}={}){
 valid(int(beforeMinute,0,1e10)&&int(afterMinute,beforeMinute,1e10),'Neplatné časové rozmezí GM.');
 const created=new Map(),closed=new Set();
 for(const j of journal||[]){const r=j.bestiaryEncounter;
  if(!r||r.campaignId!==campaignId)continue;
  if(r.action==='create')created.set(r.id,r);
  if(r.action==='dismiss')closed.add(r.id);
 }
 for(const id of created.keys()){
  if(closed.has(id))continue;
  const h=animalHealthProjection567(journal,campaignId,id);
  if(h.shock==='killed')continue;
  const due=[];
  if(h.shock==='unconscious'&&h.shockDueMinute!==null)due.push({at:h.shockDueMinute,label:'Shock Reroll (UNC)'});
  if(h.extendedShock?.active&&h.extendedShockDueMinute!==null)due.push({at:h.extendedShockDueMinute,label:'Extended Shock Course'});
  if(h.bloodHealingDueMinute!==null)due.push({at:h.bloodHealingDueMinute,label:'Blood Loss Healing'});
  if(h.infectionDueMinute!==null)due.push({at:h.infectionDueMinute,label:'Infection Course'});
  for(const wound of h.wounds){if(wound.healed)continue;
   if((wound.bleeding||wound.treatment&&!wound.infected)&&wound.nextDueMinute!==null)
    due.push({at:wound.nextDueMinute,label:wound.bleeding?'Blood Loss / Stoppage':'Healing Roll'});
  }
  const omitted=due.find(x=>x.at>=beforeMinute&&x.at<afterMinute);
  valid(!omitted,`Tvor ${created.get(id).name}: nelze přeskočit ${omitted?.label||''} v čase ${omitted?.at}. Posuň čas jen k termínu a proveď skutečný hod.`);
 }
 return true;
}
