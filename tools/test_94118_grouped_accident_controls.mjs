import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('const travelAccidentInjuryDice=');
const end=source.indexOf('function refreshSurvivalHazardFields(',start);
assert.ok(start>=0&&end>start);
const listeners=[];
const context={
 document:{addEventListener(type,listener){assert.equal(type,'click');listeners.push(listener);}},
 refreshSurvivalHazardFields(form){context.syncTravelAccidentSteps(form,true,{animal:true});},
};
runInNewContext(source.slice(start,end),context);
const makeField=(name,required=true)=>({
 name,required,value:'',dataset:{},validity:{valid:true},focus(){},
 classList:{toggle(){},},nextElementSibling:{dataset:{hmkGeneralAutoDie:'true'}},
});
const names=['impactDie','zoneD10','locationD10'];
const fields=new Map([...names,'direction','compoundD10','shockD100'].map(name=>
 [name,makeField(name,name!=='compoundD10')]));
const group={hidden:false,disabled:true};
const afterGroup=['direction','compoundD10','shockD100'].map(name=>({dataset:{accidentAccept:name}}));
const form={
 elements:{namedItem:name=>fields.get(name)},
 querySelector(sel){return sel==='[data-accident-injury-dice]'?group:null;},
 querySelectorAll(){return afterGroup;},
};
group.form=form;
function insertBatch(){listeners[0]({target:{closest:sel=>sel==='[data-accident-injury-dice]'?group:null}});}
let next=context.syncTravelAccidentSteps(form,true,{animal:true});
assert.equal(next.name,'impactDie');
assert.ok(group.disabled);
for(const [i,name] of names.entries()){
 fields.get(name).value=String(i+1);
 next=context.syncTravelAccidentSteps(form,true,{animal:true});
 assert.equal(fields.get(name).readOnly,false);
 assert.equal(fields.get(name).nextElementSibling.disabled,false);
 assert.equal(fields.get('shockD100').disabled,true);
}
assert.equal(group.disabled,false);
insertBatch();
assert.ok(group.hidden);
assert.deepEqual(names.map(name=>fields.get(name).dataset.accidentAccepted),['1','2','3']);
assert.ok(names.every(name=>fields.get(name).readOnly));
assert.equal(fields.get('direction').disabled,true);
assert.equal(fields.get('shockD100').disabled,false);
console.log('PASS: accepts Impact/ZD/LD together and unlocks only the applicable animal Shock.');
