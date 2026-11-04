from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
root=Path('/mnt/data/hmk93712_work')
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mods['app.js']+="""
window.__testSelect=(i)=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render()};
window.__testState=()=>({minute:data.campaignClock?.minute,combat:!!data.combatRuntime?.sequence,people:data.characters.map(c=>({name:c.name,wounds:persistentStateOf(c).wounds.map(w=>({id:w.id,aspect:w.aspect,level:w.level,treated:w.healing?.treated,healed:w.healed,proofs:w.healing?.treatments?.map(t=>({method:t.treatmentMethod,time:t.procedureTime}))})),shock:persistentStateOf(c).shock})),journal:data.journal.length});
window.__testInjectCare=(i=0)=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render();};
window.__testSaved=()=>JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1'));
window.__testDue=()=>require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal).due.map(e=>({kind:e.kind,actor:e.characterId,sourceId:e.sourceId,elapsedMinutes:e.elapsedMinutes}));
"""
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
fixture=Path('/mnt/data/hmk93707_work/fixtures/after_two_skin_wounds.json')
records=json.loads(fixture.read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1420,'height':950});page.set_default_timeout(14000)
 errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle)
 print('init errors',errs,flush=True)
 assert not errs,errs
 before=page.evaluate('__testState()');print('BEFORE',before['minute'],[(a['name'],len(a['wounds'])) for a in before['people']],flush=True)
 assert before['minute']==720
 # Resolve actual immediate obligations of the other character, never bypass
 # their Calendar barrier with fabricated flag or stale state.
 page.evaluate('__testInjectCare(1)')
 for _ in range(8):
  mishap=page.locator('form[data-weather-injury-mishap]')
  morale=page.locator('form[data-weather-injury-morale]')
  if mishap.count():
   if mishap.locator('[name=roll]').count():mishap.locator('[name=roll]').fill('1')
   if mishap.locator('[name=confirmed]').count():mishap.locator('[name=confirmed]').check()
   mishap.locator('button[type=submit]').click()
  elif morale.count():
   if morale.locator('[name=aberrance]').count():morale.locator('[name=aberrance]').fill('0')
   if morale.locator('[name=roll]').count():morale.locator('[name=roll]').fill('1')
   if morale.locator('[name=confirmed]').count():morale.locator('[name=confirmed]').check()
   morale.locator('button[type=submit]').click()
  else:break
 print('PREP OUTCOMES',page.evaluate('__testState()')['minute'],dialogs[-3:],flush=True)
 page.evaluate('__testInjectCare(0)')
 form=page.locator('.hmk-weather-care #hmk-treatment-form')
 print('form',form.count(),'active',page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').count(),flush=True)
 assert form.count()==1
 assert page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').count()==1
 assert form.locator('[name="procedureStartMinute"]').count()==0
 assert form.locator('[name="procedureEndMinute"]').count()==0
 print('PREVIEW',form.locator('[data-weather-treatment-timing]').inner_text(),flush=True)
 assert '120 minut' in form.locator('[data-weather-treatment-timing]').inner_text()
 assert '720' in str(before['minute'])
 assert form.locator('[name=daySinceInjury]').input_value()=='0'
 assert form.locator('[name=daySinceInjury]').get_attribute('readonly') is not None
 # Treatment requires some real available care (Warming requires no tools)
 form.locator('[name=physicianML]').fill('80')
 form.locator('[name=physicianIndex]').fill('8')
 form.locator('[name=physicianRoll]').fill('10')
 form.locator('button[type=submit]').click()
 after=page.evaluate('__testState()'); print('AFTER1',after['minute'],after['people'][0]['wounds'],errs,dialogs[-5:],flush=True)
 assert after['minute']==840,after
 assert after['people'][0]['wounds'][0]['treated'] is True,after
 p0=after['people'][0]['wounds'][0]['proofs'][0]
 assert p0['time']['startMinute']==720 and p0['time']['endMinute']==840,p0
 assert after['people'][0]['wounds'][1]['treated'] is None
 assert not after['combat']
 # Second wound in the same minute should be treated next; the calendar must not skip an unrelated due course.
 page.evaluate('__testInjectCare(0)');form=page.locator('.hmk-weather-care #hmk-treatment-form')
 form.locator('select[name=wound]').select_option(index=1)
 print('SECOND PREVIEW',form.locator('[data-weather-treatment-timing]').inner_text(),flush=True)
 form.locator('[name=physicianML]').fill('80');form.locator('[name=physicianIndex]').fill('8');form.locator('[name=physicianRoll]').fill('20')
 form.locator('button[type=submit]').click()
 after2=page.evaluate('__testState()');print('AFTER2',after2['minute'],after2['people'][0]['wounds'],errs,dialogs[-5:],flush=True)
 assert after2['minute']==960,after2
 assert len([w for w in after2['people'][0]['wounds'] if w['treated']])==2
 assert [w['proofs'][0]['time']['startMinute'] for w in after2['people'][0]['wounds']]==[720,840]
 assert not after2['combat']
 assert not errs,errs
 # Re-render from persisted snapshot, not merely in-memory state
 saved=page.evaluate('__testSaved()')
 assert saved['campaignClock']['minute']==960
 assert sum(w.get('healing',{}).get('treated',False) for w in saved['characters'][0]['hmk']['healthState']['wounds'])==2
 print('PASS Chromium two sequential real Treatment forms, auto 120m each, calendar 720->840->960, no combat, saved state',flush=True)
 # A third wound needs Treatment, but simultaneous Cold Exposure Course(s) are
 # scheduled at 16:00. They take precedence in the guided UI; no bypass.
 page.evaluate('__testInjectCare(1)');third=page.locator('.hmk-weather-care #hmk-treatment-form')
 due_before=page.evaluate('__testDue()');print('DUE AT 16:00',due_before,flush=True)
 assert any(d['kind']=='weather-course' for d in due_before),due_before
 assert third.count()==0 and page.locator('[data-weather-care-deferred=weather-course]').count()==1, 'Treatment must be hidden until due Weather Course resolves'
 assert page.evaluate('__testState()')['minute']==960
 # Resolve those actual Course controls through the native UI.
 for due in [d for d in due_before if d['kind']=='weather-course']:
  actor_i=next(i for i,a in enumerate(before['people']) if a['name']==('Pair1' if due['actor']==saved['characters'][0]['id'] else 'Pair2'))
  page.evaluate('__testInjectCare(%d)'%actor_i)
  cf=page.locator('form[data-skill-weather-course]')
  cf=cf.filter(has=page.locator('input[name=sourceId][value="'+due['sourceId']+'"]'))
  assert cf.count()==1,('missing weather course',due,cf.count())
  cf.evaluate('f=>{for(let p=f;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true}')
  cf.locator('[name=elapsedMinutes]').fill(str(due.get('elapsedMinutes') or 240))
  cf.locator('[name=roll]').fill('1')
  if cf.locator('[name=gmConfirmed]').count():cf.locator('[name=gmConfirmed]').check()
  cf.locator('button[type=submit]').click()
  print('RESOLVED COURSE',due['actor'],'at',page.evaluate('__testState()')['minute'],flush=True)
  assert page.evaluate('__testState()')['minute']==960
 page.evaluate('__testInjectCare(1)');third=page.locator('.hmk-weather-care #hmk-treatment-form')
 print('AFTER DUE',page.evaluate('__testDue()'),'visible',page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').all_text_contents()[:1],'out',dialogs[-4:],flush=True)
 third.locator('[name=physicianML]').fill('80');third.locator('[name=physicianIndex]').fill('8');third.locator('[name=physicianRoll]').fill('20')
 third.locator('button[type=submit]').click()
 after3=page.evaluate('__testState()');print('AFTER3',after3['minute'],after3['people'][1]['wounds'],dialogs[-2:],flush=True)
 assert after3['minute']==1080,after3
 assert after3['people'][1]['wounds'][0]['treated'] is True
 assert after3['people'][1]['wounds'][0]['proofs'][0]['time']['startMinute']==960
 assert after3['people'][1]['wounds'][0]['proofs'][0]['time']['endMinute']==1080
 assert not after3['combat']
 assert not errs,errs
 print('PASS Chromium: 3 Treatment procedures, 2 mandatory intervening Weather Courses, no skipped events',flush=True)
 browser.close()
