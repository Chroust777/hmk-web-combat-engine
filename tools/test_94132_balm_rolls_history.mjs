import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const section = (start, end) => {
  const offset = app.indexOf(start);
  assert.ok(offset >= 0);
  const limit = app.indexOf(end, offset + start.length);
  assert.ok(limit > offset);
  return app.slice(offset, limit);
};

const receipt = {
  id: 'journal-receipt',
  title: 'Arcane Recovery · Balm · Extended Shock Course',
  body: 'Spellfire d100 5 (CS) · Extended Shock Course d100 5 (CS) · HR 5 → 7.',
  campaignMinute: 51850,
  skillTestProof: {type: 'arcane-balm-course', report: {eventId: 'balm-state-event', eml: 80}},
};
const histories = runInNewContext(
  section('const BALM_RECOVERY_PROOF_TYPES=', '/** Present actual structured results') +
  section('const HEALTH_EVENT_LABELS_950=', 'const characterProjectSelections=') +
  '({category:journalHistoryCategory(receipt),html:characterHealthHistory950(actor,[receipt])})',
  {
    receipt, actor: {id: 'patient'}, data: {},
    persistentStateOf: () => ({events: [
      {id: 'balm-state-event', type: 'extended-shock-course'},
      {id: 'ordinary-course', type: 'extended-shock-course'},
    ]}),
    allCampaignClocks: () => [],
    hiddenLogbookIds: () => new Set(),
    journalTimedMedicalResultHTML: () => '',
    personalNoteGameMoment: () => 'Den 37 · 00:10',
    esc: String,
  },
);
assert.equal(histories.category, 'health');
assert.match(histories.html, /Spellfire d100 5 \(CS\).*HR 5 → 7/);
assert.match(histories.html, /Den 37 · 00:10/);
assert.match(histories.html, /health-event:ordinary-course/);
assert.doesNotMatch(histories.html, /health-event:balm-state-event/);

const listeners = {};
const rollScript = section('const BALM_RECOVERY_DICE=', 'const BALM_RECOVERY_LABELS=');
const rollListeners = section(
  "document.addEventListener('input',event=>{\n const field=event.target,form=field?.closest?.('[data-balm-exposure-recovery]');",
  "document.addEventListener('submit',event=>{",
);
const status = {};
const submit = {disabled: true};
const accept = {disabled: true, closest: () => form};
const classes = {toggle() {}};
let focused = false;
const confirmed = {focus() {focused = true;}};
const dice = Object.fromEntries(['castingD100','recoveryD100'].map(name => [name, {
  name, value: '', validity: {valid: false},
  closest: selector => selector === 'label' ? {classList: classes} : form,
}]));
const form = {
  elements: {namedItem: name => dice[name] || confirmed},
  querySelector: selector => ({
    '[data-balm-rolls-accept]': accept,
    'button[type="submit"]': submit,
    '[data-balm-rolls-status]': status,
  })[selector],
};
const board = runInNewContext(rollScript + rollListeners + '({balmRollsAccepted})', {
  document: {addEventListener: (type, handler) => {listeners[type] = handler;}},
});
function enter(name, value, valid = true) {
  Object.assign(dice[name], {value, validity: {valid}});
  listeners.input({target: dice[name]});
}
const acceptBoth = () => listeners.click({target: {closest: () => accept}});

enter('castingD100', '5');
assert.equal(accept.disabled, true);
enter('recoveryD100', '101', false);
assert.equal(accept.disabled, true);
enter('recoveryD100', '5');
assert.equal(accept.disabled, false);
assert.equal(submit.disabled, true);
acceptBoth();
assert.equal(board.balmRollsAccepted(form), true);
assert.equal(submit.disabled, false);
assert.equal(focused, true);
enter('recoveryD100', '11');
assert.equal(board.balmRollsAccepted(form), false);
assert.equal(submit.disabled, true);
acceptBoth();
assert.equal(board.balmRollsAccepted(form), true);
console.log('Balm grouped d100 confirmation and saved history passed');
