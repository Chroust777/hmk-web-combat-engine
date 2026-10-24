"""Production smoke: character generator, menu, calendar, history, data invariance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,time
root=Path(__file__).resolve().parents[1]
html=re.sub(r'<script defer src="\./hmk-app.bundle.js[^>]*></script>','',(root/'index.html').read_text())
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=browser.new_page(viewport={'width':1500,'height':980});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const a={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css'):page.add_style_tag(content=(root/css).read_text())
 page.set_content(html)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 assert page.locator('[data-action="auto-random-character"]').count()==1
 page.locator('[data-action="auto-random-character"]').click();form=page.locator('#hmk-random-name-form');form.locator('[name="name"]').fill('Smoke475');form.locator('button[type="submit"]').click()
 begun=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-begun<25:page.wait_for_timeout(160)
 assert not page.locator('.hmk-auto-generation-overlay').count(),'generator did not terminate'
 state=page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 char=json.loads(state)['characters'][0];assert char['name']=='Smoke475' and char['hmk']['creation']['status']=='auto-generated'
 # Navigating through unrelated modules must not change character/inventory/journal.
 for section in ('calendar','skills','library','characters'):
  page.locator(f'[data-nav="{section}"]').first.click()
  assert page.locator('#app .shell').count()==1,(section,page.locator('#app').inner_text()[:350])
  assert page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")==state,section
 assert page.locator('[data-ui-history="back"]:not([disabled])').count()==1
 page.locator('[data-ui-history="back"]').click()
 assert page.locator('#app .shell').count()==1
 assert page.locator('[data-ui-history="forward"]:not([disabled])').count()==1
 page.locator('[data-ui-history="forward"]').click()
 assert page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")==state
 assert not errors,(errors,alerts)
 print('PASS Chromium creation + calendar/skills/library/characters + back/forward; no state mutations / errors')
 browser.close()
