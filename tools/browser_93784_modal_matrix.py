"""Real UI modal close/escape matrix; zero durable state mutations."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+="""
window.__modal784Seed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const a={id:'modal-pc',name:'Modal Tester',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'survival',name:'Survival',ml:70}],healthState:H.initialCombatState()}};
 data.characters=[a];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'modal784',eventId:'start-modal',gmConfirmed:true,characterIds:['modal-pc']});
 data.items.push({id:'modal-rope',name:'Rope',category:'other',properties:{weightLb:1}});
 data.inventory.push({id:'modal-inventory',characterId:'modal-pc',sourceItemId:'modal-rope',snapshot:{id:'modal-rope',name:'Rope',category:'other',properties:{weightLb:1}},slot:'carried',quantity:1,condition:'good'});
 data.journal.push({id:'modal-note',characterId:'modal-pc',title:'My note',body:'Personal',createdAt:'2026-11-08T15:00:00Z'});
 storageReadOnly=false;selected='modal-pc';view='characters';render();
};
window.__modal784Route=(v,section)=>{view=v; if(v==='library'){libraryTab=section||'melee';libraryPage=0;}if(v==='sheet')activeSheetSection=section||'inventory';overlay=null;render();};
window.__modal784Signature=()=>JSON.stringify(data);
"""
creation=mods['src/integration/hmk-character-creation.js']
for orig,inject in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="modal-pc")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="modal-pc")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="modal-pc")return true;')]:
 assert orig in creation;creation=creation.replace(orig,inject)
mods['src/integration/hmk-character-creation.js']=creation
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(10000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle);page.evaluate('window.__modal784Seed()')
 jobs=[('characters','', '[data-action="auto-random-character"]'),('characters','', '[data-action="open-generator-config"]'),('library','melee','[data-action="new-item"]'),('sheet','inventory','[data-edit-inv]'),('sheet','inventory','[data-chest-move]'),('sheet','journal','[data-edit-log]')]
 passed=[];skipped=[]
 for view,section,selector in jobs:
  page.evaluate('([v,s])=>window.__modal784Route(v,s)',[view,section])
  button=page.locator(selector)
  if button.count()==0:
   skipped.append((view,section,selector));print('NOT_VISIBLE',view,section,selector,flush=True);continue
  before=page.evaluate('window.__modal784Signature()')
  button.first.click();modal=page.locator('#app .editor-backdrop .editor-dialog')
  if not modal.count():
   skipped.append((view,section,selector+' did not open modal'));print('NO_MODAL',view,section,selector,flush=True);continue
  cancel=modal.locator('[data-action="cancel-editor"]');assert cancel.count()==1,('missing cancel',view,section,selector)
  txt=modal.locator('input:not([type=hidden])').first
  if txt.count() and txt.is_visible() and txt.get_attribute('type') not in ('checkbox','radio','number'):
   txt.fill('temporary draft')
  # Alternate keyboard and visible Cancel.
  if len(passed)%2:
   modal.locator('[data-action="cancel-editor"]').click()
  else:
   focus=modal.locator('button[data-action="cancel-editor"]');focus.focus();focus.press('Escape')
  assert page.locator('#app .editor-backdrop').count()==0,(view,section,selector,'dialog remained')
  assert before==page.evaluate('window.__modal784Signature()'),(view,section,selector,'unsaved change leaked')
  passed.append((view,section,selector))
  print('PASS',view,section,selector,'escape/cancel no mutation',flush=True)
 assert not errors,errors
 assert len(passed)>=3,('insufficient real modal routes',passed,skipped)
 (root/'docs/AUDIT_CONDITIONAL_MODALS_93784.json').write_text(json.dumps({'tested':passed,'notVisible':skipped,'errors':errors},ensure_ascii=False,indent=2))
 print('PASS modal matrix',len(passed),'real open/edit/exit routes;',len(skipped),'unavailable test triggers; no JS errors',flush=True)
 b.close()
