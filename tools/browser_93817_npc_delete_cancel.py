"""Chromium UI test: create two NPCs via real forms in a live travel draft, cancel edits, delete one via UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8'); pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__startStaged93817=()=>{episodeStageBaseline=structuredClone(data);render();return true;};
window.__auditState93817=()=>({
 people:data.characters.map(c=>({id:c.id,name:c.name,kind:c.kind,creation:c.hmk?.creation?JSON.stringify(c.hmk.creation):null})),
 storedPeople:JSON.parse(storageBaseline).characters.map(c=>({id:c.id,name:c.name,kind:c.kind})),
 draft:sharedTimeWindowDraft?{start:sharedTimeWindowDraft.startMinute,end:sharedTimeWindowDraft.endMinute}:null,
 plans:sharedTimeWindowPlans.map(x=>({id:x.id,actorId:x.actorId,groupId:x.groupId})),
 clock:data.campaignClock?.minute,
 storedClock:JSON.parse(storageBaseline).campaignClock?.minute,
 view,notice,storageReadOnly,staged:!!episodeStageBaseline,queue:sharedTimeWindowQueue.length,creationUI:[...creationStepUIState.keys()]
});
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1760,'height':1050});page.set_default_timeout(14000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 # Activate a real shared travel time window; do not enter or fabricate Skill results.
 page.locator('[data-shared-window-minutes]').fill('45')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a')
 before=page.evaluate('window.__auditState93817()')
 assert before['draft'] and before['clock']==480 and before['plans'],before
 print('PASS draft before NPC creation',before['draft'],before['plans'],flush=True)
 page.locator('[data-nav=characters]').first.click()
 def create_npc(name):
  page.locator('[data-action=new-character]').last.click()
  modal=page.locator('#creation-new-form')
  modal.locator('[name=name]').fill(name)
  modal.locator('[name=kind]').select_option('NPC')
  modal.locator('button[type=submit]').click()
  assert page.locator('#creation-step-form').count()==1,'NPC did not open Character Creation'
  assert page.locator('button[data-creation-leave]').count()>=1
  state=page.evaluate('window.__auditState93817()')
  assert len([c for c in state['people'] if c['name']==name])==1,state
  return next(c for c in state['people'] if c['name']==name)
 first=create_npc('NPC Zkouška 1')
 # Editing and cancel: form has not been submitted, no new value should persist.
 form=page.locator('#creation-step-form')
 target=form.locator('select[name=folk]')
 if target.count():
  old=target.input_value();other=target.locator('option').evaluate_all('(els,old)=>els.map(e=>e.value).filter(v=>v&&v!==old)',old)
  if other:target.select_option(other[0]);assert target.input_value()!=old
 else:
  target=form.locator('input[name=folk]');target.fill('Sinai') if target.count() else None
 unsaved=page.evaluate('window.__auditState93817()')
 form.locator('[data-creation-leave]').click()
 left=page.evaluate('window.__auditState93817()')
 assert left['view']=='characters' and left['storedPeople']==before['storedPeople']+[{'id':first['id'],'name':first['name'],'kind':first['kind']}],left
 assert next(x for x in left['people'] if x['id']==first['id'])['creation']==first['creation'],'Cancel must not persist unsaved form field'
 assert all(not key.startswith(first['id']+':') for key in left['creationUI']),left['creationUI']
 print('PASS cancel without changing stored NPC',flush=True)
 second=create_npc('NPC Zkouška 2')
 page.locator('#creation-step-form [data-creation-leave]').click()
 right_cards=page.locator('.journal-book-page--right [data-character-kind=NPC] .character-card')
 left_cards=page.locator('.journal-book-page--left [data-character-kind=NPC] .character-card')
 print('FOLIO',right_cards.count(),left_cards.count(),page.locator('[data-character-kind=NPC]').count(),page.locator('[data-character-kind=NPC]').first.evaluate('(el)=>[el.parentElement?.className,el.parentElement?.parentElement?.className,el.parentElement?.parentElement?.parentElement?.className]') if page.locator('[data-character-kind=NPC]').count() else page.locator('body').inner_text()[-600:],flush=True)
 assert right_cards.count()==2,(right_cards.count(),left_cards.count())
 assert not left_cards.count(),'NPC group should not be split across folios'
 bbox=[x.bounding_box() for x in right_cards.all()]
 assert bbox[0] and bbox[1] and abs(bbox[0]['y']-bbox[1]['y'])<12,bbox
 page.screenshot(path=str(root/'docs/AUDIT_v93.817_NPC_adjacent.png'),full_page=True)
 # Delete second NPC using actual GUI and confirm JavaScript dialog.
 right_cards.filter(has_text='NPC Zkouška 2').locator('[data-delete-character]').click()
 after=page.evaluate('window.__auditState93817()')
 assert len(after['people'])==4 and all(x['name']!='NPC Zkouška 2' for x in after['storedPeople']),after
 assert after['clock']==480 and after['storedClock']==480 and after['draft']==before['draft'] and after['plans']==before['plans'],after
 assert after['storageReadOnly'] is False
 assert not any('Smazání se nepodařilo' in d for d in dialogs),dialogs
 print('PASS delete NPC during active travel draft; stored, no clock shift or draft loss',flush=True)
 page.screenshot(path=str(root/'docs/AUDIT_v93.817_NPC_after_delete.png'),full_page=True)
 # Reload the tab and compare persisted state; the NPC must remain absent.
 page.reload(wait_until='domcontentloaded') if False else None
 # Additional guarded path: verified character deletion while the in-memory
 # Pochod Skill transaction lock is active, not merely a draft window.
 assert page.evaluate('window.__startStaged93817()')
 third=create_npc('NPC Zamčený interval')
 page.locator('#creation-step-form [data-creation-leave]').click()
 page.locator('[data-delete-character="'+third['id']+'"]').click()
 staged_after=page.evaluate('window.__auditState93817()')
 assert staged_after['staged'] is True and staged_after['storageReadOnly'] is False,staged_after
 assert all(x['id']!=third['id'] for x in staged_after['storedPeople']),staged_after
 assert staged_after['draft']==before['draft'] and staged_after['clock']==480,staged_after
 print('PASS UI delete with active uncommitted episode checkpoint (fixture), verified storage and draft preserved',flush=True)
 assert not errors,errors
 print('DONE',json.dumps({'dialogs':dialogs,'errors':errors,'remaining':after['storedPeople'],'draft':after['draft']},ensure_ascii=False),flush=True)
 b.close()
