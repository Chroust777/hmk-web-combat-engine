"""Chromium read-only rehydration of actual persisted Neutral Spellfire journal.
Does NOT claim user-facing spellcasting: those production buttons are absent.
"""
from pathlib import Path
import os,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_neutral_spellfire_failed_449.cjs')],cwd=root,env=os.environ|{'HMK_NEUTRAL_FIXTURE':'1'},text=True))
charids=['A0','A1','B']
characters=[{'id':x,'name':x,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for x in charids]
mage=raw['characters'][0]
mage.update({'kind':'PC'})
mage['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14}
mage['hmk']['sunsign']='Ùlándus'
mage['hmk']['wealth']=30
mage['hmk']['skills']=[{'id':'pv','name':'Pvârism','ml':70}]
characters.append(mage)
minute=raw['campaignClock']['minute']
clock={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,
 'label':'Neutral spellfire audit','characterIds':charids+['Mage'],'anchors':[],
 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
  {'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
db={'schemaVersion':1,'characters':characters,'items':[],'inventory':raw['inventory'],'trash':[],
 'journal':raw['journal'],'campaignClock':clock,'combatRuntime':{**raw['combatRuntime'],'version':1,'participants':['Mage'],'timelineId':raw['combatRuntime']['sequence']['timelineId']}}
text=json.dumps(db,ensure_ascii=False,separators=(',',':'))
bundle=(root/'hmk-app.bundle.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
  args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 errors=[]
 for _ in range(2):
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append('console:'+m.text) if m.type=='error' else None)
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''json=>{const map=new Map([['hmk-keepers-ledger-v1',json]]);const mock={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',text)
  page.add_script_tag(content=bundle)
  assert 'v93.451' in page.locator('body').inner_text(),page.locator('body').inner_text()[-500:]
  before=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
  page.locator('[data-nav="calendar"]').first.click(timeout=20000)
  if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click()
  ui=page.locator('details > summary').filter(has_text='Arcane · Detect / Reveal / Dispel / Negation').first.locator('..')
  assert ui.count()==1,('missing Arcane section',errors,page.locator('details summary').all_inner_texts()[-40:],page.locator('#app').inner_text()[-1300:])
  ui.evaluate('el=>{el.open=true;el.parentElement.open=true}')
  panel=ui.inner_text()
  assert 'Physic' in panel,panel[-1000:]
  assert 'Mage' in panel,panel[-1000:]
  assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==before,'view changed saved history'
  assert not errors,errors
  page.close()
 for name,modifier in [
  ('altered-casting-d100',lambda d:d['journal'][-1]['calendarAlchemyNeutralCast'].update(castingD100=22)),
  ('removed-combat-fatigue',lambda d:d['characters'][-1]['hmk']['combatState'].update(events=[e for e in d['characters'][-1]['hmk']['combatState']['events'] if e['id']!='fire-dispel-449:casting-fatigue'])),
  ('removed-initiative-proof',lambda d:d['combatRuntime']['sequence'].update(log=[e for e in d['combatRuntime']['sequence']['log'] if e.get('eventId')!='fire-dispel-449'])),
 ]:
  damaged=json.loads(text);modifier(damaged);payload=json.dumps(damaged,ensure_ascii=False,separators=(',',':'))
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''json=>{const map=new Map([['hmk-keepers-ledger-v1',json]]);const mock={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',payload)
  page.add_script_tag(content=bundle)
  assert 'POZOR: Původní data se nepodařilo načíst' in page.locator('body').inner_text(),(name,page.locator('body').inner_text()[-1300:])
  assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==payload,name+' damaged bytes unexpectedly altered'
  page.close()
 browser.close()
 print('PASS Chromium v93.451: two independent persisted campaign hydrations and 3 fail-closed corrupted-reload cases; original storage untouched')
