import assert from 'node:assert/strict';
import {CANONICAL_ALCHEMY_ELIXIRS} from '../src/integration/hmk-alchemy-preparation.js';
import {elixirReference,elixirHelp} from '../src/integration/hmk-craft-item-help.js';
import {canonicalProfusionProfile} from '../src/integration/hmk-alchemy-profusion.js';

const names=CANONICAL_ALCHEMY_ELIXIRS.map(item=>item.name);
assert.equal(names.length,35);
assert.deepEqual(Object.keys(elixirHelp).sort(),[...names].sort());
for(const name of names){
 const entry=elixirReference(name);
 for(const key of ['use','effect','duration','adverse','adverseLabel']){
  assert.ok(entry[key].trim().length>0,name+' · '+key);
 }
 assert.equal(entry.adverseLabel,canonicalProfusionProfile(name).use==='Applied'?'Riziko požití':'Vedlejší účinek při CF');
 assert.ok(entry.sourcePage>=271&&entry.sourcePage<=274);
 assert.equal(typeof entry.supported,'boolean');
}
assert.equal(elixirReference('Aqua').supported,false);
assert.equal(elixirReference('Iceshield').supported,true);
assert.match(elixirReference('Mindsalve').adverse,/5 Weakness/);
assert.match(elixirReference('Eruption').effect,/d4 \+ AS/);
assert.match(elixirReference('Quiescence').duration,/úspěch ubere 2 AS/);
assert.equal(elixirReference('Poison').exempt,true);
assert.equal(elixirReference('vymyšlený'),null);
console.log('PASS 35/35 elixirs with use, effect, duration, adverse effect, implementation status and HMK page');
