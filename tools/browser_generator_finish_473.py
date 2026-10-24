from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for mode in ('random','traits'):
  page=browser.new_page(viewport={'width':1400,'height':900});errs=[];alerts=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
  page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''')
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
  if mode=='random':
   page.locator('[data-action="auto-random-character"]').click();page.locator('#hmk-random-name-form [name="name"]').fill('Random473');page.locator('#hmk-random-name-form button[type="submit"]').click()
  else:
   page.locator('[data-action="open-generator-config"]').click();page.locator('#hmk-generator-config [name="name"]').fill('Traits473');page.locator('#hmk-generator-config button[type="submit"]').click()
  start=time.monotonic();panel=page.locator('.hmk-auto-generation-overlay');assert panel.count()==1
  while panel.count() and time.monotonic()-start<45:
   page.wait_for_timeout(250)
   if int(time.monotonic()-start)%5==0 and time.monotonic()-start>4.9:pass
  if panel.count():
   print(mode,'still working after 45s, request safe cancellation',flush=True)
   panel.locator('[data-auto-generation-stop]').click()
   for _ in range(60):
    if not panel.count():break
    page.wait_for_timeout(100)
  saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"));complete=[c for c in saved['characters'] if c.get('hmk',{}).get('creation',{}).get('status')=='auto-generated']
  print('GENERATOR',mode,'elapsed',round(time.monotonic()-start,2),'complete',len(complete),'drafts',len(saved['characters'])-len(complete),'alerts',alerts[-1:] ,'js errors',errs[-1:],flush=True)
  assert not panel.count() and not errs and not (len(saved['characters'])-len(complete)), (mode,errs,alerts)
  page.close()
 browser.close()
