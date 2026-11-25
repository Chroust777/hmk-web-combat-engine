import assert from 'node:assert/strict';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
import {prepareSkillPhysicalInjury} from '../src/integration/hmk-skill-physical-consequences.js';
import {woundFromFall} from '../src/integration/hmk-mounted-fall-injury-join.js';
import {applyConfirmedTreatment,applyConfirmedInjuryHealing} from '../src/integration/hmk-healing-persistence.js';
import {prepareColdWaterShock} from '../src/integration/hmk-weather-trauma-completion.js';
import {fateRoll93866} from '../src/integration/hmk-fate-routine-93866.js';
import {campaignCalendarAgenda,createCampaignCalendar,anchorCampaignOrigin} from '../src/integration/hmk-campaign-calendar.js';
import {calendarBoardEvents,campaignCalendarBoardHTML} from '../src/integration/hmk-campaign-calendar-ui.js';

const ox={id:'ox',name:'QA Vůl Jasan',kind:'NPC',hmk:{verifiedMountedBreed:'bovine',attributes:{agl:8,end:18,wil:10}}};
const injured=prepareSkillPhysicalInjury({kind:'survival-accident',actor:ox,state:initialCombatState(),inventory:[],
 sourceId:'mixed-transport-accident',round:1,gmConfirmed:true,originMinute:540,hazardD10:5,agilityD100:95,
 randomVictimConfirmed:true,impactDie:6,zoneD10:5,locationD10:4,shockD100:5});
const [wound]=injured.state.wounds;
assert.deepEqual([wound.location,wound.side,wound.level,injured.effectiveImpact],['flg','right',2,9]);
assert.equal(wound.mountedLegTreatmentHRModifier,undefined);
const treat=(state,w,tag)=>applyConfirmedTreatment({state,round:1,eventId:'treat-'+tag,woundId:w.id,
 daySinceInjury:0,physicianML:14,physicianIndex:1,physicianRoll:5,gmConfirmed:true,
 procedureTime:{startMinute:540,endMinute:555,gmConfirmed:true}});
const oldOx=structuredClone(injured.state);
oldOx.wounds[0].mountedLegTreatmentHRModifier=-2;
const treated=treat(injured.state,wound,'new');
const recoveredLegacy=treat(oldOx,oldOx.wounds[0],'old');
assert.equal(treated.treatment.healingRate,6);
assert.equal(recoveredLegacy.treatment.healingRate,6);
assert.equal(recoveredLegacy.state.wounds[0].mountedLegTreatmentHRModifier,-2);
let clock=createCampaignCalendar({day:1,hour:9,minute:0,campaignId:'qa-stable',label:'QA',eventId:'start',
 gmConfirmed:true,characterIds:[ox.id]});
clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:ox.id,woundId:wound.id,eventId:'anchor',
 combatEventId:wound.originEventId,source:'confirmed-health'});
const healingTerm=campaignCalendarAgenda(clock,[{...ox,hmk:{...ox.hmk,healthState:treated.state}}],[]).all.find(x=>x.kind==='healing');
assert.equal(healingTerm.minute,7740);
const healed=applyConfirmedInjuryHealing({state:treated.state,round:1,eventId:'healed',woundId:wound.id,
 daySinceInjury:5,endurance:18,will:10,roll:5,gmConfirmed:true});
assert.ok(healed.state.wounds[0].healed);
const horse={id:'horse',hmk:{skills:[{name:'Shock',ml:36}]}};
const horseFall=woundFromFall({state:initialCombatState(),character:horse,round:1,eventId:'fall',bodyKind:'horse',
 location:'flg',side:'right',locationShock:2,strikeImpact:15,AV:6,shockRoll:5,physicalDice:[]});
assert.equal(horseFall.state.wounds[0].mountedLegTreatmentHRModifier,-2);
assert.equal(treat(horseFall.state,horseFall.state.wounds[0],'horse').treatment.healingRate,4);

const actor={id:'pc',kind:'PC',hmk:{attributes:{end:12},fatePoints:3,fateML:60}};
const input={actor,state:initialCombatState(),sourceId:'actual-immersion',condition:'freezingWater',
 originMinute:540,d6s:[6,6,6],enduranceD100:95,gmConfirmed:true};
const original=prepareColdWaterShock(input);
assert.deepEqual([original.report.sl,original.report.index,original.report.shock],['CF',9,'UNC']);
const fate={...fateRoll93866({originalLevel:'CF',eml:60,roll:6}),actorId:'pc',skill:'Endurance',originalD100:95};
const fated=prepareColdWaterShock({...input,fate});
assert.deepEqual([fated.report.originalSL,fated.report.sl,fated.report.index,fated.report.enduranceD100,
 fated.report.immersionRounds],['CF','F',8,95,18]);
assert.equal(fated.state.events.length,1);
assert.throws(()=>prepareColdWaterShock({...input,fate:{...fate,originalD100:96}}),/neodpovídá/);

const vet={id:'stable-healing:visit:wound',name:'QA kůň',characterId:'owner',sourceId:'wound',
 kind:'stable-healing',origin:'hml',cancellable:false,description:'Veterinární Healing Roll · Foreleg',
 minute:540,dueMinute:540,status:'due',destination:'stable'};
const board=campaignCalendarBoardHTML({clock,characters:[],journal:[],ui:{mode:'day',dayNumber:1,hour:9,
 monthShift:0,prefillMinute:null},escapeHTML:String,additionalEvents:[vet]});
assert.match(board,/data-cal-stable-healing="stable-healing:visit:wound" data-cal-concurrent-id="" data-cal-source="wound"/);
assert.match(board,/Otevřít veterinární Healing ve Stáji/);
assert.equal(calendarBoardEvents({clock}).some(x=>x.kind==='stable-healing'),false);
console.log('PASS: ox accident, older stored ox wound, time-linked healing, mounted horse override, original and Fate-adjusted Cold Shock, calendar routing.');
