import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(process.argv[2]||new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function openNoncombatHealthTerm(');
const end=app.indexOf('function openNextNoncombatHealthTerm(',start);
assert(start>=0&&end>start);
const actor={id:'patient',name:'QA Patient'};

function open({minute=100,hasShock=true,exposures=[]}={}){
 const calls=[],notices=[];
 const form={elements:{namedItem:name=>name==='sourceId'?{value:'source-shock'}:null},prepend:node=>notices.push(node.textContent)};
 const chapter={
  querySelector(selector){
   if(selector.startsWith('form[data-weather-trauma-course]'))return hasShock?{form}:null;
   if(selector==='.hmk-medical-required-target')return {closest:()=>form};
   return null;
  },
  querySelectorAll(selector){
   return selector==='form[data-skill-weather-course]'?exposures.map(value=>({elements:{namedItem:()=>({value})}})):[];
  },
  contains:node=>node===form,
  prepend:node=>notices.push(node.textContent)
 };
 const document={
  querySelector:selector=>selector==='.journal-book--hazards'?chapter:null,
  createElement:()=>({setAttribute(){},after(){},classList:new Set(),scrollIntoView(){},focus(){},dataset:{}})
 };
 const data={campaignClock:{minute:100}};
 const execute=new Function('document','data','persistentStateOf','noncombatHealthDestination',
  'isStableAnimalProfile93813','openHealthPatient952','focusCalendarRuleAction','displayCampaignMinute','overlay',
  app.slice(start,end)+'\nreturn openNoncombatHealthTerm;');
 const openTerm=execute(document,data,()=>({}),()=>true,()=>false,()=>{},
  (patient,kind,source)=>{assert.equal(patient,actor);calls.push([kind,source]);return kind==='extended-shock'||exposures.includes(source);},
  value=>String(value),null);
 assert.equal(openTerm(actor,{kind:'weather-course',sourceId:'source-exposure',minute,description:'Cold Exposure Healing d100'}),true);
 return {calls,notice:notices[0]};
}
const concurrent=open({exposures:['unrelated']});
assert.deepEqual(concurrent.calls,[['extended-shock','source-shock']]);
assert.match(concurrent.notice,/Cold Exposure Healing d100.*Nejprve.*Extended Shock Course/);
assert.deepEqual(open({hasShock:false,exposures:['source-exposure']}).calls,[['weather-course','source-exposure']]);
assert.deepEqual(open({exposures:['source-exposure']}).calls,[['weather-course','source-exposure']]);
assert.deepEqual(open({minute:101}).calls,[]);
assert.doesNotMatch(open({hasShock:false}).notice,/Extended Shock/);
console.log('PASS due Extended Shock handoff, exact Exposure source, standalone Exposure and future term.');
