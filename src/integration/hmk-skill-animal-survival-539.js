/** HMK 1.2 pp.148,166-170,354-355: Survival Accident against a verified
 * live pack/riding animal. Preview-only; caller commits one original state and
 * journal receipt atomically. Neither human body locations nor invented dice.
 */
import {previewVerifiedMountedAnimalTrauma,verifiedMountedShockML} from './hmk-mounted-live-animal-falling.js';
import {woundFromFall} from './hmk-mounted-fall-injury-join.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {successLevel} from '../rules/tests.js';
const requireFact=(ok,message)=>{if(!ok)throw Error(message)};
const isDie=(value,faces)=>Number.isSafeInteger(value)&&value>=1&&value<=faces;
const roll=(faces,value)=>({faces,value,source:'GM-entered-physical-die'});
export function prepareAnimalSurvivalAccident({actor,state,inventory,sourceId,round=1,gmConfirmed=false,
 hazardD10,agilityD100,randomVictimConfirmed=false,impactDie=null,zoneD10=null,locationD10=null,
 shockD100=null,compoundD10=null}={}){
 requireFact(gmConfirmed===true&&actor?.id&&state&&Array.isArray(inventory)&&typeof sourceId==='string'&&sourceId&&isDie(round,9999),
  'Survival Accident zvířete vyžaduje původní postavu, Combat State, událost a souhlas GM');
 const breed=actor.hmk?.verifiedMountedBreed;
 requireFact(verifiedMountedShockML(actor)!==null,'Survival Accident vyžaduje živé registrované zvíře s ověřeným plemenem HMK s.355');
 validateCombatState(state);
 requireFact(state.shock==='NONE'&&!state.coma?.active&&!state.extendedShock,
  'Zvíře v Shock/Coma vyžaduje rozhodnutí GM o schopnosti reagovat na nehodu');
 const evt='skill-injury:survival-accident:'+sourceId;
 requireFact(!state.events.some(x=>x.id===evt||x.id===evt+':complete'),'Nehoda zvířete již byla zapsána');
 requireFact(randomVictimConfirmed===true&&isDie(hazardD10,10)&&hazardD10>=4&&hazardD10<=6&&isDie(agilityD100,100),
  'Potvrďte náhodnou oběť, Survival Hazard 4–6 a skutečný Agility d100');
 const agl=actor.hmk?.attributes?.agl;
 requireFact(Number.isSafeInteger(agl)&&agl>=1&&agl<=40,'Zvíře nemá doloženou AGL ze svého živého profilu');
 requireFact(!inventory.some(x=>x.characterId===actor.id&&x.slot==='worn'),
  'Zvíře má oblečenou ochranu: bez ověřené anatomické pokrývky nelze automaticky určit AV');
 // Use the existing live impairment engine, which recognizes animal body
 // locations, but refuses unresolved sides and unverifiable injury onset.
 const impairment=projectLiveInjuries({state,round,test:'agility',usedArms:['left','right'],timelineId:'skill:'+sourceId});
 requireFact(impairment.ready&&!impairment.unusable&&!impairment.stunned,
  'Agility zvířete nelze doložit při současných zraněních: '+(impairment.reason||'nepoužitelné končetiny'));
 const eml=agl*5-combatFatigueTotals(state).total+impairment.modifier;
 const sl=['CF','F','S','CS'][successLevel(agilityD100,eml)];
 const dice=[roll(10,hazardD10),roll(100,agilityD100)];
 if(sl==='S'||sl==='CS'){
  requireFact([impactDie,zoneD10,locationD10,shockD100,compoundD10].every(x=>x===null),
   'Při úspěšné Agility nejsou potřeba Impact, ZD, LD, Shock ani Compound');
  const next=structuredClone(state);next.events.push({id:evt,type:'skill-survival-accident-avoided',round,
   details:{sourceId,breed,bodyKind:'horse',hazardD10,agilityD100,eml,sl,physicalDice:dice,rulePage:148}});
  next.lastRound=Math.max(next.lastRound,round);validateCombatState(next);
  return {state:next,kind:'survival-accident',sourceId,sl,eml,injury:null,avoided:true,physicalDice:dice,
   bodyKind:'horse',breed};
 }
 requireFact(isDie(impactDie,6)&&isDie(zoneD10,10)&&isDie(locationD10,10),
  'F/CF zvířete vyžaduje skutečné Impact d6, ZD d10 a LD d10');
 const probe=previewVerifiedMountedAnimalTrauma({mount:{...actor,hmk:{...actor.hmk,combatState:state}},
  printedBreed:breed,stumbleSL:'F',impactD10:impactDie,zoneD:zoneD10,locationD:locationD10,
  aimZN:1,aimConfirmed:true});
 requireFact(!probe.miss,'ZD minulo ověřenou anatomii zvířete: vyžaduje rozhodnutí GM');
 // The independent mount routine proves breed table B/C, location, natural
 // blunt AV and required limb side; p148 adds +4b and another +5 on Agility CF.
 const impact=impactDie+4+(sl==='CF'?5:0),av=probe.naturalBluntAV;
 if(shockD100!==null)requireFact(isDie(shockD100,100),'Shock potřebuje skutečný d100');
 if(compoundD10!==null)requireFact(isDie(compoundD10,10),'Compound potřebuje skutečný d10');
 dice.push(roll(6,impactDie),roll(10,zoneD10),roll(10,locationD10));
 if(shockD100!==null)dice.push(roll(100,shockD100));
 if(compoundD10!==null)dice.push(roll(10,compoundD10));
 const previous=(actor.hmk?.skills||[]).filter(x=>String(x.name).toLowerCase()==='shock');
 requireFact(previous.length<=1&&(!previous.length||Number.isSafeInteger(previous[0].ml)&&previous[0].ml>=1),
  'Neplatný skutečný zvířecí Shock ML');
 // Printed shock ML is used only if the live registered animal has no later
 // recorded mastery; this ephemeral profile never changes the character.
 const temporary=previous.length?actor:{...actor,hmk:{...actor.hmk,
  skills:[...(actor.hmk?.skills||[]),{name:'Shock',ml:verifiedMountedShockML(actor)}]}};
 const applied=woundFromFall({state,character:temporary,round,timelineId:'skill:'+sourceId,eventId:evt,
  bodyKind:'horse',aspect:'b',location:probe.location,side:probe.side,locationShock:probe.locationShock,
  strikeImpact:impact,AV:av,shockRoll:shockD100,compoundD10,physicalDice:dice});
 const next=structuredClone(applied.state);
 next.events.push({id:evt+':complete',type:'skill-physical-consequence',round,
  details:{kind:'survival-accident',sourceId,breed,bodyKind:'horse',hazardD10,agilityD100,eml,sl,
   impact,aspect:'b',location:probe.location,side:probe.side,armourValue:av,
   effectiveImpact:applied.effectiveImpact,injury:applied.injury,physicalDice:dice,rulePage:148}});
 next.lastRound=Math.max(next.lastRound,round);validateCombatState(next);
 return {state:next,kind:'survival-accident',sourceId,sl,eml,impact,aspect:'b',location:probe.location,
  armourValue:av,effectiveImpact:applied.effectiveImpact,injury:applied.injury,shock:applied.shockSL,
  physicalDice:dice,avoided:false,bodyKind:'horse',breed};
}
