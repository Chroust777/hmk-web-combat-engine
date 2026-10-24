from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for mode in ('random','traits'):
  page=browser.new_page(viewport={'width':1410,'height':900});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''')
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
  if mode=='random':
   page.locator('[data-action="auto-random-character"]').click();page.locator('#hmk-random-name-form [name="name"]').fill('Random473')
   page.locator('#hmk-random-name-form button[type="submit"]').click()
  else:
   page.locator('[data-action="open-generator-config"]').click();page.locator('#hmk-generator-config [name="name"]').fill('Traits473')
   page.locator('#hmk-generator-config button[type="submit"]').click()
  started=time.monotonic();panel=page.locator('.hmk-auto-generation-overlay')
  assert panel.count()==1,('no progress overlay',mode,dialogs,errors)
  assert panel.locator('[data-auto-generation-stop]').count()==1
  print(mode,'panel shown',flush=True)
  if mode=='traits':
   panel.locator('[data-auto-generation-stop]').click()
  else:
   # Avoid waiting for an oversized rules loop: verify cancellation also
   # works in the fully random mode when no final character is ready.
   page.wait_for_timeout(250)
   if panel.count():panel.locator('[data-auto-generation-stop]').click()
  while panel.count() and time.monotonic()-started<50:page.wait_for_timeout(100)
  assert panel.count()==0,(mode,'overlay not closed',time.monotonic()-started,dialogs,errors)
  saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
  assert not any(c['name'] in ('Random473','Traits473') and c.get('hmk',{}).get('creation',{}).get('status')=='in-progress' for c in saved['characters']),(mode,'orphan draft')
  assert not errors,(mode,errors)
  print('PASS',mode,'cancel/finish',round(time.monotonic()-started,2),'s; chars',len(saved['characters']),'dialogs',dialogs[-2:],flush=True)
  page.close()
 browser.close()
