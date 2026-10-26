from pathlib import Path
from playwright.sync_api import sync_playwright
import json, time
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);modules['app.js']+='''
window.__seed491=()=>{
 data.characters=[{id:'original491',name:'Original',kind:'PC',occupation:'Guard',description:'',portrait:'',hmk:{skills:[],injuries:[],attributes:{}}}];
 data.inventory=[];data.journal=[];data.trash=[];
 data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'test491',label:'Campaign',minute:480,characterIds:['original491'],anchors:[],events:[{id:'start491',type:'init',minute:480,reason:'Test'}]};
 data.campaignClocks=[];data.campaignActorBranches={};
 validate(data);const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;selected=null;view='characters';render();
};
window.__inspect491=()=>({chars:data.characters.map(c=>({id:c.id,name:c.name,kind:c.kind,status:c.hmk?.creation?.status,kit:c.hmk?.creation?.values?.autoStartingKit?.source||null,proofKind:c.hmk?.creation?.values?.autoGeneration?.preferences?.kind||null})),journal:data.journal.length,inventory:data.inventory.map(i=>({id:i.id,actorId:i.characterId})),clock:data.campaignClock,storageReadOnly,notice});
window.__reload491=()=>{data=validate(JSON.parse(localStorage.getItem(STORAGE)));view='characters';render()};
window.__library491=(tab,q)=>{view='library';libraryTab=tab;query=q||'';libraryPage=0;render()};
window.__back491=()=>{view='characters';query='';render()};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':1000});alerts=[];errors=[]
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const a={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css','library.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed491()')
 def generate_random(name,kind):
  page.evaluate('window.__back491()')
  page.locator('[data-action="auto-random-character"]').click()
  f=page.locator('#hmk-random-name-form');f.locator('[name="name"]').fill(name);f.locator('[name="kind"]').select_option(kind)
  f.locator('button[type="submit"]').click()
  t=time.monotonic()
  while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-t<75:page.wait_for_timeout(120)
  assert not page.locator('.hmk-auto-generation-overlay').count(),f'generation timeout {name}'
  state=page.evaluate('window.__inspect491()')
  actor=next((a for a in state['chars'] if a['name']==name),None)
  assert actor and actor['status']=='auto-generated' and actor['kind']==kind and actor['proofKind']==kind,(name,state,alerts)
  assert actor['kit'],(name,state)
  assert not alerts and not errors,(alerts,errors)
  print('PASS generated',name,kind,round(time.monotonic()-t,1),'s',flush=True)
  return actor
 def generate_traits(name,kind):
  page.evaluate('window.__back491()')
  page.locator('[data-action="open-generator-config"]').click()
  f=page.locator('#hmk-generator-config');f.locator('[name="name"]').fill(name);f.locator('[name="kind"]').select_option(kind)
  f.locator('button[type="submit"]').click()
  t=time.monotonic()
  while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-t<75:page.wait_for_timeout(120)
  assert not page.locator('.hmk-auto-generation-overlay').count(),f'traits generation timeout {name}'
  state=page.evaluate('window.__inspect491()')
  actor=next((a for a in state['chars'] if a['name']==name),None)
  assert actor and actor['status']=='auto-generated' and actor['kind']==kind and actor['proofKind']==kind,(name,state,alerts)
  assert not alerts and not errors,(alerts,errors)
  print('PASS traits',name,kind,round(time.monotonic()-t,1),'s',flush=True)
  return actor
 npc=generate_random('NPC491','NPC')
 npc_traits=generate_traits('TraitNPC491','NPC')
 pc=generate_random('PC491','PC')
 page.evaluate('window.__reload491()')
 state=page.evaluate('window.__inspect491()')
 assert [x['kind'] for x in state['chars']]==['PC','NPC','NPC','PC'],state
 assert state['clock']['characterIds']==['original491'],state
 assert all(x['actorId'] in (npc['id'],pc['id'],npc_traits['id']) for x in state['inventory']),state
 assert page.locator('[data-character-kind="NPC"] .character-card').count()==2
 assert page.locator('[data-character-kind="PC"] .character-card').count()==2
 # Catalogue items: WQ is number only; open expansion must omit visible scalar properties.
 samples=[('melee','Ball & Chain'),('ranged','Longbow'),('shields','Shield'),('armour','Tunic'),('other','Flask')]
 for tab,q in samples:
  page.evaluate('(p)=>window.__library491(p[0],p[1])',[tab,q]);page.wait_for_timeout(200)
  rows=page.locator('article.folio-catalog-entry[data-library-item]')
  if not rows.count():
   print('NOTE no catalogue hit',tab,q,flush=True);continue
  row=rows.first
  details=row.locator('details.catalog-parameters');details.locator('summary').click()
  content=details.locator('.catalog-parameters-inner').inner_text()
  if tab in ('melee','ranged','shields'):
   cells=row.locator('.folio-catalog-stats .folio-catalog-field dd')
   assert not cells.first.inner_text().strip().startswith('WQ'),(tab,cells.first.inner_text())
   assert 'Základní WQ' not in content,(tab,content)
  for redundant in ('Hmotnost (lb)','Cena (d)'):
   assert redundant not in content,(tab,redundant,content)
  if tab=='melee':
   assert 'Heft' not in content and 'Délka\n' not in content,(tab,content)
   assert 'Kostka zóny' in content or 'Zóna:' in content,content
  print('PASS catalogue',tab,q,'expanded chars',len(content),flush=True)
 assert not errors,errors
 print('PASS v93.491 browser: random and trait NPC, random PC, persistence, catalogue details',flush=True)
 browser.close()
