"""Production ES modules, fresh Chromium contexts, shared isolated Contents API."""
import json,threading,re,sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_port)
remote={};puts=[];errors=[]
instrument="""
window.audit={
 async seed(){data=clean();data.characters=[{id:'a',name:'Pepa',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'survival',name:'Survival',ml:70},{id:'endurance',name:'Endurance',ml:65}],healthState:initialCombatState()}}];data.campaignClock=createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'isolated',eventId:'start',gmConfirmed:true,characterIds:['a']});storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);view='calendar';calendarLanding=false;activeCalendarSection='travel';render()},
 connect(create=false){return cloudSync.connect({owner:'tester',repo:'isolated',accessToken:'test-only',createIfMissing:create})},
 state(){return {error:cloudSync.issue,status:cloudSync.status,minute:data.campaignClock?.minute,docs:JSON.parse(storageBaseline||'{}'),work:observedWork&&JSON.parse(observedWork),view,plans:sharedTimeWindowPlans.length,queue:sharedTimeWindowQueue.length,notice}},
 async flush(){await cloudSync.flush()},refresh(){return cloudSync.refresh()}
};
"""
def cloud(rt):
 request=rt.request
 if '/contents/' not in request.url:return rt.fulfill(json={'private':True})
 if request.method=='GET':return rt.fulfill(status=200 if remote else 404,json=remote.copy())
 m=request.post_data_json
 if m.get('sha')!=remote.get('sha'):return rt.fulfill(status=409,json={'message':'conflict'})
 puts.append(len(puts)+1);remote.update(sha=str(len(puts)),content=m['content'],encoding='base64')
 return rt.fulfill(json={'content':{'sha':remote['sha']}})
def context(b):
 c=b.new_context(viewport={'width':1400,'height':900});c.route('https://api.github.com/**',cloud)
 c.route(re.compile(r'/app\.js\?'),lambda rt:rt.fulfill(content_type='text/javascript',body=(root/'app.js').read_text()+instrument))
 p=c.new_page();p.set_default_timeout(7000);p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:(print('DIALOG',d.message,flush=True),d.accept()))
 p.goto(url);p.wait_for_function('!!window.audit');return p
def settle(p):
 p.wait_for_timeout(100);p.evaluate('audit.flush()');p.wait_for_function("audit.state().status==='ready'")
def click(p,sel):p.locator(sel).first.click()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 a=context(b);a.evaluate('audit.seed()');a.evaluate('audit.connect(true)')
 a.locator('[data-shared-window-minutes]').fill('30');click(a,'[data-shared-window-create]');click(a,'[data-shared-plan-add]')
 a.locator('[data-shared-row-actor]').first.select_option('a');settle(a)
 state=a.evaluate('audit.state()');print('A',state['plans'],state['minute'],state['notice'],flush=True);assert state['plans']==1 and state['minute']==480
 d=context(b);assert not d.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 d.evaluate('audit.connect()');d.wait_for_timeout(1800);d.wait_for_function("window.audit?.state().status==='ready'")
 got=d.evaluate('audit.state()');print('B',got['plans'],got['view'],got['notice'],errors,flush=True)
 assert got['work']==state['work'] and got['docs']==state['docs'] and got['plans']==1 and got['view']=='calendar'
 click(d,'[data-shared-plan-add]');settle(d)
 click(a,'[data-shared-plan-add]');a.wait_for_timeout(1000);assert a.evaluate('audit.state().status')=='conflict'
 print('PASS two isolated contexts, open 30-minute plan, same actor, clock and ledger, stale writer blocked',flush=True)
 assert not errors,errors
 b.close()
server.shutdown()
