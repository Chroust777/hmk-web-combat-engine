const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let n=0;const ok=(condition,message)=>{assert.ok(condition,message);n++};
for(const text of ["const APP_VERSION='93.477'","provisionScope='person'",'function provisionScopeTabsHTML()',
 'function personalProvisionRulebookHTML(actor,policies,dayCandidates,dayPlans,clock)',
 'data-provision-scope="person"','data-provision-scope="party"',
 'data-provision-scope-actor="${esc(actorId)}"','name="nutritionActorIds" value="${esc(actorId)}"',
 'provisionScope===\'party\'?',
 'partyProvisionCardsHTML(participants,true)',
 'personalProvisionRulebookHTML(participants.find(c=>c.id===provisionGuideActorId)||participants[0]',
 "if(form.dataset.provisionScopeActor&& (ids.length!==1",
 'data-provision-go="gear"',
 'data-provision-go="calendar"',
 'journal-log-row--slim', 'journal-log-expand',
 '<summary>Obsah záznamu</summary>',
 'isPersonalNote(l)', 'data-hide-log', 'data-delete-log'])ok(app.includes(text),'app contains '+text);
for(const selector of ['.hc-provision-scope-tabs','.hc-provision-scope-active','.hc-provision-personal-rules',
 '.journal-log-row--slim','.journal-log-small-actions','.journal-log-expand'])ok(css.includes(selector),'CSS contains '+selector);
ok(html.includes('v93.477'),'index title version');
ok(html.includes('hmk-app.bundle.js?v=93.477'),'bundle cache version');
ok(app.includes("if(enabled&&f.get('foragingOnly')!=='yes')throw Error"),'original attestation gate');
ok(app.includes('if(inventoryMode)for(const actorId of ids)'), 'original inventory evidence gate');
ok(app.includes('mutate(()=>{data.journal.push(...stocks.map('),'original authoritative writer retained');
ok(app.includes("const form=e.target;if(!form?.matches?.('[data-foraging-batch-rations]'))return;"),'group batch unchanged');
ok(app.includes("const form=e.target;if(!form?.matches?.('[data-malnutrition-course]'))return;"),'Starvation/Thirst writer unchanged');
ok(!app.includes("data-provision-route=\"have\" data-actor-supplied=\"true\""),'no fabricated supplied state');
console.log('PASS '+n+' actor-v-party UI and untouched HMK transaction gates');
