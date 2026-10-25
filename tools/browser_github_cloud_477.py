"""Real Chromium smoke: two isolated browsers, one simulated private GitHub repository."""
import os,json,re,time,threading,base64
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script defer src="\./hmk-app.bundle.js[^>]*></script>','',html)
lock=threading.Lock();cloud={'raw':None,'sha':None,'rev':0,'puts':0}

def intercept(route):
 req=route.request;u=req.url;method=req.method
 hd={'access-control-allow-origin':'*','access-control-allow-methods':'GET,PUT,OPTIONS','access-control-allow-headers':'*','Content-Type':'application/json'}
 if method=='OPTIONS':return route.fulfill(status=204,headers=hd,body='')
 with lock:
  if u.endswith('/repos/Chroust777/hmk-campaign-private'):
   code,body=200,{'private':True,'default_branch':'main'}
  elif u.endswith('/repos/Chroust777/hmk-campaign-private/contents/campaigns/hmk-ledger-cloud.json'):
   if method=='GET':
    code,body=(404,{'message':'Not Found'}) if cloud['raw'] is None else (200,{'sha':cloud['sha'],'content':base64.b64encode(cloud['raw'].encode()).decode(),'encoding':'base64'})
   elif method=='PUT':
    payload=req.post_data_json
    if payload.get('sha')!=cloud['sha']:
     code,body=409,{'message':'Concurrent update'}
    else:
     cloud['raw']=base64.b64decode(payload['content']).decode();cloud['rev']+=1;cloud['sha']='sha'+str(cloud['rev']);cloud['puts']+=1
     code,body=200,{'content':{'sha':cloud['sha']}}
   else:code,body=400,{}
  else:code,body=404,{'message':'Not found'}
 return route.fulfill(status=code,headers=hd,body=json.dumps(body))

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 contexts=[browser.new_context(viewport={'width':1366,'height':768}) for _ in range(2)]
 pages=[];errors=[];alerts=[]
 for i,ctx in enumerate(contexts):
  ctx.route('https://api.github.com/**',intercept)
  p=ctx.new_page();pages.append(p);p.on('pageerror',lambda err:errors.append(str(err)))
  p.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
  p.set_content('<html><head><meta charset=\"utf-8\"></head><body><div id=\"app\"></div></body></html>')
  p.evaluate('''()=>{const mem=new Map(),ses=new Map();window.__hmkTestLocal=mem;window.__hmkTestSession=ses;for(const [name,m] of [['localStorage',mem],['sessionStorage',ses]])Object.defineProperty(window,name,{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]||null,get length(){return m.size}}});}''')
  p.set_content(html)
  p.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
  p.locator('[data-nav="backup"]').first.wait_for(timeout=20000)
  p.locator('[data-nav="backup"]').first.click()
  p.locator('#hmk-cloud-connect-form').wait_for()
  p.locator('[name="owner"]').fill('Chroust777')
  p.locator('[name="repo"]').fill('hmk-campaign-private')
  p.locator('[name="token"]').fill('github_pat_testing_fake')
  if i==0:
   p.locator('[data-cloud-action="create"]').click()
   p.wait_for_function("document.querySelector('[data-cloud-status]')?.textContent.includes('uloženo')",timeout=25000)
   assert cloud['puts']==1,cloud
   p.locator('[data-action="new-character"]').click()
   p.locator('#creation-new-form input[name="name"]').fill('Cloud-Arel')
   p.locator('#creation-new-form button[type=submit]').click()
   p.wait_for_timeout(3000)
   assert cloud['puts']>=2,'no cloud auto upload after character creation'
   print('PASS first device created character, autosynced to private GitHub API; revisions',cloud['puts'],flush=True)
  else:
   p.locator('#hmk-cloud-connect-form button[type=submit]').click()
   p.wait_for_function("document.querySelector('#app')?.textContent.includes('Cloud-Arel')",timeout=25000)
   assert p.evaluate("JSON.parse(window.__hmkTestLocal.get('hmk-keepers-ledger-v1')).characters.some(x=>x.name==='Cloud-Arel')")
   print('PASS second device loads same campaign without JSON file',flush=True)
 assert not errors,errors
 for p in pages:p.close()
 browser.close()

