import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const history = app.slice(
  app.indexOf('function characterSkillHistory950('),
  app.indexOf('const HEALTH_EVENT_LABELS_950='),
);
const character = {id: 'climber'};
const followup = (technique, roll, eml, level) => ({
  id: 'followup-' + roll,
  skillTestProof: {type: 'critical-followup', skill: 'Climbing', technique, result: {roll, eml, level}},
});
const logs = [
  followup('Strength', 11, 60, 'S'),
  followup('Agility', 91, 45, 'F'),
  followup(undefined, 34, 50, 'S'),
  {id: 'without-roll', skillTestProof: {type: 'critical-followup', skill: 'Climbing', result: null}},
];
for (const gm of [true, false]) {
  const html = runInNewContext(history + '\ncharacterSkillHistory950(character, logs, {gm})', {
    character, logs, gm, data: {},
    hiddenLogbookIds: () => new Set(),
    esc: String,
    personalNoteGameMoment: () => 'Den 37',
    journalTerm: String,
    chronicleSkillHelp953: () => '',
  });
  assert.match(html, /<td>Strength<\/td><td>60<\/td><td>11<\/td><td>S<\/td>/);
  assert.match(html, /<td>Agility<\/td><td>45<\/td><td>91<\/td><td>F<\/td>/);
  assert.match(html, /<td>Climbing<\/td><td>50<\/td><td>34<\/td><td>S<\/td>/);
  assert.equal((html.match(/<tr><td>/g) ?? []).length, 3);
}
assert.equal(logs[0].skillTestProof.skill, 'Climbing');

const marker = app.lastIndexOf("if(!['skill-secondary-form','skill-value-form','skill-assistance-form'].includes(form?.id))return;");
assert.ok(marker > 0);
const handler = app.slice(
  app.lastIndexOf("document.addEventListener('submit',async event=>", marker),
  app.indexOf('},true);', marker) + '},true);'.length,
);
const actors = {
  test: {id: 'test', name: 'Sběrač'},
  unconscious: {id: 'unconscious', name: 'Stopař'},
  ready: {id: 'ready', name: 'Zvěd'},
};
const calls = [];
const saved = [];
const output = {textContent: ''};
let submit;
let cancelFate = false;
runInNewContext(handler, {
  document: {
    addEventListener(type, callback) {
      assert.equal(type, 'submit');
      submit = callback;
    },
    getElementById: () => output,
  },
  selected: 'test',
  character: id => actors[id],
  hskResolveSide({person, side}) {
    calls.push('resolve:' + person.id);
    if (person === actors.unconscious) throw Error('UNC');
    return {
      person, info: {primary: side === 'A' ? 'Awareness' : 'Stealth'},
      mastery: {}, secs: [], ctx: {}, die: {origin: 'manual'},
      result: {level: 'S', sl: 2}, consequence: {},
    };
  },
  async hmkOfferFate93866({actor}) {
    calls.push('fate:' + actor.id);
    return cancelFate ? {cancelled: true} : null;
  },
  hskResultText: () => '',
  resolveOpposedTests: () => ({winner: 'a', stars: 1}),
  skillFailureGuidance: () => null,
  skillConsequenceText: () => '',
  skillPendingText: () => '',
  hskScene: () => ({}),
  hskActionName: () => '',
  uuid: () => 'test-event',
  skillNarrativeOpposed: () => '',
  hskNarrativeBlock: () => '',
  skillConsequenceProof: () => ({}),
  hskSelectedSeduction: () => false,
  hskGMModifier: () => 0,
  recordSkillEvidence: (_title, _body, proof) => saved.push(proof),
});
async function submitOpposed(opponentId, opponentSkill = 'Stealth') {
  calls.length = 0;
  output.textContent = '';
  const fields = {opposed: {checked: true}, opponentSkill: {value: opponentSkill}, opponentId: {value: opponentId}};
  await submit({
    target: {id: 'skill-secondary-form', elements: {namedItem: name => fields[name]}},
    preventDefault() {},
    stopImmediatePropagation() {},
  });
}
await submitOpposed('unconscious');
assert.match(output.textContent, /UNC/);
assert.deepEqual(calls, ['resolve:test', 'resolve:unconscious']);
await submitOpposed('ready', '');
assert.match(output.textContent, /vyberte dovednost oponenta/);
assert.deepEqual(calls, ['resolve:test']);
assert.equal(saved.length, 0);

cancelFate = true;
await submitOpposed('ready');
assert.match(output.textContent, /bez uložení/);
assert.deepEqual(calls, ['resolve:test', 'resolve:ready', 'fate:test']);
assert.equal(saved.length, 0);

cancelFate = false;
await submitOpposed('ready');
assert.equal(output.textContent, '');
assert.deepEqual(calls, ['resolve:test', 'resolve:ready', 'fate:test', 'fate:ready']);
assert.equal(saved.length, 1);
assert.equal(saved[0].type, 'opposed-success-test');
assert.equal(saved[0].opponentId, 'ready');
console.log('Skill history and Opposed Fate regression passed');
