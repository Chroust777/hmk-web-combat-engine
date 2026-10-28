/** HMK 1.2 pp. 167–169, 178–182: species-specific, evidence-first trauma.
 * This is separate from the human Combat State. All actual dice must be supplied.
 * For untranscribed anatomy marks, compound injuries, or complex procedures the
 * transition is deliberately blocked rather than producing an invented outcome.
 */
import {previewAnimalContact566} from './hmk-bestiary-anatomy-566.js';
import {resolveAnimalAmputation570} from './hmk-bestiary-amputation-570.js';
import {prepareAnimalFrostInjury571,prepareAnimalFrostAmputation571} from './hmk-bestiary-frost-571.js';
import {assertAnimalAttackCapability572} from './hmk-bestiary-loss-effects-572.js';
export {prepareAnimalFrostInjury571,prepareAnimalFrostAmputation571} from './hmk-bestiary-frost-571.js';
import {SL,successLevel} from '../rules/tests.js';
import {calculateShockState,applyShockState,shockRecoverySchedule,resolveShockReroll} from '../rules/shock.js';
import {injuryFromEffectiveImpact} from '../rules/injury.js';
import {bloodStoppageResult,applyBloodLoss} from '../rules/bleeding.js';
import {healingBase,treatmentContract,treatmentRollEMLFromInjury,resolveTreatmentTable,permanentHealingImpairment,
 resolveInjuryHealingRoll,healingFailureIsCritical,treatmentDurationMinutes,infectionInitialHR,resolveInfectionCourse,resolveBloodLossHealing} from '../rules/healing.js';

const valid=(x,msg)=>{if(!x)throw Error(msg)};
const int=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const names=Object.fromEntries(Object.entries(SL).map(([k,v])=>[v,k]));
const clone=x=>structuredClone(x);
const byId=(list,id)=>list.find(x=>x.id===id);
const injuryLabel=l=>l<=0?'Healed':l===1?'M1':l<=3?'S'+l:'G'+l;
export const ANIMAL_TRAUMA_FORMAT_567='hmk-bestiary-trauma-567-v1';
/** Stable-owned animals retain one health history across any number of
 * encounters. A temporary creature without an owner keeps its own identity.
 * The proof of each original hit keeps its historical encounter target ID. */
export function animalHealthProjection567(journal,campaignId,encounterId){
 const births=(journal||[]).map(j=>j.bestiaryEncounter).filter(p=>p?.action==='create'&&p.campaignId===campaignId);
 const entry=births.find(p=>p.id===encounterId);
 const sameAnimal=entry?.ownerAnimalId
  ?new Set(births.filter(p=>p.ownerAnimalId===entry.ownerAnimalId&&p.ownerId===entry.ownerId).map(p=>p.id))
  :new Set([encounterId]);
 const records=(journal||[]).filter(j=>j.bestiaryTrauma?.format===ANIMAL_TRAUMA_FORMAT_567&&
  j.bestiaryTrauma.campaignId===campaignId&&sameAnimal.has(j.bestiaryTrauma.targetId));
 const wounds=[];let shock='none',lastMinute=-1,shockOriginMinute=null,extendedShock=null,coma=null,shockDueMinute=null,extendedShockDueMinute=null,comaDueMinute=null,comaStartMinute=null,comaWeariness=0,bloodLoss={bp:0,weaknessFatigue:0},bloodHealingDueMinute=null,infectionDueMinute=null;
 for(const row of records){const p=row.bestiaryTrauma;
  valid(p.minute>=lastMinute,'Zdravotní události tvora jdou proti času kampaně.');lastMinute=p.minute;
  if(p.kind==='hit'){
   const oldShock=shock;shock=applyShockState(shock,p.shock.incoming);
   if(shock!==oldShock){shockOriginMinute=p.minute;shockDueMinute=shock==='unconscious'?p.minute+10:null;}
   if(p.compound?.success){
    const prior=byId(wounds,p.compound.woundId);
    valid(prior&&!prior.healed&&!prior.treatment&&prior.level===p.compound.beforeIL,
     'Compound Injury: změněný nebo již ošetřený původní stav rány.');
    prior.level=p.compound.afterIL;
   }
   if(p.injury){valid(!byId(wounds,p.woundId),'Duplicitní rána tvora.');
    wounds.push({id:p.woundId,sourceId:row.id,location:p.location.id,locationName:p.location.name,
     level:p.injury.level,aspect:p.aspect,bleeding:p.bleeding,minute:p.minute,
     treatment:null,infected:false,healed:false,permanentImpairment:0,projectileRemoved:false,amputation:p.amputation?.severed?p.amputation:null,
     staunchBonus:0,nextDueMinute:p.bleeding?p.minute+5:null,
     grimDueMinute:p.injury.level>=4?p.minute+1440:null});}
  }else if(p.kind==='frost'){
   valid(!byId(wounds,p.woundId),'Duplicitní Frost zranění.');
   const oldShock=shock;shock=applyShockState(shock,p.shock.incoming);
   if(shock!==oldShock){shockOriginMinute=p.minute;shockDueMinute=shock==='unconscious'?p.minute+10:null;}
   wounds.push({id:p.woundId,sourceId:row.id,location:p.location.id,locationName:p.location.name,
    level:p.level,aspect:'frost',bleeding:false,minute:p.minute,frostSite:p.site,
    treatment:null,infected:false,healed:false,permanentImpairment:0,projectileRemoved:false,
    amputation:null,staunchBonus:0,nextDueMinute:null,grimDueMinute:p.grimDueMinute});
  }else if(p.kind==='frost-amputation'){
   const original=byId(wounds,p.woundId);
   valid(original&&!original.healed&&!original.treatment&&original.aspect==='frost',
    'Frost AMP nemá platnou původní Grievous Frost ránu.');
   valid(!byId(wounds,p.newWoundId),'Duplicitní Edge rána po Frost AMP.');
   original.healed=true;original.level=0;original.nextDueMinute=null;
   original.grimDueMinute=null;original.treatment={hr:0,method:'amp',treatedAt:p.minute,
    possibleInfection:false,permanentImpairmentEligible:false};
   original.amputation=p.permanentLoss;
   wounds.push({id:p.newWoundId,sourceId:row.id,location:original.location,
    locationName:original.locationName,level:p.edgeLevel,aspect:'e',bleeding:p.bleeding,
    minute:p.minute,fromFrostWoundId:original.id,
    treatment:null,infected:false,healed:false,permanentImpairment:0,projectileRemoved:false,
    amputation:null,amputationCheck:p.amputationCheck??null,staunchBonus:0,
    nextDueMinute:p.bleeding?p.minute+5:null,grimDueMinute:p.grimDueMinute});
   if(shock!==p.shock.after){shockOriginMinute=p.minute;
    shockDueMinute=p.shock.after==='unconscious'?p.minute+10:null;}
   shock=p.shock.after;
   if(shock==='killed')shockDueMinute=null;
  }else if(p.kind==='blood'){
   const wound=byId(wounds,p.woundId);valid(wound&&wound.bleeding&&!wound.healed,'Blood Stoppage / Loss bez aktivního Bleeder.');
   wound.bleeding=!p.stopped;wound.staunchBonus=p.nextStaunchBonus;
   wound.nextDueMinute=p.stopped?(wound.treatment?Math.max(wound.minute+7200,p.minute):null):p.minute+5;
   if(p.bp>bloodLoss.bp&&bloodLoss.bp===0)bloodHealingDueMinute=p.minute+14400;
   bloodLoss={bp:p.bp,weaknessFatigue:p.bp*5};
   if(p.after!==shock){shockOriginMinute=p.minute;shockDueMinute=p.after==='unconscious'?p.minute+10:null;}
   shock=p.after;
   if(shock==='killed')shockDueMinute=null;
}else if(p.kind==='shock-recovery'){
   shock=p.after;extendedShock=p.extendedShock??null;coma=p.coma??null;
   if(coma?.active){comaStartMinute=p.minute;comaDueMinute=p.comaIntervalD10?p.minute+p.comaIntervalD10*1440:null;}
   if(shock==='none')shockDueMinute=null;else if(shock==='unconscious')shockDueMinute=shockOriginMinute+10;
   extendedShockDueMinute=extendedShock?.active?p.minute+240:null;
  }else if(p.kind==='extended-course'){
   shock=p.after;extendedShock=p.extendedShock;
   if(coma?.active&&shock==='none')shock='unconscious';
   if(shock==='none')shockDueMinute=null;extendedShockDueMinute=extendedShock?.active?p.minute+240:null;
  }else if(p.kind==='grim-shock'){
   const w=byId(wounds,p.woundId);
   valid(w&&!w.healed&&w.level>=4&&w.grimDueMinute===p.minute,
    'Grim Shock nedoložil splatnou ránu.');
   w.grimDueMinute=p.minute+1440;
   shock=p.after;
   if(shock==='unconscious'){shockOriginMinute=p.minute;shockDueMinute=p.minute+10;}
   if(shock==='killed')shockDueMinute=null;
  }else if(p.kind==='coma-course'){
   coma=p.coma;comaWeariness=p.wearinessAdded??comaWeariness;
   if(p.dead){shock='killed';extendedShock=null;extendedShockDueMinute=null;}
   if(p.recovered&&!extendedShock?.active)shock='none';
   comaDueMinute=coma?.active?p.minute+p.nextD10*1440:null;
  }else if(p.kind==='treatment'){
   const w=byId(wounds,p.woundId);valid(w&&!w.healed&&!w.treatment,'Neplatné opakované ošetření.');
   valid(!w.bleeding,'Krvácející rána musí být nejprve pravidlově zastavena.');
   w.treatment={hr:p.healingRate,method:p.method,treatedAt:p.minute,possibleInfection:p.possibleInfection,
    permanentImpairmentEligible:!!p.permanentImpairmentEligible};
   if(p.surgicalBleeding)w.bleeding=true;
   if(p.projectileRemoved)w.projectileRemoved=true;
   if(p.healed){w.healed=true;w.level=0;w.nextDueMinute=null;w.grimDueMinute=null;}
   else {w.nextDueMinute=p.surgicalBleeding?p.minute+5:w.minute+7200;w.grimDueMinute=p.grimWound?w.minute+1440:null;} // HMK pp178–181
  }else if(p.kind==='healing'){
   const w=byId(wounds,p.woundId);valid(w&&!w.healed&&w.treatment&&!w.infected,'Healing Roll bez aktivní ošetřené rány.');
   const beforeLevel=w.level;w.level=p.afterLevel;w.healed=w.level===0;w.infected=p.infected;
   if(beforeLevel>1&&w.level<=1&&w.treatment?.permanentImpairmentEligible)
    w.permanentImpairment=permanentHealingImpairment({eligible:true,daysToMinor:Math.floor((p.minute-w.minute)/1440)});
   if(w.level<4)w.grimDueMinute=null;
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
 return {wounds,permanentLosses:wounds.filter(w=>w.amputation?.severed).map(w=>({id:w.id,location:w.location,side:w.amputation.side,sourcePage:w.amputation.sourcePage||168})),
  shock,bloodLoss,bloodHealingDueMinute,infectionDueMinute,records,lastMinute,shockOriginMinute,shockDueMinute,extendedShockDueMinute,extendedShock,coma,comaDueMinute,comaStartMinute,comaWeariness};
}
/** Requires a fully confirmed physical hit; automatically derives only the parts
 * that are valid without untranscribed Bleeding/Amputation symbols. */
export function prepareAnimalHit567({attacker,defender,inputs,previous,attackerPrevious=null,minute,eventId}={}){
 valid(attacker?.profile&&defender?.profile&&attacker.id!==defender.id,'Vyber dva různé platné tvory encounteru.');
 valid(int(minute,0,1e10)&&typeof eventId==='string'&&eventId,'Chybí herní čas/ID.');
 valid(inputs?.aimConfirmed===true&&inputs?.specialsReviewed===true&&inputs?.bleedingReviewed===true,
  'GM musí doložit zásah i kontrolu krvácení a druhových zvláštních následků.');
 valid(int(inputs.shockRoll,1,100)&&int(inputs.shockFatigue,0,300)&&inputs.shockFatigue%5===0, 'Vyžaduje skutečné Shock d100 a ověřenou Fatigue.');
 valid(['yes','no'].includes(inputs.rigidArmour),'Potvrď Rigid Armour na konkrétní lokaci.');
 valid(typeof inputs.bleeding==='boolean','Potvrď možnost krvácení pro danou lokalitu, aspekt a IL.');
 assertAnimalAttackCapability572({health:attackerPrevious,weaponName:attacker.profile.weapons?.[inputs.weaponIndex]?.name,weaponSpecial:attacker.profile.weapons?.[inputs.weaponIndex]?.special,gmRemainingLimbConfirmed:inputs.limbUseConfirmed===true});
 valid(!previous||!['incapacitated','unconscious','killed'].includes(previous.shock),
  'Před dalším zraněním nejdříve vyřeš původní INC/UNC/KIA a související časový postup.');
 const contact=previewAnimalContact566({attackerProfile:attacker.profile,defenderProfile:defender.profile,
  weaponIndex:inputs.weaponIndex,aimZN:inputs.aimZN,zdRoll:inputs.zdRoll,
  locationD10:inputs.locationD10,impactDieRoll:inputs.impactDieRoll,
  extraImpact:inputs.extraImpact,aimConfirmed:true});
 valid(!contact.miss&&contact.effectiveImpact>0,'Tento hod nevyvolal účinné zranění.');
 const medical=injuryFromEffectiveImpact({effectiveImpact:contact.effectiveImpact,aspect:contact.aspect,
  rigidArmour:inputs.rigidArmour==='yes'});
 // HMK p168: fire/frost do not combine with physical strikes, and area
 // injuries only compound with other area injuries (not part of this path).
 const oldWounds=(previous?.wounds||[]).filter(w=>!w.healed&&w.location===contact.location.id&&
   w.aspect!=='frost'&&(w.aspect==='f')===(contact.aspect==='f'));
 let compound=null;
 if(medical.injury&&oldWounds.length){
  valid(int(inputs.compoundD10,1,10),'Opakovaný zásah do stejné lokality vyžaduje skutečný Compound d10.');
  const tn=medical.injury.level+oldWounds.reduce((sum,w)=>sum+w.level,0);
  const wound=[...oldWounds].reverse().reduce((best,w)=>!best||w.level>best.level?w:best,null);
  valid(!wound.treatment,'Compound do již ošetřené rány vyžaduje nové potvrzení léčebného postupu; bez něj se zápis nepovolí.');
  const success=inputs.compoundD10<=tn;
  compound={roll:inputs.compoundD10,tn,success,woundId:wound.id,
   beforeIL:wound.level,afterIL:success?Math.min(5,wound.level+1):wound.level,
   injuryShock:success?(wound.level===5?6:Math.min(5,wound.level+1)):null};
 }else valid(inputs.compoundD10===null||inputs.compoundD10===undefined,
   'Compound d10 zadávej pouze při skutečném opakovaném zranění téže lokality.');
 if(!medical.injury&& !medical.glancing)throw Error('Není zdravotní účinek.');
 // p168: amputation symbols are read from the animal-specific ZN/LN table.
 // Do not change the anatomical location proof object: old journals use it.
 const amputation=resolveAnimalAmputation570({location:contact.location,
  injuryLevel:medical.injury?.level,aspect:contact.aspect,roll:inputs.amputationD100??null});
 if(medical.injury?.level===5&&contact.aspect==='e')
  valid(inputs.bleeding===true,'G5e v tabulkách zvířat má krvácivou značku: následuje Blood Loss Sequence.');
 const printedShock=defender.profile.combat?.shock;
 valid(int(printedShock,1,300),'Cíl nemá ověřený Shock ML.');
 const eml=printedShock-inputs.shockFatigue+(medical.shockTestModifier||0)+(amputation?.shockPenalty||0),sl=successLevel(inputs.shockRoll,eml);
 const injuryShock=compound?.success?compound.injuryShock:medical.injuryShock;
 const shk=calculateShockState({locationShock:contact.location.locationShock,injuryShock,shockSL:sl});
 const total=amputation?.lethalNeck?'killed':applyShockState(previous?.shock||'none',shk.state);
 const due=total==='killed'?null:total==='unconscious'?minute+10:inputs.bleeding?minute+5:null;
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'hit',campaignId:inputs.campaignId,targetId:defender.id,
  sourceId:attacker.id,woundId:medical.injury?eventId:null,minute,
  contactInputs:{weaponIndex:inputs.weaponIndex,aimZN:inputs.aimZN,zdRoll:inputs.zdRoll,
   locationD10:inputs.locationD10,impactDieRoll:inputs.impactDieRoll,extraImpact:inputs.extraImpact},
  location:contact.location,aspect:contact.aspect,strikeImpact:contact.strikeImpact,
  effectiveImpact:contact.effectiveImpact,armourValue:contact.armourValue,
  injury:medical.injury?clone(medical.injury):null,glancing:medical.glancing,bleeding:inputs.bleeding,...(compound?{compound}:{}),
  ...(amputation?{amputation}:{}),
  rigidArmour:inputs.rigidArmour==='yes',specialsReviewed:true,amputationResolved:!!amputation||inputs.amputationResolved===true,...(inputs.limbUseConfirmed===true?{limbUseConfirmed:true}:{}),
  shock:{ml:printedShock,fatigue:inputs.shockFatigue,eml,roll:inputs.shockRoll,
   level:names[sl],location:contact.location.locationShock,injury:injuryShock,
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
export function prepareAnimalShockRecovery567({profile,previous,minute,roll,fatigue=0,nextTurnConfirmed=false,comaIntervalD10=null,allowLegacyNoInterval=false}={}){
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
 else{const origin=previous.records.filter(x=>['hit','frost','frost-amputation'].includes(x.bestiaryTrauma?.kind)).at(-1)?.bestiaryTrauma;
  const r=resolveShockReroll({state,sl,locationShock:origin?.shock?.location??null,injuryLevel:origin?.shock?.injury??null});
  after=r.state;extendedShock=r.extendedShock??null;coma=r.coma??null;
 }
 valid(!coma||int(comaIntervalD10,1,10)||allowLegacyNoInterval&&comaIntervalD10===null,'Pro nové koma musí být doložen první skutečný d10 dnů do Course Roll.');
 const start={format:ANIMAL_TRAUMA_FORMAT_567,kind:'shock-recovery',targetId:profile.id,minute,
  before:state,after,ml,fatigue,eml,roll,sl:names[sl],extendedShock,coma,
  followup:extendedShock?'Extended Shock: Course Roll every 4 hours'+(coma?' + Coma Course each d10 days':''):
   after==='stunned'?'STN: test at end of next turn':null,sourcePage:169};
 if(coma&&comaIntervalD10!==null)start.comaIntervalD10=comaIntervalD10;
 return start;
}
export function prepareAnimalExtendedCourse567({profile,previous,minute,roll,fatigue=0,gmConfirmed=false}={}){
 const ext=previous?.extendedShock;
 valid(!!ext?.active,'Extended Shock Course vyžaduje aktivní Extended Shock; koma se vyhodnocuje souběžně.');
 valid(gmConfirmed===true&&int(roll,1,100)&&int(fatigue,0,300)&&int(minute,0,1e10),
  'GM potvrdí čtyřhodinovou kontrolu a skutečné d100.');
 valid(previous.extendedShockDueMinute!==null&&minute>=previous.extendedShockDueMinute,
  'Neuplynuly čtyři hodiny od posledního Extended Shock Course.');
 const last=previous.records.filter(x=>['shock-recovery','extended-course'].includes(x.bestiaryTrauma.kind)).at(-1)?.bestiaryTrauma;
 valid(last&&minute>=last.minute+240,'Extended Shock Course lze provést až po čtyřech hodinách.');
 const a=profile.attributes||{},hb=healingBase({endurance:a.end,will:a.wil}),eml=hb*ext.hr-fatigue;
 const sl=successLevel(roll,eml),delta=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?1:2;
 const hr=ext.hr+delta,after=hr<=0?'killed':hr>=6?(previous.coma?.active?'unconscious':'none'):previous.shock;
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'extended-course',targetId:profile.id,minute,
  beforeHR:ext.hr,afterHR:hr,hb,fatigue,eml,roll,sl:names[sl],after,
  extendedShock:hr<=0||hr>=6?null:{...ext,hr},sourcePage:179};
}
/** HMK p.179: coma advances on its own d10-day clock, even if Extended
 * Shock recovered. The independent Extended Shock Course remains due. */
export function prepareAnimalComaCourse568({profile,previous,minute,roll,fatigue=0,sheltered=true,nextD10=null,gmConfirmed=false}={}){
 const coma=previous?.coma;
 valid(coma?.active&&previous.shock!=='killed','Není aktivní koma.');
 valid(int(previous.comaDueMinute,0,1e10)&&minute===previous.comaDueMinute,
  'Coma Course musí proběhnout v doloženém d10denním termínu. Staré záznamy bez prvního d10 vyžadují samostatné GM doplnění.');
 valid(gmConfirmed===true&&int(roll,1,100)&&int(fatigue,0,300), 'Chybí doložené d100 a skutečná Fatigue.');
 const a=profile?.attributes||{},hb=healingBase({endurance:a.end,will:a.wil}),eml=hb*coma.currentHR-fatigue-(sheltered?0:20);
 const sl=successLevel(roll,eml),delta=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?1:2;
 const hr=coma.currentHR+delta,dead=hr<=0,recovered=hr>=6;
 valid(dead||recovered||int(nextD10,1,10),'Pokračující koma vyžaduje další skutečný d10 dnů.');
 const lengthDays=(minute-(previous.comaStartMinute??minute))/1440;
 const wearinessAdded=recovered?Math.floor(Math.max(0,lengthDays)/5)*5:0;
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'coma-course',targetId:profile.id,minute,
  beforeHR:coma.currentHR,afterHR:hr,hb,fatigue,sheltered,eml,roll,sl:names[sl],dead,recovered,
  wearinessAdded,nextD10:dead||recovered?null:nextD10,
  coma:dead||recovered?null:{...coma,currentHR:hr},sourcePage:179};
}
/** HMK p.180, daily Grim Shock for an untreated G injury.
 * A G/CF treated wound is also eligible once its procedure is supported. */
export function prepareAnimalGrimShock568({profile,previous,wound,minute,roll,fatigue=0,gmConfirmed=false}={}){
 valid(wound&&!wound.healed&&wound.level>=4&&wound.grimDueMinute===minute,
  'Denní Grim Shock je splatný pouze pro aktivní G4/G5 ránu v jejím doloženém termínu.');
 valid(previous?.shock!=='killed'&&gmConfirmed===true&&int(roll,1,100)&&int(fatigue,0,300),
  'Potvrď skutečný Shock d100, Fatigue a stav živého tvora.');
 const ml=profile?.combat?.shock;
 valid(int(ml,1,300),'Pro tento druh není doloženo Shock ML.');
 const locationShock=previous.records.find(r=>r.id===wound.sourceId)?.bestiaryTrauma?.location?.locationShock;
 valid(int(locationShock,0,15),'Původní rána nemá jednoznačný Location Shock.');
 const eml=ml-fatigue,sl=successLevel(roll,eml);
 const result=calculateShockState({locationShock,injuryShock:wound.level,shockSL:sl});
 const after=applyShockState(previous.shock,result.state);
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'grim-shock',targetId:profile.id,woundId:wound.id,
  minute,roll,fatigue,ml,eml,sl:names[sl],locationShock,injuryLevel:wound.level,index:result.index,
  incoming:result.state,after,sourcePage:180};
}
/** HMK pp178–180: ordinary dressings and surgical SUR/EXT treatments.
 * Surgical CF/F may open a new Bleeder, with a five-minute follow-up.
 * Frost AMP is a distinct operation, not silently treated as SUR. */
export function prepareAnimalTreatment567({wound,profile,previous,minute,physicianML,physicianIndex,roll,
 dexSecondaryModifier=0,surgeryEquipmentConfirmed=false,gmConfirmed}={}){
 valid(wound&&!wound.healed&&!wound.bleeding&&!wound.treatment,'Rána není připravena k prvnímu ošetření.');
 if(previous)valid(previous.shock==='none'&&!previous.extendedShock?.active&&!previous.coma?.active,'Nejdříve vyřeš Shock/Extended Shock/Coma.');
 valid(gmConfirmed===true,'GM musí potvrdit skutečného léčitele, vybavení a zákrok podle HMK str.178–180.');
 valid(int(minute,wound.minute,1e10)&&int(physicianML,1,300)&&int(physicianIndex,1,30)&&int(roll,1,100),'Neplatný čas, Physician nebo d100.');
 const days=Math.floor((minute-wound.minute)/1440),aspect=({b:'blunt',e:'edge',p:'point',f:'fire'}[wound.aspect]||wound.aspect);
 const c=treatmentContract({aspect,injuryLevel:wound.level});
 valid(c.treatment!=='amp','Amputation jako frost treatment vyžaduje samostatnou doloženou proceduru.');
 const surgical=['sur','ext'].includes(c.treatment);
 if(surgical){valid(surgeryEquipmentConfirmed===true,
  'Surgery / Extraction vyžaduje doložené chirurgické nástroje a materiál podle HMK str.178.');
  valid(int(dexSecondaryModifier,-100,100),'Zadej přesný DEX Secondary Modifier léčitele.');}
 else valid(dexSecondaryModifier===0&&!surgeryEquipmentConfirmed,'DEX a chirurgické nástroje patří jen k SUR/EXT.');
 valid(minute-wound.minute>=treatmentDurationMinutes({treatment:c.treatment,injuryLevel:wound.level}),
  'Neuplynula doložená minimální doba zákroku podle HMK str.178.');
 const eml=treatmentRollEMLFromInjury({physicianML,aspect,injuryLevel:wound.level,daysSinceInjury:days,
  dexSecondaryModifier});
 const sl=successLevel(roll,eml),result=resolveTreatmentTable({aspect,injuryLevel:wound.level,sl,physicianIndex});
 valid(result.available&&['hr','heal'].includes(result.result.kind)&&
  (!result.result.bleeding||surgical)&&(!result.grimWound||surgical),
  'Tato kombinace vyžaduje jinou, samostatně doloženou léčebnou proceduru.');
 const rate=result.result.healingRate??0;
 valid(result.result.immediateHeal||int(rate,1,6),'Nelze bezpečně určit Healing Rate.');
 return {format:ANIMAL_TRAUMA_FORMAT_567,kind:'treatment',targetId:profile.id,woundId:wound.id,
  minute,method:c.treatment,physicianML,physicianIndex,roll,sl:names[sl],eml,
  healingRate:rate,possibleInfection:!!result.result.infectionPossible,
  healed:!!result.result.immediateHeal,
  ...(surgical?{dexSecondaryModifier,surgeryEquipmentConfirmed:true,
   surgicalBleeding:!!result.result.bleeding,grimWound:!!result.grimWound,
   projectileRemoved:c.treatment==='ext',
   permanentImpairmentEligible:!!result.result.permanentImpairmentEligible}:{}),sourcePage:180};
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
   ['hit','frost','frost-amputation','blood','shock-recovery','extended-course','treatment','healing','infection-course','blood-healing','coma-course','grim-shock'].includes(t.kind),'Neplatný zdravotní doklad tvora.');
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
     shockFatigue:t.shock.fatigue,compoundD10:t.compound?.roll??null,amputationD100:t.amputation?.roll??null,
     amputationResolved:t.amputationResolved,limbUseConfirmed:t.limbUseConfirmed===true,campaignId:t.campaignId},
    attackerPrevious:animalHealthProjection567(past,t.campaignId,source.id)});
  }else if(t.kind==='frost'){
   valid(t.woundId===row.id,'Frost Injury nemá původní identitu.');
   expected=prepareAnimalFrostInjury571({profile,previous:prior,minute:t.minute,eventId:row.id,
    zoneNumber:t.location.zn,locationD10:t.location.ld,level:t.level,source:t.source,
    sourceDetails:t.sourceDetails,frostbite:t.frostbite?{windD20:t.frostbite.windD20,durationD20:t.frostbite.durationD20,
     locationAV:t.frostbite.locationAV,freezingAirConfirmed:true,siteExposedConfirmed:true}:null,facialFeature:t.facialFeature,wingAsLimbConfirmed:t.wingAsLimbConfirmed,
    shockRoll:t.shock.roll,shockFatigue:t.shock.fatigue,gmConfirmed:true});
   expected.campaignId=t.campaignId;
  }else if(t.kind==='frost-amputation'){
   valid(t.newWoundId==='wound:'+row.id,'AMP Edge rána nemá neměnnou identitu události.');
   expected=prepareAnimalFrostAmputation571({profile,previous:prior,
    wound:byId(prior.wounds,t.woundId),minute:t.minute,eventId:row.id,
    physicianML:t.physicianML,physicianIndex:t.physicianIndex,physicianRoll:t.physicianRoll,
    dexSecondaryModifier:t.dexSecondaryModifier,shockRoll:t.shock.roll,
    shockFatigue:t.shock.fatigue,amputationRoll:t.amputationCheck?.roll??null,
    procedureConfirmed:true,gmConfirmed:true});
   expected.campaignId=t.campaignId;
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
    fatigue:t.fatigue,nextTurnConfirmed:true,comaIntervalD10:t.comaIntervalD10??null,allowLegacyNoInterval:t.comaIntervalD10===undefined});expected.campaignId=t.campaignId;
  }else if(t.kind==='extended-course'){
   expected=prepareAnimalExtendedCourse567({profile,previous:prior,minute:t.minute,roll:t.roll,
    fatigue:t.fatigue,gmConfirmed:true});expected.campaignId=t.campaignId;
  }else if(t.kind==='grim-shock'){
   expected=prepareAnimalGrimShock568({profile,previous:prior,wound:byId(prior.wounds,t.woundId),
    minute:t.minute,roll:t.roll,fatigue:t.fatigue,gmConfirmed:true});
   expected.campaignId=t.campaignId;
  }else if(t.kind==='coma-course'){
   expected=prepareAnimalComaCourse568({profile,previous:prior,minute:t.minute,roll:t.roll,
    fatigue:t.fatigue,sheltered:t.sheltered,nextD10:t.nextD10,gmConfirmed:true});
   expected.campaignId=t.campaignId;
  }else if(t.kind==='treatment'){
   const wound=byId(prior.wounds,t.woundId);
   expected=prepareAnimalTreatment567({wound,profile,previous:prior,minute:t.minute,physicianML:t.physicianML,
    physicianIndex:t.physicianIndex,roll:t.roll,dexSecondaryModifier:t.dexSecondaryModifier??0,
    surgeryEquipmentConfirmed:t.surgeryEquipmentConfirmed===true,gmConfirmed:true});expected.campaignId=t.campaignId;
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
 // One latest representative per stable animal. Do not lose an ongoing
 // medical obligation just because its most recent encounter was dismissed.
 const latestStable=new Map();
 for(const [id,p] of created)if(p.ownerAnimalId)latestStable.set(p.ownerAnimalId,id);
 for(const [id,p] of created){
  if(p.ownerAnimalId&&latestStable.get(p.ownerAnimalId)!==id)continue;
  if(!p.ownerAnimalId&&closed.has(id))continue;
  const h=animalHealthProjection567(journal,campaignId,id);
  if(h.shock==='killed')continue;
  const due=[];
  if(h.shock==='unconscious'&&h.shockDueMinute!==null)due.push({at:h.shockDueMinute,label:'Shock Reroll (UNC)'});
  if(h.extendedShock?.active&&h.extendedShockDueMinute!==null)due.push({at:h.extendedShockDueMinute,label:'Extended Shock Course'});
  if(h.bloodHealingDueMinute!==null)due.push({at:h.bloodHealingDueMinute,label:'Blood Loss Healing'});
  if(h.coma?.active&&h.comaDueMinute!==null)due.push({at:h.comaDueMinute,label:'Coma Course'});
  if(h.infectionDueMinute!==null)due.push({at:h.infectionDueMinute,label:'Infection Course'});
  for(const wound of h.wounds){if(wound.healed)continue;
   if(wound.grimDueMinute!==null)due.push({at:wound.grimDueMinute,label:'Grim Wound Shock'});
   if((wound.bleeding||wound.treatment&&!wound.infected)&&wound.nextDueMinute!==null)
    due.push({at:wound.nextDueMinute,label:wound.bleeding?'Blood Loss / Stoppage':'Healing Roll'});
  }
  const omitted=due.find(x=>x.at>=beforeMinute&&x.at<afterMinute);
  valid(!omitted,`Tvor ${created.get(id).name}: nelze přeskočit ${omitted?.label||''} v čase ${omitted?.at}. Posuň čas jen k termínu a proveď skutečný hod.`);
 }
 return true;
}
