'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),prev=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)?mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):prev(mod,file);
const CAL=require('../src/integration/hmk-campaign-calendar.js'),P=require('../src/integration/hmk-calendar-planner.js'),N=require('../src/integration/hmk-nutrition-days.js'),A=require('../src/integration/hmk-nutrition-activity.js'),R=require('../src/integration/hmk-nutrition-rest-bridge.js'),UI=require('../src/integration/hmk-campaign-calendar-ui.js'),Route=require('../src/integration/hmk-calendar-event-routing.js');
let n=0,x=0;const id=()=>`v504-${++x}`,eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=(a,m)=>{assert.ok(a,m);n++};
const actors=['a','b'].map((id,i)=>({id,name:'Postava '+(i+1),hmk:{combatState:{fatigue:{windedness:0,weariness:15,otherWeakness:0}},expedition:{claims:{}}}}));
const clock=CAL.createCampaignCalendar({day:1,hour:8,minute:0,label:'Kampaň',eventId:id(),gmConfirmed:true,campaignId:'c504',characterIds:['a','b']});
const journal=[];
for(const actor of actors){const proof=N.createNutritionPolicy({campaignId:'c504',minute:clock.minute,actorId:actor.id,enabled:true,autoNeeds:true,inventoryRations:true,inventoryWater:true});journal.push({id:id(),characterId:actor.id,calendarCampaignId:'c504',campaignMinute:clock.minute,calendarNutritionPolicy:proof});}
let all=[];
for(const actor of actors){const policyRow=journal.find(x=>x.characterId===actor.id);const proof=A.createNutritionDayConditions({journal,policyRow,campaignId:'c504',actorId:actor.id,minute:clock.minute,kind:'rest-hot'});const row={id:id(),characterId:actor.id,calendarCampaignId:'c504',campaignMinute:clock.minute,calendarNutritionConditions:proof};const rest=R.nutritionRestActivity({journal,clock,actor,conditionRow:row,id:id()});all.push(row,...(rest?[rest]:[]));}
for(const [idx,actor] of actors.entries()){const row=all.find(x=>x.characterId===actor.id&&x.calendarNutritionConditions);ok(row,'per-actor original proof');eq(row.calendarNutritionConditions.kind,'rest-hot');ok(all.some(x=>x.characterId===actor.id&&x.calendarActivityProof),'per actor fatigue plan');}
assert.doesNotThrow(()=>A.validateNutritionActivityJournal([...journal,...all]));n++;
assert.throws(()=>A.createNutritionDayConditions({journal:[...journal,...all],policyRow:journal[0],campaignId:'c504',actorId:'a',minute:clock.minute,kind:'hot'}),/již byly jednou/);n++;
const html=UI.campaignCalendarBoardHTML({clock,characters:actors,journal:[...journal,...all],ui:UI.calendarInitialUI(clock),escapeHTML:x=>String(x)});
ok(html.includes('data-cal-event-check'),'calendar controls');
const planning=P.addGMCalendarPlan(clock,{id:id(),eventId:id(),title:'Kontrola Awareness',minute:clock.minute,skill:'Awareness',destination:'skills',characterId:'a',requiresAction:true,confirmed:true});
eq(planning.plans[0].skill,'Awareness');eq(P.validateCalendarPlans(planning),true);
const board=UI.campaignCalendarBoardHTML({clock:planning,characters:actors,journal:[...journal,...all],ui:UI.calendarInitialUI(planning),escapeHTML:x=>String(x)});
ok(board.includes('data-cal-skill="Awareness"')&&board.includes('data-cal-plan='),'verified GM skill handoff in event');
const required=['herbal-potion','malnutrition-course','poison','disease','asphyxia','sleep-deprivation','blood-shock','healing','infection','grim','treatment','blood-loss','coma','extended-shock','shock-followup','bleeding','aural-recovery','psyche-manifestation','psyche-interval','psyche-recovery','skill-critical','skill-fall','skill-injury','weather-course','weather-skin','talisman-period','trek-survival-test','trek-drover-test'];
for(const kind of required){ok(['combat','healing','hazards','skills','calendar'].includes(Route.calendarEventDestination({kind})),kind);}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(app.includes("APP_VERSION='93.504'")&&index.includes('v93.504'),'version');
ok(app.includes('data-nutrition-party-conditions')&&app.includes('hc-clock-banner'),'party+clock');
ok(!app.includes('GM potvrzuje úplné 24hodinové podmínky a při jejich změně plán zruší.'),'no checkbox per actor');
ok(app.includes("if(!cancel&&plan.destination==='skills'&&plan.skill)"),'required GM skill evidence before marking completion');
console.log('PASS',n,'calendar 93.504 party/day/skill routing/display checks');
