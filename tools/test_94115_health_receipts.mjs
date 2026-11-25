import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
import {createCampaignCalendar,campaignCalendarAgenda} from '../src/integration/hmk-campaign-calendar.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=(start,end)=>{
 const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from);
 return app.slice(from,to);
};
const esc=String;
const data={campaignClock:{campaignId:'qa-f'},journal:[]};
const receipt=runInNewContext(source('function hskWeatherHealthConsequences(', 'function hskPendingSkillPhysicalConsequences(')+'hskWeatherHealthConsequences',{
 data,esc,campaignKey:clock=>clock?.campaignId??'',
 hskWeatherHealthLastReceipt:{actorId:'patient',campaignId:'qa-f',message:'Bleeder zastaven. BP 1/4'},
 hskWeatherShockFollowup:()=>'',hskParallelColdHealthPanel:()=>'',hskWeatherBleedingCarePanel:()=>'',
 hskWeatherTraumaCourseForm:()=>'',hskWeatherInjuryMandatory:()=>'',
});
assert.match(receipt('patient',{stable:true}),/BP 1\/4/);
assert.equal(receipt('another',{stable:true}),'');
data.campaignClock={campaignId:'qa-cf'};
assert.equal(receipt('patient',{stable:true}),'');
data.campaignClock=null;
assert.equal(receipt('patient',{stable:true}),'');
assert.equal((app.match(/hskWeatherHealthLastReceipt=\{actorId:actor.id,campaignId:campaignKey\(data.campaignClock\),message:/g)||[]).length,4);

const wound={id:'wound-test',location:'fo',side:'right',bodyKind:'human',severity:'G',level:5,
 aspect:'e',bleeding:false,nextAdvanceRound:null,amputation:{severed:true}};
const state=initialCombatState();
state.wounds=[wound];
state.shock='KIA';
state.bloodLoss.bp=4;
const actor={id:'patient',name:'QA',hmk:{healthState:state}};
const woundSummary=runInNewContext(source('function gmWoundObligationSummary(', '/** Administrative (not dice-based)')+'gmWoundObligationSummary',{
 persistentStateOf:c=>c.hmk.healthState,
 gmWoundConsequenceAssessment:()=>({bloodPoints:4,blood:'shared-or-uncertain'}),
});
const summary=woundSummary(actor,wound);
assert.match(summary.details.join(' · '),/KIA.*trvalá amputace.*BP 4/);
assert.doesNotMatch(summary.details.join(' · '),/Čeká na ošetření|Další Healing Roll/);
assert.equal(summary.procedures.length,0);

const panel=runInNewContext(source('function gmWoundManagementPanel(', '\n}')+'\n}\ngmWoundManagementPanel',{
 data,esc,persistentStateOf:c=>c.hmk.healthState,combatInitiativeSequence:null,
 JOURNAL_ANATOMICAL_LOCATIONS:[],medicalWoundOptionLabel:()=> 'QA · G5 Edge',
 interruptedTreatmentWound:()=>null,extendedShockAidContext965:()=>({}),
 gmWoundObligationSummary:woundSummary,activeNoncombatBleeder966:()=>false,hskIsEnvironmentalWound:()=>true,
 isNoncombatMedicalOrigin:()=>false,
});
const markup=panel(actor,{inlineBlood:true});
assert.match(markup,/G5 Edge/);
assert.match(markup,/BP 4/);
assert.doesNotMatch(markup,/data-wound-treatment(=|-healer)|Otevřít Treatment/);

const chronicleAction=runInNewContext(source('function journalWoundCareButton(', 'function hmkAnimalWoundAnatomyHTML(')+'journalWoundCareButton',{
 persistentStateOf:c=>c.hmk.healthState,esc,
});
assert.equal(chronicleAction(actor,wound,'G5 Edge'),'');
const alive={...actor,hmk:{healthState:{...state,shock:'NONE'}}};
assert.match(chronicleAction(alive,wound,'G5 Edge'),/data-wound-treatment/);

const clock=createCampaignCalendar({day:7,hour:8,minute:11,eventId:'qa-time',campaignId:'qa-cf',
 label:'QA CF',characterIds:[actor.id],gmConfirmed:true});
const agenda=campaignCalendarAgenda(clock,[actor],[],[]);
assert.deepEqual(agenda.all.filter(e=>e.characterId===actor.id),[]);
assert.deepEqual(agenda.unknown.filter(e=>e.characterId===actor.id),[]);
console.log('PASS v94.115: zdravotní stavová hláška podle kampaně a aktéra, KIA bez odkazů na léčbu a bez termínů');
