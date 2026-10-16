/**
 * HârnMaster: Roleplaying in the World of Kèthîra pp.159–161.
 * Source-only, fail-closed spatial turn decisions. The map/observations are
 * externally supplied facts, NEVER generated or inferred from an absent map.
 * The rules engine computes distance, movement limits, EZ entry and turn use.
 * No dice are generated. The caller commits the returned sequence and map
 * together; this resolver never mutates either argument.
 */
import {moveAction,evadeAction,chargeEligibility,chargeAttackChoice} from '../rules/actions.js';
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
import {finishEncounterTurn,validateEncounterSequence,currentEncounterActor} from './encounter-turn-sequence.js';
import {successLevel,SL} from '../rules/tests.js';
import {applyConfirmedFatigue} from './persistent-combat-state.js';
import {requireParalysisAction} from './hmk-paralysis-sequela.js';
import {validateSpatialBarriers,pathCrossesClosedBarrier} from './hmk-guided-spatial-barriers.js';
const requireRule=(p,m)=>{if(!p)throw Error(m)};
const number=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000000;
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const same=x=>JSON.stringify(x);
const pt=p=>p&&number(p.x)&&number(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round5=x=>Math.floor((x+1e-9)/5)*5;
export const isPermanentlyBlind=state=>!!state?.ailmentSequelae?.some(x=>x?.active===true&&x?.permanent===true&&x?.condition==='blindness');
const EQ=1e-7;
function ensureGeometry({actorId,battlefield}){
 requireRule(battlefield&&Array.isArray(battlefield.units),'Chybí mapa skutečných pozic všech účastníků');
 const unique=new Set();
 for(const u of battlefield.units){
  requireRule(typeof u.id==='string'&&u.id&&!unique.has(u.id)&&pt(u),'Neplatná či duplicitní poloha účastníka');
  unique.add(u.id);
  requireRule(typeof u.foe==='boolean'&&typeof u.threatens==='boolean'&&typeof u.aware==='boolean'&&
   typeof u.helpless==='boolean'&&typeof u.concentrating==='boolean'&&typeof u.reachImpeded==='boolean',
   `U ${u.id} chybí potvrzené okolnosti Engagement Zone / hráčská volba Threat`);
  requireRule(number(u.reachFt)&&u.reachFt>=0,'Chybí doložený Reach zbraně');
  requireRule(!u.threatens||u.foe&&u.aware&&!u.helpless&&!u.concentrating&&!u.reachImpeded,
   'Threat je povolen jen schopnému, Aware protivníkovi s neomezeným dosahem');
 }
 requireRule(unique.has(actorId),'Chybí poloha jednající postavy');
 return battlefield.units;
}
/** First point entering a threatening circular EZ (not merely the destination). */
function firstContact(start,end,enemy,radius){
 const dx=end.x-start.x,dy=end.y-start.y;const a=dx*dx+dy*dy;
 const fx=start.x-enemy.x,fy=start.y-enemy.y;
 // Leaving an EZ already occupied at turn start is permitted (HMK p.159).
 if(fx*fx+fy*fy<=radius*radius+EQ)return null;
 if(a<EQ)return null;
 const b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-radius*radius;
 const disc=b*b-4*a*c;
 if(disc<0)return null;
 const t=(-b-Math.sqrt(Math.max(0,disc)))/(2*a);
 if(t<0||t>1)return null;
 return {t,point:{x:start.x+t*dx,y:start.y+t*dy}};
}
/**
 * No hidden clipping: the returned actualPath documents precisely where
 * movement must stop. Any subsequent attack must use that new position.
 */
export function projectGuidedSpatialPath({actorId,battlefield,path,difficultSources=0,action,moveRate='full',
  effectiveMove,dodgeIndex=null,stunned=false,chargeAttack=null,chargeTargetId=null,
  moralePurpose=null,retreatConfirmed=false,overrunProof=null,blindness=false}={}){
 const units=ensureGeometry({actorId,battlefield});
 const barriers=validateSpatialBarriers(battlefield.barriers??[]);
 requireRule(['move','evade','charge'].includes(action),'Neznámá pohybová akce HMK');
 requireRule(typeof blindness==='boolean','Slepota musí pocházet z doloženého stavu postavy');
 requireRule(Array.isArray(path)&&path.length>=2&&path.length<=100&&path.every(pt),'Je nutná doložená trasa pohybu');
 requireRule(moralePurpose===null||['routed','withdrawing'].includes(moralePurpose),
  'Neznámý pravidlový účel povinného Morale pohybu');
 requireRule(typeof retreatConfirmed==='boolean','Chybí doložené rozhodnutí GM o ústupu');
 if(moralePurpose){
  requireRule(action==='move'&&retreatConfirmed===true,
   'HMK str.162: GM musí výslovně potvrdit útěk nebo ústup od boje');
  if(moralePurpose==='routed')requireRule(moveRate==='full',
   'HMK str.162: Routed musí použít full Move; half/double nestačí');
 }
 // HMK p353: size-based Overrun is a verified exception to normal EZ stop.
 // The committing action must re-derive these ZN from the LIVE participants;
 // a stand-alone projection or UI-supplied number is never a write capability.
 if(overrunProof!==null){
  requireRule(action==='move'&&['half','full'].includes(moveRate)&&
   overrunProof?.format==='hmk-size-overrun-v1'&&whole(overrunProof.mountZN,1,100)&&
   Array.isArray(overrunProof.opponents)&&overrunProof.opponents.length>0&&
   overrunProof.opponents.every(x=>typeof x.id==='string'&&whole(x.zoneNumbers,1,100))&&
   new Set(overrunProof.opponents.map(x=>x.id)).size===overrunProof.opponents.length&&
   overrunProof.opponents.reduce((s,x)=>s+x.zoneNumbers,0)<overrunProof.mountZN&&
   overrunProof.opponents.every(x=>units.some(u=>u.id===x.id&&u.foe)),
   'HMK p353: Overrun vyžaduje jedinečné skutečné protivníky a přísně nižší součet ZN');
 }
 const ignoredOverrunIds=new Set(overrunProof?.opponents.map(x=>x.id)??[]);
 const actor=units.find(u=>u.id===actorId);
 requireRule(distance(actor,path[0])<EQ,'Začátek trasy nesouhlasí s uloženou pozicí účastníka');
 requireRule(whole(effectiveMove,0,100000),'Chybí skutečný efektivní Move po ENC, Fatigue a zranění');
 requireRule(whole(difficultSources,0,8),'Neúplné zdroje Difficult Movement');
 requireRule(!stunned||action!=='evade','STN nesmí provést Evade (HMK str.161)');
 requireRule(!actor.helpless&&!actor.concentrating,'Neschopný nebo soustředící se účastník nesmí zahájit pohyb');
 const threatenedAtStart=units.some(u=>u.foe&&u.threatens&&distance(actor,u)<=Math.max(5,u.reachFt)+EQ);
 if(action==='charge')requireRule(chargeEligibility({threatenedAtTurnStart:threatenedAtStart})&&!threatenedAtStart,
  'Charge nelze zahájit v ohrožení protivníka');
 let max;
 if(action==='evade'){
  requireRule(whole(dodgeIndex,0,20),'Evade vyžaduje doložený Effective Dodge Index');
  max=evadeAction({stunned,distanceFt:10,halfMoveFt:round5(effectiveMove/2),effectiveDodgeIndex:dodgeIndex}).maxMoveFt;
 }else if(action==='charge')max=round5(effectiveMove/2);
 else{
  requireRule(['half','full','double'].includes(moveRate),'Move musí určit half/full/double');
  max=moveAction({effectiveMove,rate:moveRate}).maxDistanceFt;
 }
 const terrainFactor=2**difficultSources * (stunned?2:1);
 // HMK p.160: after Difficult Movement factors, round available movement DOWN
 // to a complete five-foot space (e.g. half Move 25 / 2 = 12.5 -> 10).
 let travelled=0,remaining=round5(max/terrainFactor),contact=null;
 const actualPath=[{...path[0]}];
 for(let i=1;i<path.length;i++){
  const from=path[i-1],to=path[i],len=distance(from,to);
  if(len<EQ)continue;
  const reachable=Math.min(1,Math.max(0,remaining/len));
  const limited={x:from.x+reachable*(to.x-from.x),y:from.y+reachable*(to.y-from.y)};
  let stop=null;
  for(const enemy of units.filter(u=>u.foe&&u.threatens&&!ignoredOverrunIds.has(u.id))){
   const hit=firstContact(from,limited,enemy,Math.max(5,enemy.reachFt));
   if(hit&&(!stop||hit.t<stop.t))stop={...hit,enemyId:enemy.id};
  }
  // Do not permit an Overrun declaration to silently pass through an
  // unlisted or insufficiently documented opponent's occupied position.
  if(overrunProof!==null){
   for(const enemy of units.filter(u=>u.foe&&!ignoredOverrunIds.has(u.id))){
    const vx=limited.x-from.x,vy=limited.y-from.y;
    const den=vx*vx+vy*vy;
    const at=den>EQ?Math.max(0,Math.min(1,((enemy.x-from.x)*vx+(enemy.y-from.y)*vy)/den)):0;
    const near={x:from.x+at*vx,y:from.y+at*vy};
    requireRule(distance(near,enemy)>EQ,
     'Overrun trasa kříží obsazený prostor protivníka bez potvrzených ZN');
   }
  }
  const target=stop?stop.point:limited;
  const distanceTaken=distance(from,target);
  travelled+=distanceTaken;remaining=Math.max(0,remaining-distanceTaken);
  actualPath.push(target);
  if(stop){contact={enemyId:stop.enemyId,point:target,segment:i};break;}
  if(reachable<1-EQ)break;
 }
 const hitBarrier=pathCrossesClosedBarrier(actualPath,barriers);
 requireRule(!hitBarrier,'Trasa protíná zavřené dveře nebo pevnou překážku: '+(hitBarrier?.id??''));
 const requested=path.slice(1).reduce((n,p,i)=>n+distance(path[i],p),0);
 requireRule(requested>0,'Akce musí mít skutečný pohyb');
 requireRule(travelled>0,'Threatening Engagement Zone zastavila pohyb v jeho počátku');
 if(action==='evade'){
  requireRule(travelled>=10-EQ,'Evade vyžaduje alespoň 10 stop skutečného pohybu');
 }
 if(action==='charge'){
  requireRule(['melee','thrown'].includes(chargeAttack),'Charge musí předem určit Melee nebo Thrown Attack');
  const finish=actualPath.at(-1);
  const enemies=units.filter(u=>u.foe);
  const target=enemies.find(u=>u.id===chargeTargetId);
  requireRule(!!target,'Charge vyžaduje konkrétního skutečného protivníka, nikoli libovolný dosahovaný cíl');
  const targetDistance=distance(finish,target);
  const engaged=targetDistance<=Math.max(5,actor.reachFt)+EQ;
  const threatened=enemies.some(u=>u.threatens&&distance(finish,u)<=Math.max(5,u.reachFt)+EQ);
  if(chargeAttack==='thrown')requireRule(targetDistance>=5-EQ,
   'HMK p.163: Charge Thrown vyžaduje vzdálenost skutečného cíle alespoň 5 stop');
  const eligibility=chargeAttackChoice({threatenedAfterMovement:threatened,targetEngaged:engaged});
  requireRule(chargeAttack==='melee'?eligibility.mayMeleeAttack:eligibility.mayThrownAttack,
   'Po dokončení Charge není zvolený druh útoku pravidlově povolen');
 }
 const curvedDouble=action==='move'&&moveRate==='double'&&actualPath.length>2&&actualPath.slice(1,-1).some((p,i)=>{
  const prev=actualPath[i],next=actualPath[i+2];const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
  return Math.abs(ax*by-ay*bx)>EQ;
 });
 const blindnessStumble=blindness&&action==='move'&&['full','double'].includes(moveRate);
 // Independent triggers: blindness (p184) and change of direction during
 // Double Move (p160). A failed first roll stops the movement; a bend that
 // was never reached does not create a second roll.
 const stumbleCauses=[...(blindnessStumble?['blindness']:[]),...(curvedDouble?['double-bend']:[])];
 let bendAtFt=null;
 if(curvedDouble){let travelledToBend=0;
  for(let i=1;i<actualPath.length-1;i++){
   travelledToBend+=distance(actualPath[i-1],actualPath[i]);
   const a=actualPath[i-1],b=actualPath[i],c=actualPath[i+1];
   if(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))>EQ){bendAtFt=travelledToBend;break;}
  }
 }
 return {format:'hmk-guided-spatial-projection-v1',action,actorId,requestedPath:path.map(p=>({...p})),requestedFt:requested,actualFt:travelled,
  actualPath,finalPosition:actualPath.at(-1),contact,stoppedByEZ:!!contact,overrunProof:overrunProof===null?null:structuredClone(overrunProof),
  effectiveMove,moveRate:action==='move'?moveRate:'half',difficultSources,terrainFactor,
  moralePurpose,retreatConfirmed,battlefieldWitness:same({units,barriers}),
  chargedMovementFt:travelled*terrainFactor,maxMovementFt:max,
  blindnessStumble,stumbleCause:stumbleCauses[0]??null,stumbleCauses,bendAtFt,
  requiresStumble:stumbleCauses.length>0,chargeAttack:action==='charge'?chargeAttack:null,chargeTargetId:action==='charge'?chargeTargetId:null,
  evadingMissilePenalty:action==='evade'?-dodgeIndex*5:null,
  chargeAttackPending:action==='charge',source:'HMK World of Kèthîra pp.159–161'};
}
/** Verified GM witness of where a failed Stumble stopped movement.
 * The point MUST be on an actual reachable route segment, including endpoints.
 * We never silently move a fallen character to the requested destination.
 */
export function verifySpatialStumbleStop(projection,point){
 requireRule(projection?.format==='hmk-guided-spatial-projection-v1'&&projection.requiresStumble,
  'Stumble Stop: chybí povinný Stumble na doložené trase');
 requireRule(pt(point),'Stumble Stop: GM musí doložit skutečnou polohu x,y');
 let before=0;
 for(let i=1;i<projection.actualPath.length;i++){
  const a=projection.actualPath[i-1],b=projection.actualPath[i],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  if(den<EQ)continue;
  const t=((point.x-a.x)*dx+(point.y-a.y)*dy)/den;
  const clamped=Math.max(0,Math.min(1,t));
  if(t>=-EQ&&t<=1+EQ&&distance(point,{x:a.x+clamped*dx,y:a.y+clamped*dy})<EQ){
   const actualFt=before+clamped*Math.sqrt(den);
   const actualPath=[...projection.actualPath.slice(0,i),{x:a.x+clamped*dx,y:a.y+clamped*dy}];
   return {point:actualPath.at(-1),actualFt,actualPath,source:'GM confirmed fall position on reachable path, HMK p161'};
  }
  before+=Math.sqrt(den);
 }
 throw Error('Stumble Stop: poloha pádu neleží na skutečně dosažené části trasy');
}
/** Atomic dry-run of turn completion. Charge must be resolved by its attached
 * Attack journey before consuming the main action, so it is NOT auto-committed.
 * A double Move with a bend requires a physical Stumble test before commit.
 */
export function commitGuidedSpatialTurn({id,sequence,states,battlefield,projection,
 stumbleRoll=null,stumbleEML=null,stumbleTechnique=null,stumbleUsedArms=null,stumbleRolls=null,stumbleStopPoint=null,enduranceRoll=null,enduranceTN=null,personalFatigue=null}={}){
 requireRule(projection?.format==='hmk-guided-spatial-projection-v1','Chybí ověřená prostorová akce');
 const s=validateEncounterSequence(sequence);
 requireRule(s.active&&currentEncounterActor(s)===projection.actorId,'Není tah správného účastníka');
 // A restored or externally supplied projection is not authority to move.
 // Recalculate from the current, fully witnessed battlefield and the original
 // requested route. This also re-checks Threat, ENC-derived Move and distance.
 requireRule(Array.isArray(projection.requestedPath),'Chybí původní ověřená trasa; nelze bezpečně obnovit pohyb');
 requireRule(battlefield?.units?.length===s.order.length&&s.order.every(id=>
  battlefield.units.filter(u=>u.id===id).length===1),'Pohyb vyžaduje kompletní mapu střetnutí');
 if(s.spatialBarriers!==undefined){
  requireRule(JSON.stringify(battlefield.barriers??[])===
   JSON.stringify(s.spatialBarriers.map(b=>b.kind==='wall'?{...b,open:false}:{...b,
    open:s.interactionObjects.find(o=>o.id===b.id)?.open})),
   'Stav nebo geometrie dveří a stěn se změnily před dokončením pohybu');
 }
 if(s.spatialUnits?.length){
  requireRule(s.spatialUnits.length===s.order.length&&s.order.every(id=>{
   const saved=s.spatialUnits.find(u=>u.id===id),live=battlefield.units.find(u=>u.id===id);
   return saved&&live&&distance(saved,live)<EQ;
  }), 'Mapa se od ověření pohybu změnila');
 }
 const liveMorale=states?.[projection.actorId]?.morale?.state;
 if(['routed','withdrawing'].includes(liveMorale)){
  requireRule(projection.action==='move'&&projection.moralePurpose===liveMorale&&
   projection.retreatConfirmed===true,
   'HMK str.162: chybí potvrzená prostorová trasa útěku/ústupu podle aktuální Morale');
 }else requireRule(projection.moralePurpose===null&&projection.retreatConfirmed===false,
  'Projekce neodpovídá aktuální Morale postavy');
 requireParalysisAction(states?.[projection.actorId],projection.action);
 const recalculated=projectGuidedSpatialPath({actorId:projection.actorId,battlefield,
  path:projection.requestedPath,action:projection.action,moveRate:projection.moveRate,
  effectiveMove:projection.effectiveMove,difficultSources:projection.difficultSources,
  stunned:projection.terrainFactor/(2**projection.difficultSources)>1,
  dodgeIndex:projection.action==='evade'?-projection.evadingMissilePenalty/5:null,
  chargeAttack:projection.chargeAttack,chargeTargetId:projection.chargeTargetId,
  moralePurpose:projection.moralePurpose,retreatConfirmed:projection.retreatConfirmed,
  blindness:isPermanentlyBlind(states?.[projection.actorId])});
 requireRule(projection.blindnessStumble===(isPermanentlyBlind(states?.[projection.actorId])&&
  projection.action==='move'&&['full','double'].includes(projection.moveRate)),
  'Slepota se změnila od ověření trasy; není povolen přesun bez povinného Stumble');
 requireRule(JSON.stringify(recalculated)===JSON.stringify(projection),
  'Prostorový výsledek neodpovídá aktuálním pravidlům nebo původní trase');
 requireRule(projection.action!=='charge','Charge musí dokončit útok v témže průvodci; samotný přesun nelze uložit jako úplný tah');
 const causes=projection.stumbleCauses??(projection.requiresStumble?[projection.stumbleCause]:[]);
 requireRule(Array.isArray(causes)&&causes.length<3&&
  causes.every(c=>['blindness','double-bend'].includes(c))&&new Set(causes).size===causes.length,
  'Stumble: neplatné příčiny v projekci pohybu');
 const dice=stumbleRolls===null?
  (stumbleRoll===null?[]:[{cause:causes[0],roll:stumbleRoll,eml:stumbleEML,
   technique:stumbleTechnique,usedArms:stumbleUsedArms}]):stumbleRolls;
 requireRule(Array.isArray(dice)&&dice.length<=2&&dice.every((r,i)=>
  r&&r.cause===causes[i]&&whole(r.roll,1,100)&&whole(r.eml,-500,500)&&
  ['agility','acrobatics'].includes(r.technique)&&Array.isArray(r.usedArms)&&
  r.usedArms.every(x=>['left','right','none'].includes(x))),
  'Povinný Stumble vyžaduje samostatný skutečný d100, metodu Agility/Acrobatics a EML pro každou příčinu');
 const firstFailure=dice.findIndex(r=>successLevel(r.roll,r.eml)<SL.S);
 requireRule(dice.length===(firstFailure>=0?firstFailure+1:causes.length),
  'Stumble: po úspěchu musí následovat druhý nezávislý hod, po pádu se další hod neprovádí');
 requireRule(stumbleRolls===null||(stumbleRoll===null&&stumbleEML===null&&stumbleTechnique===null&&stumbleUsedArms===null),
  'Stumble: nelze smíchat jednotlivé hody s vícekolovým důkazem');
 const doubleMove=projection.action==='move'&&projection.moveRate==='double';
 requireRule(!doubleMove||(whole(enduranceRoll,1,10)&&whole(enduranceTN,0,20)&&whole(personalFatigue,5,999)),
  'Double Move vyžaduje skutečný END Secondary Roll d10 a Personal Fatigue');
 requireRule(doubleMove||enduranceRoll===null,'END SR nepatří k běžnému pohybu');
 requireRule(projection.requiresStumble||(dice.length===0&&stumbleRoll===null&&stumbleEML===null&&stumbleTechnique===null),
  'Stumble nelze dokládat, pokud nebyl pravidly vyžadován');
 requireRule(battlefield?.units&&battlefield.units.some(u=>u.id===projection.actorId),'Chybí nezměněná mapa');
 const positions=Object.fromEntries(battlefield.units.map(u=>[u.id,{x:u.x,y:u.y}]));
 const start=positions[projection.actorId];
 requireRule(distance(start,projection.actualPath[0])<EQ,'Pozice se po výpočtu změnila');
 let actorState=null,fatigueAdded=0,stop=null;
 const failedStumble=firstFailure>=0;
 const failureCause=failedStumble?dice[firstFailure].cause:null;
 if(failedStumble){
  requireRule(stumbleStopPoint!==null,'Neúspěšný Stumble: GM musí určit skutečnou polohu pádu na trase (HMK str.161)');
  stop=verifySpatialStumbleStop(projection,stumbleStopPoint);
  // The first failed sight-based test must stop before the unrated turn.
  // A bend-triggered Stumble cannot cause a fall before that bend occurs.
  if(projection.bendAtFt!==null&&projection.bendAtFt!==undefined){
   if(failureCause==='blindness')requireRule(stop.actualFt<=projection.bendAtFt+EQ,
    'Stumble slepoty: pád po zatáčce by obešel dosud neprovedený hod za změnu směru');
   if(failureCause==='double-bend')requireRule(stop.actualFt+EQ>=projection.bendAtFt,
    'Stumble za zatáčku: pád nemůže nastat před dosažením skutečné zatáčky');
  }
  requireRule(projection.moralePurpose===null,
   'Pád při povinném Morale/Fear ústupu vyžaduje samostatné rozhodnutí o skutečném pohybu; nelze jej uzavřít automaticky');
  actorState=structuredClone(states[projection.actorId]);actorState.posture.prone=true;
  requireRule(!actorState.events.some(e=>e.id===id+':stumble'),'Stumble již byl zapsán');
  actorState.events.push({id:id+':stumble',type:'movement-stumble-fall',round:s.round,details:{
   sourcePage:failureCause==='blindness'?184:160,roll:dice[firstFailure].roll,eml:dice[firstFailure].eml,
   cause:failureCause,rolls:structuredClone(dice),point:stop.point,actualFt:stop.actualFt}});
  actorState.lastRound=Math.max(actorState.lastRound,s.round);
 }else requireRule(stumbleStopPoint===null,
  'Úspěšný Stumble nebo pohyb bez Stumble nesmí obsahovat polohu pádu');
 if(doubleMove){
  const base=actorState??structuredClone(states[projection.actorId]);
  fatigueAdded=Math.max(0,personalFatigue-(enduranceRoll<=enduranceTN?5:0));
  actorState=applyConfirmedFatigue({state:base,round:s.round,eventId:id+':double-move-fatigue',
   kind:'windedness',delta:fatigueAdded}).state;
 }
 const withStates=actorState?{...states,[projection.actorId]:actorState}:states;
 const next=finishEncounterTurn(s,withStates,{action:projection.action,
  movementProof:{eventId:id,projection,battlefield,stumbleEvidence:projection.requiresStumble?{rolls:structuredClone(dice),
   cause:failureCause,stop}:null},gmConfirmed:true});
 next.spatialEvents??=[];
 requireRule(!next.spatialEvents.some(e=>e.id===id),'Duplicitní pohybová událost');
 const proof={id,round:s.round,actorId:projection.actorId,timelineId:s.timelineId,projection:structuredClone(projection)};
 next.spatialEvents.push(proof);
 next.log.push({round:s.round,type:'spatial-action',actorId:projection.actorId,
  eventId:id,action:projection.action,actualFt:stop?.actualFt??projection.actualFt,stopByEZ:!stop&&projection.stoppedByEZ,stumbleCause:failureCause,stumbleRolls:structuredClone(dice),stumbleStop:stop?.point??null});
 const updated={...structuredClone(battlefield),units:battlefield.units.map(u=>u.id===projection.actorId?{...u,...(stop?.point??projection.finalPosition)}:u)};
 proof.stumbleStop=stop;
 proof.dice=[...dice.map(r=>({faces:100,value:r.roll,eml:r.eml,kind:'stumble',technique:r.technique,usedArms:r.usedArms,cause:r.cause})),
  ...(enduranceRoll===null?[]:[{faces:10,value:enduranceRoll,tn:enduranceTN,kind:'endurance-sr'}])];
 proof.fatigueAdded=fatigueAdded;
 return {sequence:next,battlefield:updated,actorState,proof,fatigueAdded,stumbleStop:stop};
}
