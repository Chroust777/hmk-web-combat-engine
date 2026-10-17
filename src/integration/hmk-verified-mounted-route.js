/** HMK World of Kèthîra p.172. Read-only chain: physically resolved
 * Controlled mount + separately COMMITTED, map-verified mount Move.
 * Does NOT award Rider Impact or a shared rider/mount turn: the current
 * Initiative scheduler must first implement their single shared IR.
 */
import {controlEML,mountTurnDistance,riderImpactEffect} from '../rules/mounted.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
const assert=(c,m)=>{if(!c)throw Error(m)};
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const EPS=1e-5;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))*180/Math.PI;
export function examineVerifiedMountedRoute({sequence,riderState,rider,mount,battlefield,
 mountMoveEventId,controlEventId,declaredDistanceFt,previousRate='stop',newRate='full',
 mountEffectiveMove,mountRiderImpact}={}){
 const s=validateEncounterSequence(sequence);validateCombatState(riderState);
 assert(rider?.id&&mount?.id&&rider.id!==mount.id,'Chybí skutečný jezdec a zvíře');
 assert(s.roster.some(x=>x.id===rider.id)&&s.roster.some(x=>x.id===mount.id),'Jezdec i zvíře musí být v souboji');
 const r=s.roster.find(x=>x.id===rider.id),m=s.roster.find(x=>x.id===mount.id);
 assert(r.rank===m.rank,'HMK p172: jezdec a zvíře musí mít stejný Initiative Rank');
 const riding=rider.hmk?.skills?.filter(x=>String(x.name).toLowerCase()==='riding');
 const initiative=mount.hmk?.skills?.filter(x=>String(x.name).toLowerCase()==='initiative');
 assert(riding?.length===1&&initiative?.length===1&&whole(riding[0].ml,0,200)&&whole(initiative[0].ml,0,200),
  'Chybí živé Riding/Initiative ML');
 const eml=controlEML({ridingML:riding[0].ml,mountInitiativeML:initiative[0].ml});
 const control=riderState.events.find(x=>x.id===controlEventId&&x.type==='hmk-mounted-control'&&x.round===s.round);
 assert(control&&control.details?.mountId===mount.id&&control.details?.eml===eml&&
  control.details?.result?.controlled===true&&riderState.mountControl?.round===s.round&&
  riderState.mountControl?.controlled===true,'Chybí úspěšný Control v aktuálním kole');
 const dice=control.details.physicalDice?.rolls;
 assert(Array.isArray(dice)&&dice.length>=1&&dice.every(x=>x.faces===100&&whole(x.value,1,100)&&x.source==='GM-entered-physical-die'),
  'Chybí fyzický doložený Mounted Control Roll');
 assert(whole(declaredDistanceFt,1,100000)&&whole(mountEffectiveMove,0,100000)&&whole(mountRiderImpact,0,1000),
  'Chybí ověřený deklarovaný pohyb, Move nebo Rider Impact zvířete');
 const rates=['stop','half','full','double'];
 assert(rates.includes(previousRate)&&rates.includes(newRate)&&Math.abs(rates.indexOf(newRate)-rates.indexOf(previousRate))<=1,
  'Mount může na začátku tahu změnit rychlost nejvýše o jednu úroveň');
 const saved=s.spatialEvents?.find(x=>x.id===mountMoveEventId&&x.round===s.round&&x.actorId===mount.id);
 assert(saved?.projection?.action==='move'&&saved.timelineId===s.timelineId,
  'Chybí dříve dokončený mapově doložený pohyb právě tohoto zvířete');
 assert(s.log.some(x=>x.type==='spatial-action'&&x.actorId===mount.id&&x.eventId===mountMoveEventId&&x.round===s.round)&&
  s.log.some(x=>x.type==='turn-complete'&&x.actorId===mount.id&&x.action==='move'&&x.round===s.round&&x.spatialEventId===mountMoveEventId),
  'Pohyb zvířete nebyl skutečně dokončen ve svém tahu');
 const p=saved.projection;
 assert(p.format==='hmk-guided-spatial-projection-v1'&&p.actorId===mount.id&&p.moveRate===newRate&&
  p.effectiveMove===mountEffectiveMove&&p.moralePurpose===null,
  'Projekce zvířete neodpovídá skutečným pohybovým údajům');
 const original=JSON.parse(p.battlefieldWitness);
 assert(original?.units?.some(x=>x.id===rider.id)&&original?.units?.some(x=>x.id===mount.id),'V původní mapě chybí jezdec nebo zvíře');
 // G04-023: HMK p172 gives rider and mount a shared physical movement.
 // A completed mount-only Move is not a proof of mounted movement if the
 // rider remains at the old coordinate (or was never physically on the mount).
 const startRider=original.units.find(x=>x.id===rider.id);
 const startMount=original.units.find(x=>x.id===mount.id);
 assert(distance(startRider,startMount)<EPS,
  'Jezdec nebyl na počátku pohybu ve skutečné pozici zvířete');
 const verified=projectGuidedSpatialPath({actorId:mount.id,battlefield:original,path:p.requestedPath,
  action:'move',moveRate:p.moveRate,effectiveMove:p.effectiveMove,difficultSources:p.difficultSources,
  stunned:p.terrainFactor/(2**p.difficultSources)>1,moralePurpose:null,retreatConfirmed:false});
 assert(JSON.stringify(verified)===JSON.stringify(p),'Původní pohybová trasa neprošla opětovným pravidlovým výpočtem');
 assert(Math.abs(p.requestedFt-declaredDistanceFt)<EPS,
  'Deklarovaná vzdálenost nesouhlasí se skutečně předem zadanou trasou');
 assert(battlefield?.units?.some(x=>x.id===mount.id&&distance(x,p.finalPosition)<EPS),
  'Uložená pozice zvířete není na konci doložené trasy');
 const finalRider=battlefield?.units?.find(x=>x.id===rider.id);
 assert(finalRider&&distance(finalRider,p.finalPosition)<EPS,
  'Jezdec se nepřesunul spolu se zvířetem; samostatný Move mounta nestačí pro HMK p172');
 // A caller can forge a displayed battlefield. Only the persisted Initiative
 // positions from the same durable combat snapshot prove where BOTH actors
 // finished. Current single-actor mount Move cannot satisfy this invariant.
 assert(Array.isArray(s.spatialUnits)&&s.spatialUnits.length===s.roster.length&&
  s.roster.every(x=>s.spatialUnits.filter(u=>u.id===x.id).length===1),
  'Chybí trvalé společné pozice jezdce a zvířete v Initiative');
 for(const id of [rider.id,mount.id]){
  const persisted=s.spatialUnits.find(u=>u.id===id);
  assert(distance(persisted,p.finalPosition)<EPS,
   'Trvale uložená poloha jezdce nebo zvířete se liší od společné jízdní trasy');
 }
 const expectedMove=declaredDistanceFt;
 const complete=p.actualFt+EPS>=expectedMove;
 const controlIndex=Math.floor(eml/10);
 assert(controlIndex>0,'Nedostatečný Control Index; turn distance nelze ověřit');
 const requiredBetweenTurns=mountTurnDistance({declaredDistanceFt,controlIndex});
 const path=p.actualPath,segments=[];
 for(let i=1;i<path.length;i++)if(distance(path[i-1],path[i])>EPS)
  segments.push({start:path[i-1],end:path[i],length:distance(path[i-1],path[i]),heading:heading(path[i-1],path[i])});
 assert(segments.length>0,'Zvíře se skutečně nepohnulo');
 let sinceLastTurn=0,longestStraight=0,straight=0;
 for(let i=0;i<segments.length;i++){
  const seg=segments[i];
  if(i){const delta=angle(segments[i-1].heading,seg.heading);
   if(delta>EPS){
    assert(delta<=45+EPS,'Mounted Turn přesahuje 45 stupňů (HMK p172)');
    assert(sinceLastTurn+EPS>=requiredBetweenTurns,
     'Zvíře se otočilo před povinnou vzdáleností deklarace / Control Index');
    sinceLastTurn=0;straight=0;
   }
  }
  sinceLastTurn+=seg.length;straight+=seg.length;longestStraight=Math.max(longestStraight,straight);
 }
 // An insufficient move is an AUTOMATIC FAILED Stumble, not something
 // which the caller may elect to ignore. No bonus is awarded before its effects.
 const pending=complete?[]:[{type:'automatic-failed-mount-stumble',source:'HMK p172 & p354'}];
 const tentative=riderImpactEffect({mountRiderImpact,straightDistanceFt:longestStraight,earnedRound:s.round});
 return {readyForAward:false,readyForMovementReview:complete,source:'HMK p172',
  reason:'Zatím chybí atomická společná akce jezdce a zvířete ve stejném IR',
  riderId:rider.id,mountId:mount.id,controlEventId,mountMoveEventId,
  requiredBetweenTurns,actualDistanceFt:p.actualFt,declaredDistanceFt,
  longestStraightFt:longestStraight,controlEML:eml,controlIndex,
  pending,tentativeRiderImpact:complete?tentative:null};
}
