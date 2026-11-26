import assert from 'node:assert/strict';
import {createCampaignStorage} from '../src/integration/hmk-campaign-storage.js';
import {persistVerifiedCombatSnapshot} from '../src/integration/verified-combat-storage.js';

const key='campaign';
const limit=5*1024*1024;
const notes='Pěší pochod · nížina. '.repeat(260000).slice(0,limit-190000);
const previous=JSON.stringify({name:'Česká krajina 🙂',notes});
const next=JSON.stringify({...JSON.parse(previous),interval:'09:45',detail:'Záznam cestování. '.repeat(3000)});
const values=new Map([[key,previous],['draft','x'.repeat(170000)]]);
const physical={
 getItem:k=>values.get(k)??null,
 setItem(k,v){
  const nextSize=[...values].filter(([name])=>name!==k).reduce((sum,[name,text])=>sum+name.length+text.length,0)+k.length+v.length;
  if(nextSize>limit)throw new DOMException('full','QuotaExceededError');
  values.set(k,v);
 },
 removeItem:k=>values.delete(k)
};

assert.ok(previous.length+170000<limit);
assert.throws(()=>physical.setItem(key,next),{name:'QuotaExceededError'});
const storage=createCampaignStorage(physical,key);
assert.equal(storage.getItem(key),previous);
const verify=baseline=>persistVerifiedCombatSnapshot({storage,key,baseline,serialized:next});
assert.equal(verify(previous).code,'verified');
assert.equal(storage.getItem(key),next);
assert.equal(createCampaignStorage(physical,key).getItem(key),next);
assert.ok(physical.getItem(key).length<previous.length);
assert.equal(physical.getItem('draft'),'x'.repeat(170000));

physical.setItem(key,'{"writtenByAnotherTab":true}');
assert.equal(verify(next).code,'concurrent-change');
assert.equal(storage.getItem(key),'{"writtenByAnotherTab":true}');
storage.setItem('ordinary','{"untouched":true}');
assert.equal(physical.getItem('ordinary'),'{"untouched":true}');
physical.setItem(key,'hmk-campaign-gzip-v1:invalid');
assert.throws(()=>storage.getItem(key),/nečitelná/);
assert.equal(physical.getItem(key),'hmk-campaign-gzip-v1:invalid');
storage.removeItem(key);
assert.equal(storage.getItem(key),null);
console.log('PASS exact historical JSON, capped write, draft preservation, reload, stale tab and corrupt data');
