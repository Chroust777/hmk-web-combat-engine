import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEVIATION_COMPASS_LABELS,episodeHazardFollowup} from '../src/integration/hmk-episode-travel-detail.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf(" const focusedHazard=active==='hazard'");
const end=app.indexOf(" }else if(active==='fatigue'",start);
assert(start>=0&&end>start,'locate the actual focused Hazard rendering branch');
const renderHazard=new Function('form','active','field','episodeDiceAccepted93849',
 'episodeHazardChoicesRequired93840','episodeHazardPending93840','episodeHazardSelectionUI93840',app.slice(start,end)+' }');

function render({field='hazardDirectionD10',accepted=true,required=true,pending=true}={}){
 const label=(attrs=[])=>({classList:new Set(),hasAttribute:k=>attrs.includes(k),querySelector:()=>null});
 const roll=label(),compass=label(['data-hazard-direction-compass']),other=label();
 const grid={children:[roll,compass,other]};
 for(const row of grid.children)row.parentElement=grid;
 compass.hidden=true;
 const target={parentElement:roll,closest:()=>roll};
 const panel={contains:x=>x===target,querySelector:q=>q==='.hmk-trek-grid'?grid:null,closest:()=>null};
 const form={elements:{namedItem:()=>target},querySelector:q=>q==='[data-episode-hazard-details]'?panel:null};
 renderHazard(form,'hazard',field,new Map(accepted?[[field,'4']]:[]),()=>required,()=>pending,()=>{});
 assert(roll.classList.has('hc-episode-needs-input'));
 assert(other.classList.has('hc-episode-step-suppressed'));
 return !compass.hidden&&!compass.classList.has('hc-episode-step-suppressed');
}
assert.equal(render(),true,'optional map compass stays visible after the d10 is accepted');
assert.equal(render({accepted:false}),false);
assert.equal(render({pending:false}),false);
assert.equal(render({required:false}),false);
assert.equal(render({field:'hazardAtMinute'}),false);
const chronicle=readFileSync(new URL('../src/integration/hmk-chronicle-travel-93951.js',import.meta.url),'utf8');
const formatDeviation=new Function('DEVIATION_COMPASS_LABELS',
 chronicle.slice(chronicle.indexOf('function deviationSentence('),chronicle.indexOf('const travelerName='))+
 'return deviationSentence;')(DEVIATION_COMPASS_LABELS);
for(const hazard of ['lost','misdirection']){
 const receipt=episodeHazardFollowup({hazard,directionD10:4,directionTurn:'right',directionCompass:'SE',
  directionObservationDeferred:hazard==='misdirection'});
 const text=formatDeviation({direction:{direction:hazard}},[receipt]);
 assert.match(text,/doprava.+jihovýchod/);
}
console.log('PASS map compass is visible after the accepted d10 and preserved in both narratives');
