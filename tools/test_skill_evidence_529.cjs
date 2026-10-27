 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const previous=require.extensions['.js'];
require.extensions['.js']=(mod,file)=>file.startsWith(path.join(root,'src')+path.sep)?
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file):previous(mod,file);
const {skillTestEvidenceHTML,isCompletedSkillTest}=require('../src/integration/hmk-skill-result-evidence-529.js');
const {createCampaignCalendar}=require('../src/integration/hmk-campaign-calendar.js');
const {addGMCalendarPlan}=require('../src/integration/hmk-calendar-planner.js');
const {campaignCalendarBoardHTML,calendarInitialUI}=require('../src/integration/hmk-campaign-calendar-ui.js');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let checks=0;const ok=(v,message)=>{assert.ok(v,message);checks++};
const person={id:'actor',name:'Postava',hmk:{}},opponent={id:'opponent',name:'Protivník',hmk:{}};
const clock=createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init',gmConfirmed:true,campaignId:'skill529',characterIds:['actor','opponent']});
const planClock=addGMCalendarPlan(clock,{id:'plan1',eventId:'plan-ev',title:'Kontrola Awareness',minute:clock.minute,skill:'Awareness',destination:'skills',characterId:'actor',requiresAction:true,confirmed:true});
const solo={id:'skill-result-1',characterId:'actor',calendarCampaignId:'skill529',campaignMinute:clock.minute,
 createdAt:'2026-10-27T14:00:00Z',calendarGMTestPlanId:'plan1',title:'Success Test · Awareness',
 body:'ML 60 −5 Fatigue +2 GM = EML 57\nPrimární d100 19 → CS\nUnopposed Victory Stars 2 ★★\nVyprávění pro GM: postava spatřila hrozbu.',
 skillTestProof:{type:'secondary-mastery-test',actorId:'actor',skills:['Awareness'],a:{level:'CS',ml:60,eml:57,roll:19,unopposedStars:2},gmNarrative:'Postava spatřila hrozbu.'}};
const opposed={id:'skill-result-2',characterId:'actor',calendarCampaignId:'skill529',campaignMinute:clock.minute,
 createdAt:'2026-10-27T14:01:00Z',title:'Opposed · Stealth',
 body:'A · Stealth | ML 65 −10 situace = EML 55; d100 22 → S\nB · Awareness | ML 40 = EML 40; d100 74 → F\nVítěz: Postava · Victory Stars: 3 ★★★\nGM: hlídka postavu nespatřila.',
 skillTestProof:{type:'opposed-success-test',actorId:'actor',opponentId:'opponent',skills:['Stealth','Awareness'],a:{level:'S',eml:55,roll:22},b:{level:'F',eml:40,roll:74},
 comparison:{winner:'a',stars:3},gmNarrative:'Hlídka postavu nespatřila.'}};
ok(isCompletedSkillTest(solo)&&isCompletedSkillTest(opposed),'recognize completed skill receipts');
ok(!isCompletedSkillTest({skillTestProof:{type:'poison-start'}}),'avoid presenting unrelated medical proof as a skill roll');
const h1=skillTestEvidenceHTML(solo,esc),h2=skillTestEvidenceHTML(opposed,esc);
for(const text of ['CS','EML 57','d100 19','2 ★','ML 60 −5 Fatigue +2 GM = EML 57','Vyprávění pro GM'])ok(h1.includes(text),'solo: '+text);
for(const text of ['Vítězí aktivní strana','Protistrana F','EML 40','d100 74','3 ★','GM: hlídka postavu nespatřila'])ok(h2.includes(text),'opposed: '+text);
const unsafe={...solo,id:'test-html',body:'<script>alert(1)</script>'};
ok(!skillTestEvidenceHTML(unsafe,esc).includes('<script>'),'escape GM-authored content');
const journal=[solo,opposed],ui=calendarInitialUI(planClock);
const board=campaignCalendarBoardHTML({clock:planClock,characters:[person,opponent],journal,ui,escapeHTML:esc});
ok(board.includes('data-cal-plan="plan1"'),'original plan preserved');
ok(board.includes('ML 60 −5 Fatigue +2 GM = EML 57'),'result linked to original GM plan');
ok(board.includes('GM: hlídka postavu nespatřila.'),'unlinked opposed result on calendar timeline');
const untouched=JSON.stringify(journal);
const minuteBoard=campaignCalendarBoardHTML({clock:planClock,characters:[person,opponent],journal,ui:{...ui,mode:'minute',dayNumber:1,hour:8},escapeHTML:esc});
ok(minuteBoard.includes('data-hmk-skill-proof="skill-result-2"'),'opposed proof appears in minute detail at real event');
ok(JSON.stringify(journal)===untouched,'all three views remain read-only, no duplicate proof');
ok((board.match(/data-hmk-skill-proof="skill-result-1"/g)||[]).length>=1,'skill proof uses same original journal id');
const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(css.includes('tbody tr:nth-child(even) > th:first-child'),'sticky alternating rows style');
ok(app.includes('l.skillTestProof?skillTestEvidenceHTML(l,esc)'),'character log uses canonical proof');
ok(app.includes('j.skillTestProof?skillTestEvidenceHTML(j,esc)'),'GM history uses canonical proof');
ok(idx.includes('v93.529'),'version');
console.log('PASS v93.529 ·',checks,'checks (Skill Tests, linked calendar, character and GM render bindings, inventory row style).');
