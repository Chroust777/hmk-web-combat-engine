import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(process.argv[2]||new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function focusCalendarRuleAction(');
const end=app.indexOf('// A shared calendar watch',start);
assert(start>=0&&end>start,'The regression exercises the production calendar handoff');

const actor={id:'patient',hmk:{healthState:{}}};
function handoff(stage){
 let focused=null;
 const makeTarget=(name,hasDiceHighlight)=>({
  name,disabled:false,matches:()=>false,scrollIntoView(){},focus(){focused=name;},
  closest:()=>({classList:{contains:()=>hasDiceHighlight,add(){}}})
 });
 const target=makeTarget(stage,stage!=='confirm');
 const details={tagName:'DETAILS',open:false,parentElement:null};
 const makeForm=(id,field)=>({
  parentElement:details,hasAttribute:()=>false,scrollIntoView(){},
  querySelector(selector){
   if(selector==='[name="sourceId"]')return {value:id};
   if(selector.startsWith('input:is(')&&field?.name!=='confirm')return field;
   if(selector.startsWith('button[type="submit"]')&&field?.name==='confirm')return field;
   return null;
  }
 });
 const forms=[makeForm('other-event',makeTarget('wrong-event',true)),makeForm('this-event',target)];
 const documentMock={querySelectorAll(selector){
  if(selector==='form[data-skill-cold-shock],form[data-skill-weather-onset]')return forms;
  if(selector==='form[data-skill-weather-onset]'&&stage==='confirm')return forms.slice(1);
  return [];
 }};
 const run=new Function('document','persistentStateOf','noncombatHealthDestination',
  'isStableAnimalProfile93813','view','activeSheetSection','selected','installCalendarDiceControls',
  app.slice(start,end)+'\nreturn focusCalendarRuleAction;');
 const focus=run(documentMock,()=>actor.hmk.healthState,()=>true,()=>false,'sheet','hazards',actor.id,()=>{});
 assert.equal(focus(actor,'weather-onset','this-event'),true);
 assert.equal(details.open,true);
 assert.equal(focused,stage);
}
for(const stage of ['d6_1','enduranceD100','confirm'])handoff(stage);
console.log('PASS Cold Shock d6 and Endurance navigation, subsequent Weather Hazard confirmation, exact source match.');
