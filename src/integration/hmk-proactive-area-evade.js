/** HMK printed pp.160–161, 166 and Doom Flame p.227.
 * Independent, source-tethered and NON-WRITING preflight for instantaneous
 * proactive Area Evade. Movement is physically immediate but consumes the
 * evader's NEXT Initiative action, so the preflight MUST NOT be used as a
 * complete commit until the Initiative debt and cohort geometry are atomic.
 * Never generate dice or infer missing map, fatigue, ENC, or perception.
 */
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectInjuredMovement,projectLiveInjuries} from './live-injury-impairment.js';
import {baseMove} from '../rules/movement.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
const assert=(v,m)=>{if(!v)throw Error(m)};
const same=JSON.stringify;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const valid=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
/** Only a preview: not a write permit. The caller cannot bypass the live
 * character derivation by providing an arbitrary effectiveMove/Dodge EML. */
export function previewProactiveDoomFlameEvade({stage,document,targetId,path,battlefield,
 witnessedProjectile=false,gmConfirmed=false}={}){
 assert(stage?.format==='hmk-doom-flame-stage-v1'&&stage.phase==='ready'&&
  stage.documentWitness===same(document),'Chybí ověřený dokončený Doom Flame zdroj');
 assert(witnessedProjectile===true&&gmConfirmed===true,'Doom Flame p227: postava musí vidět přilétající ohnivou kouli');
 const seq=validateEncounterSequence(document.combatRuntime.sequence);
 assert(stage.sequenceWitness===same(seq)&&seq.active&&seq.order[seq.cursor]===stage.casterId,
  'Proaktivní Evade může přerušit právě probíhající Spellfire, ne zpětně přepsat kolo');
 assert(stage.targetIds.includes(targetId)&&targetId!==stage.casterId,
  'Neplatná nebo nezasažená postava pro proactive Evade');
 const target=document.characters.filter(c=>c.id===targetId);
 assert(target.length===1,'Neznámá nebo duplicitní Area postava');
 const c=target[0],state=c.hmk?.combatState;
 validateCombatState(state);
 assert(state.shock==='NONE'&&!state.posture?.prone&&state.morale?.state==='steady'&&
  !state.grabHold?.active&&!state.posture?.passNextTurn&&!state.mishaps?.some(x=>!x.resolved),
  'Proaktivní Evade vyžaduje schopnou stojící postavu bez vyšší povinné akce');
 const a=c.hmk?.attributes??{},folk=String(c.hmk?.folk??'').toLowerCase();
 assert(valid(a.agl,1,40)&&valid(a.str,1,40)&&['human','human-sized','human sized','human folk','kuzhai','kûzhai'].includes(folk),
  'Bez doložené Human/Kûzhai postavy s AGL/STR nelze bezpečně odvodit Move');
 const load=resolveCombatantLoad({character:c,inventory:document.inventory});
 assert(load.encReady,'Neověřená výstroj Evade: '+load.issues?.join('; '));
 const injury=projectInjuredMovement({state,round:seq.round,timelineId:seq.timelineId});
 assert(injury.ready&&!injury.blocked,'Zranění brání ověřenému Evade Move');
 const move=baseMove({agility:a.agl,strength:a.str,folk:folk.includes('kuzhai')||folk==='kûzhai'?'kuzhai':'human-sized'}).move;
 const fatigue=combatFatigueTotals(state).total;
 const effectiveMove=Math.max(0,move-load.modifiedENC-fatigue-injury.impairment);
 assert(valid(effectiveMove,10,1000),'Evade nemá dostatek ověřeného pohybu');
 const dodge=c.hmk.skills?.filter(s=>String(s?.name??'').toLowerCase()==='dodge');
 assert(dodge?.length===1&&valid(dodge[0].ml,0,200),'Chybí jednoznačná aktuální Dodge ML');
 const injuryDodge=projectLiveInjuries({state,round:seq.round,test:'dodge',usedArms:[],timelineId:seq.timelineId});
 assert(injuryDodge.ready&&!injuryDodge.unusable,'Zranění znemožňuje Dodge');
 const dodgeEML=Math.max(5,Math.min(95,dodge[0].ml-load.modifiedENC-fatigue+injuryDodge.modifier));
 const units=seq.spatialUnits;
 assert(Array.isArray(units)&&units.length===seq.order.length&&
  Array.isArray(battlefield?.units)&&battlefield.units.length===units.length&&
  units.every(u=>battlefield.units.filter(v=>v.id===u.id&&dist(u,v)<1e-7).length===1),
  'Reaktivní Evade vyžaduje úplnou skutečnou mapu na okamžiku zásahu');
 assert(same(battlefield.barriers??[])===same(seq.spatialBarriers??[]),
  'Neověřená překážka během Evade');
 const projection=projectGuidedSpatialPath({actorId:targetId,battlefield,path,
  action:'evade',effectiveMove,dodgeIndex:Math.floor(dodgeEML/10),stunned:false});
 assert(projection.actualFt>=10&&projection.requestedFt<=projection.actualFt+1e-7&&!projection.stoppedByEZ,
  'Evade se zastavila před požadovaným 10ft přesunem nebo na nepřátelské EZ');
 assert(!units.some(u=>u.id!==targetId&&dist(u,projection.finalPosition)<1e-6),
  'Proaktivní Evade se nesmí skončit na obsazeném poli');
 const last=projection.finalPosition,inside=dist(last,stage.center)<=stage.radius+1e-7;
 // The evader has already paid the spatial action NOW; the scheduler must
 // consume, not replay it, on their NEXT IR. This proof is NOT such a scheduler.
 const ownIndex=seq.order.indexOf(targetId),turnIndex=seq.cursor;
 const turnDueRound=ownIndex>turnIndex?seq.round:seq.round+1;
 return {format:'hmk-proactive-doom-flame-evade-preview-v1',readyForCommit:false,
  sourceEventId:stage.id,timelineId:seq.timelineId,targetId,round:seq.round,
  projection,dodgeEML,insideBlastAfterMove:inside,
  nextIRActionDue:{actorId:targetId,round:turnDueRound,action:'evade',alreadyMoved:true},
  documentWitness:same(document),stateWitness:same(state),
  limitations:['Not atomically bound to Area source / target subset / next IR','No damage or action debt is persisted here']};
}
