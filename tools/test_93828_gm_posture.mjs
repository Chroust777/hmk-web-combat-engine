import assert from 'node:assert/strict';
import {initialCombatState, validateCombatState} from '../src/integration/persistent-combat-state.js';
import {prepareGMShockStateChange} from '../src/integration/hmk-gm-shock-state-93826.js';
import {trekPersonHealthSnapshot} from '../src/integration/hmk-trekking-party-modes.js';
let id=0;
const act=(s,shock,standingConfirmed=false,minute=500)=>prepareGMShockStateChange({
 state:s,shock,standingConfirmed,reason:'GM potvrzuje, že postava nyní stojí, bez dalšího zásahu.',
 eventId:'gm-shock:posture:'+ ++id,minute,gmConfirmed:true
});
let s=initialCombatState();
s=act(s,'UNC').state;
assert.equal(s.posture.prone,true);
assert.equal(trekPersonHealthSnapshot({id:'p',healthState:s}).cannotSelfMove,true);
const before=s;
let result=act(s,'NONE',true);
s=result.state;
assert.equal(result.postureCleared,true);
assert.equal(before.posture.prone,true,'původní data musí zůstat nezměněna');
assert.equal(s.posture.prone,false);
assert.equal(s.shock,'NONE');
assert.equal(s.wounds.length,0);
assert.equal(trekPersonHealthSnapshot({id:'p',healthState:s}).cannotSelfMove,false);
assert.equal(s.events.at(-1).details.postureAfter,false);
assert.equal(s.events.at(-1).details.standingConfirmed,true);
validateCombatState(s);
// Clearing the Shock does not claim the actor physically stood up.
let lying=act(initialCombatState(),'UNC').state;
lying=act(lying,'NONE',false).state;
assert.equal(lying.shock,'NONE');assert.equal(lying.posture.prone,true);
assert.equal(trekPersonHealthSnapshot({id:'p',healthState:lying}).cannotSelfMove,false,
 'travel transport derives from actual immobility, not prone alone');
// Legacy saved states with NONE + prone can be corrected without a redundant Shock transition.
let repaired=act(lying,'NONE',true);
assert.equal(repaired.state.posture.prone,false);
assert.equal(repaired.state.events.at(-1).details.from,'NONE');
assert.equal(repaired.state.events.at(-1).details.to,'NONE');
assert.throws(()=>act(repaired.state,'NONE',true),/Cílový stav/);
// Old and modern unwitnessed fall must not automatically stand just because Shock clears.
let fallen=act(initialCombatState(),'UNC').state;
fallen=act(fallen,'NONE',false).state;
assert.equal(fallen.posture.prone,true);
// A Grievous wound is not silently treated as healed by a posture override.
let grievous=act(initialCombatState(),'UNC').state;
grievous.wounds.push({id:'g',location:'th',side:'left',severity:'G',level:4,aspect:'blunt',bleeding:false,nextAdvanceRound:null,recordedRound:1,healed:false});
assert.throws(()=>act(grievous,'NONE',true),/Grievous/);
assert.equal(act(grievous,'NONE',false).state.posture.prone,true);
console.log('PASS GM prone reset, old save NONE+PRONE, keep independent posture, forced paralysis, grievous, travel integration');
