"""v93.487 real Chromium; GitHub API is completely mocked, no live campaign writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,gzip
root=Path(__file__).resolve().parents[1]
empty={'schemaVersion':1,'characters':[],'items':[],'inventory':[],'trash':[],'journal':[]}
old={**empty,'legacyFixture':'older-cloud-campaign'}
def enc(value):
 payload=gzip.compress(json.dumps(value,separators=(',',':')).encode())
 env={'format':'hmk-ledger-github-cloud-v1','encoding':'gzip-base64','payload':base64.b64encode(payload).decode()}
 return base64.b64encode(json.dumps(env).encode()).decode()
def dec(value):
 env=json.loads(base64.b64decode(value))
 body=base64.b64decode(env['payload'])
 return json.loads(gzip.decompress(body) if env['encoding']=='gzip-base64' else body),env
state={'sha':'old-sha','content':enc(old),'writes':0,'requests':0}
def mock(url,method,token,body):
 state['requests']+=1
 assert token=='Bearer github_pat_BROWSER_FAKE',('Unexpected authentication',url,token)
 if url.endswith('/repos/Owner/hmk-campaign-private'):return {'status':200,'body':{'private':True}}
 assert url.endswith('/contents/campaigns/hmk-ledger-cloud.json'),url
 if method=='GET':return {'status':200,'body':{'sha':state['sha'],'encoding':'base64','content':state['content']}}
 if method=='PUT':
  req=json.loads(body)
  if req.get('sha')!=state['sha']:return {'status':409,'body':{'message':'Conflict'}}
  state['content']=req['content'];state['writes']+=1;state['sha']='sha-'+str(state['writes'])
  return {'status':200,'body':{'content':{'sha':state['sha']}}}
 return {'status':405,'body':{}}
source=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
def open_page(browser):
 page=browser.new_page(viewport={'width':1340,'height':900});err=[];dialogs=[]
 page.on('pageerror',lambda x:err.append(str(x)))
 page.on('dialog',lambda x:(dialogs.append(x.message),x.dismiss()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.expose_function('__fakeGithub',mock)
 page.evaluate('''()=>{
  function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear(),key:i=>Array.from(map.keys())[i]??null,get length(){return map.size}}}
  Object.defineProperty(window,'localStorage',{configurable:true,value:storage()});
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage()});
  const oldTimeout=window.setTimeout;window.setTimeout=(fn,delay,...args)=>delay===1200?0:oldTimeout(fn,delay,...args);
  window.fetch=async(url,opt)=>{const x=await window.__fakeGithub(String(url),opt.method,opt.headers.Authorization,opt.body||null);return {ok:x.status>=200&&x.status<300,status:x.status,json:async()=>x.body}};
 }''')
 for name in ['styles.css','book-templates.css','library.css','skill-workbench.css']:
  page.add_style_tag(content=(root/name).read_text(encoding='utf8'))
 page.add_script_tag(content=source)
 page.locator('[data-nav=backup]').first.click()
 form=page.locator('#hmk-cloud-connect-form')
 form.locator('[name=owner]').fill('Owner');form.locator('[name=repo]').fill('hmk-campaign-private')
 form.locator('[name=token]').fill('github_pat_BROWSER_FAKE')
 form.locator('button[type=submit]').click()
 try:page.wait_for_function("()=>document.querySelector('[data-cloud-sidebar]')?.textContent.includes('uloženo')",timeout=15000)
 except Exception as e:
  print('CONNECT DEBUG',state,'errors',err,'dialogs',dialogs,'text',page.locator('#app').inner_text()[:2200]);raise
 page.locator('[data-nav=backup]').first.click()
 return page,err,dialogs
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote'])
 a,errors,dialogs=open_page(browser)
 assert dec(state['content'])[0]==old and state['writes']==0
 assert a.evaluate("localStorage.getItem('hmk-cloud-github-live-storage-v1')")=='connected'
 # The page is still alive; clearing all site storage triggers GitHub reset.
 a.evaluate('localStorage.clear(); sessionStorage.clear();')
 a.wait_for_function("()=>JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1')||'null')?.characters?.length===0 && localStorage.getItem('hmk-cloud-github-live-storage-v1')==='connected'",timeout=13000)
 assert state['writes']==1 and dec(state['content'])[0]==empty,state
 assert dec(state['content'])[1].get('resetId'),'resetId missing'
 assert not dialogs,dialogs
 # Manual one-button flow using the remembered in-memory session; zero prompts.
 b,errb,dialogs_b=open_page(browser)
 b.locator('[data-cloud-action=dev-reset]').click()
 b.wait_for_function("()=>localStorage.getItem('hmk-cloud-github-live-storage-v1')==='connected'",timeout=13000)
 b.wait_for_timeout(350)
 assert state['writes']==2 and dec(state['content'])[0]==empty,state
 assert not dialogs_b,dialogs_b
 assert not errors,errors
 assert not errb,errb
 print(f'PASS Chromium v93.487: auto F12 wipe + one-click reset, {state["writes"]} mocked cloud commits, no confirmation or token reentry, no real GitHub calls',flush=True)
 browser.close()
