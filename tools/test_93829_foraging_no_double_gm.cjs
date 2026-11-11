'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
for(const form of ['data-foraging-carry','data-foraging-carry-eat','data-episode-foraging-water']){
  const starts=[...s.matchAll(new RegExp('<form '+form+'(?=[ >])','g'))].map(x=>x.index);
  assert(starts.length, form+' missing');
  for(const start of starts){ const end=s.indexOf('</form>',start); assert(end>start,form+' malformed');const html=s.slice(start,end);assert(!/name="confirmed"/.test(html),form+' duplicate checkbox');assert(/type="submit"/.test(html),form+' missing submit'); }
}
assert(!s.includes("if(v.confirmed!=='yes'||!v.itemId)"),'water cannot depend on duplicate GM checkbox');
assert(!s.includes("if(v.confirmed!=='yes'||!calendarMemberIds"),'food cannot depend on duplicate GM checkbox');
assert(s.includes('const {use,fill}=createForagingWaterStorage'),'water still uses authoritative inventory validator');
assert(s.includes('const {supplyUse,carry}=createForagingCarry'),'food still uses authoritative provenance validator');
assert(s.includes('const receipt=createForagingCarryEat'),'consumption still has dedicated inventory record');
assert(s.includes('gmConfirmed:true}'),'commit is GM intent');
assert(s.includes('Stan +2 · bez skutečného stanu v inventáři'),'missing tent explicitly disabled, not fabricated');
assert(s.includes('Mělká jeskyně +3'),'cave +3');
console.log('PASS v93.829: Foraging food/water/consumption direct GM choice, inventory source validators and shelter availability');
