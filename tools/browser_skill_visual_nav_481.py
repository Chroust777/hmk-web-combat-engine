from pathlib import Path
from playwright.sync_api import sync_playwright
import time
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1550,'height':960});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{for(const key of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}}""")
 for file in ('styles.css','skill-workbench.css','library.css','book-templates.css'):page.add_style_tag(content=(root/file).read_text())
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 page.locator('[data-action="auto-random-character"]').click();page.locator('#hmk-random-name-form [name="name"]').fill('NavActor481');page.locator('#hmk-random-name-form button[type="submit"]').click()
 t=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-t<40:page.wait_for_timeout(200)
 assert not page.locator('.hmk-auto-generation-overlay').count(),dialogs
 baseline=page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 page.locator('[data-nav="skills"]').first.click()
 assert page.locator('[data-skill-tab]').count()==3
 assert page.locator('[data-nav="hazards"]').count()==0,'duplicate hazards link appears in Skills'
 assert page.locator('details.hsk-gm-controls summary').filter(has_text='Darkvision').count()==0,'Darkvision visible without effect'
 actor=page.locator('.hsk-actor-chooser').first.inner_text();assert 'Kdo provádí test' in actor
 for tab in ('secondary','value','assistance'):
  page.locator(f'[data-skill-tab="{tab}"]').click()
  assert page.locator(f'[data-skill-section="{tab}"]:not([hidden])').count()==1,tab
  assert page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")==baseline
 page.locator('[data-skill-tab="secondary"]').click()
 total=page.locator('.hsk-eml-total').first
 assert total.count(), 'EML total missing'
 color=total.evaluate('(x)=>getComputedStyle(x).color')
 assert color=='rgb(16, 58, 86)',color
 page.screenshot(path=str(root/'tools'/'visual_skill_481.png'),full_page=False)
 page.evaluate("""()=>{const b=document.createElement('button');b.dataset.nav='hazards';document.querySelector('.content').append(b);b.click()}""")
 assert page.locator('.shell-sheet').count()==1
 for i in range(3):
  page.locator('[data-ui-history="back"]').click();assert page.locator('.shell-skills').count()==1
  page.locator('[data-ui-history="forward"]').click();assert page.locator('.shell-sheet').count()==1
 assert page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")==baseline,'Navigation mutated persisted game'
 assert not errors,errors
 print('PASS browser: 3 tabs, Darkvision entitlement, EML contrast, actor, 3 back/forward cycles, no mutation')
 browser.close()
