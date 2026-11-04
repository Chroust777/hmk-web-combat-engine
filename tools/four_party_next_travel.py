from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path('/mnt/data/hmk93712_work');raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mods['app.js']+='''\nwindow.__auditOpenNextTravel=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';render();return {clock:data.campaignClock.minute,form:!!document.querySelector('#hmk-time-episode-form'),actorCount:data.characters.length, blockers:document.body.innerText.match(/Nevyřešené.{0,120}/g)?.slice(0,4)};};\nwindow.__auditFillEnd=()=>{const f=document.querySelector('#hmk-time-episode-form');const e=f.querySelector('[name^=end_]');e.value='4';f.elements.namedItem('progressD10').value='4,8';updateEpisodePreview(f);return document.querySelector('[data-episode-checklist]').innerText;};
window.__auditTestReport=()=>({clock:data.campaignClock.minute,events:data.campaignClock.events.filter(e=>e.type==='advance').map(e=>e.minute),journal:data.journal.length});
window.__auditPrepareTravel=()=>{const f=document.querySelector('#hmk-time-episode-form'); const set=(k,v)=>{const e=f.elements.namedItem(k);if(!e)throw Error(k);e.value=String(v)};f.querySelectorAll('[name=memberIds]').forEach((e,i)=>e.checked=i===0);set('kind','travel');set('minutes','30');set('weatherSource','local');set('area','Safe riverside path');set('season','summer');set('climate','warm');set('temperatureD10','8');set('precipitationD10','8');set('terrain','paved-road');set('topography','flat');f.elements.namedItem('checkEncounter').checked=true;updateEpisodePreview(f);return {result:document.querySelector('[data-episode-checklist]')?.innerText,actions:[...document.querySelectorAll('button[data-episode-skill-task]')].map(x=>x.textContent.trim())};};\n''';bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:];records=json.loads(Path('/mnt/data/hmk93707_work/fixtures/four_party_all_healed.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=b.new_page(viewport={'width':1480,'height':1000});page.set_default_timeout(12000);alerts=[];page.on('dialog',lambda d:(alerts.append(d.message),d.accept()));page.on('pageerror',lambda e:print('PAGEERROR',e))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text());
 page.add_script_tag(content=bundle)
 print('OPEN',page.evaluate('window.__auditOpenNextTravel()'),flush=True)
 print('PREP',page.evaluate('window.__auditPrepareTravel()'),flush=True)
 page.locator('[data-episode-evaluate]').click()
 print('EVALUATE',page.locator('[data-episode-checklist]').inner_text()[:2300],flush=True)
 print('TASKS',page.locator('[data-episode-skill-task]').count(),flush=True)
 if page.locator('[data-episode-skill-task]').count():
  page.locator('[data-episode-skill-task]').first.click()
  print('SKILL SCREEN',page.locator('#app form').count(),flush=True)
  skill=page.locator('#skill-value-form');print('SKILL FORMS',page.locator('#app form').evaluate_all('(els)=>els.map(e=>({id:e.id,action:e.getAttribute("data-skill-form"),hidden:e.offsetParent===null,roll:e.querySelector("[name=rollA]")?.disabled,html:e.outerHTML.slice(0,210)}))'),flush=True);print('SKILL INPUTS',[(e.get_attribute('name'),e.get_attribute('type')) for e in skill.locator('input').all()],flush=True)
  skill.locator('[name=rollA]').fill('10');skill.locator('button[type=submit]').click()
  print('SKILL SAVED',page.locator('[data-episode-return]').count(),flush=True)
  page.locator('[data-episode-return]').click()
  print('RETURN',page.locator('[data-episode-checklist]').inner_text()[:2500],flush=True)
  print('TASKS REMAIN',page.locator('[data-episode-skill-task]').count(),flush=True)
  print('END SCENE',page.evaluate('window.__auditFillEnd()'),flush=True)
  f=page.locator('#hmk-time-episode-form');f.locator('[name=confirmed]').check()
  print('READY',page.locator('[data-episode-finalize]').is_disabled(),flush=True)
  if not page.locator('[data-episode-finalize]').is_disabled():
   page.locator('[data-episode-finalize]').click()
   print('FINISHED',page.evaluate('window.__auditTestReport()'),flush=True)
   assert page.evaluate('window.__auditTestReport().clock')==25230
   stored=page.evaluate("""()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))""")
   Path('/mnt/data/hmk93712_tests/out_four_party_next_travel.json').write_text(json.dumps(stored))
   re=b.new_page();re.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
   re.evaluate("""r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}""",stored)
   re.add_script_tag(content=bundle)
   result=re.evaluate('window.__auditTestReport()');print('RELOAD RESULT',result,flush=True)
   assert result['clock']==25230 and result['events'][-1]==25230 and result['journal']>15
   re.close()
   print('PASS NEXT TRAVEL FINISH + RELOAD',flush=True)
  print('ALERTS',alerts,flush=True);b.close()
