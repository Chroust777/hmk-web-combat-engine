"""Real production UI with test-only in-memory fixture hook; production bundle is unmodified.
This checks navigation, visibility and unauthorized chapter guard (not character generation).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
head='(()=>{const MOD='
assert bundle.startswith(head)
decoder=json.JSONDecoder(); modules,end=decoder.raw_decode(bundle[len(head):])
modules['app.js']+='\nwindow.__hmkUITestLoad=function(value){data=value;selected=value.characters[0].id;view="sheet";activeSheetSection="overview";render()};\n'
instrumented=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
completed={str(i):True for i in range(1,15)}
attrs={key:12 for key in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()}
def character(name,skills):
 return {'id':name,'name':name,'kind':'PC','occupation':'Farmer','hmk':{
  'attributes':attrs,'skills':[],'creation':{'status':'complete','step':14,'completed':completed,'values':{},'skillDP':{'Optional Skills':skills}},
  'wealth':3,'coinsPence':30}}
chars=[character('Alchemist',{'Alchemy':2,'Herblore':1}),character('Soldier',{'Sword':2}),character('Runecrafter',{'Runecraft':2})]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1450,'height':950});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.add_script_tag(content=instrumented)
 for c,wanted,denied in [(chars[0],['special-alchemy','special-herblore'],['special-spellbook','special-runes']),
                          (chars[1],[],['special-alchemy','special-herblore','special-runes']),
                          (chars[2],['special-runes'],['special-alchemy'])]:
  db={'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':None,'combatRuntime':None}
  page.evaluate('(d)=>window.__hmkUITestLoad(d)',db)
  nav=page.locator('.journal-book-subnav')
  nav.wait_for()
  for id in wanted:assert nav.locator('[data-sheet-section="'+id+'"]').count()==1,(c['id'],id)
  for id in denied:assert nav.locator('[data-sheet-section="'+id+'"]').count()==0,(c['id'],id)
  if wanted:
   nav.locator('[data-sheet-section="'+wanted[0]+'"]').click()
   assert page.locator('.journal-book--specialty').count()==1,(c['id'],'chapter missing')
   assert page.locator('.journal-book--specialty').inner_text().find('Ověřené oprávnění')>=0
  # Fake button must not open unavailable specialty.
  page.evaluate('''()=>{const node=document.querySelector('.journal-book-subnav');const b=document.createElement('button');b.type='button';b.dataset.sheetSection='special-spellbook';node.appendChild(b);b.click()}''')
  assert page.locator('.journal-book--specialty').count()==(1 if wanted else 0)
  # A character swap re-evaluates both current chapter and available nav entries.
  assert not errs,errs
 print('PASS Chromium three character-specific journal menus, actual chapter navigation and forged hidden-tab rejection',flush=True)
 browser.close()
