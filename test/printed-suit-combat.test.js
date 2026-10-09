import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../src/rules/armour-suit-printed.js';
import {identifyWornPrintedSuit,resolvePrintedSuitProtection} from '../src/integration/printed-suit-combat.js';
import {PRINTED_SUIT_PROTECTION,SUIT_LOCATION_CODES} from '../src/rules/armour-all-suits-fixed.js';

test('all 12 printed suits match their exact worn multiset, not carried pieces',()=>{
 for(const suit of PRINTED_ARMOUR_SUITS_P113_116){
  const items=suit.articles.map((name,i)=>({id:String(i),characterId:'hero',slot:'worn',quantity:1,snapshot:{name,category:'armor'}}));
  assert.equal(identifyWornPrintedSuit(items,'hero').name,suit.name);
  assert.equal(identifyWornPrintedSuit(items.slice(1),'hero').ok,false);
  assert.equal(identifyWornPrintedSuit([{...items[0],slot:'carried'},...items.slice(1)],'hero').ok,false);
  assert.equal(identifyWornPrintedSuit([...items,{...items[0],id:'extra'}],'hero').ok,false);
 }
});
test('12 x 15 x 4 printed protections enter impact pipeline without altering AV',()=>{
 for(const suit of PRINTED_ARMOUR_SUITS_P113_116)for(const location of SUIT_LOCATION_CODES)for(const [i,aspect] of ['b','e','p','f'].entries()){
  const result=resolvePrintedSuitProtection(suit.name,location,aspect);
  assert.equal(result.ok,true);
  assert.equal(result.av[aspect],PRINTED_SUIT_PROTECTION[suit.name][location][i]??0);
  assert.equal(typeof result.rigid,'boolean');
 }
});
