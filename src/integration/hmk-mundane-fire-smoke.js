/** HMK v1.2 pp.121, 133, 167–170, 183. Confirmed mundane fire and smoke.
 * All operations are pure previews. The caller commits Combat State + journal
 * atomically. No generated dice, inferred armour, or silent death/recovery.
 */
import {mundaneFireImpact,mundaneFireTarget,fireSmokeHazard} from '../rules/craft-workshop-p121.js';
import {injuryFromEffectiveImpact,resolveInjurySequence,compoundCompatible} from '../rules/injury.js';
import {successLevel,successValue,SL} from '../rules/tests.js';
import {asphyxiaCapacity,asphyxiaDeathCountdown} from '../rules/ailments.js';
import {markPendingAsphyxiaComa} from './hmk-asphyxia-coma.js';
import {humanLocation} from './hmk-mounted-fall-injury-join.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {resolveVerifiedAreaProtection} from './hmk-verified-area-protection.js';
import {applyConfirmedHit,combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {applyConfirmedAreaStrike} from './hmk-combat-aftereffects.js';

const requireIt=(x,message)=>{if(!x)throw Error(message)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const levels=['CF','F','S','CS'];
const stateOf={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
const humanSide=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
const roundState=(actor,state,round)=>{
 requireIt(actor?.id&&state&&integer(round,1,9999),'Chybí postava nebo skutečné kolo');
 validateCombatState(state);
 requireIt(round>=state.lastRound&&state.shock!=='KIA','Oheň/kouř: nelze vracet kolo nebo zapisovat mrtvé postavě');
 return structuredClone(state);
};
const die=(x,faces,label)=>requireIt(integer(x,1,faces),`Chybí skutečný ${label} (1–${faces})`);
function mastery(actor,name){
 const entries=availableMasteries(actor).filter(x=>String(x.name||'').toLowerCase()===name.toLowerCase());
 requireIt(entries.length===1&&integer(entries[0].ml,1,200),`Chybí jednoznačné živé ML ${name}`);
 return entries[0].ml;
}
const validSource=x=>typeof x==='string'&&x.trim().length>=3&&x.trim().length<=120;
const isNone=x=>x===null||x===undefined;
function pendingGuard(s){
 requireIt(s.shock==='NONE'&&!s.shockFollowup&&!s.extendedShock&&!s.coma?.active,
  'Před novou nezávislou expozicí je nutné rozhodnout existující Shock/Coma; přepsání je zakázáno');
}
/** One confirmed physical FS contact. FS0–2 uses a true Location; FS3–4
 * must use verified Area protection. A separate real d4 is ALWAYS required.
 */
export function prepareMundaneFireStrike({actor,inventory,state,sourceId,round=1,
 fireSize,impactD4,fullRound=false,grabAndHold=false,contactHand=false,
 handSide=null,zoneD10=null,locationD10=null,direction='front',
 areaAVMethod='weighted',areaEvadeNotAttempted=false,
 shockD100=null,compoundD10=null,gmConfirmed=false}={}){
 requireIt(gmConfirmed===true&&validSource(sourceId)&&Array.isArray(inventory),'Potvrďte GM, inventář a jednoznačný klíč události');
 const s=roundState(actor,state,round),id='mundane-fire:'+sourceId.trim();
 requireIt(!s.events.some(x=>x.id===id),'Tento zdroj požáru již byl zapsán (duplicita)');
 pendingGuard(s);
 die(impactD4,4,'Fire Impact d4');
 requireIt(integer(fireSize,0,4)&&typeof fullRound==='boolean'&&typeof contactHand==='boolean',
  'Neplatná velikost FS nebo způsob kontaktu');
 requireIt(!fullRound||grabAndHold===true,'Celé kolo plamene vyžaduje doložené Grab and hold (str.121)');
 const impact=mundaneFireImpact(fireSize,{shortExposure:!fullRound});
 const strikeImpact=impactD4+impact.flatImpact;
 const type=mundaneFireTarget({fireSize,contactHand});
 let updated,site,armour,injury,shock=null;
 if(type.target==='Area'){
  requireIt(!contactHand&&isNone(zoneD10)&&isNone(locationD10)&&isNone(handSide),
    'Area Fire nemá umělou anatomickou lokaci ani Hand kontakt');
  requireIt(areaEvadeNotAttempted===true,'Area Evade vyžaduje samostatný doložený Combat průchod; GM musí potvrdit, že se nepoužil');
  requireIt(['weighted','quick'].includes(areaAVMethod),'Chybná metoda Area AV');
  armour=resolveVerifiedAreaProtection({inventory,targetId:actor.id,method:areaAVMethod});
  requireIt(armour.ready,'Area Fire AV není ověřena: '+(armour.reason||'chybí ochrana'));
  const needsShock=strikeImpact>armour.areaAV;
  requireIt(needsShock?integer(shockD100,1,100):isNone(shockD100),'Area Fire: Shock d100 jen při účinném Impact');
  const existing=s.wounds.filter(w=>!w.healed&&w.location==='area'&&compoundCompatible({...w,area:true},{location:'area',aspect:'fire',area:true}));
  const base=injuryFromEffectiveImpact({effectiveImpact:strikeImpact-armour.areaAV,aspect:'fire'});
  requireIt(base.injury&&existing.length?integer(compoundD10,1,10):isNone(compoundD10),
    'Area Compound d10 je povinný výhradně při nové kompatibilní ráně');
  const shockEML=mastery(actor,'Shock')-combatFatigueTotals(s).total;
  const step=applyConfirmedAreaStrike({state:s,round,eventId:id,strikeImpact,areaAV:armour.areaAV,
   aspect:'fire',shockML:shockEML,shockRoll:shockD100??null,compoundD10:compoundD10??null,gmConfirmed:true});
  updated=step.state;injury=step.result.injury?.step3?.injury??null;
  shock=step.result.injury?.shock?.state?stateOf[step.result.injury.shock.state]:null;
  site={location:'area',side:null};
 }else{
  requireIt(isNone(compoundD10)||integer(compoundD10,1,10),'Neplatný Compound d10');
  requireIt(['front','rear','side'].includes(direction),'GM musí potvrdit skutečný směr zásahu');
  let loc;
  if(contactHand){
   requireIt(['left','right'].includes(handSide)&&isNone(zoneD10)&&isNone(locationD10),
    'Při dotyku plamene se automaticky zasahuje Hand a GM určí skutečnou stranu');
   loc={location:'ha',side:handSide,locationShock:2};
  }else{
   die(zoneD10,10,'Zone d10');die(locationD10,10,'Location d10');
   requireIt(isNone(handSide),'Bez Hand kontaktu určuje stranu skutečný ZD');
   loc=humanLocation(zoneD10,locationD10);
  }
  site=loc;
  armour=resolveLiveCombatArmour({inventory,targetId:actor.id,location:loc.location,
   aspect:'f',direction,mode:'auto',rigidStatus:'unknown'});
  requireIt(armour.ready,'Fire AV není ověřena: '+(armour.reason||loc.location));
  const effective=strikeImpact-armour.armourValue;
  const base=injuryFromEffectiveImpact({effectiveImpact:effective,aspect:'fire'});
  const olds=s.wounds.filter(w=>!w.healed&&w.location===loc.location&&
   (!humanSide.has(loc.location)||w.side===loc.side)&&
   compoundCompatible(w,{location:loc.location,aspect:'fire',area:false}));
  requireIt(base.injury&&olds.length?integer(compoundD10,1,10):isNone(compoundD10),
   'Location Compound d10 je povinný pouze při nové kompatibilní ráně');
  const needsShock=!!(base.injury||base.glancing);
  requireIt(needsShock?integer(shockD100,1,100):isNone(shockD100),
   'Shock d100 chybí nebo je zadán bez Shock testu');
  const shockEML=mastery(actor,'Shock')-combatFatigueTotals(s).total+(base.shockTestModifier??0);
  const sl=needsShock?successLevel(shockD100,shockEML):null;
  const seq=resolveInjurySequence({location:{id:loc.location,location:loc.location,
   locationShock:loc.locationShock,area:false},effectiveImpact:effective,aspect:'fire',
   existingInjuries:olds,compoundD10,shockSL:sl,currentShockState:
    {NONE:'none',STN:'stunned',INC:'incapacitated',UNC:'unconscious',KIA:'killed'}[s.shock]});
  requireIt(seq.complete,'Fire Injury není dokončena: '+(seq.pending?.type||'neznámá návaznost'));
  const outcome=base.injury?'injury':base.glancing?'glancing':'none';
  const fresh=seq.step3?.injury??null;
  const rawState=seq.shock?.rawState??'none';
  const draft={ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
   target:{id:actor.id},location:loc.location,aspect:'fire',proposalId:id,
   inputs:{previousState:s.shock,shockLevel:sl===null?null:levels[sl]},
   impactResult:{strikeImpact,effectiveImpact:effective,baseAV:armour.armourValue,
    effectiveAV:armour.armourValue,aspect:'fire',source:'HMK p121 mundane fire'},
   injuryResult:{kind:outcome,injury:base.injury?base.injury.severity+base.injury.level:null},
   shockResult:{state:stateOf[rawState],injuryShock:seq.step3?.injuryShock??(base.glancing?1:0),
    locationShock:loc.locationShock},carryover:{state:stateOf[seq.shock?.state??'none']}};
  const saved=applyConfirmedHit({state:s,characterId:actor.id,draft,round,eventId:id,
   adjudication:{gmReviewed:true,bodyKind:'human',compoundReviewed:!!seq.step3?.compound?.required,
    compoundD10:compoundD10??null,bleeding:!!seq.step3?.bleeder,arrowOrBolt:false,
    side:loc.side,timelineId:'mundane-fire:'+sourceId}});
  updated=saved.state;injury=saved.wound??null;
  shock=updated.shock;
 }
 const detail={sourceId,fireSize,fireImpactD4:impactD4,impact:strikeImpact,
  fullRound,grabAndHold,contactHand,site,armourValue:type.target==='Area'?armour.areaAV:armour.armourValue,
  fireMode:type.target,areaAVMethod:type.target==='Area'?armour.method:null,
  direction:type.target==='Location'?direction:null,shockD100,compoundD10,
  resultShock:updated.shock,sourcePage:121};
 updated.events.push({id:id+':proof',type:'mundane-fire-proof',round,details:detail});
 updated.lastRound=round;validateCombatState(updated);
 return {state:updated,report:{...detail,woundId:injury?.id??null,injury:injury?
  injury.severity+injury.level:null,shock,finished:updated.shock==='NONE'&&!(updated.wounds||[]).some(w=>w.moralePending)}};
}
/** Start a traceable smoke incident *without* inventing an elapsed interval.
 * Pending incidents can be completed after reload from persistent State events.
 */
export function prepareEnclosedSmokeStart({actor,state,sourceId,round=1,
 enclosedArea=false,firePresent=false,smokePresent=false,gmConfirmed=false}={}){
 requireIt(gmConfirmed===true&&validSource(sourceId),'GM musí určit unikátní identifikátor události kouře');
 const s=roundState(actor,state,round),id='mundane-smoke:'+sourceId.trim();
 requireIt(fireSmokeHazard({enclosedArea,firePresent,smokePresent}).applies,
  'HMK p121: Smoke → Asphyxia zde vyžaduje uzavřený prostor, oheň a kouř');
 requireIt(!s.events.some(e=>e.id===id),'Tento požár je v historii již založen');
 s.events.push({id,type:'mundane-smoke-start',round,details:{sourceId,enclosedArea:true,firePresent:true,smokePresent:true,sourcePages:[121,183]}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{id,sourceId,pending:true,rulePages:[121,183]}};
}
/** Resolve actual elapsed five-second rounds only after real access to air.
 * After loss of consciousness use the p169 Shock Reroll without -20. CF
 * would require undefined initial Coma HR: fail closed, do not fabricate one.
 */
export function prepareEnclosedSmokeCompletion({actor,state,sourceId,round=1,
 roundsWithoutAir,airRestored=false,willD100,deathD10=null,enduranceD100=null,
 gmConfirmed=false}={}){
 requireIt(gmConfirmed===true&&validSource(sourceId),'Neznámý nebo nepotvrzený zdroj Smoke');
 const s=roundState(actor,state,round),id='mundane-smoke:'+sourceId.trim();
 const source=s.events.find(e=>e.id===id&&e.type==='mundane-smoke-start');
 requireIt(source&&round>=source.round,'Před Smoke Completion musí existovat starší potvrzený Smoke Start');
 requireIt(!s.events.some(e=>e.id===id+':complete'),'Opakovaný zápis téže Smoke Asphyxia');
 requireIt(typeof airRestored==='boolean','Musí být doloženo, zda byl obnoven vzduch');
 pendingGuard(s);
 requireIt(integer(roundsWithoutAir,0,20000),'Doložte skutečně uplynulé pětisekundové intervaly');
 die(willD100,100,'Will SV d100');
 const willML=mastery(actor,'Will'),willEML=willML-combatFatigueTotals(s).total;
 const willSL=successLevel(willD100,willEML);
 const willSV=successValue({ml:willML,sl:willSL});
 const end=actor?.hmk?.attributes?.end;
 requireIt(integer(end,1,200),'Chybí skutečný END postavy');
 // Swimming ML/2 is an optional substitution according to p183; the
 // larger of both values wins, with no synthetic secondary skill.
 const swim=availableMasteries(actor).find(e=>String(e.name).toLowerCase()==='swimming');
 const swimmingML=swim&&integer(swim.ml,1,200)?swim.ml:null;
 const maximumRounds=Math.max(0,asphyxiaCapacity({endurance:end,willSV,swimmingML}).maximumRounds);
 let recovered='conscious',deadAfter=null,endRecovery=null;
 if(roundsWithoutAir>maximumRounds){
  die(deathD10,10,'death countdown d10');
  deadAfter=maximumRounds+asphyxiaDeathCountdown({endurance:end,d10:deathD10});
  if(roundsWithoutAir>=deadAfter){
   requireIt(isNone(enduranceD100),'Po smrti se Endurance Recovery neprovádí');
   s.shock='KIA';s.shockFollowup=null;s.extendedShock=null;s.coma=null;
   for(const w of s.wounds)w.nextAdvanceRound=null;
   recovered='dead';
  }else{
   requireIt(airRestored===true,'V bezvědomí, ale stále bez vzduchu: bez záchrany nelze provádět Endurance Shock Reroll');
   die(enduranceD100,100,'Endurance Recovery d100');
   const eml=end*5-combatFatigueTotals(s).total;
   const sl=successLevel(enduranceD100,eml);
   endRecovery={roll:enduranceD100,eml,level:levels[sl]};
   if(sl===SL.CF){
    markPendingAsphyxiaComa(s,{sourceEventId:id+':complete',sourceKind:'smoke',round,
     enduranceD100,enduranceEML:eml});recovered='coma-pending-gm-initial-hr';
   }
   if(sl===SL.CS){recovered='recovered';}
   else if(sl===SL.S){recovered='stunned';s.shock='STN';s.shockOriginRound=round;
    s.shockFollowup={kind:'STN',originRound:round,dueRound:round+1,phase:'end-next-turn',timelineId:null};}
   else if(sl===SL.F){recovered='extended-shock';s.shock='UNC';s.shockOriginRound=round;s.posture.prone=true;
    s.shockFollowup=null;s.extendedShock={originState:'UNC',hr:5,elapsedHours:0};}
  }
 }else {
  requireIt(airRestored===true,'Smoke Exposure stále trvá; postava dosud nebyla osvobozena');
  requireIt(isNone(deathD10)&&isNone(enduranceD100),
   'Před ztrátou vědomí se nesmí generovat Death Countdown ani Shock Reroll');
 }
 const winded=roundsWithoutAir>maximumRounds/2?5:0;
 s.fatigue.windedness+=winded;
 const report={sourceId,roundsWithoutAir,maximumRounds,airRestored,willD100,willEML,willSV,
  willSL:levels[willSL],deathD10,deadAfter,enduranceD100,endRecovery,
  windednessAdded:winded,result:recovered,rulePages:[121,183,169]};
 s.events.push({id:id+':complete',type:'mundane-smoke-asphyxia-complete',round,details:report});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}
