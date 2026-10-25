"""Chromium real production bundle/UI with fake GitHub API and in-memory browser storage.
No campaign files are modified. GitHub network is completely disabled.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,gzip
root=Path(__file__).resolve().parents[1]
empty={'schemaVersion':1,'characters':[],'items':[],'inventory':[],'trash':[],'journal':[]}
old={**empty,'legacyFixture':'previous-device-data'}
def wrap(doc):
 x=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode()
 env={'format':'hmk-ledger-github-cloud-v1','encoding':'gzip-base64','payload':base64.b64encode(gzip.compress(x)).decode()}
 return base64.b64encode(json.dumps(env).encode()).decode()
def unwrap(content):
 env=json.loads(base64.b64decode(content));p=base64.b64decode(env['payload']);return json.loads(gzip.decompress(p) if env['encoding']=='gzip-base64' else p)
state={'raw':wrap(old),'sha':'seed0','writes':0,'calls':0}
def handle(url,method,auth,body):
 state['calls']+=1
 assert auth=='Bearer github_pat_BROWSER_FAKE',(method,url,'auth not forwarded')
 if url.endswith('/repos/Owner/hmk-campaign-private'):
  return {'status':200,'body':{'private':True}}
 assert url.endswith('/contents/campaigns/hmk-ledger-cloud.json'),('unknown',url)
 if method=='GET':return {'status':200,'body':{'sha':state['sha'],'encoding':'base64','content':state['raw']}}
 if method=='PUT':
  payload=json.loads(body)
  if payload.get('sha')!=state['sha']:return {'status':409,'body':{'message':'Conflict'}}
  state['raw']=payload['content'];state['writes']+=1;state['sha']='sha'+str(state['writes'])
  return {'status':200,'body':{'content':{'sha':state['sha']}}}
 return {'status':405,'body':{}}
BUNDLE=(root/'hmk-app.bundle.js').read_text()
def mk_page(browser):
 page=browser.new_page(viewport={'width':1400,'height':900});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept('hmk-campaign-private') if d.type=='prompt' else d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.expose_function('__fakeGithub',handle)
 page.evaluate('''()=>{
  function makeStorage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}}
  Object.defineProperty(window,'localStorage',{configurable:true,value:makeStorage()});
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:makeStorage()});
  window.fetch=async(u,opts)=>{const r=await window.__fakeGithub(String(u),opts.method,opts.headers.Authorization,opts.body??null);return {ok:r.status>=200&&r.status<300,status:r.status,json:async()=>r.body}};
  const original=window.setTimeout;window.setTimeout=(fn,delay,...args)=>delay===1200?0:original(fn,delay,...args);
 }''')
 for css in ('styles.css','skill-workbench.css','book-templates.css','library.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=BUNDLE);page.locator('[data-nav=backup]').first.click()
 return page,errors,dialogs
def fill(p):
 p.locator('#hmk-cloud-connect-form [name=owner]').fill('Owner')
 p.locator('#hmk-cloud-connect-form [name=repo]').fill('hmk-campaign-private')
 p.locator('#hmk-cloud-connect-form [name=token]').fill('github_pat_BROWSER_FAKE')
def connect(p):
 fill(p);p.locator('#hmk-cloud-connect-form button[type=submit]').click()

 try:p.wait_for_function("()=>document.querySelector('[data-cloud-status]')?.textContent.includes('uloženo')",timeout=12000)
 except Exception as ex:
  print('DEBUG connect:',p.locator('[data-cloud-status]').inner_text(), 'DIALOGS:',p.evaluate('document.querySelector("#app").innerText')[-1300:], 'API:',state['calls'])
  raise
 p.locator('[data-nav=backup]').first.click()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 c,ce,cd=mk_page(browser);print('Page loaded',flush=True);fill(c);print('form filled',flush=True)
 c.locator('.hmk-cloud-reset summary').click();print('section open',flush=True)
 c.locator('[data-cloud-action=reset]').click(timeout=4000);print('button clicked',flush=True)
 c.wait_for_function("()=>JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1'))?.journal?.length===0",timeout=10000)
 assert state['writes']==1 and unwrap(state['raw'])==empty,state
 assert len(cd)>=2,(cd,ce)
 assert not ce,ce
 # Independently verify a long-running v93.486 tab notices published v93.487.
 released=browser.new_page();released.set_content('<html><body></body></html>')
 released.evaluate('''()=>{window.fetch=async()=>({ok:true,text:async()=>'<title>HMK Keeper’s Ledger · v93.487</title>'});}''')
 index=(root/'index.html').read_text(encoding='utf8')
 version_script=index.rsplit('<script>',1)[1].split('</script>',1)[0]
 released.add_script_tag(content=version_script)
 released.evaluate("window.dispatchEvent(new Event('focus'))")
 released.wait_for_function("()=>window.__hmkOutdatedBuild===true&&!!document.querySelector('#hmk-release-notice')",timeout=5000)
 assert '93.487' in released.locator('#hmk-release-notice').inner_text(),'Release update banner'
 print(f'PASS Chromium v93.486: shared cloud reset click from clean browser; token, double confirmation, newer Pages release warning; {state["writes"]} mocked cloud write, no GitHub network')
 browser.close()
