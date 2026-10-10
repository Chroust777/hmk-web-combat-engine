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
const requireRule=(p,m)=>{if(!p)throw Error(m)};
const number=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000000;
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const same=x=>JSON.stringify(x);
const pt=p=>p&&number(p.x)&&number(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round5=x=>Math.floor((x+1e-9)/5)*5;
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
  effectiveMove,dodgeIndex=null,stunned=false,chargeAttack=null,chargeTargetId=null}={}){
 const units=ensureGeometry({actorId,battlefield});
 requireRule(['move','evade','charge'].includes(action),'Neznámá pohybová akce HMK');
 requireRule(Array.isArray(path)&&path.length>=2&&path.length<=100&&path.every(pt),'Je nutná doložená trasa pohybu');
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
  for(const enemy of units.filter(u=>u.foe&&u.threatens)){
   const hit=firstContact(from,limited,enemy,Math.max(5,enemy.reachFt));
   if(hit&&(!stop||hit.t<stop.t))stop={...hit,enemyId:enemy.id};
  }
  const target=stop?stop.point:limited;
  const distanceTaken=distance(from,target);
  travelled+=distanceTaken;remaining=Math.max(0,remaining-distanceTaken);
  actualPath.push(target);
  if(stop){contact={enemyId:stop.enemyId,point:target,segment:i};break;}
  if(reachable<1-EQ)break;
 }
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
 return {format:'hmk-guided-spatial-projection-v1',action,actorId,requestedFt:requested,actualFt:travelled,
  actualPath,finalPosition:actualPath.at(-1),contact,stoppedByEZ:!!contact,
  effectiveMove,moveRate:action==='move'?moveRate:'half',difficultSources,terrainFactor,
  chargedMovementFt:travelled*terrainFactor,maxMovementFt:max,
  requiresStumble:action==='move'&&moveRate==='double'&&actualPath.length>2&&actualPath.slice(1,-1).some((p,i)=>{
   const prev=actualPath[i],next=actualPath[i+2];const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
   return Math.abs(ax*by-ay*bx)>EQ;
  }),chargeAttack:action==='charge'?chargeAttack:null,chargeTargetId:action==='charge'?chargeTargetId:null,
  evadingMissilePenalty:action==='evade'?-dodgeIndex*5:null,
  chargeAttackPending:action==='charge',source:'HMK World of Kèthîra pp.159–161'};
}
/** Atomic dry-run of turn completion. Charge must be resolved by its attached
 * Attack journey before consuming the main action, so it is NOT auto-committed.
 * A double Move with a bend requires a physical Stumble test before commit.
 */
export function commitGuidedSpatialTurn({id,sequence,states,battlefield,projection,
 stumbleRoll=null,stumbleEML=null,enduranceRoll=null,enduranceTN=null,personalFatigue=null}={}){
 requireRule(projection?.format==='hmk-guided-spatial-projection-v1','Chybí ověřená prostorová akce');
 const s=validateEncounterSequence(sequence);
 requireRule(s.active&&currentEncounterActor(s)===projection.actorId,'Není tah správného účastníka');
 requireRule(projection.action!=='charge','Charge musí dokončit útok v témže průvodci; samotný přesun nelze uložit jako úplný tah');
 requireRule(!projection.requiresStumble||(whole(stumbleRoll,1,100)&&whole(stumbleEML,-500,500)),
  'Double Move s obratem vyžaduje doložený Stumble d100 a EML');
 const doubleMove=projection.action==='move'&&projection.moveRate==='double';
 requireRule(!doubleMove||(whole(enduranceRoll,1,10)&&whole(enduranceTN,0,20)&&whole(personalFatigue,5,999)),
  'Double Move vyžaduje skutečný END Secondary Roll d10 a Personal Fatigue');
 requireRule(doubleMove||enduranceRoll===null,'END SR nepatří k běžnému pohybu');
 requireRule(battlefield?.units&&battlefield.units.some(u=>u.id===projection.actorId),'Chybí nezměněná mapa');
 const positions=Object.fromEntries(battlefield.units.map(u=>[u.id,{x:u.x,y:u.y}]));
 const start=positions[projection.actorId];
 requireRule(distance(start,projection.actualPath[0])<EQ,'Pozice se po výpočtu změnila');
 let actorState=null,fatigueAdded=0;
 if(projection.requiresStumble&&successLevel(stumbleRoll,stumbleEML)<SL.S){
  actorState=structuredClone(states[projection.actorId]);actorState.posture.prone=true;
 }
 if(doubleMove){
  const base=actorState??structuredClone(states[projection.actorId]);
  fatigueAdded=Math.max(0,personalFatigue-(enduranceRoll<=enduranceTN?5:0));
  actorState=applyConfirmedFatigue({state:base,round:s.round,eventId:id+':double-move-fatigue',
   kind:'windedness',delta:fatigueAdded}).state;
 }
 const withStates=actorState?{...states,[projection.actorId]:actorState}:states;
 const next=finishEncounterTurn(s,withStates,{action:projection.action,gmConfirmed:true});
 next.spatialEvents??=[];
 requireRule(!next.spatialEvents.some(e=>e.id===id),'Duplicitní pohybová událost');
 const proof={id,round:s.round,actorId:projection.actorId,timelineId:s.timelineId,projection:structuredClone(projection)};
 next.spatialEvents.push(proof);
 next.log.push({round:s.round,type:'spatial-action',actorId:projection.actorId,
  eventId:id,action:projection.action,actualFt:projection.actualFt,stopByEZ:projection.stoppedByEZ});
 const updated={...structuredClone(battlefield),units:battlefield.units.map(u=>u.id===projection.actorId?{...u,...projection.finalPosition}:u)};
 proof.dice=[...(stumbleRoll===null?[]:[{faces:100,value:stumbleRoll,eml:stumbleEML,kind:'stumble'}]),
  ...(enduranceRoll===null?[]:[{faces:10,value:enduranceRoll,tn:enduranceTN,kind:'endurance-sr'}])];
 proof.fatigueAdded=fatigueAdded;
 return {sequence:next,battlefield:updated,actorState,proof,fatigueAdded};
}
