"""Browser regression for draft-only exits after independent committed writes."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args()
root=a.root
bundle=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(bundle[len(head):]);
mods['app.js']+="""
window.__audit784Seed=()=>{
  const C=require('./src/integration/hmk-campaign-calendar.js');
  data=clean();data.characters=[{id:'auditor',name:'Before staging',kind:'PC',occupation:'',description:''}];
  data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit784',eventId:'start784',gmConfirmed:true,characterIds:['auditor']});
  storageReadOnly=false;view='characters';overlay=null;notice='';
  storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render();
};
window.__audit784SetupCollision=()=>{
  episodeStageBaseline=structuredClone(data);
  // A staged draft can contain local, uncommitted changes.
  data.characters[0].name='Uncommitted staged display';
  episodeEvaluationRequested=true;
  // A separately verified, later durable operation (e.g. medical proof)
  // has completed using a direct CAS storage path in the SAME minute.
  const committed=JSON.parse(storageBaseline);
  committed.characters[0].description='durable independently saved';
  committed.journal.push({id:'durable-health-proof-784',characterId:'auditor',title:'Durable health proof',body:'Never discard',createdAt:'2026-11-08T15:00:00.000Z'});
  storageBaseline=JSON.stringify(committed);localStorage.setItem(STORAGE,storageBaseline);
  return {startMinute:data.campaignClock.minute};
};
window.__audit784Corrupt=()=>{storageBaseline='INVALID COMMITTED JSON';};
window.__audit784Minimal=()=>({clock:data.campaignClock.minute,stage:!!episodeStageBaseline,name:data.characters[0].name});
window.__audit784State=()=>({name:data.characters[0]?.name,description:data.characters[0]?.description,
  note:data.journal.some(x=>x.id==='durable-health-proof-784'),
  staged:data.journal.some(x=>x.id==='staged-proof-784'),clock:data.campaignClock.minute,
  episode:!!episodeStageBaseline,baseline:JSON.parse(storageBaseline).characters[0].description,
  store:JSON.parse(localStorage.getItem(STORAGE)).characters[0].description,overlay:!!overlay});
"""
out=head+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); page=b.new_page(viewport={'width':1280,'height':800}); page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message[:90])),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=out);page.evaluate('window.__audit784Seed()')
 # Real conditional modal: cancel via explicit button, then keyboard Escape.
 for opener in ['auto-random-character','open-generator-config']:
  btn=page.locator('[data-action="'+opener+'"]');print('OPENER',opener,btn.count(),flush=True)
  if not btn.count():continue
  baseline=page.evaluate('JSON.stringify(JSON.parse(localStorage.getItem("hmk-ledger-v1")||"{}"))') if False else page.evaluate('window.__audit784State()')
  btn.first.click();dialog=page.locator('.editor-backdrop [role=dialog]')
  assert dialog.count()==1,'modal did not open'
  name=dialog.locator('input[name=name]');name.fill('not saved')
  assert dialog.locator('button[data-action="cancel-editor"]').count()==1
  # The first variant confirms visible explicit Cancel; second confirms Esc.
  if opener=='auto-random-character':dialog.locator('button[data-action="cancel-editor"]').click()
  else:name.press('Escape')
  assert page.locator('.editor-backdrop').count()==0,('cannot exit modal',opener)
  assert page.evaluate('window.__audit784State()')==baseline,('modal exit changed durable or working state',opener)
  print('PASS',opener,'explicit/keyboard exit untouched data and clock',flush=True)
 # A genuine production emergency-reset click with 2 independent revisions:
 # local scratch differs from persisted, and latest verified durable state must win.
 page.evaluate('window.__audit784SetupCollision()')
 page.evaluate('''()=>{let s=document.createElement('section');s.dataset.episodeEmergency='';s.innerHTML='<input type="checkbox" data-episode-emergency-confirm checked><button data-episode-emergency-reset type="button">Emergency</button>';document.body.append(s);}''')
 before=page.evaluate('window.__audit784State()');assert before['baseline']=='durable independently saved' and before['episode']
 page.locator('[data-episode-emergency-reset]').click();after=page.evaluate('window.__audit784State()')
 assert not after['episode'] and after['note'] and after['description']=='durable independently saved' and after['name']=='Before staging',('lost verified independent commit after cancelling stale episode',before,after)
 assert after['store']=='durable independently saved' and after['clock']==before['clock']
 assert not errors,errors
 print('PASS emergency reset retains latest verified independent commit and discards staged work; no clock mutation',flush=True)
 # If verified storage becomes unreadable, cancellation must fail CLOSED:
 # no speculative results are saved and no false 'recovery' is reported.
 page.evaluate('window.__audit784Seed()');page.evaluate('window.__audit784SetupCollision()')
 page.evaluate('window.__audit784Corrupt()')
 failed_before=page.evaluate('window.__audit784Minimal()')
 page.locator('[data-episode-emergency-reset]').click()
 failed_after=page.evaluate('window.__audit784Minimal()')
 assert failed_after==failed_before and any(t=='alert' and 'bezpečně' in msg for t,msg in dialogs),('invalid durable state should fail closed',failed_before,failed_after,dialogs)
 print('PASS corrupted verified baseline: cancellation refuses to falsify a completed recovery',flush=True)
 print('PASS browser conditional safe exit',len(dialogs),'native confirmations; no JS errors',flush=True)
 b.close()
