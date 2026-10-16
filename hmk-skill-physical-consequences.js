/** HMK 1.2 pp.71,148,167-170: skill-generated physical injuries.
 * Pure preview: no storage, invented dice or character mutations.
 * The caller commits the returned state and proof in one verified transaction.
 */
import {humanLocation,woundFromFall} from './hmk-mounted-fall-injury-join.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {successLevel} from '../rules/tests.js';
const must=(ok,msg)=>{if(!ok)throw Error(msg)};
const die=(v,max)=>Number.isSafeInteger(v)&&v>=1&&v<=max;
function rollProof(...rows){return rows.map(([faces,value])=>({faces,value,source:'GM-entered-physical-die'}));}
const mastery=(actor,name)=>{
 const a=(actor.hmk?.skills||[]).filter(x=>String(x.name||'').toLowerCase()===name.toLowerCase());
 must(a.length===1&&Number.isSafeInteger(a[0].ml)&&a[0].ml>0,`Není doloženo ML ${name} cílové postavy`);
 return a[0].ml;
};
export function prepareSkillPhysicalInjury({kind,actor,inventory,state,sourceId,round=1,gmConfirmed=false,
 impactDie,zoneD10,locationD10,direction='front',shockD100=null,compoundD10=null,
 hazardD10=null,agilityD100=null,randomVictimConfirmed=false}={}){
 must(['fishing-cf','survival-accident'].includes(kind),'Neznámý typ zranění Skill Tests');
 must(gmConfirmed===true&&actor?.id&&Array.isArray(inventory)&&state&&typeof sourceId==='string'&&sourceId&&
  die(round,9999),'Nutné potvrzení GM, cílová postava, aktuální Combat State a zdroj události');
 validateCombatState(state);
 const evt='skill-injury:'+kind+':'+sourceId;
 must(!state.events.some(x=>x.id===evt),'Tento následek už je trvale zapsán');
 const limit=kind==='fishing-cf'?10:6;
 let sl=null,eml=null;
 if(kind==='survival-accident'){
  must(randomVictimConfirmed===true,'GM musí doložit náhodný výběr postiženého člena družiny');
  must(die(hazardD10,10)&&hazardD10>=4&&hazardD10<=6,
   'Survival Accident vzniká jen při Survival Hazard d10 v rozsahu 4–6');
  must(die(agilityD100,100),'Survival Accident vyžaduje fyzický Agility d100');
  const load=resolveCombatantLoad({character:actor,inventory});
  must(load.ready&&load.encReady&&load.bulkReady,'Agility test nemá doložené ENC a Bulk');
  const injury=projectLiveInjuries({state,round,test:'agility',usedArms:['left','right'],timelineId:'skill:'+sourceId});
  must(injury.ready&&!injury.unusable&&!injury.stunned&&state.shock==='NONE',
   'Nelze doložit Agility test při aktuálním Shock / zraněních');
  eml=mastery(actor,'Agility')-combatFatigueTotals(state).total+load.agilityAndMeleePenalty+injury.modifier;
  sl=['CF','F','S','CS'][successLevel(agilityD100,eml)];
  if(['S','CS'].includes(sl)){
   must(impactDie==null&&zoneD10==null&&locationD10==null&&shockD100==null&&compoundD10==null,
    'Při úspěšném Agility nejsou fyzické Injury hody přípustné');
   const next=structuredClone(state);next.events.push({id:evt,type:'skill-survival-accident-avoided',round,
    details:{sourceId,agilityD100,eml,sl,hazardD10,rulePage:148,randomVictimConfirmed:true}});
   next.lastRound=Math.max(next.lastRound,round);validateCombatState(next);
   return {state:next,kind,sourceId,sl,eml,injury:null,avoided:true,physicalDice:rollProof([10,hazardD10],[100,agilityD100])};
  }
 }
 must(die(impactDie,limit)&&die(zoneD10,10)&&die(locationD10,10),
  'Chybí fyzický Impact d'+limit+', ZD d10 nebo LD d10');
 must(['front','rear','side'].includes(direction),'Chybí skutečný směr dopadu');
 const load=resolveCombatantLoad({character:actor,inventory});
 must(load.ready&&load.encReady&&load.bulkReady,'Ochrana zbroje není potvrzena: opravte vrstvení');
 const loc=humanLocation(zoneD10,locationD10),aspect=kind==='fishing-cf'?'e':'b';
 const armour=resolveLiveCombatArmour({inventory,targetId:actor.id,location:loc.location,aspect,direction,mode:'auto',rigidStatus:'unknown'});
 must(armour.ready,'Neznámá skutečná ochrana zbroje pro '+loc.location+': '+(armour.reason||'neověřeno'));
 const impact=impactDie+(kind==='survival-accident'?4+(sl==='CF'?5:0):0);
 const dice=rollProof(...(kind==='survival-accident'?[[10,hazardD10],[100,agilityD100]]:[]),
  [limit,impactDie],[10,zoneD10],[10,locationD10],
  ...((shockD100==null)?[]:[[100,shockD100]]),...((compoundD10==null)?[]:[[10,compoundD10]]));
 const applied=woundFromFall({state,character:actor,round,timelineId:'skill:'+sourceId,eventId:evt,
  bodyKind:'human',aspect,location:loc.location,side:loc.side,locationShock:loc.locationShock,
  strikeImpact:impact,AV:armour.armourValue,shockRoll:shockD100,compoundD10,physicalDice:dice});
 const next=structuredClone(applied.state);
 next.events.push({id:evt+':complete',type:'skill-physical-consequence',round,details:{kind,sourceId,
  impact,aspect,location:loc.location,side:loc.side,armourValue:armour.armourValue,
  effectiveImpact:applied.effectiveImpact,injury:applied.injury,sl,eml,physicalDice:dice,
  rulePage:kind==='fishing-cf'?71:148}});
 next.lastRound=Math.max(next.lastRound,round);validateCombatState(next);
 return {state:next,kind,sourceId,sl,eml,impact,aspect,location:loc.location,
  armourValue:armour.armourValue,effectiveImpact:applied.effectiveImpact,
  injury:applied.injury,shock:applied.shockSL,physicalDice:dice,avoided:false};
}
