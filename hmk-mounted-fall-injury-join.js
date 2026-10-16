/** HMK v1.2 pp.67,167–170,354–355. A PURE join for two fall victims.
 * The only injury mutation is the EXISTING applyConfirmedHit reducer.
 * Caller verifies live participants and stores the entire document through
 * persistVerifiedCombatSnapshot, never by writing the two actors separately.
 * Every physical die is an explicit GM entry. No RNG, no inferred fall point.
 */
import {prepareFailedMountedStumblePhysicalProof} from './hmk-mounted-stumble-physical-proof.js';
import {previewVerifiedMountedAnimalTrauma} from './hmk-mounted-live-animal-falling.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {applyConfirmedHit,combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {injuryFromEffectiveImpact,compoundInjury,compoundCompatible,bleedingEligibleForInjury} from '../rules/injury.js';
import {calculateShockState,applyShockState,SHOCK_STATE} from '../rules/shock.js';
import {hmkHumanLocationSymbols,hmkAnimalLocationSymbols} from './injury-special-hmk.js';
import {guidedMandatoryEvents,createGuidedMandatory,guidedMandatoryRequirement,submitGuidedMandatoryDie,commitGuidedMandatory} from './hmk-guided-mandatory.js';
import {successLevel,SL} from '../rules/tests.js';
const required=(v,m)=>{if(!v)throw Error(m)};
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const name={0:'CF',1:'F',2:'S',3:'CS'};
const states={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
const from={NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA};
const cpy=structuredClone;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const limb=new Set(['th','kn','ca','ft','flg','hlg']);
const profile={
 donkey:{b:4,table:'B',shockML:39},pony:{b:4,table:'B',shockML:36},
 mule:{b:4,table:'C',shockML:39},palfrey:{b:5,table:'C',shockML:36},
 courser:{b:5,table:'C',shockML:52},charger:{b:5,table:'C',shockML:65},
 destrier:{b:6,table:'C',shockML:75}
};
const HUMAN_ZONE=zn=>zn===1?'head':zn<=3?'arms':zn<=7?'torso':zn<=10?'legs':null;
const HUMAN_ROWS={head:[['sk',1,5,5],['fa',6,8,4],['nk',9,10,5]],
 arms:[['sh',1,3,3],['ua',4,6,1],['el',7,7,2],['fo',8,9,1],['ha',10,10,2]],
 torso:[['tx',1,4,4],['ab',5,7,4],['pv',8,10,4]],
 legs:[['th',1,4,3],['kn',5,5,2],['ca',6,8,1],['ft',9,10,2]]};
const surface={water:-16,mud:-12,snow:-8,earth:-4,paving:-2,rock:0};
// The mount-throwing formula on p354 already contains the 6–10 ft −2
// baseline; for greater heights use the *difference* in p67's distance table.
function additionalDistanceImpact(heightFt){
 const impact=heightFt<=10?-2:heightFt<=20?2:heightFt<=30?4:heightFt<=40?8:
  heightFt<=50?12:12+4*Math.ceil((heightFt-50)/10);
 return impact-(-2);
}
const skill=(c,n)=>{
 const xs=c?.hmk?.skills?.filter(x=>String(x.name||'').trim().toLowerCase()===n);
 required(xs?.length===1&&int(xs[0].ml,0,200),'Chybí živá '+n+' ML pro '+(c?.id||'?'));
 return xs[0].ml;
};
export function humanLocation(z,l){
 required(int(z,1,10)&&int(l,1,10),'Pád člověka vyžaduje d10 ZD a d10 LD');
 const zone=HUMAN_ZONE(z),hit=HUMAN_ROWS[zone].find(r=>l>=r[1]&&l<=r[2]);
 required(hit,'Neplatná lidská lokalizace pádu');
 return {location:hit[0],locationShock:hit[3],side:zone==='arms'||zone==='legs'?(z%2?'left':'right'):null};
}
export function woundFromFall({state,character,round,timelineId,eventId,bodyKind,location,side,locationShock,
 strikeImpact,AV,aspect='b',shockRoll=null,compoundD10=null,physicalDice,hrModifier=0}={}){
 validateCombatState(state);
 required(int(strikeImpact,-100,999)&&int(AV,0,999)&&['b','e'].includes(aspect),'Impact/AV/aspect musí být doloženy');
 const symbols=bodyKind==='horse'?hmkAnimalLocationSymbols(location):hmkHumanLocationSymbols(location);
 required(symbols&&int(locationShock,1,10),'Neznámá anatomie zasaženého místa');
 const effectiveImpact=strikeImpact-AV;
 const base=injuryFromEffectiveImpact({effectiveImpact,aspect,rigidArmour:false});
 const old=state.wounds.filter(w=>!w.healed&&w.location===location&&
  (!limb.has(location)&&!['sh','ua','el','fo','ha'].includes(location)||w.side===side)&&
  compoundCompatible(w,{location,aspect,area:false}));
 const newInjury=base.injury?{...base.injury,id:`wound:${eventId}`,location,aspect,area:false}:null;
 let comp=null;
 if(newInjury&&old.length){
  required(int(compoundD10,1,10),'Povinný fyzický Compound d10 u '+eventId);
  comp=compoundInjury({existing:old,incoming:newInjury,d10:compoundD10});
 }else required(compoundD10===null,'Nepotřebný Compound d10 není povolen');
 const injuryShock=comp?.injuryShock??base.injuryShock;
 const requiresShock=effectiveImpact>0;
 if(requiresShock)required(int(shockRoll,1,100),'Fyzický Shock d100 chybí pro '+eventId);
 else required(shockRoll===null,'Shock d100 bez účinného Impact není povolen');
 if(!requiresShock)return {state:cpy(state),injury:null,effectiveImpact,AV,location,side,shockSL:null,
  physicalDice:cpy(physicalDice),applied:false};
 const shockML=skill(character,'shock');
 // The printed p355 Shock ML is a cross-check of a verified breed; its live
 // recorded ML can be altered by campaign progression, never freely supplied.
 const shockEML=shockML-combatFatigueTotals(state).total+(base.shockTestModifier??0);
 const shockSL=successLevel(shockRoll,shockEML);
 const sh=calculateShockState({locationShock,injuryShock,shockSL});
 const carrying=applyShockState(from[state.shock],sh.state),carry=Object.keys(from).find(k=>from[k]===carrying);
 required(carry,'Nepodporovaný Shock Carryover');
 const candidate=comp?.injury??newInjury;
 const bleeding=!!(candidate&&bleedingEligibleForInjury({bleedingClass:symbols.bleeds,
  injury:{...candidate,aspect}}));
 const draft={ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
  target:{id:character.id},location,aspect,proposalId:eventId,
  inputs:{previousState:state.shock,shockLevel:name[shockSL]},
  impactResult:{effectiveImpact,strikeImpact,baseAV:AV,effectiveAV:AV,aspect},
  injuryResult:{kind:newInjury?'injury':'none',injury:newInjury?newInjury.severity+newInjury.level:null},
  shockResult:{state:states[sh.state],injuryShock,locationShock},carryover:{state:carry}};
 const applied=applyConfirmedHit({state,characterId:character.id,draft,round,eventId,
  adjudication:{gmReviewed:true,bodyKind,compoundReviewed:!!comp,compoundD10,
   bleeding,arrowOrBolt:false,side,timelineId}}).state;
 const evt=applied.events.find(e=>e.id===eventId);
 required(evt,'Povinný Injury Sequence event chybí');
 evt.details.physicalDice={format:'hmk-manual-dice-proof-v1',rolls:cpy(physicalDice)};
 evt.details.falling={kind:bodyKind,aspect,AV,impact:strikeImpact,effectiveImpact,shockML,
  shockEML,shockRoll,shockSL:name[shockSL],compoundD10};
 if(bodyKind==='horse'&&['flg','hlg'].includes(location)&&newInjury){
  const touched=[`wound:${eventId}`,comp?.compoundedExisting?.id].filter(Boolean);
  for(const wid of touched){
   const w=applied.wounds.find(x=>x.id===wid);
   required(w,'Chybí uložená nebo Compound rána končetiny');
   w.mountedLegTreatmentHRModifier={M:-1,S:-2,G:-3}[w.severity];
  }
 }
 validateCombatState(applied);
 return {state:applied,injury:newInjury,effectiveImpact,AV,location,side,shockSL:name[shockSL],
  physicalDice:cpy(physicalDice),applied:true,bleeding,compound:comp};
}
/** Existing guided-mandatory pipeline consumes immediate consequences in-memory.
 * No second writer exists. Shock recovery / postponed Morale remain scheduled
 * at their actual due time and must be gated by the Initiative scheduler.
 * The GM supplies physical dice and independently established ABE/anatomy.
 */
function resolveImmediate(state,character,round,timelineId,proofRows,eventPrefix){
 required(Array.isArray(proofRows)&&proofRows.length<=30,'Chybí explicitní sada bezprostředních GM následků');
 let current=state,done=[];
 for(let i=0;i<proofRows.length;i++){
  const row=proofRows[i];
  const due=guidedMandatoryEvents({state:current,characterId:character.id,round,timelineId})
   .filter(x=>x.kind==='injury-mishap'||x.kind==='injury-morale');
  required(due.length&&row?.kind===due[0].kind&&(row.id===undefined||row.id===due[0].id),
   'Bezprostřední Injury Mishap/Morale neodpovídá předepsanému pořadí');
  const session=createGuidedMandatory({state:current,character,round,timelineId,
   eventId:eventPrefix+':mandatory:'+i,kind:row.kind,
   abe:row.kind==='injury-morale'?row.abe:null,
   mishapTechnique:row.mishapTechnique??'attribute',
   mishapContext:row.mishapContext??null});
  const need=guidedMandatoryRequirement(session);
  const entered=need.kind==='die'?submitGuidedMandatoryDie(session,row.roll):session;
  required(entered.phase==='ready','Povinný fyzický hod Mishap/Morale chybí');
  required(need.kind==='die'||row.roll===null,'Automatická událost nesmí spotřebovat smyšlený hod');
  const outcome=commitGuidedMandatory({session:entered,state:current,character,round,timelineId});
  current=outcome.state;done.push({event:outcome.event,physicalDice:outcome.proof});
 }
 const remaining=guidedMandatoryEvents({state:current,characterId:character.id,round,timelineId})
  .filter(x=>x.kind==='injury-mishap'||x.kind==='injury-morale');
 required(!remaining.length,'Bezprostřední Injury Sequence není uzavřena: '+remaining.map(x=>x.kind+'/'+x.id).join(','));
 return {state:current,resolved:done};
}
/** Fully witnessed NO-WRITE mutation of the two live combat states. Caller
 * must append these states to the same document snapshot as Initiative.
 * Explicit physical rolls are required even if the target's armour prevents injury.
 * No direct storage adapter or separate save capability exists here.
 */
export function prepareMountedFallInjuryJoin({id,round,timelineId,mount,rider,states,inventory,
  stumbleD100,stumbleEML,stumbleSL,moveRate,proof,gmConfirmed=false}={}){
 required(gmConfirmed===true&&typeof id==='string'&&id&&int(round,1,9999)&&typeof timelineId==='string'&&timelineId,
  'Chybí potvrzená identita události');
 required(mount?.id&&rider?.id&&mount.id!==rider.id&&states?.[mount.id]&&states?.[rider.id]&&Array.isArray(inventory),
  'Chybí živý jezdec, zvíře nebo inventář');
 required(proof?.gmConfirmed===true,'Chybí jednotlivé fyzické důkazy GM');
 const p=prepareFailedMountedStumblePhysicalProof({stumbleSL,stumbleD100,stumbleEML,
  mountImpactD10:proof.mountImpactD10,mountZoneDie:proof.mountZoneDie,
  mountLocationDie:proof.mountLocationDie,mountZoneFaces:10,
  riderImpactD10:proof.riderImpactD10,riderZoneD10:proof.riderZoneD10,
  riderLocationD10:proof.riderLocationD10,moveRate,riderFallingTest:proof.riderFallingTest,
  secondRiderFalls:proof.secondRiderFalls??[],gmConfirmed:true});
 const breed=mount.hmk?.verifiedMountedBreed;
 required(profile[breed]&&mount.hmk.attributes&&
  mount.hmk.attributes.agl*5>=stumbleEML,'Neznámé zvíře / Stumble EML vyšší než živá AGL');
 // A horse wearing unmodelled barding must not receive free AV or a guessed
 // addition to its natural armour. Reject instead of silently dropping it.
 required(!inventory.some(x=>x.characterId===mount.id&&x.slot==='worn'),
  'Mount má nasazenou ochranu: nelze přičíst skutečnou vrstvenou AV bez ověřené anatomické pokrývky');
 const species=profile[breed];
 const animal=previewVerifiedMountedAnimalTrauma({mount,printedBreed:breed,stumbleSL,
  impactD10:proof.mountImpactD10,zoneD:proof.mountZoneDie,locationD:proof.mountLocationDie,
  aimZN:1,aimConfirmed:true});
 required(animal.miss!==true,'Neplatná náhodná lokalizace mounta: nutné pravidlové vyhodnocení ZN');
 required(animal.naturalBluntAV===species.b,'Zvířecí AV nesouhlasí s tištěným profilem');
 const mountDice=[...p.physicalDice.slice(0,4),
  ...(proof.mountCompoundD10==null?[]:[{faces:10,value:proof.mountCompoundD10,source:'GM-entered-physical-die'}]),
  ...(proof.mountShockD100==null?[]:[{faces:100,value:proof.mountShockD100,source:'GM-entered-physical-die'}])];
 let animalState=woundFromFall({state:states[mount.id],character:mount,round,timelineId,
  eventId:id+':mount-fall',bodyKind:'horse',location:animal.location,side:animal.side,
  locationShock:animal.locationShock,strikeImpact:animal.strikeImpact,AV:animal.naturalBluntAV,
  shockRoll:proof.mountShockD100??null,compoundD10:proof.mountCompoundD10??null,
  hrModifier:animal.legTreatmentHRModifier,physicalDice:mountDice});
 let current=states[rider.id],riderResults=[];
 // The Falling test EML is derived from the live person's skill, ENC,
 // Fatigue and injury impairment. The draft cannot author its own EML.
 required(states[rider.id].shock==='NONE',
  'Shock jezdce před pádem vyžaduje doloženou úpravu Success Level; blokováno');
 const riderLoad=resolveCombatantLoad({character:rider,inventory});
 required(riderLoad.ready&&riderLoad.encReady&&riderLoad.bulkReady,
  'Falling skill: chybí ověřené ENC a Bulk jezdce');
 const fs=[{impactD10:proof.riderImpactD10,zoneD10:proof.riderZoneD10,
  locationD10:proof.riderLocationD10,fallingTest:proof.riderFallingTest,
  surface:proof.riderSurface,shockD100:proof.riderShockD100,compoundD10:proof.riderCompoundD10,
  landingPosition:proof.riderLandingPosition,fallHeightFt:proof.riderFallHeightFt,
  landingDirection:proof.riderLandingDirection},...(proof.secondRiderFalls??[])];
 for(let i=0;i<fs.length;i++){
  const f=fs[i],base=i===0?p.rider:p.rider.additionalFalls[i-1];
  const technique=f.fallingTest?.technique;
  const injuries=projectLiveInjuries({state:current,round,test:technique,
   usedArms:['left','right'],timelineId});
  required(injuries.ready&&!injuries.unusable&&!injuries.stunned,
   'Falling EML nemá bezpečně doloženou aktuální Injury/Impairment: '+(injuries.reason||''));
  const eml=skill(rider,technique)-combatFatigueTotals(current).total+
   riderLoad.agilityAndMeleePenalty+injuries.modifier;
  required(f.fallingTest.EML===eml,
   'Falling Jumping/Acrobatics EML nesouhlasí se živou dovedností, ENC, únavou a ranami');
  required(Object.hasOwn(surface,f.surface),'Chybí fyzicky potvrzený povrch pádu (HMK str.67)');
  required(int(f.fallHeightFt,6,100),'Falling Routine p67 je pro pády nad 5 ft; GM musí ověřit výšku a Prone');
  required(f.landingPosition&&Number.isFinite(f.landingPosition.x)&&Number.isFinite(f.landingPosition.y),
   'Poloha po pádu musí být ověřena GM');
  required(['front','rear','side'].includes(f.landingDirection),'GM musí doložit směr každého dopadu jezdce');
  const loc=humanLocation(f.zoneD10,f.locationD10);
  const armour=resolveLiveCombatArmour({inventory,targetId:rider.id,location:loc.location,aspect:'b',
   direction:f.landingDirection,mode:'auto',rigidStatus:'unknown'});
  required(armour.ready,'Nedoložená skutečná AV jezdce: '+(armour.reason||'?'));
  const strikeImpact=base.strikeImpact+additionalDistanceImpact(f.fallHeightFt)+
   base.fall.impactModifier+surface[f.surface];
  const physicalDice=[{faces:10,value:f.impactD10,source:'GM-entered-physical-die'},
   {faces:10,value:f.zoneD10,source:'GM-entered-physical-die'},
   {faces:10,value:f.locationD10,source:'GM-entered-physical-die'},
   {faces:100,value:f.fallingTest.d100,source:'GM-entered-physical-die'},
   ...(f.compoundD10==null?[]:[{faces:10,value:f.compoundD10,source:'GM-entered-physical-die'}]),
   ...(f.shockD100==null?[]:[{faces:100,value:f.shockD100,source:'GM-entered-physical-die'}])];
  const result=woundFromFall({state:current,character:rider,round,timelineId,
   eventId:id+':rider-fall:'+i,bodyKind:'human',location:loc.location,side:loc.side,
   locationShock:loc.locationShock,strikeImpact,AV:armour.armourValue,
   shockRoll:f.shockD100??null,compoundD10:f.compoundD10??null,physicalDice});
  current=result.state;
  riderResults.push({...result,surface:f.surface,fallHeightFt:f.fallHeightFt,
   landingPosition:cpy(f.landingPosition),strikeImpact});
 }
 const afterMount=resolveImmediate(animalState.state,mount,round,timelineId,proof.mountImmediate??[],id+':mount');
 const afterRider=resolveImmediate(current,rider,round,timelineId,proof.riderImmediate??[],id+':rider');
 current=afterRider.state;
 const final=fs.at(-1),lastRider=riderResults.at(-1);
 // Rule p67: ground fall ends prone except ≤10ft limb hit; Acrobatics extends
 // ≤20ft limb exception. No height is inferred from rider's speed.
 const canRemainStanding=limb.has(lastRider.location)||['sh','ua','el','fo','ha'].includes(lastRider.location);
 const heightLimit=final.fallingTest.technique==='acrobatics'?20:10;
 current=cpy(current);current.posture.prone=!canRemainStanding||final.fallHeightFt>heightLimit||current.posture.prone;
 const mountState=cpy(afterMount.state);mountState.posture.prone=true;
 validateCombatState(current);validateCombatState(mountState);
 return {format:'hmk-mounted-falling-joint-plan-v1',mountState,riderState:current,
  injuries:{mount:animalState,rider:riderResults},mandatory:{mount:afterMount.resolved,rider:afterRider.resolved},proof:p,
  riderLandingPosition:cpy(final.landingPosition),mountPosture:'prone',
  physicalDice:[...p.physicalDice,...mountDice.slice(4),...riderResults.flatMap(x=>x.physicalDice)],
  singleCheckpointRequired:true,authorizesSeparateWrites:false};
}
