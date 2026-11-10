from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__charWitness93817=id=>({working:JSON.stringify(character(id)),saved:JSON.stringify(JSON.parse(storageBaseline).characters.find(x=>x.id===id)),dirty:[...creationStepUIState.keys()]});
window.__progress93817=()=>({minute:data.campaignClock?.minute,baseline:JSON.parse(storageBaseline).campaignClock?.minute,
  npc:data.characters.filter(x=>x.kind==='NPC').map(x=>({id:x.id,name:x.name,status:x.hmk?.creation?.status})),
  draft:!!sharedTimeWindowDraft,plans:sharedTimeWindowPlans.length});
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1700,'height':980});page.set_default_timeout(13000)
 errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-nav=characters]').first.click()
 page.locator('[data-action=auto-random-character]').click()
 form=page.locator('#hmk-random-name-form');form.locator('[name=name]').fill('NPC Dokončená generace')
 form.locator('[name=kind]').select_option('NPC');form.locator('button[type=submit]').click()
 print('generator started',flush=True)
 start=time.monotonic();overlay=page.locator('.hmk-auto-generation-overlay')
 while overlay.count() and time.monotonic()-start<38:page.wait_for_timeout(250)
 if overlay.count():
  print('UNVERIFIED generator exceeded 38s; cancel',flush=True)
  overlay.locator('[data-auto-generation-stop]').click()
  page.wait_for_timeout(2000)
 else:
  npc=page.evaluate('window.__progress93817()');print('generated state',npc,flush=True)
  target=next((x for x in npc['npc'] if x['name']=='NPC Dokončená generace'),None)
  if target and target['status']=='auto-generated':
   page.locator('[data-nav=characters]').first.click()
   before_edit=page.evaluate('(id)=>window.__charWitness93817(id)',target['id'])
   page.locator('[data-resume-creation="'+target['id']+'"]').click()
   edit=page.locator('#creation-step-form')
   assert edit.count()==1 and edit.locator('[data-creation-leave]').count()==1
   editable=edit.locator('input[name=psycheDice]')
   if editable.count():editable.fill('18,19')
   else:
    editable=edit.locator('input[type=text]:not([readonly])').first
    if editable.count():editable.fill('17')
   edit.locator('[data-creation-leave]').click()
   after_edit=page.evaluate('(id)=>window.__charWitness93817(id)',target['id'])
   assert before_edit['saved']==after_edit['saved']==after_edit['working'],(before_edit,after_edit)
   assert not any(k.startswith(target['id']+':') for k in after_edit['dirty']),after_edit
   print('PASS open completed auto-generated NPC, edit, cancel: no persisted changes',flush=True)
   page.locator('[data-nav=characters]').first.click() if page.locator('[data-resume-creation="'+target['id']+'"]').count()==0 else None
   page.locator('[data-delete-character="'+target['id']+'"]').click()
   after=page.evaluate('window.__progress93817()')
   assert not after['npc'] and after['minute']==480 and after['baseline']==480 and after['plans']==1 and after['draft'],after
   print('PASS full automatically generated NPC deleted by UI while travel draft remains',flush=True)
  else:
   print('NEOVĚŘENO auto generator failed in scenario',target,flush=True)
 print('alerts',alerts[-3:], 'errors',errors[-3:],flush=True)
 b.close()
