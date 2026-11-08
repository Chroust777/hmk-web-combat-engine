import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {prepareGMHealthOverride,GM_HEALTH_LOCATIONS,validateGMHealthOverrideEvidence} from '../src/integration/hmk-gm-health-override.js';
import {isNoncombatMedicalOrigin,medicalOriginOfWound} from '../src/integration/hmk-medical-origin.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda} from '../src/integration/hmk-campaign-calendar.js';
let passed=0;const must=(x,m)=>{assert.ok(x,m);passed++},expect=(f)=>{assert.throws(f);passed++};
const reason='Odůvodněná oprava zdraví podle rozhodnutí GM';
for(const location of GM_HEALTH_LOCATIONS)for(const aspect of ['blunt','edge','point','fire'])for(let level=1;level<=5;level++){
 const eventId=`gm-wound-${location}-${aspect}-${level}`;
 const r=prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId,reason,
  gmConfirmed:true,location,level,aspect,side:'left'});
 const w=r.state.wounds[0];must(w.location===location&&w.level===level&&w.severity===(level===1?'M':level<=3?'S':'G'),eventId);
 must(w.healing?.untreated===true&&w.healing.treated===true&&w.healing.treatments.length===0,'CF table no fictitious treatment');
 must(isNoncombatMedicalOrigin(medicalOriginOfWound(w,r.state.events)),'non-combat GM verified origin');
 must(validateCombatState(r.state),'valid health');
 const rx=prepareGMHealthOverride({state:r.state,action:'resolve',eventId:eventId+'-healed',reason,
  gmConfirmed:true,woundId:w.id});
 must(rx.state.wounds[0].healed===true&&rx.state.wounds[0].healing.gmResolvedEventId===eventId+'-healed','GM resolved preserve wound');
 must(rx.state.events.length===3&&rx.state.events[0].type==='gm-health-wound-create'&&rx.state.events[2].type==='gm-health-wound-resolve','all three original events survive');
 expect(()=>prepareGMHealthOverride({state:rx.state,action:'resolve',eventId:eventId+'-dup',reason,gmConfirmed:true,woundId:w.id}));
}
let s=prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId:'gm-bleed-1',reason,gmConfirmed:true,location:'ha',level:4,aspect:'blunt'}).state;
let w=s.wounds[0];must(w.bleeding&&w.healing.grimWound,'G untreated CF actual bleeder+grim');
let clock=createCampaignCalendar({day:1,hour:8,minute:0,eventId:'gm-clock-start',gmConfirmed:true,campaignId:'gm-matrix',characterIds:['p']});
clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'p',woundId:w.id,eventId:'gm-clock-wound',combatEventId:w.originEventId,source:'confirmed-health',gmConfirmed:true});
let actor={id:'p',name:'GM pacient',hmk:{healthState:s}},agenda=campaignCalendarAgenda(clock,[actor],[],[]);
must(agenda.unknown.length===0,'GM bleeder has real anchor; no unknown due');
must(agenda.future.some(e=>e.kind==='bleeding'&&e.minute===clock.minute+5),'bleeding 5-min real obligation');
must(agenda.future.some(e=>e.kind==='grim'),'grim must remain scheduled');
expect(()=>prepareGMHealthOverride({state:s,action:'add',eventId:'gm-invalid-bleed',reason,gmConfirmed:true,location:'ha',level:1,aspect:'blunt'}));
s.wounds[0].healing.infected=true;s.wounds[0].healing.infectionWeakness=5;s.wounds[0].healing.nextInfectionDay=1;s.fatigue.otherWeakness=5;
const resolved=prepareGMHealthOverride({state:s,action:'resolve',eventId:'gm-bleed-1-heal',reason,gmConfirmed:true,woundId:w.id});
must(resolved.state.fatigue.otherWeakness===0&&!resolved.state.wounds[0].bleeding&&resolved.state.wounds[0].healing.infected===false,'GM infection+bleeder resolves reversible weakness');
actor.hmk.healthState=resolved.state;agenda=campaignCalendarAgenda(clock,[actor],[],[]);
must(agenda.unknown.length===0&&!agenda.all.some(e=>e.kind==='bleeding'||e.kind==='grim'||e.kind==='infection'),'no ghost due after GM resolution');
expect(()=>prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId:'missing',reason:'short',gmConfirmed:true,location:'ha'}));
expect(()=>prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId:'gm-no-confirm',reason,gmConfirmed:false,location:'ha'}));
expect(()=>prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId:'gm-fake-loc',reason,gmConfirmed:true,location:'unverified'}));
expect(()=>prepareGMHealthOverride({state:initialCombatState(),action:'add',eventId:'gm-bad-level',reason,gmConfirmed:true,location:'sk',level:6}));
const patient={id:'p',hmk:{healthState:resolved.state}};
const j=[{characterId:'p',calendarGMHealthOverride:{format:'hmk-gm-health-override-v1',action:'add',sourceEventId:'gm-bleed-1',woundId:w.id,reason,actualRoll:null}},
 {characterId:'p',calendarGMHealthOverride:{format:'hmk-gm-health-override-v1',action:'resolve',sourceEventId:'gm-bleed-1-heal',woundId:w.id,reason,actualRoll:null}}];
must(validateGMHealthOverrideEvidence([patient],j),'GM journals match immutable originals');
expect(()=>validateGMHealthOverrideEvidence([patient],[{...j[0],calendarGMHealthOverride:{...j[0].calendarGMHealthOverride,actualRoll:17}}]));
expect(()=>validateGMHealthOverrideEvidence([patient],[{...j[0],calendarGMHealthOverride:{...j[0].calendarGMHealthOverride,woundId:'invented'}}]));
console.log('PASS v93.782',passed,'GM wound add/resolve checks, 300 location×aspect×level combinations, infection/bleeding/grim/calendar, no fictional dice, audit');
