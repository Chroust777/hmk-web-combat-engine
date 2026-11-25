import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const slice = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
};
const listeners = {};
const alerts = [];
let mutations = 0;
let emergencyConfirmed = false;
let restored = 0;
const context = {
  document: {addEventListener(type, handler) {(listeners[type] ??= []).push(handler);}},
  FormData: class extends Map {},
  alert(message) {alerts.push(message);},
  render() {},
  data: {campaignClock: {id: 'current'}},
  campaignKey: clock => clock?.id,
  allCampaignClocks: () => [],
  switchCampaign: () => ({campaignClock: {id: 'other'}}),
  mutate(write) {mutations++; write(); return true;},
  calendarCreating: false,
  calendarLanding: true,
  calendarUI: null,
  activeCalendarSection: 'overview',
  combatInitiativeSequence: null,
  episodePinnedSkillFields: new Map(),
  uiConfirm: () => emergencyConfirmed,
  restoreLastCommittedEpisode93784() {restored++; context.episodeStageBaseline = null;},
  discardEpisodeDraftSidecar() {},
  episodeFreshDraft: () => ({}),
  uuid: () => 'new-draft',
  episodeUnresolvedGeneralStops93869: () => [],
  travelFocusWindowError93786() {},
};
runInNewContext(slice('function timeEpisodeMutationLocked()', 'function timeEpisodeLockExplanation()') +
  slice('// Calendar lifecycle is explicitly separate', "document.addEventListener('click',e=>{\n const button=e.target.closest?.('[data-calendar-delete]')") +
  slice("document.addEventListener('submit',e=>{\n const f=e.target;\n if(!['campaign-start-form'", "  if(!data.campaignClock)throw Error('Kalendář ještě nebyl založen');") +
  "}catch(error){alert(error.message);}});" +
  slice("document.addEventListener('click',e=>{\n const button=e.target.closest?.('[data-episode-emergency-reset]')", '// Planning controls never') +
  slice("document.addEventListener('click',e=>{\n const btn=e.target.closest?.('[data-shared-window-create]')",
    "document.addEventListener('click',e=>{\n const btn=e.target.closest?.('[data-shared-window-cancel]')"), context);

const event = target => ({target, preventDefault() {}, stopImmediatePropagation() {}});
const click = (action, key) => listeners.click[0](event({closest: () => ({
  hasAttribute: attribute => attribute === action,
  dataset: {calendarOpen: key},
})}));
const submitNewCalendar = () => listeners.submit[0](event(Object.assign(new Map([
  ['gmConfirmed', 'yes'],
]), {id: 'campaign-start-form'})));
const lockMessage = /dokončete nebo nouzově zrušte rozpracovanou cestovní epizodu/i;
const phases = [
  ['založené společné okno', {sharedTimeWindowDraft: {id: 'draft'}}],
  ['otevřené vyhodnocení před prvním hodem', {episodeEvaluationRequested: true}],
  ['otevřený navazující test', {episodePendingSkillRequest: {id: 'test'}}],
  ['uložený navazující test', {episodeStageBaseline: {journal: []}}],
  ['potvrzený řádek před uzávěrkou', {sharedTimeWindowQueue: [{id: 'row'}]}],
];
for (const [phase, active] of phases) {
  Object.assign(context, {
    sharedTimeWindowDraft: null, sharedTimeWindowQueue: [], episodeEvaluationRequested: false,
    episodePendingSkillRequest: null, episodeActiveSkillRequestId: null,
    episodeStageBaseline: null, episodeOutstandingSkillTasks: [],
  }, active);
  click('data-calendar-open', 'other');
  assert.match(alerts.pop() ?? '', lockMessage, phase + ' · přepnutí');
  click('data-calendar-new');
  assert.match(alerts.pop() ?? '', lockMessage, phase + ' · otevření formuláře');
  context.calendarCreating = true;
  submitNewCalendar();
  assert.match(alerts.pop() ?? '', lockMessage, phase + ' · odeslání již otevřeného formuláře');
  listeners.click[2](event({closest: () => ({})}));
  assert.match(alerts.pop() ?? '', /dokončete nebo zrušte rozpracovaný interval/, phase + ' · druhý interval');
  click('data-calendar-open', 'current');
  assert.equal(context.calendarCreating, false);
  assert.equal(context.data.campaignClock.id, 'current');
  assert.equal(mutations, 0);
  assert.equal(alerts.length, 0);
}
context.episodeStageBaseline = {journal: []};
const emergency = checked => listeners.click[1](event({
  closest: () => ({closest: () => ({querySelector: () => ({checked})})}),
}));
emergency(false);
emergency(true);
assert.equal(restored, 0);
click('data-calendar-open', 'other');
assert.match(alerts.pop() ?? '', lockMessage);
emergencyConfirmed = true;
emergency(true);
assert.equal(restored, 1);
assert.equal(context.sharedTimeWindowQueue.length, 0);
assert.equal(context.data.campaignClock.id, 'current');
click('data-calendar-new');
assert.equal(context.calendarCreating, true);
click('data-calendar-open', 'other');
assert.equal(context.data.campaignClock.id, 'other');
assert.equal(mutations, 1);
console.log('PASS: zámek kalendáře a druhého intervalu v pěti fázích. Zamítnuté nouzové zrušení drží zámek, potvrzené jej uvolní.');
