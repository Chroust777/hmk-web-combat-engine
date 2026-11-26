import assert from 'node:assert/strict';
import {packTravelDraft,unpackTravelDraft} from '../src/integration/hmk-travel-draft-storage.js';

const plain='{"json":1,"temporary":"short"}';
assert.equal(packTravelDraft(plain),plain);
assert.equal(unpackTravelDraft(plain),plain);

const record={characterId:'synthetic-guide',description:'Pěší pochod · ~0~ ~~ 🙂',
  witness:JSON.stringify({characterId:'synthetic-guide',description:'synthetic-guide',literal:'~8~'})};
const draft=JSON.stringify({format:'hmk-episode-sidecar-v1',rows:Array.from({length:100},()=>record)});
const packed=packTravelDraft(draft);
assert.ok(packed.length<draft.length);
assert.equal(unpackTravelDraft(packed),draft);
assert.equal(packTravelDraft('{"~1~": "Česká krajina"}'),'{"~1~": "Česká krajina"}');

const separator=packed.indexOf('\n',packed.indexOf('\n')+1);
const dictionary=packed.slice(0,separator+1);
assert.throws(()=>unpackTravelDraft(dictionary+'{"bad":"~zzzz~"}'),/Neplatný odkaz/);
assert.throws(()=>unpackTravelDraft(dictionary+'{"bad":"~"}'),/Neplatný odkaz/);

console.log('PASS exact draft round-trip, legacy JSON, literal references, malformed draft and storage savings');
