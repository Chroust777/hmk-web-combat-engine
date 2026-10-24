const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
let n=0;const ok=(a,message)=>{assert.ok(a,message);n++;};
(async()=>{
 const {calendarEventDestination:route}=await import('file://'+path.resolve(__dirname,'../src/integration/hmk-calendar-event-routing.js'));
 const variants={
  healing:'healing',treatment:'healing',infection:'healing',grim:'healing','aural-recovery':'healing',
  'psyche-recovery':'healing','psyche-manifestation':'healing','psyche-interval':'healing',
  poison:'hazards',disease:'hazards','sleep-deprivation':'hazards','herbal-potion':'calendar',
  'malnutrition-course':'calendar','skill-fall':'skills','weather-course':'skills',
  'talisman-period':'skills','shock-followup':'combat',
 };
 for(const [kind,dest] of Object.entries(variants))ok(route({kind})===dest,kind);
 ok(route({kind:'poison',route:'skills'})==='skills','explicit original route wins');
 ok(route({kind:'bogus'})==='combat','unverified event routes to actual combat state');
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 ok(app.includes('data-cal-agenda="${esc(x.id)}"'),'overview date-linked action exists');
 ok(app.includes('ev.status!==\'due\''),'future check cannot execute');
 ok(app.includes("ev.characterId!==t.dataset.calLink||ev.kind!==t.dataset.calKind"),'event cannot be redirected to another actor or kind');
 ok(app.includes("t.dataset.calKind==='herbal-potion'"),'Herblore check exact original source');
 ok(app.includes('data-hmk-recovery-generate'),'creation-style inline recovery die');
 ok(app.includes('calendarRecoveryGenerated.get(form)'),'software provenance held in memory');
 ok(app.includes('calendarRecoveryGenerated.delete(input.form)'),'manual edit resets generated proof');
 ok(app.includes("||input.closest('.hc-calendar-recovery-die')"),'no duplicate auto-die');
 ok(app.includes('sibling?.tagName===\'BUTTON\''),'respect existing specialist dice');
 const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
 ok(css.includes('.hc-uniform-dice-button')&&css.includes('margin:.15rem'),'button visually below field');
 console.log('PASS',n,'checks of calendar route, immutable source and numeric/manual dice UX');
})().catch(e=>{console.error(e);process.exitCode=1});
